
import { ChatVisualization, JsonObject } from "@/types/chat";

/**
 * Safely maps raw visualization data to a proper ChatVisualization object
 */
export const safeMapVisualization = (vizData: any): ChatVisualization => {
  if (!vizData || typeof vizData !== 'object') {
    return { type: 'table', data: [] };
  }
  
  const type = typeof vizData.type === 'string' ? 
    (vizData.type === 'chart' ? 'chart' : 'table') : 'table';
  
  const data = Array.isArray(vizData.data) ? vizData.data : [];
  
  const viz: ChatVisualization = { type, data };
  
  if (Array.isArray(vizData.headers)) viz.headers = vizData.headers;
  
  if (typeof vizData.chartType === 'string') {
    viz.chartType = vizData.chartType === 'bar' ? 'bar' : 'line';
  }
  
  if (typeof vizData.xKey === 'string') viz.xKey = vizData.xKey;
  
  if (Array.isArray(vizData.yKeys)) viz.yKeys = vizData.yKeys;
  
  if (typeof vizData.height === 'number') viz.height = vizData.height;
  
  return viz;
};

/**
 * Processes assistant response and extracts visualizations as JsonObjects
 */
export const processAssistantResponse = (data: any): JsonObject[] => {
  if (!data.visualizations || !Array.isArray(data.visualizations)) {
    return [];
  }
  
  return data.visualizations.map((viz: any): JsonObject => {
    const result: JsonObject = {};
    
    if (viz?.type) result.type = viz.type;
    if (Array.isArray(viz?.data)) result.data = viz.data;
    if (viz?.headers) result.headers = viz.headers;
    if (viz?.chartType) result.chartType = viz.chartType;
    if (viz?.xKey) result.xKey = viz.xKey;
    if (Array.isArray(viz?.yKeys)) result.yKeys = viz.yKeys;
    if (typeof viz?.height === 'number') result.height = viz.height;
    
    return result;
  });
};
