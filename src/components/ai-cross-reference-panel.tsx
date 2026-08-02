import React from 'react';
import { Sparkles, AlertTriangle, Link2, FileText, ExternalLink, RefreshCw, CheckCircle2, ArrowUpRight, Plus, FolderKanban } from 'lucide-react';
import { DocumentItem } from '../types';

export interface CrossReferenceItem {
  docId: string;
  docNumber?: string;
  title?: string;
  date?: string;
  from?: string;
  type?: string;
  relationType: 'duplicate' | 'direct_ref' | 'followup' | 'same_project' | 'related' | string;
  relationLabel?: string;
  similarityScore?: number;
  reason: string;
  actionSuggestion?: string;
}

export interface DetectionResult {
  hasDuplicates?: boolean;
  duplicateSummary?: string;
  hasReferences?: boolean;
  referenceSummary?: string;
  detectedItems?: CrossReferenceItem[];
}

interface Props {
  result: DetectionResult | null;
  isLoading?: boolean;
  onRunDetection?: () => void;
  onViewDoc?: (docId: string) => void;
  onAttachRef?: (item: CrossReferenceItem) => void;
  compactMode?: boolean;
}

export default function AiCrossReferencePanel({
  result,
  isLoading = false,
  onRunDetection,
  onViewDoc,
  onAttachRef,
  compactMode = false
}: Props) {
  const getBadgeStyle = (relationType: string) => {
    switch (relationType) {
      case 'duplicate':
        return {
          bg: 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/30',
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          label: 'หนังสือซ้ำ'
        };
      case 'direct_ref':
        return {
          bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
          icon: <Link2 className="w-3.5 h-3.5" />,
          label: 'อ้างถึงตรงๆ'
        };
      case 'followup':
        return {
          bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
          icon: <RefreshCw className="w-3.5 h-3.5" />,
          label: 'เรื่องสืบเนื่อง/ติดตาม'
        };
      case 'same_project':
        return {
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          icon: <FolderKanban className="w-3.5 h-3.5" />,
          label: 'โครงการ/เรื่องเดียวกัน'
        };
      default:
        return {
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          icon: <Sparkles className="w-3.5 h-3.5" />,
          label: 'บริบทเกี่ยวข้อง'
        };
    }
  };

  return (
    <div className="bg-[var(--bg-overlay)]/40 border border-[var(--border-light)] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-lighter)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-500 flex items-center justify-center border border-indigo-500/30">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              AI Duplicate & Cross-Reference Detector
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-medium border border-indigo-500/20">
                สแกนหาเรื่องเดิม
              </span>
            </h4>
            <p className="text-xs text-[var(--text-muted)]">
              ตรวจจับหนังสือซ้ำและเชื่อมโยงเอกสารเดิมในอดีตอัตโนมัติ ไม่ต้องค้นหาเอง
            </p>
          </div>
        </div>

        {onRunDetection && (
          <button
            type="button"
            onClick={onRunDetection}
            disabled={isLoading}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-surface)] text-[var(--primary-color)] border border-[var(--border-light)] hover:bg-[var(--border-lighter)] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'กำลังสแกนเปรียบเทียบ...' : 'สแกนหาเรื่องเดิมด้วย AI'}
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-[var(--primary-color)] animate-spin" />
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            AI กำลังสแกนเปรียบเทียบประวัติหนังสือทั้งหมดในระบบ...
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            กำลังตรวจจับเลขที่หนังสือ อ้างถึง และโครงการบริบทเดียวกันในอดีต
          </p>
        </div>
      )}

      {/* Empty / Not yet scanned */}
      {!isLoading && !result && (
        <div className="py-4 text-center">
          <p className="text-xs text-[var(--text-muted)] mb-2">
            กดปุ่ม "สแกนหาเรื่องเดิมด้วย AI" เพื่อวิเคราะห์หาหนังสือซ้ำและเอกสารสืบเนื่องในระบบ
          </p>
        </div>
      )}

      {/* Result Display */}
      {!isLoading && result && (
        <div className="space-y-3">

          {/* Duplicate Warning Alert */}
          {result.hasDuplicates && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/25 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <span className="font-semibold text-red-500 block mb-0.5">
                  ⚠️ ตรวจพบหนังสือซ้ำหรือส่งซ้ำในระบบ
                </span>
                <p className="text-[var(--text-secondary)]">
                  {result.duplicateSummary || 'พบหนังสือที่มีเลขที่หรือเรื่องซ้ำกันในประวัติระบบ'}
                </p>
              </div>
            </div>
          )}

          {/* Summary status if clean */}
          {!result.hasDuplicates && result.hasReferences && (
            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center gap-2 text-indigo-600 dark:text-indigo-300">
              <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>{result.referenceSummary || 'พบเอกสารและบริบทสืบเนื่องที่เกี่ยวข้องในระบบ'}</span>
            </div>
          )}

          {!result.hasDuplicates && !result.hasReferences && (
            <div className="py-3 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-surface)]/50 rounded-lg border border-[var(--border-lighter)]">
              ✨ ไม่พบหนังสือซ้ำหรือเอกสารอ้างอิงเดิมในระบบ (เป็นเรื่องใหม่)
            </div>
          )}

          {/* Cards List of Detected Items */}
          {result.detectedItems && result.detectedItems.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <h5 className="text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                <span>รายการหนังสือเดิม/เรื่องที่เกี่ยวข้อง ({result.detectedItems.length})</span>
                <span className="text-[10px] text-[var(--text-muted)] font-normal">คลิกเพื่อดูเอกสารเดิมทันที</span>
              </h5>

              <div className="grid grid-cols-1 gap-2.5">
                {result.detectedItems.map((item, idx) => {
                  const badge = getBadgeStyle(item.relationType);
                  return (
                    <div 
                      key={item.docId || idx}
                      className="group bg-[var(--bg-surface)] hover:border-[var(--primary-color)]/50 border border-[var(--border-light)] rounded-lg p-3 transition-all duration-200 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          
                          {/* Badge + Doc Number */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${badge.bg}`}>
                              {badge.icon}
                              {item.relationLabel || badge.label}
                            </span>

                            {item.similarityScore && (
                              <span className="text-[10px] text-[var(--text-muted)] bg-[var(--border-lighter)] px-1.5 py-0.5 rounded">
                                ความตรงกัน {item.similarityScore}%
                              </span>
                            )}

                            {item.docNumber && (
                              <span className="text-xs font-mono font-semibold text-[var(--primary-color)]">
                                เลขที่: {item.docNumber}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h6 className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--primary-color)] transition-colors">
                            {item.title || 'ไม่มีชื่อเรื่อง'}
                          </h6>

                          {/* Metadata */}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)]">
                            {item.date && <span>📅 ลงวันที่: {item.date}</span>}
                            {item.from && <span>🏢 จาก: {item.from}</span>}
                          </div>

                          {/* Reason note from AI */}
                          <div className="mt-1.5 p-2 rounded bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/10 text-[11px] text-[var(--text-secondary)] italic">
                            💡 <span className="font-semibold not-italic text-indigo-600 dark:text-indigo-400">การวิเคราะห์ของ AI:</span> {item.reason}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start mt-2 sm:mt-0">
                          {onViewDoc && item.docId && (
                            <button
                              type="button"
                              onClick={() => onViewDoc(item.docId)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--primary-color)]/10 text-[var(--primary-color)] hover:bg-[var(--primary-color)] hover:text-white transition-colors"
                              title="คลิกดูเอกสารเดิมในระบบ"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              ดูเอกสารเดิม
                            </button>
                          )}

                          {onAttachRef && (
                            <button
                              type="button"
                              onClick={() => onAttachRef(item)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-lighter)] transition-colors"
                              title="แนบเป็นเรื่องเดิมประกอบการเสนอ"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              แนบเป็นเรื่องเดิม
                            </button>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
