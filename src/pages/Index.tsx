import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { AssistantType, Conversation, Json } from "@/lib/types";
import type { ChatVisualization } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { IntelligenceHeader } from "@/components/IntelligenceHeader";
import { UnifiedSearch } from "@/components/UnifiedSearch";
import { ConversationList } from "@/components/ConversationList";
import { useFileAttachments } from "@/hooks/useFileAttachments";

interface UploadedAttachment {
  id: string;
  file_path: string;
  file_name: string;
  content_type: string;
  size: number;
  created_at: string;
}

const Index = () => {
  const [selectedMode, setSelectedMode] = useState<AssistantType>("knowledge");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [structuredOutput, setStructuredOutput] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [latestResponse, setLatestResponse] = useState<string | null>(null);
  
  const { 
    files: attachments, 
    uploadFiles: handleFileUpload, 
    removeFile: handleRemoveAttachment 
  } = useFileAttachments();

  useEffect(() => {
    initializeSession();
    
    setStructuredOutput(selectedMode === 'benchmarks');
  }, [selectedMode]);

  const initializeSession = () => {
    let existingSessionId = localStorage.getItem("conversation_session_id");
    
    if (!existingSessionId) {
      existingSessionId = crypto.randomUUID();
      localStorage.setItem("conversation_session_id", existingSessionId);
    }
    
    setSessionId(existingSessionId);
    
    loadConversations(existingSessionId);
  };

  const safeMapVisualization = (vizData: any): ChatVisualization => {
    if (!vizData || typeof vizData !== 'object') {
      return { type: 'table', data: [] };
    }
    
    const type = typeof vizData.type === 'string' ? 
      (vizData.type === 'chart' ? 'chart' : 'table') : 'table';
    
    const data = Array.isArray(vizData.data) ? vizData.data : [];
    
    const viz: ChatVisualization = { type, data };
    
    if (Array.isArray(vizData.headers)) viz.headers = vizData.headers;
    
    if (typeof vizData.chartType === 'string') {
      viz.chartType = vizData.chartType === 'bar' ? 'bar' : 'line';
    }
    
    if (typeof vizData.xKey === 'string') viz.xKey = vizData.xKey;
    
    if (Array.isArray(vizData.yKeys)) viz.yKeys = vizData.yKeys;
    
    if (typeof vizData.height === 'number') viz.height = vizData.height;
    
    return viz;
  };

  const loadConversations = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const conversationsWithParsedVisualizations = data.map(conv => {
        let parsedVisualizations: ChatVisualization[] = [];
        
        if (conv.visualizations) {
          try {
            if (typeof conv.visualizations === 'string') {
              const parsedViz = JSON.parse(conv.visualizations);
              parsedVisualizations = Array.isArray(parsedViz) 
                ? parsedViz.map(safeMapVisualization) 
                : [safeMapVisualization(parsedViz)];
            } else if (Array.isArray(conv.visualizations)) {
              parsedVisualizations = conv.visualizations.map(safeMapVisualization);
            }
          } catch (e) {
            console.error('Error parsing visualizations:', e);
            parsedVisualizations = [];
          }
        }
        
        const assistant_type = conv.assistant_type as string;
        const validAssistantType = (
          assistant_type === 'knowledge' || 
          assistant_type === 'frameworks' || 
          assistant_type === 'benchmarks' || 
          assistant_type === 'assistant'
        ) ? assistant_type as AssistantType : 'knowledge';
        
        return {
          ...conv,
          assistant_type: validAssistantType,
          visualizations: parsedVisualizations as ReadonlyArray<ChatVisualization>
        } as Conversation;
      });

      setConversations(conversationsWithParsedVisualizations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    
    try {
      let attachmentUrls: string[] = [];
      
      if (attachments.length > 0) {
        toast.info(`Processing ${attachments.length} attachments...`);
        
        for (const file of attachments) {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(`${sessionId}/${file.name}`, file);
            
          if (uploadError) throw uploadError;
          
          if (uploadData?.path) {
            const { data: urlData } = supabase.storage
              .from('attachments')
              .getPublicUrl(uploadData.path);
              
            if (urlData?.publicUrl) {
              attachmentUrls.push(urlData.publicUrl);
            }
          }
        }
      }
      
      const { data, error } = await supabase.functions.invoke('chat-with-assistant', {
        body: {
          message: query,
          assistantType: selectedMode,
          threadId,
          structuredOutput
        }
      });
      
      if (error) throw error;
      
      const { response, thread_id, visualizations = [] } = data;
      
      setThreadId(thread_id);
      
      setLatestResponse(response);
      
      const { data: savedConversation, error: saveError } = await supabase
        .from('conversations')
        .insert({
          query,
          response,
          assistant_type: selectedMode,
          thread_id,
          session_id: sessionId,
          visualizations: visualizations.length > 0 ? visualizations : null
        })
        .select()
        .single();
      
      if (saveError) throw saveError;
      
      setConversations(prev => [
        {
          ...savedConversation,
          assistant_type: selectedMode,
          visualizations: visualizations.map(safeMapVisualization) as ReadonlyArray<ChatVisualization>
        } as Conversation,
        ...prev
      ]);
      
      toast.success('Response received!');
    } catch (error) {
      console.error('Error in search:', error);
      toast.error('Search failed: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMode, threadId, sessionId, structuredOutput, attachments]);

  const handleAssistantResponse = useCallback((response: string, thread_id: string, visualizations: any[]) => {
    setThreadId(thread_id);
    
    setLatestResponse(response);
    
    supabase
      .from('conversations')
      .insert({
        query: "Voice request",
        response,
        assistant_type: selectedMode,
        thread_id,
        session_id: sessionId,
        visualizations: visualizations.length > 0 ? visualizations : null
      })
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error saving voice conversation:', error);
          return;
        }
        
        setConversations(prev => [
          {
            ...data,
            assistant_type: selectedMode,
            visualizations: visualizations.map(safeMapVisualization) as ReadonlyArray<ChatVisualization>
          } as Conversation,
          ...prev
        ]);
      });
  }, [selectedMode, sessionId]);

  const chooseConversation = (threadId: string, message?: string) => {
    setThreadId(threadId);
    
    if (message && message.trim()) {
      handleSearch(message);
    } else {
      toast.info('Conversation thread selected');
    }
  };

  const startNewConversation = () => {
    setThreadId(null);
    toast.info('Starting new conversation');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto pt-20 pb-12 px-4">
        <IntelligenceHeader />
        
        <div className="max-w-3xl mx-auto mb-12">
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
            threadId={threadId}
            onAssistantResponse={handleAssistantResponse}
          />
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Conversation</h2>
            <button 
              onClick={startNewConversation}
              className="px-4 py-2 bg-white rounded-lg border shadow-sm text-sm font-medium"
            >
              Start New Conversation
            </button>
          </div>

          <div className="bg-white rounded-lg border p-8">
            {conversations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-700 mb-2">No conversations yet</p>
                <p className="text-gray-500 text-sm">Start by asking a question above</p>
              </div>
            ) : (
              <ConversationList 
                conversations={conversations} 
                activeThreadId={threadId}
                onSelectThread={chooseConversation}
                onStartNewThread={startNewConversation}
              />
            )}
          </div>
        </div>
        
        <div className="hidden lg:block">
          {/* Sidebar content */}
        </div>
      </main>
    </div>
  );
}

export default Index;
