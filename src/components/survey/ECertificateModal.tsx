import React, { useRef, useMemo, useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  ShieldCheck, 
  Award, 
  QrCode,
  FileCheck,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Eye
} from 'lucide-react';
import { Survey, SurveyResponse } from '../../types/survey';
import { formatThaiDate } from '../../types';
import { getSystemBrandingInfo } from '../../utils/surveyLogoHelper';

interface ECertificateModalProps {
  survey: Survey;
  response: SurveyResponse;
  onClose: () => void;
}

export const ECertificateModal: React.FC<ECertificateModalProps> = ({
  survey,
  response,
  onClose
}) => {
  const certRef = useRef<HTMLDivElement>(null);
  const certContainerRef = useRef<HTMLDivElement>(null);
  const branding = getSystemBrandingInfo();
  const [zoomMode, setZoomMode] = useState<'fit' | 'full'>('fit');
  const [scale, setScale] = useState(1);
  
  const certId = useMemo(() => {
    if (response.id.startsWith('CERT-')) return response.id;
    return `CERT-${survey.id.substring(0, 4)}-${response.id.substring(response.id.length - 6)}`.toUpperCase();
  }, [survey.id, response.id]);

  const submissionDate = response.submittedAt ? new Date(response.submittedAt) : new Date();
  
  const handlePrint = () => {
    window.print();
  };

  const orgName = survey.settings?.certificateOrgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
  const signerName = survey.settings?.certificateSignerName || 'นายวิชิต สุทธโส';
  const signerPosition = survey.settings?.certificateSignerPosition || 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';

  useEffect(() => {
    if (zoomMode === 'full') {
      setScale(1);
      return;
    }
    const updateScale = () => {
      if (!certContainerRef.current) return;
      const width = certContainerRef.current.clientWidth - 40; // padding margin
      const height = certContainerRef.current.clientHeight - 40;
      
      const scaleX = width / 1000;
      const scaleY = height / 700;
      const newScale = Math.min(scaleX, scaleY, 1.1);
      setScale(Math.max(newScale, 0.28)); // don't scale below 28% for accessibility
    };

    updateScale();
    
    if (typeof ResizeObserver !== 'undefined' && certContainerRef.current) {
      const observer = new ResizeObserver(() => {
        updateScale();
      });
      observer.observe(certContainerRef.current);
      return () => observer.disconnect();
    } else {
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }
  }, [zoomMode]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-300 print:bg-white print:p-0">
      
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          #cert-wrap {
            padding: 0 !important;
            background: white !important;
          }
          #cert-paper {
            box-shadow: none !important;
            border-width: 15px !important;
            margin: 0 !important;
            width: 100% !important;
            height: 100% !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            transform: none !important;
            border-color: #1E293B !important;
            background-color: #FCFBF7 !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row h-full max-h-[92vh] no-print">
        
        {/* Sidebar Controls */}
        <div className="w-full md:w-80 bg-slate-950 p-6 sm:p-8 border-b md:border-b-0 md:border-r border-white/10 flex flex-col shrink-0">
          <div className="flex items-center gap-3.5 mb-6 md:mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/10">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-black text-white text-base leading-tight">Digital Certificate</h2>
              <p className="text-[10px] text-amber-400 font-bold tracking-widest uppercase mt-0.5">Verified Credential</p>
            </div>
          </div>

          <div className="space-y-5 flex-grow overflow-y-auto custom-scrollbar pr-1 hidden sm:block">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Reference Number</label>
              <div className="font-mono text-xs font-bold text-amber-400 bg-white/5 p-3 rounded-xl border border-white/10">
                {certId}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Achievement Score</label>
              <div className="flex items-end gap-2.5 p-1">
                <span className="text-3xl font-black text-white tracking-tighter">
                  {response.scorePercentage || response.totalScore || 100}%
                </span>
                <div className="flex flex-col mb-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">Passed</span>
                  <span className="text-[9px] font-medium text-slate-400 tracking-tight">Verified Grade</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-black text-slate-200">Official Endorsement</p>
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">เกียรติบัตรนี้รับรองผลผ่านเกณฑ์โดยระบบ {orgName} อย่างเป็นทางการ</p>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                <FileCheck className="w-4 h-4 text-emerald-500" />
                <span className="font-bold uppercase tracking-wider">Audit Trail Active</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-bold uppercase tracking-wider">Integrity Verified</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 mt-4 sm:mt-6">
            <div className="bg-white/5 p-1.5 rounded-xl border border-white/10 flex items-center justify-between text-xs sm:hidden">
              <span className="text-slate-400 font-bold pl-2">ดูเกียรติบัตรฉบับเต็ม</span>
              <button
                type="button"
                onClick={() => setZoomMode(zoomMode === 'fit' ? 'full' : 'fit')}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[10px]"
              >
                {zoomMode === 'fit' ? 'ซูมขยาย' : 'พอดีหน้าจอ'}
              </button>
            </div>

            <button 
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black py-3.5 px-4 rounded-2xl transition-all shadow-xl shadow-amber-500/10 active:scale-95 group text-xs sm:text-sm cursor-pointer"
            >
              <Printer className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
              <span>พิมพ์หรือบันทึก PDF</span>
            </button>
            <button 
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-3 px-4 rounded-2xl transition-all active:scale-95 text-xs cursor-pointer border border-white/10"
            >
              <X className="w-4 h-4" />
              <span>ปิดหน้าต่างพรีวิว</span>
            </button>
          </div>
        </div>

        {/* Certificate Rendering Area */}
        <div id="cert-wrap" className="flex-grow flex flex-col bg-slate-950 overflow-hidden relative">
          
          {/* Certificate Live Preview Bar */}
          <div className="bg-slate-900 px-5 py-3.5 border-b border-white/10 flex items-center justify-between z-10 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-400" />
                โหมดพรีวิวเกียรติบัตร (Digital Certificate Preview)
              </span>
            </div>
            
            {/* Desktop Zoom Controller */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-950/60 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setZoomMode('fit')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                  zoomMode === 'fit' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>พอดีหน้าจอ (Fit)</span>
              </button>
              <button
                type="button"
                onClick={() => setZoomMode('full')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                  zoomMode === 'full' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>ขนาดจริง (100%)</span>
              </button>
            </div>
          </div>

          {/* Canvas Wrapper with Responsive Auto-Scale Scaling */}
          <div 
            ref={certContainerRef}
            className="flex-grow overflow-auto flex items-center justify-center p-4 sm:p-6 bg-slate-950 min-h-0 relative select-none"
          >
            <div 
              className="transition-all duration-300 relative flex items-center justify-center overflow-hidden bg-slate-900 rounded-2xl shadow-3xl shrink-0"
              style={{
                width: zoomMode === 'fit' ? `${1000 * scale}px` : '1000px',
                height: zoomMode === 'fit' ? `${700 * scale}px` : '700px',
                minWidth: zoomMode === 'fit' ? '0' : '1000px',
                minHeight: zoomMode === 'fit' ? '0' : '700px',
              }}
            >
              
              <div 
                id="cert-paper"
                ref={certRef}
                className="bg-[#FCFBF7] w-[1000px] h-[700px] relative flex flex-col items-center border-[20px] border-[#1E293B] shrink-0"
                style={{
                  transform: zoomMode === 'fit' ? `scale(${scale})` : 'none',
                  transformOrigin: 'center center',
                  padding: '48px 80px',
                  position: zoomMode === 'fit' ? 'absolute' : 'relative',
                }}
              >
                {/* Outer Delicate Gold Filigree Border */}
                <div className="absolute inset-2 border border-[#D97706]/40 pointer-events-none z-10" />
                <div className="absolute inset-3 border-2 border-[#D97706]/80 pointer-events-none z-10" />
                <div className="absolute inset-5 border border-[#D97706]/40 pointer-events-none z-10" />

                {/* Classic Thai Corner Ornaments */}
                <div className="absolute top-4 left-4 w-10 h-10 border-t-4 border-l-4 border-[#D97706] z-20 rounded-tl-xs"></div>
                <div className="absolute top-4 right-4 w-10 h-10 border-t-4 border-r-4 border-[#D97706] z-20 rounded-tr-xs"></div>
                <div className="absolute bottom-4 left-4 w-10 h-10 border-b-4 border-l-4 border-[#D97706] z-20 rounded-bl-xs"></div>
                <div className="absolute bottom-4 right-4 w-10 h-10 border-b-4 border-r-4 border-[#D97706] z-20 rounded-br-xs"></div>

                {/* Elegant Inner Decorative Borders */}
                <div className="absolute inset-8 border border-[#D97706]/20 pointer-events-none z-10" />

                {/* Background Branding Elements */}
                <div className="absolute inset-0 opacity-[0.06] pointer-events-none z-0">
                   <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(#1E293B 1.2px, transparent 0)', backgroundSize: '36px 36px' }}></div>
                   <img 
                     src={branding.garudaLogoUrl} 
                     className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-104 h-104 grayscale opacity-30 rotate-6"
                     alt=""
                   />
                </div>

                {/* Content Header */}
                <div className="flex flex-col items-center mb-6 relative z-10 w-full">
                  <img 
                    src={branding.garudaLogoUrl} 
                    alt="Thai Gov Garuda" 
                    className="w-22 h-22 mb-4 drop-shadow-md object-contain"
                  />
                  <p className="text-xs font-black text-[#D97706] font-sarabun tracking-widest uppercase mb-1">
                    {orgName}
                  </p>
                  <h1 className="text-lg font-bold text-slate-800 font-sarabun tracking-tight text-center leading-tight">
                    เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า
                  </h1>
                </div>

                {/* Recipient Identity */}
                <div className="w-full max-w-2xl border-b-2 border-dotted border-[#D97706]/70 pb-3 mb-6 text-center relative z-10">
                  <h2 className="text-4xl font-extrabold text-[#1E3A8A] font-sarabun tracking-wide drop-shadow-xs">
                    {response.respondentName || 'ผู้เข้ารับการประเมิน'}
                  </h2>
                </div>

                {/* Body Description */}
                <div className="text-center w-full max-w-3xl space-y-4 mb-8 relative z-10 flex-grow flex flex-col justify-center">
                  <p className="text-base text-slate-600 leading-relaxed font-sarabun font-medium">
                    ได้แสดงความรู้ความสามารถและผ่านเกณฑ์การวัดประเมินสมรรถนะดิจิทัลความปลอดภัยทางถนน
                  </p>
                  
                  {/* Luxurious Course Ribbon Container */}
                  <div className="py-3 px-12 bg-gradient-to-r from-[#1E3A8A]/5 via-[#D97706]/10 to-[#1E3A8A]/5 rounded-2xl inline-block border-2 border-[#D97706]/30 mx-auto max-w-[90%] shadow-xs">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 font-sarabun tracking-wide leading-normal">
                      "{survey.title}"
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 font-sarabun font-semibold">
                    ผลการทดสอบ: <span className="text-emerald-700 font-black">ผ่านการประเมินมาตรฐาน (PASSED)</span>
                    {' '}ด้วยคะแนน <span className="font-black text-[#D97706]">{response.scorePercentage || response.totalScore || 100}%</span>
                  </p>
                  
                  <p className="text-xs text-slate-400 font-sarabun italic">
                    ให้ไว้ ณ วันที่ {formatThaiDate(submissionDate.toISOString())}
                  </p>
                </div>

                {/* Footer with Seals and Signatures */}
                <div className="w-full flex justify-between items-end mt-auto relative z-10 gap-2">
                  {/* Validation QR */}
                  <div className="flex flex-col items-center gap-1.5 group shrink-0">
                    <div className="w-20 h-20 bg-white p-1.5 border-2 border-[#D97706]/30 shadow-md rounded-xl transition-transform group-hover:scale-105">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/verify-certificate/' + certId)}`} 
                        alt="Verify QR" 
                        className="w-full h-full opacity-90"
                      />
                    </div>
                    <div className="flex flex-col items-center text-[8px] font-mono">
                      <span className="font-semibold text-slate-400 uppercase tracking-wider">Verification ID</span>
                      <span className="font-bold text-[#1E3A8A]">{certId}</span>
                    </div>
                  </div>

                  {/* Central Authority Stamp (Watermark watermark style) */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none select-none opacity-[0.14] z-0">
                    <div className="w-26 sm:w-28 h-26 sm:h-28 rounded-full border-6 border-double border-[#D97706] flex items-center justify-center rotate-12">
                       <div className="text-[9px] font-black text-[#D97706] text-center uppercase leading-none tracking-widest">
                         OFFICIAL<br/>APPROVED<br/>SECURITY
                       </div>
                    </div>
                  </div>

                  {/* Authorized Signatory */}
                  <div className="flex flex-col items-center text-center max-w-[42%] shrink-0 relative z-10">
                    {/* Realistic Digital Handwriting Flow */}
                    <div className="h-10 flex items-center justify-center -mb-2">
                      <span className="font-serif italic text-2xl text-[#1E3A8A]/75 select-none font-semibold tracking-wider">
                        {signerName.substring(0, 4)}...
                      </span>
                    </div>
                    <div className="w-44 h-[1.5px] bg-[#D97706]/50 mb-2 shadow-xs"></div>
                    <p className="text-sm font-bold text-slate-800 font-sarabun mb-0.5">({signerName})</p>
                    <p className="text-[10px] text-slate-500 font-sarabun font-bold uppercase tracking-wider">{signerPosition}</p>
                  </div>

                  {/* Digital Seal */}
                  <div className="w-20 h-20 flex items-center justify-center opacity-75 shrink-0 relative z-10">
                     <img src={branding.ddpmLogoUrl} className="w-18 h-18 object-contain drop-shadow-sm" alt="Org Seal" />
                  </div>
                </div>

                {/* Bottom Elegant Line Bar */}
                <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-[#D97706] via-[#1E3A8A] to-[#D97706]"></div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
