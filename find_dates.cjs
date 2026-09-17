const fs = require('fs');

const content = fs.readFileSync('./src/components/views/disaster/UrgentIncidentReportView.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('docDate') || line.includes('startDate')) {
    console.log(`${i+1}: ${line}`);
  }
});
