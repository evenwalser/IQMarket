
/**
 * Extract metrics mentioned in the chart description
 */
export function extractMetricsFromDescription(description: string): string[] {
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
export function generateSampleDataFromMetrics(metrics: string[], title: string): Record<string, any>[] {
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
