import { pNode, HealthScore, Anomaly } from '@/types';

/**
 * Calculate health score for a pNode
 * Score is 0-100, combining multiple factors
 */
export function calculateHealthScore(node: pNode): HealthScore {
  let score = 100;
  const factors = {
    uptime: 100,
    latency: 100,
    peerCount: 100,
    lastSeen: 100,
    storageUsage: 100,
  };
  
  // Uptime factor (0-30 points)
  if (node.uptime) {
    const uptimeDays = node.uptime / (24 * 3600);
    factors.uptime = Math.min(100, (uptimeDays / 30) * 100);
    score = score * 0.3 + factors.uptime * 0.3;
  }
  
  // Latency factor (0-20 points)
  if (node.latency !== undefined) {
    if (node.latency < 100) factors.latency = 100;
    else if (node.latency < 500) factors.latency = 80;
    else if (node.latency < 1000) factors.latency = 60;
    else factors.latency = 40;
    score = score * 0.8 + factors.latency * 0.2;
  }
  
  // Peer count factor (0-20 points)
  if (node.peerCount < 5) factors.peerCount = 50;
  else if (node.peerCount < 10) factors.peerCount = 70;
  else if (node.peerCount < 20) factors.peerCount = 85;
  else factors.peerCount = 100;
  score = score * 0.8 + factors.peerCount * 0.2;
  
  // Last seen factor (0-15 points)
  const lastSeenMs = typeof node.lastSeen === 'string' 
    ? Date.now() - new Date(node.lastSeen).getTime()
    : Date.now() - node.lastSeen.getTime();
  const lastSeenMinutes = lastSeenMs / 60000;
  if (lastSeenMinutes < 5) factors.lastSeen = 100;
  else if (lastSeenMinutes < 15) factors.lastSeen = 80;
  else if (lastSeenMinutes < 60) factors.lastSeen = 60;
  else factors.lastSeen = 30;
  score = score * 0.85 + factors.lastSeen * 0.15;
  
  // Storage usage factor (0-15 points)
  if (node.storageCapacity && node.storageUsed) {
    const usagePercent = (node.storageUsed / node.storageCapacity) * 100;
    if (usagePercent < 70) factors.storageUsage = 100;
    else if (usagePercent < 85) factors.storageUsage = 80;
    else if (usagePercent < 95) factors.storageUsage = 60;
    else factors.storageUsage = 30;
    score = score * 0.85 + factors.storageUsage * 0.15;
  }
  
  // Status penalty
  if (node.status === 'offline') {
    score = Math.min(score, 20);
  } else if (node.status === 'unknown') {
    score = Math.min(score, 50);
  }
  
  const finalScore = Math.round(Math.max(0, Math.min(100, score)));
  
  return {
    nodeId: node.id,
    score: finalScore,
    status: finalScore >= 80 ? 'healthy' : finalScore >= 50 ? 'warning' : 'critical',
    factors,
  };
}

/**
 * Detect anomalies in node behavior
 */
export function detectAnomalies(node: pNode, previousNode?: pNode): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const now = Date.now();
  const lastSeenMs = typeof node.lastSeen === 'string' 
    ? now - new Date(node.lastSeen).getTime()
    : now - node.lastSeen.getTime();
  
  // Offline detection
  if (node.status === 'offline') {
    anomalies.push({
      nodeId: node.id,
      type: 'offline',
      severity: 'critical',
      message: 'Node is offline',
      timestamp: new Date(),
    });
  }
  
  // Latency spike
  if (node.latency && node.latency > 1000) {
    anomalies.push({
      nodeId: node.id,
      type: 'latency_spike',
      severity: node.latency > 2000 ? 'high' : 'medium',
      message: `High latency detected: ${Math.round(node.latency)}ms`,
      timestamp: new Date(),
      details: { latency: node.latency },
    });
  }
  
  // Peer count drop
  if (previousNode && node.peerCount < previousNode.peerCount * 0.5) {
    anomalies.push({
      nodeId: node.id,
      type: 'peer_drop',
      severity: 'medium',
      message: `Significant peer count drop: ${previousNode.peerCount} → ${node.peerCount}`,
      timestamp: new Date(),
      details: { previous: previousNode.peerCount, current: node.peerCount },
    });
  }
  
  // Storage anomaly
  if (node.storageCapacity && node.storageUsed) {
    const usagePercent = (node.storageUsed / node.storageCapacity) * 100;
    if (usagePercent > 95) {
      anomalies.push({
        nodeId: node.id,
        type: 'storage_anomaly',
        severity: 'high',
        message: `Storage nearly full: ${usagePercent.toFixed(1)}%`,
        timestamp: new Date(),
        details: { usagePercent, used: node.storageUsed, capacity: node.storageCapacity },
      });
    }
  }
  
  // Last seen too long ago
  if (lastSeenMs > 3600000) { // 1 hour
    anomalies.push({
      nodeId: node.id,
      type: 'offline',
      severity: lastSeenMs > 86400000 ? 'critical' : 'high',
      message: `Node not seen for ${Math.round(lastSeenMs / 60000)} minutes`,
      timestamp: new Date(),
      details: { lastSeenMs },
    });
  }
  
  return anomalies;
}

/**
 * Calculate health scores for all nodes
 */
export function calculateAllHealthScores(nodes: pNode[]): Map<string, HealthScore> {
  const scores = new Map<string, HealthScore>();
  nodes.forEach(node => {
    scores.set(node.id, calculateHealthScore(node));
  });
  return scores;
}

