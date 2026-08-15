import React, { useState, useEffect, useRef } from 'react';
import {
  Share2, Copy, Check, ExternalLink, Code2, ShieldCheck, Download,
  Lock, Unlock, Eye, Sparkles, Globe, QrCode as QrCodeIcon,
  MessageCircle, Send, Mail, X, Smartphone, Monitor, Sliders,
  Layers, RefreshCw, FileText, CheckCircle2, AlertCircle, Printer, FileDown
} from 'lucide-react';
import QRCode from 'qrcode';

export interface InfographicShareSettings {
  id: string;
  name: string;
  thumbnail?: string;
  isPublic: boolean;
  allowEmbed: boolean;
  allowDownload: boolean;
  isProtected?: boolean;
  accessPassword?: string;
  authorName?: string;
  authorDepartment?: string;
  description?: string;
  tags?: string;
  viewCount?: number;
  downloadCount?: number;
  embedCount?: number;
  created_at?: string;
  updated_at?: string;
}

interface InfographicsShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  infographic: InfographicShareSettings | null;
  onUpdateSettings?: (updated: Partial<InfographicShareSettings>) => Promise<void>;
  onExportPng?: (multiplier: number) => void;
  onExportPdf?: () => void;
  onExportSvg?: () => void;
  onExportJson?: () => void;
}

export const InfographicsShareModal: React.FC<InfographicsShareModalProps> = ({
  isOpen,
  onClose,
  infographic,
  onUpdateSettings,
  onExportPng,
  onExportPdf,
  onExportSvg,
  onExportJson
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'embed' | 'security' | 'export'>('link');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedDirectImg, setCopiedDirectImg] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState(false);

  // Privacy & Access Form State
  const [isPublic, setIsPublic] = useState(true);
  const [allowEmbed, setAllowEmbed] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorDepartment, setAuthorDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Embed Customizer State
  const [embedWidth, setEmbedWidth] = useState('100%');
  const [embedHeight, setEmbedHeight] = useState('700px');
  const [embedTheme, setEmbedTheme] = useState<'auto' | 'light' | 'dark'>('auto');
  const [embedShowHeader, setEmbedShowHeader] = useState(true);
  const [embedShowToolbar, setEmbedShowToolbar] = useState(true);
  const [embedAllowDownload, setEmbedAllowDownload] = useState(true);
  const [embedAllowFullscreen, setEmbedAllowFullscreen] = useState(true);
  const [embedStyle, setEmbedStyle] = useState<'none' | 'border' | 'shadow' | 'card'>('shadow');
  const [embedType, setEmbedType] = useState<'iframe' | 'responsive'>('iframe');

  // Multi-res Export State
  const [pngMultiplier, setPngMultiplier] = useState<number>(2);

  useEffect(() => {
    if (infographic) {
      setIsPublic(infographic.isPublic !== undefined ? infographic.isPublic : true);
      setAllowEmbed(infographic.allowEmbed !== undefined ? infographic.allowEmbed : true);
      setAllowDownload(infographic.allowDownload !== undefined ? infographic.allowDownload : true);
      setEnablePassword(Boolean(infographic.isProtected || infographic.accessPassword));
      setPassword(infographic.accessPassword || '');
      setAuthorName(infographic.authorName || 'กรมป้องกันและบรรเทาสาธารณภัย (ปภ.)');
      setAuthorDepartment(infographic.authorDepartment || 'กองอำนวยการป้องกันและบรรเทาสาธารณภัยกลาง');
      setDescription(infographic.description || '');
      setTags(infographic.tags || 'infographics, สารบรรณ, ประชาสัมพันธ์, ปภ.');
    }
  }, [infographic]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicViewUrl = infographic ? `${origin}/public/infographics/${infographic.id}` : '';
  const directImageUrl = infographic ? `${origin}/api/public/infographics/${infographic.id}/image` : '';
  const directHtmlUrl = infographic ? `${origin}/api/public/infographics/${infographic.id}/export-html` : '';

  // Generate Embed URL with parameters
  const getEmbedUrl = () => {
    if (!infographic) return '';
    const params = new URLSearchParams();
    params.set('embed', 'true');
    if (embedTheme !== 'auto') params.set('theme', embedTheme);
    if (!embedShowHeader) params.set('header', '0');
    if (!embedShowToolbar) params.set('toolbar', '0');
    if (!embedAllowDownload) params.set('download', '0');
    if (!embedAllowFullscreen) params.set('fullscreen', '0');
    return `${origin}/public/infographics/${infographic.id}?${params.toString()}`;
  };

  const currentEmbedUrl = getEmbedUrl();

  // Generate Embed Code
  const getEmbedCode = () => {
    if (!infographic) return '';
    const src = getEmbedUrl();
    const title = (infographic.name || 'Infographic').replace(/"/g, '&quot;');

    let styleAttribute = 'border: none; border-radius: 12px; overflow: hidden;';
    if (embedStyle === 'border') {
      styleAttribute = 'border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;';
    } else if (embedStyle === 'shadow') {
      styleAttribute = 'border: none; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); overflow: hidden;';
    } else if (embedStyle === 'card') {
      styleAttribute = 'border: 1px solid rgba(226, 232, 240, 0.8); border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08); overflow: hidden;';
    }

    if (embedType === 'responsive') {
      return `<!-- EDMS Infographic Responsive Embed Container -->
<div style="position: relative; width: 100%; padding-bottom: 75%; height: 0; ${styleAttribute}">
  <iframe 
    src="${src}" 
    title="${title}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
    allow="fullscreen; clipboard-write" 
    loading="lazy"
    allowfullscreen>
  </iframe>
</div>`;
    }

    return `<iframe 
  src="${src}" 
  title="${title}"
  width="${embedWidth}" 
  height="${embedHeight}" 
  style="${styleAttribute}"
  allow="fullscreen; clipboard-write" 
  loading="lazy"
  allowfullscreen>
</iframe>`;
  };

  // Generate QR Code when modal opens or URL changes
  useEffect(() => {
    if (publicViewUrl) {
      QRCode.toDataURL(publicViewUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('Error generating QR code:', err));
    }
  }, [publicViewUrl]);

  if (!isOpen || !infographic) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicViewUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (_) {}
  };

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(getEmbedCode());
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2500);
    } catch (_) {}
  };

  const handleCopyDirectImg = async () => {
    try {
      await navigator.clipboard.writeText(directImageUrl);
      setCopiedDirectImg(true);
      setTimeout(() => setCopiedDirectImg(false), 2500);
    } catch (_) {}
  };

  const handleSavePrivacySettings = async () => {
    if (!onUpdateSettings) return;
    setIsSavingSettings(true);
    try {
      await onUpdateSettings({
        isPublic,
        allowEmbed,
        allowDownload,
        accessPassword: enablePassword ? password : '',
        authorName,
        authorDepartment,
        description,
        tags
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Social Share Handlers
  const shareToLine = () => {
    const text = encodeURIComponent(`${infographic.name}\n${publicViewUrl}`);
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(publicViewUrl)}&text=${text}`, '_blank');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicViewUrl)}`, '_blank');
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`ชมภาพ Infographic: ${infographic.name} จากระบบสารบรรณอิเล็กทรอนิกส์`);
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(publicViewUrl)}&text=${text}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`สื่อ Infographic: ${infographic.name}`);
    const body = encodeURIComponent(`ขอเชิญชมสื่อ Infographic เรื่อง "${infographic.name}"\n\nสามารถเปิดดูได้ที่ลิงก์:\n${publicViewUrl}\n\nจาก: ${authorName || 'หน่วยงาน'}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: infographic.name,
          text: `ชมสื่อ Infographic เรื่อง "${infographic.name}"`,
          url: publicViewUrl
        });
      } catch (_) {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full overflow-hidden text-left flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg font-noto-serif-thai text-white">
                  ศูนย์แบ่งปัน & ฝังโค้ด Infographic
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold tracking-wider">
                  Full 100%
                </span>
              </div>
              <p className="text-xs text-blue-100 line-clamp-1">
                {infographic.name || 'ไม่มีชื่อผลงาน'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 px-4 pt-2 gap-1.5 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-t-2 border-x ${
              activeTab === 'link'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t-blue-500 border-slate-200 dark:border-slate-800 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>ลิงก์สาธารณะ & แชร์โซเชียล</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('embed')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-t-2 border-x ${
              activeTab === 'embed'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t-blue-500 border-slate-200 dark:border-slate-800 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>รหัสฝังเว็บไซต์ (Embed / iFrame)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-t-2 border-x ${
              activeTab === 'security'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t-blue-500 border-slate-200 dark:border-slate-800 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>สิทธิ์ & ความเป็นส่วนตัว</span>
            {enablePassword && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-t-2 border-x ${
              activeTab === 'export'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t-blue-500 border-slate-200 dark:border-slate-800 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>ส่งออกไฟล์ทุกรูปแบบ</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-xs space-y-6">
          {/* TAB 1: Public View Link & Social Share */}
          {activeTab === 'link' && (
            <div className="space-y-6">
              {/* Status Banner */}
              {!isPublic && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <span className="font-bold block">สถานะปัจจุบัน: ปิดการเข้าถึงสาธารณะ</span>
                    <span className="text-[11px]">ผู้ใช้งานภายนอกจะไม่สามารถเปิดดูลิงก์ได้จนกว่าจะเปิดใช้งานในแท็บ "สิทธิ์ & ความเป็นส่วนตัว"</span>
                  </div>
                </div>
              )}

              {/* Public Link Card */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span>ลิงก์เปิดดูแบบสาธารณะ (Public View Link)</span>
                  </label>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมใช้งานทันที
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicViewUrl}
                    className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-300 select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm ${
                      copiedLink
                        ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                    }`}
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
                  </button>
                  <a
                    href={publicViewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-colors shrink-0"
                    title="เปิดในแท็บใหม่"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* QR Code & Direct Social Share Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* QR Code Card */}
                <div className="md:col-span-5 p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <QrCodeIcon className="w-4 h-4 text-blue-500" />
                    <span>QR Code สำหรับสแกนผ่านมือถือ</span>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    {qrCodeDataUrl ? (
                      <img src={qrCodeDataUrl} alt="QR Code" className="w-40 h-40 object-contain" />
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center text-slate-400">กำลังสร้าง QR...</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full pt-1">
                    <a
                      href={qrCodeDataUrl}
                      download={`QR-${(infographic.name || 'infographic').replace(/\s+/g, '_')}.png`}
                      className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-center transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> บันทึก QR Code
                    </a>
                  </div>
                </div>

                {/* Social Share & Direct Media Links */}
                <div className="md:col-span-7 space-y-4 flex flex-col justify-between">
                  <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      แชร์ต่อไปยังช่องทางโซเชียล & แชท (Social Share)
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={shareToLine}
                        className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800/60 font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" /> LINE
                      </button>

                      <button
                        type="button"
                        onClick={shareToFacebook}
                        className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800/60 font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Globe className="w-4 h-4" /> Facebook
                      </button>

                      <button
                        type="button"
                        onClick={shareToTwitter}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-700/60 dark:text-slate-200 rounded-xl border border-slate-300 dark:border-slate-600 font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" /> X (Twitter)
                      </button>

                      <button
                        type="button"
                        onClick={shareViaEmail}
                        className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-xl border border-indigo-200 dark:border-indigo-800/60 font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Mail className="w-4 h-4" /> อีเมล
                      </button>

                      <button
                        type="button"
                        onClick={shareNative}
                        className="col-span-2 p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Share2 className="w-4 h-4" /> แชร์ผ่านแอปอื่น (Share Menu)
                      </button>
                    </div>
                  </div>

                  {/* Direct Image URL Card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        ลิงก์ไฟล์รูปภาพตรง (Direct Image URL)
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">PNG / JPEG</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={directImageUrl}
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-[11px] text-slate-600 dark:text-slate-400 select-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyDirectImg}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-lg font-semibold transition-colors flex items-center gap-1"
                      >
                        {copiedDirectImg ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedDirectImg ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Embed Code Customizer */}
          {activeTab === 'embed' && (
            <div className="space-y-6">
              {/* Status Warning if Embed is Disabled */}
              {!allowEmbed && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <span className="font-bold block">สถานะปัจจุบัน: ปิดการอนุญาตฝังบนเว็บไซต์ภายนอก</span>
                    <span className="text-[11px]">เว็บไซต์ภายนอกจะไม่สามารถโหลดเฟรมนี้ได้ กรุณาเปิดอนุญาตในแท็บ "สิทธิ์ & ความเป็นส่วนตัว"</span>
                  </div>
                </div>
              )}

              {/* Customizer Controls Bar */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-500" />
                    <span>ปรับแต่งตัวเลือกการฝังโค้ด (Embed Options)</span>
                  </h4>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setEmbedType('iframe')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        embedType === 'iframe'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      ขนาดคงที่ (Fixed)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmbedType('responsive')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        embedType === 'responsive'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      เต็มพื้นที่ตอบสนอง (Responsive)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Theme Mode */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      ธีมสี (Theme)
                    </label>
                    <select
                      value={embedTheme}
                      onChange={(e) => setEmbedTheme(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    >
                      <option value="auto">🔄 อัตโนมัติตามเว็บปลายทาง</option>
                      <option value="light">☀️ สว่าง (Light)</option>
                      <option value="dark">🌙 มืด (Dark)</option>
                    </select>
                  </div>

                  {/* Frame Style */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      กรอบและเงา (Style)
                    </label>
                    <select
                      value={embedStyle}
                      onChange={(e) => setEmbedStyle(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    >
                      <option value="shadow">✨ เงาลอยนุ่มนวล (Soft Shadow)</option>
                      <option value="border">🔲 เส้นขอบบาง (Thin Border)</option>
                      <option value="card">🃏 การ์ดทางการ (Official Card)</option>
                      <option value="none">🚫 ไร้กรอบ (No Frame)</option>
                    </select>
                  </div>

                  {/* Width (if fixed) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      ความกว้าง (Width)
                    </label>
                    <input
                      type="text"
                      disabled={embedType === 'responsive'}
                      value={embedWidth}
                      onChange={(e) => setEmbedWidth(e.target.value)}
                      placeholder="100% หรือ 800px"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none disabled:opacity-50"
                    />
                  </div>

                  {/* Height (if fixed) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      ความสูง (Height)
                    </label>
                    <input
                      type="text"
                      disabled={embedType === 'responsive'}
                      value={embedHeight}
                      onChange={(e) => setEmbedHeight(e.target.value)}
                      placeholder="700px"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={embedShowHeader}
                      onChange={(e) => setEmbedShowHeader(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">แสดงหัวข้อ & ผู้ออกแบบ</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={embedShowToolbar}
                      onChange={(e) => setEmbedShowToolbar(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">แสดงปุ่มซูมและจัดวาง</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={embedAllowDownload}
                      onChange={(e) => setEmbedAllowDownload(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">แสดงปุ่มดาวน์โหลด</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={embedAllowFullscreen}
                      onChange={(e) => setEmbedAllowFullscreen(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">แสดงปุ่มเต็มจอ (Fullscreen)</span>
                  </label>
                </div>
              </div>

              {/* Code Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-indigo-500" />
                    <span>โค้ด HTML สำหรับนำไปฝังในเว็บไซต์หรือระบบ Intranet</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyEmbed}
                    className={`px-4 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                      copiedEmbed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {copiedEmbed ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedEmbed ? 'คัดลอกโค้ดแล้ว!' : 'คัดลอกโค้ด Embed'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={4}
                  value={getEmbedCode()}
                  className="w-full p-3.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-800 outline-none select-all shadow-inner"
                />
              </div>

              {/* Embed Live Preview Frame */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-blue-500" />
                    <span>ตัวอย่างผลลัพธ์การแสดงผล (Live Preview)</span>
                  </span>
                  <span className="text-[11px] text-slate-400">ขนาดจำลอง 100%</span>
                </div>
                <div className="w-full h-80 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 overflow-hidden shadow-inner relative">
                  <iframe
                    src={currentEmbedUrl}
                    title="Live Preview"
                    className="w-full h-full border-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Privacy, Security & Permission Control */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {saveSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="font-bold">บันทึกการตั้งค่าสิทธิ์และความปลอดภัยเรียบร้อยแล้ว</span>
                </div>
              )}

              {/* Permissions Switches */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Is Public Toggle */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isPublic 
                    ? 'bg-blue-500/5 border-blue-500/30 dark:bg-blue-500/10' 
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-blue-500" />
                      เปิดการเข้าถึงสาธารณะ
                    </span>
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    อนุญาตให้ทุกคนที่มีลิงก์สามารถเปิดดูสื่อ Infographic นี้ได้
                  </p>
                </div>

                {/* Allow Embed Toggle */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  allowEmbed 
                    ? 'bg-indigo-500/5 border-indigo-500/30 dark:bg-indigo-500/10' 
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-indigo-500" />
                      อนุญาตให้ฝังบนเว็บภายนอก
                    </span>
                    <input
                      type="checkbox"
                      checked={allowEmbed}
                      onChange={(e) => setAllowEmbed(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    อนุญาตให้เว็บอื่นๆ สามารถนำรหัส iframe ไปฝังเพื่อแสดงผลได้
                  </p>
                </div>

                {/* Allow Download Toggle */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  allowDownload 
                    ? 'bg-emerald-500/5 border-emerald-500/30 dark:bg-emerald-500/10' 
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-emerald-500" />
                      อนุญาตให้ดาวน์โหลดไฟล์
                    </span>
                    <input
                      type="checkbox"
                      checked={allowDownload}
                      onChange={(e) => setAllowDownload(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    อนุญาตให้ผู้เข้าชมดาวน์โหลดไฟล์ต้นฉบับความละเอียดสูง
                  </p>
                </div>
              </div>

              {/* Passcode Protection Card */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${enablePassword ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                      {enablePassword ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                        ตั้งรหัสผ่านป้องกัน (Passcode Protection)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        สำหรับสื่อที่เป็นความลับหรือจำกัดการเข้าชมเฉพาะกลุ่ม
                      </span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enablePassword}
                      onChange={(e) => setEnablePassword(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-300">เปิดใช้งานรหัสผ่าน</span>
                  </label>
                </div>

                {enablePassword && (
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-2 animate-in fade-in">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">
                      รหัสผ่านสำหรับการเข้าดู (Passcode PIN) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="เช่น EDMS2026 หรือ PIN 6 หลัก"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      ผู้เข้าชมจะต้องกรอกรหัสผ่านนี้ก่อน จึงจะสามารถปลดล็อกและดูภาพ Infographic ได้
                    </p>
                  </div>
                )}
              </div>

              {/* Author & Department Meta Info */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                  ข้อมูลหน่วยงานและผู้ออกแบบ (Author & Organization Metadata)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">
                      ชื่อผู้ออกแบบ / เจ้าหน้าที่ (Author Name)
                    </label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="เช่น นายสมคิด สารบรรณดี"
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">
                      หน่วยงานเจ้าของเรื่อง (Department / Org)
                    </label>
                    <input
                      type="text"
                      value={authorDepartment}
                      onChange={(e) => setAuthorDepartment(e.target.value)}
                      placeholder="เช่น กองอำนวยการป้องกันและบรรเทาสาธารณภัยกลาง"
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">
                      คำอธิบาย / รายละเอียดประกอบ (Description)
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="เช่น Infographic ประชาสัมพันธ์ข้อควรปฏิบัติเมื่อเกิดสถานการณ์ฉุกเฉิน..."
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Analytics & Counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 text-center">
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">ยอดเข้าชม (Views)</div>
                  <div className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono">
                    {infographic.viewCount || 0}
                  </div>
                </div>

                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-center">
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">ยอดฝัง (Embeds)</div>
                  <div className="text-xl font-black text-indigo-700 dark:text-indigo-300 font-mono">
                    {infographic.embedCount || 0}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center">
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">ยอดดาวน์โหลด</div>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                    {infographic.downloadCount || 0}
                  </div>
                </div>
              </div>

              {/* Save Settings Action Button */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSavePrivacySettings}
                  disabled={isSavingSettings}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isSavingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>{isSavingSettings ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าสิทธิ์'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Multi-Format Full Exports */}
          {activeTab === 'export' && (
            <div className="space-y-5">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                เลือกรูปแบบการส่งออกไฟล์เพื่อนำไปใช้งาน (Export Formats)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* High-Res PNG Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <FileDown className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">รูปภาพ PNG ความละเอียดสูง</span>
                        <span className="text-[11px] text-slate-500">เหมาะสำหรับสื่อโซเชียล เว็บไซต์ และงานนำเสนอ</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      <span>สเกลความละเอียด:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((mul) => (
                          <button
                            key={mul}
                            type="button"
                            onClick={() => setPngMultiplier(mul)}
                            className={`px-2 py-0.5 rounded-md font-mono text-[10px] ${
                              pngMultiplier === mul
                                ? 'bg-blue-600 text-white font-bold'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {mul}x {mul === 3 ? '(Ultra HD)' : mul === 2 ? '(HD)' : '(Web)'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onExportPng && onExportPng(pngMultiplier)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-4 h-4" /> ดาวน์โหลด PNG ({pngMultiplier}x)
                    </button>
                  </div>
                </div>

                {/* PDF Document Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">เอกสาร PDF ทางการ (Vector PDF)</span>
                        <span className="text-[11px] text-slate-500">เหมาะสำหรับส่งรายงาน แนบหนังสือราชการ หรือพิมพ์</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => onExportPdf && onExportPdf()}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-4 h-4" /> ดาวน์โหลดเอกสาร PDF
                    </button>
                  </div>
                </div>

                {/* Standalone Interactive HTML Export */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">ไฟล์ HTML Standalone ออฟไลน์</span>
                        <span className="text-[11px] text-slate-500">เปิดดูได้ทันทีโดยไม่ต้องต่อเน็ต พร้อมระบบซูมและเต็มจอ</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <a
                      href={directHtmlUrl}
                      download={`${(infographic.name || 'infographic').replace(/\s+/g, '_')}.html`}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm text-center"
                    >
                      <Download className="w-4 h-4" /> ดาวน์โหลดไฟล์ HTML (.html)
                    </a>
                  </div>
                </div>

                {/* JSON Project Backup Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">ไฟล์สำรองโปรเจกต์ (JSON Backup)</span>
                        <span className="text-[11px] text-slate-500">นำกลับมาแก้ไขหรือย้ายไปเครื่องอื่นได้ 100%</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => onExportJson && onExportJson()}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-4 h-4" /> ดาวน์โหลด JSON Project
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>ระบบแชร์และส่งมอบสื่อดิจิทัลมาตรฐานภาครัฐ EDMS Infographics Studio</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
