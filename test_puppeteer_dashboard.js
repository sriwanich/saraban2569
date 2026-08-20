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
  
  const loginForm = await page.$('form');
  if (loginForm) {
     console.log('Logging in as admin...');
     await page.evaluate(() => {
        document.querySelector('input[type="text"]').value = 'admin';
        document.querySelector('input[type="password"]').value = '1234';
        document.querySelector('button[type="submit"]').click();
     });
     await new Promise(r => setTimeout(r, 4000));
  }
  
  await browser.close();
})();
