
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Typing for voice chat messages
export interface VoiceChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// Hook configuration options
interface RealtimeVoiceChatOptions {
  onNewMessage: (message: VoiceChatMessage) => void;
  voiceId?: string;
}

// Hook return type
interface RealtimeVoiceChatReturn {
  status: 'disconnected' | 'connecting' | 'connected' | 'error' | 'listening' | 'processing' | 'speaking';
  connect: () => void;
  disconnect: () => void;
  messages: VoiceChatMessage[];
  currentTranscript: string;
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  stopPlayback: () => void;
}

export function useRealtimeVoiceChat({
  onNewMessage,
  voiceId = 'alloy'
}: RealtimeVoiceChatOptions): RealtimeVoiceChatReturn {
  const [status, setStatus] = useState<RealtimeVoiceChatReturn['status']>('disconnected');
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000; // Start with 2 seconds
  
  // Clean up function to reset state
  const cleanUp = useCallback(() => {
    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    setCurrentTranscript('');
    setStatus('disconnected');
  }, []);
  
  // Connect to the WebSocket server
  const connect = useCallback(async () => {
    try {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      
      setStatus('connecting');
      console.log('Attempting to connect to WebSocket:', `wss://${supabase.realtime.getHostName()}/functions/v1/realtime-voice-chat`);
      
      // Create WebSocket connection
      const ws = new WebSocket(`wss://${supabase.realtime.getHostName()}/functions/v1/realtime-voice-chat`);
      webSocketRef.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        // Reset reconnect attempts on successful connection
        reconnectAttemptsRef.current = 0;
        
        // Send initial configuration
        ws.send(JSON.stringify({
          action: 'configure',
          voiceId: voiceId
        }));
        
        setIsConnected(true);
        setStatus('connected');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received message from server:', data);
        
        switch (data.type) {
          case 'status':
            if (data.status === 'listening') {
              setIsListening(true);
              setIsSpeaking(false);
              setStatus('listening');
            } else if (data.status === 'processing') {
              setIsListening(false);
              setIsSpeaking(false);
              setStatus('processing');
            } else if (data.status === 'speaking') {
              setIsListening(false);
              setIsSpeaking(true);
              setStatus('speaking');
            }
            break;
            
          case 'transcript':
            setCurrentTranscript(data.text || '');
            if (data.final) {
              setMessages(prev => [...prev, { role: 'user', content: data.text }]);
              onNewMessage({ role: 'user', content: data.text });
              setCurrentTranscript('');
            }
            break;
            
          case 'message':
            const newMessage = { role: data.role, content: data.content };
            setMessages(prev => [...prev, newMessage as VoiceChatMessage]);
            onNewMessage(newMessage as VoiceChatMessage);
            break;
            
          case 'error':
            console.error('WebSocket error:', data.message);
            toast.error(`Voice chat error: ${data.message}`);
            break;
        }
      };
      
      // Handle WebSocket errors with improved error handling and reconnection logic
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        // Don't immediately try to reconnect on error, wait for onclose
      };
      
      ws.onclose = (event) => {
        console.info('WebSocket closed:', event.code, event);
        setIsConnected(false);
        
        // Only auto-reconnect if we didn't intentionally close or exceed max attempts
        if (status !== 'disconnected' && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setStatus('error');
          toast.error('Could not establish voice connection. Please try again later.');
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setStatus('error');
      toast.error('Failed to establish voice connection');
    }
  }, [voiceId, onNewMessage, status]);
  
  // Disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    cleanUp();
  }, [cleanUp]);
  
  // Stop audio playback
  const stopPlayback = useCallback(() => {
    if (webSocketRef.current && isConnected) {
      webSocketRef.current.send(JSON.stringify({
        action: 'stop_playback'
      }));
      setIsSpeaking(false);
    }
  }, [isConnected]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanUp();
    };
  }, [cleanUp]);
  
  return {
    status,
    connect,
    disconnect,
    messages,
    currentTranscript,
    isConnected,
    isListening,
    isSpeaking,
    stopPlayback
  };
}
