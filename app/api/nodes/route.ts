import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchAllpNodes } from '@/lib/prpc';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Ensure Node runtime on Vercel so Prisma native bindings load
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(500, Math.max(10, parseInt(searchParams.get('pageSize') || '100', 10)));
    const skip = (page - 1) * pageSize;

    const total = await prisma.nodeSnapshot.count();

    // If DB empty, fetch live and return
    if (total === 0) {
      const live = await fetchAllpNodes();
      return NextResponse.json({
        nodes: live.slice(0, pageSize),
        total: live.length,
        source: 'live',
      });
    }

    const rows = await prisma.nodeSnapshot.findMany({
      skip,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
    });

    const nodes = rows.map((r) => ({
      id: r.id,
      publicKey: r.publicKey || undefined,
      status: (r.status as any) || 'unknown',
      softwareVersion: r.version || undefined,
      peerCount: r.peerCount || 0,
      lastSeen: r.lastSeen || undefined,
      location: r.region
        ? {
            country: r.region,
            region: r.region,
            latitude: r.latitude || undefined,
            longitude: r.longitude || undefined,
          }
        : undefined,
      endpoint: undefined,
      ipAddress: undefined,
      storageCapacity: undefined,
      storageUsed: undefined,
      metadata: {
        isValidator: r.isValidator,
        voteAccount: r.voteAccount || undefined,
        commission: r.commission ?? undefined,
      },
      rawData: {},
    }));

    return NextResponse.json({
      nodes,
      total,
      page,
      pageSize,
      source: 'db',
    });
  } catch (error) {
    console.error('API /nodes error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

