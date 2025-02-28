
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const useVoiceRecording = (setSearchQuery: (query: string) => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);

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
          } catch (error) {
            console.error('Transcription error:', error);
            toast.error('Failed to transcribe: ' + (error as Error).message, { id: 'transcription' });
          } finally {
            setIsTranscribing(false);
            setRecordingStartTime(null);
          }
        };

        reader.readAsDataURL(audioBlob);
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      toast.success('Listening... Speak now', { id: 'recording' });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
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
