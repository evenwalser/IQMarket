
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
  Legend,
  Label
} from 'recharts';

interface QuadrantItem {
  id: string;
  label: string;
  x: number;
  y: number;
  quadrant?: number;
}

interface QuadrantChartProps {
  items: QuadrantItem[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  title?: string;
  height?: number;
  colorScheme?: 'default' | 'financial' | 'retention' | 'performance' | 'operational';
}

const DEFAULT_COLORS = {
  default: ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'],
  financial: ['#4caf50', '#2e7d32', '#81c784', '#a5d6a7'],
  retention: ['#2196f3', '#1565c0', '#64b5f6', '#90caf9'],
  performance: ['#9c27b0', '#6a1b9a', '#ba68c8', '#ce93d8'],
  operational: ['#ff9800', '#e65100', '#ffb74d', '#ffe0b2']
};

const QUADRANT_LABELS = [
  { label: 'High Impact, Low Effort', position: { x: 75, y: 25 }, alignment: { textAnchor: 'middle', fill: '#10b981' } },
  { label: 'High Impact, High Effort', position: { x: 25, y: 25 }, alignment: { textAnchor: 'middle', fill: '#3b82f6' } },
  { label: 'Low Impact, High Effort', position: { x: 25, y: 75 }, alignment: { textAnchor: 'middle', fill: '#ef4444' } },
  { label: 'Low Impact, Low Effort', position: { x: 75, y: 75 }, alignment: { textAnchor: 'middle', fill: '#f59e0b' } }
];

export const QuadrantChart = ({ 
  items, 
  xAxisLabel = 'Impact', 
  yAxisLabel = 'Effort', 
  title = 'Prioritization Matrix',
  height = 400,
  colorScheme = 'default'
}: QuadrantChartProps) => {
  // Group items by quadrant
  const itemsByQuadrant = {
    1: items.filter(item => (item.x >= 50 && item.y <= 50) || item.quadrant === 1),
    2: items.filter(item => (item.x < 50 && item.y <= 50) || item.quadrant === 2),
    3: items.filter(item => (item.x < 50 && item.y > 50) || item.quadrant === 3),
    4: items.filter(item => (item.x >= 50 && item.y > 50) || item.quadrant === 4)
  };

  const colors = DEFAULT_COLORS[colorScheme as keyof typeof DEFAULT_COLORS] || DEFAULT_COLORS.default;

  // Custom tooltip to show item labels
  const renderTooltip = (props: any) => {
    const { active, payload } = props;
    
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-sm rounded-md">
          <p className="font-semibold">{data.label}</p>
          <p className="text-xs text-gray-500">{xAxisLabel}: {data.x}</p>
          <p className="text-xs text-gray-500">{yAxisLabel}: {data.y}</p>
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
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 70, left: 70 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name={xAxisLabel}
              domain={[0, 100]}
              label={{ 
                value: xAxisLabel, 
                position: 'bottom',
                offset: 10,
                style: { textAnchor: 'middle' }
              }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name={yAxisLabel}
              domain={[0, 100]}
              label={{ 
                value: yAxisLabel, 
                angle: -90, 
                position: 'left',
                offset: 10,
                style: { textAnchor: 'middle' }
              }}
            />
            <ZAxis range={[60, 400]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={renderTooltip} />
            
            {/* Reference lines for quadrants */}
            <ReferenceLine x={50} stroke="#666" strokeDasharray="3 3" />
            <ReferenceLine y={50} stroke="#666" strokeDasharray="3 3" />
            
            {/* Quadrant labels */}
            {QUADRANT_LABELS.map((quadLabel, index) => (
              <text
                key={`label-${index}`}
                x={quadLabel.position.x + '%'}
                y={quadLabel.position.y + '%'}
                textAnchor={quadLabel.alignment.textAnchor}
                fill={quadLabel.alignment.fill}
                fontSize={12}
                fontWeight={500}
              >
                {quadLabel.label}
              </text>
            ))}
            
            {/* Scatters for each quadrant with different colors */}
            {Object.entries(itemsByQuadrant).map(([quadrant, quadItems], index) => (
              <Scatter 
                key={`quad-${quadrant}`}
                name={QUADRANT_LABELS[parseInt(quadrant) - 1].label}
                data={quadItems} 
                fill={colors[index % colors.length]}
              />
            ))}
            
            <Legend verticalAlign="bottom" height={36} />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
