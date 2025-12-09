import { Anomaly, pNode } from '@/types';

type MetricSnapshot = {
  timestamp: number;
  latency?: number;
  peerCount?: number;
  storageUsed?: number;
  storageCapacity?: number;
  uptime?: number;
  status: pNode['status'];
};

const HISTORY_KEY = 'xpic_node_history_v1';
const MAX_HISTORY = 50;

type History = Record<string, MetricSnapshot[]>;

const severityWeights: Record<Anomaly['severity'], number> = {
  critical: 35,
  high: 20,
  medium: 12,
  low: 6,
};

function safeParseHistory(): History {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistHistory(history: History) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    /* ignore persistence failures in client-only helpers */
  }
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function zScore(value: number, values: number[]): number {
  const sigma = stddev(values);
  if (sigma === 0) return 0;
  return (value - mean(values)) / sigma;
}

function toSnapshot(node: pNode, timestamp: number): MetricSnapshot {
  return {
    timestamp,
    latency: node.latency,
    peerCount: node.peerCount,
    storageUsed: node.storageUsed,
    storageCapacity: node.storageCapacity,
    uptime: node.uptime,
    status: node.status,
  };
}

function updateHistory(nodes: pNode[], current: History): History {
  const next: History = { ...current };
  const now = Date.now();

  nodes.forEach((node) => {
    const list = next[node.id] ? [...next[node.id]] : [];
    list.push(toSnapshot(node, now));
    if (list.length > MAX_HISTORY) {
      list.splice(0, list.length - MAX_HISTORY);
    }
    next[node.id] = list;
  });

  persistHistory(next);
  return next;
}

function detectAnomaliesForNode(node: pNode, history: MetricSnapshot[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  if (!history.length) return anomalies;

  const latest = history[history.length - 1];
  const previous = history[history.length - 2];

  // Offline or missing heartbeat
  if (node.status === 'offline') {
    anomalies.push({
      nodeId: node.id,
      type: 'offline',
      severity: 'critical',
      message: 'Node is offline',
      timestamp: new Date(),
    });
  }

  // Latency spike vs own history
  if (node.latency && history.length >= 4) {
    const latencySeries = history.map((h) => h.latency ?? 0).filter(Boolean);
    const score = zScore(node.latency, latencySeries);
    if (score >= 2.5) {
      anomalies.push({
        nodeId: node.id,
        type: 'latency_spike',
        severity: score >= 3 ? 'high' : 'medium',
        message: `Latency anomaly: ${Math.round(node.latency)}ms (z=${score.toFixed(1)})`,
        timestamp: new Date(),
        details: { zScore: score },
      });
    }
  }

  // Peer drop vs previous snapshot
  if (previous?.peerCount !== undefined && node.peerCount < previous.peerCount * 0.6) {
    anomalies.push({
      nodeId: node.id,
      type: 'peer_drop',
      severity: 'medium',
      message: `Peer drop: ${previous.peerCount} → ${node.peerCount}`,
      timestamp: new Date(),
      details: { previous: previous.peerCount, current: node.peerCount },
    });
  }

  // Storage nearly full or sudden jump
  if (node.storageCapacity && node.storageUsed) {
    const usagePercent = (node.storageUsed / node.storageCapacity) * 100;
    if (usagePercent >= 90) {
      anomalies.push({
        nodeId: node.id,
        type: 'storage_anomaly',
        severity: usagePercent >= 98 ? 'high' : 'medium',
        message: `Storage high: ${usagePercent.toFixed(1)}%`,
        timestamp: new Date(),
        details: { usagePercent },
      });
    } else if (previous?.storageUsed && node.storageUsed > previous.storageUsed * 1.2) {
      anomalies.push({
        nodeId: node.id,
        type: 'storage_anomaly',
        severity: 'low',
        message: 'Storage grew unusually fast',
        timestamp: new Date(),
        details: { previous: previous.storageUsed, current: node.storageUsed },
      });
    }
  }

  return anomalies;
}

function deriveRiskScore(node: pNode, anomalies: Anomaly[]): number {
  let score = 100;

  // Status penalty
  if (node.status === 'offline') return 5;
  if (node.status === 'unknown') score -= 15;

  // Latency penalty
  if (typeof node.latency === 'number') {
    if (node.latency > 2000) score -= 30;
    else if (node.latency > 1000) score -= 18;
    else if (node.latency > 500) score -= 10;
  }

  // Peer count penalty
  if (node.peerCount < 5) score -= 20;
  else if (node.peerCount < 10) score -= 10;

  // Storage penalty
  if (node.storageCapacity && node.storageUsed) {
    const usage = (node.storageUsed / node.storageCapacity) * 100;
    if (usage > 95) score -= 25;
    else if (usage > 85) score -= 12;
  }

  // Uptime penalty (short uptimes are riskier)
  if (node.uptime && node.uptime < 24 * 3600) {
    score -= 10;
  }

  // Anomaly penalties
  anomalies.forEach((anomaly) => {
    score -= severityWeights[anomaly.severity] || 0;
  });

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getRiskStatusLabel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 70) return 'low';
  if (score >= 40) return 'medium';
  return 'high';
}

export function getRiskStatusColor(score: number): string {
  if (score >= 70) return 'text-green-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-red-500';
}

export function getAnomalySeverityColor(severity: Anomaly['severity']): string {
  switch (severity) {
    case 'critical':
      return 'text-red-500';
    case 'high':
      return 'text-orange-500';
    case 'medium':
      return 'text-yellow-500';
    default:
      return 'text-blue-500';
  }
}

export function computeClientInsights(nodes: pNode[]) {
  const baseHistory = safeParseHistory();
  const history = updateHistory(nodes, baseHistory);

  const riskScores = new Map<string, number>();
  const anomalyMap = new Map<string, Anomaly[]>();

  nodes.forEach((node) => {
    const h = history[node.id] || [];
    const anomalies = detectAnomaliesForNode(node, h);
    const riskScore = deriveRiskScore(node, anomalies);
    riskScores.set(node.id, riskScore);
    anomalyMap.set(node.id, anomalies);
  });

  return { riskScores, anomalyMap };
}

