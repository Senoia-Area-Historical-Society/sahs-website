/**
 * The shared half of every event seed script.
 *
 * WHY THIS EXISTS
 *
 * `seed_poker_run.cjs`, `seed_mcintosh_roundtable.cjs` and `seed_photos_with_santa.cjs`
 * were copies of each other, and every invariant below had to hold in all three
 * independently. It did not:
 *
 *   - Two of them still uploaded to `sahs-archives.firebasestorage.app` months after the
 *     website got its own bucket, so a `--prod` run would have silently repointed those
 *     events at the shared archive bucket — the coupling CLAUDE.md has a whole section
 *     about undoing.
 *   - Two of them rewrote `publishDate` on every run, bumping an already-published post
 *     to today. It is a fallback sort key on the past-events surfaces.
 *
 * Neither has a visible symptom. Copy-paste is what let them drift, so the rules live
 * here once and each event script supplies only what is genuinely per-event: its slug,
 * its artwork manifest, and its content.
 *
 * `scripts/check-storage-bucket-target.cjs` fails the build if any script hardcodes the
 * shared bucket again — the library is the fix, the check is what keeps it fixed.
 *
 * NOT MIGRATED, deliberately: `seed_fall_winter_2026_events.cjs` seeds six posts in one
 * run with its own selection argument, and bending it to this shape would be a rewrite
 * of a script that owns live documents. It gets the bucket constant and the CI check.
 * `seed_july4_event.cjs` is an emulator-only fixture. `seed_walking_tour_places.cjs`
 * writes `historical_places`, not `posts`.
 *
 * USAGE
 *
 *   const { seedEventPost } = require('./lib/seedEvent.cjs');
 *
 *   seedEventPost({
 *     label: 'Poker Run',
 *     slug: 'cruisin-for-history-poker-run-2026',
 *     artwork: 'poker-run',                                  // .artwork/<name>/ + public/<name>-art/
 *     art: [{ field: 'mainImage', file: 'poker-run-card-1200x675.jpg' }],
 *     data: { type: 'event', status: 'published', eventDate: new Date('...'), ... },
 *   });
 *
 *   node scripts/seed_<event>.cjs                 # emulator (default)
 *   node scripts/seed_<event>.cjs --prod          # production Firestore + Storage
 *   node scripts/seed_<event>.cjs --content-only  # copy/date fields only, no artwork
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

const PROJECT_ID = 'sahs-archives';

/**
 * The website's own Storage bucket.
 *
 * NOT `sahs-archives.firebasestorage.app` — that one is shared with archive-app, and
 * the two repos used to overwrite each other's storage rules on every deploy. Defined
 * once here so a new seed script cannot get it wrong by copying an old one.
 */
const WEBSITE_BUCKET = 'sahs-website-media';

const KEY_FILE = path.join(process.env.HOME, '.config/gcloud/sahs-firebase-deploy.json');

const PROD = process.argv.includes('--prod');
/** Merge copy and dates only, leaving Storage and the image fields untouched. */
const CONTENT_ONLY = process.argv.includes('--content-only');

/** Stable UUID-shaped download token derived from the object path. */
function tokenFor(objectPath) {
  const h = crypto.createHash('sha256').update(objectPath).digest('hex');
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20, 32)].join('-');
}

/**
 * Uploads one image and returns a download URL in the same shape the client SDK's
 * getDownloadURL() produces, so admin-uploaded and script-uploaded images are
 * indistinguishable to the app.
 *
 * The token is derived from the object path, not random: re-uploading must not
 * invalidate URLs already rendered into pages, emails or scraped social previews.
 * (That guarantee was broken once, by the bucket migration re-minting tokens on the
 * copied objects — which is what `--content-only` exists to route around.)
 */
async function uploadArtwork({ slug, artDir, file }) {
  const localPath = path.join(artDir, file);
  if (!fs.existsSync(localPath)) {
    throw new Error(`Missing artwork: ${localPath}`);
  }
  const objectPath = `content_images/${slug}_${file}`;
  const token = tokenFor(objectPath);
  await getStorage().bucket(WEBSITE_BUCKET).upload(localPath, {
    destination: objectPath,
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${WEBSITE_BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

/**
 * Resolve the image fields for this run.
 *
 * Emulator runs never upload. `firebase.json` configures a Storage emulator, but nothing
 * sets `STORAGE_EMULATOR_HOST`, so the Admin SDK ignores it and an `upload()` here would
 * authenticate with the real key and write to PRODUCTION Storage. Staging into Vite's
 * `public/` instead is why local pages still render real artwork. Do not "fix" the
 * asymmetry without wiring `STORAGE_EMULATOR_HOST` first — the obvious cleanup is the bug.
 */
async function resolveImages({ slug, art, artDir, stagingDir, stagingUrlBase }) {
  const images = {};
  if (CONTENT_ONLY) {
    console.log('  ✍️  content-only — image fields left exactly as they are');
    return images;
  }
  for (const { field, file } of art) {
    if (PROD) {
      images[field] = await uploadArtwork({ slug, artDir, file });
      console.log(`  ✅ uploaded ${file}`);
    } else {
      fs.mkdirSync(stagingDir, { recursive: true });
      fs.copyFileSync(path.join(artDir, file), path.join(stagingDir, file));
      images[field] = `${stagingUrlBase}/${file}`;
    }
  }
  return images;
}

/**
 * A `Date` anywhere in the caller's `data` becomes a Firestore `Timestamp`.
 *
 * Callers write `eventDate: new Date('2026-09-25T15:00:00-04:00')` — a real instant with
 * an explicit offset — and never touch `Timestamp` themselves. Note this is only for
 * absolute values: the naive `datetime-local` strings the admin form produces
 * (`eventEndDate`) are strings and pass through untouched, which is correct. Converting
 * one of those to a Timestamp is the timezone bug in CLAUDE.md.
 */
function toFirestoreValues(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = v instanceof Date ? Timestamp.fromDate(v) : v;
  }
  return out;
}

/**
 * Create or update one event post, and its artwork.
 *
 * Upserts on `slug`, never `.add()` unconditionally: the document ID is the join key for
 * the post's Google Calendar entry and for every sold ticket, so a fresh ID on re-run
 * strands both and leaves a duplicate post live.
 */
async function seedEventPost({ label, slug, artwork, art = [], data }) {
  if (!slug) throw new Error('seedEventPost: slug is required — it is the upsert key and the public URL.');
  if (art.length && !artwork) throw new Error('seedEventPost: `artwork` (the .artwork/ directory name) is required when `art` is non-empty.');

  console.log(`${PROD ? '🚀 PRODUCTION' : '🌱 Emulator'} — seeding ${label || slug}…`);

  if (!PROD) {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  }

  // The emulator needs no credential, and passing an undefined one is rejected.
  initializeApp({
    projectId: PROJECT_ID,
    storageBucket: WEBSITE_BUCKET,
    ...(PROD && {
      credential: fs.existsSync(KEY_FILE) ? cert(require(KEY_FILE)) : applicationDefault(),
    }),
  });
  const db = getFirestore();

  // Both directories derive from one nickname. The staging name MUST end in `-art` —
  // `.gitignore` covers exactly `public/*-art/`, and a directory missing that shape
  // leaves binary artwork copies untracked-and-committable.
  const artDir = path.join(__dirname, '..', '..', '.artwork', artwork || '');
  const images = await resolveImages({
    slug,
    art,
    artDir,
    stagingDir: path.join(__dirname, '..', '..', 'public', `${artwork}-art`),
    stagingUrlBase: `/${artwork}-art`,
  });

  const now = Timestamp.fromDate(new Date());
  const payload = { ...toFirestoreValues(data), slug, updatedAt: now, ...images };

  const existing = await db.collection('posts').where('slug', '==', slug).limit(1).get();

  if (existing.empty && CONTENT_ONLY) {
    throw new Error(`No post with slug "${slug}" — --content-only updates an existing post, it does not create one.`);
  }

  if (existing.empty) {
    const ref = await db.collection('posts').add({
      ...payload,
      ticketsSold: 0,
      // Create only. `publishDate` is a fallback sort key on every past-events surface,
      // so re-running must leave an already-published post where it is.
      publishDate: now,
      createdAt: now,
    });
    console.log(`✅ Created posts/${ref.id}`);
  } else {
    // Never clobber ticketsSold — the Stripe webhook owns that counter, and the number
    // is not recoverable from the post. increment(0) leaves it exactly as found.
    await existing.docs[0].ref.set({ ...payload, ticketsSold: FieldValue.increment(0) }, { merge: true });
    console.log(`✅ Updated existing posts/${existing.docs[0].id}`);
  }

  console.log(`   /news/${slug}`);
  if (data.ticketPrice) console.log(`   /embed/tickets/${slug}`);
}

/** Wraps seedEventPost with the error handling every script had copied. */
function runSeed(config) {
  seedEventPost(config).catch(err => {
    console.error('❌', err.message || err);
    process.exit(1);
  });
}

module.exports = { seedEventPost, runSeed, PROD, CONTENT_ONLY, WEBSITE_BUCKET, tokenFor };
