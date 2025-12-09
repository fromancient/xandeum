import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// Helper to safely check if database is available
async function isDbAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  try {
    // Check if database is available
    const dbAvailable = await isDbAvailable();

    if (!dbAvailable) {
      // No database - return empty history
      return NextResponse.json({ history: [] });
    }

    try {
      const { searchParams } = new URL(req.url);
      const nodeId = searchParams.get('nodeId');
      const hours = Math.max(1, Math.min(720, parseInt(searchParams.get('hours') || '24', 10))); // up to 30 days
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const where: any = {
        timestamp: { gte: since },
      };

      if (nodeId) {
        where.nodeId = nodeId;
      }

      const history = await prisma.nodeHistory.findMany({
        where,
        orderBy: { timestamp: 'asc' },
        take: nodeId ? 1000 : 5000, // Limit results for performance
      });

      return NextResponse.json({ history });
    } catch (dbError) {
      // Database error - return empty history
      console.warn('Database unavailable, returning empty node history:', dbError);
      return NextResponse.json({ history: [] });
    }
  } catch (error) {
    console.error('API /history/nodes error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

