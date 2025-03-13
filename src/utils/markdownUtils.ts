
/**
 * Utility functions for markdown processing
 */

/**
 * Cleans markdown content to fix common formatting issues
 */
export const cleanMarkdownContent = (content: string): string => {
  // Replace incorrectly formatted headings (e.g., "### Title" without a space or newline)
  let cleanedContent = content.replace(/^(#{1,6})(?!\s)(.*?)$/gm, '$1 $2');
  
  // Remove citation references like [16:8*source]
  cleanedContent = cleanedContent.replace(/\[\d+:\d+\*source\]/g, '');
  
  // Fix lists that don't have proper spacing
  cleanedContent = cleanedContent.replace(/^(\d+\.|[*-])(?!\s)(.*?)$/gm, '$1 $2');
  
  return cleanedContent;
};
