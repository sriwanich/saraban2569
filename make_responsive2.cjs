const fs = require('fs');
let content = fs.readFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', 'utf8');

// Fix form view header to wrap correctly on mobile
content = content.replace(
  /<div className="flex items-center justify-between">/,
  '<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">'
);

fs.writeFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', content, 'utf8');
