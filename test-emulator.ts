import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('posts').limit(5).get();
  if (snapshot.empty) {
    console.log('No posts in emulator.');
  } else {
    snapshot.forEach(doc => console.log(doc.id, '=>', doc.data().title, '| type:', doc.data().type, '| status:', doc.data().status));
  }
}
run();
