
export type AssistantType = "knowledge" | "frameworks" | "benchmarks" | "assistant";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  query: string;
  response: string;
  assistant_type: AssistantType;
  thread_id: string;
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
