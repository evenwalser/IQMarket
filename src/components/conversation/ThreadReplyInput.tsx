
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

interface ThreadReplyInputProps {
  threadId: string;
  assistantType: string;
  onReply: (threadId: string, message: string, assistantType: string) => Promise<void>;
  isReplying: boolean;
}

export const ThreadReplyInput = ({
  threadId,
  assistantType,
  onReply,
  isReplying
}: ThreadReplyInputProps) => {
  const [replyText, setReplyText] = useState("");
  
  const handleReply = async () => {
    if (!replyText.trim()) return;
    
    try {
      await onReply(threadId, replyText, assistantType);
      setReplyText("");
    } catch (error) {
      console.error("Error sending reply:", error);
    }
  };
  
  return (
    <div className="p-4 border-t">
      <div className="flex gap-2">
        <Input
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Type your follow-up question..."
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleReply();
            }
          }}
        />
        <Button 
          onClick={handleReply}
          disabled={isReplying || !replyText.trim()}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          {isReplying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
