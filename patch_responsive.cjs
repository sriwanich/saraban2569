const fs = require('fs');
let content = fs.readFileSync('src/components/views/InfographicsEditorView.tsx', 'utf8');

// Update header to hide scrollbar and responsive title
content = content.replace(
  /<div className="shrink-0 border-b border-\[var\(--border-light\)\] bg-\[var\(--bg-surface\)\] flex items-center justify-between px-4 overflow-x-auto whitespace-nowrap h-16 md:h-14 gap-4">/,
  `<div className="shrink-0 border-b border-[var(--border-light)] bg-[var(--bg-surface)] flex items-center justify-between px-4 overflow-x-auto whitespace-nowrap h-16 md:h-14 gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">`
);

content = content.replace(
  /<h2 className="text-lg font-bold text-\[var\(--text-primary\)\] font-noto-serif-thai">ออกแบบ Infographics \/ Presentations<\/h2>/,
  `<h2 className="hidden md:block text-lg font-bold text-[var(--text-primary)] font-noto-serif-thai">ออกแบบ Infographics / Presentations</h2>
          <h2 className="md:hidden text-lg font-bold text-[var(--text-primary)] font-noto-serif-thai">ออกแบบ</h2>`
);

fs.writeFileSync('src/components/views/InfographicsEditorView.tsx', content);
