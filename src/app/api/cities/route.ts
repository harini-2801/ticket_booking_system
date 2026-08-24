import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ cities });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 });
  }
}
