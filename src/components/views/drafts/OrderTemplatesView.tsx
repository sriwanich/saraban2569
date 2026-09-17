import React, { useState, useEffect } from 'react';
import { 
  Award, FileText, CheckSquare, Plus, Eye, Save, Printer, 
  FileDown, UserCheck, X, Crown, Building, Layers, Sparkles, 
  Wand2, Search, Filter, Loader2, ArrowRight, BookOpen, CheckCircle2
} from 'lucide-react';
import { 
  ORDER_DATA, ORDER_AUTHORITY, getOrderBackground, 
  downloadAsDoc, thDateFull, toThaiNumeral, getSingleSealHTML, getLogoHTML 
} from './draftData';
import A4PaperPreview from '../../A4PaperPreview';

interface Props {
  user: any;
  onSendToSignQueue?: (item: any) => void;
}

export default function OrderTemplatesView({ user, onSendToSignQueue }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('🚨 งานป้องกันและบรรเทาสาธารณภัย');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('appoint_disaster_center');
  const [selectedTemplateTitle, setSelectedTemplateTitle] = useState<string>('คำสั่งจัดตั้งศูนย์บัญชาการเหตุการณ์อุทกภัย วาตภัย และดินโคลนถล่ม');
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>('order');

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'order' | 'announce'>('all');

  // Form State
  const [docNum, setDocNum] = useState<string>('๑๒๓/๒๕๖๙');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState<string>('จัดตั้งศูนย์บัญชาการเหตุการณ์ป้องกันและแก้ไขปัญหาอุทกภัย วาตภัย และดินโคลนถล่มจังหวัด');
  const [authority, setAuthority] = useState<string>(ORDER_AUTHORITY['appoint_disaster_center'] || '');
  const [background, setBackground] = useState<string>('');
  const [duties, setDuties] = useState<string>('ให้ศูนย์บัญชาการเหตุการณ์มีอำนาจหน้าที่ในการประสานงาน สั่งการ บริหารจัดการ และสนับสนุนทรัพยากรเครื่องมือกู้ภัยเพื่อช่วยเหลือผู้ประสบภัยตลอด ๒๔ ชั่วโมง');

  // Seal Mode
  const [sealMode, setSealMode] = useState<'garuda' | 'logo' | 'none'>('garuda');

  // Committee Personnel Multi-select
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<{ id: number; name: string; position: string; committeePos: string }[]>([]);

  // Signer
  const [signer, setSigner] = useState<string>('นายสมชาย ป้องกันดี');
  const [signerPos, setSignerPos] = useState<string>('หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด');

  // Preview Modal
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // AI Smart Order Draft Assistant State
  const [showAiOrderModal, setShowAiOrderModal] = useState<boolean>(false);
  const [aiTopic, setAiTopic] = useState<string>('');
  const [aiType, setAiType] = useState<'order' | 'announce'>('order');
  const [aiReason, setAiReason] = useState<string>('');
  const [aiPersonnelInfo, setAiPersonnelInfo] = useState<string>('');
  const [aiCustomDuties, setAiCustomDuties] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiOrderResult, setAiOrderResult] = useState<any>(null);

  // Field-level AI Generating loading flags
  const [isAiFieldLoading, setIsAiFieldLoading] = useState<string | null>(null);

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

  // Total templates count across all groups
  const totalTemplatesCount = ORDER_DATA.reduce((acc, cat) => acc + cat.items.length, 0);

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
    const org = user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด';
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

  // AI Order Generator Call
  const handleGenerateAiOrder = async () => {
    if (!aiTopic.trim()) {
      alert('กรุณาระบุวัตถุประสงค์หรือเรื่องที่ต้องการยกร่างคำสั่ง/ประกาศ');
      return;
    }

    setIsGeneratingAi(true);
    setAiOrderResult(null);

    try {
      const res = await fetch('/api/ai/order-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          orderType: aiType,
          category: selectedCategory,
          reason: aiReason,
          personnelInfo: aiPersonnelInfo,
          customDuties: aiCustomDuties,
          orgName: user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด'
        })
      });

      const data = await res.json();
      if (data.success && data.result) {
        setAiOrderResult(data.result);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการยกร่างด้วย AI');
      }
    } catch (err: any) {
      console.error('Error generating AI order:', err);
      alert('ไม่สามารถเชื่อมต่อระบบ AI ยกร่างคำสั่งได้');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleApplyAiOrderResult = () => {
    if (!aiOrderResult) return;

    if (aiOrderResult.subject) setSubject(aiOrderResult.subject);
    if (aiOrderResult.authority) setAuthority(aiOrderResult.authority);
    if (aiOrderResult.background) setBackground(aiOrderResult.background);
    if (aiOrderResult.duties) setDuties(aiOrderResult.duties);
    if (aiOrderResult.suggestedSignerPos) setSignerPos(aiOrderResult.suggestedSignerPos);

    setSelectedTemplateType(aiType);
    setShowAiOrderModal(false);
    setAiOrderResult(null);
    setAiTopic('');
    setAiReason('');
    setAiPersonnelInfo('');
    setAiCustomDuties('');
  };

  // Field-level AI Helper functions
  const handleAiRefineField = async (fieldKey: 'authority' | 'background' | 'duties') => {
    setIsAiFieldLoading(fieldKey);
    try {
      const fieldNames: Record<string, string> = {
        authority: 'ฐานอำนาจกฎหมายอ้างอิง',
        background: 'ความเป็นมาและเหตุผล',
        duties: 'อำนาจและหน้าที่การดำเนินงาน'
      };

      const res = await fetch('/api/ai/order-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: subject,
          orderType: selectedTemplateType,
          category: selectedCategory,
          reason: background,
          customDuties: duties,
          orgName: user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด'
        })
      });

      const data = await res.json();
      if (data.success && data.result) {
        if (fieldKey === 'authority' && data.result.authority) setAuthority(data.result.authority);
        if (fieldKey === 'background' && data.result.background) setBackground(data.result.background);
        if (fieldKey === 'duties' && data.result.duties) setDuties(data.result.duties);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiFieldLoading(null);
    }
  };

  const buildOrderHTML = () => {
    const org = user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด';
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
    const userNameToPass = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user?.username || 'ผู้ใช้งาน' : 'ผู้ใช้งาน';
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE_DRAFT',
        details: `สร้าง${selectedTemplateType === 'announce' ? 'ประกาศ' : 'คำสั่ง'}จากเทมเพลต: ${subject}`,
        username: userNameToPass
      })
    }).catch(console.error);

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
      {/* Header with AI Assistant Trigger */}
      <div className="border-b border-[var(--border-light)] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-sans font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-[var(--primary-color)]" />
            คลังคำสั่งและประกาศมาตรฐาน ({totalTemplatesCount} แบบฟอร์ม)
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            เลือกเทมเพลตคำสั่งและประกาศตามภารกิจองค์กรปกครองส่วนท้องถิ่นและ ปภ. พร้อมฐานข้อกฎหมายและระบบ AI ยกร่างเนื้อหาอัตโนมัติ
          </p>
        </div>
        <button
          onClick={() => setShowAiOrderModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto shrink-0 transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Sparkles className="w-4 h-4 animate-pulse text-amber-100" />
          ✨ AI ผู้ช่วยยกร่างคำสั่ง/ประกาศอัจฉริยะ
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category & Template Selector with Search & Filter */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-5 shadow-sm space-y-4">
            
            {/* Search and Type Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อคำสั่ง/ประกาศ..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex gap-1.5 bg-[var(--bg-overlay)] p-1 rounded-lg border border-[var(--border-lighter)] text-[11px]">
                <button
                  onClick={() => setFilterType('all')}
                  className={`flex-1 py-1 rounded font-medium text-center transition-all cursor-pointer ${
                    filterType === 'all' ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] shadow-xs font-bold' : 'text-[var(--text-muted)]'
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  onClick={() => setFilterType('order')}
                  className={`flex-1 py-1 rounded font-medium text-center transition-all cursor-pointer ${
                    filterType === 'order' ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] shadow-xs font-bold' : 'text-[var(--text-muted)]'
                  }`}
                >
                  คำสั่ง
                </button>
                <button
                  onClick={() => setFilterType('announce')}
                  className={`flex-1 py-1 rounded font-medium text-center transition-all cursor-pointer ${
                    filterType === 'announce' ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] shadow-xs font-bold' : 'text-[var(--text-muted)]'
                  }`}
                >
                  ประกาศ
                </button>
              </div>
            </div>

            {/* Category selection list */}
            {!searchQuery && (
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-1">หมวดหมู่ภารกิจ</h3>
                {ORDER_DATA.map(cat => (
                  <button
                    key={cat.group}
                    onClick={() => setSelectedCategory(cat.group)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                      selectedCategory === cat.group
                        ? 'bg-[var(--primary-color)] text-white font-semibold'
                        : 'bg-[var(--bg-overlay)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <span className="truncate pr-1">{cat.group}</span>
                    <span className="text-[10px] opacity-80 font-mono shrink-0">({cat.items.length})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Template Items List */}
            <div className="pt-2 border-t border-[var(--border-lighter)] space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  {searchQuery ? `ผลการค้นหา "${searchQuery}"` : 'รายการแบบฟอร์มในหมวดหมู่'}
                </label>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {(() => {
                  let itemsToRender: any[] = [];
                  if (searchQuery) {
                    ORDER_DATA.forEach(c => {
                      c.items.forEach(i => {
                        if (i.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                          itemsToRender.push(i);
                        }
                      });
                    });
                  } else {
                    const currentCat = ORDER_DATA.find(c => c.group === selectedCategory);
                    itemsToRender = currentCat ? currentCat.items : [];
                  }

                  if (filterType !== 'all') {
                    itemsToRender = itemsToRender.filter(i => i.type === filterType);
                  }

                  if (itemsToRender.length === 0) {
                    return (
                      <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                        ไม่พบแบบฟอร์มคำสั่ง/ประกาศที่ตรงกับเงื่อนไข
                      </p>
                    );
                  }

                  return itemsToRender.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleTemplateChange(item.id)}
                      className={`w-full text-left p-2.5 rounded-lg text-xs transition-all cursor-pointer border flex flex-col gap-1 ${
                        selectedTemplateId === item.id
                          ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-semibold'
                          : 'border-[var(--border-light)] bg-[var(--bg-overlay)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium line-clamp-2">{item.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ml-1.5 ${
                          item.type === 'announce' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                        }`}>
                          {item.type === 'announce' ? 'ประกาศ' : 'คำสั่ง'}
                        </span>
                      </div>
                    </button>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Form Details */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6 shadow-sm space-y-5">
            <div className="border-b border-[var(--border-lighter)] pb-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[var(--primary-color)] uppercase tracking-wider block">
                  {selectedCategory}
                </span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                  {selectedTemplateTitle}
                </h3>
              </div>
              <button
                onClick={() => {
                  setAiTopic(selectedTemplateTitle);
                  setAiType(selectedTemplateType as any);
                  setAiReason(background);
                  setAiCustomDuties(duties);
                  setShowAiOrderModal(true);
                }}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                ให้ AI ช่วยเกลาหน้านี้
              </button>
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

              {/* Authority field with AI helper */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">ฐานอำนาจกฎหมายอ้างอิง</label>
                  <button
                    type="button"
                    onClick={() => handleAiRefineField('authority')}
                    disabled={isAiFieldLoading === 'authority'}
                    className="text-[11px] text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isAiFieldLoading === 'authority' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    ✨ AI เสนอข้อกฎหมาย
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={authority}
                  onChange={e => setAuthority(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg p-3 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>

              {/* Background field with AI helper */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">ความเป็นมาและเหตุผล</label>
                  <button
                    type="button"
                    onClick={() => handleAiRefineField('background')}
                    disabled={isAiFieldLoading === 'background'}
                    className="text-[11px] text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isAiFieldLoading === 'background' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    ✨ AI ยกร่างความเป็นมา
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={background}
                  onChange={e => setBackground(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg p-3 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>

              {/* Duties field with AI helper */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">อำนาจและหน้าที่การดำเนินงาน</label>
                  <button
                    type="button"
                    onClick={() => handleAiRefineField('duties')}
                    disabled={isAiFieldLoading === 'duties'}
                    className="text-[11px] text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isAiFieldLoading === 'duties' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    ✨ AI ยกร่างอำนาจหน้าที่
                  </button>
                </div>
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

      {/* AI Smart Order Assistant Modal */}
      {showAiOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-amber-500/40 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-600/20 border-b border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">
                    ✨ ผู้ช่วย AI ช่วยยกร่างคำสั่ง/ประกาศอัจฉริยะ
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    ระบุวัตถุประสงค์และข้อมูลเบื้องต้น ระบบ AI จะยกร่างข้อความและฐานกฎหมายที่ถูกต้องตามมาตรฐานราชการ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiOrderModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-overlay)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ประเภทเอกสาร</label>
                  <select
                    value={aiType}
                    onChange={e => setAiType(e.target.value as any)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
                  >
                    <option value="order">คำสั่ง</option>
                    <option value="announce">ประกาศ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">หมวดหมู่ภารกิจ</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedCategory}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-lighter)] rounded-lg px-3 py-2 text-xs text-[var(--text-muted)] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  หัวข้อ / เรื่อง หรือวัตถุประสงค์ของการออกคำสั่ง/ประกาศ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น แต่งตั้งศูนย์ปฏิบัติการป้องกันภัยแล้ง และ PM2.5 ประจำปี ๒๕๖๙"
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:border-amber-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  เหตุผล ความจำเป็น หรือบริบทพื้นที่
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น เนื่องจากเข้าสู่ช่วงฤดูแล้ง พื้นที่เสี่ยงขาดแคลนน้ำอุปโภคบริโภค และฝุ่นควันพิษสะสม..."
                  value={aiReason}
                  onChange={e => setAiReason(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg p-2.5 text-xs text-[var(--text-primary)] focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  คณะกรรมการ / บุคลากร / ตำแหน่งที่แต่งตั้ง (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ผู้ว่าราชการจังหวัด (ประธาน), ปภ.จังหวัด (กรรมการและเลขานุการ), นายอำเภอทุกอำเภอ..."
                  value={aiPersonnelInfo}
                  onChange={e => setAiPersonnelInfo(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  อำนาจหน้าที่เน้นย้ำ หรือเงื่อนไขเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ประสานงานแจกจ่ายน้ำช่วยเหลือประชาชนตลอด ๒๔ ชั่วโมง และรายงานผลทุกวัน..."
                  value={aiCustomDuties}
                  onChange={e => setAiCustomDuties(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:border-amber-500 outline-none"
                />
              </div>

              {/* Generate Trigger */}
              <button
                onClick={handleGenerateAiOrder}
                disabled={isGeneratingAi || !aiTopic.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    AI กำลังค้นหาข้อกฎหมายและยกร่างเนื้อหาอย่างเป็นทางการ...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    ประมวลผลและยกร่างคำสั่งด้วย AI
                  </>
                )}
              </button>

              {/* AI Generated Result Preview */}
              {aiOrderResult && (
                <div className="mt-4 p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-800 pb-2">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> ผลการยกร่างด้วย AI เรียบร้อย
                    </span>
                    <button
                      onClick={handleApplyAiOrderResult}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" /> นำข้อมูลลงแบบฟอร์ม
                    </button>
                  </div>

                  <div className="space-y-2 text-xs text-[var(--text-primary)]">
                    <div>
                      <span className="font-bold text-[var(--text-secondary)]">เรื่อง:</span> {aiOrderResult.subject}
                    </div>
                    <div>
                      <span className="font-bold text-[var(--text-secondary)]">ฐานอำนาจกฎหมาย:</span> {aiOrderResult.authority}
                    </div>
                    <div>
                      <span className="font-bold text-[var(--text-secondary)]">ความเป็นมา:</span> {aiOrderResult.background}
                    </div>
                    <div>
                      <span className="font-bold text-[var(--text-secondary)]">อำนาจหน้าที่:</span>
                      <p className="mt-0.5 whitespace-pre-line text-[var(--text-secondary)] pl-2 border-l-2 border-amber-400">
                        {aiOrderResult.duties}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-[var(--border-lighter)] bg-[var(--bg-elevated)] flex justify-end gap-2">
              <button
                onClick={() => setShowAiOrderModal(false)}
                className="px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-medium rounded-xl hover:bg-[var(--border-lighter)] cursor-pointer"
              >
                ยกเลิก
              </button>
              {aiOrderResult && (
                <button
                  onClick={handleApplyAiOrderResult}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> ใช้แบบร่าง AI นี้
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-elevated)]">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[var(--primary-color)]" /> ตัวอย่างคำสั่ง / ประกาศ (A4 Official Preview)
              </h3>
              <button onClick={() => setPreviewHtml(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-900/60 custom-scrollbar">
              <A4PaperPreview
                title={`ตัวอย่างเอกสารคำสั่ง/ประกาศ: ${subject || selectedTemplateTitle}`}
                subtitle={`จัดวางรูปแบบขนาดกระดาษมาตรฐาน A4 ตามระเบียบสำนักนายกรัฐมนตรี`}
                htmlContent={previewHtml}
                extraActions={
                  <button
                    onClick={() => downloadAsDoc(previewHtml, subject)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" /> ดาวน์โหลด Word
                  </button>
                }
              />
            </div>
            <div className="p-3 border-t border-[var(--border-light)] flex justify-end gap-2 bg-[var(--bg-elevated)]">
              <button
                onClick={() => setPreviewHtml(null)}
                className="px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-medium rounded-lg hover:bg-[var(--border-lighter)] cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
