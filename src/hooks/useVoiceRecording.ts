
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const useVoiceRecording = (
  setSearchQuery: (query: string) => void,
  onTranscriptionComplete?: (text: string) => void
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const detectSilence = (stream: MediaStream, silenceThreshold = 10, silenceDuration = 2000) => {
    // Create audio context if it doesn't exist
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
    }
    
    const checkSilence = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      // Calculate average volume level
      const average = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / 
                     dataArrayRef.current.length;
      
      if (average < silenceThreshold) {
        // If silence, set timeout to stop recording after silenceDuration
        if (!silenceTimeoutRef.current) {
          silenceTimeoutRef.current = setTimeout(() => {
            console.log("Silence detected, stopping recording");
            stopRecording();
          }, silenceDuration);
        }
      } else {
        // If sound detected, clear the timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
      }
      
      // Continue checking if still recording
      if (isRecording) {
        requestAnimationFrame(checkSilence);
      }
    };
    
    // Start checking for silence
    checkSilence();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        toast.loading('Converting speech to text...', { id: 'transcription' });
        setIsTranscribing(true);
        
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onload = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          try {
            console.log('Sending audio to OpenAI Whisper API...');
            const { data, error } = await supabase.functions.invoke('voice-to-text', {
              body: { audio: base64Audio }
            });

            if (error) throw error;
            if (!data?.text) throw new Error('No transcription received');

            // Set the query text first
            setSearchQuery(data.text);
            
            // Calculate duration
            const recordingDuration = recordingStartTime 
              ? ((Date.now() - recordingStartTime) / 1000).toFixed(1) 
              : 'unknown';
            
            toast.success(`Transcribed ${recordingDuration}s audio: "${data.text}"`, { 
              id: 'transcription',
              duration: 4000 
            });
            console.log('Transcription received:', data.text);
            
            // Call the callback after transcription is complete
            if (onTranscriptionComplete && data.text.trim()) {
              onTranscriptionComplete(data.text);
            }
          } catch (error) {
            console.error('Transcription error:', error);
            toast.error('Failed to transcribe: ' + (error as Error).message, { id: 'transcription' });
          } finally {
            setIsTranscribing(false);
            setRecordingStartTime(null);
            
            // Clean up audio context
            if (audioContextRef.current) {
              audioContextRef.current.close();
              audioContextRef.current = null;
              analyserRef.current = null;
              dataArrayRef.current = null;
            }
          }
        };

        reader.readAsDataURL(audioBlob);
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      toast.success('Listening... Speak now and pause when done', { id: 'recording' });
      
      // Start silence detection after recording begins
      detectSilence(stream);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    // Clear any pending silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setMediaRecorder(null);
      toast.success('Processing your speech...', { id: 'recording' });
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return {
    isRecording,
    isTranscribing,
    handleMicClick,
    recordingStartTime
  };
};
