/**
 * Determine the chart type based on title and description
 */
export function determineChartType(title: string, description: string): 'bar' | 'line' | 'area' | 'radar' | 'composed' {
  const titleAndDesc = (title + ' ' + description).toLowerCase();
  
  // Financial-specific chart type determination
  if (titleAndDesc.includes('growth rate') || 
      titleAndDesc.includes('trend') || 
      titleAndDesc.includes('over time') || 
      titleAndDesc.includes('trajectory') ||
      titleAndDesc.includes('historical') ||
      titleAndDesc.includes('forecast') ||
      titleAndDesc.includes('projection')) {
    return 'line';
  } else if (titleAndDesc.includes('distribution') || 
             titleAndDesc.includes('breakdown') || 
             titleAndDesc.includes('composition') ||
             titleAndDesc.includes('allocation') ||
             titleAndDesc.includes('comparison') ||
             titleAndDesc.includes('benchmark') ||
             titleAndDesc.includes('versus') ||
             titleAndDesc.includes('vs')) {
    return 'bar';
  } else if (titleAndDesc.includes('cumulative') || 
             titleAndDesc.includes('total growth') ||
             titleAndDesc.includes('market share')) {
    return 'area';
  } else if (titleAndDesc.includes('performance metrics') ||
             titleAndDesc.includes('kpi') ||
             titleAndDesc.includes('balanced scorecard') ||
             titleAndDesc.includes('peer comparison') ||
             titleAndDesc.includes('competitive analysis') ||
             titleAndDesc.includes('market position')) {
    return 'radar';
  } else if (titleAndDesc.includes('combined') || 
             titleAndDesc.includes('composite') ||
             titleAndDesc.includes('mixed metrics') ||
             (titleAndDesc.includes('current') && titleAndDesc.includes('target'))) {
    return 'composed';
  } else if (titleAndDesc.includes('percentile') ||
             titleAndDesc.includes('quartile') ||
             titleAndDesc.includes('ranking') ||
             titleAndDesc.includes('industry position')) {
    return 'bar';  // Enhanced for benchmark positioning
  }
  
  // Default chart type based on general terms
  if (titleAndDesc.includes('bar chart') || titleAndDesc.includes('comparison')) {
    return 'bar';
  } else if (titleAndDesc.includes('line chart') || titleAndDesc.includes('trend')) {
    return 'line';
  } else if (titleAndDesc.includes('area chart')) {
    return 'area';
  } else if (titleAndDesc.includes('radar') || titleAndDesc.includes('multi-dimensional')) {
    return 'radar';
  } else if (titleAndDesc.includes('combined') || titleAndDesc.includes('composite')) {
    return 'composed';
  }
  
  // Check if data has time-related terms
  if (titleAndDesc.includes('year') || 
      titleAndDesc.includes('month') || 
      titleAndDesc.includes('quarter') || 
      titleAndDesc.includes('annual') || 
      titleAndDesc.includes('2023') || 
      titleAndDesc.includes('2024')) {
    return 'line';
  }
  
  // Default chart type for financial data
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
      return value && !isNaN(Number(value.toString().replace(/[$,%]/g, '')));
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
  
  const lowerTitle = typeof title === 'string' ? title.toLowerCase() : '';
  let lowerHeaders: string[] = [];
  
  if (Array.isArray(headers)) {
    lowerHeaders = headers.map(h => typeof h === 'string' ? h.toLowerCase() : '');
  } else if (typeof headers === 'string') {
    lowerHeaders = [headers.toLowerCase()];
  }
  
  // Financial-specific indicators
  const financialKeywords = ['revenue', 'cost', 'profit', 'margin', 'arr', 'mrr', 'cac', 'ltv', 'budget', 
    'expense', 'income', 'cash', 'price', 'ebitda', 'gross', 'net', 'roi', 'roas', 'payback', 
    'burn', 'runway', 'capital', 'funding', 'valuation', 'multiple', 'saas', 'arpu', 'benchmark',
    'comparison', 'target', 'forecast'];
  
  if (financialKeywords.some(term => lowerTitle.includes(term)) || 
      lowerHeaders.some(header => financialKeywords.some(term => header.includes(term)))) {
    return 'financial';
  }
  
  // Define metric categories with their associated terms
  const metricCategories = {
    retention: ['churn', 'retention', 'customers', 'users', 'engagement', 'active', 'returning', 'loyalty', 'nrr', 'nps', 'csat', 'cohort', 'renewal'],
    performance: ['growth', 'conversion', 'sales', 'traffic', 'leads', 'acquisition', 'performance', 'kpi', 'benchmark', 'target', 'goal', 'forecast'],
    operational: ['time', 'speed', 'efficiency', 'productivity', 'capacity', 'utilization', 'headcount', 'staff', 'team', 'process', 'operations'],
  };
  
  // Check title and headers against categories
  for (const [category, terms] of Object.entries(metricCategories)) {
    if (terms.some(term => lowerTitle.includes(term)) || 
        lowerHeaders.some(header => terms.some(term => header.includes(term)))) {
      return category as 'financial' | 'retention' | 'performance' | 'operational';
    }
  }
  
  // Default to financial for benchmarking assistant
  return 'financial';
};

/**
 * Process and normalize data for chart visualization
 */
export const normalizeChartData = (data: Record<string, any>[]): Record<string, any>[] => {
  if (!data || data.length === 0) return [];
  
  return data.map(item => {
    const result: Record<string, any> = {};
    
    // Process each key in the item
    Object.entries(item).forEach(([key, value]) => {
      // Skip null or undefined values
      if (value === null || value === undefined) {
        result[key] = 0;
        return;
      }
      
      // Process string values that might contain numbers
      if (typeof value === 'string') {
        // Remove currency symbols, commas, etc. and try to convert to number
        if (value.match(/^[+-]?[$£€¥]?[\d,.]+[%]?$/)) {
          // Remove currency symbols and commas
          let cleanValue = value.replace(/[$£€¥,]/g, '');
          
          // Handle percentage values
          if (value.includes('%')) {
            cleanValue = cleanValue.replace(/%$/, '');
            result[key] = parseFloat(cleanValue);
          } else {
            result[key] = parseFloat(cleanValue);
          }
        } else {
          // Keep non-numeric strings as is
          result[key] = value;
        }
      } else {
        // Keep numbers and other types as is
        result[key] = value;
      }
    });
    
    return result;
  });
};
