
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

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  // For horizontal bar chart (when yKeys contains category)
  const isHorizontalBar = yKeys.includes('category');

  if (type === 'bar' && isHorizontalBar) {
    return (
      <div className="my-4">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 150, // Increased left margin for category labels
              bottom: 40,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[70, 100]}>
              <Label value="Gross Revenue Retention (%)" position="bottom" offset={0} />
            </XAxis>
            <YAxis dataKey="category" type="category" />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
            {/* Add reference lines for thresholds */}
            <ReferenceLine x={80} stroke="grey" strokeDasharray="3 3" label="Bottom Quartile" />
            <ReferenceLine x={90} stroke="grey" strokeDasharray="3 3" label="Median" />
            <ReferenceLine x={95} stroke="grey" strokeDasharray="3 3" label="Top Quartile" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="my-4">
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
                stroke={colors[index % colors.length]}
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
                fill={colors[index % colors.length]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
