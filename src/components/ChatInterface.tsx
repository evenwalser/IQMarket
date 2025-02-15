
import { useState } from "react";
import { toast } from "sonner";
import { ChatMessage } from "@/types/chat";
import { ChatHeader } from "./chat/ChatHeader";
import { MessageList } from "./chat/MessageList";
import { AttachmentList } from "./chat/AttachmentList";
import { MessageInput } from "./chat/MessageInput";
import { uploadFile, sendMessage } from "@/services/chatService";

export const ChatInterface = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

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

      // Upload attachments
      const uploadedFiles = await Promise.all(attachments.map(uploadFile));
      setAttachments([]);

      // Add user message to chat
      setMessages(prev => [...prev, { 
        role: 'user', 
        content: userMessage,
        attachments: uploadedFiles
      }]);

      const data = await sendMessage(userMessage, threadId, uploadedFiles);

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
        onFileSelect={handleFileSelect}
        isLoading={isLoading}
        hasAttachments={attachments.length > 0}
      />
    </div>
  );
};
