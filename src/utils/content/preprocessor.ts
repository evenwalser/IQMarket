
import { ChatVisualization } from "@/types/chat";
import { ProcessedContentResult } from "./types";
import { 
  cleanMarkdownContent, 
  formatMarkdownLinks, 
  enhanceMarkdownTables,
  fixMultipleBulletsInLists 
} from "../markdownUtils";
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

  // Apply comprehensive markdown cleaning
  let processedContent = cleanMarkdownContent(content);
  
  // Enhance markdown tables in the content
  processedContent = enhanceMarkdownTables(processedContent);
  
  // Format markdown links consistently
  processedContent = formatMarkdownLinks(processedContent);
  
  // Fix multiple bullets issue
  processedContent = fixMultipleBulletsInLists(processedContent);

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
