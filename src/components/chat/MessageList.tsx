
import { ChatMessage } from "@/types/chat";
import { useEffect, useRef } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { preprocessContent } from "@/utils/content/preprocessor";
import { 
  cleanListFormatting, 
  fixReplyThreadFormatting, 
  fixMultipleBulletsInLists,
  fixBrokenHeadings,
  fixBrokenWords
} from "@/utils/markdownUtils";

interface MessageListProps {
  messages: ChatMessage[];
}

export const MessageList = ({ messages }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="text-center text-gray-500">
        Start a conversation with your AI advisor
      </div>
    );
  }

  return (
    <>
      {messages.map((msg, index) => {
        // Apply additional formatting to fix list and heading issues
        let messageContent = msg.content;
        messageContent = fixReplyThreadFormatting(messageContent);
        messageContent = cleanListFormatting(messageContent);
        messageContent = fixMultipleBulletsInLists(messageContent);
        messageContent = fixBrokenHeadings(messageContent);
        messageContent = fixBrokenWords(messageContent); // New utility to fix broken words
        
        // Process all messages through the preprocessor to handle formatting and extract visualizations
        const { processedContent, extractedVisualizations } = preprocessContent(messageContent);
        
        // Log visualization extraction results for debugging
        if (extractedVisualizations.length > 0) {
          console.log(`Extracted ${extractedVisualizations.length} visualizations:`, 
            extractedVisualizations.map(v => v.type));
        }
        
        // Combine explicit visualizations from the message with extracted ones
        const allVisualizations = [
          ...(msg.visualizations || []),
          ...extractedVisualizations
        ];
          
        return (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}
          >
            <div
              className={`max-w-[85%] px-5 py-3 rounded-lg shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-900'
              }`}
            >
              {msg.role === 'user' ? (
                <MarkdownRenderer content={processedContent} isUserMessage={true} />
              ) : (
                <MarkdownRenderer content={processedContent} />
              )}
              
              {/* Render visualizations */}
              {allVisualizations && allVisualizations.length > 0 && (
                <div className="space-y-4 mt-4 border-t border-gray-100 pt-3">
                  {allVisualizations.map((viz, i) => (
                    <div key={i} className="visualization-container">
                      <VisualizationRenderer 
                        visualization={viz} 
                        allowCustomization={false}
                      />
                    </div>
                  ))}
                </div>
              )}
              
              {/* Render attachments */}
              {msg.attachments?.map((attachment, i) => (
                <div key={i} className="mt-3 border-t border-gray-100 pt-3">
                  {attachment.type === 'image' ? (
                    <img 
                      src={attachment.url} 
                      alt={attachment.name}
                      className="max-w-full rounded-md"
                    />
                  ) : (
                    <a 
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline text-blue-600 hover:text-blue-800"
                    >
                      {attachment.name}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </>
  );
};
