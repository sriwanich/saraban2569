import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  /console\.log\(`\[HTTP_REQ\] \$\{req\.method\} \$\{req\.url\} - IP: \$\{req\.ip\}`\);/,
  '// console.log(`[HTTP_REQ] ${req.method} ${req.url} - IP: ${req.ip}`); // Silenced to prevent user confusion'
);

fs.writeFileSync('server.ts', code);
