import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function fixHtml() {
  const postsRef = db.collection('posts');
  const snapshot = await postsRef.where('title', '==', 'Hot Rods for History 2026').get();

  if (snapshot.empty) return;

  const doc = snapshot.docs[0];
  let content = doc.data().content || '';

  // Fix the stray </p> after the widget div
  content = content.replace(/<\/div>\s*<\/p><p>/g, '</div>\n<p>');
  
  // Also fix the start of the widget if it's inside a weird p tag
  content = content.replace(/<br><\/p>\n\n<div/g, '<br></p>\n<div');

  await doc.ref.update({ content });
  console.log('HTML fixed successfully!');
}

fixHtml().catch(console.error);
