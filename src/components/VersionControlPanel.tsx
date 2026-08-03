import React, { useState, useEffect } from 'react';
import { DocumentItem, DocumentVersion, formatThaiDateTime } from '../types';
import { 
  GitBranch, GitMerge, Clock, User, RotateCcw, Columns, FileText, 
  CheckCircle2, ArrowRight, Shield, AlertCircle, FileCheck, Layers, 
  ChevronRight, RefreshCw, Eye, Tag, PlusCircle, ArrowLeftRight
} from 'lucide-react';

interface Props {
  doc: DocumentItem;
  user?: any;
  onClose?: () => void;
  onDocumentRestored?: (updatedDoc: DocumentItem) => void;
  isEmbedded?: boolean;
}

export default function VersionControlPanel({ doc, user, onClose, onDocumentRestored, isEmbedded = false }: Props) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Compare state
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [verAId, setVerAId] = useState<string>('');
  const [verBId, setVerBId] = useState<string>('');
  const [diffViewType, setDiffViewType] = useState<'split' | 'unified'>('split');

  // Restore state
  const [restoringVersion, setRestoringVersion] = useState<DocumentVersion | null>(null);
  const [restoreNote, setRestoreNote] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Manual snapshot state
  const [showNewVersionModal, setShowNewVersionModal] = useState<boolean>(false);
  const [newVersionSummary, setNewVersionSummary] = useState<string>('');
  const [isSavingVersion, setIsSavingVersion] = useState<boolean>(false);

  // Fetch versions for current document
  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/versions`);
      if (res.ok) {
        const data: DocumentVersion[] = await res.json();
        setVersions(data);
        if (data.length >= 2) {
          setVerAId(data[1].id); // older version
          setVerBId(data[0].id); // newer version
        } else if (data.length === 1) {
          setVerAId(data[0].id);
          setVerBId(data[0].id);
        }
      } else {
        setError('ไม่สามารถดึงข้อมูลเวอร์ชันได้');
      }
    } catch (err: any) {
      console.error('Error fetching document versions:', err);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (doc?.id) {
      fetchVersions();
    }
  }, [doc.id]);

  // Handle Restore
  const handleRestore = async () => {
    if (!restoringVersion) return;
    setIsRestoring(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/versions/${restoringVersion.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modifiedBy: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.username || 'ผู้ใช้งาน'),
          restoreNote: restoreNote.trim() || `กู้คืนข้อมูลกลับไปเป็นเวอร์ชัน ${restoringVersion.versionNumber}`
        })
      });

      if (res.ok) {
        const result = await res.json();
        alert(`กู้คืนเอกสารเป็นเวอร์ชัน ${restoringVersion.versionNumber} เรียบร้อยแล้ว`);
        setRestoringVersion(null);
        setRestoreNote('');
        await fetchVersions();
        if (onDocumentRestored && result.document) {
          onDocumentRestored(result.document);
        }
      } else {
        const errData = await res.json();
        alert(`เกิดข้อผิดพลาด: ${errData.error || 'ไม่สามารถกู้คืนเวอร์ชันได้'}`);
      }
    } catch (err) {
      console.error('Error restoring version:', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsRestoring(false);
    }
  };

  // Handle Save Snapshot Manual
  const handleCreateSnapshot = async () => {
    if (!newVersionSummary.trim()) {
      alert('กรุณาระบุรายละเอียดการแก้ไขในเวอร์ชันนี้');
      return;
    }
    setIsSavingVersion(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: doc.title,
          docNumber: doc.docNumber,
          from: doc.from,
          to: doc.to,
          department: doc.department,
          assignee: doc.assignee,
          priority: doc.priority,
          secrecy: doc.secrecy,
          content: doc.content,
          note: doc.note,
          attachments: doc.attachments,
          changeSummary: newVersionSummary.trim(),
          modifiedBy: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.username || 'ผู้ใช้งาน')
        })
      });

      if (res.ok) {
        alert('บันทึกเวอร์ชันใหม่เรียบร้อยแล้ว');
        setShowNewVersionModal(false);
        setNewVersionSummary('');
        await fetchVersions();
      } else {
        alert('ไม่สามารถบันทึกเวอร์ชันใหม่ได้');
      }
    } catch (err) {
      console.error('Error creating version snapshot:', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSavingVersion(false);
    }
  };

  const selectedVerA = versions.find(v => v.id === verAId) || versions[versions.length - 1];
  const selectedVerB = versions.find(v => v.id === verBId) || versions[0];

  // Helper function for rendering field diff
  const renderFieldDiff = (label: string, valA: any, valB: any, type: 'text' | 'badge' | 'list' = 'text') => {
    const isDifferent = String(valA || '') !== String(valB || '');

    return (
      <div className={`p-3 rounded-lg border ${isDifferent ? 'border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
          {isDifferent ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              มีการเปลี่ยนแปลง
            </span>
          ) : (
            <span className="text-[10px] text-slate-400">ตรงกัน</span>
          )}
        </div>

        {diffViewType === 'split' ? (
          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="p-2 rounded bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50">
              <span className="text-[10px] block font-bold text-rose-600 dark:text-rose-400 mb-0.5">
                Version {selectedVerA?.versionNumber || 'A'}
              </span>
              <span className={`text-xs ${isDifferent ? 'text-rose-700 dark:text-rose-300 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                {valA ? String(valA) : '(ไม่มีข้อมูล)'}
              </span>
            </div>
            <div className="p-2 rounded bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
              <span className="text-[10px] block font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                Version {selectedVerB?.versionNumber || 'B'}
              </span>
              <span className={`text-xs ${isDifferent ? 'text-emerald-700 dark:text-emerald-300 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                {valB ? String(valB) : '(ไม่มีข้อมูล)'}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-xs">
            {isDifferent ? (
              <>
                <div className="p-1.5 rounded bg-rose-100/70 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 line-through">
                  - V{selectedVerA?.versionNumber}: {valA ? String(valA) : '(ไม่มีข้อมูล)'}
                </div>
                <div className="p-1.5 rounded bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-medium">
                  + V{selectedVerB?.versionNumber}: {valB ? String(valB) : '(ไม่มีข้อมูล)'}
                </div>
              </>
            ) : (
              <div className="p-1.5 text-slate-700 dark:text-slate-300">
                {valB ? String(valB) : '-'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Detailed content text diff renderer
  const renderContentTextDiff = (textA: string = '', textB: string = '') => {
    const linesA = textA.split('\n');
    const linesB = textB.split('\n');
    const maxLines = Math.max(linesA.length, linesB.length);

    if (textA === textB) {
      return (
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-mono whitespace-pre-wrap">
          {textB || '(ไม่มีข้อความรายละเอียด)'}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
          <span>รายละเอียดเนื้อหาเอกสาร (Content Diff)</span>
          <span className="text-[11px] text-amber-600 dark:text-amber-400">
            พบจุดแตกต่างระหว่าง V{selectedVerA?.versionNumber} และ V{selectedVerB?.versionNumber}
          </span>
        </div>

        {diffViewType === 'split' ? (
          <div className="grid grid-cols-2 gap-3">
            {/* Version A */}
            <div className="border border-rose-200 dark:border-rose-900/50 rounded-lg overflow-hidden bg-rose-50/20 dark:bg-rose-950/10">
              <div className="px-3 py-1.5 bg-rose-100/80 dark:bg-rose-900/40 border-b border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-800 dark:text-rose-200 flex justify-between">
                <span>Version {selectedVerA?.versionNumber}</span>
                <span className="text-[10px] font-normal text-rose-600 dark:text-rose-300">{selectedVerA?.modifiedBy}</span>
              </div>
              <div className="p-3 font-mono text-xs text-rose-900 dark:text-rose-200 space-y-1 max-h-80 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {linesA.map((line, idx) => {
                  const isMatch = linesB.includes(line);
                  return (
                    <div key={idx} className={`p-1 rounded ${!isMatch ? 'bg-rose-200/60 dark:bg-rose-900/50 text-rose-900 dark:text-rose-100 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                      {!isMatch && <span className="mr-1 text-rose-600">-</span>}
                      {line || ' '}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Version B */}
            <div className="border border-emerald-200 dark:border-emerald-900/50 rounded-lg overflow-hidden bg-emerald-50/20 dark:bg-emerald-950/10">
              <div className="px-3 py-1.5 bg-emerald-100/80 dark:bg-emerald-900/40 border-b border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex justify-between">
                <span>Version {selectedVerB?.versionNumber}</span>
                <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-300">{selectedVerB?.modifiedBy}</span>
              </div>
              <div className="p-3 font-mono text-xs text-emerald-900 dark:text-emerald-200 space-y-1 max-h-80 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {linesB.map((line, idx) => {
                  const isMatch = linesA.includes(line);
                  return (
                    <div key={idx} className={`p-1 rounded ${!isMatch ? 'bg-emerald-200/60 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-100 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                      {!isMatch && <span className="mr-1 text-emerald-600">+</span>}
                      {line || ' '}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-xs overflow-hidden max-h-96 overflow-y-auto">
            {Array.from({ length: maxLines }).map((_, idx) => {
              const lineA = linesA[idx];
              const lineB = linesB[idx];
              if (lineA === lineB) {
                return (
                  <div key={idx} className="px-3 py-1 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/50 whitespace-pre-wrap">
                    {lineB || ' '}
                  </div>
                );
              }
              return (
                <React.Fragment key={idx}>
                  {lineA !== undefined && (
                    <div className="px-3 py-1 bg-rose-100/80 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border-b border-rose-200 dark:border-rose-900/50 whitespace-pre-wrap flex items-start">
                      <span className="w-6 shrink-0 text-rose-500 font-bold select-none">- V{selectedVerA?.versionNumber}</span>
                      <span>{lineA}</span>
                    </div>
                  )}
                  {lineB !== undefined && (
                    <div className="px-3 py-1 bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-b border-emerald-200 dark:border-emerald-900/50 whitespace-pre-wrap flex items-start">
                      <span className="w-6 shrink-0 text-emerald-500 font-bold select-none">+ V{selectedVerB?.versionNumber}</span>
                      <span>{lineB}</span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const containerClass = isEmbedded 
    ? "w-full" 
    : "bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto";

  return (
    <div className={containerClass}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              ระบบเวอร์ชันเอกสาร (Document Version Control)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800">
                {versions.length} เวอร์ชัน
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ติดตามประวัติการแก้ไข เปรียบเทียบความแตกต่าง และกู้คืนเวอร์ชันย้อนหลังสำหรับหนังสือ {doc.docNumber || doc.title}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              compareMode
                ? 'bg-amber-600 text-white shadow-sm hover:bg-amber-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Columns className="w-4 h-4" />
            <span>{compareMode ? 'ปิดโหมดเปรียบเทียบ' : 'เปรียบเทียบความแตกต่าง (Compare Diff)'}</span>
          </button>

          <button
            onClick={() => setShowNewVersionModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>บันทึกเวอร์ชันใหม่</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-12 text-center text-slate-500 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="text-sm">กำลังโหลดประวัติเวอร์ชันเอกสาร...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Area */}
      {!loading && !error && (
        <div className="space-y-6">
          {/* COMPARE DIFF MODE VIEW */}
          {compareMode ? (
            <div className="space-y-5 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              {/* Diff Controls Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <span className="text-rose-600 font-bold">เวอร์ชันต้นทาง (Base):</span>
                    <select
                      value={verAId}
                      onChange={(e) => setVerAId(e.target.value)}
                      className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-medium"
                    >
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          Version {v.versionNumber} ({formatThaiDateTime(v.modifiedAt)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <ArrowLeftRight className="w-4 h-4 text-slate-400" />

                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <span className="text-emerald-600 font-bold">เวอร์ชันเป้าหมาย (Target):</span>
                    <select
                      value={verBId}
                      onChange={(e) => setVerBId(e.target.value)}
                      className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-medium"
                    >
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          Version {v.versionNumber} {v.isCurrent ? '(ปัจจุบัน)' : ''} ({formatThaiDateTime(v.modifiedAt)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Split vs Unified toggle */}
                <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                  <button
                    onClick={() => setDiffViewType('split')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      diffViewType === 'split'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    Side-by-Side (เคียงข้างกัน)
                  </button>
                  <button
                    onClick={() => setDiffViewType('unified')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      diffViewType === 'unified'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    Inline (รวมกัน)
                  </button>
                </div>
              </div>

              {/* Diff Fields Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderFieldDiff('ชื่อเรื่อง (Title)', selectedVerA?.title, selectedVerB?.title)}
                {renderFieldDiff('เลขที่หนังสือ (Doc Number)', selectedVerA?.docNumber, selectedVerB?.docNumber)}
                {renderFieldDiff('ความเร่งด่วน (Priority)', selectedVerA?.priority, selectedVerB?.priority)}
                {renderFieldDiff('ชั้นความลับ (Secrecy)', selectedVerA?.secrecy, selectedVerB?.secrecy)}
                {renderFieldDiff('จาก (From)', selectedVerA?.from, selectedVerB?.from)}
                {renderFieldDiff('ถึง (To)', selectedVerA?.to, selectedVerB?.to)}
                {renderFieldDiff('ฝ่ายรับผิดชอบ (Department)', selectedVerA?.department, selectedVerB?.department)}
                {renderFieldDiff('ผู้รับผิดชอบ (Assignee)', selectedVerA?.assignee, selectedVerB?.assignee)}
                {renderFieldDiff('หมายเหตุ (Note)', selectedVerA?.note, selectedVerB?.note)}
                {renderFieldDiff(
                  'ไฟล์แนบ (Attachments)', 
                  selectedVerA?.attachments?.join(', ') || 'ไม่มีไฟล์แนบ', 
                  selectedVerB?.attachments?.join(', ') || 'ไม่มีไฟล์แนบ'
                )}
              </div>

              {/* Detailed Content Body Diff */}
              {renderContentTextDiff(selectedVerA?.content || '', selectedVerB?.content || '')}
            </div>
          ) : null}

          {/* VERSION HISTORY TIMELINE LIST */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                ประวัติการแก้ไขเอกสารตามลำดับเวอร์ชัน (Version Timeline)
              </span>
              <span className="text-xs text-slate-500 font-normal">
                เรียงจากเวอร์ชันล่าสุดไปจนถึงเวอร์ชันเริ่มต้น
              </span>
            </h4>

            <div className="space-y-3">
              {versions.map((ver, index) => {
                const isCurrent = ver.isCurrent || index === 0;

                return (
                  <div
                    key={ver.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800 shadow-sm'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      {/* Left: Version Info */}
                      <div className="space-y-1.5 flex-1 min-w-[280px]">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                          }`}>
                            Version {ver.versionNumber}
                          </span>

                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              เวอร์ชันปัจจุบัน (Active)
                            </span>
                          )}

                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatThaiDateTime(ver.modifiedAt)}
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-slate-800 dark:text-white">
                          {ver.title}
                        </p>

                        <div className="p-2.5 rounded-lg bg-slate-100/70 dark:bg-slate-900/50 text-xs text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800">
                          <span className="font-bold text-slate-900 dark:text-slate-100">สรุปรายการแก้ไข: </span>
                          {ver.changeSummary || 'แก้ไขรายละเอียดข้อมูลเอกสาร'}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-blue-500" />
                            ผู้แก้ไข: <strong className="text-slate-700 dark:text-slate-200">{ver.modifiedBy}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                            เลขที่หนังสือ: <strong className="text-slate-700 dark:text-slate-200">{ver.docNumber || '-'}</strong>
                          </span>
                          {ver.priority && (
                            <span className="flex items-center gap-1">
                              ชั้นความเร็ว: <strong className="text-amber-600 dark:text-amber-400">{ver.priority}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center space-x-2 self-center shrink-0">
                        <button
                          onClick={() => {
                            setCompareMode(true);
                            setVerAId(ver.id);
                            if (index > 0) setVerBId(versions[index - 1].id);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1 transition-colors"
                          title="เปรียบเทียบกับเวอร์ชันอื่น"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>ดูความต่าง</span>
                        </button>

                        {!isCurrent && (
                          <button
                            onClick={() => setRestoringVersion(ver)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center space-x-1 shadow-sm transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>กู้คืนเวอร์ชันนี้</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* RESTORE VERSION CONFIRMATION MODAL */}
      {restoringVersion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/60 rounded-xl">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-white">
                  ยืนยันการกู้คืนเป็น Version {restoringVersion.versionNumber}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  แก้ไขเมื่อ: {formatThaiDateTime(restoringVersion.modifiedAt)} โดย {restoringVersion.modifiedBy}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
              <div><strong className="text-slate-900 dark:text-slate-100">ชื่อเรื่องที่จะกู้คืน: </strong>{restoringVersion.title}</div>
              <div><strong className="text-slate-900 dark:text-slate-100">เลขที่หนังสือ: </strong>{restoringVersion.docNumber || '-'}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                หมายเหตุเหตุผลในการกู้คืนเวอร์ชัน (Restore Reason)
              </label>
              <textarea
                value={restoreNote}
                onChange={(e) => setRestoreNote(e.target.value)}
                placeholder="เช่น กู้คืนเนื่องจากข้อมูลเดิมถูกแก้ไขคลาดเคลื่อน..."
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
              * การกู้คืนระบบจะสร้างเป็นเวอร์ชันใหม่ถัดไปเพื่อเก็บประวัติเดิมไว้อย่างปลอดภัย ไม่มีการสูญหายของข้อมูล
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setRestoringVersion(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                disabled={isRestoring}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRestore}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-sm flex items-center space-x-1.5 transition-colors"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังกู้คืน...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ยืนยันกู้คืนเวอร์ชัน</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW MANUAL VERSION SNAPSHOT MODAL */}
      {showNewVersionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400">
              <div className="p-3 bg-blue-100 dark:bg-blue-950/60 rounded-xl">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-white">
                  บันทึกเวอร์ชันใหม่ (Manual Snapshot)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  สร้างจุดบันทึกเอกสารเวอร์ชันถัดไป ณ สถานะปัจจุบัน
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                สรุปสิ่งที่แก้ไขหรือปรับปรุงในเวอร์ชันนี้ <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={newVersionSummary}
                onChange={(e) => setNewVersionSummary(e.target.value)}
                placeholder="เช่น ปรับปรุงเนื้อหาคำสั่งส่วนที่ 2, เพิ่มเอกสารแนบฉบับสมบูรณ์..."
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setShowNewVersionModal(false);
                  setNewVersionSummary('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                disabled={isSavingVersion}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreateSnapshot}
                disabled={isSavingVersion}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center space-x-1.5 transition-colors"
              >
                {isSavingVersion ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>บันทึก snapshot</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
