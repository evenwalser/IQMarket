
import { useState, useRef, useEffect } from "react";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useFileAttachments } from "@/hooks/useFileAttachments";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { toast } from "sonner";
import type { AssistantType } from "@/lib/types";
import { VoiceSearchInput } from "@/components/search/VoiceSearchInput";
import { FileUploadButton } from "@/components/search/FileUploadButton";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [lastResponse, setLastResponse] = useState<string>("");
  
  // Handle transcription completion in voice mode
  const handleTranscriptionComplete = (text: string) => {
    console.log("Transcription complete, auto submitting search:", text);
    if (voiceMode && text.trim()) {
      // Automatically submit the query when in voice mode
      handleSearch(text);
    }
  };
  
  const { isRecording, isTranscribing, handleMicClick, recordingStartTime } = useVoiceRecording(
    setSearchQuery,
    handleTranscriptionComplete
  );
  
  const { handleAttachmentUpload, removeAttachment } = useFileAttachments();
  const { isSpeaking, speakText, stopSpeaking } = useTextToSpeech();

  // Focus input when voice mode is deactivated
  useEffect(() => {
    if (!voiceMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [voiceMode]);

  // Set structured output based on selected mode
  useEffect(() => {
    setStructuredOutput(selectedMode === 'benchmarks');
  }, [selectedMode, setStructuredOutput]);

  // Update orb state based on current interaction state
  useEffect(() => {
    if (isRecording) {
      setOrbState("user");  // Green - user is speaking
    } else if (isTranscribing || isLoading) {
      setOrbState("idle");  // Purple - processing/thinking
    } else if (isReadingResponse) {
      setOrbState("ai");    // Blue - AI is speaking
    } else {
      setOrbState("idle");  // Default state
    }
  }, [isRecording, isTranscribing, isLoading, isReadingResponse]);

  // Update isReadingResponse based on isSpeaking
  useEffect(() => {
    setIsReadingResponse(isSpeaking);
  }, [isSpeaking]);
  
  // Auto-read responses in voice mode
  useEffect(() => {
    if (voiceMode && latestResponse && latestResponse !== lastResponse && !isLoading && !isRecording && !isTranscribing) {
      // Wait a short delay to ensure UI updates first
      const timer = setTimeout(() => {
        console.log("Auto-reading response in voice mode:", latestResponse);
        speakText(latestResponse);
        setLastResponse(latestResponse); // Update last response to prevent repeated reading
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [voiceMode, latestResponse, lastResponse, isLoading, isRecording, isTranscribing, speakText]);

  const onSearch = async () => {
    if (searchQuery.trim()) {
      try {
        await handleSearch(searchQuery);
        // Save the search query to use for speaking the response later
        setSearchQuery("");
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
      // When voice mode is activated, orbState starts as idle (purple)
      setOrbState("idle");
      // When voice mode is turned on, automatically start recording
      setTimeout(() => {
        if (!isRecording) {
          handleMicClick();
        }
      }, 500);
    } else {
      toast.info("Voice mode deactivated");
      setIsReadingResponse(false);
      stopSpeaking();
      // Stop recording if active when turning off voice mode
      if (isRecording) {
        handleMicClick();
      }
    }
  };

  const stopReading = () => {
    stopSpeaking();
    setIsReadingResponse(false);
    toast.info("Stopped reading response");
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
        
        <FileUploadButton 
          handleFileUpload={handleFileUpload}
          handleAttachmentUpload={handleAttachmentUpload}
          attachments={attachments}
          removeAttachment={removeAttachment}
        />
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
