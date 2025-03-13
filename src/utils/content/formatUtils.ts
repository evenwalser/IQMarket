
/**
 * Utility functions for content formatting 
 * This is a simplified version as the main functionality is now in markdownUtils.ts
 */

import { 
  removeCitationReferences as cleanCitations,
  fixHeadings
} from "../markdownUtils";

/**
 * Cleans up citation references [XX:XX*source]
 */
export const cleanCitationReferences = (content: string): string => {
  return cleanCitations(content);
};

/**
 * Fixes markdown headings that aren't properly formatted
 * Delegating to the enhanced markdownUtils implementation
 */
export const fixMarkdownHeadings = (content: string): string => {
  return fixHeadings(content);
};
