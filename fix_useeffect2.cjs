const fs = require('fs');
let content = fs.readFileSync('src/components/DocumentModal.tsx', 'utf8');

content = content.replace(
/const \{ docNumber: expectedDocNumber \} = generateNumberInfo\('outbox', formData\.isCircular\);\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n/g,
`const targetDept = formData.department || user?.department || 'ฝ่ายบริหารงานทั่วไป';
      let rule = numberingRules.find((r: any) => r.isActive && r.docType === 'หนังสือภายนอก' && r.department === targetDept);
      if (!rule) rule = numberingRules.find((r: any) => r.isActive && r.docType === 'หนังสือภายนอก' && r.department === 'ทุกฝ่ายงาน');
      if (!rule) rule = numberingRules.find((r: any) => r.isActive && r.docType === 'หนังสือภายนอก');
      const prefix = rule ? (rule.prefixPattern || 'รย 0021') : 'รย 0021';
      const circStr = formData.isCircular ? (prefix.includes('ว') ? '' : 'ว ') : '';
      const expectedDocNumber = \`\${prefix}/\${circStr}\${formData.receiveNumber || ''}\`;
`
);

fs.writeFileSync('src/components/DocumentModal.tsx', content);
