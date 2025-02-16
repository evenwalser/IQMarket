
import { Mic, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchControlsProps {
  isLoading: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  onMicClick: () => void;
  onSearch: () => void;
}

export const SearchControls = ({
  isLoading,
  isRecording,
  isTranscribing,
  onMicClick,
  onSearch
}: SearchControlsProps) => (
  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-6">
    <Button
      variant="ghost"
      size="sm"
      type="button"
      className={`p-0 h-auto hover:bg-transparent transition-colors ${isRecording ? 'text-red-500' : ''} ${isTranscribing ? 'opacity-50' : ''}`}
      onClick={onMicClick}
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
);
