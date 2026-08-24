import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding District-Style Ticket Booking System database...');

  // Clean existing tables in order
  await prisma.bookingAddon.deleteMany();
  await prisma.bookingSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.waitlist.deleteMany();
  await prisma.showSeat.deleteMany();
  await prisma.eventPricing.deleteMany();
  await prisma.eventPerformer.deleteMany();
  await prisma.event.deleteMany();
  await prisma.performer.deleteMany();
  await prisma.foodAddon.deleteMany();
  await prisma.seatTemplate.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.city.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Demo Users
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

  console.log('✅ Created Demo Users (password123 for all)');

  // 2. Create Cities
  const citiesData = [
    { name: 'Mumbai', state: 'Maharashtra', isPopular: true },
    { name: 'Delhi NCR', state: 'Delhi', isPopular: true },
    { name: 'Bengaluru', state: 'Karnataka', isPopular: true },
    { name: 'Hyderabad', state: 'Telangana', isPopular: true },
    { name: 'Goa', state: 'Goa', isPopular: true },
  ];

  const cityMap: Record<string, any> = {};
  for (const c of citiesData) {
    const created = await prisma.city.create({ data: c });
    cityMap[c.name] = created;
  }
  console.log('✅ Created Cities (Mumbai, Delhi NCR, Bengaluru, Hyderabad, Goa)');

  // 3. Create Food & Beverage Addons
  const foodAddonsData = [
    {
      name: 'Large Caramel Popcorn',
      description: 'Freshly popped warm gourmet caramel popcorn (Bucket 120g)',
      category: 'SNACK',
      price: 8.5,
      imageUrl: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600&auto=format&fit=crop',
    },
    {
      name: 'Cheese Nachos + Tangy Jalapeno Dip',
      description: 'Crispy corn tortilla chips with warm liquid cheese and salsa',
      category: 'SNACK',
      price: 7.0,
      imageUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&auto=format&fit=crop',
    },
    {
      name: 'Fountain Soda (Pepsi / 7Up 600ml)',
      description: 'Ice cold fountain beverage of your choice',
      category: 'BEVERAGE',
      price: 4.5,
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop',
    },
    {
      name: 'Blockbuster Combo (Large Popcorn + 2 Sodas)',
      description: 'Best seller! Large butter popcorn + 2 cold fountain drinks',
      category: 'COMBO',
      price: 14.5,
      imageUrl: 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?w=600&auto=format&fit=crop',
    },
    {
      name: 'VIP Lounge Pass (Unlimited F&B Access)',
      description: 'Access to private air-conditioned VIP lounge with complimentary snacks & bar access',
      category: 'VIP_PERK',
      price: 35.0,
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop',
    },
  ];

  const addonMap: Record<string, any> = {};
  for (const item of foodAddonsData) {
    const created = await prisma.foodAddon.create({ data: item });
    addonMap[item.name] = created;
  }
  console.log('✅ Created Food & Beverage Addons');

  // 4. Create Performers
  const performersData = [
    { name: 'Coldplay', role: 'Musician', avatarUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop', bio: 'British rock band formed in London in 1997.' },
    { name: 'A.R. Rahman', role: 'Musician', avatarUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop', bio: 'Oscar-winning Indian music composer, record producer, singer and songwriter.' },
    { name: 'Zakir Khan', role: 'Comedian', avatarUrl: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=400&auto=format&fit=crop', bio: 'Popular Indian stand-up comedian and presenter.' },
    { name: 'Anubhav Singh Bassi', role: 'Comedian', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop', bio: 'Famous Indian standup comic known for relatable storytelling.' },
    { name: 'Martin Garrix', role: 'DJ', avatarUrl: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb1?w=400&auto=format&fit=crop', bio: 'Dutch DJ and electronic music producer.' },
    { name: 'Christopher Nolan', role: 'Filmmaker', avatarUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&auto=format&fit=crop', bio: 'Acclaimed visionary film director.' },
  ];

  const performerMap: Record<string, any> = {};
  for (const p of performersData) {
    const created = await prisma.performer.create({ data: p });
    performerMap[p.name] = created;
  }
  console.log('✅ Created Performers');

  // 5. Create Venues with Seat Templates
  const createVenueWithGrid = async (name: string, location: string, address: string, cityName: string, rows: number, cols: number) => {
    const city = cityMap[cityName];
    const venue = await prisma.venue.create({
      data: {
        name,
        location,
        address,
        cityId: city ? city.id : null,
        totalRows: rows,
        seatsPerRow: cols,
        hasSeating: true,
      },
    });

    const seats = [];
    for (let r = 0; r < rows; r++) {
      const rowLabel = String.fromCharCode(65 + r);
      for (let c = 1; c <= cols; c++) {
        let category = 'STANDARD';
        if (r < 2) category = 'VIP';
        else if (r < Math.ceil(rows / 2)) category = 'PREMIUM';

        seats.push({
          venueId: venue.id,
          row: rowLabel,
          number: c,
          category,
        });
      }
    }
    await prisma.seatTemplate.createMany({ data: seats });
    return venue;
  };

  const v1 = await createVenueWithGrid('PVR INOX Director\'s Cut', 'Phoenix Palladium, Lower Parel', 'Senapati Bapat Marg, Lower Parel, Mumbai', 'Mumbai', 6, 10);
  const v2 = await createVenueWithGrid('Nesco Centre Arena', 'Goregaon East', 'WEH, Goregaon East, Mumbai', 'Mumbai', 8, 12);
  const v3 = await createVenueWithGrid('Jawaharlal Nehru Stadium', 'Central Delhi', 'Pragati Vihar, New Delhi', 'Delhi NCR', 10, 14);
  const v4 = await createVenueWithGrid('Koramangala Indoor Arena', 'Koramangala 8th Block', '100 Feet Rd, Koramangala, Bengaluru', 'Bengaluru', 8, 10);
  const v5 = await createVenueWithGrid('Sunburn Beach Grounds', 'Anjuna Beach', 'Anjuna Beach Rd, North Goa', 'Goa', 6, 12);
  const v6 = await createVenueWithGrid('Gachibowli Outdoor Stadium', 'Gachibowli', 'Old Mumbai Hwy, Gachibowli, Hyderabad', 'Hyderabad', 8, 12);

  console.log('✅ Created Venues and Layout Grids');

  // Helper date generators
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(19, 0, 0, 0);
  const nextWeekend = new Date(); nextWeekend.setDate(nextWeekend.getDate() + 5); nextWeekend.setHours(20, 0, 0, 0);
  const inTwoWeeks = new Date(); inTwoWeeks.setDate(inTwoWeeks.getDate() + 14); inTwoWeeks.setHours(18, 30, 0, 0);

  // 6. Create 15+ Events across categories
  const eventsData = [
    {
      title: 'Inception - 15th Anniversary IMAX 70mm',
      subtitle: 'Experience Christopher Nolan\'s mind-bending masterpiece',
      description: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O. Remastered in IMAX 70mm with uncompressed Dolby Atmos sound.',
      category: 'MOVIE',
      genre: 'Sci-Fi / Thriller',
      language: 'English',
      ageRestriction: '13+',
      duration: '2h 28m',
      posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1200&auto=format&fit=crop',
      venue: v1,
      city: cityMap['Mumbai'],
      date: tomorrow,
      isFeatured: true,
      performers: ['Christopher Nolan'],
      prices: { STANDARD: 18.5, PREMIUM: 28.0, VIP: 45.0 },
    },
    {
      title: 'Coldplay - Music of the Spheres World Tour',
      subtitle: 'The iconic global band live in Mumbai',
      description: 'An unforgettable night of lasers, confetti, wristband lights, and iconic anthems live in concert. Featuring guest appearances and sustainability-powered kinetic dance floors.',
      category: 'CONCERT',
      genre: 'Pop / Rock',
      language: 'English',
      ageRestriction: 'All Ages',
      duration: '3h 00m',
      posterUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&auto=format&fit=crop',
      venue: v2,
      city: cityMap['Mumbai'],
      date: nextWeekend,
      isFeatured: true,
      performers: ['Coldplay'],
      prices: { STANDARD: 65.0, PREMIUM: 120.0, VIP: 250.0 },
    },
    {
      title: 'A.R. Rahman Live in Concert - Symphonic Night',
      subtitle: 'The Mozart of Madras performing his timeless classics',
      description: 'Oscar-winning maestro A.R. Rahman presents a grand 50-piece orchestral fusion experience celebrating 30 years of musical brilliance.',
      category: 'CONCERT',
      genre: 'World / Fusion',
      language: 'Multilingual',
      ageRestriction: 'All Ages',
      duration: '3h 15m',
      posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&auto=format&fit=crop',
      venue: v4,
      city: cityMap['Bengaluru'],
      date: inTwoWeeks,
      isFeatured: true,
      performers: ['A.R. Rahman'],
      prices: { STANDARD: 45.0, PREMIUM: 85.0, VIP: 180.0 },
    },
    {
      title: 'Zakir Khan - Live Standup Special',
      subtitle: 'Tathaastu & Unreleased Stories Tour',
      description: 'The Sakht Launda returns with his trademark observational humor, heart-warming anecdotes, and laughter-packed storytelling.',
      category: 'COMEDY',
      genre: 'Standup Comedy',
      language: 'Hindi',
      ageRestriction: '16+',
      duration: '1h 45m',
      posterUrl: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=1200&auto=format&fit=crop',
      venue: v1,
      city: cityMap['Mumbai'],
      date: tomorrow,
      isFeatured: false,
      performers: ['Zakir Khan'],
      prices: { STANDARD: 25.0, PREMIUM: 40.0, VIP: 75.0 },
    },
    {
      title: 'Anubhav Singh Bassi - Kisi Ko Batana Mat',
      subtitle: 'Hilarious brand new standup special',
      description: 'Bassi is back after the massive success of Hoshtel! Get ready for fresh college stories, courtroom misadventures, and non-stop laughter.',
      category: 'COMEDY',
      genre: 'Storytelling Comedy',
      language: 'Hindi',
      ageRestriction: '16+',
      duration: '1h 30m',
      posterUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop',
      venue: v3,
      city: cityMap['Delhi NCR'],
      date: nextWeekend,
      isFeatured: true,
      performers: ['Anubhav Singh Bassi'],
      prices: { STANDARD: 20.0, PREMIUM: 35.0, VIP: 65.0 },
    },
    {
      title: 'Sunburn Goa 2026 - EDM Beach Festival',
      subtitle: 'Asia\'s largest electronic dance music festival',
      description: '3 days of non-stop dance music, world-class stage design, pyrotechnics, and top global DJs performing on the sun-kissed beaches of Goa.',
      category: 'FOOD_NIGHTLIFE',
      genre: 'EDM / Dance',
      language: 'English',
      ageRestriction: '18+',
      duration: '8h 00m',
      posterUrl: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb1?w=800&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop',
      venue: v5,
      city: cityMap['Goa'],
      date: inTwoWeeks,
      isFeatured: true,
      performers: ['Martin Garrix'],
      prices: { STANDARD: 50.0, PREMIUM: 90.0, VIP: 200.0 },
    },
    {
      title: 'IPL 2026 Championship Final - Mumbai vs Chennai',
      subtitle: 'The ultimate T20 cricket showdown live',
      description: 'Witness the greatest rivals in cricket history clash for the trophy in a high-octane stadium atmosphere with cheerleaders, fireworks, and live commentary.',
      category: 'SPORTS',
      genre: 'T20 Cricket',
      language: 'Multilingual',
      ageRestriction: 'All Ages',
      duration: '4h 00m',
      posterUrl: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200&auto=format&fit=crop',
      venue: v2,
      city: cityMap['Mumbai'],
      date: inTwoWeeks,
      isFeatured: true,
      performers: [],
      prices: { STANDARD: 40.0, PREMIUM: 95.0, VIP: 300.0 },
    },
    {
      title: 'Kalki 2898 AD (3D IMAX)',
      subtitle: 'The epic mythological sci-fi blockbuster',
      description: 'In a dystopian future set in post-apocalyptic Kashi, a bounty hunter embarks on a dangerous mission that connects ancient lore to humanity\'s future.',
      category: 'MOVIE',
      genre: 'Sci-Fi / Action',
      language: 'Telugu / Hindi',
      ageRestriction: '13+',
      duration: '3h 05m',
      posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop',
      venue: v6,
      city: cityMap['Hyderabad'],
      date: tomorrow,
      isFeatured: false,
      performers: [],
      prices: { STANDARD: 15.0, PREMIUM: 25.0, VIP: 40.0 },
    },
    {
      title: 'Mughal-e-Azam - The Musical Stage Play',
      subtitle: 'India\'s largest theatrical production',
      description: 'Directed by Feroz Abbas Khan, featuring live singing, exquisite costumes by Manish Malhotra, and mesmerising Kathak dance performances.',
      category: 'THEATRE',
      genre: 'Broadway Musical',
      language: 'Hindi / Urdu',
      ageRestriction: 'All Ages',
      duration: '2h 30m',
      posterUrl: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=800&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&auto=format&fit=crop',
      venue: v3,
      city: cityMap['Delhi NCR'],
      date: nextWeekend,
      isFeatured: false,
      performers: [],
      prices: { STANDARD: 30.0, PREMIUM: 60.0, VIP: 120.0 },
    },
    {
      title: 'Goa Food & Wine Festival 2026',
      subtitle: 'Celebrity chefs, artisanal wines & live acoustic music',
      description: 'Sample gourmet delicacies from over 40 top culinary brands, attend masterclasses by master chefs, and enjoy oceanfront wine tasting.',
      category: 'FOOD_NIGHTLIFE',
      genre: 'Culinary / Wine Tasting',
      language: 'English',
      ageRestriction: '21+',
      duration: '6h 00m',
      posterUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&auto=format&fit=crop',
      venue: v5,
      city: cityMap['Goa'],
      date: tomorrow,
      isFeatured: false,
      performers: [],
      prices: { STANDARD: 35.0, PREMIUM: 70.0, VIP: 140.0 },
    },
  ];

  for (const item of eventsData) {
    const event = await prisma.event.create({
      data: {
        title: item.title,
        subtitle: item.subtitle,
        description: item.description,
        category: item.category,
        genre: item.genre,
        language: item.language,
        ageRestriction: item.ageRestriction,
        duration: item.duration,
        posterUrl: item.posterUrl,
        bannerUrl: item.bannerUrl,
        venueId: item.venue.id,
        cityId: item.city ? item.city.id : null,
        organiserId: organiser.id,
        date: item.date,
        isFeatured: item.isFeatured,
      },
    });

    // Pricing entries
    const pricingEntries = Object.entries(item.prices).map(([cat, pr]) => ({
      eventId: event.id,
      seatCategory: cat,
      price: pr,
    }));
    await prisma.eventPricing.createMany({ data: pricingEntries });

    // Link performers
    for (const perfName of item.performers) {
      const perf = performerMap[perfName];
      if (perf) {
        await prisma.eventPerformer.create({
          data: {
            eventId: event.id,
            performerId: perf.id,
          },
        });
      }
    }

    // Generate ShowSeat records for venue layout
    const templates = await prisma.seatTemplate.findMany({ where: { venueId: item.venue.id } });
    const showSeats = templates.map((t) => ({
      eventId: event.id,
      seatTemplateId: t.id,
      status: 'AVAILABLE',
    }));
    await prisma.showSeat.createMany({ data: showSeats });
  }

  console.log('✅ Populated 10+ Multi-City Events across all Categories');

  // 7. Create Sample Confirmed Booking with F&B Combo attached
  const firstEvent = await prisma.event.findFirst({
    include: { venue: { include: { seats: true } } },
  });

  if (firstEvent) {
    const seat1 = await prisma.showSeat.findFirst({
      where: { eventId: firstEvent.id, seatTemplate: { row: 'A', number: 1 } },
    });
    const seat2 = await prisma.showSeat.findFirst({
      where: { eventId: firstEvent.id, seatTemplate: { row: 'A', number: 2 } },
    });

    if (seat1 && seat2) {
      const bookingRef = 'TKT-88910-VIP';
      const qrCodeUrl = await QRCode.toDataURL(bookingRef, { width: 250, margin: 2 });

      const booking = await prisma.booking.create({
        data: {
          bookingRef,
          userId: customer.id,
          eventId: firstEvent.id,
          totalAmount: 104.5, // 2x45 VIP seats + 14.50 Combo
          status: 'CONFIRMED',
          qrCodeUrl,
        },
      });

      await prisma.bookingSeat.createMany({
        data: [
          { bookingId: booking.id, showSeatId: seat1.id, price: 45.0 },
          { bookingId: booking.id, showSeatId: seat2.id, price: 45.0 },
        ],
      });

      // Add F&B Combo to booking
      const comboAddon = addonMap['Blockbuster Combo (Large Popcorn + 2 Sodas)'];
      if (comboAddon) {
        await prisma.bookingAddon.create({
          data: {
            bookingId: booking.id,
            foodAddonId: comboAddon.id,
            quantity: 1,
            price: 14.5,
          },
        });
      }

      await prisma.showSeat.update({ where: { id: seat1.id }, data: { status: 'BOOKED' } });
      await prisma.showSeat.update({ where: { id: seat2.id }, data: { status: 'BOOKED' } });

      console.log('✅ Created Demo Booking with F&B Combo & QR Code Ticket');
    }
  }

  console.log('🎉 District Platform Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
