
// Re-export of the component with all its original logic, just updating the type for colorSchemes in internal functions
import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  BarChart as BarChartIcon, 
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon
} from 'lucide-react';

// Custom Chart Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-sm">
        <p className="text-sm font-medium">{label}</p>
        {payload.map((item: any, idx: number) => (
          <p key={idx} className="text-sm" style={{ color: item.color }}>
            {`${item.name}: ${typeof item.value === 'number' ? item.value.toLocaleString() : item.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Chart Component Props
interface DataChartProps {
  data: Record<string, any>[];
  type?: 'line' | 'bar' | 'area' | 'radar' | 'composed';
  xKey?: string;
  yKeys?: string[];
  height?: number;
  title?: string;
  subTitle?: string;
  statistics?: {
    min?: number;
    max?: number;
    average?: number;
    median?: number;
    topQuartile?: number;
  };
  colorScheme?: 'default' | 'purple' | 'blue' | 'green' | 'financial' | 'retention' | 'performance' | 'operational';
  visualizationId?: string;
  conversationId?: string;
  allowCustomization?: boolean;
}

interface CustomizationState {
  type: 'line' | 'bar' | 'radar' | 'area' | 'composed';
  xKey: string;
  yKeys: string[];
  colorScheme: 'default' | 'purple' | 'blue' | 'green' | 'financial' | 'retention' | 'performance' | 'operational';
  height: number;
  title?: string;
  subTitle?: string;
}

// Helper function to get chart colors from scheme
const getColorScheme = (scheme: string) => {
  const schemes = {
    default: ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe'],
    purple: ['#8884d8', '#9c62ca', '#7953c5', '#673ab7', '#5e35b1'],
    blue: ['#0088fe', '#00b0ff', '#2196f3', '#1976d2', '#0d47a1'],
    green: ['#82ca9d', '#4caf50', '#43a047', '#388e3c', '#2e7d32'],
    financial: ['#2E7D32', '#388E3C', '#43A047', '#4CAF50', '#66BB6A'],
    retention: ['#1565C0', '#1976D2', '#1E88E5', '#2196F3', '#42A5F5'],
    performance: ['#7B1FA2', '#8E24AA', '#9C27B0', '#AB47BC', '#BA68C8'],
    operational: ['#F57C00', '#FB8C00', '#FF9800', '#FFA726', '#FFB74D']
  };
  
  const selectedScheme = schemes[scheme as keyof typeof schemes] || schemes.default;
  return selectedScheme;
};

export const DataChart = ({
  data,
  type = 'bar',
  xKey = 'x',
  yKeys = ['y'],
  height = 300,
  title,
  subTitle,
  statistics,
  colorScheme = 'default',
  visualizationId,
  conversationId,
  allowCustomization = false
}: DataChartProps) => {
  const [customizeMode, setCustomizeMode] = useState(false);
  const [chartSettings, setChartSettings] = useState<CustomizationState>({
    type,
    xKey,
    yKeys,
    colorScheme,
    height,
    title,
    subTitle
  });
  
  const colors = getColorScheme(chartSettings.colorScheme);
  
  const toggleCustomizeMode = () => {
    setCustomizeMode(!customizeMode);
  };
  
  const saveChartSettings = async (newSettings: Partial<CustomizationState>) => {
    setChartSettings({ ...chartSettings, ...newSettings });
    setCustomizeMode(false);
    
    if (visualizationId && conversationId) {
      // Save settings to backend
      try {
        const response = await fetch('/api/visualizations/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId,
            visualizationId,
            settings: newSettings
          }),
        });
      } catch (error) {
        console.error('Failed to save chart settings:', error);
      }
    }
  };
  
  const renderChart = () => {
    // Common chart props
    const chartProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };
    
    switch (chartSettings.type) {
      case 'line':
        return (
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chartSettings.xKey} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {chartSettings.yKeys.map((key, i) => (
              <Line 
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i % colors.length]}
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            ))}
            {statistics?.average && (
              <Line 
                type="monotone"
                dataKey={() => statistics.average}
                stroke="#ff7300"
                strokeDasharray="5 5"
                name="Average"
                legendType="line"
              />
            )}
          </LineChart>
        );
        
      case 'bar':
        return (
          <BarChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chartSettings.xKey} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {chartSettings.yKeys.map((key, i) => (
              <Bar 
                key={key}
                dataKey={key}
                fill={colors[i % colors.length]}
                animationDuration={1500}
              />
            ))}
          </BarChart>
        );
        
      case 'area':
        return (
          <AreaChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chartSettings.xKey} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {chartSettings.yKeys.map((key, i) => (
              <Area 
                key={key}
                type="monotone"
                dataKey={key}
                fill={colors[i % colors.length]}
                stroke={colors[i % colors.length]}
                fillOpacity={0.3}
                animationDuration={1500}
              />
            ))}
          </AreaChart>
        );
        
      case 'radar':
        return (
          <RadarChart {...chartProps} outerRadius={90}>
            <PolarGrid />
            <PolarAngleAxis dataKey={chartSettings.xKey} />
            <PolarRadiusAxis />
            {chartSettings.yKeys.map((key, i) => (
              <Radar 
                key={key}
                name={key}
                dataKey={key}
                stroke={colors[i % colors.length]}
                fill={colors[i % colors.length]}
                fillOpacity={0.5}
                animationDuration={1500}
              />
            ))}
            <Legend />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        );
        
      case 'composed':
        return (
          <ComposedChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chartSettings.xKey} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {chartSettings.yKeys.map((key, i) => {
              // Alternate between bar and line for composed chart
              return i % 2 === 0 ? (
                <Bar 
                  key={key}
                  dataKey={key}
                  barSize={20}
                  fill={colors[i % colors.length]}
                  animationDuration={1500}
                />
              ) : (
                <Line 
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2}
                />
              );
            })}
          </ComposedChart>
        );
        
      default:
        return <div>Unsupported chart type</div>;
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div>
          {chartSettings.title && <CardTitle className="text-lg">{chartSettings.title}</CardTitle>}
          {chartSettings.subTitle && <p className="text-sm text-gray-500">{chartSettings.subTitle}</p>}
        </div>
        {allowCustomization && (
          <Button variant="ghost" size="sm" onClick={toggleCustomizeMode}>
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {customizeMode ? (
          <div className="space-y-4">
            <h3 className="font-medium">Customize Chart</h3>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Chart Type</label>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant={chartSettings.type === 'bar' ? 'default' : 'outline'}
                  onClick={() => setChartSettings({...chartSettings, type: 'bar'})}
                >
                  <BarChartIcon className="h-4 w-4 mr-1" /> Bar
                </Button>
                <Button 
                  size="sm" 
                  variant={chartSettings.type === 'line' ? 'default' : 'outline'}
                  onClick={() => setChartSettings({...chartSettings, type: 'line'})}
                >
                  <LineChartIcon className="h-4 w-4 mr-1" /> Line
                </Button>
                <Button 
                  size="sm" 
                  variant={chartSettings.type === 'area' ? 'default' : 'outline'}
                  onClick={() => setChartSettings({...chartSettings, type: 'area'})}
                >
                  <AreaChartIcon className="h-4 w-4 mr-1" /> Area
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium">Color Scheme</label>
              <div className="flex flex-wrap gap-2">
                {['default', 'purple', 'blue', 'green', 'financial', 'retention', 'performance', 'operational'].map((scheme) => (
                  <div 
                    key={scheme}
                    className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                      chartSettings.colorScheme === scheme ? 'border-black' : 'border-transparent'
                    }`}
                    style={{ 
                      backgroundColor: getColorScheme(scheme)[0],
                      boxShadow: chartSettings.colorScheme === scheme ? '0 0 0 2px rgba(0,0,0,0.1)' : 'none'
                    }}
                    onClick={() => setChartSettings({...chartSettings, colorScheme: scheme as any})}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setCustomizeMode(false)}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={() => saveChartSettings(chartSettings)}
              >
                Apply Changes
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', height: chartSettings.height }}>
            <ResponsiveContainer>
              {renderChart()}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
