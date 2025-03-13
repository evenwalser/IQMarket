
import { useState, useRef, useEffect } from "react";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useFileAttachments } from "@/hooks/useFileAttachments";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { AssistantType } from "@/lib/types";
import { VoiceSearchInput } from "@/components/search/VoiceSearchInput";
import { ModeSelector } from "@/components/search/ModeSelector";

interface UnifiedSearchProps {
  handleSearch: (query: string) => Promise<void>;
  isLoading: boolean;
  selectedMode: AssistantType;
  setSelectedMode: (mode: AssistantType) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachments: File[];
  structuredOutput: boolean;
  setStructuredOutput: (value: boolean) => void;
  latestResponse?: string; // Add latest response prop to read aloud
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
  
  const { handleAttachmentUpload, removeAttachment, uploadedAttachments } = useFileAttachments();
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
          handleAttachmentUpload={handleAttachmentUpload}
          handleFileUpload={handleFileUpload}
        />
        
        {/* Display attachments if any */}
        {attachments.length > 0 && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-full text-xs">
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <button 
                    onClick={() => removeAttachment && removeAttachment(index)}
                    className="text-purple-500 hover:text-purple-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
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
