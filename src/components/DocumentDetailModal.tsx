import React, { useState, useEffect } from 'react';
import { DocumentItem, TrackingLog, Folder, formatThaiDate, formatThaiDateFull, formatThaiDateTime } from '../types';
import { X, Printer, Clock, Paperclip, Send, ChevronRight, User, CheckCircle2, Edit2, ExternalLink, Download, FileText, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import AiCrossReferencePanel, { DetectionResult } from './AiCrossReferencePanel';

interface Props {
  doc: DocumentItem;
  allDocuments?: DocumentItem[];
  onClose: () => void;
  user?: any;
  onStatusUpdated?: () => void;
  onEdit?: (doc: DocumentItem) => void;
  onSelectDoc?: (doc: DocumentItem) => void;
}

export default function DocumentDetailModal({ doc, allDocuments, onClose, user, onStatusUpdated, onEdit, onSelectDoc }: Props) {
  const [activeTab, setActiveTab] = useState<'details' | 'tracking'>('details');
  const [trackingLogs, setTrackingLogs] = useState<TrackingLog[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [newStatus, setNewStatus] = useState(doc.status || 'ลงทะเบียน');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Cross-Reference State
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  // Forwarding state
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [departmentsList, setDepartmentsList] = useState<{ id: string; name: string }[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [forwardNote, setForwardNote] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);

  // Department receive state
  const [isReceivingDept, setIsReceivingDept] = useState(false);

  // Fetch tracking history for this document
  const fetchTracking = async () => {
    try {
      const res = await fetch(`/api/tracking/${doc.id}`);
      if (res.ok) {
        const data = await res.json();
        setTrackingLogs(data);
      }
    } catch (err) {
      console.error('Error fetching tracking logs:', err);
    }
  };

  // Fetch folders and departments
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const res = await fetch('/api/folders');
        if (res.ok) {
          const data = await res.json();
          setFolders(data);
        }
      } catch (err) {
        console.error('Error fetching folders:', err);
      }
    };
    const fetchDepts = async () => {
      try {
        const res = await fetch('/api/departments');
        if (res.ok) {
          const data = await res.json();
          setDepartmentsList(data);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    fetchFolders();
    fetchDepts();
    fetchTracking();
    handleRunAiCrossRef();
  }, [doc.id]);

  const handleRunAiCrossRef = async () => {
    setIsDetecting(true);
    try {
      const res = await fetch('/api/ai/detect-cross-references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc: {
            id: doc.id,
            docNumber: doc.docNumber,
            title: doc.title,
            from: doc.from,
            to: doc.to,
            date: doc.date,
            note: doc.note,
            content: doc.content
          },
          currentDocId: doc.id
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.result) {
          setDetectionResult(data.result);
          setIsDetecting(false);
          return;
        }
      }
    } catch (err) {
      // Ignore network fetch error and fallback to local check below
    }

    // Local fallback check if API call fails
    if (allDocuments && allDocuments.length > 0) {
      const targetTitle = (doc.title || '').toLowerCase();
      const targetDocNum = (doc.docNumber || '').toLowerCase();
      const matched: any[] = [];
      let isDup = false;

      for (const c of allDocuments) {
        if (c.id === doc.id) continue;
        const cNum = (c.docNumber || '').toLowerCase();
        const cTitle = (c.title || '').toLowerCase();

        if (cNum && targetDocNum && cNum === targetDocNum) {
          isDup = true;
          matched.push({
            docId: c.id,
            docNumber: c.docNumber,
            title: c.title,
            date: c.date,
            from: c.from,
            type: c.type,
            relationType: 'duplicate',
            relationLabel: 'หนังสือซ้ำ',
            similarityScore: 98,
            reason: `พบเลขที่หนังสือซ้ำกัน (${c.docNumber})`,
            actionSuggestion: 'คลิกเพื่อดูเอกสารเดิม'
          });
        } else if (cTitle && targetTitle && (cTitle.includes(targetTitle) || targetTitle.includes(cTitle))) {
          matched.push({
            docId: c.id,
            docNumber: c.docNumber,
            title: c.title,
            date: c.date,
            from: c.from,
            type: c.type,
            relationType: 'same_project',
            relationLabel: 'เรื่องที่เกี่ยวข้องกัน',
            similarityScore: 80,
            reason: `พบบริบทเรื่องที่เกี่ยวข้องกัน (${c.title})`,
            actionSuggestion: 'คลิกเพื่อดูเอกสารเดิม'
          });
        }
      }

      setDetectionResult({
        hasDuplicates: isDup,
        duplicateSummary: isDup ? 'พบหนังสือที่มีเลขที่ซ้ำในระบบ' : 'ไม่พบหนังสือซ้ำ',
        hasReferences: matched.length > 0,
        referenceSummary: matched.length > 0 ? `พบหนังสือเดิมที่เกี่ยวข้อง ${matched.length} ฉบับ` : 'ไม่พบหนังสือเดิมที่เกี่ยวข้อง',
        detectedItems: matched
      });
    } else {
      setDetectionResult({
        hasDuplicates: false,
        duplicateSummary: 'ไม่พบหนังสือซ้ำ',
        hasReferences: false,
        referenceSummary: 'ไม่พบหนังสือเดิมที่เกี่ยวข้อง',
        detectedItems: []
      });
    }
    setIsDetecting(false);
  };

  const handleViewDocById = (targetDocId: string) => {
    if (onSelectDoc && allDocuments) {
      const target = allDocuments.find(d => d.id === targetDocId);
      if (target) {
        onSelectDoc(target);
        return;
      }
    }
    // Fallback alert
    alert(`กำลังนำท่านไปยังเอกสาร ID: ${targetDocId}`);
  };

  const handleForwardToDepartments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDepts.length === 0) {
      alert('กรุณาเลือกฝ่ายงานที่ต้องการส่งต่ออย่างน้อย 1 ฝ่าย');
      return;
    }
    setIsForwarding(true);
    try {
      const forwardedByName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'สารบรรณกลาง';
      const res = await fetch('/api/documents/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: doc.id,
          docType: doc.type,
          targetDepartments: selectedDepts,
          forwardNote: forwardNote,
          forwardedBy: forwardedByName
        })
      });

      if (res.ok) {
        doc.forwardedTo = selectedDepts.join(',');
        doc.forwardNote = forwardNote;
        doc.forwardedBy = forwardedByName;
        doc.status = 'ส่งต่อกลุ่มงาน';
        setNewStatus('ส่งต่อกลุ่มงาน');
        setIsForwardModalOpen(false);
        await fetchTracking();
        if (onStatusUpdated) onStatusUpdated();
      } else {
        alert('เกิดข้อผิดพลาดในการส่งต่อหนังสือ');
      }
    } catch (err) {
      console.error('Error forwarding document:', err);
      alert('ไม่สามารถส่งต่อหนังสือได้');
    } finally {
      setIsForwarding(false);
    }
  };

  const handleDepartmentReceive = async () => {
    if (!user || !user.department) return;
    setIsReceivingDept(true);
    try {
      const forwardedByName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'ผู้ใช้งาน';
      const res = await fetch(`/api/documents/${doc.id}/receive-department`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: user.department,
          username: forwardedByName,
          year: doc.year || new Date().getFullYear() + 543 + '',
          docType: doc.type
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (!doc.departmentReceives) doc.departmentReceives = [];
        doc.departmentReceives.push({
          id: Date.now(),
          docId: doc.id,
          department: user.department,
          receiveNumber: data.receiveNumber,
          year: doc.year || new Date().getFullYear() + 543 + '',
          receivedAt: new Date().toISOString(),
          receivedBy: forwardedByName
        });
        await fetchTracking();
        alert(`ลงรับหนังสือสำเร็จ เลขรับของฝ่ายคือ ${data.receiveNumber}/${doc.year}`);
        if (onStatusUpdated) onStatusUpdated();
      } else {
        const errData = await res.json();
        alert('เกิดข้อผิดพลาด: ' + (errData.error || 'ไม่สามารถลงรับได้'));
      }
    } catch (err) {
      console.error('Error receiving dept:', err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsReceivingDept(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) return;
    setIsSubmitting(true);

    try {
      const updaterName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'ผู้ใช้งานระบบ';
      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: doc.id,
          docType: doc.type,
          status: newStatus,
          comments: comments || `อัปเดตสถานะเป็น: ${newStatus}`,
          updatedBy: updaterName
        })
      });

      if (response.ok) {
        setComments('');
        doc.status = newStatus; // Local state sync
        await fetchTracking();
        if (onStatusUpdated) {
          onStatusUpdated();
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFolderLabel = () => {
    if (!doc.folderId) return 'สารบรรณทั่วไป';
    const folderObj = folders.find(f => Number(f.id) === Number(doc.folderId));
    return folderObj ? folderObj.name : 'สารบรรณทั่วไป';
  };

  const getStatusBadgeColor = (statusName: string) => {
    switch (statusName) {
      case 'ลงทะเบียน':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'เสนอผู้บริหาร':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'ส่งต่อกลุ่มงาน':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'เสร็จสิ้น':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'ไม่อนุมัติ':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const detailRow = (label: string, value: React.ReactNode) => (
    <div className="flex flex-col sm:flex-row border-b border-[var(--border-lighter)]/60 py-3 last:border-0 gap-1 sm:gap-4">
      <div className="w-full sm:w-48 sm:shrink-0 font-medium text-[var(--text-secondary)] text-[0.85rem]">{label}</div>
      <div className="flex-1 text-[var(--text-primary)] text-[0.95rem]">{value || '-'}</div>
    </div>
  );

  const formattedRegDate = () => {
    return formatThaiDateFull(doc.registerDate);
  };

  const formattedDocDate = () => {
    return formatThaiDate(doc.date);
  };

  const docTypeName = {
    inbox: 'หนังสือรับ',
    outbox: 'หนังสือส่ง',
    admin: 'เอกสารงานธุรการ'
  }[doc.type] || 'เอกสารทั่วไป';

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl w-full max-w-5xl h-[92vh] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border-light)] bg-gradient-to-b from-white/[0.02] to-transparent shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-noto-serif-thai font-semibold text-[var(--text-primary)]">รายละเอียดหนังสือราชการ</h2>
              <span className={`px-2 py-0.5 text-xs font-mono font-medium rounded-full border ${getStatusBadgeColor(doc.status || 'ลงทะเบียน')}`}>
                {doc.status || 'ลงทะเบียน'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-mono">
              ประเภท: {docTypeName} {doc.category ? `(${doc.category === 'order' ? 'คำสั่ง' : doc.category === 'announcement' ? 'ประกาศ' : 'หนังสือรับรอง'})` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(user?.role === 'admin' || !user?.role) && (
              <button 
                onClick={() => {
                  setSelectedDepts(doc.forwardedTo ? doc.forwardedTo.split(',') : (doc.department ? [doc.department] : []));
                  setForwardNote(doc.forwardNote || '');
                  setIsForwardModalOpen(true);
                }}
                className="p-1.5 sm:p-2 text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors flex items-center gap-1.5 text-xs sm:text-sm border border-purple-500/30 cursor-pointer font-medium"
                title="ส่งต่อหนังสือให้ฝ่าย/กลุ่มงานปฏิบัติ"
              >
                <Send className="w-4 h-4" /> <span className="hidden sm:inline">ส่งต่อให้ฝ่าย</span>
              </button>
            )}
            {onEdit && (
              <button 
                onClick={() => onEdit(doc)}
                className="p-1.5 sm:p-2 text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 rounded-lg transition-colors flex items-center gap-1.5 text-xs sm:text-sm border border-amber-400/30 cursor-pointer"
                title="แก้ไขข้อมูลเอกสาร"
              >
                <Edit2 className="w-4 h-4" /> <span className="hidden sm:inline">แก้ไขข้อมูล</span>
              </button>
            )}
            <button 
              onClick={() => window.print()}
              className="p-1.5 sm:p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-lighter)] rounded-lg transition-colors flex items-center gap-1.5 text-xs sm:text-sm border border-[var(--border-light)] cursor-pointer"
            >
              <Printer className="w-4 h-4" /> <span className="hidden sm:inline">พิมพ์</span>
            </button>
            <button 
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 hover:bg-[var(--border-lighter)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Two Column Layout: Details on Left, Status Tracking Flow on Right */}
        <div id="printable-area" className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #printable-area, #printable-area * { visibility: visible; }
              #printable-area { position: absolute; top: 0; left: 0; width: 100%; }
              #printable-area .md\\:hidden { display: none !important; }
              #printable-area .hidden { display: block !important; }
              #printable-area .custom-scrollbar { overflow: visible !important; }
            }
          `}</style>
          
          {/* Mobile Tabs */}
          <div className="md:hidden flex bg-[var(--bg-surface)] border-b border-[var(--border-light)] shrink-0">
            <button 
              onClick={() => setActiveTab('details')} 
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'details' ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]' : 'text-[var(--text-secondary)]'}`}
            >
              รายละเอียด
            </button>
            <button 
              onClick={() => setActiveTab('tracking')} 
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'tracking' ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]' : 'text-[var(--text-secondary)]'}`}
            >
              ติดตามสถานะ
            </button>
          </div>

          {/* Column 1: Document Sheet Details */}
          <div className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-12 border-b md:border-b-0 md:border-r border-[var(--border-lighter)] custom-scrollbar ${activeTab === 'tracking' ? 'hidden md:block' : ''}`}>

            <div className="bg-[var(--bg-overlay)] rounded-xl border border-[var(--border-light)] p-4 sm:p-6 shadow-inner space-y-4">
              <div className="border-b border-[var(--border-lighter)] pb-3 flex justify-between items-center">
                <span className="text-xs font-mono text-[var(--text-muted)]">สารบรรณสารสนเทศ</span>
                <span className="text-xs font-mono font-medium text-[var(--primary-color)] bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/20 px-2 py-0.5 rounded">
                  {doc.type === 'admin' ? 'ทะเบียนธุรการ' : `เลขทะเบียน: ${doc.receiveNumber || '-'}`}
                </span>
              </div>
              
              <div className="flex flex-col divide-y divide-[var(--border-lighter)]/40">
                {detailRow('แฟ้มจัดเก็บดิจิทัล :', <span className="font-medium text-[#cfa851]">{getFolderLabel()}</span>)}
                {detailRow('ปีงบประมาณ :', doc.year)}
                {detailRow('วันลงทะเบียนในระบบ :', formattedRegDate())}
                {detailRow('เลขที่หนังสือ (ที่) :', <span className="font-mono font-medium text-[var(--text-primary)]">{doc.docNumber}</span>)}
                {detailRow('ลงวันที่ :', formattedDocDate())}
                {doc.type !== 'admin' && detailRow('ต้นทาง (จาก) :', doc.from)}
                {doc.type !== 'admin' && detailRow('ปลายทาง (ถึง) :', doc.to)}
                {detailRow('ความเร่งด่วน :', (
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                    doc.priority === 'ด่วนที่สุด' ? 'text-red-400 border-red-400/30 bg-red-400/10' :
                    doc.priority === 'ด่วนมาก' ? 'text-orange-400 border-orange-400/30 bg-orange-400/10' :
                    doc.priority === 'ด่วน' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' :
                    'text-gray-400 border-gray-400/30 bg-gray-400/10'
                  }`}>
                    {doc.priority}
                  </span>
                ))}
                {detailRow('ชั้นความลับ :', (
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                    doc.secrecy === 'ลับที่สุด' ? 'text-red-400 border-red-400/30 bg-red-400/10' :
                    doc.secrecy === 'ลับมาก' ? 'text-orange-400 border-orange-400/30 bg-orange-400/10' :
                    doc.secrecy === 'ลับ' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' :
                    'text-gray-400 border-gray-400/30 bg-gray-400/10'
                  }`}>
                    {doc.secrecy || 'ปกติ'}
                  </span>
                ))}
                {detailRow('เรื่อง :', <span className="font-semibold text-sm sm:text-base text-[var(--text-primary)] leading-relaxed">{doc.title}</span>)}
                {detailRow('ฝ่ายงานผู้ปฏิบัติ :', (
                  <div>
                    <div className="font-medium">{doc.department || 'ยังไม่ได้ระบุกลุ่มงาน'}</div>
                    {doc.assignee && <div className="text-xs text-[var(--text-secondary)] mt-1 font-mono">ผู้ดูแล/ผู้รับผิดชอบ: {doc.assignee}</div>}
                  </div>
                ))}
                {doc.forwardedTo && detailRow('ส่งต่อให้ฝ่ายงาน :', (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {doc.forwardedTo.split(',').map((d, idx) => (
                        <span key={idx} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          {d.trim()}
                        </span>
                      ))}
                    </div>
                    {doc.forwardNote && (
                      <p className="text-xs text-[var(--text-secondary)] font-mono bg-purple-500/5 p-2 rounded border border-purple-500/10">
                        คำสั่งการ/ข้อความส่งต่อ: "{doc.forwardNote}" ({doc.forwardedBy || 'สารบรรณกลาง'})
                      </p>
                    )}
                  </div>
                ))}
                
                {doc.forwardedTo && user?.department && doc.forwardedTo.includes(user.department) && user?.role !== 'admin' && detailRow('การลงรับของฝ่าย :', (
                  <div className="space-y-1.5">
                    {doc.departmentReceives?.find(r => r.department === user.department) ? (
                      <div className="text-sm text-green-500 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> 
                        รับแล้ว (เลขรับฝ่าย: {doc.departmentReceives.find(r => r.department === user.department)?.receiveNumber}/{doc.departmentReceives.find(r => r.department === user.department)?.year})
                      </div>
                    ) : (
                      <button 
                        onClick={handleDepartmentReceive}
                        disabled={isReceivingDept}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" /> 
                        {isReceivingDept ? 'กำลังลงรับ...' : 'ลงรับหนังสือของฝ่าย'}
                      </button>
                    )}
                  </div>
                ))}

                {detailRow('หมายเหตุ :', doc.note || '-')}
                
                {doc.content && detailRow('เนื้อหาสาระสำคัญ :', (
                  <div className="bg-[var(--bg-base)]/55 p-3 rounded border border-[var(--border-light)] text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap font-sans">
                    {doc.content}
                  </div>
                ))}

                {detailRow('ไฟล์แนบดิจิทัล :', (
                  <div>
                    {doc.attachments && doc.attachments.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs text-[var(--primary-color)] font-medium mb-1">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>มีไฟล์ Scan / Digital Attachments ({doc.attachments.length} ไฟล์):</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {doc.attachments.map((fileUrl, idx) => {
                            const rawName = fileUrl.split('/').pop() || fileUrl;
                            const nameParts = rawName.split('-');
                            const fileName = nameParts.length > 2 ? nameParts.slice(2).join('-') : rawName;
                            const folderPath = fileUrl.substring(0, fileUrl.lastIndexOf('/'));
                            return (
                              <div key={idx} className="flex items-center justify-between bg-[var(--bg-base)] p-2.5 rounded-lg border border-[var(--border-light)] text-xs">
                                <div className="flex items-center gap-2 truncate max-w-[65%]">
                                  <FileText className="w-4 h-4 text-[var(--primary-color)] shrink-0" />
                                  <div className="truncate">
                                    <div className="font-medium text-[var(--text-primary)] truncate" title={fileName}>{fileName}</div>
                                    <div className="text-[10px] text-[var(--text-muted)] font-mono">{folderPath}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
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
                                    className="px-2.5 py-1 rounded bg-[var(--primary-color)]/10 text-[var(--primary-color)] hover:bg-[var(--primary-color)] hover:text-white transition-colors flex items-center gap-1 font-medium text-[11px]"
                                  >
                                    <ExternalLink className="w-3 h-3" /> เปิดดูไฟล์
                                  </a>
                                  <a
                                    href={`/api/files/download?url=${encodeURIComponent(fileUrl)}&username=${encodeURIComponent(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'ผู้ใช้งาน')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      const url = `/api/files/download?url=${encodeURIComponent(fileUrl)}&username=${encodeURIComponent(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'ผู้ใช้งาน')}`;
                                      try {
                                        const res = await fetch(url);
                                        if (!res.ok) throw new Error('Network error');
                                        const blob = await res.blob();
                                        const blobUrl = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = blobUrl;
                                        a.download = fileName;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        window.URL.revokeObjectURL(blobUrl);
                                      } catch(err) {
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = fileName;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                      }
                                    }}
                                    className="px-2.5 py-1 rounded bg-[var(--border-lighter)] text-[var(--text-secondary)] hover:bg-[var(--border-medium)] transition-colors flex items-center gap-1 font-medium text-[11px]"
                                  >
                                    <Download className="w-3 h-3" /> ดาวน์โหลด
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[var(--text-muted)] italic text-xs py-1">
                        <Paperclip className="w-3.5 h-3.5 text-[var(--text-muted)]" /> ไม่พบไฟล์แนบในระบบ
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Duplicate & Cross-Reference Detector Section */}
            <div className="mt-5">
              <AiCrossReferencePanel
                result={detectionResult}
                isLoading={isDetecting}
                onRunDetection={handleRunAiCrossRef}
                onViewDoc={handleViewDocById}
              />
            </div>
          </div>

          {/* Column 2: Status Tracking timeline & Update action */}
          <div className={`w-full md:w-[380px] shrink-0 min-h-0 h-full max-h-full bg-[var(--bg-elevated)]/30 overflow-y-auto p-4 sm:p-6 pb-12 flex flex-col justify-between border-t md:border-t-0 custom-scrollbar ${activeTab === 'details' ? 'hidden md:block' : ''}`}>
            <div className="space-y-6 shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] font-noto-serif-thai border-b border-[var(--border-light)] pb-2 mb-3">
                  เส้นทางเดินหนังสือและการติดตามสถานะ
                </h3>
                
                {/* Timeline display */}
                <div className="relative pl-5 border-l-2 border-[var(--border-lighter)] space-y-4 mt-2">
                  {trackingLogs.map((log, index) => {
                    const isLast = index === trackingLogs.length - 1;
                    return (
                      <div key={log.id || index} className="relative group">
                        {/* Dot */}
                        <div className={`absolute -left-[26px] top-1 w-3.5 h-3.5 rounded-full border-2 bg-[var(--bg-surface)] transition-colors ${isLast ? 'border-green-400 ring-4 ring-green-400/10' : 'border-[var(--border-medium)]'}`} />
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`px-1.5 py-0.5 rounded text-[0.68rem] font-medium border ${getStatusBadgeColor(log.status)}`}>
                              {log.status}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                              {log.updatedAt ? formatThaiDateTime(log.updatedAt) : ''}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-primary)] font-medium leading-normal">{log.comments}</p>
                          <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                            <User className="w-3 h-3 opacity-60" />
                            <span>โดย: {log.updatedBy}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {trackingLogs.length === 0 && (
                    <div className="text-xs text-[var(--text-muted)] py-4 text-center">ไม่มีข้อมูลการติดตามการเดินเอกสาร</div>
                  )}
                </div>
              </div>
            </div>

            {/* Status Update Form */}
            <form onSubmit={handleUpdateStatus} className="border-t border-[var(--border-light)] pt-4 mt-6 space-y-3.5 shrink-0 pb-6">
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[var(--primary-color)]" /> ดำเนินการ/สั่งการเดินหนังสือ
              </h4>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[var(--text-muted)]">เปลี่ยนสถานะหนังสือเป็น :</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors font-medium text-blue-400"
                >
                  <option value="ลงทะเบียน">ลงทะเบียน</option>
                  <option value="เสนอผู้บริหาร">เสนอผู้บริหาร</option>
                  <option value="ส่งต่อกลุ่มงาน">ส่งต่อกลุ่มงาน</option>
                  <option value="เสร็จสิ้น">เสร็จสิ้น (ยุติเรื่อง)</option>
                  <option value="ไม่อนุมัติ">ไม่อนุมัติ/ยกเลิก</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[var(--text-muted)]">บันทึกข้อความสั่งการ / ความคิดเห็นเพิ่มเติม :</label>
                <textarea
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="เช่น มอบฝ่ายยุทธศาสตร์เร่งดำเนินการด่วน..."
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors placeholder-[var(--text-muted)] resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)]/20 text-[var(--primary-color)] border border-[var(--primary-color)]/30 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกสถานะการส่งหนังสือ'}</span>
              </button>
            </form>
          </div>

        </div>

        {/* Footer Meta */}
        <div className="p-3 sm:p-4 border-t border-[var(--border-light)] bg-[var(--bg-surface)] flex items-center justify-between text-xs text-[var(--text-secondary)] shrink-0">
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> สถิติลงทะเบียนเมื่อ {formattedRegDate()}</span>
          <span className="hidden sm:inline text-[var(--text-muted)] text-[10px]">ระบบ EDMS v2.1</span>
        </div>
      </div>

      {/* Modal Forwarding to Department */}
      {isForwardModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)] bg-purple-500/10">
              <h3 className="font-noto-serif-thai font-semibold text-base sm:text-lg text-purple-300 flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-400" /> ส่งต่อหนังสือให้ฝ่าย / กลุ่มงาน
              </h3>
              <button 
                onClick={() => setIsForwardModalOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleForwardToDepartments} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                  เลือกฝ่ายงานปลายทางที่ต้องการส่งต่อ : <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar p-2 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg">
                  {departmentsList.map((dept) => {
                    const isChecked = selectedDepts.includes(dept.name);
                    return (
                      <label 
                        key={dept.id} 
                        className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          isChecked 
                            ? 'bg-purple-500/10 border-purple-500/40 text-[var(--text-primary)] font-medium' 
                            : 'bg-[var(--bg-overlay)] border-[var(--border-lighter)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)]'
                        }`}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDepts(prev => [...prev, dept.name]);
                            } else {
                              setSelectedDepts(prev => prev.filter(d => d !== dept.name));
                            }
                          }}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-xs sm:text-sm">{dept.name}</span>
                      </label>
                    );
                  })}
                  {departmentsList.length === 0 && (
                    <div className="text-xs text-[var(--text-muted)] text-center py-3">ไม่พบรายการฝ่ายงาน</div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  คำสั่งการ / ข้อความหมายเหตุเพิ่มเติมถึงฝ่ายงาน :
                </label>
                <textarea 
                  rows={3}
                  value={forwardNote}
                  onChange={(e) => setForwardNote(e.target.value)}
                  placeholder="เช่น มอบหมายฝ่ายยุทธศาสตร์ฯ พิจารณาดำเนินการภายใน 3 วัน..."
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-3 text-xs text-[var(--text-primary)] outline-none focus:border-purple-500 transition-colors placeholder-[var(--text-muted)] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-light)]">
                <button 
                  type="button"
                  onClick={() => setIsForwardModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  disabled={isForwarding || selectedDepts.length === 0}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isForwarding ? 'กำลังส่งต่อ...' : 'ยืนยันการส่งต่อหนังสือ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
