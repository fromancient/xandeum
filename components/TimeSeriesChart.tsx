'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { pNodeMetrics } from '@/types';
import { format } from 'date-fns';

interface BaseTimeSeriesChartProps {
  data: any[];
  xKey?: string;
  yKey?: string;
  yKeys?: string[];
  title?: string;
  height?: number;
  unit?: string;
  formatValue?: (value: any) => string;
  showCard?: boolean;
  colors?: string[];
}

// Legacy interface for backward compatibility
interface LegacyTimeSeriesChartProps {
  data: pNodeMetrics[];
  title: string;
  dataKey: keyof pNodeMetrics;
  unit?: string;
  color?: string;
}

type TimeSeriesChartProps = BaseTimeSeriesChartProps | LegacyTimeSeriesChartProps;

const defaultColors = ['#00d9ff', '#0080ff', '#8b5cf6', '#14b8a6', '#10b981', '#ec4899'];
const defaultColorsDark = ['#00d9ff', '#00aaff', '#a855f7', '#06b6d4', '#10b981', '#ec4899'];

export function TimeSeriesChart(props: TimeSeriesChartProps) {
  // Check if this is legacy format
  const isLegacy = 'dataKey' in props;
  
  if (isLegacy) {
    const { data, title, dataKey, unit, color = '#3b82f6' } = props as LegacyTimeSeriesChartProps;
    const chartData = data.map((item) => ({
      time: format(new Date(item.timestamp), 'HH:mm'),
      value: item[dataKey],
      fullTime: format(new Date(item.timestamp), 'MMM dd, HH:mm'),
    }));

    return (
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
            <XAxis 
              dataKey="time" 
              className="text-xs text-gray-600 dark:text-gray-400"
              stroke="currentColor"
            />
            <YAxis 
              className="text-xs text-gray-600 dark:text-gray-400"
              stroke="currentColor"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tw-color-gray-900)',
                border: '1px solid var(--tw-color-gray-800)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'var(--tw-color-gray-100)' }}
              formatter={(value: any) => [
                `${value}${unit || ''}`,
                title,
              ]}
              labelFormatter={(label) => {
                const item = chartData.find(d => d.time === label);
                return item?.fullTime || label;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // New flexible format
  const {
    data,
    xKey = 'timestamp',
    yKey,
    yKeys,
    height = 300,
    unit = '',
    formatValue,
    colors,
  } = props as BaseTimeSeriesChartProps;

  // Use dark mode colors when in dark mode
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
  const chartColors = colors || (isDark ? defaultColorsDark : defaultColors);

  // Format data for chart
  const chartData = data.map((item) => {
    const timestamp = item[xKey];
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    const formatted: any = {
      timestamp: date,
      time: format(date, data.length > 24 ? 'MMM dd HH:mm' : 'HH:mm'),
      fullTime: format(date, 'MMM dd, yyyy HH:mm'),
    };

    // Add yKey values
    if (yKey) {
      formatted.value = item[yKey];
    }
    if (yKeys) {
      yKeys.forEach(key => {
        formatted[key] = item[key] ?? 0;
      });
    }

    return formatted;
  });

  const formatter = formatValue || ((value: any) => `${value}${unit}`);
  const keys = yKeys || (yKey ? [yKey] : ['value']);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
          <XAxis 
            dataKey="time" 
            className="text-xs text-gray-600 dark:text-gray-400"
            stroke="currentColor"
          />
          <YAxis 
            className="text-xs text-gray-600 dark:text-gray-400"
            stroke="currentColor"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--tw-color-gray-900)',
              border: '1px solid var(--tw-color-gray-800)',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'var(--tw-color-gray-100)' }}
            formatter={(value: any, name: string) => [formatter(value), name]}
            labelFormatter={(label) => {
              const item = chartData.find(d => d.time === label);
              return item?.fullTime || label;
            }}
          />
          <Legend />
          {keys.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId={keys.length > 1 ? "1" : undefined}
              stroke={chartColors[index % chartColors.length]}
              fill={chartColors[index % chartColors.length]}
              fillOpacity={keys.length > 1 ? 0.6 : 0.15}
              strokeWidth={2}
              dot={{ r: keys.length > 3 ? 0 : 3, fill: chartColors[index % chartColors.length] }}
              activeDot={{ r: 6, fill: chartColors[index % chartColors.length] }}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
              style={{
                filter: isDark ? `drop-shadow(0 0 4px ${chartColors[index % chartColors.length]}60)` : undefined,
              }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

