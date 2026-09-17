const fs = require('fs');
let content = fs.readFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', 'utf8');

// 1. Add Scan import
content = content.replace(
  /Save, FileDown \} from 'lucide-react';/,
  `Save, FileDown, Scan, Loader2 } from 'lucide-react';`
);

// 2. Add isScanning state and fileRef
content = content.replace(
  /const \[searchQuery, setSearchQuery\] = useState\(''\);/,
  `const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);`
);

// 3. Add handleScanFile function
const handleScanFile = `
  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          const response = await fetch('/api/ai/scan-urgent-incident', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64: base64Data,
              mimeType: file.type
            })
          });
          const result = await response.json();
          if (result.success && result.data) {
            // merge data
            setFormData(prev => ({
              ...prev,
              ...result.data,
              incidentTypes: Array.isArray(result.data.incidentTypes) ? result.data.incidentTypes : prev.incidentTypes,
            }));
            await confirm({
              title: 'ดึงข้อมูลสำเร็จ',
              message: 'AI สแกนและกรอกข้อมูลจากเอกสารลงในฟอร์มเรียบร้อยแล้ว กรุณาตรวจสอบความถูกต้องอีกครั้งก่อนบันทึก',
              type: 'info',
              confirmText: 'ตกลง'
            });
          } else {
            throw new Error(result.error || 'ไม่สามารถดึงข้อมูลได้');
          }
        } catch (err: any) {
          console.error(err);
          await confirm({
            title: 'เกิดข้อผิดพลาด',
            message: 'การสแกนด้วย AI ล้มเหลว: ' + err.message,
            type: 'warning',
            confirmText: 'ตกลง'
          });
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsScanning(false);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
`;

content = content.replace(
  /  const handleSave = async \(\) => \{/,
  handleScanFile + '\n  const handleSave = async () => {'
);

// 4. Add the button
content = content.replace(
  /        <div className="flex flex-wrap gap-2">\n          <button \n            onClick=\{handleSave\}/,
  `        <div className="flex flex-wrap gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,application/pdf"
            onChange={handleScanFile}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
            {isScanning ? 'กำลังสแกน...' : 'สแกนเอกสารด้วย AI'}
          </button>
          <button 
            onClick={handleSave}`
);

fs.writeFileSync('src/components/views/disaster/UrgentIncidentReportView.tsx', content, 'utf8');
