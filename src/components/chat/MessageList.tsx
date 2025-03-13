
import { ChatMessage } from "@/types/chat";
import { DataTable } from "./visualizations/DataTable";
import { DataChart } from "./visualizations/DataChart";
import { useEffect, useRef } from "react";

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
            />
          </div>
        );
      case 'chart':
        return (
          <div className="mt-4">
            <DataChart 
              data={visualization.data}
              type={visualization.chartType}
              xKey={visualization.xKey}
              yKeys={visualization.yKeys}
              height={visualization.height || 300}
            />
          </div>
        );
      default:
        console.log('Unknown visualization type:', visualization.type);
        return null;
    }
  };

  const formatMessageContent = (content: string) => {
    if (!content) return "";

    // Updated regex patterns to better handle all cases of bold text formatting
    let formattedContent = content
      // Convert citation markers
      .replace(/【(\d+):(\d+)†source】/g, '<span class="text-blue-600 text-xs font-medium ml-1 cursor-pointer hover:underline">[Source $1.$2]</span>')
      
      // Handle numbered points with specific patterns like "1. **Title**:"
      .replace(/^(\d+)\.\s+\*\*([^*]+?)\*\*:/gm, '<div class="flex gap-2 mb-1 mt-3"><span class="font-bold">$1.</span><span class="font-bold">$2:</span></div>')
      
      // Handle numbered points with bold titles like "1. **Title**"
      .replace(/^(\d+)\.\s+\*\*([^*]+?)\*\*/gm, '<div class="flex gap-2 mb-1 mt-3"><span class="font-bold">$1.</span><span class="font-bold">$2</span></div>')
      
      // Handle patterns like "**Topic**:" at the beginning of paragraphs
      .replace(/^\*\*([^*]+?)\*\*:/gm, '<div class="font-bold mb-1">$1:</div>')
      
      // Process regular bold text - more aggressive pattern to capture all instances
      .replace(/\*\*([^*]+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      
      // Process italic text
      .replace(/\*([^*]+?)\*/g, '<em class="italic">$1</em>')
      
      // Process bullet lists
      .replace(/^- (.+)$/gm, '<li class="ml-1 pl-2">$1</li>')
      .replace(/^\* (.+)$/gm, '<li class="ml-1 pl-2">$1</li>')
      
      // Process numbered lists (that weren't already processed as special headers)
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-1 pl-2 flex"><span class="font-semibold mr-2">$1.</span><span>$2</span></li>')
      
      // Group lists
      .replace(/(<li class="ml-1 pl-2">(.+)<\/li>)+/g, '<ul class="my-2 space-y-1">$&</ul>')
      .replace(/(<li class="ml-1 pl-2 flex">(.+)<\/li>)+/g, '<ol class="my-2 space-y-1">$&</ol>')
      
      // Process headings
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold my-3 text-gray-800">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold my-3 text-gray-800">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold my-4 text-gray-900">$1</h1>')
      
      // Process paragraphs and line breaks
      .replace(/\n\n/g, '</p><p class="my-2">')
      .replace(/\n/g, '<br class="my-1"/>')
      
      // Clean up source references
      .replace(/\.\s+(【\d+:\d+†source】)/g, '.$1')
      .replace(/\s+(【\d+:\d+†source】)/g, ' $1');

    // Wrap in paragraph tags if not already wrapped
    if (!formattedContent.startsWith('<')) {
      formattedContent = `<p class="my-2">${formattedContent}</p>`;
    }

    return formattedContent;
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
            {msg.role === 'user' ? (
              <div className="whitespace-pre-wrap text-white">{msg.content}</div>
            ) : (
              <div 
                className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-gray-900 
                  prose-p:text-gray-700 prose-p:my-2 prose-li:my-0.5 prose-li:text-gray-700 
                  prose-strong:text-gray-900 prose-strong:font-semibold"
                dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content) }} 
              />
            )}
            {msg.visualizations?.map((viz, i) => (
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
      ))}
      <div ref={messagesEndRef} />
    </>
  );
};
