import React, { useState } from 'react';
import { X, Copy, Check, QrCode, ExternalLink, Code, Share2, Printer } from 'lucide-react';
import { Survey } from '../../types/survey';

interface SurveyShareModalProps {
  survey: Survey;
  onClose: () => void;
}

export const SurveyShareModal: React.FC<SurveyShareModalProps> = ({ survey, onClose }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);

  const shareUrl = `${window.location.origin}/survey/${survey.id}`;
  const iframeCode = `<iframe src="${shareUrl}" width="100%" height="700" frameborder="0"></iframe>`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyIframe = () => {
    navigator.clipboard.writeText(iframeCode);
    setCopiedIframe(true);
    setTimeout(() => setCopiedIframe(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-lighter)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text-primary)]">แชร์และเผยแพร่แบบสำรวจ</h3>
              <p className="text-xs text-[var(--text-muted)] truncate max-w-xs">{survey.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Direct Link Section */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase">ลิงก์ตอบแบบสำรวจแบบตรง</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-[var(--bg-muted)] border border-[var(--border-lighter)] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[var(--text-primary)] select-all"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm flex items-center gap-1.5 transition shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </button>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white p-1 rounded-xl border border-slate-200 flex items-center justify-center shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}`}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="font-bold text-sm text-[var(--text-primary)]">QR Code สำหรับสแกนตอบ</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">ใช้พิมพ์ติดป้ายหรือแชร์ผ่านมือถือ</div>
              </div>
            </div>
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-[var(--bg-muted)] hover:bg-[var(--border-lighter)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> ขยาย/ดาวน์โหลด
            </a>
          </div>

          {/* Embed Code Section */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5" /> โค้ดฝังบนเว็บไซต์ (Iframe Code)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={iframeCode}
                className="w-full bg-[var(--bg-muted)] border border-[var(--border-lighter)] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[var(--text-muted)] select-all"
              />
              <button
                onClick={handleCopyIframe}
                className="px-3.5 py-2.5 bg-[var(--bg-muted)] hover:bg-[var(--border-lighter)] text-[var(--text-primary)] rounded-xl font-semibold text-xs flex items-center gap-1 transition shrink-0"
              >
                {copiedIframe ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedIframe ? 'คัดลอกแล้ว' : 'คัดลอกโค้ด'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-lighter)] bg-[var(--bg-surface)] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[var(--bg-muted)] text-[var(--text-primary)] font-semibold hover:bg-[var(--border-lighter)] transition text-sm"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
