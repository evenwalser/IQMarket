
export interface ChatVisualization {
  id?: string;
  type: 'table' | 'chart';
  data: any[];
  headers?: string[];
  chartType?: 'line' | 'bar' | 'area' | 'radar' | 'composed';
  xKey?: string;
  yKeys?: string[];
  height?: number;
}

export interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
  visualizations?: ChatVisualization[];
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  id?: string;
  name: string;
  url: string;
  type: 'image' | 'document' | 'audio' | 'video' | 'other';
  contentType?: string;
  size?: number;
}

export interface WebSocketMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
  type?: 'message' | 'ping' | 'system';
}
