
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Conversation } from "@/lib/types";
import { toast } from "sonner";
import { safeMapVisualization } from "@/utils/conversation/visualizationProcessor";
import { useAuth } from "@/contexts/AuthContext";
import { jsonToStructuredResponse } from "@/types/structuredResponse";

export function useConversationSession() {
  const [sessionId, setSessionId] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = () => {
    let existingSessionId = localStorage.getItem("conversation_session_id");
    
    if (!existingSessionId) {
      existingSessionId = crypto.randomUUID();
      localStorage.setItem("conversation_session_id", existingSessionId);
    }
    
    setSessionId(existingSessionId);
    
    loadConversations(existingSessionId);
  };

  const loadConversations = async (sessId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('session_id', sessId)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      if (!data || !Array.isArray(data)) {
        setConversations([]);
        return;
      }
      
      const result: Conversation[] = [];
      
      for (const item of data) {
        const visualizationList = [];
        
        if (Array.isArray(item.visualizations)) {
          for (const vizData of item.visualizations) {
            visualizationList.push(safeMapVisualization(vizData));
          }
        }
        
        // Process structured_response from JSON to StructuredResponse
        const structuredResponse = item.structured_response 
          ? jsonToStructuredResponse(item.structured_response)
          : null;
        
        const conversation: Conversation = {
          id: item.id,
          created_at: item.created_at,
          query: item.query,
          response: item.response,
          assistant_type: item.assistant_type as any, // Cast to fix type error
          thread_id: item.thread_id,
          session_id: item.session_id || sessId,
          assistant_id: item.assistant_id,
          visualizations: visualizationList,
          structured_response: structuredResponse
        };
        
        result.push(conversation);
      }
      
      setConversations(result);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversation history');
    }
  };

  const startNewSession = () => {
    const newSessionId = crypto.randomUUID();
    
    localStorage.setItem("conversation_session_id", newSessionId);
    setSessionId(newSessionId);
    
    setConversations([]);
    
    toast.success("Started a new conversation session");
  };

  return {
    sessionId,
    conversations,
    setConversations,
    loadConversations,
    startNewSession
  };
}
