import { DiagramType } from "@/types/chat";

// Type definitions for visualization data structures
export interface OrgChartNode {
  id: string;
  label: string;
  role?: string;
  department?: string;
  parentId?: string | null;
  level?: number;
}

export interface FlowChartNode {
  id: string;
  label: string;
  type?: string;
  description?: string;
}

export interface FlowChartEdge {
  from: string;
  to: string;
  label?: string;
  type?: string;
}

export interface QuadrantItem {
  id: string;
  label: string;
  x: number;
  y: number;
  quadrant?: number;
}

/**
 * Detects the most appropriate visualization type based on data structure and content.
 */
export const detectVisualizationType = (
  data: Record<string, any>[],
  headers?: string[],
  title?: string
): DiagramType => {
  if (!data || data.length === 0) return 'table';
  
  // Check for organizational chart structure
  if (isOrgChartData(data)) {
    return 'orgChart';
  }
  
  // Check for flow chart structure
  if (isFlowChartData(data)) {
    return 'flowChart';
  }
  
  // Check for RACI matrix
  if (isRaciMatrixData(data, headers)) {
    return 'raciMatrix';
  }
  
  // Check for quadrant chart
  if (isQuadrantData(data, headers)) {
    return 'quadrantChart';
  }
  
  // Check for timeline/Gantt chart
  if (isTimelineData(data, headers)) {
    return 'timeline';
  }
  
  // Check for funnel diagram
  if (isFunnelData(data, headers)) {
    return 'funnel';
  }
  
  // Check for mind map
  if (isMindMapData(data)) {
    return 'mindMap';
  }
  
  // Default to normal chart detection
  if (shouldBeTable(data, headers, title)) {
    return 'table';
  }
  
  return 'chart';
};

/**
 * Determines if data represents an organizational chart structure.
 */
const isOrgChartData = (data: Record<string, any>[]): boolean => {
  // Check for typical org chart properties
  const hasOrgProperties = data.some(item => 
    (item.role || item.position || item.title) && 
    (item.reports_to || item.parentId || item.manager) &&
    (item.id || item.name)
  );
  
  // Check for hierarchical structure
  const hasHierarchy = hasHierarchicalStructure(data);
  
  return hasOrgProperties || hasHierarchy;
};

/**
 * Determines if data has a hierarchical structure.
 */
const hasHierarchicalStructure = (data: Record<string, any>[]): boolean => {
  const potentialParentKeys = ['parentId', 'parent', 'reports_to', 'manager_id', 'supervisor'];
  
  // Check if any of the potential parent keys exist
  const parentKey = potentialParentKeys.find(key => 
    data.some(item => key in item)
  );
  
  if (!parentKey) return false;
  
  // Check if there's at least one root node and some child nodes
  const hasRoot = data.some(item => !item[parentKey] || item[parentKey] === null);
  const hasChildren = data.some(item => item[parentKey] && item[parentKey] !== null);
  
  return hasRoot && hasChildren;
};

/**
 * Determines if data represents a flow chart structure.
 */
const isFlowChartData = (data: Record<string, any>[]): boolean => {
  // Check for nodes and edges structure
  if ('nodes' in data[0] && 'edges' in data[0]) {
    return true;
  }
  
  // Check for from/to structure in every item
  const hasFromToStructure = data.every(item => 
    (item.from || item.source) && (item.to || item.target)
  );
  
  // Check for step-by-step sequence words in headers
  const hasSequenceKeywords = data.some(item => {
    const keys = Object.keys(item).join(' ').toLowerCase();
    return keys.includes('step') || 
           keys.includes('sequence') || 
           keys.includes('stage') || 
           keys.includes('phase');
  });
  
  return hasFromToStructure || hasSequenceKeywords;
};

/**
 * Determines if data represents a RACI matrix.
 */
const isRaciMatrixData = (data: Record<string, any>[], headers?: string[]): boolean => {
  if (!headers || headers.length <= 1) return false;
  
  // Look for RACI letters in the data cells
  const hasRaciValues = data.some(row => {
    return Object.values(row).some(val => 
      typeof val === 'string' && /^[RAICraic]$/.test(val.toString().trim())
    );
  });
  
  // Check for 'Responsible', 'Accountable', 'Consulted', 'Informed' in headers or values
  const raciTerms = ['responsible', 'accountable', 'consulted', 'informed', 'raci'];
  const titleHasRaci = headers.some(header => 
    raciTerms.some(term => header.toLowerCase().includes(term))
  );
  
  return hasRaciValues || titleHasRaci;
};

/**
 * Determines if data represents a quadrant chart.
 */
const isQuadrantData = (data: Record<string, any>[], headers?: string[]): boolean => {
  if (!headers || headers.length <= 1) return false;
  
  // Look for x/y or two-axis coordinates
  const hasCoordinates = data.every(item => 
    (typeof item.x === 'number' && typeof item.y === 'number') ||
    (typeof item.x_value === 'number' && typeof item.y_value === 'number') ||
    (typeof item.x_axis === 'number' && typeof item.y_axis === 'number')
  );
  
  // Look for quadrant terms in headers
  const quadrantTerms = ['quadrant', 'matrix', 'grid', 'priority', 'impact', 'effort', 'risk', 'value'];
  const headersHaveQuadrantTerms = headers.some(header => 
    quadrantTerms.some(term => header.toLowerCase().includes(term))
  );
  
  return hasCoordinates || headersHaveQuadrantTerms;
};

/**
 * Determines if data represents a timeline or Gantt chart.
 */
const isTimelineData = (data: Record<string, any>[], headers?: string[]): boolean => {
  if (!headers) return false;
  
  // Check for date/time columns
  const dateHeaders = headers.filter(header => 
    header.toLowerCase().includes('date') || 
    header.toLowerCase().includes('time') ||
    header.toLowerCase().includes('start') ||
    header.toLowerCase().includes('end') ||
    header.toLowerCase().includes('deadline')
  );
  
  if (dateHeaders.length >= 1) {
    // Verify that these columns actually contain date-like values
    const hasDateValues = data.some(row => {
      return dateHeaders.some(header => {
        const value = row[header];
        if (!value) return false;
        
        // Check if it's a date string or timestamp
        return (
          (typeof value === 'string' && /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(value)) || // Date format
          (typeof value === 'number' && value > 1000000000) // Timestamp
        );
      });
    });
    
    return hasDateValues;
  }
  
  return false;
};

/**
 * Determines if data represents a funnel diagram.
 */
const isFunnelData = (data: Record<string, any>[], headers?: string[]): boolean => {
  if (!headers || headers.length <= 1) return false;
  
  // Check for funnel-related terms in headers or title
  const funnelTerms = ['funnel', 'conversion', 'stage', 'lead', 'prospect', 'customer', 'sale'];
  const hasFunnelTerms = headers.some(header => 
    funnelTerms.some(term => header.toLowerCase().includes(term))
  );
  
  // Check for decreasing values pattern (typical in funnels)
  if (headers.length >= 2) {
    const valueHeader = headers.find(header => 
      header.toLowerCase().includes('value') || 
      header.toLowerCase().includes('count') || 
      header.toLowerCase().includes('number')
    );
    
    if (valueHeader) {
      const values = data.map(row => parseFloat(row[valueHeader].toString()));
      const isDecreasing = values.every((val, i) => i === 0 || val <= values[i-1]);
      
      if (isDecreasing && values[0] > values[values.length - 1]) {
        return true;
      }
    }
  }
  
  return hasFunnelTerms;
};

/**
 * Determines if data represents a mind map structure.
 */
const isMindMapData = (data: Record<string, any>[]): boolean => {
  // Check for central/root node with branches
  const hasCentralNode = data.some(item => 
    item.central || item.root || item.isRoot || item.level === 0
  );
  
  // Check for parent/child relationships
  const hasParentChildRelationships = data.some(item => 
    item.parent || item.parentId || item.children || item.branches
  );
  
  return hasCentralNode || hasParentChildRelationships;
};

/**
 * Determines if data should be displayed as a table.
 */
const shouldBeTable = (data: Record<string, any>[], headers?: string[], title?: string): boolean => {
  if (!headers || headers.length <= 1) return true;
  
  // Check if we have a lot of text columns and few numeric columns
  if (headers.length > 2) {
    const numericColumns = headers.filter(header => 
      data.some(row => typeof row[header] === 'number' || 
                      (typeof row[header] === 'string' && !isNaN(parseFloat(row[header]))))
    );
    
    // If we have more text columns than numeric, it's probably a table
    if (numericColumns.length < headers.length - numericColumns.length) {
      return true;
    }
  }
  
  return false;
};

/**
 * Converts data to appropriate structure for the detected visualization type.
 */
export const formatDataForVisualization = (
  data: Record<string, any>[],
  visualizationType: DiagramType,
  headers?: string[]
): Record<string, any> => {
  switch (visualizationType) {
    case 'orgChart':
      return formatOrgChartData(data);
    case 'flowChart':
      return formatFlowChartData(data);
    case 'quadrantChart':
      return formatQuadrantData(data, headers);
    case 'raciMatrix':
      return formatRaciData(data, headers);
    case 'timeline':
      return formatTimelineData(data, headers);
    case 'funnel':
      return formatFunnelData(data, headers);
    case 'mindMap':
      return formatMindMapData(data);
    default:
      return { data, headers };
  }
};

/**
 * Formats data for organizational chart visualization.
 */
const formatOrgChartData = (data: Record<string, any>[]): Record<string, any> => {
  // Identify the key fields
  const nodeIdKey = findKeyByPriority(data[0], ['id', 'nodeId', 'employeeId', 'name']);
  const nodeLabelKey = findKeyByPriority(data[0], ['name', 'employee', 'label', 'title', 'position']);
  const nodeRoleKey = findKeyByPriority(data[0], ['role', 'title', 'position', 'job']);
  const nodeParentKey = findKeyByPriority(data[0], ['parentId', 'managerId', 'reports_to', 'supervisor', 'parent']);
  
  // Create formatted nodes
  const nodes = data.map(item => ({
    id: item[nodeIdKey] || crypto.randomUUID().slice(0, 8),
    label: item[nodeLabelKey] || 'Unnamed',
    role: item[nodeRoleKey] || '',
    parentId: item[nodeParentKey] || null
  }));
  
  // Identify root nodes (those without parents or with null parents)
  const rootNodes = nodes.filter(node => !node.parentId);
  
  // If no explicit root, create one
  if (rootNodes.length === 0 && nodes.length > 0) {
    // Find the node that's a parent to most other nodes
    const parentCounts = new Map<string, number>();
    nodes.forEach(node => {
      if (node.parentId) {
        parentCounts.set(node.parentId, (parentCounts.get(node.parentId) || 0) + 1);
      }
    });
    
    let mostLikelyRoot = nodes[0].id;
    let maxCount = 0;
    
    parentCounts.forEach((count, id) => {
      if (count > maxCount) {
        maxCount = count;
        mostLikelyRoot = id;
      }
    });
    
    // Find the node with this ID and mark it as root
    const rootNode = nodes.find(node => node.id === mostLikelyRoot);
    if (rootNode) {
      rootNode.parentId = null;
    }
  }
  
  return { 
    nodes,
    type: 'orgChart'
  };
};

/**
 * Formats data for flow chart visualization.
 */
const formatFlowChartData = (data: Record<string, any>[]): Record<string, any> => {
  // Check if data is already in nodes/edges format
  if (data.length === 1 && data[0].nodes && data[0].edges) {
    return {
      nodes: data[0].nodes,
      edges: data[0].edges,
      type: 'flowChart'
    };
  }
  
  // Otherwise, convert from a list of connections
  const nodes = new Map<string, FlowChartNode>();
  const edges: FlowChartEdge[] = [];
  
  // Identify the key fields
  const fromKey = findKeyByPriority(data[0], ['from', 'source', 'start', 'step', 'id']);
  const toKey = findKeyByPriority(data[0], ['to', 'target', 'end', 'next_step']);
  const labelKey = findKeyByPriority(data[0], ['label', 'description', 'name', 'action']);
  
  data.forEach(item => {
    const fromId = item[fromKey]?.toString() || '';
    const toId = item[toKey]?.toString() || '';
    
    if (fromId && toId) {
      // Add nodes if they don't exist
      if (!nodes.has(fromId)) {
        nodes.set(fromId, {
          id: fromId,
          label: item[`${fromKey}_label`] || item[`${fromKey}_name`] || fromId
        });
      }
      
      if (!nodes.has(toId)) {
        nodes.set(toId, {
          id: toId,
          label: item[`${toKey}_label`] || item[`${toKey}_name`] || toId
        });
      }
      
      // Add edge
      edges.push({
        from: fromId,
        to: toId,
        label: item[labelKey] || ''
      });
    }
  });
  
  return {
    nodes: Array.from(nodes.values()),
    edges,
    type: 'flowChart'
  };
};

/**
 * Formats data for quadrant chart visualization.
 */
const formatQuadrantData = (data: Record<string, any>[], headers?: string[]): Record<string, any> => {
  if (!headers) return { data, type: 'quadrantChart' };
  
  // Identify the key fields
  const itemKey = findKeyByPriority(headers, ['item', 'name', 'label', 'initiative', 'project', 'task']);
  const xKey = findKeyByPriority(headers, ['x', 'x_value', 'x_axis', 'horizontal', 'impact', 'value']);
  const yKey = findKeyByPriority(headers, ['y', 'y_value', 'y_axis', 'vertical', 'effort', 'cost', 'difficulty']);
  
  const items: QuadrantItem[] = data.map((row, index) => {
    // Extract values, defaulting to index-based position if not found
    const label = row[itemKey] || `Item ${index + 1}`;
    let x = parseFloat(row[xKey]);
    let y = parseFloat(row[yKey]);
    
    // Default values if parsing fails
    if (isNaN(x)) x = Math.random() * 100;
    if (isNaN(y)) y = Math.random() * 100;
    
    // Determine quadrant (1: top-right, 2: top-left, 3: bottom-left, 4: bottom-right)
    const quadrant = (x >= 50 && y >= 50) ? 1 : 
                     (x < 50 && y >= 50) ? 2 : 
                     (x < 50 && y < 50) ? 3 : 4;
    
    return {
      id: row.id || `item-${index}`,
      label,
      x,
      y,
      quadrant
    };
  });
  
  return {
    items,
    xAxisLabel: xKey,
    yAxisLabel: yKey,
    type: 'quadrantChart'
  };
};

/**
 * Formats data for RACI matrix visualization.
 */
const formatRaciData = (data: Record<string, any>[], headers?: string[]): Record<string, any> => {
  if (!headers) return { data, type: 'raciMatrix' };
  
  // Assume first column is activity/task
  const taskColumn = headers[0];
  const roleColumns = headers.slice(1);
  
  // Convert to RACI format
  const raciData = data.map(row => {
    const task = row[taskColumn];
    const roles: Record<string, string> = {};
    
    roleColumns.forEach(role => {
      const value = row[role];
      if (value) {
        roles[role] = value.toString().toUpperCase();
      }
    });
    
    return { task, roles };
  });
  
  return {
    tasks: raciData,
    roles: roleColumns,
    type: 'raciMatrix'
  };
};

/**
 * Formats data for timeline visualization.
 */
const formatTimelineData = (data: Record<string, any>[], headers?: string[]): Record<string, any> => {
  if (!headers) return { data, type: 'timeline' };
  
  // Identify key fields
  const taskKey = findKeyByPriority(headers, ['task', 'activity', 'project', 'name', 'description']);
  const startKey = findKeyByPriority(headers, ['start', 'start_date', 'begin', 'from']);
  const endKey = findKeyByPriority(headers, ['end', 'end_date', 'due', 'deadline', 'to']);
  
  // Format timeline data
  const timelineItems = data.map((row, index) => {
    const task = row[taskKey] || `Task ${index + 1}`;
    const start = row[startKey] || null;
    const end = row[endKey] || null;
    
    return {
      id: row.id || `task-${index}`,
      task,
      start,
      end
    };
  });
  
  return {
    items: timelineItems,
    type: 'timeline'
  };
};

/**
 * Formats data for funnel visualization.
 */
const formatFunnelData = (data: Record<string, any>[], headers?: string[]): Record<string, any> => {
  if (!headers) return { data, type: 'funnel' };
  
  // Identify key fields
  const stageKey = findKeyByPriority(headers, ['stage', 'step', 'phase', 'name', 'level']);
  const valueKey = findKeyByPriority(headers, ['value', 'count', 'number', 'quantity', 'users', 'customers']);
  
  // Format funnel data
  const funnelStages = data.map((row, index) => {
    const stage = row[stageKey] || `Stage ${index + 1}`;
    const value = parseFloat(row[valueKey]) || 0;
    
    return {
      stage,
      value
    };
  });
  
  return {
    stages: funnelStages,
    type: 'funnel'
  };
};

/**
 * Formats data for mind map visualization.
 */
const formatMindMapData = (data: Record<string, any>[]): Record<string, any> => {
  // Identify key fields
  const idKey = findKeyByPriority(data[0], ['id', 'nodeId']);
  const textKey = findKeyByPriority(data[0], ['text', 'label', 'name', 'content']);
  const parentKey = findKeyByPriority(data[0], ['parentId', 'parent']);
  
  // Find the root node
  const rootNode = data.find(item => 
    item.isRoot || 
    item.root || 
    item.level === 0 || 
    !item[parentKey]
  );
  
  const formatNode = (node: Record<string, any>) => {
    return {
      id: node[idKey] || crypto.randomUUID().slice(0, 8),
      text: node[textKey] || 'Unnamed',
      children: data
        .filter(item => item[parentKey] === node[idKey])
        .map(formatNode)
    };
  };
  
  const rootData = rootNode ? formatNode(rootNode) : {
    id: 'root',
    text: 'Central Topic',
    children: data.map(item => ({
      id: item[idKey] || crypto.randomUUID().slice(0, 8),
      text: item[textKey] || 'Unnamed',
      children: []
    }))
  };
  
  return {
    root: rootData,
    type: 'mindMap'
  };
};

/**
 * Helper function to find a key in an object by priority list
 */
const findKeyByPriority = (obj: Record<string, any>, priorityList: string[]): string => {
  if (!obj) return '';
  
  for (const key of priorityList) {
    if (key in obj) {
      return key;
    }
  }
  
  // If no key from the priority list is found, return the first key
  const keys = Object.keys(obj);
  return keys.length > 0 ? keys[0] : '';
};
