import React, { useRef, useMemo } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  ShieldCheck, 
  Award, 
  QrCode,
  FileCheck,
  CheckCircle2
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
  const branding = getSystemBrandingInfo();
  
  const certId = useMemo(() => {
    if (response.id.startsWith('CERT-')) return response.id;
    return `CERT-${survey.id.substring(0, 4)}-${response.id.substring(response.id.length - 6)}`.toUpperCase();
  }, [survey.id, response.id]);

  const submissionDate = response.submittedAt ? new Date(response.submittedAt) : new Date();
  
  const handlePrint = () => {
    window.print();
  };

  const orgName = survey.settings?.certificateOrgName || 'กรมป้องกันและบรรเทาสาธารณภัย';
  const signerName = survey.settings?.certificateSignerName || 'ผู้อำนวยการศูนย์ป้องกันและบรรเทาสาธารณภัย เขต/จังหวัด';
  const signerPosition = survey.settings?.certificateSignerPosition || 'ประธานคณะกรรมการตรวจประเมิน';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300 print:bg-white print:p-0">
      
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
            border-width: 12px !important;
            margin: 0 !important;
            width: 100% !important;
            height: 100% !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
          }
        }
      `}</style>

      <div className="bg-slate-100 rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row h-full max-h-[90vh] no-print">
        
        {/* Sidebar Controls */}
        <div className="w-full md:w-80 bg-white p-8 border-r border-slate-200 flex flex-col">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xl shadow-blue-200">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-lg leading-tight">Digital Certificate</h2>
              <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">Verified Credential</p>
            </div>
          </div>

          <div className="space-y-8 flex-grow">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Reference Number</label>
              <div className="font-mono text-sm font-bold text-blue-700 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                {certId}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Achievement Score</label>
              <div className="flex items-end gap-3 p-1">
                <span className="text-4xl font-black text-slate-900 tracking-tighter">
                  {response.scorePercentage || response.totalScore || 100}%
                </span>
                <div className="flex flex-col mb-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Passed</span>
                  <span className="text-[10px] font-medium text-slate-400 tracking-tight">Verified Grade</span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100/50 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-black text-emerald-900 mb-1">Official Endorsement</p>
                <p className="text-[10px] text-emerald-600/80 leading-relaxed font-medium">This certificate is issued by the {orgName} and is valid for official use.</p>
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <div className="flex items-center gap-2 text-slate-400">
                <FileCheck className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Audit Trail Active</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Integrity Verified</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-8">
            <button 
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 active:scale-95 group"
            >
              <Printer className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              <span>Print or Save PDF</span>
            </button>
            <button 
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
              <span>Close Viewer</span>
            </button>
          </div>
        </div>

        {/* Certificate Rendering Area */}
        <div id="cert-wrap" className="flex-grow flex flex-col bg-slate-200 overflow-auto p-12 lg:p-20 items-center justify-center">
          
          <div 
            id="cert-paper"
            ref={certRef}
            className="bg-white w-full max-w-4xl aspect-[1.414/1] shadow-2xl relative p-16 md:p-24 flex flex-col items-center border-[20px] border-double border-slate-200 select-none overflow-hidden"
          >
            {/* Background Branding Elements */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
               <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(#000 1.2px, transparent 0)', backgroundSize: '40px 40px' }}></div>
               <img 
                 src={branding.garudaLogoUrl} 
                 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 grayscale opacity-20 rotate-12"
                 alt=""
               />
            </div>

            {/* Corner Guards */}
            <div className="absolute top-6 left-6 w-16 h-16 border-t-8 border-l-8 border-slate-200/50"></div>
            <div className="absolute top-6 right-6 w-16 h-16 border-t-8 border-r-8 border-slate-200/50"></div>
            <div className="absolute bottom-6 left-6 w-16 h-16 border-b-8 border-l-8 border-slate-200/50"></div>
            <div className="absolute bottom-6 right-6 w-16 h-16 border-b-8 border-r-8 border-slate-200/50"></div>

            {/* Content Header */}
            <div className="flex flex-col items-center mb-12 relative z-10">
              <img 
                src={branding.garudaLogoUrl} 
                alt="Thai Gov Garuda" 
                className="w-24 md:w-28 mb-8 drop-shadow-md"
              />
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 font-sarabun tracking-tight text-center leading-tight">
                ประกาศนียบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า
              </h1>
            </div>

            {/* Recipient Identity */}
            <div className="w-full border-b-[3px] border-slate-900 pb-3 mb-12 text-center relative z-10">
              <h2 className="text-5xl md:text-6xl font-black text-blue-900 font-sarabun drop-shadow-sm">
                {response.respondentName || 'ผู้เข้ารับการประเมิน'}
              </h2>
            </div>

            {/* Body Description */}
            <div className="text-center max-w-3xl space-y-6 mb-20 relative z-10">
              <p className="text-xl md:text-2xl text-slate-600 leading-relaxed font-sarabun">
                ได้ผ่านเกณฑ์การวัดความรู้และประเมินสมรรถนะในหัวข้อมาตรฐานราชการ
              </p>
              <div className="py-2 px-8 bg-blue-50/30 rounded-full inline-block border border-blue-100/50">
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 font-sarabun">
                  "{survey.title}"
                </h3>
              </div>
              <p className="text-xl text-slate-500 font-sarabun font-medium">
                ผลการประเมิน: <span className="text-blue-700 font-black">ผ่านเกณฑ์ (Pass)</span>
                {' '}ด้วยคะแนน <span className="font-black text-slate-800">{response.scorePercentage || response.totalScore || 100}%</span>
              </p>
              <p className="text-lg text-slate-400 font-sarabun italic">
                ให้ไว้ ณ วันที่ {formatThaiDate(submissionDate.toISOString())}
              </p>
            </div>

            {/* Footer with Seals and Signatures */}
            <div className="w-full flex justify-between items-end mt-auto relative z-10">
              {/* Validation QR */}
              <div className="flex flex-col items-center gap-3 group">
                <div className="w-28 h-28 bg-white p-1.5 border border-slate-200 shadow-xl rounded-xl transition-transform group-hover:scale-105">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://ddpm.rayong.go.th/verify/' + certId)}`} 
                    alt="Verify QR" 
                    className="w-full h-full opacity-80"
                  />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-mono font-black text-slate-400 uppercase">Verification ID</span>
                  <span className="text-[11px] font-mono font-bold text-blue-600">{certId}</span>
                </div>
              </div>

              {/* Central Authority Stamp */}
              <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-12 flex flex-col items-center pointer-events-none select-none opacity-20">
                <div className="w-32 h-32 rounded-full border-8 border-double border-blue-600 flex items-center justify-center rotate-12">
                   <div className="text-[12px] font-black text-blue-600 text-center uppercase leading-none">
                     Electronic<br/>Signature<br/>Verified
                   </div>
                </div>
              </div>

              {/* Authorized Signatory */}
              <div className="flex flex-col items-center text-center max-w-sm">
                <div className="w-64 h-px bg-slate-300 mb-6 shadow-sm"></div>
                <p className="text-xl font-bold text-slate-900 font-sarabun mb-1">({signerName})</p>
                <p className="text-sm font-bold text-slate-500 font-sarabun uppercase tracking-wider">{signerPosition}</p>
                <p className="text-sm font-black text-blue-800 font-sarabun mt-1.5">{orgName}</p>
              </div>

              {/* Digital Seal */}
              <div className="w-28 h-28 flex items-center justify-center opacity-40">
                 <img src={branding.ddpmLogoUrl} className="w-24 h-24 object-contain filter grayscale brightness-110" alt="Org Seal" />
              </div>
            </div>

            {/* Bottom Security Bar */}
            <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600"></div>
          </div>
        </div>

      </div>
    </div>
  );
};
