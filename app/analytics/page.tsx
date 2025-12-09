'use client';

import { useMemo } from 'react';
import { useAllNodes } from '@/hooks/useAllNodes';
import { CorrelationChart } from '@/components/CorrelationChart';
import { DistributionHistogram } from '@/components/DistributionHistogram';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { BarChart3, TrendingUp, Activity, AlertTriangle, CheckCircle2, Server, HardDrive, Globe } from 'lucide-react';
import { calculateHealthScore } from '@/lib/health';
import { formatBytes } from '@/lib/utils';

export default function AnalyticsPage() {
  const { data: nodes = [], isLoading, error } = useAllNodes();

  // Calculate comprehensive statistics - must be before conditional returns (Rules of Hooks)
  const stats = useMemo(() => {
    const nodesWithLatency = nodes.filter(n => n.latency !== undefined && n.latency > 0);
    const nodesWithPeers = nodes.filter(n => n.peerCount > 0);
    const nodesWithStorage = nodes.filter(n => n.storageUsed && n.storageCapacity);
    const nodesWithUptime = nodes.filter(n => n.uptime !== undefined && n.uptime > 0);
    
    const healthScores = nodes.map(n => calculateHealthScore(n));
    const healthyNodes = healthScores.filter(h => h.score >= 80);
    const warningNodes = healthScores.filter(h => h.score >= 50 && h.score < 80);
    const criticalNodes = healthScores.filter(h => h.score < 50);
    
    // Calculate percentiles
    const latencyValues = nodesWithLatency.map(n => n.latency || 0).sort((a, b) => a - b);
    const peerValues = nodesWithPeers.map(n => n.peerCount).sort((a, b) => a - b);
    const healthValues = healthScores.map(h => h.score).sort((a, b) => a - b);
    
    const percentile = (arr: number[], p: number) => {
      if (arr.length === 0) return 0;
      const index = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, index)];
    };
    
    // Regional distribution
    const regionCounts: Record<string, number> = {};
    nodes.forEach(n => {
      const region = n.location?.country || n.location?.region || 'Unknown';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });
    
    // Version distribution
    const versionCounts: Record<string, number> = {};
    nodes.forEach(n => {
      const version = n.softwareVersion || 'Unknown';
      versionCounts[version] = (versionCounts[version] || 0) + 1;
    });
    
    // Status distribution
    const onlineNodes = nodes.filter(n => n.status === 'online').length;
    const offlineNodes = nodes.filter(n => n.status === 'offline').length;
    const unknownNodes = nodes.filter(n => n.status === 'unknown').length;
    
    // Storage totals
    const totalStorageUsed = nodes.reduce((sum, n) => sum + (n.storageUsed || 0), 0);
    const totalStorageCapacity = nodes.reduce((sum, n) => sum + (n.storageCapacity || 0), 0);
    
    return {
      total: nodes.length,
      onlineNodes,
      offlineNodes,
      unknownNodes,
      withLatency: nodesWithLatency.length,
      withPeers: nodesWithPeers.length,
      withStorage: nodesWithStorage.length,
      withUptime: nodesWithUptime.length,
      healthyNodes: healthyNodes.length,
      warningNodes: warningNodes.length,
      criticalNodes: criticalNodes.length,
      avgLatency: nodesWithLatency.length > 0
        ? nodesWithLatency.reduce((sum, n) => sum + (n.latency || 0), 0) / nodesWithLatency.length
        : 0,
      medianLatency: percentile(latencyValues, 50),
      p95Latency: percentile(latencyValues, 95),
      p99Latency: percentile(latencyValues, 99),
      avgPeers: nodesWithPeers.length > 0
        ? nodesWithPeers.reduce((sum, n) => sum + n.peerCount, 0) / nodesWithPeers.length
        : 0,
      medianPeers: percentile(peerValues, 50),
      p95Peers: percentile(peerValues, 95),
      avgHealth: healthValues.length > 0
        ? healthValues.reduce((sum, h) => sum + h, 0) / healthValues.length
        : 0,
      medianHealth: percentile(healthValues, 50),
      minHealth: healthValues[0] || 0,
      maxHealth: healthValues[healthValues.length - 1] || 0,
      regionCounts,
      versionCounts,
      totalStorageUsed,
      totalStorageCapacity,
      storagePercentage: totalStorageCapacity > 0
        ? (totalStorageUsed / totalStorageCapacity) * 100
        : 0,
    };
  }, [nodes]);

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
          Correlation analysis and insights across node metrics ({stats.total} nodes)
        </p>
      </div>

      {/* Network Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Nodes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.total}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.onlineNodes} online, {stats.offlineNodes} offline
              </p>
            </div>
            <Server className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Network Health</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.avgHealth.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.healthyNodes} healthy, {stats.criticalNodes} critical
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Latency</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.avgLatency > 0 ? `${stats.avgLatency.toFixed(0)}ms` : 'N/A'}
              </p>
              {stats.p95Latency > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  P95: {stats.p95Latency.toFixed(0)}ms
                </p>
              )}
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Storage Used</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalStorageCapacity > 0 ? `${stats.storagePercentage.toFixed(1)}%` : 'N/A'}
              </p>
              {stats.totalStorageCapacity > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {formatBytes(stats.totalStorageUsed)} / {formatBytes(stats.totalStorageCapacity)}
                </p>
              )}
            </div>
            <HardDrive className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card title={
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Performance Metrics
        </div>
      }>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.withLatency > 0 && (
            <>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Latency (ms)</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Avg: {stats.avgLatency.toFixed(0)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-500">Median: {stats.medianLatency.toFixed(0)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-500">P95: {stats.p95Latency.toFixed(0)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-500">P99: {stats.p99Latency.toFixed(0)}</p>
              </div>
            </>
          )}
          {stats.withPeers > 0 && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Peer Count</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Avg: {stats.avgPeers.toFixed(1)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-500">Median: {stats.medianPeers.toFixed(1)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-500">P95: {stats.p95Peers.toFixed(1)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Health Score</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Avg: {stats.avgHealth.toFixed(1)}</p>
            <p className="text-sm text-gray-600 dark:text-gray-500">Median: {stats.medianHealth.toFixed(1)}</p>
            <p className="text-sm text-gray-600 dark:text-gray-500">Range: {stats.minHealth}-{stats.maxHealth}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Health Distribution</p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">{stats.healthyNodes} Healthy</p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">{stats.warningNodes} Warning</p>
            <p className="text-sm text-red-600 dark:text-red-400">{stats.criticalNodes} Critical</p>
          </div>
        </div>
      </Card>

      {/* Distribution Histograms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats.withLatency > 0 && (
          <DistributionHistogram
            nodes={nodes}
            metric="latency"
            title="Latency Distribution"
          />
        )}
        {stats.withPeers > 0 && (
          <DistributionHistogram
            nodes={nodes}
            metric="peerCount"
            title="Peer Count Distribution"
          />
        )}
        {stats.withStorage > 0 && (
          <DistributionHistogram
            nodes={nodes}
            metric="storageUsage"
            title="Storage Usage Distribution"
          />
        )}
        <DistributionHistogram
          nodes={nodes}
          metric="health"
          title="Health Score Distribution"
        />
      </div>

      {/* Regional & Version Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.keys(stats.regionCounts).length > 0 && (
          <Card title={
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Regional Distribution
            </div>
          }>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(stats.regionCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([region, count]) => {
                  const percentage = (count / stats.total) * 100;
                  return (
                    <div key={region} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{region}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 w-12 text-right">
                          {count}
                        </span>
                        <span className="text-xs text-gray-500 w-12 text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        )}
        {Object.keys(stats.versionCounts).length > 0 && (
          <Card title={
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Version Distribution
            </div>
          }>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(stats.versionCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([version, count]) => {
                  const percentage = (count / stats.total) * 100;
                  return (
                    <div key={version} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                      <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{version}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 w-12 text-right">
                          {count}
                        </span>
                        <span className="text-xs text-gray-500 w-12 text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        )}
      </div>

      {/* Correlation Charts */}
      {nodes.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-2">No node data available</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Please ensure nodes are being fetched from the pRPC endpoint.
            </p>
          </div>
        </Card>
      ) : (
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
      )}

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


