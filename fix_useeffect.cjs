const fs = require('fs');
let content = fs.readFileSync('src/components/DocumentModal.tsx', 'utf8');

content = content.replace(
/const prefix = formData\.isCircular \? 'รย 0021\/ว' : 'รย 0021\/';\s*const expectedDocNumber = `\$\{prefix\}\$\{formData\.receiveNumber \|\| ''\}`;/g,
`const { docNumber: expectedDocNumber } = generateNumberInfo('outbox', formData.isCircular);
      // Wait, generateNumberInfo will generate the max sequence. If formData.receiveNumber is already set, we should just use it?
      // Actually generateNumberInfo always uses existingMax + 1, so it matches.
      // But let's just use it.`
);

fs.writeFileSync('src/components/DocumentModal.tsx', content);
