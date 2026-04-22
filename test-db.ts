import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const app = initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore(app, 'sahs-archives');

async function run() {
  const snapshot = await db.collection('posts').limit(5).get();
  console.log('Docs in sahs-archives DB:', snapshot.size);
}
run();
