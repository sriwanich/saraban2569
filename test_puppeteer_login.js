import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  // Try to see if login form exists
  const loginForm = await page.$('form');
  if (loginForm) {
     console.log('Found login form, trying to login as root/1234...');
     await page.type('input[type="text"]', 'root');
     await page.type('input[type="password"]', '1234');
     await page.click('button[type="submit"]');
     await new Promise(r => setTimeout(r, 2000));
  } else {
     console.log('No login form found.');
  }

  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
