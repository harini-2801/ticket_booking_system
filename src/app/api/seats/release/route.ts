import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { releaseSeats } from '@/lib/concurrency';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { showSeatIds } = await req.json();
    if (!showSeatIds || !Array.isArray(showSeatIds)) {
      return NextResponse.json({ error: 'Invalid seat IDs' }, { status: 400 });
    }

    const releasedCount = await releaseSeats(user.id, showSeatIds);

    return NextResponse.json({ success: true, releasedCount });
  } catch (err: any) {
    console.error('Release seats error:', err);
    return NextResponse.json({ error: 'Failed to release seats' }, { status: 500 });
  }
}
