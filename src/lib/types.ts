
import { ChatVisualization } from "@/types/chat";
import { StructuredResponse } from "@/types/structuredResponse";

export type AssistantType = "knowledge" | "frameworks" | "benchmarks" | "assistant";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

// Update Conversation type to include visualizations and structured response
export interface Conversation {
  id: string;
  created_at: string;
  query: string;
  response: string;
  assistant_type: AssistantType;
  thread_id: string;
  session_id: string;
  assistant_id?: string | null;
  visualizations?: ReadonlyArray<ChatVisualization>; // Use ReadonlyArray to help TypeScript
  structured_response?: StructuredResponse | null; // Add structured response field
}

export interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  created_at: string;
  conversation_id: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  created_at: string;
  last_message_at: string;
  messages: ChatMessage[];
}
