
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { DataTable } from "@/components/chat/visualizations/DataTable";
import { DataChart } from "@/components/chat/visualizations/DataChart";
import type { ChatVisualization } from "@/types/chat";
import { useEffect, useState } from "react";

interface MessageExchangeProps {
  id: string;
  query: string;
  response: string;
  isCurrentlySpeaking: boolean;
  toggleSpeakResponse: (response: string, conversationId: string) => void;
  visualizations?: ReadonlyArray<ChatVisualization>;
  assistantType: string;
}

export const MessageExchange = ({
  id,
  query,
  response,
  isCurrentlySpeaking,
  toggleSpeakResponse,
  visualizations,
  assistantType
}: MessageExchangeProps) => {
  const [formattedContent, setFormattedContent] = useState<React.ReactNode[]>([]);
  
  useEffect(() => {
    if (!response) {
      setFormattedContent([]);
      return;
    }
    
    console.log(`Processing message with ${visualizations?.length || 0} visualizations`);
    
    // Process the response to render visualizations inline
    const segments: React.ReactNode[] = [];
    
    // Check for visualization references
    const referenceRegex = /\*Visualization #(\d+)\*/g;
    let lastIndex = 0;
    let match;
    let hasReferences = false;
    
    // Create a copy of the response for regex operations
    const contentCopy = response;
    
    while ((match = referenceRegex.exec(contentCopy)) !== null) {
      hasReferences = true;
      const vizIndex = parseInt(match[1], 10) - 1;
      const matchedVisualization = visualizations && vizIndex >= 0 && vizIndex < visualizations.length 
        ? visualizations[vizIndex] 
        : undefined;
      
      // Add text before this match
      if (match.index > lastIndex) {
        segments.push(
          <p key={`text-${lastIndex}`} className="mb-3 whitespace-pre-wrap">
            {response.substring(lastIndex, match.index)}
          </p>
        );
      }
      
      // Add the visualization if it exists
      if (matchedVisualization) {
        console.log(`Rendering visualization #${vizIndex + 1}:`, matchedVisualization.type);
        segments.push(
          <div key={`viz-${vizIndex}`} className="my-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            {matchedVisualization.type === 'table' && (
              <DataTable 
                data={matchedVisualization.data} 
                headers={matchedVisualization.headers}
                allowCustomization={assistantType === 'benchmarks'}
                visualizationId={matchedVisualization.id || `viz-${vizIndex}`}
                conversationId={id}
                title={matchedVisualization.title}
                colorScheme={matchedVisualization.colorScheme}
              />
            )}
            
            {matchedVisualization.type === 'chart' && (
              <DataChart 
                data={matchedVisualization.data}
                type={matchedVisualization.chartType || 'bar'}
                xKey={matchedVisualization.xKey || 'x'}
                yKeys={matchedVisualization.yKeys || ['y']}
                height={matchedVisualization.height || 300}
                allowCustomization={assistantType === 'benchmarks'}
                visualizationId={matchedVisualization.id || `viz-${vizIndex}`}
                conversationId={id}
                title={matchedVisualization.title}
                subTitle={matchedVisualization.subTitle}
                colorScheme={matchedVisualization.colorScheme}
              />
            )}
          </div>
        );
      } else {
        console.warn(`Visualization #${vizIndex + 1} reference found but no matching visualization data`);
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add the remaining text
    if (lastIndex < response.length) {
      segments.push(
        <p key={`text-${lastIndex}`} className="mb-3 whitespace-pre-wrap">
          {response.substring(lastIndex)}
        </p>
      );
    }
    
    // If no references were found but we have visualizations, append them at the end
    if (!hasReferences && visualizations && visualizations.length > 0) {
      console.log(`No visualization references found, appending ${visualizations.length} visualizations at the end`);
      
      visualizations.forEach((visualization, vizIndex) => {
        segments.push(
          <div key={`viz-append-${vizIndex}`} className="my-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            {visualization.type === 'table' && (
              <DataTable 
                data={visualization.data} 
                headers={visualization.headers}
                allowCustomization={assistantType === 'benchmarks'}
                visualizationId={visualization.id || `viz-${vizIndex}`}
                conversationId={id}
                title={visualization.title}
                colorScheme={visualization.colorScheme}
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
                title={visualization.title}
                subTitle={visualization.subTitle}
                colorScheme={visualization.colorScheme}
              />
            )}
          </div>
        );
      });
    }
    
    setFormattedContent(segments);
  }, [response, visualizations, id, assistantType]);

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
        <div className={`rounded-lg p-3 max-w-[80%] ${isCurrentlySpeaking ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-100'}`}>
          <div className="text-gray-800 relative pr-8">
            {/* Render the formatted content with inline visualizations */}
            {formattedContent.length > 0 ? (
              formattedContent
            ) : (
              <p className="mb-3 whitespace-pre-wrap">{response}</p>
            )}
            
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
        </div>
      </div>
    </div>
  );
};
