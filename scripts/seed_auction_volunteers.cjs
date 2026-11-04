/**
 * Creates (or updates) the volunteer sign-up sheet for the 2026 Annual Charity Auction.
 *
 *   node scripts/seed_auction_volunteers.cjs          # local emulator (default)
 *   node scripts/seed_auction_volunteers.cjs --prod   # production Firestore
 *
 * Three openings, four slots each, twelve slots total:
 *   - Friday, Nov 13, 4:00–7:00 PM   (the afternoon before)
 *   - Saturday, Nov 14, 4:00–6:00 PM (auction setup, before the 6:00 PM start)
 *   - Saturday, Nov 14, 8:00–10:00 PM (auction teardown, after the event)
 *
 * The sheet is written as `status: 'draft'`, so the public signup page stays closed
 * until someone flips it to `active` in /admin/volunteers. That is deliberate: the
 * membership email should go out only once the sign-up link works.
 *
 * Upserts on a fixed document id, so a re-run updates the same sheet and slots rather
 * than creating duplicates. A re-run never touches `filledCount` on an existing slot
 * (CLAUDE.md: that counter belongs to the signup transaction), and never rotates the
 * `shareToken` that may already be in an email.
 *
 * No Storage, no Calendar: this is a plain Firestore write, so the emulator/prod split
 * is only about which database receives it.
 */
const fs = require('fs');
const path = require('path');
const { initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

const PROJECT_ID = 'sahs-archives';
const KEY_FILE = path.join(process.env.HOME, '.config/gcloud/sahs-firebase-deploy.json');
const PROD = process.argv.includes('--prod');

const SHEET_ID = 'november-auction-2026-volunteers';
const AUCTION_SLUG = 'november-auction-2026';
const ADMIN_EMAIL = 'jeremywarren@senoiahistory.com';

const SHEET_TITLE = '2026 Annual Charity Auction Volunteers';
const SHEET_DESCRIPTION =
  'The Annual Charity Auction is the largest fundraiser of the year, and it runs on volunteers. ' +
  'Pick a shift below: we need help on Friday afternoon before the auction, setting up on Saturday, ' +
  'and cleaning up that night. Each slot is one volunteer; sign up for as many as you can help with.';

/** Each opening: a time window shown to volunteers, and four identical slots under it. */
const OPENINGS = [
  {
    key: 'friday',
    label: 'Friday afternoon set-up help',
    timeNote: 'Friday, Nov 13 · 4:00 PM – 7:00 PM',
    shiftDuration: '3 hours',
  },
  {
    key: 'setup',
    label: 'Auction set-up',
    timeNote: 'Saturday, Nov 14 · 4:00 PM – 6:00 PM',
    shiftDuration: '2 hours',
  },
  {
    key: 'teardown',
    label: 'Auction tear-down',
    timeNote: 'Saturday, Nov 14 · 8:00 PM – 10:00 PM',
    shiftDuration: '2 hours',
  },
];
const SLOTS_PER_OPENING = 4;

if (!PROD) process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

// The emulator needs no credential, and passing an undefined one is rejected.
initializeApp({
  projectId: PROJECT_ID,
  ...(PROD && {
    credential: fs.existsSync(KEY_FILE) ? cert(require(KEY_FILE)) : applicationDefault(),
  }),
});
const db = getFirestore();

/** Build the slot documents for every opening, numbered in display order. */
function buildSlots() {
  const slots = [];
  let sortOrder = 0;
  for (const opening of OPENINGS) {
    for (let n = 1; n <= SLOTS_PER_OPENING; n++) {
      sortOrder += 1;
      slots.push({
        id: `${opening.key}-${n}`,
        data: {
          sheetId: SHEET_ID,
          label: `${opening.label} (${n} of ${SLOTS_PER_OPENING})`,
          timeNote: opening.timeNote,
          shiftDuration: opening.shiftDuration,
          capacity: 1,
          sortOrder,
        },
      });
    }
  }
  return slots;
}

async function main() {
  console.log(`${PROD ? '🚀 PRODUCTION' : '🌱 Emulator'} — seeding auction volunteer sheet…`);

  // Link to the auction post (eventPostId, date and location denormalized, as the admin
  // UI does). If the post is not seeded yet, the sheet is still created without the link.
  const postSnap = await db.collection('posts').where('slug', '==', AUCTION_SLUG).limit(1).get();
  const post = postSnap.empty ? null : { id: postSnap.docs[0].id, ...postSnap.docs[0].data() };
  if (!post) console.warn(`  ⚠️  no post with slug "${AUCTION_SLUG}" — creating the sheet unlinked`);

  const sheetRef = db.collection('volunteer_sheets').doc(SHEET_ID);
  const existing = await sheetRef.get();

  const sheetFields = {
    title: SHEET_TITLE,
    description: SHEET_DESCRIPTION,
    eventPostId: post ? post.id : null,
    eventDate: post?.eventDate ?? null,
    eventLocation: post?.location ?? null,
    updatedAt: Timestamp.fromDate(new Date()),
  };

  if (existing.exists) {
    // Keep status and shareToken as they are: an admin may already have opened the sheet.
    await sheetRef.update(sheetFields);
    console.log(`  ↻ updated existing sheet ${SHEET_ID} (status and share link unchanged)`);
  } else {
    await sheetRef.set({
      ...sheetFields,
      status: 'draft',
      shareToken: Math.random().toString(36).substring(2, 10),
      createdBy: ADMIN_EMAIL,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`  ✅ created sheet ${SHEET_ID} as draft`);
  }

  // Upsert slots by fixed id. Only the descriptive fields are written; `filledCount` is
  // set on create alone, so a re-run cannot erase a real signup count.
  const batch = db.batch();
  for (const { id, data } of buildSlots()) {
    const slotRef = sheetRef.collection('slots').doc(id);
    const slotSnap = await slotRef.get();
    if (slotSnap.exists) {
      batch.update(slotRef, data);
    } else {
      batch.set(slotRef, { ...data, filledCount: 0 });
    }
  }
  await batch.commit();
  console.log(`  ✅ ${OPENINGS.length * SLOTS_PER_OPENING} slots written (${OPENINGS.length} openings × ${SLOTS_PER_OPENING})`);
  console.log(`  Next: open /admin/volunteers, review, and set status to active when the email goes out.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
