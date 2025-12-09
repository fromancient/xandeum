// Core types for pNode data structure
export interface pNode {
  id: string;
  publicKey?: string;
  ipAddress?: string;
  endpoint?: string;
  status: 'online' | 'offline' | 'unknown';
  lastSeen: Date | string;
  peerCount: number;
  storageCapacity?: number; // in bytes
  storageUsed?: number; // in bytes
  storageFree?: number; // in bytes
  softwareVersion?: string;
  protocolVersion?: string;
  buildInfo?: string;
  latency?: number; // in ms
  uptime?: number; // in seconds
  availability?: number; // percentage
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  peers?: string[]; // list of peer node IDs
  metadata?: Record<string, any>;
  rawData?: Record<string, any>; // full raw JSON from pRPC
}

export interface pNodeMetrics {
  nodeId: string;
  timestamp: Date | string;
  latency?: number;
  peerCount?: number;
  storageUsed?: number;
  storageCapacity?: number;
  uptime?: number;
}

export interface HealthScore {
  nodeId: string;
  score: number; // 0-100
  status: 'healthy' | 'warning' | 'critical';
  factors: {
    uptime: number;
    latency: number;
    peerCount: number;
    lastSeen: number;
    storageUsage: number;
  };
}

export interface Anomaly {
  nodeId: string;
  type: 'latency_spike' | 'peer_drop' | 'storage_anomaly' | 'offline' | 'version_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date | string;
  details?: Record<string, any>;
}

export interface NetworkStats {
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  totalStorageCapacity: number;
  totalStorageUsed: number;
  averagePeerCount: number;
  averageLatency: number;
  versionDistribution: Record<string, number>;
  regionDistribution: Record<string, number>;
  validatorCount?: number;
}

export type Theme = 'light' | 'dark';

export interface FilterOptions {
  status?: ('online' | 'offline' | 'unknown')[];
  version?: string[];
  region?: string[];
  minPeerCount?: number;
  maxPeerCount?: number;
  minStorageUsage?: number;
  maxStorageUsage?: number;
}

