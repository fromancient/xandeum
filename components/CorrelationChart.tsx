'use client';

import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card } from './Card';
import { pNode } from '@/types';
import { calculateHealthScore } from '@/lib/health';
import { formatBytes } from '@/lib/utils';

interface CorrelationChartProps {
  nodes: pNode[];
  xMetric: 'latency' | 'peerCount' | 'storageUsage' | 'uptime';
  yMetric: 'health' | 'latency' | 'peerCount' | 'storageUsage';
  title?: string;
  height?: number;
}

export function CorrelationChart({ 
  nodes, 
  xMetric, 
  yMetric, 
  title,
  height = 300 
}: CorrelationChartProps) {
  const data = useMemo(() => {
    return nodes
      .map(node => {
        const health = calculateHealthScore(node);
        
        let x: number | null = null;
        if (xMetric === 'latency') {
          x = node.latency !== undefined ? node.latency : null;
        } else if (xMetric === 'peerCount') {
          x = node.peerCount !== undefined ? node.peerCount : null;
        } else if (xMetric === 'storageUsage') {
          x = node.storageCapacity && node.storageUsed 
            ? (node.storageUsed / node.storageCapacity) * 100 
            : null;
        } else {
          x = node.uptime !== undefined ? (node.uptime / (24 * 3600)) : null; // uptime in days
        }
        
        let y: number | null = null;
        if (yMetric === 'health') {
          y = health.score;
        } else if (yMetric === 'latency') {
          y = node.latency !== undefined ? node.latency : null;
        } else if (yMetric === 'peerCount') {
          y = node.peerCount !== undefined ? node.peerCount : null;
        } else {
          y = node.storageCapacity && node.storageUsed 
            ? (node.storageUsed / node.storageCapacity) * 100 
            : null;
        }
        
        // Only include nodes where both x and y have valid numeric values
        if (x === null || y === null || isNaN(x) || isNaN(y)) {
          return null;
        }
        
        return {
          x,
          y,
          nodeId: node.id,
          status: node.status,
          health: health.score,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [nodes, xMetric, yMetric]);

  const getXLabel = () => {
    switch (xMetric) {
      case 'latency': return 'Latency (ms)';
      case 'peerCount': return 'Peer Count';
      case 'storageUsage': return 'Storage Usage (%)';
      case 'uptime': return 'Uptime (days)';
    }
  };

  const getYLabel = () => {
    switch (yMetric) {
      case 'health': return 'Health Score';
      case 'latency': return 'Latency (ms)';
      case 'peerCount': return 'Peer Count';
      case 'storageUsage': return 'Storage Usage (%)';
    }
  };

  const getColor = (health: number) => {
    if (health >= 80) return '#10b981'; // green
    if (health >= 50) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  if (data.length === 0) {
    return (
      <Card title={title || `${getYLabel()} vs ${getXLabel()}`}>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          <p className="mb-2">Insufficient data to display correlation chart.</p>
          <p className="text-xs">
            This chart requires nodes with both {getXLabel().toLowerCase()} and {getYLabel().toLowerCase()} data.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card title={title || `${getYLabel()} vs ${getXLabel()}`}>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
          <XAxis 
            type="number"
            dataKey="x"
            name={getXLabel()}
            className="text-xs text-gray-600 dark:text-gray-400"
            stroke="currentColor"
          />
          <YAxis 
            type="number"
            dataKey="y"
            name={getYLabel()}
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
            formatter={(value: any, name: string, props: any) => {
              if (name === 'x') {
                if (xMetric === 'latency') return [`${value.toFixed(0)}ms`, 'Latency'];
                if (xMetric === 'peerCount') return [value, 'Peers'];
                if (xMetric === 'storageUsage') return [`${value.toFixed(1)}%`, 'Storage'];
                if (xMetric === 'uptime') return [`${value.toFixed(1)} days`, 'Uptime'];
              }
              if (name === 'y') {
                if (yMetric === 'health') return [`${value}`, 'Health'];
                if (yMetric === 'latency') return [`${value.toFixed(0)}ms`, 'Latency'];
                if (yMetric === 'peerCount') return [value, 'Peers'];
                if (yMetric === 'storageUsage') return [`${value.toFixed(1)}%`, 'Storage'];
              }
              return [value, name];
            }}
            labelFormatter={(label) => `Node: ${label}`}
          />
          <Scatter name="Nodes" data={data} fill="#3b82f6">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.health)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Each point represents a node. Color indicates health score (green: ≥80, yellow: 50-79, red: &lt;50).
      </div>
    </Card>
  );
}


