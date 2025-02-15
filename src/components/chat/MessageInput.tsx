
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Mic } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface MessageInputProps {
  message: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  hasAttachments: boolean;
}

export const MessageInput = ({ 
  message, 
  onChange, 
  onSend, 
  onFileSelect,
  isLoading,
  hasAttachments
}: MessageInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

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

            onChange(data.text);
            toast.success('Successfully transcribed!', { id: 'transcription' });
            console.log('Transcription received:', data.text);
          } catch (error) {
            console.error('Transcription error:', error);
            toast.error('Failed to transcribe: ' + (error as Error).message, { id: 'transcription' });
          } finally {
            setIsTranscribing(false);
          }
        };

        reader.readAsDataURL(audioBlob);
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      toast.success('Recording started...', { id: 'recording' });
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
      toast.success('Recording stopped', { id: 'recording' });
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          className="hidden"
          multiple
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMicClick}
          disabled={isLoading || isTranscribing}
          className={`transition-colors ${isRecording ? 'text-red-500' : ''} ${isTranscribing ? 'opacity-50' : ''}`}
        >
          <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
        </Button>
        <Input
          type="text"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          className="flex-1"
          disabled={isLoading}
        />
        <Button
          onClick={onSend}
          disabled={(!message.trim() && !hasAttachments) || isLoading}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
