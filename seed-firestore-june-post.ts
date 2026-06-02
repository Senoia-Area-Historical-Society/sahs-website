import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Check if running on emulator or production
const useEmulator = process.env.FIRESTORE_EMULATOR_HOST || process.env.USE_EMULATOR === 'true';

if (useEmulator) {
  console.log('🔌 Running on local Firestore emulator...');
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
} else {
  console.log('🌍 Running on production Firestore database...');
}

// Initialize Admin SDK
// This will automatically load Application Default Credentials (ADC) from environment
initializeApp({
  projectId: 'sahs-archives'
});

async function writeToDatabase(dbName: string, db: any) {
  const eventDate = new Date('2026-06-11T19:00:00-04:00'); // Thursday, June 11, 2026 at 7:00 PM EDT
  const publishDate = new Date(); // Publish now

  const slug = 'june-2026-program-stories-of-senoia-with-ellis-crook';
  
  const postData = {
    type: 'event',
    title: 'June 2026 Program: Stories of Senoia with Ellis Crook',
    slug: slug,
    status: 'published', // Publish directly
    publishDate: Timestamp.fromDate(publishDate),
    eventDate: Timestamp.fromDate(eventDate),
    content: `
      <h3>Stories of Senoia with Ellis Crook</h3>
      <p>Join us at the Senoia Area Historical Society for our June Monthly Program featuring longtime resident, local business owner, and community figure <strong>Ellis Crook</strong>.</p>
      <p>Ellis will recount personal stories, memories, and anecdotes from his life growing up and working in Senoia, Georgia. As a beloved community figure who has witnessed decades of the town's history, changes, and growth, Ellis offers a rich, first-hand perspective on our local heritage.</p>
      <p>This presentation is a wonderful, informal opportunity to hear directly from a resident whose family has deep roots in Coweta County. Whether you are a lifelong resident or new to the area, you won't want to miss these warm, humorous, and insightful recollections of Senoia's past.</p>
      <p><em>Admission is free, but donations to support the museum are greatly appreciated. Light refreshments will be served starting at 6:30 PM.</em></p>
    `,
    excerpt: 'Join longtime resident and community leader Ellis Crook on Thursday, June 11th, for a presentation recounting his life and stories of growing up in Senoia. Doors open at 6:30 PM.',
    mainImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/june_program_1200x628.jpg',
    bannerImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/june_program_1200x628.jpg',
    squareImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/june_program_1080x1080.jpg',
    galleryImages: [],
    location: 'Senoia Area Historical Society, Couch Street, Senoia, GA',
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date())
  };

  console.log(`Writing post document [${slug}] to Firestore database [${dbName}]...`);
  await db.collection('posts').doc(slug).set(postData, { merge: true });
  console.log(`✅ Post document created successfully in [${dbName}]!`);
}

async function run() {
  // Write to (default) database
  const defaultDb = getFirestore();
  await writeToDatabase('(default)', defaultDb);

  // Write to sahs-archives database
  const namedDb = getFirestore('sahs-archives');
  await writeToDatabase('sahs-archives', namedDb);
}

run().catch(console.error);
