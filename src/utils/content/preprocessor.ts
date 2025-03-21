import { ChatVisualization } from "@/types/chat";
import { ProcessedContentResult } from "./types";
import { 
  cleanMarkdownContent, 
  formatMarkdownLinks, 
  enhanceMarkdownTables,
  fixMultipleBulletsInLists,
  fixBrokenHeadings
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
  
  // Fix broken headings
  processedContent = fixBrokenHeadings(processedContent);

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
  
  // Log the visualizations after all processing
  console.log("Extracted visualizations:", extractedVisualizations.map(v => ({type: v.type, id: v.id})));
  
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
  const orgChartRegex = /([\w\s]+(?:Manager|Director|Lead|Chief|Officer|Head|Specialist|CEO|CTO|CMO|COO|CFO))\s*\n\s*(?:\|\s*\n|\+[-\s]+\+\s*\n|\*[-\s]+\*\s*\n|\|[-\s]*\|\s*\n|[-_=]+\s*\n)([\s\S]*?)(?:\n\n|\n$|$)/g;
  
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
      
      // Create a proper org chart visualization
      const orgChart: ChatVisualization = {
        id: vizId,
        type: 'orgChart',
        title: title.includes('Chart') ? title : `${title} Organizational Chart`,
        nodes: nodes,
        data: [],
        // Set entities explicitly with the correct structure for OrgChart component
        entities: nodes.map(node => ({
          id: node.id,
          name: node.label, // Keep the original 'label' as 'name' for OrgChart
          role: node.role || node.label,
          parentId: node.parentId
        }))
      };
      
      console.log("Created org chart visualization from ASCII:", {
        id: vizId,
        title: orgChart.title,
        nodesCount: nodes.length
      });
      
      extractedVisualizations.push(orgChart);
      
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
  
  // First pass - identify all role names
  let currentId = 1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip lines with just pipes or dashes
    if (line === '|' || line.match(/^[\-_=*+]+$/) || line.match(/^\|+$/) || line.match(/^\+[-\s]+\+$/)) {
      continue;
    }
    
    // Look for role names (words not just consisting of pipes or spaces)
    if (line.match(/[A-Za-z]/) && !line.match(/^\|+$/)) {
      const roleName = line.replace(/undefined/g, '').trim();
      if (roleName) {
        const id = `node_${currentId++}`;
        nodes.push({
          id,
          label: roleName,
          role: roleName,
          parentId: null
        });
      }
    }
  }
  
  // Build hierarchy by looking for indentation and connecting characters
  if (nodes.length > 0) {
    // Assume the first role is the top manager
    const topManager = nodes[0];
    topManager.parentId = null;
    
    // Simple tree structure - connect nodes based on their position in the list
    // For a more sophisticated approach, we would need to analyze the ASCII connection lines
    for (let i = 1; i < nodes.length; i++) {
      const node = nodes[i];
      
      // Determine parent based on position - for simple structures, connect to previous node
      // or to the top node for the first few positions
      if (i <= 2) {
        // First few roles typically report to the top manager
        node.parentId = topManager.id;
      } else {
        // Look for a parent among the previous nodes
        // Simple heuristic: assign to node approximately 2-3 positions above
        const parentIndex = Math.max(0, i - 2 - (i % 3));
        node.parentId = nodes[parentIndex].id;
      }
    }
  }
  
  return nodes;
};
