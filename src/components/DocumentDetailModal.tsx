import React, { useState, useEffect } from 'react';
import { DocumentItem, TrackingLog, Folder, DigitalSignatureRecord, formatThaiDate, formatThaiDateFull, formatThaiDateTime } from '../types';
import { X, Printer, Clock, Paperclip, Send, ChevronRight, User, CheckCircle2, Edit2, ExternalLink, Download, FileText, Sparkles, GitBranch, ShieldCheck, PenTool, QrCode, FileCode, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import AiCrossReferencePanel, { DetectionResult } from './ai-cross-reference-panel';
import VersionControlPanel from './VersionControlPanel';
import DigitalSignatureModal from './DigitalSignatureModal';
import { parseFileCodeFromDoc, parseDocNumberStructure } from '../lib/fileCodeUtils';

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
  const [activeTab, setActiveTab] = useState<'details' | 'tracking' | 'versions' | 'reads'>('details');
  const [trackingLogs, setTrackingLogs] = useState<TrackingLog[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [newStatus, setNewStatus] = useState(doc.status || 'ลงทะเบียน');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read Receipts States
  const [readsList, setReadsList] = useState<any[]>([]);
  const [isFetchingReads, setIsFetchingReads] = useState(false);
  const [readsSearch, setReadsSearch] = useState('');
  const [readsFilter, setReadsFilter] = useState<'all' | 'read' | 'reading' | 'sent'>('all');

  const fetchReads = async () => {
    setIsFetchingReads(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/reads`);
      if (res.ok) {
        const data = await res.json();
        if (data.reads) {
          setReadsList(data.reads);
        }
      }
    } catch (err) {
      console.error('Error fetching reads:', err);
    } finally {
      setIsFetchingReads(false);
    }
  };

  const markAsReading = async () => {
    if (!user?.username) return;
    try {
      await fetch(`/api/documents/${doc.id}/reads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
          status: 'reading',
          docType: doc.type
        })
      });
      fetchReads();
    } catch (err) {
      console.error('Error marking as reading:', err);
    }
  };

  const markAsRead = async () => {
    if (!user?.username) return;
    try {
      await fetch(`/api/documents/${doc.id}/reads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
          status: 'read',
          docType: doc.type
        })
      });
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

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

  // Digital Signature state
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [docSignatures, setDocSignatures] = useState<DigitalSignatureRecord[]>([]);

  // Document Verification QR Code State
  const [docQrCode, setDocQrCode] = useState<string>('');
  const [docVerifyUrl, setDocVerifyUrl] = useState<string>('');

  // Workflow & SLA State
  const [docWorkflow, setDocWorkflow] = useState<any | null>(null);
  const [workflowTemplates, setWorkflowTemplates] = useState<any[]>([]);
  const [selectedWorkflowTplId, setSelectedWorkflowTplId] = useState<string>('');
  const [isAssigningWorkflowDoc, setIsAssigningWorkflowDoc] = useState(false);
  const [wfActionNote, setWfActionNote] = useState('');
  const [isSubmittingWfAction, setIsSubmittingWfAction] = useState(false);

  const fetchDocWorkflow = async () => {
    try {
      const [resInst, resTpl] = await Promise.all([
        fetch('/api/workflows/instances').then(r => r.json()).catch(() => []),
        fetch('/api/workflows/templates').then(r => r.json()).catch(() => [])
      ]);
      if (Array.isArray(resTpl)) setWorkflowTemplates(resTpl);
      if (Array.isArray(resInst)) {
        const found = resInst.find((i: any) => String(i.docId) === String(doc.id) || i.docNumber === doc.docNumber);
        setDocWorkflow(found || null);
      }
    } catch (err) {
      console.error('Error fetching doc workflow:', err);
    }
  };

  const handleProgressDocWorkflow = async (action: 'approve' | 'reject' | 'escalate') => {
    if (!docWorkflow) return;
    setIsSubmittingWfAction(true);
    try {
      const updaterName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'ผู้ดูแลระบบ';
      if (action === 'escalate') {
        await fetch(`/api/workflows/instances/${docWorkflow.id}/escalate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            note: wfActionNote || 'แจ้งเตือนเร่งรัดหนังสือค้างโต๊ะ ตามกำหนด SLA',
            user: updaterName
          })
        });
      } else {
        await fetch(`/api/workflows/instances/${docWorkflow.id}/step`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            note: wfActionNote,
            user: updaterName
          })
        });
      }

      // Sync tracking history
      await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: doc.id,
          docType: doc.type,
          status: action === 'approve' ? 'อนุมัติ/ส่งต่อ' : action === 'reject' ? 'ตีกลับเรื่อง' : 'เร่งรัด SLA',
          comments: `[Workflow SLA] ${wfActionNote || (action === 'approve' ? 'ผ่านการพิจารณาขั้นตอนเสนอเรื่อง' : action === 'reject' ? 'ตีกลับแก้ไขหนังสือ' : 'แจ้งเตือนเร่งรัดค้างโต๊ะตาม SLA')}`,
          updatedBy: updaterName
        })
      });

      setWfActionNote('');
      await fetchDocWorkflow();
      await fetchTracking();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      console.error('Error progressing doc workflow:', err);
    } finally {
      setIsSubmittingWfAction(false);
    }
  };

  const handleAssignDocWorkflow = async () => {
    if (!selectedWorkflowTplId) return;
    setIsAssigningWorkflowDoc(true);
    try {
      const updaterName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'ผู้ดูแลระบบ';
      const res = await fetch('/api/workflows/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: doc.id,
          templateId: selectedWorkflowTplId,
          user: updaterName
        })
      });
      if (res.ok) {
        const tpl = workflowTemplates.find(t => t.id === selectedWorkflowTplId);
        await fetch('/api/tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            docId: doc.id,
            docType: doc.type,
            status: 'เริ่ม Workflow',
            comments: `[Workflow SLA] เริ่มต้นเส้นทางเสนออนุมัติ: ${tpl?.name || 'Workflow มาตรฐาน'}`,
            updatedBy: updaterName
          })
        });
        await fetchDocWorkflow();
        await fetchTracking();
        if (onStatusUpdated) onStatusUpdated();
      }
    } catch (err) {
      console.error('Error assigning doc workflow:', err);
    } finally {
      setIsAssigningWorkflowDoc(false);
    }
  };

  const fetchDocQrCode = async () => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/qr-code`);
      if (res.ok) {
        const data = await res.json();
        setDocQrCode(data.qrCodeDataUrl);
        setDocVerifyUrl(data.verifyUrl);
      }
    } catch (err) {
      console.error('Error fetching general document QR verification code:', err);
    }
  };

  const fetchDocSignatures = async () => {
    try {
      const res = await fetch(`/api/digital-signatures/doc/${doc.id}`);
      if (res.ok) {
        const data = await res.json();
        setDocSignatures(data);
      }
    } catch (err) {
      console.error('Error fetching doc digital signatures:', err);
    }
  };

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
        const res = await fetch('/api/folders?all=1');
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
    fetchDocSignatures();
    fetchDocQrCode();
    fetchDocWorkflow();
    handleRunAiCrossRef();
  }, [doc.id]);

  // Handle marking as reading on load and marking as read on unmount
  useEffect(() => {
    if (doc.id && user?.username) {
      markAsReading();
      fetchReads();
    }
    return () => {
      markAsRead();
    };
  }, [doc.id, user?.username]);

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
    if (doc.folderName) return doc.folderName;
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

  const renderAttachments = () => {
    let attachmentList: string[] = [];
    const rawAtts: any = doc.attachments;
    if (Array.isArray(rawAtts)) {
      attachmentList = rawAtts.map((f: any) => typeof f === 'object' && f !== null ? (f.url || f.name || JSON.stringify(f)) : String(f || ''));
    } else if (typeof rawAtts === 'string' && rawAtts.trim() !== '') {
      try {
        const parsed = JSON.parse(rawAtts);
        if (Array.isArray(parsed)) {
          attachmentList = parsed.map((f: any) => typeof f === 'object' && f !== null ? (f.url || f.name || JSON.stringify(f)) : String(f || ''));
        } else {
          attachmentList = [rawAtts];
        }
      } catch (e) {
        attachmentList = [rawAtts];
      }
    }

    return (
      <div>
        {attachmentList.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-[var(--primary-color)] font-medium mb-1">
              <Paperclip className="w-3.5 h-3.5" />
              <span>มีไฟล์ Scan / Digital Attachments ({attachmentList.length} ไฟล์):</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {attachmentList.map((fileUrl, idx) => {
                const safeFileUrl = typeof fileUrl === 'string' ? fileUrl : String(fileUrl || '');
                const rawName = safeFileUrl.split('/').pop() || safeFileUrl;
                const nameParts = rawName.split('-');
                const fileName = nameParts.length > 2 ? nameParts.slice(2).join('-') : rawName;
                const folderPath = safeFileUrl.includes('/') ? safeFileUrl.substring(0, safeFileUrl.lastIndexOf('/')) : '';
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
    );
  };

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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] sm:rounded-2xl rounded-none w-full max-w-5xl h-full sm:h-[92vh] max-h-[100dvh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border-light)] bg-gradient-to-b from-white/[0.02] to-transparent shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-sans font-semibold text-[var(--text-primary)]">รายละเอียดหนังสือราชการ</h2>
              <span className={`px-2 py-0.5 text-xs font-mono font-medium rounded-full border ${getStatusBadgeColor(doc.status || 'ลงทะเบียน')}`}>
                {doc.status || 'ลงทะเบียน'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-mono">
              ประเภท: {docTypeName} {doc.category ? `(${doc.category === 'order' ? 'คำสั่ง' : doc.category === 'announcement' ? 'ประกาศ' : 'หนังสือรับรอง'})` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(user?.role === 'admin' || user?.role === 'moderator' || !user?.role) && (
              <button 
                onClick={() => {
                  const fDepts = Array.isArray(doc.forwardedTo) 
                    ? doc.forwardedTo 
                    : (typeof doc.forwardedTo === 'string' && doc.forwardedTo.trim() !== '' ? doc.forwardedTo.split(',') : (doc.department ? [doc.department] : []));
                  setSelectedDepts(fDepts);
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
        <div id="printable-area" className="flex-1 min-h-0 overflow-hidden flex flex-col">
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
          
          {/* Tabs Bar */}
          <div className="flex bg-[var(--bg-surface)] border-b border-[var(--border-light)] shrink-0 px-2 sm:px-4 pt-1">
            <button 
              onClick={() => setActiveTab('details')} 
              className={`py-2.5 px-4 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 border-b-2 ${activeTab === 'details' ? 'text-[var(--primary-color)] border-[var(--primary-color)] font-semibold' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}
            >
              <FileText className="w-4 h-4" />
              <span>รายละเอียดเอกสาร</span>
            </button>
            <button 
              onClick={() => setActiveTab('tracking')} 
              className={`py-2.5 px-4 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 border-b-2 ${activeTab === 'tracking' ? 'text-[var(--primary-color)] border-[var(--primary-color)] font-semibold' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}
            >
              <Clock className="w-4 h-4" />
              <span>ติดตามสถานะ</span>
            </button>
            <button 
              onClick={() => setActiveTab('versions')} 
              className={`py-2.5 px-4 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 border-b-2 ${activeTab === 'versions' ? 'text-[var(--primary-color)] border-[var(--primary-color)] font-semibold' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}
            >
              <GitBranch className="w-4 h-4 text-blue-500" />
              <span>ประวัติเวอร์ชัน (Version Control)</span>
            </button>
            <button 
              onClick={() => {
                setActiveTab('reads');
                fetchReads();
              }} 
              className={`py-2.5 px-4 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 border-b-2 ${activeTab === 'reads' ? 'text-[var(--primary-color)] border-[var(--primary-color)] font-semibold' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'}`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>สถานะการอ่าน ({readsList.filter(r => r.status === 'read' || r.status === 'reading').length}/{readsList.length || 1})</span>
            </button>
          </div>

          {activeTab === 'versions' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-50 dark:bg-slate-900/40">
              <VersionControlPanel
                doc={doc}
                user={user}
                isEmbedded={true}
                onDocumentRestored={(updatedDoc) => {
                  Object.assign(doc, updatedDoc);
                  if (onStatusUpdated) onStatusUpdated();
                }}
              />
            </div>
          )}

          {activeTab === 'reads' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-50 dark:bg-slate-900/40 space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">สมาชิกทั้งหมด</div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{readsList.length} คน</div>
                </div>
                
                <div className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 dark:from-amber-950/10 dark:to-amber-900/10 p-4 rounded-xl border border-amber-500/20 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="text-xs text-amber-600 dark:text-amber-400 font-medium font-semibold">✓✓ เปิดแล้ว</div>
                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                      {readsList.filter(r => r.status === 'read').length} คน
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/20">LINE Style</span>
                </div>

                <div className="bg-gradient-to-br from-green-500/5 to-green-500/10 dark:from-green-950/10 dark:to-green-900/10 p-4 rounded-xl border border-green-500/20 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium font-semibold">กำลังอ่าน</div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">
                      {readsList.filter(r => r.status === 'reading').length} คน
                    </div>
                  </div>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                </div>

                <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 dark:from-blue-950/10 dark:to-blue-900/10 p-4 rounded-xl border border-blue-500/20 shadow-sm">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium font-semibold">✓ ส่งแล้ว (ยังไม่เปิด)</div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">
                    {readsList.filter(r => r.status === 'sent').length} คน
                  </div>
                </div>
              </div>

              {/* Search and Filters bar */}
              <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-light)] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Search */}
                <div className="relative w-full md:max-w-xs">
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ, กลุ่มงาน, ตำแหน่ง..."
                    value={readsSearch}
                    onChange={(e) => setReadsSearch(e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg pl-9 pr-4 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors"
                  />
                  <span className="absolute left-3 top-2.5 text-[var(--text-muted)]">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  {readsSearch && (
                    <button
                      onClick={() => setReadsSearch('')}
                      className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto shrink-0 pb-1 md:pb-0">
                  {(['all', 'read', 'reading', 'sent'] as const).map((type) => {
                    const label = {
                      all: 'ทั้งหมด',
                      read: '✓✓ เปิดแล้ว',
                      reading: 'กำลังอ่าน',
                      sent: '✓ ส่งแล้ว'
                    }[type];
                    
                    const count = type === 'all' 
                      ? readsList.length 
                      : readsList.filter(r => r.status === type).length;

                    return (
                      <button
                        key={type}
                        onClick={() => setReadsFilter(type)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          readsFilter === type
                            ? 'bg-[var(--primary-color)] text-white shadow-sm font-bold'
                            : 'bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)]'
                        }`}
                      >
                        {label} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Readers List */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-sm overflow-hidden divide-y divide-[var(--border-lighter)]/40">
                {isFetchingReads ? (
                  <div className="p-8 text-center text-xs text-[var(--text-muted)]">กำลังดึงข้อมูลสถานะการเปิดอ่าน...</div>
                ) : readsList.filter(u => {
                  const searchLower = readsSearch.toLowerCase();
                  const matchesSearch = u.fullName.toLowerCase().includes(searchLower) || 
                                        u.username.toLowerCase().includes(searchLower) ||
                                        (u.department && u.department.toLowerCase().includes(searchLower)) ||
                                        (u.position && u.position.toLowerCase().includes(searchLower));
                  
                  if (!matchesSearch) return false;
                  if (readsFilter === 'all') return true;
                  return u.status === readsFilter;
                }).length > 0 ? (
                  readsList.filter(u => {
                    const searchLower = readsSearch.toLowerCase();
                    const matchesSearch = u.fullName.toLowerCase().includes(searchLower) || 
                                          u.username.toLowerCase().includes(searchLower) ||
                                          (u.department && u.department.toLowerCase().includes(searchLower)) ||
                                          (u.position && u.position.toLowerCase().includes(searchLower));
                    
                    if (!matchesSearch) return false;
                    if (readsFilter === 'all') return true;
                    return u.status === readsFilter;
                  }).map((reader) => {
                    const initials = reader.fullName ? reader.fullName.substring(0, 2) : reader.username.substring(0, 2);
                    const formatReadTime = (dateString: string | null) => {
                      if (!dateString) return '';
                      try {
                        const d = new Date(dateString);
                        if (isNaN(d.getTime())) return '';
                        const hh = String(d.getHours()).padStart(2, '0');
                        const mm = String(d.getMinutes()).padStart(2, '0');
                        return `อ่านเมื่อ ${hh}:${mm}`;
                      } catch (e) {
                        return '';
                      }
                    };
                    
                    return (
                      <div key={reader.username} className="p-3.5 sm:px-6 flex items-center justify-between gap-4 hover:bg-[var(--border-lighter)]/20 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {reader.avatar ? (
                            <img
                              src={reader.avatar}
                              alt={reader.fullName}
                              className="w-9 h-9 rounded-full object-cover shrink-0 border border-[var(--primary-color)]/30 shadow-xs"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center font-bold text-xs shrink-0 border border-[var(--primary-color)]/20 shadow-xs">
                              {initials}
                            </div>
                          )}
                          
                          <div className="min-w-0">
                            <div className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate flex items-center gap-1.5">
                              <span>{reader.fullName}</span>
                              {reader.username === user?.username && (
                                <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1 py-0.2 rounded font-medium">คุณ</span>
                              )}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)] font-medium truncate mt-0.5">
                              {reader.position || 'ตำแหน่งปฏิบัติการ'} {reader.department ? `· ${reader.department}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {reader.status === 'read' && (
                            <div className="flex flex-col items-end">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                <span>✓✓ เปิดแล้ว</span>
                              </span>
                              <span className="text-[10px] text-amber-500/80 font-mono mt-1">
                                {formatReadTime(reader.readAt)} น.
                              </span>
                            </div>
                          )}

                          {reader.status === 'reading' && (
                            <div className="flex flex-col items-end">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-green-500/10 text-green-500 border border-green-500/20">
                                <span className="flex h-1.5 w-1.5 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                </span>
                                <span>กำลังอ่าน</span>
                              </span>
                              <span className="text-[10px] text-green-500/80 font-mono mt-1">
                                กำลังเปิดดูอยู่ขณะนี้
                              </span>
                            </div>
                          )}

                          {reader.status === 'sent' && (
                            <div className="flex flex-col items-end">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-500/10 text-slate-400 border border-slate-500/10">
                                <span>✓ ส่งแล้ว</span>
                              </span>
                              <span className="text-[10px] text-slate-400/80 font-mono mt-1">
                                ยังไม่เปิดอ่าน
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center text-xs text-[var(--text-muted)] italic">
                    ไม่พบข้อมูลผู้ใช้ที่สอดคล้องกับการค้นหา
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={`flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden ${(activeTab === 'versions' || activeTab === 'reads') ? 'hidden' : ''}`}>
              {/* Column 1: Document Sheet Details */}
              <div className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-12 border-b md:border-b-0 md:border-r border-[var(--border-lighter)] custom-scrollbar ${activeTab === 'tracking' ? 'hidden md:block' : ''}`}>

            <div className="bg-[var(--bg-overlay)] rounded-xl border border-[var(--border-light)] p-4 sm:p-6 shadow-inner space-y-4">
              <div className="border-b border-[var(--border-lighter)] pb-3 flex justify-between items-center flex-wrap gap-2">
                <span className="text-xs font-mono text-[var(--text-muted)]">สารบรรณสารสนเทศ</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    (doc.isCentral === 0 || Number(doc.isCentral) === 0)
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                  }`}>
                    {(doc.isCentral === 0 || Number(doc.isCentral) === 0) ? (doc.department || 'ฝ่ายปฏิบัติ') : 'สารบรรณกลาง'}
                  </span>
                  <span className="text-xs font-mono font-medium text-[var(--primary-color)] bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/20 px-2 py-0.5 rounded">
                    {doc.type === 'admin' ? 'ทะเบียนธุรการ' : `เลขทะเบียน: ${doc.receiveNumber || '-'}`}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col divide-y divide-[var(--border-lighter)]/40">
                {detailRow('ระดับทะเบียน :', (
                  (doc.isCentral === 0 || Number(doc.isCentral) === 0) ? (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      สมุดทะเบียนหน่วยงาน {(doc.department || 'ฝ่ายปฏิบัติ')}
                    </span>
                  ) : (
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      สมุดทะเบียนสารบรรณกลาง
                    </span>
                  )
                ))}
                {detailRow('แฟ้มจัดเก็บดิจิทัล :', <span className="font-medium text-[#cfa851]">{getFolderLabel()}</span>)}
                {detailRow('ปีงบประมาณ :', doc.year)}
                {detailRow('วันลงทะเบียนในระบบ :', formattedRegDate())}
                {detailRow('เลขที่หนังสือ (ที่) :', (
                  <div className="space-y-1.5">
                    <span className="font-mono font-bold text-sm text-[var(--text-primary)]">{doc.docNumber || '-'}</span>
                    {doc.docNumber && (
                      <div className="flex flex-wrap gap-1">
                        {parseDocNumberStructure(doc.docNumber, doc.type, doc.category).tags.map((tag, idx) => (
                          <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20">
                            {tag.label}: <strong className="font-bold">{tag.value}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
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
                {Boolean(doc.forwardedTo) && detailRow('ส่งต่อให้ฝ่ายงาน :', (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(Array.isArray(doc.forwardedTo) 
                        ? doc.forwardedTo 
                        : (typeof doc.forwardedTo === 'string' ? doc.forwardedTo.split(',') : [])
                      ).map((d: any, idx: number) => {
                        const deptName = typeof d === 'string' ? d.trim() : String(d || '');
                        return (
                          <span key={idx} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            {deptName}
                          </span>
                        );
                      })}
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

                {detailRow('ไฟล์แนบดิจิทัล :', renderAttachments())}

                {detailRow('ลายมือชื่อดิจิทัล (ETDA) :', (
                  <div className="space-y-4 w-full">
                    {docSignatures && docSignatures.length > 0 ? (
                      <div className="space-y-3">
                        {docSignatures.map((sig, sIdx) => (
                          <div key={sig.id || sIdx} className="p-4 rounded-xl border-2 border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10 space-y-3 text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/10 pb-2">
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 text-xs sm:text-sm">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" /> รับรองแล้วด้วยลายมือชื่อดิจิทัล (Digital Signature Valid)
                              </span>
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                                {sig.certificateSerial}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                              <div className="md:col-span-3 flex justify-center md:justify-start">
                                <div className="relative bg-white p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                  {sig.qrCodeDataUrl ? (
                                    <img src={sig.qrCodeDataUrl} alt="QR Code" className="w-20 h-20 object-contain rounded" />
                                  ) : (
                                    <div className="w-20 h-20 bg-slate-50 flex items-center justify-center rounded">
                                      <QrCode className="w-8 h-8 text-slate-300" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-xl m-1 pointer-events-none" />
                                </div>
                              </div>

                              <div className="md:col-span-9 space-y-2 text-center md:text-left">
                                <div>
                                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Signed By</div>
                                  <p className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{sig.signerName}</p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{sig.signerPosition} / {sig.signerDepartment}</p>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-600 dark:text-slate-300 font-mono mt-1">
                                  <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800/60 text-left">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Timestamp (TSA)</p>
                                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">{sig.timestampFormatted}</p>
                                  </div>
                                  <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800/60 text-left">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Fingerprint</p>
                                    <p className="font-mono text-emerald-600 dark:text-emerald-400 truncate w-full max-w-[140px]">{sig.documentHash}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-emerald-500/20">
                              <a
                                href={`/api/digital-signatures/download-pdf/${sig.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors w-full sm:w-auto justify-center"
                              >
                                <Download className="w-4 h-4" /> ดาวน์โหลดเอกสาร (PDF)
                              </a>
                            </div>
                          </div>
                        ))}
                        
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setIsSigModalOpen(true)}
                            className="px-4 py-2 text-xs font-bold rounded-xl border border-dashed border-emerald-500 hover:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <PenTool className="w-3.5 h-3.5" /> ลงนามร่วม (Co-sign Document)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/20 text-center space-y-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          ยังไม่มีผู้ลงนามรับรองเอกสารนี้ด้วยระบบดิจิทัล (SHA-256 Security)
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsSigModalOpen(true)}
                          className="mx-auto px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <PenTool className="w-3.5 h-3.5" /> ลงนามรับรองดิจิทัลด้วยตนเอง (Sign PDF)
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {detailRow('QR Code ตรวจสอบความถูกต้อง :', (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center gap-4 text-xs w-full">
                    <div className="bg-white p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
                      {docQrCode ? (
                        <img src={docQrCode} alt="Verification QR Code" className="w-24 h-24 object-contain rounded" />
                      ) : (
                        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 flex items-center justify-center rounded">
                          <QrCode className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 flex-1 text-center sm:text-left">
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" /> QR Verification Code ประจำเอกสาร
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        เอกสารทุกฉบับในระบบได้รับการกำหนด QR Code ตรวจสอบความถูกต้องเฉพาะฉบับ สแกนด้วยอุปกรณ์เพื่อตรวจสอบสถานะจริงในฐานข้อมูล ป้องกันการปลอมแปลงและแก้ไขรายละเอียด
                      </p>
                      {docVerifyUrl && (
                        <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                          <a
                            href={docVerifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 font-mono text-[10px] break-all max-w-xs truncate"
                          >
                            {docVerifyUrl} <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {detailRow('สถานะการเสนออนุมัติ & SLA :', (
                  <div className="space-y-3 w-full">
                    {docWorkflow ? (
                      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/20 dark:bg-blue-950/20 space-y-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200 dark:border-blue-900 pb-2">
                          <div className="flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-[var(--primary-color)]" />
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                              {docWorkflow.templateName || 'Workflow มาตรฐาน'}
                            </span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            docWorkflow.slaStatus === 'OVERDUE' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 animate-pulse' :
                            docWorkflow.slaStatus === 'WARNING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {docWorkflow.slaStatus === 'OVERDUE' ? '🔴 เกินกำหนด SLA (ค้างโต๊ะ)' :
                             docWorkflow.slaStatus === 'WARNING' ? '🟡 ใกล้ครบกำหนด SLA' : '🟢 ดำเนินการตามปกติ'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 font-mono">
                          <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">กำหนดส่งตาม SLA</p>
                            <p className="font-semibold text-blue-600 dark:text-blue-400">{formatThaiDateTime(docWorkflow.dueAt)}</p>
                          </div>
                          <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">ผู้พิจารณาปัจจุบัน</p>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {docWorkflow.steps[docWorkflow.currentStepIndex]?.title || 'ส่งมอบแล้ว'} ({docWorkflow.assignee})
                            </p>
                          </div>
                        </div>

                        {/* Steps overview */}
                        <div className="space-y-1.5 pt-1">
                          <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">ลำดับการเสนออนุมัติ:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {docWorkflow.steps.map((st: any, idx: number) => {
                              const isCurrent = idx === docWorkflow.currentStepIndex && docWorkflow.status === 'active';
                              const isDone = idx < docWorkflow.currentStepIndex || docWorkflow.status === 'completed';
                              return (
                                <div key={idx} className={`p-2 rounded-lg border text-[11px] ${
                                  isCurrent ? 'bg-blue-100/70 border-blue-400 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200 font-bold ring-1 ring-blue-400' :
                                  isDone ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
                                  'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800'
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <span>ขั้นที่ {st.stepNumber}: {st.title}</span>
                                    {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                  </div>
                                  <div className="text-[10px] opacity-80 mt-0.5">{st.assignedRole}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Inline progress action */}
                        {docWorkflow.status === 'active' && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                            <input
                              type="text"
                              placeholder="ระบุข้อความสั่งการ/ความเห็นอนุมัติ..."
                              value={wfActionNote}
                              onChange={e => setWfActionNote(e.target.value)}
                              className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-100"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleProgressDocWorkflow('escalate')}
                                disabled={isSubmittingWfAction}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5" /> เร่งรัด SLA
                              </button>
                              <button
                                type="button"
                                onClick={() => handleProgressDocWorkflow('approve')}
                                disabled={isSubmittingWfAction}
                                className="px-4 py-1.5 rounded-lg bg-[var(--primary-color)] hover:opacity-90 text-white font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติ / ส่งต่อขั้นตอน
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/20 text-center space-y-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          ยังไม่ได้มอบหมายเส้นทางเสนออนุมัติ (Workflow) ให้หนังสือฉบับนี้
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto">
                          <select
                            value={selectedWorkflowTplId}
                            onChange={e => setSelectedWorkflowTplId(e.target.value)}
                            className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-100"
                          >
                            <option value="">-- เลือกแม่แบบ Workflow --</option>
                            {workflowTemplates.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.steps.length} ขั้นตอน)
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleAssignDocWorkflow}
                            disabled={!selectedWorkflowTplId || isAssigningWorkflowDoc}
                            className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-lg bg-[var(--primary-color)] hover:opacity-90 text-white shadow-md transition-all shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            {isAssigningWorkflowDoc ? 'กำลังมอบหมาย...' : 'เริ่ม Workflow'}
                          </button>
                        </div>
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
            <div className="space-y-5 shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] font-sans border-b border-[var(--border-light)] pb-2 mb-3 flex items-center justify-between">
                  <span>เส้นทางเดินหนังสือและการติดตามสถานะ</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-[var(--primary-color)]">
                    {trackingLogs.length} รายการ
                  </span>
                </h3>

                {/* Workflow & SLA Live Card in Tracking Panel */}
                {docWorkflow ? (
                  <div className="mb-4 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/80 bg-blue-50/40 dark:bg-blue-950/30 space-y-2.5 text-xs shadow-xs">
                    <div className="flex items-center justify-between gap-1 border-b border-blue-200/80 dark:border-blue-900/80 pb-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                        <GitBranch className="w-4 h-4 text-[var(--primary-color)] shrink-0" />
                        <span className="line-clamp-1">{docWorkflow.templateName || 'Workflow SLA'}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        docWorkflow.slaStatus === 'OVERDUE' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 animate-pulse' :
                        docWorkflow.slaStatus === 'WARNING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {docWorkflow.slaStatus === 'OVERDUE' ? '🔴 เกินกำหนด SLA' :
                         docWorkflow.slaStatus === 'WARNING' ? '🟡 ใกล้ครบกำหนด' : '🟢 ดำเนินการตามปกติ'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 font-medium">เวลาคงเหลือ SLA:</span>
                        {(() => {
                          const due = new Date(docWorkflow.dueAt).getTime();
                          const now = new Date().getTime();
                          const diffMs = due - now;
                          if (docWorkflow.status === 'completed') {
                            return <span className="font-bold text-emerald-600">เสร็จสิ้นแล้ว</span>;
                          }
                          if (diffMs < 0) {
                            const hours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
                            return <span className="font-bold text-red-600 dark:text-red-400">ช้าเกิน {hours} ชม.</span>;
                          }
                          const hours = Math.floor(diffMs / (1000 * 60 * 60));
                          return <span className="font-bold text-blue-600 dark:text-blue-400">เหลือ {hours} ชม.</span>;
                        })()}
                      </div>

                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-0.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">ขั้นตอนปัจจุบัน</div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                          {docWorkflow.steps[docWorkflow.currentStepIndex]?.title || 'ส่งมอบแล้ว'} ({docWorkflow.assignee})
                        </div>
                      </div>
                    </div>

                    {docWorkflow.status === 'active' && (
                      <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/60 space-y-2">
                        <input
                          type="text"
                          placeholder="ข้อความสั่งการ/ความเห็นอนุมัติ..."
                          value={wfActionNote}
                          onChange={e => setWfActionNote(e.target.value)}
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-100"
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleProgressDocWorkflow('escalate')}
                            disabled={isSubmittingWfAction}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" /> เร่งรัด SLA
                          </button>
                          <button
                            type="button"
                            onClick={() => handleProgressDocWorkflow('approve')}
                            disabled={isSubmittingWfAction}
                            className="px-3 py-1.5 rounded-lg bg-[var(--primary-color)] hover:opacity-90 text-white font-semibold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติ / ส่งต่อ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-4 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 text-center space-y-2">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      ยังไม่ได้ผูก Workflow ให้หนังสือเรื่องนี้
                    </p>
                    <div className="flex items-center gap-1.5 justify-center">
                      <select
                        value={selectedWorkflowTplId}
                        onChange={e => setSelectedWorkflowTplId(e.target.value)}
                        className="text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-slate-800 dark:text-slate-100 max-w-[180px]"
                      >
                        <option value="">-- เลือก Workflow --</option>
                        {workflowTemplates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAssignDocWorkflow}
                        disabled={!selectedWorkflowTplId || isAssigningWorkflowDoc}
                        className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-[var(--primary-color)] hover:opacity-90 text-white cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        เริ่ม
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Timeline display */}
                <div className="relative pl-5 border-l-2 border-[var(--border-lighter)] space-y-4 mt-2">
                  {trackingLogs.map((log, index) => {
                    const isLast = index === trackingLogs.length - 1;
                    const isWfLog = log.comments?.includes('[Workflow') || log.status?.includes('Workflow') || log.status?.includes('อนุมัติ');
                    return (
                      <div key={log.id || index} className="relative group">
                        {/* Dot */}
                        <div className={`absolute -left-[26px] top-1 w-3.5 h-3.5 rounded-full border-2 bg-[var(--bg-surface)] transition-colors ${
                          isWfLog ? 'border-blue-500 bg-blue-100 dark:bg-blue-900' :
                          isLast ? 'border-green-400 ring-4 ring-green-400/10' : 'border-[var(--border-medium)]'
                        }`} />
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-[0.68rem] font-medium border ${
                              isWfLog ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300' :
                              getStatusBadgeColor(log.status)
                            }`}>
                              {log.status}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                              {log.updatedAt ? formatThaiDateTime(log.updatedAt) : ''}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-primary)] font-medium leading-normal">{log.comments}</p>
                          <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                            <User className="w-3 h-3 opacity-60 shrink-0" />
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
      </div>

        {/* Footer Meta */}
        <div className="p-3 sm:p-4 border-t border-[var(--border-light)] bg-[var(--bg-surface)] flex items-center justify-between text-xs text-[var(--text-secondary)] shrink-0">
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> สถิติลงทะเบียนเมื่อ {formattedRegDate()}</span>
          <span className="hidden sm:inline text-[var(--text-muted)] text-[10px]">ระบบ EDMS v2.1</span>
        </div>
      </div>

      {/* Modal Forwarding to Department */}
      {isForwardModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] sm:rounded-2xl rounded-none w-full max-w-lg h-full sm:h-auto max-h-[100dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)] bg-purple-500/10">
              <h3 className="font-sans font-semibold text-base sm:text-lg text-purple-300 flex items-center gap-2">
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

      {isSigModalOpen && (
        <DigitalSignatureModal
          doc={doc}
          user={user}
          onClose={() => setIsSigModalOpen(false)}
          onSignedSuccess={async (newSig) => {
            setIsSigModalOpen(false);
            await fetchDocSignatures();
            // sync doc status
            doc.status = 'ลงนามดิจิทัลแล้ว';
            if (onStatusUpdated) onStatusUpdated();
          }}
        />
      )}
    </div>
  );
}
