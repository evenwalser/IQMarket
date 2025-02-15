
export interface ChatAttachment {
  type: 'image' | 'file';
  url: string;
  name: string;
}

export interface ChatVisualization {
  type: 'table' | 'chart';
  data: Record<string, any>[];
  headers?: string[];  // For tables
  chartType?: 'line' | 'bar';  // For charts
  xKey?: string;  // For charts
  yKeys?: string[];  // For charts
  height?: number;  // For charts
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
  visualizations?: ChatVisualization[];
}
