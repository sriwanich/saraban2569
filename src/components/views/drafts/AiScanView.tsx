import React, { useState } from 'react';
import { 
  Sparkles, UploadCloud, FileText, CheckCircle2, AlertCircle, 
  Send, Save, RefreshCw, Eye, Trash2, ArrowRight, Layers
} from 'lucide-react';
import { AiScanResult } from './draftData';

interface Props {
  user: any;
  onSendToDraft?: (data: any) => void;
  onSaveToRegistry?: (data: any) => void;
}

export default function AiScanView({ user, onSendToDraft, onSaveToRegistry }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<string>('auto');
  const [hint, setHint] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<AiScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        const base64Str = (reader.result as string).split(',')[1];
        const mimeType = file.type || 'image/jpeg';

        try {
          const resp = await fetch('/api/ai-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64: base64Str,
              mimeType,
              outputType,
              hint
            })
          });

          const data = await resp.json();
          if (!resp.ok || !data.success) {
            throw new Error(data.error || 'การสแกนเอกสารด้วย AI ล้มเหลว');
          }

          const res: AiScanResult = data.result;
          setScanResult(res);

          // Save to local scan history
          const updated = [res, ...scanHistory];
          setScanHistory(updated);
          localStorage.setItem('moi_aiscan_history', JSON.stringify(updated));

        } catch (err: any) {
          setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setErrorMsg('ไม่สามารถอ่านไฟล์ที่อัปโหลดได้');
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="border-b border-[var(--border-light)] pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-noto-serif-thai font-bold text-[var(--text-primary)]">
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
                  <option value="หนังสือภายนอก">หนังสือภายนอก</option>
                  <option value="หนังสือภายใน">หนังสือภายใน</option>
                  <option value="บันทึกข้อความ">บันทึกข้อความ</option>
                  <option value="คำสั่ง">คำสั่ง</option>
                  <option value="ประกาศ">ประกาศ</option>
                  <option value="หนังสือรับรอง">หนังสือรับรอง</option>
                  <option value="หนังสือเวียน (ว.)">หนังสือเวียน (ว.)</option>
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
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
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
                {scanResult?.confidence && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    scanResult.confidence === 'สูง' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    ความแม่นยำ: {scanResult.confidence}
                  </span>
                )}
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
                </div>
              )}
            </div>

            {/* Action Transfer Buttons */}
            {scanResult && !loading && (
              <div className="pt-4 border-t border-[var(--border-lighter)] flex flex-wrap gap-3 justify-end mt-4">
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
