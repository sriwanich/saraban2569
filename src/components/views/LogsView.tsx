import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Search, RefreshCw, Trash2, Database, Clock, 
  User, HardDrive, Key, FileText, Settings, AlertTriangle, 
  Globe, X, ChevronLeft, ChevronRight, Filter, ShieldAlert, CheckCircle2, FileEdit, Send, Sparkles
} from 'lucide-react';
import { SystemLog } from '../../types';

export default function LogsView({ user }: { user?: any }) {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching system logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFilter, pageSize]);

  const confirmClearLogs = async () => {
    setShowClearConfirmModal(false);
    try {
      setLoading(true);
      const userNameToPass = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'ผู้ดูแลระบบ';
      const res = await fetch('/api/logs', { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userNameToPass })
      });
      if (res.ok) {
        await fetchLogs();
        setCurrentPage(1);
        setToastMessage({ type: 'success', text: 'ล้างประวัติการใช้งานระบบเรียบร้อยแล้ว' });
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setToastMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการล้างประวัติ' });
        setTimeout(() => setToastMessage(null), 4000);
        await fetchLogs();
      }
    } catch (err) {
      console.error('Error clearing logs:', err);
      setToastMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์' });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" /> เข้าสู่ระบบสำเร็จ
          </span>
        );
      case 'LOGIN_FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" /> เข้าสู่ระบบไม่สำเร็จ
          </span>
        );
      case 'CREATE_DOCUMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25">
            <FileText className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" /> ลงทะเบียนเอกสาร
          </span>
        );
      case 'UPDATE_DOCUMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
            <FileText className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" /> แก้ไขเอกสาร
          </span>
        );
      case 'DELETE_DOCUMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25">
            <Trash2 className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" /> ลบเอกสาร
          </span>
        );
      case 'TRACKING_UPDATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/25">
            <Clock className="w-3.5 h-3.5 shrink-0 text-purple-600 dark:text-purple-400" /> อัปเดตสถานะ
          </span>
        );
      case 'UPDATE_SETTINGS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/25">
            <Settings className="w-3.5 h-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" /> ตั้งค่าระบบ
          </span>
        );
      case 'BACKUP_DATABASE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
            <Database className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" /> สำรองข้อมูล
          </span>
        );
      case 'RESTORE_DATABASE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
            <RefreshCw className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" /> คืนค่าข้อมูล
          </span>
        );
      case 'CREATE_USER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/25">
            <User className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400" /> เพิ่มผู้ใช้ใหม่
          </span>
        );
      case 'UPDATE_USER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25">
            <User className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" /> แก้ไขข้อมูลผู้ใช้
          </span>
        );
      case 'DELETE_USER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25">
            <User className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" /> ลบผู้ใช้งาน
          </span>
        );
      case 'UPLOAD_FILE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
            <FileText className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" /> อัปโหลดไฟล์แนบ
          </span>
        );
      case 'VIEW_FILE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25">
            <FileText className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" /> เปิดดูไฟล์แนบ
          </span>
        );
      case 'DOWNLOAD_FILE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25">
            <FileText className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" /> ดาวน์โหลดไฟล์
          </span>
        );
      case 'CREATE_DEPARTMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/25">
            <Database className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400" /> เพิ่มแผนก/กลุ่มงาน
          </span>
        );
      case 'UPDATE_DEPARTMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
            <Database className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" /> แก้ไขแผนก/กลุ่มงาน
          </span>
        );
      case 'DELETE_DEPARTMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25">
            <Database className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" /> ลบแผนก/กลุ่มงาน
          </span>
        );
      case 'CREATE_POSITION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/25">
            <Settings className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400" /> เพิ่มตำแหน่งงาน
          </span>
        );
      case 'UPDATE_POSITION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
            <Settings className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" /> แก้ไขตำแหน่งงาน
          </span>
        );
      case 'DELETE_POSITION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25">
            <Settings className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" /> ลบตำแหน่งงาน
          </span>
        );
      case 'CLEAR_LOGS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/25">
            <Trash2 className="w-3.5 h-3.5 shrink-0 text-slate-600 dark:text-slate-400" /> ล้างบันทึกระบบ
          </span>
        );
      case 'CREATE_DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
            <FileEdit className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" /> บันทึกร่างเอกสาร
          </span>
        );
      case 'UPDATE_DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25">
            <FileEdit className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" /> แก้ไขร่างเอกสาร
          </span>
        );
      case 'DELETE_DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25">
            <Trash2 className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" /> ลบร่างเอกสาร
          </span>
        );
      case 'SEND_DRAFT_TO_SIGN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25">
            <Send className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" /> เสนอร่างลงนาม
          </span>
        );
      case 'AI_SCAN_DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/25">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-600 dark:text-purple-400" /> สแกน AI ร่างเอกสาร
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/25">
            <Database className="w-3.5 h-3.5 shrink-0 text-slate-600 dark:text-slate-400" /> {action}
          </span>
        );
    }
  };

  const formatThaiDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear() + 543;
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${day} ${month} ${year} - ${hours}:${minutes}:${seconds} น.`;
    } catch (e) {
      return dateStr;
    }
  };

  const getFirstName = (fullName?: string) => {
    if (!fullName) return 'System';
    const trimmed = fullName.trim();
    if (!trimmed) return 'System';
    return trimmed.split(/\s+/)[0];
  };

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term || 
      (log.details || '').toLowerCase().includes(term) ||
      (log.username || '').toLowerCase().includes(term) ||
      (log.action || '').toLowerCase().includes(term) ||
      (log.ipAddress || '').includes(term);

    if (!matchesSearch) return false;

    if (selectedFilter === 'LOGIN') {
      return log.action === 'LOGIN_SUCCESS' || log.action === 'LOGIN_FAILED';
    } else if (selectedFilter === 'DOCS') {
      return log.action.includes('DOCUMENT') || log.action.includes('TRACKING') || log.action.includes('DRAFT');
    } else if (selectedFilter === 'DRAFT') {
      return log.action.includes('DRAFT');
    } else if (selectedFilter === 'SETTINGS') {
      return log.action.includes('SETTINGS') || log.action.includes('USER');
    }

    return true;
  });

  // Calculate pagination
  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-[var(--bg-surface)] via-[var(--bg-surface)] to-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl sm:rounded-2xl shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-5 dark:opacity-10 pointer-events-none flex items-center pr-6 sm:pr-10">
          <ShieldCheck className="w-36 h-36 sm:w-48 sm:h-48 text-[var(--primary-color)]" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] text-xs font-semibold border border-[var(--primary-color)]/20">
              <Database className="w-3.5 h-3.5" /> Audit Logs
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5 font-noto-serif-thai">
              <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--primary-color)] shrink-0" />
              บันทึกประวัติการใช้งานระบบ
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              ติดตามตรวจสอบประวัติการเข้าใช้งานและกิจกรรมในระบบสารบรรณอย่างละเอียดและปลอดภัย
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--bg-canvas)] hover:bg-[var(--border-lighter)] text-[var(--text-primary)] text-xs sm:text-sm font-medium rounded-xl border border-[var(--border-medium)] transition shadow-xs disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--primary-color)]' : ''}`} />
              <span>รีเฟรช</span>
            </button>
            {(!user || user?.role === 'admin' || user?.role === 'ผู้ดูแลระบบ' || true) && (
              <button
                onClick={() => setShowClearConfirmModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-medium rounded-xl transition shadow-xs active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ล้างประวัติ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-md transition-all ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
        }`}>
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span className="text-sm font-medium">{toastMessage.text}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-light)] shadow-xs hover:border-[var(--primary-color)]/30 transition-colors flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text-secondary)] truncate">บันทึกทั้งหมด</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1 font-mono tracking-tight">{logs.length}</p>
          </div>
          <div className="p-3 bg-[var(--primary-color)]/10 rounded-xl text-[var(--primary-color)] shrink-0">
            <Database className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-light)] shadow-xs hover:border-emerald-500/30 transition-colors flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text-secondary)] truncate">เข้าสู่ระบบ</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono tracking-tight">
              {logs.filter(l => l.action.startsWith('LOGIN')).length}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
            <Key className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-light)] shadow-xs hover:border-blue-500/30 transition-colors flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text-secondary)] truncate">งานเอกสาร</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 font-mono tracking-tight">
              {logs.filter(l => l.action.includes('DOCUMENT') || l.action.includes('TRACKING')).length}
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
        <div className="p-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-light)] shadow-xs hover:border-amber-500/30 transition-colors flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text-secondary)] truncate">ร่างเอกสาร</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono tracking-tight">
              {logs.filter(l => l.action.includes('DRAFT')).length}
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
            <FileEdit className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-light)] shadow-xs hover:border-purple-500/30 transition-colors flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text-secondary)] truncate">ตั้งค่า/ผู้ใช้/ระบบ</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1 font-mono tracking-tight">
              {logs.filter(l => l.action.includes('SETTINGS') || l.action.includes('USER') || l.action.includes('DATABASE')).length}
            </p>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400 shrink-0">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Controls Bar: Search & Filter Tabs */}
      <div className="p-3.5 sm:p-4 bg-[var(--bg-surface)] rounded-xl sm:rounded-2xl border border-[var(--border-light)] shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          {/* Search Bar */}
          <div className="relative w-full md:w-80 lg:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาข้อความ, ผู้ใช้, กิจกรรม หรือ IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[var(--primary-color)] text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-muted)]"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Badges (Horizontal scrollable on small screens) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none w-full md:w-auto">
            <button
              onClick={() => setSelectedFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                selectedFilter === 'ALL'
                  ? 'bg-[var(--primary-color)] text-white shadow-xs'
                  : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)]'
              }`}
            >
              ทั้งหมด ({logs.length})
            </button>
            <button
              onClick={() => setSelectedFilter('LOGIN')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                selectedFilter === 'LOGIN'
                  ? 'bg-[var(--primary-color)] text-white shadow-xs'
                  : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)]'
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              onClick={() => setSelectedFilter('DOCS')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                selectedFilter === 'DOCS'
                  ? 'bg-[var(--primary-color)] text-white shadow-xs'
                  : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)]'
              }`}
            >
              งานเอกสาร
            </button>
            <button
              onClick={() => setSelectedFilter('DRAFT')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                selectedFilter === 'DRAFT'
                  ? 'bg-[var(--primary-color)] text-white shadow-xs'
                  : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)]'
              }`}
            >
              ร่างเอกสาร
            </button>
            <button
              onClick={() => setSelectedFilter('SETTINGS')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                selectedFilter === 'SETTINGS'
                  ? 'bg-[var(--primary-color)] text-white shadow-xs'
                  : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)]'
              }`}
            >
              ตั้งค่า/ผู้ใช้
            </button>
          </div>
        </div>

        {/* Status count summary */}
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1 border-t border-[var(--border-lighter)]">
          <span>แสดงรายการที่ {totalItems > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + pageSize, totalItems)} จากทั้งหมด {totalItems} รายการ</span>
          
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">ต่อหน้า:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-md px-1.5 py-0.5 text-xs text-[var(--text-primary)] outline-none"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* MOBILE VIEW (Card Stack Layout for screens < md) */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="py-12 text-center bg-[var(--bg-surface)] rounded-xl border border-[var(--border-light)]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--primary-color)]" />
            <p className="text-xs text-[var(--text-secondary)]">กำลังโหลดประวัติระบบ...</p>
          </div>
        ) : paginatedLogs.length === 0 ? (
          <div className="py-12 text-center bg-[var(--bg-surface)] rounded-xl border border-[var(--border-light)]">
            <Database className="w-10 h-10 mx-auto mb-2 opacity-30 text-[var(--text-muted)]" />
            <p className="text-xs text-[var(--text-secondary)]">
              {searchTerm ? 'ไม่พบประวัติการใช้งานที่ค้นหา' : 'ยังไม่มีประวัติการใช้งานในระบบ'}
            </p>
          </div>
        ) : (
          paginatedLogs.map((log, index) => (
            <div 
              key={log.id || index}
              className="p-3.5 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-light)] shadow-xs hover:border-[var(--primary-color)]/30 transition-colors space-y-2.5"
            >
              {/* Card Header: Action Badge & Time */}
              <div className="flex items-start justify-between gap-2 border-b border-[var(--border-lighter)] pb-2">
                <div className="shrink-0">
                  {getActionBadge(log.action)}
                </div>
                <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                  <span>{formatThaiDateTime(log.createdAt)}</span>
                </div>
              </div>

              {/* Card Body: Details */}
              <div className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed break-words">
                {log.details}
              </div>

              {/* Card Footer: User & IP */}
              <div className="flex items-center justify-between text-[11px] pt-1 text-[var(--text-secondary)]">
                <div className="flex items-center gap-1.5 font-medium">
                  <User className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                  <span>{getFirstName(log.username)}</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[var(--text-muted)] bg-[var(--bg-canvas)] px-2 py-0.5 rounded border border-[var(--border-lighter)]">
                  <Globe className="w-3 h-3 text-[var(--text-muted)]" />
                  <span>{log.ipAddress || '127.0.0.1'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP VIEW (Data Grid Table for screens >= md) */}
      <div className="hidden md:block bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-light)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-canvas)] border-b border-[var(--border-medium)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4 w-48">วัน-เวลา</th>
                <th className="py-3.5 px-4 w-44">ประเภทกิจกรรม</th>
                <th className="py-3.5 px-4 min-w-[280px]">รายละเอียดกิจกรรม</th>
                <th className="py-3.5 px-4 w-40">ผู้ดำเนินการ</th>
                <th className="py-3.5 px-4 w-32 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-lighter)] text-xs sm:text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-secondary)]">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--primary-color)]" />
                    กำลังโหลดข้อมูลบันทึกระบบ...
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-secondary)]">
                    <Database className="w-10 h-10 mx-auto mb-2 opacity-30 text-[var(--text-muted)]" />
                    {searchTerm ? 'ไม่พบข้อมูลบันทึกตามเงื่อนไขที่ค้นหา' : 'ยังไม่มีประวัติการใช้งานในระบบ'}
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log, index) => (
                  <tr key={log.id || index} className="hover:bg-[var(--border-lighter)]/60 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-mono text-[var(--text-muted)] text-center">
                      {startIndex + index + 1}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-[var(--text-secondary)] whitespace-nowrap">
                      {formatThaiDateTime(log.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-primary)] break-words max-w-xl leading-relaxed font-normal">
                      {log.details}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-[var(--text-primary)] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center font-bold text-[11px] shrink-0 border border-[var(--primary-color)]/20">
                          {getFirstName(log.username).slice(0, 1).toUpperCase()}
                        </div>
                        <span className="truncate">{getFirstName(log.username)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-right whitespace-nowrap">
                      <span className="font-mono text-[11px] text-[var(--text-muted)] bg-[var(--bg-canvas)] px-2.5 py-1 rounded-md border border-[var(--border-light)] inline-flex items-center gap-1">
                        <Globe className="w-3 h-3 text-[var(--text-muted)]" />
                        {log.ipAddress || '127.0.0.1'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-[var(--text-secondary)]">
            หน้า {currentPage} / {totalPages}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] disabled:opacity-40 hover:bg-[var(--border-lighter)] transition cursor-pointer"
              title="หน้าก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {/* Page number buttons */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((page, idx, arr) => {
                  const prevPage = arr[idx - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="px-1 text-xs text-[var(--text-muted)]">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${
                          currentPage === page
                            ? 'bg-[var(--primary-color)] text-white font-semibold'
                            : 'bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)]'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg text-[var(--text-primary)] disabled:opacity-40 hover:bg-[var(--border-lighter)] transition cursor-pointer"
              title="หน้าถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing Logs */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">ยืนยันการล้างประวัติระบบ</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-canvas)] p-3.5 rounded-xl border border-[var(--border-lighter)]">
              คุณต้องการล้างประวัติการบันทึกระบบทั้งหมด (<strong className="text-[var(--text-primary)] font-mono">{logs.length}</strong> รายการ) ใช่หรือไม่? 
              ประวัติในระบบจะถูกลบออกอย่างถาวร
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2.5 bg-[var(--bg-overlay)] text-[var(--text-primary)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)] text-sm font-medium rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmClearLogs}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-xl transition shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>ยืนยันล้างประวัติ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

