
import { useRef, useState } from "react";
import { Header } from "@/components/Header";
import { UnifiedSearch } from "@/components/UnifiedSearch";
import { PageHeader } from "@/components/page/PageHeader";
import { ConversationsSection } from "@/components/page/ConversationsSection";
import { useConversations } from "@/hooks/useConversations";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import type { AssistantType } from "@/lib/types";

const Index = () => {
  const pageTopRef = useRef<HTMLDivElement>(null);
  const [selectedMode, setSelectedMode] = useState<AssistantType>("knowledge");
  const [voiceMode, setVoiceMode] = useState<boolean>(false);
  const { speakText } = useTextToSpeech();
  
  const {
    isLoading,
    conversations,
    attachments,
    structuredOutput,
    setStructuredOutput,
    latestResponse,
    handleLatestResponse,
    handleFileUpload,
    handleSearch,
    handleReply,
    startNewSession
  } = useConversations();

  const handleSearchRequest = async (searchQuery: string) => {
    await handleSearch(searchQuery, selectedMode);
    
    // Scroll to top when a new conversation is created
    pageTopRef.current?.scrollIntoView({ behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReplyRequest = async (threadId: string, message: string, assistantType: string) => {
    await handleReply(threadId, message, assistantType);
    
    // If in voice mode, automatically read out the response
    if (voiceMode && latestResponse) {
      speakText(latestResponse);
    }
    
    // Scroll to top when a new reply is received
    pageTopRef.current?.scrollIntoView({ behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // When mode changes to benchmarks, automatically enable structured output
  const handleModeChange = (mode: AssistantType) => {
    setSelectedMode(mode);
    // Always enable structured output for benchmarks mode
    if (mode === 'benchmarks') {
      setStructuredOutput(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div ref={pageTopRef} /> {/* Reference for scrolling to top of page */}
      <Header />

      <main className="pt-0 w-full">
        <div className="w-full bg-gradient-to-r from-purple-600/5 via-blue-500/5 to-purple-600/5 
          animate-gradient-background backdrop-blur-sm pb-24">
          <div className="w-full mx-auto px-0 pt-20 bg-[#f2f2f2]">
            <PageHeader />

            <div className="max-w-[1600px] mx-auto px-4 space-y-8">
              <UnifiedSearch 
                handleSearch={handleSearchRequest}
                isLoading={isLoading}
                selectedMode={selectedMode}
                setSelectedMode={handleModeChange}
                handleFileUpload={handleFileUpload}
                attachments={attachments}
                structuredOutput={structuredOutput}
                setStructuredOutput={setStructuredOutput}
                latestResponse={latestResponse || undefined}
              />

              <ConversationsSection 
                conversations={conversations}
                onReply={handleReplyRequest}
                onNewSession={startNewSession}
                onLatestResponse={handleLatestResponse}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
