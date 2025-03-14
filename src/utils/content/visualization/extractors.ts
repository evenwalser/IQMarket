
import { ChatVisualization } from "@/types/chat";
import { determineChartType, determineColorScheme, normalizeChartData } from "./chartHelpers";
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
  // Enhanced to also match "Point X:" headers with visualization descriptions
  const chartHeaderRegex = /(#{1,3}|Point \d+:)\s+(.+?(Bar Chart|Line Chart|Chart|Graph|Comparison|Visualization|Forecast|Projection).+?)(?:\n|$)([\s\S]*?)(?=#{1,3}|Point \d+:|Conclusion:|$)/gi;
  
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
        data: normalizeChartData(data),
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
  
  // Also check specifically for the forecasted outcomes section
  const forecastRegex = /(#{1,3}|Conclusion:|Forecasted Outcomes:|Recommendations:)\s+(.+?)(?:\n|$)([\s\S]*?)(?=#{1,3}|$)/gi;
  forecastRegex.lastIndex = 0;
  
  while ((match = forecastRegex.exec(content)) !== null) {
    const [fullMatch, headerMarks, headerTitle, description] = match;
    
    // Skip if there's already a visualization reference
    if (fullMatch.includes('*Visualization #')) {
      continue;
    }
    
    // Look for forecast-related terms
    if (headerTitle.toLowerCase().includes('forecast') || 
        headerTitle.toLowerCase().includes('outcome') || 
        headerTitle.toLowerCase().includes('recommendation') ||
        headerTitle.toLowerCase().includes('projection')) {
      
      console.log(`Found forecast section: ${headerTitle}`);
      
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
          chartType: 'composed', // Best for comparing current vs. projected values
          title: headerTitle,
          subTitle: "Projected outcomes based on recommendations",
          data: normalizeChartData(data),
          xKey: 'category',
          yKeys: ['current', 'projected'],
          colorScheme: 'performance'
        };
        
        extractedVisualizations.push(visualization);
        
        // Replace the header and description with a reference to the visualization
        const replacementText = `\n\n${headerMarks} ${headerTitle}\n\n*Visualization #${extractedVisualizations.length}*\n\n${description}`;
        processedContent = processedContent.replace(fullMatch, replacementText);
      }
    }
  }
  
  return { processedContent, extractedVisualizations };
};

/**
 * Extracts direct visualization references and processes their data
 */
export const extractDirectVisualizations = (
  content: string,
  visualizations: ChatVisualization[] | undefined
): { processedContent: string; extractedVisualizations: ChatVisualization[] } => {
  const extractedVisualizations: ChatVisualization[] = [];
  
  if (!visualizations || visualizations.length === 0) {
    return { processedContent: content, extractedVisualizations };
  }
  
  // Process each visualization to ensure it has the correct format and data is normalized
  visualizations.forEach(viz => {
    if (viz.type === 'chart' && viz.data) {
      const enhancedViz: ChatVisualization = {
        ...viz,
        data: normalizeChartData(viz.data),
        chartType: viz.chartType || determineChartType(viz.title || '', viz.subTitle || ''),
        colorScheme: viz.colorScheme || determineColorScheme(viz.title, viz.xKey || '')
      };
      extractedVisualizations.push(enhancedViz);
    } else {
      extractedVisualizations.push(viz);
    }
  });
  
  // Look for existing visualization references
  const referenceRegex = /\*Visualization #(\d+)\*/g;
  let hasReferences = referenceRegex.test(content);
  
  // If no references found, add them to the content at appropriate places
  if (!hasReferences && extractedVisualizations.length > 0) {
    let processedContent = content;
    const sections = processedContent.split(/#{1,3}\s+/);
    
    if (sections.length > 1) {
      // Add visualizations after relevant sections
      let vizIndex = 0;
      let newContent = sections[0]; // Keep the content before the first header
      
      for (let i = 1; i < sections.length && vizIndex < extractedVisualizations.length; i++) {
        const section = sections[i];
        const sectionTitle = section.split('\n')[0];
        
        // Add the section header and content
        newContent += `### ${sectionTitle}\n${section.substring(sectionTitle.length)}`;
        
        // Check if this is a good place for a visualization based on keywords
        const viz = extractedVisualizations[vizIndex];
        const sectionLower = section.toLowerCase();
        const vizTitleLower = (viz.title || '').toLowerCase();
        
        if (viz.type === 'chart') {
          // Check for keyword matches between section and visualization
          const keywords = [
            'revenue', 'growth', 'comparison', 'benchmark', 'metric', 
            'performance', 'trend', 'forecast', 'projection', 'analysis'
          ];
          
          const keywordMatch = keywords.some(keyword => 
            sectionLower.includes(keyword) && vizTitleLower.includes(keyword)
          );
          
          if (keywordMatch || i === Math.floor(sections.length / 2)) {
            newContent += `\n\n*Visualization #${vizIndex + 1}*\n\n`;
            vizIndex++;
          }
        }
      }
      
      // Add any remaining visualizations at the end
      while (vizIndex < extractedVisualizations.length) {
        newContent += `\n\n*Visualization #${vizIndex + 1}*\n\n`;
        vizIndex++;
      }
      
      return { processedContent: newContent, extractedVisualizations };
    }
    
    // For simpler content without sections, add visualizations at the end
    let appendedContent = processedContent;
    extractedVisualizations.forEach((_, index) => {
      appendedContent += `\n\n*Visualization #${index + 1}*\n\n`;
    });
    
    return { processedContent: appendedContent, extractedVisualizations };
  }
  
  // If references already exist, just return the content as is
  return { processedContent: content, extractedVisualizations };
};
