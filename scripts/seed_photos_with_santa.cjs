/**
 * Creates (or updates) the "Photos with Santa at the Carmichael House" post as a DRAFT.
 *
 *   node scripts/seed_photos_with_santa.cjs                 # local emulator (default)
 *   node scripts/seed_photos_with_santa.cjs --prod          # production Firestore + Storage
 *   node scripts/seed_photos_with_santa.cjs --content-only  # copy/date fields only, no artwork
 *
 * The exact date is not set yet — only "a Saturday afternoon in December" is confirmed
 * as of authoring. `eventDate` below is a placeholder (the second Saturday) so the post
 * has something to sort by; update it once the board settles on a real date, and update
 * the "date to be confirmed" copy in CONTENT to match. Do not treat the placeholder date
 * as real when reasoning about this event elsewhere (e.g. calendar sync, box-office
 * scripts).
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
<h3>Photos with Santa</h3>
<p>Bring the family to the historic <strong>Carmichael House</strong> this December for a holiday tradition &mdash; free photos with Santa on the porch of the Senoia Area Historical Society&rsquo;s home.</p>
<p>We&rsquo;re planning for a <strong>Saturday afternoon in December</strong>. The exact date is still being finalized and will be announced here and by email as soon as it&rsquo;s confirmed &mdash; watch this space.</p>
<p><em>Admission is free and open to all.</em></p>
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
    // Placeholder only — the second Saturday of December, 1:00 PM EST. Update once the
    // board confirms a real date; see the header comment.
    eventDate: new Date('2026-12-12T13:00:00-05:00'),
    content: CONTENT,
    excerpt:
      'Bring the family for free photos with Santa on the porch of the historic Carmichael House this December — a Saturday afternoon, exact date to be confirmed.',
    location: CARMICHAEL_HOUSE,
    galleryImages: [],
    squareImage: null,
    ticketPrice: null,
    capacity: null,
    documentUrl: null,
  },
});
