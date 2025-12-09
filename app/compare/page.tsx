'use client';

import { useState } from 'react';
import { useNodes } from '@/hooks/useNodes';
import { Card } from '@/components/Card';
import { StatCard } from '@/components/StatCard';
import { calculateHealthScore } from '@/lib/health';
import { formatBytes, formatLatency, formatUptime, getStatusColor, cn, getStoragePercentage, getHealthStatusColor, getHealthStatusLabel } from '@/lib/utils';
import { X, Search } from 'lucide-react';
import { pNode } from '@/types';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { useEffect } from 'react';

export default function ComparePage() {
  const { data, isLoading, error } = useNodes({ page: 1, pageSize: 500 });
  const nodes = data?.nodes || [];
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 200;

  const selectedNodes = selectedNodeIds
    .map(id => nodes.find(n => n.id === id))
    .filter((n): n is pNode => n !== undefined);

  const handleSelectNode = (nodeId: string) => {
    if (selectedNodeIds.includes(nodeId)) {
      setSelectedNodeIds(selectedNodeIds.filter(id => id !== nodeId));
    } else if (selectedNodeIds.length < 5) {
      setSelectedNodeIds([...selectedNodeIds, nodeId]);
    }
  };

  const handleRemoveNode = (nodeId: string) => {
    setSelectedNodeIds(selectedNodeIds.filter(id => id !== nodeId));
  };

  const filteredNodes = nodes.filter(node =>
    node.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredNodes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const pagedNodes = filteredNodes.slice(startIndex, endIndex);

  const handlePageChange = (next: number) => {
    const clamped = Math.max(1, Math.min(next, totalPages));
    setPage(clamped);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Card title="Select Nodes to Compare">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400 mb-3">Error loading nodes</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">{message}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Compare Nodes
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Select up to 5 nodes to compare side-by-side
        </p>
      </div>

      {/* Node Selector */}
      <Card title="Select Nodes to Compare">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-2">
          {pagedNodes.map((node) => {
            const isSelected = selectedNodeIds.includes(node.id);
            const isDisabled = !isSelected && selectedNodeIds.length >= 5;

            return (
              <button
                key={node.id}
                onClick={() => handleSelectNode(node.id)}
                disabled={isDisabled}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-colors",
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500"
                    : isDisabled
                    ? "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-50 cursor-not-allowed"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {node.id}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {node.status} • {node.peerCount} peers
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Pagination */}
        {filteredNodes.length > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-3 text-sm text-gray-600 dark:text-gray-400">
            <span>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredNodes.length)} of {filteredNodes.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
              >
                Prev
              </button>
              <span>Page {currentPage} / {totalPages}</span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {selectedNodeIds.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selected ({selectedNodeIds.length}/5):
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedNodes.map((node) => (
                <div
                  key={node.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
                >
                  <span className="text-sm font-mono text-blue-900 dark:text-blue-100">
                    {node.id}
                  </span>
                  <button
                    onClick={() => handleRemoveNode(node.id)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Comparison Table */}
      {selectedNodes.length > 0 && (
        <Card title="Comparison">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Metric
                  </th>
                  {selectedNodes.map((node) => (
                    <th
                      key={node.id}
                      className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 font-mono"
                    >
                      {node.id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </td>
                  {selectedNodes.map((node) => (
                    <td key={node.id} className="py-3 px-4">
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          getStatusColor(node.status)
                        )}
                      >
                        {node.status}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Health Score
                  </td>
                  {selectedNodes.map((node) => {
                    const health = calculateHealthScore(node);
                    return (
                      <td key={node.id} className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-semibold", getHealthStatusColor(health.score))}>
                            {health.score}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {getHealthStatusLabel(health.score)}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Peer Count
                  </td>
                  {selectedNodes.map((node) => (
                    <td key={node.id} className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {node.peerCount}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Storage Used
                  </td>
                  {selectedNodes.map((node) => (
                    <td key={node.id} className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {formatBytes(node.storageUsed)}
                      <span className="text-xs text-gray-500 dark:text-gray-500 ml-2">
                        ({getStoragePercentage(node.storageUsed, node.storageCapacity)}%)
                      </span>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Storage Capacity
                  </td>
                  {selectedNodes.map((node) => (
                    <td key={node.id} className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {formatBytes(node.storageCapacity)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Latency
                  </td>
                  {selectedNodes.map((node) => (
                    <td key={node.id} className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {formatLatency(node.latency)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Uptime
                  </td>
                  {selectedNodes.map((node) => (
                    <td key={node.id} className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {formatUptime(node.uptime)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Version
                  </td>
                  {selectedNodes.map((node) => (
                    <td key={node.id} className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 font-mono">
                      {node.softwareVersion || 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Location
                  </td>
                  {selectedNodes.map((node) => (
                    <td key={node.id} className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {node.location?.country || node.location?.region || 'Unknown'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selectedNodes.length === 0 && (
        <Card>
          <div className="text-center py-12 text-gray-500 dark:text-gray-500">
            Select nodes from the list above to compare their metrics
          </div>
        </Card>
      )}
    </div>
  );
}

