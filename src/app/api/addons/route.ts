import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const addons = await prisma.foodAddon.findMany({
      orderBy: { price: 'asc' },
    });
    return NextResponse.json({ addons });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch food addons' }, { status: 500 });
  }
}
