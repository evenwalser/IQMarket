
import { useEffect, useRef, useState } from "react";
import type { Conversation } from "@/lib/types";
import { DataTable } from "@/components/chat/visualizations/DataTable";
import { DataChart } from "@/components/chat/visualizations/DataChart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Volume2, VolumeX } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

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
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);
  const { isSpeaking, speakText, stopSpeaking } = useTextToSpeech();

  // Track the latest response for TTS
  useEffect(() => {
    if (conversations.length > 0 && onLatestResponse) {
      const latestConversation = conversations[0]; // Assuming conversations are sorted newest first
      onLatestResponse(latestConversation.response);
    }
  }, [conversations, onLatestResponse]);

  useEffect(() => {
    if (conversationsEndRef.current) {
      conversationsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversations]);

  const handleReply = async () => {
    if (!replyText.trim() || conversations.length === 0) return;
    
    // Get the most recent conversation to reply to
    const lastConversation = conversations[0]; // Assuming conversations are sorted newest first
    
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

  const toggleSpeakResponse = (response: string, conversationId: string) => {
    if (isSpeaking && currentSpeakingId === conversationId) {
      // Stop speaking if this is the current speaking response
      stopSpeaking();
      setCurrentSpeakingId(null);
    } else {
      // Stop any ongoing speech and speak this response
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
          
          {voiceMode && (
            <span className="ml-auto text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              Voice Mode Active
            </span>
          )}
        </div>
      </div>
      
      <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto">
        {currentThread.map((conversation, index) => {
          const isBenchmarks = conversation.assistant_type === 'benchmarks';
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
};
