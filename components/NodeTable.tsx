'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { pNode, FilterOptions } from '@/types';
import { formatBytes, formatLatency, getStatusColor, cn, getStoragePercentage, getHealthStatusColor, getHealthStatusLabel } from '@/lib/utils';
import { calculateHealthScore } from '@/lib/health';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { Card } from './Card';
import { useClientAnalytics } from '@/hooks/useClientAnalytics';
import { getRiskStatusColor, getRiskStatusLabel, getAnomalySeverityColor } from '@/lib/clientAnalytics';
import { SavedFiltersPanel } from './SavedFiltersPanel';

interface NodeTableProps {
  nodes: pNode[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

type SortField = 'id' | 'status' | 'peerCount' | 'storageUsed' | 'latency' | 'health' | 'risk';
type SortDirection = 'asc' | 'desc';
export function NodeTable({
  nodes,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: NodeTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false);

  const { riskScores, anomalyMap } = useClientAnalytics(nodes);

  // Calculate health scores
  const healthScores = useMemo(() => {
    const scores = new Map<string, number>();
    nodes.forEach(node => {
      const health = calculateHealthScore(node);
      scores.set(node.id, health.score);
    });
    return scores;
  }, [nodes]);

  // Filter and sort nodes
  const filteredAndSortedNodes = useMemo(() => {
    let filtered = nodes.filter(node => {
      // Search filter
      if (search && !node.id.toLowerCase().includes(search.toLowerCase()) &&
          !node.ipAddress?.toLowerCase().includes(search.toLowerCase()) &&
          !node.location?.country?.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      // Anomaly filter
      if (showAnomaliesOnly) {
        const anomalies = anomalyMap.get(node.id) || [];
        if (anomalies.length === 0) return false;
      }

      // Status filter
      if (filters.status && filters.status.length > 0 && !filters.status.includes(node.status)) {
        return false;
      }

      // Version filter
      if (filters.version && filters.version.length > 0 && 
          node.softwareVersion && !filters.version.includes(node.softwareVersion)) {
        return false;
      }

      // Peer count filter
      if (filters.minPeerCount !== undefined && node.peerCount < filters.minPeerCount) {
        return false;
      }
      if (filters.maxPeerCount !== undefined && node.peerCount > filters.maxPeerCount) {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'peerCount':
          aVal = a.peerCount;
          bVal = b.peerCount;
          break;
        case 'storageUsed':
          aVal = a.storageUsed || 0;
          bVal = b.storageUsed || 0;
          break;
        case 'latency':
          aVal = a.latency || Infinity;
          bVal = b.latency || Infinity;
          break;
        case 'health':
          aVal = healthScores.get(a.id) || 0;
          bVal = healthScores.get(b.id) || 0;
          break;
        case 'risk':
          aVal = riskScores.get(a.id) ?? 0;
          bVal = riskScores.get(b.id) ?? 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [nodes, search, filters, sortField, sortDirection, healthScores, showAnomaliesOnly, anomalyMap, riskScores]);

  // Note: server-driven pagination; nodes are already paged from API
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + nodes.length;
  const visibleNodes = filteredAndSortedNodes; // already paged by API
  // Determine validator flag

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100"
    >
      {children}
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="w-4 h-4" />
        ) : (
          <ArrowDown className="w-4 h-4" />
        )
      ) : (
        <ArrowUpDown className="w-4 h-4 opacity-50" />
      )}
    </button>
  );

  return (
    <Card>
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search nodes by ID, IP, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <SavedFiltersPanel
              currentFilters={filters}
              onApplyFilter={setFilters}
              compact={true}
            />
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={showAnomaliesOnly}
                onChange={(e) => setShowAnomaliesOnly(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Show anomalies only
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <SortButton field="id">Node ID</SortButton>
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <SortButton field="status">Status</SortButton>
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <SortButton field="health">Health</SortButton>
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <SortButton field="risk">Risk</SortButton>
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <SortButton field="peerCount">Peers</SortButton>
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Storage
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <SortButton field="latency">Latency</SortButton>
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Anomalies
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Version
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Location
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleNodes.map((node) => {
              const healthScore = healthScores.get(node.id) || 0;
              const storagePercent = getStoragePercentage(node.storageUsed, node.storageCapacity);
              const isValidator = node.metadata?.isValidator;
              const anomalies = anomalyMap.get(node.id) || [];
              const riskScore = riskScores.get(node.id) ?? 0;
              const topAnomaly = anomalies[0];
              
              return (
                <tr
                  key={node.id}
                  className="border-b border-gray-100/50 dark:border-white/5 hover:bg-gray-50/80 dark:hover:bg-white/5 transition-all duration-300 group cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/nodes/${node.id}`}
                        className="text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 hover:underline font-mono text-sm transition-all duration-300 dark:hover:drop-shadow-[0_0_6px_rgba(0,217,255,0.6)]"
                      >
                        {node.id}
                      </Link>
                      {isValidator && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
                          Validator
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        getStatusColor(node.status)
                      )}
                    >
                      {node.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-semibold", getHealthStatusColor(healthScore))}>
                        {healthScore}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {getHealthStatusLabel(healthScore)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-semibold", getRiskStatusColor(riskScore))}>
                        {riskScore}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        Risk: {getRiskStatusLabel(riskScore)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {node.peerCount}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <div className="text-gray-700 dark:text-gray-300">
                        {formatBytes(node.storageUsed)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {storagePercent}% of {formatBytes(node.storageCapacity)}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {formatLatency(node.latency)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {topAnomaly ? (
                      <div className="flex flex-col gap-1">
                        <span className={cn("text-xs font-semibold", getAnomalySeverityColor(topAnomaly.severity))}>
                          {topAnomaly.severity} • {topAnomaly.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2">
                          {topAnomaly.message}
                        </span>
                        {anomalies.length > 1 && (
                          <span className="text-[11px] text-gray-500 dark:text-gray-500">
                            +{anomalies.length - 1} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-500">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 font-mono">
                    {node.softwareVersion || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {node.location?.country || node.location?.region || 'Unknown'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredAndSortedNodes.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-2 py-3 border-t border-gray-200 dark:border-gray-800 mt-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {startIndex + 1}-{startIndex + visibleNodes.length} of {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 text-sm disabled:opacity-50"
            >
              Prev
            </button>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 text-sm disabled:opacity-50"
            >
              Next
            </button>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 text-sm bg-white dark:bg-gray-800"
            >
              {[50, 100, 200, 500].map(size => (
                <option key={size} value={size}>{size} / page</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {filteredAndSortedNodes.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-500">
          No nodes found matching your filters.
        </div>
      )}
    </Card>
  );
}

