import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// NOTE: The board minutes reference "Dr. McIntosh financial honorarium in September"
// but do not specify a first name or presentation topic.
// Review/update the title, slug, and content below once confirmed with Greg Crook or Jennifer Meares.
//
// Images: Upload september_program_1200x628.jpg and september_program_1080x1080.jpg
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
  const eventDate = new Date('2026-09-10T19:00:00-04:00'); // Thursday, September 10, 2026 at 7:00 PM EDT
  const publishDate = new Date();

  // TODO: Confirm Dr. McIntosh's full name and update slug/title accordingly
  const slug = 'september-2026-program-dr-mcintosh';

  const postData = {
    type: 'event',
    // TODO: Update with Dr. McIntosh's full name and presentation title
    title: 'September 2026 Program: A Presentation by Dr. McIntosh',
    slug,
    status: 'draft', // Keeping as draft until speaker details are confirmed
    publishDate: Timestamp.fromDate(publishDate),
    eventDate: Timestamp.fromDate(eventDate),
    // TODO: Update content once speaker details and topic are confirmed
    content: `
      <h3>A Presentation by Dr. McIntosh</h3>
      <p>Join us at the Senoia Area Historical Society for our September Monthly Program, featuring a special presentation by <strong>Dr. McIntosh</strong>.</p>
      <p>Further details about this program will be announced soon. We look forward to welcoming Dr. McIntosh and sharing this exciting evening of history with our community.</p>
      <p><em>Admission is free and open to all. Light refreshments will be served beginning at 6:30 PM. The program begins at 7:00 PM.</em></p>
    `,
    excerpt: 'Join us on Thursday, September 10th for a special presentation by Dr. McIntosh. Details to be announced.',
    // TODO: Upload september_program_1200x628.jpg and september_program_1080x1080.jpg to Firebase Storage
    mainImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/september_program_1200x628.jpg',
    bannerImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/september_program_1200x628.jpg',
    squareImage: 'https://storage.googleapis.com/sahs-archives.firebasestorage.app/public/september_program_1080x1080.jpg',
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
