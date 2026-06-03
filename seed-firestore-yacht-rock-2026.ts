import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const useEmulator = process.env.FIRESTORE_EMULATOR_HOST || process.env.USE_EMULATOR === 'true';

if (useEmulator) {
  console.log('🔌 Running on local Firestore emulator...');
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
} else {
  console.log('🌍 Running on production Firestore database...');
}

initializeApp({ projectId: 'sahs-archives' });

async function writeToDatabase(dbName: string, db: any) {
  // Tentative: Saturday, August 15, 2026 — doors open 7 PM EDT
  const eventDate = new Date('2026-08-15T19:00:00-04:00');
  const publishDate = new Date();
  const slug = 'august-2026-yacht-rock-party';

  const postData = {
    type: 'event',
    title: 'Yacht Rock Party — August 15, 2026',
    slug,
    status: 'draft',
    publishDate: Timestamp.fromDate(publishDate),
    eventDate: Timestamp.fromDate(eventDate),
    location: 'Freeman Sasser Building, 428 Seavy Street, Senoia, GA',
    excerpt: "Set sail for another evening of smooth sounds and community fun! SAHS brings back the Yacht Rock Party on August 15th — live music, karaoke, cocktails, and appetizers in support of preserving Senoia's history.",
    content: `
      <h3>Yacht Rock Party Returns to Senoia!</h3>
      <p>The <strong>Senoia Area Historical Society</strong> invites you to don your finest cruise wear and join us for the return of our beloved <strong>Yacht Rock Party</strong> fundraiser on <strong>Saturday, August 15, 2026</strong> at the Freeman Sasser Building.</p>
      <p>Last year's event was a sold-out success, and we're bringing it back with the same great formula: live music, karaoke, cocktails, and great company — all in support of preserving the rich history of Senoia and the surrounding area.</p>

      <h4>Event Details</h4>
      <ul>
        <li><strong>Date:</strong> Saturday, August 15, 2026</li>
        <li><strong>Doors Open:</strong> 7:00 PM</li>
        <li><strong>Location:</strong> Freeman Sasser Building, 428 Seavy Street, Senoia, GA</li>
        <li><strong>Tickets:</strong> $50 per person (General Admission)</li>
        <li><strong>Dress Code:</strong> Cruise wear encouraged!</li>
      </ul>

      <h4>What's Included</h4>
      <ul>
        <li>🎵 Live music during cocktail hour</li>
        <li>🎤 Karaoke celebrating the smooth sounds of classic yacht rock</li>
        <li>🍢 Appetizers included</li>
        <li>🍹 Cash bar on-site</li>
      </ul>

      <p>All proceeds benefit the Senoia Area Historical Society's ongoing efforts to preserve local history, maintain historical sites, and provide educational programs for the community.</p>
      <p>Tickets available online at <a href="https://www.senoiahistory.com" target="_blank" rel="noopener noreferrer">senoiahistory.com</a>. Don't wait — last year's event sold out!</p>
      <p><em>Details subject to change. Check back for updates on performers and special ticket tiers.</em></p>
    `,
    mainImage: '',
    bannerImage: '',
    squareImage: '',
    galleryImages: [],
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
  };

  console.log(`Writing post [${slug}] to [${dbName}] as DRAFT...`);
  await db.collection('posts').doc(slug).set(postData, { merge: true });
  console.log(`✅ Done [${dbName}]`);
}

async function run() {
  const defaultDb = getFirestore();
  await writeToDatabase('(default)', defaultDb);

  const namedDb = getFirestore('sahs-archives');
  await writeToDatabase('sahs-archives', namedDb);
}

run().catch(console.error);
