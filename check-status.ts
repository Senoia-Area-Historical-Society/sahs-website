import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('posts').limit(10).get();
  snapshot.forEach(doc => {
    console.log(doc.id, '| title:', doc.data().title, '| status:', doc.data().status, '| type:', doc.data().type);
  });
}
run();
