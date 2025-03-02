import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { AssistantType, Conversation } from "@/lib/types";
import type { ChatVisualization } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { UnifiedSearch } from "@/components/UnifiedSearch";
import { ConversationList } from "@/components/ConversationList";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

interface UploadedAttachment {
  id: string;
  file_path: string;
  file_name: string;
  content_type: string;
  size: number;
  created_at: string;
}

// Use type alias for JSON-compatible objects
type JsonObject = Record<string, any>;

const Index = () => {
  const [selectedMode, setSelectedMode] = useState<AssistantType>("knowledge");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<UploadedAttachment[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [structuredOutput, setStructuredOutput] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [voiceMode, setVoiceMode] = useState<boolean>(false);
  const latestResponseRef = useRef<string | null>(null);
  const { speakText } = useTextToSpeech();

  useEffect(() => {
    // Initialize or retrieve session ID
    initializeSession();
  }, []);

  // Monitor conversations for new responses to read aloud in voice mode
  useEffect(() => {
    if (voiceMode && conversations.length > 0) {
      const lastResponse = conversations[0]?.response;
      
      // Only speak if this is a new response (not on initial load)
      if (lastResponse && lastResponse !== latestResponseRef.current) {
        latestResponseRef.current = lastResponse;
        speakText(lastResponse);
      }
    }
  }, [conversations, voiceMode, speakText]);

  const handleVoiceModeChange = (isActive: boolean) => {
    setVoiceMode(isActive);
  };

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

  const loadConversations = async (sessId: string) => {
    try {
      // Filter conversations by current session ID
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('session_id', sessId)
        .order('created_at', { ascending: false })
        .limit(50); // Increased limit to get more messages for the thread
      
      if (error) throw error;
      
      if (!data || !Array.isArray(data)) {
        setConversations([]);
        return;
      }
      
      // Manually construct conversations list to avoid deep type issues
      const result: Conversation[] = [];
      
      for (const item of data) {
        // Process visualizations one by one to avoid deep nesting
        const visualizationList: ChatVisualization[] = [];
        
        if (Array.isArray(item.visualizations)) {
          for (const vizData of item.visualizations) {
            visualizationList.push(safeMapVisualization(vizData));
          }
        }
        
        // Build the conversation object with explicit property assignments
        const conversation: Conversation = {
          id: item.id,
          created_at: item.created_at,
          query: item.query,
          response: item.response,
          assistant_type: item.assistant_type as AssistantType,
          thread_id: item.thread_id,
          session_id: item.session_id || sessId, // Use session ID or fallback to current
          assistant_id: item.assistant_id
        };
        
        // Only add visualizations if there are any
        if (visualizationList.length > 0) {
          conversation.visualizations = visualizationList;
        }
        
        result.push(conversation);
      }
      
      // Set thread ID to the most recent thread if available
      if (result.length > 0) {
        setThreadId(result[0].thread_id);
      }
      
      setConversations(result);
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

  const processAssistantResponse = (data: any): JsonObject[] => {
    // Set thread ID for conversation continuity
    if (data.thread_id) {
      setThreadId(data.thread_id);
    }

    // Early return for invalid data
    if (!data.visualizations || !Array.isArray(data.visualizations)) {
      return [];
    }
    
    // Convert visualizations to simple JSON objects
    return data.visualizations.map((viz: any): JsonObject => {
      const result: JsonObject = {};
      
      // Only include properties that exist and are valid
      if (viz?.type) result.type = viz.type;
      if (Array.isArray(viz?.data)) result.data = viz.data;
      if (viz?.headers) result.headers = viz.headers;
      if (viz?.chartType) result.chartType = viz.chartType;
      if (viz?.xKey) result.xKey = viz.xKey;
      if (Array.isArray(viz?.yKeys)) result.yKeys = viz.yKeys;
      if (typeof viz?.height === 'number') result.height = viz.height;
      
      return result;
    });
  };

  const handleSearch = async (searchQuery: string) => {
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
        attachments: formattedAttachments,
        structuredOutput: structuredOutput
      });

      const { data, error } = await supabase.functions.invoke('chat-with-assistant', {
        body: {
          message: searchQuery,
          assistantType: selectedMode,
          attachments: formattedAttachments,
          structuredOutput: structuredOutput,
          threadId: threadId
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
      
      const visualizations = processAssistantResponse(data);

      const { error: dbError } = await supabase
        .from('conversations')
        .insert({
          query: searchQuery,
          response: data.response,
          assistant_type: selectedMode,
          thread_id: data.thread_id,
          assistant_id: data.assistant_id,
          visualizations: visualizations,
          session_id: sessionId
        });

      if (dbError) {
        console.error('Error storing conversation:', dbError);
        toast.error('Failed to save conversation');
      } else {
        await loadConversations(sessionId);
        clearAttachments();
        
        latestResponseRef.current = data.response;
        
        if (voiceMode) {
          speakText(data.response);
        }
        
        toast.success("Response received!");
      }
    } catch (error) {
      console.error("Full error details:", error);
      toast.error("Failed to get response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = async (threadId: string, message: string, assistantType: string) => {
    if (!message.trim()) return;
    
    try {
      console.log(`Sending reply to thread ${threadId}:`, {
        message,
        assistantType,
        structuredOutput
      });
      
      const { data, error } = await supabase.functions.invoke('chat-with-assistant', {
        body: {
          message,
          assistantType,
          threadId,
          structuredOutput
        }
      });
      
      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }
      
      if (!data || !data.response) {
        console.error("No response data received");
        throw new Error('No response received from assistant');
      }
      
      const visualizations = processAssistantResponse(data);
      
      const { error: dbError } = await supabase
        .from('conversations')
        .insert({
          query: message,
          response: data.response,
          assistant_type: assistantType,
          thread_id: data.thread_id,
          assistant_id: data.assistant_id,
          visualizations: visualizations,
          session_id: sessionId
        });
      
      if (dbError) {
        console.error('Error storing conversation:', dbError);
        throw dbError;
      }
      
      await loadConversations(sessionId);
      toast.success("Reply sent!");
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply. Please try again.");
      throw error;
    }
  };

  const startNewSession = () => {
    // Generate new session ID
    const newSessionId = crypto.randomUUID();
    
    // Update localStorage and state
    localStorage.setItem("conversation_session_id", newSessionId);
    setSessionId(newSessionId);
    
    // Clear thread ID to start a new conversation thread
    setThreadId(null);
    
    // Clear conversations list
    setConversations([]);
    
    toast.success("Started a new conversation session");
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

            <div className="space-y-8">
              <UnifiedSearch 
                handleSearch={handleSearch}
                isLoading={isLoading}
                selectedMode={selectedMode}
                setSelectedMode={setSelectedMode}
                handleFileUpload={handleFileUpload}
                attachments={attachments}
                structuredOutput={structuredOutput}
                setStructuredOutput={setStructuredOutput}
              />

              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Your Conversation</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={startNewSession}
                >
                  Start New Conversation
                </Button>
              </div>

              <ConversationList 
                conversations={conversations} 
                onReply={handleReply}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
