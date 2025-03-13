
import { ChatMessage } from "@/types/chat";
import { DataTable } from "./visualizations/DataTable";
import { DataChart } from "./visualizations/DataChart";
import { useEffect, useRef } from "react";

interface MessageListProps {
  messages: ChatMessage[];
}

export const MessageList = ({ messages }: MessageListProps) => {
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

  // Format the message content with proper spacing and formatting
  const formatMessageContent = (content: string) => {
    if (!content) return "";

    // Replace markdown-style bullets with proper HTML
    let formattedContent = content
      // Convert markdown bullet points
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      // Convert markdown numbered lists
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Wrap bullet points in ul tags
      .replace(/<li>(.+)<\/li>(\n<li>(.+)<\/li>)+/g, '<ul>$&</ul>')
      // Handle headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Convert double line breaks to paragraph breaks
      .replace(/\n\n/g, '</p><p>')
      // Bold and italic formatting
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Convert single line breaks within paragraphs
      .replace(/\n/g, '<br/>');

    // Ensure content is wrapped in paragraphs
    if (!formattedContent.startsWith('<')) {
      formattedContent = `<p>${formattedContent}</p>`;
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
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
        >
          <div
            className={`max-w-[80%] px-4 py-2 rounded-lg ${
              msg.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            {msg.role === 'user' ? (
              <div className="whitespace-pre-wrap">{msg.content}</div>
            ) : (
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content) }} 
              />
            )}
            {msg.visualizations?.map((viz, i) => (
              <div key={i}>
                {renderVisualization(viz)}
              </div>
            ))}
            {msg.attachments?.map((attachment, i) => (
              <div key={i} className="mt-2">
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
                    className="text-sm underline"
                  >
                    {attachment.name}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
};
