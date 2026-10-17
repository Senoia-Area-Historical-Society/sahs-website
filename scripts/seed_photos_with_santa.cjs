/**
 * Creates (or updates) the "Photos with Santa at the Carmichael House" post as a DRAFT.
 *
 *   node scripts/seed_photos_with_santa.cjs                 # local emulator (default)
 *   node scripts/seed_photos_with_santa.cjs --prod          # production Firestore + Storage
 *   node scripts/seed_photos_with_santa.cjs --content-only  # copy/date fields only, no artwork
 *
 * The date is TENTATIVE: Saturday Dec 12 or Sunday Dec 13, 2026, 1–4 PM. `eventDate`
 * below is Dec 12; update it (and the "tentative" copy in CONTENT) once the board
 * confirms. Do not treat it as real when reasoning about this event elsewhere (e.g.
 * calendar sync, box-office scripts).
 *
 * status: 'draft' is intentional — do not flip to 'published' (here or in ContentAdmin)
 * until the date is confirmed. A published post fires the onPostWritten Google Calendar
 * sync in production (see CLAUDE.md), so publishing early would put a placeholder date on
 * the public Membership Calendar.
 *
 * The shared mechanics — bucket, upsert on slug, ticketsSold, publishDate-on-create,
 * artwork staging — live in ./lib/seedEvent.cjs.
 */
const { runSeed } = require('./lib/seedEvent.cjs');

const CARMICHAEL_HOUSE = 'Carmichael House, 6 Couch Street, Senoia, GA 30276';

const CONTENT = `
<p><strong>Ho Ho Ho! Santa Claus is Coming to SAHS!</strong></p>
<p>Don&rsquo;t miss this magical opportunity for <strong>free photos with Santa</strong> at the Senoia Area Historical Society! Gather your loved ones, grab your camera, and create cherished holiday memories.</p>
<p><strong>Date:</strong> Saturday, December 12, 2026 <em>(tentative &mdash; may move to Sunday, December 13; we&rsquo;ll confirm here and by email)</em></p>
<p><strong>Time:</strong> 1 PM &ndash; 4 PM</p>
<p><strong>Location:</strong> Carmichael House, 6 Couch Street, Senoia, Georgia</p>
<p><em>Admission is free and open to all.</em> We can&rsquo;t wait to see your festive smiles!</p>
`.trim();

runSeed({
  label: 'Photos with Santa (draft)',
  slug: 'photos-with-santa-2026',
  artwork: 'photos-with-santa',
  art: [
    { field: 'bannerImage', file: 'photos-with-santa-banner-1920x1080.jpg' },
    { field: 'mainImage', file: 'photos-with-santa-card-1200x675.jpg' },
  ],
  data: {
    type: 'event',
    status: 'draft',
    title: 'Photos with Santa at the Carmichael House',
    // Tentative — Saturday Dec 12, 1:00 PM EST (Sunday Dec 13 is the fallback). Absolute
    // instant; `eventEndDate` is the NAIVE Eastern wall-clock string the admin form
    // produces, so never .toISOString() it (see calendarTime.ts). Confirm the date, update
    // both fields and the CONTENT line, then publish.
    eventDate: new Date('2026-12-12T13:00:00-05:00'),
    eventEndDate: '2026-12-12T16:00',
    content: CONTENT,
    excerpt:
      'Free photos with Santa at the Senoia Area Historical Society! Gather your loved ones, grab your camera, and create cherished holiday memories — Saturday, December 12, 1–4 PM (tentative; may move to Sunday, December 13).',
    location: CARMICHAEL_HOUSE,
    galleryImages: [],
    squareImage: null,
    ticketPrice: null,
    capacity: null,
    documentUrl: null,
  },
});
