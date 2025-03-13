
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { DataTable } from "@/components/chat/visualizations/DataTable";
import { DataChart } from "@/components/chat/visualizations/DataChart";
import type { ChatVisualization } from "@/types/chat";

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
          <div className="whitespace-pre-wrap text-gray-800 relative pr-8">
            {response}
            
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
