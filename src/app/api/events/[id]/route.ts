import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { releaseExpiredHolds } from '@/lib/concurrency';
import { expireWaitlistOffers } from '@/lib/waitlist';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const eventId = params.id;

    await releaseExpiredHolds();
    await expireWaitlistOffers();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venue: {
          include: {
            seats: true,
          },
        },
        city: true,
        pricings: true,
        performers: {
          include: { performer: true },
        },
        organiser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const showSeats = await prisma.showSeat.findMany({
      where: { eventId },
      include: {
        seatTemplate: true,
      },
    });

    const categoryWaitlists: Record<string, { count: number; userWaitlisted: boolean; userOffer: any }> = {};

    for (const pricing of event.pricings) {
      const category = pricing.seatCategory;
      const count = await prisma.waitlist.count({
        where: {
          eventId,
          seatCategory: category,
          status: 'WAITING',
        },
      });

      let userWaitlisted = false;
      let userOffer = null;

      if (user) {
        const waitlistEntry = await prisma.waitlist.findFirst({
          where: {
            eventId,
            userId: user.id,
            seatCategory: category,
            status: { in: ['WAITING', 'OFFERED'] },
          },
        });

        if (waitlistEntry) {
          userWaitlisted = true;
          if (waitlistEntry.status === 'OFFERED') {
            userOffer = waitlistEntry;
          }
        }
      }

      categoryWaitlists[category] = {
        count,
        userWaitlisted,
        userOffer,
      };
    }

    const foodAddons = await prisma.foodAddon.findMany({
      orderBy: { price: 'asc' },
    });

    return NextResponse.json({
      event,
      showSeats,
      categoryWaitlists,
      foodAddons,
      currentUserId: user?.id || null,
    });
  } catch (err: any) {
    console.error('Fetch event detail error:', err);
    return NextResponse.json({ error: 'Failed to fetch event detail' }, { status: 500 });
  }
}
