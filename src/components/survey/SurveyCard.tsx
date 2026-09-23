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
  ArrowRight,
  Printer
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
  onPrint?: (survey: Survey) => void;
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
  onPrint,
  canEdit = true,
}) => {
  const isPublished = survey.settings.status === 'published';
  const isPaused = survey.settings.status === 'paused';
  const isDraft = survey.settings.status === 'draft';

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'exam_quiz':
        return { bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', label: 'แบบทดสอบ/รับรองผล' };
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
      className="group relative bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-lighter)] hover:border-[var(--primary-color)]/30 rounded-3xl p-6 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_24px_-8px_rgba(37,99,235,0.12)] transition-all duration-300 flex flex-col justify-between overflow-hidden"
      style={{ borderTopWidth: '5px', borderTopColor: survey.settings.themeColor || '#2563eb' }}
    >
      {/* Decorative subtle background blob */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-300 pointer-events-none" />

      <div className="space-y-4 relative z-10">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${catBadge.bg} tracking-wide`}>
              {catBadge.label}
            </span>
            {survey.settings.quizMode && (
              <>
                <span className="px-2 py-1 rounded-xl text-[10px] font-extrabold bg-indigo-600 text-white flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Exam Mode
                </span>
                <span className="px-2 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  เกณฑ์ผ่าน {survey.settings.passScorePercent || 60}%
                </span>
              </>
            )}
            {survey.settings.linkedDocNumber && (
              <span className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-[var(--border-lighter)] flex items-center gap-1">
                <FileText className="w-3 h-3 text-blue-500" />
                <span>{survey.settings.linkedDocNumber}</span>
              </span>
            )}
          </div>

          {/* Status Dropdown / Badge */}
          <div className="flex items-center gap-1.5">
            {isPublished && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                เปิดรับคำตอบ
              </span>
            )}
            {isPaused && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <PauseCircle className="w-3 h-3" />
                หยุดรับชั่วคราว
              </span>
            )}
            {isDraft && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                แบบร่าง
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h3 
            onClick={() => onPreview(survey)}
            className="text-base font-bold text-[var(--text-primary)] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer line-clamp-2 leading-snug tracking-tight"
          >
            {survey.title}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed font-light">
            {survey.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 py-2.5 px-3 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] text-center shadow-xs">
          <div>
            <span className="text-[9px] text-[var(--text-muted)] block font-bold uppercase tracking-wider">คำถาม</span>
            <span className="text-sm font-extrabold text-[var(--text-primary)]">
              {survey.questions?.length || 0} ข้อ
            </span>
          </div>
          <div>
            <span className="text-[9px] text-[var(--text-muted)] block font-bold uppercase tracking-wider">เข้าชม</span>
            <span className="text-sm font-extrabold text-[var(--text-primary)]">
              {survey.viewCount || 0} ครั้ง
            </span>
          </div>
          <div>
            <span className="text-[9px] text-[var(--text-muted)] block font-bold uppercase tracking-wider">ตอบแล้ว</span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              {survey.responseCount || 0} ชุด
            </span>
          </div>
        </div>

        {/* Metadata footer */}
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-lighter)]/50">
          <span className="truncate max-w-[140px] font-medium">{survey.department || 'สำนักงาน ปภ. จังหวัดระยอง'}</span>
          <span className="flex items-center gap-1 shrink-0 font-medium">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            {formatThaiDateShort(survey.createdAt)}
          </span>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="mt-5 pt-4 border-t border-[var(--border-lighter)] flex items-center justify-between gap-1.5 relative z-10">
        <div className="flex items-center gap-0.5">
          {canEdit && (
            <button
              onClick={() => onEdit(survey)}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-blue-600 hover:bg-blue-500/10 transition-all hover:scale-105"
              title="แก้ไขแบบสำรวจ (Form Builder)"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onAnalytics(survey)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition-all font-bold text-[11px] cursor-pointer"
            title="จัดการผลการตอบกลับ (Analytics & Responses)"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>ผลตอบกลับ</span>
            {(survey.responseCount || 0) > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => onShare(survey)}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-emerald-600 hover:bg-emerald-500/10 transition-all hover:scale-105"
            title="แชร์ลิงก์และ QR Code"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {onPrint && (
            <button
              onClick={() => onPrint(survey)}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-blue-600 hover:bg-blue-500/10 transition-all hover:scale-105"
              title="พิมพ์แบบประเมิน/ข้อสอบกระดาษ A4"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => onDuplicate(survey)}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-purple-600 hover:bg-purple-500/10 transition-all hover:scale-105"
              title="คัดลอกแบบสำรวจ (Duplicate)"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => onDelete(survey)}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-500/10 transition-all hover:scale-105"
              title="ลบแบบสำรวจ"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => onPreview(survey)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white hover:shadow-lg hover:shadow-blue-500/20 text-xs font-bold transition-all hover:scale-102 active:scale-98 cursor-pointer"
        >
          <span>เริ่มสำรวจ</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
