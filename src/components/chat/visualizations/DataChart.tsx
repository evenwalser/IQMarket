
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
  colorScheme = 'default'
}: DataChartProps) => {
  if (!data || data.length === 0) return null;

  const colors = {
    bottomQuartile: '#FF6B6B',
    median: '#4ECDC4',
    topQuartile: '#45B7D1',
    grid: '#e0e0e0'
  };

  // For horizontal bar chart (when yKeys includes category)
  const isHorizontalBar = type === 'bar' && yKeys.includes('category');

  const chartTitle = (
    <>
      {title && <h3 className="text-lg font-semibold text-gray-800 mb-1 text-center">{title}</h3>}
      {subTitle && <p className="text-sm text-gray-500 mb-4 text-center">{subTitle}</p>}
    </>
  );

  if (isHorizontalBar) {
    return (
      <div className="my-4 p-6 bg-white rounded-lg shadow-sm mx-auto max-w-4xl">
        {chartTitle}
        <ResponsiveContainer width="100%" height={Math.max(height, data.length * 50)}>
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
              fill={getColorsByScheme(colorScheme)}
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

  if (type === 'radar') {
    return (
      <div className="my-4 p-6 bg-white rounded-lg shadow-sm mx-auto max-w-4xl">
        {chartTitle}
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke={colors.grid} />
            <PolarAngleAxis dataKey={xKey} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            {yKeys.map((key, index) => (
              <Radar
                key={key}
                name={key}
                dataKey={key}
                stroke={getColorsByScheme(colorScheme, index)}
                fill={getColorsByScheme(colorScheme, index)}
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

  if (type === 'area') {
    return (
      <div className="my-4 p-6 bg-white rounded-lg shadow-sm mx-auto max-w-4xl">
        {chartTitle}
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              {yKeys.map((key, index) => (
                <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getColorsByScheme(colorScheme, index)} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={getColorsByScheme(colorScheme, index)} stopOpacity={0.2}/>
                </linearGradient>
              ))}
            </defs>
            <XAxis dataKey={xKey} />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <Tooltip />
            <Legend />
            {yKeys.map((key, index) => (
              <Area 
                key={key}
                type="monotone" 
                dataKey={key} 
                stroke={getColorsByScheme(colorScheme, index)} 
                fillOpacity={1} 
                fill={`url(#color${key})`} 
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'composed') {
    return (
      <div className="my-4 p-6 bg-white rounded-lg shadow-sm mx-auto max-w-4xl">
        {chartTitle}
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yKeys.map((key, index) => {
              // Alternate between bar and line for different metrics
              return index % 2 === 0 ? (
                <Bar 
                  key={key}
                  dataKey={key} 
                  fill={getColorsByScheme(colorScheme, index)}
                  barSize={20}
                />
              ) : (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={getColorsByScheme(colorScheme, index)}
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
      {chartTitle}
      <ResponsiveContainer width="100%" height={height}>
        {type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={getColorsByScheme(colorScheme, index)}
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={getColorsByScheme(colorScheme, index)}
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
