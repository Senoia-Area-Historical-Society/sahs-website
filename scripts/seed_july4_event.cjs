const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

// Always targets the local emulator — this script never writes to production.
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

if (require('firebase-admin').apps.length === 0) {
  initializeApp({
    projectId: 'sahs-archives'
  });
}

const db = getFirestore();

async function seed() {
  console.log('🌱 Seeding July 4th Extravaganza Event...');

  // Next July 4th (7:00 PM EDT), so the seeded event is always upcoming.
  const now = new Date();
  const year = now.getFullYear() + (now > new Date(`${now.getFullYear()}-07-04T19:00:00-04:00`) ? 1 : 0);
  const eventDate = new Date(`${year}-07-04T19:00:00-04:00`);
  const publishDate = new Date();

  const slug = `july-4th-extravaganza-${year}`;

  const eventData = {
    type: 'event',
    status: 'published',
    title: 'July 4th Extravaganza',
    slug,
    eventDate: Timestamp.fromDate(eventDate),
    publishDate: Timestamp.fromDate(publishDate),
    content: `
      <p>Join us for a spectacular July 4th celebration at the Senoia Area Historical Society! Experience history coming to life with music, food, and community spirit.</p>
      <p>The evening will feature live historical reenactments, traditional Senoia cuisine, and a prime view of the local festivities. Bring your lawn chairs and your appetite!</p>
      <h3>Event Details</h3>
      <ul>
        <li><strong>When:</strong> July 4th, ${year} at 7:00 PM</li>
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
    updatedAt: Timestamp.fromDate(new Date())
  };

  try {
    // Upsert on slug so re-running updates in place instead of piling up duplicate
    // posts: the doc ID is what the Google Calendar entry and any tickets hang off.
    const existing = await db.collection('posts').where('slug', '==', slug).limit(1).get();

    if (existing.empty) {
      const docRef = await db.collection('posts').add({
        ...eventData,
        ticketsSold: 0,
        createdAt: Timestamp.fromDate(new Date())
      });
      console.log(`✅ Event created with ID: ${docRef.id}`);
    } else {
      // Never assign ticketsSold — the Stripe webhook owns that counter.
      const ref = existing.docs[0].ref;
      await ref.set({ ...eventData, ticketsSold: FieldValue.increment(0) }, { merge: true });
      console.log(`✅ Updated existing posts/${ref.id}`);
    }
  } catch (err) {
    console.error('❌ Error seeding event:', err);
  }
}

seed().catch(console.error);
