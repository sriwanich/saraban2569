import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  X, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Car, 
  ClipboardCheck, 
  History, 
  Shield, 
  Smartphone, 
  Sparkles,
  Phone,
  User,
  Building2
} from 'lucide-react';

interface Vehicle {
  id: string;
  license_plate: string;
  vehicle_number?: string;
  image_url?: string;
  province: string;
  brand: string;
  model: string;
  vehicle_type: string;
  department: string;
  current_mileage: number;
  status: 'active' | 'maintenance' | 'inactive';
  responsible_person?: string;
  responsible_position?: string;
  responsible_phone?: string;
}

interface VehicleQrModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

export const VehicleQrModal: React.FC<VehicleQrModalProps> = ({ vehicle, isOpen, onClose, user }) => {
  const [targetAction, setTargetAction] = useState<'inspect' | 'history' | 'hub'>('inspect');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const getTargetUrl = () => {
    if (!vehicle || typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const plate = encodeURIComponent(vehicle.license_plate || '');
    const province = encodeURIComponent(vehicle.province || 'กรุงเทพมหานคร');
    return `${origin}/?view=vehicle_portal&vehicle_id=${vehicle.id}&action=${targetAction}&plate=${plate}&province=${province}`;
  };

  useEffect(() => {
    if (!vehicle || !isOpen) return;

    const url = getTargetUrl();
    QRCode.toDataURL(url, {
      width: 450,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(dataUri => setQrDataUrl(dataUri))
      .catch(err => console.error('Error generating vehicle QR code:', err));
  }, [vehicle, targetAction, isOpen]);

  if (!isOpen || !vehicle) return null;

  const targetUrl = getTargetUrl();

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(targetUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = targetUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_Vehicle_${vehicle.license_plate.replace(/\s+/g, '_')}_${targetAction}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintSticker = () => {
    setIsPrinting(true);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('กรุณาอนุญาตให้เปิดหน้าต่างป๊อปอัพเพื่อพิมพ์ป้ายสติกเกอร์');
      setIsPrinting(false);
      return;
    }

    const actionText = 
      targetAction === 'inspect' ? 'ตรวจสภาพประจำวันด่วน' :
      targetAction === 'history' ? 'ดูประวัติการตรวจสภาพ' : 'ข้อมูลยานพาหนะ';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>QR Code ประจำรถ ${vehicle.vehicle_number || vehicle.license_plate}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
              color: #0f172a;
              background: #fff;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 15px;
            }
            .sticker-card {
              width: 140mm;
              height: 92mm;
              border: 2.5px solid #1e293b;
              border-radius: 12px;
              padding: 10px 14px;
              background: #ffffff;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-shadow: 0 4px 12px rgba(0,0,0,0.06);
              page-break-inside: avoid;
              position: relative;
              overflow: hidden;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #0284c7;
              padding-bottom: 6px;
            }
            .header-titles {
              text-align: left;
            }
            .org-name {
              font-size: 13pt;
              font-weight: 800;
              color: #0369a1;
              line-height: 1.2;
            }
            .card-title {
              font-size: 10pt;
              font-weight: 700;
              color: #334155;
              margin-top: 1px;
            }
            .content-grid {
              display: grid;
              grid-template-columns: 1fr 44mm;
              gap: 12px;
              align-items: center;
              margin: 6px 0;
            }
            .plate-box {
              display: inline-block;
              border: 2px solid #0f172a;
              border-radius: 8px;
              padding: 4px 10px;
              background: #f8fafc;
              text-align: center;
              margin-bottom: 6px;
            }
            .plate-num {
              font-size: 16pt;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: 0.5px;
              line-height: 1.1;
            }
            .plate-prov {
              font-size: 10pt;
              font-weight: 600;
              color: #475569;
            }
            .info-list {
              font-size: 9.5pt;
              line-height: 1.45;
              color: #1e293b;
            }
            .info-item {
              margin-bottom: 2px;
              display: flex;
              gap: 4px;
            }
            .info-label {
              font-weight: 700;
              color: #475569;
              white-space: nowrap;
            }
            .info-val {
              font-weight: 600;
              color: #0f172a;
            }
            .qr-wrapper {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border: 1.5px solid #cbd5e1;
              border-radius: 8px;
              padding: 4px;
              background: #f8fafc;
            }
            .qr-img {
              width: 38mm;
              height: 38mm;
              display: block;
            }
            .qr-badge {
              font-size: 8pt;
              font-weight: 800;
              background: #0284c7;
              color: #ffffff;
              padding: 2px 6px;
              border-radius: 4px;
              margin-top: 3px;
              text-align: center;
              width: 100%;
            }
            .footer {
              border-top: 1.5px dashed #cbd5e1;
              padding-top: 5px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 8pt;
              color: #64748b;
            }
            .instructions {
              font-weight: 600;
              color: #0369a1;
            }
            @media print {
              body {
                padding: 0;
              }
              .sticker-card {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="sticker-card">
            <div class="header">
              <div class="header-titles">
                <div class="org-name">สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง</div>
                <div class="card-title">QR Code ประจำรถ ${vehicle.vehicle_number || vehicle.license_plate} (${actionText})</div>
              </div>
            </div>

            <div class="content-grid">
              <div class="info-side">
                <div class="plate-box">
                  <div class="plate-num">${vehicle.license_plate}</div>
                  <div class="plate-prov">${vehicle.province || 'ระยอง'} ${vehicle.vehicle_number ? `(หมายเลขประจำรถ: ${vehicle.vehicle_number})` : ''}</div>
                </div>

                <div class="info-list">
                  <div class="info-item">
                    <span class="info-label">ยี่ห้อ/รุ่น:</span>
                    <span class="info-val">${vehicle.brand} ${vehicle.model}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">ประเภท:</span>
                    <span class="info-val">${vehicle.vehicle_type}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">ฝ่าย/กลุ่มงาน:</span>
                    <span class="info-val">${vehicle.department || 'สำนักงาน ปภ.ระยอง'}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">ผู้รับผิดชอบ:</span>
                    <span class="info-val">${vehicle.responsible_person || 'ผู้รับผิดชอบยานพาหนะ'} ${vehicle.responsible_phone ? `(โทร. ${vehicle.responsible_phone})` : ''}</span>
                  </div>
                </div>
              </div>

              <div class="qr-wrapper">
                <img class="qr-img" src="${qrDataUrl}" alt="QR Code" />
                <div class="qr-badge">สแกนตรวจสภาพประจำวัน</div>
              </div>
            </div>

            <div class="footer">
              <div class="instructions">📲 ใช้กล้องมือถือสแกน > เข้าสู่ระบบ (Username/Password) > บันทึกการตรวจสภาพได้ทันที</div>
              <div>ระบบบริหารจัดการยานพาหนะ (EDMS)</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setIsPrinting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-zoom-in flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <span>QR Code ประจำรถ {vehicle.vehicle_number || vehicle.license_plate}</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                สแกนเพื่อเข้าสู่ระบบและเปิดหน้ารถคันนี้โดยตรงทันที
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-5">
          
          {/* Mode Tabs */}
          <div className="bg-[var(--bg-elevated)] p-1 rounded-2xl border border-[var(--border-light)] flex gap-1">
            <button
              onClick={() => setTargetAction('inspect')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                targetAction === 'inspect'
                  ? 'bg-[var(--primary-color)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>ตรวจสภาพประจำวัน</span>
            </button>
            <button
              onClick={() => setTargetAction('history')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                targetAction === 'history'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <History className="w-4 h-4" />
              <span>ดูประวัติการตรวจ</span>
            </button>
            <button
              onClick={() => setTargetAction('hub')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                targetAction === 'hub'
                  ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>หน้ารวมข้อมูลรถ</span>
            </button>
          </div>

          {/* Sticker Preview Card */}
          <div 
            ref={cardRef}
            className="bg-white text-slate-900 border-2 border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md relative overflow-hidden"
          >
            {/* Top Accent */}
            <div className="flex items-center justify-between border-b-2 border-sky-600 pb-2.5 mb-3">
              <div>
                <div className="text-[13px] font-extrabold text-sky-800 tracking-tight leading-tight">
                  สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง
                </div>
                <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                  QR Code ประจำรถ {vehicle.vehicle_number || vehicle.license_plate} ({targetAction === 'inspect' ? 'ตรวจสภาพประจำวัน' : targetAction === 'history' ? 'ดูประวัติการตรวจ' : 'ข้อมูลรถยนต์'})
                </div>
              </div>
              <div className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-extrabold border border-sky-300">
                EDMS VEHICLE
              </div>
            </div>

            {/* Middle Content */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-4 items-center">
              {/* Vehicle Specs */}
              <div className="space-y-2">
                <div className="inline-block border-2 border-slate-900 rounded-xl px-3 py-1 bg-slate-50 text-center shadow-xs">
                  <div className="text-xl font-black text-slate-900 tracking-wide leading-none">
                    {vehicle.license_plate}
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                    {vehicle.province || 'ระยอง'} {vehicle.vehicle_number ? `(หมายเลข: ${vehicle.vehicle_number})` : ''}
                  </div>
                </div>

                <div className="text-[12px] space-y-1 text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-500 min-w-[70px]">ยี่ห้อ/รุ่น:</span>
                    <span className="font-semibold text-slate-900">{vehicle.brand} {vehicle.model}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-500 min-w-[70px]">ประเภท:</span>
                    <span className="font-semibold text-slate-900 truncate">{vehicle.vehicle_type}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-500 min-w-[70px]">ฝ่ายงาน:</span>
                    <span className="font-semibold text-slate-900 truncate">{vehicle.department || 'สำนักงาน ปภ.ระยอง'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-500 min-w-[70px]">ผู้รับผิดชอบ:</span>
                    <span className="font-semibold text-slate-900">
                      {vehicle.responsible_person || 'ผู้รับผิดชอบประจำรถ'}
                      {vehicle.responsible_phone && ` (${vehicle.responsible_phone})`}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Image Box */}
              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-300 shadow-xs">
                {qrDataUrl ? (
                  <img 
                    src={qrDataUrl} 
                    alt="Vehicle QR Code" 
                    className="w-28 h-28 object-contain rounded-lg shadow-2xs"
                  />
                ) : (
                  <div className="w-28 h-28 bg-slate-200 animate-pulse rounded-lg flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-slate-400" />
                  </div>
                )}
                <div className="mt-1.5 px-2 py-0.5 rounded bg-sky-600 text-white font-extrabold text-[9.5px] text-center w-full">
                  SCAN TO INSPECT
                </div>
              </div>
            </div>

            {/* Bottom Instructions */}
            <div className="mt-3 pt-2 border-t border-dashed border-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10.5px] text-slate-600 gap-1">
              <div className="font-semibold text-sky-800 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>สแกนกล้องมือถือ &gt; เข้าสู่ระบบ (User/Pass) &gt; บันทึกตรวจสภาพทันที</span>
              </div>
              <div className="text-slate-400 text-[9.5px]">ปภ.ระยอง EDMS</div>
            </div>
          </div>

          {/* Target URL Copy Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center justify-between">
              <span>ลิงก์สำหรับสแกนเข้าหน้ารถยนต์โดยตรง:</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                {targetAction === 'inspect' ? 'โหมดตรวจสภาพทันที' : targetAction === 'history' ? 'โหมดประวัติการตรวจ' : 'โหมดข้อมูลรถยนต์'}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={targetUrl}
                className="flex-1 px-3 py-2 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl text-xs font-mono text-[var(--text-primary)] outline-none select-all"
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-primary)] border border-[var(--border-light)] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
              <a
                href={targetUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-light)] rounded-xl transition-all cursor-pointer shrink-0"
                title="เปิดทดสอบในแท็บใหม่"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-[var(--border-light)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadQr}
              disabled={!qrDataUrl}
              className="px-3.5 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-primary)] border border-[var(--border-light)] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-4 h-4 text-sky-500" />
              <span>ดาวน์โหลดภาพ QR</span>
            </button>

            <button
              onClick={handlePrintSticker}
              disabled={isPrinting || !qrDataUrl}
              className="px-5 py-2.5 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white rounded-xl text-xs font-extrabold shadow-md shadow-[var(--primary-color)]/25 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ QR Code (A4)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
