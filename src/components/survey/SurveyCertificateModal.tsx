import React, { useRef, useState } from 'react';
import { Award, Download, Printer, X, CheckCircle2, ShieldCheck, QrCode, Copy, Check, Palette } from 'lucide-react';
import { Survey } from '../../types/survey';
import { formatThaiDate } from '../../types';

interface SurveyCertificateModalProps {
  survey: Survey;
  recipientName: string;
  recipientDepartment?: string;
  scorePercentage: number;
  scoreEarned: number;
  totalPossibleScore: number;
  certificateNumber: string;
  dateStr?: string;
  onClose: () => void;
}

export const SurveyCertificateModal: React.FC<SurveyCertificateModalProps> = ({
  survey,
  recipientName,
  recipientDepartment,
  scorePercentage,
  scoreEarned,
  totalPossibleScore,
  certificateNumber,
  dateStr = new Date().toISOString(),
  onClose,
}) => {
  const certRef = useRef<HTMLDivElement>(null);
  const [certStyle, setCertStyle] = useState<'gold' | 'blue' | 'emerald' | 'minimal'>('gold');
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const orgName = survey.settings.certificateOrgName || survey.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
  const signerName = survey.settings.certificateSignerName || 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
  const signerPosition = survey.settings.certificateSignerPosition || 'ผู้อำนวยการศูนย์บัญชาการเหตุการณ์จังหวัดระยอง';

  const verifyUrl = `${window.location.origin}/?verify_cert=${encodeURIComponent(certificateNumber)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const styleClasses = {
    gold: {
      borderOuter: 'border-4 border-amber-600/70',
      borderInner: 'border-2 border-amber-400/60 bg-white/95',
      badgeBg: 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white',
      accentText: 'text-amber-700',
      sealBg: 'bg-amber-50 border-amber-300 text-amber-600',
      underline: 'decoration-amber-400',
    },
    blue: {
      borderOuter: 'border-4 border-blue-700/80',
      borderInner: 'border-2 border-indigo-400/70 bg-gradient-to-b from-blue-50/30 via-white to-indigo-50/30',
      badgeBg: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white',
      accentText: 'text-blue-800',
      sealBg: 'bg-blue-50 border-blue-300 text-blue-700',
      underline: 'decoration-blue-500',
    },
    emerald: {
      borderOuter: 'border-4 border-emerald-700/80',
      borderInner: 'border-2 border-teal-400/70 bg-gradient-to-b from-emerald-50/30 via-white to-teal-50/30',
      badgeBg: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white',
      accentText: 'text-emerald-800',
      sealBg: 'bg-emerald-50 border-emerald-300 text-emerald-700',
      underline: 'decoration-emerald-500',
    },
    minimal: {
      borderOuter: 'border-2 border-slate-300',
      borderInner: 'border border-slate-200 bg-white',
      badgeBg: 'bg-slate-900 text-white',
      accentText: 'text-slate-700',
      sealBg: 'bg-slate-100 border-slate-300 text-slate-800',
      underline: 'decoration-slate-400',
    }
  }[certStyle];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none border border-slate-200 dark:border-slate-800">
        {/* Header toolbar (Hidden in print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400" />
            <div>
              <span className="font-semibold text-base block">ใบประกาศนียบัตรอิเล็กทรอนิกส์ (e-Certificate)</span>
              <span className="text-[10px] text-slate-400">เลขที่ฉบับ: {certificateNumber}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Template Selector */}
            <div className="flex items-center bg-slate-800 rounded-lg p-1 text-xs">
              <Palette className="w-3.5 h-3.5 text-amber-400 ml-1.5 mr-1" />
              {(['gold', 'blue', 'emerald', 'minimal'] as const).map(style => (
                <button
                  key={style}
                  onClick={() => setCertStyle(style)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition ${
                    certStyle === style ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {style === 'gold' ? 'ทองคำ' : style === 'blue' ? 'ฟ้าปภ.' : style === 'emerald' ? 'มรกต' : 'มินิมอล'}
                </button>
              ))}
            </div>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-xs transition"
              title="คัดลอกลิงก์ตรวจสอบวุฒิบัตร"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกแล้ว' : 'แชร์/ยืนยัน'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              พิมพ์ / บันทึก PDF
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Printable Canvas */}
        <div 
          ref={certRef}
          className="p-6 md:p-12 bg-white text-center select-none print:p-4 text-slate-900"
        >
          {/* Ornate Double Border */}
          <div className={`${styleClasses.borderOuter} p-2 rounded-xl`}>
            <div className={`${styleClasses.borderInner} p-6 md:p-10 rounded-lg relative overflow-hidden shadow-inner`}>
              
              {/* Corner Watermarks */}
              <div className="absolute top-2 left-2 w-10 h-10 border-t-2 border-l-2 border-amber-500/80 rounded-tl-lg" />
              <div className="absolute top-2 right-2 w-10 h-10 border-t-2 border-r-2 border-amber-500/80 rounded-tr-lg" />
              <div className="absolute bottom-2 left-2 w-10 h-6 border-b-2 border-l-2 border-amber-500/80 rounded-bl-lg" />
              <div className="absolute bottom-2 right-2 w-10 h-6 border-b-2 border-r-2 border-amber-500/80 rounded-br-lg" />

              {/* Official Seal / Garuda Icon */}
              <div className="flex justify-center mb-3">
                <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center shadow-md ${styleClasses.sealBg}`}>
                  <Award className="w-10 h-10" />
                </div>
              </div>

              {/* Organization Header */}
              <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-wide font-serif mb-0.5">
                {orgName}
              </h2>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-5 ${styleClasses.accentText}`}>
                DEPARTMENT OF DISASTER PREVENTION AND MITIGATION (DDPM)
              </p>

              {/* Certificate Title */}
              <div className={`inline-block px-6 py-2 ${styleClasses.badgeBg} font-bold text-base md:text-lg rounded-full shadow-md mb-6`}>
                ใบประกาศนียบัตรรับรองผลการประเมินความรู้
              </div>

              <p className="text-slate-600 text-sm mb-2 font-serif">ขอมอบประกาศนียบัตรฉบับนี้เพื่อแสดงว่า</p>

              {/* Recipient Name */}
              <div className="py-1.5 mb-2 border-b-2 border-amber-300/80 inline-block min-w-[300px]">
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {recipientName || 'ผู้เข้ารับการประเมิน'}
                </h3>
                {recipientDepartment && (
                  <p className="text-xs text-slate-600 mt-1 font-medium">สังกัด: {recipientDepartment}</p>
                )}
              </div>

              {/* Achievement Body */}
              <p className="text-slate-700 text-sm md:text-base max-w-xl mx-auto my-4 leading-relaxed font-serif">
                ได้ผ่านการทดสอบและประเมินผลความรู้ในหลักสูตร
                <br />
                <span className={`font-bold text-slate-900 text-base md:text-lg underline ${styleClasses.underline} decoration-2 underline-offset-4`}>
                  "{survey.title}"
                </span>
                <br />
                <span className="text-xs text-slate-600 mt-1 inline-block">
                  ด้วยผลการทดสอบ <strong className="text-emerald-700 text-sm">{scorePercentage}%</strong> ({scoreEarned}/{totalPossibleScore} คะแนน) ผ่านเกณฑ์มาตรฐาน
                </span>
              </p>

              <p className="text-xs text-slate-500 mt-4 mb-8 font-serif">
                ให้ไว้ ณ วันที่ {formatThaiDate(dateStr)}
              </p>

              {/* Signatures & Security Seals */}
              <div className="flex flex-col md:flex-row items-center justify-between max-w-2xl mx-auto pt-4 border-t border-slate-200 gap-4 text-slate-800">
                {/* QR Code Verification */}
                <div className="flex items-center gap-3 text-left">
                  <div className="w-14 h-14 bg-slate-50 border border-slate-300 rounded-lg flex items-center justify-center p-1.5 shrink-0">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verifyUrl)}`} 
                      alt="QR Verification"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Fallback icon if offline
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                        }
                      }}
                    />
                    <QrCode className="w-10 h-10 text-slate-700 hidden" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-800 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ระบบรับรองดิจิทัล ปภ.
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono font-bold">
                      เลขที่: {certificateNumber}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      สแกนเพื่อตรวจสอบความถูกต้องบนระบบคลาวด์
                    </div>
                  </div>
                </div>

                {/* Director Signature */}
                <div className="text-center">
                  <div className="w-44 h-9 border-b border-dashed border-slate-400 mx-auto flex items-end justify-center pb-1">
                    <span className="font-serif italic text-slate-700 text-xs">{signerName}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 mt-1">({signerName})</p>
                  <p className="text-[10px] text-slate-600">{signerPosition}</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between print:hidden">
          <span>ใบประกาศนียบัตรนี้ออกโดยระบบอัตโนมัติของสำนักงาน ปภ. จังหวัดระยอง</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-medium transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

