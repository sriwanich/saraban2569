import React, { useState, useEffect, useRef } from 'react';
import { 
  FileEdit, Eye, Save, Printer, FileDown, Trash2, 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  AlignJustify, Crown, Building, HelpCircle, X, Search
} from 'lucide-react';
import { CustomOrderItem, downloadAsDoc, thDateFull, toThaiNumeral, getSingleSealHTML, getLogoHTML } from './draftData';
import { useConfirm } from '../../../context/ConfirmContext';

interface Props {
  user: any;
  onSendToSignQueue?: (item: any) => void;
}

export default function CustomOrderView({ user, onSendToSignQueue }: Props) {
  const { confirm } = useConfirm();
  const [docType, setDocType] = useState<string>('คำสั่ง');
  const [docNum, setDocNum] = useState<string>('๑๕/๒๕๖๙');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [signDate, setSignDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [place, setPlace] = useState<string>(user?.department || 'องค์กรปกครองส่วนท้องถิ่น');
  const [subject, setSubject] = useState<string>('');
  const [signer, setSigner] = useState<string>('นายสมชาย ใจดี');
  const [signerPos, setSignerPos] = useState<string>('นายกองค์กรปกครองส่วนท้องถิ่น');

  const [sealMode, setSealMode] = useState<'garuda' | 'logo' | 'none'>('garuda');

  const editorRef = useRef<HTMLDivElement>(null);

  // Saved Orders List
  const [customOrders, setCustomOrders] = useState<CustomOrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');

  // Preview Modal
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('moi_custom_orders');
      if (saved) setCustomOrders(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
  };

  const insertSnippet = (text: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertHTML', false, text);
    }
  };

  const getGuidelineText = () => {
    switch (docType) {
      case 'คำสั่ง':
        return 'คำสั่ง คือ บรรดาข้อความที่ผู้มีอำนาจสั่งการให้ปฏิบัติโดยชอบด้วยกฎหมาย ใช้ตราครุฑเป็นหลัก';
      case 'ประกาศ':
        return 'ประกาศ คือ บรรดาข้อความที่ทางราชการประกาศหรือชี้แจงให้ทราบ หรือกำหนดแนวทางปฏิบัติ';
      case 'ระเบียบ':
        return 'ระเบียบ คือ บรรดาข้อความที่ผู้มีอำนาจวางไว้โดยอาศัยอำนาจของกฎหมายเพื่อเป็นหลักปฏิบัติงาน';
      case 'ข้อบังคับ':
        return 'ข้อบังคับ คือ บรรดาข้อความที่ผู้มีอำนาจกำหนดให้ใช้โดยอาศัยอำนาจของกฎหมายที่ให้กระทำได้';
      default:
        return 'เลือกประเภทเอกสารที่ต้องการจัดทำ';
    }
  };

  const buildHTML = () => {
    const org = place || user?.department || 'องค์กรปกครองส่วนท้องถิ่น';
    const numThai = toThaiNumeral(docNum);
    const dateThai = thDateFull(signDate);

    let sealHTML = '';
    if (sealMode === 'garuda') sealHTML = getSingleSealHTML(113);
    else if (sealMode === 'logo') sealHTML = getLogoHTML(113);

    return `<div style="font-family:'TH SarabunPSK','Sarabun',sans-serif;font-size:16pt;line-height:1.5;max-width:800px;margin:0 auto;color:#000;">
${sealHTML ? `<div style="text-align:center;margin-bottom:8pt;">${sealHTML}</div>` : ''}

<div style="text-align:center;font-size:20pt;font-weight:bold;margin-bottom:4pt;">
  ${docType} ${org}
</div>
<div style="text-align:center;font-size:16pt;margin-bottom:12pt;">
  ที่ ${numThai}
</div>
<div style="text-align:center;font-size:16pt;font-weight:bold;margin-bottom:16pt;">
  เรื่อง ${subject || '...'}
</div>

<div style="font-size:16pt;line-height:1.6;text-align:justify;">
  ${editorRef.current?.innerHTML || ''}
</div>

<div style="margin-top:16pt;text-align:center;">
  สั่ง ณ วันที่ ${dateThai}
</div>

<table width="100%" cellpadding="0" cellspacing="0" style="border:none;border-collapse:collapse;margin-top:24pt;">
  <tr>
    <td width="40%" style="border:none;"></td>
    <td width="60%" style="border:none;text-align:center;padding:0;">
      <div style="height:48pt;"></div>
      <div>(${signer || '..................................'})</div>
      <div>${signerPos || 'ผู้มีอำนาจสั่งการ'}</div>
    </td>
  </tr>
</table>
</div>`;
  };

  const handleSave = async () => {
    if (!subject) {
      alert('กรุณากรอกเรื่องก่อนบันทึก');
      return;
    }

    const confirmed = await confirm({
      title: `ยืนยันการบันทึก${docType}`,
      message: `คุณต้องการบันทึก${docType} เรื่อง "${subject}" ใช่หรือไม่?`,
      type: 'edit',
      confirmText: 'ยืนยันการบันทึก',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    const newItem: CustomOrderItem = {
      id: Date.now(),
      doctype: docType,
      num: docNum,
      date,
      signdate: signDate,
      subject,
      signer,
      signerpos: signerPos,
      place,
      body: editorRef.current?.innerHTML || '',
      sealMode,
      createdAt: new Date().toISOString()
    };

    const updated = [newItem, ...customOrders];
    setCustomOrders(updated);
    localStorage.setItem('moi_custom_orders', JSON.stringify(updated));
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE_DRAFT',
        details: `บันทึกร่าง${docType === 'order' ? 'คำสั่ง' : 'ประกาศ'}: ${subject}`,
        username: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ใช้งาน'
      })
    }).catch(console.error);

    if (onSendToSignQueue) {
      onSendToSignQueue({
        id: Date.now(),
        date: signDate,
        type: docType,
        subject,
        proposer: user?.firstName || 'ผู้ดูแลระบบ',
        status: 'รอลงนาม'
      });
    }

    alert('บันทึกคำสั่ง/ประกาศเรียบร้อยแล้ว');
  };

  const handleDelete = async (id: number) => {
    const item = customOrders.find(o => o.id === id);
    const confirmed = await confirm({
      title: 'ยืนยันการลบรายการ',
      message: `ต้องการลบรายการ "${item?.subject || ''}" ใช่หรือไม่?`,
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    const updated = customOrders.filter(o => o.id !== id);
    setCustomOrders(updated);
    localStorage.setItem('moi_custom_orders', JSON.stringify(updated));
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'DELETE_DRAFT',
        details: `ลบร่าง${item?.doctype === 'order' ? 'คำสั่ง' : 'ประกาศ'}: ${item?.subject || id}`,
        username: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ใช้งาน'
      })
    }).catch(console.error);
  };

  const filteredOrders = customOrders.filter(o => {
    const matchType = filterType === 'all' || o.doctype === filterType;
    const matchQuery = !searchQuery || o.subject.includes(searchQuery) || o.num.includes(searchQuery);
    return matchType && matchQuery;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="border-b border-[var(--border-light)] pb-4">
        <h2 className="text-2xl font-sans font-bold text-[var(--text-primary)]">
          สร้างคำสั่ง / ประกาศ / ระเบียบ เองแบบอิสระ
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          ยืดหยุ่นสูง ปรับแต่งโครงสร้างข้อความ ตราสัญลักษณ์ และผู้ลงนามได้ตามต้องการ
        </p>
      </div>

      {/* Editor & Form */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6 shadow-sm space-y-5">
        {/* Type Selection Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[var(--text-secondary)] shrink-0">ประเภทเอกสาร:</span>
            <div className="flex flex-wrap gap-2">
              {['คำสั่ง', 'ประกาศ', 'ระเบียบ', 'ข้อบังคับ', 'แถลงการณ์'].map(t => (
                <button
                  key={t}
                  onClick={() => setDocType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    docType === t
                      ? 'bg-[var(--primary-color)] text-white shadow-sm'
                      : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-light)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span className="line-clamp-1">{getGuidelineText()}</span>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">เลขที่ {docType}</label>
            <input
              type="text"
              value={docNum}
              onChange={e => setDocNum(e.target.value)}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">สั่ง ณ วันที่</label>
            <input
              type="date"
              value={signDate}
              onChange={e => setSignDate(e.target.value)}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">สถานที่ออกเอกสาร</label>
            <input
              type="text"
              value={place}
              onChange={e => setPlace(e.target.value)}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">เรื่อง <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={`กรอกเรื่องของ${docType}...`}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm font-semibold text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
            />
          </div>

          {/* Seal Selector */}
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">ตราสัญลักษณ์หัวเรื่อง</label>
            <div className="flex gap-4">
              <label className="text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer">
                <input type="radio" name="sealCustom" checked={sealMode === 'garuda'} onChange={() => setSealMode('garuda')} />
                <Crown className="w-4 h-4 text-amber-500" /> ตราครุฑ
              </label>
              <label className="text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer">
                <input type="radio" name="sealCustom" checked={sealMode === 'logo'} onChange={() => setSealMode('logo')} />
                <Building className="w-4 h-4 text-blue-500" /> ตราประจำหน่วยงาน
              </label>
              <label className="text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer">
                <input type="radio" name="sealCustom" checked={sealMode === 'none'} onChange={() => setSealMode('none')} />
                ไม่ใช้ตรา
              </label>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">เนื้อหารายละเอียด {docType}</label>
          <div className="border border-[var(--border-light)] rounded-xl overflow-hidden bg-[var(--bg-overlay)]">
            <div className="bg-[var(--bg-elevated)] border-b border-[var(--border-light)] p-2 flex flex-wrap items-center gap-1.5">
              <button onClick={() => execCommand('bold')} className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded"><Bold className="w-4 h-4" /></button>
              <button onClick={() => execCommand('italic')} className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded"><Italic className="w-4 h-4" /></button>
              <button onClick={() => execCommand('underline')} className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded"><Underline className="w-4 h-4" /></button>

              <div className="h-4 w-px bg-[var(--border-light)] mx-1" />

              <button onClick={() => execCommand('justifyLeft')} className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded"><AlignLeft className="w-4 h-4" /></button>
              <button onClick={() => execCommand('justifyCenter')} className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded"><AlignCenter className="w-4 h-4" /></button>
              <button onClick={() => execCommand('justifyRight')} className="p-1.5 text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded"><AlignRight className="w-4 h-4" /></button>

              <div className="h-4 w-px bg-[var(--border-light)] mx-1" />

              <button onClick={() => insertSnippet('<p style="text-indent:3em;">อาศัยอำนาจตามความในมาตรา...</p>')} className="px-2.5 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border-light)] rounded text-[var(--text-primary)] hover:border-[var(--primary-color)]">
                + อาศัยอำนาจ
              </button>
              <button onClick={() => insertSnippet('<p style="text-indent:3em;">จึงมีคำสั่งดังต่อไปนี้ :-</p>')} className="px-2.5 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border-light)] rounded text-[var(--text-primary)] hover:border-[var(--primary-color)]">
                + จึงมีคำสั่ง
              </button>
              <button onClick={() => insertSnippet('<p style="text-indent:3em;">ทั้งนี้ ตั้งแต่บัดนี้เป็นต้นไป</p>')} className="px-2.5 py-1 text-xs bg-[var(--bg-surface)] border border-[var(--border-light)] rounded text-[var(--text-primary)] hover:border-[var(--primary-color)]">
                + ตั้งแต่บัดนี้
              </button>
            </div>

            <div
              ref={editorRef}
              contentEditable
              className="p-4 min-h-[220px] text-sm text-[var(--text-primary)] leading-relaxed outline-none custom-scrollbar"
              style={{ fontFamily: "'Sarabun', sans-serif" }}
            />
          </div>
        </div>

        {/* Signer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-lighter)]">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ชื่อผู้ลงนาม</label>
            <input
              type="text"
              value={signer}
              onChange={e => setSigner(e.target.value)}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ตำแหน่งผู้ลงนาม</label>
            <input
              type="text"
              value={signerPos}
              onChange={e => setSignerPos(e.target.value)}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-lighter)]">
          <button
            onClick={() => setPreviewHtml(buildHTML())}
            className="px-4 py-2 bg-[var(--primary-color)] text-white text-xs font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Eye className="w-4 h-4" /> แสดงตัวอย่าง
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" /> บันทึก{docType}
            </button>
            <button
              onClick={() => downloadAsDoc(buildHTML(), subject || docType)}
              className="px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-medium rounded-lg hover:bg-[var(--bg-elevated)] flex items-center gap-1.5 cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-blue-400" /> ส่งออก Word
            </button>
          </div>
        </div>
      </div>

      {/* Saved Custom Orders Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-lighter)] pb-3">
          <h3 className="text-base font-bold text-[var(--text-primary)]">รายการคำสั่ง/ประกาศที่สร้างไว้ ({filteredOrders.length})</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเรื่อง/เลขที่..."
              className="bg-[var(--bg-overlay)] border border-[var(--border-light)] text-xs rounded-lg px-3 py-1.5 text-[var(--text-primary)] outline-none"
            />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-[var(--bg-overlay)] border border-[var(--border-light)] text-xs rounded-lg px-2 py-1.5 text-[var(--text-primary)] outline-none cursor-pointer"
            >
              <option value="all">ทุกประเภท</option>
              <option value="คำสั่ง">คำสั่ง</option>
              <option value="ประกาศ">ประกาศ</option>
              <option value="ระเบียบ">ระเบียบ</option>
              <option value="ข้อบังคับ">ข้อบังคับ</option>
            </select>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 text-[var(--text-muted)] text-sm">ไม่พบรายการคำสั่ง/ประกาศ</div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-lighter)] text-xs font-semibold text-[var(--text-secondary)]">
                  <th className="p-3 w-12 text-center">ลำดับ</th>
                  <th className="p-3 w-28">ประเภท</th>
                  <th className="p-3 w-32">เลขที่</th>
                  <th className="p-3">เรื่อง</th>
                  <th className="p-3 w-36">สั่ง ณ วันที่</th>
                  <th className="p-3 w-36">ผู้ลงนาม</th>
                  <th className="p-3 w-24 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-lighter)]">
                {filteredOrders.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-[var(--border-lighter)]/30 transition-colors">
                    <td className="p-3 text-center text-xs text-[var(--text-muted)]">{idx + 1}</td>
                    <td className="p-3"><span className="px-2 py-0.5 text-xs rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">{item.doctype}</span></td>
                    <td className="p-3 font-mono font-medium text-xs text-[var(--text-primary)]">{item.num}</td>
                    <td className="p-3 font-medium text-[var(--text-primary)]">{item.subject}</td>
                    <td className="p-3 text-xs text-[var(--text-secondary)]">{thDateFull(item.signdate)}</td>
                    <td className="p-3 text-xs text-[var(--text-secondary)]">{item.signer || '-'}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-elevated)]">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[var(--primary-color)]" /> ตัวอย่าง {docType}
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
                onClick={() => downloadAsDoc(previewHtml, subject || docType)}
                className="px-4 py-2 bg-[var(--primary-color)] text-white text-xs font-bold rounded-lg hover:bg-[var(--primary-hover)] flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileDown className="w-4 h-4" /> ดาวน์โหลด Word (.docx)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
