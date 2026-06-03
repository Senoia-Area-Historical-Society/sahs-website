import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const useEmulator = process.env.FIRESTORE_EMULATOR_HOST || process.env.USE_EMULATOR === 'true';

if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  console.log('🔌 Running on local Firestore emulator...');
} else {
  console.log('🌍 Running on production Firestore database...');
}

initializeApp({ projectId: 'sahs-archives' });

const SLUG = 'july-4th-extravaganza-2026';

async function deleteFromDatabase(dbName: string, db: any) {
  const ref = db.collection('posts').doc(SLUG);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log(`⚠️  [${dbName}] Doc not found: ${SLUG}`);
    return;
  }
  await ref.delete();
  console.log(`🗑️  Deleted [${SLUG}] from [${dbName}]`);
}

async function run() {
  const defaultDb = getFirestore();
  await deleteFromDatabase('(default)', defaultDb);

  const namedDb = getFirestore('sahs-archives');
  await deleteFromDatabase('sahs-archives', namedDb);
}

run().catch(console.error);
