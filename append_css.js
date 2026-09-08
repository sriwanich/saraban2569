import fs from 'fs';
let code = fs.readFileSync('src/index.css', 'utf-8');

if (!code.includes('glass-panel')) {
  // handled already
}
