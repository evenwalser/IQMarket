import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TextToSpeechOptions {
  voice?: string;
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingTextRef = useRef<string | null>(null);
  const maxRetries = 3;
  const retryCountRef = useRef<number>(0);
  const retryDelay = 1500; // 1.5 seconds between retries
  const audioCache = useRef<Map<string, string>>(new Map());

  // Clean up function for the audio element
  const cleanupAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
    }
  }, []);

  // Effect to ensure audio cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Generate a cache key for the text and options
  const getCacheKey = (text: string, options?: TextToSpeechOptions): string => {
    const voice = options?.voice || 'nova';
    const rate = options?.rate || 1.0;
    return `${voice}:${rate}:${text}`;
  };

  const speakText = async (text: string, options?: TextToSpeechOptions) => {
    const {
      voice = 'nova',
      rate = 1.0,
      onStart,
      onEnd,
      onError
    } = options || {};
    
    if (!text.trim()) {
      console.log("Empty text provided to text-to-speech, skipping");
      return;
    }
    
    // If something is already playing, stop it
    cleanupAudio();
    
    try {
      setIsLoading(true);
      setIsSpeaking(true);
      setError(null);
      
      // Check if we have this audio cached
      const cacheKey = getCacheKey(text, options);
      let audioBase64 = audioCache.current.get(cacheKey);
      
      if (!audioBase64) {
        // Display a toast message to indicate that the audio is loading
        toast.loading('Generating audio...', { id: 'tts' });
        pendingTextRef.current = text;
        
        console.log(`Calling text-to-speech function with ${text.length} characters and voice: ${voice}`);
        
        retryCountRef.current = 0;
        
        // Function to attempt TTS with retry logic
        const tryGenerateSpeech = async (): Promise<any> => {
          try {
            // Call our Edge Function
            const { data, error } = await supabase.functions.invoke('text-to-speech', {
              body: { 
                text, 
                voice,
                options: {
                  rate
                }
              },
            });
            
            if (error) {
              console.error("Error from text-to-speech function:", error);
              throw new Error(`TTS API error: ${error.message}`);
            }
            
            if (!data || !data.audio) {
              console.error("No audio data received from text-to-speech function");
              throw new Error("No audio data received");
            }
            
            return data;
          } catch (error) {
            console.error("Error in text-to-speech generation:", error);
            
            // Implement retry logic
            if (retryCountRef.current < maxRetries) {
              retryCountRef.current++;
              console.log(`Retrying TTS (attempt ${retryCountRef.current} of ${maxRetries})...`);
              
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              return tryGenerateSpeech();
            } else {
              throw error;
            }
          }
        };
        
        // Attempt to generate speech with retry logic
        const data = await tryGenerateSpeech();
        audioBase64 = data.audio;
        
        // Cache the audio for future use
        audioCache.current.set(cacheKey, audioBase64);
        
        // Update toast
        toast.success('Audio ready', { id: 'tts' });
      } else {
        console.log("Using cached audio");
      }
      
      // Create and play the audio
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      currentAudioRef.current = audio;
      
      // Set up event handlers
      audio.onplay = () => {
        setIsLoading(false);
        setIsSpeaking(true);
        if (onStart) onStart();
      };
      
      audio.onended = () => {
        setIsSpeaking(false);
        pendingTextRef.current = null;
        currentAudioRef.current = null;
        if (onEnd) onEnd();
      };
      
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setIsSpeaking(false);
        setIsLoading(false);
        const errorMessage = "Failed to play audio";
        setError(new Error(errorMessage));
        if (onError) onError(new Error(errorMessage));
        toast.error(errorMessage);
      };
      
      // Set playback rate if specified
      if (rate !== 1.0) {
        audio.playbackRate = rate;
      }
      
      // Play the audio
      await audio.play();
      
    } catch (error) {
      console.error("Text-to-speech error:", error);
      setIsSpeaking(false);
      setIsLoading(false);
      
      const errorMessage = error instanceof Error ? error.message : "Text-to-speech failed";
      setError(new Error(errorMessage));
      
      if (onError) {
        onError(new Error(errorMessage));
      }
      
      toast.error(`Failed to generate speech: ${errorMessage}`, { id: 'tts' });
      pendingTextRef.current = null;
    }
  };

  const stopSpeaking = useCallback(() => {
    if (isSpeaking) {
      cleanupAudio();
      setIsSpeaking(false);
      pendingTextRef.current = null;
      console.log("Speech stopped");
    }
  }, [isSpeaking, cleanupAudio]);

  // Clear the audio cache
  const clearCache = useCallback(() => {
    audioCache.current.clear();
    console.log("Audio cache cleared");
  }, []);

  return {
    speakText,
    stopSpeaking,
    isSpeaking,
    isLoading,
    error,
    clearCache,
    pendingText: pendingTextRef.current
  };
};
