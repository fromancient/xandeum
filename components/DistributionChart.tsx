'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card } from './Card';

interface DistributionChartProps {
  data: Record<string, number>;
  title: string;
  type?: 'pie' | 'bar';
  colors?: string[];
}

const DEFAULT_COLORS = [
  '#00d9ff', '#0080ff', '#8b5cf6', '#14b8a6', '#10b981',
  '#ec4899', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1',
];

const DEFAULT_COLORS_DARK = [
  '#00d9ff', '#00aaff', '#a855f7', '#06b6d4', '#10b981',
  '#ec4899', '#fbbf24', '#f87171', '#22d3ee', '#818cf8',
];

export function DistributionChart({ data, title, type = 'pie', colors }: DistributionChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value,
  }));

  // Use dark mode colors when in dark mode
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
  const chartColors = colors || (isDark ? DEFAULT_COLORS_DARK : DEFAULT_COLORS);

  if (chartData.length === 0) {
    return (
      <Card title={title}>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No data available
        </div>
      </Card>
    );
  }

  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={300}>
        {type === 'pie' ? (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={chartColors[index % chartColors.length]}
                  style={{
                    filter: isDark ? `drop-shadow(0 0 6px ${chartColors[index % chartColors.length]}40)` : undefined,
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? 'rgba(13, 13, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                border: isDark ? '1px solid rgba(0, 217, 255, 0.3)' : '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '12px',
                backdropFilter: 'blur(12px)',
                boxShadow: isDark ? '0 8px 32px rgba(0, 217, 255, 0.2)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ color: isDark ? '#E8EAF6' : '#171717' }}
            />
            <Legend wrapperStyle={{ color: isDark ? '#E8EAF6' : '#171717' }} />
          </PieChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} />
            <XAxis 
              dataKey="name" 
              className="text-xs"
              stroke={isDark ? '#E8EAF6' : '#171717'}
            />
            <YAxis 
              className="text-xs"
              stroke={isDark ? '#E8EAF6' : '#171717'}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? 'rgba(13, 13, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                border: isDark ? '1px solid rgba(0, 217, 255, 0.3)' : '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '12px',
                backdropFilter: 'blur(12px)',
                boxShadow: isDark ? '0 8px 32px rgba(0, 217, 255, 0.2)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ color: isDark ? '#E8EAF6' : '#171717' }}
            />
            <Bar 
              dataKey="value" 
              fill={chartColors[0]}
              radius={[8, 8, 0, 0]}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
              style={{
                filter: isDark ? `drop-shadow(0 4px 8px ${chartColors[0]}40)` : undefined,
              }}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Card>
  );
}

