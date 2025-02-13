
export type AssistantType = "knowledge" | "frameworks";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}
