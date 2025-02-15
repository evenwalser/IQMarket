
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send } from "lucide-react";

export const ChatInterface = () => {
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    // Will implement chat functionality in next step
    console.log("Sending message:", message);
    setMessage("");
  };

  return (
    <div className="flex flex-col h-[800px]">
      <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
        <MessageSquare className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">AI Assistant Chat</h2>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="text-center text-gray-500 mt-4">
          Start a conversation with your AI assistant
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
