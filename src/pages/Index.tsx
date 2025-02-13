
import { useState } from "react";
import { Search, ArrowRight, BookOpen, Building2, Lightbulb, Filter, ChevronDown, Upload, BookCopy, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { AssistantType, Conversation } from "@/lib/types";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMode, setSelectedMode] = useState<AssistantType>("knowledge");
  const [isLoading, setIsLoading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  const searchModes = [
    {
      id: "knowledge",
      icon: <BookOpen className="w-5 h-5" />,
      title: "Knowledge Base",
      description: "Search across founder interview"
    },
    {
      id: "benchmarks",
      icon: <Code className="w-5 h-5" />,
      title: "Benchmarks",
      description: "Access performance metrics and data"
    },
    {
      id: "frameworks",
      icon: <BookCopy className="w-5 h-5" />,
      title: "Frameworks",
      description: "Explore GTM and product strategies"
    },
    {
      id: "assistant",
      icon: <img src="/lovable-uploads/a0d0f1b5-2c6e-40c6-a503-fb5a3d773811.png" alt="AI Assistant" className="w-5 h-5" />,
      title: "AI Assistant",
      description: "Get personalized recommendations"
    }
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log("File uploaded:", file.name);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a question");
      return;
    }

    if (selectedMode !== "knowledge" && selectedMode !== "frameworks") {
      toast.error("This feature is not yet available");
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a mock response
      const mockResponse = {
        response: `This is a mock response for your query: "${searchQuery}"`,
      };

      // Add conversation to local state
      const newConversation: Conversation = {
        id: Date.now().toString(),
        query: searchQuery,
        response: mockResponse.response,
        assistant_type: selectedMode,
        thread_id: 'direct',
        created_at: new Date().toISOString()
      };

      setConversations(prev => [newConversation, ...prev]);
      setSearchQuery("");
      toast.success("Response received!");
      
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to get response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between py-px">
          <div className="flex items-center">
            <img src="/lovable-uploads/c043db32-f19c-4f34-8153-6fbc96dab40a.png" alt="Notion Capital" className="h-[84px] mr-2 rounded-lg" />
            <span className="text-lg font-medium text-gray-900"></span>
          </div>
          <nav className="space-x-6">
            <Button variant="ghost" className="text-gray-700 hover:text-gray-900">Resources</Button>
            <Button variant="ghost" className="text-gray-700 hover:text-gray-900">Portfolio</Button>
            <Button variant="ghost" className="text-gray-700 hover:text-gray-900">About</Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Search Section */}
          <section className="text-center space-y-6">
            <h1 className="text-4xl font-bold text-gray-900">Notion Capital Intelligence</h1>
            <p className="text-gray-600 text-lg font-normal">
              Access founder wisdom, benchmark data, and strategic frameworks
            </p>
            <div className="relative">
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input 
                        type="text" 
                        placeholder="Ask anything..." 
                        className="w-full h-14 pl-12 pr-24 rounded-lg border border-gray-200 focus:border-gray-400 transition-colors text-gray-900 placeholder:text-gray-500" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                      />
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                        <Button 
                          variant="ghost"
                          size="sm"
                          className="relative"
                          onClick={() => setShowAttachMenu(!showAttachMenu)}
                        >
                          <Upload className="h-5 w-5 text-gray-600" />
                          <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleFileUpload}
                            accept=".pdf,.doc,.docx,.txt,.csv,image/*"
                          />
                        </Button>
                        <Button 
                          className="bg-gray-900 hover:bg-gray-800"
                          onClick={handleSearch}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                          ) : (
                            <ArrowRight className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Search Modes */}
                <div className="grid grid-cols-2 gap-3">
                  {searchModes.map((mode) => (
                    <div key={mode.id}>
                      <Button
                        variant="outline"
                        className={`w-full py-6 px-6 flex items-center justify-between ${
                          selectedMode === mode.id ? 'border-gray-900 bg-gray-50' : ''
                        }`}
                        onClick={() => setSelectedMode(mode.id as AssistantType)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="shrink-0">
                            {mode.icon}
                          </div>
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-base font-medium text-gray-900">{mode.title}</span>
                            <p className="text-sm text-gray-600">{mode.description}</p>
                          </div>
                        </div>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Conversations */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent Conversations</h2>
            </div>
            <div className="space-y-4">
              {conversations.map((conversation) => (
                <div key={conversation.id} className="bg-white p-6 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-lg text-gray-900">Q: {conversation.query}</h3>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full capitalize">
                      {conversation.assistant_type}
                    </span>
                  </div>
                  <p className="text-gray-600 whitespace-pre-wrap">A: {conversation.response}</p>
                  <div className="mt-4 text-sm text-gray-500">
                    {new Date(conversation.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
              {conversations.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No conversations yet. Start by asking a question above!
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Index;
