import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  // Track errors
  let hasError = false;
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR LOG:', msg.text());
      hasError = true;
    }
  });
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
    hasError = true;
  });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  // Login
  const loginForm = await page.$('form');
  if (loginForm) {
     console.log('Logging in as sriwanich...');
     await page.type('input[type="text"]', 'sriwanich');
     await page.type('input[type="password"]', '1234');
     await page.click('button[type="submit"]');
     await new Promise(r => setTimeout(r, 4000));
  }
  
  // Check if we are in Dashboard
  const tabs = ['inbox', 'outbox', 'circular', 'internal', 'admin', 'infographics'];
  for (const tab of tabs) {
     console.log('Clicking tab:', tab);
     const tabElements = await page.$$('button');
     for (const el of tabElements) {
         const text = await el.evaluate(e => e.textContent);
         if (text && text.toLowerCase().includes(tab)) {
             try { await el.click(); } catch(e) {}
         }
     }
     await new Promise(r => setTimeout(r, 2000));
  }
  
  await browser.close();
})();
