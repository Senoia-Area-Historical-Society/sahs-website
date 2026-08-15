#!/usr/bin/env node
/**
 * One-off cleanup: remove editor-only `_`-prefixed fields from `posts` documents.
 *
 * Background — ContentAdmin's save mapper deletes `_enableTicketing`,
 * `_ticketPriceDisplay` and `_enableVolunteer` before writing, but until PR #24 those
 * deletes lived inside an `if (isEvent)` branch. Every News and Blog post saved through
 * the editor therefore persisted editor UI state into Firestore. The code no longer
 * writes them, but `updateDoc` merges, so documents that already carry the fields keep
 * them until something explicitly removes them. That is what this script does.
 *
 * The fields are pure UI state and nothing reads them — `buildEditorState` derives the
 * toggles from `ticketPrice` and `volunteerSheetId`, never from these keys. Removing
 * them cannot change how any post renders.
 *
 * SAFETY: dry-run is the DEFAULT. Nothing is written unless you pass --apply. This
 * inverts the `--dry-run` opt-in used by scripts/backfill_resend_members.cjs, on purpose:
 * that script upserts and is idempotent, this one deletes fields.
 *
 * Usage:
 *   # 1. See exactly what would change (writes nothing):
 *   node scripts/strip_editor_fields.cjs
 *
 *   # 2. Apply for real:
 *   node scripts/strip_editor_fields.cjs --apply
 *
 * Against the emulator instead of production:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/strip_editor_fields.cjs --apply
 *
 * Production credentials come from ADC, same as scripts/sync-board-sponsors.ts:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/sahs-firebase-deploy.json
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const FIELDS = ['_enableTicketing', '_ticketPriceDisplay', '_enableVolunteer'];
const APPLY = process.argv.includes('--apply');
const BATCH_LIMIT = 400; // Firestore caps a batch at 500 writes; leave headroom.

const target = process.env.FIRESTORE_EMULATOR_HOST
  ? `emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`
  : 'PRODUCTION (sahs-archives, default database)';

try {
  initializeApp({ projectId: 'sahs-archives' });
} catch (err) {
  console.error('Firebase Admin initialization failed:', err.message);
  process.exit(1);
}

const db = getFirestore();

async function main() {
  console.log(`Target:  ${target}`);
  console.log(`Mode:    ${APPLY ? 'APPLY — fields will be deleted' : 'DRY RUN — nothing will be written'}`);
  console.log(`Fields:  ${FIELDS.join(', ')}\n`);

  const snapshot = await db.collection('posts').get();
  console.log(`Scanned ${snapshot.size} post${snapshot.size === 1 ? '' : 's'}.\n`);

  const affected = snapshot.docs
    .map(doc => {
      const data = doc.data();
      const present = FIELDS.filter(f => Object.prototype.hasOwnProperty.call(data, f));
      return { doc, present, title: data.title || '(untitled)', category: data.category || data.type || '?' };
    })
    .filter(entry => entry.present.length > 0);

  if (affected.length === 0) {
    console.log('Nothing to clean up — no post carries these fields.');
    return;
  }

  for (const { doc, present, title, category } of affected) {
    console.log(`  ${doc.id}  [${category}]  ${title}`);
    console.log(`      removing: ${present.join(', ')}`);
  }

  console.log(`\n${affected.length} post${affected.length === 1 ? '' : 's'} would be updated.`);

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write these changes.');
    return;
  }

  let written = 0;
  for (let i = 0; i < affected.length; i += BATCH_LIMIT) {
    const chunk = affected.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    for (const { doc, present } of chunk) {
      // Delete ONLY the keys this document actually has, and touch nothing else.
      const update = {};
      for (const field of present) update[field] = FieldValue.delete();
      batch.update(doc.ref, update);
    }
    await batch.commit();
    written += chunk.length;
    console.log(`Committed ${written}/${affected.length}...`);
  }

  console.log(`\nDone. Cleaned ${written} post${written === 1 ? '' : 's'}.`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\nFailed:', err);
    process.exit(1);
  });
