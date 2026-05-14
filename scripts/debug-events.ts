import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

try {
  initializeApp({
    projectId: 'sahs-archives'
  });
} catch (e) {
  // Already initialized
}

const db = getFirestore();

async function checkEvents() {
  const collectionRef = db.collection('posts');
  const snapshot = await collectionRef.get();

  console.log(`Analyzing ${snapshot.size} posts...`);
  const now = new Date();
  let eventsCount = 0;
  let publishedEvents = 0;
  let pastPublishedEvents = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.type === 'event') {
      eventsCount++;
      if (data.status === 'published') {
        publishedEvents++;
        
        const eventDate = data.eventDate ? (data.eventDate.toDate ? data.eventDate.toDate() : new Date(data.eventDate)) : null;
        const isPast = !eventDate || eventDate < now;
        
        if (isPast) {
          pastPublishedEvents++;
          console.log(`[PAST EVENT] Title: ${data.title}, Date: ${eventDate ? eventDate.toISOString() : 'MISSING'}, Status: ${data.status}`);
        } else {
          console.log(`[FUTURE EVENT] Title: ${data.title}, Date: ${eventDate ? eventDate.toISOString() : 'MISSING'}, Status: ${data.status}`);
        }
      }
    }
  });

  console.log('\nSummary:');
  console.log(`Total Events: ${eventsCount}`);
  console.log(`Published Events: ${publishedEvents}`);
  console.log(`Past Published Events: ${pastPublishedEvents}`);
}

checkEvents().catch(console.error);
