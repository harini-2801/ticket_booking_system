import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { processWaitlistForCategory } from '@/lib/waitlist';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const bookingId = params.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        seats: {
          include: {
            showSeat: {
              include: { seatTemplate: true },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized to cancel this booking' }, { status: 403 });
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
    }

    // Perform cancellation inside transaction
    const categoriesToProcess = new Set<string>();

    await prisma.$transaction(async (tx) => {
      // 1. Mark booking CANCELLED
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });

      // 2. Release seats back to AVAILABLE
      for (const bookingSeat of booking.seats) {
        const category = bookingSeat.showSeat.seatTemplate.category;
        categoriesToProcess.add(category);

        await tx.showSeat.update({
          where: { id: bookingSeat.showSeatId },
          data: {
            status: 'AVAILABLE',
            heldByUserId: null,
            holdExpiresAt: null,
            version: { increment: 1 },
          },
        });
      }
    });

    // 3. Process Waitlist for released seat categories!
    for (const category of categoriesToProcess) {
      try {
        await processWaitlistForCategory(booking.eventId, category);
      } catch (err) {
        console.error(`Error processing waitlist for category ${category}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully. Released seats have been offered to waitlisted customers.',
    });
  } catch (err: any) {
    console.error('Cancel booking error:', err);
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
  }
}
