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
  const eventDate = new Date('2026-06-11T19:00:00-04:00'); // Thursday, June 11, 2026 at 7:00 PM EDT
  const publishDate = new Date();

  const slug = 'june-2026-program-griffin-historical-society';

  const postData = {
    type: 'event',
    title: 'June 2026 Program: Griffin Historical Society',
    slug,
    status: 'published',
    publishDate: Timestamp.fromDate(publishDate),
    eventDate: Timestamp.fromDate(eventDate),
    content: `
      <h3>A Presentation by the Griffin Historical Society</h3>
      <p>Join us at the Senoia Area Historical Society for our June Monthly Program, featuring a special presentation from the <strong>Griffin Historical Society</strong> — one of Georgia's dedicated regional history organizations committed to preserving and sharing the rich heritage of the Griffin and Spalding County area.</p>
      <p>This evening promises a fascinating look at the history and stories that connect our communities across Coweta and Spalding counties, reminding us of the deep ties between neighboring towns that have shaped this part of Georgia over the centuries.</p>
      <p>Whether you are a lifelong history enthusiast or simply curious about the region we call home, this is an excellent opportunity to learn, connect, and celebrate our shared Southern heritage.</p>
      <p><em>Admission is free and open to all. Light refreshments will be served beginning at 6:30 PM. The program begins at 7:00 PM.</em></p>
    `,
    excerpt: 'Join us on Thursday, June 11th for a special presentation by the Griffin Historical Society, exploring the history and heritage connecting our communities across Coweta and Spalding counties.',
    // Images uploaded by Susan Stitt — already in Firebase Storage
    mainImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/june_program_1200x628.jpg',
    bannerImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/june_program_1200x628.jpg',
    squareImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/june_program_1080x1080.jpg',
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
