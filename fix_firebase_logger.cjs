const fs = require('fs');
let content = fs.readFileSync('src/firebase.ts', 'utf8');

if (!content.includes('setLogLevel')) {
  content = content.replace(
    /import \{ initializeFirestore, persistentLocalCache, persistentMultipleTabManager \} from 'firebase\/firestore';/,
    `import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setLogLevel } from 'firebase/firestore';`
  );
  
  content += `\n// Suppress the benign offline warning logs\nsetLogLevel('silent');\n`;
  fs.writeFileSync('src/firebase.ts', content, 'utf8');
}
