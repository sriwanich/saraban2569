const fs = require('fs');
let content = fs.readFileSync('src/components/views/drafts/AiScanView.tsx', 'utf8');

const t1 = `localStorage.setItem('moi_aiscan_history', JSON.stringify(updated));`;
const r1 = `localStorage.setItem('moi_aiscan_history', JSON.stringify(updated));
          fetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'AI_SCAN_DRAFT',
              details: \`สแกนเอกสารด้วย AI สำเร็จ: \${res.subject || 'เอกสารสแกน'}\`,
              username: \`\${user?.firstName || ''} \${user?.lastName || ''}\`.trim() || user?.username || 'ผู้ใช้งาน'
            })
          }).catch(console.error);`;

content = content.replace(t1, r1);

const t2 = `const handleSendToDraft = () => {    if (!scanResult) return;`;
const r2 = `const handleSendToDraft = () => {
    if (!scanResult) return;
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE_DRAFT',
        details: \`นำผลการสแกน AI ไปสร้างร่างหนังสือ: \${scanResult.subject || 'ร่างเอกสาร'}\`,
        username: \`\${user?.firstName || ''} \${user?.lastName || ''}\`.trim() || user?.username || 'ผู้ใช้งาน'
      })
    }).catch(console.error);`;

content = content.replace(t2, r2);

fs.writeFileSync('src/components/views/drafts/AiScanView.tsx', content);
console.log('Updated AiScanView.tsx');
