
import type { Conversation } from "@/lib/types";
import ReactMarkdown from 'react-markdown';
import { DataTable } from "@/components/chat/visualizations/DataTable";
import { DataChart } from "@/components/chat/visualizations/DataChart";

// Define the color mapping for assistant types
const assistantTypeColors: Record<string, string> = {
  knowledge: "rgb(114, 29, 255)", // Bright Purple
  frameworks: "rgb(70, 218, 114)", // Vibrant Green
  benchmarks: "rgb(241, 177, 177)" // Soft Pink
};

interface ConversationListProps {
  conversations: Conversation[];
}

export const ConversationList = ({ conversations }: ConversationListProps) => {
  const renderVisualization = (visualization: any) => {
    if (!visualization) return null;

    console.log('Rendering visualization in conversation:', visualization);

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

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Recent Conversations</h2>
      </div>
      <div className="space-y-4">
        {conversations.map((conversation) => (
          <div key={conversation.id} className="bg-white p-6 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-lg text-gray-900">Q: {conversation.query}</h3>
              <span 
                className="text-xs px-2 py-1 rounded-full capitalize border"
                style={{ 
                  backgroundColor: `${assistantTypeColors[conversation.assistant_type]}15`,
                  color: assistantTypeColors[conversation.assistant_type],
                  borderColor: assistantTypeColors[conversation.assistant_type]
                }}
              >
                {conversation.assistant_type}
              </span>
            </div>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="text-gray-600 mb-3">{children}</p>,
                  h1: ({ children }) => <h1 className="text-xl font-semibold mb-3 mt-4">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-3">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-3">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="text-gray-600">{children}</li>,
                  code: ({ children }) => (
                    <code className="bg-gray-100 text-gray-800 rounded px-1 py-0.5 text-sm font-mono">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-gray-100 rounded-lg p-3 mb-3 overflow-x-auto">
                      {children}
                    </pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-gray-200 pl-4 italic my-3">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {`A: ${conversation.response}`}
              </ReactMarkdown>
            </div>
            
            {/* Render visualizations if they exist */}
            {conversation.visualizations?.map((viz, index) => (
              <div key={index}>
                {renderVisualization(viz)}
              </div>
            ))}

            <div className="mt-4 text-sm text-gray-500">
              {new Date(conversation.created_at).toLocaleString()}
            </div>
          </div>
        ))}
        {conversations.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No conversations yet. Start by asking a question above!
          </div>
        )}
      </div>
    </section>
  );
};
