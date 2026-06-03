import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Images: Upload august_program_1200x628.jpg and august_program_1080x1080.jpg
// to gs://sahs-archives.firebasestorage.app/public/ when Susan sends graphics.

const useEmulator = process.env.FIRESTORE_EMULATOR_HOST || process.env.USE_EMULATOR === 'true';

if (useEmulator) {
  console.log('🔌 Running on local Firestore emulator...');
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
} else {
  console.log('🌍 Running on production Firestore database...');
}

initializeApp({ projectId: 'sahs-archives' });

async function writeToDatabase(dbName: string, db: any) {
  const eventDate = new Date('2026-08-13T19:00:00-04:00'); // Thursday, August 13, 2026 at 7:00 PM EDT
  const publishDate = new Date();

  const slug = 'august-2026-program-carl-mcknight';

  const postData = {
    type: 'event',
    title: 'August 2026 Program: A History of Senoia with Carl McKnight',
    slug,
    status: 'published',
    publishDate: Timestamp.fromDate(publishDate),
    eventDate: Timestamp.fromDate(eventDate),
    content: `
      <h3>A History of Senoia with Carl McKnight</h3>
      <p>Join us at the Senoia Area Historical Society for our August Monthly Program, featuring a presentation by <strong>Carl McKnight</strong> on the history of his family and the town of Senoia.</p>
      <p>Carl will share the story of his family's deep roots in Senoia, weaving personal history with the broader story of the town's growth and development over the generations. Family histories like Carl's are an essential thread in the fabric of local history — offering perspectives that illuminate everyday life, community bonds, and the people who shaped Senoia into the town it is today.</p>
      <p>This is a wonderful opportunity to connect with our community's living history and hear stories that might not be found in any textbook.</p>
      <p><em>Admission is free and open to all. Light refreshments will be served beginning at 6:30 PM. The program begins at 7:00 PM.</em></p>
    `,
    excerpt: "Join Carl McKnight on Thursday, August 13th for a presentation on the history of his family and their deep roots in Senoia — a personal window into the town's story across generations.",
    // TODO: Upload august_program_1200x628.jpg and august_program_1080x1080.jpg to Firebase Storage
    mainImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/august_program_1200x628.jpg',
    bannerImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/august_program_1200x628.jpg',
    squareImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/august_program_1080x1080.jpg',
    galleryImages: [],
    location: 'Senoia Area Historical Society, 6 Couch Street, Senoia, GA',
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
