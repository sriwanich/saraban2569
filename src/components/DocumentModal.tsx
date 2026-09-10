import React, { useState, useEffect, useRef } from 'react';
import { DocumentItem, DocType, DocPriority, DocCategory, Folder as FolderType, User, formatThaiDate, formatThaiDateString } from '../types';
import { 
  X, Save, Paperclip, Upload, Trash2, FileText, Loader2, Folder, CheckCircle2, 
  Calendar, Lock, Sparkles, Bookmark, Search, Filter, Check, Hash, Building2, 
  UserCheck, Tag, AlignLeft, Info, Layers, Inbox, Send, ShieldAlert, AlertCircle, FileCode
} from 'lucide-react';
import AiCrossReferencePanel, { DetectionResult, CrossReferenceItem } from './ai-cross-reference-panel';
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
  const [showReservedModal, setShowReservedModal] = useState<boolean>(false);
  const [selectedReservedId, setSelectedReservedId] = useState<number | null>(null);

  const [reservedFilterType, setReservedFilterType] = useState<string>('ALL');
  const [reservedFilterDate, setReservedFilterDate] = useState<string>('');
  const [reservedFilterStatus, setReservedFilterStatus] = useState<string>('available');
  const [reservedSearchTerm, setReservedSearchTerm] = useState<string>('');

  // Helper to determine exact docType for filtering reserved numbers
  const getCurrentSpecificDocType = (docType?: DocType, category?: string) => {
    const t = docType || formData.type;
    const cat = category || formData.category;
    if (t === 'admin') {
      if (cat === 'order') return 'คำสั่ง';
      if (cat === 'announcement') return 'ประกาศ';
      if (cat === 'certificate' || cat === 'cert') return 'หนังสือรับรอง';
      return 'คำสั่ง';
    }
    if (t === 'outbox') return 'หนังสือภายนอก';
    if (t === 'internal') return 'หนังสือภายใน';
    if (t === 'inbox') return 'หนังสือรับ';
    return 'หนังสือภายนอก';
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
    if (t === 'outbox') return 'หนังสือส่ง (หนังสือภายนอก)';
    if (t === 'internal') return 'หนังสือภายใน';
    if (t === 'inbox') return 'หนังสือรับ';
    return 'หนังสือภายนอก';
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
    const initDept = user?.department || (initIsCentral === 0 ? 'ฝ่ายยุทธศาสตร์และการจัดการ' : 'ฝ่ายบริหารงานทั่วไป');
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

  // AI Cross-Reference Detector State
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

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
      r.docType === 'หนังสือภายนอก' && 
      r.department === trimmed &&
      r.prefixPattern
    );
    if (rule?.prefixPattern) return rule.prefixPattern;

    if (trimmed === 'ฝ่ายยุทธศาสตร์และการจัดการ') return 'รย 0021.1';
    if (trimmed === 'ฝ่ายสงเคราะห์ผู้ประสบภัย') return 'รย 0021.2';
    if (trimmed === 'ฝ่ายป้องกันและปฏิบัติการ') return 'รย 0021.3';
    if (trimmed === 'ฝ่ายบริหารงานทั่วไป') return 'รย 0021';

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
      : (formData?.department || user?.department || (activeIsCentral === 0 ? 'ฝ่ายยุทธศาสตร์และการจัดการ' : 'ฝ่ายบริหารงานทั่วไป'))).trim();

    let actualType = 'หนังสือภายนอก';
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

    const finalSeq = existingMax + 1;

    let formattedNumber = '';
    if (targetType === 'admin') {
      let rule = numberingRules.find((r: any) => r.isActive && r.docType === actualType);
      const prefix = rule ? (rule.prefixPattern || actualType) : actualType;
      formattedNumber = `${prefix} ${finalSeq}/${targetYear}`;
    } else if (targetType === 'outbox') {
      let prefix = 'รย 0021';
      if (activeIsCentral === 1) {
        let rule = numberingRules.find((r: any) => r.isActive && r.docType === 'หนังสือภายนอก' && (r.department === 'ทุกฝ่ายงาน' || r.department === 'สารบรรณกลาง'));
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
            docNumber: data.formattedNumber || ''
          };
        }
      }
    } catch (err) {
      console.warn('generate-next server endpoint fallback:', err);
    }
    return generateNumberInfo(targetType, targetIsCirc, targetCategory, targetYr, targetIsCentral, targetDept);
  };

  const applyNewNumbering = async (
    targetType: DocType,
    targetIsCirc: boolean,
    targetCategory: string,
    targetYr: string,
    targetIsCentral: number,
    targetDept: string
  ) => {
    const { seq, docNumber: newDocNum } = await fetchNextNumberFromServer(
      targetType,
      targetIsCirc,
      targetCategory,
      targetYr,
      targetIsCentral,
      targetDept
    );

    setFormData(prev => ({
      ...prev,
      receiveNumber: seq,
      docNumber: newDocNum
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
      const targetDept = (formData.department || user?.department || 'ฝ่ายบริหารงานทั่วไป').trim();

      let prefix = 'รย 0021';
      if (activeIsCentral === 1) {
        let rule = numberingRules.find((r: any) => r.isActive && r.docType === 'หนังสือภายนอก' && (r.department === 'ทุกฝ่ายงาน' || r.department === 'สารบรรณกลาง'));
        prefix = rule?.prefixPattern || 'รย 0021';
      } else {
        prefix = getDepartmentPrefix(targetDept);
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
    const currentDept = (formData.department || user?.department || 'ฝ่ายบริหารงานทั่วไป').trim();
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
      const initDept = user?.department || (initIsCentral === 0 ? 'ฝ่ายยุทธศาสตร์และการจัดการ' : 'ฝ่ายบริหารงานทั่วไป');

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
      const currentDept = (formData.department || user?.department || 'ฝ่ายบริหารงานทั่วไป').trim();

      const { seq, docNumber: initDocNum } = generateNumberInfo(activeType, isCirc, initCat, initYear, currentIsCentral, currentDept);
      if (initDocNum) {
        setFormData(prev => ({
          ...prev,
          receiveNumber: prev.receiveNumber || seq,
          docNumber: activeType === 'inbox' ? (prev.docNumber || '') : (prev.docNumber || initDocNum)
        }));
        hasAppliedRulesRef.current = true;
      }
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
      const currentDept = (formData.department || user?.department || 'ฝ่ายบริหารงานทั่วไป').trim();

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
      ? (formData.department || 'ฝ่ายบริหารงานทั่วไป')
      : (user?.department || (formData.department && formData.department !== 'ฝ่ายบริหารงานทั่วไป' ? formData.department : 'ฝ่ายยุทธศาสตร์และการจัดการ'));

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
    if (!initialData && formData.type === 'admin' && (field === 'category' || field === 'year')) {
      const cat = field === 'category' ? value : (formData.category || 'order');
      const yr = field === 'year' ? value : (formData.year || effectiveYear);
      const { docNumber: nextDocNum } = generateNumberInfo('admin', false, cat, yr);
      setFormData(prev => ({ ...prev, [field]: value, docNumber: nextDocNum }));
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
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

    const resolvedDept = (formData.department || (resolvedIsCentral === 0 ? user?.department : 'ฝ่ายบริหารงานทั่วไป') || '').trim();

    const newDoc: DocumentItem = {
      ...formData as DocumentItem,
      id: initialData?.id || `DOC-${Math.floor(Math.random() * 100000)}`,
      registerDate: initialData?.registerDate || new Date().toISOString(),
      isCentral: resolvedIsCentral,
      department: resolvedDept,
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
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-light)] text-xs font-bold text-[var(--text-primary)]">
                <Hash className="w-4 h-4 text-[var(--primary-color)]" />
                <span>1. ประเภทระบบงานและเลขทะเบียนอัตโนมัติ</span>
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

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">เรื่อง / ชื่อเอกสาร <span className="text-rose-500">*</span></label>
                  <input 
                    required
                    type="text" 
                    value={formData.title || ''}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="ระบุชื่อเรื่องหนังสือให้ถูกต้อง ชัดเจน"
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors placeholder-[var(--text-muted)] font-medium"
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
                    <option value="">-- ไม่จัดเก็บเข้าแฟ้มพิเศษ (เก็บเข้าสารบรรณทั่วไป) --</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">สถานะเอกสารปัจจุบัน</label>
                  <select 
                    value={formData.status || 'ลงทะเบียน'}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors font-semibold text-blue-600 dark:text-blue-400"
                  >
                    <option value="ลงทะเบียน">ลงทะเบียน</option>
                    <option value="ส่งต่อกลุ่มงาน">ส่งต่อผู้รับผิดชอบหลัก</option>
                  </select>
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

            {/* File Attachment Section */}
            <div className="bg-[var(--bg-canvas)]/40 border border-[var(--border-light)] rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-light)]">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <Paperclip className="w-4 h-4 text-[var(--primary-color)]" />
                  <span>6. แนบไฟล์เอกสารดิจิทัล (Scan / Digital Attachments)</span>
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
      {showReservedModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] sm:rounded-2xl rounded-none w-full max-w-3xl h-full sm:h-auto max-h-[100dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--border-light)] bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                    เลือกเลขหนังสือจากคลังจองล่วงหน้า
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold">
                      {reservedNumbers.filter(r => r.status === 'available').length} เลขพร้อมใช้
                    </span>
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    เลือกเลขหนังสือที่ได้ทำการจองล่วงหน้า เพื่อนำมาใช้ออกหนังสือฉบับนี้
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReservedModal(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--border-lighter)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="p-3 sm:p-4 border-b border-[var(--border-light)] bg-[var(--bg-canvas)] space-y-3 text-xs">
              {/* Type Filter Quick Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                <span className="text-[var(--text-muted)] font-medium shrink-0 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5 text-[var(--primary-color)]" /> กรองประเภท:
                </span>

                <button
                  type="button"
                  onClick={() => setReservedFilterType(getCurrentSpecificDocType())}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    reservedFilterType === getCurrentSpecificDocType()
                      ? 'bg-[var(--primary-color)] text-white shadow-sm ring-1 ring-[var(--primary-color)]'
                      : 'bg-[var(--bg-overlay)] hover:bg-[var(--border-lighter)] text-[var(--text-primary)] border border-[var(--border-light)]'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  ตรงกับเอกสารนี้ ({getCurrentDocTypeDisplayLabel()})
                </button>

                <button
                  type="button"
                  onClick={() => setReservedFilterType('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    reservedFilterType === 'ALL'
                      ? 'bg-[var(--primary-color)] text-white shadow-sm'
                      : 'bg-[var(--bg-overlay)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)] border border-[var(--border-light)]'
                  }`}
                >
                  ทั้งหมด
                </button>

                {['คำสั่ง', 'ประกาศ', 'หนังสือรับรอง', 'หนังสือภายนอก', 'หนังสือภายใน', 'หนังสือรับ'].map(t => {
                  const isSelected = reservedFilterType === t;
                  const label = t === 'หนังสือภายนอก' ? 'หนังสือส่ง (ภายนอก)' : t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setReservedFilterType(t)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-[var(--primary-color)] text-white shadow-sm'
                          : 'bg-[var(--bg-overlay)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)] border border-[var(--border-light)]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Date Filter & Search Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                {/* Date Picker Filter */}
                <div className="sm:col-span-5 flex items-center gap-1.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] px-2.5 py-1.5 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="text-[var(--text-muted)] shrink-0">วันที่จอง:</span>
                  <input
                    type="date"
                    value={reservedFilterDate}
                    onChange={(e) => setReservedFilterDate(e.target.value)}
                    className="bg-transparent text-[var(--text-primary)] font-medium outline-none text-xs flex-1 cursor-pointer"
                  />
                  {reservedFilterDate ? (
                    <button
                      type="button"
                      onClick={() => setReservedFilterDate('')}
                      className="text-[10px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer"
                      title="ล้างตัวกรองวันที่"
                    >
                      ล้าง
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setReservedFilterDate(today);
                      }}
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--primary-color)] hover:underline shrink-0 cursor-pointer"
                    >
                      วันนี้
                    </button>
                  )}
                </div>

                {/* Status selector */}
                <div className="sm:col-span-3 flex items-center gap-1.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] px-2.5 py-1.5 rounded-lg">
                  <span className="text-[var(--text-muted)] shrink-0">สถานะ:</span>
                  <select
                    value={reservedFilterStatus}
                    onChange={(e) => setReservedFilterStatus(e.target.value)}
                    className="bg-transparent text-[var(--text-primary)] font-medium outline-none cursor-pointer w-full text-xs"
                  >
                    <option value="available">พร้อมใช้งาน</option>
                    <option value="used">ใช้งานแล้ว</option>
                    <option value="ALL">ทุกสถานะ</option>
                  </select>
                </div>

                {/* Text Search */}
                <div className="sm:col-span-4 relative">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหาเลขที่, ผู้จอง, วัตถุประสงค์..."
                    value={reservedSearchTerm}
                    onChange={(e) => setReservedSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)]"
                  />
                  {reservedSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setReservedSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List of Reserved / Reclaimed Numbers */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
              {(() => {
                const matchesType = (itemType: string, filterType: string) => {
                  if (filterType === 'ALL') return true;
                  if (filterType === 'หนังสือภายนอก') {
                    return itemType === 'หนังสือภายนอก' || itemType === 'หนังสือส่ง';
                  }
                  if (filterType === 'หนังสือรับ') {
                    return itemType === 'หนังสือรับ' || itemType === 'หนังสือเข้า';
                  }
                  return itemType === filterType;
                };

                const filtered = reservedNumbers.filter(item => {
                  if (reservedFilterStatus !== 'ALL' && item.status !== reservedFilterStatus) return false;
                  if (!matchesType(item.docType || '', reservedFilterType)) return false;
                  
                  if (reservedFilterDate) {
                    const itemDate = (item.reservedDate || item.createdAt || '').split('T')[0];
                    if (itemDate !== reservedFilterDate) return false;
                  }

                  if (reservedSearchTerm.trim()) {
                    const term = reservedSearchTerm.toLowerCase();
                    const numStr = (item.numberString || '').toLowerCase();
                    const byStr = (item.reservedBy || '').toLowerCase();
                    const forStr = (item.reservedFor || '').toLowerCase();
                    const deptStr = (item.department || '').toLowerCase();
                    const seqStr = String(item.seqNumber || '');
                    return numStr.includes(term) || byStr.includes(term) || forStr.includes(term) || deptStr.includes(term) || seqStr.includes(term);
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-[var(--text-muted)] space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Bookmark className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[var(--text-primary)]">ไม่พบรายการเลขจองตรงตามเงื่อนไข</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {reservedFilterType !== 'ALL' && `ประเภท: "${reservedFilterType}" `}
                          {reservedFilterDate && `วันที่: "${formatThaiDate(reservedFilterDate)}" `}
                          {reservedSearchTerm && `ค้นหา: "${reservedSearchTerm}"`}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReservedFilterType('ALL');
                            setReservedFilterDate('');
                            setReservedSearchTerm('');
                            setReservedFilterStatus('available');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-xs text-[var(--text-primary)] font-semibold transition-colors cursor-pointer"
                        >
                          ล้างตัวกรองทั้งหมดเพื่อดูเลขทั้งหมด
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {/* Active Filter Status Indicator */}
                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
                      <span className="flex items-center gap-1.5">
                        <span className="font-bold text-[var(--text-primary)]">{filtered.length}</span> รายการที่ตรงกับเงื่อนไข
                        {reservedFilterType !== 'ALL' && (
                          <span className="px-2 py-0.5 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-semibold text-[11px]">
                            {reservedFilterType}
                          </span>
                        )}
                        {reservedFilterDate && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold text-[11px]">
                            วันที่ {formatThaiDate(reservedFilterDate)}
                          </span>
                        )}
                      </span>
                      {(reservedFilterType !== 'ALL' || reservedFilterDate || reservedSearchTerm) && (
                        <button
                          type="button"
                          onClick={() => {
                            setReservedFilterType('ALL');
                            setReservedFilterDate('');
                            setReservedSearchTerm('');
                          }}
                          className="text-[11px] text-[var(--primary-color)] hover:underline cursor-pointer"
                        >
                          แสดงทั้งหมด ({reservedNumbers.length})
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filtered.map(item => {
                        const isAvailable = item.status === 'available';
                        const isReclaimed = item.type === 'reclaimed';
                        const isSelected = selectedReservedId === item.id;

                        return (
                          <div
                            key={item.id}
                            className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                                : isAvailable
                                ? 'bg-[var(--bg-overlay)] border-[var(--border-light)] hover:border-amber-500/50 hover:shadow-md'
                                : 'bg-[var(--bg-canvas)] border-[var(--border-light)] opacity-60'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isReclaimed ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                  }`}>
                                    {isReclaimed ? '♻️ เลขคืนเข้าคลัง' : '📌 เลขจองล่วงหน้า'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                                    {item.docType}
                                  </span>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  isAvailable ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-gray-500/15 text-gray-500'
                                }`}>
                                  {isAvailable ? 'พร้อมใช้งาน' : 'ถูกใช้งานแล้ว'}
                                </span>
                              </div>

                              <div className="font-mono font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                                <span>{item.numberString}</span>
                                {item.year && <span className="text-xs text-[var(--text-muted)] font-normal">({item.year})</span>}
                              </div>

                              <div className="text-xs text-[var(--text-secondary)] space-y-1 bg-[var(--bg-canvas)] p-2.5 rounded-lg border border-[var(--border-light)]">
                                <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-medium">
                                  <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                                  <span>วันที่จอง: {formatThaiDateString(item.reservedDate || item.createdAt)}</span>
                                </div>
                                <div><span className="text-[var(--text-muted)]">หน่วยงาน:</span> {item.department || 'ทุกฝ่ายงาน'}</div>
                                <div><span className="text-[var(--text-muted)]">ผู้จอง/คืน:</span> {item.reservedBy || '-'}</div>
                                {item.reservedFor && (
                                  <div className="text-[11px] text-[var(--text-muted)] line-clamp-2">
                                    <span className="text-[var(--text-secondary)] font-medium">วัตถุประสงค์:</span> {item.reservedFor}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-end pt-1">
                              {isAvailable ? (
                                <button
                                  type="button"
                                  onClick={() => {
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
                                    setShowReservedModal(false);
                                  }}
                                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                                    isSelected
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-amber-500/20 hover:bg-amber-500 text-amber-800 dark:text-amber-200 hover:text-white'
                                  }`}
                                >
                                  <Check className="w-4 h-4" />
                                  {isSelected ? 'เลือกเลขนี้แล้ว' : 'เลือกใช้เลขนี้'}
                                </button>
                              ) : (
                                <span className="text-xs text-[var(--text-muted)] italic">
                                  ถูกใช้งานแล้ว {item.usedAt ? `เมื่อ ${new Date(item.usedAt).toLocaleDateString('th-TH')}` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-[var(--border-light)] bg-[var(--bg-surface)] flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>เคล็ดลับ: เมื่อบันทึกเอกสารแล้ว ระบบจะทำเครื่องหมายว่าเลขนี้ถูกใช้งานแล้วให้อัตโนมัติ</span>
              <button
                type="button"
                onClick={() => setShowReservedModal(false)}
                className="px-4 py-2 rounded-lg border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)] cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

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
