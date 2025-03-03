
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Volume2, X, Upload, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DataOrb from "@/components/DataOrb";

interface VoiceSearchInputProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: () => Promise<void>;
  isLoading: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  handleMicClick: () => void;
  recordingStartTime: number | null;
  voiceMode: boolean;
  toggleVoiceMode: () => void;
  isReadingResponse: boolean;
  stopReading: () => void;
  orbState: "idle" | "user" | "ai";
  inputRef: React.RefObject<HTMLInputElement>;
  handleAttachmentUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const VoiceSearchInput: React.FC<VoiceSearchInputProps> = ({
  searchQuery,
  setSearchQuery,
  onSearch,
  isLoading,
  isRecording,
  isTranscribing,
  handleMicClick,
  voiceMode,
  toggleVoiceMode,
  isReadingResponse,
  stopReading,
  orbState,
  inputRef,
  handleAttachmentUpload,
  handleFileUpload
}) => {
  const [showOrb, setShowOrb] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // We no longer show the orb in this component as the ConversationalVoiceMode handles that
  useEffect(() => {
    setShowOrb(false);
  }, [voiceMode]);
  
  // Update recording duration timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingDuration(0);
    }
    
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  // Helper function to get status text
  const getStatusText = () => {
    if (isRecording) return `Listening... (${recordingDuration}s) - Pause when done`;
    if (isTranscribing) return "Processing your speech...";
    if (isReadingResponse) return "AI is speaking...";
    if (voiceMode) return "Voice mode active. Click to start speaking";
    return "Ask our Intelligence anything about your business and journey";
  };

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  return (
    <div className="relative flex items-center">
      {/* Voice Mode Toggle Button */}
      <div className="mr-4">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={toggleVoiceMode}
          className={`
            rounded-full w-12 h-12 transition-all shadow-lg
            ${voiceMode 
              ? 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white' 
              : 'bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-700 border border-gray-200'
            }
          `}
        >
          <Volume2 className={`h-5 w-5 ${voiceMode ? 'text-white' : 'text-gray-600'}`} />
        </Button>
      </div>
      
      {/* Search Box */}
      <div className="relative flex-1 bg-white shadow-lg rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-all">
        <Input 
          ref={inputRef}
          type="text" 
          placeholder={getStatusText()} 
          className={`w-full h-14 px-5 rounded-xl border-0 focus:ring-0 transition-colors text-gray-900 placeholder:text-gray-500 text-center ${voiceMode ? 'bg-gray-50' : ''}`}
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !voiceMode) {
              onSearch();
            }
          }}
          readOnly={voiceMode}
          disabled={voiceMode || isLoading}
        />
        
        {/* Status Indicator in Voice Mode */}
        {voiceMode && (
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-7">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              isRecording ? 'bg-green-100 text-green-700' : 
              isTranscribing ? 'bg-amber-100 text-amber-700' :
              isReadingResponse ? 'bg-blue-100 text-blue-700' :
              'bg-purple-100 text-purple-700'
            }`}>
              {isRecording ? `Recording (${formatDuration(recordingDuration)})` : 
               isTranscribing ? 'Processing speech...' :
               isReadingResponse ? 'AI Speaking...' :
               'Voice Mode Active'}
            </div>
          </div>
        )}
        
        {/* Action buttons on the right side of input */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {/* Clear button when there's text */}
          {searchQuery && !voiceMode && (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="h-8 w-8 rounded-full p-0 hover:bg-gray-100"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4 text-gray-500" />
            </Button>
          )}
          
          {/* In voice mode, show stop reading button when applicable */}
          {voiceMode && isReadingResponse && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="rounded-full bg-red-50 text-red-600 border-red-200 hover:bg-red-100 h-8 px-3 py-0"
              onClick={stopReading}
            >
              <X className="h-3 w-3 mr-1" />
              Stop AI
            </Button>
          )}
          
          {/* Voice mode - manual microphone control */}
          {voiceMode && !isReadingResponse && !isTranscribing && (
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              type="button"
              className={`rounded-full h-8 px-3 py-0 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
              }`}
              onClick={handleMicClick}
            >
              {isRecording ? (
                <>
                  <X className="h-3 w-3 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="h-3 w-3 mr-1" />
                  Speak
                </>
              )}
            </Button>
          )}
          
          {/* Recording indicator - small visual cue */}
          {voiceMode && isRecording && (
            <div className="mr-2 flex items-center">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-1.5"></span>
              <span className="text-xs text-red-500 font-medium">{formatDuration(recordingDuration)}</span>
            </div>
          )}
          
          {/* Search/Upload button (disabled in voice mode) */}
          <div className="relative inline-flex items-center">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="rounded-full h-10 min-w-28 pr-3 pl-4 py-0 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-between"
              onClick={onSearch}
              disabled={isLoading || (!searchQuery.trim() && !isRecording) || voiceMode}
            >
              <span className="flex items-center gap-1">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-1">Search</span>
              </span>
              
              <span className="h-6 w-px bg-purple-400 mx-2"></span>
              
              <label className="cursor-pointer relative inline-flex items-center">
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  onChange={e => {
                    if (handleAttachmentUpload && handleFileUpload) {
                      handleAttachmentUpload(e);
                      handleFileUpload(e);
                    }
                  }}
                  accept=".pdf,.doc,.docx,.txt,.csv,image/*"
                  multiple
                  onClick={e => e.stopPropagation()}
                  disabled={voiceMode}
                />
                <Upload className="h-4 w-4 text-white" />
              </label>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
