import React, { useState, useEffect } from 'react';
import { 
  Hash, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Bookmark, 
  RotateCcw, 
  FileText, 
  FolderCheck, 
  Search, 
  Filter, 
  RefreshCw,
  Layers,
  Sparkles,
  Info,
  Calendar,
  Building2,
  Tag,
  AlertCircle
} from 'lucide-react';

export default function CustomNumberingSettings() {
  const [activeSubTab, setActiveSubTab] = useState<'rules' | 'fileCodes' | 'reserved'>('rules');
  
  // States for Numbering Rules
  const [rules, setRules] = useState<any[]>([]);
  const [loadingRules, setLoadingRules] = useState<boolean>(true);
  const [showRuleModal, setShowRuleModal] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  // States for File Codes
  const [fileCodes, setFileCodes] = useState<any[]>([]);
  const [loadingFileCodes, setLoadingFileCodes] = useState<boolean>(true);
  const [showFileCodeModal, setShowFileCodeModal] = useState<boolean>(false);

  // States for Reserved Numbers
  const [reservedNumbers, setReservedNumbers] = useState<any[]>([]);
  const [loadingReserved, setLoadingReserved] = useState<boolean>(true);
  const [showReserveModal, setShowReserveModal] = useState<boolean>(false);
  const [reservedFilterDept, setReservedFilterDept] = useState<string>('ALL');
  const [reservedFilterStatus, setReservedFilterStatus] = useState<string>('ALL');

  // Preview calculator state
  const [previewDept, setPreviewDept] = useState<string>('ฝ่ายบริหารงานทั่วไป');
  const [previewDocType, setPreviewDocType] = useState<string>('หนังสือภายนอก');
  const [previewIsCircular, setPreviewIsCircular] = useState<boolean>(false);

  // Notifications
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Form States
  const [ruleFormData, setRuleFormData] = useState<any>({
    ruleName: '',
    department: 'ฝ่ายบริหารงานทั่วไป',
    divisionCode: '0021',
    docType: 'หนังสือภายนอก',
    prefixPattern: 'รย 0021',
    currentSeq: 1,
    year: '2569',
    isActive: true,
    description: ''
  });

  const [fileCodeFormData, setFileCodeFormData] = useState<any>({
    code: '',
    name: '',
    department: 'ฝ่ายบริหารงานทั่วไป',
    description: ''
  });

  const [reserveFormData, setReserveFormData] = useState<any>({
    ruleId: '',
    department: 'ฝ่ายบริหารงานทั่วไป',
    docType: 'หนังสือภายนอก',
    prefix: 'รย 0021',
    startSeq: 1,
    count: 1,
    isCircular: false,
    reservedBy: 'ผู้ดูแลระบบสารบรรณ',
    reservedFor: 'จองเลขล่วงหน้าสำหรับโครงการสำคัญ',
    expiresAt: '2026-12-31'
  });

  const showNotification = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch Data Functions
  const fetchRules = async () => {
    setLoadingRules(true);
    try {
      const res = await fetch('/api/numbering-rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRules(false);
    }
  };

  const fetchFileCodes = async () => {
    setLoadingFileCodes(true);
    try {
      const res = await fetch('/api/file-codes');
      if (res.ok) {
        const data = await res.json();
        setFileCodes(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFileCodes(false);
    }
  };

  const fetchReservedNumbers = async () => {
    setLoadingReserved(true);
    try {
      const res = await fetch('/api/reserved-numbers');
      if (res.ok) {
        const data = await res.json();
        setReservedNumbers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReserved(false);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchFileCodes();
    fetchReservedNumbers();
  }, []);

  // Save/Update Rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingRule ? `/api/numbering-rules/${editingRule.id}` : '/api/numbering-rules';
      const method = editingRule ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleFormData)
      });
      if (res.ok) {
        showNotification('success', editingRule ? 'อัปเดตกฎการออกเลขเรียบร้อย' : 'เพิ่มกฎการออกเลขใหม่เรียบร้อย');
        setShowRuleModal(false);
        setEditingRule(null);
        fetchRules();
      } else {
        showNotification('error', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err) {
      showNotification('error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!window.confirm('คุณต้องการลบกฎการออกเลขนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/numbering-rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('success', 'ลบกฎการออกเลขเรียบร้อยแล้ว');
        fetchRules();
      }
    } catch (err) {
      showNotification('error', 'เกิดข้อผิดพลาดในการลบกฎ');
    }
  };

  // Save File Code
  const handleSaveFileCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/file-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fileCodeFormData)
      });
      if (res.ok) {
        showNotification('success', 'เพิ่มรหัสหมวดแฟ้มเรียบร้อยแล้ว');
        setShowFileCodeModal(false);
        setFileCodeFormData({ code: '', name: '', department: 'ฝ่ายบริหารงานทั่วไป', description: '' });
        fetchFileCodes();
      }
    } catch (err) {
      showNotification('error', 'เกิดข้อผิดพลาดในการบันทึกรหัสแฟ้ม');
    }
  };

  const handleDeleteFileCode = async (id: number) => {
    if (!window.confirm('คุณต้องการลบรหัสหมวดแฟ้มนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/file-codes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('success', 'ลบรหัสหมวดแฟ้มเรียบร้อย');
        fetchFileCodes();
      }
    } catch (err) {
      showNotification('error', 'เกิดข้อผิดพลาดในการลบ');
    }
  };

  // Reserve Numbers
  const handleReserveNumbers = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/reserved-numbers/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reserveFormData)
      });
      if (res.ok) {
        showNotification('success', `สำรอง/จองเลขหนังสือเรียบร้อยแล้วจำนวน ${reserveFormData.count} เลข`);
        setShowReserveModal(false);
        fetchReservedNumbers();
        fetchRules();
      }
    } catch (err) {
      showNotification('error', 'เกิดข้อผิดพลาดในการจองเลข');
    }
  };

  // Compute Live Demo Generated Number
  const getDemoGeneratedNumber = () => {
    const matchedRule = rules.find(r => 
      r.isActive && 
      r.docType === previewDocType && 
      (r.department === previewDept || r.department === 'ทุกฝ่ายงาน')
    ) || rules.find(r => r.isActive && r.docType === previewDocType);

    if (!matchedRule) {
      return ['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง'].includes(previewDocType) ? `${previewDocType} 1/2569` : 'รย 0021/1';
    }

    const nextSeq = (matchedRule.currentSeq || 0) + 1;
    if (['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง'].includes(previewDocType)) {
      return `${matchedRule.prefixPattern || previewDocType} ${nextSeq}/${matchedRule.year || '2569'}`;
    } else {
      const circ = previewIsCircular ? 'ว ' : '';
      return `${matchedRule.prefixPattern || 'รย 0021'}/${circ}${nextSeq}`;
    }
  };

  // Filtered Reserved Numbers
  const filteredReserved = reservedNumbers.filter(item => {
    const matchDept = reservedFilterDept === 'ALL' || item.department === reservedFilterDept;
    const matchStatus = reservedFilterStatus === 'ALL' || item.status === reservedFilterStatus;
    return matchDept && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2 animate-bounce-short text-sm font-medium ${
          toastMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          {toastMsg.text}
        </div>
      )}

      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400">
              <Hash className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              ระบบตั้งค่าเลขที่หนังสือและรหัสแฟ้มแบบกำหนดเอง
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] pl-9">
            กำหนดรูปแบบรหัสหนังสือรับ-ส่ง คำสั่ง ประกาศ และรหัสแฟ้มจำแนกตาม กอง/ฝ่าย/ประเภทหนังสือ พร้อมคลังเลขสำรองและเลขคืน
          </p>
        </div>

        {/* Action Button depending on subtab */}
        <div className="flex items-center gap-2 pl-9 md:pl-0">
          {activeSubTab === 'rules' && (
            <button
              onClick={() => {
                setEditingRule(null);
                setRuleFormData({
                  ruleName: '',
                  department: 'ฝ่ายบริหารงานทั่วไป',
                  divisionCode: '0021',
                  docType: 'หนังสือภายนอก',
                  prefixPattern: 'รย 0021',
                  currentSeq: 1,
                  year: '2569',
                  isActive: true,
                  description: ''
                });
                setShowRuleModal(true);
              }}
              className="px-4 py-2 bg-[var(--primary-color)] text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> เพิ่มกฎออกเลขใหม่
            </button>
          )}

          {activeSubTab === 'fileCodes' && (
            <button
              onClick={() => setShowFileCodeModal(true)}
              className="px-4 py-2 bg-[var(--primary-color)] text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> เพิ่มรหัสหมวดแฟ้ม
            </button>
          )}

          {activeSubTab === 'reserved' && (
            <button
              onClick={() => setShowReserveModal(true)}
              className="px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
            >
              <Bookmark className="w-4 h-4" /> สำรอง/จองเลขหนังสือ
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-[var(--border-light)] gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveSubTab('rules')}
          className={`px-4 py-2.5 rounded-xl font-medium text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'rules'
              ? 'bg-[var(--primary-color)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)]'
          }`}
        >
          <Layers className="w-4 h-4" />
          กฎกำหนดเลขหนังสือตาม กอง/ฝ่าย
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeSubTab === 'rules' ? 'bg-white/20 text-white' : 'bg-[var(--border-light)] text-[var(--text-muted)]'}`}>
            {rules.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('fileCodes')}
          className={`px-4 py-2.5 rounded-xl font-medium text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'fileCodes'
              ? 'bg-[var(--primary-color)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)]'
          }`}
        >
          <FolderCheck className="w-4 h-4" />
          รหัสหมวดแฟ้มเอกสาร
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeSubTab === 'fileCodes' ? 'bg-white/20 text-white' : 'bg-[var(--border-light)] text-[var(--text-muted)]'}`}>
            {fileCodes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('reserved')}
          className={`px-4 py-2.5 rounded-xl font-medium text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'reserved'
              ? 'bg-[var(--primary-color)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)]'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          คลังเลขสำรอง / เลขจอง / เลขคืน
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeSubTab === 'reserved' ? 'bg-white/20 text-white' : 'bg-[var(--border-light)] text-[var(--text-muted)]'}`}>
            {reservedNumbers.filter(r => r.status === 'available').length}
          </span>
        </button>
      </div>

      {/* ================= TAB 1: RULES ================= */}
      {activeSubTab === 'rules' && (
        <div className="space-y-6">
          {/* Interactive Live Generator Simulator */}
          <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-light)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--primary-color)] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> จำลองการออกเลขหนังสือจริง (Live Pattern Preview)
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                ตรวจสอบผลลัพธ์ตามกฎที่ตั้งไว้
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">เลือกฝ่าย/กอง:</label>
                <select
                  value={previewDept}
                  onChange={(e) => setPreviewDept(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                >
                  <option value="ฝ่ายบริหารงานทั่วไป">ฝ่ายบริหารงานทั่วไป</option>
                  <option value="ฝ่ายยุทธศาสตร์และการจัดการ">ฝ่ายยุทธศาสตร์และการจัดการ</option>
                  <option value="ฝ่ายสงเคราะห์ผู้ประสบภัย">ฝ่ายสงเคราะห์ผู้ประสบภัย</option>
                  <option value="ฝ่ายป้องกันและปฏิบัติการ">ฝ่ายป้องกันและปฏิบัติการ</option>
                  <option value="ทุกฝ่ายงาน">ทุกฝ่ายงาน (ส่วนกลาง)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">ประเภทหนังสือ:</label>
                <select
                  value={previewDocType}
                  onChange={(e) => setPreviewDocType(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                >
                  <option value="หนังสือภายนอก">หนังสือภายนอก (ส่งออก)</option>
                  <option value="หนังสือภายใน">หนังสือภายใน (บันทึกข้อความ)</option>
                  <option value="คำสั่ง">คำสั่ง</option>
                  <option value="ประกาศ">ประกาศ</option>
                  <option value="หนังสือรับรอง">หนังสือรับรอง</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="previewCirc"
                  checked={previewIsCircular}
                  onChange={(e) => setPreviewIsCircular(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--primary-color)] cursor-pointer"
                />
                <label htmlFor="previewCirc" className="text-xs text-[var(--text-primary)] cursor-pointer">
                  หนังสือเวียน (เติม "ว")
                </label>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">เลขหนังสือที่ระบบสร้างถัดไป:</span>
                <span className="text-sm font-bold font-mono text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded bg-amber-200/50 dark:bg-amber-900/50">
                  {getDemoGeneratedNumber()}
                </span>
              </div>
              <span className="text-[10px] text-amber-700 dark:text-amber-400">
                ปี พ.ศ. 2569 | รันต่อตามลำดับ
              </span>
            </div>
          </div>

          {/* Rules Table */}
          <div className="border border-[var(--border-light)] rounded-2xl overflow-hidden bg-[var(--bg-surface)]">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-canvas)]">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <Hash className="w-4 h-4 text-[var(--primary-color)]" />
                รายการกฎออกเลขหนังสือที่เปิดใช้งาน ({rules.length})
              </h3>
              <button 
                onClick={fetchRules}
                className="p-1.5 rounded-lg hover:bg-[var(--border-lighter)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {loadingRules ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[var(--primary-color)]" /> กำลังโหลดกฎออกเลข...
              </div>
            ) : rules.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                ยังไม่มีกฎออกเลขในระบบ กดปุ่ม "เพิ่มกฎออกเลขใหม่" เพื่อเริ่มต้น
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-canvas)] text-[var(--text-muted)] border-b border-[var(--border-light)] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">ชื่อกฎออกเลข</th>
                      <th className="px-4 py-3">ฝ่าย/กอง</th>
                      <th className="px-4 py-3">ประเภทหนังสือ</th>
                      <th className="px-4 py-3">รหัส/คำนำหน้า</th>
                      <th className="px-4 py-3 text-center">ลำดับปัจจุบัน</th>
                      <th className="px-4 py-3 text-center">สถานะ</th>
                      <th className="px-4 py-3 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)]">
                    {rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-[var(--border-lighter)] transition-colors">
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                          {rule.ruleName}
                          {rule.description && (
                            <p className="text-[11px] text-[var(--text-muted)] font-normal">{rule.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          <span className="inline-flex items-center gap-1 bg-[var(--bg-canvas)] px-2 py-0.5 rounded border border-[var(--border-light)] text-[11px]">
                            <Building2 className="w-3 h-3 text-[var(--primary-color)]" />
                            {rule.department}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)] font-medium">
                          {rule.docType}
                        </td>
                        <td className="px-4 py-3 font-mono text-[var(--primary-color)] font-bold">
                          {rule.prefixPattern}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-[var(--text-primary)]">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            {rule.currentSeq}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {rule.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> เปิดใช้งาน
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" /> ปิดใช้งาน
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingRule(rule);
                                setRuleFormData({ ...rule });
                                setShowRuleModal(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-600 transition-colors"
                              title="แก้ไขกฎ"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 transition-colors"
                              title="ลบกฎ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: FILE CODES ================= */}
      {activeSubTab === 'fileCodes' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-blue-900 dark:text-blue-200">เกี่ยวกับรหัสหมวดแฟ้มเอกสาร</h4>
              <p className="text-blue-800 dark:text-blue-300">
                รหัสหมวดแฟ้มช่วยจำแนกหมวดหมู่งานตามโครงสร้างการจัดเก็บเอกสารสารบรรณ เช่น <code className="font-mono bg-blue-200/50 dark:bg-blue-900/50 px-1 rounded">0021</code> (งานบริหารทั่วไป), <code className="font-mono bg-blue-200/50 dark:bg-blue-900/50 px-1 rounded">0021.1</code> (งานยุทธศาสตร์), <code className="font-mono bg-blue-200/50 dark:bg-blue-900/50 px-1 rounded">0021.2</code> (งานสงเคราะห์), <code className="font-mono bg-blue-200/50 dark:bg-blue-900/50 px-1 rounded">0021.3</code> (งานป้องกัน)
              </p>
            </div>
          </div>

          <div className="border border-[var(--border-light)] rounded-2xl overflow-hidden bg-[var(--bg-surface)]">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-canvas)]">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <FolderCheck className="w-4 h-4 text-[var(--primary-color)]" />
                ตารางรหัสหมวดแฟ้มเอกสารทั้งหมด ({fileCodes.length})
              </h3>
              <button 
                onClick={fetchFileCodes}
                className="p-1.5 rounded-lg hover:bg-[var(--border-lighter)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {loadingFileCodes ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[var(--primary-color)]" /> กำลังโหลดรหัสหมวดแฟ้ม...
              </div>
            ) : fileCodes.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                ยังไม่มีรหัสหมวดแฟ้มในระบบ
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-canvas)] text-[var(--text-muted)] border-b border-[var(--border-light)] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">รหัสหมวดแฟ้ม</th>
                      <th className="px-4 py-3">ชื่อหมวดงาน</th>
                      <th className="px-4 py-3">ฝ่าย/กองที่รับผิดชอบ</th>
                      <th className="px-4 py-3">คำอธิบายรายละเอียด</th>
                      <th className="px-4 py-3 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)]">
                    {fileCodes.map((item) => (
                      <tr key={item.id} className="hover:bg-[var(--border-lighter)] transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                          {item.code}
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          <span className="inline-flex items-center gap-1 bg-[var(--bg-canvas)] px-2 py-0.5 rounded border border-[var(--border-light)] text-[11px]">
                            <Building2 className="w-3 h-3 text-[var(--primary-color)]" />
                            {item.department}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">
                          {item.description || '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteFileCode(item.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 transition-colors"
                            title="ลบรหัสหมวดแฟ้ม"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: RESERVED NUMBERS ================= */}
      {activeSubTab === 'reserved' && (
        <div className="space-y-6">
          {/* Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface)] flex items-center gap-3">
              <span className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
                <Bookmark className="w-5 h-5" />
              </span>
              <div>
                <p className="text-[11px] text-[var(--text-muted)] font-medium">เลขจอง/เลขสำรองพร้อมใช้งาน</p>
                <p className="text-xl font-bold font-mono text-[var(--text-primary)]">
                  {reservedNumbers.filter(r => r.status === 'available').length} <span className="text-xs font-normal text-[var(--text-muted)]">รายการ</span>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface)] flex items-center gap-3">
              <span className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <p className="text-[11px] text-[var(--text-muted)] font-medium">ถูกนำไปออกหนังสือแล้ว</p>
                <p className="text-xl font-bold font-mono text-[var(--text-primary)]">
                  {reservedNumbers.filter(r => r.status === 'used').length} <span className="text-xs font-normal text-[var(--text-muted)]">รายการ</span>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface)] flex items-center gap-3">
              <span className="p-3 rounded-xl bg-purple-500/10 text-purple-600">
                <RotateCcw className="w-5 h-5" />
              </span>
              <div>
                <p className="text-[11px] text-[var(--text-muted)] font-medium">เลขคืนจากเอกสารที่ยกเลิก</p>
                <p className="text-xl font-bold font-mono text-[var(--text-primary)]">
                  {reservedNumbers.filter(r => r.type === 'reclaimed' && r.status === 'available').length} <span className="text-xs font-normal text-[var(--text-muted)]">รายการ</span>
                </p>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-light)] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <Filter className="w-3.5 h-3.5" /> กรองตามฝ่าย:
              </div>
              <select
                value={reservedFilterDept}
                onChange={(e) => setReservedFilterDept(e.target.value)}
                className="p-1.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
              >
                <option value="ALL">ทุกฝ่ายงาน</option>
                <option value="ฝ่ายบริหารงานทั่วไป">ฝ่ายบริหารงานทั่วไป</option>
                <option value="ฝ่ายยุทธศาสตร์และการจัดการ">ฝ่ายยุทธศาสตร์และการจัดการ</option>
                <option value="ฝ่ายสงเคราะห์ผู้ประสบภัย">ฝ่ายสงเคราะห์ผู้ประสบภัย</option>
                <option value="ฝ่ายป้องกันและปฏิบัติการ">ฝ่ายป้องกันและปฏิบัติการ</option>
              </select>

              <div className="flex items-center gap-1.5 text-[var(--text-muted)] ml-2">
                สถานะ:
              </div>
              <select
                value={reservedFilterStatus}
                onChange={(e) => setReservedFilterStatus(e.target.value)}
                className="p-1.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
              >
                <option value="ALL">ทุกสถานะ</option>
                <option value="available">พร้อมใช้งาน</option>
                <option value="used">ใช้งานแล้ว</option>
              </select>
            </div>

            <button
              onClick={fetchReservedNumbers}
              className="px-3 py-1.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg hover:bg-[var(--border-lighter)] flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> รีเฟรช
            </button>
          </div>

          {/* Table */}
          <div className="border border-[var(--border-light)] rounded-2xl overflow-hidden bg-[var(--bg-surface)]">
            {loadingReserved ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[var(--primary-color)]" /> กำลังโหลดคลังเลขสำรอง...
              </div>
            ) : filteredReserved.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                ไม่พบเลขจองหรือเลขสำรองตามเงื่อนไขที่เลือก
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-canvas)] text-[var(--text-muted)] border-b border-[var(--border-light)] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">เลขหนังสือ</th>
                      <th className="px-4 py-3">ประเภท</th>
                      <th className="px-4 py-3">ฝ่าย/กอง & ประเภทเอกสาร</th>
                      <th className="px-4 py-3">ผู้จอง / วัตถุประสงค์</th>
                      <th className="px-4 py-3">วันหมดอายุ</th>
                      <th className="px-4 py-3 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)]">
                    {filteredReserved.map((item) => (
                      <tr key={item.id} className="hover:bg-[var(--border-lighter)] transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[var(--primary-color)] text-sm">
                          {item.numberString}
                        </td>
                        <td className="px-4 py-3">
                          {item.type === 'reclaimed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                              <RotateCcw className="w-3 h-3" /> เลขคืนจากลบ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                              <Bookmark className="w-3 h-3" /> จองล่วงหน้า
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--text-primary)]">{item.department}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{item.docType}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--text-primary)]">{item.reservedBy}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{item.reservedFor}</p>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)] font-mono">
                          {item.expiresAt || 'ไม่มีกำหนด'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.status === 'available' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> พร้อมใช้งาน
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                              <FileText className="w-3 h-3" /> ออกเอกสารแล้ว
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD/EDIT NUMBERING RULE */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-canvas)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Hash className="w-4 h-4 text-[var(--primary-color)]" />
                {editingRule ? 'แก้ไขกฎการออกเลข' : 'เพิ่มกฎการออกเลขหนังสือใหม่'}
              </h3>
              <button
                onClick={() => setShowRuleModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--border-lighter)] text-[var(--text-muted)]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">
                  ชื่อกฎออกเลข <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={ruleFormData.ruleName}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, ruleName: e.target.value })}
                  placeholder="เช่น หนังสือส่งออก-ฝ่ายบริหารงานทั่วไป (รย 0021)"
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none focus:border-[var(--primary-color)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">ฝ่าย/กองที่ใช้กฎนี้:</label>
                  <select
                    value={ruleFormData.department}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, department: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                  >
                    <option value="ฝ่ายบริหารงานทั่วไป">ฝ่ายบริหารงานทั่วไป</option>
                    <option value="ฝ่ายยุทธศาสตร์และการจัดการ">ฝ่ายยุทธศาสตร์และการจัดการ</option>
                    <option value="ฝ่ายสงเคราะห์ผู้ประสบภัย">ฝ่ายสงเคราะห์ผู้ประสบภัย</option>
                    <option value="ฝ่ายป้องกันและปฏิบัติการ">ฝ่ายป้องกันและปฏิบัติการ</option>
                    <option value="ทุกฝ่ายงาน">ทุกฝ่ายงาน (ส่วนกลาง)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">ประเภทหนังสือ:</label>
                  <select
                    value={ruleFormData.docType}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, docType: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                  >
                    <option value="หนังสือภายนอก">หนังสือภายนอก</option>
                    <option value="หนังสือภายใน">หนังสือภายใน</option>
                    <option value="คำสั่ง">คำสั่ง</option>
                    <option value="ประกาศ">ประกาศ</option>
                    <option value="หนังสือรับรอง">หนังสือรับรอง</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">
                    รหัสคำนำหน้า (Prefix):
                  </label>
                  <input
                    required
                    type="text"
                    value={ruleFormData.prefixPattern}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, prefixPattern: e.target.value })}
                    placeholder="เช่น รย 0021, คำสั่ง, ประกาศ"
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none font-mono font-bold text-[var(--primary-color)]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">
                    ลำดับล่าสุด (Current Sequence):
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={ruleFormData.currentSeq}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, currentSeq: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">คำอธิบายเพิ่มเติม:</label>
                <textarea
                  rows={2}
                  value={ruleFormData.description}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, description: e.target.value })}
                  placeholder="เช่น รหัสออกเลขหนังสือของฝ่ายบริหารงานทั่วไป..."
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="ruleActive"
                  checked={ruleFormData.isActive}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, isActive: e.target.checked })}
                  className="w-4 h-4 accent-[var(--primary-color)] cursor-pointer"
                />
                <label htmlFor="ruleActive" className="font-semibold text-[var(--text-primary)] cursor-pointer">
                  เปิดใช้งานกฎนี้ทันที
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-light)]">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--primary-color)] text-white font-semibold shadow-sm hover:opacity-90"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD FILE CODE */}
      {showFileCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-canvas)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FolderCheck className="w-4 h-4 text-[var(--primary-color)]" />
                เพิ่มรหัสหมวดแฟ้มเอกสารใหม่
              </h3>
              <button
                onClick={() => setShowFileCodeModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--border-lighter)] text-[var(--text-muted)]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFileCode} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">
                  รหัสหมวดแฟ้ม <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={fileCodeFormData.code}
                  onChange={(e) => setFileCodeFormData({ ...fileCodeFormData, code: e.target.value })}
                  placeholder="เช่น 0021, 0021.1, 0022"
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none font-mono font-bold text-amber-700"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">
                  ชื่อหมวดงาน <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={fileCodeFormData.name}
                  onChange={(e) => setFileCodeFormData({ ...fileCodeFormData, name: e.target.value })}
                  placeholder="เช่น งานยุทธศาสตร์และแผนงาน"
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">ฝ่าย/กองที่รับผิดชอบ:</label>
                <select
                  value={fileCodeFormData.department}
                  onChange={(e) => setFileCodeFormData({ ...fileCodeFormData, department: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                >
                  <option value="ฝ่ายบริหารงานทั่วไป">ฝ่ายบริหารงานทั่วไป</option>
                  <option value="ฝ่ายยุทธศาสตร์และการจัดการ">ฝ่ายยุทธศาสตร์และการจัดการ</option>
                  <option value="ฝ่ายสงเคราะห์ผู้ประสบภัย">ฝ่ายสงเคราะห์ผู้ประสบภัย</option>
                  <option value="ฝ่ายป้องกันและปฏิบัติการ">ฝ่ายป้องกันและปฏิบัติการ</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">รายละเอียดเพิ่มเติม:</label>
                <textarea
                  rows={2}
                  value={fileCodeFormData.description}
                  onChange={(e) => setFileCodeFormData({ ...fileCodeFormData, description: e.target.value })}
                  placeholder="รายละเอียดเอกสารในหมวดนี้..."
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-light)]">
                <button
                  type="button"
                  onClick={() => setShowFileCodeModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--primary-color)] text-white font-semibold shadow-sm hover:opacity-90"
                >
                  เพิ่มรหัสหมวดแฟ้ม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESERVE NUMBERS */}
      {showReserveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-canvas)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-600" />
                สำรอง / จองเลขหนังสือล่วงหน้า
              </h3>
              <button
                onClick={() => setShowReserveModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--border-lighter)] text-[var(--text-muted)]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReserveNumbers} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">ฝ่าย/กองที่สำรองเลข:</label>
                  <select
                    value={reserveFormData.department}
                    onChange={(e) => setReserveFormData({ ...reserveFormData, department: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                  >
                    <option value="ฝ่ายบริหารงานทั่วไป">ฝ่ายบริหารงานทั่วไป</option>
                    <option value="ฝ่ายยุทธศาสตร์และการจัดการ">ฝ่ายยุทธศาสตร์และการจัดการ</option>
                    <option value="ฝ่ายสงเคราะห์ผู้ประสบภัย">ฝ่ายสงเคราะห์ผู้ประสบภัย</option>
                    <option value="ฝ่ายป้องกันและปฏิบัติการ">ฝ่ายป้องกันและปฏิบัติการ</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">ประเภทหนังสือ:</label>
                  <select
                    value={reserveFormData.docType}
                    onChange={(e) => setReserveFormData({ ...reserveFormData, docType: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                  >
                    <option value="หนังสือภายนอก">หนังสือภายนอก</option>
                    <option value="คำสั่ง">คำสั่ง</option>
                    <option value="ประกาศ">ประกาศ</option>
                    <option value="หนังสือรับรอง">หนังสือรับรอง</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">คำนำหน้า (Prefix):</label>
                  <input
                    type="text"
                    value={reserveFormData.prefix}
                    onChange={(e) => setReserveFormData({ ...reserveFormData, prefix: e.target.value })}
                    placeholder="รย 0021"
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] font-mono font-bold text-amber-700 outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">เลขเริ่มต้น:</label>
                  <input
                    type="number"
                    min="1"
                    value={reserveFormData.startSeq}
                    onChange={(e) => setReserveFormData({ ...reserveFormData, startSeq: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">จำนวนที่จอง (ฉบับ):</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={reserveFormData.count}
                    onChange={(e) => setReserveFormData({ ...reserveFormData, count: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] font-mono font-bold text-[var(--primary-color)] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reserveCirc"
                  checked={reserveFormData.isCircular}
                  onChange={(e) => setReserveFormData({ ...reserveFormData, isCircular: e.target.checked })}
                  className="w-4 h-4 accent-amber-600 cursor-pointer"
                />
                <label htmlFor="reserveCirc" className="font-semibold text-[var(--text-primary)] cursor-pointer">
                  เป็นหนังสือเวียน (ใส่ "ว" นำหน้าเลข)
                </label>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">ผู้จอง / เจ้าของเรื่อง:</label>
                <input
                  type="text"
                  value={reserveFormData.reservedBy}
                  onChange={(e) => setReserveFormData({ ...reserveFormData, reservedBy: e.target.value })}
                  placeholder="ชื่อ-นามสกุล หรือชื่อโครงการ"
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">เหตุผล / วัตถุประสงค์การจอง:</label>
                <textarea
                  rows={2}
                  value={reserveFormData.reservedFor}
                  onChange={(e) => setReserveFormData({ ...reserveFormData, reservedFor: e.target.value })}
                  placeholder="ระบุเหตุผลการจองเลข..."
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-light)]">
                <button
                  type="button"
                  onClick={() => setShowReserveModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 text-white font-semibold shadow-sm hover:opacity-90"
                >
                  ยืนยันการจองเลข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
