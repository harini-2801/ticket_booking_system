import { prisma } from './db';
import { sendWaitlistOfferEmail } from './email';

export const WAITLIST_OFFER_TTL_MINUTES = 10;

/**
 * Expire waitlist offers that have passed their 10-minute offer window
 */
export async function expireWaitlistOffers() {
  const now = new Date();

  const expiredOffers = await prisma.waitlist.findMany({
    where: {
      status: 'OFFERED',
      offerExpiresAt: {
        lt: now,
      },
    },
  });

  for (const offer of expiredOffers) {
    // 1. Mark waitlist entry EXPIRED
    await prisma.waitlist.update({
      where: { id: offer.id },
      data: { status: 'EXPIRED' },
    });

    // 2. Release any seat held for this expired waitlist offer
    const heldSeat = await prisma.showSeat.findFirst({
      where: {
        eventId: offer.eventId,
        heldByUserId: offer.userId,
        status: 'HELD',
      },
    });

    if (heldSeat) {
      await prisma.showSeat.update({
        where: { id: heldSeat.id },
        data: {
          status: 'AVAILABLE',
          heldByUserId: null,
          holdExpiresAt: null,
          version: { increment: 1 },
        },
      });
    }

    // 3. Process next in line
    await processWaitlistForCategory(offer.eventId, offer.seatCategory);
  }
}

/**
 * Process waitlist queue for a given event and seat category
 */
export async function processWaitlistForCategory(eventId: string, category: string) {
  // First expire stale offers
  await expireWaitlistOffers();

  // Find next waiting user (FIFO order)
  const nextWaiting = await prisma.waitlist.findFirst({
    where: {
      eventId,
      seatCategory: category,
      status: 'WAITING',
    },
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      user: true,
      event: true,
    },
  });

  if (!nextWaiting) return;

  // Find an AVAILABLE seat in this event for this category
  const now = new Date();
  const availableSeat = await prisma.showSeat.findFirst({
    where: {
      eventId,
      seatTemplate: {
        category,
      },
      OR: [
        { status: 'AVAILABLE' },
        { status: 'HELD', holdExpiresAt: { lt: now } },
      ],
    },
    include: {
      seatTemplate: true,
    },
  });

  if (!availableSeat) return;

  // Offer seat to next waiting customer
  const offerExpiresAt = new Date(now.getTime() + WAITLIST_OFFER_TTL_MINUTES * 60 * 1000);

  // Reserve seat for waitlisted user
  await prisma.showSeat.update({
    where: { id: availableSeat.id },
    data: {
      status: 'HELD',
      heldByUserId: nextWaiting.userId,
      holdExpiresAt: offerExpiresAt,
      version: { increment: 1 },
    },
  });

  // Update waitlist entry
  await prisma.waitlist.update({
    where: { id: nextWaiting.id },
    data: {
      status: 'OFFERED',
      offerExpiresAt,
    },
  });

  // Send Email Notification
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const claimUrl = `${appUrl}/events/${eventId}?waitlistId=${nextWaiting.id}`;

  try {
    await sendWaitlistOfferEmail(
      nextWaiting.user.email,
      nextWaiting.user.name,
      nextWaiting.event.title,
      category,
      offerExpiresAt,
      claimUrl
    );
  } catch (err) {
    console.error('Failed to send waitlist email:', err);
  }
}

/**
 * Join waitlist for a sold-out category
 */
export async function joinWaitlist(userId: string, eventId: string, seatCategory: string) {
  // Check if already on waitlist
  const existing = await prisma.waitlist.findFirst({
    where: {
      userId,
      eventId,
      seatCategory,
      status: { in: ['WAITING', 'OFFERED'] },
    },
  });

  if (existing) {
    return existing;
  }

  const entry = await prisma.waitlist.create({
    data: {
      userId,
      eventId,
      seatCategory,
      status: 'WAITING',
    },
  });

  // Check if a seat is available right away
  await processWaitlistForCategory(eventId, seatCategory);

  return entry;
}
