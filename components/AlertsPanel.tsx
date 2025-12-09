'use client';

import { useEffect, useState } from 'react';
import { Card } from './Card';
import { AlertCircle, X, CheckCircle2, Bell, AlertTriangle, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface Alert {
  id: string;
  nodeId: string | null;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  acknowledged: boolean;
  resolved: boolean;
  createdAt: Date | string;
  nodeInfo?: {
    publicKey?: string | null;
    region?: string | null;
    version?: string | null;
    isValidator?: boolean;
  } | null;
}

interface AlertsPanelProps {
  limit?: number;
  showResolved?: boolean;
  compact?: boolean;
}

const severityColors = {
  critical: 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300',
  high: 'bg-orange-100 dark:bg-orange-900/30 border-orange-500 text-orange-700 dark:text-orange-300',
  medium: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 text-yellow-700 dark:text-yellow-300',
  low: 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300',
};

const severityIcons = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: Bell,
  low: Bell,
};

export function AlertsPanel({ limit = 10, showResolved = false, compact = false }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  useEffect(() => {
    fetchAlerts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [filterSeverity, showResolved]);

  async function fetchAlerts() {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        resolved: showResolved ? 'true' : 'false',
      });
      if (filterSeverity !== 'all') {
        params.append('severity', filterSeverity);
      }

      const res = await fetch(`/api/alerts?${params}`);
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsResolved(alertId: string) {
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alertId, resolved: true }),
      });
      fetchAlerts();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  }

  async function clearAllAlerts() {
    if (!confirm('Clear all active alerts?')) return;
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      });
      fetchAlerts();
    } catch (error) {
      console.error('Failed to clear alerts:', error);
    }
  }

  function getNodeDisplayName(alert: Alert): string {
    if (!alert.nodeId) return 'Network';
    
    if (alert.nodeInfo?.publicKey) {
      const pubkey = alert.nodeInfo.publicKey;
      return `${pubkey.slice(0, 8)}...${pubkey.slice(-6)}`;
    }
    
    // Fallback to nodeId
    return `${alert.nodeId.slice(0, 8)}...${alert.nodeId.slice(-6)}`;
  }

  if (loading) {
    return (
      <Card title="Alerts">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading alerts...</div>
      </Card>
    );
  }

  const activeAlerts = alerts.filter(a => !a.resolved);
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const highCount = activeAlerts.filter(a => a.severity === 'high').length;

  if (compact) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alerts
          </h3>
          <div className="flex items-center gap-2">
            {activeAlerts.length > 0 && (
              <>
                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-medium">
                  {activeAlerts.length}
                </span>
                <button
                  onClick={clearAllAlerts}
                  className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  title="Clear all alerts"
                >
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>
        {activeAlerts.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">No active alerts</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">All systems normal</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeAlerts.slice(0, limit).map((alert) => {
              const Icon = severityIcons[alert.severity];
              const nodeName = getNodeDisplayName(alert);
              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${severityColors[alert.severity]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {alert.nodeId && (
                            <Link
                              href={`/nodes/${alert.nodeId}`}
                              className="font-semibold text-sm hover:underline flex items-center gap-1"
                            >
                              {nodeName}
                              {alert.nodeInfo?.region && (
                                <span className="text-xs opacity-75">({alert.nodeInfo.region})</span>
                              )}
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                          {!alert.nodeId && (
                            <span className="font-semibold text-sm">Network Alert</span>
                          )}
                        </div>
                        <p className="text-sm mt-1 break-words">{alert.message}</p>
                        <p className="text-xs mt-1 opacity-75">
                          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => markAsResolved(alert.id)}
                      className="flex-shrink-0 p-1 hover:bg-white/20 dark:hover:bg-black/20 rounded"
                      title="Mark as resolved"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card title="Alerts">
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {criticalCount > 0 && (
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-medium">
              {criticalCount} Critical
            </span>
          )}
          {highCount > 0 && (
            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-xs font-medium">
              {highCount} High
            </span>
          )}
        </div>
        {activeAlerts.length > 0 && (
          <button
            onClick={clearAllAlerts}
            className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {activeAlerts.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Active Alerts
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            All systems operating normally
          </p>
          {!compact && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg max-w-md mx-auto">
              <p className="text-xs text-blue-900 dark:text-blue-100 font-medium mb-1">
                Alert monitoring is active
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Alerts are automatically generated when issues are detected during data ingestion.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {activeAlerts.map((alert) => {
            const Icon = severityIcons[alert.severity];
            const nodeName = getNodeDisplayName(alert);
            return (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${severityColors[alert.severity]}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm uppercase tracking-wide">
                          {alert.severity}
                        </span>
                        <span className="text-xs opacity-75">•</span>
                        <span className="text-xs opacity-75">{alert.type}</span>
                      </div>
                      <div className="mb-2">
                        {alert.nodeId ? (
                          <Link
                            href={`/nodes/${alert.nodeId}`}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline mb-1"
                          >
                            Node: {nodeName}
                            {alert.nodeInfo?.region && (
                              <span className="text-xs font-normal opacity-75">
                                ({alert.nodeInfo.region})
                              </span>
                            )}
                            {alert.nodeInfo?.isValidator && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                Validator
                              </span>
                            )}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <span className="text-sm font-semibold">Network Alert</span>
                        )}
                        <p className="text-sm mt-1">{alert.message}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs opacity-75 flex-wrap">
                        {alert.nodeInfo?.version && (
                          <span>Version: {alert.nodeInfo.version}</span>
                        )}
                        <span>
                          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => markAsResolved(alert.id)}
                    className="flex-shrink-0 p-2 hover:bg-white/20 dark:hover:bg-black/20 rounded transition-colors"
                    title="Mark as resolved"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

