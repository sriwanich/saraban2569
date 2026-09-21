import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Download, Check, CheckSquare, Square, FileText, Scaling,
  ImageIcon, Layers, RefreshCw, Sliders, CheckCircle2, AlertCircle,
  Hash, ArrowRight, FileCheck, Copy
} from 'lucide-react';

export interface InfographicsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  pagesList: string[];
  currentPageIndex: number;
  canvas: any;
  canvasSize: { width: number; height: number };
  backgroundColor: string;
  generateCompleteSVG: (targetCanvas: any, size: { width: number; height: number }, bgCol: string) => Promise<string>;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onSaveCurrentPageToMemory?: () => void;
}

export type ExportFileType = 'svg' | 'png' | 'jpeg' | 'pdf';
export type PageScopeMode = 'current' | 'all' | 'single' | 'range' | 'custom';

export const InfographicsExportModal: React.FC<InfographicsExportModalProps> = ({
  isOpen,
  onClose,
  projectName,
  pagesList,
  currentPageIndex,
  canvas,
  canvasSize,
  backgroundColor,
  generateCompleteSVG,
  onShowToast,
  onSaveCurrentPageToMemory
}) => {
  // Total pages count (guarantee at least 1)
  const totalPages = Math.max(1, pagesList ? pagesList.length : 1);

  // States
  const [fileType, setFileType] = useState<ExportFileType>('svg');
  const [scopeMode, setScopeMode] = useState<PageScopeMode>('current');
  const [selectedSinglePage, setSelectedSinglePage] = useState<number>(currentPageIndex + 1);
  const [rangeInput, setRangeInput] = useState<string>(`1-${totalPages}`);
  const [selectedPagesSet, setSelectedPagesSet] = useState<Set<number>>(() => {
    // Default to current page
    return new Set([currentPageIndex + 1]);
  });

  // Image quality / multiplier
  const [pngMultiplier, setPngMultiplier] = useState<number>(2);
  const [jpegQuality, setJpegQuality] = useState<number>(0.92);
  const [pdfCombineAll, setPdfCombineAll] = useState<boolean>(true);

  // Processing state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; message: string }>({
    current: 0,
    total: 0,
    message: ''
  });

  // Reset or update state when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedSinglePage(currentPageIndex + 1);
      if (totalPages > 1) {
        setSelectedPagesSet(new Set([currentPageIndex + 1]));
      } else {
        setSelectedPagesSet(new Set([1]));
      }
    }
  }, [isOpen, currentPageIndex, totalPages]);

  // Parse range input like "1-3, 5" or "1, 2"
  const parseRangeString = (str: string, max: number): number[] => {
    const result = new Set<number>();
    const parts = str.split(',').map((p) => p.trim()).filter(Boolean);

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map((s) => parseInt(s.trim(), 10));
        if (!isNaN(startStr) && !isNaN(endStr)) {
          const s = Math.max(1, Math.min(startStr, endStr));
          const e = Math.min(max, Math.max(startStr, endStr));
          for (let i = s; i <= e; i++) {
            result.add(i);
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= max) {
          result.add(num);
        }
      }
    }

    return Array.from(result).sort((a, b) => a - b);
  };

  // Determine final list of 1-based page numbers to export
  const pagesToExport = useMemo<number[]>(() => {
    if (scopeMode === 'current') {
      return [currentPageIndex + 1];
    }
    if (scopeMode === 'single') {
      return [Math.max(1, Math.min(totalPages, selectedSinglePage))];
    }
    if (scopeMode === 'all') {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (scopeMode === 'range') {
      const parsed = parseRangeString(rangeInput, totalPages);
      return parsed.length > 0 ? parsed : [currentPageIndex + 1];
    }
    if (scopeMode === 'custom') {
      const sorted = Array.from(selectedPagesSet).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
      return sorted.length > 0 ? sorted : [currentPageIndex + 1];
    }
    return [currentPageIndex + 1];
  }, [scopeMode, totalPages, currentPageIndex, selectedSinglePage, rangeInput, selectedPagesSet]);

  if (!isOpen) return null;

  // Toggle page in custom set
  const togglePageInSet = (pageNum: number) => {
    setSelectedPagesSet((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        if (next.size > 1) {
          next.delete(pageNum);
        }
      } else {
        next.add(pageNum);
      }
      return next;
    });
  };

  // Select all pages
  const handleSelectAll = () => {
    const all = new Set<number>();
    for (let i = 1; i <= totalPages; i++) all.add(i);
    setSelectedPagesSet(all);
  };

  // Select odd pages
  const handleSelectOdd = () => {
    const odds = new Set<number>();
    for (let i = 1; i <= totalPages; i += 2) odds.add(i);
    setSelectedPagesSet(odds);
  };

  // Select even pages
  const handleSelectEven = () => {
    const evens = new Set<number>();
    for (let i = 2; i <= totalPages; i += 2) evens.add(i);
    if (evens.size === 0) evens.add(1);
    setSelectedPagesSet(evens);
  };

  // Quick select count: first N pages
  const handleSelectFirstN = (n: number) => {
    const count = Math.min(n, totalPages);
    setRangeInput(`1-${count}`);
    const setN = new Set<number>();
    for (let i = 1; i <= count; i++) setN.add(i);
    setSelectedPagesSet(setN);
  };

  // Helper to get or render canvas of a specific page
  const renderPageCanvas = async (pageIdx: number): Promise<{ targetCanvas: any; disposeAfter: boolean }> => {
    if (pageIdx === currentPageIndex && canvas) {
      return { targetCanvas: canvas, disposeAfter: false };
    }

    const fabricModule = (window as any).fabric;
    if (!fabricModule) {
      throw new Error('ไม่พบระบบ FabricJS เวกเตอร์บนเบราว์เซอร์');
    }

    const pageJSON = pagesList && pagesList[pageIdx] ? pagesList[pageIdx] : null;
    const tempEl = document.createElement('canvas');
    tempEl.width = canvasSize.width;
    tempEl.height = canvasSize.height;

    const tempCanvas = new fabricModule.Canvas(tempEl, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: backgroundColor
    });

    if (pageJSON) {
      await new Promise<void>((resolve) => {
        tempCanvas.loadFromJSON(pageJSON, () => {
          tempCanvas.renderAll();
          resolve();
        });
      });
    }

    return { targetCanvas: tempCanvas, disposeAfter: true };
  };

  // Execute the export
  const handleExecuteExport = async () => {
    if (pagesToExport.length === 0) {
      onShowToast('กรุณาเลือกอย่างน้อย 1 หน้าเพื่อทำการส่งออก', 'error');
      return;
    }

    if (onSaveCurrentPageToMemory) {
      onSaveCurrentPageToMemory();
    }

    setIsExporting(true);
    setExportProgress({
      current: 0,
      total: pagesToExport.length,
      message: 'กำลังเริ่มต้นการส่งออกไฟล์...'
    });

    const cleanProjectName = (projectName || 'infographics').trim().replace(/\s+/g, '_');

    try {
      // CASE 1: Combined Multi-Page PDF
      if (fileType === 'pdf' && pdfCombineAll && pagesToExport.length > 1) {
        const { jsPDF } = await import('jspdf');
        const imgWidth = canvasSize.width;
        const imgHeight = canvasSize.height;

        const doc = new jsPDF({
          orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
          unit: 'px',
          format: [imgWidth, imgHeight]
        });

        for (let i = 0; i < pagesToExport.length; i++) {
          const pageNum = pagesToExport[i];
          const pageIdx = pageNum - 1;

          setExportProgress({
            current: i + 1,
            total: pagesToExport.length,
            message: `กำลังเรนเดอร์ PDF หน้าที่ ${pageNum} (${i + 1}/${pagesToExport.length})...`
          });

          const { targetCanvas, disposeAfter } = await renderPageCanvas(pageIdx);

          const activeObj = targetCanvas.getActiveObject ? targetCanvas.getActiveObject() : null;
          if (activeObj && targetCanvas.discardActiveObject) {
            targetCanvas.discardActiveObject();
            targetCanvas.requestRenderAll();
          }

          const dataURL = targetCanvas.toDataURL({ format: 'png', quality: 1.0, multiplier: pngMultiplier });

          if (activeObj && targetCanvas.setActiveObject) {
            targetCanvas.setActiveObject(activeObj);
            targetCanvas.requestRenderAll();
          }

          if (disposeAfter && targetCanvas.dispose) {
            targetCanvas.dispose();
          }

          if (i > 0) {
            doc.addPage([imgWidth, imgHeight], imgWidth > imgHeight ? 'landscape' : 'portrait');
          }
          doc.addImage(dataURL, 'PNG', 0, 0, imgWidth, imgHeight);

          // Small yield
          await new Promise((r) => setTimeout(r, 60));
        }

        setExportProgress({
          current: pagesToExport.length,
          total: pagesToExport.length,
          message: 'กำลังบันทึกไฟล์ PDF รวมหลายหน้า...'
        });

        doc.save(`${cleanProjectName}_(รวม_${pagesToExport.length}_หน้า).pdf`);
        onShowToast(`ส่งออกไฟล์ PDF รวม ${pagesToExport.length} หน้าสำเร็จเรียบร้อย`, 'success');
        setIsExporting(false);
        onClose();
        return;
      }

      // CASE 2: Single PDF, SVG, PNG, or JPEG (or separate files)
      for (let i = 0; i < pagesToExport.length; i++) {
        const pageNum = pagesToExport[i];
        const pageIdx = pageNum - 1;

        setExportProgress({
          current: i + 1,
          total: pagesToExport.length,
          message: `กำลังประมวลผลหน้าที่ ${pageNum} (${i + 1}/${pagesToExport.length})...`
        });

        const { targetCanvas, disposeAfter } = await renderPageCanvas(pageIdx);

        // Page suffix for file name
        const pageSuffix = pagesToExport.length > 1 ? `_หน้า_${pageNum}` : (totalPages > 1 ? `_หน้า_${pageNum}` : '');

        if (fileType === 'svg') {
          const svgData = await generateCompleteSVG(targetCanvas, canvasSize, backgroundColor);
          const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${cleanProjectName}${pageSuffix}.svg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        } else if (fileType === 'png' || fileType === 'jpeg') {
          const activeObj = targetCanvas.getActiveObject ? targetCanvas.getActiveObject() : null;
          if (activeObj && targetCanvas.discardActiveObject) {
            targetCanvas.discardActiveObject();
            targetCanvas.requestRenderAll();
          }

          const dataURL = targetCanvas.toDataURL({
            format: fileType,
            quality: fileType === 'jpeg' ? jpegQuality : 1.0,
            multiplier: pngMultiplier
          });

          if (activeObj && targetCanvas.setActiveObject) {
            targetCanvas.setActiveObject(activeObj);
            targetCanvas.requestRenderAll();
          }

          const link = document.createElement('a');
          link.href = dataURL;
          link.download = `${cleanProjectName}${pageSuffix}.${fileType === 'jpeg' ? 'jpg' : 'png'}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (fileType === 'pdf') {
          // Single page PDF
          const { jsPDF } = await import('jspdf');
          const imgWidth = canvasSize.width;
          const imgHeight = canvasSize.height;

          const doc = new jsPDF({
            orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
            unit: 'px',
            format: [imgWidth, imgHeight]
          });

          const activeObj = targetCanvas.getActiveObject ? targetCanvas.getActiveObject() : null;
          if (activeObj && targetCanvas.discardActiveObject) {
            targetCanvas.discardActiveObject();
            targetCanvas.requestRenderAll();
          }

          const dataURL = targetCanvas.toDataURL({ format: 'png', quality: 1.0, multiplier: pngMultiplier });

          if (activeObj && targetCanvas.setActiveObject) {
            targetCanvas.setActiveObject(activeObj);
            targetCanvas.requestRenderAll();
          }

          doc.addImage(dataURL, 'PNG', 0, 0, imgWidth, imgHeight);
          doc.save(`${cleanProjectName}${pageSuffix}.pdf`);
        }

        if (disposeAfter && targetCanvas.dispose) {
          targetCanvas.dispose();
        }

        // Delay between sequential downloads to ensure browser triggers downloads cleanly
        if (i < pagesToExport.length - 1) {
          await new Promise((r) => setTimeout(r, 450));
        }
      }

      onShowToast(`ส่งออกไฟล์ ${fileType.toUpperCase()} สำเร็จทั้งหมด ${pagesToExport.length} หน้า`, 'success');
      setIsExporting(false);
      onClose();
    } catch (err: any) {
      console.error('Export error:', err);
      onShowToast('เกิดข้อผิดพลาดในการส่งออก: ' + (err.message || 'กรุณาลองใหม่อีกครั้ง'), 'error');
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#18181b] border border-[#27272a] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#27272a] flex items-center justify-between bg-[#121214]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-inner">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>ส่งออกอินโฟกราฟิก</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                  Export Options
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                เลือกรูปแบบไฟล์ และกำหนดหน้ากระดาษที่ต้องการส่งออก
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="w-8 h-8 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            title="ปิด"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          
          {/* SECTION 1: Export Format */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>1. เลือกรูปแบบไฟล์ (Export Format)</span>
              </label>
              <span className="text-[11px] text-gray-500">
                ขนาดผืนผ้าใบ: {canvasSize.width} × {canvasSize.height} px
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* SVG */}
              <button
                type="button"
                onClick={() => setFileType('svg')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  fileType === 'svg'
                    ? 'bg-orange-950/30 border-orange-500 ring-1 ring-orange-500/40 text-white'
                    : 'bg-[#121214] border-gray-800 hover:border-gray-700 text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl ${fileType === 'svg' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-800 text-gray-400'}`}>
                    <Scaling className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold">
                    VECTOR
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-sm">เวกเตอร์ SVG</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5 leading-tight">
                    คมชัด 100% ฝังฟอนต์ไทย & Base64
                  </span>
                </div>
              </button>

              {/* PNG */}
              <button
                type="button"
                onClick={() => setFileType('png')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  fileType === 'png'
                    ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/40 text-white'
                    : 'bg-[#121214] border-gray-800 hover:border-gray-700 text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl ${fileType === 'png' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    IMAGE
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-sm">รูปภาพ PNG</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5 leading-tight">
                    ภาพความคมชัดสูง สื่อโซเชียล
                  </span>
                </div>
              </button>

              {/* JPEG */}
              <button
                type="button"
                onClick={() => setFileType('jpeg')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  fileType === 'jpeg'
                    ? 'bg-sky-950/30 border-sky-500 ring-1 ring-sky-500/40 text-white'
                    : 'bg-[#121214] border-gray-800 hover:border-gray-700 text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl ${fileType === 'jpeg' ? 'bg-sky-500/20 text-sky-400' : 'bg-gray-800 text-gray-400'}`}>
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
                    PHOTO
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-sm">รูปภาพ JPEG</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5 leading-tight">
                    ขนาดกะทัดรัด ส่งแชทสะดวกรวดเร็ว
                  </span>
                </div>
              </button>

              {/* PDF */}
              <button
                type="button"
                onClick={() => setFileType('pdf')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  fileType === 'pdf'
                    ? 'bg-rose-950/30 border-rose-500 ring-1 ring-rose-500/40 text-white'
                    : 'bg-[#121214] border-gray-800 hover:border-gray-700 text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl ${fileType === 'pdf' ? 'bg-rose-500/20 text-rose-400' : 'bg-gray-800 text-gray-400'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                    DOC
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-sm">เอกสาร PDF</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5 leading-tight">
                    รวมหลายหน้า หรือสั่งพิมพ์
                  </span>
                </div>
              </button>
            </div>

            {/* Quality options for PNG / PDF */}
            {fileType === 'png' && (
              <div className="p-3 bg-[#121214] rounded-xl border border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-300 font-medium">ความละเอียดภาพ (Resolution Multiplier):</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map((mult) => (
                    <button
                      key={mult}
                      type="button"
                      onClick={() => setPngMultiplier(mult)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        pngMultiplier === mult
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {mult}x {mult === 2 ? '(แนะนำ)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {fileType === 'pdf' && totalPages > 1 && (
              <div className="p-3 bg-[#121214] rounded-xl border border-gray-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs text-gray-200 font-medium block">การรวมไฟล์เอกสาร PDF หลายหน้า:</span>
                  <span className="text-[11px] text-gray-500 block">
                    {pdfCombineAll ? 'รวมทุกหน้าที่เลือกลงในไฟล์ PDF เล่มเดียวกัน' : 'ส่งออกแยกไฟล์ PDF ทีละหน้า'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPdfCombineAll(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      pdfCombineAll
                        ? 'bg-rose-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    รวมเป็นไฟล์เดียว
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfCombineAll(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !pdfCombineAll
                        ? 'bg-rose-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    แยกไฟล์ทีละหน้า
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Page Selection Mode */}
          <div className="space-y-3 pt-4 border-t border-[#27272a]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>2. เลือกหน้าที่จะส่งออก (Page Selection)</span>
              </label>
              <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                ทั้งหมด {totalPages} หน้า
              </span>
            </div>

            {/* Scope Mode Selector Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Option 1: Current Page */}
              <button
                type="button"
                onClick={() => setScopeMode('current')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  scopeMode === 'current'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-[#121214] border-gray-800 hover:border-gray-700 text-gray-300'
                }`}
              >
                <span className="block font-bold text-xs">หน้าปัจจุบัน</span>
                <span className={`text-[10px] block mt-0.5 ${scopeMode === 'current' ? 'text-indigo-200' : 'text-gray-500'}`}>
                  หน้าที่ {currentPageIndex + 1} เท่านั้น
                </span>
              </button>

              {/* Option 2: All Pages */}
              <button
                type="button"
                onClick={() => setScopeMode('all')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  scopeMode === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-[#121214] border-gray-800 hover:border-gray-700 text-gray-300'
                }`}
              >
                <span className="block font-bold text-xs">ส่งออกทุกหน้า</span>
                <span className={`text-[10px] block mt-0.5 ${scopeMode === 'all' ? 'text-indigo-200' : 'text-gray-500'}`}>
                  ครบทั้ง {totalPages} หน้า
                </span>
              </button>

              {/* Option 3: Single Specified Page */}
              <button
                type="button"
                onClick={() => setScopeMode('single')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  scopeMode === 'single'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-[#121214] border-gray-800 hover:border-gray-700 text-gray-300'
                }`}
              >
                <span className="block font-bold text-xs">ระบุ 1 หน้า</span>
                <span className={`text-[10px] block mt-0.5 ${scopeMode === 'single' ? 'text-indigo-200' : 'text-gray-500'}`}>
                  เลือกหน้าที่ต้องการ
                </span>
              </button>

              {/* Option 4: Custom Pages / Range */}
              <button
                type="button"
                onClick={() => setScopeMode('custom')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  scopeMode === 'custom' || scopeMode === 'range'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-[#121214] border-gray-800 hover:border-gray-700 text-gray-300'
                }`}
              >
                <span className="block font-bold text-xs">เลือกหน้าตามใจ</span>
                <span className={`text-[10px] block mt-0.5 ${scopeMode === 'custom' || scopeMode === 'range' ? 'text-indigo-200' : 'text-gray-500'}`}>
                  ระบุช่วงหน้า / ติ๊กเลือก
                </span>
              </button>
            </div>

            {/* Sub-panel based on Scope Mode */}

            {/* Scope: Single Page Selector */}
            {scopeMode === 'single' && (
              <div className="p-4 bg-[#121214] rounded-2xl border border-gray-800 space-y-3">
                <span className="text-xs text-gray-300 font-medium block">
                  เลือกหมายเลขหน้าที่ต้องการส่งออก:
                </span>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedSinglePage(num)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedSinglePage === num
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <span>หน้าที่ {num}</span>
                      {num === currentPageIndex + 1 && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/30 text-indigo-200">
                          ปัจจุบัน
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Scope: Custom Selection / Range */}
            {(scopeMode === 'custom' || scopeMode === 'range') && (
              <div className="p-4 bg-[#121214] rounded-2xl border border-gray-800 space-y-4">
                {/* Range string input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-300 font-medium flex items-center gap-1">
                      <Hash className="w-3 h-3 text-indigo-400" />
                      <span>พิมพ์ระบุช่วงหน้า หรือจำนวนหน้า (เช่น 1-3 หรือ 1, 3):</span>
                    </label>
                    <span className="text-[11px] text-gray-500">รองรับ comma และขีดคั่น</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={rangeInput}
                      onChange={(e) => {
                        setRangeInput(e.target.value);
                        setScopeMode('range');
                        const parsed = parseRangeString(e.target.value, totalPages);
                        if (parsed.length > 0) {
                          setSelectedPagesSet(new Set(parsed));
                        }
                      }}
                      placeholder={`เช่น 1-${totalPages} หรือ 1, 2`}
                      className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    {/* Quick Range presets */}
                    {totalPages >= 2 && (
                      <button
                        type="button"
                        onClick={() => handleSelectFirstN(2)}
                        className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-medium cursor-pointer"
                        title="2 หน้าแรก"
                      >
                        2 หน้าแรก
                      </button>
                    )}
                    {totalPages >= 3 && (
                      <button
                        type="button"
                        onClick={() => handleSelectFirstN(3)}
                        className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-medium cursor-pointer"
                        title="3 หน้าแรก"
                      >
                        3 หน้าแรก
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Selection Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-800/80">
                  <span className="text-[11px] text-gray-400 mr-1">เลือกด่วน:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setScopeMode('custom');
                      handleSelectAll();
                    }}
                    className="px-2.5 py-1 bg-gray-800 hover:bg-indigo-600 hover:text-white text-gray-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    เลือกทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScopeMode('custom');
                      handleSelectOdd();
                    }}
                    className="px-2.5 py-1 bg-gray-800 hover:bg-indigo-600 hover:text-white text-gray-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    เฉพาะหน้าคี่ (1, 3, 5...)
                  </button>
                  {totalPages >= 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        setScopeMode('custom');
                        handleSelectEven();
                      }}
                      className="px-2.5 py-1 bg-gray-800 hover:bg-indigo-600 hover:text-white text-gray-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      เฉพาะหน้าคู่ (2, 4, 6...)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setScopeMode('custom');
                      setSelectedPagesSet(new Set([currentPageIndex + 1]));
                    }}
                    className="px-2.5 py-1 bg-gray-800 hover:bg-indigo-600 hover:text-white text-gray-300 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    ล้างการเลือก (เหลือหน้าปัจจุบัน)
                  </button>
                </div>

                {/* Interactive Grid of Page Checkboxes */}
                <div className="space-y-2 pt-2 border-t border-gray-800/80">
                  <span className="text-xs text-gray-300 font-medium block">
                    หรือคลิกติ๊กเลือกหน้ากระดาษที่ต้องการโดยตรง:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      const isChecked = pagesToExport.includes(pageNum);
                      const isCurrent = pageNum === currentPageIndex + 1;

                      return (
                        <div
                          key={pageNum}
                          onClick={() => {
                            setScopeMode('custom');
                            togglePageInSet(pageNum);
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-indigo-950/40 border-indigo-500 text-white'
                              : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-600 shrink-0" />
                            )}
                            <div>
                              <span className="font-bold text-xs block">หน้าที่ {pageNum}</span>
                              {isCurrent && (
                                <span className="text-[9px] text-indigo-300 font-medium block">
                                  หน้าปัจจุบัน
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isChecked ? 'bg-indigo-500/20 text-indigo-300' : 'bg-gray-800 text-gray-500'}`}>
                            #{pageNum}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Summary of selection */}
          <div className="p-4 bg-indigo-950/20 rounded-2xl border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">รูปแบบไฟล์:</span>
                <span className="font-bold text-white uppercase bg-indigo-500/20 px-2 py-0.5 rounded font-mono text-[11px]">
                  {fileType === 'jpeg' ? 'JPEG Image' : fileType.toUpperCase()}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-400">จำนวนที่เลือก:</span>
                <span className="font-bold text-indigo-300">
                  {pagesToExport.length} หน้า
                </span>
              </div>
              <p className="text-gray-400 text-[11px]">
                หน้าที่ส่งออก: <strong className="text-gray-200">{pagesToExport.map((p) => `หน้า ${p}`).join(', ')}</strong>
                {fileType === 'pdf' && pdfCombineAll && pagesToExport.length > 1 && (
                  <span className="text-emerald-400 block mt-0.5">
                    (จะรวมเป็นเอกสาร PDF 1 ไฟล์ มีทั้งหมด {pagesToExport.length} หน้า)
                  </span>
                )}
                {(fileType === 'svg' || fileType === 'png' || fileType === 'jpeg' || !pdfCombineAll) && pagesToExport.length > 1 && (
                  <span className="text-amber-400 block mt-0.5">
                    (จะทยอยดาวน์โหลดแยกไฟล์จำนวน {pagesToExport.length} ไฟล์อัตโนมัติ)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Progress bar during export */}
          {isExporting && (
            <div className="p-4 bg-gray-900 rounded-2xl border border-indigo-500/30 space-y-2 animate-pulse">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-300 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{exportProgress.message}</span>
                </span>
                <span className="font-mono text-gray-400">
                  {exportProgress.current} / {exportProgress.total}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                  style={{
                    width: `${exportProgress.total > 0 ? (exportProgress.current / exportProgress.total) * 100 : 10}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#27272a] bg-[#121214] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleExecuteExport}
            disabled={isExporting || pagesToExport.length === 0}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังประมวลผลการส่งออก...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>ยืนยันการส่งออก ({pagesToExport.length} หน้า)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
