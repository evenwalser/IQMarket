
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
  inputRef: React.RefObject<HTMLTextAreaElement>;
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
  
  useEffect(() => {
    setShowOrb(voiceMode);
    
    if (voiceMode && !isRecording && !isTranscribing && !isReadingResponse) {
      const timer = setTimeout(() => {
        handleMicClick();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [voiceMode, isRecording, isTranscribing, isReadingResponse, handleMicClick]);

  const getStatusText = () => {
    if (isRecording) return "Listening... Speak now and pause when done";
    if (isTranscribing) return "Processing your speech...";
    if (isReadingResponse) return "AI is speaking...";
    if (voiceMode) return "Voice mode active. Click to start speaking";
    return "Ask our Intelligence anything about your business and journey";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (handleAttachmentUpload && handleFileUpload) {
      handleAttachmentUpload(e);
      handleFileUpload(e);
      
      e.target.value = '';
    }
  };

  // Use a textarea instead of an input for better text wrapping
  const renderTextArea = () => (
    <textarea
      ref={inputRef}
      placeholder={getStatusText()} 
      className={`w-full px-5 py-4 rounded-xl border-0 focus:ring-0 transition-colors text-gray-900
        placeholder:text-gray-500 text-center resize-none overflow-hidden
        ${voiceMode ? 'bg-gray-50' : ''}`}
      value={searchQuery} 
      onChange={e => {
        setSearchQuery(e.target.value);
        // Auto-adjust height based on content
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(200, e.target.scrollHeight) + 'px';
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onSearch();
        }
      }}
      readOnly={voiceMode}
      disabled={voiceMode || isLoading}
      style={{ 
        minHeight: '56px',
        height: searchQuery ? 'auto' : '56px'
      }}
    />
  );

  return (
    <div className="relative flex items-center">
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

          {isRecording && (
            <div className="absolute -top-1 -right-1">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></div>
            </div>
          )}
        </div>
      </div>
      
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
      
      <div className="relative flex-1 bg-white shadow-lg rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-all">
        {renderTextArea()}
        
        {voiceMode && (
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-7">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              isRecording ? 'bg-green-100 text-green-700' : 
              isTranscribing ? 'bg-amber-100 text-amber-700' :
              isReadingResponse ? 'bg-blue-100 text-blue-700' :
              'bg-purple-100 text-purple-700'
            }`}>
              {isRecording ? 'Listening...' : 
               isTranscribing ? 'Processing...' :
               isReadingResponse ? 'AI Speaking...' :
               'Voice Mode Active'}
            </div>
          </div>
        )}
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
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
          
          {voiceMode && isRecording && (
            <div className="mr-2 flex items-center">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-1.5"></span>
              <span className="text-xs text-red-500 font-medium">Recording</span>
            </div>
          )}
          
          <Button
            type="button"
            variant="default"
            size="sm"
            className="rounded-full h-10 py-0 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center gap-2 px-4"
            onClick={onSearch}
            disabled={isLoading || (!searchQuery.trim() && !isRecording) || voiceMode}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span>Search</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full h-10 w-10 flex items-center justify-center border-purple-200 hover:bg-purple-50"
            disabled={voiceMode}
            onClick={() => document.getElementById('file-upload-button')?.click()}
          >
            <Upload className="h-4 w-4 text-purple-600" />
            <input
              id="file-upload-button"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.csv,image/*"
              multiple
            />
          </Button>
        </div>
      </div>
    </div>
  );
};
