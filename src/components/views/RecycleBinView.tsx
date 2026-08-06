import React, { useState, useEffect } from 'react';
import { 
  Trash2, Search, RefreshCw, Undo, ShieldAlert, AlertTriangle, 
  Clock, User, FileText, ChevronLeft, ChevronRight, CheckCircle2, X 
} from 'lucide-react';

interface RecycleBinItem {
  id: number;
  docId: string;
  docType: string;
  title: string;
  docNumber: string | null;
  deletedAt: string;
  deletedBy: string;
}

export default function RecycleBinView({ user, onRefreshMainData }: { user?: any, onRefreshMainData?: () => void }) {
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemForRestore, setSelectedItemForRestore] = useState<RecycleBinItem | null>(null);
  const [selectedItemForDelete, setSelectedItemForDelete] = useState<RecycleBinItem | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchRecycleBin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recycle-bin');
      if (res.ok) {
        const data = await res.json();
        if (data.items) {
          setItems(data.items);
        }
      }
    } catch (err) {
      console.error('Error fetching recycle bin items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecycleBin();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRestore = async (item: RecycleBinItem) => {
    setSelectedItemForRestore(null);
    setLoading(true);
    try {
      const usernameParam = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'ผู้ใช้งาน';
      const res = await fetch(`/api/recycle-bin/${item.docId}/restore?username=${encodeURIComponent(usernameParam)}`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('success', `กู้คืนเอกสาร "${item.title}" เรียบร้อยแล้ว`);
        await fetchRecycleBin();
        if (onRefreshMainData) {
          onRefreshMainData();
        }
      } else {
        const errData = await res.json();
        showToast('error', errData.error || 'เกิดข้อผิดพลาดในการกู้คืนเอกสาร');
      }
    } catch (err) {
      console.error('Error restoring:', err);
      showToast('error', 'ไม่สามารถเชื่อมต่อระบบเพื่อกู้คืนได้');
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async (item: RecycleBinItem) => {
    setSelectedItemForDelete(null);
    setLoading(true);
    try {
      const usernameParam = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'ผู้ใช้งาน';
      const res = await fetch(`/api/recycle-bin/${item.docId}?username=${encodeURIComponent(usernameParam)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('success', 'ลบเอกสารอย่างถาวรเรียบร้อยแล้ว');
        await fetchRecycleBin();
        if (onRefreshMainData) {
          onRefreshMainData();
        }
      } else {
        const errData = await res.json();
        showToast('error', errData.error || 'เกิดข้อผิดพลาดในการลบเอกสาร');
      }
    } catch (err) {
      console.error('Error permanent delete:', err);
      showToast('error', 'ไม่สามารถเชื่อมต่อระบบเพื่อลบถาวรได้');
    } finally {
      setLoading(false);
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(searchLower) ||
      (item.docNumber && item.docNumber.toLowerCase().includes(searchLower)) ||
      (item.deletedBy && item.deletedBy.toLowerCase().includes(searchLower))
    );
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatThaiDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      const thMonth = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      return `${d.getDate()} ${thMonth[d.getMonth()]} ${d.getFullYear() + 543} เวลา ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} น.`;
    } catch (e) {
      return '-';
    }
  };

  const getDocTypeBadge = (type: string) => {
    const config: Record<string, { label: string, bg: string, text: string }> = {
      inbox: { label: 'หนังสือรับ', bg: 'bg-indigo-50 dark:bg-indigo-950/20', text: 'text-indigo-600 dark:text-indigo-400' },
      outbox: { label: 'หนังสือส่ง', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400' },
      circular: { label: 'หนังสือเวียน', bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-600 dark:text-purple-400' },
      internal: { label: 'บันทึกข้อความ', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400' },
      admin: { label: 'งานธุรการ/ประกาศ', bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600 dark:text-blue-400' }
    };
    const c = config[type] || { label: type, bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' };
    return (
      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border border-transparent ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  const getRemainingDays = (deletedAtStr: string) => {
    try {
      const delDate = new Date(deletedAtStr);
      const now = new Date();
      const diffMs = now.getTime() - delDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const remaining = 30 - diffDays;
      return remaining > 0 ? remaining : 0;
    } catch (e) {
      return 30;
    }
  };

  return (
    <div id="recycle-bin-view-container" className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div id="recycle-bin-toast" className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in fade-in slide-in-from-top-4 duration-300 ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200' 
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-200'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-rose-500" />
            <span>ถังขยะเอกสาร (Recycle Bin)</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            กู้คืนเอกสารที่ถูกลบชั่วคราว หรือลบออกถาวรจากระบบ
          </p>
        </div>
        <button 
          onClick={fetchRecycleBin} 
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[var(--bg-overlay)] border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)] rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>โหลดข้อมูลใหม่</span>
        </button>
      </div>

      {/* Info Warning banner */}
      <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
        <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400">เงื่อนไขการกู้คืนเอกสาร</h3>
          <p className="text-xs text-amber-700/90 dark:text-amber-500/90 mt-1 leading-relaxed">
            ระบบจะเก็บรักษาเอกสารที่ถูกลบไว้ในถังขยะเป็นเวลา <strong>30 วัน</strong> เพื่อความปลอดภัย หลังจากนั้นระบบจะลบข้อมูลออกจากเซิร์ฟเวอร์โดยอัตโนมัติอย่างถาวรและไม่สามารถกู้คืนได้อีก
          </p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            placeholder="ค้นหาชื่อเอกสาร, เลขที่, ผู้ลบ..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors"
          />
          <span className="absolute left-3 top-3 text-[var(--text-muted)]">
            <Search className="w-4 h-4" />
          </span>
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
              className="absolute right-3 top-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="text-xs text-[var(--text-muted)] shrink-0">
          พบทั้งหมด <span className="font-bold text-[var(--text-primary)]">{filteredItems.length}</span> รายการ
        </div>
      </div>

      {/* Items Table / Card Layout */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="p-12 text-center text-sm text-[var(--text-muted)]">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[var(--primary-color)]/70 mb-3" />
            <span>กำลังโหลดรายการถังขยะ...</span>
          </div>
        ) : paginatedItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-light)] bg-[var(--bg-overlay)]/40 text-xs font-semibold text-[var(--text-secondary)]">
                  <th className="py-3 px-4 sm:px-6">ประเภท</th>
                  <th className="py-3 px-4 sm:px-6">ชื่อเรื่อง / เลขที่เอกสาร</th>
                  <th className="py-3 px-4 sm:px-6 hidden md:table-cell">ลบโดย</th>
                  <th className="py-3 px-4 sm:px-6">วันเวลาที่ลบ</th>
                  <th className="py-3 px-4 sm:px-6 text-center">เวลาที่เหลือ</th>
                  <th className="py-3 px-4 sm:px-6 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-lighter)]/40 text-sm">
                {paginatedItems.map((item) => {
                  const remDays = getRemainingDays(item.deletedAt);
                  return (
                    <tr key={item.id} className="hover:bg-[var(--border-lighter)]/10 transition-colors group">
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        {getDocTypeBadge(item.docType)}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 min-w-[200px]">
                        <div className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] leading-snug line-clamp-2">
                          {item.title}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] font-mono mt-1">
                          เลขที่: {item.docNumber || 'ไม่ระบุ'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 hidden md:table-cell whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.deletedBy}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="text-xs font-medium text-[var(--text-secondary)]">
                          {formatThaiDate(item.deletedAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                          remDays <= 5 
                            ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30' 
                            : 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/30'
                        }`}>
                          เหลืออีก {remDays} วัน
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedItemForRestore(item)}
                            title="กู้คืนเอกสาร"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/15 text-amber-600 rounded border border-amber-500/20 transition-all shadow-sm"
                          >
                            <Undo className="w-3.5 h-3.5" />
                            <span>กู้คืน</span>
                          </button>
                          
                          <button
                            onClick={() => setSelectedItemForDelete(item)}
                            title="ลบออกถาวร"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-rose-500/10 hover:bg-rose-500/15 text-rose-600 rounded border border-rose-500/20 transition-all shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ลบถาวร</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-[var(--text-muted)] flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center border border-dashed border-[var(--border-light)] mb-4">
              <Trash2 className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">ไม่มีเอกสารในถังขยะ</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-xs leading-relaxed">
              เมื่อมีการลบหนังสือราชการหรือเอกสารจากทะเบียน ระบบจะย้ายเอกสารเหล่านั้นมาไว้ที่นี่ชั่วคราว
            </p>
          </div>
        )}

        {/* Pagination controls */}
        {filteredItems.length > 0 && (
          <div className="bg-[var(--bg-overlay)]/20 p-4 border-t border-[var(--border-lighter)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-[var(--text-secondary)]">
              แสดงหน้า <span className="font-semibold">{currentPage}</span> จาก <span className="font-semibold">{totalPages}</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-[var(--border-light)] bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded hover:bg-[var(--border-lighter)] transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs font-semibold px-3 text-[var(--text-primary)]">
                {currentPage}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-[var(--border-light)] bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded hover:bg-[var(--border-lighter)] transition-colors disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Restore Confirm Modal */}
      {selectedItemForRestore && (
        <div id="restore-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-xl max-w-md w-full overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 border border-amber-500/20">
                <Undo className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">ยืนยันการกู้คืนเอกสาร?</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  เอกสารจะถูกย้ายกลับไปลงทะเบียนในระบบตามเดิม
                </p>
              </div>
            </div>

            <div className="bg-[var(--bg-overlay)] p-3.5 rounded-lg border border-[var(--border-light)] text-xs">
              <div className="font-semibold text-[var(--text-primary)] truncate">{selectedItemForRestore.title}</div>
              <div className="text-[var(--text-secondary)] font-mono mt-1">เลขที่เอกสาร: {selectedItemForRestore.docNumber || '-'}</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setSelectedItemForRestore(null)}
                className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)] rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleRestore(selectedItemForRestore)}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                <Undo className="w-3.5 h-3.5" />
                <span>ยืนยันกู้คืน</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Permanent Confirm Modal */}
      {selectedItemForDelete && (
        <div id="delete-permanent-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-xl max-w-md w-full overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">ต้องการลบเอกสารอย่างถาวร?</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5 font-semibold">
                  * คำเตือน: ข้อมูลจะถูกลบออกจากระบบอย่างถาวรและไม่สามารถเรียกคืนได้อีก
                </p>
              </div>
            </div>

            <div className="bg-[var(--bg-overlay)] p-3.5 rounded-lg border border-[var(--border-light)] text-xs">
              <div className="font-semibold text-[var(--text-primary)] truncate">{selectedItemForDelete.title}</div>
              <div className="text-[var(--text-secondary)] font-mono mt-1">เลขที่เอกสาร: {selectedItemForDelete.docNumber || '-'}</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setSelectedItemForDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)] rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handlePermanentDelete(selectedItemForDelete)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันลบถาวร</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
