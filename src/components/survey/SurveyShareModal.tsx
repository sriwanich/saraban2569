import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  QrCode, 
  Download, 
  Share2, 
  Code, 
  ExternalLink, 
  FileText,
  Printer,
  Sparkles
} from 'lucide-react';
import QRCode from 'qrcode';
import { Survey } from '../../types/survey';

interface SurveyShareModalProps {
  survey: Survey;
  onClose: () => void;
  onLinkToEdms?: (survey: Survey) => void;
}

export const SurveyShareModal: React.FC<SurveyShareModalProps> = ({
  survey,
  onClose,
  onLinkToEdms,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'link' | 'qr' | 'embed'>('link');
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const surveyShareUrl = `${baseUrl}/public/survey/${survey.id}`;
  const embedCodeSnippet = `<iframe src="${surveyShareUrl}?embed=true" width="100%" height="700" frameborder="0" style="border:0; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);"></iframe>`;

  useEffect(() => {
    generateQr();
  }, [survey.id, survey.settings.themeColor]);

  const generateQr = async () => {
    try {
      const canvas = qrCanvasRef.current;
      if (!canvas) return;

      const primaryColor = survey.settings.themeColor || '#2563eb';
      
      // Generate high-res QR code
      await QRCode.toCanvas(canvas, surveyShareUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: primaryColor,
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });

      // Draw center DDPM logo emblem
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.src = '/ddpm-logo.svg';
        logoImg.onload = () => {
          const logoSize = 64;
          const x = (canvas.width - logoSize) / 2;
          const y = (canvas.height - logoSize) / 2;

          // Draw white circle background
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, logoSize / 2 + 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = primaryColor;
          ctx.stroke();

          // Draw image
          ctx.drawImage(logoImg, x, y, logoSize, logoSize);
          setQrDataUrl(canvas.toDataURL('image/png'));
        };
        logoImg.onerror = () => {
          setQrDataUrl(canvas.toDataURL('image/png'));
        };
      }
    } catch (e) {
      console.error('Failed to generate survey QR:', e);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(surveyShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCodeSnippet);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `survey-qr-${survey.id}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrintPoster = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>แบบสำรวจ: ${survey.title}</title>
        <meta charset="utf-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
          body { font-family: 'Sarabun', sans-serif; text-align: center; padding: 40px; margin: 0; }
          .poster-card { max-width: 500px; margin: 0 auto; border: 2px solid ${survey.settings.themeColor || '#2563eb'}; border-radius: 24px; padding: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
          .dept-badge { font-size: 14px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
          h1 { font-size: 22px; color: #0f172a; margin-bottom: 12px; line-height: 1.4; }
          p { font-size: 14px; color: #64748b; margin-bottom: 24px; }
          .qr-box { margin: 20px auto; width: 260px; height: 260px; }
          .qr-box img { width: 100%; height: 100%; border-radius: 12px; }
          .scan-guide { font-size: 16px; font-weight: bold; color: ${survey.settings.themeColor || '#2563eb'}; margin-top: 16px; }
          .footer-note { font-size: 12px; color: #94a3b8; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="poster-card">
          <div class="dept-badge">สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง</div>
          <h1>${survey.title}</h1>
          <p>${survey.description || 'ขอเชิญร่วมตอบแบบสำรวจความคิดเห็น เพื่อการพัฒนาการปฏิบัติงานและการให้บริการ'}</p>
          <div class="qr-box">
            <img src="${qrDataUrl}" alt="Survey QR" />
          </div>
          <div class="scan-guide">📱 สแกน QR Code ด้วยมือถือเพื่อตอบแบบสอบถาม</div>
          <div class="footer-note">แบบสำรวจและประเมินผลสารบรรณดิจิทัล สนง.ปภ.จังหวัดระยอง</div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-lighter)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text-primary)]">
                แชร์และเผยแพร่แบบสำรวจ
              </h3>
              <p className="text-xs text-[var(--text-muted)] truncate max-w-sm">
                {survey.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-canvas)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-lighter)] px-6 pt-2 bg-[var(--bg-surface)]/50">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'link'
                ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Share2 className="w-4 h-4" /> ลิงก์ออนไลน์
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <QrCode className="w-4 h-4" /> QR Code & ป้ายประชาสัมพันธ์
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'embed'
                ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Code className="w-4 h-4" /> ฝังในเว็บไซต์ (Embed)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Hidden Canvas for QR Rendering */}
          <canvas ref={qrCanvasRef} className="hidden" />

          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-secondary)] block">
                  ลิงก์สำหรับผู้ตอบแบบสำรวจ (Direct Respondent URL)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={surveyShareUrl}
                    className="flex-1 bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-mono outline-none select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs ${
                      copiedLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[var(--primary-color)] text-white hover:opacity-90'
                    }`}
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
                  </button>
                </div>
              </div>

              {/* Status Notice */}
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span>ระบบรองรับการสแกนตอบผ่านสมาร์ตโฟนและแท็บเล็ตทุกอุปกรณ์ 100%</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  ผู้ตอบสามารถเข้าใช้งานได้ทันทีโดยไม่ต้องติดตั้งแอปพลิเคชันเพิ่มเติม รองรับโหมดไม่ระบุตัวตน (Anonymous) หรือเชื่อมกับระบบราชการ
                </p>
              </div>

              {/* Action shortcuts */}
              <div className="flex items-center justify-between pt-2">
                <a
                  href={surveyShareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary-color)] hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>เปิดหน้าจอผู้ตอบแบบสำรวจในแท็บใหม่</span>
                </a>
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="flex flex-col items-center text-center space-y-5">
              {/* QR Preview Card */}
              <div className="p-5 rounded-3xl bg-white shadow-lg border border-slate-200 inline-block">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Survey QR" className="w-56 h-56 rounded-xl object-contain mx-auto" />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-slate-400">กำลังสร้าง QR Code...</div>
                )}
                <div className="mt-3 text-[11px] font-bold text-slate-800">
                  สแกนเพื่อตอบ: {survey.title}
                </div>
              </div>

              {/* Download / Print Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                <button
                  onClick={handleDownloadQr}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-canvas)] border border-[var(--border-lighter)] text-xs font-bold text-[var(--text-primary)] transition-all shadow-xs"
                >
                  <Download className="w-4 h-4 text-blue-500" />
                  <span>ดาวน์โหลดรูปภาพ QR (PNG)</span>
                </button>
                <button
                  onClick={handlePrintPoster}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ป้ายตั้งโต๊ะ / ประชาสัมพันธ์</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'embed' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-secondary)] block">
                  โค้ด HTML สำหรับนำไปฝังในหน้าเว็บไซต์หรือพอร์ทัลภายใน (iFrame Embed)
                </label>
                <textarea
                  readOnly
                  rows={4}
                  value={embedCodeSnippet}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl p-3 text-xs text-[var(--text-primary)] font-mono outline-none select-all"
                />
              </div>
              <button
                onClick={handleCopyEmbed}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs ${
                  copiedEmbed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[var(--primary-color)] text-white hover:opacity-90'
                }`}
              >
                {copiedEmbed ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedEmbed ? 'คัดลอกโค้ดแล้ว!' : 'คัดลอกโค้ด iFrame'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-lighter)] bg-[var(--bg-surface)] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--bg-canvas)] hover:bg-[var(--border-lighter)] text-xs font-bold text-[var(--text-secondary)] transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
