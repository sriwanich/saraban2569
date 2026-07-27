const fs = require('fs');
let content = fs.readFileSync('src/components/views/drafts/CustomOrderView.tsx', 'utf8');

const target = `localStorage.setItem('moi_custom_orders', JSON.stringify(updated));`;

const replacement = `localStorage.setItem('moi_custom_orders', JSON.stringify(updated));
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE_DRAFT',
        details: \`บันทึกร่าง\${docType === 'order' ? 'คำสั่ง' : 'ประกาศ'}: \${subject}\`,
        username: \`\${user?.firstName || ''} \${user?.lastName || ''}\`.trim() || user?.username || 'ผู้ใช้งาน'
      })
    }).catch(console.error);`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
}

const target2 = `status: 'รอลงนาม'      });    }`;

const replacement2 = `status: 'รอลงนาม'      });
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_DRAFT_TO_SIGN',
          details: \`ส่งร่าง\${docType === 'order' ? 'คำสั่ง' : 'ประกาศ'}เสนอลงนาม: \${subject}\`,
          username: \`\${user?.firstName || ''} \${user?.lastName || ''}\`.trim() || user?.username || 'ผู้ใช้งาน'
        })
      }).catch(console.error);
    }`;

if (content.includes(target2)) {
  content = content.replace(target2, replacement2);
}

fs.writeFileSync('src/components/views/drafts/CustomOrderView.tsx', content);
console.log('Updated CustomOrderView');
