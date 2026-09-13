const fs = require('fs');
let content = fs.readFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', 'utf8');

// Replace standard alerts with confirm
content = content.replace(
  /alert\('กรุณาระบุสถานที่เกิดภัยและวันที่รายงาน'\);/,
  `await confirm({
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณาระบุสถานที่เกิดภัยและวันที่รายงาน',
        type: 'warning',
        confirmText: 'ตกลง',
        cancelText: 'ปิด'
      });`
);

content = content.replace(
  /alert\('เกิดข้อผิดพลาดในการบันทึกข้อมูล'\);/,
  `await confirm({
        title: 'ข้อผิดพลาด',
        message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง',
        type: 'warning',
        confirmText: 'ตกลง',
        cancelText: 'ปิด'
      });`
);

fs.writeFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', content, 'utf8');
