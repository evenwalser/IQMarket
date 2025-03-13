
import { useEffect, useRef } from "react";
import { useFileAttachments } from "@/hooks/useFileAttachments";
import type { AssistantType } from "@/lib/types";
import { SearchArea } from "@/components/search/SearchArea";
import { toast } from "sonner";

interface UnifiedSearchProps {
  handleSearch: (query: string) => Promise<void>;
  isLoading: boolean;
  selectedMode: AssistantType;
  setSelectedMode: (mode: AssistantType) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachments: File[];
  structuredOutput: boolean;
  setStructuredOutput: (value: boolean) => void;
  latestResponse?: string | null;
  threadId?: string | null;
  onAssistantResponse?: (response: string, threadId: string, visualizations: any[]) => void;
}

export const UnifiedSearch = ({
  handleSearch,
  isLoading,
  selectedMode,
  setSelectedMode,
  handleFileUpload,
  attachments,
  structuredOutput,
  setStructuredOutput,
  latestResponse,
  threadId,
  onAssistantResponse
}: UnifiedSearchProps) => {
  const prevSelectedModeRef = useRef<AssistantType>(selectedMode);
  
  // Clear attachments when changing modes from benchmarks to something else
  useEffect(() => {
    if (prevSelectedModeRef.current === 'benchmarks' && selectedMode !== 'benchmarks' && attachments.length > 0) {
      // Create an empty event to clear attachments
      const emptyEvent = {
        target: {
          files: []
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleFileUpload(emptyEvent);
      toast.info("Attachments cleared when changing mode");
    }
    
    prevSelectedModeRef.current = selectedMode;
  }, [selectedMode, attachments, handleFileUpload]);

  return (
    <SearchArea
      handleSearch={handleSearch}
      isLoading={isLoading}
      selectedMode={selectedMode}
      setSelectedMode={setSelectedMode}
      handleFileUpload={handleFileUpload}
      attachments={attachments}
      structuredOutput={structuredOutput}
      setStructuredOutput={setStructuredOutput}
      latestResponse={latestResponse}
      threadId={threadId}
      onAssistantResponse={onAssistantResponse}
    />
  );
};
