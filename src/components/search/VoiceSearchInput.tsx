
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Volume2, X, Upload } from "lucide-react";
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
  
  // Show orb when voice mode is active
  useEffect(() => {
    setShowOrb(voiceMode);
    
    // Auto-start recording when voice mode is activated
    if (voiceMode && !isRecording && !isTranscribing && !isReadingResponse) {
      // Small delay to ensure the UI updates first
      const timer = setTimeout(() => {
        handleMicClick();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [voiceMode, isRecording, isTranscribing, isReadingResponse, handleMicClick]);

  // Helper function to get status text
  const getStatusText = () => {
    if (isRecording) return "Listening... Speak now and pause when done";
    if (isTranscribing) return "Processing your speech...";
    if (isReadingResponse) return "AI is speaking...";
    if (voiceMode) return "Voice mode active. Click the purple button to start";
    return "Ask our Intelligence anything about your business and journey";
  };

  return (
    <div className="relative flex items-center">
      {/* Voice Mode Toggle Button */}
      <div className="mr-4">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={toggleVoiceMode}
            className={`
              rounded-full w-12 h-12 transition-all shadow-lg
              ${voiceMode 
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white' 
                : 'bg-gradient-to-r from-indigo-400 to-purple-400 hover:from-indigo-500 hover:to-purple-500 opacity-70 hover:opacity-100 text-white'
              }
              ${isRecording ? 'animate-pulse' : ''}
            `}
          >
            <Volume2 className="h-5 w-5 text-white" />
          </Button>
        </div>
      </div>
      
      {/* Floating Orb Above Search Box - Appears when voice mode is active */}
      <div className="absolute left-0 right-0 mx-auto w-full flex justify-center">
        <AnimatePresence>
          {showOrb && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: -120 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
              className="absolute z-30"
            >
              <DataOrb 
                size={180} 
                speakingState={orbState} 
                pulseIntensity={1.5} 
                speed={1.2} 
              />
            </motion.div>
          )}
        </AnimatePresence>
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
            if (e.key === 'Enter') {
              onSearch();
            }
          }}
          disabled={voiceMode && isRecording}
        />
        
        {/* Clear button and Search Button with Upload Icon */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {/* Clear button when there's text */}
          {searchQuery && (
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
              className="rounded-full bg-red-50 text-red-600 border-red-200 hover:bg-red-100 h-8 px-2 py-0"
              onClick={stopReading}
            >
              <X className="h-3 w-3 mr-1" />
              Stop
            </Button>
          )}
          
          {/* Recording indicator - small visual cue */}
          {voiceMode && isRecording && (
            <div className="mr-2 flex items-center">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-1.5"></span>
              <span className="text-xs text-red-500 font-medium">Recording</span>
            </div>
          )}
          
          {/* Wider Search button with Upload functionality inside */}
          <div className="relative inline-flex items-center">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="rounded-full h-10 min-w-28 pr-3 pl-4 py-0 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-between"
              onClick={onSearch}
              disabled={isLoading || (!searchQuery.trim() && !isRecording)}
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
                />
                <Upload className="h-4 w-4 text-white" />
              </label>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
