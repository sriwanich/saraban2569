const fs = require('fs');
let content = fs.readFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', 'utf8');

content = content.replace(
  /alert\('กรุณาอนุญาต Pop-up เพื่อพิมพ์เอกสาร'\);/,
  `confirm({
        title: 'การแจ้งเตือน',
        message: 'กรุณาอนุญาต Pop-up บนเบราว์เซอร์ของคุณเพื่อพิมพ์เอกสาร',
        type: 'warning',
        confirmText: 'ตกลง',
        cancelText: 'ปิด'
      });`
);

fs.writeFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', content, 'utf8');
