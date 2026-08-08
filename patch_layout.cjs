const fs = require('fs');
let content = fs.readFileSync('src/components/views/InfographicsEditorView.tsx', 'utf8');

// Add missing lucide icons
content = content.replace(
  /} from 'lucide-react';/,
  `, Wrench, Settings } from 'lucide-react';`
);

// Add mobileTab state
content = content.replace(
  /const \[isSaving, setIsSaving\] = useState\(false\);/,
  `const [isSaving, setIsSaving] = useState(false);\n  const [mobileTab, setMobileTab] = useState<'canvas' | 'tools' | 'properties'>('canvas');`
);

// Update Header Toolbar
content = content.replace(
  /<div className="h-14 shrink-0 border-b border-\[var\(--border-light\)\] bg-\[var\(--bg-surface\)\] flex items-center justify-between px-4">/,
  `<div className="shrink-0 border-b border-[var(--border-light)] bg-[var(--bg-surface)] flex items-center justify-between px-4 overflow-x-auto whitespace-nowrap h-16 md:h-14 gap-4">`
);

// Update flex-1 container and Left Sidebar
content = content.replace(
  /<div className="flex flex-1 overflow-hidden">/,
  `<div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">`
);

content = content.replace(
  /<div className="w-64 border-r border-\[var\(--border-light\)\] bg-\[var\(--bg-surface\)\] flex flex-col p-4 overflow-y-auto">/,
  `<div className={\`\${mobileTab === 'tools' ? 'flex absolute inset-x-0 bottom-0 top-1/2 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-xl' : 'hidden'} md:flex md:relative md:top-auto md:bottom-auto md:w-64 md:border-r border-[var(--border-light)] bg-[var(--bg-surface)] flex-col p-4 overflow-y-auto md:shadow-none md:rounded-none md:z-0\`}>`
);

// Update Canvas area
content = content.replace(
  /<div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-auto flex items-center justify-center p-8 relative">/,
  `<div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-auto flex items-center justify-center p-4 md:p-8 relative z-0">`
);

// Update Right Sidebar
content = content.replace(
  /<div className="w-64 border-l border-\[var\(--border-light\)\] bg-\[var\(--bg-surface\)\] flex flex-col p-4 overflow-y-auto">/,
  `<div className={\`\${mobileTab === 'properties' ? 'flex absolute inset-x-0 bottom-0 top-1/2 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-xl' : 'hidden'} md:flex md:relative md:top-auto md:bottom-auto md:w-64 md:border-l border-[var(--border-light)] bg-[var(--bg-surface)] flex-col p-4 overflow-y-auto md:shadow-none md:rounded-none md:z-0\`}>`
);

// Add mobile bottom bar
content = content.replace(
  /      {showGallery && \(/,
  `      <div className="md:hidden flex shrink-0 border-t border-[var(--border-light)] bg-[var(--bg-surface)] relative z-20">
        <button onClick={() => setMobileTab(mobileTab === 'tools' ? 'canvas' : 'tools')} className={\`flex-1 p-3 text-center text-sm font-medium flex flex-col items-center justify-center gap-1 \${mobileTab === 'tools' ? 'text-[var(--primary-color)]' : 'text-[var(--text-secondary)]'}\`}>
          <Wrench className="w-5 h-5"/> เครื่องมือ
        </button>
        <button onClick={() => setMobileTab(mobileTab === 'properties' ? 'canvas' : 'properties')} className={\`flex-1 p-3 text-center text-sm font-medium flex flex-col items-center justify-center gap-1 \${mobileTab === 'properties' ? 'text-[var(--primary-color)]' : 'text-[var(--text-secondary)]'}\`}>
          <Settings className="w-5 h-5"/> ตั้งค่า
        </button>
      </div>
      
      {showGallery && (`
);

fs.writeFileSync('src/components/views/InfographicsEditorView.tsx', content);
