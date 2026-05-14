import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({ projectId: 'sahs-archives' });
const db = getFirestore();

async function findAndUpdatePost() {
  const postsRef = db.collection('posts');
  const snapshot = await postsRef.where('title', '==', 'Hot Rods for History 2026').get();

  if (snapshot.empty) {
    console.log('No matching post found.');
    return;
  }

  const doc = snapshot.docs[0];
  const postData = doc.data();
  let content = postData.content || '';
  console.log('Found post:', doc.id, postData.title);
  
  const ticketTailorWidget = `<!-- Ticket Tailor Widget. Paste this into your website where you want the widget to appear. Do not change the code or the widget may not work properly. -->
<div class="tt-widget"><div class="tt-widget-fallback"><p><a href="https://www.tickettailor.com/checkout/new-session/id/7719057/chk/265e/?ref=sahs-website&show_event_filter=false" target="_blank">Click here to buy tickets</a><br /><small><a href="https://www.tickettailor.com?rf=wdg_136839" class="tt-widget-powered">Sell tickets online with Ticket Tailor</a></small></p></div><script src="https://cdn.tickettailor.com/js/widgets/min/widget.js" data-url="https://www.tickettailor.com/checkout/new-session/id/7719057/chk/265e/?ref=sahs-website&show_event_filter=false" data-type="inline" data-inline-minimal="true" data-inline-show-logo="false" data-inline-bg-fill="false" data-inline-inherit-ref-from-url-param="" data-inline-ref="sahs-website"></script></div><!-- End of Ticket Tailor Widget -->`;

  // 1. Remove existing widget if any (to avoid duplicates)
  const widgetRegex = /<!-- Ticket Tailor Widget.*?End of Ticket Tailor Widget -->/gs;
  content = content.replace(widgetRegex, '');

  // 2. Try to replace the "Purchase tickets below" text
  const variations = [
    /Purchase <a[^>]*><strong>tickets<\/strong><\/a> below\.?/gi,
    /<a[^>]*>purchase tickets below<\/a>/gi,
    /purchase tickets below/gi,
    /<p[^>]*>purchase tickets below<\/p>/gi
  ];

  let found = false;
  for (const regex of variations) {
    if (regex.test(content)) {
      console.log('Found match for:', regex);
      content = content.replace(regex, ticketTailorWidget);
      found = true;
      break; // Only replace the first one
    }
  }

  if (!found) {
    console.log('Could not find exact text "purchase tickets below". Adding to the bottom.');
    content += `\n\n${ticketTailorWidget}`;
  }

  await doc.ref.update({ content });
  console.log('Post updated successfully!');
}

findAndUpdatePost().catch(console.error);
