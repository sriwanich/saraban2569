const fs = require('fs');
let content = fs.readFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', 'utf8');

// Remove "กรณี อำเภอ" from the print view header
content = content.replace(
  /<div>กรณี อำเภอ<\/div>/g,
  ''
);

fs.writeFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', content, 'utf8');
