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
  | "connection_established"
  | "transcription"
  | "assistant_response"
  | "speech_response"
  | "voice_data"
  | "echo"
  | "chat_request";

interface WebSocketMessage {
  type: MessageType;
  message?: string;
  timestamp?: number;
  data?: any;
  text?: string;
  response?: string;
  thread_id?: string;
  visualizations?: any[];
  audio?: string;
  error?: string;
}

// Using the direct URL format to the Supabase Edge Function
const PROJECT_ID = "nmfhetqfewbjwqyoxqkd";
// Determine if we're in development or production mode
const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Use the appropriate WebSocket URL based on environment
// Check for a custom WebSocket URL in environment variables first
const WEBSOCKET_URL = isLocalDevelopment
  ? (import.meta.env.VITE_LOCAL_WEBSOCKET_URL || `ws://localhost:54321/functions/v1/realtime-voice-chat`)
  : `wss://${PROJECT_ID}.supabase.co/functions/v1/realtime-voice-chat`;

// Log which WebSocket URL we're using on startup
console.log(`Using WebSocket URL: ${WEBSOCKET_URL} (${isLocalDevelopment ? 'development' : 'production'} mode)`);

// Configure the exponential backoff parameters
const MAX_RETRY_COUNT = 5; // Maximum number of retry attempts
const MAX_RETRY_DELAY = 10000; // Maximum retry delay (10 seconds)
const INITIAL_RETRY_DELAY = 1000; // Initial retry delay (1 second)

export const useRealtimeChat = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [assistantResponse, setAssistantResponse] = useState<{
    response: string;
    thread_id: string;
    visualizations: any[];
  } | null>(null);
  const [speechAudio, setSpeechAudio] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const pingTimestampRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const isProcessingQueueRef = useRef<boolean>(false);

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
      } else if (data.type === "transcription" && data.text) {
        setTranscription(data.text);
      } else if (data.type === "assistant_response" && data.response) {
        setAssistantResponse({
          response: data.response,
          thread_id: data.thread_id || "",
          visualizations: data.visualizations || []
        });
      } else if (data.type === "speech_response" && data.audio) {
        setSpeechAudio(data.audio);
      } else if (data.type === "error") {
        toast.error(`WebSocket error: ${data.message || 'Unknown error'}`);
        console.error("WebSocket error:", data);
      }
      
      setMessages(prev => [...prev, data]);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }, []);

  // Send a message to the WebSocket server
  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'timestamp'>) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected, queueing message");
      messageQueueRef.current.push({
        ...message,
        timestamp: Date.now()
      });
      connect(); // Try to reconnect
      return false;
    }
    
    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now()
      };
      socketRef.current.send(JSON.stringify(messageWithTimestamp));
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  }, []);

  // Process the queue of messages that couldn't be sent due to connection issues
  const processMessageQueue = useCallback(() => {
    if (isProcessingQueueRef.current || messageQueueRef.current.length === 0) {
      return;
    }
    
    isProcessingQueueRef.current = true;
    
    try {
      // Process as many messages as we can
      while (
        messageQueueRef.current.length > 0 && 
        socketRef.current && 
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        const message = messageQueueRef.current[0];
        socketRef.current.send(JSON.stringify(message));
        messageQueueRef.current.shift(); // Remove the message after sending
      }
    } catch (error) {
      console.error("Error processing message queue:", error);
    } finally {
      isProcessingQueueRef.current = false;
    }
  }, []);

  // Measure connection latency
  const measureLatency = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      pingTimestampRef.current = Date.now();
      sendMessage({ type: "ping" });
    }
  }, [sendMessage]);

  // Send a test message
  const sendTestMessage = useCallback((testData: any = { test: "data" }) => {
    return sendMessage({
      type: "test",
      data: testData
    });
  }, [sendMessage]);

  // Send voice data for processing
  const sendVoiceData = useCallback((
    audioData: string, 
    options: { 
      processWithAssistant?: boolean; 
      assistantType?: string; 
      threadId?: string;
      structuredOutput?: boolean;
      textToSpeech?: boolean;
    } = {}
  ) => {
    console.log("Sending voice data for processing, options:", options);
    return sendMessage({
      type: "voice_data",
      data: audioData,
      ...options
    });
  }, [sendMessage]);

  // Send a chat request with attachments
  const sendChatRequest = useCallback((
    message: string,
    options: {
      assistantType?: string;
      threadId?: string;
      structuredOutput?: boolean;
      textToSpeech?: boolean;
      attachments?: { name: string; url: string; type: string; path: string }[];
    } = {}
  ) => {
    console.log("Sending chat request:", { message, ...options });
    if (!isConnected) {
      toast.error("Not connected to the server. Please try again.", { 
        id: "chat-connection-error" 
      });
      return false;
    }

    return sendMessage({
      type: "chat_request",
      message,
      ...options
    });
  }, [sendMessage, isConnected]);

  // Connect to the WebSocket server
  const connect = useCallback(() => {
    // Don't try to connect if we're already connecting
    if (isConnecting) return;
    
    // Don't try to connect if we already have a connection
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }

    // Limit reconnection attempts to prevent excessive retries
    if (connectionAttempts >= MAX_RETRY_COUNT) {
      console.log(`Maximum reconnection attempts (${MAX_RETRY_COUNT}) reached. Stopping retry.`);
      toast.error("Could not connect to voice service. Please try again later.", {
        duration: 5000,
        id: "websocket-connection-error"
      });
      return;
    }

    setIsConnecting(true);
    
    // Increase the connection attempts counter
    setConnectionAttempts(prev => prev + 1);
    
    // Calculate the exponential backoff delay
    const retryDelay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(2, connectionAttempts),
      MAX_RETRY_DELAY
    );
    
    // Close any existing connection
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    console.log(`Connecting to WebSocket server (attempt ${connectionAttempts + 1}, delay: ${retryDelay}ms)`);
    
    // Create a new WebSocket connection
    try {
      const socket = new WebSocket(WEBSOCKET_URL);
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log("WebSocket connection opened");
        setIsConnected(true);
        setIsConnecting(false);
        
        // Reset connection attempts on successful connection
        setConnectionAttempts(0);
        
        // Process any queued messages
        processMessageQueue();
        
        // Measure initial latency
        measureLatency();
        
        // Start periodic latency measurements
        const latencyInterval = setInterval(() => {
          measureLatency();
        }, 30000); // Every 30 seconds
        
        // Clean up the interval when the socket closes
        socket.onclose = (event) => {
          clearInterval(latencyInterval);
          setIsConnected(false);
          setIsConnecting(false);
          
          console.log(`WebSocket connection closed (code: ${event.code}, reason: ${event.reason || 'No reason provided'})`);
          
          // Only reconnect for abnormal closures and if we haven't exceeded max attempts
          if (event.code !== 1000 && connectionAttempts < MAX_RETRY_COUNT) {
            console.log("Scheduling reconnection");
            
            // Schedule reconnection if not already scheduled
            if (reconnectTimeoutRef.current === null) {
              reconnectTimeoutRef.current = window.setTimeout(() => {
                reconnectTimeoutRef.current = null;
                connect();
              }, retryDelay);
            }
          } else if (connectionAttempts >= MAX_RETRY_COUNT) {
            console.log("Maximum reconnection attempts reached, not reconnecting");
          }
        };
      };
      
      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnecting(false);
        
        toast.error("Connection error. Voice features may be unavailable.", {
          id: "websocket-error",
          duration: 3000
        });
      };
      
      socket.onmessage = handleMessage;
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      setIsConnecting(false);
      
      // Schedule reconnection
      if (connectionAttempts < MAX_RETRY_COUNT) {
        reconnectTimeoutRef.current = window.setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, retryDelay);
      }
    }
  }, [handleMessage, isConnecting, connectionAttempts, measureLatency, processMessageQueue]);

  // Disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log("Closing WebSocket connection");
      socketRef.current.close();
      socketRef.current = null;
    }
    
    // Clear any scheduled reconnection
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  // Connect to the WebSocket server when the component mounts
  useEffect(() => {
    connect();
    
    // Clean up when the component unmounts
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Reset state
  const resetState = useCallback(() => {
    setMessages([]);
    setTranscription(null);
    setAssistantResponse(null);
    setSpeechAudio(null);
  }, []);

  return {
    isConnected,
    isConnecting,
    messages,
    latency,
    connect,
    disconnect,
    sendMessage,
    sendTestMessage,
    sendVoiceData,
    sendChatRequest,
    measureLatency,
    transcription,
    assistantResponse,
    speechAudio,
    resetState
  };
};
