const fs = require('fs');
let content = fs.readFileSync('src/components/views/Settings.tsx', 'utf8');

// Remove the UI element
content = content.replace(
/<div className="space-y-2">\s*<label className="text-sm text-\[var\(--text-secondary\)\]">เลขที่รับ\/ส่งหนังสือเริ่มต้น.*?<\/div>/s,
''
);

fs.writeFileSync('src/components/views/Settings.tsx', content);
