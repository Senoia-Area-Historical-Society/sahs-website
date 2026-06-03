import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function run() {
  const snapshot = await db.collection('posts')
    .where('status', '==', 'published')
    .where('type', '==', 'event')
    .get();
    
  console.log(`Found ${snapshot.size} events total.`);
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  let upcoming = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.eventDate && data.eventDate.toDate() >= now) {
      console.log(`Upcoming: ${data.title} | ${data.eventDate.toDate().toISOString()}`);
      upcoming++;
    } else {
        console.log(`Past: ${data.title} | ${data.eventDate ? data.eventDate.toDate().toISOString() : 'no date'}`);
    }
  });
  console.log(`Found ${upcoming} upcoming events.`);
}
run();
