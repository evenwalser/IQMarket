
import { Header } from "@/components/Header";
import { RealtimeChatTester } from "@/components/RealtimeChatTester";

const TestRealtimeChat = () => {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header />
      <main className="pt-20 pb-16 container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6 text-center">WebSocket Testing Page</h1>
        <p className="text-center mb-8 text-muted-foreground">
          This page is used to test the WebSocket infrastructure for real-time communication.
        </p>
        
        <RealtimeChatTester />
      </main>
    </div>
  );
};

export default TestRealtimeChat;
