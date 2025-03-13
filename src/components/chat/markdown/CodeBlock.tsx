
import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  children: string;
  className?: string;
  isUserMessage?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ 
  children, 
  className, 
  isUserMessage = false 
}) => {
  const match = /language-(\w+)/.exec(className || '');
  
  // Check if this is a code block (with language) or an inline code element
  return match ? (
    <SyntaxHighlighter
      style={atomDark}
      language={match[1]}
      PreTag="div"
      className="rounded-md my-4"
    >
      {String(children).replace(/\n$/, '')}
    </SyntaxHighlighter>
  ) : (
    <code className={`${isUserMessage ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'} px-1.5 py-0.5 rounded text-sm font-mono`}>
      {children}
    </code>
  );
};
