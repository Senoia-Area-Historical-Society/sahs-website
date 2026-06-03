import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'sahs-archives' });

const TEST_EVENT_ID = '6988b8d83b6dfa5f0598a119';
const FAMILY_DAY_SLUG = 'july-3-2026-family-day-seavy-st-park';
const FAMILY_DAY_TITLE = 'Family Day at Seavy St. Park';

async function cleanDatabase(dbName: string, db: any) {
  // Delete test event
  const testRef = db.collection('posts').doc(TEST_EVENT_ID);
  const testSnap = await testRef.get();
  if (testSnap.exists) {
    await testRef.delete();
    console.log(`🗑️  [${dbName}] Deleted test event: "${testSnap.data().title}"`);
  } else {
    console.log(`⚠️  [${dbName}] Test event not found`);
  }

  // Fix Family Day title
  const familyRef = db.collection('posts').doc(FAMILY_DAY_SLUG);
  const familySnap = await familyRef.get();
  if (familySnap.exists) {
    await familyRef.update({ title: FAMILY_DAY_TITLE });
    console.log(`✏️  [${dbName}] Updated Family Day title → "${FAMILY_DAY_TITLE}"`);
  } else {
    console.log(`⚠️  [${dbName}] Family Day post not found`);
  }
}

async function run() {
  const defaultDb = getFirestore();
  await cleanDatabase('(default)', defaultDb);

  const namedDb = getFirestore('sahs-archives');
  await cleanDatabase('sahs-archives', namedDb);

  console.log('\n✅ Done');
}

run().catch(console.error);
