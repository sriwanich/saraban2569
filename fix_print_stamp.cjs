const fs = require('fs');
let content = fs.readFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', 'utf8');

// Replace "ด่วนที่" with "ด่วนที่สุด" in the print view
content = content.replace(
  /<span class="urgent-stamp">ด่วนที่<\/span>/g,
  '<span class="urgent-stamp">ด่วนที่สุด</span>'
);

fs.writeFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', content, 'utf8');
