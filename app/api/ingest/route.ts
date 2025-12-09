import { NextResponse } from 'next/server';
import { fetchAllpNodes, fetchChainMetrics, calculateNetworkStats } from '@/lib/prpc';
import { prisma } from '@/lib/db';
import { calculateHealthScore, detectAnomalies } from '@/lib/health';
import { pNode } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const timestamp = new Date();
    
    // Fetch nodes
    const nodes = await fetchAllpNodes();
    
    // Get previous node states for anomaly detection
    const previousNodesMap = new Map<string, pNode>();
    const previousSnapshots = await prisma.nodeSnapshot.findMany({
      where: { id: { in: nodes.map(n => n.id) } },
    });
    
    // Build map of previous states (simplified - in production, fetch from NodeHistory)
    for (const snapshot of previousSnapshots) {
      previousNodesMap.set(snapshot.id, {
        id: snapshot.id,
        status: snapshot.status as any || 'unknown',
        peerCount: snapshot.peerCount || 0,
        lastSeen: snapshot.lastSeen || new Date(),
      } as pNode);
    }

    const alerts: Array<{
      nodeId: string | null;
      type: string;
      severity: string;
      message: string;
      details?: string;
    }> = [];

    // Upsert node snapshots and store history
    for (const node of nodes) {
      const isValidator = node.metadata?.isValidator === true;
      const voteAccount = node.metadata?.voteAccount;
      const commission = typeof node.metadata?.commission === 'number' ? node.metadata?.commission : null;

      // Update current snapshot
      await prisma.nodeSnapshot.upsert({
        where: { id: node.id },
        create: {
          id: node.id,
          publicKey: node.publicKey,
          status: node.status,
          version: node.softwareVersion,
          region: node.location?.country || node.location?.region,
          latitude: node.location?.latitude,
          longitude: node.location?.longitude,
          peerCount: node.peerCount,
          isValidator,
          voteAccount: voteAccount || undefined,
          commission: commission ?? undefined,
          lastSeen: node.lastSeen ? new Date(node.lastSeen) : null,
        },
        update: {
          publicKey: node.publicKey,
          status: node.status,
          version: node.softwareVersion,
          region: node.location?.country || node.location?.region,
          latitude: node.location?.latitude,
          longitude: node.location?.longitude,
          peerCount: node.peerCount,
          isValidator,
          voteAccount: voteAccount || undefined,
          commission: commission ?? undefined,
          lastSeen: node.lastSeen ? new Date(node.lastSeen) : null,
        },
      });

      // Calculate health score
      const healthScore = calculateHealthScore(node);
      
      // Store historical snapshot
      await prisma.nodeHistory.create({
        data: {
          nodeId: node.id,
          timestamp,
          status: node.status,
          peerCount: node.peerCount,
          latency: node.latency ?? null,
          storageUsed: node.storageUsed ?? null,
          storageCapacity: node.storageCapacity ?? null,
          uptime: node.uptime ?? null,
          healthScore: healthScore.score,
        },
      });

      // Detect anomalies and create alerts
      const previousNode = previousNodesMap.get(node.id);
      const nodeAnomalies = detectAnomalies(node, previousNode);
      
      for (const anomaly of nodeAnomalies) {
        // Check if alert already exists (not resolved) to avoid duplicates
        const existingAlert = await prisma.alert.findFirst({
          where: {
            nodeId: node.id,
            type: anomaly.type,
            resolved: false,
            createdAt: {
              gte: new Date(Date.now() - 3600000), // Within last hour
            },
          },
        });

        if (!existingAlert) {
          alerts.push({
            nodeId: node.id,
            type: anomaly.type,
            severity: anomaly.severity,
            message: anomaly.message,
            details: JSON.stringify(anomaly.details || {}),
          });
        }
      }
    }

    // Calculate network-level stats
    const networkStats = calculateNetworkStats(nodes);
    
    // Calculate health distribution
    const healthScores = nodes.map(n => calculateHealthScore(n));
    const healthyNodes = healthScores.filter(h => h.score >= 80).length;
    const warningNodes = healthScores.filter(h => h.score >= 50 && h.score < 80).length;
    const criticalNodes = healthScores.filter(h => h.score < 50).length;

    // Store network snapshot
    await prisma.networkSnapshot.create({
      data: {
        timestamp,
        totalNodes: networkStats.totalNodes,
        onlineNodes: networkStats.onlineNodes,
        offlineNodes: networkStats.offlineNodes,
        healthyNodes,
        warningNodes,
        criticalNodes,
        averagePeerCount: networkStats.averagePeerCount || null,
        averageLatency: networkStats.averageLatency || null,
        totalStorageCapacity: networkStats.totalStorageCapacity || null,
        totalStorageUsed: networkStats.totalStorageUsed || null,
        versionDistribution: JSON.stringify(networkStats.versionDistribution),
        regionDistribution: JSON.stringify(networkStats.regionDistribution),
      },
    });

    // Store alerts in batch
    if (alerts.length > 0) {
      await prisma.alert.createMany({
        data: alerts.map(a => ({
          nodeId: a.nodeId || null,
          type: a.type,
          severity: a.severity as any,
          message: a.message,
          details: a.details || null,
        })),
      });
    }

    // Fetch chain metrics
    const metrics = await fetchChainMetrics();
    if (metrics) {
      await prisma.metricSnapshot.create({
        data: {
          tps: metrics.tps,
          blockTimeMs: metrics.blockTimeMs,
          slot: metrics.slot ?? null,
          epoch: metrics.epoch ?? null,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      nodes: nodes.length,
      metrics: metrics || null,
      alerts: alerts.length,
      networkStats: {
        totalNodes: networkStats.totalNodes,
        healthyNodes,
        warningNodes,
        criticalNodes,
      },
    });
  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

