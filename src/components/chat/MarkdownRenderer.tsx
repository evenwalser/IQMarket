
import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from "@/lib/utils";
import { cleanMarkdownContent } from '@/utils/markdownUtils';
import { useMarkdownComponents } from './markdown/MarkdownElements';
import { MermaidRenderer } from './markdown/MermaidRenderer';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isUserMessage?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content,
  className,
  isUserMessage = false
}) => {
  // Fix markdown formatting issues before rendering
  const cleanContent = React.useMemo(() => {
    return cleanMarkdownContent(content);
  }, [content]);

  // Get markdown components
  const markdownComponents = useMarkdownComponents({ isUserMessage });

  // Effect to handle special content
  useEffect(() => {
    // Handle citations
    const citations = document.querySelectorAll('.citation');
    if (citations.length > 0) {
      citations.forEach((citation) => {
        citation.classList.add('text-xs');
      });
    }
    
    // Handle math equations if needed
    const mathElements = document.querySelectorAll('.math-block, .math-inline');
    if (mathElements.length > 0 && typeof window !== 'undefined') {
      // You can integrate with KaTeX or MathJax if needed
    }
  }, [cleanContent]);

  return (
    <>
      <MermaidRenderer />
      <ReactMarkdown
        className={cn(
          "prose prose-sm max-w-none", 
          isUserMessage ? "dark" : "dark:prose-invert", 
          className
        )}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]} // This is critical to allow HTML in markdown content
        components={markdownComponents}
      >
        {cleanContent}
      </ReactMarkdown>
    </>
  );
};
