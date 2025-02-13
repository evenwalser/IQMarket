
import { Search, Mic, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: () => void;
  isLoading: boolean;
  showAttachMenu: boolean;
  setShowAttachMenu: (show: boolean) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SearchInput = ({
  searchQuery,
  setSearchQuery,
  handleSearch,
  isLoading,
  showAttachMenu,
  setShowAttachMenu,
  handleFileUpload
}: SearchInputProps) => (
  <div className="relative max-w-3xl mx-auto">
    <div className="relative">
      <Input 
        type="text" 
        placeholder="Ask anything..." 
        className="w-full h-14 px-14 rounded-full border-0 bg-gray-800/80 text-white placeholder:text-gray-400 focus:ring-0 focus:border-0 text-lg" 
        value={searchQuery} 
        onChange={e => setSearchQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            handleSearch();
          }
        }}
      />
      
      {/* Left icon - File upload */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2">
        <div className="relative">
          <Button 
            variant="ghost"
            size="sm"
            type="button"
            className="p-0 h-auto hover:bg-transparent"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
          >
            <Upload className="h-6 w-6 text-gray-400" />
          </Button>
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.txt,.csv,image/*"
            onClick={e => e.stopPropagation()}
          />
        </div>
      </div>

      {/* Right icons - Mic and Dots */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className="p-0 h-auto hover:bg-transparent"
          onClick={handleSearch}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            <Mic className="h-6 w-6 text-gray-400" />
          )}
        </Button>
        <div className="text-gray-400 text-2xl leading-none">⋮</div>
      </div>
    </div>
  </div>
);
