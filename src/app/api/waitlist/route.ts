import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { joinWaitlist } from '@/lib/waitlist';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { eventId, seatCategory } = await req.json();

    if (!eventId || !seatCategory) {
      return NextResponse.json({ error: 'Event ID and seat category required' }, { status: 400 });
    }

    const entry = await joinWaitlist(user.id, eventId, seatCategory);

    return NextResponse.json({
      success: true,
      waitlist: entry,
      message: 'Successfully joined the waitlist! You will receive an email if a seat becomes available.',
    });
  } catch (err: any) {
    console.error('Join waitlist error:', err);
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
  }
}
