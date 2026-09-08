import fs from 'fs';
let code = fs.readFileSync('src/components/DocumentModal.tsx', 'utf-8');

const oldStr = `const filteredDocs = documents.filter(d => {
        if (d.year && d.year !== targetYear) return false;
        if (targetType === 'outbox') {
          return d.type === 'outbox' && !!d.isCircular === targetIsCircular;
        }
        return d.type === targetType;
      });`;

const newStr = `const filteredDocs = documents.filter(d => {
        if (d.year && d.year !== targetYear) return false;
        
        // แยกเลขทะเบียนรับ-ส่ง ของแต่ละ ฝ่าย/กลุ่มงาน ออกจากสารบรรณกลาง (และฝ่ายอื่นๆ)
        const dDept = d.department || 'ฝ่ายบริหารงานทั่วไป';
        const tDept = targetDept || 'ฝ่ายบริหารงานทั่วไป';
        if (dDept !== tDept) return false;

        if (targetType === 'outbox') {
          return d.type === 'outbox' && !!d.isCircular === targetIsCircular;
        }
        return d.type === targetType;
      });`;

// Try exact string replacement (flexible on spaces for the first line)
code = code.replace(/const filteredDocs = documents\.filter\(d => \{[\s\S]*?return d\.type === targetType;\s*\}\);/, newStr);

fs.writeFileSync('src/components/DocumentModal.tsx', code);
