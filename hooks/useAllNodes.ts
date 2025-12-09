'use client';

import { useQuery } from '@tanstack/react-query';
import { pNode } from '@/types';

const REFETCH_INTERVAL = 30000; // 30 seconds

/**
 * Fetch all nodes without pagination limit for analytics
 * Fetches in batches and combines results
 */
export function useAllNodes() {
  return useQuery<pNode[]>({
    queryKey: ['all-nodes'],
    queryFn: async () => {
      // Fetch first page to get total count
      const firstRes = await fetch('/api/nodes?page=1&pageSize=500');
      if (!firstRes.ok) throw new Error(await firstRes.text());
      const firstData = await firstRes.json();
      
      const total = firstData.total || 0;
      const allNodes: pNode[] = [...(firstData.nodes || [])];
      
      // If there are more nodes, fetch remaining pages
      if (total > 500) {
        const remainingPages = Math.ceil((total - 500) / 500);
        const promises = [];
        
        for (let page = 2; page <= remainingPages + 1; page++) {
          promises.push(
            fetch(`/api/nodes?page=${page}&pageSize=500`)
              .then(res => res.json())
              .then(data => data.nodes || [])
          );
        }
        
        const results = await Promise.all(promises);
        results.forEach(nodes => allNodes.push(...nodes));
      }
      
      return allNodes;
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 10000,
  });
}

