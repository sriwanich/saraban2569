import React, { useState, useEffect, useRef } from 'react';
import {
  Download, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw,
  Share2, Shield, Lock, Unlock, Check, Copy, Printer,
  Eye, Globe, ArrowLeft, ExternalLink, QrCode as QrCodeIcon,
  Sparkles, CheckCircle2, AlertCircle, FileText, Smartphone, RefreshCw
} from 'lucide-react';
import QRCode from 'qrcode';
import { useRealtimeSync } from '../../utils/realtimeSync';
import { ensureGoogleFontLoaded } from './FontSelector';

interface InfographicPublicData {
  id: string;
  name: string;
  data?: string;
  thumbnail?: string;
  isProtected?: boolean;
  isPublic?: boolean;
  allowEmbed?: boolean;
  allowDownload?: boolean;
  authorName?: string;
  authorDepartment?: string;
  description?: string;
  tags?: string;
  viewCount?: number;
  downloadCount?: number;
  embedCount?: number;
  created_at?: string;
  updated_at?: string;
}

export const PublicInfographicsViewer: React.FC = () => {
  const [infographicId, setInfographicId] = useState<string>('');
  const [data, setData] = useState<InfographicPublicData | null>(null);
  const [highResImageUrl, setHighResImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Passcode verification
  const [passcode, setPasscode] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');

  // Share & QR Modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Download Resolution Modal State
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedScale, setSelectedScale] = useState<number>(2); // Default 2x HD
  const [selectedFormat, setSelectedFormat] = useState<'png' | 'jpeg'>('png');
  const [isExporting, setIsExporting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Parse URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const isEmbed = searchParams.get('embed') === 'true' || window.location.pathname.startsWith('/embed/infographics/');
  const themeParam = searchParams.get('theme'); // 'light', 'dark', 'auto'
  const showHeaderParam = searchParams.get('header') !== '0';
  const showToolbarParam = searchParams.get('toolbar') !== '0';
  const allowDownloadParam = searchParams.get('download') !== '0';
  const allowFullscreenParam = searchParams.get('fullscreen') !== '0';

  // Extract ID from pathname, hash, or search params
  useEffect(() => {
    const pathname = window.location.pathname || '';
    const hash = window.location.hash || '';
    const currentParams = new URLSearchParams(window.location.search);

    let id = '';

    // Check pathname: /public/infographics/ID, /embed/infographics/ID, /view/infographics/ID, /infographics/ID
    const pathMatch = pathname.match(/(?:public|embed|view)?\/?(?:infographics|infographic)\/([^/?#]+)/i);
    if (pathMatch && pathMatch[1]) {
      const candidate = decodeURIComponent(pathMatch[1]).trim().replace(/\.json$/i, '');
      if (!['public', 'embed', 'view', 'infographics', 'infographic'].includes(candidate.toLowerCase())) {
        id = candidate;
      }
    }

    // Check hash if not found: #/public/infographics/ID
    if (!id && hash) {
      const hashMatch = hash.match(/(?:public|embed|view)?\/?(?:infographics|infographic)\/([^/?#]+)/i);
      if (hashMatch && hashMatch[1]) {
        const candidate = decodeURIComponent(hashMatch[1]).trim().replace(/\.json$/i, '');
        if (!['public', 'embed', 'view', 'infographics', 'infographic'].includes(candidate.toLowerCase())) {
          id = candidate;
        }
      }
    }

    // Check search params if not found
    if (!id) {
      id = currentParams.get('id') || 
           currentParams.get('infographic_id') || 
           currentParams.get('info_id') || 
           currentParams.get('infographics_id') || '';
    }

    // Clean up trailing slash, quotes, or query fragments
    id = id.split('/')[0].split('?')[0].split('#')[0].replace(/['"]/g, '').trim();

    setInfographicId(id);
    if (id) {
      fetchInfographic(id);
    } else {
      setLoading(false);
      setError('ไม่พบรหัสสื่อ Infographic ในลิงก์ กรุณาตรวจสอบ URL หรือเปิดจากลิงก์ที่ได้รับจากผู้จัดทำ');
    }
  }, []);

  useRealtimeSync(['INFOGRAPHICS_UPDATED', 'DATA_UPDATED'], () => {
    if (infographicId) {
      // Background refresh: don't show loading spinner if we already have data
      fetchInfographic(infographicId, passcode, true);
    }
  }, [infographicId, passcode]);

  const render4KImageFromData = async (jsonString?: string) => {
    if (!jsonString) return;
    
    // Quick hash or comparison to avoid redundant heavy rendering
    if (data?.data === jsonString && highResImageUrl) {
      return;
    }

    try {
      const payload = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      if (!payload || !payload.canvas) return;

      // Ensure Fabric is available globally
      if (!(window as any).fabric) {
        await new Promise<void>((resolve, reject) => {
          const scriptId = 'fabric-cdn-script';
          let script = document.getElementById(scriptId) as HTMLScriptElement;
          if ((window as any).fabric) {
            resolve();
            return;
          }
          if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://cdn.jsdelivr.net/npm/fabric@6.4.3/dist/index.min.js';
            script.async = true;
            document.body.appendChild(script);
          }
          script.onload = () => resolve();
          script.onerror = (e) => reject(e);
        });
      }

      const fabric = (window as any).fabric;
      if (!fabric) return;

      // Extract and ensure all fonts are loaded before loading JSON to ensure correct rendering
      const fontsToLoad = new Set<string>();
      const findFonts = (objs: any[]) => {
        if (!objs || !Array.isArray(objs)) return;
        objs.forEach((obj: any) => {
          if (obj.fontFamily) {
            // Clean font names: take first font if comma-separated, remove quotes
            const cleanFont = obj.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
            if (cleanFont) fontsToLoad.add(cleanFont);
          }
          if (obj.objects) findFonts(obj.objects);
        });
      };
      
      if (payload.canvas && payload.canvas.objects) {
        findFonts(payload.canvas.objects);
      }
      
      // Wait for all fonts to be injected and loaded via Google Fonts API
      if (fontsToLoad.size > 0) {
        try {
          await Promise.all(Array.from(fontsToLoad).map(font => ensureGoogleFontLoaded(font)));
          // Extra safety wait for font loading API to settle
          if ('fonts' in document) {
            await (document as any).fonts.ready;
          }
          // Extra delay on mobile to ensure slow font networks catch up
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          if (isMobile) await new Promise(r => setTimeout(r, 1000));
        } catch (fontErr) {
          console.warn('Some fonts failed to load:', fontErr);
        }
      }

      const width = payload.size?.width || 800;
      const height = payload.size?.height || 600;
      const maxDim = Math.max(width, height);
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const targetDim = isMobile ? 1800 : 2400;
      const multiplier = Math.min(isMobile ? 2.5 : 4, Math.max(1, targetDim / maxDim));

      const tempCanvasEl = document.createElement('canvas');
      tempCanvasEl.width = width;
      tempCanvasEl.height = height;

      const staticCanvas = new (fabric.StaticCanvas || fabric.Canvas)(tempCanvasEl, {
        width,
        height,
        backgroundColor: payload.backgroundColor || '#ffffff',
        enableRetinaScaling: true,
        imageSmoothingEnabled: true,
      });

      // Fabric 6.x loadFromJSON is async / returns a promise
      await staticCanvas.loadFromJSON(payload.canvas);
      
      // Allow time for images & fonts to settle
      await new Promise((resolve) => setTimeout(resolve, 600));
      staticCanvas.renderAll();
      // Final re-render after another short burst to catch late font applications or layout shifts
      await new Promise(r => setTimeout(r, 300));
      staticCanvas.renderAll();

      try {
        const dataUrl = staticCanvas.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: multiplier,
        });

        // Only update highResImageUrl if it is a valid, non-empty image (length > 2000)
        if (dataUrl && dataUrl.length > 2000) {
          setHighResImageUrl(dataUrl);
        }
      } catch (e) {
        console.warn('Canvas export error:', e);
      } finally {
        staticCanvas.dispose();
      }
    } catch (err) {
      console.warn('Could not render image from JSON payload:', err);
    }
  };

  const fetchInfographic = async (id: string, customPasscode?: string, isSilent = false) => {
    if (!id || !id.trim()) {
      setLoading(false);
      setError('ไม่พบรหัสสื่อ Infographic ในลิงก์');
      return;
    }

    if (!isSilent) {
      setLoading(true);
    }
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (customPasscode) {
        headers['x-infographic-password'] = customPasscode;
      }
      const res = await fetch(`/api/public/infographics/${encodeURIComponent(id)}`, { headers });
      
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text().catch(() => '');
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          throw new Error('ไม่พบข้อมูลสื่อ Infographic นี้ในระบบ หรืออาจยังไม่ได้เปิดเผยแพร่แบบสาธารณะ');
        }
        throw new Error(`ไม่สามารถโหลดข้อมูลได้ (HTTP ${res.status})`);
      }

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'ไม่สามารถโหลดข้อมูล Infographic ได้');
      }

      // Check if data has actually changed before updating state and re-rendering image
      if (JSON.stringify(json) !== JSON.stringify(data)) {
        setData(json);
        if (json.data) {
          render4KImageFromData(json.data);
        }
      }

      // Track embed impression if in embed mode (only on initial load, not silent refreshes)
      if (isEmbed && !isSilent) {
        fetch(`/api/public/infographics/${encodeURIComponent(id)}/track-embed`, { method: 'POST' }).catch(() => {});
      }
    } catch (err: any) {
      console.error('Error fetching infographic:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || !infographicId) return;

    setIsUnlocking(true);
    setUnlockError(null);
    try {
      const res = await fetch(`/api/public/infographics/${encodeURIComponent(infographicId)}/verify-passcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() })
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('การตอบกลับจากระบบไม่ถูกต้อง');
      }

      const json = await res.json();
      if (res.ok && json.success) {
        await fetchInfographic(infographicId, passcode.trim());
      } else {
        setUnlockError(json.error || 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      console.error(err);
      setUnlockError(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Generate QR Code for Share Modal
  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => {
      if (data.logoUrl) setLogoUrl(data.logoUrl);
    }).catch(console.error);

    const fullUrl = window.location.href.replace(/([?&])embed=true(&|$)/, '$1').replace(/[?&]$/, '');
    QRCode.toDataURL(fullUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' }
    })
      .then(url => setQrCodeUrl(url))
      .catch(() => {});
  }, []);

  // Zoom Controls
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.3));
  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse / Touch Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch Support for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch to zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      
      if (lastTouchDistance !== null) {
        const delta = (distance - lastTouchDistance) * 0.01;
        setScale(prev => Math.min(Math.max(prev + delta, 0.3), 4));
      }
      setLastTouchDistance(distance);
      return;
    }

    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouchDistance(null);
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY * -0.005;
      setScale(prev => Math.min(Math.max(prev + delta, 0.3), 4));
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const getCanvasDimensions = () => {
    if (data?.data) {
      try {
        const payload = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
        if (payload?.size?.width && payload?.size?.height) {
          return { width: payload.size.width, height: payload.size.height };
        }
      } catch (_) {}
    }
    return { width: 1200, height: 800 };
  };

  const dimensions = getCanvasDimensions();

  const generatePngAtScale = async (multiplier: number): Promise<string | null> => {
    if (!data?.data) return null;
    try {
      const payload = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
      if (!payload || !payload.canvas) return null;

      // Ensure Fabric is available
      if (!(window as any).fabric) {
        await new Promise<void>((resolve, reject) => {
          const scriptId = 'fabric-cdn-script';
          let script = document.getElementById(scriptId) as HTMLScriptElement;
          if ((window as any).fabric) { resolve(); return; }
          if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://cdn.jsdelivr.net/npm/fabric@6.4.3/dist/index.min.js';
            script.async = true;
            document.body.appendChild(script);
          }
          script.onload = () => resolve();
          script.onerror = (e) => reject(e);
        });
      }

      const fabric = (window as any).fabric;
      if (!fabric) return null;

      // Extract and ensure all fonts are loaded before loading JSON
      const fontsToLoad = new Set<string>();
      const findFonts = (objs: any[]) => {
        if (!objs || !Array.isArray(objs)) return;
        objs.forEach((obj: any) => {
          if (obj.fontFamily) {
            const cleanFont = obj.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
            if (cleanFont) fontsToLoad.add(cleanFont);
          }
          if (obj.objects) findFonts(obj.objects);
        });
      };
      if (payload.canvas && payload.canvas.objects) {
        findFonts(payload.canvas.objects);
      }
      if (fontsToLoad.size > 0) {
        try {
          await Promise.all(Array.from(fontsToLoad).map(font => ensureGoogleFontLoaded(font)));
          if ('fonts' in document) await (document as any).fonts.ready;
        } catch (fErr) { console.warn('Download font load error:', fErr); }
      }

      const width = payload.size?.width || 800;
      const height = payload.size?.height || 600;

      const tempCanvasEl = document.createElement('canvas');
      tempCanvasEl.width = width;
      tempCanvasEl.height = height;

      const staticCanvas = new (fabric.StaticCanvas || fabric.Canvas)(tempCanvasEl, {
        width,
        height,
        backgroundColor: payload.backgroundColor || '#ffffff',
        enableRetinaScaling: true,
        imageSmoothingEnabled: true,
      });

      await staticCanvas.loadFromJSON(payload.canvas);
      await new Promise((resolve) => setTimeout(resolve, 600));
      staticCanvas.renderAll();
      await new Promise(r => setTimeout(r, 300));
      staticCanvas.renderAll();

      const mimeType = selectedFormat === 'jpeg' ? 'jpeg' : 'png';
      const dataUrl = staticCanvas.toDataURL({
        format: mimeType,
        quality: 0.95,
        multiplier: multiplier,
      });

      staticCanvas.dispose();
      if (dataUrl && dataUrl.length > 2000) {
        return dataUrl;
      }
    } catch (err) {
      console.warn('Error rendering image at scale:', err);
    }
    return null;
  };

  const executeDownload = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      let exportUrl = highResImageUrl || data.thumbnail;

      // Render custom resolution if requested scale differs or JSON payload is available
      if (data.data && selectedScale > 1) {
        const renderedUrl = await generatePngAtScale(selectedScale);
        if (renderedUrl) {
          exportUrl = renderedUrl;
        }
      }

      if (exportUrl) {
        // Track download
        fetch(`/api/public/infographics/${data.id}/track-download`, { method: 'POST' }).catch(() => {});

        const a = document.createElement('a');
        a.href = exportUrl;
        const cleanName = (data.name || 'infographic').replace(/[/\\?%*:|"<>]/g, '_');
        const scaleLabel = selectedScale === 4 ? '4K' : `${selectedScale}x`;
        const ext = selectedFormat === 'jpeg' ? 'jpg' : 'png';
        a.download = `${cleanName}-${scaleLabel}-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setShowDownloadModal(false);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const cleanUrl = window.location.href.replace(/([?&])embed=true(&|$)/, '$1').replace(/[?&]$/, '');
      await navigator.clipboard.writeText(cleanUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (_) {}
  };

  // Determine dark or light mode based on themeParam
  const isDark = themeParam === 'dark' || (themeParam !== 'light' && (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches));

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className={`w-full flex flex-col select-none overflow-hidden ${
        isEmbed ? 'h-full min-h-full p-0' : 'min-h-screen'
      } ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-900 text-slate-100'
      }`}
    >
      {/* Top Header Navigation (Only shown if showHeaderParam is true or not in embed) */}
      {(!isEmbed || showHeaderParam) && (
        <header className="shrink-0 bg-slate-900/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            {!isEmbed && (
              <a
                href="/"
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 text-xs"
                title="กลับสู่หน้าหลัก EDMS"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">หน้าหลัก EDMS</span>
              </a>
            )}
            <div className="flex items-center gap-2">
              {searchParams.get('logo') === 'true' && logoUrl && (
                <img src={logoUrl} alt="Logo" className="w-6 h-6 object-contain" />
              )}
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                EDMS Infographics
              </span>
              <div>
                <h1 className="font-bold text-sm sm:text-base font-noto-serif-thai text-white line-clamp-1">
                  {data?.name || 'Infographic Presentation'}
                </h1>
                {data && (
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {data.authorName || 'หน่วยงานภาครัฐ'} {data.authorDepartment ? `• ${data.authorDepartment}` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {!isEmbed && (
              <>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors"
                  title="พิมพ์เอกสาร (Print)"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden md:inline">พิมพ์</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors"
                  title="แชร์ & QR Code"
                >
                  <Share2 className="w-4 h-4 text-blue-400" />
                  <span className="hidden md:inline">แชร์</span>
                </button>
              </>
            )}

            {data?.allowDownload !== false && allowDownloadParam && (
              <button
                type="button"
                onClick={() => setShowDownloadModal(true)}
                disabled={!data?.thumbnail || data?.isProtected}
                className="px-3 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">ดาวน์โหลดภาพ</span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* Main Canvas / Image Stage */}
      <main
        className="flex-1 relative flex items-center justify-center overflow-hidden cursor-default"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center gap-3 text-slate-400 animate-pulse">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-sm font-medium font-noto-serif-thai">กำลังโหลด Infographic...</span>
          </div>
        )}

        {/* Error View */}
        {error && !loading && (
          <div className="max-w-md p-6 sm:p-8 bg-slate-900/95 backdrop-blur-xl border border-rose-500/30 rounded-3xl text-center space-y-4 shadow-2xl animate-in fade-in mx-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30 shadow-inner">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-rose-400 font-noto-serif-thai">ไม่สามารถแสดงผลได้</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">{error}</p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {infographicId && (
                <button
                  type="button"
                  onClick={() => fetchInfographic(infographicId)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> ลองใหม่อีกครั้ง
                </button>
              )}
              
              {!isEmbed && (
                <a
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition-colors border border-white/10"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> กลับสู่หน้าหลัก EDMS
                </a>
              )}
            </div>
          </div>
        )}

        {/* Password Protection Lock Screen */}
        {data?.isProtected && !loading && (
          <div className="max-w-md w-full mx-4 p-6 sm:p-8 bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 rounded-3xl shadow-2xl text-center space-y-5 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-bold text-lg text-white font-noto-serif-thai">
                เอกสารถูกจำกัดสิทธิ์การเข้าชม
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                สื่อ Infographic นี้ได้รับการตั้งค่ารหัสผ่านป้องกัน กรุณากรอกรหัสผ่านเพื่อเข้าดู
              </p>
            </div>

            <form onSubmit={handleVerifyPasscode} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  รหัสผ่าน (Passcode PIN)
                </label>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="กรอกรหัสผ่าน..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-xl text-sm font-mono text-white outline-none"
                  autoFocus
                />
              </div>

              {unlockError && (
                <p className="text-xs text-rose-400 font-semibold">{unlockError}</p>
              )}

              <button
                type="submit"
                disabled={isUnlocking || !passcode.trim()}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 disabled:opacity-50"
              >
                {isUnlocking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                <span>{isUnlocking ? 'กำลังตรวจสอบ...' : 'ปลดล็อกเพื่อเข้าชม'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Render Image Presentation Stage */}
        {data && !data.isProtected && !loading && data.thumbnail && (
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`transition-transform duration-75 ease-out select-none flex items-center justify-center ${
              isEmbed ? 'w-full h-full p-2' : 'p-4 max-w-full max-h-full'
            }`}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
          >
            <img
              ref={imageRef}
              src={highResImageUrl || data.thumbnail}
              onError={() => {
                if (highResImageUrl) {
                  setHighResImageUrl(null);
                }
              }}
              alt={data.name || 'Infographic'}
              style={{
                imageRendering: 'high-quality' as any,
                WebkitBackfaceVisibility: 'hidden',
                transform: 'translateZ(0)'
              }}
              className={`${
                isEmbed ? 'max-w-full max-h-full' : 'max-w-[92vw] max-h-[82vh]'
              } object-contain rounded-2xl shadow-2xl border border-white/10 pointer-events-none`}
              draggable={false}
            />
          </div>
        )}

        {/* Floating Zoom & Pan Toolbar */}
        {(!isEmbed || showToolbarParam) && data && !data.isProtected && !loading && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-white/15 rounded-full p-1.5 flex items-center gap-1 shadow-2xl z-40">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="ย่อ (Zoom Out)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              className="px-3 py-1 text-xs font-mono font-bold text-slate-200 hover:bg-white/10 rounded-full transition-colors"
              title="คืนค่า 100%"
            >
              {Math.round(scale * 100)}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="ขยาย (Zoom In)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-white/20 mx-1"></div>

            <button
              type="button"
              onClick={handleResetZoom}
              className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="รีเซ็ตตำแหน่ง"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {allowFullscreenParam && (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title={isFullscreen ? 'ออกจากโหมดเต็มจอ' : 'แสดงเต็มจอ'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4 text-blue-400" />}
              </button>
            )}
          </div>
        )}
      </main>

      {/* Share Modal & QR Code Popup for Public Visitors */}
      {showShareModal && data && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-400" />
                <h4 className="font-bold text-base font-noto-serif-thai text-white">แชร์สื่อ Infographic</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-800/60 rounded-2xl border border-slate-700 space-y-3">
              <div className="p-3 bg-white rounded-2xl">
                {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 object-contain" />}
              </div>
              <span className="text-[11px] text-slate-400">สแกนด้วยสมาร์ตโฟนเพื่อเปิดดูทันที</span>
            </div>

            {/* Copy Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">ลิงก์เปิดดูสาธารณะ</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={window.location.href.replace(/([?&])embed=true(&|$)/, '$1').replace(/[?&]$/, '')}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 select-all outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
                </button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 block">แชร์ไปยังโซเชียลมีเดีย</span>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cleanUrl = encodeURIComponent(window.location.href.replace(/([?&])embed=true(&|$)/, '$1').replace(/[?&]$/, ''));
                    window.open(`https://social-plugins.line.me/lineit/share?url=${cleanUrl}`, '_blank');
                  }}
                  className="p-2.5 rounded-xl bg-[#06c755]/15 hover:bg-[#06c755]/25 border border-[#06c755]/30 text-[#06c755] text-xs font-bold flex flex-col items-center gap-1 transition-all"
                >
                  <span className="text-sm font-black">LINE</span>
                  <span className="text-[10px]">ไลน์</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const cleanUrl = encodeURIComponent(window.location.href.replace(/([?&])embed=true(&|$)/, '$1').replace(/[?&]$/, ''));
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${cleanUrl}`, '_blank');
                  }}
                  className="p-2.5 rounded-xl bg-[#1877f2]/15 hover:bg-[#1877f2]/25 border border-[#1877f2]/30 text-[#1877f2] text-xs font-bold flex flex-col items-center gap-1 transition-all"
                >
                  <span className="text-sm font-black">FB</span>
                  <span className="text-[10px]">Facebook</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const cleanUrl = encodeURIComponent(window.location.href.replace(/([?&])embed=true(&|$)/, '$1').replace(/[?&]$/, ''));
                    const title = encodeURIComponent(data.name || 'Infographic');
                    window.open(`https://twitter.com/intent/tweet?url=${cleanUrl}&text=${title}`, '_blank');
                  }}
                  className="p-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 text-xs font-bold flex flex-col items-center gap-1 transition-all"
                >
                  <span className="text-sm font-black">𝕏</span>
                  <span className="text-[10px]">Twitter / X</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const cleanUrl = encodeURIComponent(window.location.href.replace(/([?&])embed=true(&|$)/, '$1').replace(/[?&]$/, ''));
                    const title = encodeURIComponent(`แชร์ Infographic: ${data.name || ''}`);
                    const body = encodeURIComponent(`สามารถดู Infographic ได้ที่ลิงก์นี้:\n\n${window.location.href}`);
                    window.location.href = `mailto:?subject=${title}&body=${body}`;
                  }}
                  className="p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-xs font-bold flex flex-col items-center gap-1 transition-all"
                >
                  <span className="text-sm font-black">✉️</span>
                  <span className="text-[10px]">อีเมล</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Resolution Selector Modal */}
      {showDownloadModal && data && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-left">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base font-noto-serif-thai text-white">ดาวน์โหลดรูปภาพ Infographic</h4>
                  <p className="text-xs text-slate-400">เลือกระดับความละเอียดที่ต้องการ (รองรับสูงสุด 4K Ultra HD)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDownloadModal(false)}
                disabled={isExporting}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Resolution Options Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">ระดับความละเอียดรูปภาพ (Resolution)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { scale: 1, label: '1x ความละเอียดมาตรฐาน', desc: 'เหมาะสำหรับมือถือ/เว็บ', badge: 'Standard' },
                  { scale: 2, label: '2x ความละเอียดสูง HD', desc: 'เหมาะสำหรับงานนำเสนอ', badge: 'HD' },
                  { scale: 3, label: '3x ความละเอียดโปร 3K', desc: 'เหมาะสำหรับจอใหญ่/สิ่งพิมพ์', badge: '3K Super' },
                  { scale: 4, label: '4x ความละเอียดสูงสุด 4K', desc: 'คมชัดสูงสุด งานพิมพ์ป้ายใหญ่', badge: '4K Ultra' },
                ].map((opt) => {
                  const w = dimensions.width * opt.scale;
                  const h = dimensions.height * opt.scale;
                  const isSelected = selectedScale === opt.scale;
                  return (
                    <div
                      key={opt.scale}
                      onClick={() => setSelectedScale(opt.scale)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500 text-white ring-2 ring-blue-500/40 shadow-lg'
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-blue-400 bg-blue-500' : 'border-slate-600'
                          }`}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                          <span className="font-bold text-xs">{opt.label}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          opt.scale === 4
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : isSelected ? 'bg-blue-500/30 text-blue-200' : 'bg-slate-700 text-slate-400'
                        }`}>
                          {opt.scale === 4 && <Sparkles className="w-2.5 h-2.5 inline mr-1 text-amber-400" />}
                          {opt.badge}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-slate-400">{w} × {h} px</span>
                        <span className="text-[10px] text-slate-400 line-clamp-1">{opt.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Format Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-300 block">ฟอร์แมตไฟล์ (File Format)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('png')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedFormat === 'png'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>PNG (ไฟล์คมชัดโปร่งใส)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat('jpeg')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedFormat === 'jpeg'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>JPG (ไฟล์บีบอัดสำหรับเว็บ)</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDownloadModal(false)}
                disabled={isExporting}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={executeDownload}
                disabled={isExporting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังเรนเดอร์รูปภาพ ({selectedScale === 4 ? '4K' : `${selectedScale}x`})...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลดรูปภาพ ({selectedScale === 4 ? '4K Ultra' : `${selectedScale}x`})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
