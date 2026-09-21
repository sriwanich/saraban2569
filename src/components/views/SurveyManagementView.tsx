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
  PauseCircle
} from 'lucide-react';
import { Survey, SurveyResponse } from '../../types/survey';
import { OFFICIAL_SURVEY_TEMPLATES } from '../../data/surveyTemplates';
import { SurveyCard } from '../survey/SurveyCard';
import { SurveyFormBuilder } from '../survey/SurveyFormBuilder';
import { SurveyAnalyticsDashboard } from '../survey/SurveyAnalyticsDashboard';
import { SurveyRespondentPortal } from '../survey/SurveyRespondentPortal';
import { SurveyShareModal } from '../survey/SurveyShareModal';
import { AiSurveyGeneratorModal } from '../survey/AiSurveyGeneratorModal';
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
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);

  // Fetch surveys from server or initialize with official templates
  const fetchSurveys = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/surveys');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSurveys(data);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load surveys from API, fallback to localStorage/defaults:', e);
    }

    // Load from local storage or defaults
    try {
      const saved = localStorage.getItem('edms_surveys_cache');
      if (saved) {
        setSurveys(JSON.parse(saved));
        setIsLoading(false);
        return;
      }
    } catch {}

    // Initialize with default templates
    const initialSurveys: Survey[] = OFFICIAL_SURVEY_TEMPLATES.map((tpl, i) => ({
      ...tpl,
      id: `survey_official_${i + 1}`,
      createdAt: new Date(Date.now() - (i * 86400000 * 2)).toISOString(),
      updatedAt: new Date().toISOString(),
      creatorId: user?.id || 'admin',
      creatorName: 'ฝ่ายบริหารงานสารบรรณ ปภ.',
      viewCount: 42 + (i * 18),
      responseCount: 15 + (i * 9),
    }));

    setSurveys(initialSurveys);
    localStorage.setItem('edms_surveys_cache', JSON.stringify(initialSurveys));
    
    // Sync initial official templates to backend API/MySQL
    initialSurveys.forEach(s => {
      fetch(`/api/surveys/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s)
      }).catch(() => {});
    });

    setIsLoading(false);
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
        setResponses(prev => ({ ...prev, [surveyId]: data }));
        return;
      }
    } catch (e) {
      console.warn('Failed to load responses from API:', e);
    }

    // Generate smart mock responses if none exist
    const cached = localStorage.getItem(`survey_responses_${surveyId}`);
    if (cached) {
      setResponses(prev => ({ ...prev, [surveyId]: JSON.parse(cached) }));
      return;
    }

    // Synthesize mock responses for rich initial display
    const sampleResponses: SurveyResponse[] = Array.from({ length: 8 }).map((_, i) => ({
      id: `resp_${surveyId}_${i + 1}`,
      surveyId,
      respondentName: i % 2 === 0 ? `นายสมชาย นามสมมุติ (${i + 1})` : undefined,
      respondentDepartment: i % 2 === 0 ? 'อบต.เชิงเนิน' : 'ประชาชนทั่วไป',
      submittedAt: new Date(Date.now() - (i * 3600000 * 4)).toISOString(),
      timeSpentSeconds: 45 + (i * 12),
      answers: {
        'q_service_type': 'งานขอรับความช่วยเหลือสงเคราะห์ผู้ประสบภัยพิบัติ',
        'q_matrix_satisfaction': {
          'row_step': 4 + (i % 2),
          'row_staff': 5,
          'row_info': 4,
          'row_place': 4 + (i % 2),
          'row_overall': 5
        },
        'q_nps_score': 9 + (i % 2),
        'q_suggestions': i === 0 ? 'ระบบบริการรวดเร็ว เจ้าหน้าที่ยิ้มแย้มดีมากครับ' : undefined
      }
    }));

    setResponses(prev => ({ ...prev, [surveyId]: sampleResponses }));
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

    try {
      await fetch(`/api/surveys/${finalSurvey.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalSurvey)
      });
    } catch (e) {
      console.warn('API save fallback:', e);
    }

    setSurveys(prev => {
      const exists = prev.some(s => s.id === finalSurvey.id);
      const updated = exists
        ? prev.map(s => s.id === finalSurvey.id ? finalSurvey : s)
        : [finalSurvey, ...prev];
      localStorage.setItem('edms_surveys_cache', JSON.stringify(updated));
      return updated;
    });

    setCurrentView('list');
    setSelectedSurvey(null);
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
    } catch (e) {
      console.warn('Response API submit fallback:', e);
    }

    // Update local state
    setResponses(prev => {
      const currentList = prev[respData.surveyId] || [];
      const updated = [newResponse, ...currentList];
      localStorage.setItem(`survey_responses_${respData.surveyId}`, JSON.stringify(updated));
      return { ...prev, [respData.surveyId]: updated };
    });

    // Update survey response count
    setSurveys(prev => {
      const updated = prev.map(s => s.id === respData.surveyId ? { ...s, responseCount: (s.responseCount || 0) + 1 } : s);
      localStorage.setItem('edms_surveys_cache', JSON.stringify(updated));
      return updated;
    });

    return true;
  };

  // Duplicate Survey
  const handleDuplicateSurvey = (target: Survey) => {
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

    setSurveys(prev => {
      const updated = [newSurvey, ...prev];
      localStorage.setItem('edms_surveys_cache', JSON.stringify(updated));
      return updated;
    });
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

    fetch(`/api/surveys/${target.id}`, { method: 'DELETE' }).catch(() => {});

    setSurveys(prev => {
      const updated = prev.filter(s => s.id !== target.id);
      localStorage.setItem('edms_surveys_cache', JSON.stringify(updated));
      return updated;
    });
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
        headerLogoType: 'garuda',
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
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border border-indigo-500/20 text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ระบบแบบสำรวจและประเมินผล</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            ระบบแบบสำรวจและประเมินผลอัจฉริยะ (Survey & Evaluation)
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed">
            สร้าง ออกแบบ เผยแพร่ผ่าน QR Code และวิเคราะห์ผลแบบประเมินความพึงพอใจ (ก.พ.ร.), แบบประเมินความพร้อมรับมือสาธารณภัย และแบบสอบถามบุคลากร พร้อมระบบสถิติและส่งออก Excel ทันที
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="relative z-10 shrink-0 w-full sm:w-auto">
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setShowAiModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>AI สร้างแบบสำรวจ</span>
            </button>

            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>แม่แบบ ปภ.</span>
            </button>

            <button
              onClick={() => {
                setSelectedSurvey(null);
                setCurrentView('builder');
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg hover:shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างแบบสำรวจใหม่</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">แบบสำรวจทั้งหมด</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">{stats.total}</span>
              <span className="text-xs text-[var(--text-muted)]">ชุด</span>
            </div>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 block">เข้าชมรวม {stats.totalViews} ครั้ง</span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">กำลังเปิดรับคำตอบ</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.published}</span>
              <span className="text-xs text-[var(--text-muted)]">รายการ</span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ออนไลน์พร้อมสแกน QR
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">คำตอบที่บันทึกแล้ว</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalResponses}</span>
              <span className="text-xs text-[var(--text-muted)]">ชุด</span>
            </div>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 block">พร้อมรายงานสถิติ ก.พ.ร.</span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">แบบร่าง / พักรับคำตอบ</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.drafts + stats.paused}</span>
              <span className="text-xs text-[var(--text-muted)]">ฉบับ</span>
            </div>
            <span className="text-[11px] text-[var(--text-muted)] block">ร่าง {stats.drafts} / พัก {stats.paused}</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {categoryTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-lighter)]'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              selectedCategory === tab.id
                ? 'bg-white/20 text-white font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)]'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search, Status & View Mode Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs">
        {/* Search Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[240px] px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาชื่อแบบสำรวจ, คำอธิบาย, หน่วยงาน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs sm:text-sm text-[var(--text-primary)] outline-none placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 justify-between sm:justify-end">
          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none cursor-pointer"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="published">กำลังเปิดรับคำตอบ</option>
            <option value="draft">ร่างแบบสำรวจ</option>
            <option value="paused">หยุดรับคำตอบ</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
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
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
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
      {filteredSurveys.length === 0 ? (
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
              canEdit={hasPermission('surveys')}
            />
          ))}
        </div>
      ) : (
        /* Table / List View */
        <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-canvas)] border-b border-[var(--border-lighter)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">ชื่อแบบสำรวจ</th>
                  <th className="py-3 px-4">หมวดหมู่</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4 text-center">คำถาม</th>
                  <th className="py-3 px-4 text-center">ผู้ตอบ</th>
                  <th className="py-3 px-4">วันที่สร้าง</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-lighter)]">
                {filteredSurveys.map(survey => {
                  const isPublished = survey.settings.status === 'published';
                  const isPaused = survey.settings.status === 'paused';

                  return (
                    <tr key={survey.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-[var(--text-primary)] hover:text-blue-600 transition-colors cursor-pointer" onClick={() => {
                          setSelectedSurvey(survey);
                          setCurrentView('respondent');
                        }}>
                          {survey.title}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                          {survey.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          {survey.categoryLabel || 'ทั่วไป'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            เปิดรับคำตอบ
                          </span>
                        ) : isPaused ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            พักรับคำตอบ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400">
                            แบบร่าง
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-[var(--text-primary)]">
                        {survey.questions?.length || 0} ข้อ
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {survey.responseCount || 0}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] ml-0.5">ชุด</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-[var(--text-muted)]">
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
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-500/10 transition-colors"
                            title="ดูรายงานสถิติ"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShareSurvey(survey)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                            title="แชร์ลิงก์ / QR Code"
                          >
                            <Share2 className="w-4 h-4" />
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
    </div>
  );
};
