import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('posts').limit(10).get();
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(doc.id, '| title:', data.title, '| publishDate:', data.publishDate ? 'exists' : 'MISSING', '| eventDate:', data.eventDate ? 'exists' : 'MISSING');
  });
}
run();
