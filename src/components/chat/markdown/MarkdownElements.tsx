
import React from 'react';
import { CodeBlock } from './CodeBlock';

interface MarkdownElementsProps {
  isUserMessage: boolean;
}

export const useMarkdownComponents = ({ isUserMessage }: MarkdownElementsProps) => {
  // Custom styling based on isUserMessage
  const textClassName = isUserMessage 
    ? "text-white" 
    : "text-gray-700";

  const headingClassName = isUserMessage
    ? "text-white font-bold"
    : "text-gray-900 font-semibold";

  const linkClassName = isUserMessage
    ? "text-blue-200 underline hover:text-blue-100"
    : "text-blue-600 hover:text-blue-800 hover:underline";

  return {
    // Heading components with data attributes to avoid Tailwind circular dependencies
    h1: ({ node, ...props }: any) => <h1 data-heading="1" className={`text-xl my-4 ${headingClassName}`} {...props} />,
    h2: ({ node, ...props }: any) => <h2 data-heading="2" className={`text-lg my-3 ${headingClassName}`} {...props} />,
    h3: ({ node, ...props }: any) => <h3 data-heading="3" className={`text-base my-2 ${headingClassName}`} {...props} />,
    
    // Paragraph with proper spacing
    p: ({ node, ...props }: any) => <p className={`my-2 ${textClassName} leading-relaxed`} {...props} />,
    
    // List items with proper styling
    ul: ({ node, ...props }: any) => <ul className="my-3 pl-6 space-y-2 list-disc" {...props} />,
    ol: ({ node, ...props }: any) => <ol className="my-3 pl-6 space-y-2 list-decimal" {...props} />,
    li: ({ node, ...props }: any) => {
      // Check if the node has children and if any of them are paragraphs or lists
      const hasComplexContent = node?.children?.some(
        (child: any) => 
          child.type === 'paragraph' || 
          child.type === 'list' || 
          child.type === 'ul' || 
          child.type === 'ol'
      );
      
      return (
        <li className={`${textClassName} ${hasComplexContent ? 'mb-2' : ''} leading-relaxed`}>
          <div className="flex">
            <div className="flex-shrink-0 mr-2">
              {isUserMessage ? '•' : ''}
            </div>
            <div className="flex-1">
              {props.children}
            </div>
          </div>
        </li>
      );
    },
    
    // Emphasis and strong text
    em: ({ node, ...props }: any) => <em className={`italic ${textClassName}`} {...props} />,
    strong: ({ node, ...props }: any) => <strong className={`font-semibold ${isUserMessage ? 'text-white' : 'text-gray-900'}`} {...props} />,
    
    // Code blocks with syntax highlighting
    code: ({ node, className, children, ...props }: any) => (
      <CodeBlock className={className} isUserMessage={isUserMessage} {...props}>
        {String(children)}
      </CodeBlock>
    ),

    // Links with proper styling
    a: ({ node, ...props }: any) => (
      <a 
        className={linkClassName}
        target="_blank" 
        rel="noopener noreferrer" 
        {...props} 
      />
    ),

    // Blockquotes
    blockquote: ({ node, ...props }: any) => (
      <blockquote className={`border-l-4 ${isUserMessage ? 'border-blue-400 pl-4 py-1 my-3 text-blue-100' : 'border-gray-200 pl-4 py-1 my-3 text-gray-600'} italic`} {...props} />
    ),

    // Images with responsive sizing
    img: ({ node, ...props }: any) => (
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
    table: ({ node, ...props }: any) => (
      <div className="overflow-x-auto my-4">
        <table className={`min-w-full divide-y divide-gray-200 border ${isUserMessage ? 'border-blue-400' : 'border-gray-200'} rounded-md`} {...props} />
      </div>
    ),
    thead: ({ node, ...props }: any) => <thead className={isUserMessage ? "bg-blue-600" : "bg-gray-50"} {...props} />,
    tbody: ({ node, ...props }: any) => <tbody className="divide-y divide-gray-200" {...props} />,
    tr: ({ node, ...props }: any) => <tr className={isUserMessage ? "hover:bg-blue-500" : "hover:bg-gray-50"} {...props} />,
    th: ({ node, ...props }: any) => (
      <th 
        className={`px-4 py-3 text-left text-xs font-medium ${isUserMessage ? 'text-blue-100' : 'text-gray-500'} uppercase tracking-wider`} 
        {...props} 
      />
    ),
    td: ({ node, ...props }: any) => <td className={`px-4 py-3 text-sm ${isUserMessage ? 'text-white' : 'text-gray-700'}`} {...props} />,
    
    // Superscript with styling for citations
    sup: ({ node, className, ...props }: any) => {
      if (className?.includes('citation')) {
        return <sup className={`text-xs ${isUserMessage ? 'text-blue-200' : 'text-blue-600'} ml-0.5`} {...props} />;
      }
      return <sup className="text-xs" {...props} />;
    },
    
    // Handle divs for special components like mermaid diagrams
    div: ({ node, className, ...props }: any) => {
      if (className?.includes('mermaid-diagram')) {
        return <div className="my-4 overflow-x-auto bg-gray-50 p-4 rounded-md" {...props} />;
      }
      if (className?.includes('math-block')) {
        return <div className="my-4 text-center py-2 bg-gray-50 rounded-md" {...props} />;
      }
      return <div {...props} />;
    },
    
    // Handle spans for math inline
    span: ({ node, className, ...props }: any) => {
      if (className?.includes('math-inline')) {
        return <span className="px-1 bg-gray-50 rounded" {...props} />;
      }
      return <span {...props} />;
    }
  };
};
