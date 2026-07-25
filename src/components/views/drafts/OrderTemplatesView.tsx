import React, { useState, useEffect } from 'react';
import { 
  Award, FileText, CheckSquare, Plus, Eye, Save, Printer, 
  FileDown, UserCheck, X, Crown, Building, Layers
} from 'lucide-react';
import { 
  ORDER_DATA, ORDER_AUTHORITY, getOrderBackground, 
  downloadAsDoc, thDateFull, toThaiNumeral, getSingleSealHTML, getLogoHTML 
} from './draftData';

interface Props {
  user: any;
  onSendToSignQueue?: (item: any) => void;
}

export default function OrderTemplatesView({ user, onSendToSignQueue }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('🏛️ บริหารงานองค์กร');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('appoint_committee');
  const [selectedTemplateTitle, setSelectedTemplateTitle] = useState<string>('คำสั่งแต่งตั้งคณะกรรมการบริหาร อปท.');
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>('order');

  // Form State
  const [docNum, setDocNum] = useState<string>('๑๒๓/๒๕๖๙');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState<string>('แต่งตั้งคณะกรรมการบริหารและพัฒนาองค์กรปกครองส่วนท้องถิ่น');
  const [authority, setAuthority] = useState<string>(ORDER_AUTHORITY['appoint_committee'] || '');
  const [background, setBackground] = useState<string>('');
  const [duties, setDuties] = useState<string>('ให้คณะกรรมการที่ได้รับการแต่งตั้ง มีหน้าที่อำนวยความสะดวก ควบคุม กำกับดูแล และจัดทำรายงานผลการดำเนินงานเสนอต่อผู้บริหารท้องถิ่นเพื่อทราบ');

  // Seal Mode
  const [sealMode, setSealMode] = useState<'garuda' | 'logo' | 'none'>('garuda');

  // Committee Personnel Multi-select
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<{ id: number; name: string; position: string; committeePos: string }[]>([]);

  // Signer
  const [signer, setSigner] = useState<string>('นายสมชาย ใจดี');
  const [signerPos, setSignerPos] = useState<string>('นายกองค์กรปกครองส่วนท้องถิ่น');

  // Preview Modal
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    const savedUsers = localStorage.getItem('moi_users');
    if (savedUsers) {
      try {
        setUsersList(JSON.parse(savedUsers));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleTemplateChange = (tplId: string) => {
    let foundItem: any = null;
    let foundType = 'order';

    for (const cat of ORDER_DATA) {
      const item = cat.items.find(i => i.id === tplId);
      if (item) {
        foundItem = item;
        foundType = item.type;
        break;
      }
    }

    if (!foundItem) return;

    setSelectedTemplateId(tplId);
    setSelectedTemplateTitle(foundItem.title);
    setSelectedTemplateType(foundType);

    setSubject(foundItem.title);
    setAuthority(ORDER_AUTHORITY[tplId] || `อาศัยอำนาจตามระเบียบกฎหมายที่เกี่ยวข้อง`);
    const org = user?.department || 'องค์กรปกครองส่วนท้องถิ่น';
    setBackground(getOrderBackground(tplId, org, foundItem.title));
  };

  const handleTogglePersonnel = (u: any) => {
    const fullName = `${u.firstName || u.name || ''} ${u.lastName || ''}`.trim();
    const exists = selectedPersonnel.find(p => p.id === u.id);
    if (exists) {
      setSelectedPersonnel(selectedPersonnel.filter(p => p.id !== u.id));
    } else {
      setSelectedPersonnel([
        ...selectedPersonnel,
        {
          id: u.id,
          name: fullName,
          position: u.position || 'เจ้าพนักงาน',
          committeePos: selectedPersonnel.length === 0 ? 'ประธานกรรมการ' : 'กรรมการ'
        }
      ]);
    }
  };

  const buildOrderHTML = () => {
    const org = user?.department || 'องค์กรปกครองส่วนท้องถิ่น';
    const dateThai = thDateFull(date);
    const numThai = toThaiNumeral(docNum);

    let sealHTML = '';
    if (sealMode === 'garuda') {
      sealHTML = getSingleSealHTML(113);
    } else if (sealMode === 'logo') {
      sealHTML = getLogoHTML(113);
    }

    const titlePrefix = selectedTemplateType === 'announce' ? 'ประกาศ' : 'คำสั่ง';

    let committeeHTML = '';
    if (selectedPersonnel.length > 0) {
      committeeHTML = `<div style="margin-top:12pt;">
        <p style="font-weight:bold;margin-bottom:6pt;">ประกอบด้วยบุคคลดังต่อไปนี้ :-</p>
        <ol style="padding-left:2.5em;line-height:2;">
          ${selectedPersonnel.map((p, idx) => `<li>${p.name} ตำแหน่ง ${p.position} เป็น ${p.committeePos}</li>`).join('')}
        </ol>
      </div>`;
    }

    return `<div style="font-family:'TH SarabunPSK','Sarabun',sans-serif;font-size:16pt;line-height:1.5;max-width:800px;margin:0 auto;color:#000;">
${sealHTML ? `<div style="text-align:center;margin-bottom:8pt;">${sealHTML}</div>` : ''}

<div style="text-align:center;font-size:20pt;font-weight:bold;margin-bottom:4pt;">
  ${titlePrefix} ${org}
</div>
<div style="text-align:center;font-size:16pt;margin-bottom:12pt;">
  ที่ ${numThai}
</div>
<div style="text-align:center;font-size:16pt;font-weight:bold;margin-bottom:16pt;">
  เรื่อง ${subject}
</div>

<div style="text-indent:3em;text-align:justify;margin-bottom:10pt;">
  ${background}
</div>

<div style="text-indent:3em;text-align:justify;margin-bottom:10pt;">
  ${authority} จึงแต่งตั้งบุคคลดังต่อไปนี้ปฏิบัติหน้าที่ตามคำสั่ง
</div>

${committeeHTML}

<div style="margin-top:12pt;text-indent:3em;text-align:justify;">
  <strong>อำนาจและหน้าที่ :-</strong><br>
  ${duties}
</div>

<div style="margin-top:16pt;text-indent:3em;text-align:justify;">
  ทั้งนี้ ตั้งแต่บัดนี้เป็นต้นไป
</div>

<div style="margin-top:12pt;text-align:center;">
  สั่ง ณ วันที่ ${dateThai}
</div>

<table width="100%" cellpadding="0" cellspacing="0" style="border:none;border-collapse:collapse;margin-top:24pt;">
  <tr>
    <td width="40%" style="border:none;"></td>
    <td width="60%" style="border:none;text-align:center;padding:0;">
      <div style="height:48pt;"></div>
      <div>(${signer})</div>
      <div>${signerPos}</div>
      <div>${org}</div>
    </td>
  </tr>
</table>
</div>`;
  };

  const handlePreview = () => {
    setPreviewHtml(buildOrderHTML());
  };

  const handleSave = () => {
    const html = buildOrderHTML();
    if (onSendToSignQueue) {
      onSendToSignQueue({
        id: Date.now(),
        date,
        type: selectedTemplateType === 'announce' ? 'ประกาศ' : 'คำสั่ง',
        subject,
        proposer: user?.firstName || 'ผู้ดูแลระบบ',
        status: 'รอลงนาม'
      });
    }
    alert('บันทึกคำสั่ง/ประกาศเข้าสู่ระบบเรียบร้อยแล้ว');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="border-b border-[var(--border-light)] pb-4">
        <h2 className="text-2xl font-noto-serif-thai font-bold text-[var(--text-primary)]">
          คลังคำสั่งและประกาศมาตรฐาน (40+ แบบ)
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          เลือกเทมเพลตคำสั่งและประกาศตามภารกิจองค์กรปกครองส่วนท้องถิ่น พร้อมฐานข้อกฎหมายอ้างอิงอัตโนมัติ
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category & Template Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">เลือกหมวดหมู่เทมเพลต</h3>
            <div className="space-y-1">
              {ORDER_DATA.map(cat => (
                <button
                  key={cat.group}
                  onClick={() => setSelectedCategory(cat.group)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    selectedCategory === cat.group
                      ? 'bg-[var(--primary-color)] text-white font-semibold'
                      : 'bg-[var(--bg-overlay)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <span>{cat.group}</span>
                  <span className="text-[10px] opacity-80 font-mono">({cat.items.length})</span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-[var(--border-lighter)] space-y-2">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">รายการแบบฟอร์ม</label>
              <div className="max-h-72 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {ORDER_DATA.find(c => c.group === selectedCategory)?.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleTemplateChange(item.id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-all cursor-pointer border ${
                      selectedTemplateId === item.id
                        ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-semibold'
                        : 'border-[var(--border-light)] bg-[var(--bg-overlay)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Form Details */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6 shadow-sm space-y-5">
            <div className="border-b border-[var(--border-lighter)] pb-3">
              <span className="text-xs font-semibold text-[var(--primary-color)] uppercase tracking-wider block">
                {selectedCategory}
              </span>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                {selectedTemplateTitle}
              </h3>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">เลขที่คำสั่ง/ประกาศ</label>
                <input
                  type="text"
                  value={docNum}
                  onChange={e => setDocNum(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
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

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">เรื่อง</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-semibold focus:border-[var(--primary-color)] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ฐานอำนาจกฎหมายอ้างอิง</label>
                <textarea
                  rows={2}
                  value={authority}
                  onChange={e => setAuthority(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg p-3 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ความเป็นมาและเหตุผล</label>
                <textarea
                  rows={3}
                  value={background}
                  onChange={e => setBackground(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg p-3 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">อำนาจและหน้าที่การดำเนินงาน</label>
                <textarea
                  rows={3}
                  value={duties}
                  onChange={e => setDuties(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg p-3 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>

              {/* Seal Selection */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">ตราสัญลักษณ์หัวคำสั่ง/ประกาศ</label>
                <div className="flex gap-4">
                  <label className="text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sealModeOrder" checked={sealMode === 'garuda'} onChange={() => setSealMode('garuda')} />
                    <Crown className="w-4 h-4 text-amber-500" /> ตราครุฑ
                  </label>
                  <label className="text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sealModeOrder" checked={sealMode === 'logo'} onChange={() => setSealMode('logo')} />
                    <Building className="w-4 h-4 text-blue-500" /> ตราประจำหน่วยงาน
                  </label>
                  <label className="text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sealModeOrder" checked={sealMode === 'none'} onChange={() => setSealMode('none')} />
                    ไม่ใช้ตรา
                  </label>
                </div>
              </div>

              {/* Personnel Selection */}
              <div className="sm:col-span-2 space-y-2 pt-2 border-t border-[var(--border-lighter)]">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">เลือกคณะกรรมการ / ผู้ได้รับแต่งตั้ง</label>
                <div className="max-h-40 overflow-y-auto border border-[var(--border-light)] rounded-lg p-3 bg-[var(--bg-overlay)] space-y-1.5 custom-scrollbar">
                  {usersList.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">ไม่พบบุคลากรในระบบ (สามารถเพิ่มบุคลากรได้ในเมนูตั้งค่า)</p>
                  ) : (
                    usersList.map(u => {
                      const isChecked = selectedPersonnel.some(p => p.id === u.id);
                      return (
                        <label key={u.id} className="flex items-center justify-between p-1.5 rounded hover:bg-[var(--bg-elevated)] cursor-pointer text-xs">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePersonnel(u)}
                            />
                            <span className="font-medium text-[var(--text-primary)]">{u.firstName} {u.lastName}</span>
                            <span className="text-[var(--text-muted)]">({u.position || 'บุคลากร'})</span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Signer */}
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

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-lighter)]">
              <button
                onClick={handlePreview}
                className="px-4 py-2 bg-[var(--primary-color)] text-white text-xs font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Eye className="w-4 h-4" /> แสดงตัวอย่างคำสั่ง
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" /> บันทึกเข้าคลังคำสั่ง
                </button>
                <button
                  onClick={() => downloadAsDoc(buildOrderHTML(), subject)}
                  className="px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-medium rounded-lg hover:bg-[var(--bg-elevated)] flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-blue-400" /> ส่งออก Word
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-elevated)]">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[var(--primary-color)]" /> ตัวอย่างคำสั่ง / ประกาศ
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
                onClick={() => downloadAsDoc(previewHtml, subject)}
                className="px-4 py-2 bg-[var(--primary-color)] text-white text-xs font-bold rounded-lg hover:bg-[var(--primary-hover)] flex items-center gap-1.5 cursor-pointer shadow-sm"
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
