
import { ChatVisualization } from "@/types/chat";
import { ProcessedContentResult } from "./types";
import { cleanCitationReferences, fixMarkdownHeadings } from "./formatUtils";
import { extractJsonVisualizations } from "./visualizationExtractor";
import { extractMarkdownTables, extractAsciiTables } from "./tableExtractor";

/**
 * Processes the content of a message to extract visualizations and format the content.
 */
export const preprocessContent = (content: string): ProcessedContentResult => {
  if (!content) {
    return {
      processedContent: '',
      extractedVisualizations: []
    };
  }

  // Clean up citation references [XX:XX*source]
  let processedContent = cleanCitationReferences(content);
  
  // Fix markdown headings that aren't properly formatted
  processedContent = fixMarkdownHeadings(processedContent);

  // Extract JSON visualizations
  const jsonResult = extractJsonVisualizations(processedContent);
  processedContent = jsonResult.processedContent;
  let extractedVisualizations: ChatVisualization[] = jsonResult.extractedVisualizations;

  // Extract Markdown tables
  const tableResult = extractMarkdownTables(processedContent);
  processedContent = tableResult.processedContent;
  extractedVisualizations = [...extractedVisualizations, ...tableResult.extractedVisualizations];

  // Extract ASCII tables (fallback)
  const asciiResult = extractAsciiTables(processedContent);
  processedContent = asciiResult.processedContent;
  extractedVisualizations = [...extractedVisualizations, ...asciiResult.extractedVisualizations];
  
  return {
    processedContent,
    extractedVisualizations,
  };
};
