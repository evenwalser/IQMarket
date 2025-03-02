
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Mic, MicOff, Volume2, X } from "lucide-react";
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
    <div className="relative flex items-center bg-white shadow-lg rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-all">
      {/* Voice Mode Toggle Button - Blended into left side of search box */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center">
        <Button
          variant={voiceMode ? "default" : "ghost"}
          size="icon"
          type="button"
          onClick={toggleVoiceMode}
          className={`rounded-full transition-all ${
            voiceMode 
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md' 
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Volume2 className={`h-5 w-5 ${voiceMode ? 'text-white' : ''}`} />
        </Button>
      </div>
      
      {/* Microphone Button - Next to voice toggle */}
      <div className="absolute left-16 top-1/2 -translate-y-1/2">
        <Button
          variant={isRecording ? "destructive" : "default"}
          size="icon"
          type="button"
          className={`h-10 w-10 rounded-full ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse border-none' 
              : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
          } ${isTranscribing ? 'opacity-50' : ''} ${voiceMode ? 'opacity-100' : 'opacity-60'}`}
          onClick={handleMicClick}
          disabled={isLoading || isTranscribing || !voiceMode}
        >
          {isRecording ? (
            <MicOff className="h-5 w-5 text-white" />
          ) : (
            <Mic className="h-5 w-5 text-white" />
          )}
        </Button>
      </div>
      
      {/* Search Input - Adjusted padding for the left side controls */}
      <div className="relative w-full">
        <Input 
          ref={inputRef}
          type="text" 
          placeholder={voiceMode ? "Voice mode active. Ask anything..." : "Ask our Intelligence anything about your business and journey"} 
          className={`w-full h-14 pl-32 pr-24 rounded-xl border-0 focus:ring-0 transition-colors text-gray-900 placeholder:text-gray-500 text-center ${voiceMode ? 'bg-gray-50' : ''}`}
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
      </div>
      
      {/* Clear & Search Buttons */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
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
            className="rounded-full bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
            onClick={stopReading}
          >
            <X className="h-4 w-4 mr-1" />
            Stop Reading
          </Button>
        )}
        
        {/* Search button */}
        <Button
          type="button"
          variant="default"
          size="sm"
          className="rounded-full px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
          onClick={onSearch}
          disabled={isLoading || (!searchQuery.trim() && !isRecording)}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-white animate-spin" />
          ) : (
            <>
              <Search className="h-4 w-4 mr-1" />
              Search
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
