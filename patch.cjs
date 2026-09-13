const fs = require('fs');
let content = fs.readFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', 'utf8');

content = content.replace(
  /import { useConfirm } from '\.\.\/\.\.\/\.\.\/context\/ConfirmContext';/,
  `import { useConfirm } from '../../../context/ConfirmContext';\nimport UrgentIncidentDashboard from './UrgentIncidentDashboard';\nimport { BarChart2 } from 'lucide-react';`
);

content = content.replace(
  /const \[viewMode, setViewMode\] = useState\<'list' \| 'form'\>\('list'\);/,
  `const [viewMode, setViewMode] = useState<'list' | 'form' | 'dashboard'>('list');`
);

content = content.replace(
  /          \<button \n            onClick=\{handleAddNew\}\n            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"\n          \>\n            \<Plus className="w-4 h-4" \/\> สร้างรายงานฉบับใหม่\n          \<\/button\>/,
  `          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setViewMode('dashboard')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <BarChart2 className="w-4 h-4" /> แดชบอร์ดสรุปผล
            </button>
            <button 
              onClick={handleAddNew}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> สร้างรายงานฉบับใหม่
            </button>
          </div>`
);

content = content.replace(
  /  if \(viewMode === 'list'\) \{/,
  `  if (viewMode === 'dashboard') {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => setViewMode('list')}
            className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-secondary)] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            แดชบอร์ดสรุปรายงานเหตุด่วนสาธารณภัย
          </h1>
        </div>
        <UrgentIncidentDashboard reports={reports} />
      </div>
    );
  }

  if (viewMode === 'list') {`
);

fs.writeFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', content, 'utf8');
