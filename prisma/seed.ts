import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Ticket Booking System database...');

  // 1. Clean existing records
  await prisma.bookingSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.waitlist.deleteMany();
  await prisma.showSeat.deleteMany();
  await prisma.eventPricing.deleteMany();
  await prisma.event.deleteMany();
  await prisma.seatTemplate.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const customer = await prisma.user.create({
    data: {
      name: 'Alex Johnson',
      email: 'customer@demo.com',
      password: passwordHash,
      role: 'CUSTOMER',
    },
  });

  const waitlistCustomer = await prisma.user.create({
    data: {
      name: 'Sarah Connor',
      email: 'waitlist.user@demo.com',
      password: passwordHash,
      role: 'CUSTOMER',
    },
  });

  const organiser = await prisma.user.create({
    data: {
      name: 'Metro Events Corp',
      email: 'organiser@demo.com',
      password: passwordHash,
      role: 'ORGANISER',
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@demo.com',
      password: passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('✅ Created Demo Users (password123 for all):');
  console.log(' - Customer: customer@demo.com');
  console.log(' - Waitlist User: waitlist.user@demo.com');
  console.log(' - Organiser: organiser@demo.com');
  console.log(' - Admin: admin@demo.com');

  // 3. Create Venues with Seat Templates
  const venue1 = await prisma.venue.create({
    data: {
      name: 'Grand Starlight Cinema',
      location: '742 Evergreen Terrace, LA',
      totalRows: 6,
      seatsPerRow: 10,
    },
  });

  const venue1Seats = [];
  for (let r = 0; r < 6; r++) {
    const rowLabel = String.fromCharCode(65 + r); // A, B, C, D, E, F
    for (let c = 1; c <= 10; c++) {
      let category = 'STANDARD';
      if (r < 2) category = 'VIP';
      else if (r < 4) category = 'PREMIUM';

      venue1Seats.push({
        venueId: venue1.id,
        row: rowLabel,
        number: c,
        category,
      });
    }
  }
  await prisma.seatTemplate.createMany({ data: venue1Seats });

  const venue2 = await prisma.venue.create({
    data: {
      name: 'Royal Concert Arena',
      location: '100 Broadway, NY',
      totalRows: 8,
      seatsPerRow: 12,
    },
  });

  const venue2Seats = [];
  for (let r = 0; r < 8; r++) {
    const rowLabel = String.fromCharCode(65 + r);
    for (let c = 1; c <= 12; c++) {
      let category = 'STANDARD';
      if (r < 2) category = 'VIP';
      else if (r < 5) category = 'PREMIUM';

      venue2Seats.push({
        venueId: venue2.id,
        row: rowLabel,
        number: c,
        category,
      });
    }
  }
  await prisma.seatTemplate.createMany({ data: venue2Seats });

  console.log('✅ Created Venues and Seat Layout Templates');

  // 4. Create Events
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(20, 30, 0, 0);

  const event1 = await prisma.event.create({
    data: {
      title: 'Inception - 15th Anniversary IMAX 3D',
      description: 'Experience Christopher Nolan’s mind-bending sci-fi masterpiece on the largest IMAX screen with immersive Dolby Atmos audio.',
      category: 'MOVIE',
      posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop',
      venueId: venue1.id,
      organiserId: organiser.id,
      date: tomorrow,
    },
  });

  await prisma.eventPricing.createMany({
    data: [
      { eventId: event1.id, seatCategory: 'STANDARD', price: 18.5 },
      { eventId: event1.id, seatCategory: 'PREMIUM', price: 28.0 },
      { eventId: event1.id, seatCategory: 'VIP', price: 45.0 },
    ],
  });

  const event2 = await prisma.event.create({
    data: {
      title: 'Coldplay - Music of the Spheres World Tour',
      description: 'An unforgettable night of lasers, confetti, wristband lights, and iconic anthems live in concert.',
      category: 'CONCERT',
      posterUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop',
      venueId: venue2.id,
      organiserId: organiser.id,
      date: nextWeek,
    },
  });

  await prisma.eventPricing.createMany({
    data: [
      { eventId: event2.id, seatCategory: 'STANDARD', price: 65.0 },
      { eventId: event2.id, seatCategory: 'PREMIUM', price: 120.0 },
      { eventId: event2.id, seatCategory: 'VIP', price: 250.0 },
    ],
  });

  console.log('✅ Created Events and Per-Category Pricing');

  // 5. Instantiate ShowSeat records for Events
  const templates1 = await prisma.seatTemplate.findMany({ where: { venueId: venue1.id } });
  const showSeats1 = templates1.map((t) => ({
    eventId: event1.id,
    seatTemplateId: t.id,
    status: 'AVAILABLE',
  }));
  await prisma.showSeat.createMany({ data: showSeats1 });

  const templates2 = await prisma.seatTemplate.findMany({ where: { venueId: venue2.id } });
  const showSeats2 = templates2.map((t) => ({
    eventId: event2.id,
    seatTemplateId: t.id,
    status: 'AVAILABLE',
  }));
  await prisma.showSeat.createMany({ data: showSeats2 });

  // 6. Create sample confirmed booking for Alex Johnson on Event 1 (Seats A-1, A-2)
  const seatA1 = await prisma.showSeat.findFirst({
    where: { eventId: event1.id, seatTemplate: { row: 'A', number: 1 } },
  });
  const seatA2 = await prisma.showSeat.findFirst({
    where: { eventId: event1.id, seatTemplate: { row: 'A', number: 2 } },
  });

  if (seatA1 && seatA2) {
    const bookingRef = 'TKT-984210-4491';
    const qrCodeUrl = await QRCode.toDataURL(bookingRef, { width: 250, margin: 2 });

    const booking = await prisma.booking.create({
      data: {
        bookingRef,
        userId: customer.id,
        eventId: event1.id,
        totalAmount: 90.0, // 2 x $45 VIP
        status: 'CONFIRMED',
        qrCodeUrl,
      },
    });

    await prisma.bookingSeat.createMany({
      data: [
        { bookingId: booking.id, showSeatId: seatA1.id, price: 45.0 },
        { bookingId: booking.id, showSeatId: seatA2.id, price: 45.0 },
      ],
    });

    await prisma.showSeat.update({
      where: { id: seatA1.id },
      data: { status: 'BOOKED' },
    });
    await prisma.showSeat.update({
      where: { id: seatA2.id },
      data: { status: 'BOOKED' },
    });

    console.log('✅ Created Demo Confirmed Booking with QR Code');
  }

  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
