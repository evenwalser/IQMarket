
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

  // Extract JSON visualizations (includes orgCharts and flowCharts)
  const jsonResult = extractJsonVisualizations(processedContent);
  processedContent = jsonResult.processedContent;
  let extractedVisualizations: ChatVisualization[] = jsonResult.extractedVisualizations;

  // Extract Markdown tables
  const tableResult = extractMarkdownTables(processedContent);
  processedContent = tableResult.processedContent;
  extractedVisualizations = [...extractedVisualizations, ...tableResult.extractedVisualizations];

  // Extract ASCII tables and convert them to proper visualizations
  const asciiResult = extractAsciiTables(processedContent);
  processedContent = asciiResult.processedContent;
  extractedVisualizations = [...extractedVisualizations, ...asciiResult.extractedVisualizations];
  
  // Look for ASCII org charts and convert them to proper org chart visualizations
  const processedWithOrgCharts = convertAsciiOrgCharts(processedContent, extractedVisualizations);
  processedContent = processedWithOrgCharts.processedContent;
  extractedVisualizations = processedWithOrgCharts.extractedVisualizations;
  
  return {
    processedContent,
    extractedVisualizations,
  };
};

/**
 * Identifies and converts ASCII org charts to proper org chart visualizations
 */
const convertAsciiOrgCharts = (
  content: string, 
  existingVisualizations: ChatVisualization[]
): { processedContent: string; extractedVisualizations: ChatVisualization[] } => {
  // Look for ASCII-style org charts with vertical lines and dashes
  const orgChartRegex = /([\w\s]+(?:Manager|Director|Lead|Chief|Officer|Head|Specialist))\s*\n\s*\|\s*\n\s*[\*\-_=]+\s*\n([\s\S]*?)(?:\n\n|\n$|$)/g;
  
  let match;
  let processedContent = content;
  const extractedVisualizations = [...existingVisualizations];
  
  // Try to find ASCII org charts in the text
  while ((match = orgChartRegex.exec(content)) !== null) {
    const title = match[1].trim().replace(/undefined/g, '');
    const chartBody = match[0];
    
    // Extract nodes and relationships from the ASCII chart
    const nodes = extractNodesFromAsciiChart(chartBody);
    
    if (nodes.length > 0) {
      const vizId = crypto.randomUUID();
      extractedVisualizations.push({
        id: vizId,
        type: 'orgChart',
        title: title.includes('Chart') ? title : `${title} Organizational Chart`,
        nodes: nodes,
        data: []
      });
      
      // Replace the ASCII chart with a placeholder
      processedContent = processedContent.replace(chartBody, `\n\n*Organizational Chart Visualization*\n\n`);
    }
  }
  
  return { processedContent, extractedVisualizations };
};

/**
 * Extracts nodes and their relationships from an ASCII org chart
 */
const extractNodesFromAsciiChart = (asciiChart: string): Array<{id: string; label: string; role?: string; parentId?: string | null;}> => {
  const lines = asciiChart.split('\n');
  const nodes: Array<{id: string; label: string; role?: string; parentId?: string | null;}> = [];
  const roleMap = new Map<string, string>();
  
  // First pass - identify all role names
  let currentId = 1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip lines with just pipes or dashes
    if (line === '|' || line.match(/^[\-_=*]+$/)) continue;
    
    // Look for role names (words not just consisting of pipes or spaces)
    if (line.match(/[A-Za-z]/) && !line.match(/^\|+$/)) {
      const roleName = line.replace(/undefined/g, '').trim();
      if (roleName) {
        const id = `node_${currentId++}`;
        roleMap.set(roleName, id);
        nodes.push({
          id,
          label: roleName,
          role: roleName,
          parentId: null
        });
      }
    }
  }
  
  // Build relationship hierarchy - typically the first role is the top manager
  if (nodes.length > 0) {
    // Assume the first role is the top manager
    const topManager = nodes[0];
    topManager.parentId = null;
    
    // Basic structure: any role 1-2 lines after a pipe character below another role is likely a direct report
    for (let i = 1; i < nodes.length; i++) {
      // For simplicity in ASCII charts, we'll set roles at lower positions as reports to higher positions
      // In a real implementation, you would parse the ASCII structure more carefully
      if (i < 4) {
        // First few roles typically report to the top manager
        nodes[i].parentId = topManager.id;
      } else {
        // Later roles are distributed among middle managers
        const targetIndex = Math.floor((i - 1) / 3) + 1;
        if (targetIndex < nodes.length) {
          nodes[i].parentId = nodes[targetIndex].id;
        } else {
          nodes[i].parentId = topManager.id;
        }
      }
    }
  }
  
  return nodes;
};
