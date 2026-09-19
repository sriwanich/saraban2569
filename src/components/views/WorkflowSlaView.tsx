import React, { useState, useEffect, useMemo } from 'react';
import { 
  Workflow, CheckCircle2, Clock, AlertTriangle, ArrowRight, Plus, 
  Search, FileText, RefreshCw, Trash2, 
  Edit3, Play, ChevronRight, CornerDownRight, Bell, AlertCircle, FileCheck, X,
  Filter, ChevronDown, ChevronUp, SlidersHorizontal, Sparkles, History, 
  Building2, Calendar, MoveUp, MoveDown,
  Layers, Check, Eye, MessageSquare, Flame, CheckCheck, Undo2, ArrowUpDown
} from 'lucide-react';
import { 
  DocumentItem, WorkflowTemplate, WorkflowInstance, WorkflowStep, SLAStatus, User,
  formatThaiDate, formatThaiDateTime, formatThaiDateShort 
} from '../../types';
import { useRealtimeSync } from '../../utils/realtimeSync';
import { useConfirm } from '../../context/ConfirmContext';

interface WorkflowSlaViewProps {
  documents: DocumentItem[];
  user: User | null;
  onViewDoc: (doc: DocumentItem | string) => void;
}

export default function WorkflowSlaView({ documents, user, onViewDoc }: WorkflowSlaViewProps) {
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'instances' | 'designer'>('instances');
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [workflowInstances, setWorkflowInstances] = useState<WorkflowInstance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'sla_urgent' | 'created_desc' | 'doc_number'>('sla_urgent');
  
  // Expand/collapse instance details (audit trail/notes)
  const [expandedInstanceIds, setExpandedInstanceIds] = useState<Record<string, boolean>>({});

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [docSearchInModal, setDocSearchInModal] = useState<string>('');

  const [isStepModalOpen, setIsStepModalOpen] = useState<boolean>(false);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [stepAction, setStepAction] = useState<'approve' | 'reject'>('approve');
  const [actionNote, setActionNote] = useState<string>('');

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<{
    id?: string;
    name: string;
    description: string;
    category: string;
    defaultPriority: 'ด่วนที่สุด' | 'ด่วนมาก' | 'ด่วน' | 'ปกติ';
    steps: WorkflowStep[];
  }>({
    name: '',
    description: '',
    category: 'หนังสือรับ',
    defaultPriority: 'ปกติ',
    steps: []
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Workflow Data
  const fetchData = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync real-time updates
  useRealtimeSync(['WORKFLOW_UPDATED', 'DOCUMENTS_UPDATED', 'TAB_FOCUSED', 'DATA_UPDATED'], () => {
    fetchData();
  });

  // Analytics Counters
  const totalTasks = workflowInstances.length;
  const activeTasks = useMemo(() => workflowInstances.filter(i => i.status === 'active'), [workflowInstances]);
  const overdueTasks = useMemo(() => workflowInstances.filter(i => i.status === 'active' && i.slaStatus === 'OVERDUE'), [workflowInstances]);
  const completedTasks = useMemo(() => workflowInstances.filter(i => i.status === 'completed'), [workflowInstances]);

  // Unique departments for filter
  const departmentsList = useMemo(() => {
    const deps = new Set<string>();
    workflowInstances.forEach(i => {
      if (i.department) deps.add(i.department);
    });
    documents.forEach(d => {
      if (d.department) deps.add(d.department);
    });
    return Array.from(deps).filter(Boolean).sort();
  }, [workflowInstances, documents]);

  // Toggle instance expanded notes
  const toggleInstanceExpand = (id: string) => {
    setExpandedInstanceIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Helper SLA status styling & countdown
  const getSLAInfo = (slaStatus: SLAStatus, dueAtStr: string, startedAtStr?: string) => {
    const dueTime = new Date(dueAtStr).getTime();
    const nowTime = Date.now();
    const diffMs = dueTime - nowTime;
    const diffHours = Math.round(diffMs / (1000 * 3600));
    const absHours = Math.abs(diffHours);
    const days = Math.floor(absHours / 24);
    const remainingHours = absHours % 24;

    const timeString = days > 0 
      ? `${days} วัน ${remainingHours > 0 ? `${remainingHours} ชม.` : ''}`.trim()
      : `${absHours} ชม.`;

    // Calculate percentage if startedAt exists
    let progressPercent = 0;
    if (startedAtStr) {
      const startTime = new Date(startedAtStr).getTime();
      const totalDuration = dueTime - startTime;
      const elapsed = nowTime - startTime;
      if (totalDuration > 0) {
        progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
      }
    }

    switch (slaStatus) {
      case 'OVERDUE':
        return {
          label: `เกินกำหนด (${timeString})`,
          badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
          barClass: 'bg-rose-500',
          percent: 100,
          isOverdue: true,
          icon: AlertCircle
        };
      case 'WARNING':
        return {
          label: `ใกล้ครบกำหนด (เหลือ ${timeString})`,
          badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
          barClass: 'bg-amber-500',
          percent: progressPercent || 85,
          isOverdue: false,
          icon: AlertTriangle
        };
      case 'COMPLETED_ON_TIME':
        return {
          label: 'เสร็จสิ้นตรงเวลา',
          badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          barClass: 'bg-emerald-500',
          percent: 100,
          isOverdue: false,
          icon: CheckCircle2
        };
      case 'COMPLETED_LATE':
        return {
          label: 'เสร็จสิ้นเกินกำหนดเวลา',
          badgeClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
          barClass: 'bg-orange-500',
          percent: 100,
          isOverdue: false,
          icon: Clock
        };
      default:
        return {
          label: `ปกติ (เหลือ ${timeString})`,
          badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
          barClass: 'bg-sky-500',
          percent: progressPercent || 40,
          isOverdue: false,
          icon: Clock
        };
    }
  };

  // Helper priority styling
  const getPriorityInfo = (priority?: string) => {
    switch (priority) {
      case 'ด่วนที่สุด':
        return {
          badgeClass: 'bg-rose-600 text-white border-rose-600 shadow-xs',
          icon: Flame
        };
      case 'ด่วนมาก':
        return {
          badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
          icon: AlertTriangle
        };
      case 'ด่วน':
        return {
          badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          icon: Clock
        };
      default:
        return {
          badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
          icon: FileText
        };
    }
  };

  // Filter & Sort Instances
  const filteredInstances = useMemo(() => {
    let list = workflowInstances.filter(inst => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        inst.docNumber.toLowerCase().includes(q) ||
        inst.docTitle.toLowerCase().includes(q) ||
        (inst.assignee && inst.assignee.toLowerCase().includes(q)) ||
        (inst.department && inst.department.toLowerCase().includes(q)) ||
        (inst.templateName && inst.templateName.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === 'active' && inst.status !== 'active') return false;
      if (statusFilter === 'overdue' && !(inst.status === 'active' && inst.slaStatus === 'OVERDUE')) return false;
      if (statusFilter === 'completed' && inst.status !== 'completed') return false;

      if (priorityFilter !== 'all' && inst.priority !== priorityFilter) return false;
      if (departmentFilter !== 'all' && inst.department !== departmentFilter) return false;

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'sla_urgent') {
        // Overdue first, then warning, then normal, completed last
        const score = (item: WorkflowInstance) => {
          if (item.status === 'completed') return 999;
          if (item.slaStatus === 'OVERDUE') return 1;
          if (item.slaStatus === 'WARNING') return 2;
          return 3;
        };
        const scoreA = score(a);
        const scoreB = score(b);
        if (scoreA !== scoreB) return scoreA - scoreB;
        // Compare due time
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      } else if (sortBy === 'created_desc') {
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      } else {
        return a.docNumber.localeCompare(b.docNumber, 'th');
      }
    });

    return list;
  }, [workflowInstances, searchQuery, statusFilter, priorityFilter, departmentFilter, sortBy]);

  const handleOpenDocDetail = (inst: WorkflowInstance) => {
    const foundDoc = documents.find(d => d.id === inst.docId || d.docNumber === inst.docNumber);
    if (foundDoc) {
      onViewDoc(foundDoc);
    } else {
      onViewDoc(inst.docNumber);
    }
  };

  // Delete/Cancel Workflow Instance
  const handleDeleteInstance = async (id: string, docNumber: string) => {
    const isConfirmed = await confirm({
      title: 'ยืนยันการยกเลิกการติดตามเส้นทาง Workflow',
      message: `คุณต้องการยกเลิกและลบการติดตามผังการเดินเอกสารของหนังสือเลขที่ "${docNumber}" ใช่หรือไม่?`,
      type: 'delete',
      confirmText: 'ยืนยันยกเลิก',
      cancelText: 'ปิดหน้าต่าง'
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/workflows/instances/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'ผู้ดูแลระบบ' })
      });
      if (res.ok) {
        showToast('ยกเลิกรายการติดตาม Workflow เรียบร้อยแล้ว');
        fetchData();
      }
    } catch (e) {
      console.error('Error deleting workflow instance:', e);
    }
  };

  // Clear all Workflow Instances
  const handleClearAllInstances = async () => {
    const isConfirmed = await confirm({
      title: 'ยืนยันการล้างข้อมูลติดตามทั้งหมด',
      message: 'คุณต้องการลบข้อมูลตัวอย่างและรายการติดตามการเดินเอกสารทั้งหมดในระบบใช่หรือไม่? (การดำเนินการนี้ไม่กระทบกับตัวหนังสือราชการหลัก)',
      type: 'delete',
      confirmText: 'ยืนยันล้างข้อมูลทั้งหมด',
      cancelText: 'ยกเลิก'
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch('/api/workflows/instances/clear-all', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'ผู้ดูแลระบบ' })
      });
      if (res.ok) {
        showToast('ล้างข้อมูลการเดินเอกสารและติดตาม SLA ทั้งหมดเรียบร้อยแล้ว');
        fetchData();
      }
    } catch (e) {
      console.error('Error clearing workflow instances:', e);
    }
  };

  // Progress Workflow Step Action
  const handleProcessStep = async () => {
    if (!selectedInstance) return;
    try {
      const res = await fetch(`/api/workflows/instances/${selectedInstance.id}/step`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: stepAction,
          note: actionNote || (stepAction === 'approve' ? 'เห็นชอบตามเสนอ' : 'ส่งคืนเพื่อตรวจสอบแก้ไข'),
          user: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'ผู้ปฏิบัติงาน'
        })
      });
      if (res.ok) {
        showToast(stepAction === 'approve' ? 'เกษียณหนังสือ / ส่งต่อขั้นตอนถัดไปเรียบร้อยแล้ว' : 'ส่งคืนเอกสารเพื่อแก้ไขเรียบร้อยแล้ว');
        setIsStepModalOpen(false);
        setActionNote('');
        fetchData();
      }
    } catch (e) {
      console.error('Error updating workflow:', e);
    }
  };

  // Send Escalation SLA Notice
  const handleEscalateSla = async (inst: WorkflowInstance) => {
    try {
      const res = await fetch(`/api/workflows/instances/${inst.id}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: 'ส่งใบเตือนเร่งรัด SLA ตามระเบียบสารบรรณ',
          user: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'ผู้ดูแลระบบ'
        })
      });
      if (res.ok) {
        showToast(`ส่งใบแจ้งเตือนเร่งรัด SLA สำหรับหนังสือ ${inst.docNumber} สำเร็จแล้ว`);
        fetchData();
      }
    } catch (e) {
      console.error('Error escalating workflow:', e);
    }
  };

  // Assign Workflow Instance to Document
  const handleAssignWorkflow = async () => {
    if (!selectedDocId || !selectedTemplateId) {
      showToast('กรุณาเลือกหนังสือและแม่แบบเส้นทาง Workflow');
      return;
    }
    const targetDoc = documents.find(d => String(d.id) === String(selectedDocId) || d.docNumber === selectedDocId);
    try {
      const res = await fetch('/api/workflows/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: selectedDocId,
          docNumber: targetDoc?.docNumber,
          docTitle: targetDoc?.title,
          department: targetDoc?.department,
          assignee: targetDoc?.assignee,
          priority: targetDoc?.priority,
          templateId: selectedTemplateId,
          user: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'ผู้เสนอเรื่อง'
        })
      });
      if (res.ok) {
        showToast('เริ่มเสนอเรื่องและเปิดผังติดตาม SLA เรียบร้อยแล้ว');
        setIsAssignModalOpen(false);
        setSelectedDocId('');
        setSelectedTemplateId('');
        fetchData();
      }
    } catch (e) {
      console.error('Error assigning workflow:', e);
    }
  };

  // Save / Edit Workflow Template
  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) {
      showToast('กรุณาระบุชื่อแม่แบบ Workflow');
      return;
    }
    if (!templateForm.steps || templateForm.steps.length === 0) {
      showToast('กรุณาเพิ่มอย่างน้อย 1 ขั้นตอนในเส้นทางเสนอหนังสือ');
      return;
    }

    try {
      const res = await fetch('/api/workflows/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...templateForm,
          id: templateForm.id || `tpl-${Date.now()}`
        })
      });
      if (res.ok) {
        showToast('บันทึกแม่แบบเส้นทางเสนอหนังสือเรียบร้อยแล้ว');
        setIsTemplateModalOpen(false);
        fetchData();
      }
    } catch (e) {
      console.error('Error saving template:', e);
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'ยืนยันการลบแม่แบบ Workflow',
      message: `คุณต้องการลบแม่แบบเส้นทางเสนอหนังสือ "${name}" ใช่หรือไม่?`,
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/workflows/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('ลบแม่แบบเรียบร้อยแล้ว');
        fetchData();
      }
    } catch (e) {
      console.error('Error deleting template:', e);
    }
  };

  const handleAddStepToForm = () => {
    const nextNum = templateForm.steps.length + 1;
    setTemplateForm(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          stepNumber: nextNum,
          title: `ขั้นตอนที่ ${nextNum}`,
          assignedRole: 'หัวหน้าฝ่าย/กลุ่มงาน',
          department: 'ฝ่ายยุทธศาสตร์และการจัดการ',
          actionType: 'review',
          slaHours: 24
        }
      ]
    }));
  };

  const handleRemoveStepFromForm = (index: number) => {
    const updated = templateForm.steps.filter((_, idx) => idx !== index).map((st, idx) => ({
      ...st,
      stepNumber: idx + 1
    }));
    setTemplateForm(prev => ({ ...prev, steps: updated }));
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const steps = [...templateForm.steps];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;

    const temp = steps[index];
    steps[index] = steps[targetIdx];
    steps[targetIdx] = temp;

    const renumbered = steps.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setTemplateForm(prev => ({ ...prev, steps: renumbered }));
  };

  // Quick Endorsement Phrases for Modal
  const quickPhrases = [
    'เห็นชอบตามเสนอ อนุมัติลงนาม',
    'เพื่อโปรดพิจารณาและสั่งการต่อไป',
    'มอบหมายฝ่ายที่เกี่ยวข้องดำเนินการตามระเบียบ',
    'เรียน หน.สนง. เพื่อโปรดพิจารณาเกษียณหนังสือ',
    'ขอให้ตรวจสอบความถูกต้องและข้อกฎหมายเพิ่มเติม'
  ];

  // Filtered docs for modal selector
  const modalFilteredDocs = useMemo(() => {
    if (!docSearchInModal.trim()) return documents.slice(0, 30);
    const q = docSearchInModal.toLowerCase();
    return documents.filter(d => 
      d.docNumber.toLowerCase().includes(q) ||
      d.title.toLowerCase().includes(q) ||
      (d.department && d.department.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [documents, docSearchInModal]);

  return (
    <div className="space-y-6 animate-fade-in pb-16 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          id="workflow-toast"
          className="fixed bottom-6 right-6 z-50 bg-[var(--text-primary)] text-[var(--bg-surface)] px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-[var(--border-light)] animate-slide-up"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-semibold text-xs tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div 
        id="workflow-header-banner"
        className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-900/40"
      >
        {/* Subtle background decorative shapes */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-20 -bottom-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-semibold text-blue-200 border border-white/15">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>ระบบสารบรรณอิเล็กทรอนิกส์ • กำกับลำดับชั้นและติดตามระยะเวลา SLA</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <Workflow className="w-6 h-6 sm:w-7 sm:h-7 text-blue-300" />
              </div>
              <span>ผังการเดินเอกสารและติดตาม SLA</span>
            </h1>

            <p className="text-xs sm:text-sm text-blue-100/80 leading-relaxed max-w-2xl">
              ศูนย์กำกับการเสนอหนังสือราชการตามลำดับชั้นผู้บังคับบัญชา ตรวจเกษียณ เสนอความเห็น สั่งการ 
              และควบคุมกรอบระยะเวลาให้บริการ (Service Level Agreement) ป้องกันหนังสือค้างสะสมในหน่วยงาน
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:self-end lg:self-center">
            <button
              id="btn-assign-new-workflow"
              onClick={() => {
                setSelectedDocId('');
                setSelectedTemplateId(workflowTemplates[0]?.id || '');
                setIsAssignModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>เสนอเรื่อง / มอบหมาย Workflow</span>
            </button>

            <button
              id="btn-create-new-template"
              onClick={() => {
                setActiveTab('designer');
                setEditingTemplate(null);
                setTemplateForm({
                  name: '',
                  description: '',
                  category: 'หนังสือรับ',
                  defaultPriority: 'ปกติ',
                  steps: [
                    { stepNumber: 1, title: 'ลงทะเบียนรับเรื่องและเสนอเกษียณ', assignedRole: 'เจ้าหน้าที่สารบรรณกลาง', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', actionType: 'review', slaHours: 12 },
                    { stepNumber: 2, title: 'ตรวจกลั่นกรองและเสนอความเห็น', assignedRole: 'หัวหน้าฝ่าย/กลุ่มงาน', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', actionType: 'review', slaHours: 24 },
                    { stepNumber: 3, title: 'พิจารณาสั่งการ / เกษียณหนังสือ', assignedRole: 'หัวหน้าสำนักงาน ปภ.จังหวัด', department: 'ผู้บริหาร', actionType: 'approve', slaHours: 24 },
                    { stepNumber: 4, title: 'ดำเนินการตามสั่งการและรายงานผล', assignedRole: 'เจ้าหน้าที่ผู้รับผิดชอบ', department: 'ฝ่ายป้องกันและปฏิบัติการ', actionType: 'action', slaHours: 48 }
                  ]
                });
                setIsTemplateModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer backdrop-blur-md active:scale-95"
            >
              <Plus className="w-4 h-4 text-blue-200" />
              <span>สร้างแม่แบบใหม่</span>
            </button>

            {workflowInstances.length > 0 && (
              <button
                id="btn-clear-all-instances"
                onClick={handleClearAllInstances}
                className="p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-400/30 text-xs transition-all cursor-pointer backdrop-blur-md"
                title="ล้างข้อมูลติดตามทั้งหมด"
              >
                <Trash2 className="w-4 h-4 text-rose-300" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Interactive KPI Analytics Cards (Click to Filter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total */}
        <button
          id="kpi-filter-all"
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            statusFilter === 'all'
              ? 'bg-[var(--bg-surface)] border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
              : 'bg-[var(--bg-surface)] border-[var(--border-lighter)] hover:border-indigo-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] tracking-tight">งานในกระบวนการทั้งหมด</span>
              <div className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">{totalTasks}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-secondary)] border-t border-[var(--border-lighter)] pt-2">
            <span>เอกสารทุกสถานะ</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center">
              แสดงทั้งหมด <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </button>

        {/* Card 2: In Progress */}
        <button
          id="kpi-filter-active"
          type="button"
          onClick={() => setStatusFilter('active')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            statusFilter === 'active'
              ? 'bg-[var(--bg-surface)] border-amber-500 ring-2 ring-amber-500/20 shadow-md'
              : 'bg-[var(--bg-surface)] border-[var(--border-lighter)] hover:border-amber-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] tracking-tight">กำลังเสนออนุมัติ / ตรวจ</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{activeTasks.length}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-secondary)] border-t border-[var(--border-lighter)] pt-2">
            <span>อยู่ระหว่างพิจารณา</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center">
              กรองสถานะนี้ <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </button>

        {/* Card 3: Overdue */}
        <button
          id="kpi-filter-overdue"
          type="button"
          onClick={() => setStatusFilter('overdue')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            statusFilter === 'overdue'
              ? 'bg-[var(--bg-surface)] border-rose-500 ring-2 ring-rose-500/20 shadow-md'
              : 'bg-[var(--bg-surface)] border-[var(--border-lighter)] hover:border-rose-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] tracking-tight">เกินกำหนดเวลา (Overdue)</span>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 flex items-center space-x-2">
                <span>{overdueTasks.length}</span>
                {overdueTasks.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white uppercase tracking-wider animate-pulse">
                    เร่งรัด
                  </span>
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-secondary)] border-t border-[var(--border-lighter)] pt-2">
            <span>ต้องติดตามเร่งด่วน</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center">
              ดูรายการค้าง <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </button>

        {/* Card 4: Completed */}
        <button
          id="kpi-filter-completed"
          type="button"
          onClick={() => setStatusFilter('completed')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
            statusFilter === 'completed'
              ? 'bg-[var(--bg-surface)] border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
              : 'bg-[var(--bg-surface)] border-[var(--border-lighter)] hover:border-emerald-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] tracking-tight">เสร็จสมบูรณ์ / ลงนามแล้ว</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{completedTasks.length}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-secondary)] border-t border-[var(--border-lighter)] pt-2">
            <span>จัดเก็บ/ดำเนินการแล้ว</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
              ดูประวัติ <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </button>
      </div>

      {/* 3. Main Container: Tab Nav & Search/Filters */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-light)] pb-4">
          <div className="inline-flex p-1 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-lighter)] w-full sm:w-auto">
            <button
              id="tab-btn-instances"
              type="button"
              onClick={() => setActiveTab('instances')}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'instances'
                  ? 'bg-[var(--primary-color)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              <Workflow className="w-4 h-4" />
              <span>รายการติดตามการเดินหนังสือ</span>
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'instances' ? 'bg-white/20 text-white' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-lighter)]'
              }`}>
                {workflowInstances.length}
              </span>
            </button>

            <button
              id="tab-btn-designer"
              type="button"
              onClick={() => setActiveTab('designer')}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'designer'
                  ? 'bg-[var(--primary-color)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>แม่แบบเส้นทางหนังสือ (Designer)</span>
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'designer' ? 'bg-white/20 text-white' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-lighter)]'
              }`}>
                {workflowTemplates.length}
              </span>
            </button>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              id="btn-refresh-workflow"
              onClick={fetchData}
              className="px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-lighter)] rounded-xl hover:bg-[var(--bg-canvas)] transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[var(--primary-color)]' : ''}`} />
              <span className="font-semibold">อัปเดตข้อมูล</span>
            </button>
          </div>
        </div>

        {/* TAB 1: INSTANCES TRACKING */}
        {activeTab === 'instances' && (
          <div className="space-y-5">
            {/* Filter Toolbar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[var(--bg-canvas)]/60 p-3.5 rounded-2xl border border-[var(--border-lighter)]">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[260px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  id="workflow-search-input"
                  type="text"
                  placeholder="ค้นหาเลขที่หนังสือ, เรื่อง, ฝ่าย, ผู้รับผิดชอบ หรือชื่อเส้นทาง..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 text-xs rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 transition-all placeholder:text-[var(--text-muted)]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Controls Row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Pills */}
                <div className="flex items-center space-x-1 p-1 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-lighter)] text-xs">
                  {[
                    { id: 'all', label: 'ทั้งหมด' },
                    { id: 'active', label: 'กำลังตรวจ' },
                    { id: 'overdue', label: 'เกินเวลา' },
                    { id: 'completed', label: 'เสร็จสิ้น' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id as any)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        statusFilter === tab.id
                          ? 'bg-[var(--primary-color)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Priority Selector */}
                <select
                  id="filter-priority-select"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary-color)] cursor-pointer"
                >
                  <option value="all">ความเร่งด่วน: ทั้งหมด</option>
                  <option value="ด่วนที่สุด">ด่วนที่สุด</option>
                  <option value="ด่วนมาก">ด่วนมาก</option>
                  <option value="ด่วน">ด่วน</option>
                  <option value="ปกติ">ปกติ</option>
                </select>

                {/* Department Selector */}
                {departmentsList.length > 0 && (
                  <select
                    id="filter-department-select"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary-color)] cursor-pointer max-w-[160px] truncate"
                  >
                    <option value="all">ฝ่าย/กลุ่มงาน: ทั้งหมด</option>
                    {departmentsList.map(dep => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                  </select>
                )}

                {/* Sort Selector */}
                <select
                  id="sort-workflow-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary-color)] cursor-pointer"
                >
                  <option value="sla_urgent">จัดเรียง: ตามความเร่งด่วน SLA</option>
                  <option value="created_desc">จัดเรียง: เสนอล่าสุด</option>
                  <option value="doc_number">จัดเรียง: ตามเลขที่หนังสือ</option>
                </select>

                {/* Reset Filters */}
                {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || departmentFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setPriorityFilter('all');
                      setDepartmentFilter('all');
                    }}
                    className="px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-rose-600 transition-colors font-medium flex items-center space-x-1 cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>ล้างตัวกรอง</span>
                  </button>
                )}
              </div>
            </div>

            {/* Workflow Instances List */}
            {filteredInstances.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-[var(--border-lighter)] rounded-3xl bg-[var(--bg-canvas)]/40 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Workflow className="w-7 h-7 opacity-70" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">ไม่พบรายการเดินเอกสารตามเงื่อนไขที่เลือก</h3>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                  สามารถปรับเปลี่ยนเงื่อนไขค้นหา หรือเริ่มมอบหมายและเปิดเส้นทาง Workflow ใหม่สำหรับหนังสือในสารบรรณ
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setSelectedDocId('');
                      setSelectedTemplateId(workflowTemplates[0]?.id || '');
                      setIsAssignModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[var(--primary-color)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-sm"
                  >
                    + มอบหมายและเริ่มเสนอเรื่อง
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInstances.map((inst) => {
                  const sla = getSLAInfo(inst.slaStatus, inst.dueAt, inst.startedAt);
                  const SLAIcon = sla.icon;
                  const priorityInfo = getPriorityInfo(inst.priority);
                  const PriorityIcon = priorityInfo.icon;
                  const currentStep = inst.steps && inst.steps[inst.currentStepIndex];
                  const isExpanded = !!expandedInstanceIds[inst.id];
                  const stepNotesCount = (inst.steps || []).filter(s => !!s.actionNote).length;

                  return (
                    <div
                      key={inst.id}
                      id={`workflow-card-${inst.id}`}
                      className="border border-[var(--border-lighter)] bg-[var(--bg-surface)] hover:border-[var(--primary-color)]/40 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-5 relative"
                    >
                      {/* Card Header Top */}
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-[var(--border-lighter)] pb-4">
                        <div className="space-y-2 flex-1">
                          {/* Badges Row */}
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDocDetail(inst)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 transition-colors flex items-center space-x-1 cursor-pointer"
                              title="คลิกเพื่อเปิดดูหนังสือฉบับเต็ม"
                            >
                              <span>{inst.docNumber}</span>
                              <ChevronRight className="w-3 h-3 opacity-60" />
                            </button>

                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center space-x-1 ${priorityInfo.badgeClass}`}>
                              <PriorityIcon className="w-3 h-3" />
                              <span>{inst.priority || 'ปกติ'}</span>
                            </span>

                            {inst.department && (
                              <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-[var(--bg-canvas)] text-[var(--text-secondary)] border border-[var(--border-lighter)] flex items-center space-x-1">
                                <Building2 className="w-3 h-3 text-[var(--text-muted)]" />
                                <span>{inst.department}</span>
                              </span>
                            )}

                            <span className="text-[11px] text-[var(--text-muted)]">
                              เส้นทาง: <strong className="font-semibold text-[var(--text-primary)]">{inst.templateName || 'หนังสือสารบรรณ'}</strong>
                            </span>
                          </div>

                          {/* Document Title */}
                          <h2
                            onClick={() => handleOpenDocDetail(inst)}
                            className="text-sm sm:text-base font-bold text-[var(--text-primary)] hover:text-[var(--primary-color)] transition-colors cursor-pointer leading-snug"
                          >
                            {inst.docTitle}
                          </h2>

                          {/* Sub Meta Info */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>เริ่มเสนอเรื่อง: <strong className="text-[var(--text-secondary)] font-normal">{formatThaiDateTime(inst.startedAt)}</strong></span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>กำหนดเสร็จสิ้น (SLA): <strong className="text-[var(--text-secondary)] font-normal">{formatThaiDateTime(inst.dueAt)}</strong></span>
                            </span>
                            {inst.assignee && (
                              <span>ผู้รับผิดชอบ: <strong className="text-[var(--text-secondary)] font-normal">{inst.assignee}</strong></span>
                            )}
                          </div>
                        </div>

                        {/* Right: SLA Status & Action Badges */}
                        <div className="flex items-center space-x-2 self-start lg:self-center">
                          {/* SLA Badge */}
                          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center space-x-1.5 shadow-xs ${sla.badgeClass}`}>
                            <SLAIcon className="w-4 h-4 shrink-0" />
                            <span>{sla.label}</span>
                          </div>

                          {/* Escalation Button (if overdue or warning) */}
                          {inst.status === 'active' && (inst.slaStatus === 'OVERDUE' || inst.slaStatus === 'WARNING') && (
                            <button
                              id={`btn-escalate-${inst.id}`}
                              onClick={() => handleEscalateSla(inst)}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                              title="ส่งใบเตือนเร่งรัด SLA สารบรรณ"
                            >
                              <Bell className="w-3.5 h-3.5" />
                              <span>เร่งรัด SLA</span>
                              {inst.escalationsCount ? (
                                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                                  {inst.escalationsCount}
                                </span>
                              ) : null}
                            </button>
                          )}

                          {/* Delete/Cancel Button */}
                          <button
                            onClick={() => handleDeleteInstance(inst.id, inst.docNumber)}
                            className="p-2 text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                            title="ยกเลิกการติดตามเรื่องนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Mini SLA Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                          <span>ความคืบหน้ารวมตาม SLA:</span>
                          <span className="font-semibold text-[var(--text-secondary)]">
                            {inst.status === 'completed' ? 'ดำเนินการเสร็จสิ้น' : `${sla.percent}% ของกรอบเวลา`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[var(--bg-canvas)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${sla.barClass}`}
                            style={{ width: `${sla.percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Interactive Horizontal Flow Stepper */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)]">
                          <div className="flex items-center space-x-2">
                            <span>ผังเส้นทางเสนอหนังสือตามลำดับชั้น ({inst.currentStepIndex + 1}/{inst.steps.length}):</span>
                            {inst.status === 'completed' ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                สำเร็จครบทุกขั้นตอน
                              </span>
                            ) : null}
                          </div>

                          {currentStep && inst.status === 'active' && (
                            <div className="text-[var(--primary-color)] text-xs font-normal flex items-center space-x-1">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block mr-1" />
                              <span>ขั้นตอนปัจจุบัน:</span>
                              <strong className="font-bold text-[var(--text-primary)]">{currentStep.assignedRole}</strong>
                              <span className="text-[var(--text-muted)]">({currentStep.department})</span>
                            </div>
                          )}
                        </div>

                        {/* Responsive Stepper Container */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                          {inst.steps.map((st, idx) => {
                            const isCurrent = idx === inst.currentStepIndex && inst.status === 'active';
                            const isPast = idx < inst.currentStepIndex || inst.status === 'completed';
                            const isRejected = st.status === 'rejected';

                            return (
                              <div
                                key={idx}
                                className={`p-3 rounded-2xl border text-xs space-y-2 relative transition-all ${
                                  isCurrent
                                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500/20 shadow-sm'
                                    : isPast
                                    ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                                    : isRejected
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100'
                                    : 'bg-[var(--bg-canvas)]/80 border-[var(--border-lighter)] text-[var(--text-muted)] opacity-75'
                                }`}
                              >
                                {/* Step Header */}
                                <div className="flex items-center justify-between">
                                  <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                                    isCurrent ? 'bg-amber-500 text-white' :
                                    isPast ? 'bg-emerald-600 text-white' :
                                    'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-lighter)]'
                                  }`}>
                                    ขั้นที่ {st.stepNumber}
                                  </span>

                                  {isPast ? (
                                    <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                                      <Check className="w-4 h-4 stroke-[3]" />
                                    </div>
                                  ) : isCurrent ? (
                                    <span className="flex h-3 w-3 relative">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                    </span>
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                  )}
                                </div>

                                {/* Step Title & Role */}
                                <div>
                                  <h3 className="font-bold text-xs text-[var(--text-primary)] line-clamp-1">{st.title}</h3>
                                  <p className="text-[11px] text-[var(--text-secondary)] font-medium line-clamp-1 mt-0.5">{st.assignedRole}</p>
                                  <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">{st.department}</p>
                                </div>

                                {/* SLA Hours badge */}
                                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-black/5 dark:border-white/10">
                                  <span className="text-[var(--text-muted)]">กรอบเวลา:</span>
                                  <span className="font-mono font-semibold text-[var(--text-secondary)]">{st.slaHours} ชม.</span>
                                </div>

                                {/* Note Snippet if present */}
                                {st.actionNote && (
                                  <div className="p-1.5 rounded-lg bg-[var(--bg-surface)]/80 border border-black/5 dark:border-white/10 text-[10px] italic text-[var(--text-secondary)] line-clamp-2">
                                    <MessageSquare className="w-3 h-3 inline mr-1 text-indigo-500" />
                                    "{st.actionNote}"
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Expandable Audit Trail & Endorsement Notes */}
                      {stepNotesCount > 0 && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => toggleInstanceExpand(inst.id)}
                            className="text-xs font-semibold text-[var(--primary-color)] hover:underline flex items-center space-x-1 cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>
                              {isExpanded ? 'ซ่อนประวัติการเกษียณ / บันทึกความเห็น' : `ดูประวัติการเกษียณและข้อสั่งการ (${stepNotesCount} รายการ)`}
                            </span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 p-4 bg-[var(--bg-canvas)]/70 rounded-2xl border border-[var(--border-lighter)] space-y-3 animate-fade-in">
                              <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center space-x-1.5">
                                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                <span>บันทึกความเห็น / ข้อเกษียณหนังสือตามลำดับชั้น:</span>
                              </h4>

                              <div className="space-y-2">
                                {inst.steps.filter(s => !!s.actionNote).map((st, sIdx) => (
                                  <div key={sIdx} className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-lighter)] text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                          ขั้นที่ {st.stepNumber}: {st.title}
                                        </span>
                                        <span className="text-[var(--text-muted)] text-[11px]">
                                          โดย {st.actionBy || st.assignedRole}
                                        </span>
                                      </div>
                                      {st.actionAt && (
                                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                          {formatThaiDateTime(st.actionAt)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[var(--text-primary)] pl-2 border-l-2 border-indigo-500 text-xs mt-1">
                                      {st.actionNote}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card Action Controls Footer */}
                      <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-lighter)] text-xs">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleOpenDocDetail(inst)}
                            className="px-3 py-1.5 rounded-xl border border-[var(--border-lighter)] hover:bg-[var(--bg-canvas)] text-[var(--text-secondary)] font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-500" />
                            <span>ดูหนังสือต้นฉบับ</span>
                          </button>
                        </div>

                        {/* Progression Buttons if Active */}
                        {inst.status === 'active' && (
                          <div className="flex items-center space-x-2">
                            <button
                              id={`btn-reject-step-${inst.id}`}
                              onClick={() => {
                                setSelectedInstance(inst);
                                setStepAction('reject');
                                setActionNote('ส่งคืนเพื่อตรวจสอบและแก้ไขข้อมูลให้ถูกต้องตามระเบียบ');
                                setIsStepModalOpen(true);
                              }}
                              className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              <span>ส่งคืนแก้ไข</span>
                            </button>

                            <button
                              id={`btn-approve-step-${inst.id}`}
                              onClick={() => {
                                setSelectedInstance(inst);
                                setStepAction('approve');
                                setActionNote('เห็นชอบตามเสนอ อนุมัติลงนาม');
                                setIsStepModalOpen(true);
                              }}
                              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>เกษียณหนังสือ / ส่งต่อขั้นตอนถัดไป</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WORKFLOW DESIGNER & TEMPLATES */}
        {activeTab === 'designer' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-canvas)]/70 p-4 rounded-2xl border border-[var(--border-lighter)]">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center space-x-2">
                  <FileCheck className="w-5 h-5 text-indigo-500" />
                  <span>แม่แบบเส้นทางหนังสือราชการ (Workflow Templates Designer)</span>
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  กำหนดขั้นตอนการเสนอหนังสือตามลำดับชั้นผู้บังคับบัญชา และระยะเวลา SLA มาตรฐานของจังหวัด
                </p>
              </div>

              <button
                id="btn-designer-add-template"
                onClick={() => {
                  setEditingTemplate(null);
                  setTemplateForm({
                    name: '',
                    description: '',
                    category: 'หนังสือรับ',
                    defaultPriority: 'ปกติ',
                    steps: [
                      { stepNumber: 1, title: 'ลงทะเบียนรับเรื่องและเสนอเกษียณ', assignedRole: 'เจ้าหน้าที่สารบรรณกลาง', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', actionType: 'review', slaHours: 12 },
                      { stepNumber: 2, title: 'ตรวจเสนอความเห็น', assignedRole: 'หัวหน้าฝ่ายยุทธศาสตร์และการจัดการ', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', actionType: 'review', slaHours: 24 },
                      { stepNumber: 3, title: 'พิจารณาสั่งการ', assignedRole: 'หัวหน้าสำนักงาน ปภ.จังหวัด', department: 'ผู้บริหาร', actionType: 'approve', slaHours: 24 }
                    ]
                  });
                  setIsTemplateModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[var(--primary-color)] text-white text-xs font-bold hover:opacity-95 transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>สร้างแม่แบบใหม่</span>
              </button>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflowTemplates.map((tpl) => {
                const totalHours = tpl.steps.reduce((acc, st) => acc + (st.slaHours || 24), 0);
                const days = Math.round(totalHours / 24);

                return (
                  <div
                    key={tpl.id}
                    id={`template-card-${tpl.id}`}
                    className="border border-[var(--border-lighter)] bg-[var(--bg-canvas)] hover:border-[var(--primary-color)]/50 p-5 rounded-3xl space-y-4 relative transition-all shadow-xs hover:shadow-md"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            {tpl.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            รวมเวลา SLA: {totalHours} ชม. ({days} วัน)
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">{tpl.name}</h3>
                        <p className="text-xs text-[var(--text-muted)] line-clamp-2">{tpl.description}</p>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingTemplate(tpl);
                            setTemplateForm({
                              id: tpl.id,
                              name: tpl.name,
                              description: tpl.description,
                              category: tpl.category,
                              defaultPriority: tpl.defaultPriority || 'ปกติ',
                              steps: tpl.steps || []
                            });
                            setIsTemplateModalOpen(true);
                          }}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary-color)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors cursor-pointer"
                          title="แก้ไขแม่แบบ"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="ลบแม่แบบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Step Sequential Flow List */}
                    <div className="space-y-2 border-t border-[var(--border-lighter)] pt-3 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
                        <span>ลำดับการเสนอหนังสือ ({tpl.steps.length} ขั้นตอน):</span>
                      </div>

                      <div className="space-y-1.5">
                        {tpl.steps.map((st, idx) => (
                          <div key={idx} className="flex items-center space-x-2 text-[11px] p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)]">
                            <span className="w-5 h-5 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-bold text-[10px] flex items-center justify-center shrink-0">
                              {st.stepNumber}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-[var(--text-primary)] mr-2">{st.title}</span>
                              <span className="text-[var(--text-muted)] truncate">({st.assignedRole})</span>
                            </div>
                            <span className="text-[var(--text-muted)] font-mono text-[10px] shrink-0">{st.slaHours} ชม.</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer: Instant Assign Button */}
                    <div className="pt-2 border-t border-[var(--border-lighter)] flex items-center justify-end">
                      <button
                        onClick={() => {
                          setSelectedTemplateId(tpl.id);
                          setIsAssignModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[var(--primary-color)] hover:opacity-90 text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>ใช้งานแม่แบบนี้ทันที</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: เสนออนุมัติ / มอบหมาย Workflow */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-3xl w-full max-w-xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <Play className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">เสนออนุมัติ / มอบหมาย Workflow ให้หนังสือ</h2>
                  <p className="text-xs text-[var(--text-muted)]">กำหนดเส้นทางเสนอหนังสือตามลำดับชั้นและเปิดการติดตาม SLA</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Step 1: Select Document */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[var(--text-primary)]">
                  ๑. เลือกหนังสือจากระบบสารบรรณ:
                </label>
                
                {/* Search filter for docs */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="พิมพ์เลขที่หนังสือ หรือ ชื่อเรื่อง เพื่อค้นหา..."
                    value={docSearchInModal}
                    onChange={(e) => setDocSearchInModal(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                  />
                </div>

                <select
                  id="select-doc-for-workflow"
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20"
                >
                  <option value="">-- กรุณาเลือกหนังสือราชการ --</option>
                  {modalFilteredDocs.map(d => (
                    <option key={d.id} value={d.id}>
                      [{d.docNumber}] {d.title} ({d.department || 'ไม่ระบุฝ่าย'}) - {d.priority || 'ปกติ'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Template */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[var(--text-primary)]">
                  ๒. เลือกแม่แบบเส้นทางเสนอหนังสือ (Workflow Template):
                </label>
                <select
                  id="select-template-for-workflow"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20"
                >
                  <option value="">-- กรุณาเลือกแม่แบบเส้นทาง --</option>
                  {workflowTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category} - {t.steps.length} ขั้นตอน)
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Preview */}
              {selectedTemplateId && (
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-2">
                  <p className="font-bold text-indigo-800 dark:text-indigo-300 flex items-center space-x-1.5">
                    <Workflow className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>ลำดับขั้นตอนการเสนอตามแม่แบบที่เลือก:</span>
                  </p>
                  <div className="space-y-1.5 pl-1">
                    {workflowTemplates.find(t => t.id === selectedTemplateId)?.steps.map((s, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-[11px] text-[var(--text-secondary)]">
                        <span className="w-4 h-4 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                          {s.stepNumber}
                        </span>
                        <span className="font-semibold text-[var(--text-primary)]">{s.title}</span>
                        <span className="text-[var(--text-muted)]">({s.assignedRole})</span>
                        <span className="ml-auto font-mono text-indigo-600 dark:text-indigo-400">{s.slaHours} ชม.</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[var(--border-lighter)]">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-canvas)] cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                id="btn-confirm-assign-workflow"
                onClick={handleAssignWorkflow}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
              >
                เริ่มเสนอเรื่อง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: เกษียณหนังสือ / ส่งต่อ หรือ ส่งคืน */}
      {isStepModalOpen && selectedInstance && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-4">
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-xl ${stepAction === 'approve' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                  {stepAction === 'approve' ? <CheckCircle2 className="w-5 h-5" /> : <Undo2 className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    {stepAction === 'approve' ? 'เกษียณหนังสือ / ส่งต่อผู้บังคับบัญชา' : 'ส่งคืนเอกสารเพื่อแก้ไข'}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">บันทึกข้อเสนอ คำสั่งการ หรือเหตุผลในการส่งคืน</p>
                </div>
              </div>
              <button onClick={() => setIsStepModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Document Summary */}
              <div className="p-3.5 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-lighter)] space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedInstance.docNumber}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">({selectedInstance.department})</span>
                </div>
                <p className="font-bold text-[var(--text-primary)] text-xs line-clamp-2">{selectedInstance.docTitle}</p>
                <p className="text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-lighter)]">
                  ขั้นตอนปัจจุบัน: <strong className="text-[var(--text-primary)]">{selectedInstance.steps[selectedInstance.currentStepIndex]?.title}</strong> ({selectedInstance.steps[selectedInstance.currentStepIndex]?.assignedRole})
                </p>
              </div>

              {/* Quick Phrase Chips */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-[var(--text-muted)]">
                  วลีเกษียณหนังสือ / คำสั่งการด่วน (คลิกเพื่อเติมข้อความ):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {quickPhrases.map((phrase, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setActionNote(phrase)}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] hover:bg-[var(--primary-color)] hover:text-white border border-[var(--border-lighter)] text-[11px] text-[var(--text-secondary)] transition-colors cursor-pointer"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-1.5">
                <label className="block font-bold text-[var(--text-primary)]">
                  ข้อความเสนอเกษียณหนังสือ / ข้อสั่งการ:
                </label>
                <textarea
                  rows={4}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="กรอกข้อความ เช่น เห็นชอบตามเสนอ อนุมัติลงนาม, มอบหมายฝ่ายป้องกันฯ ดำเนินการ..."
                  className="w-full p-3 rounded-2xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 leading-relaxed placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[var(--border-lighter)]">
              <button
                onClick={() => setIsStepModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-canvas)] cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                id="btn-confirm-process-step"
                onClick={handleProcessStep}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 ${
                  stepAction === 'approve' 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700' 
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {stepAction === 'approve' ? 'ยืนยันการเกษียณหนังสือ' : 'ยืนยันการส่งคืนแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: สร้าง/แก้ไข แม่แบบเส้นทางหนังสือ (Workflow Designer Modal) */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-3xl w-full max-w-2xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    {editingTemplate ? 'แก้ไขแม่แบบเส้นทางหนังสือ' : 'สร้างแม่แบบเส้นทางหนังสือใหม่'}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">กำหนดขั้นตอนและกรอบเวลา SLA สำหรับประเภทหนังสือนี้</p>
                </div>
              </div>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[var(--text-primary)] mb-1">ชื่อแม่แบบ Workflow:</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="เช่น เส้นทางหนังสือเสนอผู้ว่าราชการจังหวัด (เรื่องด่วน)"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[var(--text-primary)] mb-1">หมวดหมู่หนังสือ:</label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
                  >
                    <option value="หนังสือรับ">หนังสือรับ</option>
                    <option value="หนังสือส่ง">หนังสือส่ง</option>
                    <option value="คำสั่ง/ประกาศ/หนังสือรับรอง">คำสั่ง / ประกาศ / หนังสือรับรอง</option>
                    <option value="อนุมัติงบประมาณ">อนุมัติงบประมาณและโครงการ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[var(--text-primary)] mb-1">ความสำคัญเริ่มต้น:</label>
                  <select
                    value={templateForm.defaultPriority}
                    onChange={(e) => setTemplateForm({ ...templateForm, defaultPriority: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
                  >
                    <option value="ปกติ">ปกติ</option>
                    <option value="ด่วน">ด่วน</option>
                    <option value="ด่วนมาก">ด่วนมาก</option>
                    <option value="ด่วนที่สุด">ด่วนที่สุด</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[var(--text-primary)] mb-1">คำอธิบายเส้นทาง:</label>
                <input
                  type="text"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="อธิบายวัตถุประสงค์และการเดินเรื่อง..."
                  className="w-full p-2.5 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
                />
              </div>

              {/* Dynamic Steps Builder */}
              <div className="space-y-2 border-t border-[var(--border-lighter)] pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-[var(--text-primary)]">กำหนดขั้นตอนตามลำดับชั้น (Steps Chain):</label>
                    <p className="text-[11px] text-[var(--text-muted)]">สามารถเลื่อนลำดับขึ้นลง หรือแก้ไขตำแหน่งและเวลา SLA ได้</p>
                  </div>
                  <button
                    onClick={handleAddStepToForm}
                    className="px-3 py-1.5 rounded-xl bg-[var(--primary-color)] text-white text-[11px] font-bold flex items-center space-x-1 cursor-pointer hover:opacity-90 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มขั้นตอน</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {templateForm.steps.map((st, idx) => (
                    <div key={idx} className="p-3.5 bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-2xl space-y-2.5 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-[11px] text-[var(--text-primary)]">ลำดับที่ {idx + 1}</span>
                        </div>

                        <div className="flex items-center space-x-1">
                          {/* Reorder Buttons */}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveStep(idx, 'up')}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                            title="เลื่อนขึ้น"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === templateForm.steps.length - 1}
                            onClick={() => handleMoveStep(idx, 'down')}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                            title="เลื่อนลง"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>

                          {templateForm.steps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStepFromForm(idx)}
                              className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer ml-1"
                              title="ลบขั้นตอนนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={st.title}
                          onChange={(e) => {
                            const updated = [...templateForm.steps];
                            updated[idx].title = e.target.value;
                            setTemplateForm({ ...templateForm, steps: updated });
                          }}
                          placeholder="ชื่อขั้นตอน เช่น ตรวจเสนอความเห็น"
                          className="p-2 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)]"
                        />
                        <input
                          type="text"
                          value={st.assignedRole}
                          onChange={(e) => {
                            const updated = [...templateForm.steps];
                            updated[idx].assignedRole = e.target.value;
                            setTemplateForm({ ...templateForm, steps: updated });
                          }}
                          placeholder="ตำแหน่งผู้รับผิดชอบ เช่น หัวหน้าฝ่าย"
                          className="p-2 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={st.department}
                          onChange={(e) => {
                            const updated = [...templateForm.steps];
                            updated[idx].department = e.target.value;
                            setTemplateForm({ ...templateForm, steps: updated });
                          }}
                          placeholder="ฝ่าย/กลุ่มงาน"
                          className="p-2 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)]"
                        />
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="1"
                            value={st.slaHours}
                            onChange={(e) => {
                              const updated = [...templateForm.steps];
                              updated[idx].slaHours = Number(e.target.value);
                              setTemplateForm({ ...templateForm, steps: updated });
                            }}
                            className="w-24 p-2 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-surface)] text-xs font-mono text-[var(--text-primary)]"
                          />
                          <span className="text-[11px] text-[var(--text-muted)]">ชั่วโมง (SLA)</span>

                          {/* Quick SLA hours selector */}
                          <div className="flex items-center space-x-1 ml-auto">
                            {[12, 24, 48, 72].map(h => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => {
                                  const updated = [...templateForm.steps];
                                  updated[idx].slaHours = h;
                                  setTemplateForm({ ...templateForm, steps: updated });
                                }}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                  st.slaHours === h 
                                    ? 'bg-indigo-600 text-white border-indigo-600' 
                                    : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-lighter)] hover:border-indigo-400'
                                }`}
                              >
                                {h}h
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[var(--border-lighter)]">
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-canvas)] cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                id="btn-confirm-save-template"
                onClick={handleSaveTemplate}
                className="px-5 py-2.5 rounded-xl bg-[var(--primary-color)] hover:opacity-90 text-white text-xs font-bold shadow-md cursor-pointer active:scale-95"
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
