#!/usr/bin/env node
/**
 * One-off migration: normalize `type: 'news'` documents to `type: 'event'`.
 *
 * Background — the news/event split is gone. Every read path now partitions posts
 * by date instead of by type (`getEventsSplit`), and the editor writes
 * `type: 'event'` on every save. The field is dead weight on the ~16 documents
 * that predate the change; this script brings them in line so nothing in the
 * collection still claims to be a different kind of thing.
 *
 * Nothing about the public site depends on running this — the pages render
 * identically before and after. It exists to stop `type` from being a
 * two-valued field that lies about half its rows.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ORDER MATTERS. Deploy the hardened `onPostWritten` FIRST.
 *
 * `onPostWritten` fires on every write to `posts/{id}` and syncs anything of
 * `type: 'event'` to the public SAHS Google Calendar. Its insert path is gated
 * only on the post lacking a `googleCalendarEventId`, so flipping the type on an
 * old document looks exactly like publishing a brand-new event. Three of these
 * documents carry a stale `eventDate`:
 *
 *   Coweta Community Foundation Grant      2023-12-21
 *   Carmichael Initiative Ribbon Cutting   2024-01-13
 *   Meeting Room Rental                    2024-03-07
 *
 * Run against production before `isLongPast` is live and those three land on the
 * calendar as years-old entries you then have to delete by hand. With the guard
 * deployed the trigger logs "event already past" and skips them.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SAFETY: dry-run is the DEFAULT, matching scripts/strip_editor_fields.cjs.
 * Nothing is written unless you pass --apply.
 *
 * Usage:
 *   # 1. See exactly what would change (writes nothing):
 *   node scripts/migrate_news_to_event.cjs
 *
 *   # 2. Apply for real:
 *   node scripts/migrate_news_to_event.cjs --apply
 *
 * Against the emulator instead of production:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/migrate_news_to_event.cjs --apply
 *
 * Production credentials come from ADC:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sahs-firebase-deploy.json
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const APPLY = process.argv.includes('--apply');
const EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST;

initializeApp(
  EMULATOR
    ? { projectId: process.env.GCLOUD_PROJECT || 'sahs-archives' }
    : { credential: applicationDefault(), projectId: 'sahs-archives' }
);
const db = getFirestore();

const iso = (ts) => (ts && ts.toDate ? ts.toDate().toISOString().slice(0, 10) : null);

async function main() {
  console.log(`Target: ${EMULATOR ? `emulator (${process.env.FIRESTORE_EMULATOR_HOST})` : 'PRODUCTION (sahs-archives)'}`);
  console.log(`Mode:   ${APPLY ? 'APPLY — documents will be written' : 'dry run — nothing will be written'}\n`);

  const snap = await db.collection('posts').where('type', '==', 'news').get();

  if (snap.empty) {
    console.log('No documents with type: "news" remain. Nothing to do.');
    return;
  }

  // Documents carrying a stale eventDate are the ones the calendar trigger would
  // act on, so call them out individually rather than burying them in the count.
  const dated = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    const line = `  ${doc.id.padEnd(22)} eventDate=${String(iso(d.eventDate)).padEnd(11)} publishDate=${String(iso(d.publishDate)).padEnd(11)} ${d.title}`;
    if (d.eventDate) dated.push(line); else console.log(line);
  }

  if (dated.length) {
    console.log(`\n  ${dated.length} of these carry an eventDate — onPostWritten will evaluate them:`);
    dated.forEach((l) => console.log(l));
    console.log('  (With the hardened trigger deployed these are skipped as "event already past".)');
  }

  console.log(`\n${snap.size} document(s) would be set to type: "event".`);

  if (!APPLY) {
    console.log('\nDry run — nothing written. Re-run with --apply to migrate.');
    return;
  }

  // Firestore caps a batch at 500 writes; this collection is ~100 documents, but
  // chunk anyway so the script does not quietly break if it is reused later.
  const CHUNK = 400;
  let written = 0;
  for (let i = 0; i < snap.docs.length; i += CHUNK) {
    const batch = db.batch();
    for (const doc of snap.docs.slice(i, i + CHUNK)) {
      batch.update(doc.ref, { type: 'event' });
    }
    await batch.commit();
    written += Math.min(CHUNK, snap.docs.length - i);
  }

  console.log(`\nMigrated ${written} document(s) to type: "event".`);
  console.log('Check the Cloud Functions log for "event already past" lines confirming the calendar was left alone.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
