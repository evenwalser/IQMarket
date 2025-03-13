
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
  
  // Clean up citation markers with a more markdown-friendly format
  // The format is 【n:m†source】 where n and m are numbers
  processedContent = processedContent.replace(
    /【(\d+):(\d+)†source】/g, 
    '<sup class="citation">[<a href="#citation-$1-$2" title="Source Reference $1.$2" class="citation-link">$1.$2</a>]</sup>'
  );
  
  return { processedContent, extractedVisualizations };
};
