'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from './Card';
import { pNode } from '@/types';

interface DistributionHistogramProps {
  nodes: pNode[];
  metric: 'latency' | 'peerCount' | 'storageUsage' | 'uptime' | 'health';
  title?: string;
  height?: number;
  bins?: number;
}

export function DistributionHistogram({ 
  nodes, 
  metric, 
  title,
  height = 300,
  bins = 20
}: DistributionHistogramProps) {
  const data = useMemo(() => {
    // Extract values
    const values: number[] = [];
    
    nodes.forEach(node => {
      let value: number | null = null;
      
      if (metric === 'latency') {
        value = node.latency !== undefined && node.latency > 0 ? node.latency : null;
      } else if (metric === 'peerCount') {
        value = node.peerCount !== undefined ? node.peerCount : null;
      } else if (metric === 'storageUsage') {
        if (node.storageCapacity && node.storageUsed) {
          value = (node.storageUsed / node.storageCapacity) * 100;
        }
      } else if (metric === 'uptime') {
        value = node.uptime !== undefined ? node.uptime / (24 * 3600) : null; // days
      } else if (metric === 'health') {
        // Calculate health score
        const calculateHealth = (n: pNode) => {
          let score = 100;
          if (n.status === 'offline') return 20;
          if (n.status === 'unknown') score -= 15;
          if (n.latency && n.latency > 1000) score -= 20;
          if (n.peerCount < 5) score -= 20;
          if (n.storageCapacity && n.storageUsed) {
            const usage = (n.storageUsed / n.storageCapacity) * 100;
            if (usage > 95) score -= 25;
          }
          return Math.max(0, Math.min(100, score));
        };
        value = calculateHealth(node);
      }
      
      if (value !== null && !isNaN(value)) {
        values.push(value);
      }
    });
    
    if (values.length === 0) return [];
    
    // Calculate bins
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;
    
    const histogram: Record<number, number> = {};
    for (let i = 0; i < bins; i++) {
      histogram[i] = 0;
    }
    
    values.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
      histogram[binIndex] = (histogram[binIndex] || 0) + 1;
    });
    
    // Convert to chart data
    return Object.entries(histogram).map(([index, count]) => {
      const binStart = min + (parseInt(index) * binWidth);
      const binEnd = min + ((parseInt(index) + 1) * binWidth);
      return {
        range: `${binStart.toFixed(metric === 'latency' ? 0 : 1)}-${binEnd.toFixed(metric === 'latency' ? 0 : 1)}`,
        count,
        binStart,
        binEnd,
      };
    });
  }, [nodes, metric, bins]);

  const getLabel = () => {
    switch (metric) {
      case 'latency': return 'Latency (ms)';
      case 'peerCount': return 'Peer Count';
      case 'storageUsage': return 'Storage Usage (%)';
      case 'uptime': return 'Uptime (days)';
      case 'health': return 'Health Score';
    }
  };

  if (data.length === 0) {
    return (
      <Card title={title || `${getLabel()} Distribution`}>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          Insufficient data to display distribution.
        </div>
      </Card>
    );
  }

  return (
    <Card title={title || `${getLabel()} Distribution`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
          <XAxis 
            dataKey="range"
            className="text-xs text-gray-600 dark:text-gray-400"
            stroke="currentColor"
            angle={-45}
            textAnchor="end"
            height={80}
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
            formatter={(value: any) => [value, 'Nodes']}
          />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

