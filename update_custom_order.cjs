const fs = require('fs');
let content = fs.readFileSync('src/components/views/drafts/CustomOrderView.tsx', 'utf8');

const oldSave = `    const updated = [newItem, ...customOrders];
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

const newSave = `    const updated = [newItem, ...customOrders];
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

const oldDelete = `  const handleDelete = (id: number) => {
    if (!confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) return;
    const updated = customOrders.filter(o => o.id !== id);
    setCustomOrders(updated);
    localStorage.setItem('moi_custom_orders', JSON.stringify(updated));
  };`;

const newDelete = `  const handleDelete = (id: number) => {
    if (!confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) return;
    const item = customOrders.find(o => o.id === id);
    const updated = customOrders.filter(o => o.id !== id);
    setCustomOrders(updated);
    localStorage.setItem('moi_custom_orders', JSON.stringify(updated));
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'DELETE_DRAFT',
        details: \`ลบร่าง\${item?.doctype === 'order' ? 'คำสั่ง' : 'ประกาศ'}: \${item?.subject || id}\`,
        username: \`\${user?.firstName || ''} \${user?.lastName || ''}\`.trim() || user?.username || 'ผู้ใช้งาน'
      })
    }).catch(console.error);
  };`;

if (content.includes(oldSave)) {
  content = content.replace(oldSave, newSave);
  console.log('Updated CustomOrderView save');
}
if (content.includes(oldDelete)) {
  content = content.replace(oldDelete, newDelete);
  console.log('Updated CustomOrderView delete');
}

fs.writeFileSync('src/components/views/drafts/CustomOrderView.tsx', content);
