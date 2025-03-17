
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ResponsiveContainer, 
  FunnelChart as RechartsFunnel, 
  Funnel, 
  LabelList, 
  Tooltip
} from 'recharts';

interface FunnelStage {
  stage: string;
  value: number;
}

interface FunnelChartProps {
  stages: FunnelStage[];
  title?: string;
  height?: number;
  colorScheme?: 'default' | 'financial' | 'retention' | 'performance' | 'operational';
}

export const FunnelChart = ({ 
  stages, 
  title = 'Conversion Funnel',
  height = 400,
  colorScheme = 'default'
}: FunnelChartProps) => {
  const getColors = (): string[] => {
    switch (colorScheme) {
      case 'financial':
        return ['#4caf50', '#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9'];
      case 'retention':
        return ['#2196f3', '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb'];
      case 'performance':
        return ['#9c27b0', '#ab47bc', '#ba68c8', '#ce93d8', '#e1bee7'];
      case 'operational':
        return ['#ff9800', '#ffa726', '#ffb74d', '#ffcc80', '#ffe0b2'];
      default:
        return ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c'];
    }
  };

  // Calculate conversion percentages
  const stagesWithConversion = stages.map((stage, index) => {
    if (index === 0) {
      return { ...stage, conversionRate: '100%' };
    }
    
    const previousValue = stages[index - 1].value;
    const currentValue = stage.value;
    const conversionRate = Math.round((currentValue / previousValue) * 100) + '%';
    
    return { ...stage, conversionRate };
  });

  // Custom tooltip
  const renderTooltip = (props: any) => {
    const { active, payload } = props;
    
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-sm rounded-md">
          <p className="font-semibold">{data.stage}</p>
          <p className="text-sm">{data.value.toLocaleString()} users</p>
          {data.conversionRate && (
            <p className="text-xs text-gray-500">
              Conversion: {data.conversionRate}
            </p>
          )}
        </div>
      );
    }
    
    return null;
  };

  return (
    <Card className="my-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsFunnel
            data={stagesWithConversion}
            dataKey="value"
          >
            <Tooltip content={renderTooltip} />
            <Funnel
              dataKey="value"
              nameKey="stage"
              colors={getColors()}
              isAnimationActive
            >
              <LabelList
                position="right"
                fill="#666"
                stroke="none"
                dataKey="stage"
                formatter={(value: string) => `${value}`}
              />
              <LabelList
                position="right"
                fill="#666"
                stroke="none"
                dataKey="value"
                offset={60}
                formatter={(value: number) => value.toLocaleString()}
              />
            </Funnel>
          </RechartsFunnel>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
