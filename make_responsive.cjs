const fs = require('fs');
let content = fs.readFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', 'utf8');

// 1. Fix List View Header and Table
content = content.replace(
  /<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">/g,
  '<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">'
);
content = content.replace(
  /<table className="w-full text-left text-sm">/g,
  '<table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">' // Ensure table doesn't squish too much, rely on overflow-x-auto
);

// 2. Fix Form Header Buttons (Save, Print, Convert)
content = content.replace(
  /<div className="flex gap-2">/g,
  '<div className="flex flex-wrap gap-2">'
);

// 3. Fix Section Paddings (smaller on mobile)
content = content.replace(
  /shadow-sm p-6 space-y-5/g,
  'shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5'
);

// 4. Fix Grid Layouts - Mobile First (1 column on very small screens, 2 on sm, 4 on md/lg)

// Section 1: Types of incidents
content = content.replace(
  /<div className="grid grid-cols-2 md:grid-cols-3 gap-2">/g,
  '<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">'
);

// Severity level radio
content = content.replace(
  /<div className="flex gap-6">/g,
  '<div className="flex flex-col sm:flex-row gap-3 sm:gap-6">'
);

// Section 2: Dates
// Already grid-cols-1 md:grid-cols-4, that's fine.

// Section 4: Affected People
content = content.replace(
  /<div className="grid grid-cols-2 md:grid-cols-4 gap-4">/g,
  '<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">'
);

// Section 5: Damages
content = content.replace(
  /<div className="grid grid-cols-2 md:grid-cols-4 gap-3">/g,
  '<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">'
);

// Section 7: Tools
content = content.replace(
  /className="grid grid-cols-2 md:grid-cols-4 gap-4">/g,
  'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">'
);
content = content.replace(
  /className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">/g,
  'className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">'
);

// Section 9: Signatures
// Already grid-cols-1 md:grid-cols-2 gap-4.

// Write back
fs.writeFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', content, 'utf8');
