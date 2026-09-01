/**
 * Creates (or updates) the "Photos with Santa at the Carmichael House" post as
 * a DRAFT and uploads its artwork to Firebase Storage.
 *
 *   node scripts/seed_photos_with_santa.cjs                 # local emulator (default)
 *   node scripts/seed_photos_with_santa.cjs --prod          # production Firestore + Storage
 *
 * The exact date is not set yet — only "a Saturday afternoon in December" is
 * confirmed as of authoring. `eventDate` below is a placeholder (the second
 * Saturday) so the post has something to sort by; update it once the board
 * settles on a real date, and update the "date to be confirmed" copy in
 * CONTENT to match. Do not treat the placeholder date as real when reasoning
 * about this event elsewhere (e.g. calendar sync, box-office scripts).
 *
 * status: 'draft' is intentional — do not flip to 'published' (here or in
 * ContentAdmin) until the date is confirmed. A published post fires the
 * onPostWritten Google Calendar sync in production (see CLAUDE.md), so
 * publishing early would put a placeholder date on the public Membership
 * Calendar.
 *
 * Re-running is safe: the post is matched on slug and updated in place, so the
 * doc ID (and therefore any future calendar event) is preserved.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

const PROD = process.argv.includes('--prod');
const PROJECT_ID = 'sahs-archives';
const BUCKET = 'sahs-archives.firebasestorage.app';
const SLUG = 'photos-with-santa-2026';
const KEY_FILE = path.join(
  process.env.HOME,
  '.config/gcloud/sahs-firebase-deploy.json'
);

// Artwork is committed alongside the script so re-runs are reproducible from a
// fresh clone; override the location with SANTA_ART_DIR.
const ART_DIR = process.env.SANTA_ART_DIR || path.join(__dirname, '../.artwork/photos-with-santa');
const ART = [
  { field: 'bannerImage', file: 'photos-with-santa-banner-1920x1080.jpg' },
  { field: 'mainImage', file: 'photos-with-santa-card-1200x675.jpg' },
];

if (!PROD) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
}

// The emulator needs no credential, and passing an undefined one is rejected.
initializeApp({
  projectId: PROJECT_ID,
  storageBucket: BUCKET,
  ...(PROD && {
    credential: fs.existsSync(KEY_FILE) ? cert(require(KEY_FILE)) : applicationDefault(),
  }),
});

const db = getFirestore();

/** Stable UUID-shaped download token derived from the object path. */
function tokenFor(objectPath) {
  const h = crypto.createHash('sha256').update(objectPath).digest('hex');
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20, 32)].join('-');
}

/**
 * Uploads one image and returns a download URL in the same shape the client SDK's
 * getDownloadURL() produces, so admin-uploaded and script-uploaded images are
 * indistinguishable to the app.
 */
async function uploadArtwork(file) {
  const localPath = path.join(ART_DIR, file);
  if (!fs.existsSync(localPath)) {
    throw new Error(`Missing artwork: ${localPath}`);
  }
  const objectPath = `content_images/${SLUG}_${file}`;
  // Deterministic, not random: re-uploading must not invalidate URLs already
  // rendered into pages or scraped social previews.
  const token = tokenFor(objectPath);
  await getStorage().bucket(BUCKET).upload(localPath, {
    destination: objectPath,
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

const CARMICHAEL_HOUSE = 'Carmichael House, 6 Couch Street, Senoia, GA 30276';

const CONTENT = `
<h3>Photos with Santa</h3>
<p>Bring the family to the historic <strong>Carmichael House</strong> this December for a holiday tradition &mdash; free photos with Santa on the porch of the Senoia Area Historical Society&rsquo;s home.</p>
<p>We&rsquo;re planning for a <strong>Saturday afternoon in December</strong>. The exact date is still being finalized and will be announced here and by email as soon as it&rsquo;s confirmed &mdash; watch this space.</p>
<p><em>Admission is free and open to all.</em></p>
`.trim();

async function main() {
  console.log(`${PROD ? '🚀 PRODUCTION' : '🌱 Emulator'} — seeding Photos with Santa (draft)…`);

  const images = {};
  for (const { field, file } of ART) {
    if (PROD) {
      images[field] = await uploadArtwork(file);
      console.log(`  ✅ uploaded ${file}`);
    } else {
      // The emulator has no Storage, so stage the art in Vite's public/ dir
      // (gitignored) and reference it by path so local pages render for real.
      const publicDir = path.join(__dirname, '../public/photos-with-santa-art');
      fs.mkdirSync(publicDir, { recursive: true });
      fs.copyFileSync(path.join(ART_DIR, file), path.join(publicDir, file));
      images[field] = `/photos-with-santa-art/${file}`;
    }
  }

  // Placeholder only — the second Saturday of December, 1:00 PM EST. Update
  // once the board confirms a real date; see the header comment.
  const eventDate = new Date('2026-12-12T13:00:00-05:00');

  const data = {
    type: 'event',
    status: 'draft',
    title: 'Photos with Santa at the Carmichael House',
    slug: SLUG,
    eventDate: Timestamp.fromDate(eventDate),
    publishDate: Timestamp.fromDate(new Date()),
    content: CONTENT,
    excerpt:
      'Bring the family for free photos with Santa on the porch of the historic Carmichael House this December — a Saturday afternoon, exact date to be confirmed.',
    location: CARMICHAEL_HOUSE,
    galleryImages: [],
    squareImage: null,
    ticketPrice: null,
    capacity: null,
    documentUrl: null,
    updatedAt: Timestamp.fromDate(new Date()),
    ...images,
  };

  const existing = await db
    .collection('posts')
    .where('slug', '==', SLUG)
    .limit(1)
    .get();

  if (existing.empty) {
    const ref = await db.collection('posts').add({
      ...data,
      ticketsSold: 0,
      createdAt: Timestamp.fromDate(new Date()),
    });
    console.log(`✅ Created posts/${ref.id}`);
  } else {
    const ref = existing.docs[0].ref;
    // Never clobber ticketsSold — the Stripe webhook owns that counter, even
    // though this event is unticketed; see CLAUDE.md.
    await ref.set({ ...data, ticketsSold: FieldValue.increment(0) }, { merge: true });
    console.log(`✅ Updated existing posts/${ref.id}`);
  }
  console.log(`   /news/${SLUG} (draft — visible only in admin preview until published)`);
}

main().catch(err => {
  console.error('❌', err);
  process.exit(1);
});
