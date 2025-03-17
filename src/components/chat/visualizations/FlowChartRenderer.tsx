
import { useEffect, useState } from 'react';
import { 
  ReactFlow, 
  Node, 
  Edge, 
  Controls, 
  Background, 
  Panel, 
  useNodesState, 
  useEdgesState 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface FlowData {
  title?: string;
  nodes: {
    id: string;
    label: string;
    [key: string]: any;
  }[];
  edges: {
    from: string;
    to: string;
    label?: string;
    [key: string]: any;
  }[];
}

interface FlowChartRendererProps {
  flowData: FlowData;
  height?: number;
}

// Convert from our format to ReactFlow format
const convertToReactFlowFormat = (flowData: FlowData) => {
  // Create nodes with positions
  const nodes: Node[] = flowData.nodes.map((node, index) => {
    // Simple layout algorithm - arrange in grid
    const row = Math.floor(index / 3);
    const col = index % 3;
    
    return {
      id: node.id,
      data: { label: node.label },
      position: { x: col * 200 + 50, y: row * 150 + 50 },
      style: {
        background: '#f0f9ff',
        border: '1px solid #94a3b8',
        borderRadius: '8px',
        padding: '10px',
        width: 150,
      },
    };
  });

  // Create edges
  const edges: Edge[] = flowData.edges.map((edge, index) => ({
    id: `e${index}`,
    source: edge.from,
    target: edge.to,
    label: edge.label,
    animated: false,
    style: { stroke: '#64748b' },
  }));

  return { nodes, edges };
};

export const FlowChartRenderer: React.FC<FlowChartRendererProps> = ({ 
  flowData,
  height = 400 
}) => {
  const [initialNodes, setInitialNodes] = useState<Node[]>([]);
  const [initialEdges, setInitialEdges] = useState<Edge[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (flowData) {
      try {
        const { nodes: convertedNodes, edges: convertedEdges } = convertToReactFlowFormat(flowData);
        setInitialNodes(convertedNodes);
        setInitialEdges(convertedEdges);
        setNodes(convertedNodes);
        setEdges(convertedEdges);
      } catch (error) {
        console.error('Error converting flow data:', error);
      }
    }
  }, [flowData, setNodes, setEdges]);

  if (!flowData || !flowData.nodes || !flowData.edges) {
    return <div className="p-4 text-red-500">Invalid flow chart data</div>;
  }

  return (
    <div className="w-full rounded-lg border border-gray-200 overflow-hidden" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Controls />
        <Background color="#f1f5f9" gap={16} />
        {flowData.title && (
          <Panel position="top-center">
            <div className="bg-white p-2 rounded shadow text-sm font-medium">
              {flowData.title}
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};
