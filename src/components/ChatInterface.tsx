
import { useState } from "react";
import { toast } from "sonner";
import { ChatMessage } from "@/types/chat";
import { ChatHeader } from "./chat/ChatHeader";
import { MessageList } from "./chat/MessageList";
import { AttachmentList } from "./chat/AttachmentList";
import { MessageInput } from "./chat/MessageInput";
import { sendMessage } from "@/services/chatService";
import { useFileAttachments } from "@/hooks/useFileAttachments";
import { preprocessContent } from "@/utils/content/preprocessor";
import { useAuth } from "@/contexts/AuthContext";

export const ChatInterface = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const { attachments, handleAttachmentUpload, removeAttachment } = useFileAttachments();
  const { user } = useAuth();

  const clearChat = () => {
    setMessages([]);
    setThreadId(null);
    toast.success("Chat history cleared");
  };

  const handleSendMessage = async () => {
    if (!message.trim() && attachments.length === 0) return;
    if (!user) {
      toast.error("You need to be logged in to send messages");
      return;
    }

    try {
      setIsLoading(true);
      const userMessage = message;
      setMessage("");

      // Add user message to chat with required id
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(),
        role: 'user', 
        content: userMessage,
      }]);

      // Show loading message
      toast.loading("Processing your request...", { id: "chat-loading" });

      // Send message with any attachments
      const data = await sendMessage(userMessage, threadId, attachments);

      // Hide loading toast
      toast.dismiss("chat-loading");

      // Set thread ID for conversation continuity
      if (data.thread_id) {
        setThreadId(data.thread_id);
      }

      // Show file processing results if available
      if (data.file_processing_results && data.file_processing_results.length > 0) {
        const successCount = data.file_processing_results.filter(r => r.status === 'success').length;
        const errorCount = data.file_processing_results.filter(r => r.status === 'error').length;
        
        if (errorCount > 0) {
          toast.error(`${errorCount} file(s) could not be processed`);
        }
        
        if (successCount > 0) {
          toast.success(`${successCount} file(s) processed successfully`);
        }
      }

      // Process the assistant's response content
      const { processedContent, extractedVisualizations } = preprocessContent(data.response);

      // Combine extracted visualizations with any that came directly from the API
      const allVisualizations = [
        ...(data.visualizations || []),
        ...extractedVisualizations
      ];

      // Add assistant's response to chat with required id
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(),
        role: 'assistant', 
        content: processedContent,
        visualizations: allVisualizations.length > 0 ? allVisualizations : undefined
      }]);

      toast.success("Response received");

    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(`Failed to send message: ${error.message || "Unknown error"}`, { 
        duration: 5000,
        id: "chat-loading"
      });
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
        onFileSelect={handleAttachmentUpload}
        isLoading={isLoading}
        hasAttachments={attachments.length > 0}
      />
    </div>
  );
};
