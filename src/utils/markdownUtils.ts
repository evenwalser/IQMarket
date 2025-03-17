
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
  
  // Enhance numbered lists
  cleanedContent = enhanceNumberedLists(cleanedContent);
  
  // Fix nested list structure
  cleanedContent = fixNestedLists(cleanedContent);
  
  return cleanedContent;
};

/**
 * Fixes markdown headings that aren't properly formatted
 */
export const fixHeadings = (content: string): string => {
  let processedContent = content;
  
  // Add space after heading markers if missing
  processedContent = processedContent.replace(/^(#{1,6})(?!\s)(.*?)$/gm, '$1 $2');
  
  // Ensure headings have surrounding newlines for proper rendering
  processedContent = processedContent.replace(/([^\n])(#{1,6}\s)/g, '$1\n\n$2');
  processedContent = processedContent.replace(/(#{1,6}\s.*?)([^\n])$/gm, '$1\n\n$2');
  
  // Ensure consistent formatting for numbered headings like # 1. Heading
  processedContent = processedContent.replace(/^(#{1,6})\s+(\d+\.\s*)(.*?)$/gm, '$1 $2$3');
  
  return processedContent;
};

/**
 * Fixes markdown lists that aren't properly formatted
 */
export const fixLists = (content: string): string => {
  let processedContent = content;
  
  // Add space after list markers if missing
  processedContent = processedContent.replace(/^(\s*)([*\-+]|\d+\.)(?!\s)(.*?)$/gm, '$1$2 $3');
  
  // Ensure list items have proper spacing between them
  processedContent = processedContent.replace(/^([*\-+]|\d+\.)\s+(.*?)(?!\n)$/gm, '$1 $2\n');
  
  // Ensure there's a blank line before lists start (but not between items)
  processedContent = processedContent.replace(/([^\n])(\n[*\-+]|\n\d+\.)/g, '$1\n\n$2');
  
  return processedContent;
};

/**
 * Fixes nested list structure and indentation
 */
export const fixNestedLists = (content: string): string => {
  const lines = content.split('\n');
  let result = [];
  let inList = false;
  let prevIndentLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if this is a list item (bullet or numbered)
    const listItemMatch = line.match(/^(\s*)([*\-+]|\d+\.)\s/);
    
    if (listItemMatch) {
      const indentLevel = listItemMatch[1].length;
      const listMarker = listItemMatch[2];
      
      // Starting a new list
      if (!inList) {
        // Add a blank line before starting a list if there isn't one already
        if (i > 0 && result[result.length - 1] !== '') {
          result.push('');
        }
        inList = true;
      } else if (indentLevel > prevIndentLevel) {
        // If this is a nested list item with increased indentation,
        // make sure the previous line doesn't end with a blank line
        if (result[result.length - 1] === '') {
          result.pop();
        }
      } else if (indentLevel < prevIndentLevel && i < lines.length - 1) {
        // If indentation decreases (ending a nested list), ensure proper spacing
        const nextLine = lines[i + 1];
        const nextIsListItem = nextLine.match(/^\s*([*\-+]|\d+\.)\s/);
        
        // If next line isn't a list item or has less indentation, add space
        if (!nextIsListItem) {
          result.push(line, '');
          prevIndentLevel = indentLevel;
          continue;
        }
      }
      
      prevIndentLevel = indentLevel;
    } else {
      // Not a list item
      if (inList && line.trim() === '') {
        // Empty line after a list - could be ending the list
        const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
        const nextIsListItem = nextLine.match(/^\s*([*\-+]|\d+\.)\s/);
        
        if (!nextIsListItem) {
          inList = false;
        }
      } else if (inList && line.trim() !== '') {
        // Text content that should be part of a list item needs proper indentation
        const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
        const nextIsListItem = nextLine.match(/^\s*([*\-+]|\d+\.)\s/);
        
        if (!nextIsListItem) {
          inList = false;
        }
      }
    }
    
    result.push(line);
  }
  
  return result.join('\n');
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
  processedContent = processedContent.replace(/([^\n])\n(?!(#{1,6}|\d+\.|[*\-+]|\n|```|>))/g, '$1\n\n');
  
  // Ensure proper spacing before lists
  processedContent = processedContent.replace(/([^\n])(\n[*\-+])/g, '$1\n\n$2');
  
  return processedContent;
};

/**
 * Enhances numbered lists for better rendering
 */
export const enhanceNumberedLists = (content: string): string => {
  // Add space after number if missing
  return content.replace(/^(\d+)\.(?!\s)(.*?)$/gm, '$1. $2');
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

/**
 * Properly handles bullet points and numbering in markdown
 */
export const cleanListFormatting = (content: string): string => {
  let processedContent = content;
  
  // Ensure bullet lists have consistent formatting
  processedContent = processedContent.replace(/^(\s*)[\*\-\+]\s+/gm, '$1* ');
  
  // Fix numbered list continuity
  let lastNumber = 0;
  processedContent = processedContent.replace(/^(\s*)(\d+)\.\s+(.*?)$/gm, (match, indent, num, text) => {
    // Reset numbering when indentation changes or there's a gap in the list
    if (match.startsWith('  ')) {
      // This is a sublist, so we want to maintain the number
      return `${indent}${num}. ${text}`;
    } else {
      // This is a main list, so we increment the number
      lastNumber++;
      return `${indent}${lastNumber}. ${text}`;
    }
  });
  
  return processedContent;
};

/**
 * Fix specific issues with list rendering in the Thread Reply component
 */
export const fixReplyThreadFormatting = (content: string): string => {
  let processedContent = content;
  
  // Ensure list items have proper list markers and spacing
  // First handle bullet points
  processedContent = processedContent.replace(/^(\s*)•\s+(.*?)$/gm, '$1* $2');
  
  // Add proper spacing around headings with numbers (like # 9. Process Refinement)
  processedContent = processedContent.replace(/^(#{1,6})\s+(\d+)\.?\s+(.*)$/gm, '$1 $2. $3');
  
  return processedContent;
};
