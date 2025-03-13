
import { useState, useRef, useEffect, useCallback } from "react";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { toast } from "sonner";
import type { AssistantType } from "@/lib/types";

interface UseVoiceInteractionProps {
  selectedMode: AssistantType;
  threadId?: string | null;
  structuredOutput: boolean;
  latestResponse?: string | null;
  onAssistantResponse?: (response: string, threadId: string, visualizations: any[]) => void;
  handleSearch: (query: string) => Promise<void>;
}

export const useVoiceInteraction = ({
  selectedMode,
  threadId,
  structuredOutput,
  latestResponse,
  onAssistantResponse,
  handleSearch
}: UseVoiceInteractionProps) => {
  const [voiceMode, setVoiceMode] = useState(false);
  const [isReadingResponse, setIsReadingResponse] = useState(false);
  const [orbState, setOrbState] = useState<"idle" | "user" | "ai">("idle");
  const [lastResponse, setLastResponse] = useState<string>("");
  const [voiceInteractionComplete, setVoiceInteractionComplete] = useState(false);
  const [processingVoiceInteraction, setProcessingVoiceInteraction] = useState(false);
  const submittedQueryRef = useRef<string>("");
  
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

  // Handle transcription updates from WebSocket
  useEffect(() => {
    if (transcription) {
      console.log("Received transcription:", transcription);
      
      // In voice mode, we can show the transcription in the UI
      if (voiceMode) {
        toast.success(`Transcribed: "${transcription}"`, { duration: 3000 });
      }
    }
  }, [transcription, voiceMode]);
  
  // Format recording time
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
  };
  
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
    }
  }, [assistantResponse, onAssistantResponse]);
  
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

  // Handle transcription completion in voice mode with automatic submission
  const handleTranscriptionComplete = async (text: string) => {
    console.log("Transcription complete, auto submitting search:", text);
    
    if (voiceMode && text.trim()) {
      try {
        setProcessingVoiceInteraction(true); // Prevent multiple submissions
        
        // Set the search query explicitly and track what we're submitting
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

  return {
    voiceMode,
    isRecording,
    isPaused,
    isProcessingAudio,
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
    processingVoiceInteraction,
    voiceInteractionComplete
  };
};
