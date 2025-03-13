
import { useState, useRef } from "react";
import { toast } from "sonner";
import type { AssistantType } from "@/lib/types";
import { VoiceSearchInput } from "@/components/search/VoiceSearchInput";
import { ModeSelector } from "@/components/search/ModeSelector";
import { useVoiceInteraction } from "@/hooks/useVoiceInteraction";
import { useAttachmentManager } from "@/components/search/AttachmentManager";

interface SearchAreaProps {
  handleSearch: (query: string) => Promise<void>;
  isLoading: boolean;
  selectedMode: AssistantType;
  setSelectedMode: (mode: AssistantType) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachments: File[];
  structuredOutput: boolean;
  setStructuredOutput: (value: boolean) => void;
  latestResponse?: string | null;
  threadId?: string | null;
  onAssistantResponse?: (response: string, threadId: string, visualizations: any[]) => void;
}

export const SearchArea = ({
  handleSearch,
  isLoading,
  selectedMode,
  setSelectedMode,
  handleFileUpload,
  attachments,
  structuredOutput,
  setStructuredOutput,
  latestResponse,
  threadId,
  onAssistantResponse
}: SearchAreaProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const prevSelectedModeRef = useRef<AssistantType>(selectedMode);
  
  // Use the voice interaction hook
  const {
    voiceMode,
    isRecording,
    recordingTime,
    orbState,
    isReadingResponse,
    transcription,
    sendChatRequest,
    isWebSocketConnected,
    formatTime,
    stopReading,
    toggleVoiceMode,
    handleVoiceButtonClick,
    isProcessingAudio
  } = useVoiceInteraction({
    selectedMode,
    threadId,
    structuredOutput,
    latestResponse,
    onAssistantResponse,
    handleSearch
  });

  // Use the attachment manager
  const {
    isDraggingOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeAttachment,
    clearAttachments
  } = useAttachmentManager({
    selectedMode,
    handleFileUpload,
    attachments
  });

  // Clear attachments when changing modes from benchmarks to something else
  if (prevSelectedModeRef.current === 'benchmarks' && selectedMode !== 'benchmarks' && attachments.length > 0) {
    clearAttachments();
    toast.info("Attachments cleared when changing mode");
    prevSelectedModeRef.current = selectedMode;
  }

  // Handle text search submission
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    
    // Update transcription if in voice mode
    if (voiceMode && transcription) {
      setSearchQuery(transcription);
    }
  };

  const handleSearchQuery = async () => {
    if (!searchQuery.trim() && (!attachments || attachments.length === 0)) {
      toast.error("Please enter a query or attach a file to analyze");
      return;
    }
    
    try {
      // Check if we have file attachments and we're using the Benchmarks assistant
      if (attachments.length > 0 && selectedMode === 'benchmarks') {
        console.log("Handling query with file attachments for Benchmarks assistant");
        
        // Shift focus from the input field
        if (inputRef.current) {
          inputRef.current.blur();
        }
        
        // Visual feedback
        // This would normally be done by the parent component
        if (isWebSocketConnected) {
          // Prepare file references
          // In a real implementation, you would upload these files and get their paths
          const fileRefs = attachments.map(file => ({
            name: file.name,
            type: file.type,
            // These would normally be the actual upload paths
            url: URL.createObjectURL(file), // Temporary URL for display
            path: `chat-attachments/${file.name}` // Placeholder path
          }));
          
          // Use the chat request with attachments
          const success = await sendChatRequest(searchQuery || "Please analyze this data", {
            assistantType: selectedMode,
            threadId: threadId || undefined,
            structuredOutput,
            textToSpeech: voiceMode,
            attachments: fileRefs
          });
          
          if (success) {
            // Clear the search query after sending
            setSearchQuery('');
            
            // Clear attachments after a successful response
            setTimeout(clearAttachments, 1000);
          } else {
            toast.error("Failed to send file attachment. Please try again.");
          }
        } else {
          toast.error("WebSocket not connected. Please reload the page and try again.");
        }
      } else {
        // Regular text query without file attachments
        await handleSearch(searchQuery);
        setSearchQuery('');
      }
    } catch (err) {
      console.error('Error handling search query:', err);
      toast.error('Failed to process your query. Please try again.');
    }
  };

  const getPlaceholderText = () => {
    return voiceMode 
      ? "Say something..." 
      : selectedMode === 'benchmarks'
        ? "Ask about data or drag & drop files here for analysis"
        : `Ask our ${selectedMode} Intelligence about your business and journey`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Voice and search controls */}
      {isReadingResponse && (
        <div className="hidden">{stopReading()}</div>
      )}
      
      <div className="flex flex-col space-y-4">
        {/* Search input with integrated voice controls and file upload */}
        <div className="w-full">
          <VoiceSearchInput
            ref={inputRef}
            value={searchQuery}
            onChange={handleSearchInputChange}
            onSearch={handleSearchQuery}
            placeholder={getPlaceholderText()}
            isLoading={isLoading}
            isRecording={isRecording}
            isProcessing={isProcessingAudio}
            disabled={isLoading || (voiceMode && isRecording)}
            orbState={orbState}
            onFileDrop={handleDrop}
            voiceMode={voiceMode}
            onToggleVoiceMode={toggleVoiceMode}
            onToggleRecording={handleVoiceButtonClick}
            // Show file upload only in benchmarks mode
            showFileUpload={selectedMode === 'benchmarks'}
            onFileUpload={handleFileUpload}
            attachments={attachments}
            onRemoveAttachment={removeAttachment}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            isDraggingOver={isDraggingOver}
          />
        </div>
        
        {/* Centered mode selector */}
        <div className="flex justify-center">
          <div className="max-w-md w-full">
            <ModeSelector
              selectedMode={selectedMode}
              onModeSelect={setSelectedMode}
              disabled={isLoading}
            />
          </div>
        </div>
        
        {/* Benchmarks mode hint - now centered below mode selector */}
        {selectedMode === 'benchmarks' && (
          <div className="text-sm text-muted-foreground text-center">
            <p>Drag and drop financial and operational data files (CSV, Excel, PDF) into the search box for analysis</p>
          </div>
        )}
        
        {/* Recording indicator */}
        {isRecording && (
          <div className="text-sm text-muted-foreground flex items-center space-x-2 mt-2 justify-center">
            <span className="animate-pulse text-destructive">● Recording</span>
            <span>{formatTime(recordingTime)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
