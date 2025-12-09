import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const severity = searchParams.get('severity');
    const nodeId = searchParams.get('nodeId');
    const resolved = searchParams.get('resolved');
    const limit = Math.min(500, parseInt(searchParams.get('limit') || '100', 10));
    const hours = searchParams.get('hours')
      ? Math.max(1, Math.min(168, parseInt(searchParams.get('hours')!, 10)))
      : null;

    const where: any = {};

    if (severity) {
      where.severity = severity;
    }

    if (nodeId) {
      where.nodeId = nodeId;
    }

    if (resolved !== null && resolved !== undefined) {
      where.resolved = resolved === 'true';
    }

    if (hours) {
      where.createdAt = {
        gte: new Date(Date.now() - hours * 60 * 60 * 1000),
      };
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: [
        { severity: 'desc' }, // critical, high, medium, low
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    // Enrich alerts with node information
    const nodeIds = alerts.filter(a => a.nodeId).map(a => a.nodeId!);
    const nodes = nodeIds.length > 0
      ? await prisma.nodeSnapshot.findMany({
          where: { id: { in: nodeIds } },
        })
      : [];

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Parse details JSON and enrich with node info
    const formatted = alerts.map(a => {
      const node = a.nodeId ? nodeMap.get(a.nodeId) : null;
      return {
        ...a,
        details: a.details ? JSON.parse(a.details) : null,
        nodeInfo: node ? {
          publicKey: node.publicKey,
          region: node.region,
          version: node.version,
          isValidator: node.isValidator,
        } : null,
      };
    });

    return NextResponse.json({ alerts: formatted });
  } catch (error) {
    console.error('API /alerts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, acknowledged, resolved, clearAll } = body;

    // Handle clear all alerts
    if (clearAll === true) {
      const result = await prisma.alert.updateMany({
        where: { resolved: false },
        data: {
          resolved: true,
          resolvedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, cleared: result.count });
    }

    if (!id) {
      return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
    }

    const updateData: any = {};
    if (acknowledged !== undefined) {
      updateData.acknowledged = acknowledged;
    }
    if (resolved !== undefined) {
      updateData.resolved = resolved;
      if (resolved) {
        updateData.resolvedAt = new Date();
      } else {
        updateData.resolvedAt = null;
      }
    }

    const alert = await prisma.alert.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ alert });
  } catch (error) {
    console.error('API /alerts PATCH error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

