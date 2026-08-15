const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
    <script src="https://cdn.jsdelivr.net/npm/fabric@6.4.3/dist/index.min.js"></script>
    </head>
    <body>
    <canvas id="c" width="400" height="400"></canvas>
    <script>
    window.testFabric = () => {
      try {
        const canvas = new fabric.Canvas('c');
        const r1 = new fabric.Rect({ left: 10, top: 10, width: 50, height: 50, fill: 'red' });
        const r2 = new fabric.Rect({ left: 100, top: 10, width: 50, height: 50, fill: 'blue' });
        canvas.add(r1, r2);
        const sel = new fabric.ActiveSelection([r1, r2], { canvas });
        canvas.setActiveObject(sel);
        
        console.log("type:", canvas.getActiveObject().type);
        
        const activeObj = canvas.getActiveObject();
        const objects = activeObj.getObjects();
        
        console.log("R1 pos:", r1.left, r1.top);
        
        canvas.discardActiveObject();
        const group = new fabric.Group(objects);
        objects.forEach(obj => canvas.remove(obj));
        canvas.add(group);
        canvas.setActiveObject(group);
        
        console.log("group pos:", group.left, group.top);
        
        const groupObjects = group.getObjects();
        console.log("R1 in group pos:", groupObjects[0].left, groupObjects[0].top);
        
        return "success";
      } catch (e) {
        return e.message;
      }
    };
    </script>
    </body>
    </html>
  `);
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  const result = await page.evaluate(() => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(window.testFabric());
      }, 500);
    });
  });
  
  console.log('Result:', result);
  await browser.close();
})();
