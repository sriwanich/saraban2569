import React, { useState } from 'react';
import {
  Eye, Download, FileDown, Printer, Copy, Check, Sparkles, Wand2,
  Scan, Bookmark, RefreshCw, Info, ChevronDown, ChevronUp, CheckCircle2,
  Share2, ShieldCheck
} from 'lucide-react';
import { DocumentItem } from '../../types';

interface QrLivePreviewProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isGenerating: boolean;
  generatedDataUrl: string;
  downloadPNG: () => void;
  downloadSVG: () => void;
  generationMode: 'static' | 'dynamic';
  registeredSlug: string;
  selectedDoc: DocumentItem | null;
  selectedDocId: string;
  isSavingToDoc: boolean;
  stampSuccess: boolean;
  handleQuickAiStamp: () => void;
  setIsAiStamperOpen: (open: boolean) => void;
  handleStampToDocument: () => void;
  rawQrPayload: string;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  setQrType: (type: any) => void;
  contrastInfo: {
    ratio: number;
    score: string;
    label: string;
    isGood: boolean;
  };
}

export default function QrLivePreview({
  canvasRef,
  isGenerating,
  generatedDataUrl,
  downloadPNG,
  downloadSVG,
  generationMode,
  registeredSlug,
  selectedDoc,
  selectedDocId,
  isSavingToDoc,
  stampSuccess,
  handleQuickAiStamp,
  setIsAiStamperOpen,
  handleStampToDocument,
  rawQrPayload,
  showToast,
  setQrType,
  contrastInfo
}: QrLivePreviewProps) {
  const [isCopiedPayload, setIsCopiedPayload] = useState(false);
  const [showPayloadDetails, setShowPayloadDetails] = useState(false);
  const [isCopiedImage, setIsCopiedImage] = useState(false);

  // Copy Canvas Image to clipboard as PNG
  const handleCopyImage = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        try {
          // Clipboard Item
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setIsCopiedImage(true);
          showToast('success', 'คัดลอกรูปภาพ QR Code ลงคลิปบอร์ดแล้ว!');
          setTimeout(() => setIsCopiedImage(false), 3000);
        } catch (_) {
          showToast('info', 'เบราว์เซอร์ไม่รองรับการคัดลอกรูปภาพโดยตรง กรุณากดดาวน์โหลด');
        }
      });
    } catch {
      showToast('error', 'ไม่สามารถคัดลอกรูปภาพได้');
    }
  };

  return (
    <div className="lg:col-span-5 lg:sticky lg:top-4 bg-[var(--bg-overlay)] backdrop-blur-2xl border border-[var(--border-light)] rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5 text-left">
      
      {/* Header Badge */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold">
          <Eye className="w-3.5 h-3.5" />
          <span>ตัวอย่างตราประทับสด (Live Preview)</span>
        </div>

        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
          1024 x 1024 px
        </span>
      </div>

      {/* Realistic Document Paper Preview Stage */}
      <div className="relative p-6 sm:p-8 bg-gradient-to-b from-slate-100/90 to-slate-200/90 dark:from-slate-900/90 dark:to-slate-950/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-inner flex flex-col items-center justify-center min-h-[280px]">
        {/* Paper Background Effect */}
        <div className="relative p-3 bg-white rounded-2xl shadow-lg border border-slate-200/60 max-w-[280px] w-full flex flex-col items-center justify-center">
          <canvas
            ref={canvasRef}
            style={{ width: '100%', maxWidth: '250px', height: 'auto' }}
            className="rounded-lg bg-white"
          />

          {isGenerating && (
            <div className="absolute inset-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xs rounded-2xl flex flex-col items-center justify-center gap-2 text-xs font-bold text-blue-600">
              <RefreshCw className="w-7 h-7 animate-spin" />
              <span>กำลังประมวลผลตราประทับ...</span>
            </div>
          )}
        </div>

        {/* Live Scannability Badge */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>สแกนคมชัดระดับ {contrastInfo.score} ({contrastInfo.ratio}:1)</span>
        </div>
      </div>

      {/* Dynamic Short Link Banner (If dynamic mode) */}
      {generationMode === 'dynamic' && registeredSlug && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-[11px] text-blue-900 dark:text-blue-300">
                Dynamic Link ปภ.
              </div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono truncate">
                /qr/{registeredSlug}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/qr/${registeredSlug}`);
              showToast('success', 'คัดลอกลิงก์สั้นสแกนสำเร็จ!');
            }}
            className="p-2 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors shrink-0"
            title="คัดลอก URL สั้น"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI Document Stamping Section (Highlighted for DDPM) */}
      <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-slate-50 dark:from-slate-850 dark:via-indigo-950/30 dark:to-slate-900 border border-indigo-200/90 dark:border-indigo-800/60 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-lg shadow-xs">
              <Wand2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>ประทับลงหนังสือ EDMS ด้วย AI</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  Auto-Fit
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                ค้นหาพื้นที่ว่างปลอดภัย ไม่ทับตัวหนังสือหรือตราทางการ
              </div>
            </div>
          </div>
        </div>

        {selectedDoc ? (
          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div className="min-w-0 pr-2">
              <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate">
                {selectedDoc.docNumber || 'ไม่มีเลขที่หนังสือ'}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {selectedDoc.title}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAiStamperOpen(true)}
              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              เลือกจุดประทับ
            </button>
          </div>
        ) : (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <button
              type="button"
              onClick={() => setQrType('edms')}
              className="text-left font-medium hover:underline"
            >
              กรุณาเลือกหนังสือในแถบ 'หนังสือ EDMS' ก่อนประทับ
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleQuickAiStamp}
            disabled={!selectedDocId || isSavingToDoc}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-40"
          >
            {isSavingToDoc ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : stampSuccess ? (
              <Check className="w-3.5 h-3.5 text-white shrink-0" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{stampSuccess ? 'ประทับสำเร็จ!' : '⚡ ประทับตราทันทีด้วย AI'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!selectedDocId) {
                showToast('info', 'กรุณาเลือกหนังสือราชการก่อน');
                setQrType('edms');
                return;
              }
              setIsAiStamperOpen(true);
            }}
            disabled={!selectedDocId}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
          >
            <Scan className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>ตรวจพื้นที่ & ปรับขนาด</span>
          </button>
        </div>
      </div>

      {/* Main Download and Output Action Buttons */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={downloadPNG}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition-all active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลด PNG (300 DPI)</span>
          </button>

          <button
            type="button"
            onClick={downloadSVG}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-all"
          >
            <FileDown className="w-4 h-4 text-slate-500" />
            <span>ดาวน์โหลด SVG เวกเตอร์</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopyImage}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all"
          >
            {isCopiedImage ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{isCopiedImage ? 'คัดลอกรูปภาพแล้ว!' : 'คัดลอกรูปภาพ QR'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!generatedDataUrl) {
                showToast('error', 'กรุณารอภาพ QR Code ให้พร้อม');
                return;
              }
              const win = window.open('', '_blank');
              if (win) {
                win.document.write(`<!DOCTYPE html><html><head><title>พิมพ์ QR Code</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;}img{max-width:320px;height:auto;}</style></head><body><img src="${generatedDataUrl}" onload="window.print();" /></body></html>`);
                win.document.close();
              }
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>สั่งพิมพ์ด่วน (Print)</span>
          </button>
        </div>
      </div>

      {/* Collapsible QR Payload viewer */}
      <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
        <button
          type="button"
          onClick={() => setShowPayloadDetails(!showPayloadDetails)}
          className="w-full p-3 flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <span>ข้อมูลรหัสที่ฝังจริง (Payload String)</span>
          {showPayloadDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showPayloadDetails && (
          <div className="p-3 pt-0 space-y-2 border-t border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-[10px] text-slate-600 dark:text-slate-400 break-all max-h-24 overflow-y-auto">
              {rawQrPayload}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(rawQrPayload);
                setIsCopiedPayload(true);
                showToast('success', 'คัดลอกข้อความ Payload สำเร็จ');
                setTimeout(() => setIsCopiedPayload(false), 2500);
              }}
              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              {isCopiedPayload ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{isCopiedPayload ? 'คัดลอกแล้ว!' : 'คัดลอกข้อความ Payload'}</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
