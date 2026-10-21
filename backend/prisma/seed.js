"use strict";
// ============================================================
// RKS Database Seed — Modern async/await (Node 22+)
// ============================================================
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding RKS database...');

  // ── Super Admin ──────────────────────────────────────────
  const superAdminExists = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!superAdminExists) {
    const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString('hex');
    const hash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: { name: 'Super Admin', username: 'admin', passwordHash: hash, role: 'SUPER_ADMIN', isActive: true },
    });
    console.log(`✅ Super Admin created (username: admin, password: ${adminPassword})`);
    console.log(`⚠️  PLEASE COPY AND SAVE THIS PASSWORD IMMEDITELY. IT WILL NOT BE SHOWN AGAIN.`);
  } else {
    console.log('⏭  Super Admin already exists — skipping.');
  }

  // ── Services ─────────────────────────────────────────────
  const serviceCount = await prisma.service.count();
  if (serviceCount === 0) {
    const services = [
      // Government Services
      { name: 'Aadhaar Card Print', category: 'GOVT', price: 20 },
      { name: 'Aadhaar Update / Correction', category: 'GOVT', price: 50 },
      { name: 'PAN Card Apply (New)', category: 'GOVT', price: 120 },
      { name: 'PAN Card Correction', category: 'GOVT', price: 100 },
      { name: 'Birth Certificate', category: 'GOVT', price: 50 },
      { name: 'Income Certificate', category: 'GOVT', price: 50 },
      { name: 'Community Certificate', category: 'GOVT', price: 50 },
      { name: 'Chitta / Patta Copy', category: 'GOVT', price: 30 },
      { name: 'TNPDS Smart Card', category: 'GOVT', price: 50 },
      { name: 'Voter ID Apply', category: 'GOVT', price: 50 },
      { name: 'Voter ID Correction', category: 'GOVT', price: 30 },
      { name: 'Driving License Apply', category: 'GOVT', price: 150 },
      { name: 'Passport Apply Assistance', category: 'GOVT', price: 200 },
      { name: 'UDID Certificate', category: 'GOVT', price: 50 },
      { name: 'e-Seva / Form Submission', category: 'GOVT', price: 30 },
      // Printing Services
      { name: 'Black & White Print (A4)', category: 'PRINTING', price: 2 },
      { name: 'Color Print (A4)', category: 'PRINTING', price: 10 },
      { name: 'Black & White Print (A3)', category: 'PRINTING', price: 5 },
      { name: 'Color Print (A3)', category: 'PRINTING', price: 20 },
      { name: 'Photo Print (4x6)', category: 'PRINTING', price: 15 },
      { name: 'Xerox (B&W per page)', category: 'PRINTING', price: 1 },
      { name: 'Xerox (Color per page)', category: 'PRINTING', price: 8 },
      { name: 'Lamination (A4)', category: 'PRINTING', price: 20 },
      { name: 'Lamination (ID Card)', category: 'PRINTING', price: 10 },
      { name: 'Spiral Binding', category: 'PRINTING', price: 30 },
      { name: 'Scanning (per page)', category: 'PRINTING', price: 5 },
      // Card Services
      { name: 'Visiting Card (100 pcs)', category: 'CARDS', price: 150 },
      { name: 'ID Card (Single)', category: 'CARDS', price: 50 },
      { name: 'ID Card with Holder', category: 'CARDS', price: 70 },
      { name: 'Banner Print (per sqft)', category: 'CARDS', price: 30 },
      { name: 'Flex Print (per sqft)', category: 'CARDS', price: 25 },
      { name: 'Invitation Card Design', category: 'CARDS', price: 100 },
      // Other Services
      { name: 'Email / WhatsApp Send', category: 'OTHER', price: 10 },
      { name: 'Internet Browsing (30 min)', category: 'OTHER', price: 20 },
      { name: 'Typing (per page Tamil)', category: 'OTHER', price: 30 },
      { name: 'Typing (per page English)', category: 'OTHER', price: 20 },
      { name: 'Form Filling Assistance', category: 'OTHER', price: 20 },
      { name: 'Pen Drive Copy (per transfer)', category: 'OTHER', price: 10 },
    ];
    await prisma.service.createMany({
      data: services.map(s => ({ name: s.name, category: s.category, price: s.price, isActive: true })),
    });
    console.log(`✅ ${services.length} default services seeded.`);
  } else {
    console.log(`⏭  Services already exist (${serviceCount} found) — skipping.`);
  }

  // ── System Config ─────────────────────────────────────────
  await prisma.systemConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      maintenanceMode: false,
      maintenanceMessage: 'Server is under maintenance. Please try again later.',
      version: '1.0.0',
    },
    update: {},
  });
  console.log('✅ System config initialized.');

  // ── Bank Accounts ─────────────────────────────────────────
  const bankCount = await prisma.bankAccount.count();
  if (bankCount === 0) {
    await prisma.bankAccount.createMany({
      data: [
        { name: 'Indian Bank',         balance: 0, isCash: false },
        { name: 'State Bank of India', balance: 0, isCash: false },
        { name: 'Canara Bank',         balance: 0, isCash: false },
        { name: 'HDFC Bank',           balance: 0, isCash: false },
        { name: 'Cash',                balance: 0, isCash: true  },
      ],
    });
    console.log('✅ 5 accounts seeded (4 banks + Cash).');
  } else {
    console.log(`⏭  Bank accounts already exist (${bankCount} found) — skipping.`);
  }

  console.log('✅ Database seeding complete!');
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
