
import { Button } from "@/components/ui/button";
import { ConversationList } from "@/components/ConversationList";
import type { Conversation } from "@/lib/types";

interface ConversationsSectionProps {
  conversations: Conversation[];
  onReply: (threadId: string, message: string, assistantType: string) => Promise<void>;
  onNewSession: () => void;
  onLatestResponse: (response: string) => void;
}

export const ConversationsSection = ({
  conversations,
  onReply,
  onNewSession,
  onLatestResponse
}: ConversationsSectionProps) => {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Your Conversation</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onNewSession}
        >
          Start New Conversation
        </Button>
      </div>

      <ConversationList 
        conversations={conversations} 
        onReply={onReply}
        onLatestResponse={onLatestResponse}
      />
    </div>
  );
};
