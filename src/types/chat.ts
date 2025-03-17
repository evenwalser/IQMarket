
export type JsonObject = { [key: string]: any };

export type DiagramType = 
  | 'table' 
  | 'chart' 
  | 'flowChart' 
  | 'orgChart' 
  | 'quadrantChart' 
  | 'raciMatrix' 
  | 'timeline' 
  | 'funnel' 
  | 'mindMap';

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'radar' | 'composed';

export interface ChatVisualization {
  id: string;
  type: DiagramType;
  data: Record<string, any>[];
  headers?: string[];
  title?: string;
  subTitle?: string;
  chartType?: ChartType;
  xKey?: string;
  yKeys?: string[];
  height?: number;
  colorScheme?: 'default' | 'financial' | 'retention' | 'performance' | 'operational';
  compact?: boolean;
  
  // For flow charts
  nodes?: Array<{id: string; label: string; [key: string]: any}>;
  edges?: Array<{from: string; to: string; [key: string]: any}>;
  
  // For quadrant charts
  items?: Array<{id: string; label: string; x: number; y: number; quadrant?: number}>;
  xAxisLabel?: string;
  yAxisLabel?: string;
  
  // For RACI matrices
  tasks?: Array<{task: string; roles: Record<string, string>}>;
  roles?: string[];
  
  // For timelines
  timelineItems?: Array<{id: string; task: string; start: string; end: string}>;
  
  // For funnels
  stages?: Array<{stage: string; value: number}>;
  
  // For mind maps
  root?: {
    id: string;
    text: string;
    children: any[];
  };
}

export interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  visualizations?: ChatVisualization[];
  attachments?: Array<{
    id: string;
    type: string;
    url: string;
    name: string;
  }>;
}
