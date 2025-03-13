
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
  processedContent = processedContent.replace(
    /【(\d+):(\d+)†source】/g, 
    '[Source $1.$2]'
  );
  
  // Handle any other special formatting needs
  
  return { processedContent, extractedVisualizations };
};
