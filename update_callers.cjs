const fs = require('fs');
let content = fs.readFileSync('src/components/DocumentModal.tsx', 'utf8');

// Replace handleIsCircularChange
content = content.replace(
/const seq = getNextSeq\('outbox', checked\);\s*const prefix = checked \? 'รย 0021\/ว' : 'รย 0021\/';\s*const newDocNumber = `\$\{prefix\}\$\{seq\}`;\s*setFormData\(prev => \(\{/g,
`const { seq, docNumber: newDocNumber } = generateNumberInfo('outbox', checked);
    setFormData(prev => ({`
);

// Replace useEffect for default values (initialData check)
content = content.replace(
/const activeType = defaultType \|\| 'inbox';\s*const isCirc = activeType === 'outbox' \? \(formData\.isCircular \|\| false\) : false;\s*const seq = getNextSeq\(activeType, isCirc\);\s*const initCat = 'order';\s*const initYear = currentYear \? String\(currentYear\) : '2569';\s*const initDocNum = activeType === 'admin' \s*\? getNextAdminDocNumber\(initCat, initYear\) \s*: \(activeType === 'outbox' \? `\$\{isCirc \? 'รย 0021\/ว' : 'รย 0021\/'\}\$\{seq\}` : ''\);\s*setFormData/g,
`const activeType = defaultType || 'inbox';
      const isCirc = activeType === 'outbox' ? (formData.isCircular || false) : false;
      const initCat = 'order';
      const initYear = currentYear ? String(currentYear) : '2569';
      const { seq, docNumber: initDocNum } = generateNumberInfo(activeType, isCirc, initCat, initYear);
      setFormData`
);

// Replace handleTypeChange
content = content.replace(
/const isCirc = newType === 'outbox' \? \(formData\.isCircular \|\| false\) : false;\s*const seq = getNextSeq\(newType, isCirc\);\s*const initCat = formData\.category \|\| 'order';\s*const initYear = formData\.year \|\| currentYear \|\| '2569';\s*const newDocNum = newType === 'admin' \s*\? getNextAdminDocNumber\(initCat, String\(initYear\)\) \s*: \(newType === 'outbox' \? `\$\{isCirc \? 'รย 0021\/ว' : 'รย 0021\/'\}\$\{seq\}` : formData\.docNumber\);\s*setFormData/g,
`const isCirc = newType === 'outbox' ? (formData.isCircular || false) : false;
      const initCat = formData.category || 'order';
      const initYear = formData.year || currentYear || '2569';
      const { seq, docNumber: newDocNum } = generateNumberInfo(newType, isCirc, initCat, String(initYear));
      setFormData`
);

// Replace handleChange for admin docs
content = content.replace(
/const cat = field === 'category' \? value : \(formData\.category \|\| 'order'\);\s*const yr = field === 'year' \? value : \(formData\.year \|\| '2569'\);\s*const nextDocNum = getNextAdminDocNumber\(cat, yr\);\s*setFormData/g,
`const cat = field === 'category' ? value : (formData.category || 'order');
      const yr = field === 'year' ? value : (formData.year || '2569');
      const { docNumber: nextDocNum } = generateNumberInfo('admin', false, cat, yr);
      setFormData`
);


fs.writeFileSync('src/components/DocumentModal.tsx', content);
