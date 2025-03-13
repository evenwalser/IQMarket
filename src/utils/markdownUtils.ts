
/**
 * Utility functions for markdown processing
 */

/**
 * Cleans markdown content to fix common formatting issues
 */
export const cleanMarkdownContent = (content: string): string => {
  if (!content) return '';
  
  // Process markdown in a specific order to avoid conflicts
  let cleanedContent = content;
  
  // Fix headings
  cleanedContent = fixHeadings(cleanedContent);
  
  // Fix lists
  cleanedContent = fixLists(cleanedContent);
  
  // Fix code blocks
  cleanedContent = fixCodeBlocks(cleanedContent);
  
  // Remove citation references
  cleanedContent = removeCitationReferences(cleanedContent);
  
  // Fix spacing issues
  cleanedContent = fixSpacing(cleanedContent);
  
  return cleanedContent;
};

/**
 * Fixes markdown headings that aren't properly formatted
 */
export const fixHeadings = (content: string): string => {
  let processedContent = content;
  
  // Add space after heading markers if missing
  processedContent = processedContent.replace(/^(#{1,6})(?!\s)(.*?)$/gm, '$1 $2');
  
  // Ensure headings have surrounding newlines
  processedContent = processedContent.replace(/([^\n])(#{1,6}\s)/g, '$1\n\n$2');
  processedContent = processedContent.replace(/(#{1,6}\s.*?)([^\n])$/gm, '$1\n\n$2');
  
  return processedContent;
};

/**
 * Fixes markdown lists that aren't properly formatted
 */
export const fixLists = (content: string): string => {
  let processedContent = content;
  
  // Add space after list markers if missing
  processedContent = processedContent.replace(/^(\d+\.|[*-])(?!\s)(.*?)$/gm, '$1 $2');
  
  // Fix nested lists with improper indentation
  processedContent = processedContent.replace(/^(\s*)([*-])\s+(.*?)$/gm, (match, indent, marker, text) => {
    // Ensure indent is in multiples of 2 spaces
    const indentLevel = Math.ceil(indent.length / 2);
    const newIndent = '  '.repeat(indentLevel);
    return `${newIndent}${marker} ${text}`;
  });
  
  return processedContent;
};

/**
 * Fixes markdown code blocks
 */
export const fixCodeBlocks = (content: string): string => {
  let processedContent = content;
  
  // Ensure code blocks have proper newlines around them
  processedContent = processedContent.replace(/([^\n])```/g, '$1\n```');
  processedContent = processedContent.replace(/```([^\n])/g, '```\n$1');
  
  // Fix inline code that might be malformed
  processedContent = processedContent.replace(/`([^`\n]+)`/g, '`$1`');
  
  return processedContent;
};

/**
 * Removes citation references like [16:8*source]
 */
export const removeCitationReferences = (content: string): string => {
  return content.replace(/\[\d+:\d+\*source\]/g, '');
};

/**
 * Fixes spacing issues in markdown
 */
export const fixSpacing = (content: string): string => {
  let processedContent = content;
  
  // Remove excessive newlines (more than 2)
  processedContent = processedContent.replace(/\n{3,}/g, '\n\n');
  
  // Ensure proper spacing around block elements
  processedContent = processedContent.replace(/(\n#{1,6}\s.*?\n)(?!\n)/g, '$1\n');
  
  // Ensure proper spacing after paragraphs
  processedContent = processedContent.replace(/([^\n])\n(?!(#{1,6}|\d+\.|[*-]|\n|```|>))/g, '$1\n\n');
  
  return processedContent;
};

/**
 * Enhances markdown tables by adding proper alignment and formatting
 */
export const enhanceMarkdownTables = (content: string): string => {
  // Match markdown tables
  return content.replace(/\|(.+)\|\n\|([-:]+\|)+\n((\|.+\|\n)+)/g, (table) => {
    // Split into lines
    const lines = table.split('\n');
    if (lines.length < 3) return table;
    
    // Process header row
    const headerRow = lines[0];
    const headerCells = headerRow.split('|').filter(cell => cell.trim().length > 0);
    
    // Process alignment row
    const alignmentRow = lines[1];
    const alignments = alignmentRow.split('|').filter(cell => cell.trim().length > 0);
    
    // Format alignment row properly
    const formattedAlignments = alignments.map(align => {
      const trimmed = align.trim();
      if (trimmed.startsWith(':') && trimmed.endsWith(':')) return ':---:';
      if (trimmed.startsWith(':')) return ':---';
      if (trimmed.endsWith(':')) return '---:';
      return '---';
    });
    
    // Rebuild the table
    let newTable = '| ' + headerCells.join(' | ') + ' |\n';
    newTable += '| ' + formattedAlignments.join(' | ') + ' |\n';
    
    // Add data rows
    for (let i = 2; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const dataCells = lines[i].split('|').filter(cell => cell !== '');
      newTable += '| ' + dataCells.join(' | ') + ' |\n';
    }
    
    return newTable;
  });
};

/**
 * Formats markdown links consistently
 */
export const formatMarkdownLinks = (content: string): string => {
  // Fix standard markdown links
  let processedContent = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    return `[${text.trim()}](${url.trim()})`;
  });
  
  // Fix reference-style links
  processedContent = processedContent.replace(/\[([^\]]+)\]\[([^\]]+)\]/g, (match, text, ref) => {
    return `[${text.trim()}][${ref.trim()}]`;
  });
  
  return processedContent;
};

/**
 * Converts HTML elements to markdown equivalents
 */
export const convertHtmlToMarkdown = (content: string): string => {
  let processedContent = content;
  
  // Convert <strong> or <b> to markdown bold
  processedContent = processedContent.replace(/<(strong|b)>(.*?)<\/(strong|b)>/g, '**$2**');
  
  // Convert <em> or <i> to markdown italic
  processedContent = processedContent.replace(/<(em|i)>(.*?)<\/(em|i)>/g, '*$2*');
  
  // Convert <h1> through <h6> to markdown headings
  for (let i = 1; i <= 6; i++) {
    const hashes = '#'.repeat(i);
    processedContent = processedContent.replace(new RegExp(`<h${i}>(.*?)</h${i}>`, 'g'), `${hashes} $1`);
  }
  
  // Convert <a> to markdown links
  processedContent = processedContent.replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)');
  
  // Convert <ul> and <li> to markdown lists
  processedContent = processedContent.replace(/<ul>([\s\S]*?)<\/ul>/g, (match, content) => {
    return content.replace(/<li>([\s\S]*?)<\/li>/g, '- $1\n');
  });
  
  // Convert <ol> and <li> to markdown ordered lists
  processedContent = processedContent.replace(/<ol>([\s\S]*?)<\/ol>/g, (match, content) => {
    let index = 1;
    return content.replace(/<li>([\s\S]*?)<\/li>/g, () => {
      return `${index++}. $1\n`;
    });
  });
  
  // Convert <code> to markdown code
  processedContent = processedContent.replace(/<code>(.*?)<\/code>/g, '`$1`');
  
  // Convert <pre> to markdown code blocks
  processedContent = processedContent.replace(/<pre>([\s\S]*?)<\/pre>/g, '```\n$1\n```');
  
  return processedContent;
};
