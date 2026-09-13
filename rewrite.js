const fs = require('fs');
let content = fs.readFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', 'utf8');

// Replace the main wrapper
content = content.replace(
  /<div className="bg-\[var\(--bg-surface\)\] border border-\[var\(--border-light\)\] rounded-xl shadow-sm p-6 space-y-8">/,
  '<div className="space-y-6">'
);

// Add cards to sections
content = content.replace(
  /        \{\/\* ส่วนหัวกระดาษ \*\/\}\n        <section className="space-y-4">/g,
  `        {/* ส่วนหัวกระดาษ */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-6 space-y-5">`
);

content = content.replace(
  /        \{\/\* 1\. ชนิดของภัย \*\/\}\n        <section className="space-y-4">/g,
  `        {/* 1. ชนิดของภัย */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-6 space-y-5">`
);

content = content.replace(
  /        \{\/\* 2\. ภัยเกิดวันที่ \*\/\}\n        <section className="space-y-4">/g,
  `        {/* 2. ภัยเกิดวันที่ */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-6 space-y-5">`
);

content = content.replace(
  /        \{\/\* 3\. สถานที่เกิดภัย \*\/\}\n        <section className="space-y-4">/g,
  `        {/* 3. สถานที่เกิดภัย */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-6 space-y-5">`
);

content = content.replace(
  /        \{\/\* 4\. ราษฎรที่ประสบภัย \*\/\}\n        <section className="space-y-4">/g,
  `        {/* 4. ราษฎรที่ประสบภัย */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-6 space-y-5">`
);

content = content.replace(
  /        \{\/\* 5\. พื้นที่ประสบภัยและความเสียหาย \*\/\}\n        <section className="space-y-4">/g,
  `        {/* 5. พื้นที่ประสบภัยและความเสียหาย */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-6 space-y-5">`
);

content = content.replace(
  /        \{\/\* 6\. การบรรเทาภัย \*\/\}\n        <section className="space-y-4">/g,
  `        {/* 6. การบรรเทาภัย */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-6 space-y-5">`
);

content = content.replace(
  /        \{\/\* 7\. เครื่องมือ\/อุปกรณ์ที่ใช้ \*\/\}\n        <section className="space-y-4">/g,
  `        {/* 7. เครื่องมือ/อุปกรณ์ที่ใช้ */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-6 space-y-5">`
);

content = content.replace(
  /        \{\/\* 9\. ข้อเสนอ \*\/\}\n        <section className="space-y-4">/g,
  `        {/* 9. ข้อเสนอ */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-6 space-y-5">`
);

content = content.replace(
  /        \{\/\* Signatures \*\/\}\n        <section className="space-y-4">/g,
  `        {/* Signatures */}
        <section className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm p-6 space-y-5">`
);

// Enhance headers
content = content.replace(
  /<h2 className="text-sm font-bold text-\[var\(--text-primary\)\] border-b border-\[var\(--border-light\)\] pb-2">/g,
  '<h2 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-light)] pb-3">'
);

// Form Inputs styling upgrade
content = content.replace(
  /className="w-full bg-\[var\(--bg-overlay\)\] border border-\[var\(--border-light\)\] rounded px-3 py-2 text-sm focus:border-\[var\(--primary-color\)\] outline-none"/g,
  'className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all"'
);
content = content.replace(
  /className="w-full bg-\[var\(--bg-overlay\)\] border border-\[var\(--border-light\)\] rounded px-3 py-1\.5 text-sm outline-none"/g,
  'className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all"'
);
content = content.replace(
  /className="w-full bg-\[var\(--bg-overlay\)\] border border-\[var\(--border-light\)\] rounded px-3 py-2 text-sm outline-none"/g,
  'className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all"'
);

// Sub-inputs for section 5
content = content.replace(
  /className="w-full rounded px-2 py-1 text-sm border border-\[var\(--border-light\)\] outline-none"/g,
  'className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all"'
);

// Checkbox and Radio styling
content = content.replace(
  /className="rounded text-red-600 focus:ring-red-500"/g,
  'className="w-4 h-4 rounded border-[var(--border-light)] text-red-600 focus:ring-red-500 bg-[var(--bg-overlay)]"'
);

content = content.replace(
  /className="text-red-600 focus:ring-red-500"/g,
  'className="w-4 h-4 border-[var(--border-light)] text-red-600 focus:ring-red-500 bg-[var(--bg-overlay)]"'
);

fs.writeFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', content, 'utf8');
