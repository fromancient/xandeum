import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hours = Math.max(1, Math.min(168, parseInt(searchParams.get('hours') || '24', 10))); // up to 7d
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const metrics = await prisma.metricSnapshot.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('API /metrics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

