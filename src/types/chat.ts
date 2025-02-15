
export interface ChatAttachment {
  type: 'image' | 'file';
  url: string;
  name: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
}
