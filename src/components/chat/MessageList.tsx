
import { ChatMessage } from "@/types/chat";
import { DataTable } from "./visualizations/DataTable";
import { DataChart } from "./visualizations/DataChart";
import { useEffect, useRef } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { preprocessContent } from "@/utils/content/preprocessor";
import { cleanListFormatting, fixReplyThreadFormatting } from "@/utils/markdownUtils";

interface MessageListProps {
  messages: ChatMessage[];
}

export const MessageList = ({ messages }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const renderVisualization = (visualization: any) => {
    if (!visualization) return null;

    console.log('Rendering visualization:', visualization);

    switch (visualization.type) {
      case 'table':
        return (
          <div className="mt-4 overflow-x-auto">
            <DataTable 
              data={visualization.data} 
              headers={visualization.headers}
              title={visualization.title}
              sortable={true}
              compact={visualization.compact}
              colorScheme={visualization.colorScheme || 'default'}
            />
          </div>
        );
      case 'chart':
        return (
          <div className="mt-4">
            <DataChart 
              data={visualization.data}
              type={visualization.chartType || 'bar'}
              xKey={visualization.xKey || 'x'}
              yKeys={visualization.yKeys || ['y']}
              height={visualization.height || 300}
              title={visualization.title}
              subTitle={visualization.subTitle}
              colorScheme={visualization.colorScheme || 'default'}
            />
          </div>
        );
      default:
        console.log('Unknown visualization type:', visualization.type);
        return null;
    }
  };

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
        
        // Process all messages through the preprocessor to handle formatting and extract visualizations
        const { processedContent, extractedVisualizations } = preprocessContent(messageContent);
        
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
              {allVisualizations?.map((viz, i) => (
                <div key={i} className="mt-4 border-t border-gray-100 pt-3">
                  {renderVisualization(viz)}
                </div>
              ))}
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
