import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('posts').get();
  let nullPublishDate = 0;
  let total = 0;
  snapshot.forEach(doc => {
    total++;
    if (!doc.data().publishDate) nullPublishDate++;
  });
  console.log('Total posts:', total);
  console.log('Posts with missing/null publishDate:', nullPublishDate);
}
run();
