import React, { useState, useEffect } from 'react';
import { 
  GitMerge, Clock, AlertTriangle, CheckCircle2, AlertCircle, ArrowRight, 
  Plus, Search, Filter, Send, User, Building2, BarChart2, ChevronRight, 
  Sparkles, TrendingUp, RefreshCw, Eye, Check, RotateCcw, Bell, ShieldAlert, 
  Layers, Edit, Trash2, Sliders, Calendar, Zap, Printer, FileText, X, CheckSquare, CornerUpLeft
} from 'lucide-react';
import { 
  DocumentItem, WorkflowTemplate, WorkflowInstance, WorkflowStep, 
  SLAStatus, formatThaiDateTime, formatThaiDateMedium 
} from '../../types';
import { useRealtimeSync } from '../../utils/realtimeSync';
import { useConfirm } from '../../context/ConfirmContext';

interface WorkflowSlaViewProps {
  documents: DocumentItem[];
  user: any;
  onViewDoc?: (doc: DocumentItem) => void;
}

export default function WorkflowSlaView({ documents, user, onViewDoc }: WorkflowSlaViewProps) {
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'designer' | 'tracking'>('dashboard');
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [workflowInstances, setWorkflowInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States for Dashboard & Tracking
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedSlaStatus, setSelectedSlaStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active'); // active | completed | all
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignDocId, setAssignDocId] = useState('');
  const [assignTemplateId, setAssignTemplateId] = useState('');
  const [assignSearch, setAssignSearch] = useState('');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Workflow Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resTpl, resInst] = await Promise.all([
        fetch('/api/workflows/templates').then(r => r.json()).catch(() => []),
        fetch('/api/workflows/instances').then(r => r.json()).catch(() => [])
      ]);

      if (Array.isArray(resTpl)) setWorkflowTemplates(resTpl);
      if (Array.isArray(resInst)) setWorkflowInstances(resInst);
    } catch (e) {
      console.error('Error fetching workflow data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useRealtimeSync(['WORKFLOW_UPDATED', 'DOCUMENTS_UPDATED', 'TAB_FOCUSED', 'DATA_UPDATED'], () => {
    fetchData();
  });

  // Compute Statistics
  const totalTasks = workflowInstances.length;
  const activeTasks = workflowInstances.filter(i => i.status === 'active');
  const overdueTasks = activeTasks.filter(i => i.slaStatus === 'OVERDUE');
  const warningTasks = activeTasks.filter(i => i.slaStatus === 'WARNING');
  const normalTasks = activeTasks.filter(i => i.slaStatus === 'NORMAL');
  const completedTasks = workflowInstances.filter(i => i.status === 'completed');
  const completedOnTime = completedTasks.filter(i => i.slaStatus === 'COMPLETED_ON_TIME');

  const slaSuccessRate = completedTasks.length > 0 
    ? Math.round((completedOnTime.length / completedTasks.length) * 100) 
    : 88;

  // Department Breakdown
  const depts = [
    'ฝ่ายบริหารงานทั่วไป',
    'ฝ่ายยุทธศาสตร์และการจัดการ',
    'ฝ่ายสงเคราะห์ผู้ประสบภัย',
    'ฝ่ายป้องกันและปฏิบัติการ'
  ];

  const deptStats = depts.map(deptName => {
    const deptInstances = activeTasks.filter(i => i.department === deptName);
    const overdue = deptInstances.filter(i => i.slaStatus === 'OVERDUE').length;
    const warning = deptInstances.filter(i => i.slaStatus === 'WARNING').length;
    const normal = deptInstances.filter(i => i.slaStatus === 'NORMAL').length;

    return {
      name: deptName,
      total: deptInstances.length,
      overdue,
      warning,
      normal
    };
  });

  // Filtered Instances
  const filteredInstances = workflowInstances.filter(inst => {
    if (selectedStatus !== 'all' && inst.status !== selectedStatus) return false;
    if (selectedDept !== 'all' && inst.department !== selectedDept) return false;
    if (selectedSlaStatus !== 'all' && inst.slaStatus !== selectedSlaStatus) return false;
    if (selectedPriority !== 'all' && inst.priority !== selectedPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = inst.docTitle.toLowerCase().includes(q);
      const matchNum = inst.docNumber.toLowerCase().includes(q);
      const matchAssignee = inst.assignee.toLowerCase().includes(q);
      const matchDept = inst.department.toLowerCase().includes(q);
      if (!matchTitle && !matchNum && !matchAssignee && !matchDept) return false;
    }
    return true;
  });

  // Helper SLA Time Remaining calculation
  const getTimeRemainingInfo = (dueAtStr: string, status: string) => {
    if (status === 'completed') return { text: 'เสร็จสิ้นสมบูรณ์', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50' };
    if (status === 'rejected') return { text: 'ถูกตีกลับเอกสาร', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/50' };
    
    const due = new Date(dueAtStr).getTime();
    const now = Date.now();
    const diffMs = due - now;

    if (diffMs < 0) {
      const overdueMs = Math.abs(diffMs);
      const overdueDays = Math.floor(overdueMs / (1000 * 3600 * 24));
      const overdueHours = Math.floor((overdueMs % (1000 * 3600 * 24)) / (1000 * 3600));
      const label = overdueDays > 0 ? `ช้าเกิน SLA ${overdueDays} วัน ${overdueHours} ชม.` : `ช้าเกิน SLA ${overdueHours} ชม.`;
      return { text: label, color: 'text-red-700 dark:text-red-300 font-bold', bg: 'bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800' };
    } else {
      const remainingDays = Math.floor(diffMs / (1000 * 3600 * 24));
      const remainingHours = Math.floor((diffMs % (1000 * 3600 * 24)) / (1000 * 3600));
      const label = remainingDays > 0 ? `เหลือ ${remainingDays} วัน ${remainingHours} ชม.` : `เหลือ ${remainingHours} ชม.`;
      return {
        text: label,
        color: diffMs <= 24 * 3600 * 1000 ? 'text-amber-800 dark:text-amber-300 font-bold' : 'text-emerald-700 dark:text-emerald-300 font-semibold',
        bg: diffMs <= 24 * 3600 * 1000 ? 'bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800' : 'bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800'
      };
    }
  };

  // Handle open document detail view
  const handleOpenDocDetail = (inst: WorkflowInstance) => {
    if (!onViewDoc) return;
    const matched = documents.find(d => String(d.id) === String(inst.docId) || d.docNumber === inst.docNumber);
    if (matched) {
      onViewDoc(matched);
    } else {
      onViewDoc({
        id: inst.docId || inst.id,
        docNumber: inst.docNumber,
        title: inst.docTitle,
        type: inst.docType || 'inbox',
        category: 'หนังสือเข้า',
        date: inst.startedAt,
        department: inst.department,
        assignee: inst.assignee,
        priority: inst.priority,
        status: inst.status === 'completed' ? 'อนุมัติแล้ว' : 'อยู่ระหว่างดำเนินการ'
      } as any);
    }
  };

  // Delete/Cancel Workflow Instance
  const handleDeleteInstance = async (id: string, docNumber: string) => {
    const confirmed = await confirm({
      title: 'ยืนยันการยกเลิก Workflow',
      message: `คุณต้องการยกเลิกเส้นทาง Workflow ของหนังสือเลขที่ "${docNumber}" ใช่หรือไม่?`,
      type: 'delete',
      confirmText: 'ยืนยันยกเลิก',
      cancelText: 'ปิด'
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/workflows/instances/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: user?.firstName ? `${user.firstName} ${user.lastName}` : 'ผู้ดูแลระบบ' })
      });
      if (res.ok) {
        showToast('🗑️ ยกเลิกการเสนออนุมัติ Workflow เรียบร้อยแล้ว');
        fetchData();
      }
    } catch (e) {
      console.error('Error deleting workflow instance:', e);
    }
  };

  // Progress Workflow Step Action
  const handleProgressStep = async (action: 'approve' | 'reject' | 'escalate') => {
    if (!selectedInstance) return;
    setIsSubmitting(true);
    try {
      if (action === 'escalate') {
        const res = await fetch(`/api/workflows/instances/${selectedInstance.id}/escalate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            note: actionNote || 'แจ้งเตือนเร่งรัดเอกสารเกินกำหนดเวลา SLA สารบรรณ',
            user: user?.firstName ? `${user.firstName} ${user.lastName}` : 'ผู้ดูแลระบบ'
          })
        });
        if (res.ok) {
          showToast(`⚡ ส่งใบแจ้งเตือนเร่งรัดไปยัง ${selectedInstance.assignee} (${selectedInstance.department}) สำเร็จ`);
          fetchData();
        }
      } else {
        const res = await fetch(`/api/workflows/instances/${selectedInstance.id}/step`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            note: actionNote,
            user: user?.firstName ? `${user.firstName} ${user.lastName}` : 'ผู้ดูแลระบบ'
          })
        });
        if (res.ok) {
          showToast(action === 'approve' ? '✅ อนุมัติและส่งต่อขั้นตอนถัดไปเรียบร้อยแล้ว' : '⛔ ตีกลับเอกสารเรียบร้อยแล้ว');
          fetchData();
        }
      }
      setIsProgressModalOpen(false);
      setActionNote('');
    } catch (e) {
      console.error('Error updating workflow:', e);
      showToast('เกิดข้อผิดพลาดในการปรับเปลี่ยนขั้นตอน');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Assign Workflow Instance to Document
  const handleAssignWorkflow = async () => {
    if (!assignDocId || !assignTemplateId) {
      showToast('กรุณาเลือกหนังสือและเส้นทาง Workflow');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/workflows/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: assignDocId,
          templateId: assignTemplateId,
          user: user?.firstName ? `${user.firstName} ${user.lastName}` : 'ผู้ดูแลระบบ'
        })
      });
      if (res.ok) {
        showToast('🚀 เริ่มมอบหมายเส้นทาง Workflow และติดตาม SLA สำเร็จ');
        setIsAssignModalOpen(false);
        setAssignDocId('');
        setAssignTemplateId('');
        fetchData();
      }
    } catch (e) {
      console.error('Error assigning workflow:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper SLA badge render
  const renderSlaBadge = (status: SLAStatus) => {
    switch (status) {
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            เกินกำหนด SLA (ค้างโต๊ะ)
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            ใกล้ครบกำหนด (&lt;24 ชม.)
          </span>
        );
      case 'NORMAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ปกติ (ตรงเวลา)
          </span>
        );
      case 'COMPLETED_ON_TIME':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-blue-600" />
            เสร็จสิ้นทันเวลา
          </span>
        );
      case 'COMPLETED_LATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            เสร็จสิ้นล่าช้า
          </span>
        );
      default:
        return null;
    }
  };

  // Documents available for assign modal
  const assignableDocs = documents.filter(d => {
    if (!assignSearch.trim()) return true;
    const q = assignSearch.toLowerCase();
    return d.docNumber.toLowerCase().includes(q) || d.title.toLowerCase().includes(q) || (d.department && d.department.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-gray-700 animate-in fade-in slide-in-from-top-2">
          <Zap className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[var(--primary-color)] via-blue-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden print:hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <GitMerge className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-amber-300 mb-3 border border-white/20">
            <Clock className="w-3.5 h-3.5" />
            <span>ระบบกำหนดเส้นทางเสนออนุมัติ &amp; ติดตาม SLA สารบรรณ</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-sans font-bold tracking-tight text-white mb-2">
            Workflow และ SLA ติดตามงาน
          </h1>
          <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
            ติดตามและควบคุมระยะเวลาการดำเนินงานสารบรรณ (Service Level Agreement) ลดปัญหาหนังสือค้างโต๊ะ
            พร้อมเชื่อมโยงข้อมูลทะเบียนหนังสือจริงและประวัติการสั่งการ
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>มอบหมาย Workflow ให้หนังสือ</span>
            </button>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-sm transition-all border border-white/20 active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>รีเฟรชข้อมูล</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all border border-white/20 active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์รายงานสรุป SLA</span>
            </button>
          </div>
        </div>
      </div>

      {/* SLA Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 print:grid-cols-5">
        <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-lighter)] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-secondary)]">งานค้างทั้งหมด</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{activeTasks.length}</div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">รายการที่รอดำเนินการ</p>
        </div>

        <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-lighter)] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">ปกติ (ตรงเวลา)</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{normalTasks.length}</div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">เวลาเหลือ &gt; 24 ชม.</p>
        </div>

        <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-amber-200 dark:border-amber-900 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">ใกล้ครบกำหนด</span>
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{warningTasks.length}</div>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1">เวลาเหลือ &le; 24 ชม.</p>
        </div>

        <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-red-200 dark:border-red-900 shadow-xs bg-red-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-red-700 dark:text-red-400 font-bold">เกินกำหนด (ค้างโต๊ะ)</span>
            <span className="p-1.5 rounded-lg bg-red-100 text-red-600 dark:bg-red-950/80 dark:text-red-300 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{overdueTasks.length}</div>
          <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">ต้องเร่งรัดด่วน!</p>
        </div>

        <div className="col-span-2 md:col-span-1 bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-lighter)] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-secondary)]">SLA KPI Rate</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{slaSuccessRate}%</div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${slaSuccessRate}%` }} />
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex border-b border-[var(--border-lighter)] space-x-1 sm:space-x-4 overflow-x-auto pb-0.5 print:hidden no-scrollbar">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 py-3 px-3 sm:px-4 font-medium text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'border-[var(--primary-color)] text-[var(--primary-color)] font-semibold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BarChart2 className="w-4 h-4 shrink-0" />
          <span>Dashboard งานค้าง &amp; KPI รายฝ่าย</span>
        </button>

        <button
          onClick={() => setActiveTab('designer')}
          className={`flex items-center gap-2 py-3 px-3 sm:px-4 font-medium text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'designer'
              ? 'border-[var(--primary-color)] text-[var(--primary-color)] font-semibold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <GitMerge className="w-4 h-4 shrink-0" />
          <span>กำหนดเส้นทางเอกสาร (Workflow Designer)</span>
        </button>

        <button
          onClick={() => setActiveTab('tracking')}
          className={`flex items-center gap-2 py-3 px-3 sm:px-4 font-medium text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'tracking'
              ? 'border-[var(--primary-color)] text-[var(--primary-color)] font-semibold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>รายการติดตาม &amp; ไทม์ไลน์ ({totalTasks})</span>
        </button>
      </div>

      {/* TAB 1: DASHBOARD & KPI */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-[var(--bg-surface)] p-3 sm:p-4 rounded-xl border border-[var(--border-lighter)] flex flex-col md:flex-row md:items-center gap-3 justify-between print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
              {/* Active/Completed filter */}
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-[var(--bg-primary)] border border-[var(--border-lighter)] rounded-lg px-2.5 py-2 text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="active">งานค้างอยู่ระหว่างดำเนินการ</option>
                  <option value="completed">งานที่เสร็จสิ้นแล้ว</option>
                  <option value="all">-- ทั้งหมดทุกสถานะ --</option>
                </select>
              </div>

              {/* Dept filter */}
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-[var(--bg-primary)] border border-[var(--border-lighter)] rounded-lg px-2.5 py-2 text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="all">-- ทุกฝ่ายงาน --</option>
                  {depts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* SLA status filter */}
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                <select
                  value={selectedSlaStatus}
                  onChange={e => setSelectedSlaStatus(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-[var(--bg-primary)] border border-[var(--border-lighter)] rounded-lg px-2.5 py-2 text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="all">-- ทุกสถานะ SLA --</option>
                  <option value="OVERDUE">🔴 เกินกำหนด SLA</option>
                  <option value="WARNING">🟡 ใกล้ครบกำหนด (&lt;24ชม.)</option>
                  <option value="NORMAL">🟢 ปกติ (ตรงเวลา)</option>
                  <option value="COMPLETED_ON_TIME">🔵 เสร็จสิ้นทันเวลา</option>
                </select>
              </div>

              {/* Priority filter */}
              <div className="flex items-center gap-2 min-w-0">
                <Filter className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                <select
                  value={selectedPriority}
                  onChange={e => setSelectedPriority(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-[var(--bg-primary)] border border-[var(--border-lighter)] rounded-lg px-2.5 py-2 text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="all">-- ทุกความเร่งด่วน --</option>
                  <option value="ปกติ">ปกติ</option>
                  <option value="ด่วน">ด่วน</option>
                  <option value="ด่วนมาก">ด่วนมาก</option>
                  <option value="ด่วนที่สุด">ด่วนที่สุด</option>
                </select>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="ค้นหาชื่อเรื่อง/เลขที่/ผู้รับผิดชอบ..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[var(--bg-primary)] border border-[var(--border-lighter)] rounded-lg text-[var(--text-primary)] focus:outline-none"
              />
            </div>
          </div>

          {/* Department Breakdown Visual Card */}
          <div className="bg-[var(--bg-surface)] p-4 sm:p-6 rounded-xl border border-[var(--border-lighter)] shadow-xs">
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[var(--primary-color)]" />
              <span>สรุปภาพรวมงานค้างและ SLA แยกรายฝ่าย</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {deptStats.map(ds => (
                <div key={ds.name} className="p-3.5 sm:p-4 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-primary)] space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">{ds.name}</h4>
                      <p className="text-[11px] text-[var(--text-secondary)]">งานค้างสะสม: {ds.total} เรื่อง</p>
                    </div>
                    {ds.overdue > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 shrink-0">
                        เกิน {ds.overdue}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                        ไม่ค้างช้า
                      </span>
                    )}
                  </div>

                  {/* Progress Breakdown */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] sm:text-[11px]">
                      <span className="text-emerald-600 font-medium">ปกติ ({ds.normal})</span>
                      <span className="text-amber-600 font-medium">ใกล้ครบ ({ds.warning})</span>
                      <span className="text-red-600 font-bold">เกิน SLA ({ds.overdue})</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full flex overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${ds.total > 0 ? (ds.normal / ds.total) * 100 : 0}%` }} />
                      <div className="bg-amber-400 h-full" style={{ width: `${ds.total > 0 ? (ds.warning / ds.total) * 100 : 0}%` }} />
                      <div className="bg-red-500 h-full" style={{ width: `${ds.total > 0 ? (ds.overdue / ds.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks Container */}
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-lighter)] overflow-hidden shadow-xs">
            <div className="p-4 sm:p-6 border-b border-[var(--border-lighter)] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <User className="w-5 h-5 text-[var(--primary-color)]" />
                  <span>ตารางติดตามงานและเวลาคงเหลือตาม SLA สารบรรณ</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  แสดงรายการหนังสือที่เชื่อมโยงกับทะเบียนจริง พร้อมระยะเวลา SLA คงเหลือ
                </p>
              </div>

              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                พบ {filteredInstances.length} รายการ
              </span>
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="block md:hidden divide-y divide-[var(--border-lighter)]">
              {filteredInstances.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-secondary)]">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                  <p className="text-xs">ไม่พบรายการหนังสือค้างตามเงื่อนไขที่เลือก</p>
                </div>
              ) : (
                filteredInstances.map(inst => {
                  const currentStep = inst.steps[inst.currentStepIndex] || inst.steps[0];
                  const timeInfo = getTimeRemainingInfo(inst.dueAt, inst.status);
                  return (
                    <div key={inst.id} className="p-4 space-y-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-primary)] transition-colors">
                      {/* Top Bar: Priority & Doc Number & Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-[var(--primary-color)] bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                            {inst.docNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            inst.priority === 'ด่วนที่สุด' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                            inst.priority === 'ด่วนมาก' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                            inst.priority === 'ด่วน' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {inst.priority}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenDocDetail(inst)}
                            title="เปิดดูรายละเอียดหนังสือฉบับเต็ม"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[var(--primary-color)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteInstance(inst.id, inst.docNumber)}
                            title="ยกเลิก Workflow"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Doc Title & Workflow Template */}
                      <div>
                        <button
                          onClick={() => handleOpenDocDetail(inst)}
                          className="text-xs sm:text-sm text-[var(--text-primary)] font-bold hover:underline text-left cursor-pointer leading-snug block"
                        >
                          {inst.docTitle}
                        </button>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          {inst.templateName || 'Workflow มาตรฐาน'}
                        </div>
                      </div>

                      {/* SLA Status Card */}
                      <div className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-lighter)] space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>{renderSlaBadge(inst.slaStatus)}</div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] ${timeInfo.bg} ${timeInfo.color}`}>
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{timeInfo.text}</span>
                          </span>
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[var(--text-secondary)] shrink-0" />
                          <span>กำหนดส่ง: {formatThaiDateTime(inst.dueAt)}</span>
                        </div>
                      </div>

                      {/* Current Step & Assignee Grid */}
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900">
                          <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">ขั้นตอนปัจจุบัน</div>
                          <div className="font-semibold text-indigo-900 dark:text-indigo-200 mt-0.5">
                            ขั้นที่ {inst.currentStepIndex + 1}/{inst.steps.length}: {currentStep?.title}
                          </div>
                          <div className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                            ผู้พิจารณา: {currentStep?.assignedRole}
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">ผู้รับผิดชอบงาน</div>
                            <div className="font-semibold text-[var(--text-primary)]">{inst.assignee}</div>
                          </div>
                          <div className="text-right text-[11px] text-[var(--text-secondary)] font-medium">
                            {inst.department}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-1 flex items-center gap-2">
                        {inst.status === 'active' && (
                          <button
                            onClick={() => {
                              setSelectedInstance(inst);
                              setIsProgressModalOpen(true);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-[var(--primary-color)] text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <Check className="w-4 h-4" />
                            <span>อนุมัติ / ส่งต่อ</span>
                          </button>
                        )}

                        {inst.slaStatus === 'OVERDUE' && inst.status === 'active' && (
                          <button
                            onClick={() => {
                              setSelectedInstance(inst);
                              setActionNote('หนังสือเกินกำหนดเวลา SLA กรุณาดำเนินการโดยด่วนที่สุด');
                              handleProgressStep('escalate');
                            }}
                            className="py-2 px-3 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 border border-red-200 dark:border-red-800"
                          >
                            <Bell className="w-4 h-4" />
                            <span>เร่งรัด SLA</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-primary)] border-b border-[var(--border-lighter)] text-[11px] sm:text-xs text-[var(--text-secondary)] uppercase font-semibold">
                    <th className="py-3 px-4">เลขที่ / เรื่องหนังสือ</th>
                    <th className="py-3 px-4">ฝ่าย / ผู้รับผิดชอบ</th>
                    <th className="py-3 px-4">ขั้นตอนปัจจุบัน</th>
                    <th className="py-3 px-4">สถานะ SLA &amp; เวลาคงเหลือ</th>
                    <th className="py-3 px-4 text-center">ความเร่งด่วน</th>
                    <th className="py-3 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-lighter)] text-xs sm:text-sm">
                  {filteredInstances.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[var(--text-secondary)]">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                        <p>ไม่พบรายการหนังสือค้างตามเงื่อนไขที่เลือก</p>
                      </td>
                    </tr>
                  ) : (
                    filteredInstances.map(inst => {
                      const currentStep = inst.steps[inst.currentStepIndex] || inst.steps[0];
                      const timeInfo = getTimeRemainingInfo(inst.dueAt, inst.status);
                      return (
                        <tr key={inst.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                          <td className="py-3.5 px-4 font-medium max-w-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[var(--primary-color)]">{inst.docNumber}</span>
                              <button
                                onClick={() => handleOpenDocDetail(inst)}
                                title="เปิดดูรายละเอียดหนังสือฉบับเต็ม"
                                className="p-1 rounded text-gray-400 hover:text-[var(--primary-color)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <button
                              onClick={() => handleOpenDocDetail(inst)}
                              className="text-xs sm:text-sm text-[var(--text-primary)] font-semibold line-clamp-1 mt-0.5 hover:underline text-left cursor-pointer"
                            >
                              {inst.docTitle}
                            </button>
                            <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                              {inst.templateName || 'Workflow มาตรฐาน'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[var(--text-primary)]">{inst.assignee}</div>
                            <div className="text-[11px] text-[var(--text-secondary)]">{inst.department}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs font-semibold">
                              <span>ขั้นที่ {inst.currentStepIndex + 1}/{inst.steps.length}:</span>
                              <span>{currentStep?.title}</span>
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                              ผู้พิจารณา: {currentStep?.assignedRole}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div>{renderSlaBadge(inst.slaStatus)}</div>
                            <div className="mt-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${timeInfo.bg} ${timeInfo.color}`}>
                                <Clock className="w-3 h-3" />
                                <span>{timeInfo.text}</span>
                              </span>
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                              กำหนดส่ง: {formatThaiDateTime(inst.dueAt)}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              inst.priority === 'ด่วนที่สุด' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                              inst.priority === 'ด่วนมาก' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                              inst.priority === 'ด่วน' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                              {inst.priority}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {inst.status === 'active' && (
                                <button
                                  onClick={() => {
                                    setSelectedInstance(inst);
                                    setIsProgressModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-[var(--primary-color)] text-white text-xs font-medium hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>อนุมัติ/ส่งต่อ</span>
                                </button>
                              )}

                              {inst.slaStatus === 'OVERDUE' && inst.status === 'active' && (
                                <button
                                  onClick={() => {
                                    setSelectedInstance(inst);
                                    setActionNote('หนังสือเกินกำหนดเวลา SLA กรุณาดำเนินการโดยด่วนที่สุด');
                                    handleProgressStep('escalate');
                                  }}
                                  title="ส่งใบแจ้งเตือนเร่งรัด"
                                  className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300 transition-all cursor-pointer"
                                >
                                  <Bell className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteInstance(inst.id, inst.docNumber)}
                                title="ยกเลิก Workflow เรื่องนี้"
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 dark:hover:bg-red-950 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WORKFLOW DESIGNER */}
      {activeTab === 'designer' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">กำหนดแม่แบบเส้นทางเสนออนุมัติ (Workflow Designer)</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                จัดการลำดับขั้น ผู้อนุมัติ และกำหนดระยะเวลา SLA ในแต่ละขั้นตอน
              </p>
            </div>

            <button
              onClick={() => {
                setEditingTemplate({
                  id: `tpl-${Date.now()}`,
                  name: '',
                  description: '',
                  category: 'หนังสือรับ',
                  defaultPriority: 'ปกติ',
                  steps: [
                    { stepNumber: 1, title: 'รับเรื่องและคัดกรองเอกสาร', assignedRole: 'เจ้าหน้าที่สารบรรณ', department: 'ฝ่ายบริหารงานทั่วไป', actionType: 'review', slaHours: 24 },
                    { stepNumber: 2, title: 'พิจารณาอนุมัติ/ลงนาม', assignedRole: 'หัวหน้าสำนักงาน ปภ.จังหวัด', department: 'ผู้บริหาร', actionType: 'approve', slaHours: 24 }
                  ]
                });
                setIsTemplateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary-color)] text-white text-xs sm:text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างแม่แบบ Workflow ใหม่</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflowTemplates.map(tpl => (
              <div key={tpl.id} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-lighter)] p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-[var(--primary-color)] transition-all">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {tpl.category}
                    </span>
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      {tpl.steps.length} ขั้นตอน
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4">
                    {tpl.description}
                  </p>

                  {/* Steps visual list */}
                  <div className="space-y-2 border-t border-[var(--border-lighter)] pt-3">
                    <div className="text-[11px] font-semibold text-[var(--text-secondary)]">เส้นทางตามลำดับขั้น:</div>
                    {tpl.steps.map((st, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[var(--bg-primary)]">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[var(--primary-color)] text-white flex items-center justify-center text-[10px] font-bold">
                            {st.stepNumber}
                          </span>
                          <span className="font-medium text-[var(--text-primary)]">{st.title}</span>
                        </div>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                          SLA {st.slaHours} ชม.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[var(--border-lighter)] text-xs">
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    รวม SLA: {tpl.steps.reduce((acc, curr) => acc + (curr.slaHours || 0), 0)} ชั่วโมง
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setEditingTemplate(tpl);
                        setIsTemplateModalOpen(true);
                      }}
                      className="text-[var(--primary-color)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>แก้ไข</span>
                    </button>
                    <button
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'ยืนยันการลบแม่แบบ Workflow',
                          message: `คุณต้องการลบแม่แบบ "${tpl.name}" ออกจากระบบใช่หรือไม่?`,
                          type: 'delete',
                          confirmText: 'ยืนยันการลบ',
                          cancelText: 'ยกเลิก'
                        });
                        if (!confirmed) return;
                        try {
                          await fetch(`/api/workflows/templates/${tpl.id}`, { method: 'DELETE' });
                          showToast('ลบแม่แบบเรียบร้อยแล้ว');
                          fetchData();
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="text-red-500 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบ</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TRACKING & ESCALATION QUEUE */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-surface)] p-6 rounded-xl border border-[var(--border-lighter)]">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--primary-color)]" />
              <span>รายการติดตามความคืบหน้า และไทม์ไลน์การดำเนินงาน</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-6">
              แสดงสถานะไทม์ไลน์จริงของเอกสารแต่ละเรื่อง พร้อมบันทึกประวัติการสั่งการ และปุ่มส่งการแจ้งเตือนเร่งรัด
            </p>

            <div className="space-y-4">
              {filteredInstances.length === 0 ? (
                <div className="py-12 text-center text-[var(--text-secondary)]">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-60" />
                  <p>ไม่พบรายการติดตามที่ตรงกับเงื่อนไข</p>
                </div>
              ) : (
                filteredInstances.map(inst => {
                  const currentStep = inst.steps[inst.currentStepIndex] || inst.steps[0];
                  const timeInfo = getTimeRemainingInfo(inst.dueAt, inst.status);
                  return (
                    <div
                      key={inst.id}
                      className={`p-5 rounded-xl border transition-all ${
                        inst.slaStatus === 'OVERDUE'
                          ? 'border-red-300 dark:border-red-800 bg-red-50/20'
                          : inst.slaStatus === 'WARNING'
                          ? 'border-amber-300 dark:border-amber-800 bg-amber-50/20'
                          : 'border-[var(--border-lighter)] bg-[var(--bg-primary)]'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-[var(--primary-color)]">{inst.docNumber}</span>
                            {renderSlaBadge(inst.slaStatus)}
                            <span className={`text-[11px] px-2 py-0.5 rounded ${timeInfo.bg} ${timeInfo.color}`}>
                              {timeInfo.text}
                            </span>
                          </div>
                          <button
                            onClick={() => handleOpenDocDetail(inst)}
                            className="text-base font-bold text-[var(--text-primary)] mt-1 hover:underline text-left cursor-pointer block"
                          >
                            {inst.docTitle}
                          </button>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            ผู้รับผิดชอบ: <span className="font-semibold text-[var(--text-primary)]">{inst.assignee}</span> ({inst.department})
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenDocDetail(inst)}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border-lighter)] text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ดูฉบับเต็ม</span>
                          </button>

                          {inst.status === 'active' && (
                            <button
                              onClick={() => {
                                setSelectedInstance(inst);
                                setIsProgressModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[var(--primary-color)] text-white text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
                            >
                              อนุมัติ / ส่งต่อ
                            </button>
                          )}

                          {inst.slaStatus === 'OVERDUE' && inst.status === 'active' && (
                            <button
                              onClick={() => {
                                setSelectedInstance(inst);
                                setActionNote('แจ้งเตือนเร่งรัดหนังสือค้างโต๊ะ');
                                handleProgressStep('escalate');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Bell className="w-3.5 h-3.5" />
                              <span>ส่งใบเตือนเร่งรัด</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Step Progress Timeline */}
                      <div className="relative border-t border-[var(--border-lighter)] pt-4 mt-2">
                        <div className="text-xs font-semibold text-[var(--text-secondary)] mb-3">ไทม์ไลน์การเสนออนุมัติ:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          {inst.steps.map((st, idx) => {
                            const isCurrent = idx === inst.currentStepIndex && inst.status === 'active';
                            const isPassed = idx < inst.currentStepIndex || inst.status === 'completed';
                            return (
                              <div
                                key={idx}
                                className={`p-3 rounded-lg border text-xs relative ${
                                  isCurrent
                                    ? 'border-[var(--primary-color)] bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-[var(--primary-color)]'
                                    : isPassed
                                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/30'
                                    : 'border-gray-200 dark:border-gray-800 opacity-60'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-[11px] text-[var(--text-primary)]">
                                    ขั้นที่ {st.stepNumber}: {st.title}
                                  </span>
                                  {isPassed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  ) : isCurrent ? (
                                    <Clock className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                                  ) : null}
                                </div>
                                <div className="text-[11px] text-[var(--text-secondary)]">{st.assignedRole}</div>
                                {st.actionBy && (
                                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1">
                                    อนุมัติโดย: {st.actionBy} ({formatThaiDateMedium(st.actionAt)})
                                  </div>
                                )}
                                {st.actionNote && (
                                  <div className="text-[10px] text-[var(--text-muted)] italic mt-0.5 line-clamp-1">
                                    "{st.actionNote}"
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Assign Workflow */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[var(--border-lighter)] space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3">
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-[var(--primary-color)]" />
                <span>มอบหมายเส้นทาง Workflow ให้หนังสือ</span>
              </h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  1. เลือกหนังสือจากทะเบียน ({assignableDocs.length} เรื่อง):
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="พิมพ์ค้นหาเลขที่หนังสือ หรือ ชื่อเรื่อง..."
                    value={assignSearch}
                    onChange={e => setAssignSearch(e.target.value)}
                    className="w-full text-xs bg-[var(--bg-primary)] border border-[var(--border-lighter)] rounded-lg pl-8 pr-3 py-1.5 text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <select
                  value={assignDocId}
                  onChange={e => setAssignDocId(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-[var(--bg-primary)] border border-[var(--border-lighter)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="">-- เลือกรายการหนังสือ --</option>
                  {assignableDocs.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.docNumber} - {d.title} ({d.department || 'ไม่ระบุฝ่าย'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  2. เลือกแม่แบบ Workflow &amp; SLA:
                </label>
                <select
                  value={assignTemplateId}
                  onChange={e => setAssignTemplateId(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-[var(--bg-primary)] border border-[var(--border-lighter)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="">-- เลือกแม่แบบเส้นทาง --</option>
                  {workflowTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.steps.length} ขั้นตอน, รวม {t.steps.reduce((a, b) => a + b.slaHours, 0)} ชม.)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-lighter)]">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAssignWorkflow}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--primary-color)] text-white hover:opacity-90 cursor-pointer shadow-md"
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'เริ่มมอบหมายเส้นทาง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Step Progress Action */}
      {isProgressModalOpen && selectedInstance && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[var(--border-lighter)] space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Check className="w-5 h-5 text-[var(--primary-color)]" />
                <span>พิจารณาอนุมัติ / ส่งต่อขั้นตอนถัดไป</span>
              </h3>
              <button
                onClick={() => setIsProgressModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 bg-[var(--bg-primary)] p-4 rounded-xl text-xs">
              <div>
                <span className="font-semibold text-[var(--text-secondary)]">เรื่อง: </span>
                <span className="font-bold text-[var(--text-primary)]">{selectedInstance.docTitle}</span>
              </div>
              <div>
                <span className="font-semibold text-[var(--text-secondary)]">ขั้นตอนปัจจุบัน: </span>
                <span className="font-bold text-[var(--primary-color)]">
                  ขั้นที่ {selectedInstance.currentStepIndex + 1}: {selectedInstance.steps[selectedInstance.currentStepIndex]?.title}
                </span>
              </div>
              <div>
                <span className="font-semibold text-[var(--text-secondary)]">กำหนดเวลา SLA: </span>
                <span>{formatThaiDateTime(selectedInstance.dueAt)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                หมายเหตุ / สั่งการ / ความเห็นเพิ่มเติม:
              </label>
              <textarea
                rows={3}
                placeholder="ระบุข้อความสั่งการ หรือความเห็น..."
                value={actionNote}
                onChange={e => setActionNote(e.target.value)}
                className="w-full text-xs sm:text-sm bg-[var(--bg-primary)] border border-[var(--border-lighter)] rounded-xl p-3 text-[var(--text-primary)] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-lighter)]">
              <button
                onClick={() => handleProgressStep('reject')}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300 cursor-pointer"
              >
                ตีกลับเอกสาร
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsProgressModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => handleProgressStep('approve')}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--primary-color)] text-white hover:opacity-90 cursor-pointer shadow-md"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'อนุมัติ / ส่งต่อ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Template Editor Modal */}
      {isTemplateModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-[var(--border-lighter)] space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3">
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-[var(--primary-color)]" />
                <span>จัดการแม่แบบเส้นทางเสนออนุมัติ (Workflow)</span>
              </h3>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">ชื่อแม่แบบ Workflow:</label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="เช่น เส้นทางหนังสือรับทั่วไป"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-lighter)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">คำอธิบาย:</label>
                <input
                  type="text"
                  value={editingTemplate.description}
                  onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  placeholder="คำอธิบายสั้นๆ ของเส้นทางนี้"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-lighter)] rounded-xl p-2.5 text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              {/* Steps Designer */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--text-primary)]">ลำดับขั้นตอนการเสนออนุมัติ:</span>
                  <button
                    onClick={() => {
                      const newStepNum = editingTemplate.steps.length + 1;
                      setEditingTemplate({
                        ...editingTemplate,
                        steps: [
                          ...editingTemplate.steps,
                          {
                            stepNumber: newStepNum,
                            title: `ขั้นตอนที่ ${newStepNum}`,
                            assignedRole: 'ผู้รับผิดชอบ',
                            department: 'ฝ่ายปฏิบัติการ',
                            actionType: 'approve',
                            slaHours: 24
                          }
                        ]
                      });
                    }}
                    className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มขั้นตอน</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {editingTemplate.steps.map((st, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-primary)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[var(--primary-color)]">ขั้นตอนที่ {st.stepNumber}</span>
                        {editingTemplate.steps.length > 1 && (
                          <button
                            onClick={() => {
                              const updated = editingTemplate.steps
                                .filter((_, i) => i !== idx)
                                .map((s, i) => ({ ...s, stepNumber: i + 1 }));
                              setEditingTemplate({ ...editingTemplate, steps: updated });
                            }}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold cursor-pointer"
                          >
                            ลบขั้นตอนนี้
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] text-[var(--text-secondary)] mb-0.5">ชื่อขั้นตอน:</label>
                          <input
                            type="text"
                            value={st.title}
                            onChange={e => {
                              const updated = [...editingTemplate.steps];
                              updated[idx].title = e.target.value;
                              setEditingTemplate({ ...editingTemplate, steps: updated });
                            }}
                            className="w-full bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-lg p-2 text-xs text-[var(--text-primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-[var(--text-secondary)] mb-0.5">ตำแหน่ง/บทบาทผู้พิจารณา:</label>
                          <input
                            type="text"
                            value={st.assignedRole}
                            onChange={e => {
                              const updated = [...editingTemplate.steps];
                              updated[idx].assignedRole = e.target.value;
                              setEditingTemplate({ ...editingTemplate, steps: updated });
                            }}
                            className="w-full bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-lg p-2 text-xs text-[var(--text-primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-[var(--text-secondary)] mb-0.5">SLA (ชั่วโมง):</label>
                          <input
                            type="number"
                            value={st.slaHours}
                            onChange={e => {
                              const updated = [...editingTemplate.steps];
                              updated[idx].slaHours = parseInt(e.target.value, 10) || 24;
                              setEditingTemplate({ ...editingTemplate, steps: updated });
                            }}
                            className="w-full bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-lg p-2 text-xs text-[var(--text-primary)]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-lighter)]">
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/workflows/templates', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(editingTemplate)
                    });
                    showToast('บันทึกแม่แบบ Workflow สำเร็จ');
                    setIsTemplateModalOpen(false);
                    fetchData();
                  } catch (e) {
                    console.error('Error saving template:', e);
                  }
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--primary-color)] text-white hover:opacity-90 cursor-pointer shadow-md"
              >
                บันทึกแม่แบบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
