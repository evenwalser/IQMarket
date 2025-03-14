
import { ChatMessage } from "@/types/chat";
import { DataTable } from "./visualizations/DataTable";
import { DataChart } from "./visualizations/DataChart";
import { useEffect, useRef } from "react";
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

  const renderVisualization = (visualization: any, index: number) => {
    if (!visualization) {
      console.warn(`Empty visualization at index ${index}`);
      return null;
    }

    console.log(`Rendering visualization type ${visualization.type}:`, visualization);

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
        console.warn('Unknown visualization type:', visualization.type);
        return null;
    }
  };

  const renderFormattedMessage = (msg: ChatMessage, index: number) => {
    console.log(`Rendering message ${index}, has ${msg.visualizations?.length || 0} visualizations`);
    
    // If the message already has visualizations, use them directly
    const allVisualizations = msg.visualizations || [];
    
    // Check for visualization references
    const referenceRegex = /\*Visualization #(\d+)\*/g;
    const hasReferences = referenceRegex.test(msg.content);
    
    // If no references but has visualizations, add them to the end
    if (!hasReferences && allVisualizations.length > 0) {
      return (
        <>
          <div className="mb-3">
            <MarkdownRenderer 
              content={msg.content} 
              isUserMessage={msg.role === 'user'} 
            />
          </div>
          {allVisualizations.map((viz, vizIndex) => (
            <div key={`viz-${index}-${vizIndex}`} className="mt-4 border-t border-gray-100 pt-3">
              {renderVisualization(viz, vizIndex)}
            </div>
          ))}
        </>
      );
    }
    
    // If there are visualization references, process them
    if (hasReferences) {
      let segments: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;
      
      // Reset regex
      referenceRegex.lastIndex = 0;
      
      while ((match = referenceRegex.exec(msg.content)) !== null) {
        const vizIndex = parseInt(match[1], 10) - 1;
        const matchedVisualization = allVisualizations && vizIndex >= 0 && vizIndex < allVisualizations.length 
          ? allVisualizations[vizIndex] 
          : undefined;
        
        // Add text before this match
        if (match.index > lastIndex) {
          segments.push(
            <div key={`text-${index}-${lastIndex}`} className="mb-3">
              <MarkdownRenderer 
                content={msg.content.substring(lastIndex, match.index)} 
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
        } else {
          console.warn(`Visualization #${vizIndex + 1} reference found but no matching visualization data`);
        }
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add the remaining text
      if (lastIndex < msg.content.length) {
        segments.push(
          <div key={`text-${index}-${lastIndex}`} className="mb-3">
            <MarkdownRenderer 
              content={msg.content.substring(lastIndex)} 
              isUserMessage={msg.role === 'user'} 
            />
          </div>
        );
      }
      
      return segments;
    }
    
    // No visualizations - just render the markdown content
    return (
      <div className="mb-3">
        <MarkdownRenderer 
          content={msg.content} 
          isUserMessage={msg.role === 'user'} 
        />
      </div>
    );
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
