
export interface ChatAttachment {
  type: 'image' | 'file';
  url: string;
  name: string;
}

export interface ChatVisualization {
  id?: string;
  type: 'table' | 'chart' | 'flowChart' | 'orgChart' | 'quadrantChart' | 'raciMatrix' | 'funnel';
  data: Record<string, any>[];
  headers?: string[];  // For tables
  chartType?: 'line' | 'bar' | 'radar' | 'area' | 'composed';  // For charts
  xKey?: string;  // For charts
  yKeys?: string[];  // For charts
  height?: number;  // For charts
  title?: string;  // Title for either
  subTitle?: string;  // Subtitle for chart
  colorScheme?: 'default' | 'purple' | 'blue' | 'green' | 'red' | 'financial' | 'retention' | 'performance' | 'operational';  // Color scheme for chart or table
  compact?: boolean;  // For tables
  
  // For flow charts and org charts
  nodes?: Array<{id: string; label: string; role?: string; parentId?: string | null; [key: string]: any}>;
  edges?: Array<{from: string; to: string; [key: string]: any}>;
  
  // For org charts specifically
  entities?: Array<{id: string; name: string; role?: string; parentId?: string | null}>;
  
  // For quadrant charts
  items?: Array<{id: string; label: string; x: number; y: number; quadrant?: number}>;
  xAxisLabel?: string;
  yAxisLabel?: string;
  
  // For RACI matrices
  tasks?: Array<{task: string; roles: Record<string, string>}>;
  roles?: string[];
  
  // For funnels
  stages?: Array<{stage: string; value: number}>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
  visualizations?: ChatVisualization[];
}
