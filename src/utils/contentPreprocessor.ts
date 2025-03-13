
/**
 * Preprocesses content before rendering with markdown
 * - Extracts visualization data
 * - Handles special formatting cases
 * - Cleans up citation markers
 * - Converts ASCII tables to visualization objects
 */
export const preprocessContent = (content: string): {
  processedContent: string;
  extractedVisualizations: any[];
} => {
  if (!content) {
    return { processedContent: "", extractedVisualizations: [] };
  }

  const extractedVisualizations: any[] = [];
  
  // Extract code blocks that contain visualization data
  const codeBlockRegex = /```json-viz\n([\s\S]*?)\n```/g;
  let processedContent = content.replace(codeBlockRegex, (match, jsonContent) => {
    try {
      const vizData = JSON.parse(jsonContent);
      extractedVisualizations.push(vizData);
      return `[Visualization ${extractedVisualizations.length}]`;
    } catch (e) {
      console.error('Failed to parse visualization JSON', e);
      return match; // Keep original if parsing fails
    }
  });
  
  // Handle data chart specific syntax
  const chartBlockRegex = /```chart\n([\s\S]*?)\n```/g;
  processedContent = processedContent.replace(chartBlockRegex, (match, chartContent) => {
    try {
      const chartData = JSON.parse(chartContent);
      const vizData = {
        type: 'chart',
        chartType: chartData.type || 'bar',
        data: chartData.data || [],
        xKey: chartData.xKey || 'x',
        yKeys: chartData.yKeys || ['y'],
        height: chartData.height || 300,
        title: chartData.title,
        subTitle: chartData.subTitle,
        colorScheme: chartData.colorScheme || 'purple' // Default to purple theme
      };
      extractedVisualizations.push(vizData);
      return `[Visualization ${extractedVisualizations.length}]`;
    } catch (e) {
      console.error('Failed to parse chart JSON', e);
      return match;
    }
  });
  
  // Handle data table specific syntax
  const tableBlockRegex = /```table\n([\s\S]*?)\n```/g;
  processedContent = processedContent.replace(tableBlockRegex, (match, tableContent) => {
    try {
      const tableData = JSON.parse(tableContent);
      const vizData = {
        type: 'table',
        data: tableData.data || [],
        headers: tableData.headers || Object.keys(tableData.data[0] || {}),
        title: tableData.title,
        colorScheme: tableData.colorScheme || 'purple' // Default color scheme
      };
      extractedVisualizations.push(vizData);
      return `[Visualization ${extractedVisualizations.length}]`;
    } catch (e) {
      console.error('Failed to parse table JSON', e);
      return match;
    }
  });
  
  // IMPROVED: Detect and convert markdown-style tables to visualization objects
  // This regex specifically targets the benchmark table format shown in the example
  const markdownTableRegex = /\|\s*\*\*([^*|]+)\*\*\s*\|\s*\*\*([^*|]+)\*\*\s*\|\s*\*\*([^*|]+)\*\*\s*\|\s*\*\*([^*|]+)\*\*\s*\|[\s\S]*?(?=\n\n|\n###|$)/g;
  
  processedContent = processedContent.replace(markdownTableRegex, (match) => {
    try {
      // Find the table headers (they're in **bold**)
      const headerMatch = match.match(/\|\s*\*\*([^*|]+)\*\*\s*\|\s*\*\*([^*|]+)\*\*\s*\|\s*\*\*([^*|]+)\*\*\s*\|\s*\*\*([^*|]+)\*\*\s*\|/);
      
      if (!headerMatch) return match;
      
      // Extract headers, removing any excess whitespace
      const headers = [
        headerMatch[1].trim(),
        headerMatch[2].trim(),
        headerMatch[3].trim(),
        headerMatch[4].trim()
      ];
      
      // Extract table title from the context (usually starts with ### or similar)
      const titleMatch = match.match(/###\s*([^\n]+)/);
      const tableTitle = titleMatch ? titleMatch[1].trim() : "Benchmark Analysis";
      
      // Extract all rows from the table
      const rows = match.split('\n')
        .filter(line => line.trim().startsWith('|') && !line.includes('**') && !line.includes('----'))
        .map(line => {
          const cells = line.split('|')
            .filter(cell => cell.trim().length > 0)
            .map(cell => cell.trim());
          
          if (cells.length >= 4) {
            const rowData: Record<string, any> = {};
            headers.forEach((header, index) => {
              if (index < cells.length) {
                rowData[header] = cells[index];
              }
            });
            return rowData;
          }
          return null;
        })
        .filter(row => row !== null) as Record<string, any>[];
      
      // Create table visualization
      if (rows.length > 0) {
        const tableVizData = {
          type: 'table',
          data: rows,
          headers,
          title: tableTitle,
          colorScheme: 'purple' // Use purple for benchmarks
        };
        
        extractedVisualizations.push(tableVizData);
        
        // Also create a chart for specific metrics that make sense as visualizations
        // For financial/numeric metrics
        const chartableRows = rows.filter(row => {
          // Find rows that have numeric values by checking for % or $ or numbers
          const hasNumericValue = Object.values(row).some(value => {
            if (typeof value !== 'string') return false;
            return value.includes('%') || value.includes('$') || /\d+/.test(value);
          });
          
          return hasNumericValue;
        });
        
        if (chartableRows.length > 0) {
          // Group similar metrics
          const financialMetrics = chartableRows.filter(row => 
            row[headers[0]]?.includes('ARR') || 
            row[headers[0]]?.includes('Revenue') || 
            row[headers[0]]?.includes('Margin')
          );
          
          if (financialMetrics.length > 2) {
            // Create a comparative chart for financial metrics
            const chartData = financialMetrics.map(row => ({
              metric: row[headers[0]],
              cloudSpark: cleanupMetricValue(row[headers[2]]),
              benchmark: cleanupMetricValue(row[headers[3]])
            }));
            
            const chartVizData = {
              type: 'chart',
              chartType: 'bar',
              data: chartData,
              xKey: 'metric',
              yKeys: ['cloudSpark', 'benchmark'],
              height: 350,
              title: `${tableTitle} - Financial Metrics`,
              colorScheme: 'green'
            };
            
            extractedVisualizations.push(chartVizData);
          }
          
          // Add similar groups for retention, sales, etc.
          const retentionMetrics = chartableRows.filter(row => 
            row[headers[0]]?.includes('Retention') || 
            row[headers[0]]?.includes('Churn')
          );
          
          if (retentionMetrics.length > 1) {
            const chartData = retentionMetrics.map(row => ({
              metric: row[headers[0]],
              cloudSpark: cleanupMetricValue(row[headers[2]]),
              benchmark: cleanupMetricValue(row[headers[3]])
            }));
            
            const chartVizData = {
              type: 'chart',
              chartType: 'bar',
              data: chartData,
              xKey: 'metric',
              yKeys: ['cloudSpark', 'benchmark'],
              height: 300,
              title: `${tableTitle} - Retention Metrics`,
              colorScheme: 'blue'
            };
            
            extractedVisualizations.push(chartVizData);
          }
        }
        
        // Replace the original table with a reference to the visualizations
        return `[Visualization ${extractedVisualizations.length - (retentionMetrics?.length > 1 ? 2 : (financialMetrics?.length > 2 ? 1 : 0))}]`;
      }
    } catch (e) {
      console.error('Failed to parse markdown table:', e);
    }
    
    return match; // Keep original if parsing fails
  });
  
  // NEW: Also detect basic markdown tables with | separators
  const basicMarkdownTableRegex = /\|\s*([^\n|]+)\s*\|\s*([^\n|]+)(?:\s*\|(?:\s*[^\n|]+\s*\|)*)\n\|\s*[-:]+\s*\|\s*[-:]+(?:\s*\|(?:\s*[-:]+\s*\|)*)\n((?:\|[^\n]+\n)+)/g;
  
  processedContent = processedContent.replace(basicMarkdownTableRegex, (match, firstHeader, secondHeader) => {
    try {
      // Get header line
      const headerLine = match.split('\n')[0];
      
      // Extract all headers
      const headers = headerLine.split('|')
        .filter(cell => cell.trim().length > 0)
        .map(cell => cell.trim());
      
      // Extract title from context (preceding the table)
      const contextBefore = processedContent.substring(0, processedContent.indexOf(match));
      const titleMatch = contextBefore.match(/(?:#{1,3})\s*([^\n]+)$/);
      const tableTitle = titleMatch ? titleMatch[1].trim() : "Data Table";
      
      // Skip separator row and extract data rows
      const dataLines = match.split('\n').slice(2);
      
      const rows = dataLines
        .filter(line => line.trim().startsWith('|'))
        .map(line => {
          const cells = line.split('|')
            .filter(cell => cell.trim().length > 0)
            .map(cell => cell.trim());
          
          if (cells.length > 0) {
            const rowData: Record<string, any> = {};
            headers.forEach((header, index) => {
              if (index < cells.length) {
                // Try to convert numeric values
                let value = cells[index];
                
                // Clean up the value and try to convert to number if appropriate
                if (/^\s*\d+(?:\.\d+)?%?\s*$/.test(value)) {
                  value = value.replace('%', '');
                  const numValue = parseFloat(value);
                  rowData[header] = isNaN(numValue) ? cells[index] : numValue;
                } else if (/^\s*\$\d+(?:\.\d+)?[KMB]?\s*$/.test(value)) {
                  // Handle currency with K, M, B suffixes
                  value = value.replace('$', '');
                  let multiplier = 1;
                  if (value.endsWith('K')) {
                    multiplier = 1000;
                    value = value.replace('K', '');
                  } else if (value.endsWith('M')) {
                    multiplier = 1000000;
                    value = value.replace('M', '');
                  } else if (value.endsWith('B')) {
                    multiplier = 1000000000;
                    value = value.replace('B', '');
                  }
                  
                  const numValue = parseFloat(value) * multiplier;
                  rowData[header] = isNaN(numValue) ? cells[index] : numValue;
                } else {
                  rowData[header] = cells[index];
                }
              }
            });
            return rowData;
          }
          return null;
        })
        .filter(row => row !== null) as Record<string, any>[];
      
      if (rows.length > 0) {
        // Create table visualization
        const tableVizData = {
          type: 'table',
          data: rows,
          headers,
          title: tableTitle,
          colorScheme: detectTableType(tableTitle)
        };
        
        extractedVisualizations.push(tableVizData);
        
        // Determine if we should create a chart
        const hasNumericColumns = headers.some(header => {
          return rows.some(row => typeof row[header] === 'number');
        });
        
        if (hasNumericColumns) {
          // Find numeric columns for charting
          const numericColumns = headers.filter(header => {
            return rows.some(row => typeof row[header] === 'number');
          });
          
          // First column is usually the category/label
          const categoryColumn = headers[0];
          const valueColumns = numericColumns.filter(col => col !== categoryColumn);
          
          if (valueColumns.length > 0) {
            const chartVizData = {
              type: 'chart',
              chartType: 'bar',  // Default to bar chart
              data: rows,
              xKey: categoryColumn,
              yKeys: valueColumns,
              height: 350,
              title: `${tableTitle} - Chart`,
              colorScheme: detectTableType(tableTitle)
            };
            
            extractedVisualizations.push(chartVizData);
          }
        }
        
        return `[Visualization ${extractedVisualizations.length - (hasNumericColumns ? 2 : 1)}]${hasNumericColumns ? '\n\n[Visualization ${extractedVisualizations.length}]' : ''}`;
      }
    } catch (e) {
      console.error('Failed to parse basic markdown table:', e);
    }
    
    return match; // Keep original if parsing fails
  });
  
  // Handle ASCII tables (often present in the AI response for benchmarks)
  const asciiTableRegex = /\+[-+]+\+\n\|(.*?)\|\n\+[-+]+\+\n((?:\|.*?\|\n)+)\+[-+]+\+/g;
  
  processedContent = processedContent.replace(asciiTableRegex, (match) => {
    try {
      const lines = match.split('\n');
      const headerLine = lines[1];
      
      // Extract headers
      const headers = headerLine.split('|')
        .filter(cell => cell.trim().length > 0)
        .map(cell => cell.trim());
      
      // Extract rows
      const rows = [];
      for (let i = 3; i < lines.length - 1; i++) {
        if (lines[i].startsWith('|')) {
          const cells = lines[i].split('|')
            .filter(cell => cell.trim().length > 0)
            .map(cell => cell.trim());
          
          if (cells.length > 0) {
            const rowData: Record<string, any> = {};
            headers.forEach((header, index) => {
              if (index < cells.length) {
                rowData[header] = cells[index];
              }
            });
            rows.push(rowData);
          }
        }
      }
      
      // Try to find a title for the table
      const contextBefore = processedContent.substring(0, processedContent.indexOf(match));
      const titleMatch = contextBefore.match(/(?:#{1,3})\s*([^\n]+)$/);
      const tableTitle = titleMatch ? titleMatch[1].trim() : "Benchmark Data";
      
      if (rows.length > 0) {
        const tableVizData = {
          type: 'table',
          data: rows,
          headers,
          title: tableTitle,
          colorScheme: 'purple'
        };
        
        extractedVisualizations.push(tableVizData);
        return `[Visualization ${extractedVisualizations.length}]`;
      }
    } catch (e) {
      console.error('Failed to parse ASCII table:', e);
    }
    
    return match; // Keep original if parsing fails
  });
  
  // Clean up citation markers with a more markdown-friendly format
  // The format is 【n:m†source】 where n and m are numbers
  processedContent = processedContent.replace(
    /【(\d+):(\d+)†([^】]+)】/g, 
    '<sup class="citation">[<a href="#citation-$1-$2" title="Source: $3" class="citation-link">$1.$2</a>]</sup>'
  );
  
  // Handle mermaid diagrams
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
  processedContent = processedContent.replace(mermaidRegex, (match, diagramContent) => {
    const diagramId = `mermaid-${Math.random().toString(36).substring(2, 10)}`;
    return `<div class="mermaid-diagram" data-diagram-id="${diagramId}" data-diagram-content="${encodeURIComponent(diagramContent)}"></div>`;
  });
  
  // Handle math equations (basic support)
  processedContent = processedContent.replace(
    /\$\$([\s\S]*?)\$\$/g,
    '<div class="math-block">$1</div>'
  );
  
  processedContent = processedContent.replace(
    /\$([\s\S]*?)\$/g,
    '<span class="math-inline">$1</span>'
  );
  
  // Improve formatting of bold/italic text in user messages
  // This ensures bold text with ** is properly formatted even if not using markdown
  processedContent = processedContent.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong>$1</strong>'
  );
  
  processedContent = processedContent.replace(
    /\*([^*]+)\*/g,
    '<em>$1</em>'
  );
  
  return { processedContent, extractedVisualizations };
};

// Helper function to detect table type and assign appropriate color scheme
function detectTableType(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('benchmark') || titleLower.includes('performance')) {
    return 'purple';  // Purple for benchmarks
  } else if (titleLower.includes('revenue') || titleLower.includes('financial')) {
    return 'green';   // Green for financial data
  } else if (titleLower.includes('customer') || titleLower.includes('user')) {
    return 'blue';    // Blue for customer/user data
  } else if (titleLower.includes('risk') || titleLower.includes('issue')) {
    return 'red';     // Red for risks/issues
  }
  
  return 'default';   // Default color scheme
}

// Helper function to convert string values with % or $ to numbers
function cleanupMetricValue(value: string): number {
  if (!value || typeof value !== 'string') return 0;
  
  // Remove any non-numeric characters except decimal points
  let numericValue = value.replace(/[^0-9.]/g, '');
  
  // Convert to number
  return parseFloat(numericValue) || 0;
}
