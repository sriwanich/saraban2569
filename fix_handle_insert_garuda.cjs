const fs = require('fs');
let c = fs.readFileSync('src/components/views/drafts/DraftLettersView.tsx', 'utf8');
c = c.replace(/onClick=\{handleInsertGaruda\}/g, 'onClick={insertGaruda}');
fs.writeFileSync('src/components/views/drafts/DraftLettersView.tsx', c);
console.log('Fixed DraftLettersView.tsx handleInsertGaruda');
