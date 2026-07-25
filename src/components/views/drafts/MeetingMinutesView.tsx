import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Trash2, Eye, Save, Printer, FileDown, 
  Search, X, Calendar, Clock, MapPin, UserCheck, UserX, FileText
} from 'lucide-react';
import { MeetingItem, downloadAsDoc, thDateFull, toThaiNumeral, getLogoHTML } from './draftData';

interface Props {
  user: any;
}

export default function MeetingMinutesView({ user }: Props) {
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');

  // Form State
  const [meetingNo, setMeetingNo] = useState<string>('๑/๒๕๖๙');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [timeStart, setTimeStart] = useState<string>('09:00');
  const [timeEnd, setTimeEnd] = useState<string>('12:00');
  const [closeTime, setCloseTime] = useState<string>('12:00');
  const [title, setTitle] = useState<string>('การประชุมคณะทำงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  const [venue, setVenue] = useState<string>('ห้องประชุมสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  const [chair, setChair] = useState<string>('หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  const [recorder, setRecorder] = useState<string>(user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'เจ้าพนักงานสารบรรณ');
  const [note, setNote] = useState<string>('');

  // Attendees & Absents
  const [attendees, setAttendees] = useState<{ name: string; position: string; note: string }[]>([
    { name: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'นายสมชาย ใจดี', position: user?.position || 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง', note: '' }
  ]);
  const [absents, setAbsents] = useState<{ name: string; reason: string }[]>([]);

  // Agendas
  const [agendas, setAgendas] = useState<{ type: string; title: string; detail: string; resolution: string }[]>([
    { type: 'วาระที่ ๑', title: 'เรื่องที่ประธานแจ้งให้ที่ประชุมทราบ', detail: 'ประธานแจ้งการประสานงานราชการและนโยบายพัฒนาท้องถิ่น', resolution: 'ที่ประชุมรับทราบ' },
    { type: 'วาระที่ ๒', title: 'เรื่องรับรองรายงานการประชุมครั้งที่แล้ว', detail: 'รายงานการประชุมครั้งที่ ๑/๒๕๖๙', resolution: 'ที่ประชุมมีมติรับรองรายงานการประชุมโดยไม่มีการแก้ไข' },
    { type: 'วาระที่ ๓', title: 'เรื่องเสนอเพื่อพิจารณา', detail: 'พิจารณาอนุมัติโครงการปรับปรุงภูมิทัศน์ชุมชน', resolution: 'ที่ประชุมมีมติเห็นชอบเป็นเอกฉันท์' },
    { type: 'วาระที่ ๔', title: 'เรื่องอื่นๆ', detail: 'ไม่มี', resolution: '-' }
  ]);

  // Saved Meetings List
  const [meetingsHistory, setMeetingsHistory] = useState<MeetingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Preview Modal
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('moi_meetings');
      if (saved) setMeetingsHistory(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleAddAllPersonnel = () => {
    try {
      const savedUsers = JSON.parse(localStorage.getItem('moi_users') || '[]');
      if (savedUsers.length > 0) {
        const newAtts = savedUsers.map((u: any) => ({
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          position: u.position || 'บุคลากร',
          note: ''
        }));
        setAttendees(newAtts);
      } else {
        alert('ไม่พบบุคลากรในระบบ');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAttendee = () => {
    setAttendees([...attendees, { name: '', position: '', note: '' }]);
  };

  const handleAddAbsent = () => {
    setAbsents([...absents, { name: '', reason: '' }]);
  };

  const handleAddAgenda = () => {
    const nextNum = agendas.length + 1;
    setAgendas([...agendas, { type: `วาระที่ ${nextNum}`, title: '', detail: '', resolution: 'ที่ประชุมมีมติรับทราบ' }]);
  };

  const buildMeetingHTML = () => {
    const school = user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
    const noThai = toThaiNumeral(meetingNo);
    const dateThai = thDateFull(date);

    const logoHTML = getLogoHTML(100);

    return `<div style="font-family:'TH SarabunPSK','Sarabun',sans-serif;font-size:16pt;line-height:1.5;max-width:800px;margin:0 auto;color:#000;">
${logoHTML}

<div style="text-align:center;font-size:20pt;font-weight:bold;margin-bottom:4pt;">
  รายงานการประชุม ${title}
</div>
<div style="text-align:center;font-size:16pt;font-weight:bold;margin-bottom:4pt;">
  ครั้งที่ ${noThai}
</div>
<div style="text-align:center;font-size:16pt;margin-bottom:12pt;">
  เมื่อวันที่ ${dateThai} เวลา ${toThaiNumeral(timeStart)} น. ถึง ${toThaiNumeral(timeEnd)} น.
</div>
<div style="text-align:center;font-size:16pt;margin-bottom:16pt;">
  ณ ${venue}
</div>

<div style="margin-top:12pt;font-weight:bold;font-size:16pt;">ผู้มาประชุม :-</div>
<table width="100%" border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;margin-[6pt 0 12pt];font-size:16pt;">
  <thead>
    <tr style="background:#f3f4f6;">
      <th width="10%" style="text-align:center;">ลำดับ</th>
      <th width="45%" style="text-align:left;">ชื่อ - สกุล</th>
      <th width="45%" style="text-align:left;">ตำแหน่ง</th>
    </tr>
  </thead>
  <tbody>
    ${attendees.map((a, idx) => `<tr>
      <td style="text-align:center;">${idx + 1}</td>
      <td>${a.name}</td>
      <td>${a.position} ${a.note ? `(${a.note})` : ''}</td>
    </tr>`).join('')}
  </tbody>
</table>

${absents.length > 0 ? `
<div style="margin-top:12pt;font-weight:bold;font-size:16pt;">ผู้ไม่มาประชุม :-</div>
<table width="100%" border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;margin-[6pt 0 12pt];font-size:16pt;">
  <thead>
    <tr style="background:#f3f4f6;">
      <th width="10%" style="text-align:center;">ลำดับ</th>
      <th width="45%" style="text-align:left;">ชื่อ - สกุล</th>
      <th width="45%" style="text-align:left;">เหตุผล</th>
    </tr>
  </thead>
  <tbody>
    ${absents.map((a, idx) => `<tr>
      <td style="text-align:center;">${idx + 1}</td>
      <td>${a.name}</td>
      <td>${a.reason}</td>
    </tr>`).join('')}
  </tbody>
</table>` : ''}

<div style="margin-top:12pt;font-weight:bold;font-size:16pt;">เริ่มประชุมเวลา ${toThaiNumeral(timeStart)} น.</div>
<div style="text-indent:3em;margin-bottom:12pt;">${chair} ทำหน้าที่ประธานในที่ประชุม และกล่าวเปิดการประชุมตามระเบียบวาระดังต่อไปนี้ :-</div>

${agendas.map(ag => `<div style="margin-[12pt 0 6pt];">
  <div style="font-weight:bold;font-size:16pt;">${ag.type} : ${ag.title}</div>
  <div style="text-indent:3em;text-align:justify;margin:4pt 0;">${ag.detail}</div>
  <div style="text-indent:3em;font-weight:bold;margin-top:4pt;">มติที่ประชุม : ${ag.resolution}</div>
</div>`).join('')}

<div style="margin-top:16pt;font-weight:bold;font-size:16pt;">เลิกประชุมเวลา ${toThaiNumeral(closeTime)} น.</div>

<table width="100%" cellpadding="0" cellspacing="0" style="border:none;border-collapse:collapse;margin-top:30pt;">
  <tr>
    <td width="50%" style="border:none;text-align:center;vertical-align:top;padding:0;">
      <div>(${recorder})</div>
      <div style="font-size:14pt;color:#444;">ผู้บันทึกรายงานการประชุม</div>
    </td>
    <td width="50%" style="border:none;text-align:center;vertical-align:top;padding:0;">
      <div>(${chair})</div>
      <div style="font-size:14pt;color:#444;">ผู้ตรวจรายงานการประชุม</div>
    </td>
  </tr>
</table>
</div>`;
  };

  const handleSave = () => {
    const newItem: MeetingItem = {
      id: Date.now(),
      no: meetingNo,
      date,
      timeStart,
      timeEnd,
      closeTime,
      title,
      venue,
      chair,
      recorder,
      note,
      attendees,
      absents,
      agendas,
      createdAt: new Date().toISOString()
    };

    const updated = [newItem, ...meetingsHistory];
    setMeetingsHistory(updated);
    localStorage.setItem('moi_meetings', JSON.stringify(updated));
    alert('บันทึกรายงานการประชุมเรียบร้อยแล้ว');
    setActiveTab('list');
  };

  const handleDelete = (id: number) => {
    if (!confirm('ต้องการลบรายงานการประชุมฉบับนี้ใช่หรือไม่?')) return;
    const updated = meetingsHistory.filter(m => m.id !== id);
    setMeetingsHistory(updated);
    localStorage.setItem('moi_meetings', JSON.stringify(updated));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-light)] pb-4">
        <div>
          <h2 className="text-2xl font-noto-serif-thai font-bold text-[var(--text-primary)]">
            บันทึกรายงานการประชุม
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            สร้างและบันทึกรายงานการประชุมครบถ้วน ๖ ส่วน พร้อมมติที่ประชุมและรายชื่อผู้เข้าประชุม
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'list' ? 'bg-[var(--primary-color)] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-light)]'
            }`}
          >
            รายการรายงานการประชุม ({meetingsHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('form')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'form' ? 'bg-[var(--primary-color)] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-light)]'
            }`}
          >
            <Plus className="w-4 h-4" /> สร้างรายงานการประชุมใหม่
          </button>
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-lighter)] pb-3">
            <h3 className="text-base font-bold text-[var(--text-primary)]">รายการรายงานการประชุมในระบบ</h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ค้นชื่อการประชุม/ครั้งที่..."
                className="pl-9 pr-3 py-1.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg text-xs text-[var(--text-primary)] outline-none"
              />
            </div>
          </div>

          {meetingsHistory.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)] text-sm">
              ยังไม่มีบันทึกรายงานการประชุม
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-lighter)] text-xs font-semibold text-[var(--text-secondary)]">
                    <th className="p-3 w-12 text-center">ลำดับ</th>
                    <th className="p-3 w-28">ครั้งที่</th>
                    <th className="p-3 w-32">วันที่ประชุม</th>
                    <th className="p-3">เรื่อง / ชื่อการประชุม</th>
                    <th className="p-3 w-32">ผู้บันทึก</th>
                    <th className="p-3 w-28 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-lighter)]">
                  {meetingsHistory.filter(m => m.title.includes(searchQuery) || m.no.includes(searchQuery)).map((item, idx) => (
                    <tr key={item.id} className="hover:bg-[var(--border-lighter)]/30 transition-colors">
                      <td className="p-3 text-center text-xs text-[var(--text-muted)]">{idx + 1}</td>
                      <td className="p-3 font-mono font-medium text-xs text-[var(--text-primary)]">{item.no}</td>
                      <td className="p-3 text-xs text-[var(--text-secondary)]">{thDateFull(item.date)}</td>
                      <td className="p-3 font-medium text-[var(--text-primary)]">{item.title}</td>
                      <td className="p-3 text-xs text-[var(--text-secondary)]">{item.recorder || '-'}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              // preview
                              setPreviewHtml(buildMeetingHTML());
                            }}
                            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded"
                            title="ดูตัวอย่าง"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => downloadAsDoc(buildMeetingHTML(), `รายงานการประชุม_${item.title}`)}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded"
                            title="ส่งออก Word"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-red-400 hover:bg-red-400/10 rounded"
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

      {activeTab === 'form' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6 shadow-sm space-y-6">
          {/* Part 1: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--primary-color)] border-b border-[var(--border-lighter)] pb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> ส่วนที่ ๑ : ข้อมูลพื้นฐานการประชุม
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">การประชุมครั้งที่</label>
                <input
                  type="text"
                  value={meetingNo}
                  onChange={e => setMeetingNo(e.target.value)}
                  placeholder="เช่น ๑/๒๕๖๙"
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">วันที่ประชุม</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">เวลาเริ่ม - เลิกประชุม</label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={timeStart}
                    onChange={e => setTimeStart(e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-2 py-2 text-sm text-[var(--text-primary)] outline-none"
                  />
                  <span className="text-xs text-[var(--text-muted)]">ถึง</span>
                  <input
                    type="time"
                    value={timeEnd}
                    onChange={e => setTimeEnd(e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-2 py-2 text-sm text-[var(--text-primary)] outline-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">เรื่อง / ชื่องานการประชุม</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm font-semibold text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">สถานที่ประชุม</label>
                <input
                  type="text"
                  value={venue}
                  onChange={e => setVenue(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Part 2: Officers */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-[var(--primary-color)] border-b border-[var(--border-lighter)] pb-2 flex items-center gap-2">
              <Users className="w-4 h-4" /> ส่วนที่ ๒ : ประธานและผู้บันทึกรายงาน
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ประธานในที่ประชุม</label>
                <input
                  type="text"
                  value={chair}
                  onChange={e => setChair(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">ผู้บันทึกรายงานการประชุม</label>
                <input
                  type="text"
                  value={recorder}
                  onChange={e => setRecorder(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Part 3: Attendees */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-2">
              <h3 className="text-sm font-bold text-[var(--primary-color)] flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> ส่วนที่ ๓ : ผู้มาประชุม ({attendees.length} คน)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleAddAllPersonnel}
                  className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 rounded text-xs font-medium cursor-pointer"
                >
                  + เพิ่มบุคลากรทั้งหมดในระบบ
                </button>
                <button
                  onClick={handleAddAttendee}
                  className="px-2.5 py-1 bg-[var(--primary-color)] text-white rounded text-xs font-medium cursor-pointer"
                >
                  + เพิ่มผู้มาประชุม
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {attendees.map((att, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 p-2.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg">
                  <span className="text-xs font-mono font-bold text-[var(--text-muted)] w-6 text-center">{idx + 1}</span>
                  <input
                    type="text"
                    value={att.name}
                    onChange={e => {
                      const updated = [...attendees];
                      updated[idx].name = e.target.value;
                      setAttendees(updated);
                    }}
                    placeholder="ชื่อ - สกุล"
                    className="flex-1 min-w-[160px] bg-[var(--bg-surface)] border border-[var(--border-light)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                  />
                  <input
                    type="text"
                    value={att.position}
                    onChange={e => {
                      const updated = [...attendees];
                      updated[idx].position = e.target.value;
                      setAttendees(updated);
                    }}
                    placeholder="ตำแหน่ง"
                    className="flex-1 min-w-[160px] bg-[var(--bg-surface)] border border-[var(--border-light)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                  />
                  <button
                    onClick={() => setAttendees(attendees.filter((_, i) => i !== idx))}
                    className="p-1.5 text-red-400 hover:bg-red-400/10 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Part 4: Absents */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-2">
              <h3 className="text-sm font-bold text-[var(--primary-color)] flex items-center gap-2">
                <UserX className="w-4 h-4" /> ส่วนที่ ๔ : ผู้ไม่มาประชุม ({absents.length} คน)
              </h3>
              <button
                onClick={handleAddAbsent}
                className="px-2.5 py-1 bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] rounded text-xs font-medium cursor-pointer"
              >
                + เพิ่มผู้ลา/ไม่มาประชุม
              </button>
            </div>

            {absents.map((abs, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 p-2.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg">
                <span className="text-xs font-mono font-bold text-[var(--text-muted)] w-6 text-center">{idx + 1}</span>
                <input
                  type="text"
                  value={abs.name}
                  onChange={e => {
                    const updated = [...absents];
                    updated[idx].name = e.target.value;
                    setAbsents(updated);
                  }}
                  placeholder="ชื่อ - สกุล"
                  className="flex-1 min-w-[160px] bg-[var(--bg-surface)] border border-[var(--border-light)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                />
                <input
                  type="text"
                  value={abs.reason}
                  onChange={e => {
                    const updated = [...absents];
                    updated[idx].reason = e.target.value;
                    setAbsents(updated);
                  }}
                  placeholder="เหตุผล (เช่น ติดภารกิจราชการ / ลากิจ)"
                  className="flex-1 min-w-[160px] bg-[var(--bg-surface)] border border-[var(--border-light)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                />
                <button
                  onClick={() => setAbsents(absents.filter((_, i) => i !== idx))}
                  className="p-1.5 text-red-400 hover:bg-red-400/10 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Part 5: Agendas */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-2">
              <h3 className="text-sm font-bold text-[var(--primary-color)] flex items-center gap-2">
                <FileText className="w-4 h-4" /> ส่วนที่ ๕ : ระเบียบวาระและมติที่ประชุม ({agendas.length} วาระ)
              </h3>
              <button
                onClick={handleAddAgenda}
                className="px-2.5 py-1 bg-[var(--primary-color)] text-white rounded text-xs font-medium cursor-pointer"
              >
                + เพิ่มวาระการประชุม
              </button>
            </div>

            <div className="space-y-4">
              {agendas.map((ag, idx) => (
                <div key={idx} className="p-4 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={ag.type}
                      onChange={e => {
                        const updated = [...agendas];
                        updated[idx].type = e.target.value;
                        setAgendas(updated);
                      }}
                      className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded px-2 py-1 text-xs font-bold text-[var(--primary-color)] outline-none"
                    />
                    <button
                      onClick={() => setAgendas(agendas.filter((_, i) => i !== idx))}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      ลบวาระนี้
                    </button>
                  </div>

                  <input
                    type="text"
                    value={ag.title}
                    onChange={e => {
                      const updated = [...agendas];
                      updated[idx].title = e.target.value;
                      setAgendas(updated);
                    }}
                    placeholder="หัวข้อวาระการประชุม..."
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-light)] rounded px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] outline-none"
                  />

                  <textarea
                    rows={3}
                    value={ag.detail}
                    onChange={e => {
                      const updated = [...agendas];
                      updated[idx].detail = e.target.value;
                      setAgendas(updated);
                    }}
                    placeholder="รายละเอียดการนำเสนอและสาระสำคัญในที่ประชุม..."
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-light)] rounded p-2.5 text-xs text-[var(--text-primary)] outline-none"
                  />

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-400 mb-1">มติที่ประชุม :-</label>
                    <input
                      type="text"
                      value={ag.resolution}
                      onChange={e => {
                        const updated = [...agendas];
                        updated[idx].resolution = e.target.value;
                        setAgendas(updated);
                      }}
                      placeholder="เช่น ที่ประชุมมีมติเห็นชอบเป็นเอกฉันท์..."
                      className="w-full bg-[var(--bg-surface)] border border-emerald-500/30 rounded px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Part 6: Closing & Actions */}
          <div className="space-y-4 pt-2 border-t border-[var(--border-lighter)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">เวลาเลิกประชุม</label>
                <input
                  type="time"
                  value={closeTime}
                  onChange={e => setCloseTime(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="หมายเหตุอื่นๆ (ถ้ามี)..."
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-lighter)]">
              <button
                onClick={() => setPreviewHtml(buildMeetingHTML())}
                className="px-4 py-2 bg-[var(--primary-color)] text-white text-xs font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Eye className="w-4 h-4" /> แสดงตัวอย่างรายงานการประชุม
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" /> บันทึกรายงานการประชุม
                </button>
                <button
                  onClick={() => downloadAsDoc(buildMeetingHTML(), `รายงานการประชุม_${title}`)}
                  className="px-3.5 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-medium rounded-lg hover:bg-[var(--bg-elevated)] flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-blue-400" /> ส่งออก Word
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-elevated)]">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[var(--primary-color)]" /> ตัวอย่างรายงานการประชุม
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
                onClick={() => downloadAsDoc(previewHtml, `รายงานการประชุม_${title}`)}
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
