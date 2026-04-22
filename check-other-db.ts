import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore('sahs-archives');

async function run() {
  try {
    const snapshot = await db.collection('posts').count().get();
    console.log('Database sahs-archives Posts count:', snapshot.data().count);
  } catch (err) {
    console.error('Error checking sahs-archives:', err.message);
  }
}
run();
