const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
/if \(\['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง'\]\.includes\(docType\)\) \{/g,
`if (['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง'].includes(docType)) {`
);

fs.writeFileSync('server.ts', content);
