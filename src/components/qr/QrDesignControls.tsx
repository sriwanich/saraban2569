import React from 'react';
import {
  FileText, Globe, User, Wifi, CreditCard, Sparkles, ShieldCheck,
  Palette, Image as ImageIcon, Layers, Sliders, SlidersHorizontal,
  Bookmark, Save, ArrowRight, Check, Star, Search, RefreshCw, Copy,
  CheckCircle2, Wand2, Scan, ChevronDown, CheckCheck, Upload, Trash2,
  Building2, Info, AlertTriangle, Shield
} from 'lucide-react';
import { DocumentItem } from '../../types';

interface QrDesignControlsProps {
  generationMode: 'static' | 'dynamic';
  setGenerationMode: (mode: 'static' | 'dynamic') => void;
  registeredSlug: string;
  setRegisteredSlug: (slug: string) => void;
  isRegisteringDynamic: boolean;
  registerDynamicQr: () => Promise<void>;
  qrType: 'edms' | 'url' | 'text' | 'vcard' | 'wifi' | 'promptpay';
  setQrType: (type: 'edms' | 'url' | 'text' | 'vcard' | 'wifi' | 'promptpay') => void;
  documents: DocumentItem[];
  selectedDocId: string;
  setSelectedDocId: (id: string) => void;
  selectedDoc: DocumentItem | null;
  docSearchQuery: string;
  setDocSearchQuery: (q: string) => void;
  docCategoryFilter: 'all' | 'urgent' | 'command' | 'internal' | 'external';
  setDocCategoryFilter: (f: 'all' | 'urgent' | 'command' | 'internal' | 'external') => void;
  urlInput: string;
  setUrlInput: (u: string) => void;
  customTitle: string;
  setCustomTitle: (t: string) => void;
  textInput: string;
  setTextInput: (t: string) => void;
  vcard: {
    name: string;
    title: string;
    org: string;
    phone: string;
    email: string;
    address: string;
    website: string;
  };
  setVcard: React.Dispatch<React.SetStateAction<{
    name: string;
    title: string;
    org: string;
    phone: string;
    email: string;
    address: string;
    website: string;
  }>>;
  wifi: {
    ssid: string;
    password: string;
    encryption: 'WPA' | 'WEP' | 'nopass';
  };
  setWifi: React.Dispatch<React.SetStateAction<{
    ssid: string;
    password: string;
    encryption: 'WPA' | 'WEP' | 'nopass';
  }>>;
  promptPay: {
    id: string;
    amount: string;
  };
  setPromptPay: React.Dispatch<React.SetStateAction<{
    id: string;
    amount: string;
  }>>;
  presetPalettes: Array<{
    name: string;
    fg: string;
    bg: string;
    frame: string;
    gradType: string;
    col2: string;
  }>;
  fgColor: string;
  setFgColor: (c: string) => void;
  bgColor: string;
  setBgColor: (c: string) => void;
  transparentBg: boolean;
  setTransparentBg: (t: boolean) => void;
  gradientType: 'solid' | 'linear' | 'radial';
  setGradientType: (g: 'solid' | 'linear' | 'radial') => void;
  gradientColor2: string;
  setGradientColor2: (c: string) => void;
  gradientAngle: number;
  setGradientAngle: (a: number) => void;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  setErrorCorrection: (e: 'L' | 'M' | 'Q' | 'H') => void;
  qrMargin: number;
  setQrMargin: (m: number) => void;
  logoType: 'none' | 'garuda' | 'ddpm' | 'province' | 'custom';
  setLogoType: (l: 'none' | 'garuda' | 'ddpm' | 'province' | 'custom') => void;
  customLogoUrl: string;
  setCustomLogoUrl: (u: string) => void;
  logoScale: number;
  setLogoScale: (s: number) => void;
  GARUDA_LOGO_URL: string;
  DDPM_LOGO_URL: string;
  RAYONG_LOGO_URL?: string;
  isDragging: boolean;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  frameType: 'none' | 'top-bottom' | 'card' | 'badge' | 'official-garuda' | 'modern-border' | 'label-side';
  setFrameType: (f: 'none' | 'top-bottom' | 'card' | 'badge' | 'official-garuda' | 'modern-border' | 'label-side') => void;
  frameText: string;
  setFrameText: (t: string) => void;
  frameTextBottom: string;
  setFrameTextBottom: (t: string) => void;
  frameColor: string;
  setFrameColor: (c: string) => void;
  frameTextColor: string;
  setFrameTextColor: (c: string) => void;
  savedTemplates: any[];
  selectedTemplateId: string | null;
  handleApplyTemplate: (template: any, confirmPrompt?: boolean) => void;
  handleOpenSaveModal: () => void;
  setActiveTab: (tab: any) => void;
  getComputedPayload: () => string;
  getContrastRatio: (fg: string, bg: string, isTransparent: boolean) => {
    ratio: number;
    score: string;
    label: string;
    isGood: boolean;
  };
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  handleQuickAiStamp: () => void;
  isSavingToDoc: boolean;
  setIsAiStamperOpen: (open: boolean) => void;
}

export default function QrDesignControls(props: QrDesignControlsProps) {
  const {
    generationMode, setGenerationMode, registeredSlug, setRegisteredSlug,
    isRegisteringDynamic, registerDynamicQr, qrType, setQrType,
    documents, selectedDocId, setSelectedDocId, selectedDoc,
    docSearchQuery, setDocSearchQuery, docCategoryFilter, setDocCategoryFilter,
    urlInput, setUrlInput, customTitle, setCustomTitle, textInput, setTextInput,
    vcard, setVcard, wifi, setWifi, promptPay, setPromptPay,
    presetPalettes, fgColor, setFgColor, bgColor, setBgColor, transparentBg, setTransparentBg,
    gradientType, setGradientType, gradientColor2, setGradientColor2, gradientAngle, setGradientAngle,
    errorCorrection, setErrorCorrection, qrMargin, setQrMargin,
    logoType, setLogoType, customLogoUrl, setCustomLogoUrl, logoScale, setLogoScale,
    GARUDA_LOGO_URL, DDPM_LOGO_URL,
    isDragging, handleDragOver, handleDragLeave, handleDrop, handleLogoUpload,
    frameType, setFrameType, frameText, setFrameText, frameTextBottom, setFrameTextBottom,
    frameColor, setFrameColor, frameTextColor, setFrameTextColor,
    savedTemplates, selectedTemplateId, handleApplyTemplate, handleOpenSaveModal, setActiveTab,
    getComputedPayload, getContrastRatio, showToast, handleQuickAiStamp, isSavingToDoc, setIsAiStamperOpen
  } = props;

  const contrastInfo = getContrastRatio(fgColor, bgColor, transparentBg);

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !docSearchQuery ||
      doc.title?.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      (doc.docNumber && doc.docNumber.toLowerCase().includes(docSearchQuery.toLowerCase())) ||
      (doc.category && doc.category.toLowerCase().includes(docSearchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (docCategoryFilter === 'urgent') {
      return (
        doc.priority === 'ด่วนที่สุด' ||
        doc.priority === 'ด่วนมาก' ||
        doc.priority === 'ด่วน' ||
        doc.title?.includes('ด่วน')
      );
    }
    if (docCategoryFilter === 'command') {
      return doc.category === 'order' || doc.title?.includes('คำสั่ง');
    }
    if (docCategoryFilter === 'internal') {
      return doc.type === 'internal' || doc.category === 'memo';
    }
    if (docCategoryFilter === 'external') {
      return doc.type === 'outbox' || doc.category === 'circular';
    }
    return true;
  });

  return (
    <div className="lg:col-span-7 bg-[var(--bg-overlay)] backdrop-blur-2xl border border-[var(--border-light)] rounded-3xl p-5 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 overflow-y-auto max-h-[88vh] lg:max-h-[calc(100vh-190px)] custom-scrollbar pb-16 text-left">
      
      {/* Top Section: QR Tech Mode Selector */}
      <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>รูปแบบเทคโนโลยี QR Code:</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold">
            {generationMode === 'dynamic' ? 'Dynamic Tracking' : 'Direct Link'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={async () => {
              setGenerationMode('dynamic');
              if (!registeredSlug && !isRegisteringDynamic) {
                await registerDynamicQr();
              }
            }}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
              generationMode === 'dynamic'
                ? 'border-blue-600 bg-blue-50/30 dark:bg-blue-950/40 shadow-sm ring-2 ring-blue-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <Sparkles className={`w-3.5 h-3.5 ${isRegisteringDynamic ? 'animate-spin' : ''}`} />
                <span>Dynamic QR + Verify Page</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                แนะนำสำหรับ ปภ.
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              ผ่านหน้าตรวจสอบความปลอดภัยของสารบรรณ ปภ. ระยอง พร้อมบันทึกสถิติสแกนเรียลไทม์
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setGenerationMode('static');
              setRegisteredSlug('');
            }}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
              generationMode === 'static'
                ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/40 shadow-sm ring-2 ring-amber-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                Static QR Code (ตรงตัว)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                สแกนตรง
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              ฝังข้อมูลโดยตรงลงภาพ QR Code สแกนแล้วเปิดทันที ไม่บันทึกสถิติ
            </span>
          </button>
        </div>

        {/* Dynamic Registered Link Banner */}
        {generationMode === 'dynamic' && registeredSlug && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-[11px]">ลิงก์สั้น Dynamic พร้อมใช้งาน:</div>
                <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                  {window.location.origin}/qr/{registeredSlug}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={async () => {
                  const shortUrl = `${window.location.origin}/qr/${registeredSlug}`;
                  try {
                    await navigator.clipboard.writeText(shortUrl);
                    showToast('success', 'คัดลอก URL สั้นเรียบร้อยแล้ว!');
                  } catch (_) {
                    showToast('info', `URL สั้น: ${shortUrl}`);
                  }
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอก</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegisteredSlug('');
                  setGenerationMode('static');
                  showToast('info', 'ยกเลิกการลงทะเบียน Dynamic Link แล้ว');
                }}
                className="text-[10px] text-slate-500 hover:text-rose-600 underline px-1"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Templates & Presets Ribbon */}
      <div className="p-3.5 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 dark:from-slate-900 dark:to-slate-900/70 rounded-2xl border border-blue-100/90 dark:border-blue-900/40 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Bookmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              แม่แบบมาตรฐานสารบรรณ (Quick Templates):
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenSaveModal}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-all flex items-center gap-1"
              title="บันทึกการตั้งค่าสี โลโก้ และกรอบปัจจุบันเป็นแม่แบบใหม่"
            >
              <Save className="w-3 h-3" />
              <span>บันทึกแม่แบบ</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-0.5"
              title="เปิดไลบรารีแม่แบบทั้งหมด"
            >
              <span>ทั้งหมด ({savedTemplates.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {savedTemplates.slice(0, 6).map((t: any) => {
            const isSelected = selectedTemplateId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleApplyTemplate(t, false)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/40'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {t.isDefault && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                <span className="truncate max-w-[130px]">{t.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Content & Document Selection */}
      <div className="bg-white/90 dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
              1
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                เลือกประเภทข้อมูล & หนังสือราชการ (Content Source)
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                กำหนดแหล่งข้อมูลที่จะฝังลงในรหัส QR Code
              </p>
            </div>
          </div>
        </div>

        {/* QR Content Types Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
          {[
            { id: 'edms', label: 'หนังสือ EDMS', icon: FileText, highlight: true },
            { id: 'url', label: 'เว็บไซต์ (URL)', icon: Globe },
            { id: 'text', label: 'ข้อความทั่วไป', icon: Sparkles },
            { id: 'vcard', label: 'นามบัตรราชการ', icon: User },
            { id: 'wifi', label: 'Wi-Fi สำนักงาน', icon: Wifi },
            { id: 'promptpay', label: 'พร้อมเพย์ ปภ.', icon: CreditCard }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = qrType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setQrType(tab.id as any)}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/30'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-blue-500'}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Type Forms */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-950/40 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3.5 text-xs">
          {/* EDMS Selection Mode */}
          {qrType === 'edms' && (
            <div className="space-y-3">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'urgent', label: 'ด่วนที่สุด / ด่วน' },
                  { id: 'command', label: 'คำสั่ง' },
                  { id: 'internal', label: 'หนังสือภายใน' },
                  { id: 'external', label: 'หนังสือภายนอก' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDocCategoryFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      docCategoryFilter === f.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ค้นหาตามเลขที่หนังสือ, เรื่อง หรือชื่อหน่วยงาน..."
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-900 dark:text-slate-100"
                />
                {docSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setDocSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[11px]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Document List */}
              <div className="max-h-44 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-white dark:bg-slate-900">
                {filteredDocuments.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-xs italic">
                    ไม่พบหนังสือที่ตรงกับคำค้นหา
                  </div>
                ) : (
                  filteredDocuments.map((doc) => {
                    const isSelected = selectedDocId === doc.id;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          setSelectedDocId(doc.id);
                          if (doc.title) {
                            setCustomTitle(doc.title);
                            setFrameText(`ตรวจเลขหนังสือ: ${doc.docNumber || doc.id}`);
                          }
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 shadow-xs'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                              {doc.docNumber || 'ไม่มีเลขหนังสือ'}
                            </span>
                            {doc.priority && doc.priority !== 'ปกติ' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                                {doc.priority}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                            {doc.title}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="p-1 rounded-full bg-blue-600 text-white shrink-0">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Selected Doc Spotlight Card */}
              {selectedDoc && (
                <div className="p-3.5 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-300 dark:border-emerald-800/60 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-bold text-emerald-900 dark:text-emerald-300 text-xs">
                        หนังสือที่เลือกพร้อมประทับตรา:
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold">
                      {selectedDoc.docNumber || selectedDoc.id}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                    {selectedDoc.title}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleQuickAiStamp}
                      disabled={isSavingToDoc}
                      className="py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      {isSavingToDoc ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5" />
                      )}
                      <span>⚡ ประทับตราทันทีด้วย AI</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAiStamperOpen(true)}
                      className="py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Scan className="w-3.5 h-3.5 text-indigo-500" />
                      <span>เลือกจุดประทับ & ปรับขนาด</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* URL Mode */}
          {qrType === 'url' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  ระบุลิงก์ปลายทาง (Target URL):
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  placeholder="https://rayong.popt.go.th"
                />
              </div>

              {/* Preset URLs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500">ลิงก์ด่วน:</span>
                {[
                  { l: 'สนง.ปภ.ระยอง', u: 'https://rayong.popt.go.th' },
                  { l: 'ศาลากลาง จ.ระยอง', u: 'https://www.rayong.go.th' },
                  { l: 'ระบบสารบรรณ ปภ.', u: 'https://edms.disaster.go.th' }
                ].map((item) => (
                  <button
                    key={item.l}
                    type="button"
                    onClick={() => {
                      setUrlInput(item.u);
                      setCustomTitle(item.l);
                      setFrameTextBottom(item.l);
                    }}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:border-blue-400"
                  >
                    {item.l}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  หัวข้อ / รายละเอียดเรื่อง (Title):
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  placeholder="เช่น สนง.ปภ.ระยอง หรือ ข่าวสารประชาสัมพันธ์"
                />
              </div>
            </div>
          )}

          {/* Text Mode */}
          {qrType === 'text' && (
            <div className="space-y-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                ข้อความที่ต้องการฝังในรหัส:
              </label>
              <textarea
                rows={3}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg font-sans outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                placeholder="พิมพ์ประกาศหรือรายละเอียดข้อความ..."
              />
            </div>
          )}

          {/* vCard Mode */}
          {qrType === 'vcard' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block font-bold text-slate-600 dark:text-slate-400">ชื่อ-นามสกุล:</label>
                <input
                  type="text"
                  value={vcard.name}
                  onChange={(e) => setVcard({ ...vcard, name: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="block font-bold text-slate-600 dark:text-slate-400">ตำแหน่งงาน:</label>
                <input
                  type="text"
                  value={vcard.title}
                  onChange={(e) => setVcard({ ...vcard, title: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="block font-bold text-slate-600 dark:text-slate-400">สังกัดหน่วยงาน:</label>
                <input
                  type="text"
                  value={vcard.org}
                  onChange={(e) => setVcard({ ...vcard, org: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="block font-bold text-slate-600 dark:text-slate-400">เบอร์โทรศัพท์:</label>
                <input
                  type="text"
                  value={vcard.phone}
                  onChange={(e) => setVcard({ ...vcard, phone: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="block font-bold text-slate-600 dark:text-slate-400">อีเมล:</label>
                <input
                  type="email"
                  value={vcard.email}
                  onChange={(e) => setVcard({ ...vcard, email: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>
          )}

          {/* Wi-Fi Mode */}
          {qrType === 'wifi' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2 space-y-1">
                <label className="block font-bold text-slate-600 dark:text-slate-400">ชื่อ Wi-Fi (SSID):</label>
                <input
                  type="text"
                  value={wifi.ssid}
                  onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="block font-bold text-slate-600 dark:text-slate-400">การเข้ารหัส:</label>
                <select
                  value={wifi.encryption}
                  onChange={(e) => setWifi({ ...wifi, encryption: e.target.value as any })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                >
                  <option value="WPA">WPA / WPA2</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">ไม่มีรหัสผ่าน</option>
                </select>
              </div>
              <div className="sm:col-span-3 space-y-1">
                <label className="block font-bold text-slate-600 dark:text-slate-400">รหัสผ่าน Wi-Fi:</label>
                <input
                  type="password"
                  value={wifi.password}
                  onChange={(e) => setWifi({ ...wifi, password: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
            </div>
          )}

          {/* PromptPay Mode */}
          {qrType === 'promptpay' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block font-bold text-slate-600 dark:text-slate-400">
                  หมายเลขพร้อมเพย์ / เบอร์โทรศัพท์:
                </label>
                <input
                  type="text"
                  value={promptPay.id}
                  onChange={(e) => setPromptPay({ ...promptPay, id: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="block font-bold text-slate-600 dark:text-slate-400">
                  จำนวนเงิน (บาท):
                </label>
                <input
                  type="number"
                  value={promptPay.amount}
                  onChange={(e) => setPromptPay({ ...promptPay, amount: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STEP 2: Colors, Palettes & Contrast */}
      <div className="bg-white/90 dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
              2
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                สไตล์สี & การไล่เฉด (Brand Colors & Gradients)
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                เลือกจานสีมาตรฐานราชการ พร้อมระบบตรวจวัดความคมชัดในการสแกน
              </p>
            </div>
          </div>
        </div>

        {/* Brand Palette Preset Cards */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
            จานสีทางการ (Official Color Palettes):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {presetPalettes.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setFgColor(p.fg);
                  setBgColor(p.bg);
                  setFrameColor(p.frame);
                  setGradientType(p.gradType as any);
                  setGradientColor2(p.col2);
                }}
                className="p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl hover:border-purple-400 dark:hover:border-purple-500 flex flex-col items-center gap-1.5 transition-all shadow-2xs hover:scale-102"
              >
                <div className="flex gap-0.5 w-full h-4 rounded-md overflow-hidden border border-slate-200/60 dark:border-slate-700">
                  <div className="flex-1" style={{ backgroundColor: p.fg }} />
                  <div className="flex-1" style={{ backgroundColor: p.col2 }} />
                  <div className="flex-1" style={{ backgroundColor: p.bg }} />
                </div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-full">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Color Fill Mode & Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-600 dark:text-slate-400">รูปแบบสีรหัส:</label>
            <select
              value={gradientType}
              onChange={(e) => setGradientType(e.target.value as any)}
              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-xs font-medium"
            >
              <option value="solid">สีเดี่ยว (Solid Color)</option>
              <option value="linear">ไล่เฉดเส้นตรง (Linear)</option>
              <option value="radial">ไล่เฉดวงกลม (Radial)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-600 dark:text-slate-400">สีหลัก (Foreground):</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="w-9 h-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg font-mono text-xs"
              />
            </div>
          </div>

          {gradientType !== 'solid' && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 dark:text-slate-400">สีเฉดสอง (Gradient 2):</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={gradientColor2}
                  onChange={(e) => setGradientColor2(e.target.value)}
                  className="w-9 h-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={gradientColor2}
                  onChange={(e) => setGradientColor2(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Gradient Angle Buttons */}
        {gradientType === 'linear' && (
          <div className="space-y-1.5 text-xs">
            <label className="font-semibold text-slate-600 dark:text-slate-400">ทิศทางการไล่เฉด:</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { l: 'ซ้ายไปขวา (0°)', v: 0 },
                { l: 'ล่างซ้ายขึ้นบนขวา (45°)', v: 45 },
                { l: 'ล่างขึ้นบน (90°)', v: 90 },
                { l: 'บนซ้ายลงล่างขวา (135°)', v: 135 }
              ].map((ang) => (
                <button
                  key={ang.v}
                  type="button"
                  onClick={() => setGradientAngle(ang.v)}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition-colors ${
                    gradientAngle === ang.v
                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {ang.l}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Background & Quiet Zone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
          <div className="space-y-1">
            <label className="font-semibold text-slate-600 dark:text-slate-400">สีพื้นหลังคิวอาร์ (Background):</label>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                value={bgColor}
                disabled={transparentBg}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-9 h-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5 disabled:opacity-40"
              />
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={transparentBg}
                  onChange={(e) => setTransparentBg(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                  พื้นหลังโปร่งใส (Transparent)
                </span>
              </label>
            </div>
          </div>

          {/* Live Contrast Meter */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                คะแนนความคมชัด (Contrast):
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                  contrastInfo.isGood
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {contrastInfo.score} ({contrastInfo.ratio}:1)
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {contrastInfo.label}
            </p>
          </div>
        </div>
      </div>

      {/* STEP 3: Official Emblems & Logo Overlay */}
      <div className="bg-white/90 dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
              3
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                ตราสัญลักษณ์ตรงกลาง (Official Emblem & Logo)
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                เพิ่มความน่าเชื่อถือด้วยตราครุฑสารบรรณ ตรา ปภ. หรือตราประจำจังหวัด
              </p>
            </div>
          </div>
        </div>

        {/* Logo Picker Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => setLogoType('none')}
            className={`p-3 border rounded-xl text-center font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
              logoType === 'none'
                ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <span className="text-xs">ไม่มีโลโก้</span>
            <span className="text-[10px] text-slate-400 font-normal">รหัสเรียบง่าย</span>
          </button>

          <button
            type="button"
            onClick={() => setLogoType('garuda')}
            className={`p-3 border rounded-xl text-center font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
              logoType === 'garuda'
                ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <img src={GARUDA_LOGO_URL} className="w-6 h-6 object-contain" alt="ครุฑ" />
            <span className="text-xs">ตราครุฑสารบรรณ</span>
          </button>

          <button
            type="button"
            onClick={() => setLogoType('ddpm')}
            className={`p-3 border rounded-xl text-center font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
              logoType === 'ddpm'
                ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <img src={DDPM_LOGO_URL} className="w-6 h-6 object-contain" alt="ปภ" />
            <span className="text-xs">ตราสัญลักษณ์ ปภ.</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLogoType('custom');
              if (!customLogoUrl) {
                setCustomLogoUrl('https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png');
              }
            }}
            className={`p-3 border rounded-xl text-center font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
              logoType === 'custom'
                ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <img
              src={customLogoUrl || 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png'}
              className="w-6 h-6 object-contain"
              alt="ตราจังหวัด/อัปโหลด"
            />
            <span className="text-xs">ตราจังหวัด / อัปโหลด</span>
          </button>
        </div>

        {/* Custom Upload Drop Zone */}
        {logoType === 'custom' && (
          <div className="space-y-2 pt-1">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                const fileInput = document.getElementById('logo-file-input');
                if (fileInput) fileInput.click();
              }}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
                  : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-indigo-500/50'
              }`}
            >
              <input
                id="logo-file-input"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              {customLogoUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={customLogoUrl}
                    alt="Logo"
                    className="w-12 h-12 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-1"
                  />
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      อัปโหลดโลโก้สำเร็จ
                    </span>
                    <span className="text-[10px] text-slate-400">
                      คลิกเพื่อเปลี่ยนรูป หรือลากไฟล์ใหม่มาวางที่นี่
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-500">
                  <Upload className="w-6 h-6 text-indigo-500" />
                  <span className="text-xs font-semibold">ลากและวางรูปภาพตราสัญลักษณ์ที่นี่</span>
                  <span className="text-[10px] text-slate-400">รองรับ PNG, JPG, WebP และ SVG</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logo Scale Slider */}
        {logoType !== 'none' && (
          <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                ขนาดสัดส่วนโลโก้ตรงกลาง (Logo Scale):
              </label>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {Math.round(logoScale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.15"
              max="0.28"
              step="0.01"
              value={logoScale}
              onChange={(e) => setLogoScale(parseFloat(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <p className="text-[10px] text-slate-400">
              * สัดส่วนแนะนำ 20% - 24% เพื่อให้กล้องมือถือสแกนติดง่าย 100%
            </p>
          </div>
        )}
      </div>

      {/* STEP 4: Frame, Borders & Official Banners */}
      <div className="bg-white/90 dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
              4
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                กรอบข้อความ & แถบทางการ (Official Frames & Labels)
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                เพิ่มข้อความกำกับ เช่น "สแกนเพื่อตรวจสอบเอกสาร EDMS" หรือ "สำนักงาน ปภ.ระยอง"
              </p>
            </div>
          </div>
        </div>

        {/* Frame Style Picker */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'none', label: 'ไม่มีกรอบ', desc: 'เฉพาะภาพ QR' },
            { id: 'top-bottom', label: 'หัวกระดาษทางการ', desc: 'แถบสีบน-ล่าง' },
            { id: 'card', label: 'การ์ดเอกสาร', desc: 'กรอบโค้งมน' },
            { id: 'badge', label: 'ริบบอนเน้นล่าง', desc: 'ป้ายข้อความใต้' },
            { id: 'official-garuda', label: 'ตราครุฑคู่', desc: 'สไตล์หนังสือเวียน' },
            { id: 'modern-border', label: 'ขอบโมเดิร์น', desc: 'เน้นมุมสี่ด้าน' },
            { id: 'label-side', label: 'ฉลากแนวตั้ง', desc: 'แถบข้างซ้าย' }
          ].map((f) => {
            const isSelected = frameType === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFrameType(f.id as any)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50'
                }`}
              >
                <div className={`text-xs font-bold ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  {f.label}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{f.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Frame Text Inputs */}
        {frameType !== 'none' && (
          <div className="space-y-3 pt-2 text-xs">
            {/* Quick Text Preset Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-500">ข้อความด่วน:</span>
              {[
                'สแกนเพื่อตรวจสอบเอกสาร EDMS',
                'หนังสือราชการฉบับจริง ตรวจสอบได้',
                'สำนักงาน ปภ. จังหวัดระยอง',
                'เอกสารสำคัญ / ด่วนที่สุด'
              ].map((txt) => (
                <button
                  key={txt}
                  type="button"
                  onClick={() => setFrameText(txt)}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 hover:text-emerald-600 border border-slate-200/80 dark:border-slate-700"
                >
                  {txt}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  ข้อความหัวกรอบ (Top Text):
                </label>
                <input
                  type="text"
                  value={frameText}
                  onChange={(e) => setFrameText(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="เช่น สแกนเพื่อตรวจสอบเอกสาร EDMS"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  ข้อความท้ายกรอบ (Bottom Text):
                </label>
                <input
                  type="text"
                  value={frameTextBottom}
                  onChange={(e) => setFrameTextBottom(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="เช่น สำนักงาน ปภ. จังหวัดระยอง"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 dark:text-slate-400">
                  สีแถบกรอบ (Frame Color):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={frameColor}
                    onChange={(e) => setFrameColor(e.target.value)}
                    className="w-9 h-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={frameColor}
                    onChange={(e) => setFrameColor(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 dark:text-slate-400">
                  สีตัวอักษรในกรอบ (Text Color):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={frameTextColor}
                    onChange={(e) => setFrameTextColor(e.target.value)}
                    className="w-9 h-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={frameTextColor}
                    onChange={(e) => setFrameTextColor(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STEP 5: Advanced & Error Correction */}
      <div className="bg-white/90 dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center shadow-xs">
              5
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                การกู้คืนข้อมูล & ระยะขอบ (Error Correction & Margin)
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                ควบคุมความทนทานต่อการขูดขีด/ยับย่นของเอกสารราชการ
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Error Correction */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              ระดับการกู้คืนข้อผิดพลาด (Error Correction):
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { lvl: 'L', cap: '7%', desc: 'ต่ำสุด' },
                { lvl: 'M', cap: '15%', desc: 'ปานกลาง' },
                { lvl: 'Q', cap: '25%', desc: 'สูง' },
                { lvl: 'H', cap: '30%', desc: 'สูงสุด (มีโลโก้)' }
              ].map((item) => (
                <button
                  key={item.lvl}
                  type="button"
                  onClick={() => setErrorCorrection(item.lvl as any)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    errorCorrection === item.lvl
                      ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold">{item.lvl}</div>
                  <div className="text-[9px] text-slate-400">{item.cap}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quiet Zone Margin */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                ขนาดขอบเว้นว่าง (Quiet Zone Margin):
              </label>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {qrMargin} ช่อง
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={qrMargin}
              onChange={(e) => setQrMargin(parseInt(e.target.value))}
              className="w-full accent-blue-600 mt-2"
            />
          </div>
        </div>
      </div>

    </div>
  );
}
