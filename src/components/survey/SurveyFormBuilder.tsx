import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  MoveUp, 
  MoveDown, 
  Settings, 
  Eye, 
  Save, 
  Send, 
  ArrowLeft, 
  HelpCircle, 
  Sparkles, 
  Palette, 
  Shield, 
  FileText, 
  CheckSquare, 
  CircleDot, 
  ListOrdered, 
  Type, 
  AlignLeft, 
  Star, 
  Sliders, 
  Grid3X3, 
  Calendar, 
  UploadCloud, 
  PenTool, 
  UserCheck, 
  Split, 
  Smartphone, 
  Monitor, 
  X,
  PlusCircle,
  FileCheck,
  GitBranch,
  FastForward,
  Upload,
  Link2,
  ImageIcon
} from 'lucide-react';
import { 
  Survey, 
  SurveyQuestion, 
  SurveyQuestionType, 
  SurveyOption, 
  SurveyMatrixRow, 
  SurveyMatrixCol, 
  SurveyLogicRule 
} from '../../types/survey';
import { SurveyLogicModal } from './SurveyLogicModal';
import { SurveyLogicFlowMap } from './SurveyLogicFlowMap';
import { SurveyThemeCustomizer } from './SurveyThemeCustomizer';
import { SurveyRespondentPortal } from './SurveyRespondentPortal';
import { getReadableRuleDescription, normalizeRule } from '../../utils/surveyLogicEngine';
import { getResolvedSurveyLogoUrl, getSystemBrandingInfo } from '../../utils/surveyLogoHelper';
import { useConfirm } from '../../context/ConfirmContext';

interface SurveyFormBuilderProps {
  initialSurvey?: Survey | null;
  onSave: (survey: Survey, publishImmediately?: boolean) => void;
  onCancel: () => void;
  currentUser?: any;
  allDocuments?: any[];
}

const QUESTION_PALETTE_ITEMS: Array<{
  type: SurveyQuestionType;
  icon: any;
  label: string;
  category: 'choice' | 'text' | 'rating' | 'advanced';
  desc: string;
}> = [
  { type: 'single_choice', icon: CircleDot, label: 'เลือกตอบข้อเดียว (Radio)', category: 'choice', desc: 'ผู้ตอบเลือกได้เพียง 1 คำตอบ' },
  { type: 'multiple_choice', icon: CheckSquare, label: 'เลือกตอบหลายข้อ (Checkbox)', category: 'choice', desc: 'ผู้ตอบเลือกได้หลายคำตอบ' },
  { type: 'dropdown', icon: ListOrdered, label: 'เมนูดรอปดาวน์ (Dropdown)', category: 'choice', desc: 'เลือก 1 รายการจากเมนูพับ' },
  { type: 'text_short', icon: Type, label: 'ข้อความสั้น (Single Line)', category: 'text', desc: 'สำหรับชื่อ, ตำแหน่ง, เลขที่' },
  { type: 'text_long', icon: AlignLeft, label: 'ข้อความยาว (Paragraph)', category: 'text', desc: 'สำหรับข้อคิดเห็น, บันทึก' },
  { type: 'rating_stars', icon: Star, label: 'ให้คะแนนดาว (Star Rating)', category: 'rating', desc: 'ให้คะแนนระดับ 1-5 หรือ 1-10 ดาว' },
  { type: 'matrix_rating', icon: Grid3X3, label: 'ตารางประเมินเมทริกซ์ (Matrix Grid)', category: 'rating', desc: 'ประเมินหลายหัวข้อในตารางเดียว (Likert)' },
  { type: 'slider_score', icon: Sliders, label: 'สไลเดอร์คะแนน (Number Slider)', category: 'rating', desc: 'เลื่อนแถบคะแนน 0-100 หรือ NPS' },
  { type: 'date_time', icon: Calendar, label: 'วันที่และเวลา (Date/Time)', category: 'advanced', desc: 'เลือกวันที่จัดงาน/เกิดเหตุ' },
  { type: 'file_upload', icon: UploadCloud, label: 'อัปโหลดไฟล์ (File Attachment)', category: 'advanced', desc: 'แนบภาพถ่ายหรือเอกสารประกอบ' },
  { type: 'signature', icon: PenTool, label: 'ลายมือชื่อดิจิทัล (E-Signature)', category: 'advanced', desc: 'วาดลายเซ็นรับรองข้อมูล' },
  { type: 'contact_info', icon: UserCheck, label: 'ข้อมูลผู้ตอบ (Contact Info)', category: 'advanced', desc: 'รวมฟิลด์ชื่อ, โทรศัพท์, อีเมล, สังกัด' },
  { type: 'rsvp_status', icon: FileCheck, label: 'สถานะตอบรับเข้าร่วม (RSVP Choice)', category: 'advanced', desc: 'ตอบรับด้วยตนเอง / ผู้แทน / ไม่สะดวก' },
  { type: 'section_header', icon: Split, label: 'หัวข้อคั่นส่วน (Section Break)', category: 'advanced', desc: 'จัดกลุ่มคำถามเป็นตอนๆ' }
];

export const SurveyFormBuilder: React.FC<SurveyFormBuilderProps> = ({
  initialSurvey,
  onSave,
  onCancel,
  currentUser,
  allDocuments = [],
}) => {
  const { confirm } = useConfirm();
  // Survey State
  const [survey, setSurvey] = useState<Survey>(() => {
    if (initialSurvey) return initialSurvey;
    return {
      id: `survey_${Date.now()}`,
      title: 'แบบสำรวจและประเมินผลฉบับใหม่',
      description: 'กรุณากรอกข้อมูลตามความเป็นจริง เพื่อนำไปประมวลผลตามมาตรฐานราชการ',
      category: 'satisfaction',
      categoryLabel: 'ความพึงพอใจการบริการ',
      department: currentUser?.department || 'สำนักงาน ปภ. จังหวัดระยอง',
      creatorId: currentUser?.id || 'admin',
      creatorName: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || currentUser?.username || 'ผู้ดูแลระบบ',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 0,
      responseCount: 0,
      settings: {
        status: 'draft',
        themeColor: '#2563eb',
        headerLogoType: 'garuda',
        showProgressBar: true,
        showQuestionNumbers: true,
        allowAnonymous: true,
        requireLogin: false,
        limitOneResponsePerDevice: false,
        thankYouTitle: 'ขอบพระคุณสำหรับข้อมูลและการตอบแบบสำรวจ',
        thankYouMessage: 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้รับข้อมูลของท่านเรียบร้อยแล้ว',
        showSummaryToRespondents: true
      },
      questions: [
        {
          id: `q_${Date.now()}_1`,
          type: 'single_choice',
          title: '1. ประเด็นคำถามตัวอย่าง',
          description: 'คำอธิบายเพิ่มเติมสำหรับข้อคำถามนี้',
          required: true,
          options: [
            { id: 'opt_1', text: 'ตัวเลือกที่ 1' },
            { id: 'opt_2', text: 'ตัวเลือกที่ 2' },
            { id: 'opt_3', text: 'ตัวเลือกที่ 3' }
          ]
        }
      ]
    };
  });

  // UI state
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(
    survey.questions[0]?.id || null
  );
  const [activePanelTab, setActivePanelTab] = useState<'questions' | 'settings' | 'logic' | 'theme'>('questions');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [logicModalQuestion, setLogicModalQuestion] = useState<SurveyQuestion | null>(null);

  // Active question ref
  const activeQuestion = survey.questions.find(q => q.id === activeQuestionId);

  // Logic rules counter
  const totalLogicRules = survey.questions.reduce((acc, q) => acc + (q.logicRules?.length || 0), 0);

  // Save logic rules handler
  const handleSaveLogicRules = (qId: string, rules: SurveyLogicRule[]) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === qId ? { ...q, logicRules: rules } : q)
    }));
  };

  // Helper to add new question
  const handleAddQuestion = (type: SurveyQuestionType) => {
    const newId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    let newQ: SurveyQuestion = {
      id: newId,
      type,
      title: `ข้อที่ ${survey.questions.length + 1}. หัวข้อคำถามใหม่`,
      required: true
    };

    if (type === 'single_choice' || type === 'multiple_choice' || type === 'dropdown') {
      newQ.options = [
        { id: 'opt_1', text: 'ตัวเลือกที่ 1' },
        { id: 'opt_2', text: 'ตัวเลือกที่ 2' },
        { id: 'opt_3', text: 'ตัวเลือกที่ 3' }
      ];
    } else if (type === 'rsvp_status') {
      newQ.title = `ข้อที่ ${survey.questions.length + 1}. สถานะการยืนยันเข้าร่วมกิจกรรม`;
      newQ.options = [
        { id: 'status_yes', text: 'ตอบรับเข้าร่วมงานด้วยตนเอง' },
        { id: 'status_delegate', text: 'มอบหมายผู้แทนเข้าร่วมแทน' },
        { id: 'status_no', text: 'ไม่สะดวกเข้าร่วมงาน' }
      ];
    } else if (type === 'matrix_rating') {
      newQ.matrixRows = [
        { id: 'r1', text: 'ประเด็นที่ 1' },
        { id: 'r2', text: 'ประเด็นที่ 2' },
        { id: 'r3', text: 'ประเด็นที่ 3' }
      ];
      newQ.matrixCols = [
        { id: 'c1', text: 'น้อยที่สุด (1)', score: 1 },
        { id: 'c2', text: 'น้อย (2)', score: 2 },
        { id: 'c3', text: 'ปานกลาง (3)', score: 3 },
        { id: 'c4', text: 'มาก (4)', score: 4 },
        { id: 'c5', text: 'มากที่สุด (5)', score: 5 }
      ];
    } else if (type === 'rating_stars') {
      newQ.maxScore = 5;
    } else if (type === 'slider_score') {
      newQ.minScore = 0;
      newQ.maxScore = 10;
      newQ.step = 1;
    }

    setSurvey(prev => ({
      ...prev,
      questions: [...prev.questions, newQ]
    }));
    setActiveQuestionId(newId);
  };

  // Update question properties
  const handleUpdateQuestion = (qId: string, patch: Partial<SurveyQuestion>) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === qId ? { ...q, ...patch } : q)
    }));
  };

  // Delete question
  const handleDeleteQuestion = async (qId: string) => {
    if (survey.questions.length <= 1) {
      const isOk = await confirm({
        title: 'ไม่อนุญาตให้ลบคำถาม',
        message: 'แบบสำรวจต้องมีคำถามอย่างน้อย 1 ข้อเพื่อให้สามารถใช้งานแบบประเมินผลได้',
        type: 'warning',
        confirmText: 'ตกลง',
        cancelText: 'ปิด'
      });
      return;
    }

    const question = survey.questions.find(q => q.id === qId);
    const ok = await confirm({
      title: 'ยืนยันการลบข้อคำถาม',
      message: `คุณต้องการลบคำถาม "${question?.title || 'ข้อนี้'}" หรือไม่?`,
      description: 'ตัวเลือก โครงสร้างตรรกะ และเงื่อนไขการกรองทั้งหมดของคำถามข้อนี้จะสูญหาย',
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });
    if (!ok) return;

    setSurvey(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== qId)
    }));
    if (activeQuestionId === qId) {
      const remaining = survey.questions.filter(q => q.id !== qId);
      setActiveQuestionId(remaining[0]?.id || null);
    }
  };

  // Duplicate question
  const handleDuplicateQuestion = (q: SurveyQuestion) => {
    const copyId = `q_${Date.now()}_copy`;
    const copyQ: SurveyQuestion = {
      ...JSON.parse(JSON.stringify(q)),
      id: copyId,
      title: `${q.title} (สำเนา)`
    };
    const idx = survey.questions.findIndex(item => item.id === q.id);
    const newQuestions = [...survey.questions];
    newQuestions.splice(idx + 1, 0, copyQ);
    setSurvey(prev => ({ ...prev, questions: newQuestions }));
    setActiveQuestionId(copyId);
  };

  // Reorder questions
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= survey.questions.length) return;
    const newQuestions = [...survey.questions];
    const [moved] = newQuestions.splice(index, 1);
    newQuestions.splice(newIndex, 0, moved);
    setSurvey(prev => ({ ...prev, questions: newQuestions }));
  };

  // Option handlers
  const handleAddOption = (qId: string) => {
    const q = survey.questions.find(item => item.id === qId);
    if (!q) return;
    const nextNum = (q.options?.length || 0) + 1;
    const newOpt: SurveyOption = {
      id: `opt_${Date.now()}_${nextNum}`,
      text: `ตัวเลือกที่ ${nextNum}`
    };
    handleUpdateQuestion(qId, {
      options: [...(q.options || []), newOpt]
    });
  };

  const handleRemoveOption = (qId: string, optId: string) => {
    const q = survey.questions.find(item => item.id === qId);
    if (!q || !q.options) return;
    handleUpdateQuestion(qId, {
      options: q.options.filter(o => o.id !== optId)
    });
  };

  const handleUpdateOption = (qId: string, optId: string, text: string) => {
    const q = survey.questions.find(item => item.id === qId);
    if (!q || !q.options) return;
    handleUpdateQuestion(qId, {
      options: q.options.map(o => o.id === optId ? { ...o, text } : o)
    });
  };

  // Matrix Row / Col Handlers
  const handleAddMatrixRow = (qId: string) => {
    const q = survey.questions.find(item => item.id === qId);
    if (!q) return;
    const nextNum = (q.matrixRows?.length || 0) + 1;
    const newRow: SurveyMatrixRow = {
      id: `r_${Date.now()}_${nextNum}`,
      text: `ประเด็นข้อที่ ${nextNum}`
    };
    handleUpdateQuestion(qId, {
      matrixRows: [...(q.matrixRows || []), newRow]
    });
  };

  const handleRemoveMatrixRow = (qId: string, rowId: string) => {
    const q = survey.questions.find(item => item.id === qId);
    if (!q || !q.matrixRows) return;
    handleUpdateQuestion(qId, {
      matrixRows: q.matrixRows.filter(r => r.id !== rowId)
    });
  };

  const handleUpdateMatrixRow = (qId: string, rowId: string, text: string) => {
    const q = survey.questions.find(item => item.id === qId);
    if (!q || !q.matrixRows) return;
    handleUpdateQuestion(qId, {
      matrixRows: q.matrixRows.map(r => r.id === rowId ? { ...r, text } : r)
    });
  };

  // Save actions
  const handleSaveDraft = async () => {
    const ok = await confirm({
      title: 'ยืนยันการบันทึกแบบร่าง',
      message: `คุณต้องการบันทึกแบบร่างสำหรับแบบสำรวจ "${survey.title || 'ไม่มีชื่อหัวข้อ'}" ใช่หรือไม่?`,
      type: 'save',
      confirmText: 'บันทึกแบบร่าง',
      cancelText: 'ยกเลิก'
    });
    if (!ok) return;
    onSave({ ...survey, settings: { ...survey.settings, status: 'draft' } }, false);
  };

  const handlePublish = async () => {
    const ok = await confirm({
      title: 'ยืนยันการบันทึกและเผยแพร่',
      message: `คุณต้องการบันทึกและเปิดเผยแพร่แบบสำรวจ "${survey.title || 'ไม่มีชื่อหัวข้อ'}" แก่สาธารณชนทันทีใช่หรือไม่?`,
      description: 'หลังจากเผยแพร่แล้ว ประชาชนและบุคคลภายนอกจะสามารถเข้ามากรอกข้อมูลตอบรับนี้ได้ทันทีผ่านลิงก์และรหัส QR',
      type: 'send',
      confirmText: 'บันทึก & เผยแพร่',
      cancelText: 'ยกเลิก'
    });
    if (!ok) return;
    onSave({ ...survey, settings: { ...survey.settings, status: 'published' } }, true);
  };

  const handleCancelBuilder = async () => {
    const ok = await confirm({
      title: 'ยืนยันการออกจากระบบสร้างแบบสำรวจ',
      message: 'การแก้ไขทั้งหมดที่ยังไม่ได้ถูกบันทึกจะสูญหายอย่างถาวร คุณต้องการออกจากโปรแกรมสร้างและปรับแต่งนี้ใช่หรือไม่?',
      type: 'warning',
      confirmText: 'ออกจากโปรแกรมสร้าง',
      cancelText: 'กลับไปแก้ไขต่อ'
    });
    if (ok) {
      onCancel();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] min-h-[650px] bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-lighter)] overflow-hidden shadow-xl animate-fade-in text-left">
      {/* Top Action Header Bar */}
      <div className="p-4 bg-[var(--bg-surface)] border-b border-[var(--border-lighter)] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancelBuilder}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] transition-colors cursor-pointer"
            title="ย้อนกลับไปหน้ารายการแบบสำรวจ"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={survey.title}
                onChange={(e) => setSurvey(prev => ({ ...prev, title: e.target.value }))}
                className="font-bold text-sm sm:text-base text-[var(--text-primary)] bg-transparent hover:bg-[var(--bg-canvas)] focus:bg-[var(--bg-canvas)] px-2 py-1 rounded-lg border border-transparent hover:border-[var(--border-lighter)] focus:border-blue-500 outline-none w-64 sm:w-96 transition-all"
                placeholder="ชื่อแบบสำรวจ..."
              />
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                survey.settings.status === 'published' 
                  ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                  : 'bg-slate-500/15 text-slate-600 border border-slate-500/30'
              }`}>
                {survey.settings.status === 'published' ? 'เผยแพร่แล้ว' : 'ร่างแบบสำรวจ'}
              </span>
            </div>
          </div>
        </div>

        {/* Center Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)]">
          <button
            onClick={() => setActivePanelTab('questions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePanelTab === 'questions'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>คำถาม ({survey.questions.length})</span>
          </button>
          <button
            onClick={() => setActivePanelTab('logic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePanelTab === 'logic'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
            <span>แผนผังตรรกะ ({totalLogicRules})</span>
          </button>
          <button
            onClick={() => setActivePanelTab('theme')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePanelTab === 'theme'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span>ธีม & แบบตอบรับ</span>
          </button>
          <button
            onClick={() => setActivePanelTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePanelTab === 'settings'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>ตั้งค่า & ตราหน่วยงาน</span>
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold transition-all cursor-pointer"
            title="ดูตัวอย่างแบบสำรวจก่อนใช้งานจริง"
          >
            <Eye className="w-4 h-4" />
            <span>ดูตัวอย่าง</span>
          </button>

          <button
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--bg-canvas)] hover:bg-[var(--border-lighter)] border border-[var(--border-lighter)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>บันทึกแบบร่าง</span>
          </button>

          <button
            onClick={handlePublish}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>บันทึก & เผยแพร่ทันที</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body: 3-Column Layout */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Palette: Question Types Library */}
        <div className="w-full lg:w-72 bg-[var(--bg-surface)] border-r border-[var(--border-lighter)] p-4 flex flex-col overflow-y-auto custom-scrollbar shrink-0">
          <div className="space-y-1 mb-3">
            <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-blue-500" />
              <span>คลังประเภทคำถาม (Question Palette)</span>
            </h4>
            <p className="text-[10px] text-[var(--text-muted)]">
              คลิกเพื่อเพิ่มคำถามลงในแบบสำรวจ
            </p>
          </div>

          <div className="space-y-4">
            {/* Category: Choice */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                คำถามแบบเลือกตอบ (Choice)
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {QUESTION_PALETTE_ITEMS.filter(item => item.category === 'choice').map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      onClick={() => handleAddQuestion(item.type)}
                      className="p-2.5 rounded-xl bg-[var(--bg-canvas)] hover:bg-blue-500/10 border border-[var(--border-lighter)] hover:border-blue-500/30 text-left transition-all flex items-center gap-2.5 group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-blue-600 block truncate">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] block truncate">
                          {item.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category: Rating & Scales */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                ให้คะแนน & สเกลวัด (Rating & Matrix)
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {QUESTION_PALETTE_ITEMS.filter(item => item.category === 'rating').map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      onClick={() => handleAddQuestion(item.type)}
                      className="p-2.5 rounded-xl bg-[var(--bg-canvas)] hover:bg-amber-500/10 border border-[var(--border-lighter)] hover:border-amber-500/30 text-left transition-all flex items-center gap-2.5 group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-amber-600 block truncate">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] block truncate">
                          {item.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category: Text & Advanced */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                ข้อความ & ขั้นสูง (Text & Advanced)
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {QUESTION_PALETTE_ITEMS.filter(item => item.category === 'text' || item.category === 'advanced').map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      onClick={() => handleAddQuestion(item.type)}
                      className="p-2.5 rounded-xl bg-[var(--bg-canvas)] hover:bg-emerald-500/10 border border-[var(--border-lighter)] hover:border-emerald-500/30 text-left transition-all flex items-center gap-2.5 group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-emerald-600 block truncate">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] block truncate">
                          {item.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Center Canvas: Interactive Survey Editor */}
        <div className="flex-1 bg-[var(--bg-canvas)] p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4">
          {activePanelTab === 'questions' && (
            <div className="max-w-3xl mx-auto space-y-4 pb-20">
              {/* Survey Header Banner Card */}
              <div 
                className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-sm space-y-3 relative overflow-hidden"
                style={{ borderTopWidth: '6px', borderTopColor: survey.settings.themeColor || '#2563eb' }}
              >
                <div className="flex items-center gap-3">
                  {getResolvedSurveyLogoUrl(survey.settings.headerLogoType, survey.settings.customLogoUrl) && (
                    <img 
                      src={getResolvedSurveyLogoUrl(survey.settings.headerLogoType, survey.settings.customLogoUrl)!} 
                      alt="Logo" 
                      className="w-10 h-10 object-contain shrink-0" 
                    />
                  )}
                  <div className="flex-1">
                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                      {survey.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'}
                    </span>
                    <input
                      type="text"
                      value={survey.title}
                      onChange={(e) => setSurvey(prev => ({ ...prev, title: e.target.value }))}
                      className="text-lg sm:text-xl font-bold text-[var(--text-primary)] bg-transparent w-full outline-none focus:border-b-2 focus:border-blue-500 pb-0.5"
                      placeholder="ระบุชื่อแบบสำรวจ..."
                    />
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={survey.description}
                  onChange={(e) => setSurvey(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full text-xs sm:text-sm text-[var(--text-secondary)] bg-transparent outline-none focus:bg-[var(--bg-canvas)] p-2 rounded-xl border border-transparent focus:border-[var(--border-lighter)] resize-none"
                  placeholder="พิมพ์คำชี้แจง วัตถุประสงค์ หรือคำแนะนำในการตอบแบบสำรวจ..."
                />
              </div>

              {/* Questions List */}
              {survey.questions.map((q, index) => {
                const isActive = activeQuestionId === q.id;

                return (
                  <div
                    key={q.id}
                    onClick={() => setActiveQuestionId(q.id)}
                    className={`p-5 rounded-3xl transition-all duration-200 border cursor-pointer ${
                      isActive
                        ? 'bg-[var(--bg-surface)] border-blue-500 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border-[var(--border-lighter)] shadow-xs'
                    }`}
                  >
                    {/* Question Toolbar */}
                    <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--border-lighter)]">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 font-bold text-xs flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-[var(--text-secondary)]">
                          {QUESTION_PALETTE_ITEMS.find(i => i.type === q.type)?.label || q.type}
                        </span>
                        {q.required && (
                          <span className="text-xs font-bold text-rose-500" title="จำเป็นต้องตอบ">*</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setLogicModalQuestion(q)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            q.logicRules && q.logicRules.length > 0
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                              : 'text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-500/10'
                          }`}
                          title="ตั้งค่าตรรกะเงื่อนไข (Conditional Logic)"
                        >
                          <GitBranch className="w-3.5 h-3.5" />
                          <span>{q.logicRules && q.logicRules.length > 0 ? `ตรรกะ (${q.logicRules.length})` : 'ตรรกะ'}</span>
                        </button>
                        <button
                          onClick={() => handleMoveQuestion(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
                          title="เลื่อนขึ้น"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveQuestion(index, 'down')}
                          disabled={index === survey.questions.length - 1}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
                          title="เลื่อนลง"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicateQuestion(q)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-blue-500"
                          title="คัดลอกคำถามข้อนี้"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500"
                          title="ลบคำถามข้อนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Title & Desc Editor */}
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={q.title}
                        onChange={(e) => handleUpdateQuestion(q.id, { title: e.target.value })}
                        className="w-full text-sm font-bold text-[var(--text-primary)] bg-transparent outline-none focus:bg-[var(--bg-canvas)] p-2 rounded-xl border border-transparent focus:border-blue-500"
                        placeholder="พิมพ์หัวข้อคำถาม..."
                      />

                      <input
                        type="text"
                        value={q.description || ''}
                        onChange={(e) => handleUpdateQuestion(q.id, { description: e.target.value })}
                        className="w-full text-xs text-[var(--text-secondary)] bg-transparent outline-none focus:bg-[var(--bg-canvas)] px-2 py-1 rounded-lg border border-transparent focus:border-[var(--border-lighter)]"
                        placeholder="คำอธิบายเพิ่มเติม (ถ้ามี)..."
                      />
                    </div>

                    {/* Dynamic Question Body Preview / Editor */}
                    <div className="pt-3">
                      {/* Choice Options List */}
                      {(q.type === 'single_choice' || q.type === 'multiple_choice' || q.type === 'dropdown') && (
                        <div className="space-y-2 pl-2">
                          {q.options?.map((opt, optIdx) => (
                            <div key={opt.id} className="flex items-center gap-2">
                              {q.type === 'single_choice' ? (
                                <CircleDot className="w-4 h-4 text-slate-400 shrink-0" />
                              ) : q.type === 'multiple_choice' ? (
                                <CheckSquare className="w-4 h-4 text-slate-400 shrink-0" />
                              ) : (
                                <span className="text-xs font-mono text-slate-400">{optIdx + 1}.</span>
                              )}
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => handleUpdateOption(q.id, opt.id, e.target.value)}
                                className="flex-1 text-xs bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl px-3 py-1.5 text-[var(--text-primary)] outline-none focus:border-blue-500"
                              />
                              <button
                                onClick={() => handleRemoveOption(q.id, opt.id)}
                                className="p-1 text-slate-400 hover:text-red-500 rounded-lg"
                                title="ลบตัวเลือก"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}

                          <button
                            onClick={() => handleAddOption(q.id)}
                            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 pt-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>เพิ่มตัวเลือก</span>
                          </button>
                        </div>
                      )}

                      {/* Matrix Grid Editor */}
                      {q.type === 'matrix_rating' && (
                        <div className="space-y-3 overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="border-b border-[var(--border-lighter)]">
                                <th className="p-2 font-bold text-[var(--text-secondary)]">ประเด็นการประเมิน</th>
                                {q.matrixCols?.map(col => (
                                  <th key={col.id} className="p-2 font-bold text-center text-[var(--text-muted)] text-[10px]">
                                    {col.text}
                                  </th>
                                ))}
                                <th className="w-8"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {q.matrixRows?.map((row, rIdx) => (
                                <tr key={row.id} className="border-b border-[var(--border-lighter)]/50">
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={row.text}
                                      onChange={(e) => handleUpdateMatrixRow(q.id, row.id, e.target.value)}
                                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)]"
                                    />
                                  </td>
                                  {q.matrixCols?.map(col => (
                                    <td key={col.id} className="p-2 text-center">
                                      <input type="radio" disabled className="text-blue-600" />
                                    </td>
                                  ))}
                                  <td className="p-1">
                                    <button
                                      onClick={() => handleRemoveMatrixRow(q.id, row.id)}
                                      className="text-slate-400 hover:text-red-500 p-1"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <button
                            onClick={() => handleAddMatrixRow(q.id)}
                            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 pt-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>เพิ่มประเด็นแถวประเมิน</span>
                          </button>
                        </div>
                      )}

                      {/* Star Rating Preview */}
                      {q.type === 'rating_stars' && (
                        <div className="flex items-center gap-2 py-2">
                          {Array.from({ length: q.maxScore || 5 }).map((_, i) => (
                            <Star key={i} className="w-6 h-6 text-amber-400 fill-amber-400/20" />
                          ))}
                          <span className="text-xs text-[var(--text-muted)] ml-2">
                            (ระดับ 1 ถึง {q.maxScore || 5} ดาว)
                          </span>
                        </div>
                      )}

                      {/* Text Input Preview */}
                      {(q.type === 'text_short' || q.type === 'text_long') && (
                        <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] text-xs text-slate-400 italic">
                          {q.type === 'text_short' ? 'ช่องกรอกข้อความสั้น 1 บรรทัด...' : 'ช่องกรอกข้อความขนาดยาว/บรรยาย...'}
                        </div>
                      )}

                      {/* Signature Preview */}
                      {q.type === 'signature' && (
                        <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                          <PenTool className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                          <span>พื้นที่วาดลายมือชื่อดิจิทัล (Digital Signature Pad)</span>
                        </div>
                      )}

                      {/* Logic Rules Summary Badge on Card */}
                      {q.logicRules && q.logicRules.length > 0 && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogicModalQuestion(q);
                          }}
                          className="mt-3 pt-2.5 border-t border-[var(--border-lighter)] flex items-center justify-between text-xs bg-blue-500/5 hover:bg-blue-500/10 p-2.5 rounded-2xl border border-blue-500/20 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <GitBranch className="w-4 h-4 shrink-0" />
                            <span className="font-bold text-[11px]">
                              มีตรรกะเงื่อนไข ({q.logicRules.length} กฎ):
                            </span>
                            <span className="text-[11px] text-[var(--text-secondary)] truncate max-w-md">
                              {getReadableRuleDescription(q.logicRules[0], survey.questions)}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-600">
                            แก้ไขตรรกะ
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Theme & RSVP Customizer Tab */}
          {activePanelTab === 'theme' && (
            <div className="max-w-4xl mx-auto">
              <SurveyThemeCustomizer
                settings={survey.settings}
                onChangeSettings={(newSettings) => setSurvey(prev => ({ ...prev, settings: newSettings }))}
                department={survey.department}
                onChangeDepartment={(dept) => setSurvey(prev => ({ ...prev, department: dept }))}
              />
            </div>
          )}

          {/* Settings Tab */}
          {activePanelTab === 'settings' && (
            <div className="max-w-2xl mx-auto bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="border-b border-[var(--border-lighter)] pb-3">
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-500" />
                  <span>การตั้งค่าธีมและเอกลักษณ์องค์กร (Theme & Branding)</span>
                </h3>
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)] block">
                  โทนสีหลักของแบบสำรวจ (Theme Color)
                </label>
                <div className="flex items-center gap-3">
                  {['#2563eb', '#059669', '#ea580c', '#dc2626', '#7c3aed', '#0f172a'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setSurvey(prev => ({ ...prev, settings: { ...prev.settings, themeColor: c } }))}
                      className={`w-8 h-8 rounded-full transition-transform cursor-pointer ${
                        survey.settings.themeColor === c ? 'scale-125 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Logo Select */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-primary)] block">
                    ตราสัญลักษณ์หัวแบบสำรวจ (Official Crest & System Branding)
                  </label>
                  <button
                    type="button"
                    onClick={() => setActivePanelTab('theme')}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    ปรับแต่งธีม & อัปโหลดโลโก้ →
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => setSurvey(prev => ({ ...prev, settings: { ...prev.settings, headerLogoType: 'garuda' } }))}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      survey.settings.headerLogoType === 'garuda'
                        ? 'border-blue-500 bg-blue-500/10 font-bold'
                        : 'border-[var(--border-lighter)] bg-[var(--bg-canvas)]'
                    }`}
                  >
                    <img src={getSystemBrandingInfo().garudaLogoUrl} alt="Garuda" className="w-7 h-7 mx-auto mb-1 object-contain" />
                    <span className="text-[11px] block truncate">ตราครุฑ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSurvey(prev => ({ ...prev, settings: { ...prev.settings, headerLogoType: 'ddpm' } }))}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      survey.settings.headerLogoType === 'ddpm'
                        ? 'border-blue-500 bg-blue-500/10 font-bold'
                        : 'border-[var(--border-lighter)] bg-[var(--bg-canvas)]'
                    }`}
                  >
                    <img src={getSystemBrandingInfo().ddpmLogoUrl} alt="DDPM" className="w-7 h-7 mx-auto mb-1 object-contain" />
                    <span className="text-[11px] block truncate">ตรา ปภ.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSurvey(prev => ({ ...prev, settings: { ...prev.settings, headerLogoType: 'rayong' } }))}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      survey.settings.headerLogoType === 'rayong'
                        ? 'border-blue-500 bg-blue-500/10 font-bold'
                        : 'border-[var(--border-lighter)] bg-[var(--bg-canvas)]'
                    }`}
                  >
                    <img src={getSystemBrandingInfo().rayongLogoUrl} alt="Rayong" className="w-7 h-7 mx-auto mb-1 object-contain" />
                    <span className="text-[11px] block truncate">ตราจังหวัด</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSurvey(prev => ({ ...prev, settings: { ...prev.settings, headerLogoType: 'custom' } }))}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      survey.settings.headerLogoType === 'custom'
                        ? 'border-blue-500 bg-blue-500/10 font-bold'
                        : 'border-[var(--border-lighter)] bg-[var(--bg-canvas)]'
                    }`}
                  >
                    <img src={survey.settings.customLogoUrl || getSystemBrandingInfo().systemOrgLogoUrl} alt="Custom Logo" className="w-7 h-7 mx-auto mb-1 object-contain" />
                    <span className="text-[11px] block truncate">โลโก้อัปโหลด</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSurvey(prev => ({ ...prev, settings: { ...prev.settings, headerLogoType: 'none' } }))}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      survey.settings.headerLogoType === 'none'
                        ? 'border-blue-500 bg-blue-500/10 font-bold'
                        : 'border-[var(--border-lighter)] bg-[var(--bg-canvas)]'
                    }`}
                  >
                    <div className="w-7 h-7 mx-auto mb-1 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">✕</div>
                    <span className="text-[11px] block truncate">ไม่แสดงตรา</span>
                  </button>
                </div>

                {/* Custom Logo Upload / Input inside Settings tab */}
                {survey.settings.headerLogoType === 'custom' && (
                  <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2 mt-2">
                    <label className="text-[11px] font-bold text-[var(--text-primary)] block">
                      รูปภาพตราสัญลักษณ์ / โลโก้เฉพาะฟอร์มนี้:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <label className="w-full sm:w-auto px-3 py-1.5 rounded-lg border border-dashed border-blue-400 bg-[var(--bg-surface)] hover:bg-blue-500/10 cursor-pointer font-bold text-blue-600 text-xs flex items-center justify-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>อัปโหลดรูปภาพ</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              setSurvey(prev => ({
                                ...prev,
                                settings: { ...prev.settings, headerLogoType: 'custom', customLogoUrl: dataUrl }
                              }));
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      <div className="flex-1 w-full flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-lg px-2.5 py-1">
                        <Link2 className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                        <input
                          type="text"
                          value={survey.settings.customLogoUrl || ''}
                          onChange={(e) => setSurvey(prev => ({
                            ...prev,
                            settings: { ...prev.settings, headerLogoType: 'custom', customLogoUrl: e.target.value }
                          }))}
                          placeholder="หรือวาง URL รูปภาพ (https://...)"
                          className="w-full bg-transparent text-xs outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Link with EDMS Document */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-lighter)]">
                <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>เชื่อมโยงกับหนังสือราชการ EDMS (Linked Document)</span>
                </label>
                <select
                  value={survey.settings.linkedDocId || ''}
                  onChange={(e) => {
                    const docId = e.target.value;
                    const doc = allDocuments.find(d => d.id === docId);
                    setSurvey(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        linkedDocId: docId,
                        linkedDocNumber: doc ? (doc.docNumber || doc.title) : undefined
                      }
                    }));
                  }}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
                >
                  <option value="">-- ไม่เชื่อมโยงหนังสือราชการ --</option>
                  {allDocuments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.docNumber ? `[${d.docNumber}] ` : ''}{d.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Security & Access Toggles */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-lighter)]">
                <label className="text-xs font-bold text-[var(--text-primary)] block">
                  ความปลอดภัยและการกำหนดสิทธิ์ผู้ตอบ (Access Control & Privacy)
                </label>

                <div className="space-y-2.5">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] cursor-pointer text-xs text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={survey.settings.allowAnonymous ?? true}
                      onChange={(e) => setSurvey(prev => ({ ...prev, settings: { ...prev.settings, allowAnonymous: e.target.checked } }))}
                      className="mt-0.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-[var(--text-primary)] block">อนุญาตให้ตอบแบบนิรนาม / ไม่ระบุตัวตน (Anonymous Responses)</span>
                      <span className="text-[11px] text-[var(--text-muted)]">ประชาชนหรือบุคคลภายนอกสามารถตอบได้โดยตรง ไม่ต้องระบุชื่อหรือเบอร์โทรศัพท์</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-[var(--border-lighter)] bg-[var(--bg-canvas)] cursor-pointer text-xs text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={survey.settings.requireLogin ?? false}
                      onChange={(e) => setSurvey(prev => ({ ...prev, settings: { ...prev.settings, requireLogin: e.target.checked } }))}
                      className="mt-0.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-[var(--text-primary)] block">บังคับยืนยันตัวตน/รหัสผ่านก่อนตอบ (Require Login / Password)</span>
                      <span className="text-[11px] text-[var(--text-muted)]">ใช้สำหรับแบบประเมินเฉพาะเจ้าหน้าที่ภายใน (หากเปิดสาธารณะให้ปิดตัวเลือกนี้)</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={survey.settings.showProgressBar}
                      onChange={(e) => setSurvey(prev => ({ ...prev, settings: { ...prev.settings, showProgressBar: e.target.checked } }))}
                      className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span>แสดงแถบความคืบหน้าการตอบ (Progress Bar)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={survey.settings.limitOneResponsePerDevice}
                      onChange={(e) => setSurvey(prev => ({ ...prev, settings: { ...prev.settings, limitOneResponsePerDevice: e.target.checked } }))}
                      className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span>จำกัด 1 อุปกรณ์ตอบได้ 1 ครั้ง (ป้องกันการตอบซ้ำซ้อน)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={survey.settings.showSummaryToRespondents}
                      onChange={(e) => setSurvey(prev => ({ ...prev, settings: { ...prev.settings, showSummaryToRespondents: e.target.checked } }))}
                      className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span>อนุญาตให้ผู้ตอบดูผลสรุปคะแนนภาพรวมหลังจากส่งแบบสำรวจ</span>
                  </label>
                </div>
              </div>

              {/* Thank You Screen Customizer */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-lighter)]">
                <label className="text-xs font-bold text-[var(--text-primary)] block">
                  ข้อความขอบคุณหลังส่งแบบสำรวจ (Thank You Page)
                </label>
                <input
                  type="text"
                  value={survey.settings.thankYouTitle}
                  onChange={(e) => setSurvey(prev => ({ ...prev, settings: { ...prev.settings, thankYouTitle: e.target.value } }))}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-primary)] outline-none"
                  placeholder="หัวข้อขอบคุณ..."
                />
                <textarea
                  rows={2}
                  value={survey.settings.thankYouMessage}
                  onChange={(e) => setSurvey(prev => ({ ...prev, settings: { ...prev.settings, thankYouMessage: e.target.value } }))}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl p-3 text-xs text-[var(--text-secondary)] outline-none resize-none"
                  placeholder="ข้อความชี้แจงเพิ่มเติม..."
                />
              </div>
            </div>
          )}

          {/* Logic Flow Map Tab */}
          {activePanelTab === 'logic' && (
            <div className="h-full flex flex-col">
              <SurveyLogicFlowMap
                questions={survey.questions}
                onOpenLogicModal={(q) => setLogicModalQuestion(q)}
                onSelectQuestion={(id) => {
                  setActiveQuestionId(id);
                  setActivePanelTab('questions');
                }}
              />
            </div>
          )}
        </div>

        {/* Right Inspector: Question Properties */}
        {activeQuestion && activePanelTab === 'questions' && (
          <div className="w-full lg:w-72 bg-[var(--bg-surface)] border-l border-[var(--border-lighter)] p-4 flex flex-col overflow-y-auto custom-scrollbar shrink-0">
            <div className="border-b border-[var(--border-lighter)] pb-2 mb-3">
              <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-blue-500" />
                <span>คุณสมบัติคำถามข้อนี้</span>
              </h4>
            </div>

            <div className="space-y-4 text-xs">
              {/* Conditional Logic Inspector Box */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 border border-blue-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-blue-500" />
                    <span>ตรรกะเงื่อนไข (Logic)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 text-[10px] font-bold">
                    {activeQuestion.logicRules?.length || 0} กฎ
                  </span>
                </div>

                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {activeQuestion.logicRules && activeQuestion.logicRules.length > 0
                    ? `มีการกำหนด ${activeQuestion.logicRules.length} เงื่อนไขตรรกะสำหรับการแสดง/ข้ามข้อ`
                    : 'กำหนดเงื่อนไขแสดง/ซ่อน หรือกระโดดข้ามข้อตามคำตอบของผู้ใช้งาน'}
                </p>

                <button
                  type="button"
                  onClick={() => setLogicModalQuestion(activeQuestion)}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>{activeQuestion.logicRules && activeQuestion.logicRules.length > 0 ? 'จัดการกฎตรรกะข้อนี้' : '+ เพิ่มตรรกะเงื่อนไข'}</span>
                </button>
              </div>

              {/* Required Toggle */}
              <div className="p-3 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] flex items-center justify-between">
                <div>
                  <span className="font-bold text-[var(--text-primary)] block">จำเป็นต้องตอบ</span>
                  <span className="text-[10px] text-[var(--text-muted)] block">บังคับกรอกก่อนส่ง</span>
                </div>
                <input
                  type="checkbox"
                  checked={activeQuestion.required}
                  onChange={(e) => handleUpdateQuestion(activeQuestion.id, { required: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Allow other option */}
              {(activeQuestion.type === 'single_choice' || activeQuestion.type === 'multiple_choice') && (
                <div className="p-3 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block">ตัวเลือก "อื่นๆ"</span>
                    <span className="text-[10px] text-[var(--text-muted)] block">ให้ผู้ตอบพิมพ์ระบุเอง</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeQuestion.allowOther || false}
                    onChange={(e) => handleUpdateQuestion(activeQuestion.id, { allowOther: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </div>
              )}

              {/* Star Rating scale */}
              {activeQuestion.type === 'rating_stars' && (
                <div className="space-y-1.5">
                  <label className="font-bold text-[var(--text-primary)] block">ระดับคะแนนดาวสูงสุด</label>
                  <select
                    value={activeQuestion.maxScore || 5}
                    onChange={(e) => handleUpdateQuestion(activeQuestion.id, { maxScore: Number(e.target.value) })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
                  >
                    <option value={5}>5 ดาว (มาตรฐาน)</option>
                    <option value={10}>10 ดาว (ละเอียด)</option>
                  </select>
                </div>
              )}

              {/* Slider scale */}
              {activeQuestion.type === 'slider_score' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[var(--text-muted)] block">ต่ำสุด</label>
                      <input
                        type="number"
                        value={activeQuestion.minScore || 0}
                        onChange={(e) => handleUpdateQuestion(activeQuestion.id, { minScore: Number(e.target.value) })}
                        className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-lg p-1.5 text-xs text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[var(--text-muted)] block">สูงสุด</label>
                      <input
                        type="number"
                        value={activeQuestion.maxScore || 10}
                        onChange={(e) => handleUpdateQuestion(activeQuestion.id, { maxScore: Number(e.target.value) })}
                        className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-lg p-1.5 text-xs text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Conditional Logic Modal */}
      {logicModalQuestion && (
        <SurveyLogicModal
          question={logicModalQuestion}
          allQuestions={survey.questions}
          onClose={() => setLogicModalQuestion(null)}
          onSaveRules={(qId, rules) => {
            handleSaveLogicRules(qId, rules);
            setLogicModalQuestion(null);
          }}
        />
      )}

      {/* Respondent Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[92vh] bg-[var(--bg-canvas)] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-[var(--border-lighter)]">
            <div className="p-4 bg-[var(--bg-surface)] border-b border-[var(--border-lighter)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">
                    ตัวอย่างแบบสำรวจสำหรับผู้ตอบ (Respondent Preview)
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    ทดสอบมุมมองและตรรกะการตอบแบบสำรวจจริง
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-2 text-slate-400 hover:text-[var(--text-primary)] rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <SurveyRespondentPortal
                survey={survey}
                onClose={() => setShowPreviewModal(false)}
                isReadonlyPreview={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
