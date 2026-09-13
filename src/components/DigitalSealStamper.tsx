import React, { useState, useRef, useEffect } from 'react';
import { 
  Stamp, PenTool, Eraser, Download, CheckCircle2, 
  RotateCcw, ShieldCheck, AlertOctagon, FileCheck, Award, 
  UserCheck, Clock, X, Lock, Palette
} from 'lucide-react';
import { DocumentItem } from '../types';

interface Props {
  doc: DocumentItem;
  user: any;
  onClose: () => void;
  onSaveStamp?: (stampInfo: any) => void;
}

export type SealType = 'URGENT' | 'RECEIVED' | 'APPROVED' | 'VERIFIED' | 'CONFIDENTIAL' | 'CUSTOM';

interface StampPreset {
  id: SealType;
  title: string;
  subtitle: string;
  color: string;
  borderColor: string;
  bgColor: string;
  icon: any;
}

export default function DigitalSealStamper({ doc, user, onClose, onSaveStamp }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedSeal, setSelectedSeal] = useState<SealType>('APPROVED');
  const [customText, setCustomText] = useState('รับทราบและมอบหมายดำเนินการ');
  const [selectedColor, setSelectedColor] = useState('#b91c1c'); // Red
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushColor, setBrushColor] = useState('#1e3a8a'); // Blue
  const [brushSize, setBrushSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [stampedList, setStampedList] = useState<any[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  const presets: StampPreset[] = [
    {
      id: 'APPROVED',
      title: 'อนุมัติ / ทราบ',
      subtitle: 'ผ่านการพิจารณาแล้ว',
      color: '#15803d', // Green
      borderColor: 'border-green-600',
      bgColor: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300',
      icon: CheckCircle2
    },
    {
      id: 'URGENT',
      title: 'ด่วนที่สุด',
      subtitle: 'ปฏิบัติการเร่งด่วน',
      color: '#b91c1c', // Red
      borderColor: 'border-red-600',
      bgColor: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
      icon: AlertOctagon
    },
    {
      id: 'RECEIVED',
      title: 'ลงรับหนังสือแล้ว',
      subtitle: 'สารบรรณ ปภ. จังหวัด',
      color: '#1d4ed8', // Blue
      borderColor: 'border-blue-600',
      bgColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
      icon: FileCheck
    },
    {
      id: 'VERIFIED',
      title: 'ตรวจสอบถูกต้อง',
      subtitle: 'ตามระเบียบงานสารบรรณ',
      color: '#0d9488', // Teal
      borderColor: 'border-teal-600',
      bgColor: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
      icon: ShieldCheck
    },
    {
      id: 'CONFIDENTIAL',
      title: 'ลับมาก / คุ้มครองสิทธิ์',
      subtitle: 'เฉพาะผู้มีอำนาจเข้าถึง',
      color: '#7e22ce', // Purple
      borderColor: 'border-purple-600',
      bgColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
      icon: Lock
    }
  ];

  // Set up canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high DPI canvas
    const width = 640;
    const height = 400;
    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(2, 2);

    redrawCanvas();
  }, []);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 640, 400);

    // Draw grid/watermark
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < 640; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 400);
      ctx.stroke();
    }
    for (let y = 0; y < 400; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }

    // Document mock header
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px "TH Sarabun New", sans-serif';
    ctx.fillText(`เอกสาร: ${doc.docNumber || doc.title || 'ไม่มีเลขที่'}`, 24, 30);
    ctx.font = '11px sans-serif';
    ctx.fillText(`เรื่อง: ${(doc.title || '').substring(0, 60)}`, 24, 48);

    // Draw stamped seals
    stampedList.forEach((stamp) => {
      drawStampOnCtx(ctx, stamp);
    });
  };

  const drawStampOnCtx = (ctx: CanvasRenderingContext2D, stamp: any) => {
    ctx.save();
    ctx.translate(stamp.x, stamp.y);
    ctx.rotate(stamp.rotation * Math.PI / 180);

    const w = 220;
    const h = 100;

    // Outer border
    ctx.strokeStyle = stamp.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    // Inner border
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);

    // Seal text
    ctx.fillStyle = stamp.color;
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "TH Sarabun New", sans-serif';
    ctx.fillText(stamp.title, 0, -18);

    ctx.font = '12px "TH Sarabun New", sans-serif';
    ctx.fillText(stamp.subtitle || '', 0, 0);

    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`ผู้ประทับ: ${stamp.officer}`, 0, 18);
    ctx.fillText(stamp.dateStr, 0, 34);

    ctx.restore();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const preset = presets.find(p => p.id === selectedSeal);
    const dateNow = new Date();
    const thaiDate = `${dateNow.toLocaleDateString('th-TH')} เวลา ${dateNow.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;

    const newStamp = {
      id: Date.now(),
      x,
      y,
      rotation: (Math.random() * 6) - 3, // subtle natural angle
      title: selectedSeal === 'CUSTOM' ? customText : (preset?.title || 'อนุมัติ'),
      subtitle: selectedSeal === 'CUSTOM' ? 'เกษียนสั่งการ ปภ. ระยอง' : (preset?.subtitle || ''),
      officer: `${user?.firstName || 'เจ้าหน้าที่'} ${user?.lastName || ''}`.trim(),
      dateStr: thaiDate,
      color: preset?.color || selectedColor
    };

    setStampedList(prev => [...prev, newStamp]);
  };

  useEffect(() => {
    redrawCanvas();
  }, [stampedList]);

  // Mouse Drawing events
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Stamped_${doc.docNumber || 'DOC'}_${Date.now()}.png`;
    link.href = image;
    link.click();
  };

  const handleSaveToDoc = () => {
    setIsSaved(true);
    if (onSaveStamp) {
      onSaveStamp({
        stampedAt: new Date().toISOString(),
        stampedBy: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        stamps: stampedList
      });
    }
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-light)] flex items-center justify-between bg-gradient-to-r from-[var(--primary-color)]/5 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center border border-[var(--primary-color)]/20 shadow-sm">
              <Stamp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-sans text-[var(--text-primary)]">
                ระบบประทับตราดิจิทัล & เกษียนหนังสือ (Digital Seal & Stylus)
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                ประทับตราอนุมัติ ตราด่วนที่สุด และเขียนเกษียนสั่งการลงบนเอกสารทางราชการ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Left Column */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">
                1. เลือกรูปแบบตราประทับ
              </label>
              <div className="grid grid-cols-1 gap-2">
                {presets.map((p) => {
                  const Icon = p.icon;
                  const isSelected = selectedSeal === p.id && !isDrawingMode;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedSeal(p.id);
                        setIsDrawingMode(false);
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                        isSelected
                          ? `border-2 ${p.borderColor} ${p.bgColor} shadow-sm ring-2 ring-[var(--primary-color)]/20`
                          : 'border-[var(--border-light)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 shrink-0" style={{ color: p.color }} />
                        <div>
                          <div className="font-bold text-sm">{p.title}</div>
                          <div className="text-xs opacity-80">{p.subtitle}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-current opacity-70">
                        คลิกเพื่อปั๊ม
                      </span>
                    </button>
                  );
                })}

                {/* Custom Stylus Pen */}
                <button
                  onClick={() => setIsDrawingMode(!isDrawingMode)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                    isDrawingMode
                      ? 'border-2 border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 shadow-sm'
                      : 'border-[var(--border-light)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <PenTool className="w-5 h-5 shrink-0 text-blue-600" />
                    <div>
                      <div className="font-bold text-sm">ปากกาเขียนเกษียนสั่งการ (Stylus)</div>
                      <div className="text-xs opacity-80">วาดลายเซ็นหรือเขียนข้อความด้วยมือ</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-current">
                    {isDrawingMode ? 'โหมดวาด' : 'เปิดโหมดปากกา'}
                  </span>
                </button>
              </div>
            </div>

            {/* Drawing options if active */}
            {isDrawingMode && (
              <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-light)] space-y-3">
                <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between">
                  <span>ตั้งค่าสีและขนาดหัวปากกา</span>
                  <div className="flex gap-1.5">
                    {['#1e3a8a', '#b91c1c', '#15803d', '#111827'].map(c => (
                      <button
                        key={c}
                        onClick={() => setBrushColor(c)}
                        className={`w-5 h-5 rounded-full border-2 transition-transform ${brushColor === c ? 'scale-125 border-white shadow-sm' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-muted)]">ขนาดเส้น:</span>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                    className="flex-1 accent-[var(--primary-color)]"
                  />
                  <span className="text-xs font-mono font-bold w-4">{brushSize}px</span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => setStampedList([])}
                className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-light)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                ล้างตราประทับทั้งหมด
              </button>
            </div>
          </div>

          {/* Canvas Right Column */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-3">
            <div className="w-full flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
              <span className="font-semibold">
                {isDrawingMode ? '✍️ ลากเมาส์/สัมผัสเพื่อเขียนบนเอกสาร' : '🎯 คลิกตำแหน่งบนผืนผ้าใบเพื่อวางตราประทับ'}
              </span>
              <span className="text-[10px] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full">
                ตราประทับแล้ว: {stampedList.length} รายการ
              </span>
            </div>

            {/* Canvas Frame */}
            <div className="relative border-2 border-dashed border-[var(--border-light)] rounded-2xl overflow-hidden shadow-inner bg-white">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className={`cursor-${isDrawingMode ? 'crosshair' : 'pointer'} block`}
              />
            </div>

            <div className="text-[11px] text-[var(--text-muted)] text-center">
              ตราประทับอิเล็กทรอนิกส์จะผูกชื่อผู้ลงนาม <span className="font-semibold text-[var(--primary-color)]">{user?.firstName} {user?.lastName}</span> และเวลาปัจจุบันอัตโนมัติ
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[var(--border-light)] bg-[var(--bg-surface)] flex items-center justify-between">
          <div className="text-xs text-[var(--text-secondary)]">
            {isSaved ? (
              <span className="text-green-600 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> บันทึกตราประทับสำเร็จ
              </span>
            ) : (
              <span>เอกสาร: {doc.docNumber || 'รย 0021/...'}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2.5 rounded-xl border border-[var(--border-light)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              ดาวน์โหลดรูปประทับตรา
            </button>
            <button
              onClick={handleSaveToDoc}
              className="px-5 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-[var(--primary-color)]/20 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              ยืนยันการประทับตรา
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
