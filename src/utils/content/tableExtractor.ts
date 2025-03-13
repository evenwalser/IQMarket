
import { ChatVisualization } from "@/types/chat";
import { determineIfChartable, determineColorScheme } from "./visualizationExtractor";

/**
 * Extracts Markdown tables from the content and converts them to visualizations
 */
export const extractMarkdownTables = (
  content: string
): { processedContent: string; extractedVisualizations: ChatVisualization[] } => {
  const extractedVisualizations: ChatVisualization[] = [];
  
  // Extract Markdown tables and convert to visualizations
  const markdownTableRegex = /\n\s*(\#{1,3}\s+(.+)\n)?\s*\|(.+\|)+\s*\n\s*\|(\s*[-:]+\s*\|)+\s*\n(\s*\|.+\|.+\s*\n)+/g;
  
  const processedContent = content.replace(markdownTableRegex, (match, headerLine, title) => {
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
        
        // Add color scheme - ensure it's one of the allowed values
        visualization.colorScheme = colorScheme as 'default' | 'financial' | 'retention' | 'performance' | 'operational';
        
        extractedVisualizations.push(visualization);
        return `\n\n*Visualization #${extractedVisualizations.length}*\n\n`;
      }
    } catch (e) {
      console.error("Error processing markdown table:", e);
    }
    return match;
  });
  
  return { processedContent, extractedVisualizations };
};

/**
 * Extracts ASCII tables (fallback)
 */
export const extractAsciiTables = (
  content: string
): { processedContent: string; extractedVisualizations: ChatVisualization[] } => {
  const extractedVisualizations: ChatVisualization[] = [];
  
  // Extract ASCII tables (fallback)
  const asciiTableRegex = /\n([\+\-]+[\+\-][\+\-]+\n(\|[^\n]+\|\n))+[\+\-]+[\+\-][\+\-]+\n/g;
  
  const processedContent = content.replace(asciiTableRegex, (match) => {
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
  
  return { processedContent, extractedVisualizations };
};
