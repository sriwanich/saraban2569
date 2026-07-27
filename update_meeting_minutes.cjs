const fs = require('fs');
let content = fs.readFileSync('src/components/views/drafts/MeetingMinutesView.tsx', 'utf8');

const targetSave = `localStorage.setItem('moi_meetings', JSON.stringify(updated));    alert('บันทึกรายงานการประชุมเรียบร้อยแล้ว');`;

const replaceSave = `localStorage.setItem('moi_meetings', JSON.stringify(updated));
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE_DRAFT',
        details: \`บันทึกร่างรายงานการประชุม ครั้งที่ \${meetingNo}: \${title}\`,
        username: \`\${user?.firstName || ''} \${user?.lastName || ''}\`.trim() || user?.username || 'ผู้ใช้งาน'
      })
    }).catch(console.error);
    alert('บันทึกรายงานการประชุมเรียบร้อยแล้ว');`;

const targetDelete = `const handleDelete = (id: number) => {    if (!confirm('ต้องการลบรายงานการประชุมฉบับนี้ใช่หรือไม่?')) return;    const updated = meetingsHistory.filter(m => m.id !== id);    setMeetingsHistory(updated);    localStorage.setItem('moi_meetings', JSON.stringify(updated));  };`;

const replaceDelete = `const handleDelete = (id: number) => {
    if (!confirm('ต้องการลบรายงานการประชุมฉบับนี้ใช่หรือไม่?')) return;
    const item = meetingsHistory.find(m => m.id === id);
    const updated = meetingsHistory.filter(m => m.id !== id);
    setMeetingsHistory(updated);
    localStorage.setItem('moi_meetings', JSON.stringify(updated));
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

if (content.includes(targetSave)) {
  content = content.replace(targetSave, replaceSave);
  console.log('Updated MeetingMinutesView save');
}

if (content.includes(targetDelete)) {
  content = content.replace(targetDelete, replaceDelete);
  console.log('Updated MeetingMinutesView delete');
}

fs.writeFileSync('src/components/views/drafts/MeetingMinutesView.tsx', content);
