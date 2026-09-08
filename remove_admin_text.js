import fs from 'fs';
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

code = code.replace(
  /\{currentUser\?\.role !== 'admin' && <p className="text-\[10px\] text-\[var\(--text-muted\)\] mt-1">\* เฉพาะผู้ดูแลระบบ \(Admin\) เท่านั้นที่สามารถแก้ไขข้อมูลตำแหน่งได้<\/p>\}/g,
  ''
);

code = code.replace(
  /\{currentUser\?\.role !== 'admin' && <p className="text-\[10px\] text-\[var\(--text-muted\)\] mt-1">\* เฉพาะผู้ดูแลระบบ \(Admin\) เท่านั้นที่สามารถแก้ไขข้อมูลฝ่ายงานได้<\/p>\}/g,
  ''
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
