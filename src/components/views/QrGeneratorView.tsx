import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { 
  QrCode, Download, Copy, Printer, Check, RefreshCw, FileText, Globe, 
  User, Wifi, CreditCard, Sparkles, ShieldCheck, Palette, Image as ImageIcon, 
  Layers, CheckCircle2, AlertCircle, Building2, Sliders, Eye, Share2, 
  FolderOpen, Bookmark, Save, Trash2, ArrowRight, ExternalLink, Hash, Calendar, Send,
  Plus, Edit, Pause, Play, CheckSquare, Square, BarChart2, MapPin, Laptop, Smartphone, HelpCircle, LayoutGrid,
  Star, Upload, FileDown, CopyPlus, CheckCheck, Search, Tag, SlidersHorizontal, RotateCcw, Info,
  X, AlertTriangle, Megaphone, Briefcase, Clock, Lock, Landmark, Shield, ArrowUpRight, Scissors,
  Wand2, Scan
} from 'lucide-react';
import { DocumentItem } from '../../types';
import { useConfirm } from '../../context/ConfirmContext';
import AiDocumentStamperModal from '../AiDocumentStamperModal';
import QrDesignControls from '../qr/QrDesignControls';
import QrLivePreview from '../qr/QrLivePreview';

interface QrGeneratorViewProps {
  user?: any;
  documents?: DocumentItem[];
  initialDocId?: string;
  onViewDoc?: (doc: DocumentItem) => void;
}

export default function QrGeneratorView({ user, documents = [], initialDocId, onViewDoc }: QrGeneratorViewProps) {
  const { confirm } = useConfirm();
  // Navigation tabs inside Enterprise QR Studio
  const [activeTab, setActiveTab] = useState<'create' | 'analytics' | 'bulk' | 'templates' | 'sticker' | 'test'>('create');

  // AI Document Stamper Modal state
  const [isAiStamperOpen, setIsAiStamperOpen] = useState(false);

  // System settings state & Drag-and-Drop state
  const [sysSettings, setSysSettings] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('moi_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => {
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          return res.json();
        }
        return null;
      })
      .then(data => {
        if (data) {
          setSysSettings(data);
          if (data.logoUrl) {
            try {
              localStorage.setItem('moi_logo', data.logoUrl);
            } catch (_) {}
          }
        }
      })
      .catch(err => {
        console.error('Error fetching settings in QrGeneratorView:', err);
      });
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setCustomLogoUrl(ev.target.result as string);
            setLogoType('custom');
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Generator Mode: Static vs Dynamic Routing
  const [generationMode, setGenerationMode] = useState<'static' | 'dynamic'>('static');

  // QR Content Type
  const [qrType, setQrType] = useState<'edms' | 'url' | 'text' | 'vcard' | 'wifi' | 'promptpay'>('edms');

  // EDMS Document selection
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId || '');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docCategoryFilter, setDocCategoryFilter] = useState<'all' | 'urgent' | 'command' | 'internal' | 'external'>('all');

  // Contrast & Scannability Checker
  const getContrastRatio = (fg: string, bg: string, isTransparent: boolean) => {
    if (isTransparent) return { ratio: 21, score: 'AAA', label: 'พื้นหลังโปร่งใส (สแกนคมชัดตามเอกสาร)', isGood: true };
    try {
      const hexToRgb = (hex: string) => {
        const clean = hex.replace('#', '');
        const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
        return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
      };
      const getLum = ([r, g, b]: number[]) => {
        const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      };
      const l1 = getLum(hexToRgb(fg));
      const l2 = getLum(hexToRgb(bg));
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const rounded = Math.round(ratio * 10) / 10;
      if (rounded >= 7) {
        return { ratio: rounded, score: 'AAA', label: 'ความคมชัดระดับสูงสุด (สแกนง่าย 100%)', isGood: true };
      } else if (rounded >= 4.5) {
        return { ratio: rounded, score: 'AA', label: 'ความคมชัดมาตรฐานราชการ (สแกนได้ดี)', isGood: true };
      } else {
        return { ratio: rounded, score: 'ต่ำ', label: 'ความคมชัดต่ำ อาจสแกนได้ยากในสภาพแสงน้อย', isGood: false };
      }
    } catch {
      return { ratio: 21, score: 'AAA', label: 'ผ่านเกณฑ์มาตรฐานสากล', isGood: true };
    }
  };

  // Form Fields
  const [urlInput, setUrlInput] = useState('https://rayong.popt.go.th');
  const [customTitle, setCustomTitle] = useState('สนง.ปภ.ระยอง');
  const [textInput, setTextInput] = useState('ประกาศสำนักงาน ปภ. จังหวัดระยอง เรื่อง มาตรการป้องกันสาธารณภัย');
  
  // Simulator Countdown State
  const [simCountdown, setSimCountdown] = useState(5);
  const [simPaused, setSimPaused] = useState(false);
  
  // vCard Fields
  const [vcard, setVcard] = useState({
    name: 'นายสมชาย รักษ์ดี',
    title: 'นักวิเคราะห์นโยบายและแผนชำนาญการ',
    org: 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
    phone: '038-694-000',
    email: 'contact@rayong.go.th',
    address: 'ศาลากลางจังหวัดระยอง ถนนสุขุมวิท อ.เมือง จ.ระยอง 21000',
    website: 'https://rayong.popt.go.th'
  });

  // Wi-Fi Fields
  const [wifi, setWifi] = useState({
    ssid: 'PND_Guest_WiFi',
    password: 'PND@Rayong2569',
    encryption: 'WPA' as 'WPA' | 'WEP' | 'nopass'
  });

  // PromptPay Fields
  const [promptPay, setPromptPay] = useState({
    id: '0994000123456',
    amount: '150.00'
  });

  // Styling State
  const [fgColor, setFgColor] = useState('#0f172a');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [transparentBg, setTransparentBg] = useState(false);
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  const [qrMargin, setQrMargin] = useState(2);

  // Gradient Overlay State
  const [gradientType, setGradientType] = useState<'solid' | 'linear' | 'radial'>('solid');
  const [gradientColor2, setGradientColor2] = useState('#2563eb');
  const [gradientAngle, setGradientAngle] = useState<number>(45);

  // Logo Overlay State
  const [logoType, setLogoType] = useState<'none' | 'garuda' | 'ddpm' | 'province' | 'custom'>('garuda');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');
  const [logoScale, setLogoScale] = useState(0.22); // 22% of QR size

  // Frame Banner State
  const [frameType, setFrameType] = useState<'none' | 'top-bottom' | 'card' | 'badge' | 'official-garuda' | 'modern-border' | 'label-side'>('top-bottom');
  const [frameText, setFrameText] = useState('สแกนเพื่อตรวจสอบเอกสาร EDMS');
  const [frameTextBottom, setFrameTextBottom] = useState('สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  const [frameColor, setFrameColor] = useState('#0f172a');
  const [frameTextColor, setFrameTextColor] = useState('#ffffff');

  // Preview & Output States
  const [generatedDataUrl, setGeneratedDataUrl] = useState<string>('');
  const [rawQrPayload, setRawQrPayload] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [stampSuccess, setStampSuccess] = useState(false);
  const [isSavingToDoc, setIsSavingToDoc] = useState(false);

  // Dynamic QR States
  const [dynamicQrs, setDynamicQrs] = useState<any[]>([]);
  const [isLoadingQrs, setIsLoadingQrs] = useState(false);
  const [registeredSlug, setRegisteredSlug] = useState<string>('');
  const [analyticsSlug, setAnalyticsSlug] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isRegisteringDynamic, setIsRegisteringDynamic] = useState(false);
  
  // Floating Toast Notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };
  
  // Inline edit states for Dynamic QRs
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingUrl, setEditingUrl] = useState('');
  const [editingStatus, setEditingStatus] = useState('active');

  // Scanner simulator states
  const [decodeLoading, setDecodeLoading] = useState(false);
  const [decodedResult, setDecodedResult] = useState<any>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  // Bulk Generator State
  const [bulkInputMode, setBulkInputMode] = useState<'text' | 'docs'>('text');
  const [bulkTextInput, setBulkTextInput] = useState("https://rayong.popt.go.th/announcement-1\nhttps://rayong.popt.go.th/announcement-2\nhttps://rayong.popt.go.th/announcement-3");
  const [bulkSelectedDocIds, setBulkSelectedDocIds] = useState<string[]>([]);
  const [bulkGeneratedItems, setBulkGeneratedItems] = useState<any[]>([]);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);

  // Saved Templates State (Full Options Support)
  const [savedTemplates, setSavedTemplates] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('enterprise_qr_templates');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');

  // Modal states for Save / Edit Full Template
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [modalTplId, setModalTplId] = useState('');
  const [modalTplName, setModalTplName] = useState('');
  const [modalTplCategory, setModalTplCategory] = useState('official');
  const [modalTplDescription, setModalTplDescription] = useState('');
  const [modalTplDefaultQrType, setModalTplDefaultQrType] = useState('edms');
  const [modalTplIsDefault, setModalTplIsDefault] = useState(false);
  const jsonImportInputRef = useRef<HTMLInputElement>(null);

  // Sticker A4 Sheet Studio State
  const [stickerLayout, setStickerLayout] = useState<'6' | '12' | '24'>('12');
  const [stickerShowOrg, setStickerShowOrg] = useState(true);
  const [stickerShowDoc, setStickerShowDoc] = useState(true);
  const [stickerShowDate, setStickerShowDate] = useState(true);
  const [stickerCustomTitle, setStickerCustomTitle] = useState('สำนักงาน ปภ. จังหวัดระยอง');
  const [stickerBorder, setStickerBorder] = useState(true);

  // Classic history
  const [history, setHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('edms_qr_history');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bulkCanvasRef = useRef<HTMLCanvasElement>(null);

  // Pre-select document if passed via props
  useEffect(() => {
    if (initialDocId) {
      setSelectedDocId(initialDocId);
      setQrType('edms');
    }
  }, [initialDocId]);

  // Derived selected document object
  const selectedDoc = documents.find(d => d.id === selectedDocId);

  // Default Garuda and Province Logos
  const defaultGarudaUrl = 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Seal_of_the_Ministry_of_Interior_of_Thailand.svg';
  const GARUDA_LOGO_URL = sysSettings?.garuda30Url || sysSettings?.garuda15Url || defaultGarudaUrl;
  const DDPM_LOGO_URL = sysSettings?.logoUrl || (typeof window !== 'undefined' ? (localStorage.getItem('moi_logo') || localStorage.getItem('moi_schoolLogo')) : null) || '/ddpm-logo.svg';
  const RAYONG_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png';

  // Preset Color Palettes
  const presetPalettes = [
    { name: 'สารบรรณกรมท่า', fg: '#0f172a', bg: '#ffffff', frame: '#0f172a', gradType: 'solid', col2: '#2563eb' },
    { name: 'ตราครุฑทองคำ', fg: '#78350f', bg: '#fffbeb', frame: '#78350f', gradType: 'linear', col2: '#d97706' },
    { name: 'ด่วนที่สุด', fg: '#991b1b', bg: '#fef2f2', frame: '#dc2626', gradType: 'solid', col2: '#ef4444' },
    { name: 'เขียวมรกตราชการ', fg: '#064e3b', bg: '#f0fdf4', frame: '#059669', gradType: 'linear', col2: '#10b981' },
    { name: 'นครระยองสีคราม', fg: '#075985', bg: '#f0f9ff', frame: '#0284c7', gradType: 'linear', col2: '#06b6d4' },
    { name: 'คลาสสิกเข้มข้น', fg: '#000000', bg: '#ffffff', frame: '#18181b', gradType: 'solid', col2: '#3f3f46' },
  ];

  // Fetch Dynamic QR codes list
  const fetchDynamicQrs = async () => {
    setIsLoadingQrs(true);
    try {
      const res = await fetch('/api/qr-generator/dynamic');
      if (res.ok) {
        const data = await res.json();
        setDynamicQrs(data);
      }
    } catch (err) {
      console.error('Failed to load dynamic QRs:', err);
    } finally {
      setIsLoadingQrs(false);
    }
  };

  // Load dynamic QRs on mount and when tab changes
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchDynamicQrs();
    }
  }, [activeTab]);

  // Load analytics detail
  const loadAnalytics = async (slug: string) => {
    setIsLoadingAnalytics(true);
    setAnalyticsSlug(slug);
    try {
      const res = await fetch(`/api/qr-generator/analytics/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  // Create a Dynamic QR Code on backend
  const registerDynamicQr = async (forceUrl?: string) => {
    setIsRegisteringDynamic(true);
    try {
      let targetUrl = forceUrl;
      if (!targetUrl) {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://edms.go.th';
        switch (qrType) {
          case 'edms':
            targetUrl = selectedDocId ? `${origin}/verify?docId=${selectedDocId}` : `${origin}/verify?docId=DEMO-DOC-2569`;
            break;
          case 'url':
            let u = urlInput.trim();
            if (u && !u.startsWith('http://') && !u.startsWith('https://')) {
              u = 'https://' + u;
            }
            targetUrl = u || origin;
            break;
          case 'text':
            targetUrl = textInput.trim() || origin;
            break;
          case 'vcard':
            targetUrl = `BEGIN:VCARD\nVERSION:3.0\nN:${vcard.name}\nFN:${vcard.name}\nTITLE:${vcard.title}\nORG:${vcard.org}\nTEL;TYPE=WORK,VOICE:${vcard.phone}\nEMAIL:${vcard.email}\nADR;TYPE=WORK:;;${vcard.address}\nURL:${vcard.website}\nEND:VCARD`;
            break;
          case 'wifi':
            targetUrl = `WIFI:S:${wifi.ssid};T:${wifi.encryption};P:${wifi.password};;`;
            break;
          case 'promptpay':
            const cleanId = promptPay.id.replace(/[^0-9]/g, '');
            targetUrl = `PROMPTPAY:${cleanId}:${promptPay.amount || '0'}`;
            break;
          default:
            targetUrl = origin;
        }
      }

      if (!targetUrl) {
        showToast('error', 'กรุณาระบุข้อมูล URL หรือเนื้อหาที่ต้องการลงทะเบียนก่อน');
        setIsRegisteringDynamic(false);
        return null;
      }

      const payloadStyle = {
        fgColor,
        bgColor,
        transparentBg,
        errorCorrection,
        qrMargin,
        gradientType,
        gradientColor2,
        gradientAngle,
        logoType,
        customLogoUrl: customLogoUrl && customLogoUrl.length > 50000 ? '' : customLogoUrl,
        frameType,
        frameText,
        frameTextBottom,
        frameColor,
        frameTextColor
      };

      let dynamicTitle = customTitle.trim() || (frameType !== 'none' && frameText ? frameText : '');
      if (!dynamicTitle) {
        if (qrType === 'url') {
          dynamicTitle = urlInput.trim() ? urlInput.replace(/^https?:\/\//, '').split('/')[0] : 'เว็บไซต์หน่วยงาน';
        } else if (qrType === 'edms') {
          dynamicTitle = selectedDoc ? (selectedDoc.title || selectedDoc.docNumber) : 'เอกสารสารบรรณ ปภ.ระยอง';
        } else {
          dynamicTitle = 'สนง.ปภ.ระยอง';
        }
      }

      const res = await fetch('/api/qr-generator/dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: dynamicTitle,
          originalUrl: targetUrl,
          createdBy: user?.username || 'ผู้ดูแลระบบ',
          type: qrType,
          styleConfig: JSON.stringify(payloadStyle)
        })
      });

      if (res.ok) {
        const result = await res.json().catch(() => null);
        if (result && result.success && result.qr) {
          setRegisteredSlug(result.qr.slug);
          setGenerationMode('dynamic'); // Lock into dynamic representation
          fetchDynamicQrs(); // Update Dynamic list
          showToast('success', `ลงทะเบียน Dynamic URL สั้น [ ${result.qr.slug} ] สำเร็จ!`);
          
          // Auto copy short url to clipboard
          const shortUrl = `${window.location.origin}/qr/${result.qr.slug}`;
          try {
            await navigator.clipboard.writeText(shortUrl);
          } catch (_) {}
          
          return result.qr.slug;
        } else {
          showToast('error', 'เกิดข้อผิดพลาด: ' + (result?.error || 'ไม่สามารถลงทะเบียน Dynamic QR ได้'));
        }
      } else {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error || (res.status ? `(HTTP ${res.status}) ${res.statusText || 'ไม่ทราบสาเหตุ'}` : 'การเชื่อมต่อกับเซิร์ฟเวอร์ขัดข้อง');
        showToast('error', 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: ' + errMsg);
      }
    } catch (err: any) {
      console.error('Failed to register dynamic QR:', err);
      showToast('error', 'เกิดข้อผิดพลาดในการลงทะเบียน Dynamic QR: ' + err.message);
    } finally {
      setIsRegisteringDynamic(false);
    }
    return null;
  };

  // Update Dynamic QR details
  const handleUpdateDynamicQr = async (slug: string) => {
    try {
      const res = await fetch(`/api/qr-generator/dynamic/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTitle,
          originalUrl: editingUrl,
          status: editingStatus,
          styleConfig: '{}'
        })
      });

      if (res.ok) {
        setEditingSlug(null);
        fetchDynamicQrs();
        if (analyticsSlug === slug) {
          loadAnalytics(slug);
        }
        showToast('success', 'แก้ไขข้อมูลเส้นทางสแกนสำเร็จ!');
      } else {
        showToast('error', 'ไม่สามารถบันทึกการแก้ไขได้');
      }
    } catch (err: any) {
      console.error('Failed to update dynamic QR:', err);
      showToast('error', 'เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    }
  };

  // Toggle status (Active / Paused) directly
  const handleToggleStatus = async (qr: any) => {
    const newStatus = qr.status === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`/api/qr-generator/dynamic/${qr.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: qr.title,
          originalUrl: qr.originalUrl,
          status: newStatus,
          styleConfig: qr.styleConfig
        })
      });

      if (res.ok) {
        fetchDynamicQrs();
        if (analyticsSlug === qr.slug) {
          loadAnalytics(qr.slug);
        }
        showToast('info', `เปลี่ยนสถานะเป็น ${newStatus === 'active' ? 'เปิดใช้งาน' : 'ระงับชั่วคราว'} สำเร็จ`);
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  // Delete Dynamic QR
  const handleDeleteDynamicQr = async (slug: string) => {
    const confirmed = await confirm({
      title: 'ยืนยันการลบ Dynamic QR Code',
      message: 'ยืนยันที่จะลบ Dynamic QR และข้อมูลสถิติทั้งหมดใช่หรือไม่? การลบนี้ไม่สามารถกู้คืนได้',
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/qr-generator/dynamic/${slug}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchDynamicQrs();
        if (analyticsSlug === slug) {
          setAnalyticsData(null);
          setAnalyticsSlug('');
        }
        showToast('success', 'ลบข้อมูล Dynamic QR สำเร็จ!');
      } else {
        showToast('error', 'ล้มเหลวในการลบ Dynamic QR');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'เกิดข้อผิดพลาดในการลบ');
    }
  };

  // Simulate a scan for demo
  const handleSimulateScan = async (slug: string) => {
    try {
      // Direct call to trigger /qr/:slug on backend to generate log
      await fetch(`/qr/${slug}`, { method: 'GET', mode: 'no-cors' });
      // Reload analytics after short delay
      setTimeout(() => {
        loadAnalytics(slug);
      }, 300);
    } catch (e) {
      console.error(e);
    }
  };

  // Decode QR Payload simulator function
  const handleDecodeAndVerify = async (payloadToDecode = rawQrPayload) => {
    if (!payloadToDecode) {
      setDecodedResult(null);
      setDecodeError('ไม่มีข้อมูล QR Payload ในการจำลอง');
      return;
    }
    
    setDecodeLoading(true);
    setDecodeError(null);
    setDecodedResult(null);

    try {
      if (payloadToDecode.startsWith('http://') || payloadToDecode.startsWith('https://')) {
        let targetUrl = payloadToDecode;
        let resolvedTitle = customTitle || (frameType !== 'none' && frameText ? frameText : 'สนง.ปภ.ระยอง');

        try {
          const urlObj = new URL(targetUrl);
          const pathSegments = urlObj.pathname.split('/').filter(Boolean);
          
          if (pathSegments[0] === 'qr' && pathSegments[1]) {
            const slug = pathSegments[1];
            // Fetch resolved slug from server
            const resolveRes = await fetch(`/api/resolve-slug/${slug}`);
            if (resolveRes.ok) {
              const data = await resolveRes.json();
              if (data.originalUrl) {
                targetUrl = data.originalUrl;
              }
              if (data.title) {
                resolvedTitle = data.title;
              }
            }
          }
        } catch (urlErr) {
          console.warn('URL parsing error in decoder:', urlErr);
        }

        // Now targetUrl is either the original /verify?docId=... or another URL
        if (targetUrl.includes('/verify')) {
          try {
            const targetUrlObj = new URL(targetUrl.startsWith('http') ? targetUrl : `https://temp.org${targetUrl}`);
            const docId = targetUrlObj.searchParams.get('docId');
            if (docId) {
              // Fetch document details via our new endpoint
              const verifyRes = await fetch(`/api/verify-data?docId=${encodeURIComponent(docId)}`);
              if (verifyRes.ok) {
                const resData = await verifyRes.json();
                if (resData.success) {
                  setDecodedResult({
                    type: 'document',
                    payload: payloadToDecode,
                    resolvedUrl: targetUrl,
                    title: resData.document?.title || resolvedTitle,
                    document: resData.document,
                    signatures: resData.signatures
                  });
                  setSimCountdown(5);
                  setSimPaused(false);
                  setDecodeLoading(false);
                  return;
                }
              } else {
                setDecodedResult({
                  type: 'document_not_found',
                  payload: payloadToDecode,
                  resolvedUrl: targetUrl,
                  title: resolvedTitle,
                  docId: docId
                });
                setSimCountdown(5);
                setSimPaused(false);
                setDecodeLoading(false);
                return;
              }
            }
          } catch (innerErr) {
            console.error('Error handling verify extraction:', innerErr);
          }
        }

        // General URL
        setDecodedResult({
          type: 'url',
          payload: payloadToDecode,
          resolvedUrl: targetUrl,
          title: resolvedTitle
        });
        setSimCountdown(5);
        setSimPaused(false);
      } else if (payloadToDecode.startsWith('BEGIN:VCARD')) {
        const nameMatch = payloadToDecode.match(/FN:(.*)/);
        const phoneMatch = payloadToDecode.match(/TEL.*:(.*)/);
        const emailMatch = payloadToDecode.match(/EMAIL:(.*)/);
        const orgMatch = payloadToDecode.match(/ORG:(.*)/);
        setDecodedResult({
          type: 'vcard',
          payload: payloadToDecode,
          vcard: {
            name: nameMatch ? nameMatch[1].trim() : 'ไม่ระบุ',
            phone: phoneMatch ? phoneMatch[1].trim() : 'ไม่ระบุ',
            email: emailMatch ? emailMatch[1].trim() : 'ไม่ระบุ',
            org: orgMatch ? orgMatch[1].trim() : 'ไม่ระบุ'
          }
        });
      } else if (payloadToDecode.startsWith('WIFI:')) {
        const ssidMatch = payloadToDecode.match(/S:([^;]+)/);
        const passMatch = payloadToDecode.match(/P:([^;]+)/);
        const encMatch = payloadToDecode.match(/T:([^;]+)/);
        setDecodedResult({
          type: 'wifi',
          payload: payloadToDecode,
          wifi: {
            ssid: ssidMatch ? ssidMatch[1] : 'ไม่ระบุ',
            password: passMatch ? passMatch[1] : 'ไม่มีรหัสผ่าน',
            encryption: encMatch ? encMatch[1] : 'WPA'
          }
        });
      } else if (payloadToDecode.startsWith('PROMPTPAY:')) {
        const parts = payloadToDecode.split(':');
        setDecodedResult({
          type: 'promptpay',
          payload: payloadToDecode,
          promptpay: {
            id: parts[1] || 'ไม่ระบุ',
            amount: parts[2] || '0'
          }
        });
      } else {
        setDecodedResult({
          type: 'text',
          payload: payloadToDecode
        });
      }
    } catch (err: any) {
      console.error(err);
      setDecodeError('เกิดข้อผิดพลาดในการดึงข้อมูลตรวจสอบ: ' + err.message);
    } finally {
      setDecodeLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'test') {
      handleDecodeAndVerify();
    }
  }, [activeTab, rawQrPayload]);

  // Phone Simulator Countdown Timer Effect
  useEffect(() => {
    if (activeTab !== 'test' || simPaused || !decodedResult || decodedResult.type !== 'url') return;
    if (simCountdown <= 0) return;

    const timer = setInterval(() => {
      setSimCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTab, simPaused, simCountdown, decodedResult]);

  // Compute final QR payload
  const getComputedPayload = (): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://edms.go.th';
    
    // If registered dynamic, use the redirection slug endpoint
    if (generationMode === 'dynamic' && registeredSlug) {
      return `${origin}/qr/${registeredSlug}`;
    }

    switch (qrType) {
      case 'edms':
        if (selectedDocId) {
          return `${origin}/verify?docId=${selectedDocId}`;
        }
        return `${origin}/verify?docId=DEMO-DOC-2569`;
      case 'url':
        let finalUrl = urlInput.trim();
        if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
          finalUrl = 'https://' + finalUrl;
        }
        return finalUrl || origin;
      case 'text':
        return textInput;
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nN:${vcard.name}\nFN:${vcard.name}\nTITLE:${vcard.title}\nORG:${vcard.org}\nTEL;TYPE=WORK,VOICE:${vcard.phone}\nEMAIL:${vcard.email}\nADR;TYPE=WORK:;;${vcard.address}\nURL:${vcard.website}\nEND:VCARD`;
      case 'wifi':
        return `WIFI:S:${wifi.ssid};T:${wifi.encryption};P:${wifi.password};;`;
      case 'promptpay':
        const cleanId = promptPay.id.replace(/[^0-9]/g, '');
        return `PROMPTPAY:${cleanId}:${promptPay.amount || '0'}`;
      default:
        return origin;
    }
  };

  // Render QR Code onto Canvas with Gradient and Overlays
  const renderQrCanvas = async () => {
    setIsGenerating(true);
    try {
      const payload = getComputedPayload();
      setRawQrPayload(payload);

      const targetCanvas = canvasRef.current;
      if (!targetCanvas) return;

      const size = 600; // Working render size
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return;

      // 1. Generate base black/white transparent QR on temporary canvas
      const tempCanvas = document.createElement('canvas');
      const actualBg = transparentBg ? '#ffffff' : bgColor;

      await QRCode.toCanvas(tempCanvas, payload, {
        width: size,
        margin: qrMargin,
        errorCorrectionLevel: errorCorrection,
        color: {
          dark: '#000000',
          light: '#00000000' // transparent background
        }
      });

      // 2. Create colored canvas with linear/radial gradients
      const coloredCanvas = document.createElement('canvas');
      coloredCanvas.width = size;
      coloredCanvas.height = size;
      const cCtx = coloredCanvas.getContext('2d');
      if (cCtx) {
        cCtx.drawImage(tempCanvas, 0, 0);

        // Apply gradient overlay
        cCtx.globalCompositeOperation = 'source-in';
        if (gradientType === 'linear') {
          let grad;
          if (gradientAngle === 45) {
            grad = cCtx.createLinearGradient(0, size, size, 0);
          } else if (gradientAngle === 90) {
            grad = cCtx.createLinearGradient(0, size, 0, 0);
          } else if (gradientAngle === 135) {
            grad = cCtx.createLinearGradient(0, 0, size, size);
          } else {
            grad = cCtx.createLinearGradient(0, 0, size, 0); // 0 deg
          }
          grad.addColorStop(0, fgColor);
          grad.addColorStop(1, gradientColor2);
          cCtx.fillStyle = grad;
        } else if (gradientType === 'radial') {
          const grad = cCtx.createRadialGradient(size/2, size/2, 10, size/2, size/2, size*0.7);
          grad.addColorStop(0, fgColor);
          grad.addColorStop(1, gradientColor2);
          cCtx.fillStyle = grad;
        } else {
          cCtx.fillStyle = fgColor;
        }
        cCtx.fillRect(0, 0, size, size);

        // Apply solid background behind pixels
        cCtx.globalCompositeOperation = 'destination-over';
        if (!transparentBg) {
          cCtx.fillStyle = bgColor;
          cCtx.fillRect(0, 0, size, size);
        }
        cCtx.globalCompositeOperation = 'source-over';
      }

      // 3. Set dimensions of main canvas
      let finalWidth = size;
      let finalHeight = size;
      let qrOffsetY = 0;
      let qrOffsetX = 0;

      if (frameType === 'top-bottom') {
        finalHeight = size + 110;
        qrOffsetY = 55;
      } else if (frameType === 'card') {
        finalWidth = size + 60;
        finalHeight = size + 140;
        qrOffsetX = 30;
        qrOffsetY = 70;
      } else if (frameType === 'badge') {
        finalHeight = size + 80;
        qrOffsetY = 0;
      } else if (frameType === 'official-garuda') {
        finalHeight = size + 180;
        qrOffsetY = 110;
      } else if (frameType === 'modern-border') {
        finalWidth = size + 40;
        finalHeight = size + 40;
        qrOffsetX = 20;
        qrOffsetY = 20;
      } else if (frameType === 'label-side') {
        finalWidth = size + 220;
        qrOffsetX = 10;
      }

      targetCanvas.width = finalWidth;
      targetCanvas.height = finalHeight;

      ctx.clearRect(0, 0, finalWidth, finalHeight);

      if (!transparentBg) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, finalWidth, finalHeight);
      }

      // Draw Frames
      if (frameType === 'card') {
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 6;
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(10, 10, finalWidth - 20, finalHeight - 20, 24);
        ctx.fill();
        ctx.stroke();
      } else if (frameType === 'modern-border') {
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 12;
        ctx.strokeRect(6, 6, finalWidth - 12, finalHeight - 12);
        
        // Accent corners
        ctx.fillStyle = frameColor;
        const cLen = 60;
        ctx.fillRect(0, 0, cLen, 12);
        ctx.fillRect(0, 0, 12, cLen);
        ctx.fillRect(finalWidth - cLen, 0, cLen, 12);
        ctx.fillRect(finalWidth - 12, 0, 12, cLen);
        ctx.fillRect(0, finalHeight - 12, cLen, 12);
        ctx.fillRect(0, finalHeight - cLen, 12, cLen);
        ctx.fillRect(finalWidth - cLen, finalHeight - 12, cLen, 12);
        ctx.fillRect(finalWidth - 12, finalHeight - cLen, 12, cLen);
      } else if (frameType === 'label-side') {
        ctx.fillStyle = frameColor;
        ctx.fillRect(size + 20, 0, 200, finalHeight);
      }

      // Draw Colored QR
      ctx.drawImage(coloredCanvas, qrOffsetX, qrOffsetY, size, size);

      // 4. Logo Overlay (Moved after frame drawing but before text)
      let logoSrc = '';
      if (logoType === 'garuda') logoSrc = GARUDA_LOGO_URL;
      else if (logoType === 'province' || logoType === 'ddpm') logoSrc = DDPM_LOGO_URL;
      else if (logoType === 'custom') logoSrc = customLogoUrl;

      if (logoSrc) {
        try {
          const img = new Image();
          if (logoSrc.startsWith('http://') || logoSrc.startsWith('https://')) {
            img.crossOrigin = 'anonymous';
          }
          img.src = logoSrc;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });

          if (img.complete && img.naturalWidth > 0) {
            const logoDim = size * logoScale;
            const logoX = qrOffsetX + (size - logoDim) / 2;
            const logoY = qrOffsetY + (size - logoDim) / 2;

            // White backing badge (Draw only for Garuda logo as requested by the user)
            if (logoType === 'garuda') {
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(logoX + logoDim / 2, logoY + logoDim / 2, (logoDim / 2) + 8, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = frameColor || fgColor;
              ctx.lineWidth = 3;
              ctx.stroke();
            }

            ctx.drawImage(img, logoX, logoY, logoDim, logoDim);
          }
        } catch (err) {
          console.error(err);
        }
      }

      // 5. Draw Frame Text Banner
      if (frameType !== 'none') {
        ctx.fillStyle = frameColor;
        ctx.font = 'bold 22px Sarabun, sans-serif';
        ctx.textAlign = 'center';

        if (frameType === 'top-bottom') {
          ctx.fillRect(0, 0, finalWidth, 48);
          ctx.fillStyle = frameTextColor;
          ctx.fillText(frameText, finalWidth / 2, 32);

          ctx.fillStyle = frameColor;
          ctx.fillRect(0, finalHeight - 50, finalWidth, 50);
          ctx.fillStyle = frameTextColor;
          ctx.font = 'bold 18px Sarabun, sans-serif';
          ctx.fillText(frameTextBottom, finalWidth / 2, finalHeight - 18);
        } else if (frameType === 'card') {
          ctx.fillStyle = frameColor;
          ctx.font = 'bold 24px Sarabun, sans-serif';
          ctx.fillText(frameText, finalWidth / 2, 45);

          ctx.font = '16px Sarabun, sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.fillText(frameTextBottom, finalWidth / 2, finalHeight - 25);
        } else if (frameType === 'badge') {
          ctx.fillStyle = frameColor;
          ctx.beginPath();
          ctx.roundRect(20, finalHeight - 65, finalWidth - 40, 50, 12);
          ctx.fill();
          ctx.fillStyle = frameTextColor;
          ctx.font = 'bold 20px Sarabun, sans-serif';
          ctx.fillText(frameText, finalWidth / 2, finalHeight - 32);
        } else if (frameType === 'official-garuda') {
          // Draw Large Garuda at top
          try {
            const garudaImg = new Image();
            garudaImg.src = GARUDA_LOGO_URL;
            await new Promise(r => garudaImg.onload = r);
            ctx.drawImage(garudaImg, (finalWidth - 80) / 2, 15, 80, 80);
          } catch(e){}
          
          ctx.fillStyle = frameColor;
          ctx.font = 'bold 22px Sarabun, sans-serif';
          ctx.fillText(frameText, finalWidth / 2, 115);
          
          ctx.font = '16px Sarabun, sans-serif';
          ctx.fillStyle = '#475569';
          ctx.fillText(frameTextBottom, finalWidth / 2, finalHeight - 35);
          ctx.font = 'bold 14px Sarabun, sans-serif';
          ctx.fillText('EDMS VERIFIED DOCUMENT', finalWidth / 2, finalHeight - 15);
        } else if (frameType === 'modern-border') {
           // Text inside the frame (top or bottom)
           ctx.fillStyle = frameColor;
           ctx.fillRect(40, finalHeight - 40, finalWidth - 80, 30);
           ctx.fillStyle = frameTextColor;
           ctx.font = 'bold 16px Sarabun, sans-serif';
           ctx.fillText(frameText, finalWidth / 2, finalHeight - 20);
        } else if (frameType === 'label-side') {
          ctx.save();
          ctx.translate(size + 120, finalHeight / 2);
          ctx.rotate(Math.PI / 2);
          ctx.fillStyle = frameTextColor;
          ctx.font = 'bold 28px Sarabun, sans-serif';
          ctx.fillText(frameText, 0, 0);
          ctx.font = '16px Sarabun, sans-serif';
          ctx.fillText(frameTextBottom, 0, 30);
          ctx.restore();
        }
      }

      const dataUrl = targetCanvas.toDataURL('image/png', 1.0);
      setGeneratedDataUrl(dataUrl);

    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Re-render when options change
  useEffect(() => {
    renderQrCanvas();
  }, [
    generationMode, registeredSlug, qrType, selectedDocId, urlInput, textInput, vcard, wifi, promptPay,
    fgColor, bgColor, transparentBg, errorCorrection, qrMargin,
    gradientType, gradientColor2, gradientAngle,
    logoType, customLogoUrl, logoScale, frameType, frameText, frameColor, frameTextColor
  ]);

  // Auto-sync / auto-register Dynamic QR when in dynamic mode
  useEffect(() => {
    if (generationMode !== 'dynamic') return;

    const timer = setTimeout(async () => {
      if (!registeredSlug) {
        await registerDynamicQr();
      } else {
        // Update existing dynamic QR target url and title
        let targetUrl = '';
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://edms.go.th';
        switch (qrType) {
          case 'edms':
            targetUrl = selectedDocId ? `${origin}/verify?docId=${selectedDocId}` : `${origin}/verify?docId=DEMO-DOC-2569`;
            break;
          case 'url':
            let u = urlInput.trim();
            if (u && !u.startsWith('http://') && !u.startsWith('https://')) {
              u = 'https://' + u;
            }
            targetUrl = u || origin;
            break;
          case 'text':
            targetUrl = textInput.trim() || origin;
            break;
          case 'vcard':
            targetUrl = `BEGIN:VCARD\nVERSION:3.0\nN:${vcard.name}\nFN:${vcard.name}\nTITLE:${vcard.title}\nORG:${vcard.org}\nTEL;TYPE=WORK,VOICE:${vcard.phone}\nEMAIL:${vcard.email}\nADR;TYPE=WORK:;;${vcard.address}\nURL:${vcard.website}\nEND:VCARD`;
            break;
          case 'wifi':
            targetUrl = `WIFI:S:${wifi.ssid};T:${wifi.encryption};P:${wifi.password};;`;
            break;
          case 'promptpay':
            const cleanId = promptPay.id.replace(/[^0-9]/g, '');
            targetUrl = `PROMPTPAY:${cleanId}:${promptPay.amount || '0'}`;
            break;
          default:
            targetUrl = origin;
        }

        let dynamicTitle = customTitle.trim() || (frameType !== 'none' && frameText ? frameText : '');
        if (!dynamicTitle) {
          if (qrType === 'url') {
            dynamicTitle = urlInput.trim() ? urlInput.replace(/^https?:\/\//, '').split('/')[0] : 'เว็บไซต์หน่วยงาน';
          } else if (qrType === 'edms') {
            dynamicTitle = selectedDoc ? (selectedDoc.title || selectedDoc.docNumber) : 'เอกสารสารบรรณ ปภ.ระยอง';
          } else {
            dynamicTitle = 'สนง.ปภ.ระยอง';
          }
        }

        try {
          await fetch(`/api/qr-generator/dynamic/${registeredSlug}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: dynamicTitle,
              originalUrl: targetUrl,
              status: 'active',
              styleConfig: '{}'
            })
          });
        } catch (_) {}
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [generationMode, qrType, urlInput, customTitle, textInput, selectedDocId, frameText, frameType]);

  // Handle logo file upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setCustomLogoUrl(ev.target.result as string);
          setLogoType('custom');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Fetch Templates from Backend API
  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await fetch('/api/qr-generator/templates');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSavedTemplates(data);
          localStorage.setItem('enterprise_qr_templates', JSON.stringify(data));
          return data;
        }
      }
    } catch (err) {
      console.error('Failed to load QR templates from server:', err);
    } finally {
      setIsLoadingTemplates(false);
    }
    return null;
  };

  // Load templates on component mount and auto-apply default template if present
  useEffect(() => {
    fetchTemplates().then((templatesList) => {
      const list = templatesList || savedTemplates;
      if (Array.isArray(list) && list.length > 0) {
        const defaultTpl = list.find((t: any) => t.isDefault);
        if (defaultTpl && !selectedTemplateId) {
          handleApplyTemplate(defaultTpl, false);
        }
      }
    });
  }, []);

  // Open Save Full Template Modal
  const handleOpenSaveModal = () => {
    setModalTplName(frameType !== 'none' && frameText ? frameText : `แม่แบบเอกสาร ${new Date().toLocaleDateString('th-TH')}`);
    setModalTplCategory('official');
    setModalTplDescription('');
    setModalTplDefaultQrType(qrType);
    setModalTplIsDefault(false);
    setShowSaveTemplateModal(true);
  };

  // Open Edit Template Modal
  const handleOpenEditModal = (t: any) => {
    setModalTplId(t.id);
    setModalTplName(t.name || '');
    setModalTplCategory(t.category || 'official');
    setModalTplDescription(t.description || '');
    setModalTplDefaultQrType(t.defaultQrType || 'edms');
    setModalTplIsDefault(Boolean(t.isDefault));
    setShowEditTemplateModal(true);
  };

  // Save Full Options Template to Backend & Local
  const handleSaveFullTemplate = async () => {
    if (!modalTplName.trim()) {
      showToast('error', 'กรุณากรอกชื่อแม่แบบ (Template Name)');
      return;
    }

    const newTpl = {
      id: `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: modalTplName.trim(),
      category: modalTplCategory || 'official',
      description: modalTplDescription || '',
      isDefault: modalTplIsDefault,
      defaultQrType: modalTplDefaultQrType || qrType,
      fgColor,
      bgColor,
      transparentBg,
      qrMargin,
      errorCorrection,
      gradientType,
      gradientColor2,
      gradientAngle,
      logoType,
      customLogoUrl,
      logoScale,
      frameType,
      frameText,
      frameColor,
      frameTextColor,
      previewDataUrl: generatedDataUrl || '',
      createdBy: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.username || 'ผู้ใช้'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/qr-generator/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTpl)
      });

      if (res.ok) {
        const json = await res.json();
        const created = json.template || newTpl;
        let updated = [created, ...savedTemplates.filter((t: any) => t.id !== created.id)];
        if (created.isDefault) {
          updated = updated.map((t: any) => t.id === created.id ? { ...t, isDefault: true } : { ...t, isDefault: false });
        }
        setSavedTemplates(updated);
        localStorage.setItem('enterprise_qr_templates', JSON.stringify(updated));
        setSelectedTemplateId(created.id);
        setShowSaveTemplateModal(false);
        showToast('success', `บันทึกแม่แบบ "${created.name}" สำเร็จครบถ้วนทุกออปชัน!`);
      } else {
        const err = await res.json().catch(() => null);
        showToast('error', 'ไม่สามารถบันทึกแม่แบบไปยังเซิร์ฟเวอร์ได้: ' + (err?.error || ''));
      }
    } catch (e: any) {
      console.error('Error saving template:', e);
      let updated = [newTpl, ...savedTemplates];
      if (newTpl.isDefault) {
        updated = updated.map((t: any) => t.id === newTpl.id ? { ...t, isDefault: true } : { ...t, isDefault: false });
      }
      setSavedTemplates(updated);
      localStorage.setItem('enterprise_qr_templates', JSON.stringify(updated));
      setSelectedTemplateId(newTpl.id);
      setShowSaveTemplateModal(false);
      showToast('success', `บันทึกแม่แบบ "${newTpl.name}" ลงในหน่วยความจำเรียบร้อย!`);
    }
  };

  // Update Template Meta Info
  const handleUpdateTemplateMeta = async () => {
    if (!modalTplName.trim()) {
      showToast('error', 'กรุณากรอกชื่อแม่แบบ');
      return;
    }
    try {
      await fetch(`/api/qr-generator/templates/${modalTplId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: modalTplName.trim(),
          category: modalTplCategory,
          description: modalTplDescription,
          isDefault: modalTplIsDefault,
          defaultQrType: modalTplDefaultQrType
        })
      });

      let updated = savedTemplates.map((t: any) => {
        if (t.id === modalTplId) {
          return {
            ...t,
            name: modalTplName.trim(),
            category: modalTplCategory,
            description: modalTplDescription,
            isDefault: modalTplIsDefault,
            defaultQrType: modalTplDefaultQrType,
            updatedAt: new Date().toISOString()
          };
        }
        return modalTplIsDefault ? { ...t, isDefault: false } : t;
      });

      setSavedTemplates(updated);
      localStorage.setItem('enterprise_qr_templates', JSON.stringify(updated));
      setShowEditTemplateModal(false);
      showToast('success', `อัปเดตข้อมูลแม่แบบ "${modalTplName}" สำเร็จ!`);
    } catch (e: any) {
      showToast('error', 'เกิดข้อผิดพลาดในการอัปเดตแม่แบบ');
    }
  };

  // Overwrite Template Style with Current Canvas Design
  const handleOverwriteTemplateStyle = async (tpl: any) => {
    const confirmed = await confirm({
      title: 'ยืนยันการบันทึกสไตล์ทับแม่แบบ',
      message: `ยืนยันการบันทึกสไตล์และดีไซน์ปัจจุบันทับลงในแม่แบบ "${tpl.name}" ใช่หรือไม่?`,
      type: 'edit',
      confirmText: 'ยืนยันบันทึกทับ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;
    try {
      const updatedStyle = {
        fgColor,
        bgColor,
        transparentBg,
        qrMargin,
        errorCorrection,
        gradientType,
        gradientColor2,
        gradientAngle,
        logoType,
        customLogoUrl,
        logoScale,
        frameType,
        frameText,
        frameTextBottom,
        frameColor,
        frameTextColor,
        previewDataUrl: generatedDataUrl || '',
        updatedAt: new Date().toISOString()
      };

      await fetch(`/api/qr-generator/templates/${tpl.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStyle)
      });

      const updated = savedTemplates.map((t: any) => t.id === tpl.id ? { ...t, ...updatedStyle } : t);
      setSavedTemplates(updated);
      localStorage.setItem('enterprise_qr_templates', JSON.stringify(updated));
      showToast('success', `อัปเดตสไตล์ของแม่แบบ "${tpl.name}" ด้วยดีไซน์ปัจจุบันเรียบร้อย!`);
    } catch (e: any) {
      showToast('error', 'เกิดข้อผิดพลาดในการอัปเดตสไตล์แม่แบบ');
    }
  };

  // Load & Apply Full Template styling
  const handleApplyTemplate = (t: any, switchToCreateTab = false) => {
    setFgColor(t.fgColor || '#0f172a');
    setBgColor(t.bgColor || '#ffffff');
    setTransparentBg(Boolean(t.transparentBg));
    setQrMargin(t.qrMargin !== undefined ? Number(t.qrMargin) : 2);
    setErrorCorrection(t.errorCorrection || 'H');
    setGradientType(t.gradientType || 'solid');
    setGradientColor2(t.gradientColor2 || '#2563eb');
    setGradientAngle(t.gradientAngle !== undefined ? Number(t.gradientAngle) : 45);
    setLogoType(t.logoType || 'none');
    setCustomLogoUrl(t.customLogoUrl || '');
    setLogoScale(t.logoScale !== undefined ? Number(t.logoScale) : 0.22);
    setFrameType(t.frameType || 'none');
    setFrameText(t.frameText || '');
    setFrameTextBottom(t.frameTextBottom || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
    setFrameColor(t.frameColor || '#0f172a');
    setFrameTextColor(t.frameTextColor || '#ffffff');

    // Optionally switch content type if defaultQrType specified and no document is locked
    if (t.defaultQrType && ['edms', 'url', 'text', 'vcard', 'wifi', 'promptpay'].includes(t.defaultQrType)) {
      if (!selectedDocId || t.defaultQrType === 'edms') {
        setQrType(t.defaultQrType);
      }
    }

    setSelectedTemplateId(t.id);
    if (switchToCreateTab) {
      setActiveTab('create');
    }
    showToast('success', `ปรับใช้แม่แบบ "${t.name}" ครบถ้วนทุกตัวเลือก 100%!`);
  };

  // Set Template as Default
  const handleSetDefaultTemplate = async (tplId: string) => {
    try {
      await fetch(`/api/qr-generator/templates/${tplId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true })
      });
      const updated = savedTemplates.map((t: any) => ({
        ...t,
        isDefault: t.id === tplId
      }));
      setSavedTemplates(updated);
      localStorage.setItem('enterprise_qr_templates', JSON.stringify(updated));
      showToast('success', 'ตั้งเป็นแม่แบบเริ่มต้นของระบบเรียบร้อย!');
    } catch (e: any) {
      showToast('error', 'ไม่สามารถตั้งเป็นแม่แบบเริ่มต้นได้');
    }
  };

  // Duplicate Template
  const handleDuplicateTemplate = async (t: any) => {
    const newTpl = {
      ...t,
      id: `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${t.name} (สำเนา)`,
      isDefault: false,
      createdBy: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.username || 'ผู้ใช้'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      await fetch('/api/qr-generator/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTpl)
      });
      const updated = [newTpl, ...savedTemplates];
      setSavedTemplates(updated);
      localStorage.setItem('enterprise_qr_templates', JSON.stringify(updated));
      showToast('success', `สร้างสำเนาแม่แบบ "${newTpl.name}" สำเร็จ!`);
    } catch (e: any) {
      showToast('error', 'เกิดข้อผิดพลาดในการสร้างสำเนาแม่แบบ');
    }
  };

  // Delete template
  const handleDeleteTemplate = async (id: string, name?: string) => {
    const confirmed = await confirm({
      title: 'ยืนยันการลบแม่แบบ QR Code',
      message: `ยืนยันการลบแม่แบบ "${name || 'นี้'}" ออกจากระบบถาวรหรือไม่?`,
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;
    try {
      await fetch(`/api/qr-generator/templates/${id}`, { method: 'DELETE' });
      const updated = savedTemplates.filter((t: any) => t.id !== id);
      setSavedTemplates(updated);
      localStorage.setItem('enterprise_qr_templates', JSON.stringify(updated));
      if (selectedTemplateId === id) setSelectedTemplateId(null);
      showToast('success', `ลบแม่แบบ "${name || id}" เรียบร้อยแล้ว!`);
    } catch (e: any) {
      showToast('error', 'ไม่สามารถลบแม่แบบได้');
    }
  };

  // Export Templates to JSON File
  const handleExportTemplatesJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedTemplates, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `EDMS_QR_Templates_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('success', `ส่งออกไฟล์แม่แบบทั้งหมด (${savedTemplates.length} รายการ) สำเร็จ!`);
    } catch (err: any) {
      showToast('error', 'ล้มเหลวในการส่งออกไฟล์ JSON: ' + err.message);
    }
  };

  // Import Templates from JSON File
  const handleImportTemplatesJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const item of parsed) {
              await fetch('/api/qr-generator/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...item,
                  id: `tpl_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  isDefault: false
                })
              }).catch(() => {});
            }
            await fetchTemplates();
            showToast('success', `นำเข้าแม่แบบสำเร็จ จำนวน ${parsed.length} รายการ!`);
          } else {
            showToast('error', 'รูปแบบไฟล์ JSON ไม่ถูกต้องหรือไม่พบรายการแม่แบบ');
          }
        } catch (err: any) {
          showToast('error', 'เกิดข้อผิดพลาดในการอ่านไฟล์ JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  // Reset / Restore Official Government Presets
  const handleResetOfficialTemplates = async () => {
    const confirmed = await confirm({
      title: 'ยืนยันการคืนค่าแม่แบบมาตรฐานราชการ',
      message: 'ยืนยันที่จะคืนค่าแม่แบบมาตรฐานของทางราชการทั้งหมดใช่หรือไม่? การตั้งค่าที่กำหนดเองอาจถูกเขียนทับ',
      type: 'warning',
      confirmText: 'ยืนยันคืนค่ามาตรฐาน',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;
    try {
      const res = await fetch('/api/qr-generator/templates/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSavedTemplates(data.templates || []);
        localStorage.setItem('enterprise_qr_templates', JSON.stringify(data.templates || []));
        showToast('success', 'คืนค่าแม่แบบมาตรฐานราชการสำเร็จ 100%!');
      } else {
        showToast('error', 'ไม่สามารถคืนค่าแม่แบบมาตรฐานได้');
      }
    } catch (e: any) {
      showToast('error', 'เกิดข้อผิดพลาดในการคืนค่าแม่แบบ');
    }
  };

  // Save export actions to history log
  const saveToHistory = (type: string) => {
    const newHistory = {
      id: Date.now(),
      title: frameType !== 'none' ? frameText : `สติกเกอร์ ${qrType.toUpperCase()}`,
      payload: getComputedPayload(),
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      action: `พิมพ์หรือบันทึกไฟล์เป็น (${type})`,
      dataUrl: generatedDataUrl
    };
    const updated = [newHistory, ...history].slice(0, 30);
    setHistory(updated);
    localStorage.setItem('edms_qr_history', JSON.stringify(updated));
  };

  // Print Standard A4 Sticker Sheet
  const handlePrintStickerSheet = () => {
    if (!generatedDataUrl) {
      showToast('error', 'กรุณารอระบบสร้างภาพ QR Code ให้พร้อมก่อนพิมพ์');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('error', 'เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาตป๊อปอัพ');
      return;
    }

    const count = stickerLayout === '6' ? 6 : stickerLayout === '12' ? 12 : 24;
    const gridCols = stickerLayout === '6' ? 'repeat(2, 1fr)' : stickerLayout === '12' ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)';
    const stickerHeight = stickerLayout === '6' ? '86mm' : stickerLayout === '12' ? '64mm' : '44mm';
    const qrSize = stickerLayout === '6' ? '92px' : stickerLayout === '12' ? '70px' : '52px';
    const titleText = stickerCustomTitle || 'สำนักงาน ปภ. จังหวัดระยอง';
    const docNoText = selectedDoc ? (selectedDoc.docNumber || selectedDoc.id) : (frameType !== 'none' && frameText ? frameText : 'เอกสารราชการทั่วไป');
    const dateText = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });

    let stickersHtml = '';
    for (let i = 0; i < count; i++) {
      stickersHtml += `
        <div class="sticker">
          ${stickerShowOrg ? `<div class="sticker-org">${titleText}</div>` : ''}
          <div class="sticker-body">
            <img src="${generatedDataUrl}" class="sticker-qr" alt="QR Code" />
            <div class="sticker-info">
              ${stickerShowDoc ? `<div class="sticker-docno">${docNoText}</div>` : ''}
              <div class="sticker-tag">สแกนตรวจสอบเอกสาร</div>
              ${stickerShowDate ? `<div class="sticker-date">วันที่: ${dateText}</div>` : ''}
            </div>
          </div>
        </div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>พิมพ์สติ๊กเกอร์ A4 - ${docNoText}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
            font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
          }
          body {
            margin: 0;
            padding: 0;
            background: #fff;
            color: #0f172a;
          }
          .sheet-grid {
            display: grid;
            grid-template-columns: ${gridCols};
            gap: ${stickerLayout === '6' ? '6mm' : stickerLayout === '12' ? '4mm' : '3mm'};
            width: 100%;
          }
          .sticker {
            border: ${stickerBorder ? '1px dashed #94a3b8' : '1px solid #e2e8f0'};
            border-radius: 6px;
            padding: ${stickerLayout === '6' ? '12px' : stickerLayout === '12' ? '8px' : '6px'};
            min-height: ${stickerHeight};
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
            background: #fff;
          }
          .sticker-org {
            font-size: ${stickerLayout === '6' ? '12px' : stickerLayout === '12' ? '10px' : '8px'};
            font-weight: bold;
            color: #0f294a;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 3px;
            margin-bottom: 4px;
            text-align: center;
          }
          .sticker-body {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
          }
          .sticker-qr {
            width: ${qrSize};
            height: ${qrSize};
            object-fit: contain;
            flex-shrink: 0;
          }
          .sticker-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
            font-size: ${stickerLayout === '6' ? '11px' : stickerLayout === '12' ? '9px' : '7.5px'};
            line-height: 1.25;
            text-align: left;
            flex: 1;
            min-width: 0;
          }
          .sticker-docno {
            font-weight: bold;
            color: #1e293b;
            word-break: break-word;
          }
          .sticker-tag {
            color: #2563eb;
            font-weight: 600;
          }
          .sticker-date {
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="sheet-grid">
          ${stickersHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    saveToHistory(`พิมพ์สติ๊กเกอร์ A4 (${count} ดวง)`);
  };

  // Downloads PNG
  const downloadPNG = async () => {
    if (generationMode === 'dynamic' && !registeredSlug) {
      showToast('info', 'กำลังลงทะเบียน Dynamic QR ก่อนส่งออกไฟล์...');
      const slug = await registerDynamicQr();
      if (slug) {
        setTimeout(() => {
          if (!canvasRef.current) return;
          const link = document.createElement('a');
          link.download = `EDMS-QR-${Date.now()}.png`;
          link.href = canvasRef.current.toDataURL('image/png');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          saveToHistory('PNG');
        }, 300);
        return;
      }
    }
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `EDMS-QR-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    saveToHistory('PNG');
  };

  // Downloads SVG Vector
  const downloadSVG = async () => {
    try {
      let slug = registeredSlug;
      if (generationMode === 'dynamic' && !slug) {
        showToast('info', 'กำลังลงทะเบียน Dynamic QR ก่อนส่งออกไฟล์ SVG...');
        slug = (await registerDynamicQr()) || '';
      }
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://edms.go.th';
      const payload = (generationMode === 'dynamic' && slug) ? `${origin}/qr/${slug}` : getComputedPayload();
      const svgString = await QRCode.toString(payload, {
        type: 'svg',
        margin: qrMargin,
        errorCorrectionLevel: errorCorrection,
        color: {
          dark: fgColor,
          light: transparentBg ? '#00000000' : bgColor
        }
      });
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `EDMS-QR-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      saveToHistory('SVG');
    } catch (e) {
      console.error(e);
    }
  };

  // Generate Bulk QRs list
  const handleGenerateBulk = async () => {
    setIsGeneratingBulk(true);
    try {
      let inputs: string[] = [];
      let titles: string[] = [];
      
      if (bulkInputMode === 'text') {
        inputs = bulkTextInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        titles = inputs.map((inp, idx) => `คิวอาร์โค้ดกลุ่มที่ ${idx + 1}`);
      } else {
        inputs = bulkSelectedDocIds.map(id => {
          const doc = documents.find(d => d.id === id);
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          return `${origin}/verify?docId=${id}`;
        });
        titles = bulkSelectedDocIds.map(id => {
          const doc = documents.find(d => d.id === id);
          return doc ? `${doc.docNumber || 'ไม่มีเลข'} - ${doc.title}` : 'หนังสือราชการ';
        });
      }

      if (inputs.length === 0) {
        showToast('error', 'ไม่มีรายการนำเข้าสำหรับสร้างแบบกลุ่ม');
        return;
      }

      const generated: any[] = [];
      for (let i = 0; i < inputs.length; i++) {
        const payload = inputs[i];
        const title = titles[i];
        
        // Render QR in an offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        await QRCode.toCanvas(canvas, payload, {
          width: 300,
          margin: 1,
          color: { dark: fgColor, light: '#ffffff' }
        });

        generated.push({
          id: i,
          title,
          payload,
          dataUrl: canvas.toDataURL('image/png')
        });
      }

      setBulkGeneratedItems(generated);
      showToast('success', `สร้างคิวอาร์โค้ดแบบกลุ่มเรียบร้อย จำนวน ${generated.length} รายการ!`);
    } catch (err: any) {
      console.error(err);
      showToast('error', 'เกิดข้อผิดพลาดในการสร้าง QR แบบกลุ่ม');
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  // Generate Multi-Label A4 Sticker PDF
  const handleDownloadBulkPDF = async () => {
    if (bulkGeneratedItems.length === 0) {
      showToast('error', 'กรุณาสร้างคิวอาร์โค้ดแบบกลุ่มก่อนทำการดาวน์โหลด PDF');
      return;
    }
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // We'll draw up to 6 labels on page (2 columns x 3 rows)
      const colWidth = (width - 100) / 2;
      const rowHeight = 220;

      for (let i = 0; i < Math.min(bulkGeneratedItems.length, 6); i++) {
        const item = bulkGeneratedItems[i];
        const colIdx = i % 2;
        const rowIdx = Math.floor(i / 2);

        const x = 50 + colIdx * (colWidth + 20);
        const y = height - 50 - (rowIdx + 1) * rowHeight;

        // Draw border box
        page.drawRectangle({
          x, y, width: colWidth, height: rowHeight - 20,
          borderColor: rgb(0.1, 0.2, 0.4),
          borderWidth: 1.5
        });

        // Add Header
        page.drawRectangle({
          x: x + 2, y: y + rowHeight - 42, width: colWidth - 4, height: 20,
          color: rgb(0.1, 0.15, 0.25)
        });

        page.drawText('EDMS DOCUMENT STAMP', {
          x: x + 15, y: y + rowHeight - 37,
          size: 10, font, color: rgb(1, 1, 1)
        });

        // Embed QR Code
        const qrImage = await pdfDoc.embedPng(item.dataUrl);
        page.drawImage(qrImage, {
          x: x + (colWidth - 110) / 2, y: y + 40,
          width: 110, height: 110
        });

        // Title Footer text
        const safeTitle = item.title.length > 25 ? item.title.substring(0, 25) + '...' : item.title;
        page.drawText(safeTitle, {
          x: x + 10, y: y + 15,
          size: 8, font, color: rgb(0.1, 0.1, 0.1)
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Bulk_EDMS_Labels_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      saveToHistory('BULK_PDF');
      showToast('success', 'ดาวน์โหลดแผ่นสติกเกอร์ PDF เรียบร้อย!');
    } catch (err) {
      console.error(err);
      showToast('error', 'ล้มเหลวในการดาวน์โหลดแผ่นสติกเกอร์ PDF');
    }
  };

  // Stamp current generated QR onto selected document (Quick Standard Stamp)
  const handleStampToDocument = async () => {
    if (!selectedDocId) return;
    setIsSavingToDoc(true);
    setStampSuccess(false);

    try {
      const response = await fetch(`/api/documents/${selectedDocId}/stamp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrCodeImage: generatedDataUrl,
          stampedBy: user?.username || user?.firstName || 'ผู้ดูแลระบบ',
          positionX: 450,
          positionY: 50
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        setStampSuccess(true);
        setTimeout(() => setStampSuccess(false), 4000);
        const docLabel = selectedDoc?.docNumber || selectedDoc?.title || 'EDMS';
        showToast('success', data.message || `ประทับตรายืนยัน QR ในเอกสาร [${docLabel}] เรียบร้อยแล้ว!`);
      } else {
        const errorMsg = data?.error || 'ไม่สามารถบันทึกตราลงเอกสารได้';
        showToast('error', errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์เพื่อประทับตรา');
    } finally {
      setIsSavingToDoc(false);
    }
  };

  // Quick 1-Click AI Auto Stamp (วิเคราะห์พื้นที่ว่าง ปรับขนาด และประทับตราทันที)
  const handleQuickAiStamp = async () => {
    if (!selectedDocId) {
      showToast('error', 'กรุณาเลือกหนังสือราชการก่อนประทับตรา');
      return;
    }
    if (!generatedDataUrl) {
      showToast('error', 'กำลังรอการเรนเดอร์ QR Code กรุณารอสักครู่');
      return;
    }

    setIsSavingToDoc(true);
    setStampSuccess(false);

    try {
      showToast('info', '🤖 AI กำลังสแกนพื้นที่ว่างและคำนวณขนาดที่เหมาะสม...');
      
      // Step 1: AI Layout Analysis
      const layoutRes = await fetch(`/api/documents/${selectedDocId}/ai-stamp-layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const layoutData = await layoutRes.json().catch(() => ({}));

      const recSpot = layoutData?.spots?.find((s: any) => s.id === layoutData?.recommendedSpotId) || layoutData?.spots?.[0];
      const stampW = recSpot?.width || layoutData?.optimalSize || 85;
      const stampH = recSpot?.height || layoutData?.optimalSize || 85;
      const pw = layoutData?.pageSize?.width || 595.28;
      const ph = layoutData?.pageSize?.height || 841.89;

      const clientX = recSpot ? (recSpot.xPercent / 100) * pw : 65;
      const clientY = recSpot ? (recSpot.yPercent / 100) * ph : 520;

      // Step 2: Stamp with AI calculated parameters
      const response = await fetch(`/api/documents/${selectedDocId}/stamp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrCodeImage: generatedDataUrl,
          stampedBy: user?.username || user?.firstName || 'ผู้ดูแลระบบ',
          x: clientX,
          y: clientY,
          width: stampW,
          height: stampH,
          coordinateOrigin: 'top-left',
          addVerificationCaption: true,
          aiSpotName: recSpot?.name || 'ท้ายหนังสือฝั่งซ้าย (AI Auto-Fit)'
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        setStampSuccess(true);
        setTimeout(() => setStampSuccess(false), 5000);
        const docLabel = selectedDoc?.docNumber || selectedDoc?.title || 'EDMS';
        showToast('success', `⚡ AI ประทับตราลงหนังสือ [${docLabel}] ในพื้นที่ว่างปลอดภัย (${Math.round(stampW)}x${Math.round(stampH)} pt) เรียบร้อยแล้ว!`);
      } else {
        const errorMsg = data?.error || 'ไม่สามารถบันทึกตราลงเอกสารได้';
        showToast('error', errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'เกิดข้อผิดพลาดในการประทับตราอัตโนมัติด้วย AI');
    } finally {
      setIsSavingToDoc(false);
    }
  };

  // Pre-designed templates list
  const docPresets = [
    { name: 'สติกเกอร์แฟ้มทางการ', frame: 'card', text: 'สแกนตรวจสอบ แฟ้มเอกสารกองการ', fg: '#0f172a', bg: '#ffffff', logo: 'garuda' },
    { name: 'หนังสือราชการเร่งด่วน', frame: 'top-bottom', text: 'หนังสือฉบับจริง ตรวจสอบระบบสารบรรณ', fg: '#991b1b', bg: '#fef2f2', logo: 'garuda' },
    { name: 'บัตรคิวเข้าพบปะ', frame: 'badge', text: 'แชร์พิกัดสถานที่ สำนักงาน ปภ.', fg: '#075985', bg: '#f0f9ff', logo: 'province' }
  ];

  const handleApplyPreset = (preset: any) => {
    setFrameType(preset.frame);
    setFrameText(preset.text);
    setFgColor(preset.fg);
    setBgColor(preset.bg);
    setLogoType(preset.logo);
    showToast('success', `ใช้พรีเซต "${preset.name}" เรียบร้อย!`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-2 relative">
      {/* Floating Toast Notification Banner */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 text-xs font-semibold max-w-md ${
          toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/20' :
          toast.type === 'error' ? 'bg-rose-600 text-white border-rose-500 shadow-rose-900/20' :
          'bg-blue-600 text-white border-blue-500 shadow-blue-900/20'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-200" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 text-rose-200" />}
          {toast.type === 'info' && <Sparkles className="w-5 h-5 shrink-0 text-blue-200" />}
          <span className="flex-1 break-words">{toast.message}</span>
          <button 
            type="button"
            onClick={() => setToast(null)} 
            className="ml-2 p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="ปิดการแจ้งเตือน"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upper header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 bg-[var(--bg-overlay)] backdrop-blur-2xl p-5 sm:p-6 rounded-3xl border border-[var(--border-light)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-[80px] pointer-events-none -mr-10 -mt-10 transition-all duration-700 group-hover:from-blue-500/20" />
        
        <div className="space-y-1.5 relative z-10">
          <h1 className="text-xl sm:text-2xl font-bold font-sans text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 shrink-0">
              <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="tracking-tight">ระบบสร้าง QR Code</span>
            </div>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xl leading-relaxed">
            ศูนย์กลางการสร้าง QR Code ทางการ งานสารบรรณ EDMS เชื่อมโยงระบบตรวจรับรอง ติดตามสถิติเรียลไทม์ และพิมพ์สติ๊กเกอร์ A4
          </p>
        </div>

        {/* Responsive Tab Selection Bar with SVG Icons */}
        <div className="w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-[var(--border-light)] shadow-sm min-w-max">
            {[
              { id: 'create', label: 'สร้าง & ดีไซน์ QR', icon: QrCode },
              { id: 'analytics', label: 'วิเคราะห์สถิติ', icon: BarChart2 },
              { id: 'bulk', label: 'สร้างกลุ่ม (Bulk)', icon: CopyPlus },
              { id: 'templates', label: 'แม่แบบ (Templates)', icon: Bookmark },
              { id: 'sticker', label: 'พิมพ์ตรา A4', icon: Printer },
              { id: 'test', label: 'จำลองสแกน', icon: Smartphone },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-500/40'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab 1: Design & Create Studio */}
      {activeTab === "create" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <QrDesignControls
            generationMode={generationMode}
            setGenerationMode={setGenerationMode}
            registeredSlug={registeredSlug}
            setRegisteredSlug={setRegisteredSlug}
            isRegisteringDynamic={isRegisteringDynamic}
            registerDynamicQr={registerDynamicQr}
            qrType={qrType}
            setQrType={setQrType}
            documents={documents}
            selectedDocId={selectedDocId}
            setSelectedDocId={setSelectedDocId}
            selectedDoc={selectedDoc}
            docSearchQuery={docSearchQuery}
            setDocSearchQuery={setDocSearchQuery}
            docCategoryFilter={docCategoryFilter}
            setDocCategoryFilter={setDocCategoryFilter}
            urlInput={urlInput}
            setUrlInput={setUrlInput}
            customTitle={customTitle}
            setCustomTitle={setCustomTitle}
            textInput={textInput}
            setTextInput={setTextInput}
            vcard={vcard}
            setVcard={setVcard}
            wifi={wifi}
            setWifi={setWifi}
            promptPay={promptPay}
            setPromptPay={setPromptPay}
            presetPalettes={presetPalettes}
            fgColor={fgColor}
            setFgColor={setFgColor}
            bgColor={bgColor}
            setBgColor={setBgColor}
            transparentBg={transparentBg}
            setTransparentBg={setTransparentBg}
            gradientType={gradientType}
            setGradientType={setGradientType}
            gradientColor2={gradientColor2}
            setGradientColor2={setGradientColor2}
            gradientAngle={gradientAngle}
            setGradientAngle={setGradientAngle}
            errorCorrection={errorCorrection}
            setErrorCorrection={setErrorCorrection}
            qrMargin={qrMargin}
            setQrMargin={setQrMargin}
            logoType={logoType}
            setLogoType={setLogoType}
            customLogoUrl={customLogoUrl}
            setCustomLogoUrl={setCustomLogoUrl}
            logoScale={logoScale}
            setLogoScale={setLogoScale}
            GARUDA_LOGO_URL={GARUDA_LOGO_URL}
            DDPM_LOGO_URL={DDPM_LOGO_URL}
            RAYONG_LOGO_URL={RAYONG_LOGO_URL}
            isDragging={isDragging}
            handleDragOver={handleDragOver}
            handleDragLeave={handleDragLeave}
            handleDrop={handleDrop}
            handleLogoUpload={handleLogoUpload}
            frameType={frameType}
            setFrameType={setFrameType}
            frameText={frameText}
            setFrameText={setFrameText}
            frameTextBottom={frameTextBottom}
            setFrameTextBottom={setFrameTextBottom}
            frameColor={frameColor}
            setFrameColor={setFrameColor}
            frameTextColor={frameTextColor}
            setFrameTextColor={setFrameTextColor}
            savedTemplates={savedTemplates}
            selectedTemplateId={selectedTemplateId}
            handleApplyTemplate={handleApplyTemplate}
            handleOpenSaveModal={handleOpenSaveModal}
            setActiveTab={setActiveTab}
            getComputedPayload={getComputedPayload}
            getContrastRatio={getContrastRatio}
            showToast={showToast}
            handleQuickAiStamp={handleQuickAiStamp}
            isSavingToDoc={isSavingToDoc}
            setIsAiStamperOpen={setIsAiStamperOpen}
          />

          <QrLivePreview
            canvasRef={canvasRef}
            isGenerating={isGenerating}
            generatedDataUrl={generatedDataUrl}
            downloadPNG={downloadPNG}
            downloadSVG={downloadSVG}
            generationMode={generationMode}
            registeredSlug={registeredSlug}
            selectedDoc={selectedDoc}
            selectedDocId={selectedDocId}
            isSavingToDoc={isSavingToDoc}
            stampSuccess={stampSuccess}
            handleQuickAiStamp={handleQuickAiStamp}
            setIsAiStamperOpen={setIsAiStamperOpen}
            handleStampToDocument={handleStampToDocument}
            rawQrPayload={rawQrPayload}
            showToast={showToast}
            setQrType={setQrType}
            contrastInfo={getContrastRatio(fgColor, bgColor, transparentBg)}
          />
        </div>
      )}

      {/* Tab 2: Analytics & Track Dashboard */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Registered Dynamic QRs List */}
            <div className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">รายการคิวอาร์แบบไดนามิก ({dynamicQrs.length})</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">คลิกที่รายการด้านล่างเพื่อตรวจสอบสถิติการสแกน และพฤติกรรมผู้ใช้</p>
              </div>

              {isLoadingQrs ? (
                <div className="flex items-center justify-center p-8 text-xs font-bold text-slate-500 dark:text-slate-400 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>กำลังอัปเดตสล็อตข้อมูล...</span>
                </div>
              ) : dynamicQrs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 italic">
                  ยังไม่มีการลงทะเบียน Dynamic QR โค้ดในระบบสารบรรณ
                </div>
              ) : (
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                  {dynamicQrs.map((qr) => (
                    <div
                      key={qr.slug}
                      className={`p-3 border rounded-xl text-left transition-all space-y-2 cursor-pointer ${analyticsSlug === qr.slug ? 'border-blue-600 bg-blue-50/10 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40'}`}
                      onClick={() => loadAnalytics(qr.slug)}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate block flex-1">{qr.title}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(qr);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${qr.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}
                          title="คลิกเพื่อเปลี่ยนสถานะเปิด/ระงับชั่วคราว"
                        >
                          {qr.status === 'active' ? 'Active' : 'Paused'}
                        </button>
                      </div>

                      <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span>รหัสเป้าหมาย:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-1 rounded truncate max-w-[120px]">{qr.slug}</span>
                        </div>
                        <div className="truncate text-blue-600 dark:text-blue-400">ปลายทาง: {qr.originalUrl}</div>
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSlug(qr.slug);
                            setEditingTitle(qr.title);
                            setEditingUrl(qr.originalUrl);
                            setEditingStatus(qr.status);
                          }}
                          className="px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800 transition-colors"
                        >
                          <Edit className="w-3 h-3 inline mr-0.5" />แก้ไขลิงก์
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDynamicQr(qr.slug);
                          }}
                          className="px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded border border-red-100 dark:border-red-900/50 transition-colors"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Analytics Charts and Stats Detail */}
            <div className="lg:col-span-8 bg-[var(--bg-overlay)] backdrop-blur-2xl border border-[var(--border-light)] rounded-3xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-8">
              {!analyticsSlug ? (
                <div className="flex flex-col items-center justify-center p-16 text-center space-y-3">
                  <BarChart2 className="w-16 h-16 text-slate-300 dark:text-slate-600 animate-pulse" />
                  <div className="font-bold text-slate-600 dark:text-slate-300">กรุณาเลือกช่องรายการ Dynamic QR ทางด้านซ้าย</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">ข้อมูลสถิติมุมมองระดับองค์กร เช่น แทร็กเวลากิจกรรม, ระบบปฏิบัติการ, เบราว์เซอร์ และประเทศที่ใช้งานจะรายงานทันที</p>
                </div>
              ) : isLoadingAnalytics ? (
                <div className="flex flex-col items-center justify-center p-16 space-y-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                  <span>กำลังดึงข้อมูลสถิติจากเซิร์ฟเวอร์...</span>
                </div>
              ) : analyticsData ? (
                <div className="space-y-6 text-left">
                  
                  {/* Title & Simulator Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 dark:border-slate-800 pb-4 gap-2">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">รายงานและสถิติ: {editingSlug === analyticsSlug ? 'กำลังแก้ไข...' : dynamicQrs.find(q=>q.slug===analyticsSlug)?.title || analyticsSlug}</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">สแกนจริงเพื่อตรวจสอบเอกสารสำนักนายกรัฐมนตรี ปภ. และประมวลสถิติส่งตรงคลาวด์</p>
                    </div>

                    <div className="flex items-center gap-1.5 self-end">
                      <button
                        onClick={() => handleSimulateScan(analyticsSlug)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition-all flex items-center gap-1"
                        title="จำลองเพื่อจำลองพฤติกรรมการสแกนของผู้ใช้เพื่อทดสอบการเปลี่ยนสถานะแดชบอร์ด"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>จำลองสแกนทดสอบ</span>
                      </button>
                      <button
                        onClick={() => loadAnalytics(analyticsSlug)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>โหลดใหม่</span>
                      </button>
                    </div>
                  </div>

                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">สแกนสะสมทั้งหมด (Total)</span>
                      <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{analyticsData.totalScans}</span>
                      <span className="text-[9px] text-emerald-500 dark:text-emerald-400 block">สติกเกอร์ยังพร้อมทำงาน</span>
                    </div>
                    <div className="p-4 bg-slate-500/5 dark:bg-slate-800/40 border border-slate-500/20 dark:border-slate-700/60 rounded-2xl space-y-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">พิกัดสแกนสูงสุด (Top City)</span>
                      <span className="text-lg font-bold text-slate-800 dark:text-slate-200 truncate block">ระยอง, TH</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 block">จังหวัดที่สแกนสูงสุด</span>
                    </div>
                    <div className="p-4 bg-slate-500/5 dark:bg-slate-800/40 border border-slate-500/20 dark:border-slate-700/60 rounded-2xl space-y-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">อุปกรณ์หลัก (Main Dev)</span>
                      <span className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Smartphone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span>Mobile ({analyticsData.deviceBreakdown?.find((d:any)=>d.name==='Mobile')?.value || 0} ครั้ง)</span>
                      </span>
                    </div>
                    <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">สถานะลิงก์ (Status)</span>
                      <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                        <span>กำลังติดตาม</span>
                      </span>
                    </div>
                  </div>

                  {/* Inline edit forms */}
                  {editingSlug === analyticsSlug && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 rounded-2xl space-y-3">
                      <div className="font-bold text-xs text-amber-800 dark:text-amber-300">เครื่องมืออัปเดตเส้นทางสแกน:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">ชื่อคำอธิบายคิวอาร์:</label>
                          <input type="text" value={editingTitle} onChange={(e)=>setEditingTitle(e.target.value)} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded outline-none focus:ring-1 focus:ring-amber-500" />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">จุดหมายลิงก์ปลายทาง (Redirect URL):</label>
                          <input type="text" value={editingUrl} onChange={(e)=>setEditingUrl(e.target.value)} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded outline-none focus:ring-1 focus:ring-amber-500" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button onClick={()=>setEditingSlug(null)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">ยกเลิก</button>
                        <button onClick={()=>handleUpdateDynamicQr(analyticsSlug)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-bold shadow-sm transition-colors">บันทึกอัปเดต</button>
                      </div>
                    </div>
                  )}

                  {/* Timeline Custom Chart */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">ลำดับกิจกรรมการสแกน (Daily Scans History)</span>
                    <div className="h-64 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between">
                      {analyticsData.timeline?.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-xs text-slate-400 italic">ยังไม่มีประวัติสแกนรายวัน ให้กดปุ่ม "จำลองสแกนทดสอบ" เพื่อสร้างข้อมูล</div>
                      ) : (
                        <div className="flex items-end justify-between h-48 px-2 pt-6 pb-2 border-b border-slate-200 dark:border-slate-700">
                          {analyticsData.timeline.map((item: any, idx: number) => {
                            const maxVal = Math.max(...analyticsData.timeline.map((t: any) => t.count), 1);
                            const heightPercent = (item.count / maxVal) * 100;
                            return (
                              <div key={idx} className="flex flex-col items-center flex-1 group relative mx-0.5 sm:mx-1">
                                {/* Tooltip on hover */}
                                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-10">
                                  <div className="bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap">
                                    {new Date(item.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}: {item.count} ครั้ง
                                  </div>
                                  <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 -mt-1"></div>
                                </div>
                                {/* Bar */}
                                <div 
                                  className="w-4 bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-sm hover:from-blue-600 hover:to-blue-700 transition-all duration-300"
                                  style={{ height: `${Math.max(heightPercent, 4)}%` }}
                                />
                                {/* Value Label */}
                                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-1">{item.count}</span>
                                {/* Date Label */}
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 hidden sm:block">
                                  {new Date(item.date).toLocaleDateString('th-TH', { day: 'numeric' })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Device and Browser Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Device Chart */}
                    <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/40">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">สัดส่วนตามช่องทางอุปกรณ์ (Devices Used)</span>
                      <div className="h-44 flex flex-col justify-center">
                        {analyticsData.deviceBreakdown?.length === 0 ? (
                          <span className="text-xs text-slate-400 italic text-center">ไม่มีข้อมูลแสดงผล</span>
                        ) : (
                          <div className="space-y-3 pt-2">
                            {analyticsData.deviceBreakdown.map((item: any, idx: number) => {
                              const total = analyticsData.deviceBreakdown.reduce((acc: number, cur: any) => acc + cur.value, 0) || 1;
                              const percentage = Math.round((item.value / total) * 100);
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                                      {item.name === 'Mobile' ? <Smartphone className="w-3.5 h-3.5 text-blue-500" /> : <Laptop className="w-3.5 h-3.5 text-slate-500" />}
                                      <span>{item.name === 'Mobile' ? 'มือถือ (Mobile)' : item.name === 'Tablet' ? 'แท็บเล็ต (Tablet)' : 'เดสก์ท็อป (Desktop)'}</span>
                                    </span>
                                    <span className="font-bold text-slate-600 dark:text-slate-400">{item.value} ครั้ง ({percentage}%)</span>
                                  </div>
                                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location Breakdown list */}
                    <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/40">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">เมืองและพิกัดผู้สแกน (Top Scan Locations)</span>
                      <div className="h-44 overflow-y-auto space-y-1 text-xs">
                        {analyticsData.locationBreakdown?.length === 0 ? (
                          <div className="text-slate-400 italic py-8 text-center">ไม่มีข้อมูลสถานที่</div>
                        ) : (
                          analyticsData.locationBreakdown.map((loc:any, idx:number) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                <MapPin className="w-3.5 h-3.5 text-red-500" />
                                <span>{loc.name}</span>
                              </span>
                              <span className="font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold">{loc.value} สแกน</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Logs List */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">บันทึกรายการตรวจสอบสดล่าสุด (Real-Time Scan Logs Stream)</span>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 max-h-56 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                          <tr>
                            <th className="p-2.5 font-bold">เวลาสแกน</th>
                            <th className="p-2.5 font-bold">ที่อยู่ IP</th>
                            <th className="p-2.5 font-bold">เบราว์เซอร์ / OS</th>
                            <th className="p-2.5 font-bold">ประเภทอุปกรณ์</th>
                            <th className="p-2.5 font-bold">พิกัดสแกน</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {analyticsData.scans?.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-slate-400 italic">ยังไม่มีการบันทึกรายการเข้าสแกนจากผู้สแกนหนังสือราชการ</td>
                            </tr>
                          ) : (
                            analyticsData.scans.map((scan:any) => (
                              <tr key={scan.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                <td className="p-2.5 font-mono text-slate-500 dark:text-slate-400">{new Date(scan.scannedAt).toLocaleTimeString('th-TH')}</td>
                                <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300 font-bold">{scan.ipAddress}</td>
                                <td className="p-2.5 text-slate-700 dark:text-slate-300">{scan.browser} / {scan.platform}</td>
                                <td className="p-2.5">
                                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${scan.deviceType === 'Mobile' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'}`}>
                                    {scan.deviceType}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-700 dark:text-slate-300">{scan.location}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              ) : null}
            </div>

          </div>
        </div>
      )}

      {/* Tab 3: Bulk Generator */}
      {activeTab === 'bulk' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
            <div>
              <h2 className="text-xl font-bold font-sans text-slate-800 dark:text-slate-100">
                ระบบสร้างคิวอาร์โค้ดคราวละจำนวนมาก (Bulk Generator)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                เหมาะสำหรับการออกแฟ้มเอกสารสารบรรณประจำสัปดาห์ หรือส่งลิงก์ตรวจหลายหน่วยงานพร้อมกันทีเดียว
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateBulk}
                disabled={isGeneratingBulk}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow disabled:opacity-40 transition-colors"
              >
                {isGeneratingBulk ? 'กำลังประมวลผล...' : 'เริ่มกระบวนการสร้างแบบกลุ่ม'}
              </button>
              <button
                onClick={handleDownloadBulkPDF}
                disabled={bulkGeneratedItems.length === 0}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold shadow disabled:opacity-40 transition-colors"
              >
                <Download className="w-4 h-4 inline mr-1" />
                <span>พิมพ์แผ่นสติ๊กเกอร์ A4</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left Controls */}
            <div className="md:col-span-5 space-y-4 text-xs text-left">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">แหล่งนำเข้าข้อมูล (Data Source Selection):</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBulkInputMode('text')}
                    className={`flex-1 p-2 border rounded-xl text-center font-bold transition-colors ${bulkInputMode === 'text' ? 'border-blue-600 bg-blue-50/10 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    ระบุลิงก์เป็นรายแถว (Lines of Text)
                  </button>
                  <button
                    onClick={() => setBulkInputMode('docs')}
                    className={`flex-1 p-2 border rounded-xl text-center font-bold transition-colors ${bulkInputMode === 'docs' ? 'border-blue-600 bg-blue-50/10 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    เลือกจากหนังสือในระบบ (EDMS Docs)
                  </button>
                </div>
              </div>

              {bulkInputMode === 'text' ? (
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600 dark:text-slate-400">ระบุลิงก์หรือหัวข้อ (1 ลิงก์ต่อ 1 บรรทัด):</label>
                  <textarea
                    rows={8}
                    value={bulkTextInput}
                    onChange={(e) => setBulkTextInput(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="https://rayong.popt.go.th/page1&#10;https://rayong.popt.go.th/page2"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="font-semibold text-slate-600 dark:text-slate-400">ทำเครื่องหมายหน้าเอกสารที่ต้องการสร้าง QR พร้อมกัน:</label>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 max-h-56 overflow-y-auto space-y-1.5 bg-slate-50 dark:bg-slate-900/50">
                    {documents.map((doc) => {
                      const checked = bulkSelectedDocIds.includes(doc.id);
                      return (
                        <label key={doc.id} className="flex items-start gap-2.5 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                setBulkSelectedDocIds(bulkSelectedDocIds.filter(id => id !== doc.id));
                              } else {
                                setBulkSelectedDocIds([...bulkSelectedDocIds, doc.id]);
                              }
                            }}
                            className="rounded mt-0.5 text-blue-600"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{doc.docNumber || 'ไม่มีเลข'}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{doc.title}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Output list preview */}
            <div className="md:col-span-7 space-y-3">
              <div className="font-bold text-slate-800 dark:text-slate-200 text-xs text-left">รายการภาพผลผลิตคิวอาร์ ({bulkGeneratedItems.length} รายการที่สร้างขึ้น):</div>
              {bulkGeneratedItems.length === 0 ? (
                <div className="p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-xs text-slate-400 dark:text-slate-500 italic">
                  กดปุ่ม "เริ่มกระบวนการสร้างแบบกลุ่ม" เพื่อพรีวิวแกลอรี่คิวอาร์โค้ด
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto p-1">
                  {bulkGeneratedItems.map((item) => (
                    <div key={item.id} className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-left space-y-2 flex flex-col items-center">
                      <img src={item.dataUrl} className="w-24 h-24 bg-white p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm" alt="QR" />
                      <div className="w-full text-center">
                        <div className="font-bold text-[10px] text-slate-800 dark:text-slate-200 truncate">{item.title}</div>
                        <div className="text-[8px] text-slate-400 dark:text-slate-500 truncate">{item.payload}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Tab 4: Save Templates Studio (Full Options Support) */}
      {activeTab === 'templates' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 shadow-sm space-y-6">
          {/* Header & Stats Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-lighter)] pb-5 text-left">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bookmark className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold font-sans text-slate-800 dark:text-slate-100">
                  ไลบรารีแม่แบบงานเอกสารสารบรรณ (Full Options QR Templates)
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                จัดการและบันทึกการตั้งค่าสี การไล่เฉด โลโก้ตราครุฑ กรอบข้อความ และระดับความละเอียดครบวงจร เพื่อเรียกใช้งานได้ทันที 100%
              </p>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenSaveModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>บันทึกดีไซน์ปัจจุบันเป็นแม่แบบ</span>
              </button>

              <button
                type="button"
                onClick={handleExportTemplatesJSON}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                title="ส่งออกไฟล์ JSON เพื่อสำรองหรือแชร์แม่แบบ"
              >
                <FileDown className="w-4 h-4 text-emerald-600" />
                <span>ส่งออก JSON</span>
              </button>

              <button
                type="button"
                onClick={() => jsonImportInputRef.current?.click()}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                title="นำเข้าไฟล์แม่แบบจาก JSON"
              >
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>นำเข้า JSON</span>
              </button>
              <input
                ref={jsonImportInputRef}
                type="file"
                accept=".json"
                onChange={handleImportTemplatesJSON}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleResetOfficialTemplates}
                className="px-3 py-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                title="คืนค่าแม่แบบทางการและมาตรฐานภาครัฐทั้งหมด"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>คืนค่ามาตรฐาน</span>
              </button>
            </div>
          </div>

          {/* Filters and Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-left">
            {/* Category Chips with SVG Icons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'ทั้งหมด', icon: LayoutGrid },
                { id: 'official', label: 'ทางการ/สารบรรณ', icon: Landmark },
                { id: 'urgent', label: 'ด่วนที่สุด', icon: AlertTriangle },
                { id: 'public', label: 'ประชาสัมพันธ์', icon: Megaphone },
                { id: 'vcard', label: 'นามบัตร/ติดต่อ', icon: Briefcase },
                { id: 'wifi', label: 'Wi-Fi องค์กร', icon: Wifi },
                { id: 'finance', label: 'การเงิน/พร้อมเพย์', icon: CreditCard },
                { id: 'custom', label: 'กำหนดเอง', icon: Star },
              ].map((cat) => {
                const Icon = cat.icon;
                const count = cat.id === 'all' 
                  ? savedTemplates.length 
                  : savedTemplates.filter((t: any) => t.category === cat.id).length;
                const isSelected = templateCategoryFilter === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setTemplateCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span>{cat.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="ค้นหาแม่แบบด้วยชื่อหรือรายละเอียด..."
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {templateSearch && (
                <button
                  type="button"
                  onClick={() => setTemplateSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="ล้างข้อความค้นหา"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Template Cards Grid */}
          {isLoadingTemplates ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
              <p className="font-semibold text-xs">กำลังโหลดไลบรารีแม่แบบจากระบบ...</p>
            </div>
          ) : (
            (() => {
              const filtered = savedTemplates.filter((t: any) => {
                const matchCat = templateCategoryFilter === 'all' || (t.category || 'official') === templateCategoryFilter;
                const matchSearch = !templateSearch.trim() || 
                  (t.name && t.name.toLowerCase().includes(templateSearch.toLowerCase())) ||
                  (t.description && t.description.toLowerCase().includes(templateSearch.toLowerCase())) ||
                  (t.frameText && t.frameText.toLowerCase().includes(templateSearch.toLowerCase()));
                return matchCat && matchSearch;
              });

              if (filtered.length === 0) {
                return (
                  <div className="py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3 text-slate-400">
                    <Bookmark className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                    <div className="font-bold text-sm text-slate-600 dark:text-slate-400">ไม่พบแม่แบบที่ตรงกับเงื่อนไข</div>
                    <p className="text-xs max-w-sm mx-auto">
                      ลองเปลี่ยนหมวดหมู่ ค้นหาคำอื่น หรือคลิกปุ่ม &quot;บันทึกดีไซน์ปัจจุบันเป็นแม่แบบ&quot; เพื่อสร้างแม่แบบของคุณเอง
                    </p>
                    <button
                      type="button"
                      onClick={handleResetOfficialTemplates}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>โหลดแม่แบบมาตรฐานราชการ</span>
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filtered.map((t: any) => {
                    const isSelected = selectedTemplateId === t.id;
                    const catLabels: Record<string, { label: string; icon: any; color: string }> = {
                      official: { label: 'ทางการ/สารบรรณ', icon: Landmark, color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
                      urgent: { label: 'ด่วนที่สุด', icon: AlertTriangle, color: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' },
                      public: { label: 'ประชาสัมพันธ์', icon: Megaphone, color: 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300' },
                      vcard: { label: 'นามบัตร/ติดต่อ', icon: Briefcase, color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' },
                      wifi: { label: 'Wi-Fi องค์กร', icon: Wifi, color: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' },
                      finance: { label: 'การเงิน/พร้อมเพย์', icon: CreditCard, color: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' },
                      custom: { label: 'กำหนดเอง', icon: Star, color: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' },
                    };
                    const catInfo = catLabels[t.category || 'official'] || catLabels.official;
                    const CatIcon = catInfo.icon;

                    return (
                      <div
                        key={t.id}
                        className={`rounded-2xl border bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-left relative ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {/* Top Header & Badges */}
                        <div className="p-4 space-y-3 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${catInfo.color}`}>
                              <CatIcon className="w-3 h-3 shrink-0" />
                              <span>{catInfo.label}</span>
                            </span>
                            <div className="flex items-center gap-1">
                              {t.isDefault && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-full flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  <span>ค่าเริ่มต้น</span>
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(t)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="แก้ไขข้อมูลแม่แบบ"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateTemplate(t)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="สร้างสำเนาแม่แบบ"
                              >
                                <CopyPlus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTemplate(t.id, t.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                title="ลบแม่แบบนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Thumbnail and Title */}
                          <div className="flex items-start gap-3">
                            {/* Visual QR Snapshot or Color box */}
                            <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative group">
                              {t.previewDataUrl ? (
                                <img
                                  src={t.previewDataUrl}
                                  alt={t.name}
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <div
                                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-inner"
                                  style={{
                                    backgroundColor: t.fgColor || '#0f172a',
                                    backgroundImage: t.gradientType === 'linear' 
                                      ? `linear-gradient(45deg, ${t.fgColor}, ${t.gradientColor2 || '#2563eb'})` 
                                      : 'none'
                                  }}
                                >
                                  <QrCode className="w-6 h-6 text-white" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
                                {t.name}
                              </h3>
                              {t.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                  {t.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Design Spec Parameter Pills */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 text-[10px]">
                            {/* Color Swatch */}
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-mono">
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                                style={{ backgroundColor: t.fgColor || '#0f172a' }}
                              />
                              <span>{t.fgColor}</span>
                            </div>

                            {/* Gradient mode */}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                              <Palette className="w-2.5 h-2.5 text-blue-500" />
                              <span>{t.gradientType === 'linear' ? 'ไล่สีเส้นตรง' : t.gradientType === 'radial' ? 'ไล่สีวงกลม' : 'สีเดี่ยว'}</span>
                            </span>

                            {/* Logo Type */}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                              {t.logoType === 'garuda' ? (
                                <>
                                  <Shield className="w-2.5 h-2.5 text-amber-500" />
                                  <span>ตราครุฑ</span>
                                </>
                              ) : t.logoType === 'ddpm' || t.logoType === 'province' ? (
                                <>
                                  <Building2 className="w-2.5 h-2.5 text-indigo-500" />
                                  <span>ตรา ปภ./จังหวัด</span>
                                </>
                              ) : t.logoType === 'custom' ? (
                                <>
                                  <ImageIcon className="w-2.5 h-2.5 text-emerald-500" />
                                  <span>โลโก้กำหนดเอง</span>
                                </>
                              ) : (
                                <span>ไร้โลโก้</span>
                              )}
                            </span>

                            {/* Frame Type */}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                              {t.frameType === 'top-bottom' ? (
                                <>
                                  <Layers className="w-2.5 h-2.5 text-blue-500" />
                                  <span>กรอบบน-ล่าง</span>
                                </>
                              ) : t.frameType === 'card' ? (
                                <>
                                  <Layers className="w-2.5 h-2.5 text-purple-500" />
                                  <span>กรอบการ์ด</span>
                                </>
                              ) : t.frameType === 'badge' ? (
                                <>
                                  <Tag className="w-2.5 h-2.5 text-amber-500" />
                                  <span>ป้าย Badge</span>
                                </>
                              ) : (
                                <span>ไร้กรอบ</span>
                              )}
                            </span>

                            {/* Error Correction */}
                            <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-medium">
                              ระดับ {t.errorCorrection || 'H'}
                            </span>
                          </div>
                        </div>

                        {/* Card Bottom Action Bar */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {!t.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultTemplate(t.id)}
                                className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1"
                                title="กำหนดให้เป็นแม่แบบเริ่มต้นเมื่อเปิดระบบ"
                              >
                                <Star className="w-3 h-3" />
                                <span>ตั้งเป็นเริ่มต้น</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOverwriteTemplateStyle(t)}
                              className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1"
                              title="อัปเดตสไตล์ของแม่แบบนี้ด้วยการตั้งค่าบนหน้าจอปัจจุบัน"
                            >
                              <Save className="w-3 h-3 text-blue-500" />
                              <span>ทับด้วยดีไซน์ปัจจุบัน</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleApplyTemplate(t, true)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>ใช้งานแม่แบบนี้</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Tab 5: A4 Sticker & Label Printing Studio */}
      {activeTab === 'sticker' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 text-left">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-[var(--border-lighter)] pb-6 gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-sans text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  <Printer className="w-5 h-5" />
                </div>
                <span>สตูดิโอพิมพ์สติ๊กเกอร์สารบรรณ A4 (Official Labels Studio)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                จัดเรียง QR Code เป็นแผ่นสติ๊กเกอร์ขนาดมาตรฐาน A4 สำหรับติดปกหนังสือ แฟ้มประวัติ หรือซองเอกสารราชการ
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={downloadPNG}
                className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>บันทึกภาพ QR</span>
              </button>
              <button
                type="button"
                onClick={handlePrintStickerSheet}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>สั่งพิมพ์แผ่น A4 ทันที (Print Sheet)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Controls Column */}
            <div className="lg:col-span-5 space-y-6">
              {/* Layout Picker */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <LayoutGrid className="w-4 h-4 text-blue-500" />
                  <span>เลือกจำนวนดวงต่อแผ่น A4 (Layout Density):</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: '6', title: '6 ดวง/แผ่น', desc: '2 x 3 (ดวงใหญ่ 8.6 ซม.)', sub: 'แฟ้ม / ซองใหญ่' },
                    { id: '12', title: '12 ดวง/แผ่น', desc: '3 x 4 (ดวงกลาง 6.4 ซม.)', sub: 'ปกหนังสือราชการ' },
                    { id: '24', title: '24 ดวง/แผ่น', desc: '4 x 6 (ดวงเล็ก 4.4 ซม.)', sub: 'หนังสือเวียน/การ์ด' }
                  ].map(layout => {
                    const isSelected = stickerLayout === layout.id;
                    return (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => setStickerLayout(layout.id as any)}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/20 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {layout.title}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                          {layout.desc}
                        </span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 w-fit">
                          {layout.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <span>ชื่อหน่วยงาน / หัวกระดาษสติ๊กเกอร์:</span>
                </label>
                <input
                  type="text"
                  value={stickerCustomTitle}
                  onChange={(e) => setStickerCustomTitle(e.target.value)}
                  placeholder="เช่น สำนักงาน ปภ. จังหวัดระยอง"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Toggle Options */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  ตัวเลือกการแสดงผลบนดวงสติ๊กเกอร์:
                </span>
                
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">แสดงชื่อหน่วยงานหัวสติ๊กเกอร์</span>
                  <input
                    type="checkbox"
                    checked={stickerShowOrg}
                    onChange={(e) => setStickerShowOrg(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">แสดงเลขที่หนังสือ / ข้อมูลกำกับ</span>
                  <input
                    type="checkbox"
                    checked={stickerShowDoc}
                    onChange={(e) => setStickerShowDoc(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">แสดงวันที่ออกสติ๊กเกอร์ (วัน/เดือน/ปี)</span>
                  <input
                    type="checkbox"
                    checked={stickerShowDate}
                    onChange={(e) => setStickerShowDate(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-slate-400" />
                    <span>แสดงเส้นประนำทางรอยตัด (Cut Guides)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={stickerBorder}
                    onChange={(e) => setStickerBorder(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Status Notice */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span>คำแนะนำการพิมพ์ราชการ</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  ตั้งค่ากระดาษในไดอะล็อกพิมพ์เป็น <strong>A4</strong> และปรับระยะขอบ (Margins) เป็น <strong>ขั้นต่ำ (Minimum)</strong> เพื่อให้ดวงสติ๊กเกอร์ตรงกับแบบฟอร์มสติ๊กเกอร์ไดคัทมาตรฐาน
                </p>
              </div>
            </div>

            {/* Right Preview Column: Simulated A4 Sheet */}
            <div className="lg:col-span-7 bg-slate-200/70 dark:bg-slate-950/70 p-4 sm:p-6 rounded-3xl border border-slate-300 dark:border-slate-800 flex flex-col items-center">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1.5 self-start">
                <Eye className="w-4 h-4 text-blue-500" />
                <span>จำลองการจัดวางหน้ากระดาษ A4 ({stickerLayout} ดวงต่อแผ่น):</span>
              </div>

              {/* A4 Paper Canvas */}
              <div className="w-full max-w-lg bg-white text-slate-900 rounded-xl shadow-xl border border-slate-300 p-4 sm:p-5 overflow-hidden">
                <div className="border-b border-slate-100 pb-2 mb-3 text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    A4 Official Sheet Layout &bull; {stickerLayout} Labels
                  </div>
                </div>

                <div 
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: stickerLayout === '6' ? 'repeat(2, minmax(0, 1fr))' : stickerLayout === '12' ? 'repeat(3, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))'
                  }}
                >
                  {Array.from({ length: stickerLayout === '6' ? 6 : stickerLayout === '12' ? 12 : 24 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg bg-white flex flex-col justify-between transition-all ${
                        stickerBorder ? 'border border-dashed border-slate-300' : 'border border-slate-100'
                      }`}
                      style={{
                        minHeight: stickerLayout === '6' ? '120px' : stickerLayout === '12' ? '86px' : '62px'
                      }}
                    >
                      {stickerShowOrg && (
                        <div className="text-[9px] font-bold text-slate-800 truncate text-center border-b border-slate-100 pb-1 mb-1">
                          {stickerCustomTitle || 'สำนักงาน ปภ. จังหวัดระยอง'}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {generatedDataUrl ? (
                          <img
                            src={generatedDataUrl}
                            alt="QR"
                            className="object-contain shrink-0"
                            style={{
                              width: stickerLayout === '6' ? '50px' : stickerLayout === '12' ? '36px' : '26px',
                              height: stickerLayout === '6' ? '50px' : stickerLayout === '12' ? '36px' : '26px'
                            }}
                          />
                        ) : (
                          <div 
                            className="bg-slate-100 rounded flex items-center justify-center shrink-0"
                            style={{
                              width: stickerLayout === '6' ? '50px' : stickerLayout === '12' ? '36px' : '26px',
                              height: stickerLayout === '6' ? '50px' : stickerLayout === '12' ? '36px' : '26px'
                            }}
                          >
                            <QrCode className="w-4 h-4 text-slate-400" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-0.5 text-left">
                          {stickerShowDoc && (
                            <div className="text-[8px] font-bold text-slate-800 truncate">
                              {selectedDoc ? (selectedDoc.docNumber || selectedDoc.id) : (frameType !== 'none' && frameText ? frameText : 'รย 0021/ว 1234')}
                            </div>
                          )}
                          <div className="text-[7.5px] text-blue-600 font-semibold truncate">
                            ตรวจรับรองเอกสาร
                          </div>
                          {stickerShowDate && (
                            <div className="text-[7px] text-slate-400">
                              {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Simulator & Test */}
      {activeTab === 'test' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 shadow-sm space-y-6 max-w-5xl mx-auto text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[var(--border-lighter)] pb-4 gap-4">
            <div>
              <h2 className="text-xl font-bold font-sans text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Eye className="w-6 h-6 text-emerald-500" />
                เครื่องจำลองสแกนและถอดรหัส QR Code (Scanner Simulator)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ระบบถอดรหัสและประมวลผลข้อมูลจริงจาก QR Code ด้วย Cloud Engine เพื่อจำลองการแสดงผลบนอุปกรณ์มือถือแบบเรียลไทม์
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => handleDecodeAndVerify()}
              disabled={decodeLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${decodeLoading ? 'animate-spin' : ''}`} />
              <span>ดึงข้อมูล/สแกนอีกครั้ง (Sync Data)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Scanner Details and Status */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Raw QR Payload Box */}
              <div className="p-5 border border-[var(--border-light)] bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    รหัสข้อมูลดิบของ QR Code (Raw Payload):
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                    {decodedResult?.type === 'document' ? 'เอกสารราชการ' :
                     decodedResult?.type === 'url' ? 'ลิงก์ภายนอก' :
                     decodedResult?.type === 'wifi' ? 'เครือข่าย Wi-Fi' :
                     decodedResult?.type === 'promptpay' ? 'บัญชีพร้อมเพย์' :
                     decodedResult?.type === 'vcard' ? 'นามบัตรผู้ติดต่อ' : 'ข้อความทั่วไป'}
                  </span>
                </div>
                
                <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs break-all text-slate-700 dark:text-slate-300 font-semibold shadow-inner min-h-[50px] flex items-center">
                  {rawQrPayload || 'ไม่มีข้อมูล QR Payload - กรุณาสร้าง QR Code ก่อน'}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span>ถอดรหัสอัตโนมัติเมื่อข้อมูลต้นทางเปลี่ยนแปลง หรือคลิก "Sync Data" เพื่อประมวลผลใหม่</span>
                </div>
              </div>

              {/* Verified Status Guide Card */}
              <div className="p-5 border border-emerald-500/10 bg-emerald-500/5 rounded-2xl space-y-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span>ระบบตรวจสอบความโปร่งใส (Transparency & Security Audit)</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  ในสถานการณ์จริง เมื่อประชาชนใช้โทรศัพท์มือถือสแกน QR Code นี้ ระบบจะตรวจสอบความสมบูรณ์ของเอกสารในฐานข้อมูลกลาง 
                  ร่วมกับการตรวจสอบ <strong>ลายมือชื่ออิเล็กทรอนิกส์ร่วมขั้นสูง (Co-Signature SHA-256)</strong> เพื่อป้องกันการลักลอบแก้ไขปลอมแปลงเอกสารราชการ
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2 text-slate-500">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-0.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>Real-time Tracking</span>
                    </span>
                    บันทึกพิกัด เวลา และอุปกรณ์ที่ใช้สแกนลงบล็อกเกอร์ระบบ
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-0.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>No Cache Directs</span>
                    </span>
                    บังคับอัปเดตเส้นทางและข้อมูลแบบ Dynamic ทันทีไม่มีค้างในเครื่อง
                  </div>
                </div>
              </div>

              {rawQrPayload.startsWith('http') && (
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <a
                    href={rawQrPayload}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:-translate-y-0.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>เปิดลิงก์ตรวจสอบในหน้าต่างเต็ม (Verify Page)</span>
                  </a>
                </div>
              )}
            </div>

            {/* Right Column: Simulated Smartphone */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative mx-auto w-[330px] h-[640px] rounded-[42px] border-[10px] border-slate-800 dark:border-slate-700 bg-slate-950 shadow-2xl overflow-hidden flex flex-col font-sans">
                
                {/* Ear speaker slot and camera notch cutout on top */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 dark:bg-slate-700 rounded-b-2xl z-50 flex items-center justify-center">
                  <div className="w-12 h-1 bg-slate-900 rounded-full mb-1"></div>
                  <div className="w-2.5 h-2.5 bg-slate-950 rounded-full ml-3 mb-1"></div>
                </div>

                {/* Mobile Phone Status Bar */}
                <div className="h-8 pt-2 px-6 flex items-center justify-between text-slate-400 text-[10px] select-none z-30">
                  <span className="font-semibold">09:41</span>
                  <div className="flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    <span className="font-bold">5G</span>
                    <div className="w-5 h-2.5 border border-slate-400 rounded-sm p-px flex items-center">
                      <div className="h-full w-full bg-slate-400 rounded-2xs"></div>
                    </div>
                  </div>
                </div>

                {/* Mock Address Bar */}
                <div className="px-3 pb-1 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
                  <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[9px] text-slate-500 select-none">
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                    <span className="truncate flex-1 font-medium font-mono text-left">
                      {rawQrPayload || 'scan-simulator.edms.go.th'}
                    </span>
                    <button onClick={() => handleDecodeAndVerify()} className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
                      <RefreshCw className={`w-2.5 h-2.5 text-slate-400 ${decodeLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Phone screen Viewport content */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-y-auto p-3.5 space-y-4 text-xs select-none relative scrollbar-none">
                  
                  {decodeLoading ? (
                    /* Scanning Sonar View */
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-6 space-y-4 z-40">
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border border-emerald-500 animate-ping opacity-70"></div>
                        <div className="absolute inset-2 rounded-full border border-emerald-400 animate-pulse opacity-40"></div>
                        <QrCode className="w-10 h-10 text-emerald-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-emerald-400 font-sans">กำลังสแกนและแกะรหัส...</p>
                        <p className="text-[10px] text-slate-400">ถอดรหัส Co-Signature SHA-256</p>
                      </div>
                    </div>
                  ) : null}

                  {decodeError ? (
                    <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50 space-y-2 text-center my-4">
                      <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                      <p className="font-bold">ตรวจสอบผิดพลาด</p>
                      <p className="text-[10px] leading-relaxed">{decodeError}</p>
                    </div>
                  ) : decodedResult ? (
                    
                    /* RENDER ACCORDING TO DECODED TYPE */
                    decodedResult.type === 'document' ? (
                      /* Document verification layout */
                      <div className="space-y-3 text-left">
                        
                        {/* Header */}
                        <div className="flex flex-col items-center text-center space-y-1 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                          <img 
                            src={DDPM_LOGO_URL} 
                            className="w-8 h-8 object-contain" 
                            alt={`โลโก้หน่วยงาน ${sysSettings?.orgName || ''}`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/ddpm-logo.svg';
                            }}
                          />
                          <h4 className="font-bold text-[10px] text-slate-800 dark:text-slate-200">ตรวจสอบความถูกต้องเอกสาร</h4>
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                            {sysSettings?.orgName || 'Rayong Disaster EDMS'}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className={`p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-400 flex items-start gap-2`}>
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="font-bold text-[10px]">ลงนามดิจิทัลสมบูรณ์ (ETDA Certified)</p>
                            <p className="text-[8px] opacity-85 leading-relaxed">
                              เอกสารนี้ผ่านการรับรองความถูกต้องและมีผลสมบูรณ์ทางกฎหมาย
                            </p>
                          </div>
                        </div>

                        {/* Metadata Details */}
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-bold text-slate-700 dark:text-slate-300 text-[9px]">ข้อมูลเอกสารราชการ</span>
                          </div>

                          <div className="space-y-2 text-[9px]">
                            <div>
                              <span className="text-slate-400 block font-semibold">เรื่อง:</span>
                              <span className="text-slate-800 dark:text-slate-200 font-bold leading-snug">
                                {decodedResult.document.title}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-slate-400 block font-semibold">เลขที่หนังสือ:</span>
                                <span className="text-slate-800 dark:text-slate-200 font-mono font-bold">
                                  {decodedResult.document.docNumber}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block font-semibold">ลงวันที่:</span>
                                <span className="text-slate-800 dark:text-slate-200 font-bold">
                                  {decodedResult.document.date}
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-semibold">ต้นทาง (จาก):</span>
                              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                                {decodedResult.document.from}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-semibold">ปลายทาง (ถึง):</span>
                              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                                {decodedResult.document.to}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Signatures List */}
                        {decodedResult.signatures && decodedResult.signatures.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                              ลายมือชื่อดิจิทัลที่ตรวจพบ ({decodedResult.signatures.length}):
                            </span>
                            {decodedResult.signatures.map((sig: any, idx: number) => (
                              <div key={sig.id} className="p-2.5 rounded-xl border border-indigo-500/10 bg-indigo-500/5 space-y-1 text-[8px]">
                                <div className="flex items-center justify-between font-bold text-indigo-800 dark:text-indigo-400 border-b border-indigo-500/10 pb-1">
                                  <span>ผู้ลงนามลำดับที่ {idx + 1}</span>
                                  <span className="font-mono text-[7px]">{sig.certificateSerial?.substring(0, 10)}...</span>
                                </div>
                                <div className="space-y-0.5 text-slate-600 dark:text-slate-400">
                                  <p><strong className="text-slate-800 dark:text-slate-200">{sig.signerName}</strong></p>
                                  <p>{sig.signerPosition} / {sig.signerDepartment}</p>
                                  <p className="font-mono text-[7px] text-slate-400">Timestamp: {sig.timestampFormatted || sig.timestampIso}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="pt-2 text-center">
                          <p className="text-[8px] text-slate-400">ระบบบันทึกความสมบูรณ์กลาง {sysSettings?.orgName || 'ปภ.ระยอง'}</p>
                        </div>

                      </div>
                    ) : decodedResult.type === 'document_not_found' ? (
                      /* Document Not Found */
                      <div className="space-y-4 text-left py-4">
                        <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950 rounded-full flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
                          <AlertCircle className="w-8 h-8" />
                        </div>
                        <div className="space-y-1 text-center">
                          <h4 className="font-bold text-rose-600 dark:text-rose-400 text-sm">ไม่พบเอกสารราชการในระบบ</h4>
                          <p className="text-[9px] text-slate-400">Document ID: "{decodedResult.docId}"</p>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 text-[9px] p-3 rounded-xl border border-rose-100 dark:border-rose-950/40 leading-relaxed font-semibold flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span>คำเตือนสากล: ไม่พบรหัสลงทะเบียนนี้ในระบบ ปภ.จังหวัดระยอง หากเป็นเอกสารราชการแผ่นกระดาษที่มี QR Code นี้กำกับอยู่ มีความเสี่ยงสูงที่จะเป็นเอกสารปลอมแปลงหรือข้อมูลไม่ถูกต้อง กรุณาติดต่อกองสารบรรณเพื่อทำการตรวจสอบจริงทันที</span>
                        </div>
                      </div>
                    ) : decodedResult.type === 'url' ? (
                      /* URL Preview layout - Updated to match v2.0 Verification Landing Page */
                      <div className="space-y-4 text-center py-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="relative w-16 h-16 mx-auto">
                          <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                          <div className="relative w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40">
                            <Check className="w-8 h-8 text-white stroke-[3.5]" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm">ผ่านการตรวจสอบความถูกต้อง</h4>
                          <div className="flex items-center justify-center gap-1.5 text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                            <ShieldCheck className="w-3 h-3" />
                            <span>QR Code Verified & Secure</span>
                          </div>
                        </div>

                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-left space-y-2.5 shadow-xs">
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">เนื้อหา / ชื่อเรื่อง:</span>
                            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                              {decodedResult.title || customTitle || (frameType !== 'none' && frameText ? frameText : 'สนง.ปภ.ระยอง')}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">ลิงก์ปลายทาง:</span>
                            <div className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-lg">
                              <p className="font-mono text-[8px] text-slate-600 dark:text-slate-300 break-all leading-relaxed select-all">
                                {decodedResult.resolvedUrl}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 pt-1">
                          <a 
                            href={decodedResult.resolvedUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="w-full h-10 bg-slate-900 dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-slate-900/20 text-xs"
                          >
                            <span>เข้าสู่ลิงก์ที่ระบุ</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          {/* Simulator Interactive Pause / Play and Progress */}
                          <div className="p-2.5 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between gap-1 text-[9px]">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${simPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-ping'}`} />
                                <span className="font-bold text-slate-700 dark:text-slate-300 truncate">
                                  {simPaused ? (
                                    <span className="text-amber-600 dark:text-amber-400">หยุดการนับถอยหลังชั่วคราว</span>
                                  ) : (
                                    <span>ระบบจะนำทางอัตโนมัติใน <strong className="text-emerald-600 dark:text-emerald-400 font-black">{simCountdown}</strong> วินาที</span>
                                  )}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSimPaused(!simPaused)}
                                className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-[8px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1 shrink-0 cursor-pointer"
                              >
                                {simPaused ? <Play className="w-2.5 h-2.5 fill-current text-emerald-600" /> : <Pause className="w-2.5 h-2.5 fill-current text-amber-600" />}
                                <span>{simPaused ? 'เริ่มต่อ' : 'หยุด'}</span>
                              </button>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${simPaused ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${(simCountdown / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) :
 decodedResult.type === 'wifi' ? (
                      /* WiFi Config Layout */
                      <div className="space-y-4 text-left py-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                          <Wifi className="w-7 h-7" />
                        </div>
                        <div className="space-y-1 text-center">
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">เชื่อมต่อ Wi-Fi อัตโนมัติ</h4>
                          <p className="text-[9px] text-slate-400">Wireless Network Config</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 text-[9px]">
                          <div>
                            <span className="text-slate-400 font-semibold block">ชื่อเครือข่าย (SSID):</span>
                            <span className="text-slate-800 dark:text-slate-200 font-bold font-mono text-[11px]">{decodedResult.wifi.ssid}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block">รหัสผ่าน (Password):</span>
                            <span className="text-slate-800 dark:text-slate-200 font-mono font-semibold">{decodedResult.wifi.password}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block">ระบบความปลอดภัย:</span>
                            <span className="text-slate-800 dark:text-slate-200 font-bold">{decodedResult.wifi.encryption}</span>
                          </div>
                        </div>
                        <button className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-xl shadow-md transition-colors">
                          <Wifi className="w-3.5 h-3.5" />
                          <span>สแกนเข้าใช้เครือข่ายทันที</span>
                        </button>
                      </div>
                    ) : decodedResult.type === 'promptpay' ? (
                      /* PromptPay QR Code */
                      <div className="space-y-4 text-left py-4">
                        <div className="w-12 h-12 bg-sky-100 dark:bg-sky-950 rounded-full flex items-center justify-center mx-auto text-sky-600 dark:text-sky-400">
                          <CreditCard className="w-7 h-7" />
                        </div>
                        <div className="space-y-1 text-center">
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">ข้อมูลโอนเงินผ่านพร้อมเพย์</h4>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500">PromptPay Electronic Payment</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 text-[9px]">
                          <div>
                            <span className="text-slate-400 font-semibold block">เบอร์โทรศัพท์/เลขบัตรประชาชน:</span>
                            <span className="text-slate-800 dark:text-slate-200 font-bold font-mono text-[12px]">{decodedResult.promptpay.id}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block">จำนวนเงินโอน:</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[14px]">{parseFloat(decodedResult.promptpay.amount || '0').toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                          </div>
                        </div>
                        <p className="text-[8px] text-slate-400 dark:text-slate-500 text-center leading-relaxed flex items-center justify-center gap-1">
                          <Shield className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span>ตรวจสอบปลายทางของเลขพร้อมเพย์ให้ถูกต้องกับผู้รับเงินก่อนกดยืนยันผ่านแอพธนาคาร</span>
                        </p>
                      </div>
                    ) : decodedResult.type === 'vcard' ? (
                      /* Contact VCard */
                      <div className="space-y-4 text-left py-4">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                          <User className="w-7 h-7" />
                        </div>
                        <div className="space-y-1 text-center">
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">ข้อมูลนามบัตรอิเล็กทรอนิกส์</h4>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500">VCard Contact Card</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-[9px]">
                          <div>
                            <span className="text-slate-400 font-semibold block">ชื่อผู้ติดต่อ (Name):</span>
                            <span className="text-slate-800 dark:text-slate-200 font-bold">{decodedResult.vcard.name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block">ตำแหน่ง/หน่วยงาน:</span>
                            <span className="text-slate-700 dark:text-slate-300 font-semibold">{decodedResult.vcard.org}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block">เบอร์โทรศัพท์ (Tel):</span>
                            <span className="text-slate-800 dark:text-slate-200 font-mono font-semibold">{decodedResult.vcard.phone}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block">อีเมล (Email):</span>
                            <span className="text-slate-800 dark:text-slate-200 font-mono font-semibold">{decodedResult.vcard.email}</span>
                          </div>
                        </div>
                        <button className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-xl shadow-md transition-colors">
                          <User className="w-3.5 h-3.5" />
                          <span>บันทึกชื่อลงโทรศัพท์</span>
                        </button>
                      </div>
                    ) : (
                      /* General plain text */
                      <div className="space-y-3 text-left py-4">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-600 dark:text-slate-300">
                          <FileText className="w-7 h-7" />
                        </div>
                        <div className="space-y-1 text-center">
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">ข้อมูลข้อความทั่วไป</h4>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500">Plain Text Payload</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-[10px] text-slate-800 dark:text-slate-200 break-all leading-normal whitespace-pre-wrap">
                          {decodedResult.payload}
                        </div>
                      </div>
                    )

                  ) : (
                    /* Initial No Result Box */
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 space-y-2">
                      <QrCode className="w-12 h-12 text-slate-300 dark:text-slate-700 animate-pulse" />
                      <p className="font-bold text-xs text-slate-500 dark:text-slate-400">รอจำลองถอดรหัส QR</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">กรุณากดปุ่ม Sync Data เพื่อโหลดการจำลองสแกนสด</p>
                    </div>
                  )}

                </div>

                {/* Home indicator bar at bottom */}
                <div className="h-6 bg-white dark:bg-slate-950 flex items-center justify-center pb-2 z-30 select-none">
                  <div className="w-24 h-1 bg-slate-400 dark:bg-slate-600 rounded-full"></div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Save Full Options Template */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden text-left flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bookmark className="w-5 h-5" />
                <h3 className="font-bold text-base font-sans">
                  บันทึกแม่แบบงานออกแบบ (Save as Template)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
              {/* Design Snapshot Preview */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-white dark:bg-slate-900 border flex items-center justify-center overflow-hidden shrink-0">
                  {generatedDataUrl ? (
                    <img src={generatedDataUrl} alt="Preview" className="w-full h-full object-contain p-1" />
                  ) : (
                    <QrCode className="w-8 h-8 text-blue-500" />
                  )}
                </div>
                <div className="space-y-0.5 text-[11px]">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    บันทึกตัวเลือกครบถ้วน 100%
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    สี: {fgColor} • พื้นหลัง: {transparentBg ? 'โปร่งใส' : bgColor} • กรอบ: {frameType} • โลโก้: {logoType}
                  </div>
                </div>
              </div>

              {/* Template Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  ชื่อแม่แบบ (Template Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={modalTplName}
                  onChange={(e) => setModalTplName(e.target.value)}
                  placeholder="เช่น สติกเกอร์เอกสารสำคัญตราครุฑ ปภ."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Category Selection */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  หมวดหมู่แม่แบบ (Category)
                </label>
                <select
                  value={modalTplCategory}
                  onChange={(e) => setModalTplCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="official">ทางการ / งานสารบรรณ (Official)</option>
                  <option value="urgent">ด่วนที่สุด / ตรวจสอบเร่งด่วน (Urgent)</option>
                  <option value="public">สื่อประชาสัมพันธ์ / ดาวน์โหลด (Public)</option>
                  <option value="vcard">นามบัตรข้าราชการ / ผู้บริหาร (vCard)</option>
                  <option value="wifi">Wi-Fi องค์กร / ห้องประชุม (Wi-Fi)</option>
                  <option value="finance">การเงิน / พร้อมเพย์ (PromptPay)</option>
                  <option value="custom">แม่แบบกำหนดเอง (Custom)</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  คำอธิบายหรือหมายเหตุ (Description)
                </label>
                <textarea
                  value={modalTplDescription}
                  onChange={(e) => setModalTplDescription(e.target.value)}
                  rows={2}
                  placeholder="เช่น ใช้สำหรับติดหนังสือคำสั่งหรือประกาศของกองอำนวยการ..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Default QR Payload Type */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  ประเภทเนื้อหาเริ่มต้น (Default Content Type)
                </label>
                <select
                  value={modalTplDefaultQrType}
                  onChange={(e) => setModalTplDefaultQrType(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="edms">เอกสารสารบรรณ EDMS</option>
                  <option value="url">เว็บไซต์ (URL Link)</option>
                  <option value="text">ข้อความทั่วไป</option>
                  <option value="vcard">นามบัตรข้าราชการ (vCard)</option>
                  <option value="wifi">รหัสผ่าน Wi-Fi</option>
                  <option value="promptpay">พร้อมเพย์ ปภ.</option>
                </select>
              </div>

              {/* Is Default Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modalTplIsDefault}
                  onChange={(e) => setModalTplIsDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    ตั้งเป็นแม่แบบเริ่มต้นของระบบ (Default Template)
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    เมื่อเข้าหน้าระบบสร้าง QR Studio สไตล์นี้จะถูกเรียกใช้งานทันทีโดยอัตโนมัติ
                  </span>
                </div>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-300 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveFullTemplate}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกแม่แบบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Template Meta */}
      {showEditTemplateModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden text-left flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Edit className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base font-sans">
                  แก้ไขข้อมูลแม่แบบ (Edit Template)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditTemplateModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  ชื่อแม่แบบ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={modalTplName}
                  onChange={(e) => setModalTplName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  หมวดหมู่
                </label>
                <select
                  value={modalTplCategory}
                  onChange={(e) => setModalTplCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="official">ทางการ / งานสารบรรณ (Official)</option>
                  <option value="urgent">ด่วนที่สุด / ตรวจสอบเร่งด่วน (Urgent)</option>
                  <option value="public">สื่อประชาสัมพันธ์ / ดาวน์โหลด (Public)</option>
                  <option value="vcard">นามบัตรข้าราชการ / ผู้บริหาร (vCard)</option>
                  <option value="wifi">Wi-Fi องค์กร / ห้องประชุม (Wi-Fi)</option>
                  <option value="finance">การเงิน / พร้อมเพย์ (PromptPay)</option>
                  <option value="custom">แม่แบบกำหนดเอง (Custom)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  คำอธิบายหรือหมายเหตุ
                </label>
                <textarea
                  value={modalTplDescription}
                  onChange={(e) => setModalTplDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  ประเภทเนื้อหาเริ่มต้น
                </label>
                <select
                  value={modalTplDefaultQrType}
                  onChange={(e) => setModalTplDefaultQrType(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="edms">เอกสารสารบรรณ EDMS</option>
                  <option value="url">เว็บไซต์ (URL Link)</option>
                  <option value="text">ข้อความทั่วไป</option>
                  <option value="vcard">นามบัตรข้าราชการ (vCard)</option>
                  <option value="wifi">รหัสผ่าน Wi-Fi</option>
                  <option value="promptpay">พร้อมเพย์ ปภ.</option>
                </select>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modalTplIsDefault}
                  onChange={(e) => setModalTplIsDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  ตั้งเป็นแม่แบบเริ่มต้นของระบบ (Default Template)
                </span>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditTemplateModal(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-300 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleUpdateTemplateMeta}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกการแก้ไข</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Document Stamper Modal */}
      {isAiStamperOpen && selectedDoc && (
        <AiDocumentStamperModal
          isOpen={isAiStamperOpen}
          onClose={() => setIsAiStamperOpen(false)}
          document={selectedDoc}
          qrDataUrl={generatedDataUrl}
          currentUser={user}
          onStampSuccess={(result) => {
            setStampSuccess(true);
            setTimeout(() => setStampSuccess(false), 5000);
          }}
          showToast={showToast}
        />
      )}

    </div>
  );
}
