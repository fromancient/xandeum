'use client';

import { useNode, useNodeMetrics } from '@/hooks/useNodes';
import { useParams } from 'next/navigation';
import { Card } from '@/components/Card';
import { StatCard } from '@/components/StatCard';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import { calculateHealthScore, detectAnomalies } from '@/lib/health';
import { formatBytes, formatLatency, formatUptime, getStatusColor, cn, getStoragePercentage, getHealthStatusColor, getHealthStatusLabel } from '@/lib/utils';
import { Activity, Server, HardDrive, Clock, MapPin, Code, AlertTriangle, Network, BadgeCheck } from 'lucide-react';
import { Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/Button';

export default function NodeDetailPage() {
  const params = useParams();
  const nodeId = params.nodeId as string;
  
  const { data: node, isLoading, error } = useNode(nodeId);
  const { data: metrics = [] } = useNodeMetrics(nodeId, 24);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading node data...</p>
        </div>
      </div>
    );
  }

  if (error || !node) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card>
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">Node not found</p>
            <Link href="/nodes" className="text-blue-600 dark:text-blue-400 hover:underline">
              ← Back to nodes
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const health = calculateHealthScore(node);
  const anomalies = detectAnomalies(node);
  const storagePercent = getStoragePercentage(node.storageUsed, node.storageCapacity);
  const isValidator = node.metadata?.isValidator;
  const voteAccount = node.metadata?.voteAccount;
  const commission = node.metadata?.commission;

  const handleExport = () => {
    const dataStr = JSON.stringify(node, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `node-${node.id}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/nodes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 font-mono">
                {node.id}
              </h1>
              {isValidator && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
                  <BadgeCheck className="w-4 h-4" />
                  Validator
                </span>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {node.endpoint || node.ipAddress || 'No endpoint available'}
            </p>
          </div>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export JSON
        </Button>
      </div>

      {/* Health Score & Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Health Score"
          value={health.score}
          subtitle={getHealthStatusLabel(health.score)}
          icon={<Activity className="w-8 h-8" />}
          className={cn(getHealthStatusColor(health.score), "border-l-4")}
        />
        <StatCard
          title="Status"
          value={node.status}
          subtitle={`Last seen: ${new Date(node.lastSeen).toLocaleString()}`}
          icon={<Server className="w-8 h-8" />}
        />
        <StatCard
          title="Peer Count"
          value={node.peerCount}
          subtitle="Active connections"
          icon={<Network className="w-8 h-8" />}
        />
        <StatCard
          title="Uptime"
          value={formatUptime(node.uptime)}
          subtitle={node.availability ? `${node.availability.toFixed(1)}% availability` : undefined}
          icon={<Clock className="w-8 h-8" />}
        />
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <Card title="Anomalies Detected" className="border-yellow-500 border-l-4">
          <div className="space-y-2">
            {anomalies.map((anomaly, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
              >
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    {anomaly.message}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Severity: {anomaly.severity} • {new Date(anomaly.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Storage & Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Storage">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Used</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatBytes(node.storageUsed)} ({storagePercent}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3">
                <div
                  className={cn(
                    "h-3 rounded-full transition-all",
                    storagePercent > 90 ? "bg-red-500" : storagePercent > 70 ? "bg-yellow-500" : "bg-green-500"
                  )}
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Capacity</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatBytes(node.storageCapacity)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Free</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatBytes(node.storageFree)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Performance">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Latency</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatLatency(node.latency)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">Availability</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {node.availability?.toFixed(1) || 'N/A'}%
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Time Series Charts */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Latency Over Time">
            <TimeSeriesChart
              data={metrics}
              title="Latency Over Time"
              dataKey="latency"
              unit="ms"
              color="#3b82f6"
            />
          </Card>
          <Card title="Peer Count Over Time">
            <TimeSeriesChart
              data={metrics}
              title="Peer Count Over Time"
              dataKey="peerCount"
              color="#10b981"
            />
          </Card>
          <Card title="Storage Usage Over Time">
            <TimeSeriesChart
              data={metrics}
              title="Storage Usage Over Time"
              dataKey="storageUsed"
              unit=""
              color="#f59e0b"
            />
          </Card>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Node Information">
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Node ID</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">{node.id}</dd>
            </div>
            {node.publicKey && (
              <div>
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Public Key</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                  {node.publicKey}
                </dd>
              </div>
            )}
            {node.ipAddress && (
              <div>
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">IP Address</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">{node.ipAddress}</dd>
              </div>
            )}
            {node.endpoint && (
              <div>
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Endpoint</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                  {node.endpoint}
                </dd>
              </div>
            )}
            {node.softwareVersion && (
              <div>
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Software Version</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">
                  {node.softwareVersion}
                </dd>
              </div>
            )}
            {node.protocolVersion && (
              <div>
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Protocol Version</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{node.protocolVersion}</dd>
              </div>
            )}
            {node.buildInfo && (
              <div>
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Build Info</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">{node.buildInfo}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card title="Location & Network">
          <dl className="space-y-3">
            {node.location?.country && (
              <div>
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Country</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{node.location.country}</dd>
              </div>
            )}
            {node.location?.region && (
              <div>
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Region</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{node.location.region}</dd>
              </div>
            )}
            {node.location?.city && (
              <div>
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">City</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{node.location.city}</dd>
              </div>
            )}
            {node.location?.latitude && node.location?.longitude && (
              <div>
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Coordinates</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">
                  {node.location.latitude.toFixed(4)}, {node.location.longitude.toFixed(4)}
                </dd>
              </div>
            )}
            {isValidator && (
              <div>
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Validator</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">
                  Vote Account: {voteAccount || 'N/A'}
                  {typeof commission === 'number' && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-500">Commission: {commission}%</span>
                  )}
                </dd>
              </div>
            )}
            {node.peers && node.peers.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Connected Peers</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {node.peers.length} peers
                </dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      {/* Raw Data */}
      <Card title="Raw JSON Data">
        <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-xs font-mono">
          {JSON.stringify(node.rawData || node, null, 2)}
        </pre>
      </Card>
    </div>
  );
}

