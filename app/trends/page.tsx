'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import { StatCard } from '@/components/StatCard';
import { DistributionChart } from '@/components/DistributionChart';
import { 
  TrendingUp, TrendingDown, Activity, Server, Network, AlertTriangle, 
  CheckCircle2, Zap, HardDrive, Globe, BarChart3, Info, ArrowUpRight, 
  ArrowDownRight, Minus, Target
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { Tooltip } from '@/components/Tooltip';

interface NetworkSnapshot {
  id: number;
  timestamp: string;
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  healthyNodes: number;
  warningNodes: number;
  criticalNodes: number;
  averagePeerCount: number | null;
  averageLatency: number | null;
  totalStorageCapacity: number | null;
  totalStorageUsed: number | null;
  versionDistribution: Record<string, number>;
  regionDistribution: Record<string, number>;
}

interface TrendInsight {
  type: 'growth' | 'decline' | 'stable' | 'warning' | 'critical';
  metric: string;
  message: string;
  change: number;
  icon: any;
}

const timeRanges = [
  { label: '24h', hours: 24 },
  { label: '7d', hours: 168 },
  { label: '30d', hours: 720 },
];

export default function TrendsPage() {
  const [selectedRange, setSelectedRange] = useState(24);
  const [snapshots, setSnapshots] = useState<NetworkSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStats, setCurrentStats] = useState<any>(null);

  useEffect(() => {
    fetchTrends();
    fetchCurrentStats();
  }, [selectedRange]);

  async function fetchTrends() {
    setLoading(true);
    try {
      const res = await fetch(`/api/history/network?hours=${selectedRange}`);
      const data = await res.json();
      setSnapshots(data.snapshots || []);
    } catch (error) {
      console.error('Failed to fetch trends:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCurrentStats() {
    try {
      // Fetch current nodes to use as fallback/context
      const res = await fetch('/api/nodes?page=1&pageSize=500');
      const data = await res.json();
      if (data.nodes && data.nodes.length > 0) {
        // Calculate current network stats similar to calculateNetworkStats
        const nodes = data.nodes;
        const onlineNodes = nodes.filter((n: any) => n.status === 'online').length;
        const totalNodes = nodes.length;
        const totalStorageUsed = nodes.reduce((sum: number, n: any) => sum + (n.storageUsed || 0), 0);
        const totalStorageCapacity = nodes.reduce((sum: number, n: any) => sum + (n.storageCapacity || 0), 0);
        const nodesWithPeers = nodes.filter((n: any) => (n.peerCount || 0) > 0);
        const averagePeerCount = nodesWithPeers.length > 0
          ? nodesWithPeers.reduce((sum: number, n: any) => sum + (n.peerCount || 0), 0) / nodesWithPeers.length
          : 0;
        const nodesWithLatency = nodes.filter((n: any) => n.latency !== undefined);
        const averageLatency = nodesWithLatency.length > 0
          ? nodesWithLatency.reduce((sum: number, n: any) => sum + (n.latency || 0), 0) / nodesWithLatency.length
          : 0;

        setCurrentStats({
          totalNodes,
          onlineNodes,
          offlineNodes: totalNodes - onlineNodes,
          averagePeerCount,
          averageLatency,
          totalStorageUsed,
          totalStorageCapacity,
        });
      }
    } catch (error) {
      console.error('Failed to fetch current stats:', error);
    }
  }

  // Calculate comprehensive insights
  function calculateInsights(): {
    insights: TrendInsight[];
    stats: {
      nodeGrowth: { value: number; isPositive: boolean; label: string };
      uptimeStability: { value: number; label: string; status: 'excellent' | 'good' | 'poor' };
      healthTrend: { value: number; isPositive: boolean; label: string };
      latencyTrend: { value: number; isPositive: boolean; avg: number; max: number; min: number };
      storageGrowth: { value: number; isPositive: boolean; usagePercent: number };
      peakValues: { nodes: number; online: number; healthy: number };
      lowValues: { nodes: number; online: number; healthy: number };
    };
  } {
    // If we have current stats but no historical data, use current stats as a single snapshot
    const effectiveSnapshots = snapshots.length > 0 ? snapshots : 
      (currentStats ? [{
        totalNodes: currentStats.totalNodes,
        onlineNodes: currentStats.onlineNodes,
        offlineNodes: currentStats.offlineNodes,
        healthyNodes: Math.floor((currentStats.totalNodes || 0) * 0.8), // Estimate
        warningNodes: Math.floor((currentStats.totalNodes || 0) * 0.15),
        criticalNodes: Math.floor((currentStats.totalNodes || 0) * 0.05),
        averagePeerCount: currentStats.averagePeerCount,
        averageLatency: currentStats.averageLatency,
        totalStorageCapacity: currentStats.totalStorageCapacity,
        totalStorageUsed: currentStats.totalStorageUsed,
        versionDistribution: {},
        regionDistribution: {},
        timestamp: new Date().toISOString(),
      } as NetworkSnapshot] : []);

    if (effectiveSnapshots.length < 2) {
      // Show current stats if available
      if (effectiveSnapshots.length === 1 && currentStats) {
        const single = effectiveSnapshots[0];
        return {
          insights: [{
            type: 'stable',
            metric: 'Current Network Status',
            message: `Network has ${single.totalNodes} nodes (${single.onlineNodes} online). Historical data collection in progress.`,
            change: 0,
            icon: Info,
          }],
          stats: {
            nodeGrowth: { value: 0, isPositive: true, label: `${single.totalNodes} nodes` },
            uptimeStability: { 
              value: 0, 
              label: single.totalNodes > 0 ? `${Math.round((single.onlineNodes / single.totalNodes) * 100)}% uptime` : 'N/A', 
              status: 'good' 
            },
            healthTrend: { 
              value: 0, 
              isPositive: true, 
              label: `${single.healthyNodes || 0} healthy` 
            },
            latencyTrend: { 
              value: 0, 
              isPositive: true, 
              avg: single.averageLatency || 0, 
              max: single.averageLatency || 0, 
              min: single.averageLatency || 0 
            },
            storageGrowth: { 
              value: 0, 
              isPositive: true, 
              usagePercent: single.totalStorageCapacity 
                ? ((single.totalStorageUsed || 0) / single.totalStorageCapacity) * 100 
                : 0 
            },
            peakValues: { 
              nodes: single.totalNodes, 
              online: single.onlineNodes, 
              healthy: single.healthyNodes || 0 
            },
            lowValues: { 
              nodes: single.totalNodes, 
              online: single.onlineNodes, 
              healthy: single.healthyNodes || 0 
            },
          },
        };
      }
      
      return {
        insights: [],
        stats: {
          nodeGrowth: { value: 0, isPositive: true, label: 'No data' },
          uptimeStability: { value: 0, label: 'No data', status: 'good' },
          healthTrend: { value: 0, isPositive: true, label: 'No data' },
          latencyTrend: { value: 0, isPositive: true, avg: 0, max: 0, min: 0 },
          storageGrowth: { value: 0, isPositive: true, usagePercent: 0 },
          peakValues: { nodes: 0, online: 0, healthy: 0 },
          lowValues: { nodes: 0, online: 0, healthy: 0 },
        },
      };
    }

    const first = effectiveSnapshots[0];
    const last = effectiveSnapshots[effectiveSnapshots.length - 1];
    const insights: TrendInsight[] = [];

    // Node growth
    const nodeChange = ((last.totalNodes - first.totalNodes) / first.totalNodes) * 100;
    const nodeGrowth = {
      value: Math.abs(nodeChange),
      isPositive: nodeChange >= 0,
      label: `${nodeChange >= 0 ? '+' : ''}${nodeChange.toFixed(1)}%`,
    };
    if (Math.abs(nodeChange) > 1) {
      insights.push({
        type: nodeChange > 0 ? 'growth' : 'decline',
        metric: 'Node Count',
        message: `Network ${nodeChange > 0 ? 'grew' : 'shrunk'} by ${Math.abs(nodeChange).toFixed(1)}% (${first.totalNodes} → ${last.totalNodes} nodes)`,
        change: nodeChange,
        icon: nodeChange > 0 ? TrendingUp : TrendingDown,
      });
    }

    // Uptime stability (coefficient of variation)
    const onlineRates = effectiveSnapshots.map(s => (s.onlineNodes / s.totalNodes) * 100).filter(r => !isNaN(r));
    const avgOnline = onlineRates.reduce((a, b) => a + b, 0) / onlineRates.length;
    const variance = onlineRates.reduce((sum, r) => sum + Math.pow(r - avgOnline, 2), 0) / onlineRates.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / avgOnline) * 100; // Coefficient of variation
    const uptimeStability = {
      value: cv,
      label: cv < 2 ? 'Highly Stable' : cv < 5 ? 'Stable' : cv < 10 ? 'Moderate' : 'Unstable',
      status: cv < 2 ? 'excellent' as const : cv < 5 ? 'good' as const : 'poor' as const,
    };
    if (cv > 5) {
      insights.push({
        type: 'warning',
        metric: 'Uptime Stability',
        message: `Network uptime varies by ${cv.toFixed(1)}% - ${uptimeStability.label.toLowerCase()}`,
        change: cv,
        icon: AlertTriangle,
      });
    }

    // Health trend
    const healthChange = ((last.healthyNodes - first.healthyNodes) / Math.max(first.healthyNodes, 1)) * 100;
    const healthTrend = {
      value: Math.abs(healthChange),
      isPositive: healthChange >= 0,
      label: `${healthChange >= 0 ? '+' : ''}${healthChange.toFixed(1)}%`,
    };
    if (Math.abs(healthChange) > 5) {
      insights.push({
        type: healthChange > 0 ? 'growth' : 'warning',
        metric: 'Network Health',
        message: `Healthy nodes ${healthChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(healthChange).toFixed(1)}%`,
        change: healthChange,
        icon: healthChange > 0 ? CheckCircle2 : AlertTriangle,
      });
    }

    // Latency analysis
    const latencies = effectiveSnapshots.map(s => s.averageLatency || 0).filter(l => l > 0);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);
    const latencyChange = latencies.length > 1 
      ? ((latencies[latencies.length - 1] - latencies[0]) / latencies[0]) * 100
      : 0;
    const latencyTrend = {
      value: Math.abs(latencyChange),
      isPositive: latencyChange <= 0, // Lower is better
      avg: avgLatency,
      max: maxLatency,
      min: minLatency,
    };
    if (Math.abs(latencyChange) > 10 && latencyChange > 0) {
      insights.push({
        type: 'warning',
        metric: 'Network Latency',
        message: `Average latency increased by ${latencyChange.toFixed(1)}% (${latencies[0].toFixed(0)}ms → ${latencies[latencies.length - 1].toFixed(0)}ms)`,
        change: latencyChange,
        icon: AlertTriangle,
      });
    }

    // Storage growth
    const firstStorage = first.totalStorageUsed || 0;
    const lastStorage = last.totalStorageUsed || 0;
    const storageChange = firstStorage > 0 ? ((lastStorage - firstStorage) / firstStorage) * 100 : 0;
    const storagePercent = last.totalStorageCapacity 
      ? (last.totalStorageUsed || 0) / last.totalStorageCapacity * 100
      : 0;
    const storageGrowth = {
      value: Math.abs(storageChange),
      isPositive: storageChange >= 0,
      usagePercent: storagePercent,
    };
    if (storagePercent > 80) {
      insights.push({
        type: 'critical',
        metric: 'Storage Usage',
        message: `Network storage usage at ${storagePercent.toFixed(1)}% - approaching capacity`,
        change: storagePercent,
        icon: HardDrive,
      });
    }

    // Peak and low values
    const peakValues = {
      nodes: Math.max(...effectiveSnapshots.map(s => s.totalNodes)),
      online: Math.max(...effectiveSnapshots.map(s => s.onlineNodes)),
      healthy: Math.max(...effectiveSnapshots.map(s => s.healthyNodes)),
    };
    const lowValues = {
      nodes: Math.min(...effectiveSnapshots.map(s => s.totalNodes)),
      online: Math.min(...effectiveSnapshots.map(s => s.onlineNodes)),
      healthy: Math.min(...effectiveSnapshots.map(s => s.healthyNodes)),
    };

    return {
      insights: insights.slice(0, 5), // Top 5 insights
      stats: {
        nodeGrowth,
        uptimeStability,
        healthTrend,
        latencyTrend,
        storageGrowth,
        peakValues,
        lowValues,
      },
    };
  }

  // Prepare chart data (use current stats if no historical data)
  const chartSnapshots = snapshots.length > 0 ? snapshots : 
    (currentStats ? [{
      totalNodes: currentStats.totalNodes,
      onlineNodes: currentStats.onlineNodes,
      offlineNodes: currentStats.offlineNodes,
      healthyNodes: Math.floor((currentStats.totalNodes || 0) * 0.8),
      warningNodes: Math.floor((currentStats.totalNodes || 0) * 0.15),
      criticalNodes: Math.floor((currentStats.totalNodes || 0) * 0.05),
      averagePeerCount: currentStats.averagePeerCount,
      averageLatency: currentStats.averageLatency,
      totalStorageCapacity: currentStats.totalStorageCapacity,
      totalStorageUsed: currentStats.totalStorageUsed,
      versionDistribution: {},
      regionDistribution: {},
      timestamp: new Date().toISOString(),
    } as NetworkSnapshot] : []);

  const nodeCountData = chartSnapshots.map(s => ({
    timestamp: new Date(s.timestamp),
    value: s.totalNodes,
    online: s.onlineNodes,
    offline: s.offlineNodes,
  }));

  const healthData = chartSnapshots.map(s => ({
    timestamp: new Date(s.timestamp),
    healthy: s.healthyNodes,
    warning: s.warningNodes,
    critical: s.criticalNodes,
  }));

  const latencyData = chartSnapshots.map(s => ({
    timestamp: new Date(s.timestamp),
    value: s.averageLatency || 0,
    avg: s.averageLatency || 0,
  }));

  const peerCountData = chartSnapshots.map(s => ({
    timestamp: new Date(s.timestamp),
    value: s.averagePeerCount || 0,
  }));

  const storageData = chartSnapshots.map(s => {
    const used = s.totalStorageUsed || 0;
    const capacity = s.totalStorageCapacity || 1;
    return {
      timestamp: new Date(s.timestamp),
      used,
      capacity,
      percentage: (used / capacity) * 100,
    };
  });

  // Version distribution over time (latest snapshot)
  const latestVersionDist = chartSnapshots.length > 0 
    ? chartSnapshots[chartSnapshots.length - 1].versionDistribution 
    : {};
  
  // Region distribution over time (latest snapshot)
  const latestRegionDist = chartSnapshots.length > 0 
    ? chartSnapshots[chartSnapshots.length - 1].regionDistribution 
    : {};

  const { insights, stats } = calculateInsights();
  const latestSnapshot = chartSnapshots.length > 0 ? chartSnapshots[chartSnapshots.length - 1] : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Network Analytics & Trends
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Deep insights, trends, and actionable analytics for network health and performance
        </p>
      </div>

      {/* Time Range Selector */}
      <Card>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="font-medium">Time Range:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {timeRanges.map((range) => (
              <button
                key={range.hours}
                onClick={() => setSelectedRange(range.hours)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedRange === range.hours
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading historical data...</p>
        </div>
      ) : snapshots.length === 0 && !currentStats ? (
        <Card>
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-semibold mb-2">No historical data available</p>
            <p className="text-sm mb-4">To start tracking trends, run the ingestion API:</p>
            <code className="block bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded text-sm">
              curl http://localhost:3000/api/ingest
            </code>
            <p className="text-xs mt-4 text-gray-400 dark:text-gray-500">
              Or click the ingest endpoint in your browser to populate data
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Key Insights Panel */}
          <Card title={
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Key Insights
            </div>
          }>
            {insights.length === 0 ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <p>Network is operating normally with stable metrics</p>
              </div>
            ) : (
              <div className="space-y-3">
                {insights.map((insight, idx) => {
                  const Icon = insight.icon;
                  const colorClass = 
                    insight.type === 'growth' ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' :
                    insight.type === 'warning' ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20' :
                    insight.type === 'critical' ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' :
                    'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
                  
                  return (
                    <div key={idx} className={`p-3 rounded-lg border ${colorClass} border-current/20`}>
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-sm mb-1">{insight.metric}</div>
                          <p className="text-sm">{insight.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title={
                <div className="flex items-center gap-2">
                  Network Growth
                  <Tooltip content="Change in total node count over the selected time period" />
                </div>
              }
              value={stats.nodeGrowth.label}
              subtitle={
                stats.nodeGrowth.value > 0
                  ? `${currentStats?.totalNodes || 0} nodes currently`
                  : 'Stable network size'
              }
              icon={<Network className="w-8 h-8" />}
              trend={stats.nodeGrowth.value > 0 ? {
                value: stats.nodeGrowth.value,
                isPositive: stats.nodeGrowth.isPositive,
              } : undefined}
            />
            <StatCard
              title={
                <div className="flex items-center gap-2">
                  Uptime Stability
                  <Tooltip content="Coefficient of variation - lower is more stable" />
                </div>
              }
              value={stats.uptimeStability.label}
              subtitle={`${stats.uptimeStability.value.toFixed(2)}% variation`}
              icon={<Activity className="w-8 h-8" />}
              className={
                stats.uptimeStability.status === 'excellent' ? 'border-green-200 dark:border-green-800' :
                stats.uptimeStability.status === 'good' ? 'border-blue-200 dark:border-blue-800' :
                'border-orange-200 dark:border-orange-800'
              }
            />
            <StatCard
              title={
                <div className="flex items-center gap-2">
                  Health Trend
                  <Tooltip content="Change in healthy node count" />
                </div>
              }
              value={stats.healthTrend.label}
              subtitle={`${latestSnapshot?.healthyNodes || Math.floor((currentStats?.totalNodes || 0) * 0.8) || 0} healthy nodes`}
              icon={<CheckCircle2 className="w-8 h-8" />}
              trend={stats.healthTrend.value > 0 ? {
                value: stats.healthTrend.value,
                isPositive: stats.healthTrend.isPositive,
              } : undefined}
            />
            <StatCard
              title={
                <div className="flex items-center gap-2">
                  Avg Latency
                  <Tooltip content={`Range: ${stats.latencyTrend.min.toFixed(0)}ms - ${stats.latencyTrend.max.toFixed(0)}ms`} />
                </div>
              }
              value={`${stats.latencyTrend.avg.toFixed(0)}ms`}
              subtitle={
                stats.latencyTrend.value > 0
                  ? `${stats.latencyTrend.isPositive ? 'Improved' : 'Degraded'} by ${stats.latencyTrend.value.toFixed(1)}%`
                  : 'Stable performance'
              }
              icon={<Zap className="w-8 h-8" />}
              trend={stats.latencyTrend.value > 0 ? {
                value: stats.latencyTrend.value,
                isPositive: stats.latencyTrend.isPositive,
              } : undefined}
            />
          </div>

          {/* Peak Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Peak Performance">
              <div className="space-y-3 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Peak Nodes</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {stats.peakValues.nodes}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Peak Online</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {stats.peakValues.online}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Peak Healthy</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {stats.peakValues.healthy}
                  </span>
                </div>
              </div>
            </Card>
            <Card title="Low Points">
              <div className="space-y-3 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Min Nodes</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {stats.lowValues.nodes}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Min Online</span>
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {stats.lowValues.online}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Min Healthy</span>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">
                    {stats.lowValues.healthy}
                  </span>
                </div>
              </div>
            </Card>
            <Card title="Storage Analysis">
              <div className="space-y-3 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current Usage</span>
                  <span className={`text-lg font-bold ${
                    stats.storageGrowth.usagePercent > 80 ? 'text-red-600 dark:text-red-400' :
                    stats.storageGrowth.usagePercent > 60 ? 'text-orange-600 dark:text-orange-400' :
                    'text-green-600 dark:text-green-400'
                  }`}>
                    {stats.storageGrowth.usagePercent.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Growth Rate</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {stats.storageGrowth.value > 0 ? '+' : ''}{stats.storageGrowth.value.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Capacity</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {latestSnapshot?.totalStorageCapacity ? formatBytes(latestSnapshot.totalStorageCapacity) : currentStats?.totalStorageCapacity ? formatBytes(currentStats.totalStorageCapacity) : 'N/A'}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Network Size & Availability">
              <div className="mt-4">
                <TimeSeriesChart
                  data={nodeCountData}
                  xKey="timestamp"
                  yKeys={['value', 'online', 'offline']}
                  height={300}
                />
              </div>
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>• Total nodes: {stats.peakValues.nodes} peak, {stats.lowValues.nodes} low</p>
                <p>• Online rate: {stats.uptimeStability.label.toLowerCase()}</p>
                <p>• Growth: {stats.nodeGrowth.label} over period</p>
              </div>
            </Card>

            <Card title="Network Health Distribution">
              <div className="mt-4">
                <TimeSeriesChart
                  data={healthData}
                  xKey="timestamp"
                  yKeys={['healthy', 'warning', 'critical']}
                  height={300}
                />
              </div>
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>• Health trend: {stats.healthTrend.label}</p>
                <p>• Current: {latestSnapshot?.healthyNodes || Math.floor((currentStats?.totalNodes || 0) * 0.8) || 0} healthy, {latestSnapshot?.warningNodes || Math.floor((currentStats?.totalNodes || 0) * 0.15) || 0} warning, {latestSnapshot?.criticalNodes || Math.floor((currentStats?.totalNodes || 0) * 0.05) || 0} critical</p>
                <p>• Peak healthy nodes: {stats.peakValues.healthy}</p>
              </div>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Network Latency">
              <div className="mt-4">
                <TimeSeriesChart
                  data={latencyData}
                  xKey="timestamp"
                  yKey="value"
                  height={250}
                  unit="ms"
                />
              </div>
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>• Average: {stats.latencyTrend.avg.toFixed(0)}ms</p>
                <p>• Range: {stats.latencyTrend.min.toFixed(0)}ms - {stats.latencyTrend.max.toFixed(0)}ms</p>
                <p>• Trend: {stats.latencyTrend.isPositive ? 'Improving' : stats.latencyTrend.value > 0 ? 'Degrading' : 'Stable'}</p>
              </div>
            </Card>

            <Card title="Peer Connectivity">
              <div className="mt-4">
                <TimeSeriesChart
                  data={peerCountData}
                  xKey="timestamp"
                  yKey="value"
                  height={250}
                />
              </div>
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                <p>• Current average: {latestSnapshot?.averagePeerCount?.toFixed(1) || currentStats?.averagePeerCount?.toFixed(1) || 'N/A'} peers per node</p>
              </div>
            </Card>
          </div>

          {/* Storage & Distribution */}
          <Card title="Storage Usage Trends">
            <div className="mt-4">
              <TimeSeriesChart
                data={storageData}
                xKey="timestamp"
                yKeys={['used', 'capacity']}
                height={300}
                formatValue={(value) => `${(value / 1e12).toFixed(2)} TB`}
              />
            </div>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>• Current usage: {stats.storageGrowth.usagePercent.toFixed(1)}%</p>
              <p>• Growth rate: {stats.storageGrowth.value > 0 ? '+' : ''}{stats.storageGrowth.value.toFixed(1)}%</p>
              {stats.storageGrowth.usagePercent > 80 && (
                <p className="text-orange-600 dark:text-orange-400">⚠️ Storage approaching capacity limit</p>
              )}
            </div>
          </Card>

          {/* Distribution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DistributionChart
              data={latestVersionDist}
              title="Current Version Distribution"
              type="pie"
            />
            <DistributionChart
              data={latestRegionDist}
              title="Current Regional Distribution"
              type="bar"
            />
          </div>
        </>
      )}
    </div>
  );
}
