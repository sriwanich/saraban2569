import fs from 'fs';
let code = fs.readFileSync('src/components/Login.tsx', 'utf-8');

// Replace background with a more official dark blue
code = code.replace(
  'bg-slate-900 flex flex-col justify-center',
  'bg-[#0a192f] flex flex-col justify-center'
);

// Replace glowing circles to use more official colors (gold/blue)
code = code.replace(
  'bg-blue-600/20 rounded-full blur-[100px] animate-pulse',
  'bg-blue-600/20 rounded-full blur-[100px] animate-pulse'
);
code = code.replace(
  'bg-indigo-600/20 rounded-full blur-[100px] animate-pulse',
  'bg-amber-500/10 rounded-full blur-[100px] animate-pulse'
);

// Title text gradient
code = code.replace(
  'from-blue-400 to-indigo-300',
  'from-blue-400 to-amber-200'
);

fs.writeFileSync('src/components/Login.tsx', code);
