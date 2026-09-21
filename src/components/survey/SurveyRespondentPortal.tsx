import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  Send, 
  ArrowLeft, 
  ArrowRight, 
  Star, 
  CircleDot, 
  CheckSquare, 
  AlertCircle, 
  FileText, 
  Sparkles, 
  Clock, 
  Calendar, 
  PenTool, 
  UploadCloud, 
  RotateCcw,
  Check,
  Building,
  User,
  Phone,
  Mail,
  GitBranch,
  QrCode,
  Printer,
  Download,
  MapPin,
  FileCheck,
  UserCheck,
  XCircle,
  Share2,
  Sliders,
  PauseCircle
} from 'lucide-react';
import { Survey, SurveyResponse, SurveyQuestion } from '../../types/survey';
import { evaluateQuestionState, getReadableRuleDescription } from '../../utils/surveyLogicEngine';
import { 
  getMergedThemeConfig, 
  getFontFamilyClass, 
  getBorderRadiusClass, 
  getCardShadowClass 
} from '../../data/surveyThemes';
import { getResolvedSurveyLogoUrl, getSystemBrandingInfo } from '../../utils/surveyLogoHelper';

interface SurveyRespondentPortalProps {
  survey: Survey;
  onSubmit?: (response: Omit<SurveyResponse, 'id' | 'submittedAt'>) => Promise<boolean>;
  onBack?: () => void;
  onClose?: () => void;
  isReadonlyPreview?: boolean;
  isEmbedded?: boolean;
}

export const SurveyRespondentPortal: React.FC<SurveyRespondentPortalProps> = ({
  survey,
  onSubmit,
  onBack,
  isEmbedded = false,
}) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [contactInfo, setContactInfo] = useState({ name: '', phone: '', email: '', dept: '', position: '' });
  const [representativeInfo, setRepresentativeInfo] = useState({ name: '', position: '', phone: '', email: '' });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [startTime] = useState<number>(Date.now());

  // Signature canvas
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Set answer
  const handleSetAnswer = (qId: string, val: any) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
    if (validationErrors[qId]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[qId];
        return next;
      });
    }
  };

  // Multiple choice toggle
  const handleToggleMultipleChoice = (qId: string, optText: string) => {
    const currentList: string[] = answers[qId] || [];
    const nextList = currentList.includes(optText)
      ? currentList.filter(item => item !== optText)
      : [...currentList, optText];
    handleSetAnswer(qId, nextList);
  };

  // Matrix cell select
  const handleSelectMatrixCell = (qId: string, rowId: string, colScore: number) => {
    const currentMatrix = answers[qId] || {};
    handleSetAnswer(qId, { ...currentMatrix, [rowId]: colScore });
  };

  // Signature Canvas Drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const sigQ = survey.questions.find(q => q.type === 'signature');
      if (sigQ) {
        handleSetAnswer(sigQ.id, canvas.toDataURL('image/png'));
      }
    }
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      const sigQ = survey.questions.find(q => q.type === 'signature');
      if (sigQ) {
        handleSetAnswer(sigQ.id, null);
      }
    }
  };

  // Compute dynamic question visibility & requirements based on conditional logic
  const questionStates = useMemo(() => {
    const states: Record<string, { isVisible: boolean; isRequired: boolean; isTriggered: boolean; triggeredReason?: string }> = {};
    survey.questions.forEach(q => {
      const res = evaluateQuestionState(q, survey.questions, answers);
      states[q.id] = {
        isVisible: res.isVisible,
        isRequired: res.isRequired,
        isTriggered: res.activeRules.length > 0,
        triggeredReason: res.activeRules.length > 0 ? getReadableRuleDescription(res.activeRules[0], survey.questions) : undefined
      };
    });
    return states;
  }, [survey.questions, answers]);

  // List of questions currently visible to the respondent
  const visibleQuestions = useMemo(() => {
    return survey.questions.filter(q => {
      const state = questionStates[q.id];
      return state ? state.isVisible : true;
    });
  }, [survey.questions, questionStates]);

  // Progress Calculation based ONLY on visible questions
  const totalQuestions = visibleQuestions.filter(q => q.type !== 'section_header').length;
  const answeredCount = visibleQuestions.filter(q => {
    if (q.type === 'section_header') return false;
    const ans = answers[q.id];
    if (ans === undefined || ans === null || ans === '') return false;
    if (Array.isArray(ans) && ans.length === 0) return false;
    if (typeof ans === 'object' && Object.keys(ans).length === 0) return false;
    return true;
  }).length;

  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // Validation & Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};

    // Validate only currently visible questions
    visibleQuestions.forEach(q => {
      const state = questionStates[q.id];
      const isReq = state ? state.isRequired : q.required;

      if (!isReq || q.type === 'section_header') return;

      const val = answers[q.id];
      
      // Special validation for RSVP Representative
      if (q.type === 'rsvp_status' && typeof val === 'string' && val.includes('ผู้แทน')) {
        if (!representativeInfo.name.trim()) errors[`${q.id}_rep_name`] = 'กรุณาระบุชื่อผู้แทน';
        if (!representativeInfo.position.trim()) errors[`${q.id}_rep_position`] = 'กรุณาระบุตำแหน่งผู้แทน';
        if (!representativeInfo.phone.trim()) errors[`${q.id}_rep_phone`] = 'กรุณาระบุเบอร์โทรศัพท์ผู้แทน';
      }

      if (val === undefined || val === null || val === '') {
        errors[q.id] = 'กรุณาตอบคำถามข้อนี้';
        return;
      }

      if (q.type === 'multiple_choice' && Array.isArray(val) && val.length === 0) {
        errors[q.id] = 'กรุณาเลือกคำตอบอย่างน้อย 1 ข้อ';
      }

      if (q.type === 'matrix_rating') {
        const rowCount = q.matrixRows?.length || 0;
        const answeredRows = Object.keys(val || {}).length;
        if (answeredRows < rowCount) {
          errors[q.id] = `กรุณาให้คะแนนครบทุกประเด็น (${answeredRows}/${rowCount} ข้อ)`;
        }
      }

      if (q.type === 'signature' && !hasSignature && !val) {
        errors[q.id] = 'กรุณาวาดลายมือชื่อรับรอง';
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      // Scroll to first error
      const firstErrKey = Object.keys(errors)[0];
      const el = document.getElementById(`q_box_${firstErrKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));

    // Combine other texts with answers
    const finalAnswers = { ...answers };
    Object.keys(otherTexts).forEach(qId => {
      if (otherTexts[qId]) {
        finalAnswers[`${qId}_other_text`] = otherTexts[qId];
      }
    });

    // Add representative info if applicable
    const rsvpStatusQ = survey.questions.find(q => q.type === 'rsvp_status');
    if (rsvpStatusQ && typeof finalAnswers[rsvpStatusQ.id] === 'string' && finalAnswers[rsvpStatusQ.id].includes('ผู้แทน')) {
      finalAnswers['representative_details'] = representativeInfo;
    }

    // Smart extract respondent name and department from answers if not in contactInfo
    let derivedName = contactInfo.name;
    let derivedDept = contactInfo.dept;
    let derivedPosition = contactInfo.position;

    if (!derivedName) {
      survey.questions.forEach(q => {
        if (q.type === 'section_header') return;
        const val = finalAnswers[q.id];
        if (typeof val === 'string' && val.trim() !== '') {
          const t = (q.title || '').toLowerCase();
          const qid = (q.id || '').toLowerCase();
          if (t.includes('ชื่อ') || qid.includes('name') || qid.includes('attendee')) {
            if (!derivedName) derivedName = val.trim();
          }
        }
      });
    }

    if (!derivedPosition) {
      survey.questions.forEach(q => {
        if (q.type === 'section_header') return;
        const val = finalAnswers[q.id];
        if (typeof val === 'string' && val.trim() !== '') {
          const t = (q.title || '').toLowerCase();
          const qid = (q.id || '').toLowerCase();
          if (t.includes('ตำแหน่ง') || qid.includes('position')) {
            if (!derivedPosition) derivedPosition = val.trim();
          }
        }
      });
    }

    if (!derivedDept) {
      survey.questions.forEach(q => {
        if (q.type === 'section_header') return;
        const val = finalAnswers[q.id];
        if (typeof val === 'string' && val.trim() !== '') {
          const t = (q.title || '').toLowerCase();
          const qid = (q.id || '').toLowerCase();
          if (t.includes('สังกัด') || t.includes('หน่วยงาน') || qid.includes('dept')) {
            if (!derivedDept) derivedDept = val.trim();
          }
        }
      });
    }

    try {
      if (onSubmit) {
        const success = await onSubmit({
          surveyId: survey.id,
          surveyTitle: survey.title,
          answers: finalAnswers,
          respondentName: derivedName || undefined,
          respondentDepartment: derivedDept || undefined,
          respondentPosition: derivedPosition || undefined,
          respondentPhone: contactInfo.phone || undefined,
          respondentEmail: contactInfo.email || undefined,
          timeSpentSeconds: timeSpent,
        });

        if (success) {
          setIsSubmitted(true);
        }
      } else {
        // Preview mode simulated submit
        setIsSubmitted(true);
      }
    } catch (err) {
      console.error('Failed to submit survey:', err);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const themeConfig = getMergedThemeConfig(survey.settings.themeConfig, survey.settings.themeColor);
  const primaryColor = themeConfig.primaryColor;
  const isRsvpOrAck = survey.settings.isRsvpForm || survey.category === 'rsvp_acknowledgment' || survey.settings.showRsvpReceipt;
  const refCode = `RSVP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const shareUrl = window.location.href.includes('/public/survey/')
      ? window.location.href
      : `${window.location.origin}/public/survey/${survey.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleReset = () => {
    setAnswers({});
    setOtherTexts({});
    setContactInfo({ name: '', phone: '', email: '', dept: '', position: '' });
    setValidationErrors({});
    setIsSubmitted(false);
    // Clear signature if canvas exists
    if (signatureCanvasRef.current) {
      clearSignature();
    }
  };

  // Thank you page
  if (isSubmitted) {
    return (
      <div 
        className={`min-h-screen py-12 px-4 animate-fade-in flex flex-col items-center justify-center ${getFontFamilyClass(themeConfig.fontFamily)}`}
        style={{ backgroundColor: themeConfig.bgColor }}
      >
        <div className="max-w-2xl w-full space-y-8">
          {/* Confetti Container */}
          <div className="relative p-8 sm:p-12 shadow-2xl border border-slate-100 dark:border-slate-800/80 text-center overflow-hidden transition-all duration-300 transform hover:scale-[1.01]"
            style={{ 
              backgroundColor: themeConfig.cardBgColor, 
              color: themeConfig.textColor,
              borderRadius: themeConfig.borderRadius === 'none' ? '0px' : themeConfig.borderRadius === 'md' ? '12px' : themeConfig.borderRadius === 'lg' ? '16px' : '24px',
              boxShadow: themeConfig.cardShadow === 'none' ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.08)'
            }}
          >
            {/* Elegant Confetti Sparks */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-40">
              <div className="absolute top-12 left-[12%] w-3 h-3 rounded-full bg-amber-400 animate-bounce" />
              <div className="absolute top-28 left-[18%] w-2.5 h-2.5 rounded-sm bg-blue-400 rotate-45 animate-pulse" />
              <div className="absolute top-44 left-[10%] w-5 h-1.5 bg-emerald-400 rounded-full rotate-12" />
              <div className="absolute top-14 right-[14%] w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
              <div className="absolute top-32 right-[20%] w-3.5 h-3.5 rounded-sm bg-violet-400 -rotate-12 animate-pulse" />
              <div className="absolute top-48 right-[12%] w-2 h-4 bg-amber-500 rounded-full" />
            </div>

            {/* Glowing Success Badge */}
            <div className="relative flex justify-center mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 animate-ping scale-125 opacity-60" />
              <div className="relative w-24 h-24 rounded-full bg-linear-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-14 h-14 animate-scale-up" />
              </div>
            </div>

            {/* Header Text */}
            <div className="space-y-3 max-w-lg mx-auto">
              <h2 className="text-3xl font-black tracking-tight" style={{ color: themeConfig.textColor }}>
                {survey.settings.thankYouTitle || 'ส่งข้อมูลแบบสำรวจสำเร็จ'}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-normal opacity-90">
                {survey.settings.thankYouMessage || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ขอขอบพระคุณเป็นอย่างสูงสำหรับความร่วมมือและข้อมูลที่ท่านได้บันทึกเข้าระบบมา ณ ที่นี้'}
              </p>
            </div>

            {/* Receipt Ticket Container */}
            {isRsvpOrAck ? (
              <div 
                id="rsvp-receipt-ticket"
                className="mt-8 p-6 sm:p-8 border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white shadow-2xl space-y-6 text-left relative overflow-hidden"
                style={{ borderRadius: '20px' }}
              >
                {/* Decorative glow watermark */}
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Ticket Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block">
                        E-RSVP OFFICIAL TICKET
                      </span>
                      <span className="text-sm font-extrabold text-white">
                        สำนักงาน ปภ. จังหวัดระยอง
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-mono font-bold">
                      {refCode}
                    </span>
                  </div>
                </div>

                {/* Simulated Ticket Notch Left & Right */}
                <div className="relative my-2">
                  <div className="absolute -left-[33px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--bg-canvas)] border-r border-slate-200 dark:border-slate-800" style={{ backgroundColor: themeConfig.bgColor }} />
                  <div className="absolute -right-[33px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--bg-canvas)] border-l border-slate-200 dark:border-slate-800" style={{ backgroundColor: themeConfig.bgColor }} />
                  <div className="border-t-2 border-dashed border-white/10 mx-1" />
                </div>

                {/* Details list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-indigo-300 font-bold text-[10px] uppercase tracking-wider block">ชื่องาน / กิจกรรม / การตอบรับ:</span>
                    <p className="font-extrabold text-sm text-white leading-relaxed">
                      {survey.settings.rsvpEventTitle || survey.title}
                    </p>
                  </div>

                  {survey.settings.rsvpEventDate && (
                    <div className="space-y-1">
                      <span className="text-indigo-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>วันและเวลาจัดงาน:</span>
                      </span>
                      <p className="font-semibold text-slate-200">{survey.settings.rsvpEventDate}</p>
                    </div>
                  )}

                  {survey.settings.rsvpEventLocation && (
                    <div className="space-y-1">
                      <span className="text-indigo-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>สถานที่จัดงาน:</span>
                      </span>
                      <p className="font-semibold text-slate-200">{survey.settings.rsvpEventLocation}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-indigo-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ผู้ส่งข้อมูลการตอบรับ:</span>
                    </span>
                    <p className="font-extrabold text-sm text-emerald-400">
                      {contactInfo.name || 'เจ้าหน้าที่ / ผู้ปฏิบัติงาน'}
                    </p>
                    {contactInfo.position && (
                      <p className="text-[10px] text-slate-400 font-medium -mt-1 ml-5">
                        ตำแหน่ง: {contactInfo.position}
                      </p>
                    )}

                    {/* Show Representative Details if applicable */}
                    {representativeInfo.name && answers[survey.questions.find(q => q.type === 'rsvp_status')?.id || '']?.includes('ผู้แทน') && (
                      <div className="mt-2 pl-4 border-l-2 border-indigo-500/50 bg-indigo-500/5 py-1.5 space-y-1">
                        <span className="text-indigo-300 font-bold text-[9px] uppercase tracking-wider block">ผู้แทนที่ได้รับมอบหมาย:</span>
                        <p className="font-bold text-xs text-white">
                          {representativeInfo.name}
                        </p>
                        {representativeInfo.position && (
                          <p className="text-[10px] text-slate-400 font-medium">
                            ตำแหน่ง: {representativeInfo.position}
                          </p>
                        )}
                        {representativeInfo.phone && (
                          <p className="text-[10px] text-slate-500 font-mono">
                            โทร: {representativeInfo.phone}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-indigo-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-amber-400" />
                      <span>หน่วยงาน / สังกัด:</span>
                    </span>
                    <p className="font-semibold text-slate-200">
                      {contactInfo.dept || 'หน่วยงานภาคีเครือข่าย ปภ.'}
                    </p>
                  </div>
                </div>

                {/* Simulated Ticket Notch Left & Right */}
                <div className="relative my-2">
                  <div className="absolute -left-[33px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--bg-canvas)] border-r border-slate-200 dark:border-slate-800" style={{ backgroundColor: themeConfig.bgColor }} />
                  <div className="absolute -right-[33px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--bg-canvas)] border-l border-slate-200 dark:border-slate-800" style={{ backgroundColor: themeConfig.bgColor }} />
                  <div className="border-t-2 border-dashed border-white/10 mx-1" />
                </div>

                {/* Barcode & Printable Options */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-white text-slate-900 shrink-0 shadow-md">
                      <QrCode className="w-14 h-14" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-0.5 h-4 w-28 bg-white/5 px-1 py-0.5 rounded opacity-75">
                        <span className="w-[1px] h-full bg-slate-300"></span>
                        <span className="w-[3px] h-full bg-slate-300"></span>
                        <span className="w-[1px] h-full bg-slate-300"></span>
                        <span className="w-[2px] h-full bg-slate-300"></span>
                        <span className="w-[4px] h-full bg-slate-300"></span>
                        <span className="w-[1px] h-full bg-slate-300"></span>
                        <span className="w-[2px] h-full bg-slate-300"></span>
                        <span className="w-[1px] h-full bg-slate-300"></span>
                        <span className="w-[3px] h-full bg-slate-300"></span>
                        <span className="w-[2px] h-full bg-slate-300"></span>
                        <span className="w-[1.5px] h-full bg-slate-300"></span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">
                        REF: {survey.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        ลงทะเบียนสำเร็จ: {new Date().toLocaleTimeString('th-TH')} น.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <Printer className="w-4 h-4" />
                    <span>พิมพ์หรือบันทึกบัตร PDF</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Digital Submission Receipt for Standard Surveys */
              <div 
                className="mt-8 p-6 rounded-2xl border border-[var(--border-lighter)] text-left space-y-4 relative overflow-hidden"
                style={{ 
                  backgroundColor: 'var(--bg-canvas)',
                  borderTop: `4px solid ${primaryColor}`
                }}
              >
                <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5" style={{ color: primaryColor }} />
                    <span className="text-xs font-bold text-[var(--text-secondary)]">ใบเสร็จส่งข้อมูลอิเล็กทรอนิกส์</span>
                  </div>
                  <span className="text-[10px] font-mono bg-[var(--border-lighter)] text-[var(--text-muted)] px-2 py-0.5 rounded-md font-bold">
                    {survey.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)] font-medium">ชื่อแบบสำรวจ:</span>
                    <span className="font-bold text-[var(--text-primary)] text-right max-w-[250px] truncate">{survey.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)] font-medium">รหัสส่งข้อมูล:</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">{survey.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)] font-medium">เวลาที่ส่งสำเร็จ:</span>
                    <span className="font-bold text-[var(--text-primary)]">{new Date().toLocaleTimeString('th-TH')} น.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)] font-medium">สถานะการบันทึก:</span>
                    <span className="text-emerald-500 font-extrabold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> บันทึกแล้ว (MySQL & Local Cache)
                    </span>
                  </div>
                </div>

                {/* Simulated Barcode at the bottom of Receipt */}
                <div className="pt-2 border-t border-[var(--border-lighter)] flex justify-between items-center gap-4">
                  <div className="flex items-center gap-0.5 h-6 w-32 bg-[var(--bg-surface)] px-1 py-0.5 rounded opacity-60">
                    <span className="w-[1px] h-full bg-[var(--text-muted)]"></span>
                    <span className="w-[2.5px] h-full bg-[var(--text-muted)]"></span>
                    <span className="w-[1px] h-full bg-[var(--text-muted)]"></span>
                    <span className="w-[3px] h-full bg-[var(--text-muted)]"></span>
                    <span className="w-[1px] h-full bg-[var(--text-muted)]"></span>
                    <span className="w-[4px] h-full bg-[var(--text-muted)]"></span>
                    <span className="w-[1.5px] h-full bg-[var(--text-muted)]"></span>
                    <span className="w-[2px] h-full bg-[var(--text-muted)]"></span>
                    <span className="w-[1px] h-full bg-[var(--text-muted)]"></span>
                    <span className="w-[3px] h-full bg-[var(--text-muted)]"></span>
                  </div>
                  <button 
                    onClick={() => window.print()}
                    className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition"
                  >
                    <Printer className="w-3.5 h-3.5" /> พิมพ์ใบเสร็จ
                  </button>
                </div>
              </div>
            )}

            {/* Premium Action Buttons Grid */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Copy Share Link Button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[var(--text-primary)] font-bold text-xs flex items-center justify-center gap-2 transition duration-200 hover:shadow-sm cursor-pointer select-none"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? 'คัดลอกลิงก์สำเร็จ!' : 'แชร์แบบสำรวจนี้'}</span>
              </button>

              {/* Submit Another Response Button */}
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[var(--text-primary)] font-bold text-xs flex items-center justify-center gap-2 transition duration-200 hover:shadow-sm cursor-pointer select-none"
              >
                <RotateCcw className="w-4 h-4" />
                <span>ทำแบบประเมินอีกครั้ง</span>
              </button>

              {onBack && (
                <button
                  onClick={onBack}
                  className="sm:col-span-2 px-6 py-3.5 rounded-xl text-white text-xs font-black transition-all hover:opacity-90 cursor-pointer shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 mt-2"
                  style={{ backgroundColor: primaryColor || '#1e3a8a' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>ย้อนกลับเข้าสู่หน้าแผงควบคุมหลัก</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (survey.settings?.isOpen === false || survey.settings?.status === 'paused') {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xl text-center space-y-6 my-12">
        <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
          <PauseCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-[var(--text-primary)]">แบบสำรวจนี้ปิดรับคำตอบแล้ว</h2>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
            ขออภัยในความไม่สะดวก ขณะนี้ผู้ดูแลระบบได้ปิดการรับคำตอบสำหรับแบบสำรวจ "{survey.title}" เรียบร้อยแล้ว หากมีข้อสงสัยโปรดติดต่อหน่วยงานผู้จัดทำ
          </p>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition cursor-pointer shadow-md"
          >
            ย้อนกลับ
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-3 sm:px-6 space-y-6 animate-fade-in text-left">
      {/* Top Floating Progress Bar */}
      {survey.settings.showProgressBar && (
        <div className="sticky top-2 z-30 bg-[var(--bg-surface)]/90 backdrop-blur-md border border-[var(--border-lighter)] rounded-2xl p-3 shadow-md flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg"
              title="ย้อนกลับ"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex-1">
            <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)] mb-1">
              <span>ความคืบหน้าการตอบ</span>
              <span style={{ color: primaryColor }}>{progressPercent}% ({answeredCount}/{totalQuestions} ข้อ)</span>
            </div>
            <div className="w-full bg-[var(--bg-canvas)] h-2 rounded-full overflow-hidden border border-[var(--border-lighter)]">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%`, backgroundColor: primaryColor }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div 
        className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-md space-y-4 relative overflow-hidden"
        style={{ borderTopWidth: '8px', borderTopColor: primaryColor }}
      >
        <div className="flex items-center gap-4">
          {getResolvedSurveyLogoUrl(survey.settings.headerLogoType, survey.settings.customLogoUrl, survey.settings.resolvedLogoUrl) && (
            <img 
              src={getResolvedSurveyLogoUrl(survey.settings.headerLogoType, survey.settings.customLogoUrl, survey.settings.resolvedLogoUrl)!} 
              alt="Logo" 
              className="w-14 h-14 object-contain shrink-0" 
            />
          )}
          <div className="min-w-0">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              {survey.department || getSystemBrandingInfo().orgName}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] leading-snug">
              {survey.title}
            </h1>
          </div>
        </div>

        {survey.description && (
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed pt-2 border-t border-[var(--border-lighter)]">
            {survey.description}
          </p>
        )}

        {survey.settings.linkedDocNumber && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/10 text-blue-600 text-xs font-medium border border-blue-500/20">
            <FileText className="w-3.5 h-3.5" />
            <span>อ้างถึงหนังสือราชการ: {survey.settings.linkedDocNumber}</span>
          </div>
        )}
      </div>

      {/* Questions Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {survey.questions.map((q, idx) => {
          const qState = questionStates[q.id];
          const isVisible = qState ? qState.isVisible : true;
          const isRequired = qState ? qState.isRequired : q.required;

          // If question is hidden by conditional logic, do not render it
          if (!isVisible) {
            return null;
          }

          const hasError = !!validationErrors[q.id];
          const currentAnswer = answers[q.id];

          if (q.type === 'section_header') {
            return (
              <div key={q.id} className="pt-6 pb-2 border-b-2 border-blue-500/30">
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span>{q.title}</span>
                </h3>
                {q.description && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">{q.description}</p>
                )}
              </div>
            );
          }

          return (
            <div
              key={q.id}
              id={`q_box_${q.id}`}
              className={`p-5 sm:p-6 rounded-3xl bg-[var(--bg-surface)] border transition-all duration-200 shadow-xs ${
                hasError
                  ? 'border-rose-500 ring-2 ring-rose-500/20'
                  : 'border-[var(--border-lighter)] hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Conditional Logic Trigger Banner */}
              {qState?.isTriggered && qState.triggeredReason && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3.5">
                  <GitBranch className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">แสดงตามเงื่อนไข: {qState.triggeredReason}</span>
                </div>
              )}

              {/* Question Header */}
              <div className="space-y-1 mb-4">
                <div className="flex items-start gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-snug">
                    {q.title}
                  </h3>
                  {isRequired && (
                    <span className="text-rose-500 font-bold text-sm" title="จำเป็นต้องตอบ">*</span>
                  )}
                </div>
                {q.description && (
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {q.description}
                  </p>
                )}
              </div>

              {/* RSVP Status Selection */}
              {q.type === 'rsvp_status' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(q.options && q.options.length > 0 ? q.options : [
                    { id: 'rsvp_yes', text: 'ตอบรับเข้าร่วมงานด้วยตนเอง' },
                    { id: 'rsvp_rep', text: 'มอบหมายผู้แทนเข้าร่วม' },
                    { id: 'rsvp_no', text: 'ไม่สะดวกเข้าร่วมงาน' }
                  ]).map((opt, idx) => {
                    const isSelected = currentAnswer === opt.text;
                    const isYes = opt.text.includes('ด้วยตนเอง') || opt.text.includes('เข้าร่วม') && !opt.text.includes('ไม่สะดวก');
                    const isRep = opt.text.includes('ผู้แทน');
                    const isNo = opt.text.includes('ไม่สะดวก') || opt.text.includes('ปฏิเสธ');

                    return (
                      <React.Fragment key={opt.id}>
                        <button
                          type="button"
                          onClick={() => handleSetAnswer(q.id, opt.text)}
                          className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                            isSelected
                              ? isYes 
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30'
                                : isRep
                                ? 'bg-blue-500/10 border-blue-500 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/30'
                                : 'bg-rose-500/10 border-rose-500 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/30'
                              : 'bg-[var(--bg-canvas)] hover:border-slate-300 dark:hover:border-slate-700 border-[var(--border-lighter)] text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-2">
                            <span className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-base shadow-xs"
                              style={{
                                backgroundColor: isYes ? '#10b98120' : isRep ? '#3b82f620' : '#f43f5e20',
                                color: isYes ? '#10b981' : isRep ? '#3b82f6' : '#f43f5e'
                              }}
                            >
                              {isYes ? '✅' : isRep ? '👥' : '❌'}
                            </span>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                                ✓
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="text-xs font-bold leading-snug">
                              {opt.text}
                            </h4>
                            <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                              {isYes ? 'ยืนยันพร้อมร่วมกิจกรรม' : isRep ? 'ส่งผู้แทนลงทะเบียนแทน' : 'แจ้งเหตุผลความจำเป็น'}
                            </span>
                          </div>
                        </button>

                        {/* If Representative is selected, show rep fields right under the button in a mobile-friendly way or after the grid */}
                        {isRep && isSelected && (
                          <div className="col-span-1 sm:col-span-3 mt-3 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 pb-2 border-b border-blue-500/10">
                              <GitBranch className="w-4 h-4 text-blue-500" />
                              <h5 className="text-xs font-bold text-blue-600">ข้อมูลผู้แทน (Representative Details)</h5>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">ชื่อ-นามสกุล ผู้แทน</label>
                                <div className="relative">
                                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                  <input
                                    type="text"
                                    value={representativeInfo.name}
                                    onChange={(e) => setRepresentativeInfo(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="ระบุชื่อ-นามสกุล ผู้แทน"
                                    className={`w-full bg-[var(--bg-canvas)] border rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:border-blue-500 outline-none transition-all ${
                                      validationErrors[`${q.id}_rep_name`] ? 'border-rose-500 bg-rose-500/5' : 'border-[var(--border-lighter)]'
                                    }`}
                                  />
                                </div>
                                {validationErrors[`${q.id}_rep_name`] && (
                                  <p className="text-[10px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {validationErrors[`${q.id}_rep_name`]}
                                  </p>
                                )}
                              </div>
                              
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">ตำแหน่งของผู้แทน</label>
                                <div className="relative">
                                  <Sliders className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                  <input
                                    type="text"
                                    value={representativeInfo.position}
                                    onChange={(e) => setRepresentativeInfo(prev => ({ ...prev, position: e.target.value }))}
                                    placeholder="ระบุตำแหน่งของผู้แทน"
                                    className={`w-full bg-[var(--bg-canvas)] border rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:border-blue-500 outline-none transition-all ${
                                      validationErrors[`${q.id}_rep_position`] ? 'border-rose-500 bg-rose-500/5' : 'border-[var(--border-lighter)]'
                                    }`}
                                  />
                                </div>
                                {validationErrors[`${q.id}_rep_position`] && (
                                  <p className="text-[10px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {validationErrors[`${q.id}_rep_position`]}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">เบอร์โทรศัพท์ติดต่อ</label>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                  <input
                                    type="tel"
                                    value={representativeInfo.phone}
                                    onChange={(e) => setRepresentativeInfo(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="เช่น 081-234-5678"
                                    className={`w-full bg-[var(--bg-canvas)] border rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:border-blue-500 outline-none transition-all ${
                                      validationErrors[`${q.id}_rep_phone`] ? 'border-rose-500 bg-rose-500/5' : 'border-[var(--border-lighter)]'
                                    }`}
                                  />
                                </div>
                                {validationErrors[`${q.id}_rep_phone`] && (
                                  <p className="text-[10px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {validationErrors[`${q.id}_rep_phone`]}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">อีเมล (ถ้ามี)</label>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                  <input
                                    type="email"
                                    value={representativeInfo.email}
                                    onChange={(e) => setRepresentativeInfo(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="example@email.com"
                                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:border-blue-500 outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
              {q.type === 'single_choice' && (
                <div className="space-y-2.5">
                  {q.options?.map(opt => {
                    const isSelected = currentAnswer === opt.text;
                    return (
                      <label
                        key={opt.id}
                        onClick={() => handleSetAnswer(q.id, opt.text)}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500 text-blue-900 dark:text-blue-100 font-medium'
                            : 'bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] border-[var(--border-lighter)] text-[var(--text-primary)]'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-xs sm:text-sm flex-1">{opt.text}</span>
                      </label>
                    );
                  })}

                  {q.allowOther && (
                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="โปรดระบุรายละเอียดอื่นๆ..."
                        value={otherTexts[q.id] || ''}
                        onChange={(e) => {
                          setOtherTexts(prev => ({ ...prev, [q.id]: e.target.value }));
                          handleSetAnswer(q.id, `อื่นๆ: ${e.target.value}`);
                        }}
                        className="w-full text-xs bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl px-3.5 py-2 text-[var(--text-primary)] outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Multiple Choice (Checkbox) */}
              {q.type === 'multiple_choice' && (
                <div className="space-y-2.5">
                  {q.options?.map(opt => {
                    const isChecked = Array.isArray(currentAnswer) && currentAnswer.includes(opt.text);
                    return (
                      <label
                        key={opt.id}
                        onClick={() => handleToggleMultipleChoice(q.id, opt.text)}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-blue-500/10 border-blue-500 text-blue-900 dark:text-blue-100 font-medium'
                            : 'bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] border-[var(--border-lighter)] text-[var(--text-primary)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-xs sm:text-sm flex-1">{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Dropdown */}
              {q.type === 'dropdown' && (
                <div>
                  <select
                    value={currentAnswer || ''}
                    onChange={(e) => handleSetAnswer(q.id, e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-2xl p-3 text-xs sm:text-sm text-[var(--text-primary)] outline-none focus:border-blue-500"
                  >
                    <option value="">-- กรุณาเลือกคำตอบ --</option>
                    {q.options?.map(opt => (
                      <option key={opt.id} value={opt.text}>
                        {opt.text}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Text Short */}
              {q.type === 'text_short' && (
                <div>
                  <input
                    type="text"
                    value={currentAnswer || ''}
                    onChange={(e) => handleSetAnswer(q.id, e.target.value)}
                    placeholder={q.placeholder || 'พิมพ์คำตอบของท่านที่นี่...'}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-2xl p-3 text-xs sm:text-sm text-[var(--text-primary)] outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Text Long */}
              {q.type === 'text_long' && (
                <div>
                  <textarea
                    rows={4}
                    value={currentAnswer || ''}
                    onChange={(e) => handleSetAnswer(q.id, e.target.value)}
                    placeholder={q.placeholder || 'พิมพ์ข้อความหรือข้อคิดเห็นของท่านที่นี่...'}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-2xl p-3.5 text-xs sm:text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 resize-none leading-relaxed"
                  />
                </div>
              )}

              {/* Rating Stars */}
              {q.type === 'rating_stars' && (
                <div className="flex items-center gap-3 py-2 flex-wrap">
                  {Array.from({ length: q.maxScore || 5 }).map((_, i) => {
                    const starVal = i + 1;
                    const isFilled = (currentAnswer || 0) >= starVal;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSetAnswer(q.id, starVal)}
                        className="p-1 hover:scale-125 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                            isFilled
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300 dark:text-slate-700'
                          }`}
                        />
                      </button>
                    );
                  })}
                  {currentAnswer && (
                    <span className="text-xs sm:text-sm font-bold text-amber-500 ml-2">
                      ({currentAnswer} จาก {q.maxScore || 5} คะแนน)
                    </span>
                  )}
                </div>
              )}

              {/* Matrix Rating (Likert) */}
              {q.type === 'matrix_rating' && (
                <div className="space-y-4">
                  {/* Mobile View: Touch Cards (sm:hidden) */}
                  <div className="sm:hidden space-y-3">
                    {q.matrixRows?.map((row, rIdx) => {
                      const rowScore = (currentAnswer || {})[row.id];
                      return (
                        <div 
                          key={row.id}
                          className="p-3.5 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] space-y-2.5"
                        >
                          <div className="font-bold text-xs text-[var(--text-primary)] leading-snug">
                            {rIdx + 1}. {row.text}
                          </div>
                          <div className="grid grid-cols-5 gap-1.5">
                            {q.matrixCols?.map(col => {
                              const isChecked = rowScore === col.score;
                              return (
                                <button
                                  key={col.id}
                                  type="button"
                                  onClick={() => handleSelectMatrixCell(q.id, row.id, col.score || 0)}
                                  className={`py-2 px-1 rounded-xl text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                                    isChecked
                                      ? 'bg-blue-600 text-white font-bold shadow-xs ring-2 ring-blue-400/30'
                                      : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-lighter)]'
                                  }`}
                                >
                                  <span className="text-xs font-extrabold">{col.score}</span>
                                  <span className="text-[9px] line-clamp-1 opacity-80 mt-0.5">{col.text.split(' ')[0]}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop View: Full Likert Matrix Table (hidden sm:block) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="border-b border-[var(--border-lighter)] bg-[var(--bg-canvas)]/50">
                          <th className="p-3 font-bold text-[var(--text-secondary)] rounded-tl-xl">
                            ประเด็นการประเมิน
                          </th>
                          {q.matrixCols?.map((col, cIdx) => (
                            <th 
                              key={col.id} 
                              className={`p-3 font-bold text-center text-[var(--text-secondary)] ${
                                cIdx === (q.matrixCols?.length || 0) - 1 ? 'rounded-tr-xl' : ''
                              }`}
                            >
                              {col.text}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {q.matrixRows?.map((row, rIdx) => {
                          const rowScore = (currentAnswer || {})[row.id];
                          return (
                            <tr 
                              key={row.id} 
                              className={`border-b border-[var(--border-lighter)]/60 transition-colors ${
                                rIdx % 2 === 0 ? 'bg-transparent' : 'bg-[var(--bg-canvas)]/30'
                              }`}
                            >
                              <td className="p-3 font-medium text-[var(--text-primary)] text-xs sm:text-sm">
                                {row.text}
                              </td>
                              {q.matrixCols?.map(col => {
                                const isChecked = rowScore === col.score;
                                return (
                                  <td 
                                    key={col.id} 
                                    onClick={() => handleSelectMatrixCell(q.id, row.id, col.score || 0)}
                                    className="p-3 text-center cursor-pointer hover:bg-blue-500/10 transition-colors"
                                  >
                                    <input
                                      type="radio"
                                      name={`${q.id}_${row.id}`}
                                      checked={isChecked}
                                      onChange={() => {}}
                                      className="w-4 h-4 text-blue-600 focus:ring-0 cursor-pointer"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Slider Score */}
              {q.type === 'slider_score' && (
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)]">
                    <span>{q.minScore || 0} (น้อยที่สุด)</span>
                    <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                      คะแนน: {currentAnswer !== undefined ? currentAnswer : (q.minScore || 0)}
                    </span>
                    <span>{q.maxScore || 10} (มากที่สุด)</span>
                  </div>
                  <input
                    type="range"
                    min={q.minScore || 0}
                    max={q.maxScore || 10}
                    step={q.step || 1}
                    value={currentAnswer !== undefined ? currentAnswer : (q.minScore || 0)}
                    onChange={(e) => handleSetAnswer(q.id, Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              )}

              {/* Signature Pad */}
              {q.type === 'signature' && (
                <div className="space-y-2">
                  <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden bg-white">
                    <canvas
                      ref={signatureCanvasRef}
                      width={600}
                      height={180}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-44 cursor-crosshair touch-none"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 italic">วาดลายเซ็นของคุณในกรอบสีขาวด้านบน</span>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="flex items-center gap-1 text-rose-500 hover:underline font-medium"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>ล้างลายเซ็น</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Contact info bundle */}
              {q.type === 'contact_info' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                      ชื่อ-นามสกุล ผู้ให้ข้อมูล
                    </label>
                    <input
                      type="text"
                      value={contactInfo.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setContactInfo(prev => ({ ...prev, name: val }));
                        handleSetAnswer(q.id, { ...contactInfo, name: val });
                      }}
                      placeholder="เช่น นายสมชาย ใจดี"
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                      ตำแหน่ง
                    </label>
                    <input
                      type="text"
                      value={contactInfo.position}
                      onChange={(e) => {
                        const val = e.target.value;
                        setContactInfo(prev => ({ ...prev, position: val }));
                        handleSetAnswer(q.id, { ...contactInfo, position: val });
                      }}
                      placeholder="เช่น นักวิชาการคอมพิวเตอร์ปฏิบัติการ"
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                      หน่วยงาน / สังกัด / ชุมชน
                    </label>
                    <input
                      type="text"
                      value={contactInfo.dept}
                      onChange={(e) => {
                        const val = e.target.value;
                        setContactInfo(prev => ({ ...prev, dept: val }));
                        handleSetAnswer(q.id, { ...contactInfo, dept: val });
                      }}
                      placeholder="เช่น อบต.เชิงเนิน, ประชาชน ม.3"
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                      เบอร์โทรศัพท์ติดต่อ
                    </label>
                    <input
                      type="tel"
                      value={contactInfo.phone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setContactInfo(prev => ({ ...prev, phone: val }));
                        handleSetAnswer(q.id, { ...contactInfo, phone: val });
                      }}
                      placeholder="08X-XXX-XXXX"
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                      อีเมล (ถ้ามี)
                    </label>
                    <input
                      type="email"
                      value={contactInfo.email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setContactInfo(prev => ({ ...prev, email: val }));
                        handleSetAnswer(q.id, { ...contactInfo, email: val });
                      }}
                      placeholder="example@rayong.go.th"
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              )}

              {/* Error warning badge */}
              {hasError && (
                <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-rose-500 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationErrors[q.id]}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Submit Actions Button */}
        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[var(--text-muted)] text-center sm:text-left">
            <span>โปรดตรวจสอบความถูกต้องของข้อมูลก่อนกดยืนยันส่งแบบสำรวจ</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: primaryColor }}
          >
            <Send className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>{isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งแบบสำรวจ (Submit Survey)'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
