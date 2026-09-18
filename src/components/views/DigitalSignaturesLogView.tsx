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

      <div className="bg-[var(--bg-overlay)] backdrop-blur-2xl border border-[var(--border-light)] rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all">
        <table className="w-full border-collapse">
            <thead>
                <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-light)] text-[0.75rem] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    <th className="p-4 text-center font-bold w-36">ID บันทึก</th>
                    <th className="p-4 text-center font-bold min-w-[280px]">เอกสารราชการ</th>
                    <th className="p-4 text-center font-bold w-52">ผู้ลงนามดิจิทัล</th>
                    <th className="p-4 text-center font-bold w-52">เวลาตราประทับ (TSA)</th>
                    <th className="p-4 text-center font-bold w-28">การจัดการ</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-lighter)] bg-[var(--bg-overlay)]/30 text-[13px]">
                {logs.length > 0 ? (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-[var(--bg-elevated)]/50 transition-colors group">
                        <td className="p-4 text-xs font-mono font-bold text-[var(--text-secondary)] text-center align-middle">
                          {log.id.slice(0, 8)}...
                        </td>
                        <td className="p-4 font-bold text-[var(--text-primary)] text-left align-middle">
                          {log.docTitle}
                        </td>
                        <td className="p-4 text-[var(--text-secondary)] text-center align-middle font-bold">
                          {log.signerName}
                        </td>
                        <td className="p-4 text-xs font-mono text-[var(--text-secondary)] text-center align-middle font-semibold">
                          {log.timestampIso}
                        </td>
                        <td className="p-4 text-center align-middle">
                          <div className="flex items-center justify-center">
                            <button 
                              onClick={() => deleteLog(log.id)} 
                              className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="ลบประวัติ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-[var(--text-muted)] font-medium">
                      ไม่พบประวัติการลงนามตราประทับดิจิทัลในระบบ
                    </td>
                  </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}
