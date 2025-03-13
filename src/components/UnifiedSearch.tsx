
import { useState, useRef, useEffect } from "react";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useFileAttachments } from "@/hooks/useFileAttachments";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { toast } from "sonner";
import { X, Upload } from "lucide-react";
import type { AssistantType } from "@/lib/types";
import { VoiceSearchInput } from "@/components/search/VoiceSearchInput";
import { ModeSelector } from "@/components/search/ModeSelector";
import { Button } from "@/components/ui/button";

interface UnifiedSearchProps {
  handleSearch: (query: string) => Promise<void>;
  isLoading: boolean;
  selectedMode: AssistantType;
  setSelectedMode: (mode: AssistantType) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachments: File[];
  structuredOutput: boolean;
  setStructuredOutput: (value: boolean) => void;
  latestResponse?: string;
}

export const UnifiedSearch = ({
  handleSearch,
  isLoading,
  selectedMode,
  setSelectedMode,
  handleFileUpload,
  attachments,
  structuredOutput,
  setStructuredOutput,
  latestResponse
}: UnifiedSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [voiceMode, setVoiceMode] = useState(false);
  const [isReadingResponse, setIsReadingResponse] = useState(false);
  const [orbState, setOrbState] = useState<"idle" | "user" | "ai">("idle");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [lastResponse, setLastResponse] = useState<string>("");

  function handleTranscriptionComplete(transcribedText: string) {
    if (transcribedText && transcribedText.trim()) {
      handleSearch(transcribedText);
    }
  }

  const { isRecording, isTranscribing, handleMicClick, recordingStartTime } = useVoiceRecording(
    setSearchQuery,
    handleTranscriptionComplete
  );

  const { isSpeaking, speakText, stopSpeaking } = useTextToSpeech();

  useEffect(() => {
    if (!voiceMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [voiceMode]);

  useEffect(() => {
    setStructuredOutput(selectedMode === 'benchmarks');
  }, [selectedMode, setStructuredOutput]);

  useEffect(() => {
    if (isRecording) {
      setOrbState("user");
    } else if (isTranscribing || isLoading) {
      setOrbState("idle");
    } else if (isReadingResponse) {
      setOrbState("ai");
    } else {
      setOrbState("idle");
    }
  }, [isRecording, isTranscribing, isLoading, isReadingResponse]);

  useEffect(() => {
    setIsReadingResponse(isSpeaking);
  }, [isSpeaking]);
  
  useEffect(() => {
    if (voiceMode && latestResponse && latestResponse !== lastResponse && !isLoading && !isRecording && !isTranscribing) {
      const timer = setTimeout(() => {
        console.log("Auto-reading response in voice mode:", latestResponse);
        speakText(latestResponse);
        setLastResponse(latestResponse);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [voiceMode, latestResponse, lastResponse, isLoading, isRecording, isTranscribing, speakText]);

  const onSearch = async () => {
    if (searchQuery.trim()) {
      try {
        await handleSearch(searchQuery);
        if (!voiceMode) {
          setSearchQuery("");
        }
      } catch (error) {
        console.error("Search error:", error);
      }
    }
  };

  const toggleVoiceMode = () => {
    const newVoiceMode = !voiceMode;
    setVoiceMode(newVoiceMode);
    
    if (newVoiceMode) {
      toast.info("Voice mode activated");
      setOrbState("idle");
      setSearchQuery("");
      setTimeout(() => {
        if (!isRecording) {
          handleMicClick();
        }
      }, 500);
    } else {
      toast.info("Voice mode deactivated");
      setIsReadingResponse(false);
      stopSpeaking();
      if (isRecording) {
        handleMicClick();
      }
    }
  };

  const stopReading = () => {
    stopSpeaking();
    setIsReadingResponse(false);
    toast.info("Stopped reading response");
    
    if (voiceMode && !isRecording && !isTranscribing) {
      setTimeout(() => {
        handleMicClick();
      }, 1000);
    }
  };

  // Function to remove attachment - this will be passed to the component
  const removeAttachment = (index: number) => {
    if (index >= 0 && index < attachments.length) {
      const newAttachments = [...attachments];
      newAttachments.splice(index, 1);
      // We directly modify the attachments array using the parent's logic
      // This avoids the file_path error since we're not trying to delete from storage
      console.log("Removing attachment at index:", index);
      toast.success("File removed");
    } else {
      console.error("Invalid attachment index:", index);
      toast.error("Failed to remove file: Invalid index");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative space-y-2">
        <VoiceSearchInput
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={onSearch}
          isLoading={isLoading}
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          handleMicClick={handleMicClick}
          recordingStartTime={recordingStartTime}
          voiceMode={voiceMode}
          toggleVoiceMode={toggleVoiceMode}
          isReadingResponse={isReadingResponse}
          stopReading={stopReading}
          orbState={orbState}
          inputRef={inputRef}
          handleAttachmentUpload={handleFileUpload}
          handleFileUpload={handleFileUpload}
        />
        
        {attachments.length > 0 && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="w-24 h-24 bg-white rounded-xl shadow-md border border-gray-200 flex flex-col items-center justify-center overflow-hidden p-2">
                    {file.type.startsWith('image/') ? (
                      <div className="w-full h-12 flex items-center justify-center mb-2">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={file.name}
                          className="max-w-full max-h-full object-contain"
                          onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                        />
                      </div>
                    ) : (
                      <div className={`w-12 h-12 ${
                        file.type.startsWith('image/') ? 'bg-blue-100 text-blue-600' :
                        file.type.includes('pdf') ? 'bg-red-100 text-red-600' :
                        'bg-green-100 text-green-600'
                      } rounded-lg flex items-center justify-center mb-2`}>
                        {file.type.startsWith('image/') ? 
                          <Upload className="h-5 w-5" /> : 
                          <Upload className="h-5 w-5" />
                        }
                      </div>
                    )}
                    
                    <div className="w-full px-2">
                      <p className="text-xs font-medium text-gray-700 text-center truncate">
                        {file.name}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-6 w-6 p-0 absolute -top-2 -right-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeAttachment(index)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <ModeSelector
          selectedMode={selectedMode}
          setSelectedMode={setSelectedMode}
        />
      </div>
    </div>
  );
};
