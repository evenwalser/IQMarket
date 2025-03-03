
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

// Message types for type safety
type MessageType = 
  | "text"
  | "ping"
  | "pong"
  | "test"
  | "test_response"
  | "error"
  | "connection_established";

interface WebSocketMessage {
  type: MessageType;
  message?: string;
  timestamp?: number;
  data?: any;
}

// Using the direct URL format to the Supabase Edge Function
const PROJECT_ID = "nmfhetqfewbjwqyoxqkd";
const WEBSOCKET_URL = `wss://${PROJECT_ID}.supabase.co/functions/v1/realtime-voice-chat`;

export const useRealtimeChat = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  const socketRef = useRef<WebSocket | null>(null);
  const pingTimestampRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as WebSocketMessage;
      console.log("Received WebSocket message:", data);
      
      // Handle specific message types
      if (data.type === "pong" && pingTimestampRef.current) {
        const currentLatency = Date.now() - pingTimestampRef.current;
        setLatency(currentLatency);
        pingTimestampRef.current = null;
      } else if (data.type === "connection_established") {
        console.log("Connection established with the server");
        // Reset connection attempts on successful connection
        setConnectionAttempts(0);
      }
      
      setMessages(prev => [...prev, data]);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }, []);

  // Send a message to the WebSocket server
  const sendMessage = useCallback((message: Omit<WebSocketMessage, "timestamp">) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      toast.error("WebSocket not connected");
      return false;
    }
    
    try {
      const fullMessage = {
        ...message,
        timestamp: Date.now()
      };
      
      socketRef.current.send(JSON.stringify(fullMessage));
      return true;
    } catch (error) {
      console.error("Error sending WebSocket message:", error);
      return false;
    }
  }, []);

  // Send a ping to measure latency
  const sendPing = useCallback(() => {
    if (isConnected) {
      pingTimestampRef.current = Date.now();
      sendMessage({ type: "ping" });
    }
  }, [isConnected, sendMessage]);

  // Establish connection to the WebSocket server
  const connect = useCallback(async () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return true;
    }

    try {
      setIsConnecting(true);
      
      // Close existing connection if any
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      console.log("Connecting to WebSocket at:", WEBSOCKET_URL);
      
      // Create new WebSocket connection
      const socket = new WebSocket(WEBSOCKET_URL);
      socketRef.current = socket;
      
      return new Promise<boolean>((resolve) => {
        // Set up event handlers
        socket.onopen = () => {
          console.log("WebSocket connection opened");
          setIsConnected(true);
          setIsConnecting(false);
          
          // Send initial ping to measure latency
          sendPing();
          resolve(true);
        };
        
        socket.onmessage = handleMessage;
        
        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          setIsConnecting(false);
          toast.error("WebSocket connection error");
          setConnectionAttempts(prev => prev + 1);
          resolve(false);
        };
        
        socket.onclose = (event) => {
          console.log("WebSocket connection closed:", event.code, event.reason);
          setIsConnected(false);
          setIsConnecting(false);
          
          // Attempt to reconnect after a delay, with increasing backoff
          if (reconnectTimeoutRef.current) {
            window.clearTimeout(reconnectTimeoutRef.current);
          }
          
          const backoffDelay = Math.min(3000 * Math.pow(1.5, Math.min(connectionAttempts, 5)), 30000);
          console.log(`Will attempt to reconnect in ${backoffDelay}ms (attempt ${connectionAttempts + 1})`);
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            console.log("Attempting to reconnect...");
            connect();
          }, backoffDelay);
          
          resolve(false);
        };
      });
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      setIsConnecting(false);
      toast.error("Failed to establish WebSocket connection");
      return false;
    }
  }, [handleMessage, connectionAttempts, sendPing]);

  // Send a test message
  const sendTestMessage = useCallback((data: any) => {
    return sendMessage({ type: "test", data });
  }, [sendMessage]);

  // Clean up function to close the connection
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendMessage,
    sendPing,
    sendTestMessage,
    isConnected,
    isConnecting,
    messages,
    latency,
    connectionAttempts
  };
};
