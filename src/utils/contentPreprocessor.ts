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
  
  // NEW: Detect and convert ASCII tables to visualization objects
  // Look for patterns like:
  // | Header1 | Header2 | Header3 |
  // |---------|---------|---------|
  // | Value1  | Value2  | Value3  |
  const asciiTableRegex = /\|\s*([^\n|]+)\s*\|\s*([^\n|]+)\s*\|\s*([^\n|]+)(?:\s*\|)+\s*\n\|\s*[-]+\s*\|\s*[-]+\s*\|\s*[-]+(?:\s*\|)+\s*\n((?:\|\s*[^\n|]+\s*\|\s*[^\n|]+\s*\|\s*[^\n|]+(?:\s*\|)+\s*\n)+)/g;
  
  processedContent = processedContent.replace(asciiTableRegex, (match, header1, header2, header3, rows) => {
    try {
      // Extract headers
      const headers = [header1.trim(), header2.trim(), header3.trim()];
      
      // Process remaining headers if they exist
      const headerLine = match.split('\n')[0];
      const headerMatches = headerLine.match(/\|\s*([^\n|]+)\s*\|/g);
      if (headerMatches && headerMatches.length > 3) {
        for (let i = 3; i < headerMatches.length; i++) {
          const header = headerMatches[i].replace(/\|/g, '').trim();
          if (header) headers.push(header);
        }
      }
      
      // Extract rows
      const tableRows = rows.trim().split('\n');
      const data = tableRows.map(row => {
        const columns = row.split('|').filter(col => col.trim().length > 0);
        const rowData: Record<string, any> = {};
        
        columns.forEach((col, index) => {
          if (index < headers.length) {
            const value = col.trim();
            // Try to convert numerical values
            const numValue = Number(value.replace(/[$%]/g, ''));
            rowData[headers[index]] = isNaN(numValue) ? value : numValue;
          }
        });
        
        return rowData;
      });
      
      // Extract title from surrounding context
      const surroundingText = content.substring(Math.max(0, content.indexOf(match) - 200), content.indexOf(match));
      const titleMatch = surroundingText.match(/#{1,6}\s*([^\n]+)$/);
      const title = titleMatch ? titleMatch[1].trim() : "Extracted Table";
      
      // Create visualization data
      const vizData = {
        type: 'table',
        data,
        headers,
        title,
        colorScheme: detectTableType(title) // Select color scheme based on title content
      };
      
      extractedVisualizations.push(vizData);
      return `[Visualization ${extractedVisualizations.length}]`;
    } catch (e) {
      console.error('Failed to parse ASCII table:', e);
      return match; // Keep original if parsing fails
    }
  });
  
  // NEW: Detect and convert SaaS benchmark tables (specific format in the example)
  const benchmarkTableRegex = /#{1,6}\s+([^\n]+)\s*\n+\|\s*Metric\s*\|(?:[^\n]+)\n\|[-\s|]+\n((?:\|[^\n]+\n)+)/g;
  
  processedContent = processedContent.replace(benchmarkTableRegex, (match, tableTitle, tableRows) => {
    try {
      // Extract headers from the first row
      const headerLine = match.split('\n')[1]; // Get the header line
      const headerMatches = headerLine.match(/\|\s*([^|]+)\s*\|/g);
      const headers = headerMatches 
        ? headerMatches.map(h => h.replace(/\|/g, '').trim()).filter(h => h.length > 0) 
        : ["Metric", "Value"];
      
      // Extract rows
      const rows = tableRows.trim().split('\n');
      const data = rows.map(row => {
        const columns = row.split('|').filter(col => col.trim().length > 0);
        const rowData: Record<string, any> = {};
        
        columns.forEach((col, index) => {
          if (index < headers.length) {
            let value = col.trim();
            // Handle bolded text
            value = value.replace(/\*\*([^*]+)\*\*/g, '$1');
            // Try to convert numerical values
            if (index > 0) { // Don't convert first column (metric names)
              // Extract numbers from complex strings like "~$10M" to 10000000
              const numericMatch = value.match(/([$~<>])*\s*(\d+)([KMB])?(\+)?(\%)?/);
              if (numericMatch) {
                const [, prefix, number, magnitude, plus, percent] = numericMatch;
                let numValue = Number(number);
                if (magnitude === 'K') numValue *= 1000;
                if (magnitude === 'M') numValue *= 1000000;
                if (magnitude === 'B') numValue *= 1000000000;
                value = numValue;
              }
            }
            rowData[headers[index]] = value;
          }
        });
        
        return rowData;
      });
      
      // Create two visualizations: table and chart
      // First the table
      const tableVizData = {
        type: 'table',
        data,
        headers,
        title: tableTitle,
        colorScheme: 'purple'  // Purple theme for SaaS benchmarks
      };
      
      extractedVisualizations.push(tableVizData);
      
      // Then create a bar chart for numerical metrics
      // Identify numeric columns for charting
      const chartableData = data.filter(row => {
        // Keep rows where at least one column (not the first) is numeric
        return Object.entries(row).some(([key, value], index) => index > 0 && typeof value === 'number');
      });
      
      if (chartableData.length > 0) {
        const chartVizData = {
          type: 'chart',
          chartType: 'bar',
          data: chartableData,
          xKey: headers[0],
          yKeys: headers.slice(1).filter(header => 
            chartableData.some(row => typeof row[header] === 'number')
          ),
          height: 350,
          title: `${tableTitle} Visualization`,
          subTitle: 'Comparison across categories',
          colorScheme: 'purple'
        };
        
        extractedVisualizations.push(chartVizData);
      }
      
      return `[Visualization ${extractedVisualizations.length-1}]\n\n[Visualization ${extractedVisualizations.length}]`;
    } catch (e) {
      console.error('Failed to parse benchmark table:', e);
      return match; // Keep original if parsing fails
    }
  });
  
  // Clean up citation markers with a more markdown-friendly format
  // The format is 【n:m†source】 where n and m are numbers
  // Converting to HTML directly since markdown doesn't have great citation support
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
  
  // NEW: Improve formatting of bold/italic text in user messages
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
