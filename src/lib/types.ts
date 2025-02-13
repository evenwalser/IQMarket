
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
