import fs from 'fs';
let code = fs.readFileSync('src/components/DocumentModal.tsx', 'utf-8');

code = code.replace(
  /\{formData\.type !== 'inbox' && \(/,
  "{formData.type !== 'inbox' && (user?.role === 'admin' || user?.role === 'moderator') && ("
);

fs.writeFileSync('src/components/DocumentModal.tsx', code);
