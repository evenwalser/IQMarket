
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AttachmentList } from "@/components/chat/AttachmentList";
import { SearchControls } from "@/components/search/SearchControls";
import { useFileAttachments } from "@/hooks/useFileAttachments";

interface SearchInputProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: () => void;
  isLoading: boolean;
  showAttachMenu: boolean;
  setShowAttachMenu: (show: boolean) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachments: File[];
}

export const SearchInput = ({
  searchQuery,
  setSearchQuery,
  handleSearch,
  isLoading,
  showAttachMenu,
  setShowAttachMenu,
  handleFileUpload,
  attachments
}: SearchInputProps) => {
  // Remove the problematic hook usage
  const { handleAttachmentUpload, removeAttachment } = useFileAttachments();

  return (
    <div className="relative space-y-2">
      <div className="relative flex-1">
        <Input 
          type="text" 
          placeholder="Ask anything..." 
          className="w-full h-14 pl-12 pr-32 rounded-lg border border-gray-200 focus:border-gray-400 transition-colors text-gray-900 placeholder:text-gray-500" 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleSearch();
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
        <SearchControls
          isLoading={isLoading}
          isRecording={false}
          isTranscribing={false}
          onMicClick={() => {}}
          onSearch={handleSearch}
        />
      </div>
      <AttachmentList 
        attachments={attachments} 
        onRemove={removeAttachment} 
      />
    </div>
  );
};
