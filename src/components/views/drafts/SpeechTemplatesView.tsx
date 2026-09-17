import React, { useState } from 'react';
import { 
  Volume2, FileText, Eye, Save, Printer, FileDown, 
  Crown, Building, X, Search, Filter
} from 'lucide-react';
import { SPEECH_DATA, downloadAsDoc, thDateFull, getLogoHTML, getSingleSealHTML } from './draftData';

interface Props {
  user: any;
}

export default function SpeechTemplatesView({ user }: Props) {
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('🇹🇭 วันสำคัญแห่งชาติและราชสำนัก');
  const [selectedSpeechId, setSelectedSpeechId] = useState<string>('national_day');

  // Form Fields
  const [projectName, setProjectName] = useState<string>('');
  const [year, setYear] = useState<string>('๒๕๖๙');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [venue, setVenue] = useState<string>('ห้องประชุมสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  const [speaker, setSpeaker] = useState<string>(user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  const [chairman, setChairman] = useState<string>('ผู้ว่าราชการจังหวัดระยอง');
  const [participantsCount, setParticipantsCount] = useState<string>('๑๐๐');
  const [extraText, setExtraText] = useState<string>('');

  const [sealMode, setSealMode] = useState<'logo' | 'garuda' | 'none'>('garuda');

  // Preview Modal
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const getSelectedSpeech = () => {
    for (const cat of SPEECH_DATA) {
      const item = cat.items.find(i => i.id === selectedSpeechId);
      if (item) return item;
    }
    return SPEECH_DATA[0].items[0];
  };

  const buildSpeechHTML = () => {
    const sp = getSelectedSpeech();
    const schoolName = user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
    const content = sp ? sp.content({
      year,
      schoolName,
      projectName,
      chairman,
      speaker,
      venue,
      participantsCount
    }) : '';

    let sealHTML = '';
    if (sealMode === 'logo') sealHTML = getLogoHTML(100);
    else if (sealMode === 'garuda') sealHTML = getSingleSealHTML(113);

    return `<div style="font-family:'TH SarabunPSK','Sarabun',sans-serif;font-size:16pt;line-height:1.6;max-width:800px;margin:0 auto;color:#000;">
${sealHTML ? `<div style="text-align:center;margin-bottom:8pt;">${sealHTML}</div>` : ''}

${content}

${extraText ? `<div style="margin-top:10pt;text-indent:3em;text-align:justify;">${extraText}</div>` : ''}

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="border-b border-[var(--border-light)] pb-4">
        <h2 className="text-2xl font-sans font-bold text-[var(--text-primary)]">
          คลังคำกล่าวเปิดงานและกล่าวรายงาน (100+ แบบ)
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          เทมเพลตคำกล่าวรายงาน คำกล่าวเปิดงานพิธีการ วันสำคัญ และกิจกรรมของสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Categories & Filter */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-5 shadow-sm space-y-4">
            {/* Level Filter */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> ตัวกรองระดับองค์กร
              </label>
              <select
                value={selectedLevel}
                onChange={e => setSelectedLevel(e.target.value)}
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none cursor-pointer"
              >
                <option value="all">ทุกระดับองค์กร</option>
                <option value="อบต.">อบต.</option>
                <option value="เทศบาลตำบล">เทศบาลตำบล</option>
                <option value="เทศบาลเมือง">เทศบาลเมือง</option>
                <option value="เทศบาลนคร">เทศบาลนคร</option>
                <option value="อบจ.">อบจ.</option>
              </select>
            </div>

            {/* Category selection */}
            <div className="space-y-1">
              {SPEECH_DATA.map(cat => (
                <button
                  key={cat.group}
                  onClick={() => {
                    setSelectedCategory(cat.group);
                    if (cat.items[0]) setSelectedSpeechId(cat.items[0].id);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    selectedCategory === cat.group
                      ? 'bg-[var(--primary-color)] text-white font-semibold'
                      : 'bg-[var(--bg-overlay)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <span>{cat.group}</span>
                </button>
              ))}
            </div>

            {/* Items */}
            <div className="pt-3 border-t border-[var(--border-lighter)] space-y-2">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">รายการคำกล่าว</label>
              <div className="max-h-72 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {SPEECH_DATA.find(c => c.group === selectedCategory)?.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedSpeechId(item.id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-all cursor-pointer border ${
                      selectedSpeechId === item.id
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

        {/* Form & Customization */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6 shadow-sm space-y-5">
            <div className="border-b border-[var(--border-lighter)] pb-3">
              <span className="text-xs font-semibold text-[var(--primary-color)] block uppercase">
                {selectedCategory}
              </span>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                {getSelectedSpeech()?.title}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ชื่องาน / โครงการ</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="เช่น โครงการส่งเสริมการเรียนรู้..."
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ปีงบประมาณ</label>
                <input
                  type="text"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ผู้กล่าวรายงาน</label>
                <input
                  type="text"
                  value={speaker}
                  onChange={e => setSpeaker(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ประธานในพิธี</label>
                <input
                  type="text"
                  value={chairman}
                  onChange={e => setChairman(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">สถานที่จัดงาน</label>
                <input
                  type="text"
                  value={venue}
                  onChange={e => setVenue(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">จำนวนผู้เข้าร่วม (โดยประมาณ)</label>
                <input
                  type="text"
                  value={participantsCount}
                  onChange={e => setParticipantsCount(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ข้อความเพิ่มเติม (ถ้ามี)</label>
                <textarea
                  rows={3}
                  value={extraText}
                  onChange={e => setExtraText(e.target.value)}
                  placeholder="เพิ่มข้อความหรือสาระสำคัญเฉพาะของงาน..."
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg p-3 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>

              {/* Seal Selection */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">ตราสัญลักษณ์หัวคำกล่าว</label>
                <div className="flex gap-4">
                  <label className="text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sealSpeech" checked={sealMode === 'logo'} onChange={() => setSealMode('logo')} />
                    <Building className="w-4 h-4 text-blue-500" /> ตราประจำหน่วยงาน
                  </label>
                  <label className="text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sealSpeech" checked={sealMode === 'garuda'} onChange={() => setSealMode('garuda')} />
                    <Crown className="w-4 h-4 text-amber-500" /> ตราครุฑ
                  </label>
                  <label className="text-xs text-[var(--text-primary)] flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sealSpeech" checked={sealMode === 'none'} onChange={() => setSealMode('none')} />
                    ไม่ใช้ตรา
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-lighter)]">
              <button
                onClick={() => setPreviewHtml(buildSpeechHTML())}
                className="px-4 py-2 bg-[var(--primary-color)] text-white text-xs font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Eye className="w-4 h-4" /> แสดงตัวอย่างคำกล่าว
              </button>
              <button
                onClick={() => downloadAsDoc(buildSpeechHTML(), `คำกล่าว_${getSelectedSpeech()?.title}`)}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileDown className="w-4 h-4" /> ส่งออก Word (.docx)
              </button>
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
                <Eye className="w-4 h-4 text-[var(--primary-color)]" /> ตัวอย่างคำกล่าว
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
                onClick={() => downloadAsDoc(previewHtml, `คำกล่าว_${getSelectedSpeech()?.title}`)}
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
