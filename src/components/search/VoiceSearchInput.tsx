
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Mic, MicOff, Volume2, X, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DataOrb from "@/components/DataOrb";
import { toast } from "sonner";

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
  inputRef
}) => {
  return (
    <div className="relative flex items-center">
      {/* Voice Mode Toggle Button - Colorful orb-like button */}
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
              ${!isRecording && voiceMode ? 'animate-pulse' : ''}
            `}
          >
            <Volume2 className="h-5 w-5 text-white" />
          </Button>
          
          {/* Microphone Button - Overlaid on the voice toggle when in voice mode */}
          {voiceMode && (
            <Button
              variant={isRecording ? "destructive" : "default"}
              size="icon"
              type="button"
              className={`
                absolute -bottom-4 -right-1 h-8 w-8 rounded-full shadow-md
                ${isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse border-2 border-white' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-2 border-white'
                } 
                ${isTranscribing ? 'opacity-50' : 'opacity-100'}
              `}
              onClick={handleMicClick}
              disabled={isLoading || isTranscribing}
            >
              {isRecording ? (
                <MicOff className="h-3 w-3 text-white" />
              ) : (
                <Mic className="h-3 w-3 text-white" />
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Search Box with Shadow and Rounded Corners */}
      <div className="relative flex-1 bg-white shadow-lg rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-all">
        <Input 
          ref={inputRef}
          type="text" 
          placeholder={voiceMode ? "Voice mode active. Ask anything..." : "Ask our Intelligence anything about your business and journey"} 
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
        
        {/* Orb Overlay for Voice Mode */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <AnimatePresence>
            {(voiceMode && (isRecording || isTranscribing || isReadingResponse)) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="absolute z-10"
              >
                <DataOrb 
                  size={200} 
                  speakingState={orbState} 
                  pulseIntensity={1.3} 
                  speed={1.2} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Clear, Upload & Search Buttons */}
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
          
          {/* Upload button */}
          <label className="cursor-pointer">
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              onChange={e => {
                // Using the props passed to the FileUploadButton which is now empty
                // we call both handlers here
                if (window.handleAttachmentUpload && window.handleFileUpload) {
                  window.handleAttachmentUpload(e);
                  window.handleFileUpload(e);
                }
              }}
              accept=".pdf,.doc,.docx,.txt,.csv,image/*"
              multiple
              onClick={e => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <Upload className="h-4 w-4 text-gray-600" />
            </Button>
          </label>
          
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
          
          {/* Search button */}
          <Button
            type="button"
            variant="default"
            size="sm"
            className="rounded-full h-10 w-10 p-0 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-center"
            onClick={onSearch}
            disabled={isLoading || (!searchQuery.trim() && !isRecording)}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
