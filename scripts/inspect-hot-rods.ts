import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function inspectAndUpdatePost() {
  const postsRef = db.collection('posts');
  const snapshot = await postsRef.where('title', '==', 'Hot Rods for History 2026').get();

  if (snapshot.empty) {
    console.log('No matching post found.');
    return;
  }

  const doc = snapshot.docs[0];
  const postData = doc.data();
  let content = postData.content || '';
  console.log('Full Content:', content);
}

inspectAndUpdatePost().catch(console.error);
