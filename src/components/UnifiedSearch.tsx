
import { useState, useRef, useEffect, useCallback } from "react";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useFileAttachments } from "@/hooks/useFileAttachments";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { toast } from "sonner";
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
  latestResponse?: string | null;
  threadId?: string | null;
  onAssistantResponse?: (response: string, threadId: string, visualizations: any[]) => void;
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
  latestResponse,
  threadId,
  onAssistantResponse
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
  const prevSelectedModeRef = useRef<AssistantType>(selectedMode);
  
  // Initialize the real-time chat hook
  const {
    isConnected: isWebSocketConnected,
    isConnecting: isWebSocketConnecting,
    sendVoiceData,
    transcription,
    assistantResponse,
    speechAudio,
    resetState: resetWebSocketState,
    sendChatRequest
  } = useRealtimeChat();
  
  // Initialize the voice recording hook with the enhanced version
  const {
    isRecording,
    isPaused,
    isProcessing: isProcessingAudio,
    recordingTime,
    audioBase64,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording
  } = useVoiceRecording({
    onRecordingComplete: (audioData) => {
      console.log("Recording complete, audio data length:", audioData.length);
      // Process voice recording through WebSocket if connected
      if (isWebSocketConnected) {
        sendVoiceData(audioData, {
          processWithAssistant: true,
          assistantType: selectedMode,
          threadId: threadId || undefined,
          structuredOutput,
          textToSpeech: voiceMode
        });
      } else {
        toast.error("WebSocket not connected. Voice processing unavailable.");
      }
    },
    silenceTimeout: 2000, // 2 seconds of silence to auto-stop
    maxDuration: 60000, // Max 1 minute recording
  });
  
  // Text-to-speech hook
  const { speakText, stopSpeaking, isSpeaking } = useTextToSpeech();
  
  // Clear attachments when changing modes from benchmarks to something else
  useEffect(() => {
    if (prevSelectedModeRef.current === 'benchmarks' && selectedMode !== 'benchmarks' && attachments.length > 0) {
      // Create an empty event to clear attachments
      const emptyEvent = {
        target: {
          files: []
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleFileUpload(emptyEvent);
      toast.info("Attachments cleared when changing mode");
    }
    
    prevSelectedModeRef.current = selectedMode;
  }, [selectedMode, attachments, handleFileUpload]);
  
  // Stop TTS reading if active
  const stopReading = () => {
    if (isReadingResponse && stopSpeaking) {
      stopSpeaking();
      setIsReadingResponse(false);
    }
  };
  
  // Toggle voice recording
  const handleVoiceButtonClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
      setOrbState("user");
    } else {
      startRecording();
      setOrbState("user");
      setVoiceInteractionComplete(false);
      setProcessingVoiceInteraction(false);
      
      // Reset previous state when starting a new recording
      resetWebSocketState();
    }
  }, [isRecording, startRecording, stopRecording, resetWebSocketState]);
  
  // File drop handler for drag and drop functionality
  const handleFileDrop = (files: FileList) => {
    if (!files.length) return;
    
    // Only allow file uploads in benchmarks mode
    if (selectedMode !== 'benchmarks') {
      toast.error("File uploads are only available in Benchmarks mode");
      return;
    }
    
    // Convert FileList to array
    const filesArray = Array.from(files);
    
    // Create a synthetic event to pass to handleFileUpload
    const event = {
      target: {
        files: filesArray
      }
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    
    handleFileUpload(event);
  };
  
  // Remove attachment handler
  const removeAttachment = (index: number) => {
    const updatedAttachments = [...attachments];
    updatedAttachments.splice(index, 1);
    
    // Need to update the parent's state
    const event = {
      target: {
        files: updatedAttachments
      }
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleFileUpload(event);
  };
  
  // Format recording time
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
  };
  
  // Handle transcription updates from WebSocket
  useEffect(() => {
    if (transcription) {
      console.log("Received transcription:", transcription);
      setSearchQuery(transcription);
      
      // In voice mode, we can show the transcription in the UI
      if (voiceMode) {
        toast.success(`Transcribed: "${transcription}"`, { duration: 3000 });
      }
    }
  }, [transcription, voiceMode]);
  
  // Handle assistant responses from WebSocket
  useEffect(() => {
    if (assistantResponse) {
      console.log("Received assistant response:", assistantResponse);
      
      // Store the response
      setLastResponse(assistantResponse.response);
      
      // Call the parent callback
      if (onAssistantResponse) {
        onAssistantResponse(
          assistantResponse.response,
          assistantResponse.thread_id,
          assistantResponse.visualizations
        );
      }
      
      // Set state to indicate voice interaction is complete
      setVoiceInteractionComplete(true);
      setProcessingVoiceInteraction(false);
      
      // Update the orb state
      setOrbState("ai");
      setTimeout(() => setOrbState("idle"), 2000);
      
      // If we had file attachments in Benchmarks mode, clear them after successful response
      if (selectedMode === 'benchmarks' && attachments.length > 0) {
        // Clear attachments after a delay to ensure they were processed
        setTimeout(() => {
          const emptyEvent = {
            target: {
              files: []
            }
          } as unknown as React.ChangeEvent<HTMLInputElement>;
          
          handleFileUpload(emptyEvent);
        }, 1000);
      }
    }
  }, [assistantResponse, onAssistantResponse, selectedMode, attachments, handleFileUpload]);
  
  // Handle speech audio from WebSocket
  useEffect(() => {
    if (speechAudio && voiceMode) {
      console.log("Received speech audio, length:", speechAudio.length);
      
      // Play the audio
      const audioElement = new Audio(`data:audio/mp3;base64,${speechAudio}`);
      setIsReadingResponse(true);
      
      audioElement.onended = () => {
        setIsReadingResponse(false);
      };
      
      audioElement.play().catch(error => {
        console.error("Error playing audio:", error);
        setIsReadingResponse(false);
        toast.error("Failed to play audio response");
      });
    }
  }, [speechAudio, voiceMode]);

  // Handle transcription completion in voice mode with automatic submission
  const handleTranscriptionComplete = async (text: string) => {
    console.log("Transcription complete, auto submitting search:", text);
    
    if (voiceMode && text.trim()) {
      try {
        setProcessingVoiceInteraction(true); // Prevent multiple submissions
        
        // Set the search query explicitly and track what we're submitting
        setSearchQuery(text);
        submittedQueryRef.current = text;
        
        console.log("About to submit search with query:", text);
        // Submit the query immediately in voice mode
        await handleSearch(text);
        console.log("Search automatically submitted in voice mode");
      } catch (error) {
        console.error("Error auto-submitting voice search:", error);
        setProcessingVoiceInteraction(false);
      }
    }
  };

  // React to new responses in voice mode
  useEffect(() => {
    // Only trigger TTS in voice mode and if we have a new response
    if (voiceMode && latestResponse && latestResponse !== lastResponse && !isReadingResponse) {
      console.log("New response in voice mode, reading aloud:", latestResponse.substring(0, 50) + "...");
      setLastResponse(latestResponse);
      speakText(latestResponse);
      setIsReadingResponse(true);
    }
  }, [latestResponse, lastResponse, voiceMode, isReadingResponse, speakText]);

  // Toggle voice mode
  const toggleVoiceMode = useCallback(() => {
    // If turning off voice mode, stop any ongoing operations
    if (voiceMode) {
      if (isRecording) {
        cancelRecording();
      }
      
      if (isSpeaking) {
        stopSpeaking();
      }
      
      setIsReadingResponse(false);
      resetWebSocketState();
    } else {
      // When turning on voice mode, we might want to initialize WebSocket connection
      toast.info("Voice mode enabled. Click the microphone to start recording.");
    }
    
    setVoiceMode(!voiceMode);
    setVoiceInteractionComplete(false);
  }, [voiceMode, isRecording, isSpeaking, cancelRecording, stopSpeaking, resetWebSocketState]);

  // Handle text search submission
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchQuery = async () => {
    if (!searchQuery.trim() && (!attachments || attachments.length === 0)) {
      toast.error("Please enter a query or attach a file to analyze");
      return;
    }
    
    submittedQueryRef.current = searchQuery;
    
    try {
      // Check if we have file attachments and we're using the Benchmarks assistant
      if (attachments.length > 0 && selectedMode === 'benchmarks') {
        console.log("Handling query with file attachments for Benchmarks assistant");
        
        // Set the loading state
        // handleSearch is the callback for regular text-only queries
        // but we need special handling for file uploads
        
        // Shift focus from the input field
        if (inputRef.current) {
          inputRef.current.blur();
        }
        
        // Visual feedback
        setOrbState("user");
        
        // Update loading state manually since we're not calling handleSearch
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
            setTimeout(() => setOrbState("ai"), 500);
          } else {
            toast.error("Failed to send file attachment. Please try again.");
            setOrbState("idle");
          }
        } else {
          toast.error("WebSocket not connected. Please reload the page and try again.");
          setOrbState("idle");
        }
      } else {
        // Regular text query without file attachments
        await handleSearch(searchQuery);
        setSearchQuery('');
      }
    } catch (err) {
      console.error('Error handling search query:', err);
      toast.error('Failed to process your query. Please try again.');
      setOrbState("idle");
    }
  };

  const getPlaceholderText = () => {
    return voiceMode 
      ? "Say something..." 
      : selectedMode === 'benchmarks'
        ? "Ask about data or drag & drop files here for analysis"
        : `Ask our ${selectedMode} Intelligence about your business and journey`;
  };

  const disabled = voiceMode && isRecording;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Voice and search controls */}
      {isReadingResponse && stopSpeaking && (
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
            onFileDrop={handleFileDrop}
            voiceMode={voiceMode}
            onToggleVoiceMode={toggleVoiceMode}
            onToggleRecording={handleVoiceButtonClick}
            // Show file upload only in benchmarks mode
            showFileUpload={selectedMode === 'benchmarks'}
            onFileUpload={handleFileUpload}
            attachments={attachments}
            onRemoveAttachment={removeAttachment}
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
