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
  const eventDate = new Date('2026-07-03T10:00:00-04:00');
  const publishDate = new Date();
  const slug = 'july-3-2026-family-day-seavy-st-park';

  const postData = {
    type: 'event',
    title: 'Family Day at Seavy St. Park',
    slug,
    status: 'published',
    publishDate: Timestamp.fromDate(publishDate),
    eventDate: Timestamp.fromDate(eventDate),
    location: 'Seavy St. Park, Senoia, GA',
    excerpt: "Join SAHS for a free Family Day at Seavy St. Park on July 3rd from 10 AM to 2 PM — part of Senoia's America 250 celebration. Hot dogs, popcorn, and shaved ice for purchase!",
    content: `
      <h3>Family Day at Seavy St. Park</h3>
      <p>Come celebrate the 4th of July weekend with the <strong>Senoia Area Historical Society</strong> at a free Family Day event in Seavy St. Park on <strong>Friday, July 3rd from 10:00 AM to 2:00 PM</strong>!</p>
      <p>This is a wonderful opportunity to connect with neighbors, learn about the rich history of Senoia, and enjoy a festive summer atmosphere. SAHS will be on hand to engage with the community and share our mission of preserving local history.</p>
      <h4>On-Site Refreshments (Available for Purchase)</h4>
      <ul>
        <li>🌭 Hot Dogs</li>
        <li>🍿 Popcorn</li>
        <li>🍧 Shaved Ice (Snow Cones)</li>
      </ul>
      <p>This event is part of the <strong>Senoia Downtown Development Authority's</strong> larger series of events celebrating <strong>America's 250th Anniversary</strong>. The DDA's two-day America 250 celebration continues into the evening of July 3rd and all day July 4th with live music, fireworks, and more at Lake Marimac.</p>
      <p>For the full lineup of Senoia's America 250 events, visit <a href="https://www.enjoysenoia.com" target="_blank" rel="noopener noreferrer">enjoysenoia.com</a>.</p>
      <p><em>Admission to the SAHS Family Day is free. Refreshments available for purchase. All ages welcome.</em></p>
    `,
    mainImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/july3_family_day_1200x628.jpg',
    bannerImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/july3_family_day_1200x628.jpg',
    squareImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/july3_family_day_1080x1080.jpg',
    galleryImages: [],
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
  };

  console.log(`Writing post [${slug}] to [${dbName}]...`);
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
