import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Point to emulator if running
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

initializeApp({
  projectId: 'sahs-archives'
});

const db = getFirestore();

async function seed() {
  console.log('🌱 Seeding test memberships and tickets...');

  // 1. Seed Memberships
  const memberships = [
    {
      email: 'member1@example.com',
      level: 'senior',
      quantity: 2,
      status: 'active',
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      email: 'member2@example.com',
      level: 'individual',
      quantity: 1,
      status: 'active',
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  for (const m of memberships) {
    await db.collection('memberships').add(m);
  }

  // 2. Seed Tickets
  const tickets = [
    {
      eventId: 'walking-tour-2026',
      email: 'tourist@example.com',
      quantity: 3,
      status: 'paid',
      confirmationNumber: 'A1B2C3D4',
      purchasedAt: new Date().toISOString()
    }
  ];

  for (const t of tickets) {
    await db.collection('tickets').add(t);
  }

  console.log('✅ Seeding complete.');
}

seed().catch(console.error);
