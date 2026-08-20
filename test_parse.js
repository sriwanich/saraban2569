import { readFileSync } from 'fs';
const content = readFileSync('src/components/views/DocumentList.tsx', 'utf8');
console.log(content.match(/\.map\(/g)?.length);
