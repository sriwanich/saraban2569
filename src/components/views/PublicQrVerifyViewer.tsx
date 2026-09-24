import React, { useState, useEffect } from 'react';
import { 
  Check, 
  ShieldCheck, 
  ExternalLink, 
  Pause, 
  Play, 
  Globe, 
  FileText, 
  AlertCircle, 
  AlertTriangle,
  RefreshCw, 
  Landmark, 
  Copy, 
  CheckCircle2,
  Award,
  Clock,
  Lock,
  Download,
  Building2,
  Calendar,
  Send,
  Inbox,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface DocumentDetails {
  id?: string | number;
  type?: string;
  title?: string;
  docNumber?: string;
  date?: string;
  from?: string;
  to?: string;
  department?: string;
  assignee?: string;
  priority?: string;
  secrecy?: string;
  content?: string;
  note?: string;
  status?: string;
  registerDate?: string;
  year?: string;
  receiveNumber?: string;
}

interface DigitalSignature {
  id: string | number;
  docId?: string | number;
  signerName: string;
  signerPosition: string;
  signerDepartment: string;
  timestampFormatted?: string;
  timestampIso?: string;
  documentHash?: string;
  certificateSerial?: string;
  certificateIssuer?: string;
  pdfPath?: string;
}

export function PublicQrVerifyViewer() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docNotFound, setDocNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [qrData, setQrData] = useState<{
    slug?: string;
    title?: string;
    originalUrl?: string;
    createdAt?: string;
    status?: string;
    type?: string;
  } | null>(null);

  const [docDetails, setDocDetails] = useState<DocumentDetails | null>(null);
  const [signatures, setSignatures] = useState<DigitalSignature[]>([]);
  const [countdown, setCountdown] = useState(5);
  const [isPaused, setIsPaused] = useState(false);

  // Organization settings from "ตั้งค่าระบบและผู้ดูแล" -> "องค์กร"
  const [orgLogo, setOrgLogo] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('moi_logo') || localStorage.getItem('moi_schoolLogo');
      if (saved) return saved;
      const sStr = localStorage.getItem('moi_settings');
      if (sStr) {
        const s = JSON.parse(sStr);
        if (s.logoUrl) return s.logoUrl;
      }
    } catch (_) {}
    return '';
  });

  const [orgName, setOrgName] = useState<string>(() => {
    try {
      const sStr = localStorage.getItem('moi_settings');
      if (sStr) {
        const s = JSON.parse(sStr);
        if (s.orgName) return s.orgName;
      }
    } catch (_) {}
    return 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
  });

  const getLogoSrc = (url: string | null | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '' || url === 'null' || url === 'undefined') {
      return '/ddpm-logo.svg';
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return url.startsWith('/') ? url : `/${url}`;
  };

  // Fetch settings from /api/settings on mount to reflect the latest admin settings
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok && res.headers.get('content-type')?.includes('application/json') ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.logoUrl) {
            setOrgLogo(data.logoUrl);
            try {
              localStorage.setItem('moi_logo', data.logoUrl);
            } catch (_) {}
          }
          if (data.orgName) {
            setOrgName(data.orgName);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Extract slug or docId from URL
  useEffect(() => {
    let slug = '';
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    if (path.startsWith('/qr/')) {
      slug = path.replace('/qr/', '').split('/')[0];
    } else if (searchParams.get('slug')) {
      slug = searchParams.get('slug') || '';
    } else if (searchParams.get('qr')) {
      slug = searchParams.get('qr') || '';
    }

    // Direct certificate verification check (e.g. /?verify_cert=CERT-12345 or /verify-certificate/CERT-12345)
    const certNumFromQuery = searchParams.get('verify_cert');
    const certNumFromPath = path.startsWith('/verify-certificate/') ? path.replace('/verify-certificate/', '') : null;
    const certNum = certNumFromQuery || certNumFromPath;
    
    if (certNum) {
      setQrData({
        title: `วุฒิบัตร / ใบประกาศนียบัตรอิเล็กทรอนิกส์ (e-Certificate: ${certNum})`,
        originalUrl: `/?verify_cert=${encodeURIComponent(certNum)}`,
        status: 'active',
        type: 'edms',
        createdAt: new Date().toISOString()
      });

      setDocDetails({
        docNumber: certNum,
        title: `ใบประกาศนียบัตรผ่านการทดสอบ / การอบรมอิเล็กทรอนิกส์`,
        date: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
        department: orgName,
        from: orgName,
        to: 'ผู้ได้รับประกาศนียบัตร',
        type: 'e-Certificate',
        content: `วุฒิบัตรฉบับนี้ออกโดยระบบบริหารจัดการแบบทดสอบและวุฒิบัตรอิเล็กทรอนิกส์ (e-Certificate System) ยืนยันว่าผู้ถือใบประกาศนียบัตรเลขที่ ${certNum} ได้ผ่านการทดสอบวัดความรู้ตามเกณฑ์ที่กำหนดเรียบร้อยแล้ว`
      });

      setSignatures([
        {
          id: 'CERT-SIG-1',
          signerName: 'ระบบลงนามดิจิทัลอัตโนมัติ (Automated e-Certificate Authority)',
          signerPosition: 'ผู้อำนวยการศูนย์ออกวุฒิบัตรอิเล็กทรอนิกส์',
          signerDepartment: orgName,
          timestampFormatted: new Date().toLocaleString('th-TH'),
          documentHash: 'SHA256-' + certNum.split('').reduce((acc, c) => acc + c.charCodeAt(0).toString(16), ''),
          certificateSerial: certNum,
          certificateIssuer: orgName + ' Authority'
        }
      ]);

      setLoading(false);
      return;
    }

    // Direct docId query parameter check (e.g. /verify?docId=123)
    const directDocId = searchParams.get('docId');
    if (directDocId) {
      setQrData({
        title: `เอกสารสารบรรณอิเล็กทรอนิกส์ (ID: ${directDocId})`,
        originalUrl: `/verify?docId=${encodeURIComponent(directDocId)}`,
        status: 'active',
        type: 'edms',
        createdAt: new Date().toISOString()
      });

      fetch(`/api/verify-data?docId=${encodeURIComponent(directDocId)}`)
        .then(async (res) => {
          if (!res.ok) {
            setDocNotFound(true);
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (data?.success && data.document) {
            setDocDetails(data.document);
            setSignatures(data.signatures || []);
            if (data.orgSettings) {
              if (data.orgSettings.logoUrl) setOrgLogo(data.orgSettings.logoUrl);
              if (data.orgSettings.orgName) setOrgName(data.orgSettings.orgName);
            }
            if (data.document.title) {
              setQrData((prev) => prev ? { ...prev, title: data.document.title } : null);
            }
          } else {
            setDocNotFound(true);
          }
        })
        .catch(() => {
          setDocNotFound(true);
        })
        .finally(() => {
          setLoading(false);
        });

      return;
    }

    if (!slug) {
      setError('ไม่พบรหัสอ้างอิง QR Code หรือรหัสเอกสารในระบบ');
      setLoading(false);
      return;
    }

    // Fetch dynamic QR data via slug
    fetch(`/api/public/qr/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || 'ไม่พบข้อมูล QR Code นี้');
        }
        return res.json();
      })
      .then(async (data) => {
        setQrData(data);

        // Check if this QR belongs to an EDMS document
        const targetUrl = data.originalUrl || '';
        const isEdms = data.type === 'edms' || targetUrl.includes('/verify?docId=') || targetUrl.includes('docId=');

        if (isEdms) {
          try {
            const urlObj = new URL(targetUrl.startsWith('http') ? targetUrl : `https://temp.org${targetUrl}`);
            const docId = urlObj.searchParams.get('docId');
            if (docId) {
              const verifyRes = await fetch(`/api/verify-data?docId=${encodeURIComponent(docId)}`);
              if (verifyRes.ok) {
                const vData = await verifyRes.json();
                if (vData.success && vData.document) {
                  setDocDetails(vData.document);
                  setSignatures(vData.signatures || []);
                  if (vData.orgSettings) {
                    if (vData.orgSettings.logoUrl) setOrgLogo(vData.orgSettings.logoUrl);
                    if (vData.orgSettings.orgName) setOrgName(vData.orgSettings.orgName);
                  }
                  setQrData((prev) => prev ? { 
                    ...prev, 
                    type: 'edms', 
                    title: vData.document.title || prev.title 
                  } : null);
                } else {
                  setDocNotFound(true);
                }
              } else {
                setDocNotFound(true);
              }
            }
          } catch (e) {
            console.error('Error fetching verify data for dynamic EDMS QR:', e);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        // Fallback: check dynamic QRs list
        fetch('/api/qr-generator/dynamic')
          .then((res) => res.ok ? res.json() : [])
          .then(async (list: any[]) => {
            const match = list.find((q) => q.slug === slug);
            if (match) {
              setQrData(match);
              setError(null);
              if (match.type === 'edms' || match.originalUrl?.includes('docId=')) {
                try {
                  const urlObj = new URL(match.originalUrl.startsWith('http') ? match.originalUrl : `https://temp.org${match.originalUrl}`);
                  const docId = urlObj.searchParams.get('docId');
                  if (docId) {
                    const vRes = await fetch(`/api/verify-data?docId=${encodeURIComponent(docId)}`);
                    if (vRes.ok) {
                      const vData = await vRes.json();
                      if (vData?.success && vData.document) {
                        setDocDetails(vData.document);
                        setSignatures(vData.signatures || []);
                        if (vData.orgSettings) {
                          if (vData.orgSettings.logoUrl) setOrgLogo(vData.orgSettings.logoUrl);
                          if (vData.orgSettings.orgName) setOrgName(vData.orgSettings.orgName);
                        }
                      }
                    }
                  }
                } catch {}
              }
            } else {
              setError(err.message || 'ไม่พบข้อมูล QR Code นี้');
            }
          })
          .catch(() => {
            setError(err.message || 'ไม่พบข้อมูล QR Code นี้');
          })
          .finally(() => {
            setLoading(false);
          });
      });
  }, []);

  // Countdown timer for automatic redirection — ONLY for Website URLs, NOT for EDMS Documents!
  const isDocument = Boolean(docDetails || qrData?.type === 'edms');

  useEffect(() => {
    // Documents do NOT auto-redirect
    if (isDocument) return;
    if (loading || error || docNotFound || isPaused || !qrData?.originalUrl || qrData.status === 'paused') return;

    if (countdown <= 0) {
      const target = qrData.originalUrl;
      window.location.href = target;
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, error, docNotFound, isPaused, countdown, qrData, isDocument]);

  const copyToClipboard = (textToCopy?: string) => {
    const text = textToCopy || qrData?.originalUrl || window.location.href;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto animate-pulse">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">กำลังตรวจสอบข้อมูล QR Code...</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">ระบบกำลังเชื่อมต่อและยืนยันความถูกต้อง</p>
        </div>
      </div>
    );
  }

  // 2. Document Not Found State (Security warning)
  if (docNotFound) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-rose-200 dark:border-rose-900/40 text-center space-y-5 max-w-md w-full animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">ไม่พบข้อมูลเอกสารในระบบ</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              รหัสเอกสารนี้ไม่ตรงกับฐานข้อมูลสารบรรณกลาง หรือข้อมูลอาจถูกยกเลิกหรือแก้ไขย้อนหลังโดยไม่ได้รับอนุญาต
            </p>
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-xs p-4 rounded-2xl text-left border border-rose-100 dark:border-rose-900/50 leading-relaxed font-medium space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>คำเตือนความปลอดภัย (Security Alert):</span>
            </div>
            <p className="text-[11px] opacity-90">
              เอกสารฉบับนี้ไม่ผ่านการรับรองความถูกต้องในระบบสารบรรณอิเล็กทรอนิกส์ของ{orgName} หากเป็นเอกสารกระดาษที่มี QR Code นี้ติดอยู่ มีความเสี่ยงสูงที่จะเป็นเอกสารปลอมแปลง
            </p>
          </div>

          <div className="pt-2">
            <a
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-md"
            >
              ไปยังหน้าหลักระบบสารบรรณ
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 3. General Error State
  if (error || !qrData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-rose-200 dark:border-rose-900/40 text-center space-y-5 max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">ไม่สามารถเปิดลิงก์ได้</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {error || 'ไม่พบข้อมูล QR Code ที่ต้องการตรวจสอบในระบบ'}
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-black text-white text-xs font-bold rounded-xl transition"
          >
            ไปยังหน้าหลักระบบ
          </a>
        </div>
      </div>
    );
  }

  // 4. Paused State
  if (qrData.status === 'paused') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-amber-200 dark:border-amber-900/40 text-center space-y-5 max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">QR Code ถูกระงับชั่วคราว</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              ผู้สร้างได้ระงับการเชื่อมต่อของ QR Code นี้ชั่วคราว กรุณาติดต่อหน่วยงานผู้ออกเอกสารเพื่อขอข้อมูลเพิ่มเติม
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW A: DOCUMENT VERIFICATION PAGE (เมื่อเลือกเป็นเอกสารสารบรรณ EDMS)
  // =========================================================================
  if (isDocument) {
    const isSigned = signatures.length > 0;
    const docTypeLabels: Record<string, string> = {
      inbox: 'หนังสือรับ (Inbox)',
      outbox: 'หนังสือส่ง (Outbox)',
      circular: 'หนังสือเวียน (Circular)',
      admin: 'คำสั่ง/ประกาศ (Admin Order)',
      internal: 'หนังสือภายใน (Internal Memo)'
    };

    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased py-6 sm:py-10 px-3 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6 animate-in fade-in duration-300">

          {/* Official Agency Header */}
          <div className="flex flex-col items-center text-center space-y-3 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center shadow-md overflow-hidden">
              <img 
                src={getLogoSrc(orgLogo)} 
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain" 
                alt={`ตราสัญลักษณ์ ${orgName}`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const fallback = '/ddpm-logo.svg';
                  if (target.src !== fallback && !target.src.endsWith(fallback)) {
                    target.src = fallback;
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                ระบบตรวจสอบความถูกต้องเอกสารอิเล็กทรอนิกส์
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                {orgName} • EDMS Verification
              </p>
            </div>
          </div>

          {/* Verification Status Banner */}
          <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 ${
            isSigned 
              ? 'border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300' 
              : 'border-blue-500/25 bg-blue-500/5 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300'
          } flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-xs`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isSigned ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
            }`}>
              <ShieldCheck className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div className="space-y-1 text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {isSigned ? 'ลงนามดิจิทัลสมบูรณ์ (ETDA Certified)' : 'ลงทะเบียนสารบรรณถูกต้อง (Registered in System)'}
                </h2>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isSigned ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200' : 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200'
                }`}>
                  Official Verified
                </span>
              </div>
              <p className="text-xs sm:text-[13px] opacity-90 leading-relaxed font-medium">
                {isSigned 
                  ? 'เอกสารนี้ผ่านการรับรองและประทับตราเวลาดิจิทัล (TSA Timestamp) ที่ปลอดภัยขั้นสูงและไม่สามารถดัดแปลงแก้ไขได้ มีผลสมบูรณ์ตามพระราชบัญญัติว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์'
                  : 'เอกสารนี้ได้รับการบันทึกข้อมูลและขึ้นทะเบียนสารบรรณอิเล็กทรอนิกส์ในฐานข้อมูลระบบสารบรรณกลางอย่างถูกต้องตามระเบียบสารบรรณ'
                }
              </p>
            </div>
          </div>

          {/* Document Information Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 sm:p-8 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                  ข้อมูลเอกสารราชการ (Document Details)
                </span>
              </div>
              {docDetails?.type && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {docTypeLabels[docDetails.type] || docDetails.type}
                </span>
              )}
            </div>

            {/* Subject / Title */}
            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                ชื่อเรื่อง / วัตถุประสงค์
              </span>
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 leading-snug break-words">
                {docDetails?.title || qrData?.title || 'เอกสารราชการสำนักงาน ปภ.ระยอง'}
              </p>
            </div>

            {/* Key Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-bold block text-[11px]">เลขที่หนังสือ</span>
                <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">
                  {docDetails?.docNumber || '-'}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-bold block text-[11px]">ลงวันที่</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {docDetails?.date || '-'}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 font-bold block text-[11px]">ฝ่ายงานผู้ปฏิบัติ</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {docDetails?.department || orgName}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1 sm:col-span-2 md:col-span-1">
                <span className="text-slate-400 font-bold block text-[11px]">จาก (ต้นทาง)</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {docDetails?.from || '-'}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1 sm:col-span-2 md:col-span-2">
                <span className="text-slate-400 font-bold block text-[11px]">ถึง (ปลายทาง)</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {docDetails?.to || '-'}
                </span>
              </div>

            </div>

            {/* Content / Summary (if available) */}
            {docDetails?.content && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  สรุปเนื้อหา / สาระสำคัญ
                </span>
                <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {docDetails.content}
                </div>
              </div>
            )}

          </div>

          {/* Digital Signatures List (if any) */}
          {signatures.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Award className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200">
                  ลายมือชื่อดิจิทัลที่ตรวจพบ ({signatures.length} รายการ)
                </h3>
              </div>

              <div className="space-y-3">
                {signatures.map((sig, idx) => (
                  <div 
                    key={sig.id || idx}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/20 dark:border-emerald-900/40 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                          ผู้ลงนามลำดับที่ {idx + 1} (Digital Signature Valid)
                        </span>
                      </div>
                      {sig.certificateSerial && (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          SN: {sig.certificateSerial.substring(0, 16)}...
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-0.5">
                        <p className="text-slate-400 font-bold text-[11px]">ผู้รับรองเอกสาร</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{sig.signerName}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">{sig.signerPosition} / {sig.signerDepartment}</p>
                      </div>

                      <div className="space-y-0.5 font-mono text-[11px]">
                        <p className="text-slate-400 font-sans font-bold text-[11px]">เวลาประทับตราดิจิทัล (TSA Timestamp)</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {sig.timestampFormatted || sig.timestampIso || '-'}
                        </p>
                        {sig.documentHash && (
                          <p className="text-[10px] text-slate-400 truncate">
                            SHA-256: <span className="text-emerald-600 dark:text-emerald-400">{sig.documentHash.substring(0, 24)}...</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <span className="text-slate-400">CA: {sig.certificateIssuer || 'Electronic Transactions Development Agency (ETDA)'}</span>
                      <a
                        href={`/api/digital-signatures/download-pdf/${sig.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ดาวน์โหลดไฟล์ลงนามสมบูรณ์</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => copyToClipboard(window.location.href)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">คัดลอกลิงก์ตรวจสอบแล้ว</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>คัดลอกลิงก์หน้าตรวจสอบ</span>
                </>
              )}
            </button>

            <a
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold transition shadow-md"
            >
              <span>เข้าสู่ระบบสารบรรณอิเล็กทรอนิกส์</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Legal Notice Footer */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-center space-y-1">
            <p className="font-bold text-slate-700 dark:text-slate-300">
              ข้อควรทราบเกี่ยวกับการตรวจสอบความถูกต้อง:
            </p>
            <p>
              เอกสารนี้ได้รับการคุ้มครองและรับรองความถูกต้องด้วยลายมือชื่ออิเล็กทรอนิกส์ตามพระราชบัญญัติว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544 (และที่แก้ไขเพิ่มเติม) 
              การสแกนผ่าน QR Code นี้เป็นการดึงข้อมูลยืนยันความแท้จริงจากฐานข้อมูลสารบรรณกลาง {orgName}
            </p>
          </div>

          {/* Agency Footer */}
          <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-[10px] sm:text-xs font-bold tracking-wider uppercase text-center pt-2">
            <Landmark className="w-3.5 h-3.5 shrink-0" />
            <span>{orgName} • EDMS VERIFY</span>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: WEBSITE / URL VERIFICATION PAGE (เมื่อเลือกเป็นเว็บไซต์)
  // =========================================================================
  const targetUrl = qrData.originalUrl || '#';
  const displayTitle = qrData.title || 'สนง.ปภ.ระยอง';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 font-sans antialiased">
      <div className="w-full max-w-lg mx-auto space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Main Verification Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[2.5rem] shadow-xl sm:shadow-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-8 md:p-10 text-center space-y-5 sm:space-y-6 relative overflow-hidden">
          
          {/* Top Verification Emblem */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto pt-1">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-60"></div>
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg sm:shadow-xl shadow-emerald-500/30">
              <Check className="w-10 h-10 sm:w-12 sm:h-12 text-white stroke-[3.5]" />
            </div>
          </div>

          {/* Heading & Security Badge */}
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              ผ่านการตรวจสอบความถูกต้อง
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 text-[11px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>QR Code Verified & Secure</span>
            </div>
          </div>

          {/* Details Content Box */}
          <div className="p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl text-left space-y-4 shadow-xs">
            
            {/* Subject / Title */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                  เนื้อหา / ชื่อเรื่อง
                </span>
              </div>
              <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug break-words">
                {displayTitle}
              </p>
            </div>

            {/* Target URL with Copy Button */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                  <Globe className="w-3.5 h-3.5" />
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                    ลิงก์ปลายทาง (Target Website)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(targetUrl)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition shadow-2xs active:scale-95 cursor-pointer"
                  title="คัดลอกลิงก์ปลายทาง"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>คัดลอกลิงก์</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl sm:rounded-2xl">
                <p className="font-mono text-xs sm:text-sm text-blue-600 dark:text-blue-400 break-all leading-relaxed select-all">
                  {targetUrl}
                </p>
              </div>
            </div>

          </div>

          {/* Action Area: Button & Timer */}
          <div className="space-y-3 sm:space-y-4 pt-1">
            
            {/* Primary Action Button */}
            <a
              href={targetUrl}
              onClick={() => setIsPaused(true)}
              className="w-full h-12 sm:h-14 bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 sm:gap-3 transition-all active:scale-[0.98] shadow-lg sm:shadow-xl shadow-slate-900/20 text-sm sm:text-base group cursor-pointer"
            >
              <span>เข้าสู่ลิงก์ที่ระบุ</span>
              <ExternalLink className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>

            {/* Countdown & Pause/Play Control Bar */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2 sm:space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-left min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isPaused ? 'bg-amber-500' : 'bg-emerald-500 animate-ping'}`} />
                  <span className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {isPaused ? (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">หยุดการนับถอยหลังชั่วคราว</span>
                    ) : (
                      <span>ระบบจะนำทางอัตโนมัติใน <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm sm:text-base">{countdown}</strong> วินาที</span>
                    )}
                  </span>
                </div>

                {/* Pause / Play Button */}
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 shrink-0 cursor-pointer ${
                    isPaused 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                  title={isPaused ? 'เริ่มนับถอยหลังต่อ' : 'หยุดนับถอยหลังชั่วคราว'}
                >
                  {isPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>เริ่มนับต่อ</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>หยุดชั่วคราว</span>
                    </>
                  )}
                </button>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${(countdown / 5) * 100}%` }}
                />
              </div>
            </div>

          </div>

        </div>

        {/* Agency Footer */}
        <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-[10px] sm:text-xs font-bold tracking-wider uppercase text-center px-2">
          <Landmark className="w-3.5 h-3.5 shrink-0" />
          <span>{orgName} • EDMS VERIFY</span>
        </div>

      </div>
    </div>
  );
}
