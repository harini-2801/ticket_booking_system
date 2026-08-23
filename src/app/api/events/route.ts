import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category'); // MOVIE, CONCERT
    const search = searchParams.get('search');

    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        venue: true,
        pricings: true,
        organiser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ events });
  } catch (err: any) {
    console.error('Fetch events error:', err);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'ORGANISER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized. Organiser access required.' }, { status: 403 });
    }

    const { title, description, category, posterUrl, venueId, date, prices } = await req.json();

    if (!title || !category || !venueId || !date || !prices) {
      return NextResponse.json({ error: 'Missing required event fields' }, { status: 400 });
    }

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: { seats: true },
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Create Event
    const event = await prisma.event.create({
      data: {
        title,
        description: description || '',
        category,
        posterUrl: posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop',
        venueId,
        organiserId: user.id,
        date: new Date(date),
      },
    });

    // Create EventPricings (e.g. { STANDARD: 15, PREMIUM: 25, VIP: 40 })
    const pricingEntries = Object.entries(prices).map(([seatCategory, price]) => ({
      eventId: event.id,
      seatCategory,
      price: parseFloat(price as string),
    }));

    await prisma.eventPricing.createMany({
      data: pricingEntries,
    });

    // Populate ShowSeat records for each seat in the venue
    const showSeatEntries = venue.seats.map((seat) => ({
      eventId: event.id,
      seatTemplateId: seat.id,
      status: 'AVAILABLE',
    }));

    await prisma.showSeat.createMany({
      data: showSeatEntries,
    });

    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    console.error('Create event error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create event' }, { status: 500 });
  }
}
