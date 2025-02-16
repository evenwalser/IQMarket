import { useState } from "react";
import { Search, Mic, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AttachmentList } from "@/components/chat/AttachmentList";

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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<any[]>([]);

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

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    
    try {
      for (const file of files) {
        const filePath = `${crypto.randomUUID()}-${file.name.replace(/[^\x00-\x7F]/g, '')}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: metaData, error: metaError } = await supabase
          .from('chat_attachments')
          .insert({
            file_path: filePath,
            file_name: file.name,
            content_type: file.type,
            size: file.size
          })
          .select()
          .single();

        if (metaError) throw metaError;

        setUploadedAttachments(prev => [...prev, metaData]);
        toast.success(`File ${file.name} uploaded successfully`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file: ' + (error as Error).message);
    }

    handleFileUpload(e);
  };

  const removeAttachment = async (index: number) => {
    const removedAttachment = uploadedAttachments[index];
    
    try {
      const { error: storageError } = await supabase.storage
        .from('chat-attachments')
        .remove([removedAttachment.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('chat_attachments')
        .delete()
        .eq('id', removedAttachment.id);

      if (dbError) throw dbError;

      setAttachments(prev => prev.filter((_, i) => i !== index));
      setUploadedAttachments(prev => prev.filter((_, i) => i !== index));
      toast.success('File removed successfully');
    } catch (error) {
      console.error('Error removing file:', error);
      toast.error('Failed to remove file: ' + (error as Error).message);
    }
  };

  return (
    <div className="relative space-y-2">
      <div className="relative flex-1">
        <Input 
          type="text" 
          placeholder="Ask anything..." 
          className="w-full h-14 pl-12 pr-32 rounded-lg border border-gray-200 focus:border-gray-400 transition-colors text-gray-900 placeholder:text-gray-500" 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
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
              onChange={handleAttachmentUpload}
              accept=".pdf,.doc,.docx,.txt,.csv,image/*"
              multiple
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-6">
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
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
            ) : (
              <Search className="h-5 w-5 text-gray-600" />
            )}
          </Button>
        </div>
      </div>
      <AttachmentList 
        attachments={attachments} 
        onRemove={removeAttachment} 
      />
    </div>
  );
};
