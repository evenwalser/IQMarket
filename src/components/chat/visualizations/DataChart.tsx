
import { useState } from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Label,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import { ChartCustomizer } from './ChartCustomizer';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DataChartProps {
  data: Record<string, any>[];
  type: 'line' | 'bar' | 'radar' | 'area' | 'composed';
  xKey: string;
  yKeys: string[];
  height?: number;
  title?: string;
  subTitle?: string;
  benchmarks?: {
    bottomQuartile?: number;
    median?: number;
    topQuartile?: number;
  };
  colorScheme?: 'default' | 'purple' | 'blue' | 'green';
  visualizationId?: string;
  conversationId?: string;
  allowCustomization?: boolean;
}

interface ChartSettings {
  chartType: 'line' | 'bar' | 'radar' | 'area' | 'composed';
  xKey: string;
  yKeys: string[];
  colorScheme: 'default' | 'purple' | 'blue' | 'green';
  height: number;
  title?: string;
  subTitle?: string;
}

const getColorsByScheme = (scheme: string, index: number = 0) => {
  const schemes = {
    default: ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe'],
    purple: ['#8884d8', '#9c62ca', '#7953c5', '#673ab7', '#5e35b1'],
    blue: ['#0088fe', '#00b0ff', '#2196f3', '#1976d2', '#0d47a1'],
    green: ['#82ca9d', '#4caf50', '#43a047', '#388e3c', '#2e7d32']
  };
  
  const selectedScheme = schemes[scheme as keyof typeof schemes] || schemes.default;
  return selectedScheme[index % selectedScheme.length];
};

export const DataChart = ({ 
  data, 
  type, 
  xKey, 
  yKeys, 
  height = 300, 
  title,
  subTitle,
  benchmarks,
  colorScheme = 'default',
  visualizationId,
  conversationId,
  allowCustomization = false
}: DataChartProps) => {
  const [chartSettings, setChartSettings] = useState<ChartSettings>({
    chartType: type,
    xKey: xKey,
    yKeys: yKeys,
    colorScheme: colorScheme,
    height: height,
    title: title,
    subTitle: subTitle
  });
  
  const [isCustomized, setIsCustomized] = useState(false);

  if (!data || data.length === 0) return null;

  const colors = {
    bottomQuartile: '#FF6B6B',
    median: '#4ECDC4',
    topQuartile: '#45B7D1',
    grid: '#e0e0e0'
  };

  // For horizontal bar chart (when yKeys includes category)
  const isHorizontalBar = chartSettings.chartType === 'bar' && chartSettings.yKeys.includes('category');

  const handleSettingsChange = (newSettings: ChartSettings) => {
    setChartSettings(newSettings);
  };

  const handleSaveSettings = async () => {
    setIsCustomized(true);
    
    // If we have conversation ID and visualization ID, save to database
    if (conversationId && visualizationId) {
      try {
        // Get current visualizations
        const { data: conversationData, error: fetchError } = await supabase
          .from('conversations')
          .select('visualizations')
          .eq('id', conversationId)
          .single();
        
        if (fetchError) throw fetchError;
        
        if (conversationData?.visualizations) {
          // Find and update the specific visualization
          const updatedVisualizations = conversationData.visualizations.map((viz: any) => {
            if (viz.id === visualizationId) {
              return {
                ...viz,
                userSettings: {
                  chartType: chartSettings.chartType,
                  xKey: chartSettings.xKey,
                  yKeys: chartSettings.yKeys,
                  colorScheme: chartSettings.colorScheme,
                  height: chartSettings.height,
                  title: chartSettings.title,
                  subTitle: chartSettings.subTitle
                }
              };
            }
            return viz;
          });
          
          // Update in database
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ visualizations: updatedVisualizations })
            .eq('id', conversationId);
          
          if (updateError) throw updateError;
        }
      } catch (error) {
        console.error('Error saving chart settings:', error);
        toast.error('Failed to save chart settings');
      }
    }
  };

  const handleResetSettings = async () => {
    // Reset to original settings
    setChartSettings({
      chartType: type,
      xKey: xKey,
      yKeys: yKeys,
      colorScheme: colorScheme,
      height: height,
      title: title,
      subTitle: subTitle
    });
    
    setIsCustomized(false);
    
    // If we have conversation ID and visualization ID, remove user settings from database
    if (conversationId && visualizationId) {
      try {
        // Get current visualizations
        const { data: conversationData, error: fetchError } = await supabase
          .from('conversations')
          .select('visualizations')
          .eq('id', conversationId)
          .single();
        
        if (fetchError) throw fetchError;
        
        if (conversationData?.visualizations) {
          // Find and update the specific visualization
          const updatedVisualizations = conversationData.visualizations.map((viz: any) => {
            if (viz.id === visualizationId) {
              // Remove userSettings
              const { userSettings, ...rest } = viz;
              return rest;
            }
            return viz;
          });
          
          // Update in database
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ visualizations: updatedVisualizations })
            .eq('id', conversationId);
          
          if (updateError) throw updateError;
        }
      } catch (error) {
        console.error('Error resetting chart settings:', error);
        toast.error('Failed to reset chart settings');
      }
    }
  };

  const chartTitle = (
    <>
      {chartSettings.title && <h3 className="text-lg font-semibold text-gray-800 mb-1 text-center">{chartSettings.title}</h3>}
      {chartSettings.subTitle && <p className="text-sm text-gray-500 mb-4 text-center">{chartSettings.subTitle}</p>}
    </>
  );

  if (isHorizontalBar) {
    return (
      <div className="my-4 p-6 bg-white rounded-lg shadow-sm mx-auto max-w-4xl">
        {allowCustomization && (
          <div className="flex justify-end">
            <ChartCustomizer
              data={data}
              initialSettings={{
                chartType: type,
                xKey: xKey,
                yKeys: yKeys,
                colorScheme: colorScheme,
                height: height,
                title: title,
                subTitle: subTitle
              }}
              onSettingsChange={handleSettingsChange}
              onSave={handleSaveSettings}
              onReset={handleResetSettings}
            />
          </div>
        )}
        {chartTitle}
        <ResponsiveContainer width="100%" height={Math.max(chartSettings.height, data.length * 50)}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{
              top: 20,
              right: 40,
              left: 160,
              bottom: 40,
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={colors.grid}
              horizontal={true}
              vertical={true}
            />
            <XAxis 
              type="number" 
              domain={[70, 100]}
              tickFormatter={(value) => `${value}%`}
              style={{
                fontSize: '12px',
                fontFamily: 'system-ui'
              }}
            >
              <Label 
                value="Gross Revenue Retention" 
                position="bottom" 
                offset={20}
                style={{
                  textAnchor: 'middle',
                  fontSize: '14px',
                  fill: '#666',
                  fontFamily: 'system-ui'
                }}
              />
            </XAxis>
            <YAxis 
              dataKey="category" 
              type="category"
              width={150}
              style={{
                fontSize: '12px',
                fontFamily: 'system-ui'
              }}
            />
            <Tooltip 
              formatter={(value) => [`${value}%`, 'GRR']}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                border: '1px solid #f0f0f0',
                borderRadius: '6px',
                padding: '8px 12px'
              }}
            />
            <Bar 
              dataKey="value" 
              fill={getColorsByScheme(chartSettings.colorScheme)}
              radius={[0, 4, 4, 0]}
              barSize={24}
            />
            {benchmarks?.bottomQuartile && (
              <ReferenceLine 
                x={benchmarks.bottomQuartile} 
                stroke={colors.bottomQuartile}
                strokeDasharray="3 3" 
                label={{ 
                  value: "Bottom Quartile",
                  position: 'top',
                  fill: colors.bottomQuartile,
                  fontSize: 12
                }}
              />
            )}
            {benchmarks?.median && (
              <ReferenceLine 
                x={benchmarks.median} 
                stroke={colors.median}
                strokeDasharray="3 3" 
                label={{ 
                  value: "Median",
                  position: 'top',
                  fill: colors.median,
                  fontSize: 12
                }}
              />
            )}
            {benchmarks?.topQuartile && (
              <ReferenceLine 
                x={benchmarks.topQuartile} 
                stroke={colors.topQuartile}
                strokeDasharray="3 3" 
                label={{ 
                  value: "Top Quartile",
                  position: 'top',
                  fill: colors.topQuartile,
                  fontSize: 12
                }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartSettings.chartType === 'radar') {
    return (
      <div className="my-4 p-6 bg-white rounded-lg shadow-sm mx-auto max-w-4xl">
        {allowCustomization && (
          <div className="flex justify-end">
            <ChartCustomizer
              data={data}
              initialSettings={{
                chartType: type,
                xKey: xKey,
                yKeys: yKeys,
                colorScheme: colorScheme,
                height: height,
                title: title,
                subTitle: subTitle
              }}
              onSettingsChange={handleSettingsChange}
              onSave={handleSaveSettings}
              onReset={handleResetSettings}
            />
          </div>
        )}
        {chartTitle}
        <ResponsiveContainer width="100%" height={chartSettings.height}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke={colors.grid} />
            <PolarAngleAxis dataKey={chartSettings.xKey} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            {chartSettings.yKeys.map((key, index) => (
              <Radar
                key={key}
                name={key}
                dataKey={key}
                stroke={getColorsByScheme(chartSettings.colorScheme, index)}
                fill={getColorsByScheme(chartSettings.colorScheme, index)}
                fillOpacity={0.6}
              />
            ))}
            <Tooltip />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartSettings.chartType === 'area') {
    return (
      <div className="my-4 p-6 bg-white rounded-lg shadow-sm mx-auto max-w-4xl">
        {allowCustomization && (
          <div className="flex justify-end">
            <ChartCustomizer
              data={data}
              initialSettings={{
                chartType: type,
                xKey: xKey,
                yKeys: yKeys,
                colorScheme: colorScheme,
                height: height,
                title: title,
                subTitle: subTitle
              }}
              onSettingsChange={handleSettingsChange}
              onSave={handleSaveSettings}
              onReset={handleResetSettings}
            />
          </div>
        )}
        {chartTitle}
        <ResponsiveContainer width="100%" height={chartSettings.height}>
          <AreaChart data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              {chartSettings.yKeys.map((key, index) => (
                <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getColorsByScheme(chartSettings.colorScheme, index)} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={getColorsByScheme(chartSettings.colorScheme, index)} stopOpacity={0.2}/>
                </linearGradient>
              ))}
            </defs>
            <XAxis dataKey={chartSettings.xKey} />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <Tooltip />
            <Legend />
            {chartSettings.yKeys.map((key, index) => (
              <Area 
                key={key}
                type="monotone" 
                dataKey={key} 
                stroke={getColorsByScheme(chartSettings.colorScheme, index)} 
                fillOpacity={1} 
                fill={`url(#color${key})`} 
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartSettings.chartType === 'composed') {
    return (
      <div className="my-4 p-6 bg-white rounded-lg shadow-sm mx-auto max-w-4xl">
        {allowCustomization && (
          <div className="flex justify-end">
            <ChartCustomizer
              data={data}
              initialSettings={{
                chartType: type,
                xKey: xKey,
                yKeys: yKeys,
                colorScheme: colorScheme,
                height: height,
                title: title,
                subTitle: subTitle
              }}
              onSettingsChange={handleSettingsChange}
              onSave={handleSaveSettings}
              onReset={handleResetSettings}
            />
          </div>
        )}
        {chartTitle}
        <ResponsiveContainer width="100%" height={chartSettings.height}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis dataKey={chartSettings.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {chartSettings.yKeys.map((key, index) => {
              // Alternate between bar and line for different metrics
              return index % 2 === 0 ? (
                <Bar 
                  key={key}
                  dataKey={key} 
                  fill={getColorsByScheme(chartSettings.colorScheme, index)}
                  barSize={20}
                />
              ) : (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={getColorsByScheme(chartSettings.colorScheme, index)}
                  strokeWidth={2}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Default to line or bar chart
  return (
    <div className="my-4 p-6 bg-white rounded-lg shadow-sm mx-auto max-w-4xl">
      {allowCustomization && (
        <div className="flex justify-end">
          <ChartCustomizer
            data={data}
            initialSettings={{
              chartType: type,
              xKey: xKey,
              yKeys: yKeys,
              colorScheme: colorScheme,
              height: height,
              title: title,
              subTitle: subTitle
            }}
            onSettingsChange={handleSettingsChange}
            onSave={handleSaveSettings}
            onReset={handleResetSettings}
          />
        </div>
      )}
      {chartTitle}
      <ResponsiveContainer width="100%" height={chartSettings.height}>
        {chartSettings.chartType === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis dataKey={chartSettings.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {chartSettings.yKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={getColorsByScheme(chartSettings.colorScheme, index)}
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis dataKey={chartSettings.xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {chartSettings.yKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={getColorsByScheme(chartSettings.colorScheme, index)}
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
