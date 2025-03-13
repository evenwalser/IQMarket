
import { useEffect, useRef, useState } from "react";
import type { Conversation } from "@/lib/types";
import { DataTable } from "@/components/chat/visualizations/DataTable";
import { DataChart } from "@/components/chat/visualizations/DataChart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Volume2, VolumeX } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConversationListProps {
  conversations: Conversation[];
  onReply: (threadId: string, message: string, assistantType: string) => Promise<void>;
  voiceMode?: boolean;
  onLatestResponse?: (response: string) => void;
}

export const ConversationList = ({ 
  conversations, 
  onReply, 
  voiceMode = false,
  onLatestResponse 
}: ConversationListProps) => {
  const conversationsEndRef = useRef<HTMLDivElement>(null);
  const conversationsStartRef = useRef<HTMLDivElement>(null);
  const [replyMap, setReplyMap] = useState<Map<string, string>>(new Map());
  const [replyingThreadId, setReplyingThreadId] = useState<string | null>(null);
  const { isSpeaking, speakText, stopSpeaking } = useTextToSpeech();
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);

  // Track the latest response for TTS
  useEffect(() => {
    if (conversations.length > 0 && onLatestResponse) {
      const latestConversation = conversations[0]; // Assuming conversations are sorted newest first
      onLatestResponse(latestConversation.response);
      
      // Scroll to the top of the conversation list when a new response is received
      if (conversationsStartRef.current) {
        conversationsStartRef.current.scrollIntoView({ behavior: "smooth" });
        
        // Also scroll the page to the top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [conversations, onLatestResponse]);

  const handleReplyChange = (threadId: string, text: string) => {
    const newMap = new Map(replyMap);
    newMap.set(threadId, text);
    setReplyMap(newMap);
  };

  const handleReply = async (threadId: string, assistantType: string) => {
    const replyText = replyMap.get(threadId) || "";
    if (!replyText.trim()) return;
    
    setReplyingThreadId(threadId);
    try {
      await onReply(threadId, replyText, assistantType);
      
      // Clear the reply for this thread after sending
      const newMap = new Map(replyMap);
      newMap.delete(threadId);
      setReplyMap(newMap);
    } catch (error) {
      console.error("Error sending reply:", error);
    } finally {
      setReplyingThreadId(null);
    }
  };

  const toggleSpeakResponse = (response: string, conversationId: string) => {
    if (isSpeaking && currentSpeakingId === conversationId) {
      stopSpeaking();
      setCurrentSpeakingId(null);
    } else {
      stopSpeaking();
      speakText(response);
      setCurrentSpeakingId(conversationId);
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

  // Group conversations by thread_id and assistant_type
  const threadMap = new Map<string, Conversation[]>();
  
  // Group by thread_id
  conversations.forEach(conversation => {
    const key = conversation.thread_id;
    if (!threadMap.has(key)) {
      threadMap.set(key, []);
    }
    threadMap.get(key)?.push(conversation);
  });
  
  // Sort threads by most recent conversation
  const sortedThreads = Array.from(threadMap.entries()).sort((a, b) => {
    const aLatest = a[1].reduce((latest, conv) => 
      new Date(conv.created_at) > new Date(latest.created_at) ? conv : latest, a[1][0]);
    const bLatest = b[1].reduce((latest, conv) => 
      new Date(conv.created_at) > new Date(latest.created_at) ? conv : latest, b[1][0]);
    
    return new Date(bLatest.created_at).getTime() - new Date(aLatest.created_at).getTime();
  });
  
  return (
    <div className="space-y-8">
      <div ref={conversationsStartRef} /> {/* Reference for scrolling to the top */}
      
      {sortedThreads.map(([threadId, threadConversations]) => {
        // Sort conversations within thread by creation date (oldest first)
        const sortedConversations = [...threadConversations].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        const assistantType = sortedConversations[0]?.assistant_type || '';
        const replyText = replyMap.get(threadId) || "";
        const isReplying = replyingThreadId === threadId;
        
        return (
          <div key={threadId} className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  assistantType === 'knowledge' ? 'bg-purple-600' :
                  assistantType === 'benchmarks' ? 'bg-rose-400' :
                  'bg-green-500'
                }`} />
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {assistantType} Assistant
                </span>
                
                {voiceMode && (
                  <span className="ml-auto text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    Voice Mode Active
                  </span>
                )}
              </div>
            </div>
            
            <ScrollArea className="max-h-[500px] overflow-y-auto">
              <div className="p-4 space-y-6">
                {sortedConversations.map((conversation, index) => {
                  const isCurrentlySpeaking = isSpeaking && currentSpeakingId === conversation.id;
                  
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
                        <div className={`rounded-lg p-3 max-w-[80%] ${isCurrentlySpeaking ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-100'}`}>
                          <div className="whitespace-pre-wrap text-gray-800 relative pr-8">
                            {conversation.response}
                            
                            {/* Text-to-speech button */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className={`absolute top-0 right-0 h-8 w-8 ${isCurrentlySpeaking ? 'text-indigo-600' : 'opacity-70 hover:opacity-100'}`}
                              onClick={() => toggleSpeakResponse(conversation.response, conversation.id)}
                            >
                              {isCurrentlySpeaking ? (
                                <VolumeX className="h-4 w-4" />
                              ) : (
                                <Volume2 className="h-4 w-4 text-gray-500" />
                              )}
                            </Button>
                          </div>
                          
                          {conversation.visualizations?.map((visualization, vizIndex) => (
                            <div key={`${conversation.id}-viz-${vizIndex}`} className="mt-4">
                              {visualization.type === 'table' && (
                                <DataTable 
                                  data={visualization.data} 
                                  headers={visualization.headers}
                                  allowCustomization={assistantType === 'benchmarks'}
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
                                  allowCustomization={assistantType === 'benchmarks'}
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
              </div>
            </ScrollArea>
            
            {/* Thread-specific reply input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={replyText}
                  onChange={(e) => handleReplyChange(threadId, e.target.value)}
                  placeholder="Type your follow-up question..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleReply(threadId, assistantType);
                    }
                  }}
                />
                <Button 
                  onClick={() => handleReply(threadId, assistantType)}
                  disabled={isReplying || !replyText.trim()}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
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
      })}
      
      <div ref={conversationsEndRef} />
    </div>
  );
};
