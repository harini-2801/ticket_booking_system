import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const cityId = searchParams.get('cityId');
    const cityName = searchParams.get('city');
    const search = searchParams.get('search');
    const dateRange = searchParams.get('dateRange');

    const where: any = {};

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (cityId) {
      where.cityId = cityId;
    } else if (cityName && cityName !== 'ALL') {
      where.city = { name: cityName };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { subtitle: { contains: search } },
        { description: { contains: search } },
        { genre: { contains: search } },
      ];
    }

    if (dateRange) {
      const now = new Date();
      if (dateRange === 'today') {
        const start = new Date(now.setHours(0, 0, 0, 0));
        const end = new Date(now.setHours(23, 59, 59, 999));
        where.date = { gte: start, lte: end };
      } else if (dateRange === 'tomorrow') {
        const tomorrowStart = new Date();
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        tomorrowStart.setHours(0, 0, 0, 0);
        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setHours(23, 59, 59, 999);
        where.date = { gte: tomorrowStart, lte: tomorrowEnd };
      } else if (dateRange === 'weekend') {
        const weekend = new Date();
        weekend.setDate(weekend.getDate() + (6 - weekend.getDay())); // Saturday
        weekend.setHours(0, 0, 0, 0);
        where.date = { gte: weekend };
      }
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        venue: true,
        city: true,
        pricings: true,
        performers: {
          include: { performer: true },
        },
        organiser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { isFeatured: 'desc' },
        { date: 'asc' },
      ],
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

    const {
      title,
      subtitle,
      description,
      category,
      genre,
      language,
      ageRestriction,
      duration,
      posterUrl,
      bannerUrl,
      venueId,
      cityId,
      date,
      prices,
    } = await req.json();

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

    const event = await prisma.event.create({
      data: {
        title,
        subtitle: subtitle || '',
        description: description || '',
        category,
        genre: genre || 'General',
        language: language || 'English',
        ageRestriction: ageRestriction || 'All Ages',
        duration: duration || '2h 00m',
        posterUrl: posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop',
        bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1200&auto=format&fit=crop',
        venueId,
        cityId: cityId || venue.cityId,
        organiserId: user.id,
        date: new Date(date),
      },
    });

    const pricingEntries = Object.entries(prices).map(([seatCategory, price]) => ({
      eventId: event.id,
      seatCategory,
      price: parseFloat(price as string),
    }));

    await prisma.eventPricing.createMany({
      data: pricingEntries,
    });

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
