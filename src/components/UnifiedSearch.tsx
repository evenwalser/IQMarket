
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Search, Loader2, Mic, MicOff, Volume2, LayoutTemplate, X } from "lucide-react";
import { AttachmentList } from "@/components/chat/AttachmentList";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useFileAttachments } from "@/hooks/useFileAttachments";
import { Switch } from "@/components/ui/switch";
import { ModeExplainer } from "@/components/ModeExplainer";
import { toast } from "sonner";
import type { AssistantType } from "@/lib/types";

interface UnifiedSearchProps {
  handleSearch: (query: string) => Promise<void>;
  isLoading: boolean;
  selectedMode: AssistantType;
  setSelectedMode: (mode: AssistantType) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachments: File[];
  structuredOutput: boolean;
  setStructuredOutput: (value: boolean) => void;
}

export const UnifiedSearch = ({
  handleSearch,
  isLoading,
  selectedMode,
  setSelectedMode,
  handleFileUpload,
  attachments,
  structuredOutput,
  setStructuredOutput
}: UnifiedSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showModeExplainer, setShowModeExplainer] = useState<AssistantType | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isReadingResponse, setIsReadingResponse] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { isRecording, isTranscribing, handleMicClick } = useVoiceRecording(setSearchQuery);
  const { handleAttachmentUpload, removeAttachment } = useFileAttachments();

  // Focus input when voice mode is turned off
  useEffect(() => {
    if (!voiceMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [voiceMode]);

  const onSearch = async () => {
    if (searchQuery.trim()) {
      // For demonstration, we'll add text-to-speech functionality here
      // In a real implementation, this would connect to a TTS service
      try {
        await handleSearch(searchQuery);
        setSearchQuery("");
        
        // Simulate text-to-speech if in voice mode
        if (voiceMode) {
          toast.info("Reading response aloud...");
          setIsReadingResponse(true);
          
          // Simulate TTS completion after 3 seconds
          setTimeout(() => {
            setIsReadingResponse(false);
            toast.success("Response read completely");
          }, 3000);
        }
      } catch (error) {
        console.error("Search error:", error);
      }
    }
  };

  const toggleVoiceMode = () => {
    setVoiceMode(!voiceMode);
    if (!voiceMode) {
      toast.info("Voice mode activated. Click the microphone to start speaking.");
    } else {
      toast.info("Voice mode deactivated");
      setIsReadingResponse(false);
    }
  };

  const stopReading = () => {
    setIsReadingResponse(false);
    toast.info("Stopped reading response");
  };

  return (
    <div className="space-y-4">
      <div className="relative space-y-2">
        <div className="relative flex items-center bg-white shadow-lg rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-all">
          {/* Voice Mode Toggle */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-2">
            <Button
              variant={voiceMode ? "default" : "outline"}
              size="icon"
              type="button"
              className={`h-10 w-10 rounded-full p-2 transition-all ${voiceMode ? 'bg-purple-600 hover:bg-purple-700' : 'text-gray-500 hover:text-gray-800'}`}
              onClick={toggleVoiceMode}
            >
              <Volume2 className={`h-5 w-5 ${voiceMode ? 'text-white' : ''}`} />
            </Button>
            
            {/* File Upload Button */}
            <div className="relative">
              <Button 
                variant="outline"
                size="icon"
                type="button"
                className="h-10 w-10 rounded-full p-2 text-gray-500 hover:text-gray-800"
              >
                <Upload className="h-5 w-5" />
              </Button>
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={e => {
                  handleAttachmentUpload(e);
                  handleFileUpload(e);
                }}
                accept=".pdf,.doc,.docx,.txt,.csv,image/*"
                multiple
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
          
          {/* Search Input */}
          <Input 
            ref={inputRef}
            type="text" 
            placeholder={voiceMode ? "Voice mode active. Start speaking..." : "Ask our Intelligence anything about your business and journey"} 
            className={`w-full h-14 pl-24 pr-32 rounded-xl border-0 focus:ring-0 transition-colors text-gray-900 placeholder:text-gray-500 text-center ${voiceMode ? 'bg-gray-50' : ''}`}
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                onSearch();
              }
            }}
            disabled={voiceMode && isRecording}
          />
          
          {/* Right side controls */}
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
            
            {/* In voice mode, show controls for recording */}
            {voiceMode && (
              <div className="flex items-center gap-2">
                {isReadingResponse ? (
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
                ) : (
                  <Button
                    variant={isRecording ? "default" : "outline"}
                    size="icon"
                    type="button"
                    className={`h-10 w-10 rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'text-gray-600 hover:text-gray-800'} ${isTranscribing ? 'opacity-50' : ''}`}
                    onClick={handleMicClick}
                    disabled={isLoading || isTranscribing}
                  >
                    {isRecording ? (
                      <MicOff className="h-5 w-5 text-white" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </Button>
                )}
              </div>
            )}
            
            {/* Search button */}
            <Button
              type="button"
              variant="default"
              size="sm"
              className="rounded-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white"
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
        
        {/* Attachments List */}
        <AttachmentList 
          attachments={attachments} 
          onRemove={removeAttachment} 
        />
      </div>

      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="flex-1">
          <div className="flex gap-3 relative">
            {['knowledge', 'benchmarks', 'frameworks'].map((mode) => (
              <div key={mode} className="flex-1 relative">
                <Button
                  variant="outline"
                  className={`w-full py-4 px-4 flex items-center justify-between border-2 ${
                    selectedMode === mode ? 'border-gray-900 bg-gray-50' : ''
                  }`}
                  onClick={() => setSelectedMode(mode as AssistantType)}
                  onMouseEnter={() => setShowModeExplainer(mode as AssistantType)}
                  onMouseLeave={() => setShowModeExplainer(null)}
                >
                  <span className="text-sm font-medium capitalize">{mode}</span>
                </Button>
                
                {showModeExplainer === mode && (
                  <div className="absolute z-10 bg-white p-4 rounded-lg shadow-lg border border-gray-200 w-72 mt-2 left-0 right-0">
                    <ModeExplainer mode={mode as AssistantType} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <Switch
            id="structured-output"
            checked={structuredOutput}
            onCheckedChange={setStructuredOutput}
          />
          <div className="flex items-center gap-1.5">
            <LayoutTemplate className="h-4 w-4 text-gray-600" />
            <label htmlFor="structured-output" className="text-sm text-gray-700 whitespace-nowrap">
              Structured Output
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
