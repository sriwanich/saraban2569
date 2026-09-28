import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  X, 
  Printer, 
  Check, 
  CheckSquare, 
  Square, 
  Filter, 
  Layers, 
  Car, 
  Sparkles,
  ClipboardCheck,
  History,
  Info
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

interface BatchVehicleQrModalProps {
  vehicles: Vehicle[];
  isOpen: boolean;
  onClose: () => void;
  departments: string[];
}

export const BatchVehicleQrModal: React.FC<BatchVehicleQrModalProps> = ({
  vehicles,
  isOpen,
  onClose,
  departments
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(vehicles.map(v => v.id)));
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active'>('active');
  const [targetAction, setTargetAction] = useState<'inspect' | 'history'>('inspect');
  const [layoutMode, setLayoutMode] = useState<'2_per_page' | '4_per_page' | '6_per_page'>('4_per_page');
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync selected IDs when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(vehicles.filter(v => v.status === 'active').map(v => v.id)));
    }
  }, [isOpen, vehicles]);

  // Filtered vehicles list
  const filteredVehicles = vehicles.filter(v => {
    if (departmentFilter !== 'all' && v.department !== departmentFilter) return false;
    if (statusFilter === 'active' && v.status !== 'active') return false;
    return true;
  });

  // Generate QR codes for selected vehicles
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    let isMounted = true;
    setIsGenerating(true);

    const generateAll = async () => {
      const origin = window.location.origin;
      const map: Record<string, string> = {};

      for (const v of vehicles) {
        if (!selectedIds.has(v.id)) continue;
        const plate = encodeURIComponent(v.license_plate || '');
        const targetUrl = `${origin}/?view=vehicle_portal&vehicle_id=${v.id}&action=${targetAction}&plate=${plate}`;
        try {
          const dataUri = await QRCode.toDataURL(targetUrl, {
            width: 350,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: { dark: '#0f172a', light: '#ffffff' }
          });
          map[v.id] = dataUri;
        } catch (e) {
          console.error(`QR gen failed for ${v.id}:`, e);
        }
      }

      if (isMounted) {
        setQrMap(map);
        setIsGenerating(false);
      }
    };

    generateAll();

    return () => {
      isMounted = false;
    };
  }, [isOpen, vehicles, selectedIds, targetAction]);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredVehicles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVehicles.map(v => v.id)));
    }
  };

  const toggleSelectVehicle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handlePrintBatch = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('กรุณาอนุญาตให้เปิดหน้าต่างป๊อปอัพเพื่อพิมพ์ป้ายสติกเกอร์');
      return;
    }

    const selectedList = vehicles.filter(v => selectedIds.has(v.id));
    if (selectedList.length === 0) {
      alert('กรุณาเลือกยานพาหนะอย่างน้อย 1 คัน');
      return;
    }

    const gridCols = layoutMode === '2_per_page' ? '1fr' : '1fr 1fr';
    const cardHeight = 
      layoutMode === '2_per_page' ? '128mm' :
      layoutMode === '4_per_page' ? '65mm' : '45mm';
    const actionText = targetAction === 'inspect' ? 'ตรวจสภาพประจำวัน' : 'ประวัติการตรวจ';

    const cardsHtml = selectedList.map(v => {
      const qrData = qrMap[v.id] || '';
      return `
        <div class="sticker-card">
          <div class="card-header">
            <div class="org-name">สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง</div>
            <div class="card-subtitle">QR Code ประจำรถ ${v.vehicle_number || v.license_plate} (${actionText})</div>
          </div>
          
          <div class="card-body">
            <div class="info-area">
              <div class="plate-badge">
                <div class="plate-text">${v.license_plate}</div>
                <div class="plate-sub">${v.province || 'ระยอง'} ${v.vehicle_number ? `(${v.vehicle_number})` : ''}</div>
              </div>
              <div class="detail-row"><b>ยี่ห้อ/รุ่น:</b> ${v.brand} ${v.model}</div>
              <div class="detail-row"><b>ประเภท:</b> ${v.vehicle_type}</div>
              <div class="detail-row"><b>ฝ่าย:</b> ${v.department || 'สำนักงาน ปภ.'}</div>
              <div class="detail-row"><b>ผู้รับผิดชอบ:</b> ${v.responsible_person || 'ผู้รับผิดชอบยานพาหนะ'} ${v.responsible_phone ? `(${v.responsible_phone})` : ''}</div>
            </div>
            
            <div class="qr-area">
              ${qrData ? `<img src="${qrData}" class="qr-image" alt="QR" />` : '<div class="no-qr">QR Code</div>'}
              <div class="qr-tag">SCAN TO INSPECT</div>
            </div>
          </div>
          
          <div class="card-footer">
            <span>📲 สแกนด้วยกล้องมือถือ > เข้าสู่ระบบ (User/Pass) > ตรวจสภาพทันที</span>
            <span>ปภ.ระยอง EDMS</span>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>พิมพ์ QR Code ประจำรถ (จำนวน ${selectedList.length} คัน)</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
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
            }
            .grid-container {
              display: grid;
              grid-template-columns: ${gridCols};
              gap: 8mm;
            }
            .sticker-card {
              height: ${cardHeight};
              border: 2px solid #1e293b;
              border-radius: 10px;
              padding: 8px 12px;
              background: #fff;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-inside: avoid;
              box-sizing: border-box;
              position: relative;
            }
            .card-header {
              border-bottom: 2px solid #0284c7;
              padding-bottom: 4px;
            }
            .org-name {
              font-size: 11pt;
              font-weight: 800;
              color: #0369a1;
              line-height: 1.15;
            }
            .card-subtitle {
              font-size: 8.5pt;
              font-weight: 700;
              color: #475569;
            }
            .card-body {
              display: grid;
              grid-template-columns: 1fr 34mm;
              gap: 8px;
              align-items: center;
              margin: 4px 0;
            }
            .plate-badge {
              display: inline-block;
              border: 1.8px solid #0f172a;
              border-radius: 6px;
              padding: 2px 8px;
              background: #f8fafc;
              margin-bottom: 4px;
            }
            .plate-text {
              font-size: 13pt;
              font-weight: 800;
              line-height: 1.1;
              color: #0f172a;
            }
            .plate-sub {
              font-size: 8pt;
              font-weight: 600;
              color: #64748b;
            }
            .detail-row {
              font-size: 8pt;
              line-height: 1.35;
              color: #1e293b;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .qr-area {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 3px;
              background: #f8fafc;
            }
            .qr-image {
              width: 28mm;
              height: 28mm;
              display: block;
            }
            .qr-tag {
              font-size: 6.5pt;
              font-weight: 800;
              background: #0284c7;
              color: #fff;
              padding: 1px 4px;
              border-radius: 3px;
              margin-top: 2px;
              text-align: center;
              width: 100%;
            }
            .card-footer {
              border-top: 1px dashed #cbd5e1;
              padding-top: 3px;
              display: flex;
              justify-content: space-between;
              font-size: 6.8pt;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="grid-container">
            ${cardsHtml}
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-zoom-in flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <span>พิมพ์ QR Code ประจำรถ</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-400/30">
                  เลือกแล้ว {selectedIds.size} จาก {vehicles.length} คัน
                </span>
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                สร้างและพิมพ์ QR Code สำหรับติดประจำรถยนต์
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

        {/* Modal Controls Bar */}
        <div className="p-4 sm:p-5 bg-[var(--bg-elevated)] border-b border-[var(--border-light)] flex flex-wrap items-center justify-between gap-3">
          
          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={toggleSelectAll}
              className="px-3 py-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
            >
              {selectedIds.size === filteredVehicles.length && filteredVehicles.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-emerald-500" />
              ) : (
                <Square className="w-4 h-4 text-[var(--text-muted)]" />
              )}
              <span>เลือกทั้งหมด ({filteredVehicles.length})</span>
            </button>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl text-xs font-bold text-[var(--text-primary)] outline-none cursor-pointer"
            >
              <option value="all">ทุกฝ่าย/กลุ่มงาน</option>
              {departments.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>

            {/* Mode Target */}
            <div className="flex items-center rounded-xl bg-[var(--bg-surface)] p-0.5 border border-[var(--border-light)] text-xs font-bold">
              <button
                onClick={() => setTargetAction('inspect')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  targetAction === 'inspect' ? 'bg-[var(--primary-color)] text-white shadow-xs' : 'text-[var(--text-secondary)]'
                }`}
              >
                ตรวจสภาพประจำวัน
              </button>
              <button
                onClick={() => setTargetAction('history')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  targetAction === 'history' ? 'bg-indigo-600 text-white shadow-xs' : 'text-[var(--text-secondary)]'
                }`}
              >
                ดูประวัติ
              </button>
            </div>
          </div>

          {/* Layout Mode Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--text-muted)]">รูปแบบหน้าพิมพ์ A4:</span>
            <select
              value={layoutMode}
              onChange={(e: any) => setLayoutMode(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl text-xs font-bold text-[var(--text-primary)] outline-none cursor-pointer"
            >
              <option value="2_per_page">2 ป้ายต่อหน้า A4 (ขนาดใหญ่ 140x95 มม.)</option>
              <option value="4_per_page">4 ป้ายต่อหน้า A4 (มาตรฐาน 95x65 มม.)</option>
              <option value="6_per_page">6 ป้ายต่อหน้า A4 (กะทัดรัด 80x50 มม.)</option>
            </select>
          </div>

        </div>

        {/* Vehicles Selection Grid */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredVehicles.map((v) => {
              const isSelected = selectedIds.has(v.id);
              const qrCodeUrl = qrMap[v.id];

              return (
                <div
                  key={v.id}
                  onClick={() => toggleSelectVehicle(v.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 relative ${
                    isSelected
                      ? 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500 shadow-xs ring-1 ring-blue-500/20'
                      : 'bg-[var(--bg-surface)] border-[var(--border-light)] opacity-70 hover:opacity-100 hover:border-[var(--border-medium)]'
                  }`}
                >
                  {/* Selection Check */}
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-400 bg-white dark:bg-slate-800'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>

                  {/* QR Preview Mini */}
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-300 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="QR" className="w-full h-full object-contain" />
                    ) : (
                      <QrCode className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  {/* Vehicle Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-xs text-[var(--text-primary)] truncate">
                        {v.license_plate}
                      </span>
                      {v.vehicle_number && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 font-bold">
                          {v.vehicle_number}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] font-medium truncate mt-0.5">
                      {v.brand} {v.model}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">
                      {v.department || 'สำนักงาน ปภ.ระยอง'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-light)] bg-[var(--bg-surface)] flex items-center justify-between gap-3">
          <div className="text-xs text-[var(--text-muted)]">
            เลือกพิมพ์ทั้งหมด <b className="text-[var(--text-primary)]">{selectedIds.size}</b> คัน
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-secondary)] rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              onClick={handlePrintBatch}
              disabled={selectedIds.size === 0 || isGenerating}
              className="px-5 py-2.5 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white rounded-xl text-xs font-extrabold shadow-md shadow-[var(--primary-color)]/25 transition-all active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ QR Code ที่เลือก ({selectedIds.size} คัน)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
