import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { expireWaitlistOffers } from '@/lib/waitlist';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await expireWaitlistOffers();

    const { waitlistId } = await req.json();

    const waitlist = await prisma.waitlist.findUnique({
      where: { id: waitlistId },
      include: { event: true },
    });

    if (!waitlist) {
      return NextResponse.json({ error: 'Waitlist offer not found' }, { status: 404 });
    }

    if (waitlist.userId !== user.id) {
      return NextResponse.json({ error: 'This waitlist offer belongs to another user' }, { status: 403 });
    }

    if (waitlist.status === 'EXPIRED' || (waitlist.offerExpiresAt && waitlist.offerExpiresAt < new Date())) {
      return NextResponse.json(
        { error: 'This waitlist offer has expired and has been offered to the next person in line.' },
        { status: 410 }
      );
    }

    if (waitlist.status !== 'OFFERED') {
      return NextResponse.json({ error: 'Waitlist offer is not active' }, { status: 400 });
    }

    // Find the seat held for this user
    const heldSeat = await prisma.showSeat.findFirst({
      where: {
        eventId: waitlist.eventId,
        heldByUserId: user.id,
        status: 'HELD',
      },
      include: { seatTemplate: true },
    });

    if (!heldSeat) {
      return NextResponse.json({ error: 'No held seat found for this offer' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      eventId: waitlist.eventId,
      showSeatId: heldSeat.id,
      seatName: `Row ${heldSeat.seatTemplate.row}-${heldSeat.seatTemplate.number} (${heldSeat.seatTemplate.category})`,
      expiresAt: waitlist.offerExpiresAt,
    });
  } catch (err: any) {
    console.error('Claim waitlist error:', err);
    return NextResponse.json({ error: 'Failed to claim waitlist offer' }, { status: 500 });
  }
}
