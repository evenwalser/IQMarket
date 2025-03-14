
/**
 * Determine the chart type based on title and description
 */
export function determineChartType(title: string, description: string): 'bar' | 'line' | 'area' | 'radar' | 'composed' {
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
export const determineColorScheme = (title: string | undefined, headers: string[] | string): 'default' | 'financial' | 'retention' | 'performance' | 'operational' => {
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
