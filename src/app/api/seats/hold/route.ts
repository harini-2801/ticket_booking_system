import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { holdSeats } from '@/lib/concurrency';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { showSeatIds } = await req.json();

    if (!showSeatIds || !Array.isArray(showSeatIds) || showSeatIds.length === 0) {
      return NextResponse.json({ error: 'No seats selected' }, { status: 400 });
    }

    const result = await holdSeats(user.id, showSeatIds);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Hold seats error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to hold seats due to concurrency conflict' },
      { status: 409 }
    );
  }
}
