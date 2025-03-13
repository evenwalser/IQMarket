
import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from "@/lib/utils";
// Import mermaid as a type only import to prevent runtime issues
import type { default as Mermaid } from 'mermaid';

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
  // Effect to handle mermaid diagrams if any
  useEffect(() => {
    const diagrams = document.querySelectorAll('.mermaid-diagram');
    if (diagrams.length > 0 && typeof window !== 'undefined') {
      // Dynamically import mermaid if needed
      import('mermaid').then((mermaidModule) => {
        const mermaid = mermaidModule.default;
        mermaid.initialize({
          startOnLoad: true,
          theme: 'neutral',
          securityLevel: 'loose'
        });
        
        diagrams.forEach((diagram) => {
          const diagramId = diagram.getAttribute('data-diagram-id');
          const diagramContent = decodeURIComponent(diagram.getAttribute('data-diagram-content') || '');
          
          try {
            mermaid.render(diagramId || 'mermaid', diagramContent).then(({ svg }) => {
              diagram.innerHTML = svg;
            });
          } catch (error) {
            console.error('Failed to render mermaid diagram:', error);
          }
        });
      }).catch((error) => {
        console.error('Failed to load mermaid:', error);
      });
    }
    
    // Handle custom citation styling
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
  }, [content]);

  // Custom styling based on isUserMessage
  const textClassName = isUserMessage 
    ? "text-white" 
    : "text-gray-700";

  const headingClassName = isUserMessage
    ? "text-white font-bold"
    : "text-gray-900 font-bold";

  const linkClassName = isUserMessage
    ? "text-blue-200 underline hover:text-blue-100"
    : "text-blue-600 hover:text-blue-800 hover:underline";

  return (
    <ReactMarkdown
      className={cn(
        "prose prose-sm max-w-none", 
        isUserMessage ? "dark" : "dark:prose-invert", 
        className
      )}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]} // This is critical to allow HTML in markdown content
      components={{
        // Heading components with data attributes to avoid Tailwind circular dependencies
        h1: ({ node, ...props }) => <h1 data-heading="1" className={`text-xl my-4 ${headingClassName}`} {...props} />,
        h2: ({ node, ...props }) => <h2 data-heading="2" className={`text-lg my-3 ${headingClassName}`} {...props} />,
        h3: ({ node, ...props }) => <h3 data-heading="3" className={`text-base my-2 ${headingClassName}`} {...props} />,
        
        // Paragraph with proper spacing
        p: ({ node, ...props }) => <p className={`my-2 ${textClassName}`} {...props} />,
        
        // List items with proper styling
        ul: ({ node, ...props }) => <ul className="my-3 pl-6 space-y-1 list-disc" {...props} />,
        ol: ({ node, ...props }) => <ol className="my-3 pl-6 space-y-1 list-decimal" {...props} />,
        li: ({ node, ...props }) => <li className={textClassName} {...props} />,
        
        // Emphasis and strong text
        em: ({ node, ...props }) => <em className={`italic ${textClassName}`} {...props} />,
        strong: ({ node, ...props }) => <strong className={`font-semibold ${isUserMessage ? 'text-white' : 'text-gray-900'}`} {...props} />,
        
        // Code blocks with syntax highlighting
        code: ({ node, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          // Check if this is a code block (with language) or an inline code element
          return match ? (
            <SyntaxHighlighter
              style={atomDark}
              language={match[1]}
              PreTag="div"
              className="rounded-md my-4"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={`${isUserMessage ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'} px-1.5 py-0.5 rounded text-sm font-mono`} {...props}>
              {children}
            </code>
          );
        },

        // Links with proper styling
        a: ({ node, ...props }) => (
          <a 
            className={linkClassName}
            target="_blank" 
            rel="noopener noreferrer" 
            {...props} 
          />
        ),

        // Blockquotes
        blockquote: ({ node, ...props }) => (
          <blockquote className={`border-l-4 ${isUserMessage ? 'border-blue-400 pl-4 py-1 my-3 text-blue-100' : 'border-gray-200 pl-4 py-1 my-3 text-gray-600'} italic`} {...props} />
        ),

        // Images with responsive sizing
        img: ({ node, ...props }) => (
          <img
            className="max-w-full h-auto rounded-md my-4"
            loading="lazy"
            {...props}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = '/placeholder.svg';
            }}
          />
        ),

        // Tables
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto my-4">
            <table className={`min-w-full divide-y divide-gray-200 border ${isUserMessage ? 'border-blue-400' : 'border-gray-200'} rounded-md`} {...props} />
          </div>
        ),
        thead: ({ node, ...props }) => <thead className={isUserMessage ? "bg-blue-600" : "bg-gray-50"} {...props} />,
        tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-200" {...props} />,
        tr: ({ node, ...props }) => <tr className={isUserMessage ? "hover:bg-blue-500" : "hover:bg-gray-50"} {...props} />,
        th: ({ node, ...props }) => (
          <th 
            className={`px-4 py-3 text-left text-xs font-medium ${isUserMessage ? 'text-blue-100' : 'text-gray-500'} uppercase tracking-wider`} 
            {...props} 
          />
        ),
        td: ({ node, ...props }) => <td className={`px-4 py-3 text-sm ${isUserMessage ? 'text-white' : 'text-gray-700'}`} {...props} />,
        
        // Superscript with styling for citations
        sup: ({ node, className, ...props }) => {
          if (className?.includes('citation')) {
            return <sup className={`text-xs ${isUserMessage ? 'text-blue-200' : 'text-blue-600'} ml-0.5`} {...props} />;
          }
          return <sup className="text-xs" {...props} />;
        },
        
        // Handle divs for special components like mermaid diagrams
        div: ({ node, className, ...props }) => {
          if (className?.includes('mermaid-diagram')) {
            return <div className="my-4 overflow-x-auto bg-gray-50 p-4 rounded-md" {...props} />;
          }
          if (className?.includes('math-block')) {
            return <div className="my-4 text-center py-2 bg-gray-50 rounded-md" {...props} />;
          }
          return <div {...props} />;
        },
        
        // Handle spans for math inline
        span: ({ node, className, ...props }) => {
          if (className?.includes('math-inline')) {
            return <span className="px-1 bg-gray-50 rounded" {...props} />;
          }
          return <span {...props} />;
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
