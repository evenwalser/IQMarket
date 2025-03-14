
import React, { useState } from "react";
import { UnifiedSearch } from "@/components/UnifiedSearch";
import { useToast } from "@/components/ui/use-toast";
import LogoutButton from "@/components/LogoutButton";

const Index = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"knowledge" | "frameworks" | "benchmarks" | "assistant">("assistant");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [structuredOutput, setStructuredOutput] = useState(false);
  const [latestResponse, setLatestResponse] = useState<string>("");

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    try {
      // Simulate search delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLatestResponse(`Response for: ${query}`);
      toast({
        title: "Search completed",
        description: "Found results for your query",
      });
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: "An error occurred while searching",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...fileArray]);
      toast({
        title: "Files attached",
        description: `${fileArray.length} file(s) attached successfully`,
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Assistant Explorer</h1>
        <LogoutButton />
      </div>
      
      <div className="max-w-3xl mx-auto">
        <UnifiedSearch 
          handleSearch={handleSearch}
          isLoading={isLoading}
          selectedMode={selectedMode}
          setSelectedMode={setSelectedMode}
          handleFileUpload={handleFileUpload}
          attachments={attachments}
          structuredOutput={structuredOutput}
          setStructuredOutput={setStructuredOutput}
          latestResponse={latestResponse}
        />
        
        {latestResponse && (
          <div className="mt-8 p-6 bg-white rounded-lg shadow-md border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Response:</h2>
            <p className="text-gray-700">{latestResponse}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
