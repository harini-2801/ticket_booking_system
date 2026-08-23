import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const venues = await prisma.venue.findMany({
      include: {
        _count: {
          select: { seats: true, events: true },
        },
      },
    });
    return NextResponse.json({ venues });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'ORGANISER')) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { name, location, totalRows, seatsPerRow, customCategories } = await req.json();

    if (!name || !location || !totalRows || !seatsPerRow) {
      return NextResponse.json({ error: 'Missing venue parameters' }, { status: 400 });
    }

    const rowsCount = parseInt(totalRows);
    const colsCount = parseInt(seatsPerRow);

    // Create Venue
    const venue = await prisma.venue.create({
      data: {
        name,
        location,
        totalRows: rowsCount,
        seatsPerRow: colsCount,
      },
    });

    // Generate SeatTemplates (A..Z for rows)
    const seatTemplates = [];
    for (let r = 0; r < rowsCount; r++) {
      const rowLabel = String.fromCharCode(65 + r); // A, B, C...
      for (let c = 1; c <= colsCount; c++) {
        // Assign Category: First 2 rows VIP, middle rows PREMIUM, remaining STANDARD
        let category = 'STANDARD';
        if (customCategories && customCategories[rowLabel]) {
          category = customCategories[rowLabel];
        } else {
          if (r < 2) category = 'VIP';
          else if (r < Math.ceil(rowsCount / 2)) category = 'PREMIUM';
          else category = 'STANDARD';
        }

        seatTemplates.push({
          venueId: venue.id,
          row: rowLabel,
          number: c,
          category,
        });
      }
    }

    await prisma.seatTemplate.createMany({
      data: seatTemplates,
    });

    return NextResponse.json({ success: true, venue });
  } catch (err: any) {
    console.error('Create venue error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create venue' }, { status: 500 });
  }
}
