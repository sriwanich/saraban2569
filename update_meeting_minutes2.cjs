const fs = require('fs');
let content = fs.readFileSync('src/components/views/drafts/MeetingMinutesView.tsx', 'utf8');

const t1 = `localStorage.setItem('moi_meetings', JSON.stringify(updated));`;

content = content.replace(t1, `localStorage.setItem('moi_meetings', JSON.stringify(updated));
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE_DRAFT',
        details: \`บันทึกร่างรายงานการประชุม ครั้งที่ \${meetingNo}: \${title}\`,
        username: \`\${user?.firstName || ''} \${user?.lastName || ''}\`.trim() || user?.username || 'ผู้ใช้งาน'
      })
    }).catch(console.error);`);

const t2 = `const handleDelete = (id: number) => {`;
const r2 = `const handleDelete = (id: number) => {
    const item = meetingsHistory.find(m => m.id === id);`;

content = content.replace(t2, r2);

const t3 = `localStorage.setItem('moi_meetings', JSON.stringify(updated));  };`;
const r3 = `localStorage.setItem('moi_meetings', JSON.stringify(updated));
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'DELETE_DRAFT',
        details: \`ลบร่างรายงานการประชุม: \${item?.title || id}\`,
        username: \`\${user?.firstName || ''} \${user?.lastName || ''}\`.trim() || user?.username || 'ผู้ใช้งาน'
      })
    }).catch(console.error);
  };`;

content = content.replace(t3, r3);

fs.writeFileSync('src/components/views/drafts/MeetingMinutesView.tsx', content);
console.log('Updated MeetingMinutesView.tsx');
