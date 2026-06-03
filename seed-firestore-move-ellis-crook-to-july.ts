import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// This script:
//   1. Deletes the old June Ellis Crook post (wrong month)
//   2. Creates the correct July post for the same program
//
// Images: Upload july_program_1200x628.jpg and july_program_1080x1080.jpg
// to gs://sahs-archives.firebasestorage.app/public/ when Susan sends graphics.

const useEmulator = process.env.FIRESTORE_EMULATOR_HOST || process.env.USE_EMULATOR === 'true';

if (useEmulator) {
  console.log('🔌 Running on local Firestore emulator...');
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
} else {
  console.log('🌍 Running on production Firestore database...');
}

initializeApp({ projectId: 'sahs-archives' });

const OLD_SLUG = 'june-2026-program-stories-of-senoia-with-ellis-crook';
const NEW_SLUG = 'july-2026-program-stories-of-senoia-with-ellis-crook';

async function migrateInDatabase(dbName: string, db: any) {
  console.log(`Deleting old doc [${OLD_SLUG}] from [${dbName}]...`);
  await db.collection('posts').doc(OLD_SLUG).delete();
  console.log(`🗑️  Deleted [${OLD_SLUG}]`);

  const eventDate = new Date('2026-07-09T19:00:00-04:00'); // Thursday, July 9, 2026 at 7:00 PM EDT
  const publishDate = new Date();

  const postData = {
    type: 'event',
    title: 'July 2026 Program: Stories of Senoia with Ellis Crook',
    slug: NEW_SLUG,
    status: 'published',
    publishDate: Timestamp.fromDate(publishDate),
    eventDate: Timestamp.fromDate(eventDate),
    content: `
      <h3>Stories of Senoia with Ellis Crook</h3>
      <p>Join us at the Senoia Area Historical Society for our July Monthly Program featuring longtime resident, local business owner, and community figure <strong>Ellis Crook</strong>.</p>
      <p>Ellis will recount personal stories, memories, and anecdotes from his life growing up and working in Senoia, Georgia. As a beloved community figure who has witnessed decades of the town's history, changes, and growth, Ellis offers a rich, first-hand perspective on our local heritage.</p>
      <p>This presentation is a wonderful, informal opportunity to hear directly from a resident whose family has deep roots in Coweta County. Whether you are a lifelong resident or new to the area, you won't want to miss these warm, humorous, and insightful recollections of Senoia's past.</p>
      <p><em>Admission is free and open to all. Light refreshments will be served beginning at 6:30 PM. The program begins at 7:00 PM.</em></p>
    `,
    excerpt: 'Join longtime resident and community leader Ellis Crook on Thursday, July 9th, for a presentation recounting his life and stories of growing up in Senoia. Doors open at 6:30 PM.',
    // TODO: Upload july_program_1200x628.jpg and july_program_1080x1080.jpg to Firebase Storage
    mainImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/july_program_1200x628.jpg',
    bannerImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/july_program_1200x628.jpg',
    squareImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/july_program_1080x1080.jpg',
    galleryImages: [],
    location: 'Senoia Area Historical Society, 6 Couch Street, Senoia, GA',
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
  };

  console.log(`Creating new doc [${NEW_SLUG}] in [${dbName}]...`);
  await db.collection('posts').doc(NEW_SLUG).set(postData, { merge: true });
  console.log(`✅ Created [${NEW_SLUG}] in [${dbName}]`);
}

async function run() {
  const defaultDb = getFirestore();
  await migrateInDatabase('(default)', defaultDb);

  const namedDb = getFirestore('sahs-archives');
  await migrateInDatabase('sahs-archives', namedDb);
}

run().catch(console.error);
