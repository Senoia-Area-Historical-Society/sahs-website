/**
 * Creates (or updates) the "A Visit with Dr. McIntosh" roundtable post as a DRAFT.
 *
 *   node scripts/seed_mcintosh_roundtable.cjs                 # local emulator (default)
 *   node scripts/seed_mcintosh_roundtable.cjs --prod          # production Firestore + Storage
 *   node scripts/seed_mcintosh_roundtable.cjs --content-only  # copy/date fields only, no artwork
 *
 * Speaker bio and roundtable topic are not yet confirmed — see the TODO in CONTENT
 * below. "Dr. McIntosh" has no confirmed identity anywhere else in this repo: an earlier
 * placeholder by that name (board-minutes shorthand, no first name or topic ever
 * supplied) was seeded for the unrelated Thursday, September 10 monthly program slot and
 * has since been superseded there by Nicole Williams, PhD (see
 * scripts/seed_fall_winter_2026_events.cjs). This is a separate Saturday afternoon event
 * and does not touch that document.
 *
 * status: 'draft' is intentional — do not flip to 'published' (here or in ContentAdmin)
 * until the bio/topic are confirmed. A published post fires the onPostWritten Google
 * Calendar sync in production (see CLAUDE.md), so publishing prematurely puts an
 * unconfirmed placeholder on the public Membership Calendar.
 *
 * The shared mechanics — bucket, upsert on slug, ticketsSold, publishDate-on-create,
 * artwork staging — live in ./lib/seedEvent.cjs.
 */
const { runSeed } = require('./lib/seedEvent.cjs');

const MUSEUM = 'Senoia Area Historical Society, 6 Couch Street, Senoia, GA';

// TODO: Confirm Dr. McIntosh's full name and the roundtable's actual subject,
// then replace this placeholder copy before publishing.
const CONTENT = `
<h3>A Visit with Dr. McIntosh</h3>
<p>Join us at the Senoia Area Historical Society on <strong>Saturday, September 12</strong> for a roundtable discussion with <strong>Dr. McIntosh</strong>, running from <strong>1:00 to 4:00 PM</strong> at the museum.</p>
<p>Further details about the topic and format will be announced soon. We look forward to welcoming Dr. McIntosh and sharing this afternoon of history with our community.</p>
<p><em>Admission is free and open to all.</em></p>
`.trim();

runSeed({
  label: 'McIntosh Roundtable (draft)',
  slug: 'september-2026-roundtable-dr-mcintosh',
  artwork: 'mcintosh-roundtable',
  art: [
    { field: 'bannerImage', file: 'mcintosh-roundtable-banner-1920x1080.jpg' },
    { field: 'mainImage', file: 'mcintosh-roundtable-card-1200x675.jpg' },
  ],
  data: {
    type: 'event',
    status: 'draft',
    title: 'A Visit with Dr. McIntosh',
    // 1:00 PM EDT. September 12 is before DST ends, so -04:00.
    eventDate: new Date('2026-09-12T13:00:00-04:00'),
    content: CONTENT,
    excerpt:
      'Join us Saturday, September 12 from 1:00 to 4:00 PM for a roundtable discussion with Dr. McIntosh at the museum. Free and open to all — full details to follow.',
    location: MUSEUM,
    galleryImages: [],
    squareImage: null,
    ticketPrice: null,
    capacity: null,
    documentUrl: null,
  },
});
