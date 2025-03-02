
import { useState, useEffect, useRef } from 'react';
import { useRealtimeVoiceChat, VoiceChatMessage } from '@/hooks/useRealtimeVoiceChat';
import DataOrb from '@/components/DataOrb';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type { AssistantType } from '@/lib/types';

interface ConversationalVoiceModeProps {
  isActive: boolean;
  onToggle: () => void;
  onMessage: (message: { role: 'user' | 'assistant', content: string }) => void;
  assistantType: AssistantType;
}

export function ConversationalVoiceMode({
  isActive,
  onToggle,
  onMessage,
  assistantType
}: ConversationalVoiceModeProps) {
  // Voice chat hook
  const {
    connect,
    disconnect,
    status,
    messages,
    currentTranscript,
    isConnected,
    isListening,
    isSpeaking,
    stopPlayback
  } = useRealtimeVoiceChat({
    onNewMessage: (message: VoiceChatMessage) => {
      // Filter out system messages - only pass user or assistant messages to the handler
      if (message.role === 'user' || message.role === 'assistant') {
        // Type assertion to ensure TypeScript knows we're only passing user/assistant roles
        onMessage({
          role: message.role,
          content: message.content
        });
      }
    },
    voiceId: 'alloy' // You can make this configurable
  });
  
  // Component state
  const [orbState, setOrbState] = useState<'idle' | 'user' | 'ai'>('idle');
  
  // Connect/disconnect based on active state
  useEffect(() => {
    if (isActive && !isConnected) {
      connect();
    } else if (!isActive && isConnected) {
      disconnect();
    }
    
    // Clean up on unmount
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [isActive, isConnected, connect, disconnect]);
  
  // Update orb state based on voice chat status
  useEffect(() => {
    if (isListening) {
      setOrbState('user');
    } else if (isSpeaking) {
      setOrbState('ai');
    } else {
      setOrbState('idle');
    }
  }, [isListening, isSpeaking]);
  
  // Format status text for display
  const getStatusText = () => {
    switch(status) {
      case 'listening': return currentTranscript || 'Listening...';
      case 'processing': return 'Processing...';
      case 'speaking': return 'Speaking...';
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Ready';
      case 'disconnected': return 'Voice mode inactive';
      case 'error': return 'Connection error';
      default: return '';
    }
  };
  
  return (
    <div className="relative">
      {/* Voice mode toggle button */}
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={onToggle}
        className={`
          rounded-full w-12 h-12 transition-all shadow-lg
          ${isActive 
            ? 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white' 
            : 'bg-gradient-to-r from-indigo-400 to-purple-400 hover:from-indigo-500 hover:to-purple-500 opacity-70 hover:opacity-100 text-white'
          }
          ${isListening ? 'animate-pulse' : ''}
        `}
      >
        <Volume2 className="h-5 w-5 text-white" />
      </Button>
      
      {/* Microphone active indicator */}
      {isListening && (
        <div className="absolute -top-1 -right-1">
          <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
        </div>
      )}
      
      {/* Floating orb for visual feedback */}
      {isActive && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: -120 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
            className="absolute left-1/2 -translate-x-1/2 z-30"
          >
            <DataOrb 
              size={180} 
              speakingState={orbState} 
              pulseIntensity={1.5} 
              speed={1.2} 
            />
          </motion.div>
        </AnimatePresence>
      )}
      
      {/* Status indicator */}
      {isActive && (
        <div className="absolute left-16 top-1/2 -translate-y-1/2 px-4 py-2 bg-white shadow-md rounded-full min-w-48 text-center">
          <div className={`text-sm font-medium ${
            isListening ? 'text-green-600' :
            isSpeaking ? 'text-blue-600' :
            'text-gray-600'
          }`}>
            {getStatusText()}
          </div>
          
          {/* Stop speaking button (only show when AI is speaking) */}
          {isSpeaking && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full p-0"
              onClick={stopPlayback}
            >
              <X className="h-3.5 w-3.5 text-gray-500" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
