const fs = require('fs');
let content = fs.readFileSync('src/components/views/drafts/CustomOrderView.tsx', 'utf8');

const target = `    const updated = [newItem, ...customOrders];
    setCustomOrders(updated);
    localStorage.setItem('moi_custom_orders', JSON.stringify(updated));
    if (onSendToSignQueue) {
      onSendToSignQueue({
        id: Date.now(),
        date: signDate,
        type: docType,
        subject,
        proposer: user?.firstName || 'ผู้ดูแลระบบ',
        status: 'รอลงนาม'
      });
    }
    alert('บันทึกคำสั่ง/ประกาศเรียบร้อยแล้ว');`;

const replacement = `    const updated = [newItem, ...customOrders];
    setCustomOrders(updated);
    localStorage.setItem('moi_custom_orders', JSON.stringify(updated));

    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE_DRAFT',
        details: \`บันทึกร่าง\${docType === 'order' ? 'คำสั่ง' : 'ประกาศ'}: \${subject}\`,
        username: \`\${user?.firstName || ''} \${user?.lastName || ''}\`.trim() || user?.username || 'ผู้ใช้งาน'
      })
    }).catch(console.error);

    if (onSendToSignQueue) {
      onSendToSignQueue({
        id: Date.now(),
        date: signDate,
        type: docType,
        subject,
        proposer: user?.firstName || 'ผู้ดูแลระบบ',
        status: 'รอลงนาม'
      });
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_DRAFT_TO_SIGN',
          details: \`ส่งร่าง\${docType === 'order' ? 'คำสั่ง' : 'ประกาศ'}เสนอลงนาม: \${subject}\`,
          username: \`\${user?.firstName || ''} \${user?.lastName || ''}\`.trim() || user?.username || 'ผู้ใช้งาน'
        })
      }).catch(console.error);
    }
    alert('บันทึกคำสั่ง/ประกาศเรียบร้อยแล้ว');`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/views/drafts/CustomOrderView.tsx', content);
  console.log('Successfully updated CustomOrderView save block');
} else {
  console.log('Target not found');
}
