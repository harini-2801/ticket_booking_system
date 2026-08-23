import { prisma } from './db';
import { processWaitlistForCategory } from './waitlist';

export const HOLD_TTL_MINUTES = 10;

/**
 * Clean up expired seat holds (holdExpiresAt < NOW())
 * Reverts seats to AVAILABLE and triggers waitlist auto-assignment if someone is waiting.
 */
export async function releaseExpiredHolds() {
  const now = new Date();

  // 1. Find all expired held seats
  const expiredSeats = await prisma.showSeat.findMany({
    where: {
      status: 'HELD',
      holdExpiresAt: {
        lt: now,
      },
    },
    include: {
      seatTemplate: true,
    },
  });

  if (expiredSeats.length === 0) return 0;

  let releasedCount = 0;
  for (const seat of expiredSeats) {
    // Reset seat status
    await prisma.showSeat.update({
      where: { id: seat.id },
      data: {
        status: 'AVAILABLE',
        heldByUserId: null,
        holdExpiresAt: null,
        version: { increment: 1 },
      },
    });
    releasedCount++;

    // Trigger waitlist auto-offer for this event & category
    try {
      await processWaitlistForCategory(seat.eventId, seat.seatTemplate.category);
    } catch (err) {
      console.error('Error processing waitlist after seat auto-release:', err);
    }
  }

  return releasedCount;
}

/**
 * Concurrency-safe atomic hold acquisition for a set of seat IDs by a user.
 * Uses atomic UPDATE queries with version increment and condition checking.
 */
export async function holdSeats(userId: string, showSeatIds: string[]) {
  // First, clean up any existing expired holds across the system
  await releaseExpiredHolds();

  const now = new Date();
  const holdExpiresAt = new Date(now.getTime() + HOLD_TTL_MINUTES * 60 * 1000);

  // Perform inside interactive transaction
  return await prisma.$transaction(async (tx) => {
    const heldSeats = [];

    for (const seatId of showSeatIds) {
      const existingSeat = await tx.showSeat.findUnique({
        where: { id: seatId },
        include: { seatTemplate: true },
      });

      if (!existingSeat) {
        throw new Error(`Seat ${seatId} does not exist`);
      }

      if (existingSeat.status === 'BOOKED') {
        throw new Error(`Seat Row ${existingSeat.seatTemplate.row}-${existingSeat.seatTemplate.number} is already booked`);
      }

      // Check if held by another user and not expired
      if (
        existingSeat.status === 'HELD' &&
        existingSeat.heldByUserId !== userId &&
        existingSeat.holdExpiresAt &&
        existingSeat.holdExpiresAt > now
      ) {
        throw new Error(
          `Seat Row ${existingSeat.seatTemplate.row}-${existingSeat.seatTemplate.number} is currently held by another user`
        );
      }

      // Atomic UPDATE with version condition to prevent race conditions
      const result = await tx.showSeat.updateMany({
        where: {
          id: seatId,
          version: existingSeat.version,
          OR: [
            { status: 'AVAILABLE' },
            { status: 'HELD', holdExpiresAt: { lt: now } },
            { status: 'HELD', heldByUserId: userId },
          ],
        },
        data: {
          status: 'HELD',
          heldByUserId: userId,
          holdExpiresAt: holdExpiresAt,
          version: { increment: 1 },
        },
      });

      if (result.count === 0) {
        throw new Error(
          `Concurrency Conflict: Seat Row ${existingSeat.seatTemplate.row}-${existingSeat.seatTemplate.number} was modified by another request. Please try again.`
        );
      }

      heldSeats.push(seatId);
    }

    return {
      success: true,
      heldSeats,
      holdExpiresAt,
    };
  });
}

/**
 * Explicitly release seats held by a user (e.g. abandoned checkout or manual clear)
 */
export async function releaseSeats(userId: string, showSeatIds: string[]) {
  const seatsToRelease = await prisma.showSeat.findMany({
    where: {
      id: { in: showSeatIds },
      heldByUserId: userId,
      status: 'HELD',
    },
    include: { seatTemplate: true },
  });

  for (const seat of seatsToRelease) {
    await prisma.showSeat.update({
      where: { id: seat.id },
      data: {
        status: 'AVAILABLE',
        heldByUserId: null,
        holdExpiresAt: null,
        version: { increment: 1 },
      },
    });

    // Check waitlist
    await processWaitlistForCategory(seat.eventId, seat.seatTemplate.category);
  }

  return seatsToRelease.length;
}
