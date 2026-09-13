import React, { useState, useEffect, useRef } from 'react';
import { DocumentItem, DocType, DocPriority, DocCategory, Folder as FolderType, User, formatThaiDate, formatThaiDateString, WorkflowTemplate, WorkflowInstance } from '../types';
import { 
  X, Save, Paperclip, Upload, Trash2, FileText, Loader2, Folder, CheckCircle2, 
  Calendar, Lock, Sparkles, Bookmark, Search, Filter, Check, Hash, Building2, 
  UserCheck, Tag, AlignLeft, Info, Layers, Inbox, Send, ShieldAlert, AlertCircle, FileCode,
  Workflow, Clock, Play, ArrowRight
} from 'lucide-react';
import AiCrossReferencePanel, { DetectionResult, CrossReferenceItem } from './ai-cross-reference-panel';
import ReservedNumberPicker from './ReservedNumberPicker';
import { DEFAULT_FILE_CODES, parseFileCodeFromDoc, parseDocNumberStructure, FileCodeItem } from '../lib/fileCodeUtils';
import { useConfirm } from '../context/ConfirmContext';

interface Props {
  initialData?: DocumentItem;
  defaultType?: DocType;
  documents: DocumentItem[];
  currentYear?: number;
  user?: any;
  onClose: () => void;
  onSave: (doc: DocumentItem) => void;
}

export default function DocumentFormModal({ initialData, defaultType, documents, currentYear, user, onClose, onSave }: Props) {
  const { confirm } = useConfirm();
  const [numberingRules, setNumberingRules] = useState<any[]>([]);
  const [reservedNumbers, setReservedNumbers] = useState<any[]>([]);
  const [fileCodes, setFileCodes] = useState<FileCodeItem[]>(DEFAULT_FILE_CODES);
  const [matchedRuleInfo, setMatchedRuleInfo] = useState<{
    ruleName?: string;
    prefix?: string;
    nextSeq?: string;
    isActiveRule?: boolean;
  } | null>(null);
  const [showReservedModal, setShowReservedModal] = useState<boolean>(false);
  const [selectedReservedId, setSelectedReservedId] = useState<number | null>(null);

  const [isAiAutocompleting, setIsAiAutocompleting] = useState<boolean>(false);
  const [aiAutocompError, setAiAutocompError] = useState<string | null>(null);
  const [aiAutocompSuccess, setAiAutocompSuccess] = useState<{
    summary?: string;
    priority?: string;
    typeName?: string;
    dept?: string;
    to?: string;
    categoryName?: string;
  } | null>(null);
  const [highlightTitleField, setHighlightTitleField] = useState<boolean>(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [reservedFilterType, setReservedFilterType] = useState<string>('ALL');
  const [reservedFilterDate, setReservedFilterDate] = useState<string>('');
  const [reservedFilterStatus, setReservedFilterStatus] = useState<string>('available');
  const [reservedSearchTerm, setReservedSearchTerm] = useState<string>('');

  // Helper to determine exact docType for filtering reserved numbers
  const getCurrentSpecificDocType = (docType?: DocType, category?: string): string => {
    const t = docType || formData.type;
    const cat = category || formData.category;
    if (t === 'admin') {
      if (cat === 'order') return 'คำสั่ง';
      if (cat === 'announcement') return 'ประกาศ';
      if (cat === 'certificate' || cat === 'cert') return 'หนังสือรับรอง';
      return 'คำสั่ง';
    }
    if (t === 'outbox') return 'หนังสือส่ง';
    if (t === 'internal') return 'หนังสือภายใน';
    if (t === 'inbox') return 'หนังสือรับ';
    return 'หนังสือส่ง';
  };

  const getCurrentDocTypeDisplayLabel = (docType?: DocType, category?: string) => {
    const t = docType || formData.type;
    const cat = category || formData.category;
    if (t === 'admin') {
      if (cat === 'order') return 'คำสั่ง';
      if (cat === 'announcement') return 'ประกาศ';
      if (cat === 'certificate' || cat === 'cert') return 'หนังสือรับรอง';
      return 'งานธุรการ (คำสั่ง)';
    }
    if (t === 'outbox') return 'หนังสือส่ง';
    if (t === 'internal') return 'หนังสือภายใน';
    if (t === 'inbox') return 'หนังสือรับ';
    return 'หนังสือส่ง';
  };

  const handleOpenReservedModal = () => {
    // ลงทะเบียนและบันทึกเอกสาร ฝ่าย / กลุ่ม ต้องไม่สามารถใช้งาน เลือกจากเลขจอง ได้
    if ((formData.isCentral ?? 1) === 0 || (user?.role !== 'admin' && user?.role !== 'moderator')) {
      return;
    }
    const specificType = getCurrentSpecificDocType();
    setReservedFilterType(specificType);
    setReservedFilterDate('');
    setReservedSearchTerm('');
    setReservedFilterStatus('available');
    fetchNumberingAndReserved();
    setShowReservedModal(true);
  };

  const fetchNumberingAndReserved = async () => {
    try {
      const [rulesRes, reservedRes, fileCodeRes] = await Promise.all([
        fetch('/api/numbering-rules'),
        fetch('/api/reserved-numbers'),
        fetch('/api/file-codes')
      ]);
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setNumberingRules(rulesData);
      }
      if (reservedRes.ok) {
        const reservedData = await reservedRes.json();
        setReservedNumbers(reservedData);
      }
      if (fileCodeRes.ok) {
        const fcData = await fileCodeRes.json();
        if (Array.isArray(fcData) && fcData.length > 0) {
          setFileCodes(fcData);
        }
      }
    } catch (err) {
      console.error('Error fetching numbering rules / reserved numbers / file codes:', err);
    }
  };

  const getInitialYear = () => {
    if (currentYear) return String(currentYear);
    try {
      const saved = localStorage.getItem('moi_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentYear) return String(parsed.currentYear);
      }
    } catch (e) {}
    return '2569';
  };

  const effectiveYear = getInitialYear();
  const isManualDocNumberRef = useRef<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);
  const hasAppliedRulesRef = useRef<boolean>(false);

  const [formData, setFormData] = useState<Partial<DocumentItem>>(() => {
    if (initialData) {
      return {
        ...initialData,
        year: initialData.year || effectiveYear,
        folderId: initialData.folderId ? Number(initialData.folderId) : null,
        status: initialData.status || 'ลงทะเบียน',
        isCentral: initialData.isCentral !== undefined ? Number(initialData.isCentral) : 1
      };
    }
    const activeType = defaultType || 'inbox';
    const isCentralPrivileged = user?.role === 'admin' || user?.role === 'moderator';
    const initIsCentral = isCentralPrivileged ? 1 : 0;
    const initDept = user?.department || (initIsCentral === 0 ? 'ฝ่ายยุทธศาสตร์และการจัดการ' : 'ฝ่ายยุทธศาสตร์และการจัดการ');
    return {
      receiveNumber: '',
      year: effectiveYear,
      docNumber: '',
      date: new Date().toISOString().split('T')[0],
      title: '',
      from: activeType === 'outbox' ? 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง' : '',
      to: '',
      department: initDept,
      assignee: '',
      note: '',
      type: activeType,
      category: 'order',
      priority: 'ปกติ',
      secrecy: 'ปกติ',
      content: '',
      folderId: null,
      status: 'ลงทะเบียน',
      attachments: [],
      isCentral: initIsCentral
    };
  });

  // Fetch custom numbering rules & reserved numbers on mount
  useEffect(() => {
    fetchNumberingAndReserved();
  }, []);

  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [startSequence, setStartSequence] = useState<number>(1);
  const [systemOrgName, setSystemOrgName] = useState<string>('');
  const [organizations, setOrganizations] = useState<{id: number, name: string}[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Workflow & SLA State
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedWorkflowTemplateId, setSelectedWorkflowTemplateId] = useState<string>('');
  const [activeWorkflowInstance, setActiveWorkflowInstance] = useState<WorkflowInstance | null>(null);

  const getWorkflowDerivedStatus = (inst: WorkflowInstance | null): string => {
    if (!inst) return formData.status || 'ลงทะเบียน';
    if (inst.status === 'completed') {
      return 'เสร็จสิ้น';
    }
    if (inst.status === 'rejected') {
      return 'ส่งกลับแก้ไข/ไม่อนุมัติ';
    }
    const currentStep = inst.steps?.[inst.currentStepIndex];
    if (currentStep) {
      return `อยู่ระหว่าง: ${currentStep.title}`;
    }
    return 'อยู่ระหว่างเสนอลงนาม';
  };

  useEffect(() => {
    if (activeWorkflowInstance) {
      const derived = getWorkflowDerivedStatus(activeWorkflowInstance);
      setFormData(prev => {
        if (prev.status !== derived) {
          return { ...prev, status: derived };
        }
        return prev;
      });
    }
  }, [activeWorkflowInstance]);

  // AI Cross-Reference Detector State
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  useEffect(() => {
    const fetchWorkflowData = async () => {
      try {
        const resTpl = await fetch('/api/workflows/templates');
        if (resTpl.ok) {
          const tpls: WorkflowTemplate[] = await resTpl.json();
          if (Array.isArray(tpls)) {
            setWorkflowTemplates(tpls);
            if (!initialData) {
              const categoryMatch = (formData.type === 'inbox' ? 'หนังสือรับ' : (formData.type === 'outbox' ? 'หนังสือส่ง' : 'ทั่วไป'));
              const defaultTpl = tpls.find(t => t.category === categoryMatch) || tpls[0];
              if (defaultTpl) {
                setSelectedWorkflowTemplateId(defaultTpl.id);
              }
            }
          }
        }

        if (initialData?.id) {
          const resInst = await fetch('/api/workflows/instances');
          if (resInst.ok) {
            const insts: WorkflowInstance[] = await resInst.json();
            if (Array.isArray(insts)) {
              const found = insts.find(i => String(i.docId) === String(initialData.id) || (initialData.docNumber && i.docNumber === initialData.docNumber));
              if (found) {
                setActiveWorkflowInstance(found);
                if (found.templateId) {
                  setSelectedWorkflowTemplateId(found.templateId);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load workflow data in modal:', err);
      }
    };
    fetchWorkflowData();
  }, [initialData?.id]);

  const handleRunAiCrossRef = async () => {
    setIsDetecting(true);
    try {
      const res = await fetch('/api/ai/detect-cross-references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc: {
            id: formData.id,
            docNumber: formData.docNumber,
            title: formData.title,
            from: formData.from,
            to: formData.to,
            date: formData.date,
            note: formData.note,
            content: formData.content
          },
          currentDocId: formData.id || initialData?.id
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.result) {
          setDetectionResult(data.result);
        }
      }
    } catch (err) {
      setDetectionResult({
        hasDuplicates: false,
        duplicateSummary: 'ไม่พบหนังสือซ้ำ',
        hasReferences: false,
        referenceSummary: 'ไม่พบหนังสือเดิมที่เกี่ยวข้อง',
        detectedItems: []
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleAiAutocomplete = async () => {
    if (!formData.title?.trim() && !formData.content?.trim()) {
      setAiAutocompError('⚠️ กรุณาระบุชื่อเรื่องหนังสือในช่องด้านล่างก่อน เพื่อให้ AI วิเคราะห์และเติมข้อมูล');
      setHighlightTitleField(true);
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
      setTimeout(() => {
        setHighlightTitleField(false);
      }, 3500);
      return;
    }

    setIsAiAutocompleting(true);
    setAiAutocompError(null);
    setAiAutocompSuccess(null);

    try {
      const res = await fetch('/api/ai/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title || '',
          content: formData.content || ''
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.result) {
        const result = data.result;
        
        let mappedPriority: any = 'ปกติ';
        if (result.priority === 'urgent' || result.priority === 'ด่วน') mappedPriority = 'ด่วน';
        else if (result.priority === 'very_urgent' || result.priority === 'ด่วนมาก') mappedPriority = 'ด่วนมาก';
        else if (result.priority === 'extremely_urgent' || result.priority === 'ด่วนที่สุด') mappedPriority = 'ด่วนที่สุด';
        else mappedPriority = 'ปกติ';

        let targetDocType: DocType = 'inbox';
        if (result.type === 'outbox') targetDocType = 'outbox';
        else if (result.type === 'admin') targetDocType = 'admin';
        else targetDocType = 'inbox';

        // Auto-match department from system departments list
        let matchedDept = formData.department;
        const suggestion = (result.suggestedTo || '').toLowerCase();
        if (departments.length > 0 && suggestion) {
          const directMatch = departments.find(d => 
            d.name.toLowerCase().includes(suggestion) || suggestion.includes(d.name.toLowerCase())
          );
          if (directMatch) {
            matchedDept = directMatch.name;
          } else {
            // Keyword matching
            if (suggestion.includes('ป้องกัน') || suggestion.includes('ปฏิบัติการ') || suggestion.includes('ดับเพลิง') || suggestion.includes('กู้ภัย')) {
              const d = departments.find(dep => dep.name.includes('ป้องกัน'));
              if (d) matchedDept = d.name;
            } else if (suggestion.includes('สงเคราะห์') || suggestion.includes('ผู้ประสบภัย')) {
              const d = departments.find(dep => dep.name.includes('สงเคราะห์'));
              if (d) matchedDept = d.name;
            } else if (suggestion.includes('ยุทธศาสตร์') || suggestion.includes('แผนงาน') || suggestion.includes('จัดการ') || suggestion.includes('ธุรการ') || suggestion.includes('สารบรรณ') || suggestion.includes('การเงิน') || suggestion.includes('พัสดุ')) {
              const d = departments.find(dep => dep.name.includes('ยุทธศาสตร์'));
              if (d) matchedDept = d.name;
            }
          }
        }

        const newContent = result.summary || formData.content || '';
        const newTo = result.suggestedTo || formData.to || '';
        const newCategory = result.category || formData.category || 'order';

        setFormData(prev => ({
          ...prev,
          type: targetDocType,
          category: newCategory,
          content: newContent,
          to: newTo,
          priority: mappedPriority,
          department: (user?.role === 'user' && user?.department) ? prev.department : (matchedDept || prev.department)
        }));

        if (targetDocType !== formData.type) {
          handleTypeChange(targetDocType);
        }

        const categoryLabels: Record<string, string> = {
          order: 'คำสั่ง',
          announcement: 'ประกาศ',
          certificate: 'หนังสือรับรอง',
          circular: 'หนังสือเวียน',
          memo: 'บันทึกข้อความ'
        };

        setAiAutocompSuccess({
          summary: newContent,
          priority: mappedPriority,
          typeName: targetDocType === 'inbox' ? 'หนังสือรับ' : (targetDocType === 'outbox' ? 'หนังสือส่ง' : 'งานธุรการ (คำสั่ง/ประกาศ)'),
          dept: matchedDept || result.suggestedTo,
          to: newTo,
          categoryName: categoryLabels[newCategory] || newCategory
        });
      } else {
        let errMessage = data.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ AI';
        if (typeof errMessage === 'object') errMessage = JSON.stringify(errMessage);
        setAiAutocompError(errMessage);
      }
    } catch (err: any) {
      setAiAutocompError('เกิดข้อผิดพลาดขณะส่งคำขอ: ' + err.message);
    } finally {
      setIsAiAutocompleting(false);
    }
  };

  const handleAttachRef = (item: CrossReferenceItem) => {
    const refText = `อ้างถึง ${item.docNumber ? `หนังสือเลขที่ ${item.docNumber}` : item.title}`;
    setFormData(prev => ({
      ...prev,
      note: prev.note ? `${prev.note} (${refText})` : refText
    }));
    alert(`แนบข้อมูลเรื่องเดิม "${refText}" เข้าในช่องหมายเหตุของหนังสือเรียบร้อยแล้ว`);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          if (data.startSequence) setStartSequence(Number(data.startSequence));
          if (data.headerOrgName) setSystemOrgName(data.headerOrgName);
          else if (data.orgName) setSystemOrgName(data.orgName);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch('/api/organizations');
        if (res.ok) {
          const data = await res.json();
          setOrganizations(data);
        }
      } catch (err) {
        console.error('Error fetching organizations:', err);
      }
    };
    fetchOrgs();
  }, []);

  // Helper to determine department prefix
  const getDepartmentPrefix = (deptName: string): string => {
    const trimmed = (deptName || '').trim();
    const rule = numberingRules.find((r: any) => 
      r.isActive && 
      (r.docType === 'หนังสือส่ง' || r.docType === 'หนังสือภายนอก') && 
      r.department === trimmed &&
      r.prefixPattern
    );
    if (rule?.prefixPattern) return rule.prefixPattern;

    if (trimmed === 'ฝ่ายยุทธศาสตร์และการจัดการ') return 'รย 0021.1';
    if (trimmed === 'ฝ่ายสงเคราะห์ผู้ประสบภัย') return 'รย 0021.2';
    if (trimmed === 'ฝ่ายป้องกันและปฏิบัติการ') return 'รย 0021.3';
    if (trimmed === 'ฝ่ายยุทธศาสตร์และการจัดการ') return 'รย 0021';

    return 'รย 0021';
  };

  const generateNumberInfo = (
    docType?: DocType,
    isCirc?: boolean,
    cat?: string,
    yr?: string,
    targetIsCentral?: number,
    targetDeptName?: string
  ) => {
    const targetType = docType || formData?.type || defaultType || 'inbox';
    const targetIsCircular = isCirc !== undefined ? isCirc : (formData?.isCircular || false);
    const targetCategory = cat || formData?.category || 'order';
    const targetYear = String(yr || formData?.year || effectiveYear);

    const activeIsCentral = targetIsCentral !== undefined 
      ? Number(targetIsCentral)
      : (formData?.isCentral !== undefined ? Number(formData.isCentral) : ((user?.role === 'admin' || user?.role === 'moderator') ? 1 : 0));

    const activeDept = (targetDeptName !== undefined
      ? targetDeptName
      : (formData?.department || user?.department || (activeIsCentral === 0 ? 'ฝ่ายยุทธศาสตร์และการจัดการ' : 'ฝ่ายยุทธศาสตร์และการจัดการ'))).trim();

    let actualType = 'หนังสือส่ง';
    if (targetType === 'admin') {
      actualType = targetCategory === 'order' ? 'คำสั่ง' : (targetCategory === 'announcement' ? 'ประกาศ' : 'หนังสือรับรอง');
    } else if (targetType === 'inbox') {
      actualType = 'หนังสือรับ';
    } else if (targetType === 'internal') {
      actualType = 'หนังสือภายใน';
    }

    let existingMax = 0;
    if (targetType === 'admin') {
      const existing = documents.filter(d => d.type === 'admin' && d.category === targetCategory);
      existingMax = existing.reduce((max, d) => {
        const match = (d.docNumber || '').match(/(\d+)\s*\/\s*(\d+)/);
        if (match && String(match[2]) === targetYear) return Math.max(max, parseInt(match[1], 10));
        const parts = (d.docNumber || '').split('/');
        const n = parseInt(parts[0], 10);
        return !isNaN(n) ? Math.max(max, n) : max;
      }, 0);
    } else {
      const filteredDocs = documents.filter(d => {
        if (d.year && String(d.year) !== targetYear) return false;

        if (targetType === 'outbox') {
          if (d.type !== 'outbox' || !!d.isCircular !== targetIsCircular) return false;
        } else if (d.type !== targetType) {
          return false;
        }

        if (activeIsCentral === 1) {
          // สารบรรณกลาง: นับเฉพาะเอกสารสารบรรณกลางเท่านั้น
          return d.isCentral === 1 || Number(d.isCentral) === 1 || d.isCentral === undefined || d.isCentral === null;
        } else {
          // สารบรรณฝ่าย/กลุ่มงาน: นับเฉพาะเอกสารของฝ่ายนี้เท่านั้น แยกขาดจากสารบรรณกลาง
          const isDeptDoc = d.isCentral === 0 || Number(d.isCentral) === 0;
          return isDeptDoc && (d.department || '').trim() === activeDept;
        }
      });

      existingMax = filteredDocs.reduce((max, d) => {
        const n = parseInt(d.receiveNumber || '0', 10);
        return !isNaN(n) ? Math.max(max, n) : max;
      }, 0);
    }

    // Also consult numberingRules if available
    if (numberingRules && numberingRules.length > 0) {
      let matchedRule: any = null;
      if (targetType === 'inbox') {
        if (activeIsCentral === 1) {
          matchedRule = numberingRules.find((r: any) => r.isActive && r.docType === 'หนังสือรับ' && (r.department === 'ทุกฝ่ายงาน' || r.runningScope === 'global' || (r.ruleName && r.ruleName.includes('สารบรรณกลาง'))));
        } else {
          matchedRule = numberingRules.find((r: any) => r.isActive && r.docType === 'หนังสือรับ' && (r.department === activeDept || (r.department && r.department.trim() === activeDept)));
        }
      } else if (targetType === 'outbox') {
        if (activeIsCentral === 1) {
          matchedRule = numberingRules.find((r: any) => r.isActive && (r.docType === 'หนังสือส่ง' || r.docType === 'หนังสือภายนอก') && (r.department === 'ทุกฝ่ายงาน' || r.runningScope === 'global' || (r.ruleName && r.ruleName.includes('สารบรรณกลาง'))));
        } else {
          matchedRule = numberingRules.find((r: any) => r.isActive && (r.docType === 'หนังสือส่ง' || r.docType === 'หนังสือภายนอก') && (r.department === activeDept || (r.department && r.department.trim() === activeDept)));
        }
      } else if (targetType === 'admin') {
        matchedRule = numberingRules.find((r: any) => r.isActive && r.docType === actualType);
      } else if (targetType === 'internal') {
        matchedRule = numberingRules.find((r: any) => r.isActive && r.docType === 'หนังสือภายใน');
      }

      if (matchedRule && matchedRule.currentSeq) {
        const ruleSeq = Number(matchedRule.currentSeq);
        if (!isNaN(ruleSeq) && ruleSeq > existingMax) {
          existingMax = ruleSeq;
        }
      }
    }

    const finalSeq = existingMax + 1;

    let formattedNumber = '';
    if (targetType === 'admin') {
      let rule = numberingRules.find((r: any) => r.isActive && r.docType === actualType);
      const prefix = rule ? (rule.prefixPattern || actualType) : actualType;
      formattedNumber = `${prefix} ${finalSeq}/${targetYear}`;
    } else if (targetType === 'outbox') {
      let prefix = 'รย 0021';
      if (activeIsCentral === 1) {
        let rule = numberingRules.find((r: any) => r.isActive && (r.docType === 'หนังสือส่ง' || r.docType === 'หนังสือภายนอก') && (r.department === 'ทุกฝ่ายงาน' || r.department === 'สารบรรณกลาง'));
        prefix = rule?.prefixPattern || 'รย 0021';
      } else {
        prefix = getDepartmentPrefix(activeDept);
      }
      const circStr = targetIsCircular ? (prefix.includes('ว') ? '' : 'ว ') : '';
      formattedNumber = `${prefix}/${circStr}${finalSeq}`;
    } else if (targetType === 'inbox') {
      formattedNumber = '';
    } else {
      formattedNumber = String(finalSeq);
    }

    return { seq: String(finalSeq), docNumber: formattedNumber };
  };

  const fetchNextNumberFromServer = async (
    targetType: DocType, 
    targetIsCirc: boolean, 
    targetCategory: string, 
    targetYr: string, 
    targetIsCentral: number, 
    targetDept: string
  ) => {
    try {
      const res = await fetch('/api/numbering/generate-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType: targetType,
          isCircular: targetIsCirc,
          category: targetCategory,
          year: targetYr,
          isCentral: targetIsCentral,
          department: targetDept
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          return {
            seq: String(data.nextSeq),
            docNumber: data.formattedNumber || '',
            ruleName: data.ruleName,
            prefix: data.prefix,
            ruleId: data.ruleId,
            isActiveRule: data.isActiveRule
          };
        }
      }
    } catch (err) {
      console.warn('generate-next server endpoint fallback:', err);
    }
    const localFallback = generateNumberInfo(targetType, targetIsCirc, targetCategory, targetYr, targetIsCentral, targetDept);
    return {
      ...localFallback,
      ruleName: undefined,
      prefix: undefined,
      ruleId: undefined,
      isActiveRule: false
    };
  };

  const applyNewNumbering = async (
    targetType: DocType,
    targetIsCirc: boolean,
    targetCategory: string,
    targetYr: string,
    targetIsCentral: number,
    targetDept: string
  ) => {
    const result = await fetchNextNumberFromServer(
      targetType,
      targetIsCirc,
      targetCategory,
      targetYr,
      targetIsCentral,
      targetDept
    );

    if (result.ruleName || result.prefix) {
      setMatchedRuleInfo({
        ruleName: result.ruleName,
        prefix: result.prefix,
        nextSeq: result.seq,
        isActiveRule: result.isActiveRule
      });
    }

    setFormData(prev => ({
      ...prev,
      receiveNumber: result.seq,
      docNumber: targetType === 'inbox' ? (prev.docNumber || '') : (result.docNumber || prev.docNumber)
    }));
  };

  // Fetch folders list
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const params = new URLSearchParams();
        if (user) {
          if (user.department) params.append('department', user.department);
          if (user.role) params.append('role', user.role);
        }
        const res = await fetch(`/api/folders?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setFolders(data);
        }
      } catch (err) {
        console.error('Error fetching folders:', err);
      }
    };
    fetchFolders();
  }, [user]);

  // Fetch users list from database
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setUsersList(data);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

  // Sync outbox numbering logic ONLY when user hasn't selected a reservation number and hasn't manually edited docNumber
  useEffect(() => {
    if (formData.type === 'outbox' && !selectedReservedId && !isManualDocNumberRef.current && !initialData) {
      const activeIsCentral = formData.isCentral !== undefined 
        ? Number(formData.isCentral) 
        : ((user?.role === 'admin' || user?.role === 'moderator') ? 1 : 0);
      const targetDept = (formData.department || user?.department || 'ฝ่ายยุทธศาสตร์และการจัดการ').trim();

      let prefix = 'รย 0021';
      if (activeIsCentral === 1) {
        let rule = numberingRules.find((r: any) => r.isActive && (r.docType === 'หนังสือส่ง' || r.docType === 'หนังสือภายนอก') && (r.department === 'ทุกฝ่ายงาน' || r.department === 'สารบรรณกลาง' || r.runningScope === 'global'));
        prefix = rule?.prefixPattern || 'รย 0021';
      } else {
        let rule = numberingRules.find((r: any) => r.isActive && (r.docType === 'หนังสือส่ง' || r.docType === 'หนังสือภายนอก') && (r.department === targetDept || (r.department && r.department.trim() === targetDept)));
        prefix = rule?.prefixPattern || getDepartmentPrefix(targetDept);
      }
      const circStr = formData.isCircular ? (prefix.includes('ว') ? '' : 'ว ') : '';
      const expectedDocNumber = `${prefix}/${circStr}${formData.receiveNumber || ''}`;
      if (formData.docNumber !== expectedDocNumber) {
        setFormData(prev => ({
          ...prev,
          docNumber: expectedDocNumber
        }));
      }
    }
  }, [formData.type, formData.receiveNumber, formData.isCircular, formData.department, formData.isCentral, selectedReservedId, initialData, numberingRules]);

  const handleIsCircularChange = (checked: boolean) => {
    isManualDocNumberRef.current = false;
    const currentIsCentral = formData.isCentral !== undefined 
      ? Number(formData.isCentral) 
      : ((user?.role === 'admin' || user?.role === 'moderator') ? 1 : 0);
    const currentDept = (formData.department || user?.department || 'ฝ่ายยุทธศาสตร์และการจัดการ').trim();
    const currentYear = formData.year || effectiveYear;

    setFormData(prev => ({ ...prev, isCircular: checked }));
    applyNewNumbering('outbox', checked, formData.category || 'order', currentYear, currentIsCentral, currentDept);
  };

  // Set initial default values ONLY on mount or when switching documents (initialData.id), NEVER on background polling
  useEffect(() => {
    if (initialData) {
      setSelectedReservedId(null);
      setFormData({
        ...initialData,
        year: initialData.year || effectiveYear,
        folderId: initialData.folderId ? Number(initialData.folderId) : null,
        status: initialData.status || 'ลงทะเบียน',
        isCentral: initialData.isCentral !== undefined ? Number(initialData.isCentral) : 1
      });
      hasInitializedRef.current = true;
    } else if (!hasInitializedRef.current) {
      const activeType = defaultType || 'inbox';
      const isCirc = false;
      const initCat = 'order';
      const initYear = effectiveYear;
      const isCentralPrivileged = user?.role === 'admin' || user?.role === 'moderator';
      const initIsCentral = isCentralPrivileged ? 1 : 0;
      const initDept = user?.department || (initIsCentral === 0 ? 'ฝ่ายยุทธศาสตร์และการจัดการ' : 'ฝ่ายยุทธศาสตร์และการจัดการ');

      setFormData(prev => ({
        ...prev,
        type: activeType,
        category: initCat,
        year: initYear,
        status: 'ลงทะเบียน',
        department: initDept,
        folderId: null,
        isCentral: initIsCentral,
        from: activeType === 'outbox' ? 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง' : prev.from
      }));

      applyNewNumbering(activeType, isCirc, initCat, initYear, initIsCentral, initDept);
      hasInitializedRef.current = true;
    }
  }, [initialData?.id]);

  // If numberingRules finishes loading after modal opens, apply prefix once if user hasn't edited anything yet
  useEffect(() => {
    if (!initialData && !selectedReservedId && !isManualDocNumberRef.current && !hasAppliedRulesRef.current && numberingRules.length > 0) {
      const activeType = formData.type || defaultType || 'inbox';
      const isCirc = formData.isCircular || false;
      const initCat = formData.category || 'order';
      const initYear = formData.year || effectiveYear;
      const currentIsCentral = formData.isCentral !== undefined 
        ? Number(formData.isCentral) 
        : ((user?.role === 'admin' || user?.role === 'moderator') ? 1 : 0);
      const currentDept = (formData.department || user?.department || 'ฝ่ายยุทธศาสตร์และการจัดการ').trim();

      const { seq, docNumber: initDocNum } = generateNumberInfo(activeType, isCirc, initCat, initYear, currentIsCentral, currentDept);
      setFormData(prev => ({
        ...prev,
        receiveNumber: seq || prev.receiveNumber,
        docNumber: activeType === 'inbox' ? (prev.docNumber || '') : (initDocNum || prev.docNumber)
      }));
      hasAppliedRulesRef.current = true;
      applyNewNumbering(activeType, isCirc, initCat, initYear, currentIsCentral, currentDept);
    }
  }, [numberingRules]);

  const handleTypeChange = (newType: DocType) => {
    if (newType === 'inbox') {
      setSelectedReservedId(null);
    }
    isManualDocNumberRef.current = false;
    if (!initialData) {
      const isCirc = newType === 'outbox' ? (formData.isCircular || false) : false;
      const initCat = formData.category || 'order';
      const initYear = formData.year || effectiveYear;
      const currentIsCentral = formData.isCentral !== undefined 
        ? Number(formData.isCentral) 
        : ((user?.role === 'admin' || user?.role === 'moderator') ? 1 : 0);
      const currentDept = (formData.department || user?.department || 'ฝ่ายยุทธศาสตร์และการจัดการ').trim();

      setFormData(prev => ({
        ...prev,
        type: newType,
        year: prev.year || effectiveYear,
        from: newType === 'outbox' ? 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง' : prev.from
      }));

      applyNewNumbering(newType, isCirc, initCat, String(initYear), currentIsCentral, currentDept);
    } else {
      setFormData(prev => ({
        ...prev,
        type: newType,
        year: prev.year || effectiveYear
      }));
    }
  };

  const handleRegistrationLevelChange = (newIsCentral: number) => {
    isManualDocNumberRef.current = false;
    setSelectedReservedId(null);

    const targetDept = newIsCentral === 1 
      ? (formData.department || 'ฝ่ายยุทธศาสตร์และการจัดการ')
      : (user?.department || (formData.department && formData.department !== 'ฝ่ายยุทธศาสตร์และการจัดการ' ? formData.department : 'ฝ่ายยุทธศาสตร์และการจัดการ'));

    setFormData(prev => ({
      ...prev,
      isCentral: newIsCentral,
      department: targetDept
    }));

    if (!initialData) {
      applyNewNumbering(
        formData.type || defaultType || 'inbox',
        formData.isCircular || false,
        formData.category || 'order',
        formData.year || effectiveYear,
        newIsCentral,
        targetDept
      );
    }
  };

  const handleDepartmentChange = (newDept: string) => {
    const isDeptLevel = (formData.isCentral ?? 1) === 0;
    setFormData(prev => ({
      ...prev,
      department: newDept
    }));

    if (isDeptLevel && !isManualDocNumberRef.current && !initialData) {
      applyNewNumbering(
        formData.type || defaultType || 'inbox',
        formData.isCircular || false,
        formData.category || 'order',
        formData.year || effectiveYear,
        0,
        newDept
      );
    }
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await fetch('/api/departments');
        if (res.ok) {
          const depsData = await res.json();
          setDepartments(depsData);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  const handleChange = (field: keyof DocumentItem, value: any) => {
    if (field === 'docNumber' || field === 'receiveNumber') {
      isManualDocNumberRef.current = true;
    }
    
    setFormData(prev => {
      const newFormData = { ...prev, [field]: value };
      
      // If category or year changed for admin documents, re-generate numbering from server
      if (!initialData && prev.type === 'admin' && (field === 'category' || field === 'year')) {
        const cat = field === 'category' ? value : (prev.category || 'order');
        const yr = field === 'year' ? value : (prev.year || effectiveYear);
        applyNewNumbering('admin', false, cat, String(yr), prev.isCentral ?? 1, prev.department || 'ฝ่ายยุทธศาสตร์และการจัดการ');
      }
      
      return newFormData;
    });
  };

  const getTargetFolderLabel = () => {
    const t = formData.type || 'inbox';
    if (t === 'inbox') return 'uploads/inbox (แฟ้มหนังสือรับ)';
    if (t === 'outbox') return 'uploads/outbox (แฟ้มหนังสือส่ง)';
    if (t === 'admin') {
      const c = formData.category || 'order';
      if (c === 'order') return 'uploads/admin/order (แฟ้มคำสั่ง)';
      if (c === 'announcement') return 'uploads/admin/announcement (แฟ้มประกาศ)';
      if (c === 'circular') return 'uploads/admin/circular (แฟ้มหนังสือเวียน)';
      return 'uploads/admin (แฟ้มธุรการ)';
    }
    return `uploads/${t}`;
  };

  const uploadFiles = async (filesToUpload: FileList | File[]) => {
    if (!filesToUpload || filesToUpload.length === 0) return;
    setIsUploading(true);

    try {
      const filesArr = Array.from(filesToUpload);
      const originalFileNames = filesArr.map(f => f.name);

      const uploadData = new FormData();
      // Append text fields FIRST so multer can parse them before receiving files
      const docType = formData.type || 'inbox';
      const category = formData.category || '';
      uploadData.append('docType', docType);
      uploadData.append('category', category);
      uploadData.append('originalNames', JSON.stringify(originalFileNames));
      uploadData.append('fileNames', JSON.stringify(originalFileNames));
      
      filesArr.forEach(file => {
        uploadData.append('files', file, file.name);
      });

      // Also pass parameters via query string to guarantee availability on production servers/proxies
      const queryParams = new URLSearchParams({
        docType: docType,
        category: category,
        uploadedBy: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'ผู้ใช้งาน',
        fileNames: JSON.stringify(originalFileNames)
      });

      const response = await fetch(`/api/upload?${queryParams.toString()}`, {
        method: 'POST',
        body: uploadData
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.files) {
          const newUrls = result.files.map((f: any) => f.url);
          setFormData(prev => ({
            ...prev,
            attachments: [...(prev.attachments || []), ...newUrls]
          }));
        }
      } else {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        alert(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${response.statusText || 'Unknown Error'}`);
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('ไม่สามารถอัปโหลดไฟล์ได้ โปรดลองอีกครั้ง');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeAttachment = async (indexToRemove: number) => {
    const fileUrlToRemove = formData.attachments?.[indexToRemove];
    if (fileUrlToRemove) {
      const username = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'ผู้ใช้งาน';
      try {
        // Send via both query param (in case production proxy strips DELETE body) and JSON body
        const deleteUrl = `/api/upload?url=${encodeURIComponent(fileUrlToRemove)}&username=${encodeURIComponent(username)}`;
        const res = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: fileUrlToRemove,
            username
          })
        });

        // Fallback to POST /api/upload/delete if DELETE method is blocked by reverse proxy
        if (!res.ok) {
          await fetch('/api/upload/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: fileUrlToRemove,
              username
            })
          });
        }
      } catch (err) {
        console.error('Failed to delete attachment from server:', err);
      }
    }
    setFormData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSelectReservedNumber = (item: any) => {
    const specificType = getCurrentSpecificDocType();
    
    // Strict type check to prevent cross-type selection even if UI filter was bypassed
    if (item.docType && item.docType !== specificType) {
      const isOutboxMatch = (item.docType === 'หนังสือภายนอก' || item.docType === 'หนังสือส่ง') && (specificType === 'หนังสือภายนอก' || specificType === 'หนังสือส่ง');
      const isInboxMatch = (item.docType === 'หนังสือรับ' || item.docType === 'หนังสือเข้า') && (specificType === 'หนังสือรับ' || specificType === 'หนังสือเข้า');
      
      if (!isOutboxMatch && !isInboxMatch) {
        alert(`ไม่อนุญาตให้ใช้เลขจองข้ามประเภทเอกสาร\nเลขจองนี้เป็นประเภท: ${item.docType}\nประเภทเอกสารปัจจุบัน: ${specificType}`);
        return;
      }
    }

    isManualDocNumberRef.current = true;
    setSelectedReservedId(item.id);
    setFormData(prev => ({
      ...prev,
      docNumber: item.numberString,
      receiveNumber: item.seqNumber ? String(item.seqNumber) : prev.receiveNumber,
      department: (item.department && item.department !== 'ทุกฝ่ายงาน') ? item.department : prev.department,
      date: item.reservedDate ? item.reservedDate : prev.date,
      year: item.year || prev.year || effectiveYear
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isEdit = Boolean(initialData);
    const confirmed = await confirm({
      title: isEdit ? 'ยืนยันการบันทึกการแก้ไขหนังสือราชการ' : 'ยืนยันการลงทะเบียนและบันทึกหนังสือราชการ',
      message: isEdit
        ? `คุณต้องการบันทึกการแก้ไขข้อมูลหนังสือราชการเลขที่ "${formData.docNumber || 'ฉบับนี้'}" ใช่หรือไม่?`
        : `คุณต้องการบันทึกและออกเลขทะเบียนหนังสือราชการเรื่อง "${formData.title || 'ฉบับนี้'}" เข้าสู่ระบบสารบรรณใช่หรือไม่?`,
      type: isEdit ? 'edit' : 'save',
      itemDetail: formData.title ? `เรื่อง: ${formData.title}` : undefined,
      confirmText: isEdit ? 'ยืนยันการแก้ไข' : 'ยืนยันการบันทึก',
      cancelText: 'ยกเลิก'
    });

    if (!confirmed) return;

    // Save "from" and "to" to organizations table
    if (formData.from && formData.from.trim() !== '') {
      try {
        await fetch('/api/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.from.trim() })
        });
      } catch (e) {
        console.error('Failed to save organization from', e);
      }
    }
    if (formData.to && formData.to.trim() !== '') {
      try {
        await fetch('/api/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.to.trim() })
        });
      } catch (e) {
        console.error('Failed to save organization to', e);
      }
    }

    const isCentralPrivileged = user?.role === 'admin' || user?.role === 'moderator';
    const resolvedIsCentral = isCentralPrivileged 
      ? (formData.isCentral !== undefined ? Number(formData.isCentral) : 1)
      : 0;

    const resolvedDept = (formData.department || (resolvedIsCentral === 0 ? user?.department : 'ฝ่ายยุทธศาสตร์และการจัดการ') || '').trim();

    let finalStatus = formData.status || 'ลงทะเบียน';
    if (selectedWorkflowTemplateId && (!activeWorkflowInstance || activeWorkflowInstance.templateId !== selectedWorkflowTemplateId)) {
      const template = workflowTemplates.find(t => t.id === selectedWorkflowTemplateId);
      if (template && template.steps?.[0]) {
        finalStatus = `อยู่ระหว่าง: ${template.steps[0].title}`;
      } else {
        finalStatus = 'อยู่ระหว่างเสนอลงนาม';
      }
    } else if (activeWorkflowInstance) {
      finalStatus = getWorkflowDerivedStatus(activeWorkflowInstance);
    }

    const newDoc: DocumentItem = {
      ...formData as DocumentItem,
      id: initialData?.id || `DOC-${Math.floor(Math.random() * 100000)}`,
      registerDate: initialData?.registerDate || new Date().toISOString(),
      isCentral: resolvedIsCentral,
      department: resolvedDept,
      status: finalStatus,
    };

    if (selectedReservedId) {
      try {
        await fetch('/api/reserved-numbers/use', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedReservedId, docId: newDoc.id })
        });
      } catch (err) {
        console.error('Failed to mark reserved number as used:', err);
      }
    }

    // Assign / Trigger Workflow Instance if a template was selected
    if (selectedWorkflowTemplateId && (!activeWorkflowInstance || activeWorkflowInstance.templateId !== selectedWorkflowTemplateId)) {
      try {
        const userFullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'ผู้เสนอเรื่อง';
        await fetch('/api/workflows/instances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            docId: newDoc.id,
            templateId: selectedWorkflowTemplateId,
            user: userFullName,
            docTitle: newDoc.title,
            docNumber: newDoc.docNumber,
            department: newDoc.department,
            assignee: newDoc.assignee,
            priority: newDoc.priority
          })
        });

        // Trigger realtime sync event
        window.dispatchEvent(new CustomEvent('REALTIME_EVENT', { detail: { type: 'WORKFLOW_UPDATED' } }));
      } catch (wfErr) {
        console.error('Failed to initiate workflow on doc submit:', wfErr);
      }
    }

    onSave(newDoc);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] sm:rounded-2xl rounded-none w-full max-w-4xl h-full sm:h-auto max-h-[100dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 lg:p-6 border-b border-[var(--border-light)] bg-[var(--bg-canvas)]/50 relative overflow-hidden shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 relative z-10 min-w-0 flex-1 mr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[var(--primary-color)] to-amber-600 flex items-center justify-center text-white shadow-md shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-xl font-bold font-sans text-[var(--text-primary)] flex items-center gap-1.5 sm:gap-2 flex-wrap leading-tight">
                <span>{initialData ? 'แก้ไขข้อมูลเอกสาร' : `ลงทะเบียนและบันทึกเอกสาร ${user && (user.role === 'admin' || user.role === 'moderator') ? '' : (formData.department ? `(${formData.department})` : '')}`}</span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-sans font-medium bg-[var(--primary-color)]/10 text-[var(--primary-color)] border border-[var(--primary-color)]/20 whitespace-nowrap">
                  {formData.type === 'inbox' ? 'หนังสือรับ' : formData.type === 'outbox' ? 'หนังสือส่ง' : 'งานธุรการ'}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                {systemOrgName || user?.agencyName || user?.department || ''}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 hover:bg-[var(--border-lighter)] rounded-xl transition-colors cursor-pointer shrink-0 active:scale-95 touch-target-min flex items-center justify-center"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 lg:p-6 custom-scrollbar bg-[var(--bg-surface)]">
          <form id="doc-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

            {/* Quick Type Selection Banner */}
            <div className="p-1.5 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-2xl flex flex-col sm:grid sm:grid-cols-3 gap-1.5 shadow-inner">
              <button
                type="button"
                onClick={() => handleTypeChange('inbox')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  formData.type === 'inbox'
                    ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] shadow-sm border border-[var(--border-light)] font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50'
                }`}
              >
                <Inbox className="w-4 h-4 text-blue-500 shrink-0" />
                <span>1. หนังสือรับ</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('outbox')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  formData.type === 'outbox'
                    ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] shadow-sm border border-[var(--border-light)] font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50'
                }`}
              >
                <Send className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>2. หนังสือส่ง</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('admin')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  formData.type === 'admin'
                    ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] shadow-sm border border-[var(--border-light)] font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50'
                }`}
              >
                <Layers className="w-4 h-4 text-purple-500 shrink-0" />
                <span>3. งานธุรการ (คำสั่ง/ประกาศ)</span>
              </button>
            </div>

            {/* Level Selector: สารบรรณกลาง VS ฝ่าย/กลุ่มงาน */}
            <div className="p-3 bg-[var(--bg-canvas)]/80 border border-[var(--border-light)] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                  (formData.isCentral ?? 1) === 1 
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30' 
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                }`}>
                  {(formData.isCentral ?? 1) === 1 ? 'กลาง' : 'ฝ่าย'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 flex-wrap">
                    <span>ระดับทะเบียนเอกสาร:</span>
                    <span className={(formData.isCentral ?? 1) === 1 ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                      {(formData.isCentral ?? 1) === 1 ? 'สารบรรณกลาง' : (user?.department || formData.department || 'ฝ่ายปฏิบัติ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    {(formData.isCentral ?? 1) === 1 
                      ? 'สมุดทะเบียนและเลขหนังสือรับ-ส่งของส่วนกลางหน่วยงาน'
                      : 'สมุดทะเบียนและเลขหนังสือรับ-ส่งของฝ่าย แยกขาดอิสระจากสารบรรณกลาง'}
                  </p>
                </div>
              </div>

              {(user?.role === 'admin' || user?.role === 'moderator') && (
                <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-light)] self-stretch sm:self-auto justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRegistrationLevelChange(1)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      (formData.isCentral ?? 1) === 1
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    สารบรรณกลาง
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRegistrationLevelChange(0)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      (formData.isCentral ?? 1) === 0
                        ? 'bg-emerald-600 text-white shadow-sm font-bold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    ฝ่าย / กลุ่มงาน
                  </button>
                </div>
              )}
            </div>

            {/* Section 1: ข้อมูลระบบและหมวดหมู่ */}
            <div className="bg-[var(--bg-canvas)]/40 border border-[var(--border-light)] rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-light)] text-xs font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-[var(--primary-color)]" />
                  <span>1. ประเภทระบบงานและเลขทะเบียนอัตโนมัติ</span>
                </div>
              </div>

              {/* Active Rule Reference Indicator */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-emerald-500/10 border border-blue-500/20 text-xs shadow-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
                    ⚡
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 flex-wrap truncate">
                      <span>อ้างอิงกฎออกเลขที่เปิดใช้งาน:</span>
                      <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">
                        {matchedRuleInfo?.ruleName || (
                          numberingRules.find(r => r.isActive && r.docType === (formData.type === 'admin' ? (formData.category === 'order' ? 'คำสั่ง' : formData.category === 'announcement' ? 'ประกาศ' : 'หนังสือรับรอง') : formData.type === 'inbox' ? 'หนังสือรับ' : formData.type === 'outbox' ? 'หนังสือส่ง' : 'หนังสือภายใน'))?.ruleName || 'กฎมาตรฐานของระบบ'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="hidden sm:inline-flex text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> เปิดใช้งาน
                </span>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 ${formData.type === 'outbox' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    ประเภทระบบงาน <span className="text-rose-500">*</span>
                  </label>
                  <select 
                    value={formData.type}
                    onChange={(e) => handleTypeChange(e.target.value as DocType)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors"
                  >
                    <option value="inbox">หนังสือรับ</option>
                    <option value="outbox">หนังสือส่ง</option>
                    <option value="admin">งานธุรการ (คำสั่ง/ประกาศ)</option>
                  </select>
                </div>

                {formData.type === 'admin' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">
                      หมวดหมู่เอกสารธุรการ <span className="text-rose-500">*</span>
                    </label>
                    <select 
                      value={formData.category || 'order'}
                      onChange={(e) => handleChange('category', e.target.value as DocCategory)}
                      className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors font-medium"
                    >
                      <option value="order">คำสั่ง</option>
                      <option value="announcement">ประกาศ</option>
                      <option value="certificate">หนังสือรับรอง</option>
                    </select>
                  </div>
                ) : formData.type === 'outbox' ? (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[var(--text-secondary)]">
                          เลขทะเบียนส่ง <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-canvas)] px-1.5 py-0.5 rounded border border-[var(--border-light)] flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> อัตโนมัติ
                        </span>
                      </div>
                      <input 
                        readOnly
                        type="text" 
                        value={formData.receiveNumber || ''}
                        placeholder="ระบบสร้างให้อัตโนมัติ"
                        className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-muted)] cursor-not-allowed font-mono opacity-85 select-none focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5 flex flex-col justify-center">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">รูปแบบหนังสือส่ง</label>
                      <div className="flex items-center gap-3 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none bg-[var(--bg-overlay)] px-3 py-1.5 rounded-xl border border-[var(--border-light)] hover:border-[var(--primary-color)]/40 transition-colors">
                          <input 
                            type="checkbox"
                            checked={formData.isCircular || false}
                            onChange={(e) => handleIsCircularChange(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-[var(--border-light)] text-[var(--primary-color)] focus:ring-[var(--primary-color)] bg-[var(--bg-overlay)]"
                          />
                          <span className="text-xs font-medium text-[var(--text-primary)]">หนังสือเวียน (ว)</span>
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">
                        เลขทะเบียนรับ <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-canvas)] px-1.5 py-0.5 rounded border border-[var(--border-light)] flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> อัตโนมัติ
                      </span>
                    </div>
                    <input 
                      readOnly
                      type="text" 
                      value={formData.receiveNumber || ''}
                      placeholder="ระบบสร้างให้อัตโนมัติ"
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-muted)] cursor-not-allowed font-mono opacity-85 select-none focus:outline-none"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    ปีพุทธศักราช <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    readOnly
                    type="text" 
                    value={formData.year || ''}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-muted)] cursor-not-allowed font-mono opacity-85 select-none focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: เลขที่หนังสือ วันที่ ความเร่งด่วน และความลับ */}
            <div className="bg-[var(--bg-canvas)]/40 border border-[var(--border-light)] rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-light)] text-xs font-bold text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[var(--primary-color)]" />
                  <span>2. รูปแบบเลขหนังสือ และระดับความสำคัญ</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">
                      {formData.type === 'admin' ? 'เลขที่' : 'ที่หนังสือ'} <span className="text-rose-500">*</span>
                    </label>
                    {formData.type !== 'inbox' && (user?.role === 'admin' || user?.role === 'moderator') && (formData.isCentral ?? 1) === 1 && (
                      <button
                        type="button"
                        onClick={handleOpenReservedModal}
                        className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 px-2 py-0.5 rounded-lg border border-amber-500/30 flex items-center gap-1 transition-all cursor-pointer"
                        title="เลือกเลขจากคลังจองล่วงหน้า (สารบรรณกลาง)"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
                        เลือกจากเลขจอง
                      </button>
                    )}
                  </div>
                  <input 
                    required
                    readOnly={formData.type !== 'inbox'}
                    type="text" 
                    value={formData.docNumber || ''}
                    onChange={(e) => {
                      if (formData.type === 'inbox') {
                        handleChange('docNumber', e.target.value);
                      }
                    }}
                    placeholder={formData.type === 'admin' ? 'เช่น คำสั่งที่ 12/2569' : formData.type === 'inbox' ? 'เช่น รย 0021/1234 (ระบุเลขที่หนังสือจากต้นทาง)' : 'เช่น รย 0021/1'}
                    className={`w-full border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs font-mono outline-none transition-colors placeholder-[var(--text-muted)] ${formData.type === 'inbox' ? 'bg-[var(--bg-overlay)] text-[var(--text-primary)] focus:border-[var(--primary-color)]' : 'bg-[var(--bg-canvas)] text-[var(--text-muted)] cursor-not-allowed select-none'}`}
                  />

                  {formData.type !== 'inbox' && selectedReservedId && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
                      <span className="font-semibold flex items-center gap-1.5 truncate">
                        <Bookmark className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        ใช้เลขจอง #{selectedReservedId}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReservedId(null);
                          const { seq, docNumber: initDocNum } = generateNumberInfo(formData.type, formData.isCircular, formData.category, formData.year);
                          setFormData(prev => ({
                            ...prev,
                            receiveNumber: seq,
                            docNumber: initDocNum
                          }));
                        }}
                        className="text-rose-600 font-bold hover:underline shrink-0 ml-1"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">ลงวันที่ <span className="text-rose-500">*</span></label>
                  <div className="relative flex items-center cursor-pointer group">
                    <input 
                      type="text"
                      readOnly
                      value={formData.date ? formatThaiDate(formData.date) : ''}
                      placeholder="เลือกวันที่"
                      className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl pl-3.5 pr-9 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors cursor-pointer select-none font-medium"
                    />
                    <input 
                      required
                      type="date" 
                      value={formData.date || ''}
                      onChange={(e) => handleChange('date', e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                      onClick={(e) => {
                        try {
                          if ('showPicker' in e.currentTarget) {
                            (e.currentTarget as any).showPicker();
                          }
                        } catch (err) {}
                      }}
                    />
                    <Calendar className="w-4 h-4 text-[var(--primary-color)] absolute right-3 pointer-events-none group-hover:scale-110 transition-transform z-0" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">ความเร่งด่วน</label>
                  <select 
                    value={formData.priority}
                    onChange={(e) => handleChange('priority', e.target.value as DocPriority)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors font-medium"
                  >
                    <option value="ปกติ">ปกติ</option>
                    <option value="ด่วน">ด่วน</option>
                    <option value="ด่วนมาก">ด่วนมาก</option>
                    <option value="ด่วนที่สุด">ด่วนที่สุด</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">ชั้นความลับ</label>
                  <select 
                    value={formData.secrecy || 'ปกติ'}
                    onChange={(e) => handleChange('secrecy', e.target.value as any)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors font-medium"
                  >
                    <option value="ปกติ">ปกติ</option>
                    <option value="ลับ">ลับ</option>
                    <option value="ลับมาก">ลับมาก</option>
                    <option value="ลับที่สุด">ลับที่สุด</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: เรื่อง และ หน่วยงานจาก/ถึง */}
            <div className="bg-[var(--bg-canvas)]/40 border border-[var(--border-light)] rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-light)] text-xs font-bold text-[var(--text-primary)]">
                <Building2 className="w-4 h-4 text-[var(--primary-color)]" />
                <span>3. เรื่อง และหน่วยงานเกี่ยวข้อง</span>
              </div>

              {/* AI Auto-Complete / Assist Panel */}
              <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/10 border border-indigo-500/25 rounded-2xl p-4 flex flex-col gap-3 shadow-sm backdrop-blur-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/10">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        ระบบช่วยเติมข้อมูลและสรุปเอกสารอัจฉริยะ (AI Smart Assist)
                        <span className="text-[9px] font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2 py-0.5 rounded-full animate-pulse">
                          Gemini Core
                        </span>
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                        เพียงพิมพ์ชื่อเรื่องหรือรายละเอียดสั้นๆ แล้วคลิกปุ่ม AI จะช่วยวิเคราะห์ สรุปสาระสำคัญ เลือกประเภทหนังสือ แนะนำฝ่ายปลายทาง และตั้งความด่วนให้อัตโนมัติ!
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-1.5">
                    <button
                      type="button"
                      onClick={handleAiAutocomplete}
                      disabled={isAiAutocompleting}
                      className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-md ${
                        isAiAutocompleting
                          ? 'bg-indigo-400 text-white cursor-wait opacity-80'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-indigo-500/20 hover:shadow-indigo-500/30'
                      }`}
                    >
                      {isAiAutocompleting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>กำลังวิเคราะห์เอกสาร...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>วิเคราะห์ & เติมข้อมูลอัตโนมัติ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {aiAutocompError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold animate-shake">
                    <Info className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{aiAutocompError}</span>
                  </div>
                )}

                {/* Success Card Feedback */}
                {aiAutocompSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 text-xs space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        AI วิเคราะห์และเติมข้อมูลลงในแบบฟอร์มเรียบร้อยแล้ว!
                      </span>
                      <button
                        type="button"
                        onClick={() => setAiAutocompSuccess(null)}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        ปิดการแจ้งเตือน
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                      <div className="bg-[var(--bg-surface)]/80 rounded-lg p-2 border border-emerald-500/20">
                        <span className="text-[var(--text-muted)] block text-[10px]">ประเภทเอกสาร:</span>
                        <span className="font-bold text-[var(--text-primary)]">{aiAutocompSuccess.typeName}</span>
                      </div>
                      <div className="bg-[var(--bg-surface)]/80 rounded-lg p-2 border border-emerald-500/20">
                        <span className="text-[var(--text-muted)] block text-[10px]">ความเร่งด่วน:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{aiAutocompSuccess.priority}</span>
                      </div>
                      <div className="bg-[var(--bg-surface)]/80 rounded-lg p-2 border border-emerald-500/20">
                        <span className="text-[var(--text-muted)] block text-[10px]">ฝ่าย/กลุ่มงาน:</span>
                        <span className="font-bold text-[var(--text-primary)] truncate block">{aiAutocompSuccess.dept || '-'}</span>
                      </div>
                      <div className="bg-[var(--bg-surface)]/80 rounded-lg p-2 border border-emerald-500/20">
                        <span className="text-[var(--text-muted)] block text-[10px]">ปลายทาง (ถึง):</span>
                        <span className="font-bold text-[var(--text-primary)] truncate block">{aiAutocompSuccess.to || '-'}</span>
                      </div>
                    </div>
                    {aiAutocompSuccess.summary && (
                      <div className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-surface)]/60 rounded-lg p-2 border border-emerald-500/15 line-clamp-2">
                        <span className="font-semibold text-[var(--text-primary)]">สรุปสาระสำคัญ: </span>
                        {aiAutocompSuccess.summary}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">เรื่อง / ชื่อเอกสาร <span className="text-rose-500">*</span></label>
                  <input 
                    ref={titleInputRef}
                    required
                    type="text" 
                    value={formData.title || ''}
                    onChange={(e) => {
                      handleChange('title', e.target.value);
                      if (aiAutocompError) setAiAutocompError(null);
                    }}
                    placeholder="ระบุชื่อเรื่องหนังสือให้ถูกต้อง ชัดเจน (เช่น ขออนุมัติจัดซื้ออุปกรณ์กู้ภัย, แจ้งเตือนสถานการณ์น้ำท่วม)"
                    className={`w-full bg-[var(--bg-overlay)] border rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] outline-none transition-all placeholder-[var(--text-muted)] font-medium ${
                      highlightTitleField 
                        ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-500/5' 
                        : 'border-[var(--border-light)] focus:border-[var(--primary-color)]'
                    }`}
                  />
                </div>

                {formData.type !== 'admin' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">จาก (หน่วยงานต้นทาง) <span className="text-rose-500">*</span></label>
                      <input 
                        required
                        type="text" 
                        value={formData.from || ''}
                        list="organization-list"
                        onChange={(e) => handleChange('from', e.target.value)}
                        placeholder="ระบุหรือเลือกหน่วยงานต้นทาง"
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors placeholder-[var(--text-muted)]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">ถึง (หน่วยงานปลายทาง) <span className="text-rose-500">*</span></label>
                      <input 
                        required
                        type="text" 
                        value={formData.to || ''}
                        list="organization-list"
                        onChange={(e) => handleChange('to', e.target.value)}
                        placeholder="ระบุหรือเลือกหน่วยงานปลายทาง"
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors placeholder-[var(--text-muted)]"
                      />
                    </div>

                    <datalist id="organization-list">
                      {organizations.map(org => (
                        <option key={org.id} value={org.name} />
                      ))}
                    </datalist>
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: แฟ้มจัดเก็บ สถานะ และการมอบหมาย */}
            <div className="bg-[var(--bg-canvas)]/40 border border-[var(--border-light)] rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-light)] text-xs font-bold text-[var(--text-primary)]">
                <UserCheck className="w-4 h-4 text-[var(--primary-color)]" />
                <span>4. แฟ้มจัดเก็บ สถานะการดำเนินงาน และผู้รับผิดชอบ</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">แฟ้มเอกสารดิจิทัล</label>
                  <select 
                    value={formData.folderId || ''}
                    onChange={(e) => handleChange('folderId', e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors"
                  >
                    <option value="">-- เก็บเข้าสารบรรณทั่วไป --</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  {activeWorkflowInstance ? (
                    <>
                      <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                        <span>สถานะเอกสารปัจจุบัน</span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                          <span className="flex h-1.5 w-1.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                          เชื่อมโยง Workflow
                        </span>
                      </label>
                      <div className="relative">
                        <input 
                          readOnly
                          type="text"
                          value={getWorkflowDerivedStatus(activeWorkflowInstance)}
                          className="w-full bg-[var(--bg-canvas)] border border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold rounded-xl px-3.5 py-2 text-xs outline-none shadow-sm cursor-not-allowed"
                        />
                      </div>
                    </>
                  ) : selectedWorkflowTemplateId ? (
                    <>
                      <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                        <span>สถานะเอกสารปัจจุบัน</span>
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          จะเริ่มส่งตาม Workflow
                        </span>
                      </label>
                      <div className="relative">
                        <input 
                          readOnly
                          type="text"
                          value={`อยู่ระหว่าง: ${workflowTemplates.find(t => t.id === selectedWorkflowTemplateId)?.steps?.[0]?.title || 'เสนอพิจารณา'}`}
                          className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] text-[var(--text-secondary)] font-medium rounded-xl px-3.5 py-2 text-xs outline-none cursor-not-allowed"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">สถานะเอกสารปัจจุบัน</label>
                      <select 
                        value={formData.status || 'ลงทะเบียน'}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors font-semibold text-blue-600 dark:text-blue-400"
                      >
                        <option value="ลงทะเบียน">ลงทะเบียน</option>
                        <option value="ส่งต่อกลุ่มงาน">ส่งต่อผู้รับผิดชอบหลัก</option>
                      </select>
                    </>
                  )}
                </div>
              </div>

              {formData.type === 'inbox' && !initialData && (formData.isCentral ?? 1) === 1 ? (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>คำแนะนำขั้นตอนการลงรับหนังสือกลาง (สารบรรณกลาง)</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    เมื่อลงทะเบียนหนังสือรับสารบรรณกลางแล้ว ระบบจะกำหนดสถานะเป็น <b>"ลงทะเบียน"</b> โดยท่านสามารถเปิดหน้ารายละเอียดเอกสารเพื่อเลือก <b>"ส่งต่อกลุ่มงาน"</b> เพื่อมอบหมายฝ่ายงานต่อไป
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">กลุ่มงาน/ฝ่ายปฏิบัติงาน</label>
                    <select 
                      value={formData.department || ''}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      disabled={user?.role === 'user' && !!user?.department}
                      className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors"
                    >
                      <option value="">-- เลือกกลุ่มปฏิบัติ/ฝ่าย --</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">ผู้รับผิดชอบหลัก</label>
                    <select 
                      value={formData.assignee || ''}
                      onChange={(e) => {
                        const selectedName = e.target.value;
                        const matchedUser = usersList.find(u => {
                          const fullName = `${u.firstName} ${u.lastName}`.trim();
                          return fullName === selectedName;
                        });
                        
                        // Update department if assignee changes (or force update)
                        const newDept = matchedUser?.department || formData.department;
                        
                        setFormData(prev => ({
                          ...prev,
                          assignee: selectedName,
                          department: newDept
                        }));

                        // If status is "ลงทะเบียน" and an assignee is chosen, auto-switch to "ส่งต่อผู้รับผิดชอบหลัก"
                        if (formData.status === 'ลงทะเบียน' && selectedName) {
                          handleChange('status', 'ส่งต่อกลุ่มงาน');
                        }
                      }}
                      className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors"
                    >
                      <option value="">-- เลือกผู้รับผิดชอบหลักจากระบบ --</option>
                      {usersList
                        .filter(u => {
                          if (user?.role === 'admin' || user?.role === 'moderator') return true;
                          return u.department === user?.department;
                        })
                        .map(u => {
                        const fullName = `${u.firstName} ${u.lastName}`.trim();
                        const label = u.position ? `${fullName} - ${u.position}` : fullName;
                        return (
                          <option key={u.id} value={fullName}>
                            {label} {u.department ? `[${u.department}]` : ''}
                          </option>
                        );
                      })}
                      {formData.assignee && !usersList.some(u => `${u.firstName} ${u.lastName}`.trim() === formData.assignee) && (
                        <option value={formData.assignee}>{formData.assignee}</option>
                      )}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Section 5: สาระสำคัญและหมายเหตุ */}
            <div className="bg-[var(--bg-canvas)]/40 border border-[var(--border-light)] rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-light)] text-xs font-bold text-[var(--text-primary)]">
                <AlignLeft className="w-4 h-4 text-[var(--primary-color)]" />
                <span>5. สาระสำคัญ และหมายเหตุเพิ่มเติม</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">เนื้อหาอย่างย่อ / สาระสำคัญของหนังสือ</label>
                  <textarea 
                    rows={3}
                    value={formData.content || ''}
                    onChange={(e) => handleChange('content', e.target.value)}
                    placeholder="ระบุเนื้อหา/สรุปสาระสำคัญของเอกสาร เพื่อความสะดวกในการค้นหาและอ้างอิง..."
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors placeholder-[var(--text-muted)] resize-y"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">หมายเหตุเพิ่มเติม</label>
                  <input 
                    type="text" 
                    value={formData.note || ''}
                    onChange={(e) => handleChange('note', e.target.value)}
                    placeholder="ระบุหมายเหตุ การอ้างถึง หรือข้อสังเกตเพิ่มเติม (ถ้ามี)"
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors placeholder-[var(--text-muted)]"
                  />
                </div>
              </div>
            </div>

            {/* AI Duplicate & Cross-Reference Detector Section */}
            <AiCrossReferencePanel
              result={detectionResult}
              isLoading={isDetecting}
              onRunDetection={handleRunAiCrossRef}
              onAttachRef={handleAttachRef}
            />

            {/* Section 6: มอบหมายผังการเดินเอกสารและติดตาม SLA */}
            <div className="bg-[var(--bg-canvas)]/40 border border-[var(--border-light)] rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-light)]">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <Workflow className="w-4 h-4 text-[var(--primary-color)]" />
                  <span>6. มอบหมายผังการเดินเอกสารเสนออนุมัติ และติดตาม SLA (Workflow & SLA Alignment)</span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
                  ระเบียบสารบรรณ พ.ศ. 2526
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                    <span>เลือกแม่แบบผังการเดินเอกสารเสนออนุมัติ</span>
                    {activeWorkflowInstance && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        มีผังการเดินเอกสารที่กำลังดำเนินการอยู่แล้ว
                      </span>
                    )}
                  </label>
                  <select
                    value={selectedWorkflowTemplateId}
                    onChange={(e) => setSelectedWorkflowTemplateId(e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors font-medium"
                  >
                    <option value="">-- ไม่กำหนดผังการเดินเอกสาร (กำหนดหรือเสนอเรื่องภายหลัง) --</option>
                    {workflowTemplates.map((tpl) => {
                      const totalHours = (tpl.steps || []).reduce((acc, st) => acc + (st.slaHours || 24), 0);
                      return (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name} [{tpl.category}] - ({tpl.steps?.length || 0} ขั้นตอน / SLA รวม {totalHours} ช.ม.)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Workflow Preview Card */}
                {selectedWorkflowTemplateId ? (() => {
                  const currentTpl = workflowTemplates.find(t => t.id === selectedWorkflowTemplateId);
                  if (!currentTpl) return null;
                  const totalHours = (currentTpl.steps || []).reduce((acc, st) => acc + (st.slaHours || 24), 0);
                  const totalDays = Math.ceil(totalHours / 24);

                  return (
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-3.5 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-2">
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <span>{currentTpl.name}</span>
                            <span className="text-[10px] text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2 py-0.5 rounded-full font-medium">
                              {currentTpl.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{currentTpl.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 justify-end">
                            <Clock className="w-3.5 h-3.5" />
                            <span>SLA รวม: {totalHours} ช.ม. ({totalDays} วัน)</span>
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)]">กำหนดแล้วเสร็จตามระเบียบ</span>
                        </div>
                      </div>

                      {/* Steps Timeline Preview */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-[var(--text-secondary)] block">
                          ลำดับขั้นตอนการเสนอหนังสือและตรวจพิจารณา ({currentTpl.steps?.length || 0} ขั้นตอน):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {(currentTpl.steps || []).map((step, idx) => (
                            <div 
                              key={idx}
                              className="bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-lg p-2.5 text-xs space-y-1 relative"
                            >
                              <div className="flex items-center justify-between font-bold text-[var(--text-primary)]">
                                <span className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-4 h-4 rounded-full bg-[var(--primary-color)] text-white text-[10px] flex items-center justify-center shrink-0 font-mono">
                                    {step.stepNumber || idx + 1}
                                  </span>
                                  <span className="truncate">{step.title}</span>
                                </span>
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                                  {step.slaHours}h
                                </span>
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] truncate pl-5">
                                ผู้เสนอ/ผู้ตรวจ: {step.assignedRole} ({step.department || 'หน่วยงานหลัก'})
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Active Instance Badge if exists */}
                      {activeWorkflowInstance && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 flex items-center justify-between text-xs mt-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <div>
                              <div className="font-bold text-emerald-700 dark:text-emerald-300">
                                สถานะการเสนอเรื่องปัจจุบัน: ขั้นตอนที่ {activeWorkflowInstance.currentStepIndex + 1} ({activeWorkflowInstance.steps?.[activeWorkflowInstance.currentStepIndex]?.title || 'กำลังดำเนินการ'})
                              </div>
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                เริ่มเสนอเมื่อ: {formatThaiDate(activeWorkflowInstance.startedAt)} | ครบกำหนด SLA: {formatThaiDate(activeWorkflowInstance.dueAt)}
                              </div>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                            activeWorkflowInstance.slaStatus === 'OVERDUE' ? 'bg-red-500/20 text-red-600' :
                            activeWorkflowInstance.slaStatus === 'WARNING' ? 'bg-amber-500/20 text-amber-600' :
                            'bg-emerald-500/20 text-emerald-600'
                          }`}>
                            {activeWorkflowInstance.slaStatus === 'OVERDUE' ? '⚠️ เกินกำหนด SLA' :
                             activeWorkflowInstance.slaStatus === 'WARNING' ? '⚡ ใกล้ครบกำหนด' : '🟢 ปฏิบัติตามเวลา'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <div className="p-3 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-canvas)] border border-dashed border-[var(--border-lighter)] rounded-xl">
                    เลือกแม่แบบด้านบนเพื่อดูตัวอย่างลำดับขั้นตอนการเดินเอกสารและระยะเวลา SLA
                  </div>
                )}
              </div>
            </div>

            {/* File Attachment Section */}
            <div className="bg-[var(--bg-canvas)]/40 border border-[var(--border-light)] rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-light)]">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <Paperclip className="w-4 h-4 text-[var(--primary-color)]" />
                  <span>7. แนบไฟล์เอกสารดิจิทัล (Scan / Digital Attachments)</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-1 rounded-lg border border-[var(--primary-color)]/20">
                  <Folder className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono text-[11px] font-bold">{getTargetFolderLabel()}</span>
                </div>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                multiple 
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip" 
                className="hidden" 
              />

              <div 
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/10 scale-[0.99]' 
                    : 'border-[var(--border-medium)] bg-[var(--bg-overlay)]/50 hover:bg-[var(--bg-overlay)] hover:border-[var(--primary-color)]/50'
                } ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Loader2 className="w-8 h-8 text-[var(--primary-color)] animate-spin" />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">กำลังอัปโหลดและจัดเก็บไฟล์เข้าโฟลเดอร์...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-2xl bg-[var(--primary-color)]/10 flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5 text-[var(--primary-color)]" />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">คลิกเพื่อเลือกไฟล์ หรือ ลากและวางไฟล์ที่นี่</span>
                    <span className="text-[11px] text-[var(--text-muted)] mt-1">รองรับไฟล์ PDF, Word, Excel, JPG, PNG, ZIP (ไม่เกิน 30MB/ไฟล์)</span>
                  </>
                )}
              </div>

              {/* Uploaded Files List */}
              {formData.attachments && formData.attachments.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>รายการไฟล์แนบที่จัดเก็บแล้ว ({formData.attachments.length} ไฟล์):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {formData.attachments.map((fileUrl, idx) => {
                      const rawName = decodeURIComponent(fileUrl.split('/').pop() || fileUrl);
                      const match = rawName.match(/^\d{10,15}-\d{4,10}-(.+)$/);
                      const fileName = match ? match[1] : rawName;
                      return (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs hover:border-[var(--border-medium)] transition-colors"
                        >
                          <a 
                            href={`/api/files/view?url=${encodeURIComponent(fileUrl)}&username=${encodeURIComponent(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'ผู้ใช้งาน')}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={async (e) => {
                              e.preventDefault();
                              const url = `/api/files/view?url=${encodeURIComponent(fileUrl)}&username=${encodeURIComponent(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'ผู้ใช้งาน')}`;
                              try {
                                const res = await fetch(url);
                                if (!res.ok) throw new Error('Network error');
                                const blob = await res.blob();
                                const blobUrl = window.URL.createObjectURL(blob);
                                window.open(blobUrl, '_blank');
                                setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
                              } catch(err) {
                                window.open(url, '_blank');
                              }
                            }}
                            className="flex items-center gap-2 text-[var(--text-primary)] hover:text-[var(--primary-color)] truncate max-w-[85%]"
                            title="คลิกเพื่อเปิดดูไฟล์"
                          >
                            <FileText className="w-4 h-4 text-[var(--primary-color)] shrink-0" />
                            <span className="truncate font-medium">{fileName}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 cursor-pointer"
                            title="ลบไฟล์แนบนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--border-light)] bg-[var(--bg-surface)] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[var(--text-muted)] hidden sm:block">
            กรุณาตรวจสอบความถูกต้องของข้อมูลก่อนกดบันทึก
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-lighter)] transition-colors border border-[var(--border-light)] cursor-pointer"
            >
              ยกเลิก
            </button>
            <button 
              type="submit"
              form="doc-form"
              className="flex items-center gap-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md border border-[var(--primary-color)]/50 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" /> บันทึกข้อมูลเอกสาร
            </button>
          </div>
        </div>
      </div>
      
      {/* MODAL: SELECT RESERVED / RECLAIMED NUMBER */}
      <ReservedNumberPicker
        isOpen={showReservedModal}
        onClose={() => setShowReservedModal(false)}
        reservedNumbers={reservedNumbers}
        currentDocTypeLabel={getCurrentDocTypeDisplayLabel()}
        currentSpecificDocType={getCurrentSpecificDocType()}
        selectedId={selectedReservedId}
        onSelect={handleSelectReservedNumber}
      />

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
