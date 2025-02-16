
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { AssistantType, Conversation } from "@/lib/types";
import type { ChatVisualization } from "@/types/chat";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { SearchInput } from "@/components/SearchInput";
import { SearchModes } from "@/components/SearchModes";
import { ConversationList } from "@/components/ConversationList";
import { ChatInterface } from "@/components/ChatInterface";
import { Sparkles } from "lucide-react";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMode, setSelectedMode] = useState<AssistantType>("knowledge");
  const [isLoading, setIsLoading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      const typedData = data?.map(item => {
        // Convert the visualizations to the correct format for display
        const parsedVisualizations = (item.visualizations || []).map((viz: Json) => {
          if (typeof viz === 'object' && viz !== null) {
            const visualization: ChatVisualization = {
              type: (viz as any).type as 'table' | 'chart',
              data: (viz as any).data || []
            };

            // Add optional properties only if they exist
            if ((viz as any).headers) visualization.headers = (viz as any).headers as string[];
            if ((viz as any).chartType) visualization.chartType = (viz as any).chartType as 'line' | 'bar';
            if ((viz as any).xKey) visualization.xKey = (viz as any).xKey as string;
            if ((viz as any).yKeys) visualization.yKeys = (viz as any).yKeys as string[];
            if ((viz as any).height) visualization.height = (viz as any).height as number;

            return visualization;
          }
          return null;
        }).filter((viz): viz is ChatVisualization => viz !== null);

        return {
          ...item,
          assistant_type: item.assistant_type as AssistantType,
          visualizations: parsedVisualizations
        };
      }) || [];
      
      setConversations(typedData);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversation history');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      console.log("Processing file:", file.name, file.type);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a question");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-with-assistant', {
        body: {
          message: searchQuery,
          assistantType: selectedMode
        }
      });
      
      if (error) throw error;
      if (!data || !data.response) {
        throw new Error('No response received from assistant');
      }

      // Convert the visualization data to match the database schema
      const visualizations = (data.visualizations || []).map((viz: any) => ({
        type: viz.type,
        data: viz.data,
        headers: viz.headers,
        chartType: viz.chartType,
        xKey: viz.xKey,
        yKeys: viz.yKeys,
        height: viz.height
      })) as Json[];

      console.log('Received visualizations:', visualizations);

      const { error: dbError } = await supabase
        .from('conversations')
        .insert({
          query: searchQuery,
          response: data.response,
          assistant_type: selectedMode,
          thread_id: data.thread_id,
          assistant_id: data.assistant_id,
          visualizations: visualizations
        });

      if (dbError) {
        console.error('Error storing conversation:', dbError);
        toast.error('Failed to save conversation');
      } else {
        await loadConversations();
        setSearchQuery("");
        toast.success("Response received!");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to get response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header />

      <main className="pt-0">
        <div className="w-full bg-gradient-to-r from-purple-600/5 via-blue-500/5 to-purple-600/5 
          animate-gradient-background backdrop-blur-sm pb-24">
          <div className="max-w-[1600px] mx-auto px-4 pt-20 bg-[#f2f2f2]">
            <div className="text-center mb-8 relative">
              <div className="inline-flex items-center gap-3 group">
                <Sparkles className="w-7 h-7 text-purple-500 group-hover:text-purple-600 transition-colors animate-pulse" />
                <div className="flex items-center gap-2">
                  <img 
                    src="/lovable-uploads/8440a119-0b53-46c9-a6c7-4bcef311d38f.png" 
                    alt="Notion" 
                    className="w-32 h-auto object-cover"
                  />
                  <h1 className="font-bold bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-gradient relative hover:scale-[1.02] transition-transform tracking-tight text-4xl">
                    Intelligence
                  </h1>
                </div>
                <Sparkles className="w-7 h-7 text-purple-500 group-hover:text-purple-600 transition-colors animate-pulse" />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="w-[65%] space-y-12">
                <section className="space-y-6">
                  <div className="space-y-4">
                    <SearchInput 
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      handleSearch={handleSearch}
                      isLoading={isLoading}
                      showAttachMenu={showAttachMenu}
                      setShowAttachMenu={setShowAttachMenu}
                      handleFileUpload={handleFileUpload}
                    />
                    <SearchModes 
                      selectedMode={selectedMode}
                      setSelectedMode={setSelectedMode}
                    />
                  </div>
                </section>

                <ConversationList conversations={conversations} />
              </div>

              <div className="w-[35%] bg-white rounded-lg border border-gray-200 p-6 h-fit">
                <ChatInterface />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
