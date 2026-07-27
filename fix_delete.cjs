const fs = require('fs');
let content = fs.readFileSync('src/components/views/drafts/DraftLettersView.tsx', 'utf8');

const target = "  const handleDeleteDraft = (id: number) => {\n    if (!confirm('ต้องการลบร่างหนังสือฉบับนี้ใช่หรือไม่?')) return;\n    const updated = draftsHistory.filter(d => d.id !== id);\n    setDraftsHistory(updated);\n    localStorage.setItem('moi_drafts', JSON.stringify(updated));\n  };";

const replacement = `  const handleDeleteDraft = async (id: number) => {
    if (!confirm('ต้องการลบร่างหนังสือฉบับนี้ใช่หรือไม่?')) return;
    
    const itemToDelete = draftsHistory.find(d => d.id === id);
    if (itemToDelete && (itemToDelete as any).dbId) {
      try {
        await fetch(\`/api/drafts/\${(itemToDelete as any).dbId}\`, { method: 'DELETE' });
      } catch (e) {
        console.error(e);
      }
    }

    const updated = draftsHistory.filter(d => d.id !== id);
    setDraftsHistory(updated);
    localStorage.setItem('moi_drafts', JSON.stringify(updated));
  };`;

if (content.includes(target)) {
    fs.writeFileSync('src/components/views/drafts/DraftLettersView.tsx', content.replace(target, replacement));
    console.log('Successfully replaced handleDeleteDraft');
} else {
    console.log('Target not found');
}
