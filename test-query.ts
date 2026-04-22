import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function run() {
  const q = db.collection('posts')
    .where('type', '==', 'news')
    .orderBy('publishDate', 'desc')
    .limit(5);

  const snapshot = await q.get();
  if (snapshot.empty) {
    console.log('No news posts returned by query.');
  } else {
    snapshot.forEach(doc => console.log(doc.id, '=>', doc.data().title, '| publishDate:', doc.data().publishDate?.toDate()));
  }
}
run();
