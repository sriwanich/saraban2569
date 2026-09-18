import React, { useState, useEffect } from 'react';
import { DocumentItem, DocCategory, Folder, formatThaiDateShort, formatThaiDateMedium, formatThaiDateTime } from '../../types';
import { Search, Plus, Calendar, FileText, Eye, Edit2, Trash2, Tag, Layers, CheckCircle2, Circle, Paperclip, X, Pin, Award, Printer } from 'lucide-react';

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

  const handlePrintAdminRegistry = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const escH = (str: string | undefined | null) => {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    const currentOrg = user?.department ? `สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง (${user.department})` : 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';

    const html = `
      <html>
        <head>
          <title>ทะเบียนคำสั่ง / ประกาศ / เอกสารธุรการ</title>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Sarabun', sans-serif; font-size: 13pt; color: #000; margin: 0; padding: 10px; }
            h1 { text-align: center; font-size: 18pt; margin: 0 0 4px; }
            p.sub { text-align: center; font-size: 14pt; color: #333; margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
            th, td { border: 1px solid #444; padding: 6px 8px; vertical-align: middle; word-wrap: break-word; }
            th { background-color: #f1f5f9; font-weight: bold; text-align: center; font-size: 13pt; }
            td { font-size: 12pt; }
          </style>
        </head>
        <body>
          <h1>ทะเบียนคำสั่ง / ประกาศ / เอกสารธุรการ</h1>
          <p class="sub">${escH(currentOrg)}</p>
          <table>
            <thead>
              <tr>
                <th style="width: 8%">ลำดับ</th>
                <th style="width: 14%">เลขที่คำสั่ง/เอกสาร</th>
                <th style="width: 12%">ลงวันที่</th>
                <th style="width: 10%">หมวดหมู่</th>
                <th style="width: 38%">เรื่อง</th>
                <th style="width: 18%">หน่วยงาน/ฝ่ายที่รับผิดชอบ</th>
              </tr>
            </thead>
            <tbody>
              ${filteredDocs.length === 0 ? '<tr><td colspan="6" style="text-align:center;">— ไม่พบข้อมูล —</td></tr>' : filteredDocs.map((doc, idx) => `
                <tr>
                  <td style="text-align:center;">${idx + 1}</td>
                  <td style="text-align:center;font-weight:bold;">${escH(doc.docNumber || '-')}</td>
                  <td style="text-align:center;">${escH(doc.date || '-')}</td>
                  <td style="text-align:center;">${doc.category === 'order' ? 'คำสั่ง' : doc.category === 'announcement' ? 'ประกาศ' : doc.category === 'certificate' ? 'หนังสือรับรอง' : 'ทั่วไป'}</td>
                  <td>${escH(doc.title)}</td>
                  <td>${escH(doc.department || 'ปภ.ระยอง')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); }, 150); };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 lg:space-y-8 pb-10 animate-fade-in">
      {/* Header section */}
      <div className="bg-[var(--bg-overlay)] backdrop-blur-3xl border border-[var(--border-light)] rounded-3xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[var(--primary-color)]/10 to-transparent rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20 transition-all duration-700 group-hover:from-[var(--primary-color)]/20" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
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

          {/* Action Grid Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
            <button
              type="button"
              onClick={handlePrintAdminRegistry}
              className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] hover:text-blue-600 hover:border-blue-500/40 hover:shadow-md transition-all text-xs font-bold cursor-pointer group"
              title="พิมพ์ทะเบียนคำสั่ง/ประกาศ"
            >
              <Printer className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
              <span>พิมพ์ทะเบียนธุรการ</span>
            </button>

            <button
              type="button"
              onClick={onCreateDoc}
              className="flex items-center justify-center gap-2.5 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-[var(--primary-color)]/20 hover:shadow-lg active:scale-[0.98] cursor-pointer group"
            >
              <Plus className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" />
              <span>ลงทะเบียนเอกสารธุรการ</span>
            </button>
          </div>
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

      {/* Filters Section & Menu Grid */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        {/* Category Selector Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer group ${
              categoryFilter === 'all'
                ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-md'
                : 'bg-[var(--bg-surface)] border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--primary-color)]/40 hover:shadow-sm'
            }`}
            title="แสดงเอกสารธุรการทั้งหมด"
          >
            <Layers className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" />
            <span>ทั้งหมด</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('order')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer group ${
              categoryFilter === 'order'
                ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                : 'bg-[var(--bg-surface)] border-[var(--border-light)] text-[var(--text-secondary)] hover:text-violet-600 hover:border-violet-500/40 hover:shadow-sm'
            }`}
            title="กรองเฉพาะคำสั่ง"
          >
            <Tag className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" />
            <span>คำสั่ง</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('announcement')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer group ${
              categoryFilter === 'announcement'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                : 'bg-[var(--bg-surface)] border-[var(--border-light)] text-[var(--text-secondary)] hover:text-emerald-600 hover:border-emerald-500/40 hover:shadow-sm'
            }`}
            title="กรองเฉพาะประกาศ"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" />
            <span>ประกาศ</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('certificate')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer group ${
              categoryFilter === 'certificate'
                ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                : 'bg-[var(--bg-surface)] border-[var(--border-light)] text-[var(--text-secondary)] hover:text-orange-600 hover:border-orange-500/40 hover:shadow-sm'
            }`}
            title="กรองเฉพาะหนังสือรับรอง"
          >
            <Award className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" />
            <span>หนังสือรับรอง</span>
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
          <table className="w-full border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-lighter)] text-[0.75rem] text-[var(--text-secondary)] font-bold tracking-wider uppercase">
                <th className="p-3.5 text-center font-bold w-44">เลขที่เอกสาร / คำสั่ง</th>
                <th className="p-3.5 text-center font-bold w-28">ประเภท</th>
                <th className="p-3.5 text-center font-bold w-36">ลงวันที่ (ไทย)</th>
                <th className="p-3.5 text-center font-bold min-w-[280px]">เรื่อง / สาระสำคัญ</th>
                <th className="p-3.5 text-center font-bold w-44">แฟ้มจัดเก็บดิจิทัล</th>
                <th className="p-3.5 text-center font-bold w-36">ฝ่ายปฏิบัติ</th>
                <th className="p-3.5 text-center font-bold w-28 sticky right-0 bg-[var(--bg-elevated)] z-10 border-l border-[var(--border-lighter)] shadow-[-4px_0_12px_rgba(0,0,0,0.15)]">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-lighter)] text-[13px]">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--border-lighter)]/40 transition-colors group">
                    <td className="p-3.5 font-mono font-bold text-[var(--text-primary)] text-center align-middle whitespace-nowrap">
                      <span>{row.docNumber}</span>
                    </td>
                    <td className="p-3.5 text-center align-middle">
                      {getCategoryBadge(row.category)}
                    </td>
                    <td className="p-3.5 text-center align-middle whitespace-nowrap">
                      <span className="font-bold text-[var(--text-primary)]">
                        {row.date ? formatThaiDateMedium(row.date) : '-'}
                      </span>
                    </td>
                    <td className="p-3.5 leading-relaxed text-left align-middle">
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
                        <div className="font-bold text-[var(--text-primary)] hover:text-[var(--primary-color)] cursor-pointer flex items-center gap-1.5" onClick={() => onViewDoc(row)}>
                          <span>{row.title}</span>
                          {row.attachments && row.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-md border border-sky-500/20 font-bold shrink-0" title={`${row.attachments.length} ไฟล์แนบ`}>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0">
                                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                              </svg>
                              <span>{row.attachments.length}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {row.content && (
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{row.content}</p>
                      )}
                    </td>
                    <td className="p-3.5 text-center align-middle">
                      <span className="text-xs px-2.5 py-1 rounded-md border border-amber-500/25 bg-amber-500/10 text-amber-400 font-bold inline-block max-w-[180px] truncate">
                        📁 {getFolderName(row)}
                      </span>
                    </td>
                    <td className="p-3.5 text-center align-middle">
                      {row.department ? (
                        <span className="text-xs font-bold bg-violet-500/5 text-violet-600 border border-violet-500/10 px-2.5 py-0.5 rounded-lg inline-block">
                          {row.department}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap sticky right-0 bg-[var(--bg-surface)] group-hover:bg-[var(--bg-elevated)] z-10 border-l border-[var(--border-lighter)] shadow-[-4px_0_12px_rgba(0,0,0,0.15)] transition-colors align-middle">
                      <div className="flex items-center justify-center gap-1">
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

