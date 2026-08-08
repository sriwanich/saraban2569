const fs = require('fs');
let content = fs.readFileSync('src/components/views/InfographicsEditorView.tsx', 'utf8');

// Add X icon from lucide-react if not present
if (!content.includes('X, ')) {
  content = content.replace(
    /Wrench, Settings \} from 'lucide-react';/,
    `Wrench, Settings, X } from 'lucide-react';`
  );
}

// Add close button to Left Sidebar (Tools)
content = content.replace(
  /<h3 className="text-sm font-semibold text-\[var\(--text-secondary\)\] uppercase tracking-wider mb-4">เครื่องมือ<\/h3>/,
  `<div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">เครื่องมือ</h3>
            <button onClick={() => setMobileTab('canvas')} className="md:hidden p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>`
);

// Add close button to Right Sidebar (Properties)
content = content.replace(
  /<h3 className="text-sm font-semibold text-\[var\(--text-secondary\)\] uppercase tracking-wider mb-4">คุณสมบัติ<\/h3>/,
  `<div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">คุณสมบัติ</h3>
            <button onClick={() => setMobileTab('canvas')} className="md:hidden p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>`
);

fs.writeFileSync('src/components/views/InfographicsEditorView.tsx', content);
