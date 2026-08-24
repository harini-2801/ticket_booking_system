import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateQRCode } from '@/lib/qr';
import { sendBookingTicketEmail } from '@/lib/email';
import { releaseExpiredHolds } from '@/lib/concurrency';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const bookings = await prisma.booking.findMany({
      where: { userId: user.id },
      include: {
        event: {
          include: { venue: true, city: true },
        },
        seats: {
          include: {
            showSeat: {
              include: { seatTemplate: true },
            },
          },
        },
        addons: {
          include: {
            foodAddon: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ bookings });
  } catch (err: any) {
    console.error('Fetch bookings error:', err);
    return NextResponse.json({ error: 'Failed to fetch booking history' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await releaseExpiredHolds();

    const { eventId, showSeatIds, selectedAddons } = await req.json();

    if (!eventId || !showSeatIds || !Array.isArray(showSeatIds) || showSeatIds.length === 0) {
      return NextResponse.json({ error: 'Invalid booking parameters' }, { status: 400 });
    }

    const now = new Date();

    const showSeats = await prisma.showSeat.findMany({
      where: {
        id: { in: showSeatIds },
        eventId,
      },
      include: {
        seatTemplate: true,
      },
    });

    if (showSeats.length !== showSeatIds.length) {
      return NextResponse.json({ error: 'One or more selected seats were not found' }, { status: 404 });
    }

    for (const seat of showSeats) {
      if (seat.status !== 'HELD' || seat.heldByUserId !== user.id) {
        return NextResponse.json(
          { error: `Seat Row ${seat.seatTemplate.row}-${seat.seatTemplate.number} is no longer held by you. Hold expired.` },
          { status: 400 }
        );
      }
      if (seat.holdExpiresAt && seat.holdExpiresAt < now) {
        return NextResponse.json(
          { error: `Seat Row ${seat.seatTemplate.row}-${seat.seatTemplate.number} hold has expired.` },
          { status: 400 }
        );
      }
    }

    const pricings = await prisma.eventPricing.findMany({
      where: { eventId },
    });

    const priceMap = new Map<string, number>();
    pricings.forEach((p) => priceMap.set(p.seatCategory, p.price));

    let ticketAmount = 0;
    const seatPrices: { showSeatId: string; price: number; seatName: string }[] = [];

    for (const seat of showSeats) {
      const price = priceMap.get(seat.seatTemplate.category) || 20;
      ticketAmount += price;
      seatPrices.push({
        showSeatId: seat.id,
        price,
        seatName: `Row ${seat.seatTemplate.row}-${seat.seatTemplate.number} (${seat.seatTemplate.category})`,
      });
    }

    // Process Food & Beverage Addons
    let addonAmount = 0;
    const validatedAddons: { foodAddonId: string; quantity: number; price: number; name: string }[] = [];

    if (selectedAddons && Array.isArray(selectedAddons) && selectedAddons.length > 0) {
      const addonIds = selectedAddons.map((a: any) => a.addonId);
      const foodAddonRecords = await prisma.foodAddon.findMany({
        where: { id: { in: addonIds } },
      });

      const addonMap = new Map<string, any>();
      foodAddonRecords.forEach((f) => addonMap.set(f.id, f));

      for (const item of selectedAddons) {
        const dbAddon = addonMap.get(item.addonId);
        if (dbAddon && item.quantity > 0) {
          const itemTotal = dbAddon.price * item.quantity;
          addonAmount += itemTotal;
          validatedAddons.push({
            foodAddonId: dbAddon.id,
            quantity: item.quantity,
            price: dbAddon.price,
            name: dbAddon.name,
          });
        }
      }
    }

    const totalAmount = ticketAmount + addonAmount;

    // Generate Unique Booking Reference
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingRef = `TKT-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    const qrCodeUrl = await generateQRCode(bookingRef);

    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingRef,
          userId: user.id,
          eventId,
          totalAmount,
          status: 'CONFIRMED',
          qrCodeUrl,
        },
      });

      for (const sp of seatPrices) {
        await tx.bookingSeat.create({
          data: {
            bookingId: newBooking.id,
            showSeatId: sp.showSeatId,
            price: sp.price,
          },
        });

        await tx.showSeat.update({
          where: { id: sp.showSeatId },
          data: {
            status: 'BOOKED',
            heldByUserId: null,
            holdExpiresAt: null,
            version: { increment: 1 },
          },
        });
      }

      for (const va of validatedAddons) {
        await tx.bookingAddon.create({
          data: {
            bookingId: newBooking.id,
            foodAddonId: va.foodAddonId,
            quantity: va.quantity,
            price: va.price,
          },
        });
      }

      await tx.waitlist.updateMany({
        where: {
          eventId,
          userId: user.id,
          status: 'OFFERED',
        },
        data: {
          status: 'FULFILLED',
        },
      });

      return newBooking;
    });

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { venue: true },
    });

    if (event) {
      const seatNames = seatPrices.map((s) => s.seatName);
      if (validatedAddons.length > 0) {
        const addonSummary = validatedAddons.map((a) => `${a.quantity}x ${a.name}`).join(', ');
        seatNames.push(`F&B Addons: ${addonSummary}`);
      }

      sendBookingTicketEmail(
        user.email,
        user.name,
        event.title,
        event.date,
        event.venue.name,
        bookingRef,
        seatNames,
        totalAmount,
        qrCodeUrl
      ).catch((err) => console.error('Background email send error:', err));
    }

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (err: any) {
    console.error('Booking error:', err);
    return NextResponse.json({ error: err.message || 'Failed to complete booking' }, { status: 500 });
  }
}
