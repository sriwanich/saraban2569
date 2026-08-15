import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Mail, Award, CheckSquare, MessageSquare, FileCode, 
  BookOpen, Shield, Volume2, Newspaper, Send, Bold, Italic, 
  Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  Plus, Eye, Save, Printer, FileDown, Trash2, History, Crown, Paperclip, X,
  Sparkles, AlertCircle, CheckCircle2, ChevronRight
} from 'lucide-react';
import { LETTER_TYPES, buildOfficialDoc, downloadAsDoc, thDate, DraftItem } from './draftData';
import { parseDocNumberStructure, parseFileCodeFromDoc, DEFAULT_FILE_CODES } from '../../../lib/fileCodeUtils';
import { useRealtimeSync } from '../../../utils/realtimeSync';

interface Props {
  user: any;
  onSendToSignQueue?: (item: any) => void;
  prefillData?: any;
}

export default function DraftLettersView({ user, onSendToSignQueue, prefillData }: Props) {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [selectedType, setSelectedType] = useState<string>('external');
  const [selectedTitle, setSelectedTypeTitle] = useState<string>('หนังสือภายนอก');
  const [showForm, setShowForm] = useState<boolean>(false);

  // Form Fields
  const [docNum, setDocNum] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [docType, setDocType] = useState<string>('หนังสือภายนอก');
  const [urgency, setUrgency] = useState<string>('ปกติ');
  const [secrecy, setSecrecy] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [refText, setRefText] = useState<string>('');
  const [attText, setAttText] = useState<string>('');
  const [signer, setSigner] = useState<string>('');
  const [signerPos, setSignerPos] = useState<string>('หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด');

  const editorRef = useRef<HTMLDivElement>(null);

  // Garuda Panel State
  const [showGarudaPanel, setShowGarudaPanel] = useState<boolean>(false);
  const [garudaSize, setGarudaSize] = useState<string>('90');
  const [garudaAlign, setGarudaAlign] = useState<string>('center');

  // History State
  const [draftsHistory, setDraftsHistory] = useState<DraftItem[]>([]);

  // Preview Modal
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // AI Audit State
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [showAuditPanel, setShowAuditPanel] = useState<boolean>(false);
  const [activeAuditTab, setActiveAuditTab] = useState<'all' | 'spelling' | 'format' | 'royal' | 'completeness'>('all');

  const handleAuditDocument = async () => {
    setIsAuditing(true);
    setAuditResult(null);
    setShowAuditPanel(true);

    const payload = {
      docType,
      docNum,
      date,
      to,
      subject,
      ref: refText,
      att: attText,
      body: editorRef.current?.innerHTML || '',
      signer,
      signerPos,
      orgName: user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'
    };

    try {
      const res = await fetch('/api/ai/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.result) {
        setAuditResult(data.result);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการตรวจสอบด้วย AI');
        setShowAuditPanel(false);
      }
    } catch (err: any) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ AI ตรวจสอบได้');
      setShowAuditPanel(false);
    } finally {
      setIsAuditing(false);
    }
  };

  const loadDrafts = () => {
    fetch('/api/drafts')
      .then(res => res.json())
      .then(data => {
        const drafts = data
          .filter((d: any) => d.docType === 'draft_letter')
          .map((d: any) => ({
            ...JSON.parse(d.extraData || '{}'),
            dbId: d.id
          }));
        setDraftsHistory(drafts);
      })
      .catch(e => {
        console.error('Error fetching drafts:', e);
        const saved = localStorage.getItem('moi_drafts');
        if (saved) {
          try {
            setDraftsHistory(JSON.parse(saved));
          } catch (err) {}
        }
      });
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  useRealtimeSync(['DRAFTS_UPDATED', 'DOCUMENTS_UPDATED', 'TAB_FOCUSED', 'DATA_UPDATED'], () => {
    loadDrafts();
  });

  // Handle prefill if passed from AI Scan
  useEffect(() => {
    if (prefillData) {
      setShowForm(true);
      if (prefillData.docNum) setDocNum(prefillData.docNum);
      if (prefillData.date) setDate(prefillData.date);
      if (prefillData.subject) setSubject(prefillData.subject);
      if (prefillData.to) setTo(prefillData.to);
      if (prefillData.ref) setRefText(prefillData.ref);
      if (prefillData.att) setAttText(prefillData.att);
      if (prefillData.urgency) setUrgency(prefillData.urgency);
      if (prefillData.secrecy) setSecrecy(prefillData.secrecy);
      if (prefillData.signer) setSigner(prefillData.signer);
      if (prefillData.signerPos) setSignerPos(prefillData.signerPos);
      if (prefillData.body && editorRef.current) {
        editorRef.current.innerHTML = prefillData.body;
      }
    }
  }, [prefillData]);

  const handleSelectType = (tpl: string, title: string) => {
    setSelectedType(tpl);
    setSelectedTypeTitle(title);
    setShowForm(true);

    const typeMap: Record<string, string> = {
      external: 'หนังสือภายนอก',
      internal: 'หนังสือภายใน',
      stamp: 'หนังสือประทับตรา',
      cert: 'หนังสือรับรอง',
      reply: 'หนังสือภายนอก',
      memo: 'บันทึกข้อความ',
      regulation: 'ระเบียบ',
      bylaw: 'ข้อบังคับ',
      statement: 'แถลงการณ์',
      news: 'ข่าว',
      circular: 'หนังสือเวียน (ว.)'
    };
    if (typeMap[tpl]) setDocType(typeMap[tpl]);

    const org = user?.department || 'องค์กรปกครองส่วนท้องถิ่น';
    const templates: Record<string, string> = {
      external: `<p style="text-indent:3em;">ด้วย ${org} มีความประสงค์จะ [ระบุวัตถุประสงค์หลัก] เพื่อประโยชน์ต่อประชาชนในท้องถิ่น</p><br><p style="text-indent:3em;">ในการนี้ จึงขอเรียนเชิญ / ขอความร่วมมือจากท่าน [ระบุสิ่งที่ต้องการ]</p><br><p style="text-indent:3em;">จึงเรียนมาเพื่อโปรดพิจารณา</p>`,
      internal: `<p style="text-indent:3em;">ด้วยข้าพเจ้า มีความประสงค์ขอ [ระบุเรื่องที่ขอ] เนื่องจากมีความจำเป็นในการปฏิบัติราชการ</p><br><p style="text-indent:3em;">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ</p>`,
      memo: `<p style="text-indent:3em;">เรียน ปลัด/นายก องค์กรปกครองส่วนท้องถิ่น</p><br><p style="text-indent:3em;">ด้วย [ระบุเรื่อง/ข้อเท็จจริง] จึงขอรายงานเพื่อโปรดทราบและพิจารณาดำเนินการต่อไป</p>`,
      cert: `<p style="text-indent:3em;">หนังสือฉบับนี้ให้ไว้เพื่อรับรองว่า [ชื่อ-นามสกุล] เป็นผู้ปฏิบัติงานในสังกัด ${org} ด้วยความเรียบร้อย</p>`,
      reply: `<p style="text-indent:3em;">ตามหนังสือที่อ้างถึง ${org} ขอเรียนชี้แจงว่า [ข้อเท็จจริง/การดำเนินการ]</p><br><p style="text-indent:3em;">จึงเรียนมาเพื่อโปรดทราบ</p>`,
    };

    if (editorRef.current) {
      editorRef.current.innerHTML = templates[tpl] || `<p style="text-indent:3em;">[กรอกเนื้อหาหนังสือราชการ...]</p>`;
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
  };

  const insertTemplateBlock = (type: 'bg' | 'obj' | 'closing') => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    let text = '';
    if (type === 'bg') {
      text = `<p style="text-indent:3em;"><strong>๑. ความเป็นมาและความสำคัญ</strong></p><p style="text-indent:3em;">ด้วย ${user?.department || 'หน่วยงาน'} ได้ดำเนินงานตามแผนพัฒนาท้องถิ่น...</p>`;
    } else if (type === 'obj') {
      text = `<p style="text-indent:3em;"><strong>๒. วัตถุประสงค์</strong></p><ol style="padding-left:3em;line-height:2;"><li>เพื่อส่งเสริมคุณภาพชีวิตของประชาชน</li><li>เพื่อเพิ่มประสิทธิภาพการบริหารจัดการ</li></ol>`;
    } else if (type === 'closing') {
      text = `<p style="text-indent:3em;">จึงเรียนมาเพื่อโปรดพิจารณา</p>`;
    }
    execCommand('insertHTML', text);
  };



  const insertGaruda = () => {
    const src = 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Seal_of_the_Ministry_of_Interior_of_Thailand.svg';
    const alignStyle = garudaAlign === 'left' ? 'text-align:left;' : garudaAlign === 'right' ? 'text-align:right;' : 'text-align:center;';
    const html = `<div style="${alignStyle}margin:8px 0;"><img src="${src}" width="${garudaSize}" height="${garudaSize}" style="width:${garudaSize}px;height:${garudaSize}px;object-fit:contain;display:inline-block;" alt="ตราครุฑ" /></div>`;
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertHTML', false, html);
    }
    setShowGarudaPanel(false);
  };

  const handlePreview = () => {
    if (!subject) {
      alert('กรุณากรอกเรื่องก่อนแสดงตัวอย่าง');
      return;
    }
    const html = buildOfficialDoc({
      docType,
      docNum,
      date,
      to,
      subject,
      ref: refText,
      att: attText,
      body: editorRef.current?.innerHTML || '',
      signer,
      signerPos,
      urgency,
      secrecy,
      orgName: user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด'
    });
    setPreviewHtml(html);
  };

  const handleSaveDraft = async () => {
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
      createdBy: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ใช้งาน',
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

    if (onSendToSignQueue) {
      onSendToSignQueue({
        id: Date.now(),
        date,
        type: docType,
        subject,
        proposer: signer || user?.firstName || 'ธุรการ',
        status: 'รอลงนาม'
      });
    }

    alert('บันทึกร่างหนังสือเรียบร้อยแล้ว');
  };

  const handleDeleteDraft = async (id: number) => {
    if (!confirm('ต้องการลบร่างหนังสือฉบับนี้ใช่หรือไม่?')) return;
    
    const itemToDelete = draftsHistory.find(d => d.id === id);
    const userNameToPass = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user?.username || 'ผู้ใช้งาน' : 'ผู้ใช้งาน';

    if (itemToDelete && (itemToDelete as any).dbId) {
      try {
        await fetch(`/api/drafts/${(itemToDelete as any).dbId}?username=${encodeURIComponent(userNameToPass)}`, { method: 'DELETE' });
      } catch (e) {
        console.error(e);
      }
    } else {
      try {
        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'DELETE_DRAFT',
            details: `ลบร่างหนังสือ: ${itemToDelete?.subject || id}`,
            username: userNameToPass
          })
        });
      } catch (e) {
        console.error(e);
      }
    }

    const updated = draftsHistory.filter(d => d.id !== id);
    setDraftsHistory(updated);
    localStorage.setItem('moi_drafts', JSON.stringify(updated));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-light)] pb-4">
        <div>
          <h2 className="text-2xl font-noto-serif-thai font-bold text-[var(--text-primary)]">
            ร่างหนังสือราชการ
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            สร้างและร่างหนังสือราชการตามแบบฟอร์มมาตรฐาน พร้อมระบบจัดรูปแบบคำและตราครุฑ
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'new' ? 'bg-[var(--primary-color)] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-light)]'
            }`}
          >
            <Plus className="w-4 h-4" /> ร่างหนังสือใหม่
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'history' ? 'bg-[var(--primary-color)] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-light)]'
            }`}
          >
            <History className="w-4 h-4" /> ประวัติหนังสือร่าง ({draftsHistory.length})
          </button>
        </div>
      </div>

      {activeTab === 'new' && (
        <div className="space-y-6">
          {/* Letter Types Grid */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">เลือกประเภทหนังสือราชการ</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {LETTER_TYPES.map(t => {
                const isSelected = selectedType === t.template && showForm;
                return (
                  <button
                    key={t.template}
                    onClick={() => handleSelectType(t.template, t.title)}
                    className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/10 ring-2 ring-[var(--primary-color)]/30'
                        : 'border-[var(--border-light)] bg-[var(--bg-overlay)] hover:border-[var(--primary-color)]/50 hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <div>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${
                        isSelected ? 'bg-[var(--primary-color)] text-white' : 'bg-[var(--primary-color)]/10 text-[var(--primary-color)]'
                      }`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <h4 className="font-semibold text-xs text-[var(--text-primary)] leading-tight">{t.title}</h4>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1.5 line-clamp-2">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Card */}
          {showForm && (
            <div className={`grid grid-cols-1 ${showAuditPanel ? 'lg:grid-cols-3' : ''} gap-6 animate-fade-in items-start`}>
              <div className={`${showAuditPanel ? 'lg:col-span-2' : ''} bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6 shadow-sm space-y-6`}>
                <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-4">
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[var(--primary-color)]" /> {selectedTitle}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  ปิดฟอร์ม
                </button>
              </div>

              {/* Form Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">เลขที่หนังสือ (ที่)</label>
                  <input
                    type="text"
                    value={docNum}
                    onChange={e => setDocNum(e.target.value)}
                    placeholder="เช่น รย 0021.1/123 หรือ คำสั่งจังหวัดระยอง ที่ 12/2569"
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none font-mono"
                  />
                  {docNum && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {parseDocNumberStructure(docNum, docType).tags.map((tag, idx) => (
                        <span key={idx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20">
                          {tag.label}: <strong className="font-bold">{tag.value}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ลงวันที่</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ประเภทหนังสือ</label>
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none cursor-pointer"
                  >
                    <option value="หนังสือภายนอก">หนังสือภายนอก</option>
                    <option value="หนังสือภายใน">หนังสือภายใน</option>
                    <option value="หนังสือประทับตรา">หนังสือประทับตรา</option>
                    <option value="หนังสือรับรอง">หนังสือรับรอง</option>
                    <option value="บันทึกข้อความ">บันทึกข้อความ</option>
                    <option value="ระเบียบ">ระเบียบ</option>
                    <option value="ข้อบังคับ">ข้อบังคับ</option>
                    <option value="แถลงการณ์">แถลงการณ์</option>
                    <option value="ข่าว">ข่าว</option>
                    <option value="หนังสือเวียน (ว.)">หนังสือเวียน (ว.)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ความเร่งด่วน</label>
                  <select
                    value={urgency}
                    onChange={e => setUrgency(e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none cursor-pointer"
                  >
                    <option value="ปกติ">ปกติ</option>
                    <option value="ด่วน">ด่วน</option>
                    <option value="ด่วนมาก">ด่วนมาก</option>
                    <option value="ด่วนที่สุด">ด่วนที่สุด</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ชั้นความลับ</label>
                  <select
                    value={secrecy}
                    onChange={e => setSecrecy(e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none cursor-pointer"
                  >
                    <option value="">ไม่ลับ (ทั่วไป)</option>
                    <option value="ลับ">ลับ</option>
                    <option value="ลับมาก">ลับมาก</option>
                    <option value="ลับที่สุด">ลับที่สุด</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">เรียน / ถึง <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    placeholder="เช่น ผู้ว่าราชการจังหวัดระยอง / นายอำเภอ..."
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">เรื่อง <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="กรอกชื่อเรื่องของหนังสือราชการ..."
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-medium focus:border-[var(--primary-color)] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">อ้างถึง (ถ้ามี)</label>
                  <input
                    type="text"
                    value={refText}
                    onChange={e => setRefText(e.target.value)}
                    placeholder="เลขที่หนังสืออ้างถึง..."
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">สิ่งที่ส่งมาด้วย (ถ้ามี)</label>
                  <input
                    type="text"
                    value={attText}
                    onChange={e => setAttText(e.target.value)}
                    placeholder="รายละเอียดเอกสารแนบ..."
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                  />
                </div>
              </div>

              {/* Rich Editor Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">เนื้อหาหนังสือราชการ</label>
                </div>

                <div className="border border-[var(--border-light)] rounded-xl overflow-hidden bg-[var(--bg-overlay)]">
                  {/* Editor Toolbar */}
                  <div className="bg-[var(--bg-elevated)] border-b border-[var(--border-light)] p-2 flex flex-wrap items-center gap-1">
                    <button
                      onClick={() => execCommand('bold')}
                      className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded transition-colors"
                      title="ตัวหนา"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => execCommand('italic')}
                      className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded transition-colors"
                      title="ตัวเอียง"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => execCommand('underline')}
                      className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded transition-colors"
                      title="ขีดเส้นใต้"
                    >
                      <Underline className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-px bg-[var(--border-light)] mx-1" />

                    <button
                      onClick={() => execCommand('justifyLeft')}
                      className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded transition-colors"
                      title="จัดชิดซ้าย"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => execCommand('justifyCenter')}
                      className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded transition-colors"
                      title="จัดกึ่งกลาง"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => execCommand('justifyRight')}
                      className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded transition-colors"
                      title="จัดชิดขวา"
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => execCommand('justifyFull')}
                      className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded transition-colors"
                      title="จัดเต็มความกว้าง"
                    >
                      <AlignJustify className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-px bg-[var(--border-light)] mx-1" />

                    <button
                      onClick={() => insertTemplateBlock('bg')}
                      className="px-2.5 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border-light)] hover:border-[var(--primary-color)] rounded font-medium text-[var(--text-primary)] transition-colors"
                    >
                      + ความเป็นมา
                    </button>
                    <button
                      onClick={() => insertTemplateBlock('obj')}
                      className="px-2.5 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border-light)] hover:border-[var(--primary-color)] rounded font-medium text-[var(--text-primary)] transition-colors"
                    >
                      + วัตถุประสงค์
                    </button>
                    <button
                      onClick={() => insertTemplateBlock('closing')}
                      className="px-2.5 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border-light)] hover:border-[var(--primary-color)] rounded font-medium text-[var(--text-primary)] transition-colors"
                    >
                      + จึงเรียนมา
                    </button>

                    <div className="h-4 w-px bg-[var(--border-light)] mx-1" />

                    <div className="relative">
                      <button
                        onClick={() => setShowGarudaPanel(!showGarudaPanel)}
                        className="px-2.5 py-1 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 rounded font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Crown className="w-3.5 h-3.5" /> แทรกตราครุฑ
                      </button>

                      {/* Garuda Panel Dropdown */}
                      {showGarudaPanel && (
                        <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-[var(--bg-surface)] border border-amber-500/40 rounded-xl shadow-xl z-30 space-y-3">
                          <div className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between border-b border-[var(--border-lighter)] pb-1.5">
                            <span>ตั้งค่าการแทรกตราครุฑ</span>
                            <button onClick={() => setShowGarudaPanel(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div>
                            <label className="text-[11px] text-[var(--text-secondary)] block mb-1">ขนาด</label>
                            <div className="flex gap-2">
                              {['60', '90', '120'].map(sz => (
                                <label key={sz} className="text-xs text-[var(--text-primary)] flex items-center gap-1 cursor-pointer">
                                  <input type="radio" name="garudaSize" value={sz} checked={garudaSize === sz} onChange={e => setGarudaSize(e.target.value)} />
                                  {sz === '60' ? 'เล็ก' : sz === '90' ? 'กลาง' : 'ใหญ่'}
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] text-[var(--text-secondary)] block mb-1">การจัดวาง</label>
                            <div className="flex gap-2">
                              {[
                                { id: 'left', label: 'ซ้าย' },
                                { id: 'center', label: 'กลาง' },
                                { id: 'right', label: 'ขวา' }
                              ].map(al => (
                                <label key={al.id} className="text-xs text-[var(--text-primary)] flex items-center gap-1 cursor-pointer">
                                  <input type="radio" name="garudaAlign" value={al.id} checked={garudaAlign === al.id} onChange={e => setGarudaAlign(e.target.value)} />
                                  {al.label}
                                </label>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={insertGaruda}
                            className="w-full bg-amber-500 text-slate-950 text-xs font-bold py-1.5 rounded-lg hover:bg-amber-400 transition-colors cursor-pointer"
                          >
                            แทรกลงในเนื้อหา
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Editable Body Area */}
                  <div
                    ref={editorRef}
                    contentEditable
                    className="p-4 min-h-[220px] text-sm text-[var(--text-primary)] leading-relaxed outline-none focus:ring-0 custom-scrollbar"
                    style={{ fontFamily: "'Sarabun', sans-serif" }}
                  />
                </div>
              </div>

              {/* Signer Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-lighter)]">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ชื่อผู้ลงนาม</label>
                  <input
                    type="text"
                    value={signer}
                    onChange={e => setSigner(e.target.value)}
                    placeholder="เช่น นายสมชาย ใจดี"
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ตำแหน่งผู้ลงนาม</label>
                  <input
                    type="text"
                    value={signerPos}
                    onChange={e => setSignerPos(e.target.value)}
                    placeholder="เช่น ปลัดองค์กรปกครองส่วนท้องถิ่น"
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-lighter)]">
                <div className="flex gap-2">
                  <button
                    onClick={handlePreview}
                    className="px-4 py-2 bg-[var(--primary-color)] text-white text-xs font-medium rounded-lg hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Eye className="w-4 h-4" /> แสดงตัวอย่าง
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Save className="w-4 h-4" /> บันทึกหนังสือร่าง
                  </button>
                  <button
                    onClick={handleAuditDocument}
                    disabled={isAuditing}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse" /> ตรวจสอบด้วย AI
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handlePreview}
                    className="px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-medium rounded-lg hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-violet-400" /> พิมพ์
                  </button>
                  <button
                    onClick={() => {
                      if (!editorRef.current) return;
                      const html = buildOfficialDoc({
                        docType, docNum, date, to, subject, ref: refText, att: attText, body: editorRef.current.innerHTML, signer, signerPos, orgName: user?.department
                      });
                      downloadAsDoc(html, `ร่างหนังสือ_${subject || 'ราชการ'}`);
                    }}
                    className="px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-medium rounded-lg hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-blue-400" /> ส่งออก Word
                  </button>
                </div>
              </div>
            </div>

              {/* AI Audit Panel Column */}
              {showAuditPanel && (
                <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-5 shadow-sm space-y-4 lg:sticky lg:top-4 max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col">
                  <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                      <h3 className="font-bold text-sm text-[var(--text-primary)] font-noto-serif-thai">
                        ผลการตรวจหนังสือด้วย AI
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowAuditPanel(false)}
                      className="p-1 hover:bg-[var(--border-lighter)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {isAuditing && (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-[var(--text-secondary)]">กำลังวิเคราะห์ความครบถ้วน รูปแบบ ไวยากรณ์ คำราชาศัพท์ และคำปิดท้ายด้วย AI...</p>
                    </div>
                  )}

                  {!isAuditing && auditResult && (
                    <div className="space-y-4">
                      {/* Score section */}
                      <div className="p-4 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-xs text-[var(--text-secondary)] font-semibold mb-1">คะแนนความสมบูรณ์</div>
                          <div className="text-2xl font-black font-mono text-indigo-500">{auditResult.overallScore} <span className="text-xs text-[var(--text-muted)] font-normal">/ 100</span></div>
                        </div>
                        <div className="w-2/3 bg-[var(--border-lighter)] rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              auditResult.overallScore >= 80 ? 'bg-emerald-500' : auditResult.overallScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${auditResult.overallScore}%` }}
                          />
                        </div>
                      </div>

                      {/* Summary */}
                      <p className="text-xs text-[var(--text-secondary)] italic">
                        "{auditResult.summary}"
                      </p>

                      {/* Crucial recommendation suggestion block if closure requires improvement */}
                      {auditResult.closingSuggestion && auditResult.closingSuggestion.found && (
                        <div className="p-4 bg-amber-500/10 border-l-4 border-amber-500 text-amber-800 dark:text-amber-300 rounded-r-xl space-y-2">
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            คำลงท้ายที่ควรปรับปรุงตามหลักราชการ
                          </div>
                          <p className="text-xs leading-relaxed">
                            ควรใช้คำว่า <strong className="underline text-amber-600 dark:text-amber-400">"{auditResult.closingSuggestion.suggestedPhrase}"</strong> แทน <span className="line-through text-slate-400">"{auditResult.closingSuggestion.currentPhrase}"</span>
                          </p>
                          <p className="text-[11px] leading-relaxed opacity-90">
                            {auditResult.closingSuggestion.explanation}
                          </p>
                        </div>
                      )}

                      {/* Apply auto fix button */}
                      {auditResult.improvedContent && (
                        <button
                          onClick={() => {
                            if (editorRef.current && auditResult.improvedContent) {
                              editorRef.current.innerHTML = auditResult.improvedContent;
                              alert('ปรับปรุงข้อความและคำลงท้ายเรียบร้อยแล้ว');
                            }
                          }}
                          className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-indigo-500 hover:to-purple-500 shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> นำข้อเสนอแนะทั้งหมดไปปรับปรุงแบบร่าง
                        </button>
                      )}

                      {/* Audit Tabs */}
                      <div className="flex gap-1 border-b border-[var(--border-lighter)] overflow-x-auto pb-1">
                        {([
                          { id: 'all', label: 'ทั้งหมด' },
                          { id: 'spelling', label: `คำผิด (${auditResult.spellingIssues?.length || 0})` },
                          { id: 'format', label: `รูปแบบ (${auditResult.formatIssues?.length || 0})` },
                          { id: 'royal', label: `ราชาศัพท์ (${auditResult.royalVocabularyIssues?.length || 0})` },
                          { id: 'completeness', label: `ครบถ้วน (${auditResult.completenessIssues?.length || 0})` }
                        ] as const).map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveAuditTab(tab.id)}
                            className={`px-2 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                              activeAuditTab === tab.id 
                                ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' 
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Tab Contents */}
                      <div className="space-y-3 pt-1">
                        {/* Spelling issues */}
                        {(activeAuditTab === 'all' || activeAuditTab === 'spelling') && auditResult.spellingIssues && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">✍️ คำที่ตรวจพบคำผิด</h4>
                            {auditResult.spellingIssues.length === 0 ? (
                              <p className="text-[11px] text-[var(--text-muted)] italic">ไม่พบคำผิดสะกด</p>
                            ) : (
                              auditResult.spellingIssues.map((issue: any, idx: number) => (
                                <div key={idx} className="p-3 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-red-500 line-through font-medium">"{issue.word}"</span>
                                    <span className="text-xs text-[var(--text-secondary)] font-bold">➡️</span>
                                    <span className="text-xs text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">"{issue.suggested}"</span>
                                  </div>
                                  {issue.context && (
                                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed italic">บริบท: ...{issue.context}...</p>
                                  )}
                                  <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{issue.reason}</p>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {/* Format issues */}
                        {(activeAuditTab === 'all' || activeAuditTab === 'format') && auditResult.formatIssues && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">📐 รูปแบบโครงสร้างหนังสือราชการ</h4>
                            {auditResult.formatIssues.length === 0 ? (
                              <p className="text-[11px] text-[var(--text-muted)] italic">โครงสร้างและรูปแบบถูกต้องตามมาตรฐาน</p>
                            ) : (
                              auditResult.formatIssues.map((issue: any, idx: number) => (
                                <div key={idx} className="p-3 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${issue.severity === 'error' ? 'bg-red-500' : issue.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                    <span className="text-xs font-semibold text-[var(--text-primary)]">{issue.issue}</span>
                                  </div>
                                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed"><strong>คำแนะนำ:</strong> {issue.suggestion}</p>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {/* Royal terms */}
                        {(activeAuditTab === 'all' || activeAuditTab === 'royal') && auditResult.royalVocabularyIssues && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">👑 คำราชาศัพท์และระดับภาษา</h4>
                            {auditResult.royalVocabularyIssues.length === 0 ? (
                              <p className="text-[11px] text-[var(--text-muted)] italic">การใช้ภาษาและคำราชาศัพท์เหมาะสมดีแล้ว</p>
                            ) : (
                              auditResult.royalVocabularyIssues.map((issue: any, idx: number) => (
                                <div key={idx} className="p-3 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl space-y-1">
                                  <div className="text-xs font-semibold text-[var(--text-primary)]">{issue.issue}</div>
                                  <p className="text-[11px] text-emerald-500 font-semibold">ควรปรับปรุงเป็น: "{issue.suggestion}"</p>
                                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{issue.reason}</p>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {/* Completeness */}
                        {(activeAuditTab === 'all' || activeAuditTab === 'completeness') && auditResult.completenessIssues && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">📋 ความครบถ้วนขององค์ประกอบ</h4>
                            {auditResult.completenessIssues.length === 0 ? (
                              <p className="text-[11px] text-[var(--text-muted)] italic">องค์ประกอบครบถ้วนสมบูรณ์</p>
                            ) : (
                              auditResult.completenessIssues.map((issue: any, idx: number) => (
                                <div key={idx} className="p-3 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl flex items-start gap-2.5">
                                  {issue.status === 'ok' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                  ) : (
                                    <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${issue.status === 'missing' ? 'text-red-500' : 'text-amber-500'}`} />
                                  )}
                                  <div className="space-y-0.5">
                                    <div className="text-xs font-bold text-[var(--text-primary)]">{issue.component}</div>
                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{issue.description}</p>
                                    {issue.suggestion && (
                                      <p className="text-[10px] text-indigo-500 font-medium leading-relaxed">💡 {issue.suggestion}</p>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-[var(--text-primary)]">ประวัติหนังสือร่างในระบบ</h3>
          </div>

          {draftsHistory.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)] text-sm">
              ยังไม่มีประวัติการร่างหนังสือ
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-lighter)] text-xs font-semibold text-[var(--text-secondary)]">
                    <th className="p-3 w-12 text-center">ลำดับ</th>
                    <th className="p-3 w-36">เลขที่หนังสือ</th>
                    <th className="p-3 w-32">วันที่</th>
                    <th className="p-3">เรื่อง</th>
                    <th className="p-3 w-36">ประเภท</th>
                    <th className="p-3 w-36">ผู้ลงนาม</th>
                    <th className="p-3 w-28 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-lighter)]">
                  {draftsHistory.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-[var(--border-lighter)]/30 transition-colors">
                      <td className="p-3 text-center text-xs text-[var(--text-muted)]">{idx + 1}</td>
                      <td className="p-3 font-mono font-medium text-xs text-[var(--text-primary)]">{item.docNum || '-'}</td>
                      <td className="p-3 text-xs text-[var(--text-secondary)]">{thDate(item.date)}</td>
                      <td className="p-3 font-medium text-[var(--text-primary)]">{item.subject}</td>
                      <td className="p-3"><span className="px-2 py-0.5 text-xs rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{item.docType}</span></td>
                      <td className="p-3 text-xs text-[var(--text-secondary)]">{item.signer || '-'}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              const html = buildOfficialDoc({
                                docType: item.docType,
                                docNum: item.docNum,
                                date: item.date,
                                to: item.to,
                                subject: item.subject,
                                ref: item.ref,
                                att: item.att,
                                body: item.body,
                                signer: item.signer,
                                signerPos: item.signerPos
                              });
                              setPreviewHtml(html);
                            }}
                            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                            title="ดูตัวอย่าง"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const html = buildOfficialDoc({
                                docType: item.docType,
                                docNum: item.docNum,
                                date: item.date,
                                to: item.to,
                                subject: item.subject,
                                ref: item.ref,
                                att: item.att,
                                body: item.body,
                                signer: item.signer,
                                signerPos: item.signerPos
                              });
                              downloadAsDoc(html, `ร่างหนังสือ_${item.subject}`);
                            }}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors"
                            title="ส่งออก Word"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDraft(item.id)}
                            className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-elevated)]">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[var(--primary-color)]" /> ตัวอย่างหนังสือราชการ
              </h3>
              <button onClick={() => setPreviewHtml(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-white text-slate-900 custom-scrollbar">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
            <div className="p-4 border-t border-[var(--border-light)] flex justify-end gap-2 bg-[var(--bg-elevated)]">
              <button
                onClick={() => setPreviewHtml(null)}
                className="px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-medium rounded-lg hover:bg-[var(--border-lighter)] cursor-pointer"
              >
                ปิด
              </button>
              <button
                onClick={() => downloadAsDoc(previewHtml, `หนังสือราชการ_${subject || 'ร่าง'}`)}
                className="px-4 py-2 bg-[var(--primary-color)] text-white text-xs font-medium rounded-lg hover:bg-[var(--primary-hover)] flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileDown className="w-4 h-4" /> ดาวน์โหลด Word (.doc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
