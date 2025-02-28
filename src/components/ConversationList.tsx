
import { useEffect, useRef } from "react";
import type { Conversation } from "@/lib/types";
import { DataTable } from "@/components/chat/visualizations/DataTable";
import { DataChart } from "@/components/chat/visualizations/DataChart";

interface ConversationListProps {
  conversations: Conversation[];
}

export const ConversationList = ({ conversations }: ConversationListProps) => {
  const conversationsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationsEndRef.current) {
      conversationsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversations]);

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg bg-white">
        <h3 className="text-lg font-medium text-gray-700">No conversations yet</h3>
        <p className="text-gray-500 mt-2">Start by asking a question above</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-800">Recent Conversations</h2>
      
      <div className="space-y-6">
        {conversations.map((conversation) => (
          <div key={conversation.id} className="border rounded-lg bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-full space-y-4">
                <div className="flex gap-2 items-center">
                  <div className={`w-2 h-2 rounded-full ${
                    conversation.assistant_type === 'knowledge' ? 'bg-purple-600' :
                    conversation.assistant_type === 'benchmarks' ? 'bg-rose-400' :
                    'bg-green-500'
                  }`} />
                  <span className="text-sm text-gray-500 capitalize">
                    {conversation.assistant_type}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="font-medium text-gray-900">{conversation.query}</p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="whitespace-pre-wrap text-gray-800">{conversation.response}</div>
                    
                    {conversation.visualizations?.map((visualization, index) => (
                      <div key={index} className="mt-4">
                        {visualization.type === 'table' && (
                          <DataTable 
                            data={visualization.data} 
                            headers={visualization.headers} 
                          />
                        )}
                        
                        {visualization.type === 'chart' && (
                          <DataChart 
                            data={visualization.data}
                            type={visualization.chartType || 'bar'}
                            xKey={visualization.xKey || 'x'}
                            yKeys={visualization.yKeys || ['y']}
                            height={visualization.height || 300}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={conversationsEndRef} />
      </div>
    </div>
  );
};
