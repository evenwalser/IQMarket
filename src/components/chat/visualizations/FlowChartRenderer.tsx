
import React, { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface FlowChartProps {
  flowData: {
    title?: string;
    nodes: Array<{id: string; label: string; [key: string]: any}>;
    edges: Array<{from: string; to: string; [key: string]: any}>;
    [key: string]: any;
  };
  height?: number;
}

export const FlowChartRenderer: React.FC<FlowChartProps> = ({ 
  flowData, 
  height = 400 
}) => {
  // Transform nodes data to React Flow format
  const initialNodes: Node[] = flowData.nodes.map((node) => ({
    id: node.id,
    data: { label: node.label },
    position: node.position || { x: 0, y: 0 },
    style: {
      background: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      padding: '10px',
      width: 'auto',
      minWidth: '120px',
      textAlign: 'center',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#495057',
    },
    ...node,
  }));

  // Auto-position nodes if positions aren't provided
  const positionedNodes = autoLayoutNodes(initialNodes);

  // Transform edges data to React Flow format
  const initialEdges: Edge[] = flowData.edges.map((edge, index) => ({
    id: `e${index}`,
    source: edge.from,
    target: edge.to,
    type: 'smoothstep',
    animated: edge.animated || false,
    style: {
      stroke: '#6c757d',
      strokeWidth: 2,
    },
    ...edge,
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(positionedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      {flowData.title && (
        <div className="text-center font-medium mb-2">{flowData.title}</div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        attributionPosition="bottom-right"
        style={{ background: 'white', borderRadius: '8px' }}
      >
        <Controls />
        <MiniMap />
        <Background color="#f8f9fa" gap={16} />
      </ReactFlow>
    </div>
  );
};

// Helper function to auto-layout nodes if positions aren't provided
const autoLayoutNodes = (nodes: Node[]): Node[] => {
  const nodeCount = nodes.length;
  if (nodeCount === 0) return nodes;
  
  // Simple horizontal or vertical layout based on node count
  return nodes.map((node, index) => {
    if (node.position && node.position.x !== 0 && node.position.y !== 0) {
      return node; // Keep original position if it's already meaningful
    }
    
    const isHorizontal = nodeCount <= 5;
    
    if (isHorizontal) {
      // Horizontal layout
      return {
        ...node,
        position: { 
          x: 100 + index * 200, 
          y: 100 
        }
      };
    } else {
      // Grid layout for more nodes
      const cols = Math.ceil(Math.sqrt(nodeCount));
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      return {
        ...node,
        position: { 
          x: 100 + col * 250, 
          y: 100 + row * 150 
        }
      };
    }
  });
};
