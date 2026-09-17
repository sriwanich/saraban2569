import React, { useState, useMemo } from 'react';
import { 
  Volume2, FileText, Eye, Save, Printer, FileDown, 
  Crown, Building, X, Search, Filter, Sparkles, Loader2, Wand2, CheckCircle2, ChevronRight
} from 'lucide-react';
import { SPEECH_DATA, downloadAsDoc, thDateFull, getLogoHTML, getSingleSealHTML } from './draftData';
import A4PaperPreview from '../../A4PaperPreview';

interface Props {
  user: any;
}

export default function SpeechTemplatesView({ user }: Props) {
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [speechTypeFilter, setSpeechTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSpeechId, setSelectedSpeechId] = useState<string>('national_day');

  // Form Fields
  const [projectName, setProjectName] = useState<string>('');
  const [year, setYear] = useState<string>('๒๕๖๙');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [venue, setVenue] = useState<string>('ห้องประชุมศาลากลางจังหวัดระยอง');
  const [speaker, setSpeaker] = useState<string>(user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  const [chairman, setChairman] = useState<string>('ผู้ว่าราชการจังหวัดระยอง');
  const [participantsCount, setParticipantsCount] = useState<string>('๑๐๐');
  const [extraText, setExtraText] = useState<string>('');

  const [sealMode, setSealMode] = useState<'logo' | 'garuda' | 'none'>('garuda');

  // AI Modal States
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiTopic, setAiTopic] = useState<string>('');
  const [aiCategory, setAiCategory] = useState<string>('งานป้องกันและบรรเทาสาธารณภัย');
  const [aiSpeechType, setAiSpeechType] = useState<string>('กล่าวรายงานและเปิดงาน');
  const [aiChairman, setAiChairman] = useState<string>(chairman);
  const [aiSpeaker, setAiSpeaker] = useState<string>(speaker);
  const [aiVenue, setAiVenue] = useState<string>(venue);
  const [aiKeyPoints, setAiKeyPoints] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiGeneratedResult, setAiGeneratedResult] = useState<any>(null);

  // Field AI loading
  const [isFieldAiLoading, setIsFieldAiLoading] = useState<boolean>(false);

  // Preview Modal
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Flatten & Calculate total templates count
  const allTemplates = useMemo(() => {
    const list: any[] = [];
    SPEECH_DATA.forEach(cat => {
      cat.items.forEach(item => {
        list.push({
          ...item,
          categoryGroup: cat.group
        });
      });
    });
    return list;
  }, []);

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter(item => {
      // Category filter
      if (selectedCategory !== 'all' && item.categoryGroup !== selectedCategory) return false;
      // Speech Type Filter
      if (speechTypeFilter !== 'all' && item.type !== speechTypeFilter) return false;
      // Level Filter
      if (selectedLevel !== 'all') {
        if (item.level && item.level !== 'all' && item.level !== selectedLevel) return false;
      }
      // Search term filter
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchCategory = item.categoryGroup.toLowerCase().includes(query);
        if (!matchTitle && !matchCategory) return false;
      }
      return true;
    });
  }, [allTemplates, selectedCategory, speechTypeFilter, selectedLevel, searchTerm]);

  const getSelectedSpeech = () => {
    return allTemplates.find(i => i.id === selectedSpeechId) || allTemplates[0];
  };

  const buildSpeechHTML = () => {
    const sp = getSelectedSpeech();
    const schoolName = user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
    
    // If we have AI custom content generated, use it directly
    let content = '';
    if (aiGeneratedResult && aiGeneratedResult.speechReportHtml) {
      content = `<div>
        ${aiGeneratedResult.speechReportHtml}
        <hr style="border:none;border-top:1px dashed #bbb;margin:20pt 0;" />
        ${aiGeneratedResult.speechOpeningHtml || ''}
      </div>`;
    } else if (sp && typeof sp.content === 'function') {
      content = sp.content({
        year,
        schoolName,
        projectName,
        chairman,
        speaker,
        venue,
        participantsCount
      });
    }

    let sealHTML = '';
    if (sealMode === 'logo') sealHTML = getLogoHTML(100);
    else if (sealMode === 'garuda') sealHTML = getSingleSealHTML(113);

    return `<div style="font-family:'TH SarabunPSK','Sarabun',sans-serif;font-size:16pt;line-height:1.6;max-width:800px;margin:0 auto;color:#000;">
${sealHTML ? `<div style="text-align:center;margin-bottom:8pt;">${sealHTML}</div>` : ''}

${content}

${extraText ? `<div style="margin-top:12pt;text-indent:3em;text-align:justify;">${extraText}</div>` : ''}

<table width="100%" cellpadding="0" cellspacing="0" style="border:none;border-collapse:collapse;margin-top:30pt;">
  <tr>
    <td width="50%" style="border:none;text-align:center;vertical-align:top;padding:0;">
      <div style="font-size:15pt;font-weight:bold;margin-bottom:4pt;">(ผู้กล่าวรายงาน)</div>
      <div style="height:40pt;"></div>
      <div>(${speaker})</div>
      <div style="font-size:14pt;color:#444;">ตำแหน่ง ${user?.position || 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'}</div>
    </td>
    <td width="50%" style="border:none;text-align:center;vertical-align:top;padding:0;">
      <div style="font-size:15pt;font-weight:bold;margin-bottom:4pt;">(ประธานในพิธี)</div>
      <div style="height:40pt;"></div>
      <div>(${chairman})</div>
      <div style="font-size:14pt;color:#444;">ตำแหน่ง ผู้ว่าราชการจังหวัดระยอง</div>
    </td>
  </tr>
</table>
</div>`;
  };

  // Generate full speech using AI backend API
  const handleAiGenerateSpeech = async () => {
    if (!aiTopic.trim()) {
      alert('กรุณาระบุชื่องานหรือโครงการที่ต้องการให้ AI ช่วยร่าง');
      return;
    }

    setIsAiGenerating(true);
    try {
      const resp = await fetch('/api/ai/speech-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speechType: aiSpeechType,
          topic: aiTopic,
          category: aiCategory,
          chairman: aiChairman,
          speaker: aiSpeaker,
          venue: aiVenue,
          orgName: user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
          keyPoints: aiKeyPoints,
          participantsCount
        })
      });

      const data = await resp.json();
      if (data.success && data.result) {
        setAiGeneratedResult(data.result);
        if (aiTopic) setProjectName(aiTopic);
        if (aiChairman) setChairman(aiChairman);
        if (aiSpeaker) setSpeaker(aiSpeaker);
        if (aiVenue) setVenue(aiVenue);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการประมวลผลของ AI');
      }
    } catch (err) {
      console.error('Error generating AI speech:', err);
      alert('ไม่สามารถเชื่อมต่อกับบริการ AI ได้ในขณะนี้');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Field AI helper for extra text
  const handleGenerateFieldAiExtraText = async () => {
    setIsFieldAiLoading(true);
    try {
      const currentSpeech = getSelectedSpeech();
      const resp = await fetch('/api/ai/speech-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speechType: 'ข้อความเพิ่มเติม',
          topic: projectName || currentSpeech?.title,
          category: currentSpeech?.categoryGroup || 'งานกู้ภัยสาธารณภัย',
          chairman,
          speaker,
          venue,
          orgName: user?.department || 'สำนักงาน ปภ.จังหวัด',
          keyPoints: 'ขอความร่วมมือจากทุกภาคส่วนร่วมกันตระหนักถึงความปลอดภัยของประชาชน และขอให้การจัดงานเป็นไปด้วยความเรียบร้อย'
        })
      });
      const data = await resp.json();
      if (data.success && data.result?.closingRemark) {
        setExtraText(data.result.closingRemark);
      } else {
        setExtraText('ขอขอบคุณภาคีเครือข่าย ส่วนราชการ ทหาร ตำรวจ องค์กรปกครองส่วนท้องถิ่น และภาคเอกชน ที่ได้ร่วมมือกันขับเคลื่อนภารกิจครั้งนี้อย่างดียิ่ง');
      }
    } catch (err) {
      setExtraText('ขอขอบคุณภาคีเครือข่าย ส่วนราชการ ทหาร ตำรวจ องค์กรปกครองส่วนท้องถิ่น และภาคเอกชน ที่ได้ร่วมมือกันขับเคลื่อนภารกิจครั้งนี้อย่างดียิ่ง');
    } finally {
      setIsFieldAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/20">
                Official Speech Library
              </span>
              <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                110+ แบบฟอร์ม
              </span>
            </div>
            <h2 className="text-2xl font-sans font-bold text-white tracking-tight flex items-center gap-2">
              <Volume2 className="w-7 h-7 text-amber-200" /> คลังคำกล่าวเปิดงานและกล่าวรายงาน
            </h2>
            <p className="text-xs text-amber-100 mt-1 max-w-2xl leading-relaxed">
              รวบรวมคำกล่าวรายงาน คำกล่าวเปิดงานพิธีการ คำกล่าวต้อนรับ คำกล่าวแสดงความยินดี และสโมสรสดุดีในวันสำคัญระดับประเทศและท้องถิ่น พร้อม AI ช่วยยกร่างร่างคำกล่าวอัจฉริยะ
            </p>
          </div>

          <button
            onClick={() => setIsAiModalOpen(true)}
            className="px-5 py-3 bg-white text-orange-700 font-extrabold text-xs rounded-xl shadow-lg hover:bg-amber-50 hover:scale-105 transition-all flex items-center gap-2 border border-amber-200 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            ✨ AI ผู้ช่วยยกร่างคำกล่าวอัจฉริยะ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar Filter & Categories */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-4 shadow-sm space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อคำกล่าว / ประเภทงาน..."
                className="w-full pl-9 pr-8 py-2 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Type Pills Filter */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1.5 flex items-center justify-between">
                <span>ประเภทคำกล่าว</span>
                <span className="text-[10px] text-amber-600 font-semibold">
                  พบ {filteredTemplates.length} รายการ
                </span>
              </label>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'report', label: 'กล่าวรายงาน' },
                  { id: 'opening', label: 'กล่าวเปิด' },
                  { id: 'welcome', label: 'ต้อนรับ/ยินดี' },
                  { id: 'national', label: 'วันสำคัญ' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSpeechTypeFilter(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      speechTypeFilter === t.id
                        ? 'bg-[var(--primary-color)] text-white shadow-xs font-semibold'
                        : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Level Filter Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-[var(--primary-color)]" /> ระดับองค์กร
              </label>
              <select
                value={selectedLevel}
                onChange={e => setSelectedLevel(e.target.value)}
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none cursor-pointer"
              >
                <option value="all">ทุกระดับองค์กร</option>
                <option value="จังหวัด">จังหวัด / ปภ.จังหวัด</option>
                <option value="เทศบาลนคร">เทศบาลนคร / เมือง</option>
                <option value="เทศบาลตำบล">เทศบาลตำบล</option>
                <option value="อบต.">อบต.</option>
                <option value="อบจ.">อบจ.</option>
              </select>
            </div>

            {/* Category Groups */}
            <div className="space-y-1 pt-2 border-t border-[var(--border-lighter)]">
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">หมวดหมู่พิธีการ</label>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-[var(--bg-overlay)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <span>🌐 หมวดหมู่ทั้งหมด</span>
                <span className="text-[10px] opacity-80">{allTemplates.length}</span>
              </button>
              {SPEECH_DATA.map(cat => (
                <button
                  key={cat.group}
                  onClick={() => setSelectedCategory(cat.group)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    selectedCategory === cat.group
                      ? 'bg-[var(--primary-color)] text-white font-bold shadow-xs'
                      : 'bg-[var(--bg-overlay)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <span className="truncate pr-2">{cat.group}</span>
                  <span className="text-[10px] opacity-80 shrink-0">{cat.items.length}</span>
                </button>
              ))}
            </div>

            {/* Template List Items */}
            <div className="pt-3 border-t border-[var(--border-lighter)] space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[var(--text-primary)]">
                  รายการแบบฟอร์มคำกล่าว
                </label>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[var(--text-muted)] bg-[var(--bg-overlay)] rounded-xl border border-dashed border-[var(--border-light)]">
                    ไม่พบแบบฟอร์มที่ตรงกับการค้นหา
                  </div>
                ) : (
                  filteredTemplates.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedSpeechId(item.id);
                        setAiGeneratedResult(null); // Clear custom AI generated override when picking template
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-all cursor-pointer border flex items-start gap-2 ${
                        selectedSpeechId === item.id
                          ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-bold shadow-xs'
                          : 'border-[var(--border-light)] bg-[var(--bg-overlay)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                      }`}
                    >
                      <ChevronRight className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${selectedSpeechId === item.id ? 'text-[var(--primary-color)]' : 'text-[var(--text-muted)]'}`} />
                      <div className="flex-1">
                        <div className="line-clamp-2 leading-snug">{item.title}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-normal mt-0.5 flex items-center gap-1">
                          <span>{item.categoryGroup.split(' ')[0]}</span>
                          <span>•</span>
                          <span className="capitalize">{item.type || 'พิธีการ'}</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Editor Form & Document Customization */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="border-b border-[var(--border-lighter)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 block uppercase tracking-wider">
                  {getSelectedSpeech()?.categoryGroup || 'หมวดหมู่คำกล่าว'}
                </span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mt-0.5 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[var(--primary-color)]" />
                  {getSelectedSpeech()?.title}
                </h3>
              </div>

              <button
                onClick={() => setIsAiModalOpen(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs rounded-xl shadow-sm hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5" /> ✨ AI ยกร่างคำกล่าว
              </button>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">ชื่องาน / โครงการ</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="เช่น โครงการส่งเสริมความปลอดภัย..."
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">ปีงบประมาณ</label>
                <input
                  type="text"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">ผู้กล่าวรายงาน (ชื่อ-นามสกุล)</label>
                <input
                  type="text"
                  value={speaker}
                  onChange={e => setSpeaker(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">ประธานในพิธี (ชื่อ-ตำแหน่ง)</label>
                <input
                  type="text"
                  value={chairman}
                  onChange={e => setChairman(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">สถานที่จัดงาน</label>
                <input
                  type="text"
                  value={venue}
                  onChange={e => setVenue(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">จำนวนผู้เข้าร่วม (โดยประมาณ)</label>
                <input
                  type="text"
                  value={participantsCount}
                  onChange={e => setParticipantsCount(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>

              {/* Extra text with Field AI button */}
              <div className="sm:col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[var(--text-secondary)]">
                    ข้อความเพิ่มเติม / สาระสำคัญเฉพาะ (ถ้ามี)
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateFieldAiExtraText}
                    disabled={isFieldAiLoading}
                    className="text-[11px] text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 cursor-pointer bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20"
                  >
                    {isFieldAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
                    ✨ AI ช่วยร่างข้อความ
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={extraText}
                  onChange={e => setExtraText(e.target.value)}
                  placeholder="เพิ่มข้อความเน้นย้ำ สารขอบคุณ หรือสาระสำคัญเพิ่มเติม..."
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>

              {/* Seal Selection */}
              <div className="sm:col-span-2 pt-2">
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2">ตราสัญลักษณ์หัวคำกล่าว</label>
                <div className="flex flex-wrap gap-4">
                  <label className="text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer font-medium">
                    <input type="radio" name="sealSpeech" checked={sealMode === 'garuda'} onChange={() => setSealMode('garuda')} className="text-amber-600 focus:ring-amber-500" />
                    <Crown className="w-4 h-4 text-amber-500" /> ตราครุฑ
                  </label>
                  <label className="text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer font-medium">
                    <input type="radio" name="sealSpeech" checked={sealMode === 'logo'} onChange={() => setSealMode('logo')} className="text-blue-600 focus:ring-blue-500" />
                    <Building className="w-4 h-4 text-blue-500" /> ตราประจำหน่วยงาน
                  </label>
                  <label className="text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer font-medium">
                    <input type="radio" name="sealSpeech" checked={sealMode === 'none'} onChange={() => setSealMode('none')} />
                    ไม่ใช้ตรา
                  </label>
                </div>
              </div>
            </div>

            {/* AI Generated Status Banner */}
            {aiGeneratedResult && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>กำลังแสดงคำกล่าวที่ยกร่างด้วย AI ล่าสุด</span>
                </div>
                <button
                  onClick={() => setAiGeneratedResult(null)}
                  className="text-[11px] underline font-bold hover:text-amber-900 cursor-pointer"
                >
                  คืนค่าต้นแบบเดิม
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-lighter)]">
              <button
                onClick={() => setPreviewHtml(buildSpeechHTML())}
                className="px-5 py-2.5 bg-[var(--primary-color)] text-white text-xs font-bold rounded-xl hover:bg-[var(--primary-hover)] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Eye className="w-4 h-4" /> แสดงตัวอย่างคำกล่าว (A4 Preview)
              </button>
              <button
                onClick={() => downloadAsDoc(buildSpeechHTML(), `คำกล่าว_${getSelectedSpeech()?.title}`)}
                className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 flex items-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <FileDown className="w-4 h-4" /> ส่งออกไฟล์ Word (.docx)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Speech Generator Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-gradient-to-r from-amber-600 to-orange-600 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-200" />
                <h3 className="font-bold text-sm">AI ผู้ช่วยยกร่างคำกล่าวและรายงานอัจฉริยะ</h3>
              </div>
              <button onClick={() => setIsAiModalOpen(false)} className="text-white/80 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar text-xs">
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                ระบุวัตถุประสงค์ ชื่องาน และข้อมูลพิธีการ ระบบ AI จะช่วยยกร่างทั้ง <b>คำกล่าวรายงาน (ของผู้กล่าว)</b> และ <b>คำกล่าวเปิดงาน/กล่าวตอบ (ของประธาน)</b> อย่างเป็นทางการถูกต้องตามระเบียบพิธีการราชการไทย
              </div>

              <div>
                <label className="block font-bold text-[var(--text-primary)] mb-1">ชื่องาน / โครงการ *</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  placeholder="เช่น พิธีเปิดการฝึกซ้อมแผนอุทกภัยระดับจังหวัด ประจำปี ๒๕๖๙"
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[var(--text-primary)] mb-1">ประเภทคำกล่าว</label>
                  <select
                    value={aiSpeechType}
                    onChange={e => setAiSpeechType(e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl p-2 text-xs text-[var(--text-primary)] outline-none"
                  >
                    <option value="กล่าวรายงานและเปิดงาน">กล่าวรายงาน + กล่าวเปิดงาน (คู่)</option>
                    <option value="กล่าวรายงาน">กล่าวรายงาน (อย่างเดียว)</option>
                    <option value="กล่าวเปิดงาน">กล่าวเปิดงาน / กล่าวตอบ (อย่างเดียว)</option>
                    <option value="กล่าวต้อนรับ">กล่าวต้อนรับคณะตรวจเยี่ยม</option>
                    <option value="กล่าวแสดงความยินดี">กล่าวแสดงความยินดี / มุทิตาจิต</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[var(--text-primary)] mb-1">หมวดหมู่งาน</label>
                  <select
                    value={aiCategory}
                    onChange={e => setAiCategory(e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl p-2 text-xs text-[var(--text-primary)] outline-none"
                  >
                    <option value="งานป้องกันและบรรเทาสาธารณภัย">งานป้องกันและบรรเทาสาธารณภัย</option>
                    <option value="งานบริหารและบริการประชาชน อปท.">งานบริหารและบริการประชาชน อปท.</option>
                    <option value="งานศึกษาอบรมและพัฒนาบุคลากร">งานศึกษาอบรมและพัฒนาบุคลากร</option>
                    <option value="งานกีฬา วัฒนธรรม และจิตอาสา">งานกีฬา วัฒนธรรม และจิตอาสา</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[var(--text-primary)] mb-1">ประธานในพิธี (ชื่อ-ตำแหน่ง)</label>
                  <input
                    type="text"
                    value={aiChairman}
                    onChange={e => setAiChairman(e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl p-2 text-xs text-[var(--text-primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[var(--text-primary)] mb-1">ผู้กล่าวรายงาน (ชื่อ-ตำแหน่ง)</label>
                  <input
                    type="text"
                    value={aiSpeaker}
                    onChange={e => setAiSpeaker(e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl p-2 text-xs text-[var(--text-primary)] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[var(--text-primary)] mb-1">สถานที่จัดงาน</label>
                <input
                  type="text"
                  value={aiVenue}
                  onChange={e => setAiVenue(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl p-2 text-xs text-[var(--text-primary)] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--text-primary)] mb-1">วัตถุประสงค์และเน้นย้ำพิเศษ (Key Highlights)</label>
                <textarea
                  rows={3}
                  value={aiKeyPoints}
                  onChange={e => setAiKeyPoints(e.target.value)}
                  placeholder="เช่น เน้นย้ำการบูรณาการเครื่องมือกู้ภัย การเตรียมพร้อมรับมือภัยพิบัติตลอด ๒๔ ชั่วโมง และความร่วมมือของจิตอาสา..."
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[var(--border-light)] flex items-center justify-end gap-2 bg-[var(--bg-elevated)]">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] font-medium rounded-xl hover:bg-[var(--border-lighter)] cursor-pointer text-xs"
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  await handleAiGenerateSpeech();
                  setIsAiModalOpen(false);
                }}
                disabled={isAiGenerating}
                className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-extrabold rounded-xl shadow-md hover:opacity-90 flex items-center gap-1.5 cursor-pointer text-xs"
              >
                {isAiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                สร้างคำกล่าวด้วย AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-elevated)]">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-500" /> ตัวอย่างคำกล่าวขนาดมาตรฐาน (A4 Official Preview)
              </h3>
              <button onClick={() => setPreviewHtml(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-900/60 custom-scrollbar">
              <A4PaperPreview
                title={`ตัวอย่างคำกล่าว: ${getSelectedSpeech()?.title || 'คำกล่าว'}`}
                subtitle="แบบจัดพิมพ์ขนาดกระดาษมาตรฐาน A4 (210 x 297 มม.)"
                htmlContent={previewHtml}
                extraActions={
                  <button
                    onClick={() => downloadAsDoc(previewHtml, `คำกล่าว_${getSelectedSpeech()?.title}`)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" /> ส่งออกไฟล์ Word (.docx)
                  </button>
                }
              />
            </div>
            <div className="p-3 border-t border-[var(--border-light)] flex justify-end gap-2 bg-[var(--bg-elevated)]">
              <button
                onClick={() => setPreviewHtml(null)}
                className="px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-medium rounded-xl hover:bg-[var(--border-lighter)] cursor-pointer"
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
