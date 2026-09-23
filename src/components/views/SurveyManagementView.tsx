import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Sparkles, 
  FileSpreadsheet, 
  BarChart3, 
  Share2, 
  CheckCircle2, 
  Clock, 
  Layers, 
  HelpCircle, 
  BookOpen, 
  Grid, 
  List, 
  FileText,
  Trash2,
  RefreshCw,
  FolderPlus,
  Compass,
  AlertTriangle,
  Users,
  Activity,
  TrendingUp,
  Eye,
  Edit3,
  Copy,
  ExternalLink,
  X,
  ChevronRight,
  PauseCircle,
  Printer
} from 'lucide-react';
import { Survey, SurveyResponse } from '../../types/survey';
import { OFFICIAL_SURVEY_TEMPLATES } from '../../data/surveyTemplates';
import { SurveyCard } from '../survey/SurveyCard';
import { SurveyFormBuilder } from '../survey/SurveyFormBuilder';
import { SurveyAnalyticsDashboard } from '../survey/SurveyAnalyticsDashboard';
import { SurveyRespondentPortal } from '../survey/SurveyRespondentPortal';
import { SurveyShareModal } from '../survey/SurveyShareModal';
import { AiSurveyGeneratorModal } from '../survey/AiSurveyGeneratorModal';
import { SurveyPrintablePaperModal } from '../survey/SurveyPrintablePaperModal';
import { formatThaiDateShort } from '../../types';
import { useConfirm } from '../../context/ConfirmContext';

interface SurveyManagementViewProps {
  user: any;
  documents?: any[];
  hasPermission?: (key: string) => boolean;
}

export const SurveyManagementView: React.FC<SurveyManagementViewProps> = ({
  user,
  documents = [],
  hasPermission = () => true,
}) => {
  const { confirm } = useConfirm();
  // State
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<Record<string, SurveyResponse[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // View Modes: 'list' | 'builder' | 'analytics' | 'respondent'
  const [currentView, setCurrentView] = useState<'list' | 'builder' | 'analytics' | 'respondent'>('list');
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

  // Modals
  const [shareSurvey, setShareSurvey] = useState<Survey | null>(null);
  const [printableSurvey, setPrintableSurvey] = useState<Survey | null>(null);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch surveys from server
  const fetchSurveys = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/surveys');
      if (res.ok) {
        const data = await res.json();
        setSurveys(data || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'ไม่สามารถดึงข้อมูลแบบสำรวจจาก MySQL ได้');
      }
    } catch (e: any) {
      console.error('Failed to load surveys from MySQL API:', e);
      setApiError(e.message || 'เกิดข้อผิดพลาดในการติดต่อฐานข้อมูล MySQL');
      setSurveys([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  // Fetch responses for a survey
  const fetchSurveyResponses = async (surveyId: string) => {
    try {
      const res = await fetch(`/api/surveys/${surveyId}/responses`);
      if (res.ok) {
        const data = await res.json();
        setResponses(prev => ({ ...prev, [surveyId]: data || [] }));
      }
    } catch (e) {
      console.warn('Failed to load responses from MySQL API:', e);
    }
  };

  // Save Survey (Create or Update)
  const handleSaveSurvey = async (surveyToSave: Survey, publishImmediately: boolean = false) => {
    const finalSurvey: Survey = {
      ...surveyToSave,
      updatedAt: new Date().toISOString(),
      settings: {
        ...surveyToSave.settings,
        status: publishImmediately ? 'published' : surveyToSave.settings.status
      }
    };

    const isEdit = surveys.some(s => s.id === finalSurvey.id);
    const logAction = isEdit ? 'UPDATE_SURVEY' : 'CREATE_SURVEY';
    const logDetails = `${isEdit ? 'แก้ไข' : 'สร้าง'}แบบทดสอบ / แบบสำรวจ: ${finalSurvey.title} (สถานะ: ${finalSurvey.settings?.status || 'ร่าง'})`;

    try {
      await fetch(`/api/surveys/${finalSurvey.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalSurvey)
      });

      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: logAction,
          details: logDetails,
          username: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ดูแลระบบ'
        })
      }).catch(console.error);

      // Re-fetch to ensure MySQL sync
      await fetchSurveys();
      setCurrentView('list');
      setSelectedSurvey(null);
    } catch (e) {
      console.error('API save failed:', e);
      alert('ไม่สามารถบันทึกข้อมูลแบบสำรวจลงใน MySQL ได้');
    }
  };

  // Submit Response
  const handleSubmitResponse = async (respData: Omit<SurveyResponse, 'id' | 'submittedAt'>) => {
    const newResponse: SurveyResponse = {
      ...respData,
      id: `resp_${Date.now()}`,
      submittedAt: new Date().toISOString()
    };

    try {
      await fetch(`/api/surveys/${respData.surveyId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResponse)
      });
      // Re-fetch survey to get updated response count from MySQL
      await fetchSurveys();
      return true;
    } catch (e) {
      console.error('Response API submit failed:', e);
      alert('ไม่สามารถส่งคำตอบได้ในขณะนี้ เนื่องจากฐานข้อมูลขัดข้อง');
      return false;
    }
  };

  // Duplicate Survey
  const handleDuplicateSurvey = async (target: Survey) => {
    const newSurvey: Survey = {
      ...JSON.parse(JSON.stringify(target)),
      id: `survey_${Date.now()}`,
      title: `${target.title} (สำเนา)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 0,
      responseCount: 0,
      settings: {
        ...target.settings,
        status: 'draft'
      }
    };

    try {
      await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSurvey)
      });
      await fetchSurveys();
    } catch (e) {
      console.error('Duplicate survey failed:', e);
    }
  };

  // Delete Survey
  const handleDeleteSurvey = async (target: Survey) => {
    const ok = await confirm({
      title: 'ยืนยันการลบแบบสำรวจอัจฉริยะ',
      message: `คุณต้องการลบแบบสำรวจ "${target.title}" ใช่หรือไม่?`,
      description: 'คำตอบที่ได้รับทั้งหมดรวมถึงสถิติสแกนและประวัติผลการตอบรับจะถูกทำลายอย่างถาวรและไม่สามารถกู้คืนได้',
      type: 'delete',
      confirmText: 'ยืนยันลบแบบสำรวจ',
      cancelText: 'ยกเลิก'
    });
    if (!ok) return;

    try {
      await fetch(`/api/surveys/${target.id}`, { method: 'DELETE' });

      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_SURVEY',
          details: `ลบแบบสำรวจ/ข้อสอบ: ${target.title}`,
          username: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ดูแลระบบ'
        })
      }).catch(console.error);

      await fetchSurveys();
    } catch (e) {
      console.error('Delete survey failed:', e);
    }
  };

  // Print Survey Activity Logger
  const handlePrintSurvey = (survey: Survey) => {
    setPrintableSurvey(survey);
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'PRINT_SURVEY',
        details: `เปิดหน้าพิมพ์ข้อสอบ/แบบประเมินฉบับกระดาษ A4/PDF หัวข้อ: "${survey.title}"`,
        username: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ดูแลระบบ'
      })
    }).catch(console.error);
  };

  // Status toggle
  const handleStatusChange = async (target: Survey, newStatus: 'draft' | 'published' | 'paused' | 'archived') => {
    const statusLabels: Record<string, string> = {
      draft: 'แบบร่าง (ปิดรับคำตอบ)',
      published: 'เผยแพร่ (เปิดรับคำตอบจากประชาชน)',
      paused: 'ระงับรับคำตอบชั่วคราว',
      archived: 'จัดเก็บถาวร'
    };

    const ok = await confirm({
      title: 'ยืนยันการแก้ไขสถานะแบบสำรวจ',
      message: `คุณต้องการเปลี่ยนสถานะแบบสำรวจ "${target.title}" เป็น "${statusLabels[newStatus] || newStatus}" ใช่หรือไม่?`,
      type: 'warning',
      confirmText: 'เปลี่ยนสถานะ',
      cancelText: 'ยกเลิก'
    });
    if (!ok) return;

    handleSaveSurvey({ ...target, settings: { ...target.settings, status: newStatus } });
  };

  // Create from Template
  const handleCreateFromTemplate = (template: typeof OFFICIAL_SURVEY_TEMPLATES[0]) => {
    const newSurvey: Survey = {
      ...template,
      id: `survey_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      creatorId: user?.id || 'admin',
      creatorName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ดูแลระบบ',
      viewCount: 0,
      responseCount: 0,
    };

    setSelectedSurvey(newSurvey);
    setShowTemplateModal(false);
    setCurrentView('builder');
  };

  // Create with AI
  const handleGenerateAiSurvey = (generatedData: Partial<Survey>) => {
    const newSurvey: Survey = {
      id: `survey_ai_${Date.now()}`,
      title: generatedData.title || 'แบบสำรวจสร้างโดย AI Smart',
      description: generatedData.description || '',
      category: (generatedData.category as any) || 'satisfaction',
      categoryLabel: generatedData.categoryLabel || 'ความพึงพอใจ',
      department: user?.department || 'สำนักงาน ปภ. จังหวัดระยอง',
      creatorId: user?.id || 'admin',
      creatorName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'ผู้ดูแลระบบ',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 0,
      responseCount: 0,
      settings: generatedData.settings || {
        status: 'draft',
        themeColor: '#2563eb',
        headerLogoType: 'ddpm',
        showProgressBar: true,
        showQuestionNumbers: true,
        allowAnonymous: true,
        requireLogin: false,
        limitOneResponsePerDevice: false,
        thankYouTitle: 'ขอบพระคุณสำหรับข้อมูล',
        thankYouMessage: 'บันทึกคำตอบเรียบร้อยแล้ว',
        showSummaryToRespondents: true
      },
      questions: generatedData.questions || []
    };

    setSelectedSurvey(newSurvey);
    setShowAiModal(false);
    setCurrentView('builder');
  };

  // Filtered Surveys List
  const filteredSurveys = useMemo(() => {
    return surveys.filter(s => {
      const matchQuery = !searchQuery.trim() || 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || s.category === selectedCategory;
      const matchStatus = selectedStatus === 'all' || s.settings.status === selectedStatus;
      return matchQuery && matchCat && matchStatus;
    });
  }, [surveys, searchQuery, selectedCategory, selectedStatus]);

  // Quick Executive KPI Stats
  const stats = useMemo(() => {
    const total = surveys.length;
    const published = surveys.filter(s => s.settings.status === 'published').length;
    const drafts = surveys.filter(s => s.settings.status === 'draft').length;
    const paused = surveys.filter(s => s.settings.status === 'paused').length;
    const totalResponses = surveys.reduce((acc, s) => acc + (s.responseCount || 0), 0);
    const totalViews = surveys.reduce((acc, s) => acc + (s.viewCount || 0), 0);
    return { total, published, drafts, paused, totalResponses, totalViews };
  }, [surveys]);

  // Category filter tabs
  const categoryTabs = [
    { id: 'all', label: 'ทั้งหมด', count: surveys.length },
    { id: 'exam_quiz', label: 'แบบทดสอบ / รับรองผล', count: surveys.filter(s => (s.category as string) === 'exam_quiz' || s.settings?.quizMode).length },
    { id: 'rsvp_acknowledgment', label: 'แบบตอบรับ & ยืนยันการรับทราบ', count: surveys.filter(s => s.category === 'rsvp_acknowledgment' || s.settings?.isRsvpForm).length },
    { id: 'satisfaction', label: 'ความพึงพอใจ (ก.พ.ร.)', count: surveys.filter(s => s.category === 'satisfaction').length },
    { id: 'disaster_readiness', label: 'ความพร้อมรับมือภัย', count: surveys.filter(s => s.category === 'disaster_readiness').length },
    { id: 'training', label: 'การฝึกอบรม/ฝึกซ้อม', count: surveys.filter(s => s.category === 'training').length },
    { id: 'assessment', label: 'การประเมินผล', count: surveys.filter(s => s.category === 'assessment').length },
    { id: 'public_feedback', label: 'รับฟังความคิดเห็น', count: surveys.filter(s => s.category === 'public_feedback').length },
  ];

  // View Routing
  if (currentView === 'builder') {
    return (
      <SurveyFormBuilder
        initialSurvey={selectedSurvey}
        onSave={handleSaveSurvey}
        onCancel={() => {
          setCurrentView('list');
          setSelectedSurvey(null);
        }}
        currentUser={user}
        allDocuments={documents}
      />
    );
  }

  if (currentView === 'analytics' && selectedSurvey) {
    return (
      <SurveyAnalyticsDashboard
        survey={selectedSurvey}
        responses={responses[selectedSurvey.id] || []}
        onBack={() => {
          setCurrentView('list');
          setSelectedSurvey(null);
        }}
        onDeleteResponse={(respId) => {
          setResponses(prev => ({
            ...prev,
            [selectedSurvey.id]: (prev[selectedSurvey.id] || []).filter(r => r.id !== respId)
          }));
        }}
      />
    );
  }

  if (currentView === 'respondent' && selectedSurvey) {
    return (
      <SurveyRespondentPortal
        survey={selectedSurvey}
        onSubmit={handleSubmitResponse}
        onBack={() => {
          setCurrentView('list');
          setSelectedSurvey(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Top Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/10 text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative background grid and lighting */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-3.5 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ระบบแบบสำรวจและประเมินผล</span>
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              SMART SURVEY ENGINE
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight">
            ระบบแบบสำรวจและประเมินผลอัจฉริยะ
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
            สร้าง ออกแบบ เผยแพร่ผ่าน QR Code และวิเคราะห์ผลแบบประเมินความพึงพอใจ (ก.พ.ร.), แบบประเมินความพร้อมรับมือสาธารณภัย และแบบสอบถามบุคลากร พร้อมระบบสถิติและส่งออก Excel ทันที
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="relative z-10 shrink-0 w-full lg:w-auto">
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap lg:flex-row">
            <button
              onClick={() => setShowAiModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all hover:scale-103 active:scale-97 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>AI สร้างแบบสำรวจ</span>
            </button>

            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/10 font-bold text-xs sm:text-sm shadow-sm transition-all hover:scale-103 active:scale-97 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>แม่แบบ ปภ.</span>
            </button>

            <button
              onClick={() => {
                setSelectedSurvey(null);
                setCurrentView('builder');
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm shadow-lg hover:shadow-blue-600/30 transition-all hover:scale-103 active:scale-97 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างแบบสำรวจใหม่</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_20px_-6px_rgba(37,99,235,0.08)] transition-all flex items-center justify-between group overflow-hidden relative">
          <div className="space-y-1.5 relative z-10">
            <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider block">แบบสำรวจทั้งหมด</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">{stats.total}</span>
              <span className="text-xs text-[var(--text-muted)] font-bold">ชุด</span>
            </div>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium block">เข้าชมรวม {stats.totalViews} ครั้ง</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 shrink-0 group-hover:scale-110 transition-transform relative z-10">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.08)] transition-all flex items-center justify-between group overflow-hidden relative">
          <div className="space-y-1.5 relative z-10">
            <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider block">กำลังเปิดรับคำตอบ</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">{stats.published}</span>
              <span className="text-xs text-[var(--text-muted)] font-bold">รายการ</span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              พร้อมแสกน QR
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform relative z-10">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_20px_-6px_rgba(99,102,241,0.08)] transition-all flex items-center justify-between group overflow-hidden relative">
          <div className="space-y-1.5 relative z-10">
            <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider block">ผู้ตอบสะสมรวม</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">{stats.totalResponses}</span>
              <span className="text-xs text-[var(--text-muted)] font-bold">ชุด</span>
            </div>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium block">พร้อมออกรายงาน ก.พ.ร.</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-600 shrink-0 group-hover:scale-110 transition-transform relative z-10">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_20px_-6px_rgba(245,158,11,0.08)] transition-all flex items-center justify-between group overflow-hidden relative">
          <div className="space-y-1.5 relative z-10">
            <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider block">แบบร่าง / พักคำตอบ</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-500 tracking-tight">{stats.drafts + stats.paused}</span>
              <span className="text-xs text-[var(--text-muted)] font-bold">ฉบับ</span>
            </div>
            <span className="text-[11px] text-[var(--text-muted)] font-medium block">ร่าง {stats.drafts} / พักรับ {stats.paused}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 shrink-0 group-hover:scale-110 transition-transform relative z-10">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-1 custom-scrollbar scroll-smooth">
        {categoryTabs.map(tab => {
          const isActive = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer hover:scale-103 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10 border border-blue-500/10'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-lighter)] shadow-xs'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-xl text-[10px] font-extrabold transition-colors ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)]'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search, Status & View Mode Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs">
        {/* Search Input */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px] px-3.5 py-2.5 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาชื่อแบบสำรวจ, คำอธิบาย, หน่วยงาน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs sm:text-sm text-[var(--text-primary)] outline-none placeholder:text-slate-400 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-end">
          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-2xl px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] outline-none cursor-pointer focus:border-blue-500/50 transition-all"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="published">กำลังเปิดรับคำตอบ</option>
            <option value="draft">ร่างแบบสำรวจ</option>
            <option value="paused">หยุดรับคำตอบ</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-[var(--text-primary)]'
              }`}
              title="มุมมองการ์ด (Grid View)"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-[var(--text-primary)]'
              }`}
              title="มุมมองตารางรายการ (Table View)"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering: Empty vs Grid vs Table */}
      {apiError && (
        <div className="mb-6 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
            <div>
              <p className="font-black text-sm">การเชื่อมต่อฐานข้อมูล MySQL มีปัญหาระหว่างดึงข้อมูลแบบสำรวจ:</p>
              <p className="opacity-90">{apiError}</p>
            </div>
          </div>
          <button 
            onClick={fetchSurveys}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-rose-500 text-white font-extrabold hover:bg-rose-600 transition shadow-xs text-xs cursor-pointer shrink-0"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      )}

      {surveys.length === 0 ? (
        <div className="p-12 sm:p-16 rounded-3xl bg-blue-500/5 border border-blue-500/10 text-center space-y-5 shadow-xs max-w-2xl mx-auto my-12">
          <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
            <Layers className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-[var(--text-primary)]">
              ไม่พบข้อมูลแบบสำรวจในฐานข้อมูล MySQL
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
              ระบบไม่พบข้อมูลแบบสำรวจใดๆ ในเซิร์ฟเวอร์ขณะนี้ คุณสามารถสั่งให้ระบบติดตั้งและสร้างแบบสำรวจมาตรฐาน ปภ. อัจฉริยะ (จำนวน 6 ฟอร์ม) ลงฐานข้อมูลได้โดยตรงทันที
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={async () => {
                setIsLoading(true);
                setApiError(null);
                try {
                  const res = await fetch('/api/surveys/seed-official', { method: 'POST' });
                  if (res.ok) {
                    const data = await res.json();
                    alert(data.message || 'ติดตั้งแบบสำรวจมาตรฐานสำเร็จ!');
                    await fetchSurveys();
                  } else {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'ติดตั้งแบบสำรวจล้มเหลว');
                  }
                } catch (e: any) {
                  alert(e.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
                  setApiError(e.message);
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>ติดตั้งแบบสำรวจมาตรฐาน ปภ. (6 แบบฟอร์ม)</span>
            </button>
          </div>
        </div>
      ) : filteredSurveys.length === 0 ? (
        <div className="p-12 sm:p-16 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto">
            <Layers className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              ไม่พบแบบสำรวจที่ตรงกับเงื่อนไข
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
              ลองเปลี่ยนคำค้นหา ปรับเปลี่ยนตัวกรอง หรือเลือกสร้างแบบสำรวจใหม่จากคลังแม่แบบมาตรฐาน ปภ.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedStatus('all');
              }}
              className="px-4 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] hover:bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-secondary)] transition-all"
            >
              ล้างตัวกรองทั้งหมด
            </button>
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm"
            >
              เปิดคลังแม่แบบมาตรฐาน
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredSurveys.map(survey => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              onEdit={(s) => {
                setSelectedSurvey(s);
                setCurrentView('builder');
              }}
              onAnalytics={(s) => {
                setSelectedSurvey(s);
                fetchSurveyResponses(s.id);
                setCurrentView('analytics');
              }}
              onShare={(s) => setShareSurvey(s)}
              onPreview={(s) => {
                setSelectedSurvey(s);
                setCurrentView('respondent');
              }}
              onDuplicate={handleDuplicateSurvey}
              onDelete={handleDeleteSurvey}
              onStatusChange={handleStatusChange}
              onPrint={(s) => handlePrintSurvey(s)}
              canEdit={hasPermission('surveys')}
            />
          ))}
        </div>
      ) : (
        /* Table / List View */
        <div className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-canvas)] border-b border-[var(--border-lighter)] text-[var(--text-muted)] uppercase tracking-wider font-extrabold text-[10px]">
                <tr>
                  <th className="py-4 px-5">ชื่อแบบสำรวจ</th>
                  <th className="py-4 px-5">หมวดหมู่</th>
                  <th className="py-4 px-5">สถานะ</th>
                  <th className="py-4 px-5 text-center">คำถาม</th>
                  <th className="py-4 px-5 text-center">ผู้ตอบ</th>
                  <th className="py-4 px-5">วันที่สร้าง</th>
                  <th className="py-4 px-5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-lighter)]/60">
                {filteredSurveys.map(survey => {
                  const isPublished = survey.settings.status === 'published';
                  const isPaused = survey.settings.status === 'paused';

                  return (
                    <tr key={survey.id} className="hover:bg-[var(--bg-elevated)] transition-colors duration-200">
                      <td className="py-4 px-5 max-w-xs">
                        <div className="font-extrabold text-[var(--text-primary)] hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-sm leading-tight" onClick={() => {
                          setSelectedSurvey(survey);
                          setCurrentView('respondent');
                        }}>
                          {survey.title}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate mt-1 font-light">
                          {survey.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                        </div>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          {survey.categoryLabel || 'ทั่วไป'}
                        </span>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            เปิดรับคำตอบ
                          </span>
                        ) : isPaused ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            พักรับคำตอบ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                            แบบร่าง
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-center font-extrabold text-[var(--text-primary)] text-sm">
                        {survey.questions?.length || 0} ข้อ
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                          {survey.responseCount || 0}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-bold ml-0.5">ชุด</span>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap text-[11px] text-[var(--text-muted)] font-medium">
                        {formatThaiDateShort(survey.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedSurvey(survey);
                              fetchSurveyResponses(survey.id);
                              setCurrentView('analytics');
                            }}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-indigo-600 bg-indigo-500/10 hover:bg-indigo-500/20 font-bold transition-all cursor-pointer"
                            title="จัดการผลการตอบกลับ (Analytics & Responses)"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>ผลตอบกลับ</span>
                          </button>
                          <button
                            onClick={() => setShareSurvey(survey)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                            title="แชร์ลิงก์ / QR Code"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintSurvey(survey)}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors"
                            title="พิมพ์โจทย์ข้อสอบกระดาษ A4 / PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {hasPermission('surveys') && (
                            <button
                              onClick={() => {
                                setSelectedSurvey(survey);
                                setCurrentView('builder');
                              }}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-500/10 transition-colors"
                              title="แก้ไขแบบสำรวจ"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('surveys') && (
                            <button
                              onClick={() => handleDuplicateSurvey(survey)}
                              className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-500/10 transition-colors"
                              title="คัดลอก (Duplicate)"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('surveys') && (
                            <button
                              onClick={() => handleDeleteSurvey(survey)}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-500/10 transition-colors"
                              title="ลบแบบสำรวจ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareSurvey && (
        <SurveyShareModal
          survey={shareSurvey}
          onClose={() => setShareSurvey(null)}
        />
      )}

      {/* AI Generator Modal */}
      {showAiModal && (
        <AiSurveyGeneratorModal
          onClose={() => setShowAiModal(false)}
          onGenerate={handleGenerateAiSurvey}
        />
      )}

      {/* Template Library Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-lighter)] bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">
                    คลังแม่แบบแบบสำรวจมาตรฐาน ปภ. และราชการ (Official Templates)
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    เลือกแม่แบบที่ผ่านการรับรองเพื่อเริ่มสร้างและปรับแต่งได้อย่างรวดเร็ว
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {OFFICIAL_SURVEY_TEMPLATES.map((tpl, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-lighter)] hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-3 shadow-xs"
                    style={{ borderTopWidth: '4px', borderTopColor: tpl.settings.themeColor }}
                  >
                    <div className="space-y-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600">
                        {tpl.categoryLabel}
                      </span>
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">
                        {tpl.title}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-lighter)]">
                      <span className="text-[11px] text-[var(--text-muted)] font-medium">
                        {tpl.questions.length} ข้อคำถาม
                      </span>
                      <button
                        onClick={() => handleCreateFromTemplate(tpl)}
                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        ใช้แม่แบบนี้
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {printableSurvey && (
        <SurveyPrintablePaperModal
          survey={printableSurvey}
          onClose={() => setPrintableSurvey(null)}
        />
      )}
    </div>
  );
};
