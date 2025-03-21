
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
  const mapColorScheme = <T extends string>(scheme: string | undefined, supportedValues: T[]): T => {
    if (!scheme) return 'default' as T;
    return (supportedValues.includes(scheme as T) ? scheme : 'default') as T;
  };

  // Log the visualization type for debugging
  console.log(`Rendering visualization of type: ${visualization.type}`, visualization);

  switch (visualization.type) {
    case 'table':
      return (
        <DataTable 
          data={visualization.data} 
          headers={visualization.headers}
          title={visualization.title}
          sortable={true}
          compact={visualization.compact}
          colorScheme={mapColorScheme<"default" | "purple" | "blue" | "green" | "red">(
            visualization.colorScheme, 
            ["default", "purple", "blue", "green", "red"]
          )}
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
          colorScheme={mapColorScheme<"default" | "purple" | "blue" | "green">(
            visualization.colorScheme, 
            ["default", "purple", "blue", "green"]
          )}
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
            edges: visualization.edges || [],
            title: visualization.title
          }} 
          height={visualization.height || 400}
        />
      );
      
    case 'orgChart': {
      // Use the entities directly if available, or convert from nodes
      const orgEntities = visualization.entities || 
        visualization.nodes?.map(node => ({
          id: node.id,
          name: node.label, // Map label to name
          role: node.role || node.label,
          parentId: node.parentId
        })) || [];

      return (
        <OrgChart 
          nodes={orgEntities} 
          title={visualization.title || "Organizational Chart"}
          colorScheme={mapColorScheme<"default" | "financial" | "retention" | "performance" | "operational">(
            visualization.colorScheme, 
            ["default", "financial", "retention", "performance", "operational"]
          )}
        />
      );
    }
      
    case 'quadrantChart':
      return (
        <QuadrantChart 
          items={visualization.items || []}
          xAxisLabel={visualization.xAxisLabel}
          yAxisLabel={visualization.yAxisLabel}
          title={visualization.title}
          height={visualization.height || 400}
          colorScheme={mapColorScheme<"default" | "financial" | "retention" | "performance" | "operational">(
            visualization.colorScheme, 
            ["default", "financial", "retention", "performance", "operational"]
          )}
        />
      );
      
    case 'raciMatrix':
      return (
        <RaciMatrix 
          tasks={visualization.tasks || []}
          roles={visualization.roles || []}
          title={visualization.title}
          colorScheme={mapColorScheme<"default" | "financial" | "retention" | "performance" | "operational">(
            visualization.colorScheme, 
            ["default", "financial", "retention", "performance", "operational"]
          )}
        />
      );
      
    case 'funnel':
      return (
        <FunnelChart 
          stages={visualization.stages || []}
          title={visualization.title}
          height={visualization.height || 400}
          colorScheme={mapColorScheme<"default" | "financial" | "retention" | "performance" | "operational">(
            visualization.colorScheme, 
            ["default", "financial", "retention", "performance", "operational"]
          )}
        />
      );
      
    default:
      console.log('Unknown visualization type:', visualization.type);
      return (
        <div className="p-4 border rounded-md bg-gray-50">
          <p className="text-gray-500">Unsupported visualization type: {visualization.type}</p>
          <pre className="mt-2 text-xs text-gray-400 overflow-auto max-h-[300px]">
            {JSON.stringify(visualization, null, 2)}
          </pre>
        </div>
      );
  }
};
