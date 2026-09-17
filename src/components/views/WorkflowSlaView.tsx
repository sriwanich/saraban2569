import React, { useState, useEffect } from 'react';
import { 
  Workflow, CheckCircle2, Clock, AlertTriangle, ArrowRight, Plus, 
  Search, ShieldAlert, FileText, Send, UserCheck, RefreshCw, Trash2, 
  Edit3, Play, ChevronRight, CornerDownRight, Bell, AlertCircle, FileCheck, X
} from 'lucide-react';
import { DocumentItem, WorkflowTemplate, WorkflowInstance, WorkflowStep, SLAStatus, User } from '../../types';
import { useRealtimeSync } from '../../utils/realtimeSync';
import { formatThaiDate } from '../../types';
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'completed'>('all');

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

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
    setTimeout(() => setToastMessage(null), 3000);
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
  const activeTasks = workflowInstances.filter(i => i.status === 'active');
  const overdueTasks = workflowInstances.filter(i => i.status === 'active' && i.slaStatus === 'OVERDUE');
  const completedTasks = workflowInstances.filter(i => i.status === 'completed');

  // Helper SLA status styling
  const getSLAInfo = (slaStatus: SLAStatus, dueAtStr: string) => {
    const dueTime = new Date(dueAtStr).getTime();
    const nowTime = Date.now();
    const diffHours = Math.round((dueTime - nowTime) / (1000 * 3600));

    switch (slaStatus) {
      case 'OVERDUE':
        return {
          label: `เกินกำหนด (${Math.abs(diffHours)} ชม.)`,
          badgeClass: 'bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400',
          icon: AlertCircle
        };
      case 'WARNING':
        return {
          label: `ใกล้ครบกำหนด (เหลือ ${diffHours} ชม.)`,
          badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400',
          icon: AlertTriangle
        };
      case 'COMPLETED_ON_TIME':
        return {
          label: 'เสร็จสิ้นตรงเวลา',
          badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
          icon: CheckCircle2
        };
      case 'COMPLETED_LATE':
        return {
          label: 'เสร็จสิ้นเกินกำหนดเวลา',
          badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400',
          icon: Clock
        };
      default:
        return {
          label: `ปกติ (เหลือ ${diffHours > 0 ? diffHours : 0} ชม.)`,
          badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400',
          icon: Clock
        };
    }
  };

  // Filter Instances
  const filteredInstances = workflowInstances.filter(inst => {
    const matchesSearch = 
      inst.docNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.docTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inst.assignee && inst.assignee.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inst.templateName && inst.templateName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return inst.status === 'active';
    if (statusFilter === 'overdue') return inst.status === 'active' && inst.slaStatus === 'OVERDUE';
    if (statusFilter === 'completed') return inst.status === 'completed';
    return true;
  });

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
      title: 'ยืนยันการลบรายการติดตามการเดินเอกสาร',
      message: `คุณต้องการยกเลิกและลบเส้นทาง Workflow ของหนังสือเลขที่ "${docNumber}" ใช่หรือไม่?`,
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/workflows/instances/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'ผู้ดูแลระบบ' })
      });
      if (res.ok) {
        showToast('🗑️ ยกเลิกการเสนออนุมัติ Workflow เรียบร้อยแล้ว');
        fetchData();
      }
    } catch (e) {
      console.error('Error deleting workflow instance:', e);
    }
  };

  // Clear all Workflow Instances
  const handleClearAllInstances = async () => {
    const isConfirmed = await confirm({
      title: 'ยืนยันการลบรายการติดตามทั้งหมด',
      message: 'คุณต้องการลบข้อมูลตัวอย่างและรายการติดตามการเดินเอกสารทั้งหมดในระบบใช่หรือไม่?',
      type: 'delete',
      confirmText: 'ยืนยันลบทั้งหมด',
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
        showToast('🗑️ ล้างข้อมูลการเดินเอกสารและติดตาม SLA ทั้งหมดเรียบร้อยแล้ว');
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
      if (stepAction === 'approve' || stepAction === 'reject') {
        const res = await fetch(`/api/workflows/instances/${selectedInstance.id}/step`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: stepAction,
            note: actionNote,
            user: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'ผู้ปฏิบัติงาน'
          })
        });
        if (res.ok) {
          showToast(stepAction === 'approve' ? '✅ เกษียณหนังสือ / ส่งต่อขั้นตอนถัดไปเรียบร้อยแล้ว' : '↩️ ส่งคืนเอกสารแก้ไขเรียบร้อยแล้ว');
          setIsStepModalOpen(false);
          setActionNote('');
          fetchData();
        }
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
        showToast('🔔 ส่งใบแจ้งเตือนเร่งรัด SLA สารบรรณสำเร็จแล้ว');
        fetchData();
      }
    } catch (e) {
      console.error('Error escalating workflow:', e);
    }
  };

  // Assign Workflow Instance to Document
  const handleAssignWorkflow = async () => {
    if (!selectedDocId || !selectedTemplateId) {
      showToast('กรุณาเลือกหนังสือและเส้นทาง Workflow');
      return;
    }
    try {
      const res = await fetch('/api/workflows/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: selectedDocId,
          templateId: selectedTemplateId,
          user: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'ผู้เสนอเรื่อง'
        })
      });
      if (res.ok) {
        showToast('🚀 เริ่มมอบหมายเส้นทาง Workflow และติดตาม SLA สำเร็จ');
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
      showToast('กรุณากรอกชื่อแม่แบบ Workflow');
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
        showToast('💾 บันทึกแม่แบบเส้นทางเสนอหนังสือเรียบร้อยแล้ว');
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
        showToast('🗑️ ลบแม่แบบเรียบร้อยแล้ว');
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
          assignedRole: 'หัวหน้าฝ่ายยุทธศาสตร์และการจัดการ',
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

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--primary-color)] text-white px-5 py-3 rounded-xl shadow-xl flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          <span className="font-semibold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none pr-8">
          <Workflow className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-blue-200 border border-white/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>ระบบสารบรรณดิจิทัล : ระเบียบสำนักนายกรัฐมนตรี พ.ศ. 2526 และที่แก้ไขเพิ่มเติม</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            ผังการเดินเอกสารและติดตาม SLA (Workflow & SLA Tracking Center)
          </h1>
          <p className="text-sm text-blue-100/90 leading-relaxed font-sans">
            ระบบเสนอหนังสือราชการตามลำดับชั้นผู้บังคับบัญชา ตรวจพิจารณา เกษียณหนังสือ ลงนาม และควบคุมระยะเวลาประมวลผล (SLA) ป้องกันหนังสือค้างสะสมในฝ่าย
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>เสนออนุมัติ / มอบหมาย Workflow ใหม่</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('designer');
                setTemplateForm({
                  name: '',
                  description: '',
                  category: 'หนังสือรับ',
                  defaultPriority: 'ปกติ',
                  steps: [
                    { stepNumber: 1, title: 'ลงทะเบียนและเสนอเกษียณหนังสือ', assignedRole: 'เจ้าหน้าที่สารบรรณกลาง', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', actionType: 'review', slaHours: 12 },
                    { stepNumber: 2, title: 'ตรวจกลั่นกรองเสนอความเห็น', assignedRole: 'หัวหน้าฝ่าย/กลุ่มงาน', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', actionType: 'review', slaHours: 24 },
                    { stepNumber: 3, title: 'พิจารณาสั่งการ / เกษียณหนังสือ', assignedRole: 'หัวหน้าสำนักงาน ปภ.จังหวัด', department: 'ผู้บริหาร', actionType: 'approve', slaHours: 24 },
                    { stepNumber: 4, title: 'ดำเนินการตามสั่งการและปิดเรื่อง', assignedRole: 'เจ้าหน้าที่ผู้รับผิดชอบ', department: 'ฝ่ายป้องกันและปฏิบัติการ', actionType: 'action', slaHours: 48 }
                  ]
                });
                setIsTemplateModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer backdrop-blur-md"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างแม่แบบเส้นทางหนังสือใหม่</span>
            </button>
            {workflowInstances.length > 0 && (
              <button
                onClick={handleClearAllInstances}
                className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-100 border border-red-400/30 text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer backdrop-blur-md"
                title="ลบข้อมูลติดตามการเดินเอกสารทั้งหมด"
              >
                <Trash2 className="w-4 h-4 text-red-300" />
                <span>ลบข้อมูลติดตามทั้งหมด ({workflowInstances.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Counter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)]">งานในกระบวนการทั้งหมด</p>
            <p className="text-2xl font-black text-[var(--text-primary)] mt-1">{totalTasks}</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
            <Workflow className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)]">กำลังเสนออนุมัติ</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{activeTasks.length}</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)]">เกินกำหนดเวลา (Overdue)</p>
            <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{overdueTasks.length}</p>
          </div>
          <div className="p-3 bg-red-500/10 text-red-600 rounded-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] p-4 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)]">เสร็จสมบูรณ์ / จัดเก็บแล้ว</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{completedTasks.length}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tab Nav & Search */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-light)] pb-4">
          <div className="grid grid-cols-2 gap-2 bg-[var(--bg-overlay)] p-1.5 rounded-xl border border-[var(--border-light)] w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('instances')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer group ${
                activeTab === 'instances' 
                  ? 'bg-[var(--primary-color)] text-white shadow-sm' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              <Workflow className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" />
              <span>รายการติดตามการเดินหนังสือ ({workflowInstances.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('designer')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer group ${
                activeTab === 'designer' 
                  ? 'bg-[var(--primary-color)] text-white shadow-sm' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              <FileCheck className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" />
              <span>แม่แบบเส้นทางหนังสือ ({workflowTemplates.length})</span>
            </button>
          </div>

          <button
            onClick={fetchData}
            className="p-2.5 text-xs text-[var(--text-secondary)] hover:text-[var(--primary-color)] border border-[var(--border-light)] rounded-xl hover:bg-[var(--bg-elevated)] transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline font-semibold">รีเฟรชข้อมูล</span>
          </button>
        </div>

        {/* Tab 1: Workflow Instances Monitor */}
        {activeTab === 'instances' && (
          <div className="space-y-4">
            {/* Filter Grid & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'all', label: `ทั้งหมด (${workflowInstances.length})`, icon: Workflow, color: 'hover:text-blue-500' },
                  { id: 'active', label: `กำลังดำเนินการ (${activeTasks.length})`, icon: Clock, color: 'hover:text-amber-500' },
                  { id: 'overdue', label: `เกินกำหนดเวลา (${overdueTasks.length})`, icon: AlertCircle, color: 'hover:text-red-500' },
                  { id: 'completed', label: `เสร็จสิ้นแล้ว (${completedTasks.length})`, icon: CheckCircle2, color: 'hover:text-emerald-500' },
                ].map(f => {
                  const Icon = f.icon;
                  const isActive = statusFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setStatusFilter(f.id as any)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-bold transition-all cursor-pointer group ${
                        isActive
                          ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-sm'
                          : `bg-[var(--bg-surface)] border-[var(--border-light)] text-[var(--text-secondary)] ${f.color} hover:border-[var(--primary-color)]/40 hover:bg-[var(--bg-elevated)]`
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                      <span className="truncate">{f.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="ค้นหาเลขที่หนังสือ, เรื่อง, ผู้รับผิดชอบ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                />
              </div>
            </div>

            {/* List of Workflow Instances */}
            {filteredInstances.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-[var(--border-lighter)] rounded-2xl bg-[var(--bg-canvas)]/50">
                <Workflow className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
                <p className="text-sm font-semibold text-[var(--text-secondary)]">ไม่พบข้อมูลการเดินเอกสารตามเงื่อนไขที่เลือก</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">สามารถเสนอเรื่องและมอบหมาย Workflow ใหม่ด้วยปุ่มด้านบน</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInstances.map((inst) => {
                  const sla = getSLAInfo(inst.slaStatus, inst.dueAt);
                  const SLAIcon = sla.icon;
                  const currentStep = inst.steps && inst.steps[inst.currentStepIndex];

                  return (
                    <div 
                      key={inst.id} 
                      className="border border-[var(--border-lighter)] bg-[var(--bg-surface)] hover:border-[var(--primary-color)]/50 rounded-2xl p-5 shadow-sm transition-all space-y-4"
                    >
                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-lighter)] pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              {inst.docNumber}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              inst.priority === 'ด่วนที่สุด' ? 'bg-red-500/10 text-red-600 border border-red-500/30' :
                              inst.priority === 'ด่วนมาก' ? 'bg-orange-500/10 text-orange-600 border border-orange-500/30' :
                              inst.priority === 'ด่วน' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30' :
                              'bg-slate-500/10 text-slate-600 border border-slate-500/20'
                            }`}>
                              {inst.priority}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] font-mono">
                              แม่แบบ: <span className="font-semibold text-[var(--text-primary)]">{inst.templateName || 'หนังสือตามระเบียบสารบรรณ'}</span>
                            </span>
                          </div>
                          <h3 
                            onClick={() => handleOpenDocDetail(inst)}
                            className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--primary-color)] transition-colors cursor-pointer flex items-center space-x-1"
                          >
                            <span>{inst.docTitle}</span>
                            <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                          </h3>
                        </div>

                        {/* SLA Badge & Action */}
                        <div className="flex items-center space-x-2">
                          <div className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center space-x-1.5 ${sla.badgeClass}`}>
                            <SLAIcon className="w-3.5 h-3.5" />
                            <span>{sla.label}</span>
                          </div>

                          {inst.status === 'active' && inst.slaStatus === 'OVERDUE' && (
                            <button
                              onClick={() => handleEscalateSla(inst)}
                              className="px-2.5 py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center space-x-1 cursor-pointer"
                              title="ส่งใบเตือนเร่งรัด SLA"
                            >
                              <Bell className="w-3.5 h-3.5" />
                              <span>เร่งรัด SLA</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteInstance(inst.id, inst.docNumber)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="ยกเลิก Workflow เรื่องนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Stepper Visualization */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-[var(--text-secondary)] flex items-center justify-between">
                          <span>ขั้นตอนการเสนอหนังสือตามลำดับชั้น ({inst.currentStepIndex + 1}/{inst.steps.length}):</span>
                          {currentStep && (
                            <span className="text-[var(--primary-color)] font-normal">
                              ตำแหน่งปัจจุบัน: <strong className="font-bold">{currentStep.assignedRole}</strong> ({currentStep.department})
                            </span>
                          )}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 pt-1">
                          {inst.steps.map((st, idx) => {
                            const isCurrent = idx === inst.currentStepIndex && inst.status === 'active';
                            const isPast = idx < inst.currentStepIndex || inst.status === 'completed';
                            const isRejected = st.status === 'rejected';

                            return (
                              <div 
                                key={idx} 
                                className={`p-2.5 rounded-xl border text-xs space-y-1.5 relative transition-all ${
                                  isCurrent 
                                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                                    : isPast
                                    ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                                    : isRejected
                                    ? 'bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-200'
                                    : 'bg-[var(--bg-canvas)] border-[var(--border-lighter)] text-[var(--text-muted)] opacity-70'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
                                    ขั้นที่ {st.stepNumber}
                                  </span>
                                  {isPast ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  ) : isCurrent ? (
                                    <span className="relative flex h-2.5 w-2.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                    </span>
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </div>

                                <div>
                                  <p className="font-bold line-clamp-1 text-[11px]">{st.title}</p>
                                  <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">{st.assignedRole}</p>
                                </div>

                                {st.actionNote && (
                                  <div className="pt-1 border-t border-black/5 dark:border-white/5 text-[10px] italic text-[var(--text-secondary)] line-clamp-2">
                                    "{st.actionNote}" ({st.actionBy || 'เจ้าหน้าที่'})
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action Controls for Current Step */}
                      {inst.status === 'active' && (
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-lighter)] text-xs">
                          <div className="text-[var(--text-muted)] flex items-center space-x-1">
                            <CornerDownRight className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                            <span>รอการเกษียณ / สั่งการจาก: <strong className="text-[var(--text-primary)]">{currentStep?.assignedRole}</strong></span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedInstance(inst);
                                setStepAction('reject');
                                setActionNote('');
                                setIsStepModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-600 hover:bg-red-500/10 font-semibold transition-colors cursor-pointer"
                            >
                              ส่งคืนแก้ไข
                            </button>
                            <button
                              onClick={() => {
                                setSelectedInstance(inst);
                                setStepAction('approve');
                                setActionNote('เห็นชอบตามเสนอ อนุมัติลงนาม');
                                setIsStepModalOpen(true);
                              }}
                              className="px-4 py-1.5 rounded-lg bg-[var(--primary-color)] hover:opacity-90 text-white font-bold shadow-sm transition-opacity flex items-center space-x-1.5 cursor-pointer"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>เกษียณหนังสือ / ส่งต่อขั้นตอนถัดไป</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Workflow Designer */}
        {activeTab === 'designer' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">แม่แบบเส้นทางหนังสือราชการ (Workflow Designer)</h2>
                <p className="text-xs text-[var(--text-muted)]">กำหนดขั้นตอนและกำหนดเวลา SLA ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526</p>
              </div>

              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setTemplateForm({
                    name: '',
                    description: '',
                    category: 'หนังสือรับ',
                    defaultPriority: 'ปกติ',
                    steps: [
                      { stepNumber: 1, title: 'ลงทะเบียนรับเรื่อง', assignedRole: 'เจ้าหน้าที่สารบรรณกลาง', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', actionType: 'review', slaHours: 12 },
                      { stepNumber: 2, title: 'ตรวจเสนอความเห็น', assignedRole: 'หัวหน้าฝ่ายยุทธศาสตร์และการจัดการ', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', actionType: 'review', slaHours: 24 },
                      { stepNumber: 3, title: 'พิจารณาสั่งการ', assignedRole: 'หัวหน้าสำนักงาน ปภ.จังหวัด', department: 'ผู้บริหาร', actionType: 'approve', slaHours: 24 }
                    ]
                  });
                  setIsTemplateModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[var(--primary-color)] text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>สร้างแม่แบบใหม่</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflowTemplates.map((tpl) => {
                const totalHours = tpl.steps.reduce((acc, st) => acc + (st.slaHours || 24), 0);

                return (
                  <div key={tpl.id} className="border border-[var(--border-lighter)] bg-[var(--bg-canvas)] p-5 rounded-2xl space-y-3 relative hover:border-[var(--primary-color)] transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {tpl.category}
                        </span>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">{tpl.name}</h3>
                        <p className="text-xs text-[var(--text-muted)]">{tpl.description}</p>
                      </div>

                      <div className="flex items-center space-x-1">
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
                          className="p-1.5 text-slate-400 hover:text-[var(--primary-color)] rounded-lg cursor-pointer"
                          title="แก้ไขแม่แบบ"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                          title="ลบแม่แบบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-[var(--text-secondary)] space-y-1.5 border-t border-[var(--border-lighter)] pt-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
                        <span>ลำดับขั้นตอนการเสนอ ({tpl.steps.length} ขั้น):</span>
                        <span>รวมเวลา SLA: <strong className="text-[var(--primary-color)]">{totalHours} ชม.</strong> ({Math.round(totalHours / 24)} วัน)</span>
                      </div>

                      <div className="space-y-1">
                        {tpl.steps.map((st, idx) => (
                          <div key={idx} className="flex items-center space-x-2 text-[11px]">
                            <span className="w-4 h-4 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-bold text-[10px] flex items-center justify-center">
                              {st.stepNumber}
                            </span>
                            <span className="font-semibold text-[var(--text-primary)]">{st.title}</span>
                            <span className="text-[var(--text-muted)]">({st.assignedRole})</span>
                            <span className="ml-auto text-slate-400 font-mono text-[10px]">{st.slaHours} ชม.</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Assign Workflow Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3">
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center space-x-2">
                <Workflow className="w-5 h-5 text-[var(--primary-color)]" />
                <span>เสนออนุมัติ / มอบหมาย Workflow ให้หนังสือ</span>
              </h2>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">1. เลือกหนังสือจากสารบรรณ:</label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                >
                  <option value="">-- เลือกหนังสือราชการ --</option>
                  {documents.map(d => (
                    <option key={d.id} value={d.id}>
                      [{d.docNumber}] {d.title} ({d.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">2. เลือกแม่แบบเส้นทางเสนอหนังสือ (Workflow Template):</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                >
                  <option value="">-- เลือกแม่แบบเส้นทาง --</option>
                  {workflowTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category} - {t.steps.length} ขั้น)
                    </option>
                  ))}
                </select>
              </div>

              {selectedTemplateId && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
                  <p className="font-bold text-blue-700 dark:text-blue-300">พรีวิวขั้นตอนการเดินหนังสือ:</p>
                  <div className="space-y-1 pl-2">
                    {workflowTemplates.find(t => t.id === selectedTemplateId)?.steps.map((s, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-[11px] text-[var(--text-secondary)]">
                        <span className="font-bold">{s.stepNumber}. {s.title}</span>
                        <span className="text-[var(--text-muted)]">({s.assignedRole})</span>
                        <span className="ml-auto font-mono text-blue-600 dark:text-blue-400">{s.slaHours} ชม.</span>
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
                onClick={handleAssignWorkflow}
                className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:opacity-90 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                เริ่มเสนอเรื่อง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Process Step Modal */}
      {isStepModalOpen && selectedInstance && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {stepAction === 'approve' ? 'เกษียณหนังสือ / ส่งต่อผู้บังคับบัญชา' : 'ส่งคืนเอกสารเพื่อแก้ไข'}
              </h2>
              <button onClick={() => setIsStepModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-lighter)] space-y-1">
                <p className="font-bold text-[var(--text-primary)]">{selectedInstance.docNumber} - {selectedInstance.docTitle}</p>
                <p className="text-[var(--text-muted)]">ขั้นตอนปัจจุบัน: {selectedInstance.steps[selectedInstance.currentStepIndex]?.title}</p>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  ความคิดเห็น / ข้อความเสนอเกษียณหนังสือ / คำสั่งการ:
                </label>
                <textarea
                  rows={4}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="กรอกข้อความ เช่น เห็นควรอนุมัติตามเสนอ, มอบหมายฝ่ายป้องกันฯ ดำเนินการ..."
                  className="w-full p-2.5 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
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
                onClick={handleProcessStep}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md cursor-pointer ${
                  stepAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {stepAction === 'approve' ? 'ยืนยันการเกษียณหนังสือ' : 'ยืนยันการส่งคืน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Workflow Template Designer Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {editingTemplate ? 'แก้ไขแม่แบบเส้นทางหนังสือ' : 'สร้างแม่แบบเส้นทางหนังสือใหม่'}
              </h2>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">ชื่อแม่แบบ Workflow:</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="เช่น เส้นทางหนังสือเสนอผู้ว่าราชการจังหวัด"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">หมวดหมู่หนังสือ:</label>
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
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">ความสำคัญเริ่มต้น:</label>
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
                <label className="block font-semibold text-[var(--text-primary)] mb-1">คำอธิบายเส้นทาง:</label>
                <input
                  type="text"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="อธิบายการเดินหนังสือตามลำดับชั้น..."
                  className="w-full p-2.5 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] text-[var(--text-primary)]"
                />
              </div>

              {/* Dynamic Steps Configurator */}
              <div className="space-y-2 border-t border-[var(--border-lighter)] pt-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[var(--text-primary)]">กำหนดขั้นตอนตามลำดับชั้น (Steps Builder):</label>
                  <button
                    onClick={handleAddStepToForm}
                    className="px-3 py-1 rounded-lg bg-[var(--primary-color)] text-white text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มขั้นตอน</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {templateForm.steps.map((st, idx) => (
                    <div key={idx} className="p-3 bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-[var(--primary-color)]">ขั้นตอนที่ {idx + 1}</span>
                        {templateForm.steps.length > 1 && (
                          <button
                            onClick={() => handleRemoveStepFromForm(idx)}
                            className="text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={st.title}
                          onChange={(e) => {
                            const updated = [...templateForm.steps];
                            updated[idx].title = e.target.value;
                            setTemplateForm({ ...templateForm, steps: updated });
                          }}
                          placeholder="ชื่อขั้นตอน"
                          className="p-1.5 rounded-lg border border-[var(--border-lighter)] text-xs"
                        />
                        <input
                          type="text"
                          value={st.assignedRole}
                          onChange={(e) => {
                            const updated = [...templateForm.steps];
                            updated[idx].assignedRole = e.target.value;
                            setTemplateForm({ ...templateForm, steps: updated });
                          }}
                          placeholder="ตำแหน่งผู้รับผิดชอบ"
                          className="p-1.5 rounded-lg border border-[var(--border-lighter)] text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={st.department}
                          onChange={(e) => {
                            const updated = [...templateForm.steps];
                            updated[idx].department = e.target.value;
                            setTemplateForm({ ...templateForm, steps: updated });
                          }}
                          placeholder="ฝ่าย/กลุ่มงาน"
                          className="p-1.5 rounded-lg border border-[var(--border-lighter)] text-xs"
                        />
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            value={st.slaHours}
                            onChange={(e) => {
                              const updated = [...templateForm.steps];
                              updated[idx].slaHours = Number(e.target.value);
                              setTemplateForm({ ...templateForm, steps: updated });
                            }}
                            className="w-20 p-1.5 rounded-lg border border-[var(--border-lighter)] text-xs font-mono"
                          />
                          <span className="text-[11px] text-[var(--text-muted)]">ชั่วโมง (SLA)</span>
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
                onClick={handleSaveTemplate}
                className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:opacity-90 text-white text-xs font-bold shadow-md cursor-pointer"
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
