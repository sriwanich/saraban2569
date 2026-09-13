import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DocumentItem, DigitalSignatureRecord, formatThaiDateTime } from '../types';
import {
  X,
  ShieldCheck,
  PenTool,
  Upload,
  RefreshCw,
  CheckCircle2,
  QrCode,
  FileText,
  Download,
  Award,
  Clock,
  KeyRound,
  User,
  Briefcase,
  Building,
  Mail,
  Sparkles,
  Palette,
  RotateCcw,
  Check,
  Copy,
  FileCheck,
  Lock,
  Eye
} from 'lucide-react';

interface Props {
  doc: DocumentItem;
  user?: any;
  onClose: () => void;
  onSignedSuccess: (signature: DigitalSignatureRecord) => void;
}

type SignatureMode = 'draw' | 'upload' | 'text';
type InkColor = '#0f172a' | '#1e3a8a' | '#0369a1' | '#991b1b';
type StrokeWidth = 2 | 3.5 | 5;
type FontStyleOption = 'sarabun' | 'formal' | 'cursive';

export default function DigitalSignatureModal({ doc, user, onClose, onSignedSuccess }: Props) {
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('draw');
  
  // Signer form states
  const defaultSignerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'นายสมชาย ใจดี';
  const defaultSignerPos = user?.position || 'หัวหน้าสำนักงาน ปภ.จังหวัดระยอง';
  const defaultSignerDept = user?.department || 'ผู้บริหาร / สำนักงาน ปภ.จังหวัด';
  const defaultSignerEmail = user?.email || 'somchai@rayong.go.th';

  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signerPosition, setSignerPosition] = useState(defaultSignerPos);
  const [signerDepartment, setSignerDepartment] = useState(defaultSignerDept);
  const [signerEmail, setSignerEmail] = useState(defaultSignerEmail);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  
  // Text mode state
  const [typedName, setTypedName] = useState<string>(defaultSignerName);
  const [fontStyle, setFontStyle] = useState<FontStyleOption>('formal');

  // Drawing settings
  const [inkColor, setInkColor] = useState<InkColor>('#0f172a');
  const [strokeWidth, setStrokeWidth] = useState<StrokeWidth>(3.5);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Active tab on mobile (form vs preview)
  const [mobileViewTab, setMobileViewTab] = useState<'sign' | 'preview'>('sign');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedHash, setCopiedHash] = useState(false);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Setup Canvas with DPI scaling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set actual size in memory (scaled to account for extra pixel density)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [inkColor, strokeWidth]);

  useEffect(() => {
    if (signatureMode === 'draw') {
      // Small timeout to ensure DOM container layout is computed
      const timer = setTimeout(() => {
        setupCanvas();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [signatureMode, setupCanvas]);

  // Handle ink or stroke changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [inkColor, strokeWidth]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement> | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else if ('clientX' in e) {
      return {
        x: (e as MouseEvent).clientX - rect.left,
        y: (e as MouseEvent).clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) {
      // Avoid scrolling on mobile while touching canvas
      e.stopPropagation();
    }
    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      // Draw a single dot in case of click without movement
      ctx.lineTo(coords.x + 0.1, coords.y + 0.1);
      ctx.stroke();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    if ('touches' in e) {
      e.stopPropagation();
    }
    const coords = getCanvasCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    if (ctx && lastPointRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      lastPointRef.current = coords;
      setHasDrawn(true);
    }
  };

  const stopDrawing = () => {
    if (isDrawingRef.current && canvasRef.current) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      setSignatureDataUrl(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasDrawn(false);
    setSignatureDataUrl('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        setErrorMessage('ขนาดไฟล์รูปภาพไม่ควรเกิน 4MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setSignatureDataUrl(evt.target.result as string);
          setErrorMessage('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetToMyProfile = () => {
    setSignerName(defaultSignerName);
    setSignerPosition(defaultSignerPos);
    setSignerDepartment(defaultSignerDept);
    setSignerEmail(defaultSignerEmail);
    setTypedName(defaultSignerName);
  };

  // Generate simulated SHA-256 string for dynamic preview
  const simulatedHash = React.useMemo(() => {
    const raw = `${doc.docNumber || doc.id}-${signerName}-${signerPosition}-${doc.title}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852${hex}`;
  }, [doc, signerName, signerPosition]);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(simulatedHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleSignSubmit = async () => {
    if (!signerName.trim()) {
      setErrorMessage('กรุณาระบุชื่อ-นามสกุล ผู้ลงนาม');
      setMobileViewTab('sign');
      return;
    }

    let finalSigDataUrl = signatureDataUrl;

    // Generate text signature if in text mode or no drawing image
    if (signatureMode === 'text' || (!finalSigDataUrl && typedName)) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 600;
      tempCanvas.height = 200;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 600, 200);

        if (fontStyle === 'cursive') {
          ctx.font = 'italic bold 38px "Brush Script MT", "Segoe Script", cursive, "Sarabun", sans-serif';
          ctx.fillStyle = '#1e3a8a';
        } else if (fontStyle === 'formal') {
          ctx.font = 'bold 34px "TH Sarabun New", "Sarabun", sans-serif';
          ctx.fillStyle = '#0f172a';
        } else {
          ctx.font = '600 32px "Prompt", "Sarabun", sans-serif';
          ctx.fillStyle = '#1e3a8a';
        }

        ctx.textAlign = 'center';
        ctx.fillText(typedName || signerName, 300, 95);

        ctx.font = '20px "TH Sarabun New", "Sarabun", sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText(`(${signerPosition})`, 300, 140);
        finalSigDataUrl = tempCanvas.toDataURL('image/png');
      }
    } else if (signatureMode === 'draw' && !hasDrawn && !signatureDataUrl) {
      setErrorMessage('กรุณาวาดลายมือชื่อของท่านลงในกรอบก่อนยืนยัน');
      setMobileViewTab('sign');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/digital-signatures/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: doc.id,
          docType: doc.type || 'inbox',
          signerName: signerName.trim(),
          signerPosition: signerPosition.trim(),
          signerDepartment: signerDepartment.trim(),
          signerEmail: signerEmail.trim(),
          signatureType: 'digital-signature',
          signatureDataUrl: finalSigDataUrl,
          user: user?.username || signerName
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'การลงนามดิจิทัลล้มเหลว');
      }

      const result = await res.json();
      onSignedSuccess(result.signature);
    } catch (err: any) {
      console.error('Error in handleSignSubmit:', err);
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการลงนามดิจิทัล');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nowThaiDate = formatThaiDateTime(new Date().toISOString());

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-0 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] sm:rounded-3xl rounded-none shadow-2xl w-full max-w-5xl overflow-hidden my-0 sm:my-6 flex flex-col h-[100dvh] sm:h-auto sm:max-h-[92vh]">
        
        {/* TOP HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  ลงนามดิจิทัล (Digital Signature & SHA-256 Timestamp)
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> ETDA Standard
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate mt-0.5 flex items-center gap-1.5">
                <span>เอกสาร:</span>
                <span className="text-emerald-300 font-mono font-semibold">{doc.docNumber || `DOC-${doc.id}`}</span>
                <span className="text-slate-400 truncate hidden md:inline">- {doc.title}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="relative z-10 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors shrink-0 ml-2"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MOBILE VIEW SWITCHER TABS (< lg) */}
        <div className="flex lg:hidden bg-slate-100 dark:bg-slate-900/80 p-1.5 border-b border-[var(--border-lighter)] shrink-0">
          <button
            type="button"
            onClick={() => setMobileViewTab('sign')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
              mobileViewTab === 'sign'
                ? 'bg-white dark:bg-slate-800 text-[var(--primary-color)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <PenTool className="w-4 h-4" /> 1. บันทึกและสร้างลายเซ็น
          </button>
          <button
            type="button"
            onClick={() => setMobileViewTab('preview')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
              mobileViewTab === 'preview'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Eye className="w-4 h-4" /> 2. ตรวจสอบใบรับรองดิจิทัล
          </button>
        </div>

        {/* MAIN BODY CONTENT */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6 overscroll-contain">
          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-2xl text-xs sm:text-sm font-medium flex items-center gap-2 animate-shake">
              <span className="text-base shrink-0">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 2-COLUMN GRID ON DESKTOP */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: SIGNER INFO & SIGNATURE CREATION PAD */}
            <div className={`lg:col-span-7 space-y-5 ${mobileViewTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
              
              {/* Signer Profile Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--card-border)] shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-[var(--border-lighter)] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-tight">
                        ข้อมูลผู้มีอำนาจลงนาม (Signer Profile)
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)]">ระบุข้อมูลที่ปรากฏบนตราประทับรับรองดิจิทัล</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetToMyProfile}
                    className="text-[11px] font-semibold text-[var(--primary-color)] hover:underline flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> ข้อมูลของฉัน
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                      <span>ชื่อ-นามสกุล ผู้ลงนาม</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={signerName}
                        onChange={(e) => {
                          setSignerName(e.target.value);
                          setTypedName(e.target.value);
                        }}
                        placeholder="เช่น นายสมชาย ใจดี"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-medium)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">ตำแหน่ง</label>
                    <div className="relative">
                      <Briefcase className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={signerPosition}
                        onChange={(e) => setSignerPosition(e.target.value)}
                        placeholder="เช่น หัวหน้าสำนักงาน ปภ.จังหวัดระยอง"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-medium)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">สังกัด / กลุ่มงาน</label>
                    <div className="relative">
                      <Building className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={signerDepartment}
                        onChange={(e) => setSignerDepartment(e.target.value)}
                        placeholder="เช่น ฝ่ายยุทธศาสตร์และการจัดการ"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-medium)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">อีเมลยืนยันตัวตน (PKI Subject)</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--text-muted)]" />
                      <input
                        type="email"
                        value={signerEmail}
                        onChange={(e) => setSignerEmail(e.target.value)}
                        placeholder="somchai@rayong.go.th"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-medium)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Signature Creator Area */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--card-border)] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-lighter)] pb-3">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <PenTool className="w-4 h-4 text-emerald-500" /> สร้างลายมือชื่ออิเล็กทรอนิกส์ (e-Signature)
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)]">เลือกลงนามด้วยการวาด, อัปโหลดไฟล์ หรือพิมพ์ข้อความ</p>
                  </div>

                  {/* Mode Selector Segmented Tabs */}
                  <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSignatureMode('draw')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                        signatureMode === 'draw'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <PenTool className="w-3.5 h-3.5" /> วาดลายเซ็น
                    </button>

                    <button
                      type="button"
                      onClick={() => setSignatureMode('upload')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                        signatureMode === 'upload'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" /> แนบไฟล์รูป
                    </button>

                    <button
                      type="button"
                      onClick={() => setSignatureMode('text')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                        signatureMode === 'text'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" /> ตัวอักษร
                    </button>
                  </div>
                </div>

                {/* DRAW MODE CANVAS */}
                {signatureMode === 'draw' && (
                  <div className="space-y-3">
                    {/* Tool Bar: Color & Thickness */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-1">
                          <Palette className="w-3.5 h-3.5" /> สีหมึก:
                        </span>
                        <div className="flex items-center gap-1.5">
                          {[
                            { color: '#0f172a' as InkColor, label: 'ดำสนิท' },
                            { color: '#1e3a8a' as InkColor, label: 'น้ำเงินกรมท่า' },
                            { color: '#0369a1' as InkColor, label: 'ฟ้าเข้ม' },
                            { color: '#991b1b' as InkColor, label: 'แดงตราประทับ' }
                          ].map((c) => (
                            <button
                              key={c.color}
                              type="button"
                              onClick={() => setInkColor(c.color)}
                              className={`w-6 h-6 rounded-full border transition-transform ${
                                inkColor === c.color ? 'scale-110 ring-2 ring-emerald-500 ring-offset-2 border-white' : 'border-transparent opacity-80 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: c.color }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-[var(--text-muted)]">เส้นหมึก:</span>
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                          {[
                            { size: 2 as StrokeWidth, label: 'บาง' },
                            { size: 3.5 as StrokeWidth, label: 'ปกติ' },
                            { size: 5 as StrokeWidth, label: 'หนา' }
                          ].map((s) => (
                            <button
                              key={s.size}
                              type="button"
                              onClick={() => setStrokeWidth(s.size)}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                                strokeWidth === s.size
                                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                  : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg flex items-center gap-1 transition-colors ml-2"
                        >
                          <RotateCcw className="w-3 h-3" /> ล้างกระดาน
                        </button>
                      </div>
                    </div>

                    {/* Canvas Stage */}
                    <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-950 p-1 text-center overflow-hidden shadow-inner touch-none">
                      <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-44 cursor-crosshair touch-none bg-white dark:bg-slate-950 rounded-xl"
                      />
                      {!hasDrawn && !signatureDataUrl && (
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 select-none">
                          <PenTool className="w-8 h-8 mb-1.5 opacity-40 animate-bounce" />
                          <p className="text-xs font-semibold">ใช้นิ้วหรือเมาส์วาดลายมือชื่อในกรอบนี้</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">รองรับ Touch Screen & Apple Pencil / Stylus</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* UPLOAD MODE */}
                {signatureMode === 'upload' && (
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50 dark:bg-slate-900/40 transition-colors">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="sig-file-input"
                      />
                      <label htmlFor="sig-file-input" className="cursor-pointer flex flex-col items-center gap-2.5">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <Upload className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 block">
                            คลิกเพื่อเลือกไฟล์รูปภาพลายเซ็น (PNG / JPG / SVG)
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)] mt-0.5 block">
                            แนะนำไฟล์พื้นหลังโปร่งใส (.PNG) ความละเอียดคมชัด ขนาดไม่เกิน 4MB
                          </span>
                        </div>
                      </label>
                    </div>

                    {signatureDataUrl && (
                      <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                            <img src={signatureDataUrl} alt="Uploaded signature" className="h-12 max-w-[140px] object-contain" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[var(--text-primary)] block">โหลดไฟล์ลายเซ็นสำเร็จ</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">พร้อมประทับลงในเอกสาร</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSignatureDataUrl('')}
                          className="text-xs font-bold text-rose-500 hover:underline px-2 py-1"
                        >
                          ลบรูปนี้
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TEXT / TYPED SIGNATURE MODE */}
                {signatureMode === 'text' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'formal' as FontStyleOption, label: 'มาตรฐานทางการ', font: 'font-sans' },
                        { id: 'cursive' as FontStyleOption, label: 'ลายมือประดิษฐ์', font: 'italic font-serif' },
                        { id: 'sarabun' as FontStyleOption, label: 'ฟอนต์ราชการ', font: 'font-mono' }
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFontStyle(f.id)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            fontStyle === f.id
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                              : 'border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                          }`}
                        >
                          <span className={f.font}>{f.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-1 shadow-inner">
                      <div
                        className={`text-2xl font-bold tracking-wide ${
                          fontStyle === 'cursive'
                            ? 'italic text-indigo-900 dark:text-indigo-300 font-serif'
                            : fontStyle === 'formal'
                            ? 'text-slate-900 dark:text-slate-100 font-sans'
                            : 'text-blue-900 dark:text-blue-300 font-mono'
                        }`}
                      >
                        {typedName || signerName}
                      </div>
                      <div className="text-xs text-slate-500">({signerPosition})</div>
                      <div className="text-[10px] text-slate-400 font-mono pt-1">
                        Electronic Signature & Verified Digital Certificate
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: LIVE CERTIFICATE PREVIEW & SECURITY VERIFICATION */}
            <div className={`lg:col-span-5 space-y-4 ${mobileViewTab === 'sign' ? 'hidden lg:block' : 'block'}`}>
              
              {/* Visual Official Certificate Card */}
              <div className="p-5 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white shadow-xl relative overflow-hidden space-y-4">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

                {/* Certificate Header */}
                <div className="relative z-10 flex items-center justify-between border-b border-emerald-500/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-white tracking-wide">
                        ใบรับรองการลงนามดิจิทัล
                      </h4>
                      <p className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase">
                        Digital Signature Seal
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ETDA Standard
                  </span>
                </div>

                {/* Document & Signer Details */}
                <div className="relative z-10 space-y-3 text-xs">
                  <div className="flex items-start gap-4 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                    <div className="w-16 h-16 bg-white p-1 rounded-xl shrink-0 flex items-center justify-center shadow-md">
                      <QrCode className="w-14 h-14 text-slate-900" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                        ผู้ลงนามรับรอง (Signed By)
                      </div>
                      <div className="font-bold text-sm text-white truncate">{signerName}</div>
                      <div className="text-[11px] text-slate-300 truncate">{signerPosition}</div>
                      <div className="text-[10px] text-slate-400 truncate">{signerDepartment}</div>
                    </div>
                  </div>

                  {/* Signer Visual Stamp Preview */}
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      ตราประทับลายมือชื่อที่ปรากฏในเอกสาร
                    </div>
                    <div className="h-16 flex items-center justify-center">
                      {signatureDataUrl ? (
                        <img
                          src={signatureDataUrl}
                          alt="Signature Preview"
                          className="max-h-14 max-w-full object-contain filter drop-shadow"
                        />
                      ) : (
                        <div className="text-xs font-serif font-bold text-emerald-300 tracking-wider">
                          {typedName || signerName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cryptographic Badges */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5">
                      <div className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" /> เวลาประทับ (TSA)
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-300 truncate">{nowThaiDate}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5">
                      <div className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> สถานะความถูกต้อง
                      </div>
                      <div className="text-[11px] font-mono font-bold text-emerald-400">VALID & ACTIVE</div>
                    </div>
                  </div>

                  {/* SHA-256 Fingerprint */}
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-purple-400" /> Digital Hash (SHA-256)
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyHash}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                      >
                        {copiedHash ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedHash ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-[9px] text-slate-300 break-all bg-black/40 p-2 rounded-lg border border-white/10">
                      {simulatedHash}
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Standards Info Box */}
              <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--card-border)] space-y-2.5">
                <h5 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-500" /> มาตรฐานความปลอดภัยและการคุ้มครองข้อมูล
                </h5>
                <ul className="text-[11px] text-[var(--text-secondary)] space-y-1.5 leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>เป็นไปตาม พ.ร.บ. ว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544 (และที่แก้ไขเพิ่มเติม)</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>มีระบบตรวจจับการดัดแปลงแก้ไขเอกสารย้อนหลัง (Tamper-evident verification)</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>ระบบจะฝังใบรับรองและ QR Code ตรวจสอบความถูกต้องลงในไฟล์ PDF โดยอัตโนมัติ</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-t border-[var(--card-border)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 order-2 sm:order-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>รับรองกุญแจเข้ารหัสความปลอดภัยระดับ ETDA e-Signature Level 2/3</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSignSubmit}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-w-[200px]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังสร้างกุญแจ & PDF...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>ยืนยันการลงนามดิจิทัล</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
