import React, { useState } from 'react';
import { Survey, SurveyResponse } from '../../types/survey';
import { Printer, X, ShieldCheck, Phone, Mail, ZoomIn, Maximize2 } from 'lucide-react';
import { getResolvedSurveyLogoUrl, getSystemBrandingInfo } from '../../utils/surveyLogoHelper';

interface SurveyResponsePrintViewProps {
  survey: Survey;
  response: SurveyResponse;
  onClose: () => void;
}

const getSafeAnswers = (raw: any): Record<string, any> => {
  if (!raw) return {};
  let res = raw;
  if (typeof res === 'string') {
    try { res = JSON.parse(res); } catch (_) {}
  }
  return typeof res === 'object' && res !== null ? res : {};
};

export const SurveyResponsePrintView: React.FC<SurveyResponsePrintViewProps> = ({
  survey,
  response,
  onClose,
}) => {
  const [scaleMode, setScaleMode] = useState<'fit' | 'full'>('fit');
  const answers = getSafeAnswers(response.answers);

  // Clean department string (remove "ฝ่ายบริหารทั่วไป")
  const rawDept = survey.department || '';
  const cleanDepartment = rawDept.replace(/ฝ่ายบริหารทั่วไป/g, '').trim() || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';

  // Get Org Logo URL (prefers DDPM/Org Logo over Garuda)
  const branding = getSystemBrandingInfo();
  const logoUrl = (survey.settings.customLogoUrl && survey.settings.customLogoUrl.trim())
    ? survey.settings.customLogoUrl
    : (survey.settings.headerLogoType && survey.settings.headerLogoType !== 'garuda' && survey.settings.headerLogoType !== 'none')
      ? getResolvedSurveyLogoUrl(survey.settings.headerLogoType, survey.settings.customLogoUrl) || branding.ddpmLogoUrl
      : branding.ddpmLogoUrl;

  // Extract common RSVP & respondent fields
  const extractData = () => {
    const data = {
      name: response.respondentName || '-',
      position: response.respondentPosition || '-',
      department: response.respondentDepartment || '-',
      phone: response.respondentPhone || '-',
      email: response.respondentEmail || '-',
      status: '-',
      representatives: [] as string[],
      repDetails: null as any,
      signature: ''
    };

    if (answers.representative_details) {
      data.repDetails = answers.representative_details;
    }

    survey.questions.forEach(q => {
      const val = answers[q.id];
      if (!val) return;

      const title = (q.title || '').toLowerCase();
      
      if (q.type === 'contact_info' && typeof val === 'object') {
        if (val.name) data.name = val.name;
        if (val.dept) data.department = val.dept;
        if (val.phone) data.phone = val.phone;
        if (val.email) data.email = val.email;
        if (val.position) data.position = val.position;
      }
      
      if (title.includes('ตำแหน่ง') || q.id.includes('position')) {
        if (typeof val === 'string' && val.trim()) data.position = val;
      }
      if (title.includes('โทรศัพท์') || q.id.includes('phone') || q.id.includes('tel')) {
        if (val) data.phone = String(val);
      }
      if (title.includes('อีเมล') || title.includes('email') || q.id.includes('email')) {
        if (val) data.email = String(val);
      }
      if (q.type === 'rsvp_status' || title.includes('ยืนยันการเข้าร่วม') || title.includes('สถานะ')) {
        data.status = String(val);
      }
      if (title.includes('ผู้แทน') && (q.type === 'text_short' || q.type === 'text_long')) {
        data.representatives.push(String(val));
      }
      if (q.type === 'signature') {
        data.signature = String(val);
      }
    });

    return data;
  };

  const data = extractData();

  // Format Date in Thai full format
  const submittedDateFormatted = response.submittedAt
    ? new Date(response.submittedAt).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  const handlePrint = () => {
    window.print();
  };

  const isYes = data.status.includes('ตนเอง') || data.status.includes('ยินดีเข้าร่วม');
  const isRep = data.status.includes('ผู้แทน');
  const isNo = data.status.includes('ไม่สะดวก') || data.status.includes('ภารกิจ') || data.status.includes('ปฏิเสธ');

  const eventTitle = survey.settings.rsvpEventTitle || survey.title || 'แบบตอบรับเข้าร่วมงาน';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start bg-slate-900/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:block print:overflow-visible">
      
      {/* Printable CSS Rules for A4 Single Page */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap');

        .gov-doc-a4 {
          font-family: "Sarabun", "TH Sarabun New", "Leelawadee UI", Tahoma, sans-serif !important;
          color: #000000;
          line-height: 1.6;
        }

        .dotted-fill {
          display: inline-block;
          border-bottom: 1.5px dotted #000000;
          padding: 0 8px;
          font-weight: 700;
          color: #000000;
          min-height: 1.4em;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .gov-doc-a4-sheet {
            box-shadow: none !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            padding: 18mm 20mm 16mm 20mm !important;
            margin: 0 auto !important;
            overflow: hidden !important;
            transform: none !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
          }
        }
      `}</style>

      {/* Floating Action Bar (Screen Only) */}
      <div className="no-print w-full max-w-[210mm] flex items-center justify-between mb-3 px-3 py-2 bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/80 text-white shadow-xl z-50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-blue-400 pl-2">ภาพรวมแบบตอบรับ A4 ราชการ</span>
          <div className="flex items-center bg-slate-900/80 rounded-xl p-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setScaleMode('fit')}
              className={`px-3 py-1 rounded-lg font-bold transition ${scaleMode === 'fit' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
            >
              <Maximize2 className="w-3.5 h-3.5 inline mr-1" />
              ย่อให้เห็นทั้งหน้า (Fit Page)
            </button>
            <button
              type="button"
              onClick={() => setScaleMode('full')}
              className={`px-3 py-1 rounded-lg font-bold transition ${scaleMode === 'full' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
            >
              <ZoomIn className="w-3.5 h-3.5 inline mr-1" />
              ขนาดจริง 100%
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 cursor-pointer text-xs sm:text-sm"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์เอกสาร (Print A4)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sheet Frame Wrapper */}
      <div className={`w-full flex justify-center items-start pb-8 ${scaleMode === 'fit' ? 'max-h-[85vh] overflow-y-auto' : ''}`}>
        
        {/* Official A4 Sheet Container */}
        <div className={`gov-doc-a4 gov-doc-a4-sheet bg-white text-slate-900 shadow-2xl w-[210mm] min-h-[297mm] max-h-[297mm] mx-auto p-[18mm_20mm_16mm] relative flex flex-col justify-between rounded-xs print:shadow-none print:m-0 print:p-[18mm_20mm_16mm] transition-all duration-300 ${
          scaleMode === 'fit' ? 'scale-[0.82] sm:scale-[0.88] origin-top my-0' : 'scale-100 my-2'
        }`}>
          
          {/* Top Content Area */}
          <div className="space-y-4">
            
            {/* Header: Organization Logo */}
            <div className="flex flex-col items-center text-center">
              <img 
                src={logoUrl} 
                alt="โลโก้หน่วยงาน" 
                className="w-[2.6cm] h-[2.6cm] object-contain mb-2.5"
              />
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-950 leading-snug max-w-[95%] mx-auto px-1 tracking-tight">
                {eventTitle}
              </h1>
              {survey.settings.rsvpEventDate && (
                <p className="text-sm sm:text-base font-semibold text-slate-800 mt-1">
                  วันและเวลา: {survey.settings.rsvpEventDate}
                </p>
              )}
              {survey.settings.rsvpEventLocation && (
                <p className="text-xs sm:text-sm text-slate-700 mt-0.5">
                  {survey.settings.rsvpEventLocation}
                </p>
              )}
            </div>

            <div className="border-b-2 border-slate-900/90 my-2" />

            {/* Section 1: Respondent Info (Without Numbering) */}
            <div className="space-y-2 text-sm sm:text-base leading-relaxed text-slate-900 pt-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-bold text-slate-950 text-base sm:text-[17px]">ข้อมูลผู้ตอบแบบตอบรับ / ผู้เข้าร่วมงาน:</span>
              </div>

              <div className="pl-4 space-y-1.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span>ข้าพเจ้า (นาย/นาง/นางสาว)</span>
                  <span className="dotted-fill min-w-[240px] text-sm sm:text-base">{data.name}</span>
                </div>

                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span>ตำแหน่ง:</span>
                  <span className="dotted-fill min-w-[190px] text-sm sm:text-base">{data.position}</span>
                  <span className="ml-2">หน่วยงาน/สังกัด:</span>
                  <span className="dotted-fill min-w-[210px] flex-1 text-sm sm:text-base">{data.department}</span>
                </div>

                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span>หมายเลขโทรศัพท์:</span>
                  <span className="dotted-fill min-w-[160px] text-sm sm:text-base">{data.phone}</span>
                  <span className="ml-2">E-mail:</span>
                  <span className="dotted-fill min-w-[230px] flex-1 text-sm sm:text-base">{data.email}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Attendance Choices (Without Numbering) */}
            <div className="space-y-2 text-sm sm:text-base leading-relaxed text-slate-900 pt-1">
              <span className="font-bold text-slate-950 text-base sm:text-[17px]">การเข้าร่วมประชุม / รับฟังความคิดเห็นฯ:</span>

              <div className="pl-4 space-y-2 pt-1">
                {/* Option 1: Join in person */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 border-2 border-slate-900 rounded-xs flex items-center justify-center shrink-0 mt-0.5 bg-white">
                    {isYes && <span className="font-bold text-sm text-slate-950">✓</span>}
                  </div>
                  <span className={isYes ? 'font-bold text-slate-950 text-sm sm:text-base' : 'text-slate-800 text-sm sm:text-base'}>
                    มีความยินดีเข้าร่วมประชุม / รับฟังความคิดเห็นฯ ด้วยตนเอง
                  </span>
                </div>

                {/* Option 2: Delegate */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 border-2 border-slate-900 rounded-xs flex items-center justify-center shrink-0 mt-0.5 bg-white">
                    {isRep && <span className="font-bold text-sm text-slate-950">✓</span>}
                  </div>
                  <span className={isRep ? 'font-bold text-slate-950 text-sm sm:text-base' : 'text-slate-800 text-sm sm:text-base'}>
                    ไม่สามารถเข้าร่วมได้ด้วยตนเอง แต่มอบหมายผู้แทนเข้าร่วมแทน
                  </span>
                </div>

                {/* Option 3: Decline */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 border-2 border-slate-900 rounded-xs flex items-center justify-center shrink-0 mt-0.5 bg-white">
                    {isNo && <span className="font-bold text-sm text-slate-950">✓</span>}
                  </div>
                  <span className={isNo ? 'font-bold text-slate-950 text-sm sm:text-base' : 'text-slate-800 text-sm sm:text-base'}>
                    ไม่สามารถเข้าร่วมได้เนื่องจากติดภารกิจอื่น
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Representative Details (If Assigned, Without Numbering) */}
            {(isRep || data.repDetails || data.representatives.length > 0) && (
              <div className="space-y-2 text-sm sm:text-base leading-relaxed text-slate-900 pt-1">
                <span className="font-bold text-slate-950 text-base sm:text-[17px]">กรณีมอบหมายผู้แทน โปรดระบุข้อมูลผู้แทน:</span>

                <div className="pl-4 space-y-1.5">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span>ชื่อ-นามสกุล ผู้แทน:</span>
                    <span className="dotted-fill min-w-[240px] text-sm sm:text-base">{data.repDetails?.name || data.representatives[0] || '-'}</span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span>ตำแหน่งผู้แทน:</span>
                    <span className="dotted-fill min-w-[190px] text-sm sm:text-base">{data.repDetails?.position || '-'}</span>
                    <span className="ml-2">หน่วยงาน:</span>
                    <span className="dotted-fill min-w-[190px] flex-1 text-sm sm:text-base">{data.repDetails?.dept || data.department}</span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span>หมายเลขโทรศัพท์:</span>
                    <span className="dotted-fill min-w-[160px] text-sm sm:text-base">{data.repDetails?.phone || '-'}</span>
                    <span className="ml-2">E-mail:</span>
                    <span className="dotted-fill min-w-[230px] flex-1 text-sm sm:text-base">{data.repDetails?.email || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Additional Survey Answers Summary (Without Numbering) */}
            {survey.questions.some(q => q.type !== 'contact_info' && q.type !== 'rsvp_status' && q.type !== 'signature' && q.type !== 'section_header') && (
              <div className="space-y-1.5 pt-2 border-t border-slate-300/80 text-sm sm:text-base">
                <span className="font-bold text-slate-950 block text-base sm:text-[17px]">สรุปผลการประเมิน / ข้อคิดเห็นเพิ่มเติม:</span>
                <div className="pl-3 space-y-1">
                  {survey.questions
                    .filter(q => q.type !== 'contact_info' && q.type !== 'rsvp_status' && q.type !== 'signature' && q.type !== 'section_header')
                    .slice(0, 4)
                    .map((q, qIdx) => {
                      const ans = answers[q.id];
                      if (ans === undefined || ans === null || ans === '') return null;

                      return (
                        <div key={q.id} className="flex justify-between items-baseline gap-2 border-b border-dotted border-slate-300 pb-0.5 text-sm sm:text-base">
                          <span className="text-slate-800 font-medium truncate max-w-[65%]">
                            {qIdx + 1}. {q.title}:
                          </span>
                          <span className="font-bold text-slate-950 text-right">
                            {q.type === 'rating_stars' ? `${ans} / ${q.maxScore || 5} ดาว` :
                             q.type === 'multiple_choice' && Array.isArray(ans) ? ans.join(', ') :
                             String(ans)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

          </div>

          {/* Bottom Section: Signature & Official Sign-off */}
          <div className="pt-6 pb-1">
            <div className="flex justify-end">
              <div className="text-center space-y-1.5 min-w-[280px]">
                <p className="text-sm sm:text-base font-medium text-slate-900">ขอแสดงความนับถือ</p>

                {/* Signature Graphic or Dotted Line */}
                <div className="flex flex-col items-center py-1">
                  {data.signature ? (
                    <div className="h-16 flex items-center justify-center my-1">
                      <img src={data.signature} alt="ลายมือชื่อ" className="max-h-14 object-contain" />
                    </div>
                  ) : (
                    <div className="w-52 border-b border-dotted border-slate-900 h-12 mb-1" />
                  )}
                  
                  <p className="font-bold text-sm sm:text-base text-slate-950 mt-1">
                    ( {data.name !== '-' ? data.name : '........................................................'} )
                  </p>
                  <p className="text-xs sm:text-sm text-slate-800 mt-0.5">
                    ตำแหน่ง {data.position !== '-' ? data.position : '........................................................'}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-700 mt-1.5">
                    ลงวันที่ {submittedDateFormatted}
                  </p>
                </div>
              </div>
            </div>

            {/* Official Document Footer */}
            <div className="mt-5 pt-2 border-t border-slate-300 flex justify-between items-end text-xs sm:text-sm text-slate-600">
              <div>
                <p className="font-bold text-slate-900 text-xs sm:text-sm">{cleanDepartment}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs"><Phone className="w-3.5 h-3.5 text-slate-500" /> ๐-๓๘๖๙-๔๐๐๐</span>
                  <span className="flex items-center gap-1 text-xs"><Mail className="w-3.5 h-3.5 text-slate-500" /> ddpm_rayong@hotmail.com</span>
                </div>
              </div>
              <div className="text-right space-y-0.5">
                <div className="flex items-center justify-end gap-1 font-bold text-emerald-700 text-xs sm:text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>ยืนยันข้อมูลผ่านระบบสารสนเทศอิเล็กทรอนิกส์</span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">Ref: {response.id.slice(0, 16)}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
