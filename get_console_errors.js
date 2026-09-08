import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`BROWSER_LOG [${msg.type()}]:`, msg.text());
      }
    });

    page.on('pageerror', error => {
      console.log('PAGE_ERROR:', error.message);
    });

    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    
    // Set a dummy user to bypass login and load Dashboard
    await page.evaluate(() => {
      localStorage.setItem('edms_user_data', JSON.stringify({
        id: 1,
        username: 'admin',
        role: 'admin',
        firstName: 'Test',
        lastName: 'Admin'
      }));
    });
    
    // Reload to apply login
    await page.reload({ waitUntil: 'domcontentloaded' });
    
    await new Promise(r => setTimeout(r, 4000));
    
    await browser.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
