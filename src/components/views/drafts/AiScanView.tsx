import React, { useState } from 'react';
import { 
  Sparkles, UploadCloud, FileText, CheckCircle2, AlertCircle, 
  Send, Save, RefreshCw, Eye, Trash2, ArrowRight, Layers, AlertTriangle
} from 'lucide-react';
import { AiScanResult } from './draftData';
import AiCrossReferencePanel, { DetectionResult, CrossReferenceItem } from '../../ai-cross-reference-panel';

interface Props {
  user: any;
  onSendToDraft?: (data: any) => void;
  onSaveToRegistry?: (data: any) => void;
  onSendToDisasterReport?: (data: any) => void;
}

export default function AiScanView({ user, onSendToDraft, onSaveToRegistry, onSendToDisasterReport }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<string>('auto');
  const [hint, setHint] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<AiScanResult | null>(null);
  const [usedModel, setUsedModel] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // AI Cross-Reference State
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  const runCrossRefDetection = async (res: AiScanResult) => {
    setIsDetecting(true);
    try {
      const resp = await fetch('/api/ai/detect-cross-references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc: {
            docNumber: res.docNum,
            title: res.subject,
            from: res.from,
            to: res.to,
            date: res.date,
            ref: res.ref,
            body: res.body
          }
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.result) {
          setDetectionResult(data.result);
        }
      }
    } catch (err) {
      setDetectionResult({
        hasDuplicates: false,
        duplicateSummary: 'ไม่พบหนังสือซ้ำ',
        hasReferences: false,
        referenceSummary: 'ไม่พบหนังสือเดิมที่เกี่ยวข้อง',
        detectedItems: []
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const [scanHistory, setScanHistory] = useState<AiScanResult[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('moi_aiscan_history') || '[]');
    } catch {
      return [];
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setErrorMsg(null);
      setScanResult(null);

      if (selected.type.startsWith('image/')) {
        const url = URL.createObjectURL(selected);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      setErrorMsg(null);
      setScanResult(null);

      if (selected.type.startsWith('image/')) {
        const url = URL.createObjectURL(selected);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const resizeImageBase64 = (base64Data: string, maxWidth: number = 1600, maxHeight: number = 1600): Promise<string> => {
    return new Promise((resolve) => {
      if (!base64Data || !base64Data.startsWith('data:image/')) {
        resolve(base64Data);
        return;
      }
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width <= maxWidth && height <= maxHeight) {
          resolve(base64Data);
          return;
        }

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          resolve(base64Data);
        }
      };
      img.onerror = () => {
        resolve(base64Data);
      };
      img.src = base64Data;
    });
  };

  const base64ToBlob = (base64DataUrl: string): Blob => {
    const parts = base64DataUrl.split(';base64,');
    if (parts.length < 2) {
      const raw = window.atob(base64DataUrl);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      return new Blob([uInt8Array], { type: 'application/octet-stream' });
    }
    const contentType = parts[0].split(':')[1] || 'image/jpeg';
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  };

  const handleScanDoc = async () => {
    if (!file) {
      setErrorMsg('กรุณาเลือกไฟล์ภาพหรือเอกสาร PDF ก่อนทำการสแกน');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        let base64DataUrl = reader.result as string;
        let mimeType = file.type || 'image/jpeg';

        // Compress and resize image first on the client-side to fit within body limits (e.g. Nginx 1MB client_max_body_size)
        // and speed up the API uploading & processing.
        if (file.type.startsWith('image/')) {
          try {
            base64DataUrl = await resizeImageBase64(base64DataUrl);
            mimeType = 'image/jpeg';
          } catch (resizeErr) {
            console.warn('Failed to resize image, sending original:', resizeErr);
          }
        }

        try {
          const settings = JSON.parse(localStorage.getItem('moi_settings') || '{}');
          const savedKey = (settings.geminiApiKey || '').trim();

          const blob = base64ToBlob(base64DataUrl);
          const formData = new FormData();
          formData.append('file', blob, mimeType.startsWith('image/') ? 'scan-document.jpg' : 'scan-document.pdf');
          formData.append('apiKey', savedKey);
          formData.append('outputType', outputType);
          formData.append('hint', hint || '');

          const resp = await fetch('/api/ai-scan', {
            method: 'POST',
            body: formData
          });

          if (!resp.ok) {
            const text = await resp.text();
            let errMsg = `เซิร์ฟเวอร์ตอบกลับผิดพลาด (รหัสสถานะ: ${resp.status})`;
            if (resp.status === 413) {
              errMsg = 'ไฟล์ภาพมีขนาดใหญ่เกินขีดจำกัดของเซิร์ฟเวอร์ (413 Request Entity Too Large) ระบบได้บีบอัดแล้วแต่ยังเกินขีดจำกัดของระบบโฮสติ้งนี้ กรุณาใช้ไฟล์ภาพอื่นหรือลดความละเอียดลง';
            } else if (text && text.includes('<!DOCTYPE')) {
              errMsg = `เซิร์ฟเวอร์ขัดข้อง (รหัสสถานะ: ${resp.status}) โฮสติ้งของท่านอาจไม่พบบริการ API คาดว่าเซิร์ฟเวอร์ Node.js (server.ts) ไม่ได้กำลังรันอยู่ หรือ URL เส้นทางถูกบล็อก กรุณาตั้งค่า Reverse Proxy ไปยังพอร์ต 3000`;
            } else if (text) {
              try {
                const parsed = JSON.parse(text);
                errMsg = parsed.error || errMsg;
              } catch {
                errMsg = text.substring(0, 200);
              }
            }
            throw new Error(errMsg);
          }

          let data: any = {};
          try {
            data = await resp.json();
          } catch {
            throw new Error(`เซิร์ฟเวอร์ตอบกลับด้วยข้อมูลที่ไม่อยู่ในรูปแบบ JSON (รหัสสถานะ: ${resp.status})`);
          }

          if (!data.success) {
            throw new Error(data.error || 'การสแกนเอกสารด้วย AI ล้มเหลว');
          }

          const res: AiScanResult = data.result;
          setScanResult(res);
          setUsedModel(data.usedModel || null);

          // Automatically run AI Duplicate & Cross-Reference Detector against database history
          runCrossRefDetection(res);

          // Save to local scan history
          const updated = [res, ...scanHistory];
          setScanHistory(updated);
          localStorage.setItem('moi_aiscan_history', JSON.stringify(updated));
          fetch('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'AI_SCAN_DRAFT',
              details: `สแกนเอกสารด้วย AI (${data.usedModel || 'AI'}) สำเร็จ: ${res.subject || 'เอกสารสแกน'}`,
              username: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ใช้งาน'
            })
          }).catch(console.error);

        } catch (err: any) {
          let msg = err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
          try {
            if (typeof msg === 'string' && msg.startsWith('{') && msg.endsWith('}')) {
              const parsed = JSON.parse(msg);
              if (parsed.error) msg = typeof parsed.error === 'string' ? parsed.error : parsed.error.message || msg;
            }
          } catch {}

          const lower = String(msg).toLowerCase();
          if (lower.includes('503') || lower.includes('overloaded') || lower.includes('unavailable') || lower.includes('high traffic')) {
            msg = 'ระบบเซิร์ฟเวอร์ AI ของ Google มีปริมาณผู้ใช้งานหนาแน่นชั่วคราว ระบบได้พยายามสลับไปยังโมเดลสำรองแล้ว กรุณากดปุ่ม "ลองสแกนใหม่อีกครั้ง" ด้านล่าง';
          } else if (lower.includes('429') || lower.includes('quota') || lower.includes('rate limit')) {
            msg = 'ระบบ AI มีปริมาณคำขอหนาแน่นชั่วคราว (Rate limit / Quota Exceeded) กรุณารอสักครู่แล้วกดลองใหม่อีกครั้ง';
          }
          setErrorMsg(msg);
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setErrorMsg('ไม่สามารถอ่านไฟล์ที่อัปโหลดได้ กรุณาลองเลือกไฟล์ใหม่อีกครั้ง');
        setLoading(false);
      };

    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการประมวลผลไฟล์');
      setLoading(false);
    }
  };

  const handleSendToDraft = () => {
    if (!scanResult) return;
    if (onSendToDraft) {
      onSendToDraft(scanResult);
    } else {
      alert('โอนย้ายข้อมูลไปยังร่างหนังสือเรียบร้อยแล้ว');
    }
  };

  const handleSaveToOutbox = () => {
    if (!scanResult) return;
    if (onSaveToRegistry) {
      onSaveToRegistry(scanResult);
    }
    alert('บันทึกเอกสารเข้าสู่ระบบทะเบียนเรียบร้อยแล้ว');
  };

  const handleSendToDisasterReport = () => {
    if (!scanResult) return;
    if (onSendToDisasterReport) {
      const prefill = {
        docNumber: scanResult.docNum || '',
        docDate: scanResult.date || '',
        fromPerson: scanResult.from || '',
        toPerson: scanResult.to || '',
        incidentTypes: Array.isArray(scanResult.incidentTypes) ? scanResult.incidentTypes : [],
        incidentTypeOther: scanResult.incidentTypeOther || '',
        severity: scanResult.severity || 'ปานกลาง',
        startDate: scanResult.startDate || '',
        startTime: scanResult.startTime || '',
        endDate: scanResult.endDate || '',
        endTime: scanResult.endTime || '',
        location: scanResult.location || '',
        affectedPeople: scanResult.affectedPeople || '',
        affectedHouseholds: scanResult.affectedHouseholds || '',
        injured: scanResult.injured || '',
        dead: scanResult.dead || '',
        missing: scanResult.missing || '',
        evacuatedPeople: scanResult.evacuatedPeople || '',
        evacuatedHouseholds: scanResult.evacuatedHouseholds || '',
        damageHouses: scanResult.damageHouses || '',
        damageFactories: scanResult.damageFactories || '',
        damageBuildingCost: scanResult.damageBuildingCost || '',
        damageAgricultureCost: scanResult.damageAgricultureCost || '',
        damagePublicCost: scanResult.damagePublicCost || '',
        totalDamageCost: scanResult.totalDamageCost || '',
        mitigation: scanResult.mitigation || scanResult.body || '',
        reporterName: scanResult.reporterName || scanResult.signer || '',
        reporterPosition: scanResult.reporterPosition || scanResult.signerPos || ''
      };
      onSendToDisasterReport(prefill);
    } else {
      alert('ระบบพร้อมส่งข้อมูลแบบรายงานเหตุด่วนสาธารณภัย');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="border-b border-[var(--border-light)] pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-sans font-bold text-[var(--text-primary)]">
              AI สแกนและถอดความเอกสาร
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              ระบบปัญญาประดิษฐ์สแกนภาพหนังสือราชการ ถอดข้อความ และจัดโครงสร้างข้อมูลอัตโนมัติ
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload & Options Panel */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[var(--primary-color)]" /> อัปโหลดเอกสารที่ต้องการสแกน
            </h3>

            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-[var(--border-light)] hover:border-[var(--primary-color)] rounded-xl p-6 text-center bg-[var(--bg-overlay)] hover:bg-[var(--bg-elevated)] transition-all cursor-pointer relative"
            >
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {file ? file.name : 'ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    รองรับไฟล์ภาพ JPG, PNG, WEBP หรือ PDF (ขนาดไม่เกิน 30MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Image Preview */}
            {previewUrl && (
              <div className="relative rounded-lg overflow-hidden border border-[var(--border-light)] max-h-48 bg-black/40 flex items-center justify-center">
                <img src={previewUrl} alt="Document Preview" className="max-h-48 object-contain" />
              </div>
            )}

            {/* Options */}
            <div className="space-y-3 pt-2 border-t border-[var(--border-lighter)]">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  ประเภทปลายทางที่ต้องการแปลง
                </label>
                <select
                  value={outputType}
                  onChange={e => setOutputType(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none cursor-pointer"
                >
                  <option value="auto">🔍 อัตโนมัติ (ให้ AI วิเคราะห์จากประเภทจริง)</option>
                  <option value="หนังสือส่ง">หนังสือส่ง</option>
                  <option value="หนังสือภายใน">หนังสือภายใน</option>
                  <option value="บันทึกข้อความ">บันทึกข้อความ</option>
                  <option value="คำสั่ง">คำสั่ง</option>
                  <option value="ประกาศ">ประกาศ</option>
                  <option value="หนังสือรับรอง">หนังสือรับรอง</option>
                  <option value="หนังสือเวียน (ว.)">หนังสือเวียน (ว.)</option>
                  <option value="แบบรายงานเหตุด่วนสาธารณภัย">แบบรายงานเหตุด่วนสาธารณภัย</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  คำแนะนำเพิ่มเติมแก่ AI (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={hint}
                  onChange={e => setHint(e.target.value)}
                  placeholder="เช่น เน้นถอดเลขที่หนังสือและวันที่ให้ถูกต้อง..."
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-300">ข้อความจากระบบ AI</p>
                    <p className="text-amber-200/90 mt-0.5 leading-relaxed">{errorMsg}</p>
                  </div>
                </div>
                {file && (
                  <button
                    type="button"
                    onClick={handleScanDoc}
                    disabled={loading}
                    className="self-end px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    ลองสแกนใหม่อีกครั้ง
                  </button>
                )}
              </div>
            )}

            {/* Scan Action Button */}
            <button
              onClick={handleScanDoc}
              disabled={loading || !file}
              className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                loading || !file
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> กำลังสแกนและวิเคราะห์ด้วย AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> เริ่มสแกนเอกสารด้วย AI
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scan Result Panel */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6 shadow-sm min-h-[420px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3 mb-4">
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> ผลการวิเคราะห์และถอดข้อความ
                </h3>
                <div className="flex items-center gap-2">
                  {usedModel && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> {usedModel}
                    </span>
                  )}
                  {scanResult?.confidence && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      scanResult.confidence === 'สูง' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      ความแม่นยำ: {scanResult.confidence}
                    </span>
                  )}
                </div>
              </div>

              {!scanResult && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--text-muted)] space-y-3">
                  <FileText className="w-12 h-12 text-[var(--border-light)]" />
                  <div>
                    <p className="text-sm font-medium">ยังไม่มีผลการสแกน</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">อัปโหลดไฟล์เอกสารและกดปุ่มสแกนทางซ้ายมือ</p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-violet-400 space-y-3">
                  <RefreshCw className="w-10 h-10 animate-spin" />
                  <p className="text-sm font-medium">กำลังอ่านและประมวลผลโครงสร้างเอกสารราชการ...</p>
                </div>
              )}

              {scanResult && !loading && (
                <div className="space-y-4 animate-fade-in text-sm">
                  {(scanResult.docType === 'แบบรายงานเหตุด่วนสาธารณภัย' || outputType === 'แบบรายงานเหตุด่วนสาธารณภัย') ? (
                    <div className="space-y-4 border border-rose-500/20 bg-rose-500/5 rounded-xl p-4 animate-fade-in">
                      <div className="flex items-center gap-2 border-b border-rose-500/10 pb-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 animate-pulse" />
                        <div>
                          <span className="font-bold text-rose-400 text-sm">พบข้อมูลแบบรายงานเหตุด่วนสาธารณภัย</span>
                          <span className="text-xs text-[var(--text-muted)] block">สแกนและดึงข้อมูลภัยพิบัติสำเร็จ สามารถตรวจสอบและแก้ไขด้านล่าง</span>
                        </div>
                      </div>

                      {/* Header Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-[var(--bg-overlay)] p-2.5 rounded-lg border border-[var(--border-light)]">
                          <span className="text-xs text-[var(--text-muted)] block">เลขที่หนังสือ:</span>
                          <input
                            type="text"
                            value={scanResult.docNum || ''}
                            onChange={e => setScanResult({ ...scanResult, docNum: e.target.value })}
                            className="w-full bg-transparent font-medium text-[var(--text-primary)] outline-none"
                          />
                        </div>
                        <div className="bg-[var(--bg-overlay)] p-2.5 rounded-lg border border-[var(--border-light)]">
                          <span className="text-xs text-[var(--text-muted)] block">วันที่รายงาน:</span>
                          <input
                            type="text"
                            value={scanResult.date || ''}
                            onChange={e => setScanResult({ ...scanResult, date: e.target.value })}
                            className="w-full bg-transparent font-medium text-[var(--text-primary)] outline-none"
                          />
                        </div>
                        <div className="bg-[var(--bg-overlay)] p-2.5 rounded-lg border border-[var(--border-light)]">
                          <span className="text-xs text-[var(--text-muted)] block">จาก (หน่วยงาน/ผู้ส่ง):</span>
                          <input
                            type="text"
                            value={scanResult.from || ''}
                            onChange={e => setScanResult({ ...scanResult, from: e.target.value })}
                            className="w-full bg-transparent font-medium text-[var(--text-primary)] outline-none"
                          />
                        </div>
                        <div className="bg-[var(--bg-overlay)] p-2.5 rounded-lg border border-[var(--border-light)]">
                          <span className="text-xs text-[var(--text-muted)] block">ถึง (ผู้รับรายงาน):</span>
                          <input
                            type="text"
                            value={scanResult.to || ''}
                            onChange={e => setScanResult({ ...scanResult, to: e.target.value })}
                            className="w-full bg-transparent font-medium text-[var(--text-primary)] outline-none"
                          />
                        </div>
                      </div>

                      {/* Incident Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-[var(--bg-overlay)] p-2.5 rounded-lg border border-[var(--border-light)]">
                          <span className="text-xs text-[var(--text-muted)] block">ประเภทภัย:</span>
                          <input
                            type="text"
                            value={scanResult.incidentTypes?.join(', ') || ''}
                            onChange={e => setScanResult({ ...scanResult, incidentTypes: e.target.value.split(',').map(s => s.trim()) })}
                            className="w-full bg-transparent font-semibold text-rose-400 outline-none"
                            placeholder="เช่น อุทกภัย, วาตภัย"
                          />
                        </div>
                        <div className="bg-[var(--bg-overlay)] p-2.5 rounded-lg border border-[var(--border-light)]">
                          <span className="text-xs text-[var(--text-muted)] block">ความรุนแรง:</span>
                          <select
                            value={scanResult.severity || 'ปานกลาง'}
                            onChange={e => setScanResult({ ...scanResult, severity: e.target.value })}
                            className="w-full bg-transparent font-medium text-[var(--text-primary)] outline-none cursor-pointer"
                          >
                            <option value="เล็กน้อย" className="bg-[var(--bg-surface)]">เล็กน้อย</option>
                            <option value="ปานกลาง" className="bg-[var(--bg-surface)]">ปานกลาง</option>
                            <option value="รุนแรง" className="bg-[var(--bg-surface)]">รุนแรง</option>
                          </select>
                        </div>
                        <div className="bg-[var(--bg-overlay)] p-2.5 rounded-lg border border-[var(--border-light)]">
                          <span className="text-xs text-[var(--text-muted)] block">วันที่เกิดภัย:</span>
                          <input
                            type="text"
                            value={scanResult.startDate || ''}
                            onChange={e => setScanResult({ ...scanResult, startDate: e.target.value })}
                            className="w-full bg-transparent font-medium text-[var(--text-primary)] outline-none"
                          />
                        </div>
                        <div className="bg-[var(--bg-overlay)] p-2.5 rounded-lg border border-[var(--border-light)]">
                          <span className="text-xs text-[var(--text-muted)] block">เวลาที่เกิดภัย:</span>
                          <input
                            type="text"
                            value={scanResult.startTime || ''}
                            onChange={e => setScanResult({ ...scanResult, startTime: e.target.value })}
                            className="w-full bg-transparent font-medium text-[var(--text-primary)] outline-none"
                          />
                        </div>
                      </div>

                      <div className="bg-[var(--bg-overlay)] p-2.5 rounded-lg border border-[var(--border-light)]">
                        <span className="text-xs text-[var(--text-muted)] block">สถานที่เกิดภัยแบบละเอียด:</span>
                        <input
                          type="text"
                          value={scanResult.location || ''}
                          onChange={e => setScanResult({ ...scanResult, location: e.target.value })}
                          className="w-full bg-transparent font-medium text-[var(--text-primary)] outline-none"
                        />
                      </div>

                      {/* Human Toll */}
                      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] p-3 rounded-lg">
                        <span className="text-xs font-bold text-rose-400 block mb-2">จำนวนผู้ประสบภัยและผลกระทบ</span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                          <div className="bg-[var(--bg-overlay)] p-2 rounded-md">
                            <span className="text-[10px] text-[var(--text-muted)] block">ผู้เดือดร้อน (คน):</span>
                            <input
                              type="text"
                              value={scanResult.affectedPeople || ''}
                              onChange={e => setScanResult({ ...scanResult, affectedPeople: e.target.value })}
                              className="w-full bg-transparent font-semibold font-mono text-[var(--text-primary)] outline-none"
                            />
                          </div>
                          <div className="bg-[var(--bg-overlay)] p-2 rounded-md">
                            <span className="text-[10px] text-[var(--text-muted)] block">เดือดร้อน (ครัวเรือน):</span>
                            <input
                              type="text"
                              value={scanResult.affectedHouseholds || ''}
                              onChange={e => setScanResult({ ...scanResult, affectedHouseholds: e.target.value })}
                              className="w-full bg-transparent font-semibold font-mono text-[var(--text-primary)] outline-none"
                            />
                          </div>
                          <div className="bg-[var(--bg-overlay)] p-2 rounded-md">
                            <span className="text-[10px] text-[var(--text-muted)] block text-amber-500 font-bold">บาดเจ็บ (คน):</span>
                            <input
                              type="text"
                              value={scanResult.injured || ''}
                              onChange={e => setScanResult({ ...scanResult, injured: e.target.value })}
                              className="w-full bg-transparent font-semibold font-mono text-amber-500 outline-none"
                            />
                          </div>
                          <div className="bg-[var(--bg-overlay)] p-2 rounded-md">
                            <span className="text-[10px] text-[var(--text-muted)] block text-red-500 font-bold">เสียชีวิต (คน):</span>
                            <input
                              type="text"
                              value={scanResult.dead || ''}
                              onChange={e => setScanResult({ ...scanResult, dead: e.target.value })}
                              className="w-full bg-transparent font-semibold font-mono text-red-500 outline-none"
                            />
                          </div>
                          <div className="bg-[var(--bg-overlay)] p-2 rounded-md">
                            <span className="text-[10px] text-[var(--text-muted)] block text-purple-400 font-bold">สูญหาย (คน):</span>
                            <input
                              type="text"
                              value={scanResult.missing || ''}
                              onChange={e => setScanResult({ ...scanResult, missing: e.target.value })}
                              className="w-full bg-transparent font-semibold font-mono text-purple-400 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Property Damage */}
                      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] p-3 rounded-lg">
                        <span className="text-xs font-bold text-rose-400 block mb-2">ความเสียหายต่อทรัพย์สินและสิ่งก่อสร้าง</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="bg-[var(--bg-overlay)] p-2 rounded-md">
                            <span className="text-[10px] text-[var(--text-muted)] block">บ้านเรือนเสียหาย (หลัง):</span>
                            <input
                              type="text"
                              value={scanResult.damageHouses || ''}
                              onChange={e => setScanResult({ ...scanResult, damageHouses: e.target.value })}
                              className="w-full bg-transparent font-semibold font-mono text-[var(--text-primary)] outline-none"
                            />
                          </div>
                          <div className="bg-[var(--bg-overlay)] p-2 rounded-md">
                            <span className="text-[10px] text-[var(--text-muted)] block">โรงงานเสียหาย (แห่ง):</span>
                            <input
                              type="text"
                              value={scanResult.damageFactories || ''}
                              onChange={e => setScanResult({ ...scanResult, damageFactories: e.target.value })}
                              className="w-full bg-transparent font-semibold font-mono text-[var(--text-primary)] outline-none"
                            />
                          </div>
                          <div className="bg-[var(--bg-overlay)] p-2 rounded-md">
                            <span className="text-[10px] text-[var(--text-muted)] block">รวมมูลค่าเสียหาย (บาท):</span>
                            <input
                              type="text"
                              value={scanResult.totalDamageCost || ''}
                              onChange={e => setScanResult({ ...scanResult, totalDamageCost: e.target.value })}
                              className="w-full bg-transparent font-semibold font-mono text-[var(--text-primary)] outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Mitigation Actions */}
                      <div className="bg-[var(--bg-overlay)] p-2.5 rounded-lg border border-[var(--border-light)]">
                        <span className="text-xs text-[var(--text-muted)] block mb-1">การบรรเทาภัย / การช่วยเหลือเบื้องต้น:</span>
                        <textarea
                          rows={3}
                          value={scanResult.mitigation || ''}
                          onChange={e => setScanResult({ ...scanResult, mitigation: e.target.value })}
                          className="w-full bg-transparent text-[var(--text-primary)] outline-none resize-y text-xs leading-relaxed"
                        />
                      </div>

                      {/* Reporter Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-[var(--bg-overlay)] p-2.5 rounded-lg border border-[var(--border-light)]">
                          <span className="text-xs text-[var(--text-muted)] block">ชื่อผู้รายงาน:</span>
                          <input
                            type="text"
                            value={scanResult.reporterName || ''}
                            onChange={e => setScanResult({ ...scanResult, reporterName: e.target.value })}
                            className="w-full bg-transparent font-medium text-[var(--text-primary)] outline-none"
                          />
                        </div>
                        <div className="bg-[var(--bg-overlay)] p-2.5 rounded-lg border border-[var(--border-light)]">
                          <span className="text-xs text-[var(--text-muted)] block">ตำแหน่งผู้รายงาน:</span>
                          <input
                            type="text"
                            value={scanResult.reporterPosition || ''}
                            onChange={e => setScanResult({ ...scanResult, reporterPosition: e.target.value })}
                            className="w-full bg-transparent font-medium text-[var(--text-primary)] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-[var(--bg-overlay)] p-3 rounded-lg border border-[var(--border-light)]">
                          <span className="text-xs text-[var(--text-muted)] block">ประเภทหนังสือ:</span>
                          <input
                            type="text"
                            value={scanResult.docType || ''}
                            onChange={e => setScanResult({ ...scanResult, docType: e.target.value })}
                            className="w-full bg-transparent font-medium text-[var(--text-primary)] outline-none"
                          />
                        </div>
                        <div className="bg-[var(--bg-overlay)] p-3 rounded-lg border border-[var(--border-light)]">
                          <span className="text-xs text-[var(--text-muted)] block">เลขที่หนังสือ:</span>
                          <input
                            type="text"
                            value={scanResult.docNum || ''}
                            onChange={e => setScanResult({ ...scanResult, docNum: e.target.value })}
                            className="w-full bg-transparent font-mono font-medium text-[var(--text-primary)] outline-none"
                          />
                        </div>
                        <div className="bg-[var(--bg-overlay)] p-3 rounded-lg border border-[var(--border-light)]">
                          <span className="text-xs text-[var(--text-muted)] block">วันที่:</span>
                          <input
                            type="text"
                            value={scanResult.date || ''}
                            onChange={e => setScanResult({ ...scanResult, date: e.target.value })}
                            className="w-full bg-transparent font-medium text-[var(--text-primary)] outline-none"
                          />
                        </div>
                        <div className="bg-[var(--bg-overlay)] p-3 rounded-lg border border-[var(--border-light)]">
                          <span className="text-xs text-[var(--text-muted)] block">เรียน / ถึง:</span>
                          <input
                            type="text"
                            value={scanResult.to || ''}
                            onChange={e => setScanResult({ ...scanResult, to: e.target.value })}
                            className="w-full bg-transparent font-medium text-[var(--text-primary)] outline-none"
                          />
                        </div>
                      </div>

                      <div className="bg-[var(--bg-overlay)] p-3 rounded-lg border border-[var(--border-light)]">
                        <span className="text-xs text-[var(--text-muted)] block">เรื่อง:</span>
                        <input
                          type="text"
                          value={scanResult.subject || ''}
                          onChange={e => setScanResult({ ...scanResult, subject: e.target.value })}
                          className="w-full bg-transparent font-semibold text-[var(--text-primary)] outline-none"
                        />
                      </div>

                      <div className="bg-[var(--bg-overlay)] p-3 rounded-lg border border-[var(--border-light)]">
                        <span className="text-xs text-[var(--text-muted)] block mb-1">เนื้อหาสาระสำคัญ:</span>
                        <textarea
                          rows={5}
                          value={scanResult.body || ''}
                          onChange={e => setScanResult({ ...scanResult, body: e.target.value })}
                          className="w-full bg-transparent text-[var(--text-primary)] outline-none resize-y text-xs leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-[var(--bg-overlay)] p-3 rounded-lg border border-[var(--border-light)]">
                          <span className="text-xs text-[var(--text-muted)] block">ผู้ลงนาม:</span>
                          <input
                            type="text"
                            value={scanResult.signer || ''}
                            onChange={e => setScanResult({ ...scanResult, signer: e.target.value })}
                            className="w-full bg-transparent font-medium text-[var(--text-primary)] outline-none"
                          />
                        </div>
                        <div className="bg-[var(--bg-overlay)] p-3 rounded-lg border border-[var(--border-light)]">
                          <span className="text-xs text-[var(--text-muted)] block">ตำแหน่งผู้ลงนาม:</span>
                          <input
                            type="text"
                            value={scanResult.signerPos || ''}
                            onChange={e => setScanResult({ ...scanResult, signerPos: e.target.value })}
                            className="w-full bg-transparent font-medium text-[var(--text-primary)] outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* AI Cross-Reference & Duplicate Panel */}
              {scanResult && (
                <div className="mt-5">
                  <AiCrossReferencePanel
                    result={detectionResult}
                    isLoading={isDetecting}
                    onRunDetection={() => scanResult && runCrossRefDetection(scanResult)}
                    onAttachRef={(item) => {
                      const refText = `อ้างถึง ${item.docNumber ? `หนังสือเลขที่ ${item.docNumber}` : item.title}`;
                      setScanResult(prev => prev ? { ...prev, ref: prev.ref ? `${prev.ref} (${refText})` : refText } : null);
                      alert(`แนบเรื่องเดิม "${refText}" ลงในช่องเอกสารอ้างอิงของสแกนเรียบร้อยแล้ว`);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Action Transfer Buttons */}
            {scanResult && !loading && (
              <div className="pt-4 border-t border-[var(--border-lighter)] flex flex-wrap gap-3 justify-end mt-4">
                {(scanResult.docType === 'แบบรายงานเหตุด่วนสาธารณภัย' || outputType === 'แบบรายงานเหตุด่วนสาธารณภัย') && onSendToDisasterReport && (
                  <button
                    onClick={handleSendToDisasterReport}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm animate-pulse-subtle"
                  >
                    <AlertTriangle className="w-4 h-4" /> ส่งไปรายงานเหตุด่วน
                  </button>
                )}
                <button
                  onClick={handleSendToDraft}
                  className="px-4 py-2 bg-[var(--primary-color)] text-white text-xs font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Send className="w-4 h-4" /> ส่งไปร่างหนังสือ
                </button>
                <button
                  onClick={handleSaveToOutbox}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" /> บันทึกเข้าสารบรรณ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
