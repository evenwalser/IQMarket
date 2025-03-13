
import React, { useState, useEffect, useRef } from 'react';
import { useRealtimeVoiceChat } from '@/hooks/useRealtimeVoiceChat';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DataOrb from '@/components/DataOrb';
import { toast } from 'sonner';

interface VoiceAssistantProps {
  onNewMessage?: (message: { role: 'user' | 'assistant' | 'system', content: string }) => void;
  onStatusChange?: (status: string) => void;
  autoConnect?: boolean;
  assistantType?: string;
  voiceId?: string;
}

export function VoiceAssistant({
  onNewMessage,
  onStatusChange,
  autoConnect = false,
  assistantType = 'knowledge',
  voiceId = 'alloy'
}: VoiceAssistantProps) {
  // Get voice chat functionality from our hook
  const voiceChat = useRealtimeVoiceChat({
    autoConnect,
    voiceId,
    onNewMessage,
    onStatusChange: (status) => {
      setOrbState(
        status === 'listening' ? 'user' :
        status === 'speaking' ? 'ai' : 'idle'
      );
      
      if (onStatusChange) {
        onStatusChange(status);
      }
    },
    onTranscriptUpdate: (text, isFinal) => {
      setCurrentTranscript(text);
    }
  });
  
  // UI state
  const [orbState, setOrbState] = useState<'idle' | 'user' | 'ai'>('idle');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Handle visibility toggle
  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    if (newExpanded && !voiceChat.isConnected) {
      voiceChat.connect();
    }
  };
  
  // Handle connection toggle
  const toggleConnection = () => {
    if (voiceChat.isConnected) {
      voiceChat.disconnect();
      toast.info('Voice assistant disconnected');
    } else {
      voiceChat.connect();
    }
  };
  
  // Status text
  const getStatusText = () => {
    switch(voiceChat.status) {
      case 'disconnected': return 'Disconnected';
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Connected';
      case 'listening': return currentTranscript || 'Listening...';
      case 'processing': return 'Processing...';
      case 'speaking': return 'Speaking...';
      case 'error': return 'Connection error';
      default: return 'Ready';
    }
  };
  
  // Render the component
  return (
    <div className="relative">
      {/* Floating toggle button */}
      <Button
        variant="outline"
        size="icon"
        className={`rounded-full shadow-lg transition-all ${
          voiceChat.isConnected 
            ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white' 
            : 'bg-slate-100'
        }`}
        onClick={toggleExpanded}
      >
        <Volume2 className="h-5 w-5" />
      </Button>
      
      {/* Expandable voice assistant panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
          >
            {/* Voice assistant header */}
            <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white flex justify-between items-center">
              <h3 className="font-medium">Voice Assistant</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-white hover:bg-white/20"
                  onClick={toggleConnection}
                >
                  {voiceChat.isConnected ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {/* Orb visualization */}
            <div className="p-4 flex justify-center">
              <DataOrb size={160} speakingState={orbState} />
            </div>
            
            {/* Status and transcript display */}
            <div className="p-4 text-center">
              <div className="text-sm font-medium text-gray-700 mb-2">
                {voiceChat.status === 'listening' ? 'Listening...' : getStatusText()}
              </div>
              
              {currentTranscript && voiceChat.status === 'listening' && (
                <div className="bg-gray-50 p-3 rounded-lg text-gray-800 text-sm">
                  {currentTranscript}
                </div>
              )}
              
              {voiceChat.status === 'connecting' && (
                <div className="flex justify-center my-2">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                </div>
              )}
            </div>
            
            {/* Controls */}
            <div className="p-4 border-t border-gray-100 flex justify-between">
              <span className="text-xs text-gray-500 flex items-center">
                {voiceChat.isConnected ? 'Connected' : 'Disconnected'}
                <span className={`ml-2 w-2 h-2 rounded-full ${
                  voiceChat.isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
              </span>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => setIsExpanded(false)}
              >
                Close
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
