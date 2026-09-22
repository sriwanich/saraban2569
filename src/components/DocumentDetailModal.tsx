import React, { useState, useEffect } from 'react';
import { DocumentItem, Folder, DigitalSignatureRecord, formatThaiDate, formatThaiDateFull, formatThaiDateTime, WorkflowInstance, WorkflowStepInstance } from '../types';
import { X, Printer, Paperclip, User, CheckCircle2, Edit2, ExternalLink, Download, FileText, Sparkles, GitBranch, ShieldCheck, PenTool, QrCode, FileCode, Tag, Trash2, Clock, History } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import AiCrossReferencePanel, { DetectionResult } from './ai-cross-reference-panel';
import VersionControlPanel from './VersionControlPanel';
import DigitalSignatureModal from './DigitalSignatureModal';
import { parseFileCodeFromDoc, parseDocNumberStructure } from '../lib/fileCodeUtils';
import { useConfirm } from '../context/ConfirmContext';

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
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'details' | 'workflow' | 'versions' | 'reads'>('details');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sysVersion, setSysVersion] = useState<string>('v2.6.0');

  useEffect(() => {
    const fetchLatestVersion = async () => {
      try {
        const res = await fetch('/api/changelogs/latest', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.version) {
            setSysVersion(data.version);
          }
        }
      } catch (e) {
        // Keep default fallback
      }
    };
    fetchLatestVersion();
  }, []);

  // Workflow Status State
  const [workflowInstance, setWorkflowInstance] = useState<WorkflowInstance | null>(null);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchWorkflow = async () => {
      if (!doc?.id) return;
      setIsLoadingWorkflow(true);
      try {
        const res = await fetch('/api/workflows/instances');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const matched = data.find((inst: any) => String(inst.docId) === String(doc.id));
            if (matched && isMounted) {
              setWorkflowInstance(matched);
            }
          }
        }
      } catch (err) {
        // Soft fallback without throwing console errors during navigation or warmups
        console.warn('Workflow instance fetch skipped or offline fallback:', err);
      } finally {
        if (isMounted) {
          setIsLoadingWorkflow(false);
        }
      }
    };
    fetchWorkflow();
    return () => {
      isMounted = false;
    };
  }, [doc.id]);

  // Attachments State & Deletion
  const [currentAttachments, setCurrentAttachments] = useState<string[]>([]);

  useEffect(() => {
    let list: string[] = [];
    const rawAtts: any = doc.attachments;
    if (Array.isArray(rawAtts)) {
      list = rawAtts.map((f: any) => typeof f === 'object' && f !== null ? (f.url || f.name || JSON.stringify(f)) : String(f || ''));
    } else if (typeof rawAtts === 'string' && rawAtts.trim() !== '') {
      try {
        const parsed = JSON.parse(rawAtts);
        if (Array.isArray(parsed)) {
          list = parsed.map((f: any) => typeof f === 'object' && f !== null ? (f.url || f.name || JSON.stringify(f)) : String(f || ''));
        } else {
          list = [rawAtts];
        }
      } catch (e) {
        list = [rawAtts];
      }
    }
    setCurrentAttachments(list.filter(Boolean));
  }, [doc.attachments]);

  const handleDeleteAttachment = async (fileUrlToRemove: string) => {
    const confirmed = await confirm({
      title: 'ยืนยันการลบไฟล์แนบ',
      message: 'คุณต้องการลบไฟล์แนบนี้ออกจากเอกสารและเซิร์ฟเวอร์หรือไม่? การดำเนินการนี้จะไม่สามารถย้อนคืนได้',
      type: 'delete',
      confirmText: 'ยืนยันการลบไฟล์',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    const username = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'ผู้ใช้งาน';
    try {
      // 1. Physically delete from server (both query string and JSON body for proxy safety)
      const deleteUrl = `/api/upload?url=${encodeURIComponent(fileUrlToRemove)}&username=${encodeURIComponent(username)}`;
      const delRes = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fileUrlToRemove, username })
      });
      if (!delRes.ok) {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: fileUrlToRemove, username })
        });
      }

      // 2. Update doc attachments in DB
      const updatedList = currentAttachments.filter(u => u !== fileUrlToRemove);
      setCurrentAttachments(updatedList);

      const rawFileName = decodeURIComponent(fileUrlToRemove.split('/').pop() || fileUrlToRemove);
      const cleanFileName = rawFileName.replace(/^\d{10,15}-\d{4,10}-/, '');

      const updatedDocData = {
        ...doc,
        attachments: updatedList,
        changeSummary: `ลบไฟล์แนบ: ${cleanFileName}`
      };

      await fetch(`/api/documents/${doc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDocData)
      });

      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      alert('เกิดข้อผิดพลาดในการลบไฟล์ โปรดลองอีกครั้ง');
    }
  };

  // Read Receipts States
  const [readsList, setReadsList] = useState<any[]>([]);
  const [isFetchingReads, setIsFetchingReads] = useState(false);
  const [readsSearch, setReadsSearch] = useState('');
  const [readsFilter, setReadsFilter] = useState<'all' | 'read' | 'reading' | 'sent'>('all');

  const fetchReads = async () => {
    if (!doc?.id) return;
    setIsFetchingReads(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/reads`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.reads)) {
          setReadsList(data.reads);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch reads (using empty fallback):', err);
    } finally {
      setIsFetchingReads(false);
    }
  };

  const markAsReading = async () => {
    if (!user?.username || !doc?.id) return;
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
      console.warn('Mark as reading skipped:', err);
    }
  };

  const markAsRead = async () => {
    if (!user?.username || !doc?.id) return;
    try {
      // Use sendBeacon if available during navigation or unload, otherwise normal fetch with soft catch
      const payload = JSON.stringify({
        username: user.username,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
        status: 'read',
        docType: doc.type
      });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(`/api/documents/${doc.id}/reads`, new Blob([payload], { type: 'application/json' }));
      } else {
        await fetch(`/api/documents/${doc.id}/reads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        });
      }
    } catch (err) {
      console.warn('Mark as read completed or cancelled:', err);
    }
  };

  // AI Cross-Reference State
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  // Department receive state
  const [isReceivingDept, setIsReceivingDept] = useState(false);

  // Digital Signature state
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [docSignatures, setDocSignatures] = useState<DigitalSignatureRecord[]>([]);

  // Document Verification QR Code State
  const [docQrCode, setDocQrCode] = useState<string>('');
  const [docVerifyUrl, setDocVerifyUrl] = useState<string>('');

  const fetchDocQrCode = async () => {
    if (!doc?.id) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}/qr-code`);
      if (res.ok) {
        const data = await res.json();
        setDocQrCode(data.qrCodeDataUrl || '');
        setDocVerifyUrl(data.verifyUrl || '');
      }
    } catch (err) {
      console.warn('Document QR verification fetch skipped or unavailable:', err);
    }
  };

  const fetchDocSignatures = async () => {
    if (!doc?.id) return;
    try {
      const res = await fetch(`/api/digital-signatures/doc/${doc.id}`);
      if (res.ok) {
        const data = await res.json();
        setDocSignatures(Array.isArray(data) ? data : []);
      } else {
        setDocSignatures([]);
      }
    } catch (err) {
      setDocSignatures([]);
    }
  };

  // Fetch folders and departments
  useEffect(() => {
    let isMounted = true;
    const fetchFolders = async () => {
      try {
        const res = await fetch('/api/folders?all=1');
        if (res.ok && isMounted) {
          const data = await res.json();
          setFolders(Array.isArray(data) ? data : []);
          try { localStorage.setItem('edms_folders_cache', JSON.stringify(data)); } catch (_) {}
          return;
        }
      } catch (err) {
        console.warn('Folders fetch fallback to cache:', err);
      }
      try {
        const cached = localStorage.getItem('edms_folders_cache');
        if (cached && isMounted) {
          setFolders(JSON.parse(cached));
        }
      } catch (_) {}
    };
    fetchFolders();
    fetchDocSignatures();
    fetchDocQrCode();
    handleRunAiCrossRef();
    return () => {
      isMounted = false;
    };
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

  const handleDepartmentReceive = async () => {
    if (!user || !user.department) return;

    const confirmed = await confirm({
      title: 'ยืนยันการลงรับหนังสือราชการ',
      message: `คุณต้องการลงรับหนังสือเรื่อง "${doc.title || 'ฉบับนี้'}" เข้าสู่แฟ้มฝ่ายงาน "${user.department}" ใช่หรือไม่?`,
      type: 'save',
      itemDetail: doc.docNumber ? `เลขที่หนังสือ: ${doc.docNumber}` : undefined,
      confirmText: 'ยืนยันการลงรับ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

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
    const attachmentList = currentAttachments;

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
                const rawName = decodeURIComponent(safeFileUrl.split('/').pop() || safeFileUrl);
                const match = rawName.match(/^\d{10,15}-\d{4,10}-(.+)$/);
                const fileName = match ? match[1] : rawName;
                const folderPath = safeFileUrl.includes('/') ? safeFileUrl.substring(0, safeFileUrl.lastIndexOf('/')) : '';
                return (
                  <div key={idx} className="flex items-center justify-between bg-[var(--bg-base)] p-2.5 rounded-lg border border-[var(--border-light)] text-xs">
                    <div className="flex items-center gap-2 truncate max-w-[55%]">
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
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(safeFileUrl)}
                        className="px-2 py-1 rounded bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-colors flex items-center gap-1 font-medium text-[11px] cursor-pointer"
                        title="ลบไฟล์แนบนี้ออกจากเอกสารและเซิร์ฟเวอร์"
                      >
                        <Trash2 className="w-3 h-3" /> ลบไฟล์
                      </button>
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
          <div className="flex bg-[var(--bg-overlay)] backdrop-blur-xl border-b border-[var(--border-light)] shrink-0 px-2 sm:px-4 pt-2 overflow-x-auto custom-scrollbar gap-2">
            <button 
              onClick={() => setActiveTab('details')} 
              className={`py-2.5 px-5 text-sm font-bold transition-all flex items-center gap-2 rounded-t-2xl shrink-0 ${activeTab === 'details' ? 'bg-[var(--bg-canvas)] text-[var(--primary-color)] border border-b-0 border-[var(--border-light)] shadow-[0_-4px_10px_rgb(0,0,0,0.02)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <FileText className="w-4 h-4" />
              <span>รายละเอียดเอกสาร</span>
            </button>
            <button 
              onClick={() => {
                setActiveTab('workflow');
                fetchReads();
              }} 
              className={`py-2.5 px-5 text-sm font-bold transition-all flex items-center gap-2 rounded-t-2xl shrink-0 ${activeTab === 'workflow' ? 'bg-[var(--bg-canvas)] text-amber-600 dark:text-amber-400 border border-b-0 border-[var(--border-light)] shadow-[0_-4px_10px_rgb(0,0,0,0.02)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <GitBranch className={`w-4 h-4 ${activeTab === 'workflow' ? 'text-amber-500' : ''}`} />
              <span>สถานะการเสนอ & การอ่าน</span>
              <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${activeTab === 'workflow' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] border border-[var(--border-light)]'}`}>
                {readsList.filter(r => r.status === 'read' || r.status === 'reading').length}/{readsList.length || 1}
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('versions')} 
              className={`py-2.5 px-5 text-sm font-bold transition-all flex items-center gap-2 rounded-t-2xl shrink-0 ${activeTab === 'versions' ? 'bg-[var(--bg-canvas)] text-blue-600 dark:text-blue-400 border border-b-0 border-[var(--border-light)] shadow-[0_-4px_10px_rgb(0,0,0,0.02)]' : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <History className={`w-4 h-4 ${activeTab === 'versions' ? 'text-blue-500' : ''}`} />
              <span>ประวัติเวอร์ชัน</span>
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

          {activeTab === 'workflow' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-[var(--bg-canvas)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Workflow Progress Status Section */}
              <div className="bg-[var(--bg-overlay)] backdrop-blur-xl rounded-3xl border border-[var(--border-light)] p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 animate-in fade-in-50 duration-200 h-fit">
                <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-amber-500" />
                    <span className="font-bold text-sm sm:text-base text-[var(--text-primary)]">สถานะการเสนอหนังสือ (Workflow Progress)</span>
                  </div>
                  {workflowInstance && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      workflowInstance.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' :
                      workflowInstance.status === 'rejected' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' :
                      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    }`}>
                      {workflowInstance.status === 'completed' ? '🟢 เสร็จสิ้นการดำเนินการ' :
                       workflowInstance.status === 'rejected' ? '🔴 ปฏิเสธ/ส่งกลับแก้ไข' :
                       '⚡ อยู่ระหว่างเสนอพิจารณา'}
                    </span>
                  )}
                </div>

                {isLoadingWorkflow ? (
                  <div className="py-8 text-center text-xs text-[var(--text-muted)]">กำลังดึงข้อมูลขั้นตอนการดำเนินการตามเส้นทาง...</div>
                ) : workflowInstance ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <p className="text-[var(--text-secondary)] font-medium">เส้นทางสายงาน (Template):</p>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{workflowInstance.templateName || 'กำหนดเอง'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[var(--text-secondary)] font-medium">เวลาเริ่มเสนอ & SLA:</p>
                        <p className="font-semibold font-mono text-[var(--text-primary)]">
                          {formatThaiDate(workflowInstance.startedAt)} {workflowInstance.dueAt && `| SLA ครบกำหนด: ${formatThaiDate(workflowInstance.dueAt)}`}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-bold text-[var(--text-secondary)]">
                        ขั้นตอนการดำเนินงานตามลำดับชั้น ({workflowInstance.currentStepIndex + 1}/{workflowInstance.steps?.length || 1}):
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
                        {workflowInstance.steps?.map((st, idx) => {
                          const isCurrent = idx === workflowInstance.currentStepIndex && workflowInstance.status === 'active';
                          const isPast = idx < workflowInstance.currentStepIndex || workflowInstance.status === 'completed';
                          const isRejected = st.status === 'rejected';

                          return (
                            <div 
                              key={idx} 
                              className={`p-3 rounded-xl border text-xs space-y-2 relative transition-all ${
                                isCurrent 
                                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-sm'
                                  : isPast
                                  ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                                  : isRejected
                                  ? 'bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-200'
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
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                  </span>
                                ) : (
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </div>

                              <div>
                                <p className="font-bold line-clamp-1 text-[11px]">{st.title}</p>
                                <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">{st.assignedRole}</p>
                                {st.assignee && (
                                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5 italic">({st.assignee})</p>
                                )}
                              </div>

                              {st.actionNote && (
                                <div className="pt-1.5 border-t border-black/5 dark:border-white/5 text-[10px] italic text-[var(--text-secondary)] line-clamp-3">
                                  "{st.actionNote}"
                                  {st.actionBy && <span className="block text-right text-[9px] not-italic mt-0.5 text-slate-400">— {st.actionBy}</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/20 text-center text-xs text-slate-500 dark:text-slate-400 italic">
                    เอกสารนี้ได้รับการลงทะเบียนโดยไม่ได้ผ่านเส้นทาง Workflow ลำดับชั้นเสนอพิจารณาในระบบ
                  </div>
                )}
              </div>

                {/* Read Status Section (Right Column) */}
                <div className="bg-[var(--bg-overlay)] backdrop-blur-xl rounded-3xl border border-[var(--border-light)] p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 animate-in fade-in-50 duration-200 h-fit flex flex-col max-h-full">
                  <div className="flex items-center justify-between border-b border-[var(--border-lighter)] pb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span className="font-bold text-base text-[var(--text-primary)]">สถานะการอ่าน (Read Status)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 shrink-0">
                    <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 flex flex-col items-center justify-center text-center">
                      <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{readsList.filter(r => r.status === 'read' || r.status === 'reading').length}</div>
                      <div className="text-[10px] font-bold text-emerald-600/80 uppercase">เปิดอ่านแล้ว</div>
                    </div>
                    <div className="bg-[var(--bg-canvas)] p-3 rounded-xl border border-[var(--border-light)] flex flex-col items-center justify-center text-center">
                      <div className="text-2xl font-bold text-[var(--text-primary)]">{readsList.length}</div>
                      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">ผู้รับทั้งหมด</div>
                    </div>
                  </div>

                  {/* Readers List */}
                  <div className="border border-[var(--border-light)] rounded-2xl overflow-hidden divide-y divide-[var(--border-lighter)]/40 mt-2 flex-1 min-h-0 flex flex-col">
                    {isFetchingReads ? (
                      <div className="p-8 text-center text-xs text-[var(--text-muted)]">กำลังดึงข้อมูล...</div>
                    ) : readsList.length > 0 ? (
                      <div className="overflow-y-auto custom-scrollbar flex-1 min-h-[250px]">
                        {readsList.map((reader) => {
                          const initials = reader.fullName ? reader.fullName.substring(0, 2) : reader.username.substring(0, 2);
                          const formatReadTime = (dateString: string | null) => {
                            if (!dateString) return '';
                            try {
                              const d = new Date(dateString);
                              if (isNaN(d.getTime())) return '';
                              const hh = String(d.getHours()).padStart(2, '0');
                              const mm = String(d.getMinutes()).padStart(2, '0');
                              return `${hh}:${mm} น.`;
                            } catch (e) {
                              return '';
                            }
                          };
                          
                          return (
                            <div key={reader.username} className="p-3 flex items-center justify-between gap-3 hover:bg-[var(--border-lighter)]/20 transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {reader.avatar ? (
                                  <img
                                    src={reader.avatar}
                                    alt={reader.fullName}
                                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-[var(--border-light)] shadow-xs"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center font-bold text-[10px] shrink-0 border border-[var(--primary-color)]/20 shadow-xs">
                                    {initials}
                                  </div>
                                )}
                                
                                <div className="min-w-0">
                                  <div className="font-bold text-[11px] text-[var(--text-primary)] truncate">
                                    {reader.fullName}
                                  </div>
                                  <div className="text-[10px] text-[var(--text-secondary)] font-medium truncate">
                                    {reader.department || 'บุคลากร'}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                {reader.status === 'read' && (
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-amber-500">✓✓ เปิดแล้ว</span>
                                    <span className="text-[9px] text-amber-500/80 font-mono mt-0.5">{formatReadTime(reader.readAt)}</span>
                                  </div>
                                )}
                                {reader.status === 'reading' && (
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                                      <span className="flex h-1.5 w-1.5 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                      </span>
                                      กำลังอ่าน
                                    </span>
                                  </div>
                                )}
                                {reader.status === 'sent' && (
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-blue-500">✓ ส่งแล้ว</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-[10px] text-[var(--text-muted)] italic">
                        ยังไม่มีข้อมูลการส่งให้ผู้อื่นอ่าน
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          <div className={`flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden ${activeTab !== 'details' ? 'hidden' : ''}`}>
              {/* Column 1: Document Sheet Details */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-12 border-b md:border-b-0 md:border-r border-[var(--border-lighter)] custom-scrollbar">

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
        </div>
            {/* Footer Meta */}
          <div className="p-3 sm:p-4 border-t border-[var(--border-light)] bg-[var(--bg-surface)] flex items-center justify-between text-xs text-[var(--text-secondary)] shrink-0">
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> สถิติลงทะเบียนเมื่อ {formattedRegDate()}</span>
            <span className="hidden sm:inline text-[var(--text-muted)] text-[10px]">ระบบ EDMS {sysVersion}</span>
          </div>

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
      </div>
    </div>
  );
}
