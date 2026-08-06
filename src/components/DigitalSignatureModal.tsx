import React, { useState, useRef, useEffect } from 'react';
import { DocumentItem, DigitalSignatureRecord, formatThaiDateTime } from '../types';
import { X, ShieldCheck, PenTool, Upload, RefreshCw, CheckCircle2, QrCode, FileText, Download, Award, Clock, KeyRound } from 'lucide-react';

interface Props {
  doc: DocumentItem;
  user?: any;
  onClose: () => void;
  onSignedSuccess: (signature: DigitalSignatureRecord) => void;
}

export default function DigitalSignatureModal({ doc, user, onClose, onSignedSuccess }: Props) {
  const [signatureMode, setSignatureMode] = useState<'draw' | 'upload' | 'text'>('draw');
  const [signerName, setSignerName] = useState(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'นายสมชาย ใจดี');
  const [signerPosition, setSignerPosition] = useState(user?.position || 'หัวหน้าสำนักงาน ปภ.จังหวัดระยอง');
  const [signerDepartment, setSignerDepartment] = useState(user?.department || 'ผู้บริหาร / สำนักงาน ปภ.จังหวัด');
  const [signerEmail, setSignerEmail] = useState(user?.email || 'somchai@rayong.go.th');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [typedName, setTypedName] = useState<string>(signerName);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Canvas ref for drawing signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize canvas
  useEffect(() => {
    if (signatureMode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [signatureMode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      setSignatureDataUrl(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    setSignatureDataUrl('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setSignatureDataUrl(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignSubmit = async () => {
    if (!signerName.trim()) {
      setErrorMessage('กรุณาระบุชื่อผู้ลงนาม');
      return;
    }

    let finalSigDataUrl = signatureDataUrl;

    // Generate text signature if in text mode or no image drawn
    if (signatureMode === 'text' || (!finalSigDataUrl && typedName)) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 400;
      tempCanvas.height = 150;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 150);
        ctx.font = 'bold 28px "TH Sarabun New", "Sarabun", sans-serif';
        ctx.fillStyle = '#1e3a8a';
        ctx.textAlign = 'center';
        ctx.fillText(typedName || signerName, 200, 75);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText(signerPosition, 200, 110);
        finalSigDataUrl = tempCanvas.toDataURL('image/png');
      }
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
          signerName,
          signerPosition,
          signerDepartment,
          signerEmail,
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                ลงนามดิจิทัล (Digital Signature & SHA-256 Timestamp)
              </h3>
              <p className="text-xs text-slate-400">
                เอกสาร: <span className="text-emerald-300 font-semibold">{doc.docNumber || doc.id}</span> - {doc.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[var(--text-primary)]">
          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Certificate Features Info Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center gap-2.5">
              <PenTool className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-xs">
                <div className="font-semibold">e-Signature</div>
                <div className="text-[10px] text-[var(--text-secondary)]">ลายมือชื่ออิเล็กทรอนิกส์</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="text-xs">
                <div className="font-semibold">Timestamp</div>
                <div className="text-[10px] text-[var(--text-secondary)]">ลงเวลามาตรฐาน TSA</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center gap-2.5">
              <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="text-xs">
                <div className="font-semibold">QR Verification</div>
                <div className="text-[10px] text-[var(--text-secondary)]">สแกนตรวจสอบต้นฉบับ</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <div className="text-xs">
                <div className="font-semibold">SHA-256 Hash</div>
                <div className="text-[10px] text-[var(--text-secondary)]">ป้องกันการแก้ไขย้อนหลัง</div>
              </div>
            </div>
          </div>

          {/* Signer Information Form */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Award className="w-4 h-4 text-emerald-500" /> ข้อมูลผู้รับรองและลงนาม
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  ชื่อ-นามสกุล ผู้ลงนาม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => {
                    setSignerName(e.target.value);
                    setTypedName(e.target.value);
                  }}
                  placeholder="เช่น นายสมชาย ใจดี"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  ตำแหน่งผู้ลงนาม
                </label>
                <input
                  type="text"
                  value={signerPosition}
                  onChange={(e) => setSignerPosition(e.target.value)}
                  placeholder="เช่น หัวหน้าสำนักงาน ปภ.จังหวัดระยอง"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  สังกัด / กลุ่มงาน
                </label>
                <input
                  type="text"
                  value={signerDepartment}
                  onChange={(e) => setSignerDepartment(e.target.value)}
                  placeholder="เช่น ฝ่ายบริหารงานทั่วไป"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  อีเมลยืนยันตัวตน
                </label>
                <input
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="somchai@rayong.go.th"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Signature Input Mode Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
              รูปแบบการลงนาม (Signature Mode)
            </label>
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 max-w-md">
              <button
                type="button"
                onClick={() => setSignatureMode('draw')}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                  signatureMode === 'draw'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" /> วาดลายเซ็น
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode('upload')}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                  signatureMode === 'upload'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> แนบไฟล์ลายเซ็น
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode('text')}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                  signatureMode === 'text'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> ตัวอักษรลายเซ็น
              </button>
            </div>

            {/* Drawing Pad Area */}
            {signatureMode === 'draw' && (
              <div className="space-y-2">
                <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 p-2 text-center">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-40 touch-none cursor-crosshair bg-white dark:bg-slate-900 rounded-lg"
                  />
                  {!signatureDataUrl && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400">
                      <PenTool className="w-8 h-8 mb-1 opacity-40" />
                      <p className="text-xs font-medium">ลากเมาส์หรือใช้นิ้ววาดลายเซ็นในกรอบนี้</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-secondary)]">กรุณาวาดลายเซ็นให้ชัดเจน</span>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <RefreshCw className="w-3 h-3" /> ล้างหน้ากระดาน
                  </button>
                </div>
              </div>
            )}

            {/* Upload Area */}
            {signatureMode === 'upload' && (
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center bg-slate-50 dark:bg-slate-800/40">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="sig-file-input"
                />
                <label htmlFor="sig-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    คลิกเพื่อเลือกไฟล์รูปภาพลายเซ็น (PNG/JPG)
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">แนะนำไฟล์พื้นหลังโปร่งใส (.png)</span>
                </label>
                {signatureDataUrl && (
                  <div className="mt-4 p-2 bg-white dark:bg-slate-900 rounded-lg inline-block border border-slate-200 dark:border-slate-700">
                    <img src={signatureDataUrl} alt="Uploaded signature" className="max-h-20 max-w-xs object-contain" />
                  </div>
                )}
              </div>
            )}

            {/* Text Mode Area */}
            {signatureMode === 'text' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  ข้อความลายเซ็นดิจิทัล
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="นายสมชาย ใจดี"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-sm font-semibold text-indigo-900 dark:text-indigo-200"
                />
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-xl font-bold font-serif text-slate-800 dark:text-slate-100 tracking-wider">
                    {typedName || signerName}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{signerPosition}</div>
                </div>
              </div>
            )}
          </div>

          {/* Live Preview Certificate Box */}
          <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 shadow-inner relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-10 -top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">Digital Signature Certificate</h4>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400">Preview of the digital seal on the document</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    ETDA Compliant
                  </span>
                  <span className="text-[8px] text-slate-400 mt-0.5 mr-1">Rayong PA-PKI</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-3 flex justify-center sm:justify-start">
                  <div className="relative w-20 h-20 bg-white dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center overflow-hidden group">
                    <QrCode className="w-12 h-12 text-slate-200 dark:text-slate-800 group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 border-[2px] border-emerald-500/20 rounded-xl m-1" />
                  </div>
                </div>

                <div className="sm:col-span-9 space-y-2">
                  <div className="space-y-0.5 text-center sm:text-left">
                    <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Signed By</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{signerName}</div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">{signerPosition}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="space-y-0.5">
                      <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Timestamp (TSA)</div>
                      <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">{nowThaiDate}</div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Status</div>
                      <div className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> VALID & VERIFIED
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-[var(--card-border)] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSignSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> กำลังสร้างกุญแจดิจิทัล & PDF...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> ยืนยันการลงนามดิจิทัลและสร้าง PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
