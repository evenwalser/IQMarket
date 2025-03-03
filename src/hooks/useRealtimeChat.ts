
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

// Using a more specific URL format that includes the actual project ID
// This is hardcoded for now to ensure it works consistently
const PROJECT_ID = "nmfhetqfewbjwqyoxqkd";
const WEBSOCKET_URL = `wss://${PROJECT_ID}.supabase.co/functions/v1/realtime-voice-chat`;

export const useRealtimeChat = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  
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
      }
      
      setMessages(prev => [...prev, data]);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }, []);

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
      
      // Set up event handlers
      socket.onopen = () => {
        console.log("WebSocket connection opened");
        setIsConnected(true);
        setIsConnecting(false);
        
        // Send initial ping to measure latency
        sendPing();
      };
      
      socket.onmessage = handleMessage;
      
      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        toast.error("WebSocket connection error");
      };
      
      socket.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect after a delay
        if (reconnectTimeoutRef.current) {
          window.clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = window.setTimeout(() => {
          console.log("Attempting to reconnect...");
          connect();
        }, 3000);
      };
      
      return true;
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      setIsConnecting(false);
      toast.error("Failed to establish WebSocket connection");
      return false;
    }
  }, [handleMessage]);

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

  // Send a test message
  const sendTestMessage = useCallback((data: any) => {
    return sendMessage({ type: "test", data });
  }, [sendMessage]);

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
    latency
  };
};
