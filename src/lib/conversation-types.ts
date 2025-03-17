
import { ChatVisualization, JsonObject } from "@/types/chat";
import { AssistantType } from "@/lib/types";

export interface UploadedAttachment {
  id: string;
  file_path: string;
  file_name: string;
  content_type: string;
  size: number;
  created_at: string;
}

export interface ConversationHookState {
  isLoading: boolean;
  attachments: File[];
  uploadedAttachments: UploadedAttachment[];
  threadId: string | null;
  structuredOutput: boolean;
  sessionId: string;
  latestResponse: string | null;
}
