
export interface ChatAttachment {
  type: 'image' | 'file';
  url: string;
  name: string;
}

export interface ChatVisualization {
  id?: string;  // Added ID for tracking visualizations
  type: 'table' | 'chart';
  data: Record<string, any>[];
  headers?: string[];  // For tables
  chartType?: 'line' | 'bar' | 'area' | 'radar' | 'composed';  // For charts
  xKey?: string;  // For charts
  yKeys?: string[];  // For charts
  height?: number;  // For charts
  title?: string;
  subTitle?: string;
  userSettings?: Record<string, any>;  // For storing user customizations
  originalSettings?: Record<string, any>;  // For storing original settings
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
  visualizations?: ChatVisualization[];
}
