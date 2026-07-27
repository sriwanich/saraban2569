const fs = require('fs');
let content = fs.readFileSync('src/components/views/drafts/DraftLettersView.tsx', 'utf8');

const target = "    const updated = [newItem, ...draftsHistory];\n    setDraftsHistory(updated);\n    localStorage.setItem('moi_drafts', JSON.stringify(updated));";

const replacement = `    const payload = {
      docType: 'draft_letter',
      title: subject,
      docNumber: docNum,
      date: date,
      urgency: urgency,
      secrecy: secrecy,
      toDept: to,
      subject: subject,
      content: editorRef.current?.innerHTML || '',
      signatory: signer,
      signatoryPosition: signerPos,
      createdBy: \`\${user?.firstName || ''} \${user?.lastName || ''}\`.trim() || user?.username || 'ผู้ใช้งาน',
      extraData: newItem
    };

    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const savedItem = { ...newItem, dbId: data.id };
      const updated = [savedItem, ...draftsHistory];
      setDraftsHistory(updated);
      localStorage.setItem('moi_drafts', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
      const updated = [newItem, ...draftsHistory];
      setDraftsHistory(updated);
      localStorage.setItem('moi_drafts', JSON.stringify(updated));
    }`;

content = content.replace("  const handleSaveDraft = () => {", "  const handleSaveDraft = async () => {");
if (content.includes(target)) {
    fs.writeFileSync('src/components/views/drafts/DraftLettersView.tsx', content.replace(target, replacement));
    console.log('Successfully replaced handleSaveDraft inner');
} else {
    console.log('Target not found');
}
