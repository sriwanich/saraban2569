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
  AlertCircle,
  Clock,
  Zap,
  Play
} from 'lucide-react';
import { ReservedNumber, ScheduledReservation, formatThaiDateString } from '../types';
import { useConfirm } from '../context/ConfirmContext';

export default function CustomNumberingSettings() {
  const { confirm } = useConfirm();
  const [activeSubTab, setActiveSubTab] = useState<'rules' | 'fileCodes' | 'reserved' | 'scheduled'>('rules');
  const [systemCurrentYear, setSystemCurrentYear] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('moi_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentYear) return String(parsed.currentYear);
      }
    } catch (e) {}
    return '2569';
  });
  
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
  const [reservedFilterDocType, setReservedFilterDocType] = useState<string>('ALL');
  const [reservedFilterDate, setReservedFilterDate] = useState<string>('');
  const [reservedSearchTerm, setReservedSearchTerm] = useState<string>('');

  // States for Scheduled Auto-Reservations
  const [scheduledReservations, setScheduledReservations] = useState<any[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState<boolean>(true);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [runningScheduleId, setRunningScheduleId] = useState<number | null>(null);

  const [scheduleFormData, setScheduleFormData] = useState<any>({
    name: 'จองเลขหนังสือส่งประจำวัน (รอบ 18.00 น.)',
    department: 'ฝ่ายบริหารงานทั่วไป',
    docType: 'หนังสือภายนอก',
    prefix: 'รย 0021',
    count: 5,
    scheduleType: 'daily',
    scheduledTime: '18:00',
    reservedFor: 'จองเลขอัตโนมัติทุกวัน เวลา 18:00 น. สำหรับออกหนังสือรับ-ส่งช่วงเย็น',
    reservedBy: 'ระบบอัตโนมัติ (Schedule 18:00)',
    dateOption: 'current_date',
    specificDate: '',
    isActive: true
  });

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
    year: systemCurrentYear,
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
    reservedDate: new Date().toISOString().split('T')[0],
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

  const fetchScheduled = async () => {
    setLoadingScheduled(true);
    try {
      const res = await fetch('/api/scheduled-reservations');
      if (res.ok) {
        const data = await res.json();
        setScheduledReservations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingScheduled(false);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.currentYear) {
          setSystemCurrentYear(String(data.currentYear));
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  useEffect(() => {
    fetchSystemSettings();
    fetchRules();
    fetchFileCodes();
    fetchReservedNumbers();
    fetchScheduled();
  }, []);

  // Save/Update Scheduled Reservation Task
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingSchedule ? 'PUT' : 'POST';
      const url = editingSchedule ? `/api/scheduled-reservations/${editingSchedule.id}` : '/api/scheduled-reservations';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleFormData)
      });

      const resData = await res.json().catch(() => ({}));

      if (res.ok && resData.success !== false) {
        showNotification('success', editingSchedule ? 'อัปเดตการตั้งเวลาจองเลขอัตโนมัติเรียบร้อย' : 'เพิ่มการตั้งเวลาจองเลขอัตโนมัติเรียบร้อย');
        setShowScheduleModal(false);
        setEditingSchedule(null);
        fetchScheduled();
      } else {
        const errorMsg = resData.error || resData.details || 'เกิดข้อผิดพลาดในการบันทึกการตั้งเวลา';
        showNotification('error', errorMsg);
      }
    } catch (err) {
      showNotification('error', 'ไม่สามารถเชื่อมต่อเครื่องแม่ข่ายได้');
    }
  };

  const handleToggleSchedule = async (id: number) => {
    try {
      const res = await fetch(`/api/scheduled-reservations/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        showNotification('success', 'เปลี่ยนสถานะเปิด/ปิดใช้งานการตั้งเวลาเรียบร้อย');
        fetchScheduled();
      }
    } catch (err) {
      showNotification('error', 'ไม่สามารถเปลี่ยนสถานะการตั้งเวลาได้');
    }
  };

  const handleDeleteSchedule = async (id: number, name: string) => {
    const confirmed = await confirm({
      title: 'ยืนยันการลบการตั้งเวลาจองอัตโนมัติ',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบการตั้งเวลาจองอัตโนมัติ "${name}"?`,
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/scheduled-reservations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('success', 'ลบการตั้งเวลาจองเลขอัตโนมัติเรียบร้อย');
        fetchScheduled();
      }
    } catch (err) {
      showNotification('error', 'ไม่สามารถลบการตั้งเวลาจองเลขอัตโนมัติได้');
    }
  };

  const handleRunScheduleNow = async (id: number, name: string) => {
    setRunningScheduleId(id);
    try {
      const res = await fetch(`/api/scheduled-reservations/${id}/run-now`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const numStrings = data.items ? data.items.map((i: any) => i.numberString).join(', ') : '';
        showNotification('success', `ทำจองเลขอัตโนมัติสำเร็จ! ได้รับเลข: ${numStrings}`);
        fetchScheduled();
        fetchReservedNumbers();
      } else {
        showNotification('error', 'ไม่สามารถรันจองเลขอัตโนมัติได้');
      }
    } catch (err) {
      showNotification('error', 'เกิดข้อผิดพลาดในการรันจองเลขอัตโนมัติ');
    } finally {
      setRunningScheduleId(null);
    }
  };

  // Save/Update Rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const confirmed = await confirm({
      title: editingRule ? 'ยืนยันการบันทึกแก้ไขกฎการออกเลข' : 'ยืนยันการเพิ่มกฎการออกเลขใหม่',
      message: editingRule 
        ? `คุณต้องการบันทึกการแก้ไขกฎ "${ruleFormData.docType}" (${ruleFormData.prefixPattern}) ใช่หรือไม่?`
        : `คุณต้องการเพิ่มกฎการออกเลขสำหรับประเภท "${ruleFormData.docType}" ใช่หรือไม่?`,
      type: editingRule ? 'edit' : 'info',
      confirmText: editingRule ? 'ยืนยันบันทึกแก้ไข' : 'ยืนยันเพิ่มกฎ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

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
        const errData = await res.json().catch(() => ({}));
        showNotification('error', errData.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err) {
      showNotification('error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleDeleteRule = async (id: number) => {
    const confirmed = await confirm({
      title: 'ยืนยันการลบกฎการออกเลข',
      message: 'คุณต้องการลบกฎการออกเลขนี้ใช่หรือไม่? การลบอาจส่งผลต่อรูปแบบการออกเลขของเอกสารใหม่',
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;
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
    const confirmed = await confirm({
      title: 'ยืนยันการเพิ่มรหัสหมวดแฟ้ม',
      message: `คุณต้องการบันทึกรหัสหมวดแฟ้ม "${fileCodeFormData.code} - ${fileCodeFormData.name}" ใช่หรือไม่?`,
      type: 'info',
      confirmText: 'ยืนยันการบันทึก',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;
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
    const confirmed = await confirm({
      title: 'ยืนยันการลบรหัสหมวดแฟ้ม',
      message: 'คุณต้องการลบรหัสหมวดแฟ้มนี้ใช่หรือไม่?',
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;
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
    const confirmed = await confirm({
      title: 'ยืนยันการจองเลขหนังสือ',
      message: `คุณต้องการสำรอง/จองเลขหนังสือประเภท "${reserveFormData.docType}" จำนวน ${reserveFormData.count} เลข ใช่หรือไม่?`,
      type: 'info',
      confirmText: 'ยืนยันการจองเลข',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;
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
      return ['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง'].includes(previewDocType) ? `${previewDocType} 1/${systemCurrentYear}` : 'รย 0021/1';
    }

    const nextSeq = (matchedRule.currentSeq || 0) + 1;
    if (['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง'].includes(previewDocType)) {
      return `${matchedRule.prefixPattern || previewDocType} ${nextSeq}/${matchedRule.year || systemCurrentYear}`;
    } else {
      const circ = previewIsCircular ? 'ว ' : '';
      return `${matchedRule.prefixPattern || 'รย 0021'}/${circ}${nextSeq}`;
    }
  };

  // Filtered Reserved Numbers
  const filteredReserved = reservedNumbers.filter(item => {
    const matchDept = reservedFilterDept === 'ALL' || item.department === reservedFilterDept;
    const matchStatus = reservedFilterStatus === 'ALL' || item.status === reservedFilterStatus;
    
    const matchesDocType = (itemType: string, filterType: string) => {
      if (filterType === 'ALL') return true;
      if (filterType === 'หนังสือภายนอก') return itemType === 'หนังสือภายนอก' || itemType === 'หนังสือส่ง';
      if (filterType === 'หนังสือรับ') return itemType === 'หนังสือรับ' || itemType === 'หนังสือเข้า';
      return itemType === filterType;
    };
    const matchType = matchesDocType(item.docType || '', reservedFilterDocType);

    let matchDate = true;
    if (reservedFilterDate) {
      const itemDate = (item.reservedDate || item.createdAt || '').split('T')[0];
      matchDate = itemDate === reservedFilterDate;
    }

    let matchSearch = true;
    if (reservedSearchTerm.trim()) {
      const term = reservedSearchTerm.toLowerCase();
      const numStr = (item.numberString || '').toLowerCase();
      const byStr = (item.reservedBy || '').toLowerCase();
      const forStr = (item.reservedFor || '').toLowerCase();
      const deptStr = (item.department || '').toLowerCase();
      const seqStr = String(item.seqNumber || '');
      matchSearch = numStr.includes(term) || byStr.includes(term) || forStr.includes(term) || deptStr.includes(term) || seqStr.includes(term);
    }

    return matchDept && matchStatus && matchType && matchDate && matchSearch;
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
                  year: systemCurrentYear,
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

          {activeSubTab === 'reserved' && (
            <button
              onClick={() => setShowReserveModal(true)}
              className="px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
            >
              <Bookmark className="w-4 h-4" /> สำรอง/จองเลขหนังสือ
            </button>
          )}

          {activeSubTab === 'scheduled' && (
            <button
              onClick={() => {
                setEditingSchedule(null);
                setScheduleFormData({
                  name: 'จองเลขหนังสือส่งประจำวัน (รอบ 18.00 น.)',
                  department: 'ฝ่ายบริหารงานทั่วไป',
                  docType: 'หนังสือภายนอก',
                  prefix: 'รย 0021',
                  count: 5,
                  scheduleType: 'daily',
                  scheduledTime: '18:00',
                  reservedFor: 'จองเลขอัตโนมัติทุกวัน เวลา 18:00 น. สำหรับออกหนังสือรับ-ส่งช่วงเย็น',
                  reservedBy: 'ระบบอัตโนมัติ (Schedule 18:00)',
                  isActive: true
                });
                setShowScheduleModal(true);
              }}
              className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
            >
              <Clock className="w-4 h-4" /> ตั้งเวลาจองอัตโนมัติ
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

        <button
          onClick={() => setActiveSubTab('scheduled')}
          className={`px-4 py-2.5 rounded-xl font-medium text-xs transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'scheduled'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)]'
          }`}
        >
          <Clock className="w-4 h-4" />
          ตั้งเวลาจองเลขอัตโนมัติ
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeSubTab === 'scheduled' ? 'bg-white/20 text-white' : 'bg-[var(--border-light)] text-[var(--text-muted)]'}`}>
            {scheduledReservations.filter(s => s.isActive).length}
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
                ปี พ.ศ. {systemCurrentYear} | รันต่อตามลำดับ
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
          <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-light)] space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap flex-1">
                {/* DocType filter */}
                <div className="flex items-center gap-1 bg-[var(--bg-overlay)] border border-[var(--border-light)] px-2 py-1 rounded-lg">
                  <span className="text-[var(--text-muted)]">ประเภท:</span>
                  <select
                    value={reservedFilterDocType}
                    onChange={(e) => setReservedFilterDocType(e.target.value)}
                    className="bg-transparent text-[var(--text-primary)] font-medium outline-none cursor-pointer text-xs"
                  >
                    <option value="ALL">ทุกประเภทเอกสาร</option>
                    <option value="คำสั่ง">คำสั่ง</option>
                    <option value="ประกาศ">ประกาศ</option>
                    <option value="หนังสือรับรอง">หนังสือรับรอง</option>
                    <option value="หนังสือภายนอก">หนังสือส่ง (ภายนอก)</option>
                    <option value="หนังสือภายใน">หนังสือภายใน</option>
                    <option value="หนังสือรับ">หนังสือรับ</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div className="flex items-center gap-1 bg-[var(--bg-overlay)] border border-[var(--border-light)] px-2 py-1 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="text-[var(--text-muted)]">วันที่จอง:</span>
                  <input
                    type="date"
                    value={reservedFilterDate}
                    onChange={(e) => setReservedFilterDate(e.target.value)}
                    className="bg-transparent text-[var(--text-primary)] font-medium outline-none cursor-pointer text-xs"
                  />
                  {reservedFilterDate && (
                    <button
                      onClick={() => setReservedFilterDate('')}
                      className="text-[10px] text-rose-500 hover:underline ml-1"
                    >
                      ล้าง
                    </button>
                  )}
                </div>

                {/* Dept Filter */}
                <div className="flex items-center gap-1 bg-[var(--bg-overlay)] border border-[var(--border-light)] px-2 py-1 rounded-lg">
                  <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="text-[var(--text-muted)]">ฝ่าย:</span>
                  <select
                    value={reservedFilterDept}
                    onChange={(e) => setReservedFilterDept(e.target.value)}
                    className="bg-transparent text-[var(--text-primary)] font-medium outline-none cursor-pointer text-xs"
                  >
                    <option value="ALL">ทุกฝ่ายงาน</option>
                    <option value="ฝ่ายบริหารงานทั่วไป">ฝ่ายบริหารงานทั่วไป</option>
                    <option value="ฝ่ายยุทธศาสตร์และการจัดการ">ฝ่ายยุทธศาสตร์และการจัดการ</option>
                    <option value="ฝ่ายสงเคราะห์ผู้ประสบภัย">ฝ่ายสงเคราะห์ผู้ประสบภัย</option>
                    <option value="ฝ่ายป้องกันและปฏิบัติการ">ฝ่ายป้องกันและปฏิบัติการ</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-[var(--bg-overlay)] border border-[var(--border-light)] px-2 py-1 rounded-lg">
                  <span className="text-[var(--text-muted)]">สถานะ:</span>
                  <select
                    value={reservedFilterStatus}
                    onChange={(e) => setReservedFilterStatus(e.target.value)}
                    className="bg-transparent text-[var(--text-primary)] font-medium outline-none cursor-pointer text-xs"
                  >
                    <option value="ALL">ทุกสถานะ</option>
                    <option value="available">พร้อมใช้งาน</option>
                    <option value="used">ใช้งานแล้ว</option>
                  </select>
                </div>

                {/* Search */}
                <div className="relative min-w-[160px] flex-1">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาเลขที่, ผู้จอง..."
                    value={reservedSearchTerm}
                    onChange={(e) => setReservedSearchTerm(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg text-xs outline-none focus:border-[var(--primary-color)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(reservedFilterDocType !== 'ALL' || reservedFilterDate || reservedFilterDept !== 'ALL' || reservedFilterStatus !== 'ALL' || reservedSearchTerm) && (
                  <button
                    onClick={() => {
                      setReservedFilterDocType('ALL');
                      setReservedFilterDate('');
                      setReservedFilterDept('ALL');
                      setReservedFilterStatus('ALL');
                      setReservedSearchTerm('');
                    }}
                    className="px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-rose-500 hover:underline"
                  >
                    ล้างตัวกรอง
                  </button>
                )}
                <button
                  onClick={fetchReservedNumbers}
                  className="px-3 py-1.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg hover:bg-[var(--border-lighter)] flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> รีเฟรช ({filteredReserved.length}/{reservedNumbers.length})
                </button>
              </div>
            </div>
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
                      <th className="px-4 py-3">วันที่จอง</th>
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
                          ) : item.type === 'auto_scheduled' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                              <Clock className="w-3 h-3" /> จองอัตโนมัติ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                              <Bookmark className="w-3 h-3" /> จองล่วงหน้า
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-light)] font-medium text-[var(--text-primary)] text-[11px]">
                            <Calendar className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                            {formatThaiDateString(item.reservedDate || item.createdAt)}
                          </span>
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

      {/* ================= TAB 4: SCHEDULED AUTO-RESERVATIONS ================= */}
      {activeSubTab === 'scheduled' && (
        <div className="space-y-6">
          {/* Top Banner & Info */}
          <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-light)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  ตั้งเวลาจองเลขอัตโนมัติตามช่วงเวลา (Scheduled Auto-Reserve)
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                    เบื้องหลังทำงานอัตโนมัติ
                  </span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  ระบบจะทำการจองเลขหนังสือสารบรรณตามเวลาที่กำหนด (เช่น ทุกวัน เวลา 18:00 น.) และนำเข้าคลังเลขสำรองให้อัตโนมัติ เพื่อให้ผู้ปฏิบัติงานมีเลขพร้อมใช้งานตลอดเวลา
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={fetchScheduled}
                className="p-2.5 rounded-xl border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)] text-xs flex items-center gap-1.5"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-4 h-4 ${loadingScheduled ? 'animate-spin' : ''}`} />
                รีเฟรช
              </button>

              <button
                onClick={() => {
                  setEditingSchedule(null);
                  setScheduleFormData({
                    name: 'จองเลขหนังสือส่งประจำวัน (รอบ 18.00 น.)',
                    department: 'ฝ่ายบริหารงานทั่วไป',
                    docType: 'หนังสือภายนอก',
                    prefix: 'รย 0021',
                    count: 5,
                    scheduleType: 'daily',
                    scheduledTime: '18:00',
                    reservedFor: 'จองเลขอัตโนมัติทุกวัน เวลา 18:00 น. สำหรับออกหนังสือรับ-ส่งช่วงเย็น',
                    reservedBy: 'ระบบอัตโนมัติ (Schedule 18:00)',
                    isActive: true
                  });
                  setShowScheduleModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-semibold shadow-sm hover:opacity-90 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                ตั้งเวลาจองอัตโนมัติใหม่
              </button>
            </div>
          </div>

          {/* Schedule Tasks Cards Grid */}
          {loadingScheduled ? (
            <div className="p-8 text-center text-[var(--text-muted)] text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
              กำลังโหลดรายการตั้งเวลา...
            </div>
          ) : scheduledReservations.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[var(--bg-canvas)] border border-dashed border-[var(--border-light)] space-y-3">
              <Clock className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <h4 className="font-semibold text-sm text-[var(--text-primary)]">ยังไม่มีรายการตั้งเวลาจองเลขอัตโนมัติ</h4>
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                กดปุ่ม "ตั้งเวลาจองอัตโนมัติใหม่" เพื่อกำหนดเวลาจองเลขสารบรรณอัตโนมัติ เช่น ทุกวัน เวลา 18:00 น.
              </p>
              <button
                onClick={() => {
                  setEditingSchedule(null);
                  setShowScheduleModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-medium inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> เพิ่มตั้งเวลาแรก
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledReservations.map((sch) => (
                <div
                  key={sch.id}
                  className={`p-5 rounded-2xl border transition-all space-y-4 ${
                    sch.isActive
                      ? 'bg-[var(--bg-canvas)] border-[var(--border-light)] shadow-sm hover:border-purple-500/40'
                      : 'bg-[var(--bg-overlay)]/50 border-[var(--border-light)] opacity-75'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sch.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gray-500/10 text-gray-500'
                        }`}>
                          {sch.isActive ? '● เปิดใช้งาน' : '○ ปิดใช้งาน'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          {sch.docType}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)]">{sch.name}</h4>
                    </div>

                    {/* Toggle Button */}
                    <button
                      onClick={() => handleToggleSchedule(sch.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                        sch.isActive ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 hover:bg-gray-300'
                      }`}
                      title={sch.isActive ? 'กดเพื่อปิดใช้งาน' : 'กดเพื่อเปิดใช้งาน'}
                    >
                      {sch.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span className="text-[11px] font-semibold">{sch.isActive ? 'เปิดอยู่' : 'ปิดอยู่'}</span>
                    </button>
                  </div>

                  {/* Details Box */}
                  <div className="p-3.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-500" /> ช่วงเวลาการจอง:
                      </span>
                      <span className="font-bold text-[var(--text-primary)] bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-[11px]">
                        ⏰ {sch.scheduleType === 'daily' ? 'ทุกวัน' : sch.scheduleType === 'workdays' ? 'วันทำการ (จ-ศ)' : 'ประจำสัปดาห์'} เวลา {sch.scheduledTime} น.
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" /> วันที่จองสำหรับเลข:
                      </span>
                      <span className="font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded text-[11px]">
                        📅 {sch.dateOption === 'specific_date' && sch.specificDate
                          ? `ระบุเจาะจง: ${formatThaiDateString(sch.specificDate)}`
                          : sch.dateOption === 'next_workday'
                          ? 'ระบุวันทำการถัดไป (จ-ศ)'
                          : sch.dateOption === 'next_day'
                          ? 'ระบุวันถัดไป (พรุ่งนี้)'
                          : 'ระบุตามวันปัจจุบันที่ทำงาน'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-500" /> จำนวนเลขที่จองต่อรอบ:
                      </span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        📦 ครั้งละ {sch.count} เลข ({sch.prefix})
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" /> สังกัดหน่วยงาน:
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {sch.department}
                      </span>
                    </div>

                    {sch.reservedFor && (
                      <div className="pt-2 border-t border-[var(--border-light)] text-[11px] text-[var(--text-muted)]">
                        <span className="font-medium text-[var(--text-secondary)]">วัตถุประสงค์:</span> {sch.reservedFor}
                      </div>
                    )}
                  </div>

                  {/* Footer Stats & Action Buttons */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <div className="text-[10px] text-[var(--text-muted)] space-y-0.5">
                      <div>รันล่าสุด: {sch.lastRunAt ? new Date(sch.lastRunAt).toLocaleString('th-TH') : 'ยังไม่เคยรัน'}</div>
                      <div className="text-purple-600 dark:text-purple-400 font-medium">รอบถัดไป: ทุกวัน เวลา {sch.scheduledTime} น.</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRunScheduleNow(sch.id, sch.name)}
                        disabled={runningScheduleId === sch.id}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-sm disabled:opacity-50"
                        title="ทดสอบรันจองเลขตามกำหนดเวลานี้ทันที"
                      >
                        <Zap className={`w-3.5 h-3.5 ${runningScheduleId === sch.id ? 'animate-bounce' : ''}`} />
                        {runningScheduleId === sch.id ? 'กำลังรัน...' : 'รันจองเลขทันที'}
                      </button>

                      <button
                        onClick={() => {
                          setEditingSchedule(sch);
                          setScheduleFormData({
                            name: sch.name,
                            department: sch.department,
                            docType: sch.docType,
                            prefix: sch.prefix,
                            count: sch.count,
                            scheduleType: sch.scheduleType || 'daily',
                            scheduledTime: sch.scheduledTime || '18:00',
                            reservedFor: sch.reservedFor,
                            reservedBy: sch.reservedBy,
                            dateOption: sch.dateOption || 'current_date',
                            specificDate: sch.specificDate || '',
                            isActive: sch.isActive
                          });
                          setShowScheduleModal(true);
                        }}
                        className="p-1.5 rounded-lg border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)]"
                        title="แก้ไขการตั้งเวลา"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteSchedule(sch.id, sch.name)}
                        className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-500/10 text-red-600 dark:text-red-400"
                        title="ลบการตั้งเวลา"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                    <option value="หนังสือรับ">หนังสือรับ</option>
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
                    <option value="หนังสือรับ">หนังสือรับ</option>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">
                    วันที่จองเลข (Reservation Date): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={reserveFormData.reservedDate}
                    onChange={(e) => setReserveFormData({ ...reserveFormData, reservedDate: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] font-medium text-[var(--text-primary)] outline-none"
                  />
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">ระบุวันที่ที่จะประทับลงในเลขจองนี้</p>
                </div>

                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">วันหมดอายุ (ถ้ามี):</label>
                  <input
                    type="date"
                    value={reserveFormData.expiresAt}
                    onChange={(e) => setReserveFormData({ ...reserveFormData, expiresAt: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                  />
                </div>
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

      {/* MODAL: CREATE / EDIT SCHEDULED RESERVATION */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3">
              <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                {editingSchedule ? 'แก้ไขการตั้งเวลาจองเลขอัตโนมัติ' : 'เพิ่มการตั้งเวลาจองเลขอัตโนมัติใหม่'}
              </h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--border-lighter)] text-[var(--text-muted)]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">ชื่อรายการตั้งเวลา:</label>
                <input
                  type="text"
                  required
                  value={scheduleFormData.name}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, name: e.target.value })}
                  placeholder="เช่น จองเลขหนังสือส่งประจำวัน รอบ 18.00 น."
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">ความถี่ในการทำงาน:</label>
                  <select
                    value={scheduleFormData.scheduleType}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, scheduleType: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                  >
                    <option value="daily">ทุกวัน (Daily)</option>
                    <option value="workdays">วันทำการ (จันทร์ - ศุกร์)</option>
                    <option value="weekly">ทุกสัปดาห์ (Weekly)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">เวลาที่จะจอง (HH:mm):</label>
                  <input
                    type="time"
                    required
                    value={scheduleFormData.scheduledTime}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, scheduledTime: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] font-bold text-purple-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">ฝ่าย/กองที่รับผิดชอบ:</label>
                  <select
                    value={scheduleFormData.department}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, department: e.target.value })}
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
                    value={scheduleFormData.docType}
                    onChange={(e) => {
                      const dt = e.target.value;
                      let defaultPrefix = 'รย 0021';
                      if (dt === 'คำสั่ง') defaultPrefix = 'คำสั่ง';
                      else if (dt === 'ประกาศ') defaultPrefix = 'ประกาศ';
                      else if (dt === 'หนังสือรับรอง') defaultPrefix = 'หนังสือรับรอง';
                      setScheduleFormData({ ...scheduleFormData, docType: dt, prefix: defaultPrefix });
                    }}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                  >
                    <option value="หนังสือรับ">หนังสือรับ</option>
                    <option value="หนังสือภายนอก">หนังสือภายนอก</option>
                    <option value="หนังสือภายใน">หนังสือภายใน</option>
                    <option value="คำสั่ง">คำสั่ง</option>
                    <option value="ประกาศ">ประกาศ</option>
                    <option value="หนังสือรับรอง">หนังสือรับรอง</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">คำนำหน้า (Prefix):</label>
                  <input
                    type="text"
                    required
                    value={scheduleFormData.prefix}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, prefix: e.target.value })}
                    placeholder="เช่น รย 0021 หรือ คำสั่ง"
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[var(--text-primary)] block mb-1">จำนวนที่จองต่อรอบ (เลข):</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={scheduleFormData.count}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, count: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] font-bold text-amber-600 outline-none"
                  />
                </div>
              </div>

              {/* Reservation Date Option in Scheduled Form */}
              <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-2.5">
                <label className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  การระบุวันที่จองสำหรับเลขที่จองอัตโนมัติ (Reservation Date):
                </label>
                <p className="text-[11px] text-[var(--text-muted)]">
                  กำหนดว่าเมื่อถึงเวลาจองเลขอัตโนมัติ ระบบจะระบุวันที่จองสำหรับเลขนั้นๆ เป็นรูปแบบใด
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <label className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${
                    scheduleFormData.dateOption === 'current_date' 
                      ? 'bg-purple-600/10 border-purple-500 text-purple-900 dark:text-purple-200 font-semibold'
                      : 'bg-[var(--bg-overlay)] border-[var(--border-light)] text-[var(--text-secondary)]'
                  }`}>
                    <input
                      type="radio"
                      name="dateOption"
                      value="current_date"
                      checked={scheduleFormData.dateOption === 'current_date' || !scheduleFormData.dateOption}
                      onChange={() => setScheduleFormData({ ...scheduleFormData, dateOption: 'current_date' })}
                      className="accent-purple-600"
                    />
                    <span className="text-xs">วันปัจจุบันที่ระบบทำงาน</span>
                  </label>

                  <label className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${
                    scheduleFormData.dateOption === 'next_workday' 
                      ? 'bg-purple-600/10 border-purple-500 text-purple-900 dark:text-purple-200 font-semibold'
                      : 'bg-[var(--bg-overlay)] border-[var(--border-light)] text-[var(--text-secondary)]'
                  }`}>
                    <input
                      type="radio"
                      name="dateOption"
                      value="next_workday"
                      checked={scheduleFormData.dateOption === 'next_workday'}
                      onChange={() => setScheduleFormData({ ...scheduleFormData, dateOption: 'next_workday' })}
                      className="accent-purple-600"
                    />
                    <span className="text-xs">วันทำการถัดไป (จันทร์-ศุกร์)</span>
                  </label>

                  <label className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${
                    scheduleFormData.dateOption === 'next_day' 
                      ? 'bg-purple-600/10 border-purple-500 text-purple-900 dark:text-purple-200 font-semibold'
                      : 'bg-[var(--bg-overlay)] border-[var(--border-light)] text-[var(--text-secondary)]'
                  }`}>
                    <input
                      type="radio"
                      name="dateOption"
                      value="next_day"
                      checked={scheduleFormData.dateOption === 'next_day'}
                      onChange={() => setScheduleFormData({ ...scheduleFormData, dateOption: 'next_day' })}
                      className="accent-purple-600"
                    />
                    <span className="text-xs">วันถัดไป (วันพรุ่งนี้)</span>
                  </label>

                  <label className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${
                    scheduleFormData.dateOption === 'specific_date' 
                      ? 'bg-purple-600/10 border-purple-500 text-purple-900 dark:text-purple-200 font-semibold'
                      : 'bg-[var(--bg-overlay)] border-[var(--border-light)] text-[var(--text-secondary)]'
                  }`}>
                    <input
                      type="radio"
                      name="dateOption"
                      value="specific_date"
                      checked={scheduleFormData.dateOption === 'specific_date'}
                      onChange={() => setScheduleFormData({ ...scheduleFormData, dateOption: 'specific_date' })}
                      className="accent-purple-600"
                    />
                    <span className="text-xs">ระบุวันที่เจาะจง</span>
                  </label>
                </div>

                {scheduleFormData.dateOption === 'specific_date' && (
                  <div className="pt-2">
                    <label className="font-semibold text-xs text-[var(--text-primary)] block mb-1">
                      เลือกวันที่เจาะจงสำหรับเลขที่จอง:
                    </label>
                    <input
                      type="date"
                      required
                      value={scheduleFormData.specificDate || ''}
                      onChange={(e) => setScheduleFormData({ ...scheduleFormData, specificDate: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-[var(--bg-surface)] border border-purple-300 dark:border-purple-800 text-xs font-semibold outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">ชื่อผู้ตั้งจอง / ระบบ:</label>
                <input
                  type="text"
                  value={scheduleFormData.reservedBy}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, reservedBy: e.target.value })}
                  placeholder="เช่น ระบบอัตโนมัติ (Schedule 18:00)"
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">วัตถุประสงค์ / หมายเหตุการจอง:</label>
                <textarea
                  rows={2}
                  value={scheduleFormData.reservedFor}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, reservedFor: e.target.value })}
                  placeholder="เช่น จองเลขอัตโนมัติรอบเย็นประจำวัน เวลา 18:00 น."
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="schIsActive"
                  checked={scheduleFormData.isActive}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, isActive: e.target.checked })}
                  className="w-4 h-4 accent-purple-600 cursor-pointer"
                />
                <label htmlFor="schIsActive" className="font-semibold text-[var(--text-primary)] cursor-pointer">
                  เปิดใช้งานการตั้งเวลานี้ทันที
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-light)]">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white font-semibold shadow-sm hover:opacity-90 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  บันทึกการตั้งเวลา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
