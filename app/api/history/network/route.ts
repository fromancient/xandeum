import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Force Node runtime on Vercel so Prisma can load native bindings
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
      // No database - return empty snapshots
      return NextResponse.json({ snapshots: [] });
    }

    try {
      const { searchParams } = new URL(req.url);
      const hours = Math.max(1, Math.min(720, parseInt(searchParams.get('hours') || '24', 10))); // up to 30 days
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const snapshots = await prisma.networkSnapshot.findMany({
        where: {
          timestamp: { gte: since },
        },
        orderBy: { timestamp: 'asc' },
        take: 1000, // Limit results
      });

      // Parse JSON fields
      const formatted = snapshots.map((s: any) => ({
        ...s,
        versionDistribution: s.versionDistribution ? JSON.parse(s.versionDistribution) : {},
        regionDistribution: s.regionDistribution ? JSON.parse(s.regionDistribution) : {},
      }));

      return NextResponse.json({ snapshots: formatted });
    } catch (dbError) {
      // Database error - return empty snapshots
      console.warn('Database unavailable, returning empty network history:', dbError);
      return NextResponse.json({ snapshots: [] });
    }
  } catch (error) {
    console.error('API /history/network error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

