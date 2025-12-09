'use client';

import { useEffect } from 'react';
import { useNodes } from '@/hooks/useNodes';
import { calculateNetworkStats } from '@/lib/prpc';
import { StatCard } from '@/components/StatCard';
import { DistributionChart } from '@/components/DistributionChart';
import { AlertsPanel } from '@/components/AlertsPanel';
import { TrendCharts } from '@/components/TrendCharts';
import { Network, Server, HardDrive, Activity, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { Card } from '@/components/Card';
import { Tooltip } from '@/components/Tooltip';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { calculateHealthScore } from '@/lib/health';
import { saveNetworkSnapshot } from '@/lib/clientHistory';

export default function DashboardPage() {
  const { data, isLoading, error } = useNodes({ page: 1, pageSize: 500 });
  const nodes = data?.nodes || [];
  const totalNodes = data?.total ?? nodes.length;
  const stats = calculateNetworkStats(nodes);
  const validatorCount = stats.validatorCount || 0;

  // Save network snapshot periodically (every 5 minutes)
  useEffect(() => {
    if (nodes.length === 0) return;
    
    // Save immediately
    saveNetworkSnapshot(nodes);
    
    // Then save every 5 minutes
    const interval = setInterval(() => {
      saveNetworkSnapshot(nodes);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [nodes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading network data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card>
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">Error loading network data</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">{String(error)}</p>
          </div>
        </Card>
      </div>
    );
  }

  const onlinePercentage = stats.totalNodes > 0 
    ? Math.round((stats.onlineNodes / stats.totalNodes) * 100) 
    : 0;
  const storagePercentage = stats.totalStorageCapacity > 0
    ? Math.round((stats.totalStorageUsed / stats.totalStorageCapacity) * 100)
    : 0;

  // Calculate health distribution
  const healthScores = nodes.map(n => calculateHealthScore(n));
  const healthyCount = healthScores.filter(h => h.score >= 80).length;
  const warningCount = healthScores.filter(h => h.score >= 50 && h.score < 80).length;
  const criticalCount = healthScores.filter(h => h.score < 50).length;
  const healthDistribution = {
    'Healthy (80-100)': healthyCount,
    'Warning (50-79)': warningCount,
    'Critical (0-49)': criticalCount,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Network Overview
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time monitoring and analytics for Xandeum pNodes
        </p>
      </div>

      {/* Alerts Summary - Show at top if there are critical alerts */}
      <AlertsPanel limit={5} compact={true} />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={
            <div className="flex items-center gap-2">
              Total Nodes
              <Tooltip content="Total number of pNodes in the network. Includes both online and offline nodes." />
            </div>
          }
          value={totalNodes}
          subtitle={`Showing ${nodes.length} loaded${stats.onlineNodes || stats.offlineNodes ? ` • ${stats.onlineNodes} online, ${stats.offlineNodes} offline` : ''}`}
          icon={<Network className="w-8 h-8" />}
        />
        <StatCard
          title={
            <div className="flex items-center gap-2">
              Validators
              <Tooltip content="Nodes that have vote accounts and participate in consensus. These nodes are responsible for validating transactions and blocks." />
            </div>
          }
          value={validatorCount}
          subtitle="Nodes with vote accounts"
          icon={<Server className="w-8 h-8" />}
        />
        <StatCard
          title={
            <div className="flex items-center gap-2">
              Online Status
              <Tooltip content="Percentage of nodes currently online and responding. Offline nodes may be experiencing issues or maintenance." />
            </div>
          }
          value={`${onlinePercentage}%`}
          subtitle={`${stats.onlineNodes} of ${stats.totalNodes} nodes`}
          icon={<Activity className="w-8 h-8" />}
        />
        <StatCard
          title={
            <div className="flex items-center gap-2">
              Storage Used
              <Tooltip content="Total storage capacity utilized across all nodes. High usage may indicate nodes approaching capacity limits." />
            </div>
          }
          value={formatBytes(stats.totalStorageUsed)}
          subtitle={`${storagePercentage}% of ${formatBytes(stats.totalStorageCapacity)}`}
          icon={<HardDrive className="w-8 h-8" />}
        />
        <StatCard
          title={
            <div className="flex items-center gap-2">
              Healthy Nodes
              <Tooltip content="Nodes with health scores 80-100. Health score combines uptime, latency, peer count, storage, and recency. Warning (50-79) and Critical (&lt;50) nodes may need attention." />
            </div>
          }
          value={healthyCount}
          subtitle={`${warningCount} warning, ${criticalCount} critical`}
          icon={<CheckCircle2 className="w-8 h-8" />}
          className={healthyCount === totalNodes ? 'border-green-200 dark:border-green-800' : ''}
        />
        <StatCard
          title={
            <div className="flex items-center gap-2">
              Avg Peer Count
              <Tooltip content="Average number of peer connections per node. Higher peer count generally indicates better network connectivity and redundancy." />
            </div>
          }
          value={stats.averagePeerCount.toFixed(1)}
          subtitle={`Avg latency: ${stats.averageLatency.toFixed(0)}ms`}
          icon={<Server className="w-8 h-8" />}
        />
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DistributionChart
          data={healthDistribution}
          title="Health Distribution"
          type="pie"
        />
        <DistributionChart
          data={stats.versionDistribution}
          title="Version Distribution"
          type="pie"
        />
        <DistributionChart
          data={stats.regionDistribution}
          title="Regional Distribution"
          type="bar"
        />
      </div>

      {/* Trend Charts */}
      <TrendCharts hours={24} compact={false} />

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/nodes"
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Explore Nodes</h3>
              <p className="text-sm text-gray-500 dark:text-gray-500">View all pNodes in detail</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link
            href="/compare"
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Compare Nodes</h3>
              <p className="text-sm text-gray-500 dark:text-gray-500">Side-by-side comparison</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link
            href="/map"
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Network Map</h3>
              <p className="text-sm text-gray-500 dark:text-gray-500">Geographic visualization</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
