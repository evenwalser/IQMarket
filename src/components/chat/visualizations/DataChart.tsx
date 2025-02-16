
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
  ReferenceLine
} from 'recharts';

interface DataChartProps {
  data: Record<string, any>[];
  type: 'line' | 'bar';
  xKey: string;
  yKeys: string[];
  height?: number;
}

export const DataChart = ({ data, type, xKey, yKeys, height = 300 }: DataChartProps) => {
  if (!data || data.length === 0) return null;

  const colors = {
    bar: '#8884d8',
    bottomQuartile: '#FF6B6B',
    median: '#4ECDC4',
    topQuartile: '#45B7D1',
    grid: '#e0e0e0'
  };

  // For horizontal bar chart (when yKeys contains category)
  const isHorizontalBar = yKeys.includes('category');

  if (type === 'bar' && isHorizontalBar) {
    return (
      <div className="my-4 p-6 bg-white rounded-lg shadow-sm mx-auto max-w-4xl">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">GRR Benchmark Analysis</h3>
        <ResponsiveContainer width="100%" height={height}>
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
              fill={colors.bar}
              radius={[0, 4, 4, 0]}
              barSize={24}
            />
            <ReferenceLine 
              x={80} 
              stroke={colors.bottomQuartile}
              strokeDasharray="3 3" 
              label={{ 
                value: "Bottom Quartile",
                position: 'top',
                fill: colors.bottomQuartile,
                fontSize: 12
              }}
            />
            <ReferenceLine 
              x={90} 
              stroke={colors.median}
              strokeDasharray="3 3" 
              label={{ 
                value: "Median",
                position: 'top',
                fill: colors.median,
                fontSize: 12
              }}
            />
            <ReferenceLine 
              x={95} 
              stroke={colors.topQuartile}
              strokeDasharray="3 3" 
              label={{ 
                value: "Top Quartile",
                position: 'top',
                fill: colors.topQuartile,
                fontSize: 12
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="my-4 mx-auto max-w-4xl">
      <ResponsiveContainer width="100%" height={height}>
        {type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors.bar}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors.bar}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
