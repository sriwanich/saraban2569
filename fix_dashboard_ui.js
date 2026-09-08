import fs from 'fs';
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

// Header modifications
code = code.replace(
  'className="h-16 shrink-0 bg-[var(--bg-surface)]/80 backdrop-blur-md border-b border-[var(--border-light)] flex items-center justify-between px-3 sm:px-5 lg:px-8 z-30 sticky top-0"',
  'className="h-16 shrink-0 bg-[var(--bg-surface)]/70 backdrop-blur-xl border-b border-[var(--border-light)] flex items-center justify-between px-3 sm:px-5 lg:px-8 z-30 sticky top-0 shadow-sm"'
);

// Sidebar modifications
code = code.replace(
  'className={`fixed inset-y-0 left-0 z-40 w-64 bg-[var(--bg-surface)] border-r border-[var(--border-light)] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${',
  'className={`fixed inset-y-0 left-0 z-40 w-64 bg-[var(--bg-surface)]/80 backdrop-blur-2xl border-r border-[var(--glass-border)] shadow-2xl lg:shadow-none transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${'
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
