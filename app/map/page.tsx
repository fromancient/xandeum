'use client';

import dynamic from 'next/dynamic';
import { useNodes } from '@/hooks/useNodes';
import { Card } from '@/components/Card';
import { MapPin, Activity, Server, HardDrive } from 'lucide-react';
import { pNode } from '@/types';
import { Skeleton } from '@/components/Skeleton';
import { calculateHealthScore } from '@/lib/health';
import { formatBytes } from '@/lib/utils';

// Dynamically import the map component to disable SSR (Leaflet needs browser DOM)
const NodeMap = dynamic(
  () => import('@/components/NodeMap').then((mod) => ({ default: mod.NodeMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 dark:bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    ),
  }
);

export default function MapPage() {
  // Fetch first page for map (capped by map marker limit internally)
  const { data, isLoading, error } = useNodes({ page: 1, pageSize: 800 });
  const nodes = data?.nodes || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card title="Geographic Distribution">
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-32 mb-3" />
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-4 w-28" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : 'Unknown error occurred';
    
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card>
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">Error loading map data</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">{errorMessage}</p>
          </div>
        </Card>
      </div>
    );
  }

  const nodesWithLocation = nodes.filter(
    (node): node is pNode & { location: NonNullable<pNode['location']> } =>
      node.location?.latitude !== undefined && node.location?.longitude !== undefined
  );

  // Group nodes by region for display
  const nodesByRegion: Record<string, pNode[]> = {};
  nodes.forEach(node => {
    const region = node.location?.country || node.location?.region || 'Unknown';
    if (!nodesByRegion[region]) {
      nodesByRegion[region] = [];
    }
    nodesByRegion[region].push(node);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Network Map
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Geographic distribution of Xandeum pNodes ({nodesWithLocation.length} nodes with location data)
        </p>
      </div>

      {/* Real Interactive Map */}
      <Card title="Geographic Distribution">
        {nodes.length > 0 && <NodeMap nodes={nodes} />}
        
        {/* Legend */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Legend
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
              <span className="text-gray-700 dark:text-gray-300">Healthy (≥80)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow-sm"></div>
              <span className="text-gray-700 dark:text-gray-300">Warning (50-79)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
              <span className="text-gray-700 dark:text-gray-300">Critical (&lt;50)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-500 border-2 border-white shadow-sm"></div>
              <span className="text-gray-700 dark:text-gray-300">Offline</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Regional Breakdown with Enhanced Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(nodesByRegion)
          .sort(([, a], [, b]) => b.length - a.length)
          .map(([region, regionNodes]) => {
            const onlineCount = regionNodes.filter(n => n.status === 'online').length;
            const offlineCount = regionNodes.filter(n => n.status === 'offline').length;
            const healthScores = regionNodes.map(n => calculateHealthScore(n));
            const healthyCount = healthScores.filter(h => h.score >= 80).length;
            const warningCount = healthScores.filter(h => h.score >= 50 && h.score < 80).length;
            const criticalCount = healthScores.filter(h => h.score < 50).length;
            
            const totalStorage = regionNodes.reduce((sum, n) => sum + (n.storageUsed || 0), 0);
            const totalCapacity = regionNodes.reduce((sum, n) => sum + (n.storageCapacity || 0), 0);
            const avgPeerCount = regionNodes.length > 0
              ? regionNodes.reduce((sum, n) => sum + (n.peerCount || 0), 0) / regionNodes.length
              : 0;
            const avgLatency = regionNodes
              .filter(n => n.latency)
              .reduce((sum, n) => sum + (n.latency || 0), 0) / regionNodes.filter(n => n.latency).length || 0;

            return (
              <Card key={region} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {region}
                      </h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                      {regionNodes.length}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-3">
                      {onlineCount} online, {offlineCount} offline
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      Health
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 dark:text-green-400">{healthyCount}</span>
                      <span className="text-yellow-600 dark:text-yellow-400">{warningCount}</span>
                      <span className="text-red-600 dark:text-red-400">{criticalCount}</span>
                    </div>
                  </div>
                  {avgPeerCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Server className="w-3 h-3" />
                        Avg Peers
                      </span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {avgPeerCount.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {avgLatency > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Avg Latency
                      </span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {avgLatency.toFixed(0)}ms
                      </span>
                    </div>
                  )}
                  {totalCapacity > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        Storage
                      </span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {formatBytes(totalStorage)} / {formatBytes(totalCapacity)}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
      </div>

      {nodesWithLocation.length === 0 && (
        <Card>
          <div className="text-center py-12 text-gray-500 dark:text-gray-500">
            No geographic data available for nodes. Location information may not be provided by the pRPC endpoint.
          </div>
        </Card>
      )}
    </div>
  );
}

