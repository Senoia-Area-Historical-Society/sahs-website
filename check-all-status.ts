import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('posts').get();
  let published = 0;
  snapshot.forEach(doc => {
    if (doc.data().status === 'published') published++;
  });
  console.log('Total posts:', snapshot.size);
  console.log('Published posts:', published);
}
run();
