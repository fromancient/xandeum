import { pNode, NetworkStats } from '@/types';
import { calculateNetworkStats } from '@/lib/prpc';
import { calculateHealthScore } from '@/lib/health';

export interface NetworkSnapshot {
  timestamp: number;
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  healthyNodes: number;
  warningNodes: number;
  criticalNodes: number;
  averagePeerCount: number;
  averageLatency: number;
  totalStorageCapacity: number;
  totalStorageUsed: number;
  storagePercentage: number;
  versionDistribution: Record<string, number>;
  regionDistribution: Record<string, number>;
}

const NETWORK_HISTORY_KEY = 'xpic_network_history_v1';
const MAX_NETWORK_HISTORY = 200; // Store up to 200 snapshots (~8 days at 1 snapshot/hour)

export function saveNetworkSnapshot(nodes: pNode[]): NetworkSnapshot {
  const stats = calculateNetworkStats(nodes);
  const healthScores = nodes.map(n => calculateHealthScore(n));
  const healthyCount = healthScores.filter(h => h.score >= 80).length;
  const warningCount = healthScores.filter(h => h.score >= 50 && h.score < 80).length;
  const criticalCount = healthScores.filter(h => h.score < 50).length;

  const snapshot: NetworkSnapshot = {
    timestamp: Date.now(),
    totalNodes: stats.totalNodes,
    onlineNodes: stats.onlineNodes,
    offlineNodes: stats.offlineNodes,
    healthyNodes: healthyCount,
    warningNodes: warningCount,
    criticalNodes: criticalCount,
    averagePeerCount: stats.averagePeerCount,
    averageLatency: stats.averageLatency,
    totalStorageCapacity: stats.totalStorageCapacity,
    totalStorageUsed: stats.totalStorageUsed,
    storagePercentage: stats.totalStorageCapacity > 0
      ? (stats.totalStorageUsed / stats.totalStorageCapacity) * 100
      : 0,
    versionDistribution: stats.versionDistribution,
    regionDistribution: stats.regionDistribution,
  };

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    try {
      const history = getNetworkHistory();
      history.push(snapshot);
      
      // Keep only recent snapshots
      if (history.length > MAX_NETWORK_HISTORY) {
        history.splice(0, history.length - MAX_NETWORK_HISTORY);
      }
      
      window.localStorage.setItem(NETWORK_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn('Failed to save network snapshot:', error);
    }
  }

  return snapshot;
}

export function getNetworkHistory(): NetworkSnapshot[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const raw = window.localStorage.getItem(NETWORK_HISTORY_KEY);
    if (!raw) return [];
    
    const history = JSON.parse(raw) as NetworkSnapshot[];
    // Filter out very old snapshots (>30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return history.filter(s => s.timestamp > thirtyDaysAgo);
  } catch {
    return [];
  }
}

export function getNetworkHistoryForRange(hours: number): NetworkSnapshot[] {
  const history = getNetworkHistory();
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  return history.filter(s => s.timestamp >= cutoff);
}

export function clearNetworkHistory() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(NETWORK_HISTORY_KEY);
    } catch {
      // ignore
    }
  }
}


