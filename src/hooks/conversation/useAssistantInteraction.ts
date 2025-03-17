
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AssistantType } from "@/lib/types";
import { UploadedAttachment } from "@/lib/conversation-types";
import { processAssistantResponse } from "@/utils/conversation/visualizationProcessor";
import { useAuth } from "@/contexts/AuthContext";

export function useAssistantInteraction(
  sessionId: string, 
  loadConversations: (sessionId: string) => Promise<void>,
  uploadedAttachments: UploadedAttachment[],
  clearAttachments: () => void
) {
  const [isLoading, setIsLoading] = useState(false);
  const [structuredOutput, setStructuredOutput] = useState<boolean>(true); // Set to true by default for better visualization
  const [latestResponse, setLatestResponse] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const { user } = useAuth();

  const handleLatestResponse = (response: string) => {
    setLatestResponse(response);
  };

  const handleSearch = async (searchQuery: string, selectedMode: AssistantType) => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a question");
      return;
    }
    
    if (!user) {
      toast.error("You need to be logged in to search");
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

          console.log(`Generated public URL for ${att.file_name}:`, publicUrl);

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

      // Add specific instruction for benchmarks with attachments
      let enhancedQuery = searchQuery;
      if (selectedMode === 'benchmarks' && formattedAttachments.length > 0) {
        enhancedQuery = `${searchQuery}\n\nIMPORTANT: This message includes file attachments containing metrics and benchmarks data. Please analyze these files in detail and extract all relevant metrics, numbers, and statistics. Present this data in structured, formatted tables and visualizations.`;
      }

      const { data, error } = await supabase.functions.invoke('chat-with-assistant', {
        body: {
          message: enhancedQuery,
          assistantType: selectedMode,
          attachments: formattedAttachments,
          structuredOutput: true // Always use structured output for better visualization
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
          session_id: sessionId,
          user_id: user.id
        });

      if (dbError) {
        console.error('Error storing conversation:', dbError);
        toast.error('Failed to save conversation');
      } else {
        await loadConversations(sessionId);
        clearAttachments();
        
        setLatestResponse(data.response);
        
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
    
    if (!user) {
      toast.error("You need to be logged in to reply");
      return;
    }
    
    try {
      // Need to cast the assistantType string to AssistantType since it comes as a string
      // Let's validate it to ensure it's a valid AssistantType
      const validAssistantTypes: AssistantType[] = ['knowledge', 'frameworks', 'benchmarks', 'assistant'];
      const typedAssistantType: AssistantType = validAssistantTypes.includes(assistantType as AssistantType) 
        ? (assistantType as AssistantType) 
        : 'knowledge'; // fallback to knowledge if invalid
      
      console.log(`Sending reply to thread ${threadId}:`, {
        message,
        assistantType: typedAssistantType,
        structuredOutput
      });
      
      const { data, error } = await supabase.functions.invoke('chat-with-assistant', {
        body: {
          message,
          assistantType: typedAssistantType,
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
          assistant_type: typedAssistantType,
          thread_id: data.thread_id,
          assistant_id: data.assistant_id,
          visualizations: visualizations,
          session_id: sessionId,
          user_id: user.id
        });
      
      if (dbError) {
        console.error('Error storing conversation:', dbError);
        throw dbError;
      }
      
      await loadConversations(sessionId);
      
      setLatestResponse(data.response);
      
      toast.success("Reply sent!");
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply. Please try again.");
      throw error;
    }
  };

  return {
    isLoading,
    threadId,
    structuredOutput,
    setStructuredOutput,
    latestResponse,
    handleLatestResponse,
    handleSearch,
    handleReply
  };
}
