const fs = require('fs');
let content = fs.readFileSync('src/components/CustomNumberingSettings.tsx', 'utf8');

content = content.replace(
/return previewDocType === 'คำสั่ง' \? 'คำสั่ง 1\/2569' : 'รย 0021\/1';/g,
`return ['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง'].includes(previewDocType) ? \`\${previewDocType} 1/2569\` : 'รย 0021/1';`
);

fs.writeFileSync('src/components/CustomNumberingSettings.tsx', content);
