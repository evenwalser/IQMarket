
import { useEffect, useRef, useState } from "react";
import type { Conversation } from "@/lib/types";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { ConversationThread } from "./conversation/ConversationThread";
import { EmptyConversationState } from "./conversation/EmptyConversationState";

interface ConversationListProps {
  conversations: Conversation[];
  onReply: (threadId: string, message: string, assistantType: string) => Promise<void>;
  voiceMode?: boolean;
  onLatestResponse?: (response: string) => void;
}

export const ConversationList = ({ 
  conversations, 
  onReply, 
  voiceMode = false,
  onLatestResponse 
}: ConversationListProps) => {
  const conversationsStartRef = useRef<HTMLDivElement>(null);
  const conversationsEndRef = useRef<HTMLDivElement>(null);
  const [replyingThreadId, setReplyingThreadId] = useState<string | null>(null);
  const { isSpeaking, speakText, stopSpeaking } = useTextToSpeech();
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);

  // Track the latest response for TTS
  useEffect(() => {
    if (conversations.length > 0 && onLatestResponse) {
      const latestConversation = conversations[0]; // Assuming conversations are sorted newest first
      onLatestResponse(latestConversation.response);
      
      // Scroll to the top of the conversation list when a new response is received
      if (conversationsStartRef.current) {
        conversationsStartRef.current.scrollIntoView({ behavior: "smooth" });
        
        // Also scroll the page to the top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [conversations, onLatestResponse]);

  const toggleSpeakResponse = (response: string, conversationId: string) => {
    if (isSpeaking && currentSpeakingId === conversationId) {
      stopSpeaking();
      setCurrentSpeakingId(null);
    } else {
      stopSpeaking();
      speakText(response);
      setCurrentSpeakingId(conversationId);
    }
  };

  const handleReply = async (threadId: string, message: string, assistantType: string) => {
    setReplyingThreadId(threadId);
    try {
      await onReply(threadId, message, assistantType);
    } catch (error) {
      console.error("Error sending reply:", error);
    } finally {
      setReplyingThreadId(null);
    }
  };

  if (conversations.length === 0) {
    return <EmptyConversationState />;
  }

  // Group conversations by thread_id
  const threadMap = new Map<string, Conversation[]>();
  
  // Group by thread_id
  conversations.forEach(conversation => {
    const key = conversation.thread_id;
    if (!threadMap.has(key)) {
      threadMap.set(key, []);
    }
    threadMap.get(key)?.push(conversation);
  });
  
  // Sort threads by most recent conversation
  const sortedThreads = Array.from(threadMap.entries()).sort((a, b) => {
    const aLatest = a[1].reduce((latest, conv) => 
      new Date(conv.created_at) > new Date(latest.created_at) ? conv : latest, a[1][0]);
    const bLatest = b[1].reduce((latest, conv) => 
      new Date(conv.created_at) > new Date(latest.created_at) ? conv : latest, b[1][0]);
    
    return new Date(bLatest.created_at).getTime() - new Date(aLatest.created_at).getTime();
  });
  
  return (
    <div className="space-y-8">
      <div ref={conversationsStartRef} /> {/* Reference for scrolling to the top */}
      
      {sortedThreads.map(([threadId, threadConversations]) => (
        <ConversationThread
          key={threadId}
          threadId={threadId}
          conversations={threadConversations}
          onReply={handleReply}
          isSpeaking={isSpeaking}
          currentSpeakingId={currentSpeakingId}
          toggleSpeakResponse={toggleSpeakResponse}
          replyingThreadId={replyingThreadId}
        />
      ))}
      
      <div ref={conversationsEndRef} />
    </div>
  );
};
