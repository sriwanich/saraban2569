import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Wand2, ShieldCheck, AlertTriangle, CheckCircle2, 
  X, RefreshCw, Move, Maximize2, FileText, Download, 
  ChevronRight, Layers, Cpu, Scan, Check, Info, FileCheck,
  Upload, FileUp, Eye
} from 'lucide-react';
import { DocumentItem } from '../types';

interface AiSpot {
  id: string;
  name: string;
  badge: string;
  isAiRecommended: boolean;
  x: number;
  y: number;
  top: number;
  left: number;
  width: number;
  height: number;
  xPercent: number;
  yPercent: number;
  confidence: number;
  reason: string;
  isSafe: boolean;
  collisionRisk: 'none' | 'low' | 'high';
}

interface OccupiedZone {
  id: string;
  label: string;
  top: number;
  left: number;
  width: number;
  height: number;
  pdfY: number;
  pdfX: number;
}

interface AiStampLayoutResponse {
  success: boolean;
  documentId: string;
  docTitle?: string;
  docNumber?: string;
  hasRealFile?: boolean;
  realFileName?: string;
  realFileUrl?: string;
  realFileType?: string;
  fileSizeBytes?: number;
  pagePreviewUrl?: string | null;
  availableAttachments?: Array<{ name: string; url: string; type: string; size?: number } | string>;
  pageSize: { width: number; height: number };
  pageCount: number;
  targetPageIndex: number;
  density: 'sparse' | 'medium' | 'dense';
  optimalSize: number;
  occupiedZones: OccupiedZone[];
  recommendedSpotId: string;
  spots: AiSpot[];
  aiExplanation: string;
  detectedRealContentSummary?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem;
  qrDataUrl: string;
  currentUser: any;
  onStampSuccess?: (result: any) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function AiDocumentStamperModal({
  isOpen,
  onClose,
  document: doc,
  qrDataUrl,
  currentUser,
  onStampSuccess,
  showToast
}: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [layoutData, setLayoutData] = useState<AiStampLayoutResponse | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState<string>('signature-left');
  const [stampSize, setStampSize] = useState<number>(85);
  const [pinPosition, setPinPosition] = useState<{ xPercent: number; yPercent: number }>({
    xPercent: 12.6,
    yPercent: 62.0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [showOccupiedZones, setShowOccupiedZones] = useState(true);
  const [addCaption, setAddCaption] = useState(true);
  const [isStamping, setIsStamping] = useState(false);
  const [stampResult, setStampResult] = useState<any | null>(null);

  // Real File Analysis States
  const [selectedFileUrl, setSelectedFileUrl] = useState<string>('');
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'pdf'>('canvas');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Fetch AI Layout Analysis on real file
  const runAiLayoutAnalysis = async (targetFileUrl?: string, pageIdx?: number) => {
    if (!doc?.id) return;
    setIsAnalyzing(true);
    setStampResult(null);

    const activeFileUrl = targetFileUrl !== undefined ? targetFileUrl : selectedFileUrl;
    const activePage = pageIdx !== undefined ? pageIdx : selectedPageIndex;

    try {
      const res = await fetch(`/api/documents/${doc.id}/ai-stamp-layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrSizePreference: stampSize,
          targetFileUrl: activeFileUrl || undefined,
          targetPageIndex: activePage
        })
      });

      if (!res.ok) {
        throw new Error('ไม่สามารถวิเคราะห์ตำแหน่งประทับด้วย AI ได้');
      }

      const data: AiStampLayoutResponse = await res.json();
      setLayoutData(data);
      if (data.realFileUrl) {
        setSelectedFileUrl(data.realFileUrl);
      }
      setSelectedPageIndex(data.targetPageIndex || 0);

      // Find recommended spot
      const rec = data.spots?.find(s => s.id === data.recommendedSpotId) || data.spots?.[0];
      if (rec) {
        setSelectedSpotId(rec.id);
        setStampSize(rec.width || data.optimalSize || 85);
        setPinPosition({
          xPercent: rec.xPercent,
          yPercent: rec.yPercent
        });
      }
    } catch (err: any) {
      console.error('AI Layout Error:', err);
      showToast('error', err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์ด้วย AI');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (isOpen && doc?.id) {
      setSelectedFileUrl('');
      setSelectedPageIndex(0);
      runAiLayoutAnalysis('', 0);
    }
  }, [isOpen, doc?.id]);

  // Handle direct file upload to document record
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !doc?.id) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/documents/${doc.id}/upload-attachment`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'อัปโหลดไฟล์ไม่สำเร็จ');
      }

      showToast('success', `อัปโหลดไฟล์ [${data.fileName}] สำเร็จ กำลังส่งให้ AI วิเคราะห์ไฟล์จริง...`);
      setSelectedFileUrl(data.fileUrl);
      setSelectedPageIndex(0);
      await runAiLayoutAnalysis(data.fileUrl, 0);
    } catch (err: any) {
      console.error('File upload error:', err);
      showToast('error', err.message || 'ไม่สามารถอัปโหลดไฟล์ได้');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  // Collision detector based on current pinPosition & size
  const checkCollision = () => {
    if (!layoutData?.occupiedZones) return { isSafe: true, risk: 'none', label: 'ปลอดภัย: อยู่ในพื้นที่ว่าง 100%' };

    const pw = layoutData.pageSize.width || 595.28;
    const ph = layoutData.pageSize.height || 841.89;

    const currentLeft = (pinPosition.xPercent / 100) * pw;
    const currentTop = (pinPosition.yPercent / 100) * ph;
    const currentRight = currentLeft + stampSize;
    const currentBottom = currentTop + stampSize;

    for (const zone of layoutData.occupiedZones) {
      const zLeft = zone.left;
      const zTop = zone.top;
      const zRight = zone.left + zone.width;
      const zBottom = zone.top + zone.height;

      // Overlap check with padding 10
      const overlap = !(
        currentRight < zLeft - 5 ||
        currentLeft > zRight + 5 ||
        currentBottom < zTop - 5 ||
        currentTop > zBottom + 5
      );

      if (overlap) {
        return {
          isSafe: false,
          risk: 'high',
          label: `คำเตือน: ตำแหน่งนี้ทับหรือใกล้เคียงกับ '${zone.label}'`
        };
      }
    }

    return {
      isSafe: true,
      risk: 'none',
      label: 'ปลอดภัย 100%: อยู่ในพื้นที่ว่าง ไม่ทับตัวหนังสือหรือตราทางการ'
    };
  };

  const collisionStatus = checkCollision();

  // Select spot preset
  const handleSelectSpot = (spot: AiSpot) => {
    setSelectedSpotId(spot.id);
    setStampSize(spot.width);
    setPinPosition({
      xPercent: spot.xPercent,
      yPercent: spot.yPercent
    });
  };

  // Canvas click to reposition
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pw = layoutData?.pageSize.width || 595.28;
    const ph = layoutData?.pageSize.height || 841.89;

    // Convert to percentage, offset by half stamp
    const stampPercentW = (stampSize / pw) * 100;
    const stampPercentH = (stampSize / ph) * 100;

    const xPercent = Math.max(2, Math.min(98 - stampPercentW, (clickX / rect.width) * 100 - stampPercentW / 2));
    const yPercent = Math.max(2, Math.min(98 - stampPercentH, (clickY / rect.height) * 100 - stampPercentH / 2));

    setPinPosition({ xPercent, yPercent });
    setSelectedSpotId('custom');
  };

  // Submit stamp to server
  const handleConfirmStamp = async () => {
    if (!doc?.id || !qrDataUrl) {
      showToast('error', 'ไม่พบข้อมูล QR Code หรือเอกสาร');
      return;
    }

    setIsStamping(true);
    try {
      const pw = layoutData?.pageSize.width || 595.28;
      const ph = layoutData?.pageSize.height || 841.89;

      const clientX = (pinPosition.xPercent / 100) * pw;
      const clientY = (pinPosition.yPercent / 100) * ph;

      const activeSpot = layoutData?.spots.find(s => s.id === selectedSpotId);
      const spotLabel = activeSpot ? activeSpot.name : 'ตำแหน่งระบุเอง (Custom Drag)';

      const res = await fetch(`/api/documents/${doc.id}/stamp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrCodeImage: qrDataUrl,
          stampedBy: currentUser?.username || currentUser?.firstName || 'ผู้ดูแลระบบ',
          x: clientX,
          y: clientY,
          width: stampSize,
          height: stampSize,
          pageIndex: selectedPageIndex,
          coordinateOrigin: 'top-left',
          addVerificationCaption: addCaption,
          aiSpotName: spotLabel,
          targetFileUrl: selectedFileUrl || layoutData?.realFileUrl
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการประทับตรา');
      }

      setStampResult(data);
      showToast('success', data.message || 'ประทับตรา QR Code ด้วย AI เรียบร้อยแล้ว!');
      if (onStampSuccess) {
        onStampSuccess(data);
      }
    } catch (err: any) {
      console.error('Stamping failed:', err);
      showToast('error', err.message || 'ไม่สามารถประทับตราลงหนังสือได้');
    } finally {
      setIsStamping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Hidden File Input for uploading real files */}
        <input 
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf,image/*"
          onChange={handleUploadFile}
          className="hidden"
        />

        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  ระบบ AI ช่วยจัดวางและประทับตราลงหนังสือ EDMS (ดึงไฟล์จริงมาวิเคราะห์)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  AI Auto-Fit
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Anti-Collision
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ดึงไฟล์จริงมาเรนเดอร์และวิเคราะห์ด้วย AI เพื่อหาพื้นที่ว่างและประทับตราลงในเอกสารจริงโดยไม่ทับตัวหนังสือ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Interactive Document Canvas Preview */}
          <div className="lg:col-span-7 flex flex-col items-center space-y-3">
            
            {/* File & Page Navigation Toolbar */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {layoutData?.realFileName || 'เอกสารราชการ EDMS'}
                </span>
                {layoutData?.hasRealFile && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    ไฟล์จริง / ไฟล์แนบ
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Page Selector if multi-page */}
                {layoutData?.pageCount && layoutData.pageCount > 1 && (
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-300 dark:border-slate-700">
                    <span className="text-[11px] px-1 text-slate-500">หน้า:</span>
                    <select
                      value={selectedPageIndex}
                      onChange={(e) => {
                        const newPage = Number(e.target.value);
                        setSelectedPageIndex(newPage);
                        runAiLayoutAnalysis(selectedFileUrl, newPage);
                      }}
                      className="bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold rounded px-1.5 py-0.5 border border-slate-200 dark:border-slate-600"
                    >
                      {Array.from({ length: layoutData.pageCount }, (_, i) => (
                        <option key={i} value={i}>
                          หน้า {i + 1} / {layoutData.pageCount}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Upload New Real File Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isAnalyzing}
                  className="px-2.5 py-1 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-semibold hover:bg-blue-100 transition-all flex items-center gap-1"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดไฟล์'}</span>
                </button>

                {/* Toggle Occupied Zones Button */}
                <button
                  type="button"
                  onClick={() => setShowOccupiedZones(!showOccupiedZones)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] transition-all flex items-center gap-1.5 ${
                    showOccupiedZones 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold' 
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{showOccupiedZones ? 'ซ่อนโซนข้อความ' : 'แสดงโซน AI'}</span>
                </button>
              </div>
            </div>

            {/* Attachment Selector if multiple attachments exist */}
            {layoutData?.availableAttachments && layoutData.availableAttachments.length > 0 && (
              <div className="w-full flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200 dark:border-amber-800 text-xs">
                <span className="font-bold text-amber-800 dark:text-amber-300 shrink-0">เลือกไฟล์แนบเอกสาร:</span>
                <select
                  value={selectedFileUrl || layoutData?.realFileUrl || ''}
                  onChange={(e) => {
                    const url = e.target.value;
                    setSelectedFileUrl(url);
                    setSelectedPageIndex(0);
                    runAiLayoutAnalysis(url, 0);
                  }}
                  className="flex-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded px-2 py-1 border border-amber-300 dark:border-amber-700 truncate"
                >
                  {layoutData.availableAttachments.map((att, idx) => {
                    const isObj = typeof att === 'object' && att !== null;
                    const url = isObj ? (att as any).url : att;
                    const name = isObj ? (att as any).name : url.split('/').pop();
                    const type = isObj ? (att as any).type : 'FILE';
                    const size = isObj ? (att as any).size : undefined;
                    return (
                      <option key={idx} value={url}>
                        {name} ({type.toUpperCase()}{size ? `, ${(size / 1024).toFixed(1)} KB` : ''})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* View Mode Toggle Buttons */}
            <div className="w-full flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode('canvas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'canvas'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>AI Canvas (จัดวางตำแหน่งตรา)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('pdf')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'pdf'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>ดูไฟล์ PDF จริง (PDF Viewer)</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-500 px-2">
                {viewMode === 'canvas' ? 'โหมด AI วิเคราะห์พื้นที่ว่าง' : 'โหมดแสดงไฟล์ PDF ต้นฉบับ'}
              </span>
            </div>

            {/* A4 Sheet Container or PDF Viewer */}
            {viewMode === 'pdf' ? (
              <div className="w-full max-w-[420px] aspect-[1/1.414] bg-white rounded-2xl shadow-xl border border-slate-300 dark:border-slate-700 overflow-hidden flex flex-col">
                <iframe
                  src={`${layoutData?.realFileUrl || selectedFileUrl}#page=${selectedPageIndex + 1}&view=FitH`}
                  title="PDF Viewer"
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
            <div 
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="relative w-full max-w-[420px] aspect-[1/1.414] bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-300 dark:border-slate-700 overflow-hidden cursor-crosshair select-none p-6 flex flex-col justify-between"
              style={{
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)'
              }}
            >
              {/* If real page JPEG thumbnail preview is available from Puppeteer */}
              {layoutData?.pagePreviewUrl ? (
                <div className="absolute inset-0 z-0 bg-white flex items-center justify-center overflow-hidden">
                  <img 
                    src={layoutData.pagePreviewUrl} 
                    alt="Real PDF Page Preview" 
                    className="w-full h-full object-contain pointer-events-none select-none" 
                  />
                </div>
              ) : (
                /* Document Fallback Representation (Garuda & Official fields) */
                <>
                  <div className="space-y-3 z-0">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 flex items-center justify-center text-amber-700 font-bold text-lg bg-amber-50 rounded-full border border-amber-200 shadow-xs">
                        ครุฑ
                      </div>
                    </div>
                    <div className="text-[9px] text-slate-700 space-y-1 border-b border-slate-200 pb-2">
                      <div className="flex justify-between font-bold">
                        <span>ที่: {doc.docNumber || 'รย 0021/ว 1092'}</span>
                        <span>ส่วนราชการ: {doc.department || 'สำนักงาน ปภ. จังหวัดระยอง'}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>ถึง: {doc.to || 'หัวหน้าส่วนราชการทุกหน่วยงาน'}</span>
                        <span>วันที่: {doc.date || '18 กันยายน 2569'}</span>
                      </div>
                      <div className="font-semibold text-slate-800 line-clamp-1 pt-0.5">
                        เรื่อง: {doc.title || 'การบริหารจัดการเอกสารสารบรรณอิเล็กทรอนิกส์'}
                      </div>
                    </div>
                    <div className="text-[8px] text-slate-600 leading-relaxed space-y-1.5 pt-1 text-justify">
                      <p className="indent-4">
                        ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. ๒๕๒๖ และที่แก้ไขเพิ่มเติม เพื่อให้การปฏิบัติงานด้านสารบรรณอิเล็กทรอนิกส์มีความคล่องตัว ปลอดภัย และมีมาตรฐานการตรวจสอบที่น่าเชื่อถือ
                      </p>
                      <p className="indent-4 line-clamp-3">
                        {doc.content || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้นำระบบคิวอาร์โค้ดอัจฉริยะ (Smart QR Verification) มาประทับเพื่อเป็นหลักฐานยืนยันความถูกต้องของหนังสือราชการและป้องกันการแก้ไขดัดแปลง'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100 z-0">
                    <div className="flex justify-end pr-2">
                      <div className="text-center space-y-1">
                        <div className="h-5 flex items-center justify-center text-[8px] italic text-slate-400 font-serif">
                          ( ลายมือชื่ออิเล็กทรอนิกส์ )
                        </div>
                        <div className="text-[8.5px] font-bold text-slate-800">
                          ( นายอดิศร วรเวทย์ )
                        </div>
                        <div className="text-[7.5px] text-slate-500">
                          หัวหน้าสำนักงาน ปภ. จังหวัดระยอง
                        </div>
                      </div>
                    </div>
                    <div className="text-[7px] text-slate-400 flex justify-between border-t border-slate-100 pt-1">
                      <span>กลุ่มงานยุทธศาสตร์และการจัดการ โทร. 038-694-119</span>
                      <span>ระบบสารบรรณอิเล็กทรอนิกส์ EDMS</span>
                    </div>
                  </div>
                </>
              )}

              {/* Laser Scanning Animation when Analyzing */}
              {isAnalyzing && (
                <div className="absolute inset-0 z-30 pointer-events-none bg-blue-500/5 overflow-hidden">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_#3b82f6] animate-[scan_2s_ease-in-out_infinite]" />
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-blue-500/30">
                      <Cpu className="w-6 h-6 text-blue-600 animate-spin" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        AI กำลังวิเคราะห์พื้นที่ว่างจากไฟล์จริง...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Occupied Zones Overlay */}
              {showOccupiedZones && layoutData?.occupiedZones?.map((zone) => {
                const pw = layoutData.pageSize.width || 595.28;
                const ph = layoutData.pageSize.height || 841.89;
                const topPct = (zone.top / ph) * 100;
                const leftPct = (zone.left / pw) * 100;
                const widthPct = (zone.width / pw) * 100;
                const heightPct = (zone.height / ph) * 100;

                return (
                  <div
                    key={zone.id}
                    className="absolute border border-dashed border-red-400/70 bg-red-500/10 rounded pointer-events-none z-10 flex items-start justify-start p-0.5"
                    style={{
                      top: `${topPct}%`,
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`
                    }}
                  >
                    <span className="text-[7px] text-red-700 font-mono bg-white/90 px-1 rounded shadow-xs line-clamp-1">
                      {zone.label}
                    </span>
                  </div>
                );
              })}

              {/* Active QR Stamp Pin on Canvas */}
              <div
                className="absolute z-20 cursor-move transition-all"
                style={{
                  top: `${pinPosition.yPercent}%`,
                  left: `${pinPosition.xPercent}%`,
                  width: `${(stampSize / (layoutData?.pageSize.width || 595.28)) * 100}%`,
                  aspectRatio: '1/1'
                }}
              >
                <div className={`w-full h-full p-1 bg-white rounded-lg shadow-lg border-2 flex flex-col items-center justify-center relative group ${
                  collisionStatus.isSafe ? 'border-emerald-500 shadow-emerald-500/20' : 'border-rose-500 shadow-rose-500/20'
                }`}>
                  {/* Badge */}
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap shadow-xs flex items-center gap-1 ${
                    collisionStatus.isSafe ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {collisionStatus.isSafe ? <Check className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                    <span>{collisionStatus.isSafe ? 'จุดปลอดภัย' : 'เสี่ยงทับ'}</span>
                  </div>

                  {/* QR Image */}
                  <img src={qrDataUrl} alt="QR Stamp" className="w-full h-full object-contain rounded" />

                  {/* Caption */}
                  {addCaption && (
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-1 bg-slate-900 text-white text-[6.5px] font-mono rounded whitespace-nowrap">
                      EDMS {doc.docNumber || 'VERIFY'}
                    </div>
                  )}

                  {/* Drag Handle Indicator */}
                  <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors flex items-center justify-center pointer-events-none">
                    <Move className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 drop-shadow" />
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Real-time Collision Status Bar */}
            <div className={`w-full max-w-[420px] p-3 rounded-2xl border flex items-center gap-2.5 text-xs transition-all ${
              collisionStatus.isSafe 
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300' 
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
            }`}>
              {collisionStatus.isSafe ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <div className="flex-1 font-medium text-[11px] leading-tight">
                {collisionStatus.label}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              * ท่านสามารถคลิกบนหน้ากระดาษเพื่อขยับตำแหน่ง หรือเลือกตำแหน่งที่ AI แนะนำด้านขวามือได้
            </p>
          </div>

          {/* Right Column: AI Recommendations & Sizing */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* AI Real File Analysis Summary */}
            {layoutData?.detectedRealContentSummary && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>ดึงข้อมูลจากไฟล์จริงสำเร็จ</span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                  {layoutData.detectedRealContentSummary}
                </p>
              </div>
            )}

            {/* AI Explanation Banner */}
            <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-300">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>ผลการวิเคราะห์โครงสร้างโดย AI</span>
                </div>
                <button
                  type="button"
                  onClick={() => runAiLayoutAnalysis()}
                  disabled={isAnalyzing}
                  className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>วิเคราะห์ใหม่</span>
                </button>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {layoutData?.aiExplanation || 'กำลังอ่านความหนาแน่นและพื้นที่ว่างของเอกสาร...'}
              </p>
              <div className="flex items-center gap-2 pt-1 text-[10px] font-semibold text-slate-500">
                <span>ความหนาแน่นเนื้อหา:</span>
                <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                  {layoutData?.density === 'sparse' ? 'โปร่ง (สั้น)' : layoutData?.density === 'dense' ? 'แน่น (เต็มหน้า)' : 'ปานกลาง'}
                </span>
                <span>ขนาดแนะนำ: {layoutData?.optimalSize || 85} pt</span>
              </div>
            </div>

            {/* AI Recommended Spots List */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                เลือกตำแหน่งที่ AI แนะนำ (Safe Whitespace Zones):
              </label>
              
              <div className="space-y-2">
                {layoutData?.spots?.map((spot) => {
                  const isSelected = selectedSpotId === spot.id;
                  return (
                    <button
                      key={spot.id}
                      type="button"
                      onClick={() => handleSelectSpot(spot)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500 dark:border-blue-400 shadow-sm ring-1 ring-blue-500/30'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          {spot.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {spot.isAiRecommended && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              {spot.badge}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            spot.confidence >= 95 
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' 
                              : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                          }`}>
                            {spot.confidence}% ปลอดภัย
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                        {spot.reason}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auto-Fit Size Controls */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ปรับขนาดตราประทับ (QR Stamp Size):
                </label>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {stampSize} x {stampSize} pt (~{Math.round(stampSize * 0.3528)} มม.)
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="50"
                max="130"
                step="5"
                value={stampSize}
                onChange={(e) => setStampSize(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />

              {/* Presets */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStampSize(70)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${
                    stampSize === 70 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  กะทัดรัด (70 pt)
                </button>
                <button
                  type="button"
                  onClick={() => setStampSize(layoutData?.optimalSize || 85)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all ${
                    stampSize === (layoutData?.optimalSize || 85)
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-blue-600 dark:text-blue-400 hover:bg-slate-100'
                  }`}
                >
                  🤖 มาตรฐาน AI ({layoutData?.optimalSize || 85} pt)
                </button>
                <button
                  type="button"
                  onClick={() => setStampSize(105)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${
                    stampSize === 105 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  ใหญ่พิเศษ (105 pt)
                </button>
              </div>
            </div>

            {/* Additional Stamping Options */}
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={addCaption}
                  onChange={(e) => setAddCaption(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>เพิ่มข้อความกำกับความถูกต้อง (EDMS Verification Caption) ใต้คิวอาร์</span>
              </label>
            </div>

            {/* Stamping Success Feedback Box if finished */}
            {stampResult && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>ประทับตราลงหนังสือเรียบร้อยแล้ว!</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  ระบบได้บันทึกประวัติการประทับตรา สร้างเวอร์ชันใหม่ และแนบไฟล์ PDF ที่ผ่านการประทับตราเรียบร้อย
                </p>
                {stampResult.stampedPdfUrl && (
                  <a
                    href={stampResult.stampedPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>เปิดดู / ดาวน์โหลดไฟล์ PDF ที่ประทับตราแล้ว</span>
                  </a>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {stampResult ? 'ปิดหน้าต่าง' : 'ยกเลิก'}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleConfirmStamp}
              disabled={isStamping || isAnalyzing || !collisionStatus.isSafe}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all ${
                !collisionStatus.isSafe
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20 active:scale-98'
              }`}
            >
              {isStamping ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังประทับตราลงหนังสือ...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>บันทึกและประทับตราลงหนังสือทันที (Confirm Stamp)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
