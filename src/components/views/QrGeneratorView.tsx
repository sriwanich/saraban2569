import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { 
  QrCode, Download, Copy, Printer, Check, RefreshCw, FileText, Globe, 
  User, Wifi, CreditCard, Sparkles, ShieldCheck, Palette, Image as ImageIcon, 
  Layers, CheckCircle2, AlertCircle, Building2, Sliders, Eye, Share2, 
  FolderOpen, Bookmark, Save, Trash2, ArrowRight, ExternalLink, Hash, Calendar, Send,
  Plus, Edit, Pause, Play, CheckSquare, Square, BarChart2, MapPin, Laptop, Smartphone, HelpCircle, LayoutGrid
} from 'lucide-react';
import { DocumentItem } from '../../types';

interface QrGeneratorViewProps {
  user?: any;
  documents?: DocumentItem[];
  initialDocId?: string;
  onViewDoc?: (doc: DocumentItem) => void;
}

export default function QrGeneratorView({ user, documents = [], initialDocId, onViewDoc }: QrGeneratorViewProps) {
  // Navigation tabs inside Enterprise QR Studio
  const [activeTab, setActiveTab] = useState<'create' | 'analytics' | 'bulk' | 'templates' | 'sticker' | 'test'>('create');

  // System settings state & Drag-and-Drop state
  const [sysSettings, setSysSettings] = useState<any>(null);
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
        if (data) setSysSettings(data);
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

  // Form Fields
  const [urlInput, setUrlInput] = useState('https://rayong.popt.go.th');
  const [textInput, setTextInput] = useState('ประกาศสำนักงาน ปภ. จังหวัดระยอง เรื่อง มาตรการป้องกันสาธารณภัย');
  
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
  const [frameType, setFrameType] = useState<'none' | 'top-bottom' | 'card' | 'badge'>('top-bottom');
  const [frameText, setFrameText] = useState('สแกนเพื่อตรวจสอบเอกสาร EDMS');
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

  // Saved Templates State
  const [savedTemplates, setSavedTemplates] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('enterprise_qr_templates');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [newTemplateName, setNewTemplateName] = useState('');

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
  const DDPM_LOGO_URL = sysSettings?.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png';

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
        frameColor,
        frameTextColor
      };

      const res = await fetch('/api/qr-generator/dynamic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: frameType !== 'none' && frameText ? frameText : `ลิ้งค์ตรวจสอบเอกสาร ${selectedDoc ? selectedDoc.docNumber : 'ทั่วไป'}`,
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
    if (!confirm('ยืนยันที่จะลบ Dynamic QR และข้อมูลสถิติทั้งหมดใช่หรือไม่? การลบนี้ไม่สามารถกู้คืนได้')) return;
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
                    document: resData.document,
                    signatures: resData.signatures
                  });
                  setDecodeLoading(false);
                  return;
                }
              } else {
                setDecodedResult({
                  type: 'document_not_found',
                  payload: payloadToDecode,
                  resolvedUrl: targetUrl,
                  docId: docId
                });
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
          resolvedUrl: targetUrl
        });
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
      }

      targetCanvas.width = finalWidth;
      targetCanvas.height = finalHeight;

      ctx.clearRect(0, 0, finalWidth, finalHeight);

      if (!transparentBg) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, finalWidth, finalHeight);
      }

      // Draw Card border
      if (frameType === 'card') {
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 6;
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(10, 10, finalWidth - 20, finalHeight - 20, 24);
        ctx.fill();
        ctx.stroke();
      }

      // Draw Colored QR
      ctx.drawImage(coloredCanvas, qrOffsetX, qrOffsetY, size, size);

      // 4. Logo Overlay
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
          ctx.fillText('ระบบสารบรรณอิเล็กทรอนิกส์ EDMS', finalWidth / 2, finalHeight - 18);
        } else if (frameType === 'card') {
          ctx.fillStyle = frameColor;
          ctx.font = 'bold 24px Sarabun, sans-serif';
          ctx.fillText(frameText, finalWidth / 2, 45);

          ctx.font = '16px Sarabun, sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.fillText('สแกนด้วยกล้องมือถือเพื่อตรวจสอบข้อมูลจริง', finalWidth / 2, finalHeight - 25);
        } else if (frameType === 'badge') {
          ctx.fillStyle = frameColor;
          ctx.beginPath();
          ctx.roundRect(20, finalHeight - 65, finalWidth - 40, 50, 12);
          ctx.fill();
          ctx.fillStyle = frameTextColor;
          ctx.font = 'bold 20px Sarabun, sans-serif';
          ctx.fillText(frameText, finalWidth / 2, finalHeight - 32);
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

  // Save layout style to Saved Templates
  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) {
      showToast('error', 'กรุณากรอกชื่อเทมเพลต');
      return;
    }
    const template = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      fgColor,
      bgColor,
      transparentBg,
      gradientType,
      gradientColor2,
      gradientAngle,
      logoType,
      frameType,
      frameText,
      frameColor,
      frameTextColor,
      qrMargin
    };

    const updated = [...savedTemplates, template];
    setSavedTemplates(updated);
    localStorage.setItem('enterprise_qr_templates', JSON.stringify(updated));
    setNewTemplateName('');
    showToast('success', 'บันทึกแม่แบบงานออกแบบสำเร็จ!');
  };

  // Load template styling
  const handleLoadTemplate = (t: any) => {
    setFgColor(t.fgColor);
    setBgColor(t.bgColor || '#ffffff');
    setTransparentBg(t.transparentBg || false);
    setGradientType(t.gradientType || 'solid');
    setGradientColor2(t.gradientColor2 || '#2563eb');
    setGradientAngle(t.gradientAngle || 45);
    setLogoType(t.logoType || 'none');
    setFrameType(t.frameType || 'none');
    setFrameText(t.frameText || '');
    setFrameColor(t.frameColor || '#0f172a');
    setFrameTextColor(t.frameTextColor || '#ffffff');
    if (t.qrMargin !== undefined) setQrMargin(t.qrMargin);
    showToast('success', `โหลดเทมเพลต "${t.name}" สำเร็จ!`);
  };

  // Delete template
  const handleDeleteTemplate = (id: string) => {
    const updated = savedTemplates.filter(t => t.id !== id);
    setSavedTemplates(updated);
    localStorage.setItem('enterprise_qr_templates', JSON.stringify(updated));
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

  // Downloads PNG
  const downloadPNG = () => {
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
      const payload = getComputedPayload();
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

  // Stamp current generated QR onto selected document
  const handleStampToDocument = async () => {
    if (!selectedDocId) return;
    setIsSavingToDoc(true);
    setStampSuccess(false);

    try {
      // Simulate calling doc stamp endpoint
      const response = await fetch(`/api/documents/${selectedDocId}/stamp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrCodeImage: generatedDataUrl,
          stampedBy: user?.username || 'ผู้ดูแลระบบ',
          positionX: 450,
          positionY: 50
        })
      });

      if (response.ok) {
        setStampSuccess(true);
        setTimeout(() => setStampSuccess(false), 3000);
        showToast('success', `ประทับตรายืนยัน QR ในเอกสาร [${selectedDoc?.docNumber || ' EDMS '}] เรียบร้อยแล้ว!`);
      } else {
        showToast('error', 'ไม่สามารถบันทึกตราลงเอกสารได้');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'เกิดข้อผิดพลาดในการประทับตรา');
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
          <button onClick={() => setToast(null)} className="ml-2 text-white/80 hover:text-white font-bold text-sm">✕</button>
        </div>
      )}

      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-light)] shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-noto-serif-thai text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <QrCode className="w-8 h-8 text-blue-600" />
            <span>ระบบสร้าง QR Code (QR Studio v1.0)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ระบบความสมบูรณ์แบบเพื่อการยืนยันตัวตนหนังสือราชการ ย่อลิงก์ ติดตามสถิติสแกนแบบ Real-Time และพิมพ์ชุดสติ๊กเกอร์สารบรรณ
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'create' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            สร้าง & ดีไซน์ QR
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'analytics' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            วิเคราะห์ & ติดตามสถิติ
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'bulk' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            สร้างแบบกลุ่ม (Bulk)
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'templates' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            แม่แบบ (Templates)
          </button>
          <button
            onClick={() => setActiveTab('sticker')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'sticker' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            พิมพ์แผ่นตรา A4
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'test' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            เครื่องจำลองสแกน
          </button>
        </div>
      </div>

      {/* Tab 1: Design & Create Studio */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Design Controls Panel */}
          <div className="lg:col-span-7 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 shadow-sm space-y-6 overflow-y-auto max-h-[85vh]">
            
            {/* Generation Mode Select */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sliders className="w-4 h-4 text-blue-500" />
                <span>เทคโนโลยีการสร้าง (QR Code Technology)</span>
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setGenerationMode('static'); setRegisteredSlug(''); }}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${generationMode === 'static' ? 'border-blue-600 bg-blue-50/10 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'}`}
                >
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Static QR Code</span>
                  <span className="text-[10px] text-slate-500 mt-1">ข้อมูลฝังอยู่ในภาพโดยตรง ไม่สามารถเปลี่ยนปลายทางภายหลังได้หลังพิมพ์</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setGenerationMode('dynamic');
                    if (!registeredSlug && !isRegisteringDynamic) {
                      await registerDynamicQr();
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${generationMode === 'dynamic' ? 'border-blue-600 bg-blue-50/10 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'}`}
                >
                  <span className="font-bold text-xs text-blue-600 flex items-center gap-1">
                    <Sparkles className={`w-3.5 h-3.5 ${isRegisteringDynamic ? 'animate-spin' : ''}`} />
                    <span>Dynamic Routing (แนะนำ) {isRegisteringDynamic && '(กำลังลงทะเบียน...)'}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">สร้างลิงก์สั้นวิเคราะห์ข้อมูลสแกน เปลี่ยนลิงก์ปลายทางเมื่อใดก็ได้ ไม่ต้องปริ้นต์กระดาษใหม่</span>
                </button>
              </div>

              {/* Dynamic QR registration status feedback card */}
              {generationMode === 'dynamic' && !registeredSlug && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-400">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <div className="font-bold text-amber-900 dark:text-amber-300">ต้องการลงทะเบียน Dynamic Link บนเซิร์ฟเวอร์หรือไม่?</div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400">กดปุ่มลงทะเบียนเพื่อรับ URL สั้นสถิติสำหรับ QR Code นี้</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => registerDynamicQr()}
                    disabled={isRegisteringDynamic}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 self-end sm:self-center"
                  >
                    {isRegisteringDynamic ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังลงทะเบียน...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>ลงทะเบียนเพื่อรับ URL สั้น</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {generationMode === 'dynamic' && registeredSlug && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-400">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-emerald-900 dark:text-emerald-300">เชื่อมโยงกับ Dynamic URL สั้นสำเร็จ!</div>
                      <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                        {window.location.origin}/qr/{registeredSlug}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={async () => {
                        const shortUrl = `${window.location.origin}/qr/${registeredSlug}`;
                        try {
                          await navigator.clipboard.writeText(shortUrl);
                          showToast('success', 'คัดลอก URL สั้นเรียบร้อยแล้ว!');
                        } catch (_) {
                          showToast('info', `URL สั้น: ${shortUrl}`);
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอก URL สั้น</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRegisteredSlug('');
                        setGenerationMode('static');
                        showToast('info', 'ยกเลิกการลงทะเบียน Dynamic Link แล้ว');
                      }}
                      className="text-[11px] text-slate-500 hover:text-rose-600 underline"
                    >
                      ยกเลิกลงทะเบียน
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <LayoutGrid className="w-4 h-4 text-blue-500" />
                <span>พรีเซตงานตามหน้าที่ (Quick Layout Presets)</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {docPresets.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => handleApplyPreset(preset)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 rounded-lg transition-all"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Tabs for QR Type */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex flex-wrap gap-1">
                {[
                  { id: 'edms', label: 'เอกสาร EDMS', icon: FileText },
                  { id: 'url', label: 'เว็บไซต์ (URL)', icon: Globe },
                  { id: 'text', label: 'ข้อความทั่วไป', icon: Sparkles },
                  { id: 'vcard', label: 'นามบัตรข้าราชการ', icon: User },
                  { id: 'wifi', label: 'Wi-Fi สำนักงาน', icon: Wifi },
                  { id: 'promptpay', label: 'พร้อมเพย์ ปภ.', icon: CreditCard }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setQrType(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${qrType === tab.id ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conditional Form Inputs */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs text-left">
              
              {qrType === 'edms' && (
                <div className="space-y-3">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    เลือกหนังสือราชการ หรือเอกสารในสารบรรณ:
                  </label>
                  
                  {/* Search Document Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ค้นหาตามเลขที่หนังสือ หรือเรื่อง..."
                      value={docSearchQuery}
                      onChange={(e) => setDocSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Document List Selector */}
                  <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-white dark:bg-slate-900">
                    {documents
                      .filter(d => 
                        d.title.toLowerCase().includes(docSearchQuery.toLowerCase()) || 
                        (d.docNumber && d.docNumber.toLowerCase().includes(docSearchQuery.toLowerCase()))
                      )
                      .map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => {
                            setSelectedDocId(doc.id);
                            if (doc.title) {
                              setFrameText(`ตรวจเลขหนังสือ: ${doc.docNumber || doc.id}`);
                            }
                          }}
                          className={`w-full text-left p-2 rounded transition-all flex flex-col gap-0.5 ${selectedDocId === doc.id ? 'bg-blue-500/10 border-l-4 border-blue-500' : 'hover:bg-slate-50'}`}
                        >
                          <span className="font-bold text-slate-800 dark:text-slate-200">{doc.docNumber || 'ไม่มีเลขหนังสือ'}</span>
                          <span className="text-[10px] text-slate-500 truncate">{doc.title}</span>
                        </button>
                      ))}
                  </div>

                  {selectedDoc && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">✓ ลิงก์ตรวจสอบเอกสารถูกสร้างขึ้นเรียบร้อย:</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-400 break-all">{getComputedPayload()}</div>
                    </div>
                  )}
                </div>
              )}

              {qrType === 'url' && (
                <div className="space-y-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">ระบุลิงก์ปลายทาง (Target URL):</label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg"
                    placeholder="https://example.com"
                  />
                </div>
              )}

              {qrType === 'text' && (
                <div className="space-y-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">ระบุข้อความที่ต้องการฝัง:</label>
                  <textarea
                    rows={3}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg font-sans"
                    placeholder="พิมพ์ประกาศหรือรายละเอียดข้อความ..."
                  />
                </div>
              )}

              {qrType === 'vcard' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-500">ชื่อ-นามสกุล:</label>
                    <input type="text" value={vcard.name} onChange={(e) => setVcard({...vcard, name: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-500">ตำแหน่งงาน:</label>
                    <input type="text" value={vcard.title} onChange={(e) => setVcard({...vcard, title: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="block font-bold text-slate-500">สังกัดองค์กร:</label>
                    <input type="text" value={vcard.org} onChange={(e) => setVcard({...vcard, org: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-500">เบอร์โทรติดต่อ:</label>
                    <input type="text" value={vcard.phone} onChange={(e) => setVcard({...vcard, phone: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-500">อีเมล:</label>
                    <input type="email" value={vcard.email} onChange={(e) => setVcard({...vcard, email: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg" />
                  </div>
                </div>
              )}

              {qrType === 'wifi' && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="block font-bold text-slate-500">ชื่อเครือข่าย Wi-Fi (SSID):</label>
                    <input type="text" value={wifi.ssid} onChange={(e) => setWifi({...wifi, ssid: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-500">ประเภทการเข้ารหัส:</label>
                    <select value={wifi.encryption} onChange={(e) => setWifi({...wifi, encryption: e.target.value as any})} className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg">
                      <option value="WPA">WPA/WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">No Password</option>
                    </select>
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="block font-bold text-slate-500">รหัสผ่านอินเทอร์เน็ต:</label>
                    <input type="password" value={wifi.password} onChange={(e) => setWifi({...wifi, password: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg" />
                  </div>
                </div>
              )}

              {qrType === 'promptpay' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <label className="block font-bold text-slate-500">เลขบัตร/เบอร์โทรศัพท์ (PromptPay ID):</label>
                    <input type="text" value={promptPay.id} onChange={(e) => setPromptPay({...promptPay, id: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="block font-bold text-slate-500">ระบุจำนวนเงินฝาก (บาท):</label>
                    <input type="number" value={promptPay.amount} onChange={(e) => setPromptPay({...promptPay, amount: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg" />
                  </div>
                </div>
              )}

            </div>

            {/* Custom Styling Controls */}
            <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-purple-500" />
                <span>ปรับแต่งสีและเอฟเฟกต์สีรหัส (Gradients & Colors)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-left">
                
                {/* Palette Select */}
                <div className="space-y-1.5 col-span-3">
                  <label className="font-semibold text-slate-600 dark:text-slate-400">จานสีมาตรฐานองค์กร (Brand Color Preset):</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {presetPalettes.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setFgColor(p.fg);
                          setBgColor(p.bg);
                          setFrameColor(p.frame);
                          setGradientType(p.gradType as any);
                          setGradientColor2(p.col2);
                        }}
                        className="p-1 border border-slate-200 rounded text-[9px] hover:bg-slate-100 flex flex-col items-center gap-1 font-semibold"
                      >
                        <div className="flex gap-0.5 w-full h-3.5 rounded overflow-hidden">
                          <div className="flex-1" style={{ backgroundColor: p.fg }} />
                          <div className="flex-1" style={{ backgroundColor: p.col2 }} />
                          <div className="flex-1" style={{ backgroundColor: p.bg }} />
                        </div>
                        <span className="truncate max-w-full text-slate-700">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Fill Mode */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-400">รูปแบบการลงสี:</label>
                  <select
                    value={gradientType}
                    onChange={(e) => setGradientType(e.target.value as any)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg"
                  >
                    <option value="solid">สีเดี่ยว (Solid Color)</option>
                    <option value="linear">ไล่เฉดสีตรง (Linear Gradient)</option>
                    <option value="radial">ไล่เฉดสีวงกลม (Radial Gradient)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">สีหลัก (Foreground):</label>
                  <div className="flex gap-2">
                    <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-10 h-8 border rounded cursor-pointer" />
                    <input type="text" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-full px-2 border rounded font-mono text-xs" />
                  </div>
                </div>

                {gradientType !== 'solid' && (
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">สีเฉดเฉลี่ย (Gradient Color):</label>
                    <div className="flex gap-2">
                      <input type="color" value={gradientColor2} onChange={(e) => setGradientColor2(e.target.value)} className="w-10 h-8 border rounded cursor-pointer" />
                      <input type="text" value={gradientColor2} onChange={(e) => setGradientColor2(e.target.value)} className="w-full px-2 border rounded font-mono text-xs" />
                    </div>
                  </div>
                )}

              </div>

              {/* Gradient angle */}
              {gradientType === 'linear' && (
                <div className="space-y-1.5 text-xs text-left">
                  <label className="font-semibold text-slate-600">ทิศทางไล่สีคิวอาร์:</label>
                  <div className="flex gap-2">
                    {[
                      { l: 'ซ้ายไปขวา (0°)', v: 0 },
                      { l: 'ล่างซ้ายขึ้นขวา (45°)', v: 45 },
                      { l: 'ล่างขึ้นบน (90°)', v: 90 },
                      { l: 'บนซ้ายลงล่างขวา (135°)', v: 135 }
                    ].map(ang => (
                      <button
                        key={ang.v}
                        onClick={() => setGradientAngle(ang.v)}
                        className={`px-2 py-1 rounded border text-[10px] font-semibold ${gradientAngle === ang.v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                      >
                        {ang.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Background Color & Margin */}
              <div className="grid grid-cols-2 gap-4 text-xs text-left">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-400">สีพื้นหลังคิวอาร์ (Background Color):</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={bgColor} disabled={transparentBg} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-8 border rounded cursor-pointer disabled:opacity-40" />
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={transparentBg} onChange={(e) => setTransparentBg(e.target.checked)} className="rounded text-blue-500" />
                      <span>พื้นหลังโปร่งใส (Transparent)</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-400">ขนาดขอบขาว (Quiet Zone Margin):</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="1" max="6" step="1" value={qrMargin} onChange={(e) => setQrMargin(parseInt(e.target.value))} className="w-full" />
                    <span className="font-mono font-bold">{qrMargin}px</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Logo Emblem Overlay */}
            <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-500" />
                <span>โลโก้ หรือตราสัญลักษณ์ตรงกลาง (Center Logo Overlay)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-left">
                <div className="space-y-1 w-full sm:col-span-2">
                  <label className="font-semibold text-slate-600 dark:text-slate-400">เลือกโลโก้มาตรฐาน:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setLogoType('none')}
                      className={`p-2 border rounded-xl text-center font-bold ${logoType === 'none' ? 'border-indigo-600 bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      ไม่มีโลโก้
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoType('garuda')}
                      className={`p-2 border rounded-xl text-center font-bold flex flex-col items-center justify-center gap-1 ${logoType === 'garuda' ? 'border-indigo-600 bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <img src={GARUDA_LOGO_URL} className="w-5 h-5 object-contain" alt="ครุฑ" />
                      <span>ตราครุฑสารบรรณ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoType('ddpm')}
                      className={`p-2 border rounded-xl text-center font-bold flex flex-col items-center justify-center gap-1 ${logoType === 'ddpm' ? 'border-indigo-600 bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <img src={DDPM_LOGO_URL} className="w-5 h-5 object-contain" alt="ปภ" />
                      <span>ตราสัญลักษณ์ ปภ.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLogoType('custom');
                        if (!customLogoUrl) {
                          setCustomLogoUrl('https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png');
                        }
                      }}
                      className={`p-2 border rounded-xl text-center font-bold flex flex-col items-center justify-center gap-1 ${logoType === 'custom' ? 'border-indigo-600 bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <img src={customLogoUrl || 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png'} className="w-5 h-5 object-contain" alt="จังหวัด" />
                      <span>ตราโลโก้อื่นๆ</span>
                    </button>
                  </div>
                </div>

                {logoType === 'custom' && (
                  <div className="space-y-2">
                    <label className="font-semibold text-slate-600 dark:text-slate-400">อัปโหลดไฟล์ภาพโลโก้ของคุณ (Custom Emblem):</label>
                    
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => {
                        const fileInput = document.getElementById('logo-file-input');
                        if (fileInput) fileInput.click();
                      }}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-2 ${
                        isDragging 
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[1.02]' 
                          : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:border-indigo-500/50'
                      }`}
                    >
                      <input
                        id="logo-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      
                      {customLogoUrl ? (
                        <div className="flex flex-col items-center gap-2">
                          <img 
                            src={customLogoUrl} 
                            alt="Custom Logo Preview" 
                            className="w-16 h-16 object-contain rounded-lg border border-slate-100 p-1 bg-white"
                          />
                          <span className="text-xs text-slate-500 font-medium">ลากไฟล์ใหม่มาวางที่นี่ หรือคลิกเพื่อเปลี่ยนรูป</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <ImageIcon className="w-8 h-8 text-slate-400 animate-pulse" />
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">ลากและวางไฟล์รูปภาพของคุณที่นี่</span>
                          <span className="text-[10px] text-slate-400">หรือคลิกเพื่อค้นหาจากคอมพิวเตอร์ของคุณ</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-slate-500">รองรับนามสกุล PNG, JPG หรือ SVG และปรับขนาดให้พอดีอัตโนมัติ</p>
                  </div>
                )}
              </div>
            </div>

            {/* Frame Banner Texts */}
            <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-500" />
                <span>การใส่เฟรมแบรนด์หนังสือราชการ (Custom Frame & Labels)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-left">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-400">สไตล์รูปแบบเฟรม:</label>
                  <select
                    value={frameType}
                    onChange={(e) => setFrameType(e.target.value as any)}
                    className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg"
                  >
                    <option value="none">ไม่มีกรอบ (เฉพาะภาพ QR)</option>
                    <option value="top-bottom">หัวกระดาษแถบสีและสโลแกนใต้ (Official Corporate Banner)</option>
                    <option value="card">กรอบรูปการ์ดสวยงาม (Document Card Mode)</option>
                    <option value="badge">ริบบอนโค้งเน้นข้อความใต้ (Badge Ribbon Overlay)</option>
                  </select>
                </div>

                {frameType !== 'none' && (
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">ข้อความหลักแสดงบนเฟรม:</label>
                    <input
                      type="text"
                      value={frameText}
                      onChange={(e) => setFrameText(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg font-bold text-xs"
                      placeholder="เช่น สแกนเพื่อตรวจสอบความสมบูรณ์"
                    />
                  </div>
                )}

                {frameType !== 'none' && (
                  <>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600">สีแบคกราวด์แถบเฟรม (Frame Color):</label>
                      <input type="color" value={frameColor} onChange={(e) => setFrameColor(e.target.value)} className="w-full h-8 border rounded cursor-pointer" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600">สีฟอนต์ตัวหนังสือเฟรม (Text Color):</label>
                      <input type="color" value={frameTextColor} onChange={(e) => setFrameTextColor(e.target.value)} className="w-full h-8 border rounded cursor-pointer" />
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Right Side: QR Real-time Render Result */}
          <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 shadow-sm flex flex-col items-center justify-between min-h-[400px]">
            <div className="space-y-2 text-center w-full">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">ผลงานการออกตราประทับคิวอาร์สด (Real-time Studio Preview)</h2>
              <p className="text-[10px] text-slate-500">การเปลี่ยนแปลงสไตล์ สี และตราจะปรับปรุงบนแบบจำลองจริงด้านล่างทันที</p>
            </div>

            {/* Main Canvas Display */}
            <div className="relative my-6 max-w-full overflow-hidden p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner flex items-center justify-center">
              <canvas
                ref={canvasRef}
                style={{ width: '100%', maxWidth: '320px', height: 'auto' }}
                className="rounded-lg shadow-md bg-white"
              />
              {isGenerating && (
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/70 flex flex-col items-center justify-center gap-2 text-xs font-bold text-blue-600">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <span>กำลังเรนเดอร์คุณภาพสูง...</span>
                </div>
              )}
            </div>

            {/* Enterprise Quick Operations */}
            <div className="w-full space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={downloadPNG}
                  className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>บันทึกภาพ PNG (300DPI)</span>
                </button>
                <button
                  onClick={downloadSVG}
                  className="flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold shadow transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดไฟล์ SVG</span>
                </button>
              </div>

              {generationMode === 'dynamic' && registeredSlug && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-800/60 rounded-xl flex items-center gap-3">
                  <div className="bg-blue-500 text-white p-1.5 rounded-lg shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-bold text-xs text-blue-800 dark:text-blue-300">Dynamic QR พร้อมใช้งาน</div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 truncate">URL สั้น: /qr/{registeredSlug}</div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/qr/${registeredSlug}`);
                      showToast('success', 'คัดลอกลิงก์สั้นสแกนสำเร็จ!');
                    }}
                    className="p-1.5 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 rounded transition-colors shrink-0"
                    title="คัดลอก URL สั้น"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Stamp on EDMS Doc and Printer */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleStampToDocument}
                  disabled={!selectedDocId || isSavingToDoc}
                  className="flex items-center justify-center gap-2 p-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 rounded-xl text-xs text-amber-800 dark:text-amber-400 font-bold transition-all disabled:opacity-40"
                >
                  <Bookmark className="w-4 h-4 text-amber-500" />
                  <span>{stampSuccess ? '✓ สำเร็จ!' : 'ประทับลงหนังสือ EDMS'}</span>
                </button>
                <button
                  onClick={() => {
                    const win = window.open();
                    if(win) {
                      win.document.write(`<iframe src="${generatedDataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                      win.print();
                    }
                  }}
                  className="flex items-center justify-center gap-2 p-2.5 bg-slate-100 hover:bg-slate-200 border rounded-xl text-xs text-slate-700 font-bold"
                >
                  <Printer className="w-4 h-4" />
                  <span>สั่งพิมพ์ด่วน (Print)</span>
                </button>
              </div>

              {/* Details of code string */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-left space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">ค่าฝังรหัสจริง (Current QR Payload string):</span>
                <div className="p-2.5 bg-slate-100 dark:bg-slate-900 border rounded-lg font-mono text-[10px] text-slate-600 dark:text-slate-400 break-all max-h-20 overflow-y-auto">
                  {rawQrPayload}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Analytics & Track Dashboard */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Registered Dynamic QRs List */}
            <div className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">รายการคิวอาร์แบบไดนามิก ({dynamicQrs.length})</h3>
                <p className="text-[10px] text-slate-500">คลิกที่รายการด้านล่างเพื่อตรวจสอบสถิติการสแกน และพฤติกรรมผู้ใช้</p>
              </div>

              {isLoadingQrs ? (
                <div className="flex items-center justify-center p-8 text-xs font-bold text-slate-500 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังอัปเดตสล็อตข้อมูล...</span>
                </div>
              ) : dynamicQrs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 italic">
                  ยังไม่มีการลงทะเบียน Dynamic QR โค้ดในระบบสารบรรณ
                </div>
              ) : (
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                  {dynamicQrs.map((qr) => (
                    <div
                      key={qr.slug}
                      className={`p-3 border rounded-xl text-left transition-all space-y-2 cursor-pointer ${analyticsSlug === qr.slug ? 'border-blue-600 bg-blue-50/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50'}`}
                      onClick={() => loadAnalytics(qr.slug)}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-bold text-xs text-slate-800 truncate block flex-1">{qr.title}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(qr);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${qr.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}
                          title="คลิกเพื่อเปลี่ยนสถานะเปิด/ระงับชั่วคราว"
                        >
                          {qr.status === 'active' ? 'Active' : 'Paused'}
                        </button>
                      </div>

                      <div className="text-[10px] text-slate-500 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span>รหัสเป้าหมาย:</span>
                          <span className="font-mono text-slate-700 bg-white dark:bg-slate-800 px-1 rounded truncate max-w-[120px]">{qr.slug}</span>
                        </div>
                        <div className="truncate text-blue-600">ปลายทาง: {qr.originalUrl}</div>
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSlug(qr.slug);
                            setEditingTitle(qr.title);
                            setEditingUrl(qr.originalUrl);
                            setEditingStatus(qr.status);
                          }}
                          className="px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                        >
                          <Edit className="w-3 h-3 inline mr-0.5" />แก้ไขลิงก์
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDynamicQr(qr.slug);
                          }}
                          className="px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 rounded border border-red-100"
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
            <div className="lg:col-span-8 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 shadow-sm space-y-6">
              {!analyticsSlug ? (
                <div className="flex flex-col items-center justify-center p-16 text-center space-y-3">
                  <BarChart2 className="w-16 h-16 text-slate-300 animate-pulse" />
                  <div className="font-bold text-slate-600">กรุณาเลือกช่องรายการ Dynamic QR ทางด้านซ้าย</div>
                  <p className="text-xs text-slate-500 max-w-sm">ข้อมูลสถิติมุมมองระดับองค์กร เช่น แทร็กเวลากิจกรรม, ระบบปฏิบัติการ, เบราว์เซอร์ และประเทศที่ใช้งานจะรายงานทันที</p>
                </div>
              ) : isLoadingAnalytics ? (
                <div className="flex flex-col items-center justify-center p-16 space-y-3 text-xs font-bold text-slate-500">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                  <span>กำลังดึงข้อมูลสถิติจากเซิร์ฟเวอร์...</span>
                </div>
              ) : analyticsData ? (
                <div className="space-y-6 text-left">
                  
                  {/* Title & Simulator Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-2">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">รายงานและสถิติ: {editingSlug === analyticsSlug ? 'กำลังแก้ไข...' : dynamicQrs.find(q=>q.slug===analyticsSlug)?.title || analyticsSlug}</h3>
                      <p className="text-[10px] text-slate-500">สแกนจริงเพื่อตรวจสอบเอกสารสำนักนายกรัฐมนตรี ปภ. และประมวลสถิติส่งตรงคลาวด์</p>
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
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border rounded-lg text-[11px] font-semibold flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>โหลดใหม่</span>
                      </button>
                    </div>
                  </div>

                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">สแกนสะสมทั้งหมด (Total)</span>
                      <span className="text-3xl font-extrabold text-blue-600">{analyticsData.totalScans}</span>
                      <span className="text-[9px] text-emerald-500 block">สติกเกอร์ยังพร้อมทำงาน</span>
                    </div>
                    <div className="p-4 bg-slate-500/5 border border-slate-500/20 rounded-2xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">พิกัดสแกนสูงสุด (Top City)</span>
                      <span className="text-lg font-bold text-slate-800 truncate block">ระยอง, TH</span>
                      <span className="text-[9px] text-slate-400 block">จังหวัดที่สแกนสูงสุด</span>
                    </div>
                    <div className="p-4 bg-slate-500/5 border border-slate-500/20 rounded-2xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">อุปกรณ์หลัก (Main Dev)</span>
                      <span className="text-lg font-bold text-slate-800 flex items-center gap-1">
                        <Smartphone className="w-4 h-4 text-slate-500" />
                        <span>Mobile ({analyticsData.deviceBreakdown?.find((d:any)=>d.name==='Mobile')?.value || 0} ครั้ง)</span>
                      </span>
                    </div>
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">สถานะลิงก์ (Status)</span>
                      <span className="text-sm font-extrabold text-amber-600 flex items-center gap-1 mt-1">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                        <span>กำลังติดตาม</span>
                      </span>
                    </div>
                  </div>

                  {/* Inline edit forms */}
                  {editingSlug === analyticsSlug && (
                    <div className="p-4 bg-amber-50 dark:bg-slate-900 border border-amber-300 rounded-2xl space-y-3">
                      <div className="font-bold text-xs text-amber-800">เครื่องมืออัปเดตเส้นทางสแกน:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="font-semibold block mb-1">ชื่อคำอธิบายคิวอาร์:</label>
                          <input type="text" value={editingTitle} onChange={(e)=>setEditingTitle(e.target.value)} className="w-full p-2 bg-white border rounded" />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">จุดหมายลิงก์ปลายทาง (Redirect URL):</label>
                          <input type="text" value={editingUrl} onChange={(e)=>setEditingUrl(e.target.value)} className="w-full p-2 bg-white border rounded" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button onClick={()=>setEditingSlug(null)} className="px-3 py-1.5 bg-slate-200 rounded text-[11px] font-semibold">ยกเลิก</button>
                        <button onClick={()=>handleUpdateDynamicQr(analyticsSlug)} className="px-3 py-1.5 bg-amber-500 text-white rounded text-[11px] font-bold">บันทึกอัปเดต</button>
                      </div>
                    </div>
                  )}

                  {/* Timeline Custom Chart */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700">ลำดับกิจกรรมการสแกน (Daily Scans History)</span>
                    <div className="h-64 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between">
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
                                <span className="text-[9px] font-bold text-slate-500 mt-1">{item.count}</span>
                                {/* Date Label */}
                                <span className="text-[9px] text-slate-400 mt-1 hidden sm:block">
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
                    <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50">
                      <span className="text-xs font-bold text-slate-700">สัดส่วนตามช่องทางอุปกรณ์ (Devices Used)</span>
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
                                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                                      {item.name === 'Mobile' ? <Smartphone className="w-3.5 h-3.5 text-blue-500" /> : <Laptop className="w-3.5 h-3.5 text-slate-500" />}
                                      <span>{item.name === 'Mobile' ? 'มือถือ (Mobile)' : item.name === 'Tablet' ? 'แท็บเล็ต (Tablet)' : 'เดสก์ท็อป (Desktop)'}</span>
                                    </span>
                                    <span className="font-bold text-slate-600">{item.value} ครั้ง ({percentage}%)</span>
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
                    <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50">
                      <span className="text-xs font-bold text-slate-700">เมืองและพิกัดผู้สแกน (Top Scan Locations)</span>
                      <div className="h-44 overflow-y-auto space-y-1 text-xs">
                        {analyticsData.locationBreakdown?.length === 0 ? (
                          <div className="text-slate-400 italic py-8 text-center">ไม่มีข้อมูลสถานที่</div>
                        ) : (
                          analyticsData.locationBreakdown.map((loc:any, idx:number) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-white rounded-lg border border-slate-100">
                              <span className="flex items-center gap-1 font-semibold text-slate-700">
                                <MapPin className="w-3.5 h-3.5 text-red-500" />
                                <span>{loc.name}</span>
                              </span>
                              <span className="font-mono bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">{loc.value} สแกน</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Logs List */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700">บันทึกรายการตรวจสอบสดล่าสุด (Real-Time Scan Logs Stream)</span>
                    <div className="border rounded-2xl overflow-hidden bg-white max-h-56 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="p-2.5 font-bold">เวลาสแกน</th>
                            <th className="p-2.5 font-bold">ที่อยู่ IP</th>
                            <th className="p-2.5 font-bold">เบราว์เซอร์ / OS</th>
                            <th className="p-2.5 font-bold">ประเภทอุปกรณ์</th>
                            <th className="p-2.5 font-bold">พิกัดสแกน</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {analyticsData.scans?.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-slate-400 italic">ยังไม่มีการบันทึกรายการเข้าสแกนจากผู้สแกนหนังสือราชการ</td>
                            </tr>
                          ) : (
                            analyticsData.scans.map((scan:any) => (
                              <tr key={scan.id} className="hover:bg-slate-50/80">
                                <td className="p-2.5 font-mono text-slate-500">{new Date(scan.scannedAt).toLocaleTimeString('th-TH')}</td>
                                <td className="p-2.5 font-mono text-slate-700 font-bold">{scan.ipAddress}</td>
                                <td className="p-2.5">{scan.browser} / {scan.platform}</td>
                                <td className="p-2.5">
                                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${scan.deviceType === 'Mobile' ? 'bg-blue-500/10 text-blue-600' : 'bg-slate-500/10 text-slate-600'}`}>
                                    {scan.deviceType}
                                  </span>
                                </td>
                                <td className="p-2.5">{scan.location}</td>
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
            <div>
              <h2 className="text-xl font-bold font-noto-serif-thai text-slate-800">
                ระบบสร้างคิวอาร์โค้ดคราวละจำนวนมาก (Enterprise Bulk Generator)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                เหมาะสำหรับการออกแฟ้มเอกสารสารบรรณประจำสัปดาห์ หรือส่งลิงก์ตรวจหลายหน่วยงานพร้อมกันทีเดียว
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateBulk}
                disabled={isGeneratingBulk}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow disabled:opacity-40"
              >
                {isGeneratingBulk ? 'กำลังประมวลผล...' : 'เริ่มกระบวนการสร้างแบบกลุ่ม'}
              </button>
              <button
                onClick={handleDownloadBulkPDF}
                disabled={bulkGeneratedItems.length === 0}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow disabled:opacity-40"
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
                <label className="font-bold text-slate-700">แหล่งนำเข้าข้อมูล (Data Source Selection):</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBulkInputMode('text')}
                    className={`flex-1 p-2 border rounded-xl text-center font-bold ${bulkInputMode === 'text' ? 'border-blue-600 bg-blue-50/10' : 'bg-white'}`}
                  >
                    ระบุลิงก์เป็นรายแถว (Lines of Text)
                  </button>
                  <button
                    onClick={() => setBulkInputMode('docs')}
                    className={`flex-1 p-2 border rounded-xl text-center font-bold ${bulkInputMode === 'docs' ? 'border-blue-600 bg-blue-50/10' : 'bg-white'}`}
                  >
                    เลือกจากหนังสือในระบบ (EDMS Docs)
                  </button>
                </div>
              </div>

              {bulkInputMode === 'text' ? (
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-600">ระบุลิงก์หรือหัวข้อ (1 ลิงก์ต่อ 1 บรรทัด):</label>
                  <textarea
                    rows={8}
                    value={bulkTextInput}
                    onChange={(e) => setBulkTextInput(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-mono text-xs bg-slate-50"
                    placeholder="https://rayong.popt.go.th/page1&#10;https://rayong.popt.go.th/page2"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="font-semibold text-slate-600">ทำเครื่องหมายหน้าเอกสารที่ต้องการสร้าง QR พร้อมกัน:</label>
                  <div className="border rounded-xl p-3 max-h-56 overflow-y-auto space-y-1.5 bg-slate-50">
                    {documents.map((doc) => {
                      const checked = bulkSelectedDocIds.includes(doc.id);
                      return (
                        <label key={doc.id} className="flex items-start gap-2.5 p-2 bg-white border rounded hover:border-slate-300 cursor-pointer">
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
                            <div className="font-bold text-slate-800">{doc.docNumber || 'ไม่มีเลข'}</div>
                            <div className="text-[10px] text-slate-500 truncate">{doc.title}</div>
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
              <div className="font-bold text-slate-800 text-xs text-left">รายการภาพผลผลิตคิวอาร์ ({bulkGeneratedItems.length} รายการที่สร้างขึ้น):</div>
              {bulkGeneratedItems.length === 0 ? (
                <div className="p-12 border border-dashed rounded-2xl text-center text-xs text-slate-400 italic">
                  กดปุ่ม "เริ่มกระบวนการสร้างแบบกลุ่ม" เพื่อพรีวิวแกลอรี่คิวอาร์โค้ด
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto p-1">
                  {bulkGeneratedItems.map((item) => (
                    <div key={item.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50 text-left space-y-2 flex flex-col items-center">
                      <img src={item.dataUrl} className="w-24 h-24 bg-white p-1 rounded-lg border shadow-sm" alt="QR" />
                      <div className="w-full text-center">
                        <div className="font-bold text-[10px] text-slate-800 truncate">{item.title}</div>
                        <div className="text-[8px] text-slate-400 truncate">{item.payload}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Tab 4: Save Templates Studio */}
      {activeTab === 'templates' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4 text-left">
            <h2 className="text-xl font-bold font-noto-serif-thai text-slate-800">
              ไลบรารีแม่แบบงานเอกสารสารบรรณ (Corporate QR Styles Library)
            </h2>
            <p className="text-xs text-slate-500">
              บันทึกการจัดรูปแบบ แถบหัวกระดาษ โลโก้ และสีเฉดสีของหน่วยงานคุณ เพื่อใช้ทันทีในอนาคตโดยไม่ต้องตั้งค่าใหม่
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Create / Save current style form */}
            <div className="p-5 border rounded-2xl text-xs text-left space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Save className="w-4 h-4 text-blue-500" />
                <span>บันทึกดีไซน์ปัจจุบันเป็นแม่แบบใหม่</span>
              </h3>
              <p className="text-slate-500 text-[11px]">การตั้งค่าสไตล์การไล่สี กรอบ ข้อความเฟรม และสเกลทั้งหมดที่คุณเพิ่งจัดทำเสร็จจะถูกเก็บรักษากลุ่มข้อมูลไว้</p>
              
              <div className="space-y-2">
                <label className="font-semibold block text-slate-600">ตั้งชื่อเทมเพลตของคุณ (Template Name):</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="เช่น ตราครุฑกรม ปภ. จังหวัดระยอง"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <button
                    onClick={handleSaveTemplate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shrink-0"
                  >
                    บันทึกสไตล์นี้
                  </button>
                </div>
              </div>
            </div>

            {/* List of custom saved templates */}
            <div className="p-5 border rounded-2xl text-xs text-left space-y-4">
              <h3 className="font-bold text-slate-800">เทมเพลตของคุณที่บันทึกแล้ว ({savedTemplates.length})</h3>
              
              {savedTemplates.length === 0 ? (
                <div className="py-8 text-center text-slate-400 italic">ยังไม่มีการบันทึกเทมเพลตแบบแมนนวลของคุณ</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {savedTemplates.map((t) => (
                    <div key={t.id} className="p-3 bg-slate-50 border rounded-xl flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 truncate">{t.name}</div>
                        <div className="text-[9px] text-slate-400">กรอบ: {t.frameType} • สี: {t.fgColor} • ขอบข้าม: {t.gradientType}</div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleLoadTemplate(t)}
                          className="px-2.5 py-1 bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          ใช้แม่แบบนี้
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(t.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Tab 5: PDF Stickers Printable (Traditional) */}
      {activeTab === 'sticker' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-4 text-left">
            <div>
              <h2 className="text-xl font-bold font-noto-serif-thai text-slate-800">
                ระบบพิมพ์สติ๊กเกอร์ และสลิปตรวจสอบเอกสาร (Official Document Labels)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                สร้างสติ๊กเกอร์ขนาดมาตรฐานสำหรับติดบนปกหนังสือราชการ แฟ้มเอกสาร หรือซองจดหมาย
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="p-5 border border-blue-500/30 bg-blue-500/5 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-sm text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="w-5 h-5" />
                <span>ตัวอย่างสเปกสติ๊กเกอร์สารบรรณ (Standard Sticker Spec)</span>
              </div>
              <ul className="space-y-2 text-slate-600 list-disc list-inside">
                <li>ขนาดสติ๊กเกอร์แต่ละดวง: 4.0 x 4.0 ซม. (วางเรียง 6 ดวงต่อหน้า A4)</li>
                <li>พิมพ์ตราครุฑ / โลโก้หน่วยงานกำกับพร้อมรหัสหนังสือราชการ</li>
                <li>ความคมชัดระดับ 300 DPI เหมาะสำหรับเครื่องพิมพ์สติ๊กเกอร์ความร้อน และ Laser Printer</li>
                <li>สแกนง่ายแม้อยู่ในซองพลาสติกถนอมเอกสาร</li>
              </ul>
            </div>

            <div className="p-5 border border-slate-200 bg-slate-50/50 rounded-2xl flex flex-col justify-center items-center text-center space-y-3">
              <QrCode className="w-16 h-16 text-blue-500" />
              <p className="text-xs font-semibold text-slate-700">
                พร้อมพิมพ์สติ๊กเกอร์ประจำเอกสาร: <span className="text-blue-500 font-bold">{selectedDoc ? selectedDoc.docNumber || selectedDoc.title : 'เอกสารทั่วไป'}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Simulator & Test */}
      {activeTab === 'test' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 shadow-sm space-y-6 max-w-5xl mx-auto text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[var(--border-lighter)] pb-4 gap-4">
            <div>
              <h2 className="text-xl font-bold font-noto-serif-thai text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Eye className="w-6 h-6 text-emerald-500" />
                เครื่องจำลองสแกนและถอดรหัส QR Code (Scanner Simulator v3.0)
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
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">⏱️ Real-time Tracking</span>
                    บันทึกพิกัด เวลา และอุปกรณ์ที่ใช้สแกนลงบล็อกเกอร์ระบบ
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">🔒 No Cache Directs</span>
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
                        <p className="text-sm font-bold text-emerald-400 font-noto-serif-thai">กำลังสแกนและแกะรหัส...</p>
                        <p className="text-[10px] text-slate-400">ถอดรหัส Co-Signature SHA-256</p>
                      </div>
                    </div>
                  ) : null}

                  {decodeError ? (
                    <div className="p-4 rounded-2xl bg-rose-50 text-rose-800 border border-rose-100 space-y-2 text-center my-4">
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
                          <img src={DDPM_LOGO_URL} className="w-8 h-8 object-contain" alt="ปภ" />
                          <h4 className="font-bold text-[10px] text-slate-800 dark:text-slate-200">ตรวจสอบความถูกต้องเอกสาร</h4>
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Rayong Disaster EDMS</span>
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
                          <p className="text-[8px] text-slate-400">ระบบบันทึกความสมบูรณ์กลาง ปภ.ระยอง</p>
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
                        <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 text-[9px] p-3 rounded-xl border border-rose-100 dark:border-rose-950/40 leading-relaxed font-semibold">
                          ⚠️ คำเตือนสากล: ไม่พบรหัสลงทะเบียนนี้ในระบบ ปภ.จังหวัดระยอง 
                          หากเป็นเอกสารราชการแผ่นกระดาษที่มี QR Code นี้กำกับอยู่ มีความเสี่ยงสูงที่จะเป็นเอกสารปลอมแปลงหรือข้อมูลไม่ถูกต้อง กรุณาติดต่อกองสารบรรณเพื่อทำการตรวจสอบจริงทันที
                        </div>
                      </div>
                    ) : decodedResult.type === 'url' ? (
                      /* URL Preview layout */
                      <div className="space-y-4 text-left py-4">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950 rounded-full flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
                          <Globe className="w-7 h-7" />
                        </div>
                        <div className="space-y-1 text-center">
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">ระบบพบลิงก์ภายนอก</h4>
                          <p className="text-[9px] text-slate-400">External Web Connection</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl space-y-2">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">เป้าหมายเชื่อมต่อ:</p>
                          <p className="font-mono text-[9px] text-indigo-600 dark:text-indigo-400 break-all leading-snug">{decodedResult.resolvedUrl}</p>
                        </div>
                        <a 
                          href={decodedResult.resolvedUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-xl shadow-md"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>เชื่อมต่อเข้าชมเว็บไซต์ต้นทาง</span>
                        </a>
                      </div>
                    ) : decodedResult.type === 'wifi' ? (
                      /* WiFi Config Layout */
                      <div className="space-y-4 text-left py-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                          <Wifi className="w-7 h-7" />
                        </div>
                        <div className="space-y-1 text-center">
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">เชื่อมต่อ Wi-Fi อัตโนมัติ</h4>
                          <p className="text-[9px] text-slate-400">Wireless Network Config</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl space-y-2.5 text-[9px]">
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
                        <button className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-[10px] font-bold rounded-xl shadow-md">
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
                          <p className="text-[9px] text-slate-400">PromptPay Electronic Payment</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl space-y-2.5 text-[9px]">
                          <div>
                            <span className="text-slate-400 font-semibold block">เบอร์โทรศัพท์/เลขบัตรประชาชน:</span>
                            <span className="text-slate-800 dark:text-slate-200 font-bold font-mono text-[12px]">{decodedResult.promptpay.id}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block">จำนวนเงินโอน:</span>
                            <span className="text-emerald-600 font-bold font-mono text-[14px]">{parseFloat(decodedResult.promptpay.amount || '0').toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                          </div>
                        </div>
                        <p className="text-[8px] text-slate-400 text-center leading-relaxed">
                          🛡️ ตรวจสอบปลายทางของเลขพร้อมเพย์ให้ถูกต้องกับผู้รับเงินก่อนกดยืนยันผ่านแอพธนาคาร
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
                          <p className="text-[9px] text-slate-400">VCard Contact Card</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl space-y-2 text-[9px]">
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
                        <button className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 text-white text-[10px] font-bold rounded-xl shadow-md">
                          <User className="w-3.5 h-3.5" />
                          <span>บันทึกชื่อลงโทรศัพท์</span>
                        </button>
                      </div>
                    ) : (
                      /* General plain text */
                      <div className="space-y-3 text-left py-4">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-600">
                          <FileText className="w-7 h-7" />
                        </div>
                        <div className="space-y-1 text-center">
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">ข้อมูลข้อความทั่วไป</h4>
                          <p className="text-[9px] text-slate-400">Plain Text Payload</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl font-mono text-[10px] break-all leading-normal whitespace-pre-wrap">
                          {decodedResult.payload}
                        </div>
                      </div>
                    )

                  ) : (
                    /* Initial No Result Box */
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 space-y-2">
                      <QrCode className="w-12 h-12 text-slate-300 dark:text-slate-700 animate-pulse" />
                      <p className="font-bold text-xs text-slate-500">รอจำลองถอดรหัส QR</p>
                      <p className="text-[10px]">กรุณากดปุ่ม Sync Data เพื่อโหลดการจำลองสแกนสด</p>
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

    </div>
  );
}
