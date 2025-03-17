
import { useState } from "react";
import { Conversation } from "@/lib/types";
import { MessageExchange } from "./MessageExchange";
import { ThreadReplyInput } from "./ThreadReplyInput";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConversationThreadProps {
  threadId: string;
  conversations: Conversation[];
  onReply: (threadId: string, message: string, assistantType: string) => Promise<void>;
  isSpeaking: boolean;
  currentSpeakingId: string | null;
  toggleSpeakResponse: (response: string, conversationId: string) => void;
  replyingThreadId: string | null;
}

export const ConversationThread = ({
  threadId,
  conversations,
  onReply,
  isSpeaking,
  currentSpeakingId,
  toggleSpeakResponse,
  replyingThreadId
}: ConversationThreadProps) => {
  // Sort conversations within thread by creation date (oldest first)
  const sortedConversations = [...conversations].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  const assistantType = sortedConversations[0]?.assistant_type || '';
  const isReplying = replyingThreadId === threadId;
  
  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            assistantType === 'knowledge' ? 'bg-purple-600' :
            assistantType === 'benchmarks' ? 'bg-rose-400' :
            'bg-green-500'
          }`} />
          <span className="text-sm font-medium text-gray-700 capitalize">
            {assistantType} Assistant
          </span>
        </div>
      </div>
      
      <ScrollArea className="max-h-[600px] overflow-y-auto">
        <div className="p-4 space-y-6">
          {sortedConversations.map((conversation) => {
            const isCurrentlySpeaking = isSpeaking && currentSpeakingId === conversation.id;
            
            return (
              <MessageExchange 
                key={conversation.id}
                id={conversation.id}
                query={conversation.query}
                response={conversation.response}
                isCurrentlySpeaking={isCurrentlySpeaking}
                toggleSpeakResponse={toggleSpeakResponse}
                visualizations={conversation.visualizations}
                assistantType={assistantType}
                structuredResponse={conversation.structured_response}
              />
            );
          })}
        </div>
      </ScrollArea>
      
      {/* Thread-specific reply input */}
      <ThreadReplyInput 
        threadId={threadId}
        assistantType={assistantType}
        onReply={onReply}
        isReplying={isReplying}
      />
    </div>
  );
};
