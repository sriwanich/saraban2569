const fs = require('fs');
let content = fs.readFileSync('src/components/views/drafts/DraftLettersView.tsx', 'utf8');

const target = \`  const handleSaveDraft = () => {
    if (!subject) {
      alert('กรุณากรอกเรื่องก่อนบันทึก');
      return;
    }
    const newItem: DraftItem = {
      id: Date.now(),
      type: selectedType,
      docType,
      docNum,
      date,
      to,
      subject,
      urgency,
      secrecy,
      body: editorRef.current?.innerHTML || '',
      signer,
      signerPos,
      ref: refText,
      att: attText,
      createdAt: new Date().toISOString()
    };
    const updated = [newItem, ...draftsHistory];
    setDraftsHistory(updated);
    localStorage.setItem('moi_drafts', JSON.stringify(updated));
    if (onSendToSignQueue) {\`;

const replacement = \`  const handleSaveDraft = async () => {
    if (!subject) {
      alert('กรุณากรอกเรื่องก่อนบันทึก');
      return;
    }
    const newItem: DraftItem = {
      id: Date.now(),
      type: selectedType,
      docType,
      docNum,
      date,
      to,
      subject,
      urgency,
      secrecy,
      body: editorRef.current?.innerHTML || '',
      signer,
      signerPos,
      ref: refText,
      att: attText,
      createdAt: new Date().toISOString()
    };

    const payload = {
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
      createdBy: \\\`\${user?.firstName || ''} \${user?.lastName || ''}\\\`.trim() || user?.username || 'ผู้ใช้งาน',
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
    }
    if (onSendToSignQueue) {\`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/views/drafts/DraftLettersView.tsx', content);
