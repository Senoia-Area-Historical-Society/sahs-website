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
// The website's own bucket, NOT the shared `sahs-archives.firebasestorage.app`. This
// script keeps its own copy of the seeding mechanics — it seeds six posts in one run
// with a selection argument, so it was deliberately left off scripts/lib/seedEvent.cjs.
// scripts/check-storage-bucket-target.cjs is what keeps this constant honest.
const BUCKET = 'sahs-website-media';
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
async function uploadArtwork(slug, file, dir = ART_DIR) {
  const localPath = path.join(dir, file);
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
    // Susan's hand-designed graphics, not the Nano Banana placeholder — do not
    // overwrite these by re-running generate-fall-winter-2026.sh's sept_program().
    art: { bannerImage: 'sept-program-banner-1920x1080.jpg', mainImage: 'sept-program-card-1200x628.jpg' },
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
    slug: 'october-2026-program-caring-for-family-treasures',
    // The slot first held a placeholder on historic preservation; the real
    // program is Dr. Janzen on caring for family heirlooms. Rename in place so
    // the existing calendar entry is patched rather than duplicated.
    renameFrom: 'october-2026-program-historic-preservation',
    title: 'October 2026 Program: Caring for Your Family Treasures',
    // 7:00 PM Eastern. October is EDT (-04:00).
    eventDate: '2026-10-08T19:00:00-04:00',
    location: MUSEUM,
    // Cropped from Susan Stitt's flyer (oct-program-flyer-source.pdf), not the
    // Nano Banana placeholder — generate-fall-winter-2026.sh no longer makes it.
    art: { bannerImage: 'oct-program-banner-1920x1080.jpg', mainImage: 'oct-program-card-1200x675.jpg' },
    excerpt:
      'Dr. Mark Janzen of the University of West Georgia shows how to protect and preserve family heirlooms, and invites you to bring one for advice. Thursday, October 8 at 7:00 PM. Members free; guests $5 suggested donation.',
    content: `
<h3>Caring for Your Family Treasures</h3>
<p>Join us for our October Monthly Program with <strong>Dr. Mark Janzen</strong> of the University of West Georgia.</p>
<p>Old photographs, letters, quilts and keepsakes tell your family&rsquo;s story. Drawing on material culture and museum practice, Dr. Janzen will show you how to protect and preserve the treasures that matter most to you.</p>

<h3>Bring Your Treasures</h3>
<p>Bring a family heirloom or keepsake, and Dr. Janzen will help you work out how best to care for it.</p>

<h3>About the Speaker</h3>
<p>A native of Texas, Dr. Janzen has lived in Georgia since 2022 and brings several decades of museum experience to his work at UWG. A public historian, he explores the history of science and technology, architectural history, preservation, and public memory and memorialization. He also loves his many pets, sci-fi and gaming, and collecting everything Garfield.</p>

<h3>Details</h3>
<p>Doors open at 6:30 PM for light refreshments and socializing. The program begins at 7:00 PM. Admission is free for members, with a suggested donation of $5 per person for guests.</p>
`,
  },
  {
    key: 'auction',
    slug: 'november-auction-2026',
    title: '2026 Annual Charity Auction',
    // 6:00 PM doors open (confirmed by Shelley Kiley, Nov 2026). November 14 falls after
    // DST ends, so EST (-05:00).
    eventDate: '2026-11-14T18:00:00-05:00',
    location: MUSEUM,
    art: {
      bannerImage: 'auction-banner-1920x1080.jpg',
      mainImage: 'auction-card-1200x675.jpg',
      squareImage: 'auction-square-1200x1200.jpg',
    },
    ticketPrice: 3000, // $30.00, in cents
    // Set on the live post after seeding. seed() writes `capacity ?? null`, so leaving
    // this out of the script would remove the remaining-tickets limit on the next run.
    capacity: 100,
    // Rendered in place of <!-- LOTS --> below. Each image is uploaded next to the
    // post's own art, and each description is its caption from
    // .artwork/auction-2026-teasers/teasers.md without the ticket line, since the
    // page already carries the date, the price and the ticket form.
    lots: [
      ['A Week in Bordeaux', 'auction-2026-teasers/bordeaux-card-1200x675.jpg', 'A week in Bordeaux, France, could be yours (airfare not included).'],
      // Revised Nov 2026 (Susan Stitt): now two separate lots, each a 30-minute visit
      // from Santa and Mrs. Claus. No image: santa-card bakes "One Hour" into the
      // pixels, so showing it would contradict this caption.
      ['Visits from Santa and Mrs. Claus', null, 'Santa and Mrs. Claus are coming to visit, and you make the guest list. This year it&rsquo;s two separate lots, each a 30-minute visit. Invite your friends, kids and grandkids.'],
      ['Pedal and Picnic', 'auction-2026-teasers/ebikes-card-1200x675.jpg', 'Two e-bike rentals and a picnic from Senoia Bicycle. Grab someone you like and make a day of it.'],
      ['A Taste of Napa', 'auction-2026-teasers/napa-card-1200x675.jpg', 'Napa wine tasting and food pairings for six. Gather your favorite people, pour something good and let the pairings do the talking.'],
      ['Six Months of Blooms', 'auction-2026-teasers/flowers-card-1200x675.jpg', 'Six months of flower arrangements from The Pioneer Flower Farmer. Fresh flowers for your table, long after the auction is over.'],
      ['A Spirited Tour', 'auction-2026-teasers/distillery-card-1200x675.jpg', 'Go behind the scenes with a tour of Doc Brown Distillery Farm.'],
      ['Do Not Try This at Home', 'auction-2026-teasers/stunt-card-1200x675.jpg', 'Two hours with a professional stunt man. We can&rsquo;t think of another auction lot quite like it.'],
      ['Pass the Fried Chicken', 'auction-2026-teasers/chicken-card-1200x675.jpg', 'George and Betty&rsquo;s fried chicken dinner for eight, plus all the Southern fixins of your choice. Bring seven friends and your appetite.'],
      ['Your Business on the Map', 'auction-digital-services/digital-services-card-1200x675.jpg', 'Is your business hard to find online? Here&rsquo;s a way to fix that and support local history at the same time: a custom website and digital marketing package, with SEO and Google Business setup included, from Jeremy Warren.'],
    ],
    excerpt:
      'Our annual charity auction returns on Saturday, November 14 — an evening of food, bidding and good company, and the single biggest fundraiser of the SAHS year. The evening starts at 6:00 PM, with the silent auction from 6:00 to 7:00 and the live auction at 7:15. Tickets are $30 and include heavy appetizers.',
    content: `
<h3>A November to Remember</h3>
<p>Our <strong>Annual Charity Auction</strong> returns on <strong>Saturday, November 14, 2026</strong>, starting at <strong>6:00 PM</strong> at the SAHS History Museum. It is the largest fundraiser of our year, and the one that does the most to keep the Historical Society&rsquo;s work going &mdash; the museum, the archives, and the preservation of Senoia&rsquo;s history.</p>
<p>Expect an evening of good food, spirited bidding and better company. Tickets are <strong>$30</strong> and include heavy appetizers, admission to the auction, and a cash bar.</p>

<h3>The Evening&rsquo;s Schedule</h3>
<ul>
<li><strong>6:00 PM</strong> &mdash; Auction starts and doors open</li>
<li><strong>6:00&ndash;7:00 PM</strong> &mdash; Silent auction</li>
<li><strong>7:15 PM</strong> &mdash; Live auction</li>
</ul>
<p>Heavy appetizers will be served throughout the evening, and a cash bar will be open.</p>

<h3>A First Look at This Year&rsquo;s Lots</h3>
<p>Here are a few of the items and experiences up for bid.</p>
<!-- LOTS -->

<h3>Donate to the Auction</h3>
<p>More lots are still being added. If you have an item or a service you would like to donate to the auction, we would love to hear from you at <a href="mailto:info@senoiahistory.com">info@senoiahistory.com</a>.</p>
`,
  },
  {
    key: 'business-meeting',
    slug: 'november-2026-annual-business-meeting',
    // Published: a published post is a real Membership Calendar entry (onPostWritten).
    status: 'published',
    title: '2026 Annual Business Meeting & Auction Preview',
    // 7:00 PM, the standard Thursday program start. November 12 is after DST ends, so EST (-05:00).
    // The second Thursday, matching the monthly program cadence and the week before the auction.
    eventDate: '2026-11-12T19:00:00-05:00',
    location: MUSEUM,
    art: {
      // -v2: the auction-preview detail line. Storage objects are cached for a year
      // under their path, so a changed image needs a new filename to reach readers.
      bannerImage: 'business-meeting-banner-1920x1080-v2.jpg',
      mainImage: 'business-meeting-card-1200x675-v2.jpg',
      squareImage: 'business-meeting-square-1200x1200-v2.jpg',
    },
    excerpt:
      'Our annual business meeting on Thursday, November 12 at 7:00 PM: the society’s finances, board membership and what is ahead for members, with a preview of the Annual Charity Auction.',
    content: `
<h3>Annual Business Meeting</h3>
<p>Every year we set aside an evening to report to our members on the health of the Senoia Area Historical Society. Join us for the <strong>2026 Annual Business Meeting</strong> on <strong>Thursday, November 12</strong>.</p>
<p>We will review the year&rsquo;s finances, present the board of directors and any changes to its membership, and share what the society has accomplished and what comes next.</p>

<h3>Auction Preview</h3>
<p>The meeting is also a chance to preview the items for our <strong>Annual Charity Auction</strong> on Saturday, November 14. Come see what is on offer before the bidding begins.</p>

<h3>Details</h3>
<p>Doors open at 6:30 PM for light refreshments. The meeting begins at 7:00 PM at the Senoia Area Historical Society &amp; Museum, 6 Couch Street. Members are invited to attend.</p>
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

  // A lot's artwork lives under .artwork/, one directory up from ART_DIR's event folder.
  let lotsHtml = '';
  for (const [name, artPath, description] of ev.lots ?? []) {
    // A lot may have no artwork (null), e.g. when its poster has gone stale.
    if (!artPath) {
      lotsHtml += `<h4>${name}</h4>\n<p>${description}</p>\n`;
      continue;
    }
    const dir = path.join(__dirname, '../.artwork', path.dirname(artPath));
    const file = path.basename(artPath);
    let src;
    if (PROD) {
      src = await uploadArtwork(ev.slug, file, dir);
    } else {
      const publicDir = path.join(__dirname, '../public/fw2026-art');
      fs.mkdirSync(publicDir, { recursive: true });
      fs.copyFileSync(path.join(dir, file), path.join(publicDir, file));
      src = `/fw2026-art/${file}`;
    }
    lotsHtml += `<h4>${name}</h4>\n<img src="${src}" alt="${name} auction poster">\n<p>${description}</p>\n`;
  }

  const now = Timestamp.fromDate(new Date());
  const data = {
    type: 'event',
    // 'draft' keeps a post off the site and out of onPostWritten's calendar insert.
    status: ev.status ?? 'published',
    title: ev.title,
    slug: ev.slug,
    eventDate: Timestamp.fromDate(new Date(ev.eventDate)),
    publishDate: now,
    content: ev.content.replace('<!-- LOTS -->', lotsHtml.trim()).trim(),
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
    // publishDate is create-only: rewriting it reorders the past-events surfaces.
    const { publishDate: _keep, ...updateData } = data;
    await existing.ref.set({ ...updateData, ticketsSold: FieldValue.increment(0) }, { merge: true });
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
