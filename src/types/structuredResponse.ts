
export type StructuredSectionType = 'text' | 'heading' | 'chart' | 'image' | 'flowChart' | 'orgChart' | 'table';

export interface StructuredSection {
  type: StructuredSectionType;
  content?: string;
  level?: number; // For headings
  chartData?: any; // For charts
  tableData?: any; // For tables
  imageUrl?: string; // For images
  flowData?: {
    title?: string;
    nodes: Array<{id: string; label: string; [key: string]: any}>;
    edges: Array<{from: string; to: string; [key: string]: any}>;
    [key: string]: any;
  }; // For flow charts and org charts
  [key: string]: any; // Add index signature to make it compatible with Json type
}

export interface StructuredResponse {
  assistantType: 'knowledge' | 'benchmarks' | 'frameworks';
  sections: StructuredSection[];
  [key: string]: any; // Add index signature to make it compatible with Json type
}

// Helper functions to convert between StructuredResponse and Json
export const structuredResponseToJson = (data: StructuredResponse): any => {
  return JSON.parse(JSON.stringify(data));
};

export const jsonToStructuredResponse = (data: any): StructuredResponse | null => {
  if (!data) return null;
  
  try {
    // Basic validation to ensure it has the expected structure
    if (typeof data === 'object' && 
        data.assistantType && 
        Array.isArray(data.sections)) {
      return data as StructuredResponse;
    }
    return null;
  } catch (e) {
    console.error('Error converting JSON to StructuredResponse:', e);
    return null;
  }
};
