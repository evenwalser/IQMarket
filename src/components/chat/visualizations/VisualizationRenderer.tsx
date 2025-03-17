
import React from 'react';
import { ChatVisualization } from '@/types/chat';
import { DataTable } from './DataTable';
import { DataChart } from './DataChart';
import { FlowChartRenderer } from './FlowChartRenderer';
import { OrgChart } from './OrgChart';
import { QuadrantChart } from './QuadrantChart';
import { RaciMatrix } from './RaciMatrix';
import { FunnelChart } from './FunnelChart';

interface VisualizationRendererProps {
  visualization: ChatVisualization;
  allowCustomization?: boolean;
  conversationId?: string;
}

export const VisualizationRenderer = ({
  visualization,
  allowCustomization = false,
  conversationId
}: VisualizationRendererProps) => {
  if (!visualization) return null;

  // Helper function to map colorScheme to supported types
  const mapColorScheme = (scheme: string | undefined, supportedValues: string[]): string => {
    if (!scheme) return 'default';
    return supportedValues.includes(scheme) ? scheme : 'default';
  };

  switch (visualization.type) {
    case 'table':
      return (
        <DataTable 
          data={visualization.data} 
          headers={visualization.headers}
          title={visualization.title}
          sortable={true}
          compact={visualization.compact}
          colorScheme={mapColorScheme(visualization.colorScheme, ["default", "purple", "blue", "green", "red"])}
          allowCustomization={allowCustomization}
          visualizationId={visualization.id}
          conversationId={conversationId}
        />
      );
      
    case 'chart': {
      // Map chartType to supported values
      const chartType = visualization.chartType === 'pie' 
        ? 'bar' // Use bar as fallback for pie
        : (visualization.chartType || 'bar');
        
      return (
        <DataChart 
          data={visualization.data}
          type={chartType as "bar" | "line" | "area" | "radar" | "composed"}
          xKey={visualization.xKey || 'x'}
          yKeys={visualization.yKeys || ['y']}
          height={visualization.height || 300}
          title={visualization.title}
          subTitle={visualization.subTitle}
          colorScheme={mapColorScheme(visualization.colorScheme, ["default", "purple", "blue", "green"])}
          allowCustomization={allowCustomization}
          visualizationId={visualization.id}
          conversationId={conversationId}
        />
      );
    }
      
    case 'flowChart':
      return (
        <FlowChartRenderer 
          flowData={{
            nodes: visualization.nodes || [],
            edges: visualization.edges || []
          }} 
          height={visualization.height || 400}
          // Use header title in flowData for now (title is not in FlowChartProps)
        />
      );
      
    case 'orgChart':
      return (
        <OrgChart 
          nodes={visualization.nodes || []} 
          title={visualization.title}
          colorScheme={visualization.colorScheme}
        />
      );
      
    case 'quadrantChart':
      return (
        <QuadrantChart 
          items={visualization.items || []}
          xAxisLabel={visualization.xAxisLabel}
          yAxisLabel={visualization.yAxisLabel}
          title={visualization.title}
          height={visualization.height || 400}
          colorScheme={mapColorScheme(visualization.colorScheme, ["default", "purple", "blue", "green"])}
        />
      );
      
    case 'raciMatrix':
      return (
        <RaciMatrix 
          tasks={visualization.tasks || []}
          roles={visualization.roles || []}
          title={visualization.title}
          colorScheme={mapColorScheme(visualization.colorScheme, ["default", "purple", "blue", "green"])}
        />
      );
      
    case 'funnel':
      return (
        <FunnelChart 
          stages={visualization.stages || []}
          title={visualization.title}
          height={visualization.height || 400}
          colorScheme={visualization.colorScheme}
        />
      );
      
    default:
      console.log('Unknown visualization type:', visualization.type);
      return (
        <div className="p-4 border rounded-md bg-gray-50">
          <p className="text-gray-500">Unsupported visualization type: {visualization.type}</p>
        </div>
      );
  }
};
