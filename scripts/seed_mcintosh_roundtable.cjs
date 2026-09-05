/**
 * Creates (or updates) the "A Visit with Dr. Gary McIntosh" Meet and Greet post.
 *
 *   node scripts/seed_mcintosh_roundtable.cjs                 # local emulator (default)
 *   node scripts/seed_mcintosh_roundtable.cjs --prod          # production Firestore + Storage
 *   node scripts/seed_mcintosh_roundtable.cjs --content-only  # copy/date fields only, no artwork
 *
 * The speaker is **Dr. Gary McIntosh**, confirmed September 2026 from the board
 * newsletter (Angela Rogers, "DATE CORRECTION: September Monthly Meeting Reminder",
 * 2026-09-04). The event is a drop-in "meet and greet", 1–4 PM, at which he shares
 * history of the Muscogee (Creek) Nation. Free admission, light refreshments.
 *
 * Do NOT confuse him with Chief William McIntosh, the Creek leader who died in 1825 and
 * whose daughter was the subject of July's Croesy McIntosh program. Dr. Gary McIntosh is
 * a living guest; nothing sourced so far states a relationship between them, so this copy
 * does not assert one. If a fuller speaker bio arrives, add it — do not infer it.
 *
 * Separately: an earlier placeholder called "Dr. McIntosh" (board-minutes shorthand, no
 * first name or topic) was once seeded for the unrelated Thursday, September 10 monthly
 * program slot and has since been superseded there by Nicole Williams, PhD (see
 * scripts/seed_fall_winter_2026_events.cjs). This is a separate Saturday afternoon event
 * and does not touch that document.
 *
 * The slug says "roundtable" because that is what the event was called when the
 * placeholder was written. It is a meet and greet. The slug is the public URL and the
 * upsert key, so it is left alone deliberately — changing it would orphan this document
 * rather than rename it.
 *
 * PUBLISHED as of 2026-09-05. It sat as a draft for months precisely because the speaker
 * and topic were unconfirmed; both are now sourced from Hal Sewell's media release. A
 * published post fires the onPostWritten Google Calendar sync in production (see
 * CLAUDE.md), so this document owns a real entry on the SAHS Membership Calendar —
 * changing the title, excerpt, content, location or dates will patch it.
 *
 * The shared mechanics — bucket, upsert on slug, ticketsSold, publishDate-on-create,
 * artwork staging — live in ./lib/seedEvent.cjs.
 */
const { runSeed } = require('./lib/seedEvent.cjs');

const MUSEUM = 'Senoia Area Historical Society, 6 Couch Street, Senoia, GA';

// Written from the media release Hal Sewell sent the board on 2026-09-02, plus the
// Society's own 2024 flyer for this speaker (both in the event folder). Every claim
// traces to one of those two; nothing here is inferred.
//
// Two deliberate wording choices:
//   * "Muscogee (Creek) Nation" — the release says "Muskogee Nation or what is commonly
//     referred to as the Creek Indians". The form used here is the nation's own current
//     styling and matches the board newsletter.
//   * "killed", not "murdered" — the release uses both. The neutral verb is the one the
//     Society should use in its own voice about a contested historical event.
//
// Hal's covering note asked that the Society double-check his facts about SAHS itself.
const CONTENT = `
<p>The Senoia Area Historical Society is pleased to welcome <strong>Dr. Gary McIntosh</strong> back to the museum on <strong>Saturday, September 12</strong> for a special Meet and Greet, from <strong>1:00 to 4:00 PM</strong>. Admission is free and light refreshments will be served.</p>
<p>Dr. McIntosh is the <strong>great-great-great grandson of Chief William McIntosh, Jr.</strong> &mdash; a name that belongs to this county&rsquo;s earliest history as much as to his family&rsquo;s.</p>

<h3>The History</h3>
<p>Chief William McIntosh, Jr. was one of the signers of the <strong>Treaty of Indian Springs</strong> on February 12, 1825. The treaty was drafted to cede Creek land to the American government &mdash; including part of what we know today as Coweta County &mdash; and was later voided.</p>
<p>On April 25, 1825, about two hundred members of the Upper Creek towns, led by <strong>Menawa</strong>, killed Chief McIntosh at his home near what is now Whitesburg, Georgia.</p>

<h3>What to Expect</h3>
<p>Dr. McIntosh will share history of the <strong>Muscogee (Creek) Nation</strong>, and of how its people sought to co-exist with a growing white population. Beyond his presentation there will be time for one-on-one conversation, so that local visitors can get a fuller sense of what was happening in this area in the years leading up to and following the chief&rsquo;s death.</p>
<p>This is an informal, drop-in afternoon rather than a seated program &mdash; come when it suits you, and stay as long as you like.</p>

<h3>A Long Connection to Senoia</h3>
<p>Dr. McIntosh and his wife, Carol, first came to the Senoia museum as visitors in September 2018. He was speaking at the Indian Springs Hotel in Flovilla that weekend and thought that, while they were in the area, it would be interesting to find out what our museum had to offer. With the exception of 2020, the couple has returned every year since. Their 2025 visit came in April, when a large number of Chief McIntosh&rsquo;s descendants gathered to observe the two hundredth anniversary of the chief&rsquo;s death.</p>
<p>Away from this history, Dr. McIntosh is President of the Church Growth Network and Professor of Christian Ministry and Leadership at Talbot School of Theology, Biola University, and the author of twenty-six books.</p>

<h3>Details</h3>
<ul>
  <li><strong>When</strong><br>Saturday, September 12, 2026 &mdash; 1:00 to 4:00 PM</li>
  <li><strong>Where</strong><br>Senoia Area Historical Society &amp; Museum, 6 Couch Street, Senoia, GA 30276</li>
  <li><strong>Admission</strong><br>Free and open to all</li>
  <li><strong>Refreshments</strong><br>Light refreshments will be served</li>
</ul>

<p>Please make your plans to join us in welcoming Dr. McIntosh back to Senoia. For more information about this or any other Society event, email <a href="mailto:info@senoiahistory.com">info@senoiahistory.com</a>.</p>
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
    status: 'published',
    title: 'A Visit with Dr. Gary McIntosh',
    // 1:00 PM EDT. September 12 is before DST ends, so -04:00. `eventDate` is an
    // absolute instant; `eventEndDate` beside it is a NAIVE Eastern wall-clock string of
    // the shape the admin editor produces, which the Calendar request interprets with its
    // own timeZone field — never .toISOString() one of those (see calendarTime.ts).
    // Without the end date the calendar entry gets a default two-hour block and tells
    // members the drop-in closes at 3:00 rather than 4:00.
    eventDate: new Date('2026-09-12T13:00:00-04:00'),
    eventEndDate: '2026-09-12T16:00',
    content: CONTENT,
    excerpt:
      'Join us at the museum on Saturday, September 12 from 1:00 to 4:00 PM to meet Dr. Gary McIntosh, great-great-great grandson of Chief William McIntosh, Jr. He will share history of the Muscogee (Creek) Nation, with time for one-on-one conversation. Free and open to all, with light refreshments.',
    location: MUSEUM,
    galleryImages: [],
    squareImage: null,
    ticketPrice: null,
    capacity: null,
    documentUrl: null,
  },
});
