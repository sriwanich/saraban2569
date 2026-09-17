import React, { useState, useEffect, useRef } from 'react';
import { Eye, ZoomIn, ZoomOut, Maximize2, RotateCcw, Printer, FileText, Sparkles, Smartphone } from 'lucide-react';

interface A4PaperPreviewProps {
  htmlContent?: string;
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPrint?: () => void;
  extraActions?: React.ReactNode;
  className?: string;
  paperClassName?: string;
  orientation?: 'portrait' | 'landscape';
}

export const A4PaperPreview: React.FC<A4PaperPreviewProps> = ({
  htmlContent,
  children,
  title = 'ตัวอย่างเอกสารขนาดต้นฉบับ (A4 Print Preview)',
  subtitle,
  onPrint,
  extraActions,
  className = '',
  paperClassName = '',
  orientation = 'portrait',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [zoomMode, setZoomMode] = useState<'auto' | 'custom'>('auto');
  const [customZoom, setCustomZoom] = useState<number>(100);

  // A4 dimensions in pixels at 96 DPI (or standard web resolution)
  // Portrait: 794px x 1123px (210mm x 297mm)
  // Landscape: 1123px x 794px (297mm x 210mm)
  const baseWidth = orientation === 'portrait' ? 794 : 1123;
  const baseHeight = orientation === 'portrait' ? 1123 : 794;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        // subtract padding (32px)
        const rect = containerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);

    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateWidth);
      resizeObserver.disconnect();
    };
  }, []);

  // Compute fit scale for current container width
  const usableWidth = Math.max(280, containerWidth - (window.innerWidth < 640 ? 16 : 32));
  const fitScale = usableWidth > 0 ? Math.min(1, usableWidth / baseWidth) : 1;

  // Effective scale
  const effectiveScale = zoomMode === 'auto' ? fitScale : customZoom / 100;

  // Outer container height for the scaled element
  const scaledHeight = Math.round(baseHeight * effectiveScale) + 16;
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

  const handlePrintClick = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className={`flex flex-col w-full space-y-3 ${className}`}>
      {/* Control Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] p-2.5 sm:p-3 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Eye className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                {title}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <FileText className="w-3 h-3" /> A4 ({orientation === 'portrait' ? 'แนวตั้ง 210x297mm' : 'แนวนอน 297x210mm'})
              </span>
            </div>
            {subtitle && (
              <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 border-[var(--border-lighter)] pt-2 sm:pt-0">
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

          <button
            onClick={handlePrintClick}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์ A4</span>
          </button>
        </div>
      </div>

      {/* Mobile Fit Notice */}
      {fitScale < 0.95 && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-blue-500/5 border border-blue-500/15 rounded-xl text-[11px] text-blue-700 dark:text-blue-300">
          <span className="flex items-center gap-1.5 font-medium">
            <Smartphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            ย่อส่วน A4 ให้พอดีหน้าจอมือถืออัตโนมัติ ({displayZoomPercent}%) โดยคงสัดส่วนเดิม 100%
          </span>
          <button
            onClick={() => {
              setZoomMode('custom');
              setCustomZoom(100);
            }}
            className="text-[10px] underline font-bold hover:text-blue-800 dark:hover:text-blue-200 cursor-pointer shrink-0 ml-2"
          >
            ดูขนาดจริง (100%)
          </button>
        </div>
      )}

      {/* A4 Desk Container */}
      <div
        ref={containerRef}
        className="w-full bg-slate-200/90 dark:bg-slate-950 p-2 sm:p-6 md:p-8 rounded-2xl border border-[var(--border-light)] overflow-x-auto custom-scrollbar flex justify-center shadow-inner relative"
        style={{
          minHeight: `${scaledHeight + 16}px`
        }}
      >
        <div
          style={{
            height: `${scaledHeight}px`,
            width: `${Math.round(baseWidth * effectiveScale)}px`,
            position: 'relative',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <div
            id="a4-printable-paper"
            className={`bg-white text-slate-900 shadow-2xl transition-transform origin-top select-text ${paperClassName}`}
            style={{
              width: `${baseWidth}px`,
              minHeight: `${baseHeight}px`,
              transform: `scale(${effectiveScale})`,
              transformOrigin: 'top center',
              fontFamily: "'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif",
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
        </div>
      </div>

      {/* Print CSS Fix for strict A4 page output */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #a4-printable-paper, #a4-printable-paper * {
            visibility: visible;
          }
          #a4-printable-paper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            transform: none !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          @page {
            size: A4 ${orientation};
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default A4PaperPreview;
