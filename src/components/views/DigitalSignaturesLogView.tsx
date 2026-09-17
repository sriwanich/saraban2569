import React, { useState, useEffect } from 'react';
import { Trash2, RefreshCw, ShieldCheck, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useConfirm } from '../../context/ConfirmContext';

export default function DigitalSignaturesLogView({ user }: { user?: any }) {
  const { confirm } = useConfirm();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/digital-signatures');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching digital signatures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-[var(--primary-color)]" />
          สมุดบันทึกหลักฐานความถูกต้อง (Digital TSA Logs)
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button 
            type="button"
            onClick={fetchLogs} 
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl text-xs font-bold cursor-pointer transition-all hover:shadow-xs group"
            title="รีเฟรชประวัติการลงนาม"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--primary-color)]' : 'text-[var(--primary-color)] group-hover:rotate-180 transition-transform duration-500'}`}/>
            <span>รีเฟรชประวัติ</span>
          </button>
          {(user?.role === 'admin' || user?.role === 'ผู้ดูแลระบบ') && (
            <button 
              type="button"
              onClick={clearAll} 
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs hover:shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ล้างประวัติทั้งหมด</span>
            </button>
          )}
        </div>
      </div>
      
      {toastMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-md ${toastMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-rose-500/10 border-rose-500/30 text-rose-600'}`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? <CheckCircle2 /> : <AlertTriangle />}
            {toastMessage.text}
          </div>
          <button onClick={() => setToastMessage(null)} className="cursor-pointer"><X className="w-4 h-4"/></button>
        </div>
      )}

      <div className="bg-[var(--bg-surface)] rounded-2xl border overflow-hidden">
        <table className="w-full">
            <thead>
                <tr className="bg-[var(--bg-canvas)] border-b text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    <th className="p-4">ID</th>
                    <th className="p-4">เอกสาร</th>
                    <th className="p-4">ผู้ลงนาม</th>
                    <th className="p-4">เวลา (ISO)</th>
                    <th className="p-4 text-center">จัดการ</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 text-sm">
                        <td className="p-4 text-xs font-mono">{log.id.slice(0, 8)}...</td>
                        <td className="p-4">{log.docTitle}</td>
                        <td className="p-4">{log.signerName}</td>
                        <td className="p-4 text-xs font-mono">{log.timestampIso}</td>
                        <td className="p-4 text-center">
                            <button onClick={() => deleteLog(log.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
