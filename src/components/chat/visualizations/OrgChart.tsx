
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Node,
  Edge,
  Position,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Panel,
  ReactFlow as ReactFlowComponent
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface OrgChartProps {
  nodes: Array<{
    id: string;
    label: string;
    role?: string;
    department?: string;
    parentId?: string | null;
    level?: number;
  }>;
  title?: string;
  colorScheme?: 'default' | 'financial' | 'retention' | 'performance' | 'operational';
}

// Custom node component for org chart
const OrgChartNode = ({ data }: { data: any }) => {
  return (
    <div className={`px-4 py-3 shadow-md rounded-md border border-gray-200 bg-white ${data.isRoot ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="font-bold text-sm text-gray-800">{data.label}</div>
      {data.role && data.role !== data.label && <div className="text-xs text-gray-500">{data.role}</div>}
      {data.department && <div className="text-xs italic text-gray-400">{data.department}</div>}
    </div>
  );
};

// Define node types
const nodeTypes = {
  orgNode: OrgChartNode,
};

export const OrgChart = ({ nodes, title, colorScheme = 'default' }: OrgChartProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState([]);
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Process nodes to ensure all have unique IDs
  const processedNodes = React.useMemo(() => {
    if (!nodes || nodes.length === 0) return [];
    
    // Make sure nodes have unique IDs
    const uniqueNodes = Array.from(new Map(nodes.map(node => [node.id, node])).values());
    
    // Filter out nodes with invalid parentId references
    const validNodeIds = new Set(uniqueNodes.map(node => node.id));
    return uniqueNodes.map(node => ({
      ...node,
      parentId: node.parentId && validNodeIds.has(node.parentId) ? node.parentId : null
    }));
  }, [nodes]);

  // Calculate layout based on hierarchical structure
  useEffect(() => {
    if (!processedNodes || processedNodes.length === 0) return;

    // Create a map for quick lookup
    const nodeMap = new Map(processedNodes.map(node => [node.id, node]));
    
    // Find root nodes (those without parents or with null parents)
    const rootNodes = processedNodes.filter(node => !node.parentId);
    
    if (rootNodes.length === 0) {
      console.error("No root nodes found in org chart data");
      return;
    }

    // Calculate levels for each node using BFS
    const nodeWithLevels = [...processedNodes].map(node => ({...node, level: 0})); // Initialize all with level 0
    const queue = rootNodes.map(node => ({ ...node, level: 0 }));
    const processed = new Set<string>();
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      processed.add(current.id);
      
      // Find all children of this node
      const children = processedNodes.filter(node => node.parentId === current.id);
      
      for (const child of children) {
        if (!processed.has(child.id)) {
          const childIndex = nodeWithLevels.findIndex(n => n.id === child.id);
          if (childIndex >= 0) {
            nodeWithLevels[childIndex].level = (current.level || 0) + 1;
          }
          queue.push({...child, level: (current.level || 0) + 1});
        }
      }
    }
    
    // Group nodes by level for horizontal positioning
    const nodesByLevel = new Map<number, any[]>();
    nodeWithLevels.forEach(node => {
      const level = node.level || 0;
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)!.push(node);
    });

    // Calculate and set node positions based on levels
    const reactFlowNodesData: Node[] = [];
    const nodeWidth = 180;
    const nodeHeight = 80;
    const levelHeight = 150;
    const horizontalSpacing = 220;

    nodesByLevel.forEach((levelNodes, level) => {
      const levelWidth = levelNodes.length * horizontalSpacing;
      const startX = -(levelWidth / 2) + (horizontalSpacing / 2);
      
      levelNodes.forEach((node, index) => {
        const xPos = startX + (index * horizontalSpacing);
        const yPos = level * levelHeight;
        
        reactFlowNodesData.push({
          id: node.id,
          type: 'orgNode',
          position: { x: xPos, y: yPos },
          data: { 
            label: node.label,
            role: node.role,
            department: node.department,
            isRoot: level === 0
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });
      });
    });

    // Create edges
    const edges: Edge[] = [];
    processedNodes.forEach(node => {
      if (node.parentId) {
        edges.push({
          id: `${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          type: 'smoothstep',
          animated: false,
        });
      }
    });

    setNodes(reactFlowNodesData);
    setEdges(edges);
  }, [processedNodes, setNodes, setEdges]);
  
  // Fit view after nodes are rendered
  useLayoutEffect(() => {
    if (reactFlowInstance && reactFlowNodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 50);
    }
  }, [reactFlowInstance, reactFlowNodes.length]);

  const getColorClassByScheme = () => {
    switch (colorScheme) {
      case 'financial': return 'bg-green-50 border-green-100';
      case 'retention': return 'bg-blue-50 border-blue-100';
      case 'performance': return 'bg-purple-50 border-purple-100';
      case 'operational': return 'bg-amber-50 border-amber-100';
      default: return 'bg-gray-50 border-gray-100';
    }
  };

  // If no valid nodes, display an error message
  if (!nodes || nodes.length === 0) {
    return (
      <Card className="my-4 bg-red-50 border-red-100">
        <CardHeader className="py-3">
          <CardTitle className="text-lg font-medium text-red-700">
            {title || "Organization Chart Error"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-3">
          <p className="text-red-600">Unable to render organization chart: No valid data provided.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`my-4 ${getColorClassByScheme()}`}>
      {title && (
        <CardHeader className="py-3">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div style={{ height: 500 }} ref={reactFlowWrapper}>
          <ReactFlowProvider>
            <ReactFlowComponent
              nodes={reactFlowNodes}
              edges={reactFlowEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onInit={setReactFlowInstance}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-right"
            >
              <Panel position="bottom-center">
                <div className="text-xs text-gray-500">
                  {processedNodes.length} members • {reactFlowEdges.length} connections
                </div>
              </Panel>
            </ReactFlowComponent>
          </ReactFlowProvider>
        </div>
      </CardContent>
    </Card>
  );
};
