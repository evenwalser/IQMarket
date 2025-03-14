import { ChatVisualization } from "@/types/chat";

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

/**
 * Extract metrics mentioned in the chart description
 */
function extractMetricsFromDescription(description: string): string[] {
  const metricKeywords = [
    'ARR', 'MRR', 'Growth Rate', 'Growth', 'NRR', 'Net Revenue Retention',
    'Gross Margin', 'Burn Multiple', 'CAC', 'LTV', 'Churn', 'Revenue',
    'Profit', 'Margin', 'Efficiency', 'Performance'
  ];
  
  const metrics: string[] = [];
  
  for (const metric of metricKeywords) {
    if (description.includes(metric)) {
      metrics.push(metric);
    }
  }
  
  return metrics;
}

/**
 * Generate sample data based on metrics for visualization
 */
function generateSampleDataFromMetrics(metrics: string[], title: string): Record<string, any>[] {
  const data: Record<string, any>[] = [];
  
  // For financial benchmarks, create a comparison chart
  if (title.toLowerCase().includes('benchmark') || title.toLowerCase().includes('comparison')) {
    for (const metric of metrics.slice(0, 4)) { // Limit to first 4 metrics
      data.push({
        category: metric,
        value: Math.floor(Math.random() * 30) + 70, // Your company (70-100%)
        benchmark: Math.floor(Math.random() * 20) + 80 // Industry benchmark (80-100%)
      });
    }
  } else {
    // For trend charts
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    for (let i = 0; i < months.length; i++) {
      const dataPoint: Record<string, any> = { x: months[i] };
      
      // Add values for each metric
      metrics.forEach((metric, index) => {
        // Create an upward trend with some variation
        const baseValue = 75 + i * 5; // Starting at 75, increasing by 5 each month
        const variation = Math.floor(Math.random() * 10) - 5; // Random variation between -5 and 5
        dataPoint[`metric${index + 1}`] = baseValue + variation;
      });
      
      data.push(dataPoint);
    }
  }
  
  return data;
}

/**
 * Determine the chart type based on title and description
 */
function determineChartType(title: string, description: string): 'bar' | 'line' | 'area' | 'radar' | 'composed' {
  const titleAndDesc = (title + description).toLowerCase();
  
  if (titleAndDesc.includes('bar chart') || titleAndDesc.includes('comparison')) {
    return 'bar';
  } else if (titleAndDesc.includes('line chart') || titleAndDesc.includes('trend') || titleAndDesc.includes('over time')) {
    return 'line';
  } else if (titleAndDesc.includes('area chart')) {
    return 'area';
  } else if (titleAndDesc.includes('radar') || titleAndDesc.includes('multi-dimensional')) {
    return 'radar';
  } else if (titleAndDesc.includes('combined') || titleAndDesc.includes('composite')) {
    return 'composed';
  }
  
  // Default chart type
  return 'bar';
}

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
    title = '';
  }
  
  const lowerTitle = title.toLowerCase();
  let lowerHeaders: string[] = [];
  
  if (Array.isArray(headers)) {
    lowerHeaders = headers.map(h => typeof h === 'string' ? h.toLowerCase() : '');
  } else if (typeof headers === 'string') {
    lowerHeaders = [headers.toLowerCase()];
  }
  
  // Define metric categories with their associated terms
  const metricCategories = {
    financial: ['revenue', 'cost', 'profit', 'margin', 'arr', 'mrr', 'cac', 'ltv', 'budget', 'expense', 'income', 'cash', 'price'],
    retention: ['churn', 'retention', 'customers', 'users', 'engagement', 'active', 'returning', 'loyalty', 'nrr'],
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
