
import { useState } from "react";
import { Search, Mic, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SearchInputProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: () => void;
  isLoading: boolean;
  showAttachMenu: boolean;
  setShowAttachMenu: (show: boolean) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SearchInput = ({
  searchQuery,
  setSearchQuery,
  handleSearch,
  isLoading,
  showAttachMenu,
  setShowAttachMenu,
  handleFileUpload
}: SearchInputProps) => {
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

            setSearchQuery(data.text);
            toast.success('Successfully transcribed via OpenAI Whisper!', { id: 'transcription' });
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
      // Stop all audio tracks
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
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input 
            type="text" 
            placeholder="Ask anything..." 
            className="w-full h-14 pl-12 pr-24 rounded-lg border border-gray-200 focus:border-gray-400 transition-colors text-gray-900 placeholder:text-gray-500" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
          {/* Left icon - File upload */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <div className="relative">
              <Button 
                variant="ghost"
                size="sm"
                type="button"
                className="p-0 h-auto hover:bg-transparent"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
              >
                <Upload className="h-5 w-5 text-gray-600" />
              </Button>
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.txt,.csv,image/*"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Right icons - Mic and Search */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className={`p-0 h-auto hover:bg-transparent transition-colors ${isRecording ? 'text-red-500' : ''} ${isTranscribing ? 'opacity-50' : ''}`}
              onClick={handleMicClick}
              disabled={isLoading || isTranscribing}
            >
              <Mic className={`h-5 w-5 ${isRecording ? 'animate-pulse' : ''}`} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="p-0 h-auto hover:bg-transparent"
              onClick={handleSearch}
            >
              <Search className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
