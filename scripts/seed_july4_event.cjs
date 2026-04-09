const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Point to emulator if running
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

if (require('firebase-admin').apps.length === 0) {
  initializeApp({
    projectId: 'sahs-archives'
  });
}

const db = getFirestore();

async function seed() {
  console.log('🌱 Seeding July 4th Extravaganza Event...');

  const eventDate = new Date('2026-07-04T19:00:00-04:00'); // 7:00 PM EDT
  const publishDate = new Date();

  const eventData = {
    type: 'event',
    title: 'July 4th Extravaganza',
    slug: 'july-4th-extravaganza-2026',
    eventDate: Timestamp.fromDate(eventDate),
    publishDate: Timestamp.fromDate(publishDate),
    content: `
      <p>Join us for a spectacular July 4th celebration at the Senoia Area Historical Society! Experience history coming to life with music, food, and community spirit.</p>
      <p>The evening will feature live historical reenactments, traditional Senoia cuisine, and a prime view of the local festivities. Bring your lawn chairs and your appetite!</p>
      <h3>Event Details</h3>
      <ul>
        <li><strong>When:</strong> July 4th, 2026 at 7:00 PM</li>
        <li><strong>Where:</strong> SAHS Museum grounds</li>
        <li><strong>Tickets:</strong> $25 per person (includes historical sampler plate)</li>
      </ul>
    `,
    excerpt: 'Join us for a spectacular July 4th celebration at the Senoia Area Historical Society!',
    mainImage: 'https://images.unsplash.com/photo-1531263060782-10f7fd31d99e?auto=format&fit=crop&q=80&w=1200', // Fireworks placeholder
    galleryImages: [],
    location: 'SAHS Museum',
    ticketPrice: 2500, // $25.00 in cents
    capacity: 150,
    ticketsSold: 0,
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date())
  };

  try {
    const docRef = await db.collection('posts').add(eventData);
    console.log(`✅ Event created with ID: ${docRef.id}`);
  } catch (err) {
    console.error('❌ Error seeding event:', err);
  }
}

seed().catch(console.error);
