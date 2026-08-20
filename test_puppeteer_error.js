import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  // Try to login as root
  const loginForm = await page.$('form');
  if (loginForm) {
     console.log('Logging in as admin...');
     await page.type('input[type="text"]', 'admin');
     await page.type('input[type="password"]', '1234');
     await page.click('button[type="submit"]');
     await new Promise(r => setTimeout(r, 3000));
  }
  
  await browser.close();
})();
