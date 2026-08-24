/**
 * Creates (or updates) the six Fall/Winter 2026 event posts and uploads their
 * artwork to Firebase Storage.
 *
 *   node scripts/seed_fall_winter_2026_events.cjs                # local emulator (default)
 *   node scripts/seed_fall_winter_2026_events.cjs --prod         # production Firestore + Storage
 *   node scripts/seed_fall_winter_2026_events.cjs --only auction # one event (repeatable)
 *
 * Writing a *published* event to production fires the onPostWritten trigger,
 * which inserts a real Google Calendar event on the SAHS Membership Calendar —
 * hence the explicit --prod gate, following scripts/seed_poker_run.cjs.
 *
 * Re-running is safe. Each post is matched on slug and updated in place, so the
 * doc ID — and therefore its calendar entry and any sold tickets — is preserved.
 * `ticketsSold` is never written directly; the Stripe webhook owns that counter.
 *
 * The September program is a *rename*, not a new post: the slot already held a
 * published stub for "A Presentation by Dr. McIntosh" and Nicole Williams
 * supersedes it. `renameFrom` finds that document and edits it where it stands.
 * Creating a second post instead would put two SAHS events on the public
 * calendar for the same Thursday night, because onPostWritten inserts for any
 * published post that has no googleCalendarEventId yet.
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
const KEY_FILE = path.join(process.env.HOME, '.config/gcloud/sahs-firebase-deploy.json');

// Artwork is committed alongside the script so re-runs are reproducible from a
// fresh clone; regenerate it with .artwork/generate-fall-winter-2026.sh.
const ART_DIR = process.env.FW2026_ART_DIR || path.join(__dirname, '../.artwork/fall-winter-2026');

const only = [];
process.argv.forEach((a, i) => { if (a === '--only' && process.argv[i + 1]) only.push(process.argv[i + 1]); });

if (!PROD) process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

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
async function uploadArtwork(slug, file) {
  const localPath = path.join(ART_DIR, file);
  if (!fs.existsSync(localPath)) throw new Error(`Missing artwork: ${localPath}`);
  const objectPath = `content_images/${slug}_${file}`;
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

const MUSEUM = 'Senoia Area Historical Society, 6 Couch Street, Senoia, GA';
/** Boilerplate closing every monthly program, matching the August 2026 post. */
const PROGRAM_FOOTER =
  '<p>Admission is free and open to all. Light refreshments will be served beginning at 6:30 PM. The program begins at 7:00 PM.</p>';

// ── The events ───────────────────────────────────────────────────────────────
// `art` maps an artwork basename to the Firestore image fields. Only the events
// that use a mid-body squareImage have a square; a speaker program does not.
/**
 * Image fields written on every post, whether or not this run supplies one.
 *
 * `set(..., { merge: true })` leaves keys that are absent from the payload alone,
 * so writing only the fields in `art` would let artwork from a superseded post
 * survive underneath the new one. That matters for the September rename: a
 * squareImage left behind renders mid-body as an "alternate view" of an event
 * that is no longer about Dr. McIntosh. Production cannot be inspected from the
 * script, so every field is written explicitly — a URL, or null.
 */
const ART_FIELDS = ['bannerImage', 'mainImage', 'squareImage'];

const EVENTS = [
  {
    key: 'sept-program',
    slug: 'september-2026-program-declaration-of-independence',
    // Supersedes the published placeholder that held this date. See header.
    renameFrom: 'september-2026-program-dr-mcintosh',
    title: 'September 2026 Program: The Declaration of Independence',
    // 7:00 PM Eastern. September is EDT (-04:00).
    eventDate: '2026-09-10T19:00:00-04:00',
    location: MUSEUM,
    art: { bannerImage: 'sept-program-banner-1920x1080.jpg', mainImage: 'sept-program-card-1200x675.jpg' },
    excerpt:
      'Nicole Williams, PhD joins us for our September Monthly Program with a presentation on the Declaration of Independence — the document, the arguments behind it, and what it set in motion. Free and open to all.',
    content: `
<h3>The Declaration of Independence</h3>
<p>Join us at the Senoia Area Historical Society for our September Monthly Program, featuring a presentation by <strong>Nicole Williams, PhD</strong> on the Declaration of Independence.</p>
<p>We tend to know the Declaration by its opening lines and little else. Dr. Williams will look at the document itself &mdash; the arguments its drafters were making, the audience they were making them to, and the long shadow those few paragraphs have cast over American life ever since.</p>
<p>It is a fitting subject in the year of the Declaration&rsquo;s 250th anniversary, and a chance to revisit a familiar document with fresh eyes.</p>
${PROGRAM_FOOTER}
`,
  },
  {
    key: 'volunteers',
    slug: 'car-show-shuttle-volunteers-2026',
    title: 'Shuttle Drivers Wanted — 2026 Senoia Car Show',
    // Shuttle shifts run 9:00 AM to 5:00 PM; the show itself is 10-4.
    eventDate: '2026-09-26T09:00:00-04:00',
    location: 'Historic Downtown Senoia, Main Street, Senoia, GA 30276',
    art: {
      bannerImage: 'volunteers-banner-1920x1080.jpg',
      mainImage: 'volunteers-card-1200x675.jpg',
      squareImage: 'volunteers-square-1200x1200.jpg',
    },
    excerpt:
      'The 21st Annual Senoia Car Show needs about 15 shuttle drivers on Saturday, September 26 to run visitors between the parking lots and Main Street. Morning, mid-day and afternoon shifts — sign up at senoiacar.show.',
    content: `
<h3>Help Us Keep the Show Moving</h3>
<p>The <strong>21st Annual Senoia Car Show</strong> brings 600-plus collector cars and thousands of visitors to Historic Main Street on Saturday, September 26. Spectator parking is free &mdash; and it works because volunteers drive the shuttle carts that carry people from the outlying lots to the show and back.</p>
<p>We need <strong>around 15 drivers</strong> to cover the day. It is an easy, sociable shift: you drive a golf cart on a short fixed loop, and you get a front-row seat to the whole show while you do it.</p>

<h3>Shuttle Shifts</h3>
<p>There are three shuttle routes, each running in two-hour blocks across the day. Take one block or several &mdash; whatever suits you.</p>
<ul>
  <li><strong>Early</strong> &mdash; 9:00 AM to 11:00 AM</li>
  <li><strong>Mid-morning</strong> &mdash; 11:00 AM to 1:00 PM</li>
  <li><strong>Mid-afternoon</strong> &mdash; 1:00 PM to 3:00 PM</li>
  <li><strong>Late</strong> &mdash; 3:00 PM to 5:00 PM</li>
</ul>
<p>Shifts fill up, so the live list of what is still open is on the car show site.</p>

<h3>Sign Up</h3>
<p>Claim a shift at <a href="https://senoiacar.show/volunteer" target="_blank" rel="noopener noreferrer">senoiacar.show/volunteer</a>. You will pick your shirt size when you sign up.</p>
<p><strong>Every volunteer gets a free show shirt.</strong> Collect it at one of the two volunteer training meetings &mdash; Tuesday, September 22 or Thursday, September 24, both at 7:00 PM at the SAHS Museum.</p>
<p>Not able to drive? The same page lists every other role that needs filling, from registration and parking to the merchandise tent and clean-up.</p>
`,
  },
  {
    key: 'oct-program',
    slug: 'october-2026-program-historic-preservation',
    title: 'October 2026 Program: Historic Preservation with Professor Mark Janzen',
    eventDate: '2026-10-08T19:00:00-04:00',
    location: MUSEUM,
    art: { bannerImage: 'oct-program-banner-1920x1080.jpg', mainImage: 'oct-program-card-1200x675.jpg' },
    excerpt:
      'Professor Mark Janzen of the University of West Georgia joins us for our October Monthly Program to talk about historic preservation — why buildings are saved, how it is done, and what it takes locally. Free and open to all.',
    content: `
<h3>Historic Preservation</h3>
<p>Join us at the Senoia Area Historical Society for our October Monthly Program, featuring a presentation by <strong>Professor Mark Janzen</strong> of the University of West Georgia on historic preservation.</p>
<p>Dr. Janzen is a Professor of History at UWG, Director of its Center for Public History, and coordinator of the university&rsquo;s Public History and Museum Studies programs. He brings decades of museum experience to the subject, and his work ranges across architectural history, preservation, and the ways communities choose what to remember.</p>
<p>It is a subject Senoia knows well. A town whose historic district is its calling card has a direct stake in the questions Dr. Janzen works on &mdash; what is worth saving, who decides, and what preservation actually asks of the people who live with it.</p>
${PROGRAM_FOOTER}
`,
  },
  {
    key: 'auction',
    slug: 'november-auction-2026',
    title: '2026 Annual Charity Auction',
    // 6:00 PM, matching recent years. November 14 falls after DST ends, so EST (-05:00).
    eventDate: '2026-11-14T18:00:00-05:00',
    location: MUSEUM,
    art: {
      bannerImage: 'auction-banner-1920x1080.jpg',
      mainImage: 'auction-card-1200x675.jpg',
      squareImage: 'auction-square-1200x1200.jpg',
    },
    ticketPrice: 3000, // $30.00, in cents
    excerpt:
      'Our annual charity auction returns on Saturday, November 14 — an evening of food, bidding and good company, and the single biggest fundraiser of the SAHS year. Tickets are $30. Full details to come.',
    content: `
<h3>A November to Remember</h3>
<p>Our <strong>Annual Charity Auction</strong> returns on <strong>Saturday, November 14, 2026</strong> at the SAHS History Museum. It is the largest fundraiser of our year, and the one that does the most to keep the Historical Society&rsquo;s work going &mdash; the museum, the archives, and the preservation of Senoia&rsquo;s history.</p>
<p>Expect an evening of good food, spirited bidding and better company. Tickets are <strong>$30</strong> and include food, admission to the auction, and a cash bar.</p>

<h3>More Details to Come</h3>
<p>The full lot list, the evening&rsquo;s schedule and this year&rsquo;s caterer are still being confirmed. We will update this page as those details are settled &mdash; and if you have an item or a service you would like to donate to the auction, we would love to hear from you at <a href="mailto:info@senoiahistory.com">info@senoiahistory.com</a>.</p>
`,
  },
  {
    key: 'christmas',
    slug: '2026-holiday-party',
    title: '2026 Christmas Party — Save the Date',
    // Provisional: the 2nd Thursday, matching 2025 (Dec 11) and prior years.
    // The date is genuinely not settled — see the "date to be confirmed" copy.
    eventDate: '2026-12-10T18:30:00-05:00',
    location: MUSEUM,
    art: {
      bannerImage: 'christmas-banner-1920x1080.jpg',
      mainImage: 'christmas-card-1200x675.jpg',
      squareImage: 'christmas-square-1200x1200.jpg',
    },
    excerpt:
      'Save the date for the SAHS Christmas Party this December at the Carmichael House. The exact date is still being confirmed — watch this page.',
    content: `
<h3>Save the Date</h3>
<p>The Senoia Area Historical Society&rsquo;s <strong>Christmas Party</strong> returns this December at the Carmichael House &mdash; an evening of good food and good company to close out the year together.</p>
<p><strong>The exact date is still being confirmed.</strong> The listing above shows our usual slot, the second Thursday of December, but please treat it as provisional until we announce the final date here and by email.</p>
<p>In recent years the party has been a potluck, with SAHS providing the ham and members bringing a dish to share. We will confirm the format, the time and the RSVP details alongside the date.</p>
`,
  },
  {
    key: 'hotchocolate',
    slug: 'tour-of-homes-hot-chocolate-2026',
    title: 'Hot Chocolate at the Carmichael House — Candlelight Tour of Homes',
    // Provisional: the 2nd Sunday, matching 2022 (Dec 11) and 2025 (Dec 14).
    // The Senoia DDA sets this date, not SAHS, and has not announced 2026.
    eventDate: '2026-12-13T15:00:00-05:00',
    location: 'Carmichael House, 6 Couch Street, Senoia, GA 30276',
    art: { bannerImage: 'hotchocolate-banner-1920x1080.jpg', mainImage: 'hotchocolate-card-1200x675.jpg' },
    excerpt:
      'The Carmichael House is a stop on the Senoia Candlelight Tour of Homes, and SAHS will be serving hot chocolate to tour guests. The Downtown Development Authority has not yet announced the 2026 date — watch this page.',
    content: `
<h3>Warm Up on the Tour</h3>
<p>The <strong>Senoia Candlelight Tour of Homes</strong> opens the town&rsquo;s historic houses for one evening each December, and the <strong>Carmichael House</strong> &mdash; home of the Senoia Area Historical Society &mdash; is among them.</p>
<p>Stop in as you make your way around the tour: we will have <strong>hot chocolate</strong> waiting, the house will be decorated for the season, and our volunteers will be on hand to talk about the building and its history.</p>

<h3>Date To Be Confirmed</h3>
<p>The Candlelight Tour is organised by the <strong>Senoia Downtown Development Authority</strong>, and the 2026 date has not been announced yet. The listing above shows the tour&rsquo;s usual slot &mdash; the second Sunday of December &mdash; but please treat it as provisional.</p>
<p>We will update this page as soon as the date is set. Tour tickets and official details come from the DDA at <a href="https://www.enjoysenoia.com/events/candlelight-tour-of-homes" target="_blank" rel="noopener noreferrer">enjoysenoia.com</a>; the hot chocolate is free to everyone on the tour.</p>
`,
  },
];

/** Locate the doc to write: the slug itself, then any slug it was renamed from. */
async function findExisting(ev) {
  for (const slug of [ev.slug, ev.renameFrom].filter(Boolean)) {
    const snap = await db.collection('posts').where('slug', '==', slug).limit(1).get();
    if (!snap.empty) return { ref: snap.docs[0].ref, matchedSlug: slug };
  }
  return null;
}

async function seed(ev) {
  const images = Object.fromEntries(ART_FIELDS.map(f => [f, null]));
  for (const [field, file] of Object.entries(ev.art)) {
    if (PROD) {
      images[field] = await uploadArtwork(ev.slug, file);
    } else {
      // The emulator has no Storage, so stage the art in Vite's public/ dir
      // (gitignored) and reference it by path so local pages render for real.
      const publicDir = path.join(__dirname, '../public/fw2026-art');
      fs.mkdirSync(publicDir, { recursive: true });
      fs.copyFileSync(path.join(ART_DIR, file), path.join(publicDir, file));
      images[field] = `/fw2026-art/${file}`;
    }
  }

  const now = Timestamp.fromDate(new Date());
  const data = {
    type: 'event',
    status: 'published',
    title: ev.title,
    slug: ev.slug,
    eventDate: Timestamp.fromDate(new Date(ev.eventDate)),
    publishDate: now,
    content: ev.content.trim(),
    excerpt: ev.excerpt,
    location: ev.location,
    galleryImages: [],
    // Firestore rejects `undefined` outright — a single undefined field fails the
    // whole write. Absent optional values are always null. See CLAUDE.md.
    ticketPrice: ev.ticketPrice ?? null,
    capacity: ev.capacity ?? null,   // falsy capacity disables the remaining-count UI
    // Cleared for the same reason as the image fields: a flyer left over from a
    // superseded post would keep rendering its "Event Flyer / Attachment" box.
    documentUrl: ev.documentUrl ?? null,
    updatedAt: now,
    ...images,
  };

  const existing = await findExisting(ev);
  if (!existing) {
    const ref = await db.collection('posts').add({ ...data, ticketsSold: 0, createdAt: now });
    console.log(`  ✅ created posts/${ref.id}`);
  } else {
    const renamed = existing.matchedSlug !== ev.slug;
    // Never clobber ticketsSold — the Stripe webhook owns that counter.
    await existing.ref.set({ ...data, ticketsSold: FieldValue.increment(0) }, { merge: true });
    console.log(`  ✅ updated posts/${existing.ref.id}` + (renamed ? ` (slug ${existing.matchedSlug} → ${ev.slug})` : ''));
  }
  console.log(`     /news/${ev.slug}`);
}

async function main() {
  const targets = only.length ? EVENTS.filter(e => only.includes(e.key)) : EVENTS;
  if (!targets.length) {
    throw new Error(`--only matched nothing. Keys: ${EVENTS.map(e => e.key).join(', ')}`);
  }
  console.log(`${PROD ? '🚀 PRODUCTION' : '🌱 Emulator'} — seeding ${targets.length} Fall/Winter 2026 event(s)…\n`);
  for (const ev of targets) {
    console.log(`▸ ${ev.title}`);
    await seed(ev);
  }
  console.log('\nDone.');
}

main().catch(err => {
  console.error('❌', err);
  process.exit(1);
});
