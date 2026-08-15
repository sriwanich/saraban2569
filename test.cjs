const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body><canvas id="c"></canvas></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;

import('node-fetch').then(m => m.default('https://cdn.jsdelivr.net/npm/fabric@6.4.3/dist/index.js'))
.then(res => res.text())
.then(text => {
  eval(text);
  const canvas = new fabric.Canvas('c');
  const r1 = new fabric.Rect({ left: 10, top: 10, width: 50, height: 50, fill: 'red' });
  const r2 = new fabric.Rect({ left: 100, top: 10, width: 50, height: 50, fill: 'blue' });
  canvas.add(r1, r2);
  const sel = new fabric.ActiveSelection([r1, r2], { canvas });
  canvas.setActiveObject(sel);
  
  console.log("active object:", canvas.getActiveObject().type);
  
  // Fabric 6 way to group:
  if (canvas.getActiveObject().toGroup) {
      console.log('has toGroup');
  } else {
      console.log('no toGroup, trying new fabric.Group(objects)');
      
      const objects = sel.getObjects();
      
      // Look at Group constructor properties
      console.log('sel.left:', sel.left, 'sel.top:', sel.top);
      
      canvas.discardActiveObject();
      const group = new fabric.Group(objects);
      canvas.add(group);
      
      console.log('group.left:', group.left, 'group.top:', group.top);
      console.log('r1 left in group:', r1.left, 'r1 top:', r1.top);
  }
});
