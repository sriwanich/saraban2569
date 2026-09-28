import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { 
  Eye, ZoomIn, ZoomOut, RotateCcw, Printer,
  FileDown, Image as ImageIcon, Loader2, Check, ChevronDown
} from 'lucide-react';

// Resilient dynamic loader for html2canvas to ensure build never fails even if missing from node_modules
const loadExternalScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return resolve();
    if (document.querySelector(`script[src="${src}"]`)) return resolve();

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
};

const getHtml2Canvas = async (): Promise<any> => {
  if (typeof window !== 'undefined' && (window as any).html2canvas) {
    return (window as any).html2canvas;
  }
  await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  return (window as any).html2canvas;
};

// Resilient dynamic loader for jsPDF to ensure build never fails even if missing from node_modules
const getJsPdf = async (): Promise<any> => {
  if (typeof window !== 'undefined') {
    if ((window as any).jspdf?.jsPDF) return (window as any).jspdf.jsPDF;
    if ((window as any).jsPDF) return (window as any).jsPDF;
  }
  await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  return (window as any).jspdf?.jsPDF || (window as any).jsPDF;
};

export interface A4PaperPreviewRef {
  exportPdf: () => Promise<void>;
  exportImage: (format: 'png' | 'jpeg') => Promise<void>;
  print: () => void;
}

export interface A4PaperPreviewProps {
  htmlContent?: string;
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPrint?: () => void;
  exportFileName?: string;
  showExportPdf?: boolean;
  showExportImage?: boolean;
  extraActions?: React.ReactNode;
  className?: string;
  paperClassName?: string;
  orientation?: 'portrait' | 'landscape';
}

export const A4PaperPreview = forwardRef<A4PaperPreviewRef, A4PaperPreviewProps>(({
  htmlContent,
  children,
  title = 'ตัวอย่างเอกสารขนาดต้นฉบับ',
  subtitle,
  onPrint,
  exportFileName = 'เอกสาร_A4',
  showExportPdf = true,
  showExportImage = true,
  extraActions,
  className = '',
  paperClassName = '',
  orientation = 'portrait',
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [zoomMode, setZoomMode] = useState<'auto' | 'custom'>('auto');
  const [customZoom, setCustomZoom] = useState<number>(100);
  const [isExporting, setIsExporting] = useState<'pdf' | 'png' | 'jpeg' | null>(null);
  const [showImageDropdown, setShowImageDropdown] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // A4 dimensions in pixels at 96 DPI (or standard web resolution)
  // Portrait: 794px x 1123px (210mm x 297mm)
  // Landscape: 1123px x 794px (297mm x 210mm)
  const baseWidth = orientation === 'portrait' ? 794 : 1123;
  const baseHeight = orientation === 'portrait' ? 1123 : 794;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerWidth((prev) => (Math.abs(prev - rect.width) < 1 ? prev : rect.width));
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateWidth);
      resizeObserver.disconnect();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Compute fit scale for current container width
  const usableWidth = Math.max(280, containerWidth - (window.innerWidth < 640 ? 16 : 32));
  const fitScale = usableWidth > 0 ? Math.min(1, usableWidth / baseWidth) : 1;

  // Effective scale
  const effectiveScale = zoomMode === 'auto' ? fitScale : customZoom / 100;
  const displayZoomPercent = Math.round(effectiveScale * 100);

  const handleZoomIn = () => {
    setZoomMode('custom');
    setCustomZoom((prev) => Math.min(prev + 10, 150));
  };

  const handleZoomOut = () => {
    setZoomMode('custom');
    setCustomZoom((prev) => Math.max(prev - 10, 40));
  };

  const handleResetZoom = () => {
    setZoomMode('auto');
    setCustomZoom(100);
  };

  const printPaperDirectly = () => {
    const rootEl = paperRef.current;
    if (!rootEl) {
      window.print();
      return;
    }

    try {
      const oldFrame = document.getElementById('a4-isolated-print-frame');
      if (oldFrame) {
        oldFrame.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'a4-isolated-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) {
        window.print();
        return;
      }

      let stylesHtml = '';
      document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
        stylesHtml += node.outerHTML;
      });

      const printFixCss = `
        <style>
          @page {
            size: A4 ${orientation};
            margin: 0mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: 'TH Sarabun New', 'TH SarabunPSK', 'Sarabun', sans-serif !important;
          }
          #a4-printable-paper {
            width: 100% !important;
            max-width: 210mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            transform: none !important;
          }
          .sheet, .a4-page-sheet {
            width: 100% !important;
            max-width: 210mm !important;
            height: 296mm !important;
            max-height: 296.5mm !important;
            min-height: unset !important;
            padding: 6mm 8mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
          }
          .sheet:last-child, .a4-page-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .no-print {
            display: none !important;
          }
        </style>
      `;

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="th">
          <head>
            <meta charset="utf-8" />
            <title>${title || 'พิมพ์เอกสาร A4'}</title>
            ${stylesHtml}
            ${printFixCss}
          </head>
          <body>
            <div id="a4-printable-paper">
              ${rootEl.innerHTML}
            </div>
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 350);
    } catch {
      window.print();
    }
  };

  const handlePrintClick = () => {
    if (onPrint) {
      onPrint();
    } else {
      printPaperDirectly();
    }
  };

  // Wait for all images inside an element to load
  const waitForImages = async (element: HTMLElement) => {
    const images = Array.from(element.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      })
    );
  };

  // Multi-page capture engine that captures pages 1:1 identical to physical print output
  const captureAllPages = async (): Promise<HTMLCanvasElement[]> => {
    const rootEl = paperRef.current;
    if (!rootEl) return [];

    // Ensure custom Thai Sarabun fonts are fully loaded with explicit font weights
    if (document.fonts) {
      try {
        await Promise.all([
          document.fonts.load('16pt "TH Sarabun New"'),
          document.fonts.load('bold 16pt "TH Sarabun New"'),
          document.fonts.load('15pt "TH Sarabun New"'),
          document.fonts.load('bold 15pt "TH Sarabun New"'),
          document.fonts.load('13pt "TH Sarabun New"'),
          document.fonts.load('bold 13pt "TH Sarabun New"'),
          document.fonts.load('16pt Sarabun'),
          document.fonts.load('bold 16pt Sarabun'),
          document.fonts.ready
        ]);
      } catch (e) {
        console.warn('Font loading check skipped:', e);
      }
    }

    await waitForImages(rootEl);

    // Save previous transform on both parent (zoom wrapper) and paper root
    const parentEl = rootEl.parentElement;
    const prevParentTransform = parentEl ? parentEl.style.transform : '';
    const prevParentOrigin = parentEl ? parentEl.style.transformOrigin : '';
    if (parentEl) {
      parentEl.style.transform = 'none';
      parentEl.style.transformOrigin = 'unset';
    }

    const prevTransform = rootEl.style.transform;
    const prevOrigin = rootEl.style.transformOrigin;
    rootEl.style.transform = 'none';
    rootEl.style.transformOrigin = 'unset';

    const canvases: HTMLCanvasElement[] = [];

    try {
      const html2canvas = await getHtml2Canvas();
      if (!html2canvas) {
        throw new Error('ไม่สามารถโหลดโมดูล html2canvas ได้');
      }

      // Check if child elements are separated into distinct pages (.a4-page-sheet)
      const pageElements = Array.from(rootEl.querySelectorAll<HTMLElement>('.a4-page-sheet'));

      const commonCaptureOptions = {
        scale: 2, // 2x gives 192+ DPI razor-sharp print quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: baseWidth,
        windowWidth: baseWidth,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
          // Remove shadows and borders so canvas matches pure print
          const clonedPaper = clonedDoc.getElementById('a4-printable-paper');
          if (clonedPaper) {
            clonedPaper.style.boxShadow = 'none';
            clonedPaper.style.transform = 'none';
            clonedPaper.style.border = 'none';
          }
          const clonedSheets = clonedDoc.querySelectorAll<HTMLElement>('.a4-page-sheet');
          clonedSheets.forEach((sheet) => {
            sheet.style.boxShadow = 'none';
            sheet.style.border = 'none';
            sheet.style.margin = '0';
          });
        }
      };

      if (pageElements.length > 0) {
        for (const pageEl of pageElements) {
          const canvas = await html2canvas(pageEl, {
            ...commonCaptureOptions,
            height: pageEl.offsetHeight || baseHeight,
            windowHeight: pageEl.offsetHeight || baseHeight,
          });
          canvases.push(canvas);
        }
      } else {
        // Fallback: capture entire paper container as a SINGLE page
        const fullCanvas = await html2canvas(rootEl, {
          ...commonCaptureOptions,
          height: rootEl.offsetHeight || baseHeight,
          windowHeight: rootEl.offsetHeight || baseHeight,
        });

        // Force exactly 1 page to prevent spilling over to page 2 (as requested: ไม่ให้ล้นลงไปหน้า 2)
        canvases.push(fullCanvas);
      }
    } catch (err) {
      console.error('Failed to capture A4 canvases:', err);
    } finally {
      if (parentEl) {
        parentEl.style.transform = prevParentTransform;
        parentEl.style.transformOrigin = prevParentOrigin;
      }
      rootEl.style.transform = prevTransform;
      rootEl.style.transformOrigin = prevOrigin;
    }

    return canvases;
  };

  // Export to standard A4 PDF (210 x 297 mm) with exact page layout
  const handleExportPdf = async () => {
    if (isExporting) return;
    setIsExporting('pdf');

    try {
      const JsPdf = await getJsPdf();
      if (!JsPdf) {
        throw new Error('ไม่สามารถโหลดโมดูล jsPDF ได้');
      }

      const canvases = await captureAllPages();
      if (!canvases || canvases.length === 0) {
        throw new Error('Canvas capture failed');
      }

      const pdf = new JsPdf(orientation, 'mm', 'a4');
      const pdfWidth = orientation === 'portrait' ? 210 : 297;
      const pdfHeight = orientation === 'portrait' ? 297 : 210;

      for (let pageIdx = 0; pageIdx < canvases.length; pageIdx++) {
        if (pageIdx > 0) {
          pdf.addPage('a4', orientation);
        }

        const pageCanvas = canvases[pageIdx];
        const imgData = pageCanvas.toDataURL('image/jpeg', 0.98);
        let imgWidth = pdfWidth;
        let imgHeight = (pageCanvas.height * pdfWidth) / pageCanvas.width;
        if (imgHeight > pdfHeight) {
          imgHeight = pdfHeight;
          imgWidth = (pageCanvas.width * pdfHeight) / pageCanvas.height;
        }
        const posX = (pdfWidth - imgWidth) / 2;
        const posY = 0;
        pdf.addImage(imgData, 'JPEG', posX, posY, imgWidth, imgHeight, undefined, 'FAST');
      }

      const safeName = (exportFileName || 'เอกสาร_A4').replace(/[/\\?%*:|"<>]/g, '_');
      pdf.save(`${safeName}.pdf`);
      showToast(`ดาวน์โหลดไฟล์ PDF ขนาด A4 สำเร็จ (${canvases.length} หน้า)`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
    } finally {
      setIsExporting(null);
    }
  };

  // Export to high-res A4 Image (PNG or JPEG)
  const handleExportImage = async (format: 'png' | 'jpeg') => {
    if (isExporting) return;
    setIsExporting(format);
    setShowImageDropdown(false);

    try {
      const canvases = await captureAllPages();
      if (!canvases || canvases.length === 0) {
        throw new Error('Canvas capture failed');
      }

      const safeName = (exportFileName || 'เอกสาร_A4').replace(/[/\\?%*:|"<>]/g, '_');
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const extension = format === 'png' ? 'png' : 'jpg';

      if (canvases.length === 1) {
        const dataUrl = canvases[0].toDataURL(mimeType, 0.98);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${safeName}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        for (let pageIdx = 0; pageIdx < canvases.length; pageIdx++) {
          const dataUrl = canvases[pageIdx].toDataURL(mimeType, 0.98);
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `${safeName}_หน้า${pageIdx + 1}.${extension}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      showToast(`บันทึกรูปภาพ (${format.toUpperCase()}) สำเร็จ (${canvases.length} หน้า)`);
    } catch (error) {
      console.error('Error exporting image:', error);
      showToast('เกิดข้อผิดพลาดในการบันทึกรูปภาพ');
    } finally {
      setIsExporting(null);
    }
  };

  useImperativeHandle(ref, () => ({
    exportPdf: handleExportPdf,
    exportImage: handleExportImage,
    print: printPaperDirectly
  }));

  return (
    <div className={`flex flex-col w-full space-y-3 ${className}`}>
      {/* Control Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] p-2.5 sm:p-3 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Eye className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                {title}
              </span>
            </div>
            {subtitle && (
              <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 shrink-0 border-t lg:border-t-0 border-[var(--border-lighter)] pt-2 lg:pt-0">
          {/* Zoom Control Group */}
          <div className="flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-1 shadow-2xs text-xs">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:bg-[var(--border-lighter)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-colors cursor-pointer"
              title="ย่อขนาด"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className={`px-2 py-0.5 font-mono text-[11px] font-bold rounded-md transition-colors ${
                zoomMode === 'auto'
                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                  : 'text-[var(--text-primary)] hover:bg-[var(--border-lighter)]'
              }`}
              title={zoomMode === 'auto' ? 'ปรับขนาดพอดีหน้าจออัตโนมัติ (Fit Screen)' : 'กดเพื่อคืนค่าปรับพอดีอัตโนมัติ'}
            >
              {displayZoomPercent}% {zoomMode === 'auto' && <span className="text-[9px] opacity-75">(Fit)</span>}
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:bg-[var(--border-lighter)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-colors cursor-pointer"
              title="ขยายขนาด"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomMode !== 'auto' && (
              <button
                onClick={handleResetZoom}
                className="p-1 text-slate-400 hover:text-blue-500 hover:bg-[var(--border-lighter)] rounded-lg transition-colors cursor-pointer ml-0.5"
                title="ย้อนกลับไปอัตโนมัติ"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {extraActions}

          {/* Export PDF Button */}
          {showExportPdf && (
            <button
              onClick={handleExportPdf}
              disabled={isExporting !== null}
              className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-rose-600 hover:border-rose-400 dark:hover:border-rose-600 dark:hover:bg-rose-900/20 disabled:opacity-50 transition-all hover:shadow-md cursor-pointer group flex items-center justify-center"
              title="ดาวน์โหลดเป็นไฟล์ PDF ขนาด A4"
            >
              {isExporting === 'pdf' ? (
                <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
              ) : (
                <FileDown className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
              )}
            </button>
          )}

          {/* Export Image Dropdown / Button */}
          {showExportImage && (
            <div className="relative">
              <div className="flex items-center rounded-xl bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-emerald-600 hover:border-emerald-400 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/20 transition-all hover:shadow-md cursor-pointer group">
                <button
                  onClick={() => handleExportImage('png')}
                  disabled={isExporting !== null}
                  className="p-2.5 flex items-center justify-center disabled:opacity-50 cursor-pointer"
                  title="บันทึกรูปภาพความคมชัดสูง (PNG)"
                >
                  {isExporting === 'png' || isExporting === 'jpeg' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                  ) : (
                    <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  )}
                </button>
                <button
                  onClick={() => setShowImageDropdown(!showImageDropdown)}
                  className="py-2.5 px-1.5 hover:bg-[var(--border-light)] border-l border-[var(--border-light)] cursor-pointer"
                  title="เลือกรูปแบบรูปภาพ"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Dropdown Menu */}
              {showImageDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowImageDropdown(false)}
                  />
                  <div className="absolute right-0 mt-1 w-52 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-xl z-50 p-1.5 space-y-1 text-xs">
                    <button
                      onClick={() => handleExportImage('png')}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--bg-elevated)] flex items-center justify-between text-[var(--text-primary)] font-medium cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-600 font-bold rounded text-[10px]">PNG</span>
                        <span>รูปภาพความคมชัดสูง (2x)</span>
                      </span>
                    </button>
                    <button
                      onClick={() => handleExportImage('jpeg')}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--bg-elevated)] flex items-center justify-between text-[var(--text-primary)] font-medium cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-blue-500/15 text-blue-600 font-bold rounded text-[10px]">JPG</span>
                        <span>รูปภาพขนาดกะทัดรัด (JPG)</span>
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Print Button */}
          <button
            onClick={handlePrintClick}
            className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-blue-600 hover:border-blue-400 dark:hover:border-blue-600 dark:hover:bg-blue-900/20 transition-all hover:shadow-md cursor-pointer group flex items-center justify-center"
            title="สั่งพิมพ์เอกสาร"
          >
            <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 dark:border-slate-200 flex items-center gap-2 text-xs font-bold animate-fade-in backdrop-blur-md">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* A4 Desk Container */}
      <div
        ref={containerRef}
        className="a4-desk-container w-full bg-slate-200/90 dark:bg-slate-950 p-2 sm:p-6 md:p-8 rounded-2xl border border-[var(--border-light)] overflow-x-auto custom-scrollbar flex justify-center shadow-inner relative print:p-0 print:m-0 print:border-none print:bg-white print:overflow-visible print:block print:shadow-none"
      >
        <div
          className="a4-scale-wrapper print:transform-none print:w-auto print:block"
          style={{
            transform: `scale(${effectiveScale})`,
            transformOrigin: 'top center',
            width: `${baseWidth}px`,
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          {(() => {
            const hasChildSheets = (htmlContent && htmlContent.includes('a4-page-sheet')) ||
              Boolean(paperRef.current?.querySelector('.a4-page-sheet'));

            const resolvedPaperClass = paperClassName
              ? paperClassName
              : hasChildSheets
                ? 'p-0 bg-transparent shadow-none'
                : 'p-[25mm_20mm_20mm_25mm]';

            return (
              <div
                id="a4-printable-paper"
                ref={paperRef}
                className={`bg-white text-slate-900 shadow-2xl origin-top select-text ${resolvedPaperClass}`}
                style={{
                  width: `${baseWidth}px`,
                  minHeight: `${baseHeight}px`,
                  fontFamily: "'TH Sarabun New', 'TH SarabunPSK', 'Sarabun', sans-serif",
                  fontSize: '16pt',
                  lineHeight: '1.5',
                  boxSizing: 'border-box'
                }}
              >
                {htmlContent ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                    className="w-full h-full"
                  />
                ) : (
                  children
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Print CSS Fix for strict A4 page output */}
      <style>{`
        @media print {
          @page {
            size: A4 ${orientation};
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .a4-desk-container {
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            overflow: visible !important;
            width: 100% !important;
            display: block !important;
          }
          .a4-scale-wrapper {
            transform: none !important;
            width: 100% !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden;
          }
          #a4-printable-paper, #a4-printable-paper * {
            visibility: visible;
          }
          #a4-printable-paper {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: ${orientation === 'portrait' ? '210mm' : '297mm'} !important;
            min-height: auto !important;
            max-height: none !important;
            height: auto !important;
            transform: none !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            background: white !important;
            color: black !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sheet, .a4-page-sheet {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            width: ${orientation === 'portrait' ? '210mm' : '297mm'} !important;
            min-height: ${orientation === 'portrait' ? '297mm' : '210mm'} !important;
            max-height: none !important;
            height: auto !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sheet:last-child, .a4-page-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>
    </div>
  );
});

A4PaperPreview.displayName = 'A4PaperPreview';

export default A4PaperPreview;
