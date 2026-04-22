import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function run() {
  const now = new Date();
  const snapshot = await db.collection('posts')
    .where('type', '==', 'event')
    .where('eventDate', '<', now)
    .get();
  console.log('Total past events:', snapshot.size);
}
run();
