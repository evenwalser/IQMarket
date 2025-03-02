import { useState, useEffect, useRef, useCallback } from 'react';
import { encodeAudioForAPI } from '@/utils/audioProcessing';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type VoiceChatStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

// Define a union type for the message roles that includes 'system'
export type MessageRole = 'user' | 'assistant' | 'system';

export interface VoiceChatMessage {
  role: MessageRole;
  content: string;
}

interface UseRealtimeVoiceChatProps {
  onStatusChange?: (status: VoiceChatStatus) => void;
  onTranscriptUpdate?: (text: string, isFinal: boolean) => void;
  onNewMessage?: (message: VoiceChatMessage) => void;
  autoConnect?: boolean;
  voiceId?: string;
}

export function useRealtimeVoiceChat({
  onStatusChange,
  onTranscriptUpdate,
  onNewMessage,
  autoConnect = false,
  voiceId = 'alloy'
}: UseRealtimeVoiceChatProps = {}) {
  // Connection state
  const [status, setStatus] = useState<VoiceChatStatus>('disconnected');
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  
  // WebSocket references
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Audio processing references
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const isPlayingRef = useRef(false);
  const microphoneActiveRef = useRef(false);
  const isBargeInDetectedRef = useRef(false);
  const currentVolumeRef = useRef(0);
  const silenceThresholdRef = useRef(0.02); // Adjustable threshold
  const audioSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  
  // Tracking state between renders
  const isSessionInitializedRef = useRef(false);
  const currentVoiceIDRef = useRef(voiceId);
  const currentUserTextRef = useRef('');
  const needsSessionUpdateRef = useRef(false);
  
  // Update the voice ID if it changes
  useEffect(() => {
    currentVoiceIDRef.current = voiceId;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isSessionInitializedRef.current) {
      needsSessionUpdateRef.current = true;
    }
  }, [voiceId]);

  // Update status with callback
  const updateStatus = useCallback((newStatus: VoiceChatStatus) => {
    setStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  }, [onStatusChange]);
  
  // Auto connect if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [autoConnect]);

  // Function to initialize audio processing
  const initializeAudio = useCallback(async () => {
    try {
      // Set up audio context if not already created
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000 // Use 24kHz as required by OpenAI
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      toast.error('Failed to initialize audio system');
      updateStatus('error');
      return false;
    }
  }, [updateStatus]);

  // Function to start capturing microphone audio
  const startMicrophone = useCallback(async () => {
    try {
      if (microphoneActiveRef.current) return true;
      
      if (!audioContextRef.current) {
        const initialized = await initializeAudio();
        if (!initialized) return false;
      }
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000
        }
      });
      
      audioStreamRef.current = stream;
      
      // Set up audio recorder
      const recorder = new MediaRecorder(stream);
      audioRecorderRef.current = recorder;
      
      // Set up audio analyser for volume/barge-in detection
      const sourceNode = audioContextRef.current.createMediaStreamSource(stream);
      audioSourceNodeRef.current = sourceNode;
      
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      sourceNode.connect(analyser);
      audioAnalyserRef.current = analyser;
      
      // Start monitoring audio levels
      startVolumeMonitoring();
      
      // Set up recorder event handlers
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          // Convert blob to array buffer
          event.data.arrayBuffer().then((buffer) => {
            // Convert to Float32Array
            audioContextRef.current!.decodeAudioData(buffer).then((audioBuffer) => {
              const float32Data = audioBuffer.getChannelData(0);
              
              // Encode for the API and send
              const base64Audio = encodeAudioForAPI(float32Data);
              
              wsRef.current!.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: base64Audio
              }));
            });
          });
        }
      };
      
      // Start recording
      recorder.start(250); // Collect in 250ms chunks
      microphoneActiveRef.current = true;
      
      return true;
    } catch (error) {
      console.error('Failed to start microphone:', error);
      toast.error('Failed to access microphone');
      return false;
    }
  }, [initializeAudio, updateStatus]);

  // Monitor audio volume levels for barge-in detection
  const startVolumeMonitoring = useCallback(() => {
    if (!audioAnalyserRef.current) return;
    
    const analyser = audioAnalyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const checkVolume = () => {
      if (!audioAnalyserRef.current) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedVolume = average / 255; // Normalize to 0-1
      
      currentVolumeRef.current = normalizedVolume;
      
      // Detect barge-in while AI is speaking
      if (status === 'speaking' && normalizedVolume > silenceThresholdRef.current * 3) {
        if (!isBargeInDetectedRef.current) {
          console.log('Barge-in detected, stopping AI speech');
          isBargeInDetectedRef.current = true;
          stopPlayback();
          updateStatus('listening');
        }
      }
      
      requestAnimationFrame(checkVolume);
    };
    
    requestAnimationFrame(checkVolume);
  }, [status, updateStatus]);

  // Connect to the WebSocket server
  const connect = useCallback(async () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }
    
    try {
      updateStatus('connecting');
      
      // Initialize audio system
      const audioInitialized = await initializeAudio();
      if (!audioInitialized) return;
      
      // Define the project reference directly
      const projectRef = 'nmfhetqfewbjwqyoxqkd';
      
      // Create WebSocket connection to our Edge Function
      const ws = new WebSocket(`wss://${projectRef}.supabase.co/functions/v1/realtime-voice-chat`);
      wsRef.current = ws;
      
      // WebSocket event handlers
      ws.onopen = () => {
        console.log('WebSocket connected to Edge Function');
        reconnectAttempts.current = 0;
        
        // Initialize session
        const newSessionId = sessionId || crypto.randomUUID();
        setSessionId(newSessionId);
        
        // Send init message
        ws.send(JSON.stringify({
          type: 'init',
          sessionId: newSessionId
        }));
      };
      
      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        switch (data.type) {
          case 'connection_ready':
            updateStatus('connected');
            console.log('Connection ready, session ID:', data.sessionId);
            break;
            
          case 'session.created':
            console.log('OpenAI session created:', data.session.id);
            isSessionInitializedRef.current = true;
            
            // Update session configuration
            ws.send(JSON.stringify({
              type: 'session.update',
              session: {
                modalities: ["text", "audio"],
                instructions: "You are a helpful assistant. Your knowledge cutoff is 2023-10. Keep responses concise but helpful.",
                voice: currentVoiceIDRef.current,
                input_audio_format: "pcm16",
                output_audio_format: "pcm16",
                input_audio_transcription: {
                  model: "whisper-1"
                },
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 1000
                },
                temperature: 0.7,
                max_response_output_tokens: 800
              }
            }));
            
            // Start listening
            const micStarted = await startMicrophone();
            if (micStarted) {
              updateStatus('listening');
              toast.success('Voice assistant ready');
            }
            break;
            
          case 'session.updated':
            console.log('Session configuration updated');
            needsSessionUpdateRef.current = false;
            break;
            
          case 'response.audio.delta':
            if (data.delta) {
              // Decode base64 audio
              const binaryString = atob(data.delta);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              // Add to audio queue and start playback if not already playing
              audioQueueRef.current.push(bytes);
              
              if (!isPlayingRef.current) {
                updateStatus('speaking');
                playNextAudioChunk();
              }
            }
            break;
            
          case 'speech_started':
            updateStatus('speaking');
            break;
            
          case 'speech_stopped':
            // Reset barge-in flag when speech stops naturally
            isBargeInDetectedRef.current = false;
            break;
            
          case 'input_text.transcription.delta':
            if (data.delta) {
              const newTranscript = currentTranscript + data.delta;
              setCurrentTranscript(newTranscript);
              currentUserTextRef.current = newTranscript;
              
              if (onTranscriptUpdate) {
                onTranscriptUpdate(newTranscript, false);
              }
            }
            break;
            
          case 'input_text.transcription.complete':
            if (data.text) {
              setCurrentTranscript(data.text);
              currentUserTextRef.current = data.text;
              
              if (onTranscriptUpdate) {
                onTranscriptUpdate(data.text, true);
              }
              
              // Add user message to conversation
              const userMessage: VoiceChatMessage = {
                role: 'user',
                content: data.text
              };
              
              setMessages(prev => [...prev, userMessage]);
              
              if (onNewMessage) {
                onNewMessage(userMessage);
              }
              
              updateStatus('processing');
            }
            break;
            
          case 'response.message.delta':
            if (data.delta && data.role === 'assistant') {
              // Update assistant message
              setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                
                // If last message is from assistant, append to it
                if (lastMessage && lastMessage.role === 'assistant') {
                  const updatedMessages = [...prev];
                  updatedMessages[updatedMessages.length - 1] = {
                    ...lastMessage,
                    content: lastMessage.content + data.delta
                  };
                  return updatedMessages;
                } 
                // Otherwise create a new assistant message
                else {
                  const newMessage: VoiceChatMessage = {
                    role: 'assistant',
                    content: data.delta
                  };
                  
                  if (onNewMessage) {
                    onNewMessage(newMessage);
                  }
                  
                  return [...prev, newMessage];
                }
              });
            }
            break;
            
          case 'response.done':
            // After response finishes, reset state and prepare for next turn
            setTimeout(() => {
              if (status === 'speaking') {
                updateStatus('listening');
              }
              setCurrentTranscript('');
            }, 1000);
            break;
            
          case 'error':
            console.error('Error from WebSocket:', data.message);
            toast.error(`Voice assistant error: ${data.message}`);
            break;
        }
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);
        wsRef.current = null;
        updateStatus('disconnected');
        
        // Clean up audio resources
        cleanupAudio();
        
        // Attempt to reconnect if not manually disconnected
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          setTimeout(() => {
            connect();
          }, delay);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection error');
        updateStatus('error');
      };
      
    } catch (error) {
      console.error('Error connecting to voice chat:', error);
      toast.error('Failed to connect to voice assistant');
      updateStatus('error');
    }
  }, [sessionId, currentTranscript, status, initializeAudio, startMicrophone, updateStatus, onTranscriptUpdate, onNewMessage]);

  // Disconnect from the server
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Clean up audio
    cleanupAudio();
    
    updateStatus('disconnected');
    isSessionInitializedRef.current = false;
  }, [updateStatus]);

  // Audio playback functions
  const playNextAudioChunk = useCallback(async () => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    
    isPlayingRef.current = true;
    
    try {
      const audioData = audioQueueRef.current.shift();
      if (!audioData) {
        isPlayingRef.current = false;
        return;
      }
      
      // Create WAV data from PCM
      const wavHeader = createWavHeader(audioData.length, 24000, 1, 16);
      const wavData = new Uint8Array(wavHeader.length + audioData.length);
      wavData.set(wavHeader);
      wavData.set(audioData, wavHeader.length);
      
      // Decode and play
      const audioBuffer = await audioContextRef.current.decodeAudioData(wavData.buffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        // If there are more chunks and no barge-in, play next
        if (audioQueueRef.current.length > 0 && !isBargeInDetectedRef.current) {
          playNextAudioChunk();
        } else {
          isPlayingRef.current = false;
          
          // If we've played all audio and no barge-in occurred
          if (audioQueueRef.current.length === 0 && !isBargeInDetectedRef.current && status === 'speaking') {
            updateStatus('listening');
          }
        }
      };
      
      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
      isPlayingRef.current = false;
      
      // Continue with remaining audio even if one chunk fails
      if (audioQueueRef.current.length > 0 && !isBargeInDetectedRef.current) {
        playNextAudioChunk();
      }
    }
  }, [status, updateStatus]);

  // Stop audio playback (for barge-in)
  const stopPlayback = useCallback(() => {
    // Clear the audio queue
    audioQueueRef.current = [];
    
    // Resume microphone if needed
    if (!microphoneActiveRef.current) {
      startMicrophone();
    }
    
    // Send message to interrupt current response
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'speech.interrupt'
      }));
    }
    
    isPlayingRef.current = false;
    updateStatus('listening');
  }, [startMicrophone, updateStatus]);

  // Clean up audio resources
  const cleanupAudio = useCallback(() => {
    // Stop recording if active
    if (audioRecorderRef.current && microphoneActiveRef.current) {
      try {
        audioRecorderRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping recorder
      }
    }
    
    // Disconnect and release audio nodes
    if (audioSourceNodeRef.current) {
      audioSourceNodeRef.current.disconnect();
      audioSourceNodeRef.current = null;
    }
    
    if (audioAnalyserRef.current) {
      audioAnalyserRef.current.disconnect();
      audioAnalyserRef.current = null;
    }
    
    // Stop all tracks in the stream
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    audioRecorderRef.current = null;
    microphoneActiveRef.current = false;
    isPlayingRef.current = false;
    audioQueueRef.current = [];
    
    // Don't close the AudioContext as it's expensive to recreate
  }, []);

  // Send text message programmatically
  const sendTextMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isSessionInitializedRef.current) {
      toast.error('Not connected to voice assistant');
      return;
    }
    
    if (!text.trim()) return;
    
    // Add user message to conversation
    const userMessage: VoiceChatMessage = {
      role: 'user',
      content: text
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    if (onNewMessage) {
      onNewMessage(userMessage);
    }
    
    // Send text to OpenAI
    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    }));
    
    // Request response
    wsRef.current.send(JSON.stringify({
      type: 'response.create'
    }));
    
    updateStatus('processing');
  }, [updateStatus, onNewMessage]);

  // Create WAV header for audio playback
  const createWavHeader = (dataLength: number, sampleRate: number, numChannels: number, bitsPerSample: number) => {
    const headerLength = 44;
    const wavHeader = new Uint8Array(headerLength);
    const view = new DataView(wavHeader.buffer);
    
    // "RIFF" chunk descriptor
    view.setUint8(0, 'R'.charCodeAt(0));
    view.setUint8(1, 'I'.charCodeAt(0));
    view.setUint8(2, 'F'.charCodeAt(0));
    view.setUint8(3, 'F'.charCodeAt(0));
    
    // Chunk size
    view.setUint32(4, 36 + dataLength, true);
    
    // "WAVE" format
    view.setUint8(8, 'W'.charCodeAt(0));
    view.setUint8(9, 'A'.charCodeAt(0));
    view.setUint8(10, 'V'.charCodeAt(0));
    view.setUint8(11, 'E'.charCodeAt(0));
    
    // "fmt " sub-chunk
    view.setUint8(12, 'f'.charCodeAt(0));
    view.setUint8(13, 'm'.charCodeAt(0));
    view.setUint8(14, 't'.charCodeAt(0));
    view.setUint8(15, ' '.charCodeAt(0));
    
    // Sub-chunk size
    view.setUint32(16, 16, true);
    
    // Audio format (PCM = 1)
    view.setUint16(20, 1, true);
    
    // Number of channels
    view.setUint16(22, numChannels, true);
    
    // Sample rate
    view.setUint32(24, sampleRate, true);
    
    // Byte rate
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    view.setUint32(28, byteRate, true);
    
    // Block align
    const blockAlign = numChannels * bitsPerSample / 8;
    view.setUint16(32, blockAlign, true);
    
    // Bits per sample
    view.setUint16(34, bitsPerSample, true);
    
    // "data" sub-chunk
    view.setUint8(36, 'd'.charCodeAt(0));
    view.setUint8(37, 'a'.charCodeAt(0));
    view.setUint8(38, 't'.charCodeAt(0));
    view.setUint8(39, 'a'.charCodeAt(0));
    
    // Data size
    view.setUint32(40, dataLength, true);
    
    return wavHeader;
  };

  // Return the hook interface
  return {
    connect,
    disconnect,
    sendTextMessage,
    stopPlayback,
    status,
    messages,
    currentTranscript,
    isConnected: status !== 'disconnected' && status !== 'connecting' && status !== 'error',
    isListening: status === 'listening',
    isSpeaking: status === 'speaking',
    isProcessing: status === 'processing',
  };
}
