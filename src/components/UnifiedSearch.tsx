import { useState, useRef, useEffect } from "react";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useFileAttachments } from "@/hooks/useFileAttachments";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { toast } from "sonner";
import type { AssistantType } from "@/lib/types";
import { VoiceSearchInput } from "@/components/search/VoiceSearchInput";
import { FileUploadButton } from "@/components/search/FileUploadButton";
import { ModeSelector } from "@/components/search/ModeSelector";
import { ConversationalVoiceMode } from "@/components/ConversationalVoiceMode";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [lastResponse, setLastResponse] = useState<string>("");
  const [voiceInteractionComplete, setVoiceInteractionComplete] = useState(false);
  const [processingVoiceInteraction, setProcessingVoiceInteraction] = useState(false);
  const submittedQueryRef = useRef<string>("");
  
  const { isRecording, isTranscribing, handleMicClick, recordingStartTime } = useVoiceRecording(
    setSearchQuery,
    handleTranscriptionComplete
  );
  
  const { handleAttachmentUpload, removeAttachment } = useFileAttachments();
  const { isSpeaking, speakText, stopSpeaking } = useTextToSpeech();

  function handleTranscriptionComplete(text: string) {
    console.log("Transcription complete, auto submitting search:", text);
    
    if (voiceMode && text.trim()) {
      try {
        setProcessingVoiceInteraction(true);
        
        setSearchQuery(text);
        submittedQueryRef.current = text;
        
        console.log("About to submit search with query:", text);
        handleSearch(text);
        console.log("Search automatically submitted in voice mode");
      } catch (error) {
        console.error("Error auto-submitting search:", error);
        toast.error("Failed to process your request");
        setProcessingVoiceInteraction(false);
      }
    }
  }

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
        setVoiceInteractionComplete(true);
        setProcessingVoiceInteraction(false);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [voiceMode, latestResponse, lastResponse, isLoading, isRecording, isTranscribing, speakText]);

  useEffect(() => {
    if (voiceInteractionComplete && !isSpeaking) {
      setTimeout(() => {
        if (voiceMode) {
          console.log("Voice interaction complete, turning off voice mode");
          setVoiceMode(false);
          toast.info("Voice interaction complete");
          setVoiceInteractionComplete(false);
          setProcessingVoiceInteraction(false);
          submittedQueryRef.current = "";
        }
      }, 1000);
    }
  }, [voiceInteractionComplete, isSpeaking, voiceMode]);

  const onSearch = async () => {
    if (searchQuery.trim()) {
      try {
        submittedQueryRef.current = searchQuery;
        console.log("Manual search submitted with query:", searchQuery);
        
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
      submittedQueryRef.current = "";
      setVoiceInteractionComplete(false);
      setProcessingVoiceInteraction(false);
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
      setVoiceInteractionComplete(false);
      setProcessingVoiceInteraction(false);
      submittedQueryRef.current = "";
    }
  };

  const stopReading = () => {
    stopSpeaking();
    setIsReadingResponse(false);
    toast.info("Stopped reading response");
    
    if (voiceMode) {
      setVoiceInteractionComplete(true);
      setProcessingVoiceInteraction(false);
    }
  };
  
  const handleVoiceMessage = (message: { role: 'user' | 'assistant', content: string }) => {
    if (message.role === 'user') {
      console.log("Voice assistant user message:", message.content);
      handleSearch(message.content);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative space-y-2">
        <div className="absolute -left-16 top-1/2 -translate-y-1/2 z-10">
          <ConversationalVoiceMode 
            isActive={voiceMode}
            onToggle={toggleVoiceMode}
            onMessage={handleVoiceMessage}
            assistantType={selectedMode}
          />
        </div>
        
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
}
