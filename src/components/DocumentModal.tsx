import React, { useState, useEffect, useRef } from 'react';
import { DocumentItem, DocType, DocPriority, DocCategory, Folder as FolderType, User, formatThaiDate } from '../types';
import { X, Save, Paperclip, Upload, Trash2, FileText, Loader2, Folder, CheckCircle2, Calendar, Lock, Sparkles } from 'lucide-react';
import AiCrossReferencePanel, { DetectionResult, CrossReferenceItem } from './ai-cross-reference-panel';

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
  const [numberingRules, setNumberingRules] = useState<any[]>([]);
  const [reservedNumbers, setReservedNumbers] = useState<any[]>([]);
  const [showReservedModal, setShowReservedModal] = useState<boolean>(false);
  const [selectedReservedId, setSelectedReservedId] = useState<number | null>(null);

  const [formData, setFormData] = useState<Partial<DocumentItem>>({
    receiveNumber: '',
    year: currentYear ? String(currentYear) : '2569',
    docNumber: '',
    date: new Date().toISOString().split('T')[0],
    title: '',
    from: '',
    to: '',
    department: '',
    assignee: '',
    note: '',
    type: defaultType || 'inbox',
    category: 'order',
    priority: 'ปกติ',
    secrecy: 'ปกติ',
    content: '',
    folderId: null,
    status: 'ลงทะเบียน',
    attachments: []
  });

  // Fetch custom numbering rules & reserved numbers on mount
  useEffect(() => {
    const fetchNumberingAndReserved = async () => {
      try {
        const [rulesRes, reservedRes] = await Promise.all([
          fetch('/api/numbering-rules'),
          fetch('/api/reserved-numbers')
        ]);
        if (rulesRes.ok) {
          const rulesData = await rulesRes.json();
          setNumberingRules(rulesData);
        }
        if (reservedRes.ok) {
          const reservedData = await reservedRes.json();
          setReservedNumbers(reservedData);
        }
      } catch (err) {
        console.error('Error fetching numbering rules / reserved numbers:', err);
      }
    };
    fetchNumberingAndReserved();
  }, []);

  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [startSequence, setStartSequence] = useState<number>(1);
  const [organizations, setOrganizations] = useState<{id: number, name: string}[]>([]);
  const [fileCodes, setFileCodes] = useState<{id: number, code: string, name: string, department?: string}[]>([]);
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
        if (res.ok) {
          const data = await res.json();
          if (data.startSequence) setStartSequence(Number(data.startSequence));
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

  useEffect(() => {
    const fetchFileCodes = async () => {
      try {
        const res = await fetch('/api/file-codes');
        if (res.ok) {
          const data = await res.json();
          setFileCodes(data);
        }
      } catch (err) {
        console.error('Error fetching file-codes:', err);
      }
    };
    fetchFileCodes();
  }, []);

  const generateNumberInfo = (docType?: DocType, isCirc?: boolean, cat?: string, yr?: string) => {
    const targetType = docType || formData?.type || defaultType || 'inbox';
    const targetIsCircular = isCirc !== undefined ? isCirc : (formData?.isCircular || false);
    const targetCategory = cat || formData?.category || 'order';
    const targetYear = yr || formData?.year || (currentYear ? String(currentYear) : '2569');
    const targetDept = formData?.department || user?.department || 'ฝ่ายบริหารงานทั่วไป';

    let actualType = 'หนังสือภายนอก';
    if (targetType === 'admin') {
      actualType = targetCategory === 'order' ? 'คำสั่ง' : (targetCategory === 'announcement' ? 'ประกาศ' : 'หนังสือรับรอง');
    } else if (targetType === 'inbox') {
      actualType = 'หนังสือรับ';
    } else if (targetType === 'internal') {
      actualType = 'หนังสือภายใน';
    }

    let rule = numberingRules.find((r: any) => r.isActive && r.docType === actualType && r.department === targetDept);
    if (!rule) rule = numberingRules.find((r: any) => r.isActive && r.docType === actualType && r.department === 'ทุกฝ่ายงาน');
    if (!rule) rule = numberingRules.find((r: any) => r.isActive && r.docType === actualType);

    let existingMax = 0;
    if (targetType === 'admin') {
      const existing = documents.filter(d => d.type === 'admin' && d.category === targetCategory);
      existingMax = existing.reduce((max, d) => {
        const match = (d.docNumber || '').match(/(\d+)\s*\/\s*(\d+)/);
        if (match && match[2] === targetYear) return Math.max(max, parseInt(match[1], 10));
        const parts = (d.docNumber || '').split('/');
        const n = parseInt(parts[0], 10);
        return !isNaN(n) ? Math.max(max, n) : max;
      }, 0);
    } else {
      const filteredDocs = documents.filter(d => {
        if (d.year && d.year !== targetYear) return false;
        if (targetType === 'outbox') {
          return d.type === 'outbox' && !!d.isCircular === targetIsCircular;
        }
        return d.type === targetType;
      });
      existingMax = filteredDocs.reduce((max, d) => {
        const n = parseInt(d.receiveNumber || '0', 10);
        return !isNaN(n) ? Math.max(max, n) : max;
      }, 0);
    }

    const ruleStartSeq = rule ? Number(rule.currentSeq || 1) : 1;
    const finalSeq = Math.max(existingMax + 1, ruleStartSeq);

    let formattedNumber = '';
    if (targetType === 'admin') {
      const prefix = rule ? (rule.prefixPattern || actualType) : actualType;
      formattedNumber = `${prefix} ${finalSeq}/${targetYear}`;
    } else if (targetType === 'outbox') {
      const prefix = rule ? (rule.prefixPattern || 'รย 0021') : 'รย 0021';
      const circStr = targetIsCircular ? (prefix.includes('ว') ? '' : 'ว ') : '';
      formattedNumber = `${prefix}/${circStr}${finalSeq}`;
    } else {
      formattedNumber = String(finalSeq);
    }

    return { seq: String(finalSeq), docNumber: formattedNumber };
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

  // Sync outbox numbering logic
  useEffect(() => {
    if (formData.type === 'outbox') {
      const targetDept = formData.department || user?.department || 'ฝ่ายบริหารงานทั่วไป';
      let rule = numberingRules.find((r: any) => r.isActive && r.docType === 'หนังสือภายนอก' && r.department === targetDept);
      if (!rule) rule = numberingRules.find((r: any) => r.isActive && r.docType === 'หนังสือภายนอก' && r.department === 'ทุกฝ่ายงาน');
      if (!rule) rule = numberingRules.find((r: any) => r.isActive && r.docType === 'หนังสือภายนอก');
      const prefix = rule ? (rule.prefixPattern || 'รย 0021') : 'รย 0021';
      const circStr = formData.isCircular ? (prefix.includes('ว') ? '' : 'ว ') : '';
      const expectedDocNumber = `${prefix}/${circStr}${formData.receiveNumber || ''}`;
      if (formData.docNumber !== expectedDocNumber && !initialData) {
        setFormData(prev => ({
          ...prev,
          docNumber: expectedDocNumber
        }));
      }
    }
  }, [formData.type, formData.receiveNumber, formData.isCircular, formData.docNumber, initialData]);

  const handleIsCircularChange = (checked: boolean) => {
    const { seq, docNumber: newDocNumber } = generateNumberInfo('outbox', checked);
    setFormData(prev => ({
      ...prev,
      isCircular: checked,
      receiveNumber: seq,
      docNumber: newDocNumber
    }));
  };

  // Set default values upon opening
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        folderId: initialData.folderId ? Number(initialData.folderId) : null,
        fileCode: initialData.fileCode || '',
        status: initialData.status || 'ลงทะเบียน'
      });
    } else {
      const activeType = defaultType || 'inbox';
      const isCirc = activeType === 'outbox' ? (formData.isCircular || false) : false;
      const initCat = 'order';
      const initYear = currentYear ? String(currentYear) : '2569';
      const { seq, docNumber: initDocNum } = generateNumberInfo(activeType, isCirc, initCat, initYear);
      setFormData(prev => ({
        ...prev,
        type: activeType,
        category: initCat,
        receiveNumber: seq,
        docNumber: initDocNum,
        year: initYear,
        status: 'ลงทะเบียน',
        department: user?.department || prev.department || '',
        folderId: null,
        fileCode: '',
        from: activeType === 'outbox' ? 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง' : prev.from
      }));
    }
  }, [initialData, defaultType, documents, currentYear, numberingRules]);

  const handleTypeChange = (newType: DocType) => {
    if (!initialData) {
      const isCirc = newType === 'outbox' ? (formData.isCircular || false) : false;
      const initCat = formData.category || 'order';
      const initYear = formData.year || currentYear || '2569';
      const { seq, docNumber: newDocNum } = generateNumberInfo(newType, isCirc, initCat, String(initYear));
      setFormData(prev => ({
        ...prev,
        type: newType,
        receiveNumber: seq,
        docNumber: newDocNum,
        year: currentYear ? String(currentYear) : (prev.year || '2569'),
        from: newType === 'outbox' ? 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง' : prev.from
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        type: newType,
        year: currentYear ? String(currentYear) : (prev.year || '2569')
      }));
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
    if (!initialData && formData.type === 'admin' && (field === 'category' || field === 'year')) {
      const cat = field === 'category' ? value : (formData.category || 'order');
      const yr = field === 'year' ? value : (formData.year || '2569');
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
      const uploadData = new FormData();
      // Append text fields FIRST so multer can parse them before receiving files
      const docType = formData.type || 'inbox';
      const category = formData.category || '';
      uploadData.append('docType', docType);
      uploadData.append('category', category);
      
      Array.from(filesToUpload).forEach(file => {
        uploadData.append('files', file);
      });

      // Also pass parameters via query string to guarantee availability
      const queryParams = new URLSearchParams({
        docType: docType,
        category: category,
        uploadedBy: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'ผู้ใช้งาน'
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
        alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
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

  const removeAttachment = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    const newDoc: DocumentItem = {
      ...formData as DocumentItem,
      id: initialData?.id || `DOC-${Math.floor(Math.random() * 100000)}`,
      registerDate: initialData?.registerDate || new Date().toISOString(),
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 lg:p-6 border-b border-[var(--border-light)] bg-gradient-to-b from-white/[0.02] to-transparent">
          <div>
            <h2 className="text-xl font-noto-serif-thai font-semibold text-[var(--text-primary)]">
              {initialData ? 'แก้ไขข้อมูลเอกสาร' : 'ลงทะเบียนและบันทึกเอกสาร'}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              ระบบงานธุรการและสารบรรณอิเล็กทรอนิกส์ สำนักงานจังหวัด
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 hover:bg-[var(--border-lighter)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 lg:p-6 custom-scrollbar">
          <form id="doc-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${formData.type === 'outbox' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-5`}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">ประเภทระบบงาน <span className="text-red-400">*</span></label>
                <select 
                  value={formData.type}
                  onChange={(e) => handleTypeChange(e.target.value as DocType)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors"
                >
                  <option value="inbox">หนังสือรับ</option>
                  <option value="outbox">หนังสือส่ง</option>
                  <option value="admin">งานธุรการ</option>
                </select>
              </div>

              {formData.type === 'admin' ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">หมวดหมู่เอกสาร <span className="text-red-400">*</span></label>
                  <select 
                    value={formData.category || 'order'}
                    onChange={(e) => handleChange('category', e.target.value as DocCategory)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors font-medium"
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
                      <label className="text-sm font-medium text-[var(--text-secondary)]">
                        เลขทะเบียนส่ง <span className="text-red-400">*</span>
                      </label>
                      <span className="text-[11px] font-normal text-[var(--text-muted)] bg-[var(--bg-canvas)] px-2 py-0.5 rounded border border-[var(--border-light)] flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                        อัตโนมัติ
                      </span>
                    </div>
                    <input 
                      readOnly
                      type="text" 
                      value={formData.receiveNumber || ''}
                      placeholder="ระบบสร้างให้อัตโนมัติ"
                      title="เลขทะเบียนส่งรันตามลำดับระบบอัตโนมัติ ไม่สามารถแก้ไขได้"
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-muted)] cursor-not-allowed font-mono opacity-85 select-none focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-center">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">รูปแบบหนังสือส่ง</label>
                    <div className="flex items-center gap-3 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={formData.isCircular || false}
                          onChange={(e) => handleIsCircularChange(e.target.checked)}
                          className="w-4 h-4 rounded border-[var(--border-light)] text-[var(--primary-color)] focus:ring-[var(--primary-color)] bg-[var(--bg-overlay)]"
                        />
                        <span className="text-sm font-medium text-[var(--text-primary)]">หนังสือเวียน</span>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">
                      เลขทะเบียนรับ <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[11px] font-normal text-[var(--text-muted)] bg-[var(--bg-canvas)] px-2 py-0.5 rounded border border-[var(--border-light)] flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                      อัตโนมัติ
                    </span>
                  </div>
                  <input 
                    readOnly
                    type="text" 
                    value={formData.receiveNumber || ''}
                    placeholder="ระบบสร้างให้อัตโนมัติ"
                    title="เลขทะเบียนรับรันตามลำดับระบบอัตโนมัติ ไม่สามารถแก้ไขได้"
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-muted)] cursor-not-allowed font-mono opacity-85 select-none focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">
                  ปีพุทธศักราช <span className="text-red-400">*</span>
                </label>
                <input 
                  readOnly
                  type="text" 
                  value={formData.year || ''}
                  placeholder="ปีพุทธศักราช"
                  title="ปีพุทธศักราชถูกกำหนดตามปีปัจจุบันอัตโนมัติ ไม่สามารถแก้ไขได้"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-muted)] cursor-not-allowed font-mono opacity-85 select-none focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">
                    {formData.type === 'admin' ? 'เลขที่ประกาศ/คำสั่ง' : 'ที่หนังสือ'} <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowReservedModal(true)}
                      className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 transition-colors"
                      title="เลือกเลขจากคลังจองล่วงหน้า หรือเลขที่คืนเข้าคลัง"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      เลือกจากเลขจอง/เลขคืน
                    </button>
                    {(formData.type === 'outbox' || formData.type === 'admin') && !selectedReservedId && (
                      <span className="text-[11px] font-normal text-[var(--text-muted)] bg-[var(--bg-canvas)] px-2 py-0.5 rounded border border-[var(--border-light)] flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                        อัตโนมัติ
                      </span>
                    )}
                  </div>
                </div>
                <input 
                  required
                  type="text" 
                  value={formData.docNumber || ''}
                  onChange={(e) => handleChange('docNumber', e.target.value)}
                  placeholder={formData.type === 'admin' ? 'เช่น คำสั่งที่ 12/2569' : 'เช่น รย 0021/1'}
                  className="w-full border border-[var(--border-light)] rounded-lg px-4 py-2.5 outline-none transition-colors placeholder-[var(--text-muted)] bg-[var(--bg-overlay)] text-[var(--text-primary)] focus:border-[var(--primary-color)] font-mono"
                />
                {selectedReservedId && (
                  <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
                    <span>ใช้เลขจองล่วงหน้า #{selectedReservedId}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReservedId(null);
                      }}
                      className="text-rose-600 font-semibold hover:underline"
                    >
                      ยกเลิกและรันปกติ
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">ลงวันที่ <span className="text-red-400">*</span></label>
                <div className="relative flex items-center cursor-pointer group">
                  <input 
                    type="text"
                    readOnly
                    value={formData.date ? formatThaiDate(formData.date) : ''}
                    placeholder="เลือกวันที่"
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg pl-4 pr-10 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors cursor-pointer select-none"
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
                <label className="text-sm font-medium text-[var(--text-secondary)]">ความเร่งด่วน</label>
                <select 
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value as DocPriority)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors"
                >
                  <option value="ปกติ">ปกติ</option>
                  <option value="ด่วน">ด่วน</option>
                  <option value="ด่วนมาก">ด่วนมาก</option>
                  <option value="ด่วนที่สุด">ด่วนที่สุด</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">ชั้นความลับ</label>
                <select 
                  value={formData.secrecy || 'ปกติ'}
                  onChange={(e) => handleChange('secrecy', e.target.value as any)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors"
                >
                  <option value="ปกติ">ปกติ</option>
                  <option value="ลับ">ลับ</option>
                  <option value="ลับมาก">ลับมาก</option>
                  <option value="ลับที่สุด">ลับที่สุด</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)]">เรื่อง <span className="text-red-400">*</span></label>
              <input 
                required
                type="text" 
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="กรุณาระบุชื่อเรื่อง"
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors placeholder-[var(--text-muted)]"
              />
            </div>

            {formData.type !== 'admin' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">จาก <span className="text-red-400">*</span></label>
                  <input 
                    required
                    type="text" 
                    value={formData.from || ''}
                    list="organization-list"
                    onChange={(e) => handleChange('from', e.target.value)}
                    placeholder="หน่วยงานต้นทาง"
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors placeholder-[var(--text-muted)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">ถึง <span className="text-red-400">*</span></label>
                  <input 
                    required
                    type="text" 
                    value={formData.to || ''}
                    list="organization-list"
                    onChange={(e) => handleChange('to', e.target.value)}
                    placeholder="หน่วยงานปลายทาง"
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors placeholder-[var(--text-muted)]"
                  />
                </div>

                <datalist id="organization-list">
                  {organizations.map(org => (
                    <option key={org.id} value={org.name} />
                  ))}
                </datalist>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">แฟ้มเอกสารดิจิทัล</label>
                <select 
                  value={formData.folderId || ''}
                  onChange={(e) => handleChange('folderId', e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors"
                >
                  <option value="">-- ไม่จัดเก็บเข้าแฟ้มพิเศษ (เก็บเข้าสารบรรณทั่วไป) --</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">รหัสหมวดแฟ้ม / รูปแบบเลขหนังสือ</label>
                <input 
                  type="text" 
                  value={formData.fileCode || ''}
                  list="file-code-list"
                  onChange={(e) => handleChange('fileCode', e.target.value)}
                  placeholder="เลือกรหัสแฟ้มหรือพิมพ์ค้นหา..."
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors placeholder-[var(--text-muted)] font-mono"
                />
                <datalist id="file-code-list">
                  {fileCodes.map(fc => (
                    <option key={fc.id} value={fc.code}>{fc.code} - {fc.name} {fc.department ? `(${fc.department})` : ''}</option>
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">สถานะเอกสารปัจจุบัน</label>
                <select 
                  value={formData.status || 'ลงทะเบียน'}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors font-medium text-blue-400"
                >
                  <option value="ลงทะเบียน">ลงทะเบียน</option>
                  <option value="เสนอผู้บริหาร">เสนอผู้บริหาร</option>
                  <option value="ส่งต่อกลุ่มงาน">ส่งต่อกลุ่มงาน/ฝ่ายปฏิบัติ</option>
                  <option value="เสร็จสิ้น">เสร็จสิ้น (ยุติเรื่อง)</option>
                  <option value="ไม่อนุมัติ">ไม่อนุมัติ/ยกเลิก</option>
                </select>
              </div>
            </div>

            {formData.type === 'inbox' && !initialData ? (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                  <span>ℹ️ ขั้นตอนการลงรับหนังสือกลาง</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  สำหรับการลงทะเบียนหนังสือรับ (หนังสือกลาง) เมื่อบันทึกข้อมูลและเลขทะเบียนรับแล้ว ระบบจะกำหนดสถานะเป็น <b>"ลงทะเบียน"</b> โดยท่านจะต้องกด <b>"ส่งต่อให้ฝ่าย"</b> จากหน้ารายละเอียดเอกสารในขั้นตอนถัดไป ก่อนที่จะเข้าสู่กระบวนการมอบหมายฝ่ายป้องกันและปฏิบัติการและผู้รับผิดชอบหลักตามระเบียบงานสารบรรณ
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">กลุ่มงานที่ได้รับมอบหมาย</label>
                  <select 
                    value={formData.department || ''}
                    onChange={(e) => handleChange('department', e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors"
                  >
                    <option value="">-- เลือกกลุ่มปฏิบัติ/ฝ่าย --</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">ผู้รับผิดชอบหลัก <span className="text-xs text-[var(--text-muted)]">(ข้อมูลจากระบบผู้ใช้งาน)</span></label>
                  <select 
                    value={formData.assignee || ''}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const matchedUser = usersList.find(u => {
                        const fullName = `${u.firstName} ${u.lastName}`.trim();
                        return fullName === selectedName;
                      });
                      setFormData(prev => ({
                        ...prev,
                        assignee: selectedName,
                        department: (matchedUser?.department && !prev.department) ? matchedUser.department : prev.department
                      }));
                    }}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors"
                  >
                    <option value="">-- เลือกผู้รับผิดชอบหลักจากระบบ --</option>
                    {usersList.map(u => {
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
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)]">หมายเหตุ</label>
              <input 
                type="text" 
                value={formData.note || ''}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors placeholder-[var(--text-muted)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)]">เนื้อหาอย่างย่อ / สาระสำคัญของหนังสือ</label>
              <textarea 
                rows={3}
                value={formData.content || ''}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="ระบุเนื้อหา/สรุปสาระสำคัญของเอกสาร..."
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors placeholder-[var(--text-muted)] resize-y"
              />
            </div>

            {/* AI Duplicate & Cross-Reference Detector Section */}
            <AiCrossReferencePanel
              result={detectionResult}
              isLoading={isDetecting}
              onRunDetection={handleRunAiCrossRef}
              onAttachRef={handleAttachRef}
            />

            {/* File Attachment Section */}
            <div className="space-y-2 pt-2 border-t border-[var(--border-light)]">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-[var(--primary-color)]" />
                  <span>แนบไฟล์เอกสาร Scan / Digital Attachments</span>
                </label>
                <div className="flex items-center gap-1.5 text-xs text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2.5 py-1 rounded-md border border-[var(--primary-color)]/20">
                  <Folder className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono text-[11px] font-semibold">{getTargetFolderLabel()}</span>
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
                className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/10 scale-[0.99]' 
                    : 'border-[var(--border-medium)] bg-[var(--border-lighter)] hover:bg-[var(--border-light)] hover:border-[var(--primary-color)]/50'
                } ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Loader2 className="w-8 h-8 text-[var(--primary-color)] animate-spin" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">กำลังอัปโหลดและจัดเก็บไฟล์เข้าโฟลเดอร์...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-overlay)] flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5 text-[var(--primary-color)]" />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">คลิกเพื่อเลือกไฟล์ หรือ ลากและวางไฟล์ที่นี่</span>
                    <span className="text-xs text-[var(--text-muted)] mt-1">รองรับไฟล์ PDF, Word, Excel, JPG, PNG, ZIP (จำกัดไม่เกิน 30MB/ไฟล์)</span>
                  </>
                )}
              </div>

              {/* Uploaded Files List */}
              {formData.attachments && formData.attachments.length > 0 && (
                <div className="space-y-2 mt-3">
                  <div className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>รายการไฟล์แนบที่จัดเก็บแล้ว ({formData.attachments.length} ไฟล์):</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {formData.attachments.map((fileUrl, idx) => {
                      const rawName = fileUrl.split('/').pop() || fileUrl;
                      const nameParts = rawName.split('-');
                      const fileName = nameParts.length > 2 ? nameParts.slice(2).join('-') : rawName;
                      return (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-xs"
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
                            className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 rounded transition-colors shrink-0"
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
        <div className="p-5 lg:p-6 border-t border-[var(--border-light)] bg-[var(--bg-surface)] flex items-center justify-end gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-lighter)] transition-colors border border-transparent"
          >
            ยกเลิก
          </button>
          <button 
            type="submit"
            form="doc-form"
            className="flex items-center gap-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm border border-[var(--primary-color)]/50"
          >
            <Save className="w-4 h-4" /> บันทึกข้อมูล
          </button>
        </div>
      </div>
      
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
