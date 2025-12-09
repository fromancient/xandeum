import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Force Node runtime on Vercel for Prisma
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
      // No database - return empty metrics
      return NextResponse.json({ metrics: [] });
    }

    try {
      const { searchParams } = new URL(req.url);
      const hours = Math.max(1, Math.min(168, parseInt(searchParams.get('hours') || '24', 10))); // up to 7d
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const metrics = await prisma.metricSnapshot.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'asc' },
      });

      return NextResponse.json({ metrics });
    } catch (dbError) {
      // Database error - return empty metrics
      console.warn('Database unavailable, returning empty metrics:', dbError);
      return NextResponse.json({ metrics: [] });
    }
  } catch (error) {
    console.error('API /metrics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

