import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Search, RefreshCw, Trash2, Database, Clock, 
  User, HardDrive, Key, FileText, Settings, AlertTriangle, 
  Globe, X, ChevronLeft, ChevronRight, Filter, ShieldAlert, CheckCircle2, FileEdit, Send, Sparkles, Printer
} from 'lucide-react';
import { SystemLog } from '../../types';
import { useConfirm } from '../../context/ConfirmContext';

export default function LogsView({ user }: { user?: any }) {
  const { confirm } = useConfirm();
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
      case 'CREATE_URGENT_INCIDENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" /> สร้างรายงานเหตุด่วน
          </span>
        );
      case 'UPDATE_URGENT_INCIDENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" /> แก้ไขรายงานเหตุด่วน
          </span>
        );
      case 'DELETE_URGENT_INCIDENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-600/10 text-red-800 dark:text-red-400 border border-red-600/25">
            <Trash2 className="w-3.5 h-3.5 shrink-0 text-red-600 dark:text-red-400" /> ลบรายงานเหตุด่วน
          </span>
        );
      case 'SCAN_URGENT_INCIDENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/25">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-purple-600 dark:text-purple-400" /> AI สแกนเหตุด่วน
          </span>
        );
      case 'PRINT_URGENT_INCIDENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25">
            <Printer className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" /> พิมพ์/ส่งออกเหตุด่วน
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
      <div className="p-6 sm:p-8 bg-[var(--bg-overlay)] backdrop-blur-2xl border border-[var(--border-light)] rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-[80px] pointer-events-none -mr-10 -mt-10 transition-all duration-700 group-hover:from-blue-500/20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20 shadow-sm shadow-blue-500/5">
              <Database className="w-3.5 h-3.5" /> Audit Logs
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold font-sans text-[var(--text-primary)] flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="tracking-tight">บันทึกประวัติการใช้งาน <span className="text-blue-500 font-normal">System Logs</span></span>
            </h1>
            <p className="text-sm text-[var(--text-secondary)] font-medium max-w-2xl leading-relaxed">
              ติดตามตรวจสอบประวัติการเข้าใช้งานและกิจกรรมในระบบสารบรรณอย่างละเอียดและปลอดภัย
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md hover:border-slate-300 dark:hover:border-slate-700 text-[var(--text-primary)] text-xs sm:text-sm font-bold rounded-xl border border-[var(--border-light)] transition-all shadow-sm hover:shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-500' : ''}`} />
              <span>รีเฟรชข้อมูล</span>
            </button>
            {(!user || user?.role === 'admin' || user?.role === 'ผู้ดูแลระบบ') && (
              <button
                onClick={() => setShowClearConfirmModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm shadow-rose-500/20 hover:shadow-md hover:shadow-rose-500/30"
              >
                <Trash2 className="w-4 h-4" />
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-between group">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--text-secondary)] truncate uppercase tracking-wider">บันทึกทั้งหมด</p>
            <p className="text-3xl font-extrabold text-[var(--text-primary)] mt-1.5 font-mono tracking-tight group-hover:scale-105 origin-left transition-transform">{logs.length}</p>
          </div>
          <div className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 shrink-0 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
            <Database className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-emerald-500/30 transition-all flex items-center justify-between group">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--text-secondary)] truncate uppercase tracking-wider">เข้าสู่ระบบ</p>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1.5 font-mono tracking-tight group-hover:scale-105 origin-left transition-transform">
              {logs.filter(l => l.action.startsWith('LOGIN')).length}
            </p>
          </div>
          <div className="p-3.5 bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:bg-emerald-500/20 transition-colors">
            <Key className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-blue-500/30 transition-all flex items-center justify-between group">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--text-secondary)] truncate uppercase tracking-wider">งานเอกสาร</p>
            <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1.5 font-mono tracking-tight group-hover:scale-105 origin-left transition-transform">
              {logs.filter(l => l.action.includes('DOCUMENT') || l.action.includes('TRACKING')).length}
            </p>
          </div>
          <div className="p-3.5 bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400 shrink-0 group-hover:bg-blue-500/20 transition-colors">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-amber-500/30 transition-all flex items-center justify-between group">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--text-secondary)] truncate uppercase tracking-wider">ร่างเอกสาร</p>
            <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1.5 font-mono tracking-tight group-hover:scale-105 origin-left transition-transform">
              {logs.filter(l => l.action.includes('DRAFT')).length}
            </p>
          </div>
          <div className="p-3.5 bg-amber-500/10 rounded-2xl text-amber-600 dark:text-amber-400 shrink-0 group-hover:bg-amber-500/20 transition-colors">
            <FileEdit className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-purple-500/30 transition-all flex items-center justify-between group">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--text-secondary)] truncate uppercase tracking-wider">ตั้งค่าระบบ</p>
            <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1.5 font-mono tracking-tight group-hover:scale-105 origin-left transition-transform">
              {logs.filter(l => l.action.includes('SETTINGS') || l.action.includes('USER') || l.action.includes('DATABASE')).length}
            </p>
          </div>
          <div className="p-3.5 bg-purple-500/10 rounded-2xl text-purple-600 dark:text-purple-400 shrink-0 group-hover:bg-purple-500/20 transition-colors">
            <Settings className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Controls Bar: Search & Filter Tabs */}
      <div className="p-4 sm:p-5 bg-[var(--bg-overlay)] backdrop-blur-xl rounded-3xl border border-[var(--border-light)] shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          {/* Search Bar */}
          <div className="relative w-full md:w-96 group">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="ค้นหาข้อความ, ผู้ใช้, กิจกรรม หรือ IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900/50 border border-[var(--border-light)] rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-[var(--text-primary)] transition-all placeholder:text-[var(--text-muted)] shadow-sm"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-rose-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Grid Menu */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 w-full md:w-auto shrink-0">
            {[
              { id: 'ALL', label: `ทั้งหมด (${logs.length})`, icon: Database },
              { id: 'LOGIN', label: 'เข้าสู่ระบบ', icon: Key },
              { id: 'DOCS', label: 'งานเอกสาร', icon: FileText },
              { id: 'DRAFT', label: 'ร่างเอกสาร', icon: FileEdit },
              { id: 'SETTINGS', label: 'ตั้งค่า/ผู้ใช้', icon: Settings }
            ].map(f => {
              const Icon = f.icon;
              const isActive = selectedFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-xs font-bold'
                      : 'bg-white dark:bg-slate-900/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-lighter)] border-[var(--border-light)]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[var(--primary-color)]'}`} />
                  <span>{f.label}</span>
                </button>
              );
            })}
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
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono text-[11px] text-[var(--text-muted)] bg-[var(--bg-canvas)] px-2.5 py-1 rounded-md border border-[var(--border-light)] inline-flex items-center gap-1">
                          <Globe className="w-3 h-3 text-[var(--text-muted)]" />
                          {log.ipAddress || '127.0.0.1'}
                        </span>
                        {(user?.role === 'admin' || user?.role === 'ผู้ดูแลระบบ') && (
                          <button
                            onClick={async () => {
                              const confirmed = await confirm({
                                title: 'ยืนยันการลบรายการประวัติ',
                                message: `คุณต้องการลบรายการประวัติ "${log.action}" (${log.details || ''}) ใช่หรือไม่?`,
                                type: 'delete',
                                confirmText: 'ยืนยันการลบ',
                                cancelText: 'ยกเลิก'
                              });
                              if (!confirmed) return;
                              try {
                                const res = await fetch(`/api/logs/${log.id}`, { method: 'DELETE' });
                                if (res.ok) {
                                  fetchLogs();
                                  setToastMessage({ type: 'success', text: 'ลบรายการเรียบร้อยแล้ว' });
                                  setTimeout(() => setToastMessage(null), 4000);
                                } else {
                                  setToastMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการลบรายการ' });
                                }
                              } catch (err) {
                                setToastMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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

