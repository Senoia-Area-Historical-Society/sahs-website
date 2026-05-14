import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function updatePost() {
  const postsRef = db.collection('posts');
  const snapshot = await postsRef.where('title', '==', 'Hot Rods for History 2026').get();

  if (snapshot.empty) {
    console.log('No matching post found.');
    return;
  }

  const doc = snapshot.docs[0];
  const postData = doc.data();
  let content = postData.content || '';

  // 1. Extract and remove the widget
  const widgetRegex = /<!-- Ticket Tailor Widget.*?End of Ticket Tailor Widget -->/gs;
  const widgetMatch = content.match(widgetRegex);
  const widget = widgetMatch ? widgetMatch[0] : '';
  content = content.replace(widgetRegex, '');

  // 2. Remove Vendor and Sponsor sections
  // Match Vendor Application paragraph and the following one about setup area/email
  content = content.replace(/<p><strong>Vendor Application<\/strong><\/p>.*?Please contact <a href="mailto:info@senoiahistory.com">info@senoiahistory.com<\/a>&nbsp;for additional information.<\/p>/gs, '');
  
  // Match Sponsor Application paragraph and the following one about levels/email
  content = content.replace(/<p><strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Sponsor Application<\/strong><\/p>.*?Please contact <a href="mailto:info@senoiahistory.com">info@senoiahistory.com<\/a>&nbsp;for additional information.<\/p>/gs, '');

  // 3. Update the Cost line
  content = content.replace(/Show car, vendor and sponsor fees are listed below\./gi, 'Show car registration fee is listed below.');

  // 4. Place the widget at the top
  // I'll place it after the first two paragraphs (intro and car count)
  const paragraphs = content.split('</p>');
  if (paragraphs.length > 2 && widget) {
    // Insert after the second paragraph
    paragraphs.splice(2, 0, `\n\n<div class="mb-8 p-4 bg-tan/5 rounded-lg border border-tan/10 text-center">\n<h3 class="text-xl font-bold mb-4 font-serif">Registration & Tickets</h3>\n${widget}\n</div>\n\n`);
    content = paragraphs.join('</p>');
  } else if (widget) {
    // Fallback: just put it at the top
    content = `<div class="mb-8 p-4 bg-tan/5 rounded-lg border border-tan/10 text-center">\n<h3 class="text-xl font-bold mb-4 font-serif">Registration & Tickets</h3>\n${widget}\n</div>\n\n` + content;
  }

  // Clean up any double spacing created by replacements
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

  await doc.ref.update({ content });
  console.log('Post updated successfully!');
}

updatePost().catch(console.error);
