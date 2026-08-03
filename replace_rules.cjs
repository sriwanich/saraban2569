const fs = require('fs');
const content = fs.readFileSync('src/components/DocumentModal.tsx', 'utf8');

const generateNumberInfoStr = `  const generateNumberInfo = (docType?: DocType, isCirc?: boolean, cat?: string, yr?: string) => {
    const targetType = docType || formData?.type || defaultType || 'inbox';
    const targetIsCircular = isCirc !== undefined ? isCirc : (formData?.isCircular || false);
    const targetCategory = cat || formData?.category || 'order';
    const targetYear = yr || formData?.year || (currentYear ? String(currentYear) : '2569');
    const targetDept = formData?.department || user?.department || 'ฝ่ายบริหารงานทั่วไป';

    let actualType = 'หนังสือภายนอก';
    if (targetType === 'admin') {
      actualType = targetCategory === 'order' ? 'คำสั่ง' : (targetCategory === 'announcement' ? 'ประกาศ' : 'หนังสือรับรอง');
    } else if (targetType === 'inbox') {
      actualType = 'หนังสือรับ';
    } else if (targetType === 'internal') {
      actualType = 'หนังสือภายใน';
    }

    let rule = numberingRules.find((r: any) => r.isActive && r.docType === actualType && r.department === targetDept);
    if (!rule) rule = numberingRules.find((r: any) => r.isActive && r.docType === actualType && r.department === 'ทุกฝ่ายงาน');
    if (!rule) rule = numberingRules.find((r: any) => r.isActive && r.docType === actualType);

    let existingMax = 0;
    if (targetType === 'admin') {
      const existing = documents.filter(d => d.type === 'admin' && d.category === targetCategory);
      existingMax = existing.reduce((max, d) => {
        const match = (d.docNumber || '').match(/(\\d+)\\s*\\/\\s*(\\d+)/);
        if (match && match[2] === targetYear) return Math.max(max, parseInt(match[1], 10));
        const parts = (d.docNumber || '').split('/');
        const n = parseInt(parts[0], 10);
        return !isNaN(n) ? Math.max(max, n) : max;
      }, 0);
    } else {
      const filteredDocs = documents.filter(d => {
        if (d.year && d.year !== targetYear) return false;
        if (targetType === 'outbox') {
          return d.type === 'outbox' && !!d.isCircular === targetIsCircular;
        }
        return d.type === targetType;
      });
      existingMax = filteredDocs.reduce((max, d) => {
        const n = parseInt(d.receiveNumber || '0', 10);
        return !isNaN(n) ? Math.max(max, n) : max;
      }, 0);
    }

    const ruleStartSeq = rule ? Number(rule.currentSeq || 1) : 1;
    const finalSeq = Math.max(existingMax + 1, ruleStartSeq);

    let formattedNumber = '';
    if (targetType === 'admin') {
      const prefix = rule ? (rule.prefixPattern || actualType) : actualType;
      formattedNumber = \`\${prefix} \${finalSeq}/\${targetYear}\`;
    } else if (targetType === 'outbox') {
      const prefix = rule ? (rule.prefixPattern || 'รย 0021') : 'รย 0021';
      const circStr = targetIsCircular ? (prefix.includes('ว') ? '' : 'ว ') : '';
      formattedNumber = \`\${prefix}/\${circStr}\${finalSeq}\`;
    } else {
      formattedNumber = String(finalSeq);
    }

    return { seq: String(finalSeq), docNumber: formattedNumber };
  };`;

// replace getNextSeq and getNextAdminDocNumber
const startIdx = content.indexOf('  const getNextSeq =');
const endIdx = content.indexOf('  // Fetch folders list');

if (startIdx !== -1 && endIdx !== -1) {
    const newContent = content.substring(0, startIdx) + generateNumberInfoStr + '\n\n' + content.substring(endIdx);
    fs.writeFileSync('src/components/DocumentModal.tsx', newContent);
    console.log('Replaced function definitions');
} else {
    console.log('Could not find function definitions');
}
