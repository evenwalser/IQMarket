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
import { Button } from "@/components/ui/button";

interface UploadedAttachment {
  id: string;
  file_path: string;
  file_name: string;
  content_type: string;
  size: number;
  created_at: string;
}

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMode, setSelectedMode] = useState<AssistantType>("knowledge");
  const [isLoading, setIsLoading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<UploadedAttachment[]>([]);

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
        const parsedVisualizations = (item.visualizations || []).map((viz: Json) => {
          if (typeof viz === 'object' && viz !== null) {
            const visualization: ChatVisualization = {
              type: (viz as any).type as 'table' | 'chart',
              data: (viz as any).data || []
            };

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

    try {
      console.log("Starting file upload process...");
      for (const file of Array.from(files)) {
        console.log("Processing file:", {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: new Date(file.lastModified).toISOString()
        });

        const filePath = `${crypto.randomUUID()}-${file.name.replace(/[^\x00-\x7F]/g, '')}`;
        console.log("Generated file path:", filePath);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          throw uploadError;
        }

        console.log("File uploaded to storage successfully:", uploadData);

        const { data, error: insertError } = await supabase
          .from('chat_attachments')
          .insert({
            file_path: filePath,
            file_name: file.name,
            content_type: file.type,
            size: file.size
          })
          .select()
          .single();

        if (insertError) {
          console.error("Database insert error:", insertError);
          throw insertError;
        }

        console.log("File metadata saved to database:", data);

        if (data) {
          setAttachments(prev => [...prev, file]);
          setUploadedAttachments(prev => [...prev, data as UploadedAttachment]);
          toast.success(`File ${file.name} uploaded successfully`);
        }
      }
    } catch (error) {
      console.error('Error in file upload process:', error);
      toast.error('Failed to upload file: ' + (error as Error).message);
    }
  };

  const clearAttachments = () => {
    setAttachments([]);
    setUploadedAttachments([]);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a question");
      return;
    }
    setIsLoading(true);
    try {
      let formattedAttachments = [];
      
      if (uploadedAttachments.length > 0) {
        console.log("Processing attachments for search:", uploadedAttachments);
        formattedAttachments = uploadedAttachments.map(att => {
          const publicUrl = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(att.file_path)
            .data.publicUrl;

          return {
            url: publicUrl,
            file_path: att.file_path,
            file_name: att.file_name,
            content_type: att.content_type
          };
        });
      }

      console.log("Sending request to chat-with-assistant function:", {
        message: searchQuery,
        assistantType: selectedMode,
        attachments: formattedAttachments
      });

      const { data, error } = await supabase.functions.invoke('chat-with-assistant', {
        body: {  // Remove JSON.stringify here
          message: searchQuery,
          assistantType: selectedMode,
          attachments: formattedAttachments
        }
      });
      
      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      console.log("Received response from edge function:", data);

      if (!data || !data.response) {
        console.error("No response data received");
        throw new Error('No response received from assistant');
      }

      const visualizations = (data.visualizations || []).map((viz: any) => {
        console.log("Processing visualization:", viz);
        return {
          type: viz.type,
          data: viz.data,
          headers: viz.headers,
          chartType: viz.chartType,
          xKey: viz.xKey,
          yKeys: viz.yKeys,
          height: viz.height
        };
      }) as Json[];

      console.log('Final processed visualizations:', visualizations);

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
        clearAttachments();
        toast.success("Response received!");
      }
    } catch (error) {
      console.error("Full error details:", error);
      toast.error("Failed to get response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const testAssistantAPI = async () => {
    try {
      toast.loading('Testing Assistant API...', { id: 'test' });
      const { data, error } = await supabase.functions.invoke('test-assistant');
      
      if (error) throw error;
      
      console.log('Test results:', data);
      toast.success('API Test completed! Check console for results', { id: 'test' });
    } catch (error) {
      console.error('Test error:', error);
      toast.error('API Test failed! Check console for details', { id: 'test' });
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
              <Button 
                variant="outline"
                className="mt-4"
                onClick={testAssistantAPI}
              >
                Test Assistant API
              </Button>
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
                      attachments={attachments}
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
