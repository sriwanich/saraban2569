import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Sparkles, Pipette, RefreshCw, Wand2, Sliders, Layers, Info } from 'lucide-react';

interface ImageBackgroundRemovalModalProps {
  imageUrl: string;
  onClose: () => void;
  onApply: (processedDataUrl: string) => void;
}

export function ImageBackgroundRemovalModal({
  imageUrl,
  onClose,
  onApply,
}: ImageBackgroundRemovalModalProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'chroma'>('ai');
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Chroma Key state
  const [tolerance, setTolerance] = useState<number>(30);
  const [targetColor, setTargetColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [targetHex, setTargetHex] = useState<string>('#ffffff');
  const [autoCorner, setAutoCorner] = useState<boolean>(true);
  const [smoothEdges, setSmoothEdges] = useState<boolean>(true);

  // Result images
  const [aiResultUrl, setAiResultUrl] = useState<string | null>(null);
  const [chromaResultUrl, setChromaResultUrl] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Auto remove background via Gemini AI when clicking "AI Remove" button
  const handleRemoveBgAi = async () => {
    setIsProcessingAi(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/remove-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageUrl }),
      });
      const data = await res.json();
      if (res.ok && data.transparentImage) {
        setAiResultUrl(data.transparentImage);
        setActiveTab('ai');
      } else {
        setAiError(data.error || 'AI ไม่สามารถแยกพื้นหลังได้โดยอัตโนมัติ คุณสามารถใช้โหมดเลือกสีลบพื้นหลังแทนได้');
        setActiveTab('chroma');
      }
    } catch (err: any) {
      console.error(err);
      setAiError('เกิดข้อผิดพลาดในการเชื่อมต่อ AI Server');
      setActiveTab('chroma');
    } finally {
      setIsProcessingAi(false);
    }
  };

  // Helper for Chroma Key Processing on Canvas
  const processChromaKey = () => {
    if (!imgRef.current || !imageLoaded) return;
    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Detect target color if autoCorner is enabled
    let keyR = 255, keyG = 255, keyB = 255;
    if (autoCorner && !targetColor) {
      const corners = [
        0,
        (canvas.width - 1) * 4,
        (canvas.height - 1) * canvas.width * 4,
        ((canvas.height - 1) * canvas.width + (canvas.width - 1)) * 4
      ];
      let rSum = 0, gSum = 0, bSum = 0;
      corners.forEach(idx => {
        rSum += data[idx];
        gSum += data[idx + 1];
        bSum += data[idx + 2];
      });
      keyR = Math.round(rSum / 4);
      keyG = Math.round(gSum / 4);
      keyB = Math.round(bSum / 4);
    } else if (targetColor) {
      keyR = targetColor.r;
      keyG = targetColor.g;
      keyB = targetColor.b;
    }

    const maxDist = (tolerance / 100) * 441.67;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const dist = Math.sqrt((r - keyR) ** 2 + (g - keyG) ** 2 + (b - keyB) ** 2);

      if (dist <= maxDist) {
        if (smoothEdges && dist > maxDist * 0.7) {
          const alphaFactor = (dist - maxDist * 0.7) / (maxDist * 0.3);
          data[i + 3] = Math.round(255 * alphaFactor);
        } else {
          data[i + 3] = 0;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    setChromaResultUrl(canvas.toDataURL('image/png'));
  };

  useEffect(() => {
    if (imageLoaded) {
      processChromaKey();
    }
  }, [imageLoaded, tolerance, targetColor, autoCorner, smoothEdges]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * (imgRef.current.naturalWidth || imgRef.current.width));
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * (imgRef.current.naturalHeight || imgRef.current.height));

    const canvas = document.createElement('canvas');
    canvas.width = imgRef.current.naturalWidth || imgRef.current.width;
    canvas.height = imgRef.current.naturalHeight || imgRef.current.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imgRef.current, 0, 0);
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const r = pixel[0], g = pixel[1], b = pixel[2];
    setTargetColor({ r, g, b });
    setTargetHex(`#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`);
    setAutoCorner(false);
  };

  const currentPreviewUrl = activeTab === 'ai' && aiResultUrl ? aiResultUrl : (chromaResultUrl || imageUrl);

  const handleApply = () => {
    if (currentPreviewUrl) {
      onApply(currentPreviewUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-prompt">
                ลบพื้นหลังวัตถุ (AI Background Remover)
              </h2>
              <p className="text-xs text-slate-500">
                ลบพื้นหลังรูปภาพด้วย AI อัจฉริยะ หรือลบตามโทนสีด้วย Smart Chroma Key
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Controls Bar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'ai'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>ลบอัตโนมัติด้วย AI</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('chroma')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'chroma'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span>ลบตามโทนสี (Chroma Key)</span>
            </button>
          </div>

          {activeTab === 'ai' ? (
            <button
              type="button"
              onClick={handleRemoveBgAi}
              disabled={isProcessingAi}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isProcessingAi ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังลบด้วย AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span>เริ่มการลบพื้นหลัง AI</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold flex items-center gap-1">
                <Pipette className="w-3.5 h-3.5 text-blue-500" /> คลิกบนภาพเพื่อเลือกสีที่จะลบ
              </span>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="p-6 bg-slate-50 dark:bg-slate-950/60 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Left / Center: Preview Container with Checkerboard Background */}
          <div className="md:col-span-2 flex flex-col items-center justify-center space-y-3">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>ตัวอย่างผลลัพธ์ (Transparent PNG Checkerboard)</span>
            </div>

            <div 
              className="relative rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-inner max-h-[420px] max-w-full flex items-center justify-center p-2"
              style={{
                backgroundImage: `linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)`,
                backgroundSize: `20px 20px`,
                backgroundPosition: `0 0, 0 10px, 10px -10px, -10px 0px`
              }}
            >
              {/* Hidden Original Image for Canvas Processing */}
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Original Source"
                onLoad={handleImageLoad}
                className="hidden"
                crossOrigin="anonymous"
              />

              {/* Main Preview Image */}
              <img
                src={currentPreviewUrl}
                alt="Background Removal Preview"
                onClick={activeTab === 'chroma' ? handleCanvasClick : undefined}
                className={`max-h-[380px] w-auto object-contain block select-none ${
                  activeTab === 'chroma' ? 'cursor-crosshair' : ''
                }`}
              />

              {/* AI Processing Overlay */}
              {isProcessingAi && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3 p-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border-2 border-blue-400 flex items-center justify-center animate-bounce">
                    <Sparkles className="w-6 h-6 text-yellow-300 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold">AI กำลังประมวลผลแยกวัตถุออกจากพื้นหลัง...</p>
                    <p className="text-xs text-slate-300">ระบบใช้ Gemini Vision AI สกัดแยกองค์ประกอบอย่างละเอียด</p>
                  </div>
                </div>
              )}
            </div>

            {aiError && activeTab === 'ai' && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}
          </div>

          {/* Right Panel: Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-sm">
            {activeTab === 'ai' ? (
              <div className="space-y-4 text-left">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  คำแนะนำระบบ AI ลบพื้นหลัง
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ระบบจะวิเคราะห์โครงสร้างภาพเพื่อคัดแยกบุคคล วัตถุ สินค้า หรือไอคอนออกจากพื้นหลัง และแปลงส่วนที่ไม่ใช่ตัวหลักให้โปร่งใส (Transparent)
                </p>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <button
                    type="button"
                    onClick={handleRemoveBgAi}
                    disabled={isProcessingAi}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${isProcessingAi ? 'animate-spin' : ''}`} />
                    <span>{aiResultUrl ? 'ประมวลผลซ้ำด้วย AI' : 'กดเริ่มลบพื้นหลัง AI'}</span>
                  </button>
                  {aiResultUrl && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 text-center font-semibold">
                      ✓ AI แยกพื้นหลังสำเร็จเรียบร้อย!
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-500" />
                  การตั้งค่า Smart Chroma Key
                </h3>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    สีที่ต้องการลบออก (Target Color)
                  </label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl border-2 border-slate-300 dark:border-slate-600 shadow-sm shrink-0"
                      style={{ backgroundColor: targetHex }}
                    />
                    <div className="flex-1">
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block">
                        {targetHex.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {autoCorner ? 'ตรวจจับจาก 4 มุมภาพอัตโนมัติ' : 'เลือกจากตำแหน่งที่คลิก'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>ความกว้างช่วงสี (Tolerance)</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{tolerance}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="90"
                    value={tolerance}
                    onChange={(e) => setTolerance(parseInt(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>แคบ (เฉพาะสีเป๊ะๆ)</span>
                    <span>กว้าง (ครอบคลุมเฉดสีใกล้เคียง)</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smoothEdges}
                      onChange={(e) => setSmoothEdges(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>ปรับขอบเนียนนุ่ม (Smooth Alpha Feather)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCorner}
                      onChange={(e) => {
                        setAutoCorner(e.target.checked);
                        if (e.target.checked) setTargetColor(null);
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>ตรวจจับสีพื้นหลังที่มุมภาพอัตโนมัติ</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
          >
            ยกเลิก
          </button>
          
          <button
            type="button"
            onClick={handleApply}
            disabled={isProcessingAi}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>นำไปใช้บน Infographic (Apply)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
