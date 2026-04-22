import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore('sahs-archives');

async function run() {
  const snapshot = await db.collection('posts').where('title', '==', 'April 2026 Program').get();
  if (snapshot.empty) {
    console.log('April 2026 Program NOT found in sahs-archives database.');
  } else {
    console.log('April 2026 Program FOUND in sahs-archives database.');
  }
}
run();
