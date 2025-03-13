
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
  
  // Use our enhanced file attachments hook
  const { 
    files: attachments, 
    uploadFiles: handleFileUpload, 
    removeFile: handleRemoveAttachment 
  } = useFileAttachments();

  useEffect(() => {
    // Initialize or retrieve session ID
    initializeSession();
    
    // Set structured output based on selected mode
    setStructuredOutput(selectedMode === 'benchmarks');
  }, [selectedMode]);

  const initializeSession = () => {
    // Check if session ID exists in local storage
    let existingSessionId = localStorage.getItem("conversation_session_id");
    
    // If no session ID exists, create a new one
    if (!existingSessionId) {
      existingSessionId = crypto.randomUUID();
      localStorage.setItem("conversation_session_id", existingSessionId);
    }
    
    setSessionId(existingSessionId);
    
    // Load conversations for this session
    loadConversations(existingSessionId);
  };

  const safeMapVisualization = (vizData: any): ChatVisualization => {
    // Default visualization if input is invalid
    if (!vizData || typeof vizData !== 'object') {
      return { type: 'table', data: [] };
    }
    
    // Explicitly type each field to avoid deep inference issues
    const type = typeof vizData.type === 'string' ? 
      (vizData.type === 'chart' ? 'chart' : 'table') : 'table';
    
    const data = Array.isArray(vizData.data) ? vizData.data : [];
    
    // Create the base visualization object
    const viz: ChatVisualization = { type, data };
    
    // Only add optional properties if they exist and are valid
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
        // Parse visualizations if they exist
        let parsedVisualizations: ChatVisualization[] = [];
        
        if (conv.visualizations) {
          try {
            // Handle different types of visualization storage
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
        
        // Ensure assistant_type is valid by converting it to AssistantType
        const assistant_type = conv.assistant_type as string;
        const validAssistantType = (
          assistant_type === 'knowledge' || 
          assistant_type === 'frameworks' || 
          assistant_type === 'benchmarks' || 
          assistant_type === 'assistant'
        ) ? assistant_type as AssistantType : 'knowledge';
        
        // Create a properly typed Conversation object
        return {
          ...conv,
          assistant_type: validAssistantType,
          visualizations: parsedVisualizations
        } as unknown as Conversation;
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
      // Process file attachments if any
      let attachmentUrls: string[] = [];
      
      if (attachments.length > 0) {
        toast.info(`Processing ${attachments.length} attachments...`);
        
        // Upload each attachment to storage
        for (const file of attachments) {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(`${sessionId}/${file.name}`, file);
            
          if (uploadError) throw uploadError;
          
          if (uploadData?.path) {
            // Get public URL for the file
            const { data: urlData } = supabase.storage
              .from('attachments')
              .getPublicUrl(uploadData.path);
              
            if (urlData?.publicUrl) {
              attachmentUrls.push(urlData.publicUrl);
            }
          }
        }
      }
      
      // Call the backend API with the query and mode
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
      
      // Store the thread ID for future use
      setThreadId(thread_id);
      
      // Store the response
      setLatestResponse(response);
      
      // Save the conversation to database
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
      
      // Update the local conversation list with the new conversation
      setConversations(prev => [
        {
          ...savedConversation as Conversation,
          visualizations: visualizations.map(safeMapVisualization)
        },
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

  // Handle assistant responses from WebSocket
  const handleAssistantResponse = useCallback((response: string, thread_id: string, visualizations: any[]) => {
    // Store the thread ID for future use
    setThreadId(thread_id);
    
    // Store the response
    setLatestResponse(response);
    
    // Save the conversation to database
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
        
        // Update the local conversation list with the new conversation
        setConversations(prev => [
          {
            ...data,
            assistant_type: selectedMode,
            visualizations: visualizations.map(safeMapVisualization)
          } as unknown as Conversation,
          ...prev
        ]);
      });
  }, [selectedMode, sessionId]);

  // Choose a conversation thread and optionally send a message
  const chooseConversation = (threadId: string, message?: string) => {
    setThreadId(threadId);
    
    // If a message is provided, send it immediately
    if (message && message.trim()) {
      // Use the existing handleSearch function to send the message
      handleSearch(message);
    } else {
      toast.info('Conversation thread selected');
    }
  };

  // Start a new conversation
  const startNewConversation = () => {
    setThreadId(null);
    toast.info('Starting new conversation');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto pt-20 pb-12 px-4">
        {/* Intelligence Header with sparkles */}
        <IntelligenceHeader />

        {/* Search Area */}
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

        {/* Conversations Area */}
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

          {/* Conversations list or empty state */}
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
        
        {/* Remove or hide the sidebar info panel on mobile */}
        <div className="hidden lg:block">
          {/* Sidebar content */}
        </div>
      </main>
    </div>
  );
}

export default Index;
