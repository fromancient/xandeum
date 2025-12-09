'use client';

import { useEffect, useState } from 'react';
import { AlertsPanel } from '@/components/AlertsPanel';
import { Card } from '@/components/Card';
import { StatCard } from '@/components/StatCard';
import { 
  Bell, AlertTriangle, CheckCircle2, Activity, 
  TrendingUp, Info, Zap, Server, AlertCircle 
} from 'lucide-react';
import { useNodes } from '@/hooks/useNodes';
import { calculateHealthScore, detectAnomalies } from '@/lib/health';
import { calculateNetworkStats } from '@/lib/prpc';
import Link from 'next/link';

interface AlertStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved: number;
}

export default function AlertsPage() {
  const { data: nodesData } = useNodes({ page: 1, pageSize: 500 });
  const [alertStats, setAlertStats] = useState<AlertStats>({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlertStats();
  }, []);

  async function fetchAlertStats() {
    setLoading(true);
    try {
      // Fetch all alerts for stats
      const res = await fetch('/api/alerts?limit=1000');
      const data = await res.json();
      const alerts = data.alerts || [];
      
      const stats: AlertStats = {
        total: alerts.filter((a: any) => !a.resolved).length,
        critical: alerts.filter((a: any) => !a.resolved && a.severity === 'critical').length,
        high: alerts.filter((a: any) => !a.resolved && a.severity === 'high').length,
        medium: alerts.filter((a: any) => !a.resolved && a.severity === 'medium').length,
        low: alerts.filter((a: any) => !a.resolved && a.severity === 'low').length,
        resolved: alerts.filter((a: any) => a.resolved).length,
      };
      
      setAlertStats(stats);
    } catch (error) {
      console.error('Failed to fetch alert stats:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate potential alerts from current nodes
  const nodes = nodesData?.nodes || [];
  const stats = calculateNetworkStats(nodes);
  const healthScores = nodes.map(n => calculateHealthScore(n));
  
  // Count nodes that would trigger alerts
  const nodesWithIssues = {
    offline: nodes.filter(n => n.status === 'offline').length,
    highLatency: nodes.filter(n => n.latency && n.latency > 1000).length,
    criticalHealth: healthScores.filter(h => h.score < 50).length,
    warningHealth: healthScores.filter(h => h.score >= 50 && h.score < 80).length,
    lowPeers: nodes.filter(n => n.peerCount < 5).length,
    storageFull: nodes.filter(n => {
      if (!n.storageCapacity || !n.storageUsed) return false;
      return (n.storageUsed / n.storageCapacity) * 100 > 95;
    }).length,
  };

  const potentialAlerts = 
    nodesWithIssues.offline +
    nodesWithIssues.highLatency +
    nodesWithIssues.criticalHealth +
    nodesWithIssues.storageFull;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Alerts & Notifications
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor and manage network alerts, anomalies, and health issues
        </p>
      </div>

      {/* Alert Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Alerts"
          value={alertStats.total}
          subtitle={`${alertStats.critical} critical, ${alertStats.high} high`}
          icon={<Bell className="w-8 h-8" />}
          className={alertStats.total > 0 ? 'border-red-200 dark:border-red-800' : ''}
        />
        <StatCard
          title="Critical"
          value={alertStats.critical}
          subtitle="Requires immediate attention"
          icon={<AlertCircle className="w-8 h-8" />}
          className={alertStats.critical > 0 ? 'border-red-200 dark:border-red-800' : ''}
        />
        <StatCard
          title="Resolved"
          value={alertStats.resolved}
          subtitle="Previously resolved alerts"
          icon={<CheckCircle2 className="w-8 h-8" />}
        />
        <StatCard
          title="Network Health"
          value={healthScores.length > 0 ? `${Math.round((healthScores.filter(h => h.score >= 80).length / healthScores.length) * 100)}%` : 'N/A'}
          subtitle={`${healthScores.filter(h => h.score >= 80).length} of ${healthScores.length} nodes healthy`}
          icon={<Activity className="w-8 h-8" />}
        />
      </div>

      {/* Potential Issues Summary */}
      {nodes.length > 0 && (
        <Card title="Current Network Status & Potential Alerts">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {nodesWithIssues.offline}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Offline Nodes
              </div>
              {nodesWithIssues.offline > 0 && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  ⚠ Critical
                </div>
              )}
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {nodesWithIssues.criticalHealth}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Critical Health
              </div>
              {nodesWithIssues.criticalHealth > 0 && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  ⚠ Critical
                </div>
              )}
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {nodesWithIssues.warningHealth}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Warning Health
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {nodesWithIssues.highLatency}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                High Latency
              </div>
              {nodesWithIssues.highLatency > 0 && (
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  ⚠ Warning
                </div>
              )}
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {nodesWithIssues.lowPeers}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Low Peer Count
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {nodesWithIssues.storageFull}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Storage Full
              </div>
              {nodesWithIssues.storageFull > 0 && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  ⚠ High
                </div>
              )}
            </div>
          </div>
          {potentialAlerts > 0 && alertStats.total === 0 && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Issues Detected But No Active Alerts
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    There are {potentialAlerts} potential issues in the network, but no alerts have been generated yet. 
                    Alerts are created when you run the ingestion API. 
                    <Link href="/nodes" className="underline ml-1">View nodes</Link> to see details.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Alert Information */}
      <Card title="Alert Types & Thresholds">
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="font-semibold text-red-600 dark:text-red-400">Critical Alerts</span>
              </div>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-7">
                <li>• Node is offline</li>
                <li>• Node not seen for more than 24 hours</li>
                <li>• Health score below 50</li>
              </ul>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <span className="font-semibold text-orange-600 dark:text-orange-400">High Priority</span>
              </div>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-7">
                <li>• Storage usage above 95%</li>
                <li>• Latency above 2000ms</li>
                <li>• Node not seen for 1-24 hours</li>
              </ul>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <span className="font-semibold text-yellow-600 dark:text-yellow-400">Medium Priority</span>
              </div>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-7">
                <li>• Latency between 1000-2000ms</li>
                <li>• Peer count drop &gt;50%</li>
                <li>• Health score 50-79</li>
              </ul>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-blue-600 dark:text-blue-400">Low Priority</span>
              </div>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-7">
                <li>• Minor performance issues</li>
                <li>• Version mismatches</li>
                <li>• Non-critical anomalies</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* How Alerts Work */}
      {alertStats.total === 0 && (
        <Card>
          <div className="flex items-start gap-4">
            <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-lg mb-2">How Alerts Work</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                Alerts are automatically generated when you run the ingestion API. The system monitors:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                <li>Node online/offline status</li>
                <li>Network latency and performance</li>
                <li>Storage capacity and usage</li>
                <li>Peer connectivity</li>
                <li>Node health scores</li>
              </ul>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  To generate alerts:
                </p>
                <code className="block bg-gray-900 dark:bg-gray-950 text-gray-100 px-4 py-2 rounded text-sm">
                  curl http://localhost:3000/api/ingest
                </code>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Run this command periodically (e.g., every hour via cron) to continuously monitor and generate alerts.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Active Alerts */}
      <AlertsPanel limit={100} showResolved={false} compact={false} />
    </div>
  );
}
