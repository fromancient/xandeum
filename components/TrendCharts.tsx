'use client';

import { useMemo } from 'react';
import { TimeSeriesChart } from './TimeSeriesChart';
import { Card } from './Card';
import { getNetworkHistoryForRange } from '@/lib/clientHistory';
import { formatBytes } from '@/lib/utils';
import { TrendingUp, TrendingDown, Activity, HardDrive, Network } from 'lucide-react';

interface TrendChartsProps {
  hours?: number;
  compact?: boolean;
}

export function TrendCharts({ hours = 24, compact = false }: TrendChartsProps) {
  const history = useMemo(() => getNetworkHistoryForRange(hours), [hours]);

  if (history.length === 0) {
    return (
      <Card title="Network Trends">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          No historical data available yet. Data will appear as the network is monitored over time.
        </div>
      </Card>
    );
  }

  const chartData = history.map(s => ({
    timestamp: new Date(s.timestamp),
    totalNodes: s.totalNodes,
    onlineNodes: s.onlineNodes,
    offlineNodes: s.offlineNodes,
    healthyNodes: s.healthyNodes,
    warningNodes: s.warningNodes,
    criticalNodes: s.criticalNodes,
    averagePeerCount: s.averagePeerCount,
    averageLatency: s.averageLatency,
    storageUsed: s.totalStorageUsed,
    storageCapacity: s.totalStorageCapacity,
    storagePercentage: s.storagePercentage,
  }));

  // Calculate trends
  const first = history[0];
  const last = history[history.length - 1];
  const nodeChange = last.totalNodes - first.totalNodes;
  const onlineChange = last.onlineNodes - first.onlineNodes;
  const storageChange = last.storagePercentage - first.storagePercentage;

  if (compact) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Network className="w-4 h-4" />
              Node Count
            </h3>
            <div className={`text-xs font-medium flex items-center gap-1 ${
              nodeChange > 0 ? 'text-green-600 dark:text-green-400' : 
              nodeChange < 0 ? 'text-red-600 dark:text-red-400' : 
              'text-gray-500'
            }`}>
              {nodeChange > 0 ? <TrendingUp className="w-3 h-3" /> : 
               nodeChange < 0 ? <TrendingDown className="w-3 h-3" /> : null}
              {nodeChange > 0 ? '+' : ''}{nodeChange}
            </div>
          </div>
          <TimeSeriesChart
            data={chartData}
            yKeys={['totalNodes', 'onlineNodes']}
            height={200}
            formatValue={(v) => Math.round(v).toString()}
          />
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Storage Usage
            </h3>
            <div className={`text-xs font-medium flex items-center gap-1 ${
              storageChange > 0 ? 'text-orange-600 dark:text-orange-400' : 
              storageChange < 0 ? 'text-green-600 dark:text-green-400' : 
              'text-gray-500'
            }`}>
              {storageChange > 0 ? <TrendingUp className="w-3 h-3" /> : 
               storageChange < 0 ? <TrendingDown className="w-3 h-3" /> : null}
              {storageChange > 0 ? '+' : ''}{storageChange.toFixed(1)}%
            </div>
          </div>
          <TimeSeriesChart
            data={chartData}
            yKey="storagePercentage"
            height={200}
            unit="%"
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trend Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Node Count</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {last.totalNodes}
              </p>
              <p className={`text-xs mt-1 flex items-center gap-1 ${
                nodeChange > 0 ? 'text-green-600 dark:text-green-400' : 
                nodeChange < 0 ? 'text-red-600 dark:text-red-400' : 
                'text-gray-500'
              }`}>
                {nodeChange > 0 ? <TrendingUp className="w-3 h-3" /> : 
                 nodeChange < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                {nodeChange > 0 ? '+' : ''}{nodeChange} from {hours}h ago
              </p>
            </div>
            <Network className="w-8 h-8 text-gray-400" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Online Nodes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {last.onlineNodes}
              </p>
              <p className={`text-xs mt-1 flex items-center gap-1 ${
                onlineChange > 0 ? 'text-green-600 dark:text-green-400' : 
                onlineChange < 0 ? 'text-red-600 dark:text-red-400' : 
                'text-gray-500'
              }`}>
                {onlineChange > 0 ? <TrendingUp className="w-3 h-3" /> : 
                 onlineChange < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                {onlineChange > 0 ? '+' : ''}{onlineChange} from {hours}h ago
              </p>
            </div>
            <Activity className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Storage Used</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {last.storagePercentage.toFixed(1)}%
              </p>
              <p className="text-xs mt-1 text-gray-500">
                {formatBytes(last.totalStorageUsed)} / {formatBytes(last.totalStorageCapacity)}
              </p>
            </div>
            <HardDrive className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Node Count Over Time">
          <TimeSeriesChart
            data={chartData}
            yKeys={['totalNodes', 'onlineNodes', 'offlineNodes']}
            height={300}
            formatValue={(v) => Math.round(v).toString()}
          />
        </Card>
        <Card title="Health Distribution Over Time">
          <TimeSeriesChart
            data={chartData}
            yKeys={['healthyNodes', 'warningNodes', 'criticalNodes']}
            height={300}
            formatValue={(v) => Math.round(v).toString()}
          />
        </Card>
        <Card title="Average Peer Count">
          <TimeSeriesChart
            data={chartData}
            yKey="averagePeerCount"
            height={300}
            formatValue={(v) => v.toFixed(1)}
          />
        </Card>
        <Card title="Storage Usage">
          <TimeSeriesChart
            data={chartData}
            yKey="storagePercentage"
            height={300}
            unit="%"
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
        </Card>
      </div>
    </div>
  );
}


