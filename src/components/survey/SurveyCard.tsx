import React from 'react';
import { 
  BarChart3, 
  Share2, 
  Edit3, 
  Copy, 
  Trash2, 
  Eye, 
  Clock, 
  CheckCircle2, 
  PauseCircle, 
  FileText, 
  Sparkles,
  Link as LinkIcon,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Survey } from '../../types/survey';
import { formatThaiDateShort } from '../../types';

interface SurveyCardProps {
  survey: Survey;
  onEdit: (survey: Survey) => void;
  onAnalytics: (survey: Survey) => void;
  onShare: (survey: Survey) => void;
  onPreview: (survey: Survey) => void;
  onDuplicate: (survey: Survey) => void;
  onDelete: (survey: Survey) => void;
  onStatusChange: (survey: Survey, newStatus: 'draft' | 'published' | 'paused' | 'archived') => void;
  canEdit?: boolean;
}

export const SurveyCard: React.FC<SurveyCardProps> = ({
  survey,
  onEdit,
  onAnalytics,
  onShare,
  onPreview,
  onDuplicate,
  onDelete,
  onStatusChange,
  canEdit = true,
}) => {
  const isPublished = survey.settings.status === 'published';
  const isPaused = survey.settings.status === 'paused';
  const isDraft = survey.settings.status === 'draft';

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'satisfaction':
        return { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', label: 'ความพึงพอใจ' };
      case 'disaster_readiness':
        return { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', label: 'ความพร้อมรับมือภัย' };
      case 'training':
        return { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', label: 'การฝึกซ้อม/อบรม' };
      case 'assessment':
        return { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: 'การประเมินผล' };
      case 'public_feedback':
        return { bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', label: 'รับฟังความคิดเห็น' };
      default:
        return { bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20', label: 'ทั่วไป' };
    }
  };

  const catBadge = getCategoryBadge(survey.category);

  return (
    <div 
      className="group relative bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-lighter)] hover:border-[var(--primary-color)]/40 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
      style={{ borderTopWidth: '4px', borderTopColor: survey.settings.themeColor || '#2563eb' }}
    >
      <div className="space-y-3.5">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${catBadge.bg}`}>
              {catBadge.label}
            </span>
            {survey.settings.linkedDocNumber && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-[var(--border-lighter)] flex items-center gap-1">
                <FileText className="w-3 h-3 text-blue-500" />
                <span>{survey.settings.linkedDocNumber}</span>
              </span>
            )}
          </div>

          {/* Status Dropdown / Badge */}
          <div className="flex items-center gap-1.5">
            {isPublished && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                กำลังเปิดรับคำตอบ
              </span>
            )}
            {isPaused && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <PauseCircle className="w-3 h-3" />
                หยุดรับคำตอบชั่วคราว
              </span>
            )}
            {isDraft && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
                ร่างแบบสำรวจ
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 
            onClick={() => onPreview(survey)}
            className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-color)] transition-colors cursor-pointer line-clamp-2"
          >
            {survey.title}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1.5 leading-relaxed">
            {survey.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] text-center">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] block font-medium">คำถาม</span>
            <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
              {survey.questions?.length || 0} ข้อ
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-muted)] block font-medium">เข้าชม</span>
            <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
              {survey.viewCount || 0}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-muted)] block font-medium">ตอบแล้ว</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {survey.responseCount || 0} ชุด
            </span>
          </div>
        </div>

        {/* Metadata footer */}
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1">
          <span className="truncate max-w-[140px]">{survey.department || 'สำนักงาน ปภ. จังหวัดระยอง'}</span>
          <span className="flex items-center gap-1 shrink-0">
            <Calendar className="w-3 h-3" />
            {formatThaiDateShort(survey.createdAt)}
          </span>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="mt-4 pt-3.5 border-t border-[var(--border-lighter)] flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          {canEdit && (
            <button
              onClick={() => onEdit(survey)}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-blue-600 hover:bg-blue-500/10 transition-colors"
              title="แก้ไขแบบสำรวจ (Form Builder)"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onAnalytics(survey)}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-indigo-600 hover:bg-indigo-500/10 transition-colors relative"
            title="ดูสถิติและรายงานผล (Analytics & Responses)"
          >
            <BarChart3 className="w-4 h-4" />
            {(survey.responseCount || 0) > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            onClick={() => onShare(survey)}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
            title="แชร์ลิงก์และ QR Code"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {canEdit && (
            <button
              onClick={() => onDuplicate(survey)}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-purple-600 hover:bg-purple-500/10 transition-colors"
              title="คัดลอกแบบสำรวจ (Duplicate)"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => onDelete(survey)}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-500/10 transition-colors"
              title="ลบแบบสำรวจ"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => onPreview(survey)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)] text-[var(--primary-color)] hover:text-white text-xs font-bold transition-all"
        >
          <span>ตอบแบบสำรวจ</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
