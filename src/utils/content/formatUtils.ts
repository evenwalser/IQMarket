
/**
 * Utility functions for content formatting
 */

/**
 * Cleans up citation references [XX:XX*source]
 */
export const cleanCitationReferences = (content: string): string => {
  return content.replace(/\[\d+:\d+\*source\]/g, '');
};

/**
 * Fixes markdown headings that aren't properly formatted
 */
export const fixMarkdownHeadings = (content: string): string => {
  let processedContent = content;
  
  // Replace ### Heading with ## Heading (proper markdown)
  processedContent = processedContent.replace(/###\s+([^\n]+)/g, '## $1');
  
  // Replace ## Heading with ## Heading (proper markdown)
  processedContent = processedContent.replace(/##\s+([^\n]+)/g, '## $1');
  
  // Replace # Heading with # Heading (proper markdown)
  processedContent = processedContent.replace(/#\s+([^\n]+)/g, '# $1');
  
  return processedContent;
};
