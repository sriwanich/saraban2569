import React, { useState, useEffect } from 'react';
import { useRealtimeSync } from '../utils/realtimeSync';
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
  Play,
  FolderOpen,
  Activity,
  Cpu,
  ShieldCheck,
  ArrowRight,
  Check,
  Copy,
  Terminal,
  SlidersHorizontal
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
  const [selectedFileCodeIds, setSelectedFileCodeIds] = useState<number[]>([]);
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
  const [selectedReservedIds, setSelectedReservedIds] = useState<number[]>([]);

  // States for Scheduled Auto-Reservations
  const [scheduledReservations, setScheduledReservations] = useState<any[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState<boolean>(true);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [runningScheduleId, setRunningScheduleId] = useState<number | null>(null);

  const [scheduleFormData, setScheduleFormData] = useState<any>({
    name: 'จองเลขหนังสือส่งประจำวัน (รอบ 18.00 น.)',
    department: 'ฝ่ายยุทธศาสตร์และการจัดการ',
    docType: 'หนังสือส่ง',
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
  const [previewDept, setPreviewDept] = useState<string>('ฝ่ายยุทธศาสตร์และการจัดการ');
  const [previewDocType, setPreviewDocType] = useState<string>('หนังสือรับ');
  const [previewIsCircular, setPreviewIsCircular] = useState<boolean>(false);

  // Search and filter states for Rules & File Codes
  const [rulesSearch, setRulesSearch] = useState<string>('');
  const [rulesFilterDept, setRulesFilterDept] = useState<string>('ALL');
  const [rulesFilterDocType, setRulesFilterDocType] = useState<string>('ALL');
  const [fileCodesSearch, setFileCodesSearch] = useState<string>('');
  const [fileCodesFilterDept, setFileCodesFilterDept] = useState<string>('ALL');
  const [copiedDemo, setCopiedDemo] = useState<boolean>(false);

  // Notifications
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Form States
  const [ruleFormData, setRuleFormData] = useState<any>({
    ruleName: '',
    department: 'ฝ่ายยุทธศาสตร์และการจัดการ',
    divisionCode: '0021',
    docType: 'หนังสือส่ง',
    prefixPattern: 'รย 0021',
    currentSeq: 1,
    year: systemCurrentYear,
    isActive: true,
    description: ''
  });

  const [fileCodeFormData, setFileCodeFormData] = useState<any>({
    code: '',
    name: '',
    department: 'ฝ่ายยุทธศาสตร์และการจัดการ',
    description: ''
  });

  const [reserveFormData, setReserveFormData] = useState<any>({
    ruleId: '',
    department: 'ฝ่ายยุทธศาสตร์และการจัดการ',
    docType: 'หนังสือส่ง',
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

  useRealtimeSync(['DOCUMENTS_UPDATED', 'NUMBERING_RULES_UPDATED', 'TAB_FOCUSED', 'DATA_UPDATED'], () => {
    fetchRules();
  });

  const handleSyncRules = async () => {
    try {
      const res = await fetch('/api/numbering-rules/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
        showNotification('success', `ตรวจสอบและซิงค์ลำดับปัจจุบันตรงกับฐานข้อมูลจริงเรียบร้อย (ปรับปรุง ${data.syncedCount || 0} รายการ)`);
      } else {
        showNotification('error', 'ไม่สามารถซิงค์ลำดับเลขหนังสือได้');
      }
    } catch (err) {
      showNotification('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

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

  const handleDeleteReservedNumber = async (id: number, numberString: string) => {
    const confirmed = await confirm({
      title: 'ยืนยันการลบเลขจอง/เลขสำรอง',
      message: `คุณต้องการลบเลข "${numberString}" ออกจากคลังใช่หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้`,
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/reserved-numbers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('success', `ลบเลข ${numberString} ออกจากคลังเรียบร้อยแล้ว`);
        fetchReservedNumbers();
      } else {
        showNotification('error', 'ไม่สามารถลบเลขจองได้');
      }
    } catch (err) {
      console.error('Error deleting reserved number:', err);
      showNotification('error', 'เกิดข้อผิดพลาดในการลบเลขจอง');
    }
  };

  const handleClearReservedNumbers = async () => {
    const confirmed = await confirm({
      title: 'ยืนยันการล้างคลังเลขจองทั้งหมด',
      message: 'คุณต้องการลบเลขจอง/เลขสำรองทั้งหมดในคลังใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้',
      type: 'delete',
      confirmText: 'ยืนยันล้างทั้งหมด',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    try {
      const res = await fetch('/api/reserved-numbers', { method: 'DELETE' });
      if (res.ok) {
        showNotification('success', 'ล้างคลังเลขจองทั้งหมดเรียบร้อยแล้ว');
        setSelectedReservedIds([]);
        fetchReservedNumbers();
      } else {
        showNotification('error', 'ไม่สามารถล้างคลังเลขจองได้');
      }
    } catch (err) {
      console.error('Error clearing reserved numbers:', err);
      showNotification('error', 'เกิดข้อผิดพลาดในการล้างคลังเลขจอง');
    }
  };

  const handleBatchDeleteReserved = async () => {
    if (selectedReservedIds.length === 0) return;
    
    const confirmed = await confirm({
      title: 'ยืนยันการลบเลขจองที่เลือก',
      message: `คุณต้องการลบเลขจองที่เลือกจำนวน ${selectedReservedIds.length} รายการ ใช่หรือไม่?`,
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    try {
      const res = await fetch('/api/reserved-numbers/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedReservedIds })
      });
      if (res.ok) {
        showNotification('success', `ลบรายการที่เลือกจำนวน ${selectedReservedIds.length} รายการ เรียบร้อยแล้ว`);
        setSelectedReservedIds([]);
        fetchReservedNumbers();
      } else {
        showNotification('error', 'ไม่สามารถลบรายการที่เลือกได้');
      }
    } catch (err) {
      console.error('Error batch deleting reserved numbers:', err);
      showNotification('error', 'เกิดข้อผิดพลาดในการลบรายการที่เลือก');
    }
  };

  const toggleReservedSelection = (id: number) => {
    setSelectedReservedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAllReservedSelection = () => {
    if (selectedReservedIds.length === filteredReserved.length) {
      setSelectedReservedIds([]);
    } else {
      setSelectedReservedIds(filteredReserved.map(r => r.id));
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
        setFileCodeFormData({ code: '', name: '', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', description: '' });
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

  const handleClearFileCodes = async () => {
    const confirmed = await confirm({
      title: 'ยืนยันการล้างรหัสหมวดแฟ้มทั้งหมด',
      message: 'คุณต้องการลบรหัสหมวดแฟ้มทั้งหมดในระบบใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้',
      type: 'delete',
      confirmText: 'ยืนยันล้างทั้งหมด',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    try {
      const res = await fetch('/api/file-codes', { method: 'DELETE' });
      if (res.ok) {
        showNotification('success', 'ล้างรหัสหมวดแฟ้มทั้งหมดเรียบร้อยแล้ว');
        setSelectedFileCodeIds([]);
        fetchFileCodes();
      } else {
        showNotification('error', 'ไม่สามารถล้างรหัสหมวดแฟ้มได้');
      }
    } catch (err) {
      console.error('Error clearing file codes:', err);
      showNotification('error', 'เกิดข้อผิดพลาดในการล้างรหัสหมวดแฟ้ม');
    }
  };

  const handleBatchDeleteFileCodes = async () => {
    if (selectedFileCodeIds.length === 0) return;
    
    const confirmed = await confirm({
      title: 'ยืนยันการลบรหัสหมวดแฟ้มที่เลือก',
      message: `คุณต้องการลบรหัสหมวดแฟ้มที่เลือกจำนวน ${selectedFileCodeIds.length} รายการ ใช่หรือไม่?`,
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    try {
      const res = await fetch('/api/file-codes/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedFileCodeIds })
      });
      if (res.ok) {
        showNotification('success', `ลบรหัสแฟ้มที่เลือกจำนวน ${selectedFileCodeIds.length} รายการ เรียบร้อยแล้ว`);
        setSelectedFileCodeIds([]);
        fetchFileCodes();
      } else {
        showNotification('error', 'ไม่สามารถลบรายการที่เลือกได้');
      }
    } catch (err) {
      console.error('Error batch deleting file codes:', err);
      showNotification('error', 'เกิดข้อผิดพลาดในการลบรายการที่เลือก');
    }
  };

  const toggleFileCodeSelection = (id: number) => {
    setSelectedFileCodeIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAllFileCodeSelection = () => {
    if (selectedFileCodeIds.length === fileCodes.length) {
      setSelectedFileCodeIds([]);
    } else {
      setSelectedFileCodeIds(fileCodes.map(c => c.id));
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
    const isDocTypeMatching = (ruleDocType: string) => {
      if (previewDocType === 'หนังสือส่ง') {
        return ruleDocType === 'หนังสือส่ง' || ruleDocType === 'หนังสือภายนอก';
      }
      return ruleDocType === previewDocType;
    };

    const isCentral = previewDept === 'ทุกฝ่ายงาน';

    const matchedRule = rules.find(r => 
      r.isActive && 
      isDocTypeMatching(r.docType) && 
      (isCentral 
        ? (r.department === 'ทุกฝ่ายงาน' || r.runningScope === 'global' || (r.ruleName && r.ruleName.includes('สารบรรณกลาง')))
        : (r.department === previewDept))
    ) || rules.find(r => 
      r.isActive && 
      isDocTypeMatching(r.docType) && 
      (r.department === 'ทุกฝ่ายงาน' || r.runningScope === 'global' || (r.ruleName && r.ruleName.includes('สารบรรณกลาง')))
    ) || rules.find(r => r.isActive && isDocTypeMatching(r.docType));

    const nextSeq = (matchedRule?.currentSeq || 0) + 1;

    if (previewDocType === 'หนังสือรับ') {
      const prefix = matchedRule?.prefixPattern || '';
      return prefix ? `${prefix}/${nextSeq}` : String(nextSeq);
    }

    if (['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง'].includes(previewDocType)) {
      const prefix = matchedRule?.prefixPattern || previewDocType;
      const yr = matchedRule?.year || systemCurrentYear;
      return `${prefix} ${nextSeq}/${yr}`;
    } else {
      let defaultPrefix = 'รย 0021';
      if (previewDocType === 'หนังสือส่ง' && !isCentral) {
        if (previewDept === 'ฝ่ายยุทธศาสตร์และการจัดการ') defaultPrefix = 'รย 0021.1';
        else if (previewDept === 'ฝ่ายสงเคราะห์ผู้ประสบภัย') defaultPrefix = 'รย 0021.2';
        else if (previewDept === 'ฝ่ายป้องกันและปฏิบัติการ') defaultPrefix = 'รย 0021.3';
      }
      const prefix = matchedRule?.prefixPattern || defaultPrefix;
      const circ = previewIsCircular ? (prefix.includes('ว') ? '' : 'ว ') : '';
      return `${prefix}/${circ}${nextSeq}`;
    }
  };

  // Filtered Reserved Numbers
  const filteredReserved = reservedNumbers.filter(item => {
    const matchDept = reservedFilterDept === 'ALL' || item.department === reservedFilterDept;
    const matchStatus = reservedFilterStatus === 'ALL' || item.status === reservedFilterStatus;
    
    const matchesDocType = (itemType: string, filterType: string) => {
      if (filterType === 'ALL') return true;
      if (filterType === 'หนังสือส่ง' || filterType === 'หนังสือภายนอก') return itemType === 'หนังสือส่ง' || itemType === 'หนังสือภายนอก';
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

  // Filtered Rules
  const filteredRules = rules.filter(rule => {
    const matchDept = rulesFilterDept === 'ALL' || rule.department === rulesFilterDept;
    const matchDocType = rulesFilterDocType === 'ALL' || 
      (rulesFilterDocType === 'หนังสือส่ง' ? (rule.docType === 'หนังสือส่ง' || rule.docType === 'หนังสือภายนอก') : rule.docType === rulesFilterDocType);
    const matchSearch = !rulesSearch.trim() || 
      (rule.ruleName || '').toLowerCase().includes(rulesSearch.toLowerCase()) ||
      (rule.prefixPattern || '').toLowerCase().includes(rulesSearch.toLowerCase()) ||
      (rule.department || '').toLowerCase().includes(rulesSearch.toLowerCase()) ||
      (rule.description || '').toLowerCase().includes(rulesSearch.toLowerCase());
    return matchDept && matchDocType && matchSearch;
  });

  // Filtered File Codes
  const filteredFileCodes = fileCodes.filter(fc => {
    const matchDept = fileCodesFilterDept === 'ALL' || fc.department === fileCodesFilterDept;
    const matchSearch = !fileCodesSearch.trim() ||
      (fc.code || '').toLowerCase().includes(fileCodesSearch.toLowerCase()) ||
      (fc.name || '').toLowerCase().includes(fileCodesSearch.toLowerCase()) ||
      (fc.department || '').toLowerCase().includes(fileCodesSearch.toLowerCase()) ||
      (fc.description || '').toLowerCase().includes(fileCodesSearch.toLowerCase());
    return matchDept && matchSearch;
  });

  const handleCopyDemo = () => {
    const num = getDemoGeneratedNumber();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(num);
      setCopiedDemo(true);
      setTimeout(() => setCopiedDemo(false), 2000);
    }
  };

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

      {/* Official Government Command Header & Summary */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white p-6 shadow-md border border-blue-900/40">
        <div className="relative z-10 space-y-6">
          {/* Top Bar: Title & Action Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold tracking-wider font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  ระบบทะเบียนสารบรรณกลาง • พร้อมใช้งาน
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-500/30 text-[10px] font-mono">
                  ปี พ.ศ. {systemCurrentYear}
                </span>
              </div>
              <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                <span className="p-2 rounded-xl bg-blue-900/60 border border-blue-700/50 text-blue-200 shadow-xs">
                  <Hash className="w-5 h-5" />
                </span>
                ระบบตั้งค่าเลขที่หนังสือและรหัสหมวดแฟ้มราชการ
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                ศูนย์ควบคุมการจัดสรรเลขสารบรรณอัตโนมัติตามระเบียบสำนักนายกรัฐมนตรีฯ โครงสร้างรหัสหมวดแฟ้มจำแนกตามกอง/ฝ่าย พร้อมระบบจำลองการออกเลขแบบเรียลไทม์และคลังเลขสำรอง
              </p>
            </div>

            {/* Top Quick Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {activeSubTab === 'rules' && (
                <>
                  <button
                    onClick={handleSyncRules}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-blue-100 border border-white/20 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                    title="ตรวจสอบและปรับปรุงลำดับปัจจุบันให้ตรงกับข้อมูลจริงในฐานข้อมูล"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-300" />
                    ซิงค์ลำดับปัจจุบัน
                  </button>
                  <button
                    onClick={() => {
                      setEditingRule(null);
                      setRuleFormData({
                        ruleName: '',
                        department: 'ฝ่ายยุทธศาสตร์และการจัดการ',
                        divisionCode: '0021',
                        docType: 'หนังสือส่ง',
                        prefixPattern: 'รย 0021',
                        currentSeq: 1,
                        year: systemCurrentYear,
                        isActive: true,
                        description: ''
                      });
                      setShowRuleModal(true);
                    }}
                    className="px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> เพิ่มกฎออกเลขใหม่
                  </button>
                </>
              )}

              {activeSubTab === 'fileCodes' && (
                <button
                  onClick={() => {
                    setFileCodeFormData({ code: '', name: '', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', description: '' });
                    setShowFileCodeModal(true);
                  }}
                  className="px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> เพิ่มรหัสหมวดแฟ้มใหม่
                </button>
              )}

              {activeSubTab === 'reserved' && (
                <button
                  onClick={() => setShowReserveModal(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
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
                      department: 'ฝ่ายยุทธศาสตร์และการจัดการ',
                      docType: 'หนังสือส่ง',
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
                    setShowScheduleModal(true);
                  }}
                  className="px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Clock className="w-4 h-4" /> ตั้งเวลาจองอัตโนมัติ
                </button>
              )}
            </div>
          </div>

          {/* 4 Summary Status Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {/* Tile 1: Rules */}
            <div 
              onClick={() => setActiveSubTab('rules')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeSubTab === 'rules'
                  ? 'bg-blue-900/60 border-blue-400 shadow-sm ring-1 ring-blue-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-300">
                  กฎออกเลขเปิดใช้งาน
                </span>
                <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300">
                  <Layers className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-white">
                  {rules.filter(r => r.isActive).length}
                </span>
                <span className="text-xs text-slate-300 font-mono">/ {rules.length} กฎ</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                <span>สารบรรณกลาง & ฝ่ายงาน</span>
              </div>
            </div>

            {/* Tile 2: File Codes */}
            <div 
              onClick={() => setActiveSubTab('fileCodes')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeSubTab === 'fileCodes'
                  ? 'bg-blue-900/60 border-blue-400 shadow-sm ring-1 ring-blue-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-300">
                  รหัสหมวดแฟ้มดิจิทัล
                </span>
                <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300">
                  <FolderOpen className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-white">
                  {fileCodes.length}
                </span>
                <span className="text-xs text-slate-300">หมวดแฟ้ม</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>มาตรฐานงานสารบรรณ</span>
              </div>
            </div>

            {/* Tile 3: Reserved Numbers */}
            <div 
              onClick={() => setActiveSubTab('reserved')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeSubTab === 'reserved'
                  ? 'bg-blue-900/60 border-blue-400 shadow-sm ring-1 ring-blue-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-300">
                  คลังเลขพร้อมใช้งาน
                </span>
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                  <Bookmark className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-amber-200">
                  {reservedNumbers.filter(r => r.status === 'available').length}
                </span>
                <span className="text-xs text-slate-300 font-mono">/ {reservedNumbers.length} ทั้งหมด</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>เลขจอง + เลขคืนจากยกเลิก</span>
              </div>
            </div>

            {/* Tile 4: Scheduled */}
            <div 
              onClick={() => setActiveSubTab('scheduled')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeSubTab === 'scheduled'
                  ? 'bg-blue-900/60 border-blue-400 shadow-sm ring-1 ring-blue-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-300">
                  ตั้งเวลาจองอัตโนมัติ
                </span>
                <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300">
                  <Clock className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-white">
                  {scheduledReservations.filter(s => s.isActive).length}
                </span>
                <span className="text-xs text-slate-300">คิวทำงาน</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                <span>ออโต้รอบเย็น 18:00 น.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex gap-1 overflow-x-auto scrollbar-none shadow-2xs">
        <button
          onClick={() => setActiveSubTab('rules')}
          className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === 'rules'
              ? 'bg-[var(--primary-color)] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          กฎกำหนดเลขหนังสือตาม กอง/ฝ่าย
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeSubTab === 'rules' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
          }`}>
            {rules.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('fileCodes')}
          className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === 'fileCodes'
              ? 'bg-[var(--primary-color)] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          รหัสหมวดแฟ้มแบบกำหนดเอง
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeSubTab === 'fileCodes' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
          }`}>
            {fileCodes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('reserved')}
          className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === 'reserved'
              ? 'bg-[var(--primary-color)] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          คลังเลขสำรอง / เลขจอง / เลขคืน
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeSubTab === 'reserved' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
          }`}>
            {reservedNumbers.filter(r => r.status === 'available').length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('scheduled')}
          className={`px-3.5 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === 'scheduled'
              ? 'bg-[var(--primary-color)] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          ตั้งเวลาจองเลขอัตโนมัติ
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeSubTab === 'scheduled' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
          }`}>
            {scheduledReservations.filter(s => s.isActive).length}
          </span>
        </button>
      </div>

      {/* ================= TAB 1: RULES ================= */}
      {activeSubTab === 'rules' && (
        <div className="space-y-6">
          {/* Government Document Numbering Simulator (จำลองการออกเลขจริง) */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300">
                  <Terminal className="w-4 h-4" />
                </span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  ระบบจำลองการสร้างเลขที่หนังสือราชการ (Document Number Preview)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                ACTIVE RULES ENGINE
              </span>
            </div>

            {/* Interactive Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  1. เลือกฝ่าย / กอง:
                </label>
                <select
                  value={previewDept}
                  onChange={(e) => setPreviewDept(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-600 transition-colors shadow-2xs"
                >
                  <option value="ฝ่ายยุทธศาสตร์และการจัดการ">ฝ่ายยุทธศาสตร์และการจัดการ (รย 0021.1)</option>
                  <option value="ฝ่ายสงเคราะห์ผู้ประสบภัย">ฝ่ายสงเคราะห์ผู้ประสบภัย (รย 0021.2)</option>
                  <option value="ฝ่ายป้องกันและปฏิบัติการ">ฝ่ายป้องกันและปฏิบัติการ (รย 0021.3)</option>
                  <option value="ทุกฝ่ายงาน">ทุกฝ่ายงาน (ส่วนกลาง สารบรรณกลาง)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  2. เลือกประเภทเอกสาร:
                </label>
                <select
                  value={previewDocType}
                  onChange={(e) => setPreviewDocType(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-600 transition-colors shadow-2xs"
                >
                  <option value="หนังสือรับ">หนังสือรับ (ทะเบียนรับ)</option>
                  <option value="หนังสือส่ง">หนังสือส่ง (หนังสือภายนอก/ส่งออก)</option>
                  <option value="หนังสือภายใน">หนังสือภายใน (บันทึกข้อความ)</option>
                  <option value="คำสั่ง">คำสั่ง</option>
                  <option value="ประกาศ">ประกาศ</option>
                  <option value="หนังสือรับรอง">หนังสือรับรอง</option>
                </select>
              </div>

              <div className="flex flex-col justify-end">
                {previewDocType !== 'หนังสือรับ' ? (
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-500/50 transition-colors">
                    <input
                      type="checkbox"
                      id="previewCirc"
                      checked={previewIsCircular}
                      onChange={(e) => setPreviewIsCircular(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-900 focus:ring-blue-600 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white">หนังสือเวียน (เติม "ว")</span>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">แทรกอักษร ว หน้าลำดับเลข</p>
                    </div>
                  </label>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-[11px] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>ทะเบียนหนังสือรับ รันแยกระหว่างส่วนกลางและฝ่ายงานเด็ดขาด</span>
                  </div>
                )}
              </div>
            </div>

            {/* Official Result Screen */}
            <div className="p-4 rounded-xl bg-blue-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-900/70 shadow-xs">
              <div className="space-y-1">
                <span className="text-[11px] font-mono tracking-wider text-blue-200 font-semibold uppercase flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-300" />
                  {previewDocType === 'หนังสือรับ' 
                    ? `เลขทะเบียนรับ${previewDept === 'ทุกฝ่ายงาน' ? 'สารบรรณกลาง' : ` (${previewDept})`}ถัดไป:` 
                    : 'เลขหนังสือที่จะออกถัดไป:'}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl font-bold font-mono tracking-wider text-amber-300">
                    {getDemoGeneratedNumber()}
                  </span>
                  <button
                    onClick={handleCopyDemo}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-colors border border-white/20 cursor-pointer"
                    title="คัดลอกเลขตัวอย่างนี้"
                  >
                    {copiedDemo ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">คัดลอกแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอก</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-right text-xs">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 space-y-0.5 text-left font-mono">
                  <span className="text-[10px] text-slate-300 block">ปี พ.ศ. ปัจจุบัน</span>
                  <span className="font-bold text-amber-300">{systemCurrentYear}</span>
                </div>
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 space-y-0.5 text-left font-mono">
                  <span className="text-[10px] text-slate-300 block">ระบบทะเบียน</span>
                  <span className="font-bold text-emerald-300">
                    {previewDocType === 'หนังสือรับ' ? 'ทะเบียนรับอิสระ' : 'ทะเบียนส่งออก'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rules Search & Filter Toolbar */}
          <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 flex-wrap flex-1">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหากฎออกเลข, คำนำหน้า, ฝ่ายงาน..."
                  value={rulesSearch}
                  onChange={(e) => setRulesSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl text-xs outline-none focus:border-cyan-500 text-[var(--text-primary)]"
                />
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-1.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] px-2.5 py-1 rounded-xl text-xs">
                <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-[var(--text-muted)]">ฝ่าย:</span>
                <select
                  value={rulesFilterDept}
                  onChange={(e) => setRulesFilterDept(e.target.value)}
                  className="bg-transparent text-[var(--text-primary)] font-medium outline-none cursor-pointer text-xs"
                >
                  <option value="ALL">ทุกฝ่ายงาน</option>
                  <option value="ทุกฝ่ายงาน">ทุกฝ่ายงาน (ส่วนกลาง)</option>
                  <option value="ฝ่ายยุทธศาสตร์และการจัดการ">ฝ่ายยุทธศาสตร์และการจัดการ</option>
                  <option value="ฝ่ายสงเคราะห์ผู้ประสบภัย">ฝ่ายสงเคราะห์ผู้ประสบภัย</option>
                  <option value="ฝ่ายป้องกันและปฏิบัติการ">ฝ่ายป้องกันและปฏิบัติการ</option>
                </select>
              </div>

              {/* DocType Filter */}
              <div className="flex items-center gap-1.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] px-2.5 py-1 rounded-xl text-xs">
                <Tag className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-[var(--text-muted)]">ประเภท:</span>
                <select
                  value={rulesFilterDocType}
                  onChange={(e) => setRulesFilterDocType(e.target.value)}
                  className="bg-transparent text-[var(--text-primary)] font-medium outline-none cursor-pointer text-xs"
                >
                  <option value="ALL">ทุกประเภทเอกสาร</option>
                  <option value="หนังสือส่ง">หนังสือส่ง (ภายนอก)</option>
                  <option value="หนังสือรับ">หนังสือรับ (ทะเบียนรับ)</option>
                  <option value="หนังสือภายใน">หนังสือภายใน</option>
                  <option value="คำสั่ง">คำสั่ง</option>
                  <option value="ประกาศ">ประกาศ</option>
                  <option value="หนังสือรับรอง">หนังสือรับรอง</option>
                </select>
              </div>

              {(rulesSearch || rulesFilterDept !== 'ALL' || rulesFilterDocType !== 'ALL') && (
                <button
                  onClick={() => {
                    setRulesSearch('');
                    setRulesFilterDept('ALL');
                    setRulesFilterDocType('ALL');
                  }}
                  className="text-xs text-rose-500 hover:underline px-2 py-1"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>แสดง {filteredRules.length} จาก {rules.length} กฎ</span>
              <button 
                onClick={fetchRules}
                className="p-1.5 rounded-lg hover:bg-[var(--border-lighter)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title="รีเฟรชข้อมูลกฎ"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Futuristic Rules Table */}
          <div className="border border-[var(--border-light)] rounded-2xl overflow-hidden bg-[var(--bg-surface)] shadow-sm">
            {loadingRules ? (
              <div className="p-12 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-600" /> กำลังโหลดกฎออกเลข...
              </div>
            ) : filteredRules.length === 0 ? (
              <div className="p-12 text-center text-xs text-[var(--text-muted)] space-y-2">
                <p>ไม่พบกฎออกเลขตามเงื่อนไขการค้นหา</p>
                <button
                  onClick={() => {
                    setRulesSearch('');
                    setRulesFilterDept('ALL');
                    setRulesFilterDocType('ALL');
                  }}
                  className="text-xs text-cyan-600 font-semibold hover:underline"
                >
                  ล้างคำค้นหาและแสดงทั้งหมด
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-canvas)] text-[var(--text-muted)] border-b border-[var(--border-light)] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3.5">ชื่อกฎออกเลข & รายละเอียด</th>
                      <th className="px-4 py-3.5">ฝ่าย / กอง</th>
                      <th className="px-4 py-3.5">ประเภทเอกสาร</th>
                      <th className="px-4 py-3.5">รหัสคำนำหน้า</th>
                      <th className="px-4 py-3.5 text-center">ลำดับปัจจุบัน</th>
                      <th className="px-4 py-3.5 text-center">สถานะ</th>
                      <th className="px-4 py-3.5 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)]">
                    {filteredRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                        <td className="px-4 py-3.5 font-medium text-[var(--text-primary)]">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-color)] opacity-60 group-hover:opacity-100 transition-opacity"></span>
                            <span className="font-bold">{rule.ruleName}</span>
                          </div>
                          {rule.description && (
                            <p className="text-[11px] text-[var(--text-muted)] font-normal pl-3.5 mt-0.5">
                              {rule.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-[var(--text-secondary)]">
                          <span className="inline-flex items-center gap-1.5 bg-[var(--bg-canvas)] px-2.5 py-1 rounded-lg border border-[var(--border-light)] text-[11px] font-medium">
                            <Building2 className="w-3 h-3 text-[var(--primary-color)]" />
                            {rule.department}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[var(--text-secondary)] font-medium">
                          <span className="px-2 py-0.5 rounded-md bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[11px]">
                            {rule.docType === 'หนังสือภายนอก' ? 'หนังสือส่ง' : rule.docType}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[var(--primary-color)] font-bold text-sm">
                          {rule.prefixPattern}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-[var(--text-primary)]">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 text-xs">
                            #{rule.currentSeq}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {rule.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> เปิดใช้งาน
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full border border-gray-300 dark:border-gray-700">
                              <XCircle className="w-3 h-3" /> ปิดใช้งาน
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
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
          {/* File Codes Filter & Actions */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 flex-wrap flex-1">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหารหัสแฟ้ม, ชื่อแฟ้ม, หมวดหมู่..."
                  value={fileCodesSearch}
                  onChange={(e) => setFileCodesSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl text-xs outline-none focus:border-emerald-500 text-[var(--text-primary)]"
                />
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-1.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] px-2.5 py-1 rounded-xl text-xs">
                <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-[var(--text-muted)]">ฝ่าย:</span>
                <select
                  value={fileCodesFilterDept}
                  onChange={(e) => setFileCodesFilterDept(e.target.value)}
                  className="bg-transparent text-[var(--text-primary)] font-medium outline-none cursor-pointer text-xs"
                >
                  <option value="ALL">ทุกฝ่ายงาน</option>
                  <option value="ทุกฝ่ายงาน">ทุกฝ่ายงาน (ส่วนกลาง)</option>
                  <option value="ฝ่ายยุทธศาสตร์และการจัดการ">ฝ่ายยุทธศาสตร์และการจัดการ</option>
                  <option value="ฝ่ายสงเคราะห์ผู้ประสบภัย">ฝ่ายสงเคราะห์ผู้ประสบภัย</option>
                  <option value="ฝ่ายป้องกันและปฏิบัติการ">ฝ่ายป้องกันและปฏิบัติการ</option>
                </select>
              </div>

              {(fileCodesSearch || fileCodesFilterDept !== 'ALL') && (
                <button
                  onClick={() => {
                    setFileCodesSearch('');
                    setFileCodesFilterDept('ALL');
                  }}
                  className="text-xs text-rose-500 hover:underline px-2 py-1"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {fileCodes.length > 0 && (
                <button
                  onClick={handleClearFileCodes}
                  className="px-3 py-1.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white flex items-center gap-1.5 transition-all text-xs font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" /> ล้างทั้งหมด
                </button>
              )}
              {selectedFileCodeIds.length > 0 && (
                <button
                  onClick={handleBatchDeleteFileCodes}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded-xl hover:opacity-90 flex items-center gap-1.5 transition-all text-xs font-bold shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" /> ลบที่เลือก ({selectedFileCodeIds.length})
                </button>
              )}
              <button
                onClick={fetchFileCodes}
                className="p-1.5 rounded-lg hover:bg-[var(--border-lighter)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title="รีเฟรชข้อมูลรหัสแฟ้ม"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="border border-[var(--border-light)] rounded-2xl overflow-hidden bg-[var(--bg-surface)] shadow-sm">
            {loadingFileCodes ? (
              <div className="p-12 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> กำลังโหลดรหัสหมวดแฟ้ม...
              </div>
            ) : filteredFileCodes.length === 0 ? (
              <div className="p-12 text-center text-xs text-[var(--text-muted)] space-y-3">
                <FolderOpen className="w-10 h-10 mx-auto opacity-30 text-emerald-500" />
                <p>ไม่พบรหัสหมวดแฟ้มตามเงื่อนไขที่เลือก</p>
                <button
                  onClick={() => setShowFileCodeModal(true)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs"
                >
                  เพิ่มรหัสหมวดแฟ้มใหม่
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-canvas)] text-[var(--text-muted)] border-b border-[var(--border-light)] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3.5 w-10">
                        <input
                          type="checkbox"
                          checked={filteredFileCodes.length > 0 && selectedFileCodeIds.length === filteredFileCodes.length}
                          onChange={toggleAllFileCodeSelection}
                          className="w-4 h-4 rounded accent-emerald-600 cursor-pointer mt-1"
                        />
                      </th>
                      <th className="px-4 py-3.5">รหัสแฟ้ม (Code)</th>
                      <th className="px-4 py-3.5">ชื่อหมวดแฟ้มเอกสาร</th>
                      <th className="px-4 py-3.5">ฝ่าย / กองที่รับผิดชอบ</th>
                      <th className="px-4 py-3.5 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)]">
                    {filteredFileCodes.map((code) => (
                      <tr 
                        key={code.id} 
                        className={`hover:bg-emerald-500/[0.03] transition-colors ${
                          selectedFileCodeIds.includes(code.id) ? 'bg-emerald-500/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedFileCodeIds.includes(code.id)}
                            onChange={() => toggleFileCodeSelection(code.id)}
                            className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                            {code.code}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-[var(--text-primary)]">
                          {code.name}
                          {code.description && (
                            <p className="text-[11px] text-[var(--text-muted)] font-normal mt-0.5">
                              {code.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-[var(--text-secondary)]">
                          <span className="inline-flex items-center gap-1.5 bg-[var(--bg-canvas)] px-2 py-0.5 rounded-lg border border-[var(--border-light)] text-[11px]">
                            <Building2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            {code.department}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteFileCode(code.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 transition-colors"
                            title="ลบรหัสแฟ้ม"
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
          {/* Cyber Telemetry Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-[var(--bg-surface)] to-[var(--bg-canvas)] flex items-center gap-3.5 shadow-sm">
              <span className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Bookmark className="w-5 h-5" />
              </span>
              <div>
                <p className="text-[11px] text-[var(--text-muted)] font-medium">เลขจอง / เลขสำรองพร้อมใช้งาน</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                    {reservedNumbers.filter(r => r.status === 'available').length}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-medium">รายการ</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-[var(--bg-surface)] to-[var(--bg-canvas)] flex items-center gap-3.5 shadow-sm">
              <span className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <p className="text-[11px] text-[var(--text-muted)] font-medium">นำไปออกหนังสือเรียบร้อยแล้ว</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                    {reservedNumbers.filter(r => r.status === 'used').length}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-medium">รายการ</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-[var(--bg-surface)] to-[var(--bg-canvas)] flex items-center gap-3.5 shadow-sm">
              <span className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <RotateCcw className="w-5 h-5" />
              </span>
              <div>
                <p className="text-[11px] text-[var(--text-muted)] font-medium">เลขคืนอัตโนมัติจากเอกสารยกเลิก</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
                    {reservedNumbers.filter(r => r.type === 'reclaimed' && r.status === 'available').length}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-medium">รายการ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Futuristic Multi-Criteria Filter Bar */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap flex-1">
                {/* Search */}
                <div className="relative min-w-[170px] flex-1">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาเลขที่, ผู้จอง..."
                    value={reservedSearchTerm}
                    onChange={(e) => setReservedSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl text-xs outline-none focus:border-amber-500 text-[var(--text-primary)]"
                  />
                </div>

                {/* DocType filter */}
                <div className="flex items-center gap-1.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] px-2.5 py-1.5 rounded-xl text-xs">
                  <Tag className="w-3.5 h-3.5 text-[var(--text-muted)]" />
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
                    <option value="หนังสือส่ง">หนังสือส่ง</option>
                    <option value="หนังสือภายใน">หนังสือภายใน</option>
                    <option value="หนังสือรับ">หนังสือรับ</option>
                  </select>
                </div>

                {/* Dept Filter */}
                <div className="flex items-center gap-1.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] px-2.5 py-1.5 rounded-xl text-xs">
                  <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="text-[var(--text-muted)]">ฝ่าย:</span>
                  <select
                    value={reservedFilterDept}
                    onChange={(e) => setReservedFilterDept(e.target.value)}
                    className="bg-transparent text-[var(--text-primary)] font-medium outline-none cursor-pointer text-xs"
                  >
                    <option value="ALL">ทุกฝ่ายงาน</option>
                    <option value="ทุกฝ่ายงาน">ทุกฝ่ายงาน (ส่วนกลาง)</option>
                    <option value="ฝ่ายยุทธศาสตร์และการจัดการ">ฝ่ายยุทธศาสตร์และการจัดการ</option>
                    <option value="ฝ่ายสงเคราะห์ผู้ประสบภัย">ฝ่ายสงเคราะห์ผู้ประสบภัย</option>
                    <option value="ฝ่ายป้องกันและปฏิบัติการ">ฝ่ายป้องกันและปฏิบัติการ</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] px-2.5 py-1.5 rounded-xl text-xs">
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

                {/* Date Filter */}
                <div className="flex items-center gap-1.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] px-2.5 py-1.5 rounded-xl text-xs">
                  <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="text-[var(--text-muted)]">วันที่:</span>
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

                {(reservedFilterDocType !== 'ALL' || reservedFilterDate || reservedFilterDept !== 'ALL' || reservedFilterStatus !== 'ALL' || reservedSearchTerm) && (
                  <button
                    onClick={() => {
                      setReservedFilterDocType('ALL');
                      setReservedFilterDate('');
                      setReservedFilterDept('ALL');
                      setReservedFilterStatus('ALL');
                      setReservedSearchTerm('');
                    }}
                    className="text-xs text-rose-500 hover:underline px-2 py-1"
                  >
                    ล้างตัวกรอง
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchReservedNumbers}
                  className="p-1.5 rounded-lg hover:bg-[var(--border-lighter)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  title="รีเฟรชข้อมูลคลังเลข"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {reservedNumbers.length > 0 && (
                  <button
                    onClick={handleClearReservedNumbers}
                    className="px-3 py-1.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white flex items-center gap-1.5 transition-all text-xs font-semibold"
                    title="ล้างเลขจอง/เลขสำรองทั้งหมดในคลัง"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> ล้างคลังทั้งหมด
                  </button>
                )}
                {selectedReservedIds.length > 0 && (
                  <button
                    onClick={handleBatchDeleteReserved}
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-xl hover:opacity-90 flex items-center gap-1.5 shadow-sm font-bold text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> ลบที่เลือก ({selectedReservedIds.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Reserved Table */}
          <div className="border border-[var(--border-light)] rounded-2xl overflow-hidden bg-[var(--bg-surface)] shadow-sm">
            {loadingReserved ? (
              <div className="p-12 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-600" /> กำลังโหลดคลังเลขสำรอง...
              </div>
            ) : filteredReserved.length === 0 ? (
              <div className="p-12 text-center text-xs text-[var(--text-muted)] space-y-2">
                <Bookmark className="w-10 h-10 mx-auto opacity-30 text-amber-500" />
                <p>ไม่พบเลขจองหรือเลขสำรองตามเงื่อนไขที่เลือก</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-canvas)] text-[var(--text-muted)] border-b border-[var(--border-light)] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3.5 w-10">
                        <input
                          type="checkbox"
                          checked={filteredReserved.length > 0 && selectedReservedIds.length === filteredReserved.length}
                          onChange={toggleAllReservedSelection}
                          className="w-4 h-4 rounded accent-amber-600 cursor-pointer mt-1"
                        />
                      </th>
                      <th className="px-4 py-3.5">เลขหนังสือ (Code)</th>
                      <th className="px-4 py-3.5">ประเภทการจอง</th>
                      <th className="px-4 py-3.5">วันที่จอง</th>
                      <th className="px-4 py-3.5">ฝ่าย / กอง & ประเภท</th>
                      <th className="px-4 py-3.5">ผู้จอง & วัตถุประสงค์</th>
                      <th className="px-4 py-3.5 text-center">วันหมดอายุ</th>
                      <th className="px-4 py-3.5 text-center">สถานะ</th>
                      <th className="px-4 py-3.5 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)]">
                    {filteredReserved.map((item) => (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-amber-500/[0.03] transition-colors ${
                          selectedReservedIds.includes(item.id) ? 'bg-amber-500/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedReservedIds.includes(item.id)}
                            onChange={() => toggleReservedSelection(item.id)}
                            className="w-4 h-4 rounded accent-amber-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                            {item.numberString}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {item.type === 'reclaimed' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                              <RotateCcw className="w-3 h-3" /> เลขคืนจากลบ
                            </span>
                          ) : item.type === 'auto_scheduled' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                              <Clock className="w-3 h-3" /> จองอัตโนมัติ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                              <Bookmark className="w-3 h-3" /> จองล่วงหน้า
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-light)] font-medium text-[var(--text-primary)] text-[11px]">
                            <Calendar className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                            {formatThaiDateString(item.reservedDate || item.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-[var(--text-primary)]">{item.department}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{item.docType === 'หนังสือภายนอก' ? 'หนังสือส่ง' : item.docType}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-[var(--text-primary)]">{item.reservedBy}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{item.reservedFor}</p>
                        </td>
                        <td className="px-4 py-3.5 text-center text-[var(--text-muted)] font-mono text-[11px]">
                          {item.expiresAt || 'ไม่มีกำหนด'}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {item.status === 'available' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> พร้อมใช้งาน
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full border border-blue-300 dark:border-blue-800">
                              <FileText className="w-3 h-3" /> ออกเอกสารแล้ว
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteReservedNumber(item.id, item.numberString)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 transition-colors"
                            title="ลบเลขจองนี้"
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

      {/* ================= TAB 4: SCHEDULED AUTO-RESERVATIONS ================= */}
      {activeSubTab === 'scheduled' && (
        <div className="space-y-6">
          {/* Top Banner & Info */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5 border border-purple-500/30">
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">
                    ระบบตั้งเวลาจองเลขอัตโนมัติ (Automated Reserve Daemon)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    DAEMON RUNNING
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-2xl">
                  ระบบจะทำการจองเลขสารบรรณอัตโนมัติตามตารางเวลาที่กำหนด (เช่น ทุกวัน เวลา 18:00 น.) พร้อมจัดสรรเข้าสู่คลังเลขสำรองทันที เพื่อให้เจ้าหน้าที่มีเลขพร้อมใช้งานสำหรับหนังสือเร่งด่วนช่วงเช้า
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={fetchScheduled}
                className="p-2 rounded-xl border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)] text-xs flex items-center gap-1.5"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingScheduled ? 'animate-spin' : ''}`} />
                รีเฟรช
              </button>

              <button
                onClick={() => {
                  setEditingSchedule(null);
                  setScheduleFormData({
                    name: 'จองเลขหนังสือส่งประจำวัน (รอบ 18.00 น.)',
                    department: 'ฝ่ายยุทธศาสตร์และการจัดการ',
                    docType: 'หนังสือส่ง',
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
                  setShowScheduleModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                เพิ่มคิวตั้งเวลาใหม่
              </button>
            </div>
          </div>

          {/* Schedule Tasks Cards Grid */}
          {loadingScheduled ? (
            <div className="p-12 text-center text-[var(--text-muted)] text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
              กำลังโหลดรายการตั้งเวลา...
            </div>
          ) : scheduledReservations.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[var(--bg-canvas)] border border-dashed border-[var(--border-light)] space-y-3">
              <Clock className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <h4 className="font-semibold text-sm text-[var(--text-primary)]">ยังไม่มีรายการตั้งเวลาจองเลขอัตโนมัติ</h4>
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                กดปุ่ม "เพิ่มคิวตั้งเวลาใหม่" เพื่อกำหนดเวลาจองเลขสารบรรณอัตโนมัติ เช่น ทุกวัน เวลา 18:00 น.
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
                  className={`p-5 rounded-2xl border transition-all space-y-4 shadow-sm ${
                    sch.isActive
                      ? 'bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-canvas)] border-purple-500/30 hover:border-purple-500/60'
                      : 'bg-[var(--bg-overlay)]/40 border-[var(--border-light)] opacity-75'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          sch.isActive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-gray-500/10 text-gray-500'
                        }`}>
                          {sch.isActive ? '● กำลังทำงาน' : '○ พักการทำงาน'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          {sch.docType}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-[var(--text-primary)]">{sch.name}</h4>
                    </div>

                    {/* Toggle Button */}
                    <button
                      onClick={() => handleToggleSchedule(sch.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors ${
                        sch.isActive ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border border-emerald-500/30' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 hover:bg-gray-300'
                      }`}
                      title={sch.isActive ? 'กดเพื่อปิดใช้งาน' : 'กดเพื่อเปิดใช้งาน'}
                    >
                      {sch.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span className="text-[11px] font-bold">{sch.isActive ? 'เปิดอยู่' : 'ปิดอยู่'}</span>
                    </button>
                  </div>

                  {/* Details Box */}
                  <div className="p-3.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-500" /> ช่วงเวลาการจอง:
                      </span>
                      <span className="font-bold text-[var(--text-primary)] bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-md text-[11px] border border-purple-500/20">
                        ⏰ {sch.scheduleType === 'daily' ? 'ทุกวัน' : sch.scheduleType === 'workdays' ? 'วันทำการ (จ-ศ)' : 'ประจำสัปดาห์'} เวลา {sch.scheduledTime} น.
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" /> วันที่ระบุในเลข:
                      </span>
                      <span className="font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-md text-[11px] border border-indigo-500/20">
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
                      <span className="font-semibold text-[var(--text-primary)]">
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
                      <div className="text-purple-600 dark:text-purple-400 font-semibold">รอบถัดไป: ทุกวัน เวลา {sch.scheduledTime} น.</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRunScheduleNow(sch.id, sch.name)}
                        disabled={runningScheduleId === sch.id}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
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
                        className="p-1.5 rounded-xl border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)]"
                        title="แก้ไขการตั้งเวลา"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteSchedule(sch.id, sch.name)}
                        className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400"
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
                  placeholder="เช่น หนังสือส่งออก-ฝ่ายยุทธศาสตร์และการจัดการ (รย 0021)"
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
                    <option value="หนังสือส่ง">หนังสือส่ง</option>
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
                  placeholder="เช่น รหัสออกเลขหนังสือของฝ่ายยุทธศาสตร์และการจัดการ..."
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



      {/* MODAL: CREATE FILE CODE */}
      {showFileCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-canvas)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-emerald-600" />
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
                <label className="font-semibold text-[var(--text-primary)] block mb-1">รหัสแฟ้ม:</label>
                <input
                  required
                  type="text"
                  value={fileCodeFormData.code}
                  onChange={(e) => setFileCodeFormData({ ...fileCodeFormData, code: e.target.value })}
                  placeholder="เช่น 0021 หรือ 1.1"
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] font-mono font-bold text-emerald-700 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">ชื่อหมวดแฟ้ม:</label>
                <input
                  required
                  type="text"
                  value={fileCodeFormData.name}
                  onChange={(e) => setFileCodeFormData({ ...fileCodeFormData, name: e.target.value })}
                  placeholder="เช่น หมวดงานธุรการ, หมวดงานการเงิน"
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
                  <option value="ฝ่ายยุทธศาสตร์และการจัดการ">ฝ่ายยุทธศาสตร์และการจัดการ</option>
                  <option value="ฝ่ายสงเคราะห์ผู้ประสบภัย">ฝ่ายสงเคราะห์ผู้ประสบภัย</option>
                  <option value="ฝ่ายป้องกันและปฏิบัติการ">ฝ่ายป้องกันและปฏิบัติการ</option>
                  <option value="ทุกฝ่ายงาน">ทุกฝ่ายงาน (ส่วนกลาง)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">คำอธิบาย:</label>
                <textarea
                  rows={2}
                  value={fileCodeFormData.description}
                  onChange={(e) => setFileCodeFormData({ ...fileCodeFormData, description: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับหมวดแฟ้มนี้..."
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold shadow-sm hover:opacity-90"
                >
                  บันทึกรหัสแฟ้ม
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
                    <option value="หนังสือส่ง">หนังสือส่ง</option>
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
                    <option value="หนังสือส่ง">หนังสือส่ง</option>
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
