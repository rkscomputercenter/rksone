import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding RKS database...');

  // ── Super Admin User ──────────────────────────────────────
  const superAdminExists = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!superAdminExists) {
    const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString('hex');
    const hash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        name: 'Super Admin',
        username: 'admin',
        passwordHash: hash,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });
    console.log(`✅ Super Admin created (username: admin, password: ${adminPassword})`);
    console.log(`⚠️  PLEASE COPY AND SAVE THIS PASSWORD IMMEDITELY. IT WILL NOT BE SHOWN AGAIN.`);
  } else {
    console.log('⏭  Super Admin already exists — skipping.');
  }

  // ── Default Services ──────────────────────────────────────
  const serviceCount = await prisma.service.count();

  if (serviceCount === 0) {
    const services = [
      // Government Services
      { name: 'Aadhaar Card Print', category: 'GOVT' as const, price: 20 },
      { name: 'Aadhaar Update / Correction', category: 'GOVT' as const, price: 50 },
      { name: 'PAN Card Apply (New)', category: 'GOVT' as const, price: 120 },
      { name: 'PAN Card Correction', category: 'GOVT' as const, price: 100 },
      { name: 'Birth Certificate', category: 'GOVT' as const, price: 50 },
      { name: 'Income Certificate', category: 'GOVT' as const, price: 50 },
      { name: 'Community Certificate', category: 'GOVT' as const, price: 50 },
      { name: 'Chitta / Patta Copy', category: 'GOVT' as const, price: 30 },
      { name: 'TNPDS Smart Card', category: 'GOVT' as const, price: 50 },
      { name: 'Voter ID Apply', category: 'GOVT' as const, price: 50 },
      { name: 'Voter ID Correction', category: 'GOVT' as const, price: 30 },
      { name: 'Driving License Apply', category: 'GOVT' as const, price: 150 },
      { name: 'Passport Apply Assistance', category: 'GOVT' as const, price: 200 },
      { name: 'UDID Certificate', category: 'GOVT' as const, price: 50 },
      { name: 'e-Seva / Form Submission', category: 'GOVT' as const, price: 30 },

      // Printing Services
      { name: 'Black & White Print (A4)', category: 'PRINTING' as const, price: 2 },
      { name: 'Color Print (A4)', category: 'PRINTING' as const, price: 10 },
      { name: 'Black & White Print (A3)', category: 'PRINTING' as const, price: 5 },
      { name: 'Color Print (A3)', category: 'PRINTING' as const, price: 20 },
      { name: 'Photo Print (4x6)', category: 'PRINTING' as const, price: 15 },
      { name: 'Xerox (B&W per page)', category: 'PRINTING' as const, price: 1 },
      { name: 'Xerox (Color per page)', category: 'PRINTING' as const, price: 8 },
      { name: 'Lamination (A4)', category: 'PRINTING' as const, price: 20 },
      { name: 'Lamination (ID Card)', category: 'PRINTING' as const, price: 10 },
      { name: 'Spiral Binding', category: 'PRINTING' as const, price: 30 },
      { name: 'Scanning (per page)', category: 'PRINTING' as const, price: 5 },

      // Card Services
      { name: 'Visiting Card (100 pcs)', category: 'CARDS' as const, price: 150 },
      { name: 'ID Card (Single)', category: 'CARDS' as const, price: 50 },
      { name: 'ID Card with Holder', category: 'CARDS' as const, price: 70 },
      { name: 'Banner Print (per sqft)', category: 'CARDS' as const, price: 30 },
      { name: 'Flex Print (per sqft)', category: 'CARDS' as const, price: 25 },
      { name: 'Invitation Card Design', category: 'CARDS' as const, price: 100 },

      // Other Services
      { name: 'Email / WhatsApp Send', category: 'OTHER' as const, price: 10 },
      { name: 'Internet Browsing (30 min)', category: 'OTHER' as const, price: 20 },
      { name: 'Typing (per page Tamil)', category: 'OTHER' as const, price: 30 },
      { name: 'Typing (per page English)', category: 'OTHER' as const, price: 20 },
      { name: 'Form Filling Assistance', category: 'OTHER' as const, price: 20 },
      { name: 'Pen Drive Copy (per transfer)', category: 'OTHER' as const, price: 10 },
    ];

    await prisma.service.createMany({
      data: services.map(s => ({
        name: s.name,
        category: s.category,
        price: s.price,
        isActive: true,
      })),
    });

    console.log(`✅ ${services.length} default services seeded.`);
  } else {
    console.log(`⏭  Services already exist (${serviceCount} found) — skipping.`);
  }

  console.log('✅ Database seeding complete!');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
