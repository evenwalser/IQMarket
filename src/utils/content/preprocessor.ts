
import { ChatVisualization } from "@/types/chat";
import { ProcessedContentResult } from "./types";
import { 
  cleanMarkdownContent, 
  formatMarkdownLinks, 
  enhanceMarkdownTables 
} from "../markdownUtils";
import { 
  extractJsonVisualizations,
  extractChartDescriptionsFromHeaders,
  extractDirectVisualizations
} from "./visualization";
import { extractMarkdownTables, extractAsciiTables } from "./tableExtractor";

/**
 * Processes the content of a message to extract visualizations and format the content.
 */
export const preprocessContent = (content: string, visualizations?: ChatVisualization[]): ProcessedContentResult => {
  if (!content) {
    return {
      processedContent: '',
      extractedVisualizations: []
    };
  }

  console.log("Processing content with visualizations:", visualizations?.length || 0);

  // Apply comprehensive markdown cleaning
  let processedContent = cleanMarkdownContent(content);
  
  // Enhance markdown tables in the content
  processedContent = enhanceMarkdownTables(processedContent);
  
  // Format markdown links consistently
  processedContent = formatMarkdownLinks(processedContent);

  // Extract JSON visualizations
  const jsonResult = extractJsonVisualizations(processedContent);
  processedContent = jsonResult.processedContent;
  let extractedVisualizations: ChatVisualization[] = jsonResult.extractedVisualizations;

  // Extract chart descriptions from markdown headers
  const chartHeaderResult = extractChartDescriptionsFromHeaders(processedContent);
  processedContent = chartHeaderResult.processedContent;
  extractedVisualizations = [...extractedVisualizations, ...chartHeaderResult.extractedVisualizations];

  // Extract Markdown tables
  const tableResult = extractMarkdownTables(processedContent);
  processedContent = tableResult.processedContent;
  extractedVisualizations = [...extractedVisualizations, ...tableResult.extractedVisualizations];

  // Extract ASCII tables (fallback)
  const asciiResult = extractAsciiTables(processedContent);
  processedContent = asciiResult.processedContent;
  extractedVisualizations = [...extractedVisualizations, ...asciiResult.extractedVisualizations];
  
  // Process direct visualizations from the API
  if (visualizations && visualizations.length > 0) {
    console.log("Processing direct visualizations:", visualizations.length);
    const directVisualizationsResult = extractDirectVisualizations(processedContent, visualizations);
    processedContent = directVisualizationsResult.processedContent;
    
    // Add direct visualizations only if they don't already exist by ID
    directVisualizationsResult.extractedVisualizations.forEach(directViz => {
      if (!extractedVisualizations.some(existingViz => existingViz.id === directViz.id)) {
        extractedVisualizations.push(directViz);
      }
    });
  }

  console.log("Final processed content with", extractedVisualizations.length, "visualizations");
  
  return {
    processedContent,
    extractedVisualizations,
  };
};
