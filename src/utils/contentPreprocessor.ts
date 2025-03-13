
import { ChatVisualization } from "@/types/chat";

interface ProcessedContentResult {
  processedContent: string;
  extractedVisualizations: ChatVisualization[];
}

/**
 * Processes the content of a message to extract visualizations and format the content.
 */
export const preprocessContent = (content: string): ProcessedContentResult => {
  if (!content) {
    return {
      processedContent: '',
      extractedVisualizations: []
    };
  }

  let processedContent = content;
  const extractedVisualizations: ChatVisualization[] = [];

  // Extract JSON visualizations
  const jsonRegex = /```json\n([\s\S]*?)\n```/g;
  processedContent = processedContent.replace(jsonRegex, (match, jsonContent) => {
    try {
      const data = JSON.parse(jsonContent);
      if (data.type && (data.type === 'table' || data.type === 'chart') && data.data) {
        const vizId = crypto.randomUUID();
        extractedVisualizations.push({
          id: vizId,
          ...data
        });
        return `\n\n*Visualization #${extractedVisualizations.length}*\n\n`;
      }
    } catch (e) {
      console.error("Error parsing JSON visualization:", e);
    }
    return match;
  });

  // Extract Markdown tables and convert to visualizations
  const markdownTableRegex = /\n\s*(\#{1,3}\s+(.+)\n)?\s*\|(.+\|)+\s*\n\s*\|(\s*[-:]+\s*\|)+\s*\n(\s*\|.+\|.+\s*\n)+/g;
  
  processedContent = processedContent.replace(markdownTableRegex, (match, headerLine, title) => {
    try {
      // Parse table headers and rows
      const lines = match.trim().split('\n').filter(line => line.trim().startsWith('|'));
      
      if (lines.length < 2) return match; // Need at least header and one data row
      
      // Extract headers
      const headerRow = lines[0];
      const headers = headerRow
        .split('|')
        .filter(cell => cell.trim() !== '')
        .map(cell => cell.trim());
      
      // Extract data rows
      const dataRows = lines.slice(2); // Skip header and separator rows
      const data = dataRows.map(row => {
        const cells = row
          .split('|')
          .filter(cell => cell.trim() !== '')
          .map(cell => cell.trim());
        
        const rowData: Record<string, string> = {};
        headers.forEach((header, index) => {
          if (cells[index] !== undefined) {
            rowData[header] = cells[index];
          }
        });
        
        return rowData;
      });
      
      if (data.length > 0) {
        // Determine if this is financial/metrics data that would benefit from a chart
        const isChartable = determineIfChartable(headers, data);
        const colorScheme = determineColorScheme(title, headers);
        
        // Create visualization object
        const visualization: ChatVisualization = {
          id: crypto.randomUUID(),
          type: isChartable ? 'chart' : 'table',
          data: data,
          headers: headers,
          title: title || 'Data Table',
        };
        
        // Add chart-specific properties if it's a chart
        if (isChartable) {
          visualization.chartType = 'bar';
          visualization.xKey = headers[0];
          visualization.yKeys = headers.slice(1);
          visualization.height = 300;
        }
        
        // Add color scheme
        visualization.colorScheme = colorScheme;
        
        extractedVisualizations.push(visualization);
        return `\n\n*Visualization #${extractedVisualizations.length}*\n\n`;
      }
    } catch (e) {
      console.error("Error processing markdown table:", e);
    }
    return match;
  });
  
  // Extract ASCII tables (fallback)
  const asciiTableRegex = /\n([\+\-]+[\+\-][\+\-]+\n(\|[^\n]+\|\n))+[\+\-]+[\+\-][\+\-]+\n/g;
  
  processedContent = processedContent.replace(asciiTableRegex, (match) => {
    try {
      // Basic ASCII table parsing
      const lines = match.split('\n').filter(line => line.startsWith('|'));
      if (lines.length < 1) return match;
      
      // Create a basic visualization
      const visualization: ChatVisualization = {
        id: crypto.randomUUID(),
        type: 'table',
        data: [{ value: 'See table in text' }],
        title: 'ASCII Table (See text)',
      };
      
      extractedVisualizations.push(visualization);
      return match; // Keep the ASCII table in the text for reference
    } catch (e) {
      console.error("Error processing ASCII table:", e);
    }
    return match;
  });
  
  return {
    processedContent,
    extractedVisualizations,
  };
};

/**
 * Determines if the data should be displayed as a chart based on headers and data.
 */
const determineIfChartable = (headers: string[], data: Record<string, string>[]): boolean => {
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
const determineColorScheme = (title: string | undefined, headers: string[]): string => {
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
      return category;
    }
  }
  
  return 'default';
};
