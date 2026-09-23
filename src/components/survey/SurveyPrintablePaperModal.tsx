import React, { useState } from 'react';
import { Survey, SurveyQuestion } from '../../types/survey';
import { 
  Printer, 
  X, 
  CheckSquare, 
  Square, 
  FileText, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Award,
  ChevronDown,
  Info
} from 'lucide-react';
import { getResolvedSurveyLogoUrl, getSystemBrandingInfo } from '../../utils/surveyLogoHelper';

interface SurveyPrintablePaperModalProps {
  survey: Survey;
  onClose: () => void;
}

export const SurveyPrintablePaperModal: React.FC<SurveyPrintablePaperModalProps> = ({
  survey,
  onClose,
}) => {
  // Config States
  const [printMode, setPrintMode] = useState<'student' | 'teacher'>('student');
  const [includePersonalInfo, setIncludePersonalInfo] = useState<boolean>(true);
  const [headerLogo, setHeaderLogo] = useState<'garuda' | 'ddpm' | 'none'>('garuda');
  const [showScoreWeight, setShowScoreWeight] = useState<boolean>(true);
  const [includeAnswerSheet, setIncludeAnswerSheet] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  const branding = getSystemBrandingInfo();

  // Filter valid printable questions (excluding section break headers from counting as questions)
  const printableQuestions = survey.questions.filter(q => q.type !== 'section_header');

  const handlePrint = () => {
    window.print();
  };

  const getLogoUrl = () => {
    if (headerLogo === 'garuda') return branding.garudaLogoUrl;
    if (headerLogo === 'ddpm') return branding.ddpmLogoUrl;
    return '';
  };

  const getFontSizeClass = () => {
    if (fontSize === 'sm') return 'text-[12px]';
    if (fontSize === 'lg') return 'text-[16px]';
    return 'text-[14px]';
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row items-stretch justify-stretch bg-slate-900/95 backdrop-blur-md overflow-hidden print:p-0 print:bg-white print:block print:overflow-visible">
      
      {/* Dynamic Printing Style overrides */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          #printable-sidebar {
            display: none !important;
          }
          #printable-paper-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
            font-family: "Sarabun", sans-serif !important;
          }
          .page-break-before {
            page-break-before: always !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* 1. Left Control Panel Sidebar */}
      <div 
        id="printable-sidebar" 
        className="w-full lg:w-[380px] bg-slate-800 border-b lg:border-b-0 lg:border-r border-slate-700 flex flex-col overflow-y-auto shrink-0 p-5 space-y-6 no-print"
      >
        <div className="flex items-center justify-between border-b border-slate-700 pb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-black text-white">ตั้งค่าการจัดพิมพ์กระดาษ A4</h3>
              <span className="text-[10px] text-slate-400">Enterprise Printable System</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selectors */}
        <div className="space-y-3">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">โหมดการพิมพ์ข้อสอบ / แบบประเมิน</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPrintMode('student')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition cursor-pointer ${
                printMode === 'student'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Eye className="w-5 h-5" />
              <div className="text-center">
                <div className="text-xs font-bold">ฉบับผู้เข้าสอบ</div>
                <div className="text-[9px] opacity-75">(สำหรับพิมพ์ทำจริง)</div>
              </div>
            </button>
            <button
              onClick={() => setPrintMode('teacher')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition cursor-pointer ${
                printMode === 'teacher'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <EyeOff className="w-5 h-5" />
              <div className="text-center">
                <div className="text-xs font-bold">ฉบับเฉลย / ผู้คุมสอบ</div>
                <div className="text-[9px] opacity-75">(พร้อมคำอธิบาย & เฉลย)</div>
              </div>
            </button>
          </div>
        </div>

        {/* Custom Layout Settings */}
        <div className="space-y-4">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">ตัวเลือกการแสดงผล</label>
          
          <div className="space-y-3">
            <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition cursor-pointer text-xs text-slate-200">
              <input 
                type="checkbox" 
                checked={includePersonalInfo}
                onChange={(e) => setIncludePersonalInfo(e.target.checked)}
                className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500"
              />
              <span>กล่องกรอกข้อมูลผู้เข้าสอบ (ชื่อ, สังกัด)</span>
            </label>

            <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition cursor-pointer text-xs text-slate-200">
              <input 
                type="checkbox" 
                checked={showScoreWeight}
                onChange={(e) => setShowScoreWeight(e.target.checked)}
                className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500"
              />
              <span>แสดงค่าน้ำหนักคะแนนสอบรายข้อ</span>
            </label>

            {printMode === 'student' && (
              <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition cursor-pointer text-xs text-slate-200">
                <input 
                  type="checkbox" 
                  checked={includeAnswerSheet}
                  onChange={(e) => setIncludeAnswerSheet(e.target.checked)}
                  className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500"
                />
                <span>แผ่นกระดาษเขียนคำตอบที่ท้ายเล่ม</span>
              </label>
            )}
          </div>
        </div>

        {/* Custom Logo Settings */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">ตราสัญลักษณ์หัวข้อสอบ</label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setHeaderLogo('garuda')}
              className={`p-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                headerLogo === 'garuda' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}
            >
              ตราครุฑ
            </button>
            <button
              onClick={() => setHeaderLogo('ddpm')}
              className={`p-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                headerLogo === 'ddpm' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}
            >
              ตรา ปภ.
            </button>
            <button
              onClick={() => setHeaderLogo('none')}
              className={`p-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                headerLogo === 'none' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}
            >
              ไม่มีตรา
            </button>
          </div>
        </div>

        {/* FontSize Settings */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">ขนาดตัวอักษรเอกสาร</label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setFontSize('sm')}
              className={`p-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                fontSize === 'sm' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}
            >
              เล็ก (12px)
            </button>
            <button
              onClick={() => setFontSize('base')}
              className={`p-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                fontSize === 'base' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}
            >
              ปกติ (14px)
            </button>
            <button
              onClick={() => setFontSize('lg')}
              className={`p-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                fontSize === 'lg' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}
            >
              ใหญ่ (16px)
            </button>
          </div>
        </div>

        {/* Print Button Wrapper */}
        <div className="pt-4 border-t border-slate-700">
          <button
            onClick={handlePrint}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>สั่งพิมพ์กระดาษ / บันทึก PDF</span>
          </button>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>แนะนำ: เลือก "Destination: Save as PDF" หรือตั้งค่ากระดาษ A4 เพื่อพิมพ์อย่างคมชัดที่สุด</span>
          </div>
        </div>
      </div>

      {/* 2. Right Canvas Area containing Printable A4 paper preview */}
      <div className="flex-1 bg-slate-900/60 p-4 lg:p-8 overflow-y-auto flex justify-center custom-scrollbar print:p-0 print:bg-white print:block">
        <div 
          id="printable-paper-sheet"
          className={`w-full max-w-[800px] bg-white text-black p-10 shadow-2xl rounded-sm border border-slate-200 min-h-[1120px] relative font-serif print:shadow-none print:border-none print:rounded-none print:p-0 ${getFontSizeClass()}`}
          style={{ fontFamily: '"Sarabun", "TH Sarabun PSK", sans-serif' }}
        >
          {/* Header section */}
          <div className="text-center space-y-3 pb-6 border-b-2 border-double border-slate-800">
            {getLogoUrl() && (
              <img 
                src={getLogoUrl()} 
                alt="Logo" 
                className={`mx-auto object-contain ${headerLogo === 'garuda' ? 'w-14 h-14' : 'w-12 h-12'}`} 
              />
            )}
            <div className="space-y-1">
              <span className="text-xs font-bold block text-slate-600 uppercase tracking-widest">
                {survey.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                {survey.title} {printMode === 'teacher' && <span className="text-indigo-600">[เฉลยสำหรับกรรมการคุมสอบ]</span>}
              </h2>
              {survey.description && (
                <p className="text-xs text-slate-500 leading-relaxed max-w-xl mx-auto italic">
                  คำชี้แจง: {survey.description}
                </p>
              )}
            </div>
          </div>

          {/* Exam metadata / Personal Info block */}
          {includePersonalInfo && (
            <div className="mt-5 p-4 border border-slate-800 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3.5">
                <div className="flex items-center gap-1">
                  <span className="font-bold shrink-0">ชื่อ-นามสกุล:</span>
                  <div className="flex-1 border-b border-dashed border-slate-500 min-h-[20px] text-slate-600 italic">
                    {printMode === 'teacher' ? '---------------- เฉลยและแผนการเรียนรู้ ----------------' : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold shrink-0">ตำแหน่ง / สังกัด:</span>
                  <div className="flex-1 border-b border-dashed border-slate-500 min-h-[20px]"></div>
                </div>
              </div>
              <div className="space-y-3.5">
                <div className="flex items-center gap-1">
                  <span className="font-bold shrink-0">เลขที่ผู้เข้าสอบ:</span>
                  <div className="flex-1 border-b border-dashed border-slate-500 min-h-[20px]"></div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold shrink-0">วันที่เข้าประเมิน:</span>
                  <div className="flex-1 border-b border-dashed border-slate-500 min-h-[20px]"></div>
                </div>
              </div>
            </div>
          )}

          {/* Questions Render Loop */}
          <div className="mt-8 space-y-6">
            {printableQuestions.map((q, idx) => {
              const showWeight = showScoreWeight && q.scoreWeight;

              return (
                <div key={q.id} className="space-y-2.5 break-inside-avoid">
                  {/* Title & Weight */}
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-bold text-slate-900 leading-snug">
                      {idx + 1}. {q.title}
                      {q.required && <span className="text-rose-500 ml-1 font-normal">*</span>}
                    </span>
                    {showWeight && (
                      <span className="text-xs font-bold text-slate-500 shrink-0 border border-slate-300 rounded px-1.5 py-0.5 bg-slate-50">
                        {q.scoreWeight} คะแนน
                      </span>
                    )}
                  </div>

                  {/* Description if any */}
                  {q.description && (
                    <p className="text-[12px] text-slate-500 pl-4 leading-normal italic">
                      ({q.description})
                    </p>
                  )}

                  {/* Render based on Question Type */}
                  <div className="pl-4 space-y-2">
                    {/* Choice Types (Radio / Checkbox / Dropdown) */}
                    {(q.type === 'single_choice' || q.type === 'multiple_choice' || q.type === 'dropdown' || q.type === 'quiz_answer' || q.type === 'rsvp_status') && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = printMode === 'teacher' && q.correctAnswer && String(opt.text).trim() === String(q.correctAnswer).trim();

                          return (
                            <div 
                              key={opt.id} 
                              className={`flex items-start gap-2 p-1.5 rounded transition ${
                                isCorrect ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold' : ''
                              }`}
                            >
                              <div className="mt-1 shrink-0 text-slate-400">
                                {q.type === 'multiple_choice' ? (
                                  <Square className="w-3.5 h-3.5" />
                                ) : (
                                  <span className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[10px] font-mono">
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                )}
                              </div>
                              <span className="leading-tight text-slate-800">{opt.text}</span>
                              {isCorrect && (
                                <span className="ml-1 text-[10px] text-emerald-600 font-extrabold uppercase shrink-0">
                                  ✓ (ถูกต้อง)
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Text Area (Short & Long) & Number */}
                    {(q.type === 'text_short' || q.type === 'text_long' || q.type === 'number_input') && (
                      <div className="pt-1.5">
                        {printMode === 'teacher' && q.correctAnswer ? (
                          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-800 space-y-1">
                            <span className="text-[11px] font-extrabold uppercase block">แนวเฉลยคำตอบหลัก (Key Answer Guideline):</span>
                            <p className="text-xs leading-normal">{q.correctAnswer}</p>
                          </div>
                        ) : (
                          <div className={`border border-slate-300 rounded-lg ${q.type === 'text_long' ? 'h-24' : 'h-10'} bg-slate-50/50 relative`}>
                            <span className="absolute bottom-1 right-2 text-[10px] text-slate-300 italic">
                              {q.type === 'text_long' ? 'พิมพ์กรอกข้อมูลคำตอบสำหรับบันทึกลงกระดาษ...' : 'กรอกข้อความสั้น...'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rating Type */}
                    {(q.type === 'rating_stars' || q.type === 'nps_score' || q.type === 'slider_score') && (
                      <div className="flex items-center gap-1.5 py-1">
                        {Array.from({ length: q.maxScore || (q.type === 'nps_score' ? 11 : 5) }).map((_, rIdx) => {
                          const scoreVal = q.type === 'nps_score' ? rIdx : rIdx + 1;
                          const isCorrect = printMode === 'teacher' && q.correctAnswer && String(scoreVal) === String(q.correctAnswer);

                          return (
                            <div 
                              key={rIdx} 
                              className={`w-8 h-8 rounded border flex items-center justify-center text-xs font-bold font-mono shrink-0 transition ${
                                isCorrect 
                                  ? 'bg-emerald-500 border-emerald-500 text-white scale-110' 
                                  : 'border-slate-300 text-slate-500 bg-slate-50'
                              }`}
                            >
                              {scoreVal}
                            </div>
                          );
                        })}
                        {printMode === 'teacher' && q.correctAnswer && (
                          <span className="ml-2 text-xs text-emerald-600 font-extrabold">
                            ← คะแนนสอบเฉลย
                          </span>
                        )}
                      </div>
                    )}

                    {/* Matrix Rating Likert */}
                    {(q.type === 'matrix_rating' || q.type === 'matrix_single' || q.type === 'matrix_text') && q.matrixRows && (
                      <div className="overflow-x-auto pt-2">
                        <table className="w-full border-collapse border border-slate-400 text-[11px] text-left">
                          <thead>
                            <tr className="bg-slate-100 text-slate-800">
                              <th className="border border-slate-400 p-2 font-bold w-[40%]">ประเด็นหลักประเมินผล</th>
                              {q.matrixCols?.map(col => (
                                <th key={col.id} className="border border-slate-400 p-2 text-center font-bold">
                                  {col.text}
                                </th>
                              )) || (
                                ['ปรับปรุง', 'พอใช้', 'ปานกลาง', 'ดี', 'ดีเยี่ยม'].map((lvl, lIdx) => (
                                  <th key={lIdx} className="border border-slate-400 p-2 text-center font-bold">{lvl}</th>
                                ))
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {q.matrixRows.map(row => (
                              <tr key={row.id}>
                                <td className="border border-slate-400 p-2 text-slate-800 font-medium">{row.text}</td>
                                {(q.matrixCols || Array.from({ length: 5 })).map((col: any, cIdx: number) => (
                                  <td key={col?.id || cIdx} className="border border-slate-400 p-2 text-center">
                                    <div className="w-4 h-4 rounded-full border border-slate-400 mx-auto" />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Explanations if available (Teacher only) */}
                    {printMode === 'teacher' && q.explanation && (
                      <div className="mt-2 p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs text-indigo-950 space-y-0.5">
                        <span className="font-bold text-indigo-800 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> คำอธิบายคำตอบเพิ่มเติม (Explanation):
                        </span>
                        <p className="leading-relaxed font-serif italic text-slate-700">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* End of paper seal / Signature fields */}
          <div className="mt-12 pt-8 border-t border-slate-400/50 grid grid-cols-2 gap-8 text-center break-inside-avoid">
            <div>
              <p className="text-xs text-slate-500 font-medium">ลงชื่อผู้เข้าประเมินสอบ</p>
              <div className="w-48 border-b border-slate-400 mx-auto mt-12 mb-1.5" />
              <p className="text-xs text-slate-400">(............................................................)</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">ลงชื่อผู้คุมสอบ / ผู้ให้คะแนนประเมิน</p>
              <div className="w-48 border-b border-slate-400 mx-auto mt-12 mb-1.5" />
              <p className="text-xs text-slate-400">(............................................................)</p>
            </div>
          </div>

          {/* Optional: Student Blank Answer grid (Answer sheet) */}
          {printMode === 'student' && includeAnswerSheet && (
            <div className="page-break-before pt-10 break-inside-avoid">
              <div className="text-center space-y-2 border-b-2 border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                  แผ่นกระดาษคำตอบสำหรับฝน / เขียน (Answer Sheet Card)
                </h3>
                <span className="text-xs text-slate-500 block">กรุณากรอกและใช้ดินสอ 2B หรือปากกาสีน้ำเงินในการทำเครื่องหมายฝน</span>
              </div>

              <div className="grid grid-cols-4 gap-6 mt-8">
                {printableQuestions.map((q, idx) => (
                  <div key={q.id} className="p-3 border border-slate-300 rounded-lg space-y-2 text-center">
                    <span className="font-bold text-xs text-slate-700 block">ข้อที่ {idx + 1}</span>
                    {q.options ? (
                      <div className="flex items-center justify-center gap-1 text-[10px]">
                        {q.options.map((_, oIdx) => (
                          <div 
                            key={oIdx} 
                            className="w-5 h-5 rounded-full border border-slate-500 flex items-center justify-center font-mono text-[9px] hover:bg-slate-100 cursor-pointer text-slate-600 font-extrabold"
                          >
                            {String.fromCharCode(65 + oIdx)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-6 border border-dashed border-slate-300 rounded" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
