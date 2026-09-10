import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Image as ImageIcon, Upload, Check, AlertCircle, Sparkles, Tag, Calendar, User, Eye, ArrowUp, ArrowDown, Lock } from 'lucide-react';
import { ChangelogItem, ChangelogType, ChangelogChangeItem, ChangelogImage } from '../types';
import { useConfirm } from '../context/ConfirmContext';

interface ChangelogEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  changelogToEdit?: ChangelogItem | null;
  currentUser?: any;
  latestVersion?: string;
  existingVersions?: string[];
}

// Automatically calculate next semver based on base version and release type
export function calculateNextVersion(
  baseVersion: string | undefined,
  releaseType: ChangelogType,
  existingVersions: string[] = []
): string {
  const target = (baseVersion || 'v2.4.0').trim();
  const match = target.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/i);
  let major = 2;
  let minor = 4;
  let patch = 0;

  if (match) {
    major = parseInt(match[1], 10) || 0;
    minor = match[2] !== undefined ? parseInt(match[2], 10) || 0 : 0;
    patch = match[3] !== undefined ? parseInt(match[3], 10) || 0 : 0;
  }

  if (releaseType === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (releaseType === 'minor') {
    minor += 1;
    patch = 0;
  } else if (releaseType === 'patch' || releaseType === 'hotfix') {
    patch += 1;
  }

  let nextVer = `v${major}.${minor}.${patch}`;

  // Make sure version doesn't collide with existing version records
  let attempt = patch;
  while (existingVersions.includes(nextVer)) {
    attempt += 1;
    if (releaseType === 'major') {
      major += 1;
      nextVer = `v${major}.0.0`;
    } else if (releaseType === 'minor') {
      minor += 1;
      nextVer = `v${major}.${minor}.0`;
    } else {
      patch = attempt;
      nextVer = `v${major}.${minor}.${patch}`;
    }
  }

  return nextVer;
}

const DEFAULT_CATEGORY_OPTIONS = [
  { category: 'feature', label: '✨ ฟีเจอร์ใหม่ (New Features)' },
  { category: 'improvement', label: '⚡ การปรับปรุง (Improvements)' },
  { category: 'fix', label: '🐛 แก้ไขข้อผิดพลาด (Bug Fixes)' },
  { category: 'security', label: '🔒 ความปลอดภัย (Security)' },
  { category: 'ui', label: '🎨 การปรับปรุงหน้าตา UI/UX' },
  { category: 'performance', label: '🚀 ประสิทธิภาพความเร็ว (Performance)' },
  { category: 'other', label: '📌 อื่นๆ (Others)' }
];

export default function ChangelogEditorModal({
  isOpen,
  onClose,
  onSaved,
  changelogToEdit,
  currentUser,
  latestVersion,
  existingVersions = []
}: ChangelogEditorModalProps) {
  const { confirm } = useConfirm();
  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [type, setType] = useState<ChangelogType>('minor');
  const [summary, setSummary] = useState('');
  const [author, setAuthor] = useState('');
  const [isLatest, setIsLatest] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  // Changes state
  const [changes, setChanges] = useState<ChangelogChangeItem[]>([]);
  // Images state
  const [images, setImages] = useState<ChangelogImage[]>([]);

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeNewCategory, setActiveNewCategory] = useState('feature');

  useEffect(() => {
    if (changelogToEdit) {
      setVersion(changelogToEdit.version || '');
      setTitle(changelogToEdit.title || '');
      setReleaseDate(changelogToEdit.releaseDate || new Date().toISOString().split('T')[0]);
      setType(changelogToEdit.type || 'minor');
      setSummary(changelogToEdit.summary || '');
      setAuthor(changelogToEdit.author || currentUser?.firstName || 'ผู้ดูแลระบบ');
      setIsLatest(Boolean(changelogToEdit.isLatest));
      setIsPublished(changelogToEdit.isPublished !== false);
      
      // Normalize changes
      if (Array.isArray(changelogToEdit.changes) && changelogToEdit.changes.length > 0) {
        setChanges(JSON.parse(JSON.stringify(changelogToEdit.changes)));
      } else {
        setChanges([
          {
            category: 'feature',
            categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
            items: ['']
          }
        ]);
      }

      // Normalize images
      if (Array.isArray(changelogToEdit.images)) {
        const normImages: ChangelogImage[] = changelogToEdit.images.map(img => {
          if (typeof img === 'string') {
            return { url: img, caption: '', name: 'รูปภาพประกอบ' };
          }
          return { url: img.url, caption: img.caption || '', name: img.name || 'รูปภาพประกอบ' };
        });
        setImages(normImages);
      } else {
        setImages([]);
      }
    } else {
      // New Release: compute next version automatically
      const defaultType: ChangelogType = 'minor';
      setType(defaultType);
      const autoVer = calculateNextVersion(latestVersion, defaultType, existingVersions);
      setVersion(autoVer);
      setTitle('');
      setReleaseDate(new Date().toISOString().split('T')[0]);
      setSummary('');
      setAuthor(currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : 'ผู้ดูแลระบบ');
      setIsLatest(true);
      setIsPublished(true);
      setChanges([
        {
          category: 'feature',
          categoryLabel: '✨ ฟีเจอร์ใหม่ (New Features)',
          items: ['']
        },
        {
          category: 'improvement',
          categoryLabel: '⚡ การปรับปรุง (Improvements)',
          items: ['']
        }
      ]);
      setImages([]);
    }
    setErrorMessage('');
  }, [changelogToEdit, isOpen, currentUser, latestVersion]);

  const handleTypeChange = (newType: ChangelogType) => {
    setType(newType);
    if (!changelogToEdit) {
      const autoVer = calculateNextVersion(latestVersion, newType, existingVersions);
      setVersion(autoVer);
    }
  };

  if (!isOpen) return null;

  // Category handlers
  const handleAddCategory = (catKey: string) => {
    const opt = DEFAULT_CATEGORY_OPTIONS.find(o => o.category === catKey);
    const label = opt ? opt.label : catKey;
    
    // Check if category already exists
    if (changes.some(c => c.category === catKey)) {
      setErrorMessage(`หมวดหมู่นี้มีอยู่ในรายการแล้ว สามารถเพิ่มรายการย่อยในหมวดหมู่เดิมได้`);
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    setChanges([...changes, { category: catKey, categoryLabel: label, items: [''] }]);
  };

  const handleRemoveCategory = (catIdx: number) => {
    const updated = [...changes];
    updated.splice(catIdx, 1);
    setChanges(updated);
  };

  const handleAddItemToCategory = (catIdx: number) => {
    const updated = [...changes];
    updated[catIdx].items.push('');
    setChanges(updated);
  };

  const handleItemChange = (catIdx: number, itemIdx: number, val: string) => {
    const updated = [...changes];
    updated[catIdx].items[itemIdx] = val;
    setChanges(updated);
  };

  const handleRemoveItem = (catIdx: number, itemIdx: number) => {
    const updated = [...changes];
    updated[catIdx].items.splice(itemIdx, 1);
    if (updated[catIdx].items.length === 0) {
      updated[catIdx].items.push('');
    }
    setChanges(updated);
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP, GIF)');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setErrorMessage(`ไฟล์ ${file.name} มีขนาดเกิน 8MB กรุณาเลือกไฟล์ที่มีขนาดเล็กลง`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const resultUrl = uploadEvent.target?.result as string;
        if (resultUrl) {
          setImages(prev => [
            ...prev,
            {
              url: resultUrl,
              name: file.name,
              caption: file.name.replace(/\.[^/.]+$/, '')
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageCaptionChange = (index: number, caption: string) => {
    setImages(prev => {
      const copy = [...prev];
      copy[index].caption = caption;
      return copy;
    });
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    setImages(prev => {
      const copy = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version.trim()) {
      setErrorMessage('กรุณาระบุเลขเวอร์ชัน (เช่น v2.4.0)');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('กรุณาระบุชื่อหัวข้ออัปเดตเวอร์ชัน');
      return;
    }

    // Filter out empty bullet points
    const cleanedChanges = changes
      .map(c => ({
        ...c,
        items: c.items.map(i => i.trim()).filter(i => i.length > 0)
      }))
      .filter(c => c.items.length > 0);

    const isEdit = Boolean(changelogToEdit && changelogToEdit.id);
    const confirmed = await confirm({
      title: isEdit ? 'ยืนยันการบันทึกการแก้ไขเวอร์ชัน' : 'ยืนยันการบันทึกประวัติเวอร์ชัน',
      message: isEdit 
        ? `คุณต้องการบันทึกการแก้ไขข้อมูลประวัติเวอร์ชัน ${version.trim()} (${title.trim()}) ใช่หรือไม่?`
        : `คุณต้องการบันทึกและเผยแพร่ประวัติเวอร์ชัน ${version.trim()} (${title.trim()}) เข้าสู่ระบบใช่หรือไม่?`,
      type: isEdit ? 'edit' : 'save',
      itemDetail: `เวอร์ชัน: ${version.trim()} • หัวข้อ: ${title.trim()}`,
      confirmText: isEdit ? 'ยืนยันการแก้ไข' : 'ยืนยันการบันทึก',
      cancelText: 'ยกเลิก'
    });

    if (!confirmed) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        version: version.trim(),
        title: title.trim(),
        releaseDate: releaseDate || new Date().toISOString().split('T')[0],
        type,
        summary: summary.trim(),
        changes: cleanedChanges,
        images,
        author: author.trim() || 'ผู้ดูแลระบบ',
        isLatest,
        isPublished,
        username: currentUser?.username || 'admin'
      };

      let res: Response;
      if (changelogToEdit && changelogToEdit.id) {
        res = await fetch(`/api/changelogs/${changelogToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/changelogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Save changelog error:', err);
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)] bg-[var(--bg-elevated)]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-sans text-[var(--text-primary)]">
                {changelogToEdit ? 'แก้ไขบันทึกประวัติเวอร์ชัน (Edit Changelog)' : 'สร้างบันทึกประวัติเวอร์ชันใหม่ (New Release Notes)'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                ระบบจัดการเวอร์ชันและประวัติการพัฒนาซอฟต์แวร์ EDMS (Admin Management)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded-xl hover:bg-[var(--border-lighter)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Primary Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-light)]">
            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center justify-between">
                <span>ระดับการอัปเดต (Release Type) <span className="text-red-500">*</span></span>
              </label>
              <select
                value={type}
                onChange={e => handleTypeChange(e.target.value as ChangelogType)}
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] font-medium"
              >
                <option value="minor">✨ Minor Release (เพิ่มฟีเจอร์ใหม่)</option>
                <option value="patch">⚡ Patch Update (ปรับปรุงย่อย / แก้ไข)</option>
                <option value="major">🌟 Major Release (อัปเกรดระบบใหญ่)</option>
                <option value="hotfix">🔥 Hotfix (แก้ไขเร่งด่วน)</option>
              </select>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                เปลี่ยนระดับเพื่อคำนวณเวอร์ชันใหม่อัตโนมัติ
              </p>
            </div>

            {/* Version (Automatic & Read Only) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                  <span>รหัสเลขเวอร์ชัน</span>
                  <span className="text-red-500">*</span>
                </label>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Lock className="w-2.5 h-2.5" />
                  <span>อัตโนมัติ</span>
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  readOnly
                  disabled
                  value={version}
                  placeholder="ระบบคำนวณอัตโนมัติ"
                  className="w-full pl-3.5 pr-9 py-2 text-sm rounded-lg bg-[var(--bg-surface)]/60 border border-[var(--border-light)] text-[var(--primary-color)] focus:outline-none font-mono font-extrabold cursor-not-allowed select-none shadow-inner opacity-95"
                />
                <div className="absolute right-3 top-2.5 text-[var(--text-muted)] pointer-events-none" title="ระบบกำหนดอัตโนมัติ ไม่สามารถแก้ไขได้เอง">
                  <Lock className="w-4 h-4 text-[var(--text-muted)]" />
                </div>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                <span className="truncate">
                  {changelogToEdit 
                    ? 'ล็อกตามประวัติการบันทึกเดิม' 
                    : `อิงจากเวอร์ชันล่าสุด (${latestVersion || 'v2.4.0'})`}
                </span>
              </p>
            </div>

            {/* Release Date */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                วันที่ปล่อยอัปเดต (Date) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={releaseDate}
                onChange={e => setReleaseDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              />
            </div>

            {/* Author */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                ผู้บันทึก / เผยแพร่
              </label>
              <input
                type="text"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="เช่น ผู้ดูแลระบบกลาง"
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              />
            </div>
          </div>

          {/* Title & Summary */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                ชื่อหัวข้อการอัปเดต (Release Title) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="เช่น เปิดตัวระบบ Changelog & Release Notes และศูนย์ความปลอดภัยเต็มระบบ"
                className="w-full px-4 py-2.5 text-sm rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-light)] text-[var(--text-primary)] font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                บทคัดย่อ / สรุปภาพรวมการเปลี่ยนแปลง (Summary)
              </label>
              <textarea
                rows={3}
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="อธิบายสรุปสั้นๆ เกี่ยวกับวัตถุประสงค์และภาพรวมของการอัปเดตเวอร์ชันนี้..."
                className="w-full px-4 py-2.5 text-sm rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-light)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] resize-y shadow-sm"
              />
            </div>
          </div>

          {/* Categorized Changes Section */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-light)] pb-3">
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)] font-sans flex items-center gap-2">
                  <span>รายการการเปลี่ยนแปลงแยกตามหมวดหมู่ (Change Categories)</span>
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  เพิ่มหัวข้อย่อยและรายละเอียดฟังก์ชันที่พัฒนาหรือปรับปรุง
                </p>
              </div>

              {/* Add Category Quick Action */}
              <div className="flex items-center gap-2">
                <select
                  value={activeNewCategory}
                  onChange={e => setActiveNewCategory(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-light)] text-[var(--text-primary)] focus:outline-none"
                >
                  {DEFAULT_CATEGORY_OPTIONS.map(opt => (
                    <option key={opt.category} value={opt.category}>{opt.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleAddCategory(activeNewCategory)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--primary-color)] text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มหมวดหมู่นี้
                </button>
              </div>
            </div>

            {changes.length === 0 ? (
              <div className="p-8 text-center bg-[var(--bg-elevated)]/40 border border-dashed border-[var(--border-light)] rounded-xl text-[var(--text-muted)] text-sm">
                ยังไม่มีหมวดหมู่การเปลี่ยนแปลง กรุณาเลือกหมวดหมู่ด้านบนแล้วกด "เพิ่มหมวดหมู่นี้"
              </div>
            ) : (
              <div className="space-y-4">
                {changes.map((cat, catIdx) => (
                  <div
                    key={catIdx}
                    className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-light)] space-y-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--text-primary)]">{cat.categoryLabel}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-lighter)] text-[var(--text-muted)] font-mono">
                          {cat.items.filter(i => i.trim()).length} รายการ
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(catIdx)}
                        className="text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        title="ลบหมวดหมู่นี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">ลบหมวดหมู่</span>
                      </button>
                    </div>

                    {/* Bullet Items */}
                    <div className="space-y-2 pl-2 sm:pl-3 border-l-2 border-[var(--primary-color)]/30">
                      {cat.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[var(--primary-color)] shrink-0" />
                          <input
                            type="text"
                            value={item}
                            onChange={e => handleItemChange(catIdx, itemIdx, e.target.value)}
                            placeholder="ระบุรายละเอียดการเปลี่ยนแปลงหรือฟังก์ชันใหม่..."
                            className="flex-1 px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(catIdx, itemIdx)}
                            className="text-[var(--text-muted)] hover:text-red-500 p-1.5 rounded-lg hover:bg-[var(--border-lighter)] transition-colors cursor-pointer shrink-0"
                            title="ลบรายการนี้"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddItemToCategory(catIdx)}
                        className="text-xs font-semibold text-[var(--primary-color)] hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        เพิ่มรายการย่อยในหมวดนี้
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Image Attachments Section (แนบรูปภาพได้) */}
          <div className="space-y-4 pt-4 border-t border-[var(--border-light)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)] font-sans flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-500" />
                  <span>รูปภาพตัวอย่างและภาพหน้าจอ (Screenshots & Visual Showcase)</span>
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  แนบภาพหน้าจอพรีวิวฟังก์ชันการทำงาน เพื่อให้ผู้ใช้งานเห็นภาพการเปลี่ยนแปลงที่ชัดเจน
                </p>
              </div>

              {/* Upload Button */}
              <label className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm cursor-pointer transition-all active:scale-95">
                <Upload className="w-3.5 h-3.5" />
                <span>แนบรูปภาพหน้าจอ (Upload Images)</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {images.length === 0 ? (
              <div className="p-8 text-center bg-[var(--bg-elevated)]/40 border border-dashed border-[var(--border-light)] rounded-2xl text-[var(--text-muted)] text-sm flex flex-col items-center justify-center gap-2">
                <ImageIcon className="w-8 h-8 opacity-40 text-emerald-500" />
                <span>ยังไม่มีการแนบรูปภาพ สามารถกดปุ่ม "แนบรูปภาพหน้าจอ" ด้านบนเพื่อเพิ่มภาพตัวอย่าง</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-light)] space-y-2.5 relative group shadow-sm flex flex-col"
                  >
                    {/* Image Preview */}
                    <div className="h-44 w-full rounded-lg overflow-hidden bg-black/5 dark:bg-black/40 border border-[var(--border-lighter)] flex items-center justify-center relative">
                      <img
                        src={img.url}
                        alt={img.caption || `Screenshot ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 'up')}
                          disabled={idx === 0}
                          className="text-white hover:text-amber-400 p-1 disabled:opacity-30 cursor-pointer"
                          title="เลื่อนขึ้น"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 'down')}
                          disabled={idx === images.length - 1}
                          className="text-white hover:text-amber-400 p-1 disabled:opacity-30 cursor-pointer"
                          title="เลื่อนลง"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                          title="ลบรูปภาพนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Caption Input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                        คำบรรยายภาพ (Caption)
                      </label>
                      <input
                        type="text"
                        value={img.caption || ''}
                        onChange={e => handleImageCaptionChange(idx, e.target.value)}
                        placeholder="ระบุคำอธิบายภาพ เช่น หน้าจอการกำหนดสิทธิ์ผู้ใช้งาน..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Visibility & Badges Toggles */}
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-light)] flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isLatest}
                onChange={e => setIsLatest(e.target.checked)}
                className="w-4 h-4 text-[var(--primary-color)] rounded border-[var(--border-medium)] focus:ring-[var(--primary-color)] cursor-pointer"
              />
              <div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">ตั้งเป็นเวอร์ชันล่าสุดของระบบ (Latest Version)</span>
                <p className="text-xs text-[var(--text-muted)]">จะนำเลขเวอร์ชันนี้ไปแสดงบนแถบ Header ทุกหน้าจอโดยอัตโนมัติ</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={e => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-[var(--border-medium)] focus:ring-emerald-500 cursor-pointer"
              />
              <div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">เผยแพร่สู่ผู้ใช้งานทันที (Published)</span>
                <p className="text-xs text-[var(--text-muted)]">อนุญาตให้ผู้ใช้งานทุกคนมองเห็นใน Changelog</p>
              </div>
            </label>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-[var(--border-light)] flex items-center justify-end gap-3 sticky bottom-0 bg-[var(--bg-surface)] py-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] text-xs font-semibold transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90 text-white text-xs font-semibold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังบันทึกข้อมูล...' : changelogToEdit ? 'บันทึกการแก้ไข' : 'บันทึกและเผยแพร่เวอร์ชัน'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
