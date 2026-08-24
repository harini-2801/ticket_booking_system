import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const bookingId = params.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        event: {
          include: { venue: true, city: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const eventDate = new Date(booking.event.date);
    const endDate = booking.event.endDate
      ? new Date(booking.event.endDate)
      : new Date(eventDate.getTime() + 3 * 60 * 60 * 1000);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TicketPass System//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${booking.bookingRef}@ticketpass.com`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(eventDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${booking.event.title}`,
      `DESCRIPTION:Booking Ref: ${booking.bookingRef}\\nVenue: ${booking.event.venue.name}\\nGenre: ${booking.event.genre}`,
      `LOCATION:${booking.event.venue.name}, ${booking.event.venue.location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="ticket-${booking.bookingRef}.ics"`,
      },
    });
  } catch (err: any) {
    console.error('Calendar generation error:', err);
    return NextResponse.json({ error: 'Failed to generate calendar file' }, { status: 500 });
  }
}
