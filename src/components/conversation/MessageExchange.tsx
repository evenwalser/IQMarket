
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { DataTable } from "@/components/chat/visualizations/DataTable";
import { DataChart } from "@/components/chat/visualizations/DataChart";
import { FlowChartRenderer } from "@/components/chat/visualizations/FlowChartRenderer";
import type { ChatVisualization } from "@/types/chat";
import { StructuredResponse, StructuredSection } from "@/types/structuredResponse";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { fixReplyThreadFormatting, cleanMarkdownContent, cleanListFormatting, fixBrokenHeadings } from "@/utils/markdownUtils";

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
    processed = fixBrokenHeadings(processed); // Add this crucial step
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
            content={fixReplyThreadFormatting(cleanMarkdownContent(section.content))} 
            className="text-gray-700 leading-relaxed"
          />
        ) : null;
      case 'heading':
        return renderHeading(section.content || '', section.level || 2);
      case 'chart':
        return (
          <DataChart 
            data={section.chartData?.data || []}
            type={section.chartData?.chartType || 'bar'}
            xKey={section.chartData?.xKey || 'x'}
            yKeys={section.chartData?.yKeys || ['y']}
            height={section.chartData?.height || 300}
            allowCustomization={assistantType === 'benchmarks'}
            visualizationId={`chart-${id}-${Math.random().toString(36).substring(2, 9)}`}
            conversationId={id}
          />
        );
      case 'flowChart':
      case 'orgChart':
        if (section.flowData && Array.isArray(section.flowData.nodes) && Array.isArray(section.flowData.edges)) {
          return (
            <div className="my-5 rounded-lg overflow-hidden shadow-md">
              <FlowChartRenderer 
                flowData={section.flowData} 
                height={section.height || 400} 
              />
            </div>
          );
        }
        console.log("Invalid flowChart data:", section.flowData);
        return <p className="text-orange-500">Could not render flow chart: missing or invalid data</p>;
      case 'table':
        return (
          <DataTable 
            data={section.tableData?.data || []} 
            headers={section.tableData?.headers || []}
            allowCustomization={assistantType === 'benchmarks'}
            visualizationId={`table-${id}-${Math.random().toString(36).substring(2, 9)}`}
            conversationId={id}
          />
        );
      default:
        console.log("Unsupported section type in MessageExchange:", section.type, section);
        return section.content ? (
          <MarkdownRenderer 
            content={fixReplyThreadFormatting(cleanMarkdownContent(section.content))} 
          />
        ) : (
          <p className="text-gray-500">This content couldn't be displayed correctly</p>
        );
    }
  };

  const renderHeading = (content: string, level: number) => {
    switch (level) {
      case 1:
        return <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900">{content}</h1>;
      case 2:
        return <h2 className="text-xl font-semibold mt-5 mb-3 text-gray-900">{content}</h2>;
      case 3:
        return <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800">{content}</h3>;
      case 4:
        return <h4 className="text-base font-semibold mt-3 mb-2 text-gray-800">{content}</h4>;
      default:
        return <h5 className="text-sm font-semibold mt-2 mb-1 text-gray-700">{content}</h5>;
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
              {visualization.type === 'table' && (
                <DataTable 
                  data={visualization.data} 
                  headers={visualization.headers}
                  allowCustomization={assistantType === 'benchmarks'}
                  visualizationId={visualization.id || `viz-${vizIndex}`}
                  conversationId={id}
                />
              )}
              
              {visualization.type === 'chart' && (
                <DataChart 
                  data={visualization.data}
                  type={visualization.chartType || 'bar'}
                  xKey={visualization.xKey || 'x'}
                  yKeys={visualization.yKeys || ['y']}
                  height={visualization.height || 300}
                  allowCustomization={assistantType === 'benchmarks'}
                  visualizationId={visualization.id || `viz-${vizIndex}`}
                  conversationId={id}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
