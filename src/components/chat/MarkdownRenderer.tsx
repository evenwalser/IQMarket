
import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from "@/lib/utils";
import { 
  cleanMarkdownContent, 
  enhanceMarkdownTables, 
  formatMarkdownLinks, 
  convertHtmlToMarkdown,
  fixReplyThreadFormatting,
  cleanListFormatting,
  fixBrokenHeadings,
  fixMultipleBulletsInLists
} from '@/utils/markdownUtils';
import { useMarkdownComponents } from './markdown/MarkdownElements';
import { MermaidRenderer } from './markdown/MermaidRenderer';
import { FlowChartRenderer } from '@/components/chat/visualizations/FlowChartRenderer';
import { DataChart } from '@/components/chat/visualizations/DataChart';
import { DataTable } from '@/components/chat/visualizations/DataTable';
import { StructuredResponse, StructuredSection } from '@/types/structuredResponse';

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
  const cleanContent = React.useMemo(() => {
    // Apply multiple cleaning steps to ensure correct formatting
    let processedContent = cleanMarkdownContent(content);
    processedContent = enhanceMarkdownTables(processedContent);
    processedContent = formatMarkdownLinks(processedContent);
    processedContent = convertHtmlToMarkdown(processedContent);
    processedContent = fixReplyThreadFormatting(processedContent);
    processedContent = cleanListFormatting(processedContent);
    // Apply heading fixes - most crucial for our current issue
    processedContent = fixBrokenHeadings(processedContent);
    // Fix multiple bullets in list items - critical for frameworks output
    processedContent = fixMultipleBulletsInLists(processedContent);
    return processedContent;
  }, [content]);

  const markdownComponents = useMarkdownComponents({ isUserMessage });

  useEffect(() => {
    const citations = document.querySelectorAll('.citation');
    if (citations.length > 0) {
      citations.forEach((citation) => {
        citation.classList.add('text-xs');
      });
    }
    
    const mathElements = document.querySelectorAll('.math-block, .math-inline');
    if (mathElements.length > 0 && typeof window !== 'undefined') {
      // Math rendering support can be added here if needed
    }
    
    // Add special handling for lists
    const listItems = document.querySelectorAll('li');
    if (listItems.length > 0) {
      listItems.forEach((item) => {
        item.classList.add('my-1');
      });
    }
    
    // Add special handling for headings to prevent broken text
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length > 0) {
      headings.forEach((heading) => {
        heading.classList.add('break-normal', 'whitespace-normal');
      });
    }
  }, [cleanContent]);

  return (
    <>
      <MermaidRenderer />
      <ReactMarkdown
        className={cn(
          "prose prose-sm max-w-none", 
          isUserMessage ? "dark" : "dark:prose-invert prose-headings:font-semibold prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-strong:font-semibold", 
          className
        )}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={markdownComponents}
      >
        {cleanContent}
      </ReactMarkdown>
    </>
  );
};

export const StructuredResponseRenderer: React.FC<{ structuredResponse: StructuredResponse }> = ({ 
  structuredResponse 
}) => {
  if (!structuredResponse || !structuredResponse.sections || !Array.isArray(structuredResponse.sections)) {
    return <div className="text-red-500">Invalid structured response format</div>;
  }
  
  return (
    <div className="space-y-6">
      {structuredResponse.sections.map((section, index) => {
        if (section.type === 'text') {
          return (
            <div key={index} className="prose prose-slate max-w-none">
              <MarkdownRenderer content={section.content || ''} />
            </div>
          );
        } else if (section.type === 'heading') {
          const HeadingTag = `h${section.level || 2}` as keyof JSX.IntrinsicElements;
          return (
            <HeadingTag key={index} className="text-gray-900 font-semibold mt-6 mb-3">
              {section.content}
            </HeadingTag>
          );
        } else if (section.type === 'chart' && section.chartData) {
          return (
            <div key={index} className="my-4">
              <DataChart 
                data={section.chartData} 
                height={section.height || 300} 
                type="bar"
                xKey={section.chartData[0] ? Object.keys(section.chartData[0])[0] : "x"}
                yKeys={section.chartData[0] ? Object.keys(section.chartData[0]).slice(1) : ["y"]}
              />
            </div>
          );
        } else if (section.type === 'flowChart' && section.flowData) {
          return (
            <div key={index} className="my-5 rounded-lg overflow-hidden shadow-sm">
              <FlowChartRenderer 
                flowData={section.flowData} 
                height={section.height || 400} 
              />
            </div>
          );
        } else if (section.type === 'orgChart' && section.flowData) {
          return (
            <div key={index} className="my-5 rounded-lg overflow-hidden shadow-sm">
              <FlowChartRenderer 
                flowData={section.flowData} 
                height={section.height || 400} 
              />
            </div>
          );
        } else if (section.type === 'table' && section.tableData) {
          return (
            <div key={index} className="my-4 overflow-x-auto">
              <DataTable data={section.tableData} />
            </div>
          );
        } else if (section.type === 'image' && section.imageUrl) {
          return (
            <div key={index} className="my-4">
              <img 
                src={section.imageUrl} 
                alt={section.content || "Image"} 
                className="max-w-full rounded-md"
              />
              {section.content && (
                <p className="text-sm text-gray-500 mt-1">{section.content}</p>
              )}
            </div>
          );
        }
        
        console.log("Unsupported section type:", section.type, section);
        
        return (
          <div key={index} className="text-gray-600 p-2 my-2 bg-gray-100 rounded">
            {section.content ? (
              <MarkdownRenderer content={section.content} />
            ) : (
              <p>This content couldn't be displayed correctly</p>
            )}
          </div>
        );
      })}
    </div>
  );
};
