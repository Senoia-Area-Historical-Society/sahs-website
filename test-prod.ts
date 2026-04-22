import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('posts').limit(5).get();
  if (snapshot.empty) {
    console.log('No posts in prod.');
  } else {
    snapshot.forEach(doc => console.log(doc.id, '=>', doc.data().title, '| type:', doc.data().type, '| status:', doc.data().status));
  }
}
run();
