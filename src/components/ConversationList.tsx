
import { useEffect, useRef, useState } from "react";
import type { Conversation } from "@/lib/types";
import { DataTable } from "@/components/chat/visualizations/DataTable";
import { DataChart } from "@/components/chat/visualizations/DataChart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare, Loader2 } from "lucide-react";

interface ConversationListProps {
  conversations: Conversation[];
  onReply: (threadId: string, message: string, assistantType: string) => Promise<void>;
}

export const ConversationList = ({ conversations, onReply }: ConversationListProps) => {
  const conversationsEndRef = useRef<HTMLDivElement>(null);
  const [activeReply, setActiveReply] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    if (conversationsEndRef.current) {
      conversationsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversations]);

  const handleReply = async (conversation: Conversation) => {
    if (!replyText.trim()) return;
    
    setIsReplying(true);
    try {
      await onReply(conversation.thread_id, replyText, conversation.assistant_type);
      setReplyText("");
      setActiveReply(null);
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

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-800">Recent Conversations</h2>
      
      <div className="space-y-6">
        {conversations.map((conversation) => {
          const isReplyActive = activeReply === conversation.id;
          
          return (
            <div key={conversation.id} className="border rounded-lg bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-full space-y-4">
                  <div className="flex justify-between items-center">
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
                    
                    {!isReplyActive && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-gray-500 flex items-center gap-1"
                        onClick={() => setActiveReply(conversation.id)}
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Reply</span>
                      </Button>
                    )}
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
                    
                    {isReplyActive && (
                      <div className="mt-4">
                        <div className="flex gap-2">
                          <Input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your follow-up question..."
                            className="flex-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleReply(conversation);
                              }
                            }}
                          />
                          <Button 
                            onClick={() => handleReply(conversation)}
                            disabled={isReplying || !replyText.trim()}
                          >
                            {isReplying ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setActiveReply(null);
                              setReplyText("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={conversationsEndRef} />
      </div>
    </div>
  );
};
