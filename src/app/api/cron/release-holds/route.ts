import { NextResponse } from 'next/server';
import { releaseExpiredHolds } from '@/lib/concurrency';
import { expireWaitlistOffers } from '@/lib/waitlist';

export async function GET() {
  try {
    const releasedHolds = await releaseExpiredHolds();
    await expireWaitlistOffers();

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${releasedHolds} expired seat holds and checked waitlist queues.`,
    });
  } catch (err: any) {
    console.error('Cron release holds error:', err);
    return NextResponse.json({ error: 'Failed to release holds' }, { status: 500 });
  }
}
