
export interface ChatAttachment {
  type: 'image' | 'file';
  url: string;
  name: string;
}

export interface ChatVisualization {
  type: 'table' | 'chart';
  data: Record<string, any>[];
  headers?: string[];  // For tables
  chartType?: 'line' | 'bar' | 'radar' | 'area' | 'composed';  // For charts
  xKey?: string;  // For charts
  yKeys?: string[];  // For charts
  height?: number;  // For charts
  title?: string;  // Title for either
  subTitle?: string;  // Subtitle for chart
  colorScheme?: 'default' | 'purple' | 'blue' | 'green' | 'red';  // Color scheme for chart or table
  compact?: boolean;  // For tables
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
  visualizations?: ChatVisualization[];
}
