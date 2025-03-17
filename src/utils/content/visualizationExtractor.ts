
import { ChatVisualization, DiagramType } from "@/types/chat";
import { detectVisualizationType, formatDataForVisualization } from "./visualizationDetector";

/**
 * Extracts JSON visualizations from the content
 */
export const extractJsonVisualizations = (
  content: string
): { processedContent: string; extractedVisualizations: ChatVisualization[] } => {
  const extractedVisualizations: ChatVisualization[] = [];
  
  // Extract JSON visualizations
  const jsonRegex = /```json\n([\s\S]*?)\n```/g;
  const processedContent = content.replace(jsonRegex, (match, jsonContent) => {
    try {
      const data = JSON.parse(jsonContent);
      
      // Check if it's explicitly a visualization
      if (data.type && (data.type === 'table' || data.type === 'chart' || 
          data.type === 'flowChart' || data.type === 'orgChart' || 
          data.type === 'quadrantChart' || data.type === 'raciMatrix' || 
          data.type === 'timeline' || data.type === 'funnel' || 
          data.type === 'mindMap')) {
        
        const vizId = crypto.randomUUID();
        extractedVisualizations.push({
          id: vizId,
          type: data.type as DiagramType,
          data: data.data || [], // Ensure data is provided
          ...data
        });
        return `\n\n*Visualization #${extractedVisualizations.length}*\n\n`;
      }
      
      // If not explicitly a visualization, try to detect if it contains data we can visualize
      if (Array.isArray(data)) {
        // Detect the best visualization type based on the data structure
        const diagramType = detectVisualizationType(data);
        
        if (diagramType) {
          // Format the data appropriately for the detected type
          const formattedData = formatDataForVisualization(data, diagramType);
          
          const vizId = crypto.randomUUID();
          extractedVisualizations.push({
            id: vizId,
            type: diagramType,
            data: data, // Ensure data is provided
            ...formattedData
          });
          return `\n\n*Visualization #${extractedVisualizations.length}*\n\n`;
        }
      }
    } catch (e) {
      console.error("Error parsing JSON visualization:", e);
    }
    return match;
  });
  
  return { processedContent, extractedVisualizations };
};

/**
 * Determines if the data should be displayed as a chart based on headers and data.
 */
export const determineIfChartable = (headers: string[], data: Record<string, string>[]): boolean => {
  if (headers.length < 2 || data.length < 2) return false;
  
  // Check if we have at least one numeric column besides the first column (labels)
  const hasNumericColumns = headers.slice(1).some(header => {
    return data.some(row => {
      const value = row[header];
      return value && !isNaN(Number(value.replace(/[$,%]/g, '')));
    });
  });
  
  return hasNumericColumns;
};

/**
 * Determines the color scheme based on the table title and headers.
 */
export const determineColorScheme = (title: string | undefined, headers: string[]): 'default' | 'financial' | 'retention' | 'performance' | 'operational' => {
  if (!title) {
    title = headers.join(' ');
  }
  
  const lowerTitle = title?.toLowerCase() || '';
  const lowerHeaders = headers.map(h => h.toLowerCase());
  
  // Define metric categories with their associated terms
  const metricCategories = {
    financial: ['revenue', 'cost', 'profit', 'margin', 'arr', 'mrr', 'cac', 'ltv', 'budget', 'expense', 'income', 'cash', 'price'],
    retention: ['churn', 'retention', 'customers', 'users', 'engagement', 'active', 'returning', 'loyalty'],
    performance: ['growth', 'conversion', 'sales', 'traffic', 'leads', 'acquisition', 'performance'],
    operational: ['time', 'speed', 'efficiency', 'productivity', 'capacity', 'utilization'],
  };
  
  // Check title and headers against categories
  for (const [category, terms] of Object.entries(metricCategories)) {
    if (terms.some(term => lowerTitle.includes(term)) || 
        lowerHeaders.some(header => terms.some(term => header.includes(term)))) {
      return category as 'financial' | 'retention' | 'performance' | 'operational';
    }
  }
  
  return 'default';
};

/**
 * Intelligently suggests the best visualization type based on the data structure.
 */
export const suggestVisualizationType = (
  data: Record<string, any>[],
  headers: string[],
  title?: string
): DiagramType => {
  return detectVisualizationType(data, headers, title);
};
