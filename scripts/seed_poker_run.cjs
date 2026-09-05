/**
 * Creates (or updates) the "Cruisin' for History Poker Run" ticketed event post
 * and uploads its artwork to Firebase Storage.
 *
 *   node scripts/seed_poker_run.cjs                 # local emulator (default)
 *   node scripts/seed_poker_run.cjs --prod          # production Firestore + Storage
 *   node scripts/seed_poker_run.cjs --content-only  # copy/date fields only, no artwork
 *
 * Writing a *published* event to production fires the onPostWritten trigger,
 * which inserts a real Google Calendar event — hence the explicit --prod gate.
 *
 * Re-running is safe: the post is matched on slug and updated in place, so the
 * doc ID (and therefore the calendar event and any sold tickets) is preserved.
 *
 * Use --content-only for a copy correction on a post that is already live. The
 * artwork upload below mints a *deterministic* token so re-uploads keep existing
 * URLs valid — but the migration to the `sahs-website-media` bucket copied these
 * objects and Firebase minted fresh random tokens on the copies, so that promise
 * no longer holds for this post. A full re-run would rotate all three image URLs
 * out from under anything that already embeds them (emails, social previews).
 * Text edits have no reason to touch Storage at all, so don't.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

const PROD = process.argv.includes('--prod');
// Skip Storage entirely and merge only the copy/date fields — see the note above.
const CONTENT_ONLY = process.argv.includes('--content-only');
const PROJECT_ID = 'sahs-archives';
const BUCKET = 'sahs-website-media';
const SLUG = 'cruisin-for-history-poker-run-2026';
const KEY_FILE = path.join(
  process.env.HOME,
  '.config/gcloud/sahs-firebase-deploy.json'
);

// Artwork is committed alongside the script so re-runs are reproducible from a
// fresh clone; override the location with POKER_RUN_ART_DIR.
const ART_DIR = process.env.POKER_RUN_ART_DIR || path.join(__dirname, '../.artwork/poker-run');
const ART = [
  { field: 'bannerImage', file: 'poker-run-banner-1920x1080.jpg' },
  { field: 'mainImage', file: 'poker-run-card-1200x675.jpg' },
  { field: 'squareImage', file: 'poker-run-square-1200x1200.jpg' },
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
  // rendered into pages, emails, or social previews.
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

const CONTENT = `
<p>Back for its second year, the <strong>Cruisin&rsquo; for History Poker Run</strong> is a laid-back fundraiser for the Senoia Area Historical Society, held the afternoon before the 21st Annual Senoia Car Show. Drive a loop of five local landmarks, photograph yourself with your ride at each, then trade your photos for a poker hand. Best hand takes half the proceeds.</p>
<p>Unlike the show itself, <strong>any make, model, or year</strong> of car, truck, or motorcycle can join. It&rsquo;s the perfect way to kick off car show weekend and support the preservation of Senoia&rsquo;s history.</p>

<h3>How It Works</h3>
<ol>
  <li><strong>Cruise the stops.</strong> Drive to all five landmarks below, in any order, at your own pace on Friday afternoon. <strong>Registration closes at 5:00 PM</strong>, and every entrant must be back at the Stone Lodge at Marimac Lakes by <strong>6:30 PM</strong>.</li>
  <li><strong>Snap a photo.</strong> Each photo must show <strong>both your vehicle and you</strong> &mdash; get in the frame with the car. Tell any onlookers to come see the show on Saturday.</li>
  <li><strong>Draw your hand.</strong> Bring your five photos to the Stone Lodge at Marimac Lakes between <strong>3:00 and 6:30 PM</strong>. Each photo earns you a playing card &mdash; five cards is your poker hand. When you present your photos, before your cards are dealt, you may buy a <strong>tie-breaker card for $10</strong>.</li>
  <li><strong>Win.</strong> This is a <strong>50/50 contest</strong>: the total proceeds are split down the middle &mdash; half to the Senoia Area Historical Society, half to the best five-card poker hand (standard poker rules), with a <strong>guaranteed minimum payout of $200</strong> to the winner. If two or more hands tie and no tie-breaker card was bought, the tied entrants split the winner&rsquo;s half between them. Once every entrant has received their cards and the results are posted, the winner is announced and paid.</li>
</ol>

<h3>The Route</h3>
<p>Five stops, roughly a 33-mile loop &mdash; about 50 minutes of driving without the photo breaks. The order below is the suggested route; you&rsquo;re free to run it however you like.</p>
<ul>
  <li><strong>Stop 1 &mdash; Senoia City Cemetery</strong><br>Senoia City Cemetery, Senoia, GA 30276</li>
  <li><strong>Stop 2 &mdash; Clayton Appliances</strong><br>51 Marion Beavers Rd, Sharpsburg, GA 30277</li>
  <li><strong>Stop 3 &mdash; 1 Wood Dr, Newnan</strong><br>1 Wood Dr, Newnan, GA 30263</li>
  <li><strong>Stop 4 &mdash; Aqua Design Systems</strong><br>5127 GA-16, Senoia, GA 30276</li>
  <li><strong>Stop 5 &mdash; SAHS History Museum</strong><br>6 Couch St, Senoia, GA 30276 &mdash; also known as the Carmichael House, the Historical Society&rsquo;s home.</li>
</ul>

<h3>Finish Line</h3>
<p><strong>Stone Lodge at Marimac Lakes</strong><br>148 Pylant St, Senoia, GA 30276</p>
<p>Proceed across the lake to the Stone Lodge between <strong>3:00 and 6:30 PM</strong> with your five photos to draw your hand. The winner is announced and paid once every qualified entrant has received their cards and the results are posted.</p>
<p><strong>Senoia Pizza</strong> will be on site serving from <strong>3:00 to 7:00 PM</strong>. Food and drink are available for purchase and are not included with your entry.</p>

<h3>Entry</h3>
<p><strong>$25 per entry.</strong> Purchase your tickets above &mdash; <strong>registration closes at 5:00 PM</strong> on the day of the run. Proceeds are split 50/50 between the winner and the Senoia Area Historical Society, supporting the preservation of Senoia&rsquo;s history.</p>
<p>Then come see the show: the <strong>21st Annual Senoia Car Show</strong> is the next morning, Saturday, September 26, from 10 AM to 4 PM on Historic Main Street. Full details at <a href="https://senoiacar.show" target="_blank" rel="noopener noreferrer">senoiacar.show</a>.</p>
`.trim();

async function main() {
  console.log(`${PROD ? '🚀 PRODUCTION' : '🌱 Emulator'} — seeding Poker Run…`);

  const images = {};
  for (const { field, file } of (CONTENT_ONLY ? [] : ART)) {
    if (PROD) {
      images[field] = await uploadArtwork(file);
      console.log(`  ✅ uploaded ${file}`);
    } else {
      // Emulator runs have no Storage, so stage the art in Vite's public/ dir
      // (gitignored) and reference it by path so local pages render for real.
      const publicDir = path.join(__dirname, '../public/poker-run-art');
      fs.mkdirSync(publicDir, { recursive: true });
      fs.copyFileSync(path.join(ART_DIR, file), path.join(publicDir, file));
      images[field] = `/poker-run-art/${file}`;
    }
  }
  if (CONTENT_ONLY) {
    console.log('  ✍️  content-only — image fields left exactly as they are');
  }

  // 3:00 PM EDT — the finish line opens. `eventDate` is an absolute Timestamp,
  // so it is safe to convert; `eventEndDate` is a naive Eastern wall-clock string
  // of the shape the admin editor produces, which the calendar request interprets
  // with its own timeZone field (see functions/src/calendarTime.ts — never
  // .toISOString() one of these). Together they give the Calendar entry the real
  // 3:00–6:30 window instead of the default 2-hour block off eventDate alone.
  const eventDate = new Date('2026-09-25T15:00:00-04:00');
  const eventEndDate = '2026-09-25T18:30';

  const data = {
    type: 'event',
    status: 'published',
    title: 'Cruisin’ for History Poker Run',
    slug: SLUG,
    eventDate: Timestamp.fromDate(eventDate),
    eventEndDate,
    content: CONTENT,
    excerpt:
      'A laid-back fundraiser the afternoon before the Senoia Car Show. Drive a loop of five local landmarks, photographing yourself with your ride at each, then trade your photos for a poker hand. It’s a 50/50 contest — the best hand takes half the proceeds, with a guaranteed $200 minimum. Any car, truck, or motorcycle welcome.',
    location: 'Stone Lodge at Marimac Lakes, 148 Pylant St, Senoia, GA 30276',
    galleryImages: [],
    ticketPrice: 2500, // $25.00, in cents
    capacity: null, // unlimited — falsy capacity disables the remaining-count UI
    updatedAt: Timestamp.fromDate(new Date()),
    ...images,
  };

  const existing = await db
    .collection('posts')
    .where('slug', '==', SLUG)
    .limit(1)
    .get();

  if (existing.empty && CONTENT_ONLY) {
    throw new Error(`No post with slug "${SLUG}" — --content-only updates an existing post, it does not create one.`);
  }

  if (existing.empty) {
    const ref = await db.collection('posts').add({
      ...data,
      ticketsSold: 0,
      // Only on create: `publishDate` is a fallback sort key on every past-events
      // surface, so re-running must leave an already-published post where it is.
      publishDate: Timestamp.fromDate(new Date()),
      createdAt: Timestamp.fromDate(new Date()),
    });
    console.log(`✅ Created posts/${ref.id}`);
  } else {
    const ref = existing.docs[0].ref;
    // Never clobber ticketsSold — the Stripe webhook owns that counter.
    await ref.set({ ...data, ticketsSold: FieldValue.increment(0) }, { merge: true });
    console.log(`✅ Updated existing posts/${ref.id}`);
  }
  console.log(`   /news/${SLUG}`);
  console.log(`   /embed/tickets/${SLUG}`);
}

main().catch(err => {
  console.error('❌', err);
  process.exit(1);
});
