
import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { AssistantType, Conversation } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { SearchInput } from "@/components/SearchInput";
import { SearchModes } from "@/components/SearchModes";
import { ConversationList } from "@/components/ConversationList";

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

      if (error) {
        throw error;
      }

      const typedData = data?.map(item => ({
        ...item,
        assistant_type: item.assistant_type as AssistantType
      })) || [];

      setConversations(typedData);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversation history');
    }
  };

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
      const { data, error } = await supabase.functions.invoke('chat-with-assistant', {
        body: {
          message: searchQuery,
          assistantType: selectedMode
        },
      });

      if (error) throw error;

      const { error: dbError } = await supabase
        .from('conversations')
        .insert({
          query: searchQuery,
          response: data.response,
          assistant_type: selectedMode,
          thread_id: data.thread_id
        });

      if (dbError) {
        console.error('Error storing conversation:', dbError);
        toast.error('Failed to save conversation');
      }

      await loadConversations();
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
      <Header />

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          <section className="text-center space-y-6">
            <h1 className="text-4xl font-bold text-gray-900">Notion Capital Intelligence</h1>
            <p className="text-gray-600 text-lg font-normal">
              Access founder wisdom, benchmark data, and strategic frameworks
            </p>
            <div className="relative">
              <div className="flex flex-col gap-4">
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
            </div>
          </section>

          <ConversationList conversations={conversations} />
        </div>
      </main>
    </div>
  );
};

export default Index;
