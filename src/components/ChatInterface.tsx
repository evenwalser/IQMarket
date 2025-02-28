
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ChatMessage } from "@/types/chat";
import { ChatHeader } from "./chat/ChatHeader";
import { MessageList } from "./chat/MessageList";
import { AttachmentList } from "./chat/AttachmentList";
import { MessageInput } from "./chat/MessageInput";
import { sendMessage, checkOpenAIKey } from "@/services/chatService";
import { useFileAttachments } from "@/hooks/useFileAttachments";
import { APIKeyForm } from "./APIKeyForm";

export const ChatInterface = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [hasValidApiKey, setHasValidApiKey] = useState<boolean | null>(null);
  const { attachments, handleAttachmentUpload, removeAttachment } = useFileAttachments();

  useEffect(() => {
    const validateApiKey = async () => {
      const isValid = await checkOpenAIKey();
      setHasValidApiKey(isValid);
    };
    validateApiKey();
  }, []);

  const clearChat = () => {
    setMessages([]);
    setThreadId(null);
    toast.success("Chat history cleared");
  };

  const handleSendMessage = async () => {
    if (!message.trim() && attachments.length === 0) return;

    try {
      setIsLoading(true);
      const userMessage = message;
      setMessage("");

      // Add user message to chat
      setMessages(prev => [...prev, { 
        role: 'user', 
        content: userMessage,
      }]);

      const data = await sendMessage(userMessage, threadId, attachments);

      // Set thread ID for conversation continuity
      if (data.thread_id) {
        setThreadId(data.thread_id);
      }

      // Add assistant's response to chat
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiKeySaved = () => {
    setHasValidApiKey(true);
    toast.success("API key saved successfully. You can now use the chat!");
  };

  if (hasValidApiKey === false) {
    return (
      <div className="flex flex-col h-[500px] justify-center items-center">
        <div className="w-full max-w-md">
          <APIKeyForm onSuccess={handleApiKeySaved} />
        </div>
      </div>
    );
  }

  if (hasValidApiKey === null) {
    return (
      <div className="flex flex-col h-[500px] justify-center items-center">
        <div className="animate-pulse flex space-x-2">
          <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
          <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
          <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
        </div>
        <p className="text-gray-500 mt-4">Checking API key status...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px]">
      <ChatHeader onClear={clearChat} />
      
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        <MessageList messages={messages} />
      </div>

      <AttachmentList 
        attachments={attachments}
        onRemove={removeAttachment}
      />

      <MessageInput 
        message={message}
        onChange={setMessage}
        onSend={handleSendMessage}
        onFileSelect={handleAttachmentUpload}
        isLoading={isLoading}
        hasAttachments={attachments.length > 0}
      />
    </div>
  );
};
