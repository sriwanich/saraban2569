import React, { useState, useEffect } from 'react';
import { DocumentItem, User, formatThaiDate, formatThaiDateShort, formatThaiDateMedium, formatThaiDateTime } from '../../types';
import { Search, Eye, Edit2, Trash2, FileText, Plus, Printer, Paperclip, X, Pin, Zap } from 'lucide-react';

interface Props {
  title: string;
  documents: DocumentItem[];
  user?: User | null;
  onViewDoc: (doc: DocumentItem) => void;
  onCreateDoc?: () => void;
  onEditDoc?: (doc: DocumentItem) => void;
  onDeleteDoc?: (id: string) => void;
  favorites?: string[];
  onToggleFavorite?: (doc: DocumentItem) => void;
  hasPermission?: (key: string) => boolean;
}

export default function DocumentList({ title, documents, user, onViewDoc, onCreateDoc, onEditDoc, onDeleteDoc, favorites = [], onToggleFavorite, hasPermission }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 50;
  const [orgName, setOrgName] = useState('สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  const [logoUrl, setLogoUrl] = useState('https://upload.wikimedia.org/wikipedia/commons/4/4b/Seal_of_the_Ministry_of_Interior_of_Thailand.svg');

  const [scopeFilter, setScopeFilter] = useState<'all' | 'central' | 'department'>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, selectedYear, scopeFilter, selectedDeptFilter]);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => {
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          return res.json();
        }
        return null;
      })
      .then(data => {
        if (data) {
          if (data.orgName) setOrgName(data.orgName);
          if (data.logoUrl) setLogoUrl(data.logoUrl);
        }
      })
      .catch(() => {});
  }, []);

  // Privileged check: only admin and moderator can see Central Saraban documents
  const isCentralPrivileged = user?.role === 'admin' || user?.role === 'moderator';

  // Filter docs
  const filteredDocs = React.useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (doc.receiveNumber && doc.receiveNumber.includes(searchTerm)) ||
        doc.docNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.to.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesYear = selectedYear === 'all' || doc.year === selectedYear;

      const isCentralDoc = !(doc.isCentral === 0 || Number(doc.isCentral) === 0);

      // Regular users MUST NOT see Central Saraban documents UNLESS forwarded to or received by their department
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

      const matchesDept = 
        selectedDeptFilter === 'all' ? true :
        (doc.department === selectedDeptFilter || (doc.departmentReceives && doc.departmentReceives.some(r => r.department === selectedDeptFilter)));

      return matchesSearch && matchesYear && matchesScope && matchesDept;
    });
  }, [documents, searchTerm, selectedYear, scopeFilter, selectedDeptFilter, isCentralPrivileged, user?.department]);

  const sortedFilteredDocs = React.useMemo(() => {
    return [...filteredDocs].sort((a, b) => {
      return Number(b.receiveNumber) - Number(a.receiveNumber);
    });
  }, [filteredDocs]);

  const paginatedDocs = React.useMemo(() => {
    return sortedFilteredDocs.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  }, [sortedFilteredDocs, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedFilteredDocs.length / pageSize);

  // Extract unique years & departments
  const availableYears = React.useMemo(() => Array.from(new Set(documents.map(d => d.year))).filter(Boolean).sort((a, b) => b.localeCompare(a)), [documents]);
  const availableDepartments = React.useMemo(() => Array.from(new Set(documents.map(d => d.department).filter(Boolean))) as string[], [documents]);

  const canDeleteDoc = (row: DocumentItem) => {
    if (hasPermission) {
      return hasPermission('delete_docs');
    }
    if (!user) return true;
    return user.role === 'admin' || user.role === 'moderator';
  };

  const canEditDoc = (row: DocumentItem) => {
    if (hasPermission) {
      const isMine = (row.createdBy && row.createdBy === user?.username) ||
                     (row.assignee && user?.firstName && (row.assignee === user.firstName || row.assignee.includes(user.firstName)));
      return hasPermission('edit_all_docs') || Boolean(isMine);
    }
    if (!user) return true;
    if (user.role === 'admin' || user.role === 'moderator') return true;
    const isMine = (row.createdBy && row.createdBy === user.username) ||
                   (row.assignee && (row.assignee === user.firstName || row.assignee.includes(user.firstName)));
    return Boolean(isMine);
  };

  const getReceiveNumberDisplay = (row: DocumentItem, isMobile: boolean) => {
    const isDeptDoc = row.isCentral === 0 || Number(row.isCentral) === 0;

    if (isDeptDoc) {
      if (isMobile) {
        return `${row.receiveNumber || '-'}`;
      }
      return (
        <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">{row.receiveNumber || '-'}</span>
      );
    }

    if (user && user.role !== 'admin' && user.department && row.departmentReceives) {
      const deptRec = row.departmentReceives.find(r => r.department === user.department);
      if (deptRec) {
        if (isMobile) {
          return `${deptRec.receiveNumber || row.receiveNumber || '-'}`;
        }
        return (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">{deptRec.receiveNumber || row.receiveNumber || '-'}</span>
        );
      }
    }

    if (isMobile) {
      return `${row.receiveNumber || '-'}`;
    }
    return (
      <span className="font-bold text-[var(--text-primary)] font-mono">{row.receiveNumber || '-'}</span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const cleanPriority = (priority || 'ปกติ').trim();
    let color = '';
    if (cleanPriority === 'ด่วนที่สุด') color = 'text-red-600 border-red-500/20 bg-red-500/10 dark:text-red-400';
    else if (cleanPriority === 'ด่วนมาก') color = 'text-orange-600 border-orange-500/20 bg-orange-500/10 dark:text-orange-400';
    else if (cleanPriority === 'ด่วน') color = 'text-amber-600 border-amber-500/20 bg-amber-500/10 dark:text-amber-400';
    else color = 'text-slate-500 border-slate-500/15 bg-slate-500/5 dark:text-slate-400 dark:bg-slate-500/10';
    
    return (
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${color} whitespace-nowrap inline-flex items-center gap-1 shadow-sm`}>
        {cleanPriority === 'ด่วนที่สุด' && <Zap className="w-3.5 h-3.5 text-red-500 dark:text-red-400 animate-pulse" />}
        {cleanPriority}
      </span>
    );
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const isInbox = title.includes('รับ') || (sortedFilteredDocs.length > 0 && sortedFilteredDocs[0].type === 'inbox');
    const headerTitle = isInbox ? 'ทะเบียนหนังสือรับ' : 'ทะเบียนหนังสือส่ง';
    const numLabel = isInbox ? 'เลขทะเบียนรับ' : 'เลขทะเบียนส่ง';

    const currentOrg = orgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';

    // Group documents by date
    const groups: Record<string, DocumentItem[]> = {};
    sortedFilteredDocs.forEach(l => {
      const d = l.date || '-';
      if (!groups[d]) groups[d] = [];
      groups[d].push(l);
    });

    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    const escH = (str: string | undefined | null) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    let tablesContent = '';
    if (dates.length === 0) {
      tablesContent = '<p style="text-align:center; margin-top:20px;">— ไม่มีรายการ —</p>';
    } else {
      dates.forEach(d => {
        const dateStr = d !== '-' ? `วันที่ ${formatThaiDate(d)}` : 'ไม่ระบุวันที่';
        tablesContent += `
          <div style="font-size:15pt;font-weight:700;margin:8pt 0 3pt;">${dateStr}</div>
          <table style="width:100%;border-collapse:collapse;">
            <colgroup>
              <col style="width:9%" />
              <col style="width:12%" />
              <col style="width:10%" />
              <col style="width:14%" />
              <col style="width:13%" />
              <col style="width:24%" />
              <col style="width:10%" />
              <col style="width:8%" />
            </colgroup>
            <thead>
              <tr>
                <th>${numLabel}</th>
                <th>ที่</th>
                <th>ลงวันที่</th>
                <th>จาก</th>
                <th>ถึง</th>
                <th>เรื่อง</th>
                <th>การปฏิบัติ</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              ${groups[d].map(l => `
                <tr>
                  <td style="text-align:center;">${escH(isInbox ? (l.receiveNumber || '-') : (l.receiveNumber || l.docNumber || '-'))}</td>
                  <td style="text-align:center;">${escH(l.docNumber || '-')}</td>
                  <td style="text-align:center;">${escH(formatThaiDateShort(l.date))}</td>
                  <td>${escH(l.from || (isInbox ? '-' : currentOrg))}</td>
                  <td>${escH(l.to || '-')}</td>
                  <td>${escH(l.title || '-')}</td>
                  <td style="text-align:center;">${escH(l.assignee || l.department || l.status || '-')}</td>
                  <td style="text-align:center;">${escH(l.note || (l.registerDate ? 'รับเวลา ' + formatThaiDateTime(l.registerDate).split(' ')[1] : '-'))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${headerTitle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap');
            
            @font-face {
              font-family: 'TH SarabunPSK';
              src: local('TH SarabunPSK'), local('TH Sarabun New'), local('Sarabun New');
            }

            @page {
              size: A4 landscape;
              margin: 15mm;
            }

            * {
              font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun New', 'Sarabun', sans-serif !important;
              box-sizing: border-box;
            }

            html, body {
              font-family: 'TH SarabunPSK', 'TH Sarabun New', 'Sarabun New', 'Sarabun', sans-serif;
              font-size: 16pt;
              line-height: 1.5;
              color: #000;
              background: #fff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            p {
              font-family: 'TH SarabunPSK';
              font-size: 16pt;
              line-height: 1.5;
              margin: 0 0 3pt;
            }

            table {
              border-collapse: collapse;
              width: 100%;
              table-layout: fixed;
              margin: 5pt 0;
            }

            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }

            td, th {
              border: 1pt solid #555;
              padding: 4pt 7pt;
              font-size: 14pt;
              line-height: 1.5;
              vertical-align: middle;
              word-wrap: break-word;
            }

            th {
              background: #d9d9d9;
              font-weight: 700;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div style="text-align:center;font-size:18pt;font-weight:700;">${headerTitle}</div>
          <div style="text-align:center;font-size:15pt;margin-bottom:6pt;">${escH(currentOrg)}</div>

          ${tablesContent}

          <script>
            window.onload = () => {
              setTimeout(() => { window.print(); }, 150);
            };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Page Header */}
      <div className="bg-[var(--bg-overlay)] backdrop-blur-3xl border border-[var(--border-light)] rounded-3xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[var(--primary-color)]/10 to-transparent rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20 transition-all duration-700 group-hover:from-[var(--primary-color)]/20" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-sans font-extrabold text-[var(--text-primary)] tracking-tight">{title}</h1>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] border border-[var(--primary-color)]/20 font-mono shadow-sm">
                {filteredDocs.length} ฉบับ
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] font-medium">
              ทะเบียนหนังสือดิจิทัลประจำ {user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'}
            </p>
          </div>
          
          {/* Actions Grid Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full md:w-auto">
            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-primary)] rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-[var(--primary-color)] cursor-pointer hover:border-[var(--primary-color)]/40 hover:shadow-xs transition-all w-full"
            >
              <option value="all">ทุกปีงบประมาณ</option>
              {availableYears.map(y => (
                <option key={y} value={y}>ปี พ.ศ. {y}</option>
              ))}
            </select>

            {/* Search Box */}
            <div className="flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl px-3.5 py-2.5 focus-within:border-[var(--primary-color)] transition-all hover:border-[var(--primary-color)]/40 hover:shadow-xs w-full">
              <Search className="w-4 h-4 text-[var(--primary-color)] shrink-0" />
              <input 
                type="text" 
                placeholder="ค้นหาเลขรับ, ที่, เรื่อง..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] w-full" 
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button 
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-blue-600 hover:border-blue-500/50 hover:shadow-sm transition-all text-xs font-bold shrink-0 cursor-pointer group"
              title="พิมพ์ทะเบียนหนังสือรับ/ส่ง"
            >
              <Printer className="w-4 h-4 shrink-0 text-blue-500 group-hover:scale-110 transition-transform" />
              <span>พิมพ์ทะเบียน</span>
            </button>

            {onCreateDoc && (
              <button 
                type="button"
                onClick={onCreateDoc}
                className="flex items-center justify-center gap-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-[var(--primary-color)]/20 hover:shadow-lg active:scale-[0.98] shrink-0 cursor-pointer group"
              >
                <Plus className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" />
                <span>ลงทะเบียนหนังสือ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Registry Level Tabs (สารบรรณกลาง VS ฝ่าย/กลุ่มงาน) */}
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
              สมุดทะเบียนทั้งหมด ({documents.length})
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
              สารบรรณกลาง ({documents.filter(d => !(d.isCentral === 0 || Number(d.isCentral) === 0)).length})
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
              ฝ่าย / กลุ่มงาน ({documents.filter(d => (d.isCentral === 0 || Number(d.isCentral) === 0)).length})
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>สมุดทะเบียน: {user?.department || 'ฝ่ายปฏิบัติ'} ({filteredDocs.length} รายการ)</span>
            </div>
          </div>
        )}

        {((isCentralPrivileged && scopeFilter === 'department') || !isCentralPrivileged) && availableDepartments.length > 0 && (
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

      {/* Main Table Container */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl overflow-hidden shadow-sm flex flex-col">
        {/* Mobile View: Cards */}
        <div className="block lg:hidden divide-y divide-[var(--border-lighter)]">
          {paginatedDocs.length > 0 ? (
            paginatedDocs.map((row) => (
              <div key={row.id} className="p-5 space-y-4 hover:bg-[var(--bg-elevated)]/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {onToggleFavorite && (
                      <button
                        onClick={() => onToggleFavorite(row)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          favorites.includes(row.id)
                            ? 'text-amber-500 bg-amber-500/10'
                            : 'text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/10'
                        }`}
                        title={favorites.includes(row.id) ? 'ยกเลิกปักหมุด' : 'ปักหมุด'}
                      >
                        <Pin className={`w-4 h-4 transform rotate-45 ${favorites.includes(row.id) ? 'fill-current' : ''}`} />
                      </button>
                    )}
                    <span className="text-xs font-mono font-bold text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-3 py-1 rounded-lg">
                      {getReceiveNumberDisplay(row, true)}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-overlay)] px-3 py-1 rounded-lg">
                    {formatThaiDateMedium(row.date)}
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                    {row.title}
                  </h4>
                  <div className="text-xs font-mono text-[var(--text-muted)]">
                    ที่ {row.docNumber}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(row.priority)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => onViewDoc(row)}
                      className="p-2 text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 rounded-lg transition-colors"
                      title="ดูรายละเอียด"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {onEditDoc && canEditDoc(row) && (
                      <button 
                        onClick={() => onEditDoc(row)}
                        className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                        title="แก้ไขเอกสาร"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {onDeleteDoc && canDeleteDoc(row) && (
                      <button 
                        onClick={() => onDeleteDoc(row.id)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="ลบเอกสาร"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-[var(--text-muted)]">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              ไม่พบข้อมูลหนังสือ
            </div>
          )}
        </div>

        {/* Desktop View: Polished Table */}
        <div className="hidden lg:block overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-light)] text-[0.75rem] uppercase tracking-wider text-[var(--text-secondary)] font-bold">
                <th className="p-4 rounded-tl-xl font-bold text-center w-[120px]">{title.includes('รับ') ? 'ลำดับ' : 'เลขทะเบียนส่ง'}</th>
                <th className="p-4 font-bold text-center w-[100px]">ปี</th>
                <th className="p-4 font-bold text-center w-[180px]">เลขที่หนังสือ</th>
                <th className="p-4 font-bold text-center min-w-[380px]">เรื่อง / รายละเอียด</th>
                <th className="p-4 font-bold text-center w-[250px]">ต้นทาง → ปลายทาง</th>
                <th className="p-4 font-bold text-center w-[200px]">ผู้รับผิดชอบ</th>
                <th className="p-4 text-center rounded-tr-xl font-bold w-[140px]">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="text-[13px] divide-y divide-[var(--border-lighter)] bg-[var(--bg-overlay)]/30">
              {paginatedDocs.length > 0 ? (
                paginatedDocs.map((row) => (
                  <tr 
                    key={row.id} 
                    className="hover:bg-[var(--bg-elevated)]/50 transition-colors group"
                  >
                    <td className="p-4 font-mono font-bold text-[var(--primary-color)] text-center align-middle">
                      <span className="bg-[var(--primary-color)]/5 border border-[var(--primary-color)]/10 px-2.5 py-1 rounded-lg text-xs inline-block">
                        {getReceiveNumberDisplay(row, false)}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] text-center align-middle font-mono font-bold">
                      {row.year}
                    </td>
                    <td className="p-4 font-mono text-[var(--text-primary)] text-center align-middle font-semibold text-xs">
                      {row.docNumber || '—'}
                    </td>
                    <td className="p-4 text-[var(--text-primary)] align-middle text-left">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[13.5px] text-[var(--text-primary)] leading-relaxed group-hover:text-[var(--primary-color)] transition-colors">
                          {row.title}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap justify-start">
                        {getPriorityBadge(row.priority)}
                        {row.attachments && row.attachments.length > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-md border border-sky-500/20 font-bold shrink-0" title={`${row.attachments.length} ไฟล์แนบ`}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0">
                              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                            <span>{row.attachments.length}</span>
                          </span>
                        )}
                        {row.registerDate && (
                          <span className="text-[10px] font-mono font-semibold text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-light)]">
                            ลงทะเบียน: {formatThaiDateTime(row.registerDate)}
                          </span>
                        )}
                        {row.status && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">
                            {row.status}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle text-center">
                      {row.type === 'inbox' ? (
                        <div className="inline-flex flex-col space-y-1 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/10 w-[30px] text-center">จาก</span>
                            <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[170px]" title={row.from}>{row.from || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded border border-slate-500/10 w-[30px] text-center">ถึง</span>
                            <span className="text-xs text-[var(--text-secondary)] truncate max-w-[170px]" title={row.to}>{row.to || '-'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex flex-col space-y-1 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded border border-slate-500/10 w-[30px] text-center">จาก</span>
                            <span className="text-xs text-[var(--text-secondary)] truncate max-w-[170px]" title={row.from}>{row.from || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10 w-[30px] text-center">ถึง</span>
                            <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[170px]" title={row.to}>{row.to || '-'}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] text-center align-middle">
                      {row.department ? (
                        <span className="text-xs font-bold bg-violet-500/5 text-violet-600 border border-violet-500/10 px-2.5 py-1 rounded-lg inline-block">
                          {row.department}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="p-4 text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => onViewDoc(row)}
                          className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 rounded-lg transition-colors cursor-pointer"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {onEditDoc && canEditDoc(row) && (
                          <button 
                            onClick={() => onEditDoc(row)}
                            className="p-2 text-amber-500 hover:bg-amber-500/10 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไขเอกสาร"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {onDeleteDoc && canDeleteDoc(row) && (
                          <button 
                            onClick={() => onDeleteDoc(row.id)}
                            className="p-2 text-red-500 hover:bg-red-500/10 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            title="ลบเอกสาร"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-[var(--text-muted)] font-semibold">
                    ไม่พบข้อมูลเอกสารในส่วนงานนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[var(--border-lighter)] bg-[var(--bg-elevated)]">
             <button 
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))} 
                disabled={currentPage === 0}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border-light)] disabled:opacity-50 hover:bg-[var(--border-lighter)] transition-colors"
             >
                ก่อนหน้า
             </button>
             <span className="text-sm text-[var(--text-secondary)]">หน้า {currentPage + 1} จาก {totalPages}</span>
             <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} 
                disabled={currentPage === totalPages - 1}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border-light)] disabled:opacity-50 hover:bg-[var(--border-lighter)] transition-colors"
             >
                ถัดไป
             </button>
          </div>
        )}
      </div>
    </div>
  );
}

