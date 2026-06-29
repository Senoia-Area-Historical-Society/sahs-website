import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: npx tsx unpublish-post.ts <slug>');
  process.exit(1);
}

initializeApp({
  credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS || `${process.env.HOME}/.config/gcloud/sahs-firebase-deploy.json`),
  projectId: 'sahs-archives'
});

const db = getFirestore();

async function main() {
  const snap = await db.collection('posts').where('slug', '==', slug).limit(1).get();
  if (snap.empty) {
    console.error(`No post found with slug: ${slug}`);
    process.exit(1);
  }

  const doc = snap.docs[0];
  console.log(`Found post: "${doc.data().title}" (${doc.id}) — status: ${doc.data().status}`);
  await doc.ref.update({ status: 'draft' });
  console.log('Post unpublished (status set to draft).');
}

main().catch(e => { console.error(e); process.exit(1); });
