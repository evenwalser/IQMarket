import React from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { VisualizationRenderer } from "@/components/chat/visualizations/VisualizationRenderer";
import type { ChatVisualization } from "@/types/chat";
import { StructuredResponse, StructuredSection } from "@/types/structuredResponse";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { 
  fixReplyThreadFormatting, 
  cleanMarkdownContent, 
  cleanListFormatting, 
  fixBrokenHeadings,
  fixMultipleBulletsInLists 
} from "@/utils/markdownUtils";

interface MessageExchangeProps {
  id: string;
  query: string;
  response: string;
  isCurrentlySpeaking: boolean;
  toggleSpeakResponse: (response: string, conversationId: string) => void;
  visualizations?: ReadonlyArray<ChatVisualization>;
  assistantType: string;
  structuredResponse?: StructuredResponse | null;
}

export const MessageExchange = ({
  id,
  query,
  response,
  isCurrentlySpeaking,
  toggleSpeakResponse,
  visualizations,
  assistantType,
  structuredResponse
}: MessageExchangeProps) => {
  // Pre-process the response before rendering to fix formatting issues
  const processedResponse = React.useMemo(() => {
    let processed = cleanMarkdownContent(response);
    processed = fixReplyThreadFormatting(processed);
    processed = cleanListFormatting(processed);
    processed = fixBrokenHeadings(processed);
    processed = fixMultipleBulletsInLists(processed); // Add this to fix multiple bullets
    return processed;
  }, [response]);

  const renderStructuredResponse = () => {
    if (!structuredResponse || !structuredResponse.sections) {
      return null;
    }

    return (
      <div className="space-y-4">
        {structuredResponse.sections.map((section, index) => (
          <div key={`section-${index}`}>
            {renderSection(section)}
          </div>
        ))}
      </div>
    );
  };

  const renderSection = (section: StructuredSection) => {
    switch (section.type) {
      case 'text':
        return section.content ? (
          <MarkdownRenderer 
            content={fixMultipleBulletsInLists(fixReplyThreadFormatting(cleanMarkdownContent(section.content)))} 
            className="text-gray-700 leading-relaxed"
          />
        ) : null;
      case 'heading':
        return renderHeading(section.content || '', section.level || 2);
      case 'chart':
        if (section.chartData) {
          const chartVisualization: ChatVisualization = {
            id: `chart-${id}-${Math.random().toString(36).substring(2, 9)}`,
            type: 'chart',
            data: section.chartData.data || [],
            chartType: section.chartData.chartType || 'bar',
            xKey: section.chartData.xKey || 'x',
            yKeys: section.chartData.yKeys || ['y'],
            height: section.chartData.height || 300,
            title: section.chartData.title
          };
          
          return (
            <VisualizationRenderer 
              visualization={chartVisualization}
              allowCustomization={assistantType === 'benchmarks'}
              conversationId={id}
            />
          );
        }
        return null;
      case 'flowChart':
      case 'orgChart':
        if (section.flowData && Array.isArray(section.flowData.nodes) && Array.isArray(section.flowData.edges)) {
          const flowVisualization: ChatVisualization = {
            id: `flow-${id}-${Math.random().toString(36).substring(2, 9)}`,
            type: section.type === 'flowChart' ? 'flowChart' : 'orgChart',
            nodes: section.flowData.nodes,
            edges: section.flowData.edges,
            title: section.flowData.title,
            height: section.height || 400,
            data: []
          };
          
          return (
            <VisualizationRenderer 
              visualization={flowVisualization}
              conversationId={id}
            />
          );
        }
        console.log("Invalid flowChart data:", section.flowData);
        return <p className="text-orange-500">Could not render flow chart: missing or invalid data</p>;
      case 'table':
        if (section.tableData) {
          const tableVisualization: ChatVisualization = {
            id: `table-${id}-${Math.random().toString(36).substring(2, 9)}`,
            type: 'table',
            data: section.tableData.data || [],
            headers: section.tableData.headers || [],
            title: section.tableData.title
          };
          
          return (
            <VisualizationRenderer 
              visualization={tableVisualization}
              allowCustomization={assistantType === 'benchmarks'}
              conversationId={id}
            />
          );
        }
        return null;
      default:
        console.log("Unsupported section type in MessageExchange:", section.type, section);
        return section.content ? (
          <MarkdownRenderer 
            content={fixMultipleBulletsInLists(fixReplyThreadFormatting(cleanMarkdownContent(section.content)))} 
          />
        ) : (
          <p className="text-gray-500">This content couldn't be displayed correctly</p>
        );
    }
  };

  const renderHeading = (content: string, level: number) => {
    switch (level) {
      case 1:
        return <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 break-words whitespace-normal">{content}</h1>;
      case 2:
        return <h2 className="text-xl font-semibold mt-5 mb-3 text-gray-900 break-words whitespace-normal">{content}</h2>;
      case 3:
        return <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800 break-words whitespace-normal">{content}</h3>;
      case 4:
        return <h4 className="text-base font-semibold mt-3 mb-2 text-gray-800 break-words whitespace-normal">{content}</h4>;
      default:
        return <h5 className="text-sm font-semibold mt-2 mb-1 text-gray-700 break-words whitespace-normal">{content}</h5>;
    }
  };

  return (
    <div className="space-y-4">
      {/* User message */}
      <div className="flex justify-end">
        <div className="bg-blue-100 rounded-lg p-3 max-w-[80%]">
          <p className="text-gray-800">{query}</p>
        </div>
      </div>
      
      {/* Assistant response */}
      <div className="flex justify-start">
        <div className={`rounded-lg p-4 max-w-[80%] ${isCurrentlySpeaking ? 'bg-indigo-50 border border-indigo-100' : 'bg-white border border-gray-100 shadow-sm'}`}>
          {/* If we have structured response, render it, otherwise fall back to regular response */}
          {structuredResponse ? (
            <div className="relative pr-8">
              {renderStructuredResponse()}
              
              {/* Text-to-speech button */}
              <Button
                size="icon"
                variant="ghost"
                className={`absolute top-0 right-0 h-8 w-8 ${isCurrentlySpeaking ? 'text-indigo-600' : 'opacity-70 hover:opacity-100'}`}
                onClick={() => toggleSpeakResponse(response, id)}
              >
                {isCurrentlySpeaking ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-gray-800 relative pr-8">
              <MarkdownRenderer content={processedResponse} />
              
              {/* Text-to-speech button */}
              <Button
                size="icon"
                variant="ghost"
                className={`absolute top-0 right-0 h-8 w-8 ${isCurrentlySpeaking ? 'text-indigo-600' : 'opacity-70 hover:opacity-100'}`}
                onClick={() => toggleSpeakResponse(response, id)}
              >
                {isCurrentlySpeaking ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
          )}
          
          {/* Render regular visualizations if present (fallback or additional) */}
          {visualizations?.map((visualization, vizIndex) => (
            <div key={`${id}-viz-${vizIndex}`} className="mt-4">
              <VisualizationRenderer 
                visualization={visualization}
                allowCustomization={assistantType === 'benchmarks'}
                conversationId={id}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
