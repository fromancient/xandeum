'use client';

import { useNodes } from '@/hooks/useNodes';
import { CorrelationChart } from '@/components/CorrelationChart';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { BarChart3, TrendingUp, Activity } from 'lucide-react';

export default function AnalyticsPage() {
  const { data, isLoading, error } = useNodes({ page: 1, pageSize: 500 });
  const nodes = data?.nodes || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-[300px] w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card>
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">Error loading analytics data</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">{String(error)}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Network Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Correlation analysis and insights across node metrics
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CorrelationChart
          nodes={nodes}
          xMetric="latency"
          yMetric="health"
          title="Health vs Latency"
        />
        <CorrelationChart
          nodes={nodes}
          xMetric="peerCount"
          yMetric="health"
          title="Health vs Peer Count"
        />
        <CorrelationChart
          nodes={nodes}
          xMetric="storageUsage"
          yMetric="health"
          title="Health vs Storage Usage"
        />
        <CorrelationChart
          nodes={nodes}
          xMetric="uptime"
          yMetric="health"
          title="Health vs Uptime"
        />
        <CorrelationChart
          nodes={nodes}
          xMetric="latency"
          yMetric="peerCount"
          title="Peer Count vs Latency"
        />
        <CorrelationChart
          nodes={nodes}
          xMetric="storageUsage"
          yMetric="latency"
          title="Latency vs Storage Usage"
        />
      </div>

      <Card title={
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Insights
        </div>
      }>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Correlation Analysis
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              These scatter plots help identify relationships between different node metrics. 
              Look for patterns that might indicate performance bottlenecks or optimization opportunities.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Interpreting the Charts
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Points are colored by health score (green: healthy, yellow: warning, red: critical)</li>
              <li>Clusters indicate common patterns in node behavior</li>
              <li>Outliers may represent nodes requiring attention</li>
              <li>Positive/negative correlations can reveal performance relationships</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

