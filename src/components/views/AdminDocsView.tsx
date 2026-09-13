import React, { useState, useEffect } from 'react';
import { DocumentItem, DocCategory, Folder, formatThaiDateShort, formatThaiDateMedium, formatThaiDateTime } from '../../types';
import { Search, Plus, Calendar, FileText, Eye, Edit2, Trash2, Tag, Layers, CheckCircle2, Circle, Paperclip, X, Pin } from 'lucide-react';

interface Props {
  documents: DocumentItem[];
  user?: any;
  onViewDoc: (doc: DocumentItem) => void;
  onCreateDoc: () => void;
  onEditDoc: (doc: DocumentItem) => void;
  onDeleteDoc: (id: string) => void;
  favorites?: string[];
  onToggleFavorite?: (doc: DocumentItem) => void;
}

export default function AdminDocsView({ documents, user, onViewDoc, onCreateDoc, onEditDoc, onDeleteDoc, favorites = [], onToggleFavorite }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'central' | 'department'>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [folders, setFolders] = useState<Folder[]>([]);

  // Privileged check: only admin and moderator can see Central Saraban administrative documents
  const isCentralPrivileged = user?.role === 'admin' || user?.role === 'moderator';

  // Fetch folders list for filtering and labeling
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
    fetchFolders();
  }, []);

  const adminDocs = documents.filter(d => d.type === 'admin');

  // Available departments from admin docs
  const availableDepartments = Array.from(new Set(adminDocs.map(d => d.department).filter(Boolean))) as string[];

  // Filter documents
  const filteredDocs = adminDocs.filter(doc => {
    const isCentralDoc = !(doc.isCentral === 0 || Number(doc.isCentral) === 0);

    // Regular users MUST NOT see Central Saraban administrative documents UNLESS forwarded to or received by their department
    if (!isCentralPrivileged && isCentralDoc) {
      const userDept = user?.department;
      const isForwardedToMe = userDept && doc.forwardedTo && doc.forwardedTo.includes(userDept);
      const hasMyDeptReceive = userDept && doc.departmentReceives && doc.departmentReceives.some(r => r.department === userDept);
      if (!isForwardedToMe && !hasMyDeptReceive) {
        return false;
      }
    }

    const matchesScope = 
      !isCentralPrivileged ? true :
      scopeFilter === 'all' ? true :
      scopeFilter === 'central' ? isCentralDoc :
      !isCentralDoc;

    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesSearch = searchQuery.trim() === '' || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.docNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.content && doc.content.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesYear = selectedYear === 'all' || doc.year === selectedYear;
    const matchesDept = selectedDeptFilter === 'all' || doc.department === selectedDeptFilter;

    return matchesScope && matchesCategory && matchesSearch && matchesYear && matchesDept;
  });

  // Unique years list for filter
  const years = Array.from(new Set(adminDocs.map(d => d.year))).sort((a, b) => b.localeCompare(a));

  const getCategoryLabel = (cat?: string) => {
    switch (cat) {
      case 'order': return 'คำสั่ง';
      case 'announcement': return 'ประกาศ';
      case 'certificate': return 'หนังสือรับรอง';
      default: return 'ทั่วไป';
    }
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'order':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/25">คำสั่ง</span>;
      case 'announcement':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">ประกาศ</span>;
      case 'certificate':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/25">หนังสือรับรอง</span>;
      default:
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/25">ทั่วไป</span>;
    }
  };

  const getFolderName = (docOrFolderId?: any) => {
    if (typeof docOrFolderId === 'object' && docOrFolderId !== null) {
      if (docOrFolderId.folderName) return docOrFolderId.folderName;
      if (!docOrFolderId.folderId) return 'สารบรรณทั่วไป';
      const folder = folders.find(f => Number(f.id) === Number(docOrFolderId.folderId));
      return folder ? folder.name : 'สารบรรณทั่วไป';
    }
    if (!docOrFolderId) return 'สารบรรณทั่วไป';
    const folder = folders.find(f => Number(f.id) === Number(docOrFolderId));
    return folder ? folder.name : 'สารบรรณทั่วไป';
  };

  return (
    <div className="space-y-6 lg:space-y-8 pb-10 animate-fade-in">
      {/* Header section */}
      <div className="bg-[var(--bg-overlay)] backdrop-blur-3xl border border-[var(--border-light)] rounded-3xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[var(--primary-color)]/10 to-transparent rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20 transition-all duration-700 group-hover:from-[var(--primary-color)]/20" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-sans font-extrabold text-[var(--text-primary)] tracking-tight">
                ระบบงานธุรการ (คำสั่ง / ประกาศ)
              </h2>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-mono shadow-sm">
                {filteredDocs.length} รายการ
              </span>
            </div>
            <p className="text-[var(--text-secondary)] text-sm font-medium">
              ทะเบียนและคลังจัดเก็บคำสั่ง ประกาศ และหนังสือรับรองราชการดิจิทัลอย่างเป็นระบบ
            </p>
          </div>
          <button
            onClick={onCreateDoc}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-dark)] hover:from-[var(--primary-hover)] hover:to-[var(--primary-color)] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-[var(--primary-color)]/20 hover:shadow-xl hover:shadow-[var(--primary-color)]/30 hover:-translate-y-0.5 active:scale-[0.98] shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> ลงทะเบียนเอกสารธุรการ
          </button>
        </div>
      </div>

      {/* Scope Filter Tabs (สารบรรณกลาง VS ฝ่าย/กลุ่มงาน) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl">
        {isCentralPrivileged ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setScopeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                scopeFilter === 'all'
                  ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] shadow-sm border border-[var(--border-light)] font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50'
              }`}
            >
              เอกสารธุรการทั้งหมด ({adminDocs.length})
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('central')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                scopeFilter === 'central'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-[var(--text-secondary)] hover:text-blue-600 hover:bg-blue-500/10'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${scopeFilter === 'central' ? 'bg-white' : 'bg-blue-500'}`}></span>
              สารบรรณกลาง ({adminDocs.filter(d => !(d.isCentral === 0 || Number(d.isCentral) === 0)).length})
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('department')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                scopeFilter === 'department'
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'text-[var(--text-secondary)] hover:text-emerald-600 hover:bg-emerald-500/10'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${scopeFilter === 'department' ? 'bg-white' : 'bg-emerald-500'}`}></span>
              ฝ่าย / กลุ่มงาน ({adminDocs.filter(d => (d.isCentral === 0 || Number(d.isCentral) === 0)).length})
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>เอกสารธุรการ: {user?.department || 'ฝ่ายปฏิบัติ'} ({filteredDocs.length} รายการ)</span>
            </div>
          </div>
        )}

        {((isCentralPrivileged && scopeFilter === 'department') || !isCentralPrivileged) && availableDepartments.length > 1 && (
          <div className="flex items-center gap-2 pl-2">
            <span className="text-xs text-[var(--text-muted)] font-medium">สังกัดฝ่าย:</span>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] rounded-lg px-2.5 py-1 text-xs outline-none focus:border-[var(--primary-color)] cursor-pointer"
            >
              <option value="all">ทุกฝ่ายงาน</option>
              {availableDepartments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] p-5 rounded-3xl flex items-center gap-4 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300">
          <div className="p-3.5 bg-[var(--primary-color)]/10 text-[var(--primary-color)] rounded-2xl shrink-0 shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-[var(--text-primary)]">
              {adminDocs.length}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-medium mt-1">เอกสารธุรการทั้งหมด</div>
          </div>
        </div>

        <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-violet-500/15 dark:border-violet-500/20 p-5 rounded-3xl flex items-center gap-4 shadow-sm hover:shadow-[0_8px_30px_rgb(139,92,246,0.1)] hover:-translate-y-1 transition-all duration-300">
          <div className="p-3.5 bg-violet-500/10 text-violet-400 rounded-2xl shrink-0 shadow-sm">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-[var(--text-primary)]">
              {adminDocs.filter(d => d.category === 'order').length}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-medium mt-1">คำสั่ง สนง.ปภ. ระยอง</div>
          </div>
        </div>

        <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-emerald-500/15 dark:border-emerald-500/20 p-5 rounded-3xl flex items-center gap-4 shadow-sm hover:shadow-[0_8px_30px_rgb(16,185,129,0.1)] hover:-translate-y-1 transition-all duration-300">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-[var(--text-primary)]">
              {adminDocs.filter(d => d.category === 'announcement').length}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-medium mt-1">ประกาศ สนง.ปภ. ระยอง</div>
          </div>
        </div>

        <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-orange-500/15 dark:border-orange-500/20 p-5 rounded-3xl flex items-center gap-4 shadow-sm hover:shadow-[0_8px_30px_rgb(249,115,22,0.1)] hover:-translate-y-1 transition-all duration-300">
          <div className="p-3.5 bg-orange-500/10 text-orange-400 rounded-2xl shrink-0 shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-[var(--text-primary)]">
              {adminDocs.filter(d => d.category === 'certificate').length}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-medium mt-1">หนังสือรับรอง</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        {/* Category Selector Tabs */}
        <div className="flex bg-[var(--bg-overlay)] p-1 rounded-lg border border-[var(--border-light)] w-full md:w-auto overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${categoryFilter === 'all' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setCategoryFilter('order')}
            className={`px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${categoryFilter === 'order' ? 'bg-violet-500/20 text-violet-400 shadow-sm font-semibold' : 'text-[var(--text-secondary)] hover:text-violet-400'}`}
          >
            คำสั่ง
          </button>
          <button
            onClick={() => setCategoryFilter('announcement')}
            className={`px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${categoryFilter === 'announcement' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm font-semibold' : 'text-[var(--text-secondary)] hover:text-emerald-400'}`}
          >
            ประกาศ
          </button>
          <button
            onClick={() => setCategoryFilter('certificate')}
            className={`px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${categoryFilter === 'certificate' ? 'bg-orange-500/20 text-orange-400 shadow-sm font-semibold' : 'text-[var(--text-secondary)] hover:text-orange-400'}`}
          >
            หนังสือรับรอง
          </button>
        </div>

        {/* Input / Select filters */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="ค้นหาตามชื่อเรื่อง / เลขที่..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg pl-9 pr-8 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors placeholder-[var(--text-muted)]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--primary-color)] cursor-pointer"
          >
            <option value="all">ทุกปีงบประมาณ</option>
            {years.map(y => (
              <option key={y} value={y}>พ.ศ. {y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table & Cards section */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl overflow-hidden flex flex-col shadow-sm">
        
        {/* Mobile View: list of items as cards */}
        <div className="block md:hidden divide-y divide-[var(--border-lighter)]">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((row) => (
              <div key={row.id} className="p-4 space-y-3 hover:bg-[var(--border-lighter)]/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {onToggleFavorite && (
                      <button
                        onClick={() => onToggleFavorite(row)}
                        className={`p-1 rounded-md transition-colors ${
                          favorites.includes(row.id)
                            ? 'text-amber-500 bg-amber-500/10 border border-amber-500/20'
                            : 'text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/10'
                        }`}
                        title={favorites.includes(row.id) ? 'ยกเลิกปักหมุด' : 'ปักหมุด'}
                      >
                        <Pin className={`w-3 h-3 transform rotate-45 ${favorites.includes(row.id) ? 'fill-current text-amber-500' : ''}`} />
                      </button>
                    )}
                    <span className="text-xs font-mono font-semibold text-[var(--text-primary)] bg-[var(--bg-elevated)] px-2.5 py-1 rounded border border-[var(--border-light)]">
                      {row.docNumber}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] font-mono bg-[var(--bg-overlay)] px-2 py-0.5 rounded border border-[var(--border-light)]">
                    พ.ศ. {row.year}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!(row.isCentral === 0 || Number(row.isCentral) === 0) ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        สารบรรณกลาง
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        ฝ่าย/กลุ่มงาน
                      </span>
                    )}
                    {getCategoryBadge(row.category)}
                    <span className="text-[11px] px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/10 text-amber-400 font-medium">
                      📁 {getFolderName(row)}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-relaxed">
                    {row.title}
                  </h4>
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-lighter)]/40">
                  <span>ลงวันที่: {formatThaiDateMedium(row.date)}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onViewDoc(row)}
                      className="p-1.5 text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/20 rounded-md transition-colors"
                      title="รายละเอียด"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onEditDoc(row)}
                      className="p-1.5 text-amber-400 hover:bg-amber-400/10 border border-amber-400/20 rounded-md transition-colors"
                      title="แก้ไข"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDeleteDoc(row.id)}
                      className="p-1.5 text-red-400 hover:bg-red-400/10 border border-red-400/20 rounded-md transition-colors"
                      title="ลบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-[var(--text-muted)]">ไม่พบข้อมูลคำสั่งหรือประกาศ</div>
          )}
        </div>

        {/* Desktop View: Polished Table */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-lighter)] text-xs text-[var(--text-secondary)] font-semibold tracking-wider">
                <th className="p-3.5 w-44">เลขที่เอกสาร / คำสั่ง</th>
                <th className="p-3.5 w-28">ประเภท</th>
                <th className="p-3.5 w-36">ลงวันที่ (ไทย)</th>
                <th className="p-3.5 min-w-[280px]">เรื่อง / สาระสำคัญ</th>
                <th className="p-3.5 w-44">แฟ้มจัดเก็บดิจิทัล</th>
                <th className="p-3.5 w-36">ฝ่ายปฏิบัติ</th>
                <th className="p-3.5 w-28 text-right sticky right-0 bg-[var(--bg-elevated)] z-10 border-l border-[var(--border-lighter)] shadow-[-4px_0_12px_rgba(0,0,0,0.15)]">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-lighter)] text-sm">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--border-lighter)]/40 transition-colors group">
                    <td className="p-3.5 font-mono font-medium text-[var(--text-primary)] align-top whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span>{row.docNumber}</span>
                        {!(row.isCentral === 0 || Number(row.isCentral) === 0) ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            สารบรรณกลาง
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            ฝ่าย/กลุ่มงาน
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 align-top">
                      {getCategoryBadge(row.category)}
                    </td>
                    <td className="p-3.5 text-xs text-[var(--text-secondary)] align-top whitespace-nowrap">
                      <span className="font-medium text-[var(--text-primary)] text-sm">
                        {row.date ? formatThaiDateMedium(row.date) : '-'}
                      </span>
                    </td>
                    <td className="p-3.5 leading-relaxed align-top">
                      <div className="flex items-center gap-2">
                        {onToggleFavorite && (
                          <button
                            onClick={() => onToggleFavorite(row)}
                            className={`p-1 rounded-md transition-colors shrink-0 ${
                              favorites.includes(row.id)
                                ? 'text-amber-500 hover:bg-amber-500/10'
                                : 'text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/10'
                            }`}
                            title={favorites.includes(row.id) ? 'ยกเลิกปักหมุดเอกสารสำคัญ' : 'ปักหมุดเอกสารสำคัญ'}
                          >
                            <Pin className={`w-3.5 h-3.5 transform rotate-45 ${favorites.includes(row.id) ? 'fill-current text-amber-500' : ''}`} />
                          </button>
                        )}
                        <div className="font-medium text-[var(--text-primary)] hover:text-[var(--primary-color)] cursor-pointer flex items-center gap-1.5" onClick={() => onViewDoc(row)}>
                          <span>{row.title}</span>
                          {row.attachments && row.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-[var(--primary-color)]/10 text-[var(--primary-color)] px-1.5 py-0.5 rounded border border-[var(--primary-color)]/20 font-medium shrink-0" title={`${row.attachments.length} ไฟล์แนบ`}>
                              <Paperclip className="w-3 h-3" />
                              <span>{row.attachments.length}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {row.content && (
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{row.content}</p>
                      )}
                    </td>
                    <td className="p-3.5 align-top">
                      <span className="text-xs px-2.5 py-1 rounded-md border border-amber-500/25 bg-amber-500/10 text-amber-400 font-medium inline-block max-w-[180px] truncate">
                        📁 {getFolderName(row)}
                      </span>
                    </td>
                    <td className="p-3.5 text-xs text-[var(--text-secondary)] align-top">
                      {row.department || '-'}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap sticky right-0 bg-[var(--bg-surface)] group-hover:bg-[var(--bg-elevated)] z-10 border-l border-[var(--border-lighter)] shadow-[-4px_0_12px_rgba(0,0,0,0.15)] transition-colors align-top">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => onViewDoc(row)}
                          className="p-1.5 text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 rounded-md transition-colors"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onEditDoc(row)}
                          className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-md transition-colors"
                          title="แก้ไข"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDeleteDoc(row.id)}
                          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-[var(--text-muted)] font-medium">
                    ไม่พบข้อมูลเอกสารธุรการ (คำสั่ง/ประกาศ/หนังสือรับรอง) ในฐานข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

