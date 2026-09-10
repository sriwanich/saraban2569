import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Sparkles, Plus, Edit3, Trash2, Calendar, Tag, ShieldCheck, 
  CheckCircle2, Search, Filter, Image as ImageIcon, ExternalLink, 
  ChevronRight, ChevronLeft, AlertCircle, RefreshCw, ZoomIn, Download, 
  Layers, Zap, Wrench, Check, Copy, Clock, Activity, ArrowRight, 
  ArrowLeft, Share2, FileText, CheckCircle, Info, ChevronDown
} from 'lucide-react';
import { ChangelogItem, ChangelogType, formatThaiDateString, ChangelogImage } from '../types';
import ChangelogEditorModal from './ChangelogEditorModal';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  hasPermission?: (key: string) => boolean;
  initialVersionId?: string;
  onVersionUpdated?: () => void;
}

// Calculate relative time in Thai
function getRelativeTimeString(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
    const target = new Date(cleanDate);
    const now = new Date();
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = nowDay.getTime() - targetDay.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'วันนี้';
    if (diffDays === 1) return 'เมื่อวานนี้';
    if (diffDays > 1 && diffDays < 30) return `${diffDays} วันที่แล้ว`;
    if (diffDays >= 30 && diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} เดือนที่แล้ว`;
    }
    if (diffDays >= 365) {
      const years = Math.floor(diffDays / 365);
      return `${years} ปีที่แล้ว`;
    }
    return '';
  } catch (e) {
    return '';
  }
}

// Get metadata for release category
function getCategoryMeta(category: string, label: string) {
  const cat = (category || '').toLowerCase();
  const lbl = (label || '').toLowerCase();

  if (cat.includes('feature') || lbl.includes('ฟีเจอร์') || lbl.includes('ใหม่') || lbl.includes('new')) {
    return {
      icon: Sparkles,
      label: 'ฟีเจอร์ใหม่ (Features)',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      dotBg: 'bg-emerald-500',
      cardBg: 'bg-emerald-500/[0.03] dark:bg-emerald-950/10 border-emerald-500/20'
    };
  }
  if (cat.includes('improvement') || cat.includes('perf') || lbl.includes('ปรับปรุง') || lbl.includes('ประสิทธิภาพ')) {
    return {
      icon: Zap,
      label: 'การปรับปรุง (Improvements)',
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      iconColor: 'text-blue-500 dark:text-blue-400',
      dotBg: 'bg-blue-500',
      cardBg: 'bg-blue-500/[0.03] dark:bg-blue-950/10 border-blue-500/20'
    };
  }
  if (cat.includes('fix') || cat.includes('bug') || lbl.includes('แก้ไข') || lbl.includes('bug')) {
    return {
      icon: Wrench,
      label: 'แก้ไขข้อผิดพลาด (Fixes)',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      iconColor: 'text-amber-500 dark:text-amber-400',
      dotBg: 'bg-amber-500',
      cardBg: 'bg-amber-500/[0.03] dark:bg-amber-950/10 border-amber-500/20'
    };
  }
  if (cat.includes('sec') || lbl.includes('ความปลอดภัย') || lbl.includes('สิทธิ์') || lbl.includes('security')) {
    return {
      icon: ShieldCheck,
      label: 'ความปลอดภัย (Security)',
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      iconColor: 'text-rose-500 dark:text-rose-400',
      dotBg: 'bg-rose-500',
      cardBg: 'bg-rose-500/[0.03] dark:bg-rose-950/10 border-rose-500/20'
    };
  }
  if (cat.includes('ui') || lbl.includes('หน้าตา') || lbl.includes('ux') || lbl.includes('ดีไซน์')) {
    return {
      icon: Layers,
      label: 'การออกแบบ UI/UX',
      badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      iconColor: 'text-purple-500 dark:text-purple-400',
      dotBg: 'bg-purple-500',
      cardBg: 'bg-purple-500/[0.03] dark:bg-purple-950/10 border-purple-500/20'
    };
  }
  return {
    icon: Tag,
    label: 'ทั่วไป (General)',
    badgeBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    iconColor: 'text-slate-500 dark:text-slate-400',
    dotBg: 'bg-slate-500',
    cardBg: 'bg-slate-500/[0.03] dark:bg-slate-900/20 border-slate-500/20'
  };
}

export default function ChangelogModal({
  isOpen,
  onClose,
  currentUser,
  hasPermission,
  initialVersionId,
  onVersionUpdated
}: ChangelogModalProps) {
  const [changelogs, setChangelogs] = useState<ChangelogItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Mobile tab state: 'list' or 'detail'
  const [mobileTab, setMobileTab] = useState<'list' | 'detail'>('list');

  // Copy notification state
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Editor modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [changelogToEdit, setChangelogToEdit] = useState<ChangelogItem | null>(null);

  // Lightbox Image Viewer state (multi-image support with prev/next)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManageChangelog = Boolean(
    currentUser?.role === 'admin' || (hasPermission && hasPermission('manage_changelog'))
  );

  const fetchChangelogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/changelogs', { cache: 'no-store' });
      if (res.ok) {
        const data: ChangelogItem[] = await res.json();
        setChangelogs(data);
        if (data.length > 0) {
          if (initialVersionId && data.some(d => d.id === initialVersionId || d.version === initialVersionId)) {
            const found = data.find(d => d.id === initialVersionId || d.version === initialVersionId);
            if (found) {
              setSelectedId(found.id);
              setMobileTab('detail');
            }
          } else if (!selectedId || !data.some(d => d.id === selectedId)) {
            const latest = data.find(d => d.isLatest) || data[0];
            setSelectedId(latest.id);
          }
        }
      }
    } catch (err) {
      console.error('Fetch changelogs error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChangelogs();
    }
  }, [isOpen, initialVersionId]);

  // Keyboard navigation for Lightbox & Modal Close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxIndex !== null) {
          setLightboxIndex(null);
        } else if (deletingId !== null) {
          setDeletingId(null);
        } else if (isEditorOpen) {
          setIsEditorOpen(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lightboxIndex, deletingId, isEditorOpen, onClose]);

  const handleOpenCreate = () => {
    setChangelogToEdit(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (item: ChangelogItem) => {
    setChangelogToEdit(item);
    setIsEditorOpen(true);
  };

  const handleDeleteConfirm = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/changelogs/${id}?username=${encodeURIComponent(currentUser?.username || 'admin')}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setDeletingId(null);
        await fetchChangelogs();
        if (onVersionUpdated) onVersionUpdated();
      }
    } catch (err) {
      console.error('Delete changelog error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditorSaved = async () => {
    await fetchChangelogs();
    if (onVersionUpdated) onVersionUpdated();
  };

  // Filter list
  const filteredChangelogs = changelogs.filter(item => {
    if (filterType === 'latest' && !item.isLatest) return false;
    if (filterType !== 'all' && filterType !== 'latest' && item.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchVersion = item.version.toLowerCase().includes(q);
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSummary = (item.summary || '').toLowerCase().includes(q);
      const matchChanges = (item.changes || []).some(c => 
        c.categoryLabel.toLowerCase().includes(q) || 
        c.items.some(i => i.toLowerCase().includes(q))
      );
      return matchVersion || matchTitle || matchSummary || matchChanges;
    }
    return true;
  });

  const selectedChangelog = changelogs.find(c => c.id === selectedId) || filteredChangelogs[0] || changelogs[0];
  const selectedIndex = changelogs.findIndex(c => c.id === selectedChangelog?.id);
  
  // Previous & Next navigation
  const prevVersion = selectedIndex < changelogs.length - 1 ? changelogs[selectedIndex + 1] : null;
  const nextVersion = selectedIndex > 0 ? changelogs[selectedIndex - 1] : null;

  // Active latest version
  const latestVersion = changelogs.find(c => c.isLatest) || changelogs[0];

  // Count by types for filter tabs
  const typeCounts = useMemo(() => {
    return {
      all: changelogs.length,
      latest: changelogs.filter(c => c.isLatest).length,
      major: changelogs.filter(c => c.type === 'major').length,
      minor: changelogs.filter(c => c.type === 'minor').length,
      patch: changelogs.filter(c => c.type === 'patch' || c.type === 'hotfix').length
    };
  }, [changelogs]);

  const getTypeBadge = (type: ChangelogType) => {
    switch (type) {
      case 'major':
        return {
          label: 'Major Release',
          shortLabel: 'Major',
          bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
          dot: 'bg-purple-500',
          gradient: 'from-purple-500 to-indigo-600'
        };
      case 'minor':
        return {
          label: 'Minor Feature Release',
          shortLabel: 'Minor',
          bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
          dot: 'bg-blue-500',
          gradient: 'from-blue-500 to-cyan-600'
        };
      case 'patch':
        return {
          label: 'Patch Update',
          shortLabel: 'Patch',
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
          dot: 'bg-emerald-500',
          gradient: 'from-emerald-500 to-teal-600'
        };
      case 'hotfix':
        return {
          label: 'Emergency Hotfix',
          shortLabel: 'Hotfix',
          bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
          dot: 'bg-rose-500',
          gradient: 'from-rose-500 to-amber-600'
        };
      default:
        return {
          label: 'Update',
          shortLabel: 'Update',
          bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25',
          dot: 'bg-slate-500',
          gradient: 'from-slate-500 to-gray-600'
        };
    }
  };

  const handleCopySummary = (item: ChangelogItem) => {
    if (!item) return;
    let text = `📢 บันทึกการอัปเดตระบบสารบรรณอิเล็กทรอนิกส์ (EDMS) ${item.version}\n`;
    text += `หัวข้อ: ${item.title}\n`;
    text += `วันที่เผยแพร่: ${formatThaiDateString(item.releaseDate)}\n`;
    if (item.author) text += `ผู้เผยแพร่: ${item.author}\n`;
    if (item.summary) text += `\nสรุปภาพรวม:\n${item.summary}\n`;
    
    if (item.changes && item.changes.length > 0) {
      text += `\nรายละเอียดการเปลี่ยนแปลง:\n`;
      item.changes.forEach(cat => {
        text += `\n${cat.categoryLabel}\n`;
        cat.items.forEach(i => {
          if (i.trim()) text += ` • ${i}\n`;
        });
      });
    }

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2200);
  };

  const normalizedImages = useMemo(() => {
    if (!selectedChangelog || !selectedChangelog.images) return [];
    return selectedChangelog.images.map(img => {
      if (typeof img === 'string') {
        return { url: img, caption: '', name: 'รูปภาพประกอบ' };
      }
      return { url: img.url, caption: img.caption || '', name: img.name || 'รูปภาพประกอบ' };
    });
  }, [selectedChangelog]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md overflow-hidden animate-fade-in">
      <div 
        className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl w-full max-w-6xl h-[94vh] max-h-[900px] flex flex-col shadow-2xl overflow-hidden my-auto"
        id="changelog-modal-container"
      >
        {/* Top Header Bar */}
        <header className="px-5 py-4 border-b border-[var(--border-light)] bg-[var(--bg-elevated)]/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--primary-color)] to-indigo-600 flex items-center justify-center text-white shadow-md shadow-[var(--primary-color)]/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-base sm:text-lg font-bold font-sans text-[var(--text-primary)] tracking-tight">
                  ประวัติการอัปเดตระบบสารบรรณ (Changelog & Release Notes)
                </h2>
                {latestVersion && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    เวอร์ชันปัจจุบัน: {latestVersion.version}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 hidden sm:block">
                บันทึกการพัฒนา ฟีเจอร์ใหม่ การปรับปรุงความปลอดภัย และประวัติเวอร์ชันระบบ EDMS
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2">
            {canManageChangelog && (
              <button
                id="btn-add-new-changelog"
                onClick={handleOpenCreate}
                className="px-3.5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">เพิ่มเวอร์ชันใหม่</span>
                <span className="sm:hidden">เพิ่ม</span>
              </button>
            )}

            <button
              id="btn-refresh-changelog"
              onClick={fetchChangelogs}
              disabled={isLoading}
              className="p-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-lighter)] transition-colors cursor-pointer border border-transparent hover:border-[var(--border-light)]"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[var(--primary-color)]' : ''}`} />
            </button>

            <button
              id="btn-close-changelog-modal"
              onClick={onClose}
              className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-lighter)] transition-colors cursor-pointer"
              title="ปิดหน้าต่าง (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden border-b border-[var(--border-light)] bg-[var(--bg-elevated)]/50 p-1.5 gap-1 shrink-0">
          <button
            onClick={() => setMobileTab('list')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              mobileTab === 'list'
                ? 'bg-[var(--primary-color)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>รายการเวอร์ชัน ({filteredChangelogs.length})</span>
          </button>
          <button
            onClick={() => setMobileTab('detail')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              mobileTab === 'detail'
                ? 'bg-[var(--primary-color)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>รายละเอียด {selectedChangelog ? `(${selectedChangelog.version})` : ''}</span>
          </button>
        </div>

        {/* Modal Body (Master-Detail Layout) */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-[var(--bg-surface)]">
          
          {/* Left Column: Interactive Release Timeline / Version Navigator */}
          <aside 
            className={`w-full md:w-80 lg:w-96 border-r border-[var(--border-light)] bg-[var(--bg-elevated)]/30 flex flex-col shrink-0 ${
              mobileTab === 'detail' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Search & Category Filter Section */}
            <div className="p-3.5 space-y-2.5 border-b border-[var(--border-light)] bg-[var(--bg-surface)]/60">
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาเลขเวอร์ชัน, ฟีเจอร์, รายการ..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/30 focus:border-[var(--primary-color)] transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded-full"
                    title="ล้างคำค้น"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] custom-scrollbar">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    filterType === 'all'
                      ? 'bg-[var(--primary-color)] text-white shadow-xs'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)]'
                  }`}
                >
                  <span>ทั้งหมด</span>
                  <span className="opacity-80 text-[10px]">({typeCounts.all})</span>
                </button>

                <button
                  onClick={() => setFilterType('latest')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    filterType === 'latest'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)]'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-300" />
                  <span>ล่าสุด</span>
                </button>

                <button
                  onClick={() => setFilterType('major')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    filterType === 'major'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)]'
                  }`}
                >
                  <span>Major</span>
                  <span className="opacity-80 text-[10px]">({typeCounts.major})</span>
                </button>

                <button
                  onClick={() => setFilterType('minor')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    filterType === 'minor'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)]'
                  }`}
                >
                  <span>Minor</span>
                  <span className="opacity-80 text-[10px]">({typeCounts.minor})</span>
                </button>

                <button
                  onClick={() => setFilterType('patch')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    filterType === 'patch'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)]'
                  }`}
                >
                  <span>Patch</span>
                  <span className="opacity-80 text-[10px]">({typeCounts.patch})</span>
                </button>
              </div>
            </div>

            {/* Version List with Visual Timeline Rail */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar relative">
              {filteredChangelogs.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-light)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">ไม่พบบันทึกที่ตรงกัน</h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">ลองค้นหาด้วยคำอื่น หรือเลือกตัวกรอง "ทั้งหมด"</p>
                  </div>
                  <button
                    onClick={() => { setSearchQuery(''); setFilterType('all'); }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)] text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    ล้างการค้นหา
                  </button>
                </div>
              ) : (
                <div className="relative pl-3">
                  {/* Timeline Track Line */}
                  <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-[var(--border-light)]" />

                  <div className="space-y-3">
                    {filteredChangelogs.map((item, idx) => {
                      const isSelected = selectedChangelog?.id === item.id;
                      const typeBadge = getTypeBadge(item.type);
                      const isLatestVer = Boolean(item.isLatest);
                      const totalChanges = (item.changes || []).reduce((acc, cat) => acc + (cat.items?.length || 0), 0);

                      return (
                        <div 
                          key={item.id} 
                          className="relative flex items-start gap-3 group"
                        >
                          {/* Timeline Node Icon */}
                          <div 
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-transform duration-200 mt-2.5 ${
                              isSelected
                                ? 'bg-[var(--bg-surface)] border-[var(--primary-color)] ring-4 ring-[var(--primary-color)]/20 scale-110 shadow-sm'
                                : isLatestVer
                                ? 'bg-amber-500/20 border-amber-500'
                                : 'bg-[var(--bg-elevated)] border-[var(--border-medium)] group-hover:border-[var(--primary-color)]'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[var(--primary-color)]' : typeBadge.dot}`} />
                          </div>

                          {/* Card */}
                          <div
                            onClick={() => {
                              setSelectedId(item.id);
                              setMobileTab('detail');
                            }}
                            className={`flex-1 p-3.5 rounded-xl cursor-pointer transition-all duration-200 border relative ${
                              isSelected
                                ? 'bg-[var(--primary-color)]/10 border-[var(--primary-color)]/40 shadow-sm ring-1 ring-[var(--primary-color)]/20'
                                : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border-[var(--border-light)] hover:border-[var(--border-medium)]'
                            }`}
                          >
                            {/* Card Header */}
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-xs font-extrabold font-mono ${isSelected ? 'text-[var(--primary-color)]' : 'text-[var(--text-primary)]'}`}>
                                  {item.version}
                                </span>
                                {isLatestVer && (
                                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>ล่าสุด</span>
                                  </span>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeBadge.bg}`}>
                                {typeBadge.shortLabel}
                              </span>
                            </div>

                            {/* Card Title */}
                            <h5 className={`text-xs font-semibold line-clamp-2 leading-relaxed ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]/90'}`}>
                              {item.title}
                            </h5>

                            {/* Card Meta Footer */}
                            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border-lighter)]">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
                                <span>{formatThaiDateString(item.releaseDate)}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                {totalChanges > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-light)] font-mono">
                                    {totalChanges} รายการ
                                  </span>
                                )}
                                {item.images && item.images.length > 0 && (
                                  <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium" title="มีรูปภาพประกอบ">
                                    <ImageIcon className="w-3 h-3" />
                                    {item.images.length}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Right Column: Detailed Release Notes Content View */}
          <main 
            className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar bg-[var(--bg-surface)] ${
              mobileTab === 'list' ? 'hidden md:block' : 'block'
            }`}
          >
            {/* Mobile Back Button */}
            <div className="md:hidden flex items-center justify-between pb-2 border-b border-[var(--border-light)]">
              <button
                onClick={() => setMobileTab('list')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary-color)] hover:underline"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>กลับไปหน้ารายการเวอร์ชัน</span>
              </button>
              {selectedChangelog && (
                <span className="text-xs font-mono font-bold text-[var(--text-muted)]">
                  {selectedChangelog.version}
                </span>
              )}
            </div>

            {selectedChangelog ? (
              <div className="space-y-6 max-w-4xl mx-auto">
                
                {/* Release Hero Header Card */}
                <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[var(--bg-elevated)] via-[var(--bg-elevated)] to-[var(--bg-surface)] border border-[var(--border-light)] relative shadow-sm space-y-4">
                  
                  {/* Top Badges & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="px-3.5 py-1.5 rounded-xl text-sm sm:text-base font-extrabold font-mono bg-[var(--primary-color)] text-white shadow-sm shadow-[var(--primary-color)]/25">
                        {selectedChangelog.version}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTypeBadge(selectedChangelog.type).bg}`}>
                        {getTypeBadge(selectedChangelog.type).label}
                      </span>
                      {selectedChangelog.isLatest ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <span>เวอร์ชันปัจจุบัน</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-500/10 text-[var(--text-muted)] border border-slate-500/20">
                          ประวัติรุ่นก่อนหน้า (Archived)
                        </span>
                      )}
                    </div>

                    {/* Action Buttons: Copy, Edit, Delete */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopySummary(selectedChangelog)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border shadow-xs ${
                          isCopied
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-[var(--bg-surface)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-light)]'
                        }`}
                        title="คัดลอกสรุปสำหรับส่งใน LINE หรืออีเมลแจ้งเตือน"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? 'คัดลอกสำเร็จ!' : 'คัดลอกสรุป'}</span>
                      </button>

                      {canManageChangelog && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(selectedChangelog)}
                            className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            title="แก้ไขรายละเอียดเวอร์ชันนี้"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                            <span className="hidden sm:inline">แก้ไข</span>
                          </button>
                          <button
                            onClick={() => setDeletingId(selectedChangelog.id)}
                            className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-500 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            title="ลบบันทึกเวอร์ชันนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">ลบ</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Release Title */}
                  <h3 className="text-lg sm:text-2xl font-bold font-sans text-[var(--text-primary)] tracking-tight leading-snug">
                    {selectedChangelog.title}
                  </h3>

                  {/* Metadata Ribbon */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-lighter)]">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                      <span>เผยแพร่เมื่อ:</span>
                      <strong className="text-[var(--text-primary)]">
                        {formatThaiDateString(selectedChangelog.releaseDate)}
                      </strong>
                      {getRelativeTimeString(selectedChangelog.releaseDate) && (
                        <span className="px-1.5 py-0.2 rounded-md bg-[var(--border-lighter)] text-[10px] text-[var(--text-muted)]">
                          {getRelativeTimeString(selectedChangelog.releaseDate)}
                        </span>
                      )}
                    </span>

                    {selectedChangelog.author && (
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>ผู้เผยแพร่:</span>
                        <strong className="text-[var(--text-primary)]">{selectedChangelog.author}</strong>
                      </span>
                    )}

                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-500" />
                      <span>หมวดหมู่การเปลี่ยนแปลง:</span>
                      <strong className="text-[var(--text-primary)]">
                        {selectedChangelog.changes?.length || 0} หมวด
                      </strong>
                    </span>
                  </div>

                  {/* Executive Summary Box */}
                  {selectedChangelog.summary && (
                    <div className="mt-3 p-4 rounded-xl bg-[var(--primary-color)]/[0.04] border-l-4 border-[var(--primary-color)] border border-[var(--border-light)] text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed space-y-1">
                      <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 text-xs">
                        <Info className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                        <span>ภาพรวมการอัปเดต (Executive Summary)</span>
                      </div>
                      <p className="text-[var(--text-secondary)] leading-relaxed">
                        {selectedChangelog.summary}
                      </p>
                    </div>
                  )}
                </div>

                {/* Categorized Changes Section */}
                {selectedChangelog.changes && selectedChangelog.changes.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold font-sans text-[var(--text-primary)] flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[var(--primary-color)]" />
                        <span>รายละเอียดการเปลี่ยนแปลง (Release Highlights & Changes)</span>
                      </h4>
                      <span className="text-xs text-[var(--text-muted)]">
                        รวมทั้งหมด {(selectedChangelog.changes || []).reduce((sum, c) => sum + (c.items?.length || 0), 0)} รายการ
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {selectedChangelog.changes.map((cat, idx) => {
                        const meta = getCategoryMeta(cat.category, cat.categoryLabel);
                        const CatIcon = meta.icon;

                        return (
                          <div
                            key={idx}
                            className={`p-4 sm:p-5 rounded-2xl border ${meta.cardBg} space-y-3 shadow-xs transition-all`}
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-[var(--border-lighter)] pb-2.5">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.badgeBg}`}>
                                  <CatIcon className="w-4 h-4" />
                                </div>
                                <h5 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                                  {cat.categoryLabel}
                                </h5>
                              </div>
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-light)]">
                                {cat.items.length} รายการ
                              </span>
                            </div>

                            <ul className="space-y-2.5 pl-1">
                              {cat.items.map((item, itemIdx) => (
                                <li 
                                  key={itemIdx} 
                                  className="flex items-start gap-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed group"
                                >
                                  <div className="mt-1.5 shrink-0">
                                    <span className={`w-1.5 h-1.5 rounded-full block ${meta.dotBg} group-hover:scale-125 transition-transform`} />
                                  </div>
                                  <span className="text-[var(--text-primary)]/90 group-hover:text-[var(--text-primary)] transition-colors">
                                    {item}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Screenshots & Showcase Gallery */}
                {normalizedImages.length > 0 && (
                  <section className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold font-sans text-[var(--text-primary)] flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-emerald-500" />
                        <span>รูปภาพตัวอย่างและภาพหน้าจอ (Screenshots & Showcase)</span>
                      </h4>
                      <span className="text-xs text-[var(--text-muted)]">
                        {normalizedImages.length} ภาพประกอบ
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {normalizedImages.map((img, imgIdx) => (
                        <div
                          key={imgIdx}
                          onClick={() => setLightboxIndex(imgIdx)}
                          className="group cursor-pointer rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-light)] overflow-hidden shadow-xs hover:shadow-md hover:border-[var(--primary-color)]/40 transition-all duration-200 flex flex-col"
                        >
                          <div className="h-48 w-full bg-black/5 dark:bg-black/40 overflow-hidden relative flex items-center justify-center">
                            <img
                              src={img.url}
                              alt={img.caption || img.name || `ภาพตัวอย่างที่ ${imgIdx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <span className="px-3.5 py-1.5 rounded-xl bg-black/75 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs shadow-md">
                                <ZoomIn className="w-4 h-4 text-white" />
                                <span>คลิกเพื่อดูภาพขยาย</span>
                              </span>
                            </div>
                          </div>
                          {img.caption && (
                            <div className="p-3 text-xs text-[var(--text-secondary)] font-medium bg-[var(--bg-surface)] border-t border-[var(--border-lighter)] flex items-center justify-between gap-2">
                              <span className="line-clamp-1">{img.caption}</span>
                              <ZoomIn className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Bottom Version Navigation (Previous / Next Version Quick Switcher) */}
                <nav className="pt-4 border-t border-[var(--border-light)] grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {prevVersion ? (
                    <button
                      onClick={() => setSelectedId(prevVersion.id)}
                      className="p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)] text-left flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--primary-color)] shrink-0">
                        <ArrowLeft className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-[10px] text-[var(--text-muted)]">เวอร์ชันก่อนหน้า</div>
                        <div className="text-xs font-bold text-[var(--text-primary)] font-mono">{prevVersion.version}</div>
                        <div className="text-[11px] text-[var(--text-secondary)] truncate">{prevVersion.title}</div>
                      </div>
                    </button>
                  ) : (
                    <div />
                  )}

                  {nextVersion && (
                    <button
                      onClick={() => setSelectedId(nextVersion.id)}
                      className="p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)] text-right flex items-center justify-end gap-3 transition-colors cursor-pointer group sm:col-start-2"
                    >
                      <div className="overflow-hidden">
                        <div className="text-[10px] text-[var(--text-muted)]">เวอร์ชันถัดไป</div>
                        <div className="text-xs font-bold text-[var(--text-primary)] font-mono">{nextVersion.version}</div>
                        <div className="text-[11px] text-[var(--text-secondary)] truncate">{nextVersion.title}</div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--primary-color)] shrink-0">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </button>
                  )}
                </nav>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-light)] flex items-center justify-center text-[var(--text-muted)]">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-[var(--text-primary)]">ไม่พบบันทึกข้อมูลเวอร์ชัน</h4>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                  {canManageChangelog 
                    ? 'คุณสามารถเริ่มต้นสร้างบันทึกประวัติเวอร์ชันใหม่ได้โดยกดปุ่ม "เพิ่มเวอร์ชันใหม่" ด้านบน' 
                    : 'ยังไม่มีข้อมูลเวอร์ชันที่พร้อมแสดงผลในขณะนี้'}
                </p>
                {canManageChangelog && (
                  <button
                    onClick={handleOpenCreate}
                    className="px-4 py-2 rounded-xl bg-[var(--primary-color)] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm hover:opacity-90"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มเวอร์ชันใหม่</span>
                  </button>
                )}
              </div>
            )}
          </main>
        </div>

        {/* Modal Bottom Status Bar */}
        <footer className="px-5 py-3 border-t border-[var(--border-light)] bg-[var(--bg-elevated)]/70 flex items-center justify-between text-xs text-[var(--text-muted)] shrink-0">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-[var(--text-secondary)]">
              ระบบสารบรรณอิเล็กทรอนิกส์ (EDMS Rayong)
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              บันทึกประวัติทั้งหมด {changelogs.length} เวอร์ชัน
            </span>
            {latestVersion && (
              <>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline">
                  รุ่นใช้งานล่าสุด: <strong className="font-mono text-[var(--text-primary)]">{latestVersion.version}</strong> ({formatThaiDateString(latestVersion.releaseDate)})
                </span>
              </>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--border-lighter)] border border-[var(--border-light)] text-[var(--text-primary)] font-semibold transition-colors cursor-pointer text-xs"
          >
            ปิดหน้าต่าง
          </button>
        </footer>
      </div>

      {/* Editor Modal for Admin */}
      {isEditorOpen && (
        <ChangelogEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSaved={handleEditorSaved}
          changelogToEdit={changelogToEdit}
          currentUser={currentUser}
          latestVersion={latestVersion?.version}
          existingVersions={changelogs.map(c => c.version)}
        />
      )}

      {/* Lightbox Image Modal with Next/Prev Controls */}
      {lightboxIndex !== null && normalizedImages[lightboxIndex] && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-fade-in"
          onClick={() => setLightboxIndex(null)}
        >
          <div 
            className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center justify-center" 
            onClick={e => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div className="w-full flex items-center justify-between text-white/90 text-xs px-2 mb-3">
              <span className="font-medium bg-black/50 px-3 py-1 rounded-full border border-white/10">
                รูปภาพที่ {lightboxIndex + 1} จาก {normalizedImages.length}
              </span>
              <button
                onClick={() => setLightboxIndex(null)}
                className="text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                title="ปิดภาพขยาย (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Image with Prev/Next Buttons */}
            <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black/60 max-h-[75vh] flex items-center justify-center w-full">
              <img
                src={normalizedImages[lightboxIndex].url}
                alt={normalizedImages[lightboxIndex].caption || 'Expanded preview'}
                className="max-h-[75vh] max-w-full object-contain rounded-xl"
              />

              {/* Prev Button */}
              {normalizedImages.length > 1 && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : normalizedImages.length - 1);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all cursor-pointer"
                  title="รูปภาพก่อนหน้า"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Next Button */}
              {normalizedImages.length > 1 && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setLightboxIndex(lightboxIndex < normalizedImages.length - 1 ? lightboxIndex + 1 : 0);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all cursor-pointer"
                  title="รูปภาพถัดไป"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Caption */}
            {normalizedImages[lightboxIndex].caption && (
              <div className="mt-3 px-4 py-2 rounded-xl bg-black/70 border border-white/15 text-white text-xs sm:text-sm text-center max-w-2xl leading-relaxed">
                {normalizedImages[lightboxIndex].caption}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h4 className="text-base font-bold text-[var(--text-primary)]">ยืนยันการลบบันทึกประวัติเวอร์ชัน</h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                คุณแน่ใจหรือไม่ว่าต้องการลบบันทึกประวัติเวอร์ชันนี้? ข้อมูลและภาพที่เกี่ยวข้องจะถูกลบออกจากระบบอย่างถาวร
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border-light)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConfirm(deletingId)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-sm disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
