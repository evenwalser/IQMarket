
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Search, Loader2, Mic, LayoutTemplate } from "lucide-react";
import { AttachmentList } from "@/components/chat/AttachmentList";
import { SearchModes } from "@/components/SearchModes";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useFileAttachments } from "@/hooks/useFileAttachments";
import { Switch } from "@/components/ui/switch";
import { ModeExplainer } from "@/components/ModeExplainer";
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
  
  const { isRecording, isTranscribing, handleMicClick } = useVoiceRecording(setSearchQuery);
  const { handleAttachmentUpload, removeAttachment } = useFileAttachments();

  const onSearch = () => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery).then(() => {
        setSearchQuery("");
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative space-y-2">
        <div className="relative flex-1">
          <Input 
            type="text" 
            placeholder="Ask a question or search for information..." 
            className="w-full h-14 pl-12 pr-32 rounded-lg border border-gray-200 focus:border-gray-400 transition-colors text-gray-900 placeholder:text-gray-500" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                onSearch();
              }
            }}
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <div className="relative">
              <Button 
                variant="ghost"
                size="sm"
                type="button"
                className="p-0 h-auto hover:bg-transparent"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
              >
                <Upload className="h-5 w-5 text-gray-600" />
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
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-6">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className={`p-0 h-auto hover:bg-transparent transition-colors ${isRecording ? 'text-red-500' : ''} ${isTranscribing ? 'opacity-50' : ''}`}
              onClick={handleMicClick}
              disabled={isLoading || isTranscribing}
            >
              <Mic className={`h-5 w-5 ${isRecording ? 'animate-pulse' : ''}`} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="p-0 h-auto hover:bg-transparent"
              onClick={onSearch}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
              ) : (
                <Search className="h-5 w-5 text-gray-600" />
              )}
            </Button>
          </div>
        </div>
        
        <AttachmentList 
          attachments={attachments} 
          onRemove={removeAttachment} 
        />
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <div className="flex gap-3">
            {['knowledge', 'benchmarks', 'frameworks'].map((mode) => (
              <Button
                key={mode}
                variant="outline"
                className={`flex-1 py-4 px-4 flex items-center justify-between border-2 ${
                  selectedMode === mode ? 'border-gray-900 bg-gray-50' : ''
                }`}
                onClick={() => setSelectedMode(mode as AssistantType)}
                onMouseEnter={() => setShowModeExplainer(mode as AssistantType)}
                onMouseLeave={() => setShowModeExplainer(null)}
              >
                <span className="text-sm font-medium capitalize">{mode}</span>
                {showModeExplainer === mode && (
                  <div className="absolute z-10 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-xs mt-2 top-full">
                    <ModeExplainer mode={mode as AssistantType} />
                  </div>
                )}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="structured-output"
            checked={structuredOutput}
            onCheckedChange={setStructuredOutput}
          />
          <div className="flex items-center gap-1.5">
            <LayoutTemplate className="h-4 w-4 text-gray-600" />
            <label htmlFor="structured-output" className="text-sm text-gray-700">
              Structured Output
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
