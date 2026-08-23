import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'ORGANISER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const where: any = {};
    if (user.role === 'ORGANISER') {
      where.organiserId = user.id;
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        venue: true,
        pricings: true,
        bookings: {
          where: { status: 'CONFIRMED' },
          include: {
            seats: true,
            user: { select: { name: true, email: true } },
          },
        },
        showSeats: {
          include: { seatTemplate: true },
        },
        _count: {
          select: { waitlists: true },
        },
      },
    });

    const summary = events.map((event) => {
      const totalSeats = event.showSeats.length;
      const bookedSeatsCount = event.showSeats.filter((s) => s.status === 'BOOKED').length;
      const heldSeatsCount = event.showSeats.filter((s) => s.status === 'HELD').length;
      const availableSeatsCount = totalSeats - bookedSeatsCount - heldSeatsCount;

      const totalRevenue = event.bookings.reduce((sum, b) => sum + b.totalAmount, 0);

      return {
        id: event.id,
        title: event.title,
        category: event.category,
        date: event.date,
        venueName: event.venue.name,
        totalSeats,
        bookedSeatsCount,
        heldSeatsCount,
        availableSeatsCount,
        occupancyRate: totalSeats > 0 ? ((bookedSeatsCount / totalSeats) * 100).toFixed(1) : 0,
        totalRevenue,
        bookingsCount: event.bookings.length,
        waitlistCount: event._count.waitlists,
      };
    });

    const overallRevenue = summary.reduce((sum, item) => sum + item.totalRevenue, 0);
    const overallBookings = summary.reduce((sum, item) => sum + item.bookingsCount, 0);

    return NextResponse.json({
      events: summary,
      stats: {
        totalEvents: events.length,
        overallRevenue,
        overallBookings,
      },
    });
  } catch (err: any) {
    console.error('Fetch organiser summary error:', err);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}
