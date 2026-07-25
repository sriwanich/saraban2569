import fs from 'fs';
import path from 'path';

const dirs = [
  'uploads/inbox',
  'uploads/outbox',
  'uploads/internal',
  'uploads/admin/order',
  'uploads/admin/announcement',
  'uploads/admin/circular'
];

dirs.forEach(d => {
  fs.mkdirSync(path.join(process.cwd(), d), { recursive: true });
});

const samplePdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 55 >> stream
BT /F1 20 Tf 50 700 Td (EDMS Document Attachment) Tj ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000261 00000 n 
0000000366 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
445
%%EOF`;

fs.writeFileSync('uploads/inbox/sample_flood_plan_2569.pdf', samplePdf);
fs.writeFileSync('uploads/outbox/sample_windstorm_report_2569.pdf', samplePdf);
fs.writeFileSync('uploads/internal/sample_water_truck_repair.pdf', samplePdf);
fs.writeFileSync('uploads/admin/order/sample_appoint_order_15_2569.pdf', samplePdf);

console.log('Upload directories and sample attachments created successfully.');
