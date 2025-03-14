
import { ChatMessage } from "@/types/chat";
import { DataTable } from "./visualizations/DataTable";
import { DataChart } from "./visualizations/DataChart";
import { useEffect, useRef, useState } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { preprocessContent } from "@/utils/content/preprocessor";

interface MessageListProps {
  messages: ChatMessage[];
}

export const MessageList = ({ messages }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const renderFormattedMessage = (msg: ChatMessage, index: number) => {
    // Process all messages through the preprocessor to handle formatting and extract visualizations
    const { processedContent, extractedVisualizations } = preprocessContent(msg.content);
    
    // Combine explicit visualizations from the message with extracted ones
    const allVisualizations = [
      ...(msg.visualizations || []),
      ...extractedVisualizations
    ];
    
    // Check for visualization references in the content
    const referenceRegex = /\*Visualization #(\d+)\*/g;
    const hasReferences = referenceRegex.test(processedContent);
    
    // Reset the regex after test
    referenceRegex.lastIndex = 0;
    
    let segments: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    
    // If there are references, process them for inline placement
    if (hasReferences) {
      while ((match = referenceRegex.exec(processedContent)) !== null) {
        const vizIndex = parseInt(match[1], 10) - 1;
        const matchedVisualization = allVisualizations && vizIndex >= 0 && vizIndex < allVisualizations.length 
          ? allVisualizations[vizIndex] 
          : undefined;
        
        // Add text before this match
        if (match.index > lastIndex) {
          segments.push(
            <div key={`text-${index}-${lastIndex}`} className="mb-3">
              <MarkdownRenderer 
                content={processedContent.substring(lastIndex, match.index)} 
                isUserMessage={msg.role === 'user'} 
              />
            </div>
          );
        }
        
        // Add the visualization if it exists
        if (matchedVisualization) {
          segments.push(
            <div key={`viz-${index}-${vizIndex}`} className="my-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
              {renderVisualization(matchedVisualization, vizIndex)}
            </div>
          );
        }
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add the remaining text
      if (lastIndex < processedContent.length) {
        segments.push(
          <div key={`text-${index}-${lastIndex}`} className="mb-3">
            <MarkdownRenderer 
              content={processedContent.substring(lastIndex)} 
              isUserMessage={msg.role === 'user'} 
            />
          </div>
        );
      }
    } else {
      // No references - render the content normally and append visualizations at the end
      segments.push(
        <div key={`text-${index}`} className="mb-3">
          <MarkdownRenderer 
            content={processedContent} 
            isUserMessage={msg.role === 'user'} 
          />
        </div>
      );
      
      // If there are visualizations but no references, append them
      if (allVisualizations.length > 0) {
        allVisualizations.forEach((viz, vizIndex) => {
          segments.push(
            <div key={`viz-${index}-${vizIndex}`} className="mt-4 border-t border-gray-100 pt-3">
              {renderVisualization(viz, vizIndex)}
            </div>
          );
        });
      }
    }
    
    return segments;
  };
  
  const renderVisualization = (visualization: any, index: number) => {
    if (!visualization) return null;

    switch (visualization.type) {
      case 'table':
        return (
          <div className="overflow-x-auto">
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
          <div>
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
      {messages.map((msg, index) => (
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
            {renderFormattedMessage(msg, index)}
            
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
      ))}
      <div ref={messagesEndRef} />
    </>
  );
};
