
import { useEffect, useRef, useState } from "react";
import type { Conversation } from "@/lib/types";
import { DataTable } from "@/components/chat/visualizations/DataTable";
import { DataChart } from "@/components/chat/visualizations/DataChart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

interface ConversationListProps {
  conversations: Conversation[];
  onReply: (threadId: string, message: string, assistantType: string) => Promise<void>;
}

export const ConversationList = ({ conversations, onReply }: ConversationListProps) => {
  const conversationsEndRef = useRef<HTMLDivElement>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    if (conversationsEndRef.current) {
      conversationsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversations]);

  const handleReply = async () => {
    if (!replyText.trim() || conversations.length === 0) return;
    
    // Get the most recent conversation to reply to
    const lastConversation = conversations[conversations.length - 1];
    
    setIsReplying(true);
    try {
      await onReply(lastConversation.thread_id, replyText, lastConversation.assistant_type);
      setReplyText("");
    } catch (error) {
      console.error("Error sending reply:", error);
    } finally {
      setIsReplying(false);
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg bg-white">
        <h3 className="text-lg font-medium text-gray-700">No conversations yet</h3>
        <p className="text-gray-500 mt-2">Start by asking a question above</p>
      </div>
    );
  }

  // Group conversations by thread_id
  const threadMap = new Map<string, Conversation[]>();
  
  // Sort conversations chronologically - oldest first
  const sortedConversations = [...conversations].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  // Group by thread_id
  sortedConversations.forEach(conversation => {
    if (!threadMap.has(conversation.thread_id)) {
      threadMap.set(conversation.thread_id, []);
    }
    threadMap.get(conversation.thread_id)?.push(conversation);
  });
  
  // Get the most recent thread
  const threadIds = Array.from(threadMap.keys());
  const currentThreadId = threadIds.length > 0 ? threadIds[0] : null;
  const currentThread = currentThreadId ? threadMap.get(currentThreadId) || [] : [];
  
  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            currentThread[0]?.assistant_type === 'knowledge' ? 'bg-purple-600' :
            currentThread[0]?.assistant_type === 'benchmarks' ? 'bg-rose-400' :
            'bg-green-500'
          }`} />
          <span className="text-sm font-medium text-gray-700 capitalize">
            {currentThread[0]?.assistant_type} Assistant
          </span>
        </div>
      </div>
      
      <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto">
        {currentThread.map((conversation, index) => {
          const isBenchmarks = conversation.assistant_type === 'benchmarks';
          
          return (
            <div key={conversation.id} className="space-y-4">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-blue-100 rounded-lg p-3 max-w-[80%]">
                  <p className="text-gray-800">{conversation.query}</p>
                </div>
              </div>
              
              {/* Assistant response */}
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                  <div className="whitespace-pre-wrap text-gray-800">{conversation.response}</div>
                  
                  {conversation.visualizations?.map((visualization, vizIndex) => (
                    <div key={`${conversation.id}-viz-${vizIndex}`} className="mt-4">
                      {visualization.type === 'table' && (
                        <DataTable 
                          data={visualization.data} 
                          headers={visualization.headers}
                          allowCustomization={isBenchmarks}
                          visualizationId={visualization.id || `viz-${vizIndex}`}
                          conversationId={conversation.id}
                        />
                      )}
                      
                      {visualization.type === 'chart' && (
                        <DataChart 
                          data={visualization.data}
                          type={visualization.chartType || 'bar'}
                          xKey={visualization.xKey || 'x'}
                          yKeys={visualization.yKeys || ['y']}
                          height={visualization.height || 300}
                          allowCustomization={isBenchmarks}
                          visualizationId={visualization.id || `viz-${vizIndex}`}
                          conversationId={conversation.id}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={conversationsEndRef} />
      </div>
      
      {/* Reply input section */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleReply();
              }
            }}
          />
          <Button 
            onClick={handleReply}
            disabled={isReplying || !replyText.trim()}
          >
            {isReplying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
