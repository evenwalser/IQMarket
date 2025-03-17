
export type StructuredSectionType = 'text' | 'heading' | 'chart' | 'image' | 'flowChart' | 'table';

export interface StructuredSection {
  type: StructuredSectionType;
  content?: string;
  level?: number; // For headings
  chartData?: any; // For charts
  tableData?: any; // For tables
  imageUrl?: string; // For images
  flowChartData?: any; // For flow charts
}

export interface StructuredResponse {
  assistantType: 'knowledge' | 'benchmarks' | 'frameworks';
  sections: StructuredSection[];
}
