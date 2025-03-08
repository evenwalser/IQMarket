import { useState } from "react";
import type { Conversation } from "@/lib/types";
import { DataTable } from "@/components/chat/visualizations/DataTable";
import { DataChart } from "@/components/chat/visualizations/DataChart";
import { Button } from "@/components/ui/button";
import { PlusCircle, MessageSquare, Volume2, VolumeX, Send } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { Input } from "@/components/ui/input";

// Custom styled badge component to match the knowledge button gradient
const AssistantTypeBadge = ({ type, isActive = false }: { type: string; isActive?: boolean }) => {
  const isKnowledge = type.toLowerCase() === 'knowledge';
  
  if (isKnowledge) {
    return (
      <Badge 
        variant={isActive ? "default" : "outline"} 
        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
      >
        {type}
      </Badge>
    );
  }
  
  return (
    <Badge variant={isActive ? "default" : "outline"}>
      {type}
    </Badge>
  );
};

interface ConversationListProps {
  conversations: Conversation[];
  activeThreadId?: string | null;
  onSelectThread: (threadId: string, message: string) => void;
  onStartNewThread: () => void;
}

export const ConversationList = ({ 
  conversations, 
  activeThreadId,
  onSelectThread,
  onStartNewThread
}: ConversationListProps) => {
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);
  const { isSpeaking, speakText, stopSpeaking } = useTextToSpeech();
  const [messageInputs, setMessageInputs] = useState<Record<string, string>>({});

  // Group conversations by thread_id
  const threadGroups = conversations.reduce((groups, conversation) => {
    const threadId = conversation.thread_id;
    if (!groups[threadId]) {
      groups[threadId] = [];
    }
    groups[threadId].push(conversation);
    return groups;
  }, {} as Record<string, Conversation[]>);

  // Sort threads by most recent conversation
  const sortedThreads = Object.entries(threadGroups)
    .map(([threadId, convos]) => ({
      threadId,
      conversations: convos.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
      latestDate: new Date(convos[0].created_at)
    }))
    .sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime());

  // Toggle speaking for a response
  const toggleSpeakResponse = (response: string, conversationId: string) => {
    if (isSpeaking && currentSpeakingId === conversationId) {
      stopSpeaking();
      setCurrentSpeakingId(null);
    } else {
      if (isSpeaking) {
        stopSpeaking();
      }
      speakText(response);
      setCurrentSpeakingId(conversationId);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  // Handle input change for a specific thread
  const handleMessageInputChange = (threadId: string, value: string) => {
    setMessageInputs(prev => ({
      ...prev,
      [threadId]: value
    }));
  };

  // Handle sending a message in a thread
  const handleSendMessage = (threadId: string) => {
    const message = messageInputs[threadId] || '';
    if (message.trim()) {
      // Call the onSelectThread function with the thread ID and message
      onSelectThread(threadId, message);
      
      // Clear the input for this thread
      setMessageInputs(prev => ({
        ...prev,
        [threadId]: ''
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Conversation Threads</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onStartNewThread}
          className="flex items-center gap-1"
        >
          <PlusCircle size={16} />
          <span>New Thread</span>
        </Button>
      </div>
      
      {sortedThreads.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No conversations yet. Start by asking a question above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedThreads.map(({ threadId, conversations: threadConversations }) => {
            const latestConversation = threadConversations[0];
            const isActive = activeThreadId === threadId;
            
            return (
              <Card 
                key={threadId} 
                className={`overflow-hidden transition-all ${
                  isActive ? 'border-primary shadow-md' : ''
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">
                        {latestConversation.query.length > 60 
                          ? latestConversation.query.substring(0, 60) + '...' 
                          : latestConversation.query}
                      </CardTitle>
                      <CardDescription>
                        {formatDate(latestConversation.created_at)}
                      </CardDescription>
                    </div>
                    <AssistantTypeBadge type={latestConversation.assistant_type} isActive={isActive} />
                  </div>
                </CardHeader>
                
                <CardContent className="pb-2">
                  <div className="space-y-2">
                    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-800 prose-p:text-gray-600 prose-strong:text-gray-800 prose-li:text-gray-600 prose-ul:my-2 prose-ol:my-2">
                      <ReactMarkdown>
                        {latestConversation.response}
                      </ReactMarkdown>
                    </div>
                    
                    {/* Visualizations */}
                    {latestConversation.visualizations && latestConversation.visualizations.length > 0 && (
                      <div className="mt-4 space-y-4">
                        {latestConversation.visualizations.map((viz, index) => (
                          <div key={index} className="border rounded-md p-2 bg-gray-50">
                            {viz.type === 'table' ? (
                              <DataTable 
                                data={viz.data || []} 
                                headers={viz.headers} 
                              />
                            ) : viz.type === 'chart' ? (
                              <DataChart 
                                data={viz.data || []} 
                                type={viz.chartType || 'bar'} 
                                xKey={viz.xKey || 'x'} 
                                yKeys={viz.yKeys || ['y']} 
                                height={viz.height || 300}
                                title={viz.title}
                                imageData={viz.imageData}
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="pt-2 flex justify-between">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toggleSpeakResponse(latestConversation.response, latestConversation.id)}
                    className="text-xs"
                  >
                    {isSpeaking && currentSpeakingId === latestConversation.id ? (
                      <><VolumeX size={14} className="mr-1" /> Stop</>
                    ) : (
                      <><Volume2 size={14} className="mr-1" /> Listen</>
                    )}
                  </Button>
                  
                  {!isActive ? (
                    <Button 
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => onSelectThread(threadId, '')}
                      className={`text-xs ${isActive ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : ''}`}
                    >
                      <MessageSquare size={14} className="mr-1" /> 
                      Continue Conversation
                    </Button>
                  ) : null}
                </CardFooter>
                
                {/* Direct chat input for active threads */}
                {isActive && (
                  <div className="px-4 pb-4">
                    <div className="flex items-center space-x-2 mt-2">
                      <Input
                        placeholder="Type your message..."
                        value={messageInputs[threadId] || ''}
                        onChange={(e) => handleMessageInputChange(threadId, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(threadId);
                          }
                        }}
                        className="flex-1"
                      />
                      <Button 
                        size="icon"
                        onClick={() => handleSendMessage(threadId)}
                        disabled={!messageInputs[threadId]?.trim()}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600"
                      >
                        <Send size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
