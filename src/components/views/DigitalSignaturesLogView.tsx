import React, { useState, useEffect } from 'react';
import { Trash2, RefreshCw, ShieldCheck, X, AlertTriangle, CheckCircle2, Search, Download, QrCode, Copy, Check, FileText, KeyRound, Clock } from 'lucide-react';
import { useConfirm } from '../../context/ConfirmContext';
import { formatThaiDateTime } from '../../types';

interface Props {
  user?: any;
  onViewCertificate?: (log: any) => void;
}

export default function DigitalSignaturesLogView({ user, onViewCertificate }: Props) {
  const { confirm } = useConfirm();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let res = await fetch('/api/digital-signatures');
      if (!res.ok) {
        res = await fetch('/api/digital-signatures/list');
      }
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } else {
        setLogs([]);
      }
    } catch (err) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleCopyHash = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteLog = async (id: string) => {
    const confirmed = await confirm({
      title: 'ยืนยันการลบประวัติลายมือชื่อดิจิทัล',
      message: 'คุณต้องการลบรายการประวัติการลงลายมือชื่อดิจิทัลนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนคืนได้',
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/digital-signatures/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLogs();
        setToastMessage({ type: 'success', text: 'ลบรายการเรียบร้อยแล้ว' });
      } else {
        setToastMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการลบรายการ' });
      }
    } catch (err) {
      setToastMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    }
  };

  const clearAll = async () => {
    const confirmed = await confirm({
      title: 'ยืนยันการลบประวัติลายมือชื่อทั้งหมด',
      message: 'คุณต้องการล้างประวัติการลงลายมือชื่อดิจิทัลทั้งหมดในระบบใช่หรือไม่? ข้อมูลทั้งหมดจะถูกลบอย่างถาวร',
      type: 'delete',
      confirmText: 'ยืนยันการล้างทั้งหมด',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;
    try {
      const res = await fetch('/api/digital-signatures', { method: 'DELETE' });
      if (res.ok) {
        fetchLogs();
        setToastMessage({ type: 'success', text: 'ลบประวัติทั้งหมดเรียบร้อยแล้ว' });
      } else {
        setToastMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการลบประวัติทั้งหมด' });
      }
    } catch (err) {
      setToastMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.docTitle && log.docTitle.toLowerCase().includes(q)) ||
      (log.docNumber && log.docNumber.toLowerCase().includes(q)) ||
      (log.signerName && log.signerName.toLowerCase().includes(q)) ||
      (log.signerPosition && log.signerPosition.toLowerCase().includes(q)) ||
      (log.certificateSerial && log.certificateSerial.toLowerCase().includes(q)) ||
      (log.documentHash && log.documentHash.toLowerCase().includes(q)) ||
      (log.id && log.id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="p-5 sm:p-6 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-lighter)] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span>สมุดบันทึกหลักฐานตราเวลา (Digital TSA Audit Trail)</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              บันทึกรหัสกุญแจตรวจสอบความถูกต้อง ตราประทับเวลาสากล และประวัติการลงลายมือชื่อที่ตรวจสอบได้ตามกฎหมาย
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button 
              type="button"
              onClick={fetchLogs} 
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl text-xs font-bold cursor-pointer transition-all hover:shadow-xs active:scale-95"
              title="รีเฟรชประวัติการลงนาม"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-indigo-600'}`}/>
              <span>รีเฟรชประวัติ ({logs.length})</span>
            </button>
            {(user?.role === 'admin' || user?.role === 'ผู้ดูแลระบบ') && logs.length > 0 && (
              <button 
                type="button"
                onClick={clearAll} 
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs hover:shadow-sm active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ล้างประวัติทั้งหมด</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาตามชื่อเรื่อง, เลขที่หนังสือ, ผู้ลงนาม, Certificate Serial หรือ SHA-256..."
            className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-light)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-[var(--text-muted)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {toastMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-md animate-fade-in ${
          toastMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
            {toastMessage.text}
          </div>
          <button onClick={() => setToastMessage(null)} className="cursor-pointer text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4"/>
          </button>
        </div>
      )}

      {/* Audit Trail Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-light)] text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-28">รหัสบันทึก</th>
                <th className="py-3.5 px-4 min-w-[240px]">เอกสารราชการ</th>
                <th className="py-3.5 px-4 min-w-[180px]">ผู้ลงนามดิจิทัล</th>
                <th className="py-3.5 px-4 min-w-[160px]">เวลาตราประทับ (TSA)</th>
                <th className="py-3.5 px-4 min-w-[200px]">SHA-256 Hash</th>
                <th className="py-3.5 px-4 text-center w-36">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-lighter)] text-xs">
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[var(--bg-elevated)]/40 transition-colors group">
                    <td className="py-3.5 px-4 text-center align-middle">
                      <span className="font-mono text-[10px] font-bold px-2 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-light)]">
                        {log.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 align-middle space-y-1">
                      <div className="font-bold text-[var(--text-primary)] line-clamp-1">
                        {log.docTitle}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{log.docNumber || `DOC-${log.docId}`}</span>
                        {log.certificateSerial && (
                          <span className="font-mono truncate max-w-[140px]">Serial: {log.certificateSerial}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-middle space-y-0.5">
                      <div className="font-bold text-[var(--text-primary)]">
                        {log.signerName}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {log.signerPosition || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                        <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="text-[11px] whitespace-nowrap">
                          {log.timestampFormatted || (log.timestampIso ? formatThaiDateTime(log.timestampIso) : '-')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 align-middle">
                      {log.documentHash ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-[var(--text-muted)] truncate max-w-[130px] bg-[var(--bg-elevated)] px-2 py-1 rounded border border-[var(--border-light)]">
                            {log.documentHash.slice(0, 16)}...
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyHash(log.documentHash, log.id)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                            title="คัดลอก SHA-256 Hash"
                          >
                            {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                        {onViewCertificate && (
                          <button
                            type="button"
                            onClick={() => onViewCertificate(log)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                            title="ดูใบรับรอง & ตราประทับ"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        )}
                        <a
                          href={`/api/digital-signatures/download-pdf/${log.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                          title="ดาวน์โหลด PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {(user?.role === 'admin' || user?.role === 'ผู้ดูแลระบบ') && (
                          <button 
                            type="button"
                            onClick={() => deleteLog(log.id)} 
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="ลบรายการ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center space-y-2.5">
                      <div className="p-3 bg-[var(--bg-elevated)] rounded-full text-[var(--text-muted)]">
                        <FileText className="w-8 h-8 opacity-40" />
                      </div>
                      <p className="text-xs sm:text-sm font-semibold">
                        {searchQuery ? 'ไม่พบบันทึกหลักฐานที่ตรงกับเงื่อนไขค้นหา' : 'ยังไม่มีประวัติการลงนามตราประทับดิจิทัลในระบบ'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

