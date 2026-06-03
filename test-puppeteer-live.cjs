const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.type(), msg.text());
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  page.on('response', response => {
    // Optionally log failed responses
    if (!response.ok()) {
      console.log('FAILED RESPONSE:', response.status(), response.url());
    }
  });

  await page.goto('https://senoiahistory.com/news', { waitUntil: 'networkidle0' });
  
  // wait a bit for firestore
  await new Promise(r => setTimeout(r, 2000));
  
  const content = await page.evaluate(() => {
    return document.body.innerText;
  });
  
  console.log('BODY CONTENT EXTRACT:\n', content.substring(0, 500));
  
  await browser.close();
})();
