
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
  <div className="relative">
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input 
          type="text" 
          placeholder="Ask anything..." 
          className="w-full h-14 pl-12 pr-24 rounded-lg border border-gray-200 focus:border-gray-400 transition-colors text-gray-900 placeholder:text-gray-500" 
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
              <Upload className="h-5 w-5 text-gray-600" />
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

        {/* Right icons - Mic and Search */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="p-0 h-auto hover:bg-transparent"
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600" />
            ) : (
              <Mic className="h-5 w-5 text-gray-600" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="p-0 h-auto hover:bg-transparent"
            onClick={handleSearch}
          >
            <Search className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </div>
    </div>
  </div>
);
