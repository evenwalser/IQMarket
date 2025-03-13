
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content,
  className
}) => {
  return (
    <ReactMarkdown
      className={cn("prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-gray-900", className)}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        // Heading components with data attributes to avoid Tailwind circular dependencies
        h1: ({ node, ...props }) => <h1 data-heading="1" className="text-xl font-bold my-4 text-gray-900" {...props} />,
        h2: ({ node, ...props }) => <h2 data-heading="2" className="text-lg font-bold my-3 text-gray-800" {...props} />,
        h3: ({ node, ...props }) => <h3 data-heading="3" className="text-base font-semibold my-2 text-gray-800" {...props} />,
        
        // Paragraph with proper spacing
        p: ({ node, ...props }) => <p className="my-2 text-gray-700" {...props} />,
        
        // List items with proper styling
        ul: ({ node, ...props }) => <ul className="my-3 pl-6 space-y-1 list-disc" {...props} />,
        ol: ({ node, ...props }) => <ol className="my-3 pl-6 space-y-1 list-decimal" {...props} />,
        li: ({ node, ...props }) => <li className="text-gray-700" {...props} />,
        
        // Emphasis and strong text
        em: ({ node, ...props }) => <em className="italic text-gray-700" {...props} />,
        strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
        
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
            <code className="bg-gray-100 text-gray-900 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
              {children}
            </code>
          );
        },

        // Links with proper styling
        a: ({ node, ...props }) => (
          <a 
            className="text-blue-600 hover:text-blue-800 hover:underline" 
            target="_blank" 
            rel="noopener noreferrer" 
            {...props} 
          />
        ),

        // Blockquotes
        blockquote: ({ node, ...props }) => (
          <blockquote className="border-l-4 border-gray-200 pl-4 py-1 my-3 text-gray-600 italic" {...props} />
        ),

        // Tables
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md" {...props} />
          </div>
        ),
        thead: ({ node, ...props }) => <thead className="bg-gray-50" {...props} />,
        tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-200" {...props} />,
        tr: ({ node, ...props }) => <tr className="hover:bg-gray-50" {...props} />,
        th: ({ node, ...props }) => (
          <th 
            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" 
            {...props} 
          />
        ),
        td: ({ node, ...props }) => <td className="px-4 py-3 text-sm text-gray-700" {...props} />,
        
        // Superscript with styling for citations
        sup: ({ node, ...props }) => (
          <sup className="text-xs text-blue-600" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
