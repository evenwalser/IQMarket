
import React, { useCallback, useEffect } from 'react';
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
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface FlowChartProps {
  flowData: {
    nodes: Array<{id: string; label: string; [key: string]: any}>;
    edges: Array<{from: string; to: string; [key: string]: any}>;
    title?: string;
    [key: string]: any;
  };
  height?: number;
  title?: string; // Add title property to the interface
}

export const FlowChartRenderer: React.FC<FlowChartProps> = ({ 
  flowData, 
  height = 400,
  title
}) => {
  console.log("FlowChart rendering with data:", flowData);

  // Get title from either the direct prop or from flowData
  const chartTitle = title || flowData.title;

  // Transform nodes data to React Flow format
  const initialNodes: Node[] = flowData.nodes.map((node) => ({
    id: node.id,
    data: { label: node.label },
    position: node.position || { x: 0, y: 0 },
    style: {
      background: '#f0f4f8',
      border: '1px solid #d0d7de',
      borderRadius: '12px',
      padding: '16px',
      width: node.width || 'auto',
      minWidth: '180px',
      textAlign: 'center',
      fontSize: '15px',
      fontWeight: 500,
      color: '#1e293b',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    },
    ...node,
  }));

  // Auto-position nodes if positions aren't provided
  const positionedNodes = autoLayoutNodes(initialNodes);

  // Transform edges data to React Flow format - handle both 'from/to' and 'source/target' formats
  const initialEdges: Edge[] = flowData.edges.map((edge, index) => ({
    id: `e${index}`,
    source: edge.from || edge.source,
    target: edge.to || edge.target,
    type: 'smoothstep',
    animated: edge.animated || false,
    style: {
      stroke: '#94a3b8',
      strokeWidth: 2,
    },
    labelStyle: {
      fontSize: '12px',
      fontWeight: 500,
      fill: '#64748b',
      background: 'white',
      padding: '4px 8px',
      borderRadius: '4px',
    },
    label: edge.label,
    ...edge,
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(positionedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Log what's being rendered
  useEffect(() => {
    console.log("Rendering flow chart with nodes:", nodes);
    console.log("Rendering flow chart with edges:", edges);
  }, [nodes, edges]);

  return (
    <div style={{ height: `${height}px`, width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
      {chartTitle && (
        <div className="text-center font-medium text-gray-800 p-3 border-b bg-gray-50">{chartTitle}</div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-right"
        style={{ background: 'white' }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#94a3b8', strokeWidth: 2 },
        }}
      >
        <Controls className="shadow-md rounded-md" />
        <MiniMap 
          nodeStrokeWidth={3}
          nodeColor="#8b5cf6"
          nodeBorderRadius={8}
          maskColor="rgba(240, 242, 245, 0.7)"
        />
        <Background color="#f1f5f9" gap={16} variant={BackgroundVariant.Dots} />
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
    if (node.position && (node.position.x !== 0 || node.position.y !== 0)) {
      return node; // Keep original position if it's already meaningful
    }
    
    const isHorizontal = nodeCount <= 5;
    
    if (isHorizontal) {
      // Horizontal layout with more spacing
      return {
        ...node,
        position: { 
          x: 100 + index * 220, 
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
          x: 100 + col * 280, 
          y: 100 + row * 180 
        }
      };
    }
  });
};
