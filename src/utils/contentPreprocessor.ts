
/**
 * Preprocesses content before rendering with markdown
 * - Extracts visualization data
 * - Handles special formatting cases
 * - Cleans up citation markers
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
        subTitle: chartData.subTitle
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
        title: tableData.title
      };
      extractedVisualizations.push(vizData);
      return `[Visualization ${extractedVisualizations.length}]`;
    } catch (e) {
      console.error('Failed to parse table JSON', e);
      return match;
    }
  });
  
  // Clean up citation markers with a more markdown-friendly format
  // The format is 【n:m†source】 where n and m are numbers
  processedContent = processedContent.replace(
    /【(\d+):(\d+)†([\w\s]+)】/g, 
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
  
  return { processedContent, extractedVisualizations };
};
