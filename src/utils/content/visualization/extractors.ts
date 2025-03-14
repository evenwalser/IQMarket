
import { ChatVisualization } from "@/types/chat";
import { determineChartType, determineColorScheme } from "./chartHelpers";
import { extractMetricsFromDescription, generateSampleDataFromMetrics } from "./metricHelpers";

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
  
  return { processedContent, extractedVisualizations };
};

/**
 * Extracts chart descriptions from markdown headers and converts them to chart visualizations
 */
export const extractChartDescriptionsFromHeaders = (
  content: string
): { processedContent: string; extractedVisualizations: ChatVisualization[] } => {
  const extractedVisualizations: ChatVisualization[] = [];
  
  // Match headers that have chart-related words (Bar Chart, Line Chart, etc.)
  const chartHeaderRegex = /(#{1,3})\s+(.+?(Bar Chart|Line Chart|Chart|Graph|Comparison|Visualization).+?)(?:\n|$)([\s\S]*?)(?=#{1,3}|$)/gi;
  
  let match;
  let processedContent = content;
  
  // Reset regex lastIndex
  chartHeaderRegex.lastIndex = 0;
  
  while ((match = chartHeaderRegex.exec(content)) !== null) {
    const [fullMatch, headerMarks, headerTitle, chartType, description] = match;
    
    // Skip if there's already a visualization reference
    if (fullMatch.includes('*Visualization #')) {
      continue;
    }
    
    console.log(`Found chart description header: ${headerTitle}`);
    
    // Parse metrics from the description
    const metrics = extractMetricsFromDescription(description);
    
    if (metrics.length > 0) {
      // Generate sample data based on the metrics found
      const data = generateSampleDataFromMetrics(metrics, headerTitle);
      
      // Create a chart visualization
      const vizId = crypto.randomUUID();
      const visualization: ChatVisualization = {
        id: vizId,
        type: 'chart',
        chartType: determineChartType(headerTitle, description),
        title: headerTitle,
        subTitle: description.split('\n')[0]?.trim() || undefined,
        data,
        xKey: metrics.length > 0 ? 'category' : 'x',
        yKeys: metrics.length > 0 ? ['value', 'benchmark'] : ['y'],
        colorScheme: determineColorScheme(headerTitle, metrics)
      };
      
      extractedVisualizations.push(visualization);
      
      // Replace the header and description with a reference to the visualization
      const replacementText = `\n\n${headerMarks} ${headerTitle}\n\n*Visualization #${extractedVisualizations.length}*\n\n${description}`;
      processedContent = processedContent.replace(fullMatch, replacementText);
    }
  }
  
  return { processedContent, extractedVisualizations };
};
