import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { 
  QrCode, Download, Copy, Printer, Check, RefreshCw, FileText, Globe, 
  User, Wifi, CreditCard, Sparkles, ShieldCheck, Palette, Image as ImageIcon, 
  Layers, CheckCircle2, AlertCircle, Building2, Sliders, Eye, Share2, 
  FolderOpen, Bookmark, Save, Trash2, ArrowRight, ExternalLink, Hash, Calendar, Send
} from 'lucide-react';
import { DocumentItem } from '../../types';

interface QrGeneratorViewProps {
  user?: any;
  documents?: DocumentItem[];
  initialDocId?: string;
  onViewDoc?: (doc: DocumentItem) => void;
}

export default function QrGeneratorView({ user, documents = [], initialDocId, onViewDoc }: QrGeneratorViewProps) {
  // Navigation tab inside QR Studio
  const [activeTab, setActiveTab] = useState<'create' | 'sticker' | 'history' | 'test'>('create');

  // Generator Mode
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
  const [exportSize, setExportSize] = useState(1024);

  // Logo Overlay State
  const [logoType, setLogoType] = useState<'none' | 'garuda' | 'province' | 'custom'>('garuda');
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

  // Saved QR History
  const [history, setHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('edms_qr_history');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

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
  const GARUDA_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Seal_of_the_Ministry_of_Interior_of_Thailand.svg';

  // Preset Color Palettes
  const presetPalettes = [
    { name: 'สารบรรณกรมท่า', fg: '#0f172a', bg: '#ffffff', frame: '#0f172a' },
    { name: 'ตราครุฑทองคำ', fg: '#92400e', bg: '#fffbe8', frame: '#b45309' },
    { name: 'ด่วนที่สุด', fg: '#991b1b', bg: '#fef2f2', frame: '#dc2626' },
    { name: 'เขียวมรกต', fg: '#064e3b', bg: '#ecfdf5', frame: '#047857' },
    { name: 'นครระยอง', fg: '#075985', bg: '#f0f9ff', frame: '#0284c7' },
    { name: 'คลาสสิกเข้ม', fg: '#000000', bg: '#ffffff', frame: '#18181b' },
  ];

  // Calculate payload based on current settings
  const getComputedPayload = (): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://edms.go.th';
    
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
        return `BEGIN:VCARD
VERSION:3.0
N:${vcard.name}
FN:${vcard.name}
TITLE:${vcard.title}
ORG:${vcard.org}
TEL;TYPE=WORK,VOICE:${vcard.phone}
EMAIL:${vcard.email}
ADR;TYPE=WORK:;;${vcard.address}
URL:${vcard.website}
END:VCARD`;
      case 'wifi':
        return `WIFI:S:${wifi.ssid};T:${wifi.encryption};P:${wifi.password};;`;
      case 'promptpay':
        const cleanId = promptPay.id.replace(/[^0-9]/g, '');
        return `PROMPTPAY:${cleanId}:${promptPay.amount || '0'}`;
      default:
        return origin;
    }
  };

  // Render QR Code onto Canvas with Frame and Center Logo
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

      // 1. Generate base QR Code on temporary canvas
      const tempCanvas = document.createElement('canvas');
      const actualBg = transparentBg ? '#ffffff' : bgColor;

      await QRCode.toCanvas(tempCanvas, payload, {
        width: size,
        margin: qrMargin,
        errorCorrectionLevel: errorCorrection,
        color: {
          dark: fgColor,
          light: actualBg
        }
      });

      // 2. Set dimensions of main canvas (including frame if enabled)
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

      // Clear main canvas
      ctx.clearRect(0, 0, finalWidth, finalHeight);

      // Draw background
      if (!transparentBg) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, finalWidth, finalHeight);
      }

      // Draw Card Border if Frame Card
      if (frameType === 'card') {
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 6;
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(10, 10, finalWidth - 20, finalHeight - 20, 24);
        ctx.fill();
        ctx.stroke();
      }

      // Draw Base QR Image
      ctx.drawImage(tempCanvas, qrOffsetX, qrOffsetY, size, size);

      // 3. Draw Center Logo Overlay if enabled
      let logoSrc = '';
      if (logoType === 'garuda') logoSrc = GARUDA_LOGO_URL;
      else if (logoType === 'custom') logoSrc = customLogoUrl;

      if (logoSrc) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = logoSrc;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = resolve; // Graceful fallback
          });

          if (img.complete && img.naturalWidth > 0) {
            const logoDim = size * logoScale;
            const logoX = qrOffsetX + (size - logoDim) / 2;
            const logoY = qrOffsetY + (size - logoDim) / 2;

            // Draw white background badge behind logo for scannability
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(logoX + logoDim / 2, logoY + logoDim / 2, (logoDim / 2) + 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = frameColor || fgColor;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Draw logo image
            ctx.drawImage(img, logoX, logoY, logoDim, logoDim);
          }
        } catch (logoErr) {
          console.error("Logo overlay error:", logoErr);
        }
      }

      // 4. Draw Frame Banner Texts
      if (frameType !== 'none') {
        ctx.fillStyle = frameColor;
        ctx.font = 'bold 22px Prompt, Sarabun, sans-serif';
        ctx.textAlign = 'center';

        if (frameType === 'top-bottom') {
          // Top Banner Bar
          ctx.fillRect(0, 0, finalWidth, 48);
          ctx.fillStyle = frameTextColor;
          ctx.fillText(frameText, finalWidth / 2, 32);

          // Bottom Bar
          ctx.fillStyle = frameColor;
          ctx.fillRect(0, finalHeight - 50, finalWidth, 50);
          ctx.fillStyle = frameTextColor;
          ctx.font = 'bold 18px Sarabun, sans-serif';
          ctx.fillText('ระบบสารบรรณอิเล็กทรอนิกส์ EDMS', finalWidth / 2, finalHeight - 18);
        } else if (frameType === 'card') {
          // Card Header
          ctx.fillStyle = frameColor;
          ctx.font = 'bold 24px Prompt, Sarabun, sans-serif';
          ctx.fillText(frameText, finalWidth / 2, 45);

          // Card Footer
          ctx.font = '16px Sarabun, sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.fillText('สแกนด้วยกล้องมือถือเพื่อตรวจสอบข้อมูลจริง', finalWidth / 2, finalHeight - 25);
        } else if (frameType === 'badge') {
          // Bottom Badge Bar
          ctx.fillStyle = frameColor;
          ctx.roundRect(20, finalHeight - 65, finalWidth - 40, 50, 12);
          ctx.fill();
          ctx.fillStyle = frameTextColor;
          ctx.font = 'bold 20px Prompt, Sarabun, sans-serif';
          ctx.fillText(frameText, finalWidth / 2, finalHeight - 32);
        }
      }

      // 5. Generate final base64 Data URL
      const dataUrl = targetCanvas.toDataURL('image/png', 1.0);
      setGeneratedDataUrl(dataUrl);

    } catch (err) {
      console.error("QR Generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Re-render when options change
  useEffect(() => {
    renderQrCanvas();
  }, [
    qrType, selectedDocId, urlInput, textInput, vcard, wifi, promptPay,
    fgColor, bgColor, transparentBg, errorCorrection, qrMargin,
    logoType, customLogoUrl, logoScale, frameType, frameText, frameColor, frameTextColor
  ]);

  // Handle Logo File Upload
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

  // Export PNG Image
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

  // Export SVG Vector
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
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถดาวน์โหลด SVG ได้');
    }
  };

  // Export Official Print Sticker / Slip PDF
  const downloadOfficialStickerPDF = async () => {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size in points
      const { width, height } = page.getSize();

      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Add Official Frame Header
      page.drawRectangle({
        x: 40, y: height - 260, width: width - 80, height: 220,
        borderColor: rgb(0.06, 0.09, 0.16), borderWidth: 2,
        color: rgb(0.98, 0.99, 1.0)
      });

      // Embed QR Image
      if (generatedDataUrl) {
        const qrImgBytes = await fetch(generatedDataUrl).then(res => res.arrayBuffer());
        const qrPdfImage = await pdfDoc.embedPng(qrImgBytes);
        page.drawImage(qrPdfImage, {
          x: 60, y: height - 240, width: 180, height: 180
        });
      }

      // Header Text Info
      const docTitle = selectedDoc ? selectedDoc.title : (qrType === 'url' ? urlInput : 'เอกสารสารบรรณอิเล็กทรอนิกส์');
      const docNo = selectedDoc ? (selectedDoc.docNumber || selectedDoc.receiveNumber || 'ไม่ระบุ') : 'EDMS-QR-STAMP';
      const docDate = selectedDoc ? selectedDoc.date : new Date().toLocaleDateString('th-TH');

      page.drawText('OFFICIAL DOCUMENT VERIFICATION STICKER', {
        x: 260, y: height - 70, size: 12, font: fontBold, color: rgb(0.06, 0.4, 0.8)
      });

      page.drawText(`Document No: ${docNo}`, {
        x: 260, y: height - 95, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1)
      });

      page.drawText(`Date: ${docDate}`, {
        x: 260, y: height - 118, size: 10, font: fontRegular, color: rgb(0.3, 0.3, 0.3)
      });

      page.drawText(`Subject: ${docTitle.substring(0, 45)}${docTitle.length > 45 ? '...' : ''}`, {
        x: 260, y: height - 142, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1)
      });

      page.drawText('Agency: Disaster Prevention and Mitigation Office, Rayong', {
        x: 260, y: height - 165, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4)
      });

      page.drawText('Scan QR Code with mobile camera to verify authenticity in EDMS database.', {
        x: 260, y: height - 195, size: 8, font: fontRegular, color: rgb(0.2, 0.6, 0.3)
      });

      // Print grid stickers at bottom
      page.drawText('Document Print Stickers (4x4 cm Labels)', {
        x: 40, y: height - 290, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2)
      });

      if (generatedDataUrl) {
        const qrImgBytes = await fetch(generatedDataUrl).then(res => res.arrayBuffer());
        const qrPdfImage = await pdfDoc.embedPng(qrImgBytes);

        // Draw 6 sticker labels in a 2x3 grid
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 2; col++) {
            const sx = 60 + col * 250;
            const sy = height - 440 - row * 120;

            page.drawRectangle({
              x: sx, y: sy, width: 220, height: 100,
              borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1,
              color: rgb(1, 1, 1)
            });

            page.drawImage(qrPdfImage, {
              x: sx + 10, y: sy + 10, width: 80, height: 80
            });

            page.drawText(`EDMS VERIFY`, { x: sx + 100, y: sy + 75, size: 9, font: fontBold, color: rgb(0.06, 0.4, 0.8) });
            page.drawText(`No: ${docNo.substring(0, 18)}`, { x: sx + 100, y: sy + 58, size: 8, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
            page.drawText(`Date: ${docDate}`, { x: sx + 100, y: sy + 42, size: 8, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
            page.drawText('Scan to verify', { x: sx + 100, y: sy + 22, size: 7, font: fontRegular, color: rgb(0.1, 0.6, 0.2) });
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `EDMS-QR-Sticker-${docNo.replace(/\//g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      saveToHistory('PDF Sticker');
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
    }
  };

  // Copy Image to Clipboard
  const copyImageToClipboard = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopiedSuccess(true);
          setTimeout(() => setCopiedSuccess(false), 2500);
        }
      });
    } catch (err) {
      console.error(err);
      // Fallback: copy payload URL text
      await navigator.clipboard.writeText(rawQrPayload);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    }
  };

  // Directly stamp QR code into EDMS document DB
  const handleStampToDocument = async () => {
    if (!selectedDocId) {
      alert('กรุณาเลือกเอกสารสารบรรณก่อนทำการประทับ');
      return;
    }
    setIsSavingToDoc(true);
    try {
      const res = await fetch(`/api/documents/${selectedDocId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrCodeDataUrl: generatedDataUrl
        })
      });

      if (res.ok) {
        setStampSuccess(true);
        setTimeout(() => setStampSuccess(false), 3000);
        saveToHistory('Attached to Doc');
      } else {
        alert('ไม่สามารถประทับ QR Code ลงในเอกสารได้');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSavingToDoc(false);
    }
  };

  // Save to Local History
  const saveToHistory = (actionType: string) => {
    const newItem = {
      id: Date.now().toString(),
      type: qrType,
      title: selectedDoc ? selectedDoc.title : (qrType === 'url' ? urlInput : qrType.toUpperCase()),
      payload: rawQrPayload,
      dataUrl: generatedDataUrl,
      timestamp: new Date().toLocaleString('th-TH'),
      action: actionType
    };

    const updated = [newItem, ...history.slice(0, 19)];
    setHistory(updated);
    localStorage.setItem('edms_qr_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    if (confirm('คุณต้องการลบประวัติการสร้าง QR Code ทั้งหมดใช่หรือไม่?')) {
      setHistory([]);
      localStorage.removeItem('edms_qr_history');
    }
  };

  // Direct Print Window
  const handlePrintQR = () => {
    if (!generatedDataUrl) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>พิมพ์ QR Code - EDMS</title>
            <style>
              body { font-family: 'Sarabun', sans-serif; text-align: center; padding: 40px; background: #ffffff; }
              .card { border: 2px solid #0f172a; padding: 30px; display: inline-block; border-radius: 16px; background: #ffffff; }
              img { max-width: 350px; height: auto; }
              h2 { margin-top: 15px; color: #0f172a; font-size: 20px; }
              p { color: #64748b; font-size: 14px; margin-top: 5px; }
            </style>
          </head>
          <body>
            <div class="card">
              <img src="${generatedDataUrl}" />
              <h2>${selectedDoc ? selectedDoc.title : 'QR Code สารบรรณอิเล็กทรอนิกส์'}</h2>
              <p>สแกนเพื่อตรวจสอบความถูกต้องและอ่านรายละเอียดฉบับจริง</p>
            </div>
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Filtered Documents for Selector
  const filteredDocs = documents.filter(d => 
    !docSearchQuery || 
    d.title.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
    (d.docNumber && d.docNumber.toLowerCase().includes(docSearchQuery.toLowerCase())) ||
    (d.receiveNumber && d.receiveNumber.toLowerCase().includes(docSearchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] overflow-y-auto font-sarabun p-4 lg:p-6 space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden border border-blue-500/20">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <QrCode className="w-96 h-96 text-white" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-blue-300 border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>EDMS QR Studio Studio v2.5</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold font-noto-serif-thai tracking-wide flex items-center gap-3">
              <QrCode className="w-8 h-8 text-blue-400 shrink-0" />
              เครื่องมือสร้าง QR Code สารบรรณอิเล็กทรอนิกส์
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              สร้าง QR Code ตรวจสอบความถูกต้องของหนังสือราชการ, พิมพ์สติ๊กเกอร์ติดเอกสาร, นามบัตรดิจิทัล, Wi-Fi และลิงก์สารบรรณครบวงจร พร้อมระบบประทับตราดิจิทัล 100%
            </p>
          </div>

          {/* Top Tabs */}
          <div className="flex bg-slate-800/80 p-1.5 rounded-xl border border-slate-700 shrink-0 self-start md:self-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'create' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>ออกแบบ QR Code</span>
            </button>
            <button
              onClick={() => setActiveTab('sticker')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'sticker' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>สติ๊กเกอร์สารบรรณ (PDF)</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>ประวัติ ({history.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'test' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>ทดสอบสแกน</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Working Area */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Controls Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Category / Payload Type Selector */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] font-noto-serif-thai flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-500" />
                1. เลือกประเภทข้อมูล QR Code
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'edms', label: 'เอกสารสารบรรณ EDMS', icon: FileText, color: 'text-blue-500' },
                  { id: 'url', label: 'เว็บไซต์ / ลิงก์ URL', icon: Globe, color: 'text-emerald-500' },
                  { id: 'text', label: 'ข้อความ / หนังสือ', icon: FileText, color: 'text-amber-500' },
                  { id: 'vcard', label: 'นามบัตรบุคลากร', icon: User, color: 'text-purple-500' },
                  { id: 'wifi', label: 'Wi-Fi ผู้รับบริการ', icon: Wifi, color: 'text-cyan-500' },
                  { id: 'promptpay', label: 'พร้อมเพย์ / ค่าธรรมเนียม', icon: CreditCard, color: 'text-pink-500' },
                ].map((type) => {
                  const IconComponent = type.icon;
                  const isSelected = qrType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setQrType(type.id as any)}
                      className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-xs font-medium transition-all gap-2 ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                          : 'border-[var(--border-light)] bg-[var(--bg-elevated)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <IconComponent className={`w-5 h-5 ${isSelected ? 'text-blue-500' : type.color}`} />
                      <span className="text-center">{type.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Payload Form Fields depending on QR Type */}
              <div className="pt-3 border-t border-[var(--border-lighter)] space-y-3">
                {qrType === 'edms' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-[var(--text-secondary)]">
                      เลือกหนังสือราชการจากฐานข้อมูล EDMS :
                    </label>
                    <input
                      type="text"
                      placeholder="ค้นหาตามเรื่อง หรือ เลขที่หนังสือ..."
                      value={docSearchQuery}
                      onChange={(e) => setDocSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                    />

                    <select
                      value={selectedDocId}
                      onChange={(e) => setSelectedDocId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="">-- กรุณาเลือกเอกสาร --</option>
                      {filteredDocs.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          [{doc.type === 'inbox' ? 'หนังสือรับ' : doc.type === 'outbox' ? 'หนังสือส่ง' : 'เอกสารธุรการ'}] {doc.docNumber || doc.receiveNumber || 'ไม่มีเลขที่'} - {doc.title}
                        </option>
                      ))}
                    </select>

                    {selectedDoc ? (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-1.5 text-xs text-[var(--text-primary)]">
                        <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                          <span>{selectedDoc.title}</span>
                          <span className="px-2 py-0.5 bg-blue-500 text-white rounded text-[10px]">EDMS Verified</span>
                        </div>
                        <div className="text-[var(--text-secondary)] flex items-center gap-4">
                          <span>เลขที่: {selectedDoc.docNumber || selectedDoc.receiveNumber || 'N/A'}</span>
                          <span>วันที่: {selectedDoc.date}</span>
                          <span>หน่วยงาน: {selectedDoc.department || 'ปภ.ระยอง'}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[var(--text-muted)] italic">
                        * เมื่อเลือกเอกสารแล้ว ระบบจะสร้าง URL ตรวจสอบความถูกต้องประจำฉบับให้อัตโนมัติ
                      </p>
                    )}
                  </div>
                )}

                {qrType === 'url' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[var(--text-secondary)]">ระบุ URL เว็บไซต์ / ลิงก์เอกสาร :</label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.go.th"
                        className="w-full pl-9 pr-3 py-2 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {qrType === 'text' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[var(--text-secondary)]">ข้อความหนังสือ / ประกาศ :</label>
                    <textarea
                      rows={3}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {qrType === 'vcard' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <input type="text" value={vcard.name} onChange={(e) => setVcard({ ...vcard, name: e.target.value })} placeholder="ชื่อ-นามสกุล" className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)]" />
                    <input type="text" value={vcard.title} onChange={(e) => setVcard({ ...vcard, title: e.target.value })} placeholder="ตำแหน่ง" className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)]" />
                    <input type="text" value={vcard.phone} onChange={(e) => setVcard({ ...vcard, phone: e.target.value })} placeholder="เบอร์โทรศัพท์" className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)]" />
                    <input type="email" value={vcard.email} onChange={(e) => setVcard({ ...vcard, email: e.target.value })} placeholder="อีเมล" className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)]" />
                    <input type="text" value={vcard.org} onChange={(e) => setVcard({ ...vcard, org: e.target.value })} placeholder="หน่วยงาน" className="sm:col-span-2 px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)]" />
                  </div>
                )}

                {qrType === 'wifi' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <input type="text" value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} placeholder="ชื่อ Wi-Fi (SSID)" className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)]" />
                    <input type="password" value={wifi.password} onChange={(e) => setWifi({ ...wifi, password: e.target.value })} placeholder="รหัสผ่าน Wi-Fi" className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)]" />
                    <select value={wifi.encryption} onChange={(e) => setWifi({ ...wifi, encryption: e.target.value as any })} className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)]">
                      <option value="WPA">WPA/WPA2/WPA3</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">ไม่มีรหัสผ่าน (Open)</option>
                    </select>
                  </div>
                )}

                {qrType === 'promptpay' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <input type="text" value={promptPay.id} onChange={(e) => setPromptPay({ ...promptPay, id: e.target.value })} placeholder="เบอร์โทร / เลขผู้เสียภาษี" className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)]" />
                    <input type="text" value={promptPay.amount} onChange={(e) => setPromptPay({ ...promptPay, amount: e.target.value })} placeholder="จำนวนเงิน (บาท)" className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-lg text-[var(--text-primary)]" />
                  </div>
                )}
              </div>
            </div>

            {/* 2. Style & Color Customization Panel */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] font-noto-serif-thai flex items-center gap-2">
                <Palette className="w-5 h-5 text-amber-500" />
                2. ปรับแต่งโทนสี & รูปแบบ (Themes & Colors)
              </h3>

              {/* Predefined Palettes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--text-secondary)]">โทนสีมาตรฐานสารบรรณ :</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {presetPalettes.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => {
                        setFgColor(p.fg);
                        setBgColor(p.bg);
                        setFrameColor(p.frame);
                        setTransparentBg(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-lg border border-[var(--border-light)] hover:border-blue-500 text-xs text-[var(--text-primary)] bg-[var(--bg-elevated)] transition-colors"
                    >
                      <span className="w-4 h-4 rounded-full border shadow-sm shrink-0" style={{ backgroundColor: p.fg }}></span>
                      <span className="truncate text-[11px]">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Hex Color Pickers */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)]">สี QR Code (Foreground):</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-8 h-8 rounded border cursor-pointer" />
                    <span className="text-xs font-mono uppercase text-[var(--text-primary)]">{fgColor}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)]">สีพื้นหลัง (Background):</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={bgColor} disabled={transparentBg} onChange={(e) => setBgColor(e.target.value)} className="w-8 h-8 rounded border cursor-pointer disabled:opacity-40" />
                    <span className="text-xs font-mono uppercase text-[var(--text-primary)]">{transparentBg ? 'โปร่งใส' : bgColor}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="transBg"
                    checked={transparentBg}
                    onChange={(e) => setTransparentBg(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="transBg" className="text-xs font-medium text-[var(--text-primary)] cursor-pointer">
                    พื้นหลังโปร่งใส (PNG)
                  </label>
                </div>
              </div>
            </div>

            {/* 3. Logo Overlay & Frame Settings */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] font-noto-serif-thai flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-500" />
                3. โลโก้ตรงกลาง & กรอบข้อความ (Emblem & Frame)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logo Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[var(--text-secondary)]">โลโก้ตรงกลาง (Center Emblem) :</label>
                  <select
                    value={logoType}
                    onChange={(e) => setLogoType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)]"
                  >
                    <option value="none">ไม่มีโลโก้ (No Logo)</option>
                    <option value="garuda">ตราครุฑกระทรวงมหาดไทย (Garuda Seal)</option>
                    <option value="custom">อัปโหลดภาพโลโก้ custom...</option>
                  </select>

                  {logoType === 'custom' && (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="text-xs text-[var(--text-secondary)] file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700"
                    />
                  )}
                </div>

                {/* Frame Style Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[var(--text-secondary)]">รูปแบบกรอบ (Frame Style) :</label>
                  <select
                    value={frameType}
                    onChange={(e) => setFrameType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)]"
                  >
                    <option value="none">ไม่มีกรอบ (Standard QR)</option>
                    <option value="top-bottom">กรอบบน-ล่าง สารบรรณ (Banner Frame)</option>
                    <option value="card">กรอบการ์ดมน (Rounded Card)</option>
                    <option value="badge">กรอบป้ายมนล่าง (Bottom Badge)</option>
                  </select>
                </div>
              </div>

              {frameType !== 'none' && (
                <div className="space-y-2 pt-2 border-t border-[var(--border-lighter)]">
                  <label className="block text-xs font-bold text-[var(--text-secondary)]">ข้อความป้ายกรอบ :</label>
                  <input
                    type="text"
                    value={frameText}
                    onChange={(e) => setFrameText(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)]"
                  />
                </div>
              )}
            </div>

          </div>

          {/* Right Live Preview & Export Column (5 Cols) */}
          <div className="lg:col-span-5 space-y-6 sticky top-6">
            
            <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 shadow-md text-center space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[var(--text-primary)] font-noto-serif-thai flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-500" />
                  แสดงผล QR Code แบบ Realtime
                </h3>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Ready (100%)
                </span>
              </div>

              {/* Canvas Preview Container */}
              <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl p-6 flex items-center justify-center border border-dashed border-[var(--border-medium)] min-h-[340px] relative overflow-hidden shadow-inner">
                {/* Hidden canvas for rendering */}
                <canvas ref={canvasRef} className="max-w-full max-h-[300px] object-contain shadow-lg rounded-xl transition-all duration-300" />

                {isGenerating && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-xs gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>กำลังเรนเดอร์ QR...</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={downloadPNG}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลด PNG (HD)</span>
                  </button>

                  <button
                    onClick={downloadSVG}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-md transition-all"
                  >
                    <CodeIcon className="w-4 h-4" />
                    <span>ดาวน์โหลด SVG</span>
                  </button>
                </div>

                <button
                  onClick={downloadOfficialStickerPDF}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-bold text-xs shadow-lg transition-all"
                >
                  <FileText className="w-4.5 h-4.5" />
                  <span>สร้างสติ๊กเกอร์สารบรรณ (Official PDF Labels)</span>
                </button>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={copyImageToClipboard}
                    className="flex items-center justify-center gap-1.5 p-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-lighter)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)] font-semibold transition-all"
                    title="คัดลอกรูปภาพ"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-500" />
                    <span>{copiedSuccess ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
                  </button>

                  <button
                    onClick={handlePrintQR}
                    className="flex items-center justify-center gap-1.5 p-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-lighter)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)] font-semibold transition-all"
                    title="สั่งพิมพ์"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>สั่งพิมพ์</span>
                  </button>

                  <button
                    onClick={handleStampToDocument}
                    disabled={!selectedDocId || isSavingToDoc}
                    className="flex items-center justify-center gap-1.5 p-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 rounded-xl text-xs text-amber-700 dark:text-amber-400 font-bold transition-all disabled:opacity-40"
                    title="ประทับ QR ในเอกสาร EDMS"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                    <span>{stampSuccess ? 'ประทับสำเร็จ!' : 'ประทับลงแฟ้ม'}</span>
                  </button>
                </div>
              </div>

              {/* Encoded Payload Details */}
              <div className="pt-3 border-t border-[var(--border-lighter)] text-left">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                  Encoded Payload string:
                </span>
                <div className="p-2.5 bg-[var(--bg-base)] border border-[var(--border-medium)] rounded-xl font-mono text-[11px] text-[var(--text-secondary)] break-all max-h-24 overflow-y-auto">
                  {rawQrPayload}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Tab 2: Sticker & PDF Labels */}
      {activeTab === 'sticker' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-4">
            <div>
              <h2 className="text-xl font-bold font-noto-serif-thai text-[var(--text-primary)]">
                ระบบพิมพ์สติ๊กเกอร์ และสลิปตรวจสอบเอกสาร (Official Document Labels)
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                สร้างสติ๊กเกอร์ขนาดมาตรฐานสำหรับติดบนปกหนังสือราชการ แฟ้มเอกสาร หรือซองจดหมาย
              </p>
            </div>

            <button
              onClick={downloadOfficialStickerPDF}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลด PDF พิมพ์สติ๊กเกอร์ A4</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 border border-blue-500/30 bg-blue-500/5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="w-5 h-5" />
                <span>ตัวอย่างสเปกสติ๊กเกอร์สารบรรณ (Standard Sticker Spec)</span>
              </div>
              <ul className="text-xs space-y-2 text-[var(--text-secondary)] list-disc list-inside">
                <li>ขนาดสติ๊กเกอร์แต่ละดวง: 4.0 x 4.0 ซม. (วางเรียง 6 ดวงต่อหน้า A4)</li>
                <li>พิมพ์ตราครุฑ / โลโก้หน่วยงานกำกับพร้อมรหัสหนังสือราชการ</li>
                <li>ความคมชัดระดับ 300 DPI เหมาะสำหรับเครื่องพิมพ์สติ๊กเกอร์ความร้อน และ Laser Printer</li>
                <li>สแกนง่ายแม้อยู่ในซองพลาสติกถนอมเอกสาร</li>
              </ul>
            </div>

            <div className="p-5 border border-[var(--border-medium)] bg-[var(--bg-elevated)] rounded-2xl flex flex-col justify-center items-center text-center space-y-3">
              <QrCode className="w-16 h-16 text-blue-500" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                พร้อมพิมพ์สติ๊กเกอร์ประจำเอกสาร: <span className="text-blue-500">{selectedDoc ? selectedDoc.docNumber || selectedDoc.title : 'เอกสารทั่วไป'}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: History & Saved QRs */}
      {activeTab === 'history' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-4">
            <div>
              <h2 className="text-xl font-bold font-noto-serif-thai text-[var(--text-primary)]">
                ประวัติการสร้าง QR Code สารบรรณ
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">รายการ QR Code ที่ถูกสร้างขึ้นในเซสชันล่าสุด</p>
            </div>

            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 border border-red-500/30 rounded-lg font-semibold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ล้างประวัติ</span>
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--text-muted)] italic">
              ยังไม่มีประวัติการสร้าง QR Code
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item) => (
                <div key={item.id} className="p-4 border border-[var(--border-medium)] bg-[var(--bg-elevated)] rounded-xl flex items-center gap-4 hover:border-blue-500 transition-colors">
                  <img src={item.dataUrl} alt="QR" className="w-20 h-20 object-contain rounded-lg border bg-white p-1 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1 text-xs">
                    <div className="font-bold text-[var(--text-primary)] truncate">{item.title}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{item.timestamp} • {item.action}</div>
                    <div className="text-[10px] font-mono text-blue-500 truncate">{item.payload}</div>
                    <a href={item.dataUrl} download={`QR-${item.id}.png`} className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline pt-1">
                      <Download className="w-3 h-3" /> ดาวน์โหลดภาพ
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Scanner Test Simulator */}
      {activeTab === 'test' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 shadow-sm space-y-4 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold font-noto-serif-thai text-[var(--text-primary)] flex items-center gap-2">
            <Eye className="w-6 h-6 text-emerald-500" />
            ทดสอบสแกนและถอดรหัส QR Code (Scanner Test)
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            ตรวจสอบข้อมูลและปลายทางของ QR Code ที่สร้างขึ้นว่าสามารถใช้งานได้ตามปกติหรือไม่
          </p>

          <div className="p-5 border border-[var(--border-medium)] bg-[var(--bg-base)] rounded-xl space-y-4">
            <div className="text-xs font-bold text-[var(--text-primary)]">ผลการจำลองสแกน QR Code ปัจจุบัน:</div>
            
            <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl font-mono text-xs break-all text-emerald-600 dark:text-emerald-400 font-semibold">
              {rawQrPayload || 'ไม่มีข้อมูล QR Payload'}
            </div>

            {rawQrPayload.startsWith('http') && (
              <a
                href={rawQrPayload}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md"
              >
                <ExternalLink className="w-4 h-4" />
                <span>เปิดลิงก์ตรวจสอบจริงในหน้าใหม่ (Verify Page)</span>
              </a>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// Simple Helper Icon
function CodeIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
  );
}
