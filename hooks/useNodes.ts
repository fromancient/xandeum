'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchpNodeById, fetchNodeMetrics } from '@/lib/prpc';
import { pNode, pNodeMetrics } from '@/types';

const REFETCH_INTERVAL = 30000; // 30 seconds

interface UseNodesOptions {
  page?: number;
  pageSize?: number;
}

interface PagedNodes {
  nodes: pNode[];
  total: number;
  page: number;
  pageSize: number;
}

export function useNodes(options: UseNodesOptions = {}) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 200;

  return useQuery<PagedNodes>({
    queryKey: ['nodes', page, pageSize],
    queryFn: async () => {
      const res = await fetch(`/api/nodes?page=${page}&pageSize=${pageSize}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return {
        nodes: data.nodes || [],
        total: data.total || 0,
        page: data.page || page,
        pageSize: data.pageSize || pageSize,
      };
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 10000,
  });
}

export function useNode(nodeId: string) {
  return useQuery<pNode | null>({
    queryKey: ['node', nodeId],
    queryFn: () => fetchpNodeById(nodeId),
    enabled: !!nodeId,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 10000,
  });
}

export function useNodeMetrics(nodeId: string, hours: number = 24) {
  return useQuery<pNodeMetrics[]>({
    queryKey: ['node-metrics', nodeId, hours],
    queryFn: () => fetchNodeMetrics(nodeId, hours),
    enabled: !!nodeId,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 10000,
  });
}

