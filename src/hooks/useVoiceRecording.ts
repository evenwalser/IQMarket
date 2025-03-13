
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
  const silenceDetectionActiveRef = useRef<boolean>(false);
  const audioLevelCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const consecutiveSilenceCountRef = useRef<number>(0);
  const minRecordingDurationRef = useRef<number>(1500); // Minimum 1.5s recording
  const recordingTooShortRef = useRef<boolean>(false);
  const silenceThresholdRef = useRef<number>(5); // Configurable silence threshold
  const lastTranscriptionRef = useRef<string>('');

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (audioLevelCheckIntervalRef.current) {
        clearInterval(audioLevelCheckIntervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => console.error("Error closing audio context:", err));
      }
    };
  }, []);

  const detectSilence = (stream: MediaStream, silenceDuration = 2000) => {
    console.log("Setting up silence detection with threshold:", silenceThresholdRef.current, "and duration:", silenceDuration);
    
    // Create audio context if it doesn't exist
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);
        
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        
        console.log("Audio analysis setup complete for silence detection");
        silenceDetectionActiveRef.current = true;
      } catch (err) {
        console.error("Error setting up audio analysis:", err);
        return;
      }
    }
    
    // Use interval for more consistent checking
    if (audioLevelCheckIntervalRef.current) {
      clearInterval(audioLevelCheckIntervalRef.current);
    }
    
    audioLevelCheckIntervalRef.current = setInterval(() => {
      if (!analyserRef.current || !dataArrayRef.current || !silenceDetectionActiveRef.current) {
        return;
      }
      
      // Don't trigger silence detection if we haven't recorded long enough
      const currentDuration = recordingStartTime ? Date.now() - recordingStartTime : 0;
      if (currentDuration < minRecordingDurationRef.current) {
        return;
      }
      
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      // Calculate average volume level
      const average = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / 
                     dataArrayRef.current.length;
      
      // Log less frequently to avoid console spam
      if (Math.random() < 0.05) {  // Only log ~5% of audio readings
        console.log(`Current audio level: ${average.toFixed(2)}`);
      }
      
      if (average < silenceThresholdRef.current) {
        consecutiveSilenceCountRef.current += 1;
        if (consecutiveSilenceCountRef.current % 3 === 0) {
          console.log(`Silence count: ${consecutiveSilenceCountRef.current}`);
        }
        
        // More sensitive silence detection: stop after fewer consecutive silent readings
        if (consecutiveSilenceCountRef.current >= 4) {  // Reduced from 5 to 4
          if (!silenceTimeoutRef.current) {
            console.log(`Consistent silence detected (avg: ${average}), stopping recording in ${silenceDuration}ms`);
            silenceTimeoutRef.current = setTimeout(() => {
              console.log("Silence timeout triggered, stopping recording");
              stopRecording();
            }, silenceDuration);
          }
        }
      } else {
        // Reset silence counter if we hear sound
        consecutiveSilenceCountRef.current = 0;
        
        // If sound detected, clear the timeout
        if (silenceTimeoutRef.current) {
          console.log(`Sound detected (avg: ${average}), clearing silence timer`);
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
      }
    }, 250); // Check more frequently (250ms instead of 300ms)
  };

  const startRecording = async () => {
    try {
      // Reset any existing silence detection state
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      
      if (audioLevelCheckIntervalRef.current) {
        clearInterval(audioLevelCheckIntervalRef.current);
        audioLevelCheckIntervalRef.current = null;
      }
      
      // Close any existing audio context
      if (audioContextRef.current) {
        try {
          await audioContextRef.current.close();
        } catch (err) {
          console.error("Error closing previous audio context:", err);
        }
        audioContextRef.current = null;
        analyserRef.current = null;
        dataArrayRef.current = null;
      }
      
      silenceDetectionActiveRef.current = false;
      audioChunksRef.current = []; // Reset audio chunks
      consecutiveSilenceCountRef.current = 0;
      recordingTooShortRef.current = false;
      lastTranscriptionRef.current = ''; // Reset last transcription
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        processRecording();
      };

      setMediaRecorder(recorder);
      recorder.start(1000); // Collect data in 1-second chunks
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      toast.success('Listening... Speak now and pause when done', { id: 'recording' });
      
      // Set silence threshold based on device (mobile vs desktop)
      const isMobile = window.innerWidth <= 768;
      silenceThresholdRef.current = isMobile ? 7 : 5; // Higher threshold for mobile devices
      
      // Start silence detection after a short delay to avoid initial setup noise
      setTimeout(() => {
        silenceDetectionActiveRef.current = true;
        detectSilence(stream, 2000); // 2-second pause detection
      }, 500);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone');
    }
  };

  const processRecording = async () => {
    toast.loading('Converting speech to text...', { id: 'transcription' });
    setIsTranscribing(true);
    silenceDetectionActiveRef.current = false;
    
    // Clean up audio monitoring
    if (audioLevelCheckIntervalRef.current) {
      clearInterval(audioLevelCheckIntervalRef.current);
      audioLevelCheckIntervalRef.current = null;
    }
    
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    
    // Skip empty recordings
    if (audioBlob.size < 1000) { // Less than 1KB is probably empty
      console.log("Recording too small, ignoring empty audio");
      setIsTranscribing(false);
      toast.error("No speech detected, please try again", { id: 'transcription' });
      return;
    }
    
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

        // Store the transcribed text for comparison
        const transcribedText = data.text;
        lastTranscriptionRef.current = transcribedText;
        
        // Set the query text first - make sure this happens
        console.log('Setting search query with transcribed text:', transcribedText);
        setSearchQuery(transcribedText);
        
        // Calculate duration
        const recordingDuration = recordingStartTime 
          ? ((Date.now() - recordingStartTime) / 1000).toFixed(1) 
          : 'unknown';
        
        toast.success(`Transcribed ${recordingDuration}s audio: "${transcribedText}"`, { 
          id: 'transcription',
          duration: 4000 
        });
        console.log('Transcription received:', transcribedText);
        
        // Add a slight delay before calling the callback to ensure state has updated
        setTimeout(() => {
          // Call the callback after transcription is complete
          if (onTranscriptionComplete && transcribedText.trim()) {
            console.log('Calling onTranscriptionComplete with:', transcribedText);
            onTranscriptionComplete(transcribedText);
          }
        }, 300);
        
      } catch (error) {
        console.error('Transcription error:', error);
        toast.error('Failed to transcribe: ' + (error as Error).message, { id: 'transcription' });
      } finally {
        setIsTranscribing(false);
        setRecordingStartTime(null);
        
        // Clean up audio context
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(err => console.error("Error closing audio context:", err));
          audioContextRef.current = null;
          analyserRef.current = null;
          dataArrayRef.current = null;
        }
      }
    };

    reader.readAsDataURL(audioBlob);
  };

  const stopRecording = () => {
    console.log("Stopping recording...");
    
    // Clear any pending silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    // Clear audio level check interval
    if (audioLevelCheckIntervalRef.current) {
      clearInterval(audioLevelCheckIntervalRef.current);
      audioLevelCheckIntervalRef.current = null;
    }

    silenceDetectionActiveRef.current = false;

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
    recordingStartTime,
    lastTranscription: lastTranscriptionRef.current // Expose the last transcription
  };
};
