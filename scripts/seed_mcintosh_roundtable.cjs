/**
 * Creates (or updates) the "A Visit with Dr. McIntosh" roundtable post as a
 * DRAFT and uploads its artwork to Firebase Storage.
 *
 *   node scripts/seed_mcintosh_roundtable.cjs                 # local emulator (default)
 *   node scripts/seed_mcintosh_roundtable.cjs --prod          # production Firestore + Storage
 *
 * Speaker bio and roundtable topic are not yet confirmed — see the TODO in
 * CONTENT below. "Dr. McIntosh" has no confirmed identity anywhere else in
 * this repo: an earlier placeholder by that name (board-minutes shorthand,
 * no first name or topic ever supplied) was seeded for the unrelated Thursday,
 * September 10 monthly program slot and has since been superseded there by
 * Nicole Williams, PhD (see scripts/seed_fall_winter_2026_events.cjs). This is
 * a separate Saturday afternoon event and does not touch that document.
 *
 * status: 'draft' is intentional — do not flip to 'published' (here or in
 * ContentAdmin) until the bio/topic are confirmed. A published post fires the
 * onPostWritten Google Calendar sync in production (see CLAUDE.md), so
 * publishing prematurely puts an unconfirmed placeholder on the public
 * Membership Calendar.
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
const SLUG = 'september-2026-roundtable-dr-mcintosh';
const KEY_FILE = path.join(
  process.env.HOME,
  '.config/gcloud/sahs-firebase-deploy.json'
);

// Artwork is committed alongside the script so re-runs are reproducible from a
// fresh clone; override the location with MCINTOSH_ART_DIR.
const ART_DIR = process.env.MCINTOSH_ART_DIR || path.join(__dirname, '../.artwork/mcintosh-roundtable');
const ART = [
  { field: 'bannerImage', file: 'mcintosh-roundtable-banner-1920x1080.jpg' },
  { field: 'mainImage', file: 'mcintosh-roundtable-card-1200x675.jpg' },
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

const MUSEUM = 'Senoia Area Historical Society, 6 Couch Street, Senoia, GA';

// TODO: Confirm Dr. McIntosh's full name and the roundtable's actual subject,
// then replace this placeholder copy before publishing.
const CONTENT = `
<h3>A Visit with Dr. McIntosh</h3>
<p>Join us at the Senoia Area Historical Society on <strong>Saturday, September 12</strong> for a roundtable discussion with <strong>Dr. McIntosh</strong>, running from <strong>1:00 to 4:00 PM</strong> at the museum.</p>
<p>Further details about the topic and format will be announced soon. We look forward to welcoming Dr. McIntosh and sharing this afternoon of history with our community.</p>
<p><em>Admission is free and open to all.</em></p>
`.trim();

async function main() {
  console.log(`${PROD ? '🚀 PRODUCTION' : '🌱 Emulator'} — seeding McIntosh Roundtable (draft)…`);

  const images = {};
  for (const { field, file } of ART) {
    if (PROD) {
      images[field] = await uploadArtwork(file);
      console.log(`  ✅ uploaded ${file}`);
    } else {
      // The emulator has no Storage, so stage the art in Vite's public/ dir
      // (gitignored) and reference it by path so local pages render for real.
      const publicDir = path.join(__dirname, '../public/mcintosh-roundtable-art');
      fs.mkdirSync(publicDir, { recursive: true });
      fs.copyFileSync(path.join(ART_DIR, file), path.join(publicDir, file));
      images[field] = `/mcintosh-roundtable-art/${file}`;
    }
  }

  // 1:00 PM EDT. September 12 is before DST ends, so -04:00.
  const eventDate = new Date('2026-09-12T13:00:00-04:00');

  const data = {
    type: 'event',
    status: 'draft',
    title: 'A Visit with Dr. McIntosh',
    slug: SLUG,
    eventDate: Timestamp.fromDate(eventDate),
    publishDate: Timestamp.fromDate(new Date()),
    content: CONTENT,
    excerpt:
      'Join us Saturday, September 12 from 1:00 to 4:00 PM for a roundtable discussion with Dr. McIntosh at the museum. Free and open to all — full details to follow.',
    location: MUSEUM,
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
