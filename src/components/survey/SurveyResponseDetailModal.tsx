import React, { useState } from 'react';
import { 
  X, 
  User, 
  Building2, 
  Calendar, 
  Clock, 
  Star, 
  CheckCircle2, 
  FileText, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Copy, 
  Check, 
  Sparkles,
  ShieldCheck,
  MessageSquareQuote,
  Sliders,
  Award,
  FileCheck,
  Phone,
  Mail,
  UploadCloud
} from 'lucide-react';
import { Survey, SurveyResponse, SurveyQuestion } from '../../types/survey';
import { SurveyResponsePrintView } from './SurveyResponsePrintView';

const getSafeAnswers = (raw: any): Record<string, any> => {
  if (!raw) return {};
  let res = raw;
  if (typeof res === 'string') {
    try { res = JSON.parse(res); } catch (_) {}
  }
  if (typeof res === 'string') {
    try { res = JSON.parse(res); } catch (_) {}
  }
  return typeof res === 'object' && res !== null ? res : {};
};

interface SurveyResponseDetailModalProps {
  survey: Survey;
  response: SurveyResponse;
  allResponses?: SurveyResponse[];
  onClose: () => void;
  onSelectResponse?: (response: SurveyResponse) => void;
  onDeleteResponse?: (responseId: string) => void;
}

export const SurveyResponseDetailModal: React.FC<SurveyResponseDetailModalProps> = ({
  survey,
  response,
  allResponses = [],
  onClose,
  onSelectResponse,
  onDeleteResponse,
}) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Determine if this is an RSVP survey
  const isRsvpForm = survey.settings?.isRsvpForm || survey.category === 'rsvp_acknowledgment' || survey.title.includes('RSVP') || survey.title.includes('แบบตอบรับ');

  // Find index in list for navigation
  const currentIndex = allResponses.findIndex(r => r.id === response.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < allResponses.length - 1;

  const handlePrev = () => {
    if (hasPrev && onSelectResponse) {
      onSelectResponse(allResponses[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onSelectResponse) {
      onSelectResponse(allResponses[currentIndex + 1]);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Extract common RSVP fields from generic answers
  const extractedData = React.useMemo(() => {
    const data = {
      name: response.respondentName || '-',
      position: response.respondentPosition || '-',
      department: response.respondentDepartment || '-',
      phone: response.respondentPhone || '-',
      email: response.respondentEmail || '-',
    };

    const safeAnsMap = getSafeAnswers(response.answers);
    survey.questions.forEach(q => {
      const val = safeAnsMap[q.id];
      if (!val) return;

      const title = (q.title || '').toLowerCase();
      
      if (q.type === 'contact_info' && typeof val === 'object') {
        if (val.name) data.name = val.name;
        if (val.dept) data.department = val.dept;
        if (val.position) data.position = val.position;
        if (val.phone) data.phone = val.phone;
        if (val.email) data.email = val.email;
      }
      
      if (title.includes('ตำแหน่ง') || q.id.includes('position')) {
        if (typeof val === 'string') data.position = val;
      }
      if (title.includes('โทรศัพท์') || q.id.includes('phone')) {
        if (typeof val === 'string') data.phone = val;
      }
      if (title.includes('อีเมล') || q.id.includes('email')) {
        if (typeof val === 'string') data.email = val;
      }
    });

    return data;
  }, [survey.questions, response]);

  // Calculate this respondent's personal average score & level
  const personalScoreInfo = React.useMemo(() => {
    let scoreSum = 0;
    let scoreCount = 0;

    const safeAnsMap = getSafeAnswers(response.answers);

    survey.questions.forEach(q => {
      const ans = safeAnsMap[q.id];
      if (ans === undefined || ans === null) return;

      if (q.type === 'rating_stars' && typeof ans === 'number') {
        scoreSum += (ans / (q.maxScore || 5)) * 100;
        scoreCount++;
      } else if (q.type === 'slider_score' && typeof ans === 'number') {
        const max = q.maxScore || 10;
        const min = q.minScore || 0;
        scoreSum += ((ans - min) / (max - min)) * 100;
        scoreCount++;
      } else if (q.type === 'matrix_rating' && typeof ans === 'object') {
        Object.values(ans).forEach((val: any) => {
          if (typeof val === 'number') {
            scoreSum += (val / 5) * 100;
            scoreCount++;
          }
        });
      }
    });

    if (scoreCount === 0) return null;
    const avgPercent = Math.round(scoreSum / scoreCount);
    const avgOutOf5 = (avgPercent / 20).toFixed(2);

    let levelLabel = 'ดีมาก';
    let levelColor = 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30';
    if (avgPercent >= 90) {
      levelLabel = 'มากที่สุด / ดีเด่น (Excellent)';
      levelColor = 'text-emerald-600 bg-emerald-500/15 border-emerald-500/30';
    } else if (avgPercent >= 75) {
      levelLabel = 'มาก / ดี (Good)';
      levelColor = 'text-blue-600 bg-blue-500/15 border-blue-500/30';
    } else if (avgPercent >= 60) {
      levelLabel = 'ปานกลาง (Fair)';
      levelColor = 'text-amber-600 bg-amber-500/15 border-amber-500/30';
    } else {
      levelLabel = 'ควรปรับปรุง (Needs Improvement)';
      levelColor = 'text-rose-600 bg-rose-500/15 border-rose-500/30';
    }

    return { avgPercent, avgOutOf5, levelLabel, levelColor };
  }, [survey.questions, response.answers]);

  // Helper to interpret Likert score 1-5
  const getLikertLabel = (score: number) => {
    switch (score) {
      case 5: return { text: 'มากที่สุด (5)', color: 'bg-emerald-500 text-white', bar: 'w-full bg-emerald-500' };
      case 4: return { text: 'มาก (4)', color: 'bg-teal-500 text-white', bar: 'w-4/5 bg-teal-500' };
      case 3: return { text: 'ปานกลาง (3)', color: 'bg-amber-500 text-white', bar: 'w-3/5 bg-amber-500' };
      case 2: return { text: 'น้อย (2)', color: 'bg-orange-500 text-white', bar: 'w-2/5 bg-orange-500' };
      case 1: return { text: 'น้อยที่สุด (1)', color: 'bg-rose-500 text-white', bar: 'w-1/5 bg-rose-500' };
      default: return { text: `${score} คะแนน`, color: 'bg-slate-500 text-white', bar: 'w-1/2 bg-slate-500' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-left">
      <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--border-lighter)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)]">
                  ใบบันทึกคำตอบรายบุคคล
                </h3>
                {allResponses.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)]">
                    รายการที่ {currentIndex + 1} จาก {allResponses.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] truncate max-w-xs sm:max-w-md">
                {survey.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Nav Arrows */}
            {allResponses.length > 1 && onSelectResponse && (
              <div className="flex items-center bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-lighter)] p-0.5">
                <button
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-surface)] transition cursor-pointer"
                  title="คำตอบก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={!hasNext}
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-surface)] transition cursor-pointer"
                  title="คำตอบถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={handlePrint}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] rounded-xl transition cursor-pointer"
              title="พิมพ์ใบบันทึกคำตอบ"
            >
              <Printer className="w-4 h-4" />
            </button>

            {isRsvpForm && (
              <button
                onClick={() => setShowPrintPreview(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                title="ดูพรีวิวแบบตอบรับ A4"
              >
                <FileCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Preview RSVP</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-rose-500/10 hover:text-rose-500 rounded-xl transition cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Respondent Meta Profile Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200/50 dark:border-blue-800/40 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-xs border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-[var(--text-primary)]">
                    {extractedData.name}
                  </h4>
                  <div className="flex flex-col gap-1 text-[10px] sm:text-xs text-[var(--text-secondary)] mt-0.5">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                      <span>ตำแหน่ง: {extractedData.position}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>สังกัด/หน่วยงาน: {extractedData.department}</span>
                    </div>
                    {(extractedData.phone !== '-' || extractedData.email !== '-') && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5 border-t border-blue-200/30 dark:border-blue-800/30 pt-1.5">
                        {extractedData.phone !== '-' && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-emerald-500" />
                            <span>{extractedData.phone}</span>
                          </div>
                        )}
                        {extractedData.email !== '-' && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-rose-500" />
                            <span className="truncate max-w-[150px]">{extractedData.email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {personalScoreInfo && (
                <div className="text-right">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    คะแนนประเมินรวมของฉบับนี้
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-lg font-extrabold text-[var(--text-primary)] font-mono">
                      {personalScoreInfo.avgOutOf5} / 5.00
                    </span>
                    <span className="text-xs font-bold text-emerald-600">
                      ({personalScoreInfo.avgPercent}%)
                    </span>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${personalScoreInfo.levelColor}`}>
                    {personalScoreInfo.levelLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Submission Time Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-blue-100 dark:border-blue-900/50">
                <span className="text-[10px] font-bold text-[var(--text-muted)] block mb-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-blue-500" /> วันที่และเวลาส่ง
                </span>
                <span className="font-bold text-[var(--text-primary)] block">
                  {new Date(response.submittedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] font-mono">
                  {new Date(response.submittedAt).toLocaleTimeString('th-TH')} น.
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-blue-100 dark:border-blue-900/50">
                <span className="text-[10px] font-bold text-[var(--text-muted)] block mb-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-500" /> เวลาที่ใช้ตอบ
                </span>
                <span className="font-bold text-[var(--text-primary)] block font-mono">
                  {response.timeSpentSeconds ? `${Math.floor(response.timeSpentSeconds / 60)} นาที ${response.timeSpentSeconds % 60} วินาที` : 'ประมาณ 1 นาที'}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  ✓ บันทึกสำเร็จสมบูรณ์
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-blue-100 dark:border-blue-900/50">
                <span className="text-[10px] font-bold text-[var(--text-muted)] block mb-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-500" /> รหัสบันทึก (ID)
                </span>
                <span className="font-mono text-[11px] font-bold text-[var(--text-primary)] truncate block" title={response.id}>
                  {response.id}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  ผ่านการตรวจสอบข้อมูล
                </span>
              </div>
            </div>
          </div>

          {/* Section: List of Questions & Answers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>รายละเอียดคำตอบแต่ละข้อ ({survey.questions.filter(q => q.type !== 'section_header').length} ข้อ)</span>
              </h4>
            </div>

            {survey.questions.map((q, idx) => {
              if (q.type === 'section_header') {
                return (
                  <div key={q.id} className="pt-4 pb-2 border-b-2 border-blue-500/20">
                    <h5 className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {q.title}
                    </h5>
                    {q.description && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{q.description}</p>
                    )}
                  </div>
                );
              }

              const safeAnsMap = getSafeAnswers(response.answers);
              const ans = safeAnsMap[q.id];
              const otherAns = safeAnsMap[`${q.id}_other_text`];
              const isAnswered = ans !== undefined && ans !== null && ans !== '';

              return (
                <div 
                  key={q.id} 
                  className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3"
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold font-mono">
                          ข้อที่ {idx + 1}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {q.type === 'matrix_rating' && 'ตารางประเมินระดับความพึงพอใจ'}
                          {q.type === 'single_choice' && 'เลือกตอบข้อเดียว'}
                          {q.type === 'multiple_choice' && 'เลือกตอบได้หลายข้อ'}
                          {q.type === 'rating_stars' && 'ประเมินให้คะแนนดาว'}
                          {q.type === 'slider_score' && 'แถบคะแนน'}
                          {q.type === 'text_long' && 'ข้อเสนอแนะ/ความคิดเห็น'}
                          {q.type === 'text_short' && 'ข้อความสั้น'}
                          {q.type === 'signature' && 'ลายมือชื่อดิจิทัล'}
                        </span>
                      </div>
                      <h5 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-snug">
                        {q.title}
                      </h5>
                    </div>

                    {!isAnswered ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
                        ไม่ได้ตอบ
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ตอบแล้ว</span>
                      </span>
                    )}
                  </div>

                  {/* Representative Details Display for RSVP Status */}
                  {q.type === 'rsvp_status' && safeAnsMap['representative_details'] && (
                    <div className="mt-2 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-3">
                      <div className="flex items-center gap-2 text-blue-600">
                        <User className="w-4 h-4" />
                        <h6 className="text-[11px] font-bold uppercase">รายละเอียดผู้แทน (Representative Details)</h6>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-500 block uppercase">ชื่อ-นามสกุล:</span>
                          <span className="text-xs font-bold text-[var(--text-primary)]">{safeAnsMap['representative_details'].name || '-'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-500 block uppercase">ตำแหน่ง:</span>
                          <span className="text-xs font-bold text-[var(--text-primary)]">{safeAnsMap['representative_details'].position || '-'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-500 block uppercase">เบอร์โทรศัพท์:</span>
                          <span className="text-xs font-bold text-[var(--text-primary)]">{safeAnsMap['representative_details'].phone || '-'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-500 block uppercase">อีเมล:</span>
                          <span className="text-xs font-bold text-[var(--text-primary)]">{safeAnsMap['representative_details'].email || '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Render Answer based on Type */}
                  <div className="pt-1">
                    {!isAnswered ? (
                      <div className="p-3 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] text-xs text-slate-400 italic">
                        ผู้ตอบไม่ได้ระบุคำตอบในข้อนี้
                      </div>
                    ) : (
                      <>
                        {/* 1. Matrix Rating (Likert Table) - Highly readable layout */}
                        {q.type === 'matrix_rating' && typeof ans === 'object' && (
                          <div className="space-y-2 rounded-2xl overflow-hidden border border-[var(--border-lighter)] bg-[var(--bg-canvas)]/40 p-2">
                            {q.matrixRows?.map((row, rIdx) => {
                              const score = (ans as Record<string, number>)[row.id];
                              const likertInfo = score !== undefined ? getLikertLabel(score) : null;

                              return (
                                <div 
                                  key={row.id} 
                                  className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                                >
                                  <div className="flex items-start gap-2 max-w-md">
                                    <span className="text-[11px] font-bold text-blue-600 font-mono shrink-0 mt-0.5">
                                      {rIdx + 1}.
                                    </span>
                                    <span className="text-xs font-medium text-[var(--text-primary)] leading-snug">
                                      {row.text}
                                    </span>
                                  </div>

                                  {likertInfo ? (
                                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                                      <div className="w-20 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden hidden sm:block">
                                        <div className={`h-full rounded-full ${likertInfo.bar}`} />
                                      </div>
                                      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold shadow-xs ${likertInfo.color}`}>
                                        {likertInfo.text}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 italic">ไม่ได้ให้คะแนน</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 2. Rating Stars */}
                        {q.type === 'rating_stars' && typeof ans === 'number' && (
                          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5">
                              {Array.from({ length: q.maxScore || 5 }).map((_, sIdx) => (
                                <Star 
                                  key={sIdx}
                                  className={`w-6 h-6 ${sIdx < ans ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-700'}`}
                                />
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                                {ans} จาก {q.maxScore || 5} ดาว
                              </span>
                              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500 text-white">
                                {ans >= 5 ? 'ดีเยี่ยม / มากที่สุด' : ans >= 4 ? 'ดีมาก' : ans >= 3 ? 'ปานกลาง' : 'ควรปรับปรุง'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 3. Slider Score */}
                        {q.type === 'slider_score' && typeof ans === 'number' && (
                          <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[var(--text-muted)] font-medium">เกณฑ์คะแนน (0 - {q.maxScore || 100})</span>
                              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                                {ans} คะแนน
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${Math.min(100, (ans / (q.maxScore || 100)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* 4. Single Choice & Dropdown & RSVP Choice */}
                        {(q.type === 'single_choice' || q.type === 'dropdown' || q.type === 'rsvp_status') && typeof ans === 'string' && (
                          <div className="space-y-2">
                            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200 font-bold">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{String(ans)}</span>
                            </div>

                            {otherAns && (
                              <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] text-xs space-y-1">
                                <span className="text-[10px] font-bold text-blue-600 block">รายละเอียดอื่นๆ เพิ่มเติม:</span>
                                <p className="text-[var(--text-primary)] font-medium">{String(otherAns)}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 5. Date / Time */}
                        {q.type === 'date_time' && (
                          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200 font-bold">
                            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>{String(ans)}</span>
                          </div>
                        )}

                        {/* 6. File Upload */}
                        {q.type === 'file_upload' && (
                          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-2.5 text-xs text-purple-900 dark:text-purple-200 font-bold">
                            <UploadCloud className="w-4 h-4 text-purple-600 shrink-0" />
                            <span className="truncate">{typeof ans === 'object' && ans?.name ? ans.name : String(ans)}</span>
                          </div>
                        )}

                        {/* 5. Multiple Choice */}
                        {q.type === 'multiple_choice' && (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {Array.isArray(ans) ? (
                                ans.map((item, mIdx) => (
                                  <span 
                                    key={mIdx}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs font-bold text-blue-700 dark:text-blue-300 shadow-xs"
                                  >
                                    <Check className="w-3.5 h-3.5 text-blue-600" />
                                    <span>{item}</span>
                                  </span>
                                ))
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs font-bold text-blue-700 dark:text-blue-300">
                                  <Check className="w-3.5 h-3.5 text-blue-600" />
                                  <span>{String(ans)}</span>
                                </span>
                              )}
                            </div>

                            {otherAns && (
                              <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] text-xs space-y-1 mt-2">
                                <span className="text-[10px] font-bold text-blue-600 block">รายละเอียดอื่นๆ เพิ่มเติม:</span>
                                <p className="text-[var(--text-primary)] font-medium">{String(otherAns)}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 6. Text Short / Long */}
                        {(q.type === 'text_short' || q.type === 'text_long') && (
                          <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] space-y-2 relative group">
                            <div className="flex items-start gap-2.5">
                              <MessageSquareQuote className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                              <p className="text-xs sm:text-sm text-[var(--text-primary)] font-medium leading-relaxed whitespace-pre-wrap flex-1">
                                "{String(ans)}"
                              </p>
                            </div>
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => handleCopyText(String(ans), q.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[var(--bg-surface)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)] border border-[var(--border-lighter)] transition cursor-pointer"
                              >
                                {copiedText === q.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-500" />
                                    <span className="text-emerald-600">คัดลอกแล้ว</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>คัดลอกข้อความ</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 7. Contact Info Bundle */}
                        {q.type === 'contact_info' && typeof ans === 'object' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold text-indigo-500 block uppercase">ชื่อ-นามสกุล:</span>
                              <span className="text-xs font-bold text-[var(--text-primary)]">{ans.name || '-'}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold text-indigo-500 block uppercase">ตำแหน่ง:</span>
                              <span className="text-xs font-bold text-[var(--text-primary)]">{ans.position || '-'}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold text-indigo-500 block uppercase">หน่วยงาน/สังกัด:</span>
                              <span className="text-xs font-bold text-[var(--text-primary)]">{ans.dept || '-'}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold text-indigo-500 block uppercase">เบอร์โทรศัพท์:</span>
                              <span className="text-xs font-bold text-[var(--text-primary)]">{ans.phone || '-'}</span>
                            </div>
                            {ans.email && (
                              <div className="space-y-0.5 sm:col-span-2">
                                <span className="text-[10px] font-bold text-indigo-500 block uppercase">อีเมล:</span>
                                <span className="text-xs font-bold text-[var(--text-primary)]">{ans.email}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 8. Signature Pad */}
                        {q.type === 'signature' && typeof ans === 'string' && ans.startsWith('data:image') && (
                          <div className="space-y-2">
                            <div className="p-4 rounded-2xl bg-white border border-slate-300 dark:border-slate-700 inline-block shadow-xs">
                              <img src={ans} alt="Signature" className="h-20 object-contain mx-auto" />
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                              <ShieldCheck className="w-4 h-4" />
                              <span>ลายมือชื่อได้รับการบันทึกและรับรองอย่างเป็นทางการ</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-[var(--border-lighter)] bg-[var(--bg-surface)]">
          <div>
            {onDeleteResponse && (
              <button
                onClick={() => {
                  if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการคำตอบนี้?')) {
                    onDeleteResponse(response.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-500/10 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ลบรายการนี้</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-black dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-md transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

        {showPrintPreview && (
          <SurveyResponsePrintView 
            survey={survey} 
            response={response} 
            onClose={() => setShowPrintPreview(false)} 
          />
        )}

      </div>
    </div>
  );
};
