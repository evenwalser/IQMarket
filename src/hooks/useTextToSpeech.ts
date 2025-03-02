
import { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingTextRef = useRef<string | null>(null);
  const maxRetries = 2;
  const retryCountRef = useRef<number>(0);

  const cleanupAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
    }
  };

  const speakText = async (text: string, voice: string = 'nova') => {
    if (!text.trim()) {
      console.log("Empty text provided to text-to-speech, skipping");
      return;
    }
    
    // If something is already playing, stop it
    cleanupAudio();
    
    try {
      setIsSpeaking(true);
      
      // Display a toast message to indicate that the audio is loading
      toast.loading('Generating audio...', { id: 'tts' });
      pendingTextRef.current = text;
      
      console.log(`Calling text-to-speech function with ${text.length} characters and voice: ${voice}`);
      
      retryCountRef.current = 0;
      const tryGenerateSpeech = async (): Promise<any> => {
        try {
          // Call our Edge Function
          const { data, error } = await supabase.functions.invoke('text-to-speech', {
            body: { 
              text, 
              voice 
            },
          });

          if (error) {
            console.error('Supabase Edge Function error:', error);
            throw new Error(`Edge Function error: ${error.message}`);
          }

          return { data };
        } catch (error) {
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            console.log(`Retrying text-to-speech (attempt ${retryCountRef.current}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            return tryGenerateSpeech();
          } else {
            throw error;
          }
        }
      };
      
      const { data } = await tryGenerateSpeech();

      if (!data) {
        console.error('No data received from text-to-speech function');
        throw new Error('No data received from text-to-speech function');
      }

      if (data.error) {
        console.error('Text-to-speech function returned an error:', data.error);
        throw new Error(data.error);
      }

      if (!data.audioContent) {
        console.error('No audio content in response:', data);
        throw new Error('No audio content received');
      }

      // If the pending text has changed by the time we get a response, don't play it
      if (pendingTextRef.current !== text) {
        console.log("Text changed while waiting for TTS, discarding audio");
        return;
      }
      
      console.log("Received audio data, creating audio element");
      
      // Convert base64 back to audio
      const audioSrc = `data:audio/mp3;base64,${data.audioContent}`;
      const audio = new Audio(audioSrc);
      
      // Set up audio event listeners
      audio.onplay = () => {
        console.log("Audio playback started");
        if (data.wasTruncated) {
          toast.success('Playing truncated audio (text was too long)', { id: 'tts' });
        } else {
          toast.success('Playing audio response', { id: 'tts' });
        }
        setIsSpeaking(true);
      };
      
      audio.onended = () => {
        console.log("Audio playback completed");
        setIsSpeaking(false);
        cleanupAudio();
        pendingTextRef.current = null;
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        toast.error('Failed to play audio', { id: 'tts' });
        setIsSpeaking(false);
        cleanupAudio();
        pendingTextRef.current = null;
      };
      
      // Store the audio element for reference (to stop it later if needed)
      currentAudioRef.current = audio;
      
      // Play the audio
      console.log("Attempting to play audio");
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(error => {
          console.error("Error playing audio:", error);
          toast.error('Failed to play audio', { id: 'tts' });
          setIsSpeaking(false);
          cleanupAudio();
        });
      }
      
    } catch (error) {
      console.error('Text-to-speech error:', error);
      toast.error('Failed to generate speech: ' + (error as Error).message, { id: 'tts' });
      setIsSpeaking(false);
      pendingTextRef.current = null;
    }
  };

  const stopSpeaking = () => {
    if (isSpeaking) {
      cleanupAudio();
      setIsSpeaking(false);
      pendingTextRef.current = null;
      toast.dismiss('tts');
    }
  };

  return {
    isSpeaking,
    speakText,
    stopSpeaking
  };
};
