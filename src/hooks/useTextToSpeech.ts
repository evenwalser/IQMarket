
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const speakText = async (text: string, voice: string = 'nova') => {
    if (!text.trim()) return;
    
    // If something is already playing, stop it
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      setCurrentAudio(null);
    }

    try {
      setIsSpeaking(true);
      
      // Display a toast message to indicate that the audio is loading
      toast.loading('Generating audio...', { id: 'tts' });
      
      // Call our Edge Function
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice },
      });

      if (error) throw error;
      if (!data || !data.audioContent) throw new Error('No audio data received');

      // Convert base64 back to audio
      const audioSrc = `data:audio/mp3;base64,${data.audioContent}`;
      const audio = new Audio(audioSrc);
      
      // Set up audio event listeners
      audio.onplay = () => {
        toast.success('Playing audio response', { id: 'tts' });
        setIsSpeaking(true);
      };
      
      audio.onended = () => {
        setIsSpeaking(false);
        setCurrentAudio(null);
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        toast.error('Failed to play audio', { id: 'tts' });
        setIsSpeaking(false);
        setCurrentAudio(null);
      };
      
      // Store the audio element for reference (to stop it later if needed)
      setCurrentAudio(audio);
      
      // Play the audio
      await audio.play();
      
    } catch (error) {
      console.error('Text-to-speech error:', error);
      toast.error('Failed to generate speech: ' + (error as Error).message, { id: 'tts' });
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      setCurrentAudio(null);
    }
    setIsSpeaking(false);
    toast.dismiss('tts');
  };

  return {
    isSpeaking,
    speakText,
    stopSpeaking
  };
};
