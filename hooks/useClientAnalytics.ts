'use client';

import { useEffect, useMemo, useState } from 'react';
import { computeClientInsights } from '@/lib/clientAnalytics';
import { pNode } from '@/types';

interface AnalyticsResult {
  riskScores: Map<string, number>;
  anomalyMap: Map<string, import('@/types').Anomaly[]>;
}

export function useClientAnalytics(nodes: pNode[]) {
  const [ready, setReady] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsResult>({
    riskScores: new Map(),
    anomalyMap: new Map(),
  });

  // Wait for client to avoid localStorage on server
  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || nodes.length === 0) return;
    const next = computeClientInsights(nodes);
    setAnalytics(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, ready]);

  return useMemo(
    () => ({
      riskScores: analytics.riskScores,
      anomalyMap: analytics.anomalyMap,
    }),
    [analytics],
  );
}

