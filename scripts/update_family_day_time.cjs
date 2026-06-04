#!/usr/bin/env node
// Corrects Family Day post: "10:00 AM to 2:00 PM" → "10:00 AM to 1:00 PM" and similar
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (getApps().length === 0) {
  initializeApp({ projectId: 'sahs-archives' });
}

const db = getFirestore();

async function run() {
  const slug = 'july-3-2026-family-day-seavy-st-park';
  const snap = await db.collection('posts').where('slug', '==', slug).limit(1).get();
  if (snap.empty) { console.error('Post not found'); process.exit(1); }

  const doc = snap.docs[0];
  const data = doc.data();

  const newContent = (data.content || '')
    .replace('10:00 AM to 2:00 PM', '10:00 AM to 1:00 PM')
    .replace('10 AM to 2 PM', '10 AM to 1 PM');

  const newExcerpt = (data.excerpt || '')
    .replace('10:00 AM to 2:00 PM', '10:00 AM to 1:00 PM')
    .replace('10 AM to 2 PM', '10 AM to 1 PM');

  await doc.ref.update({ content: newContent, excerpt: newExcerpt });
  console.log('✓ Time corrected to 1:00 PM in content and excerpt');
}

run().catch(e => { console.error(e); process.exit(1); });
