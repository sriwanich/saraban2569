const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Fix line 15174
content = content.replace(
  /const sentences = content\.trim\(\)\.split\(\/\[\\n\* ห้ามตอบอย่างอื่นนอกจากโค้ด JSON \(ห้ามมี markdown \`\`\`json\)\`;/g,
  "const sentences = content.trim().split(/[\\\\n\\\\r]+/);"
);

fs.writeFileSync('server.ts', content, 'utf8');
