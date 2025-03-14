
import React, { useState } from "react";
import { UnifiedSearch } from "@/components/UnifiedSearch";
import { useToast } from "@/components/ui/use-toast";
import LogoutButton from "@/components/LogoutButton";
import { EmptyConversationState } from "@/components/conversation/EmptyConversationState";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"knowledge" | "frameworks" | "benchmarks" | "assistant">("knowledge");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [structuredOutput, setStructuredOutput] = useState(false);
  const [latestResponse, setLatestResponse] = useState<string>("");
  const [conversations, setConversations] = useState<string[]>([]);

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

  const startNewConversation = () => {
    // Logic to start a new conversation would go here
    toast({
      title: "New conversation started",
      description: "You can now ask a new question",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with logo and nav */}
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">NOTION</h1>
          </div>
          <nav className="flex space-x-8">
            <a href="#" className="text-gray-700 hover:text-gray-900">Platform</a>
            <a href="#" className="text-gray-700 hover:text-gray-900">Portfolio</a>
            <a href="#" className="text-gray-700 hover:text-gray-900">About</a>
          </nav>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Intelligence Title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold flex justify-center items-center">
            <span className="text-purple-600 mr-2">✧</span>
            <span>NOTION</span>
            <span className="text-purple-600 ml-2 mr-2">Intelligence</span>
            <span className="text-purple-600">✧</span>
          </h1>
        </div>
        
        {/* Unified Search Component */}
        <div className="max-w-3xl mx-auto mb-10">
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
        </div>
        
        {/* Conversation Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Your Conversation</h2>
            <Button 
              onClick={startNewConversation}
              className="bg-white text-gray-800 hover:bg-gray-100 border border-gray-300"
            >
              Start New Conversation
            </Button>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <EmptyConversationState />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
