import React, { forwardRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Upload, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import DataOrb from "@/components/DataOrb";
import { Button } from "@/components/ui/button";

interface VoiceSearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => Promise<void>;
  placeholder?: string;
  isLoading?: boolean;
  isRecording?: boolean;
  isProcessing?: boolean;
  disabled?: boolean;
  orbState?: "idle" | "user" | "ai";
  onFileDrop?: (files: FileList) => void;
  voiceMode?: boolean;
  onToggleVoiceMode?: () => void;
  onToggleRecording?: () => void;
}

export const VoiceSearchInput = forwardRef<HTMLInputElement, VoiceSearchInputProps>(({
  value,
  onChange,
  onSearch,
  placeholder = "Ask me anything...",
  isLoading = false,
  isRecording = false,
  isProcessing = false,
  disabled = false,
  orbState = "idle",
  onFileDrop,
  voiceMode = false,
  onToggleVoiceMode,
  onToggleRecording
}, ref) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && !disabled) {
      onSearch();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    
    if (onFileDrop && e.dataTransfer.files.length > 0) {
      onFileDrop(e.dataTransfer.files);
    }
  };

  return (
    <div 
      className={`relative flex items-center w-full ${isDraggingOver ? 'ring-2 ring-primary rounded-full' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Search box with orb animation */}
      <div className="relative w-full">
        <Input
          ref={ref}
          type="text"
          placeholder={placeholder}
          className={`h-12 pl-12 pr-36 rounded-full border-2 text-base focus-visible:ring-offset-0 focus-visible:ring-1 ${isDraggingOver ? 'bg-gray-50 opacity-60' : ''}`}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
        />
        
        {/* Orb */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <div className="w-6 h-6">
            <DataOrb 
              size={24} 
              speakingState={orbState} 
              pulseIntensity={1.2} 
              speed={1}
            />
          </div>
        </div>
        
        {/* Voice controls and search icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {/* Voice mode toggle */}
          {onToggleVoiceMode && (
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 p-0 ${voiceMode ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={onToggleVoiceMode}
              title={voiceMode ? "Disable voice mode" : "Enable voice mode"}
              type="button"
            >
              {voiceMode ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </Button>
          )}
          
          {/* Voice record button */}
          {onToggleRecording && (
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 p-0 ${isRecording ? 'text-destructive' : 'text-muted-foreground'}`}
              onClick={onToggleRecording}
              title={isRecording ? "Stop recording" : "Start voice recording"}
              disabled={disabled}
              type="button"
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </Button>
          )}
          
          {/* Loading indicator */}
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {/* Drag overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 rounded-full bg-primary bg-opacity-10 flex items-center justify-center border-2 border-dashed border-primary">
          <div className="flex items-center text-primary font-medium">
            <Upload className="mr-2 h-5 w-5" />
            Drop files here
          </div>
        </div>
      )}
    </div>
  );
});

VoiceSearchInput.displayName = "VoiceSearchInput";
