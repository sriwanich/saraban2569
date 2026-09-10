import React, { useState, useEffect } from 'react';
import { DocumentItem, User, formatThaiDate, formatThaiDateShort, formatThaiDateMedium, formatThaiDateTime } from '../../types';
import { Search, Eye, Edit2, Trash2, FileText, Plus, Printer, Paperclip, X, Pin } from 'lucide-react';

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
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (doc.receiveNumber && doc.receiveNumber.includes(searchTerm)) ||
      doc.docNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.to.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = selectedYear === 'all' || doc.year === selectedYear;

    const isCentralDoc = !(doc.isCentral === 0 || Number(doc.isCentral) === 0);

    // Regular users MUST NOT see Central Saraban documents
    if (!isCentralPrivileged && isCentralDoc) {
      return false;
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

  const sortedFilteredDocs = [...filteredDocs].sort((a, b) => {
    return Number(b.receiveNumber) - Number(a.receiveNumber);
  });

  const paginatedDocs = sortedFilteredDocs.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const totalPages = Math.ceil(sortedFilteredDocs.length / pageSize);

  // Extract unique years & departments
  const availableYears = Array.from(new Set(documents.map(d => d.year))).filter(Boolean).sort((a, b) => b.localeCompare(a));
  const availableDepartments = Array.from(new Set(documents.map(d => d.department).filter(Boolean))) as string[];

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
        return `${row.receiveNumber || '-'} (${row.department || 'ฝ่าย'})`;
      }
      return (
        <div className="flex flex-col">
          <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">{row.receiveNumber || '-'}</span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
            {row.department ? `(ฝ่าย: ${row.department})` : '(ฝ่าย/กลุ่มงาน)'}
          </span>
        </div>
      );
    }

    if (user && user.role !== 'admin' && user.department && row.departmentReceives) {
      const deptRec = row.departmentReceives.find(r => r.department === user.department);
      if (deptRec) {
        if (isMobile) {
          return `${deptRec.receiveNumber} (ฝ่าย) / ${row.receiveNumber || '-'} (กลาง)`;
        }
        return (
          <div className="flex flex-col">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">{deptRec.receiveNumber} <span className="text-[10px] font-normal text-[var(--text-muted)]">(ฝ่าย)</span></span>
            <span className="text-[11px] text-blue-500/80 font-mono">{row.receiveNumber} (กลาง)</span>
          </div>
        );
      }
    }

    if (isMobile) {
      return `${row.receiveNumber || '-'} (กลาง)`;
    }
    return (
      <div className="flex flex-col">
        <span className="font-bold text-[var(--text-primary)] font-mono">{row.receiveNumber || '-'}</span>
        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">(สารบรรณกลาง)</span>
      </div>
    );
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'ปกติ' || !priority) return null;
    let color = '';
    if (priority === 'ด่วนที่สุด') color = 'text-red-400 border-red-500/30 bg-red-500/10';
    else if (priority === 'ด่วนมาก') color = 'text-orange-400 border-orange-500/30 bg-orange-500/10';
    else color = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    
    return (
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${color} whitespace-nowrap inline-block`}>
        {priority}
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
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-sans font-bold text-[var(--text-primary)]">{title}</h1>
            <span className="px-3 py-0.5 text-xs font-semibold rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] border border-[var(--primary-color)]/20 font-mono">
              {filteredDocs.length} ฉบับ
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            ทะเบียนหนังสือดิจิทัลประจำ {user?.department || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'}
          </p>
        </div>
        
        {/* Actions bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--primary-color)] cursor-pointer"
          >
            <option value="all">ทุกปีงบประมาณ</option>
            {availableYears.map(y => (
              <option key={y} value={y}>ปี พ.ศ. {y}</option>
            ))}
          </select>

          {/* Search Box */}
          <div className="flex items-center gap-2 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 focus-within:border-[var(--primary-color)] transition-colors w-full sm:w-64">
            <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <input 
              type="text" 
              placeholder="ค้นหาเลขรับ, ที่, เรื่อง, จาก, ถึง..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] w-full" 
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-lighter)] transition-colors text-sm font-medium shrink-0 cursor-pointer"
            title="พิมพ์ทะเบียนหนังสือ"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">พิมพ์ทะเบียน</span>
          </button>

          {onCreateDoc && (
            <button 
              onClick={onCreateDoc}
              className="flex items-center gap-1.5 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shrink-0 border border-[var(--primary-color)]/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ลงทะเบียนหนังสือ</span>
            </button>
          )}
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
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl overflow-hidden shadow-sm flex flex-col">
        {/* Mobile View: Cards */}
        <div className="block lg:hidden divide-y divide-[var(--border-lighter)]">
          {paginatedDocs.length > 0 ? (
            paginatedDocs.map((row) => (
              <div key={row.id} className="p-4 space-y-3 hover:bg-[var(--border-lighter)]/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5 items-center">
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
                    <span className="text-xs font-mono font-bold text-[var(--primary-color)] bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/20 px-2.5 py-0.5 rounded-md">
                      {title.includes('ส่ง') ? 'เลขส่ง' : 'เลขรับ'}: {getReceiveNumberDisplay(row, true)}
                    </span>
                    <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded border border-[var(--border-light)]">
                      ปี พ.ศ. {row.year}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-overlay)] px-2 py-0.5 rounded border border-[var(--border-light)]">
                    {formatThaiDateMedium(row.date)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs text-[var(--text-muted)] font-mono font-semibold">
                    ที่ {row.docNumber}
                  </div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-relaxed">
                    {row.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {getPriorityBadge(row.priority)}
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap font-medium ${
                      row.type === 'inbox' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10' :
                      row.type === 'outbox' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' :
                      'text-teal-400 border-teal-400/30 bg-teal-500/10'
                    }`}>
                      {row.type === 'inbox' ? 'หนังสือรับ' : row.type === 'outbox' ? 'หนังสือส่ง' : 'งานธุรการ'}
                    </span>
                    {row.attachments && row.attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] bg-[var(--primary-color)]/10 text-[var(--primary-color)] px-2 py-0.5 rounded border border-[var(--primary-color)]/20 font-medium">
                        <Paperclip className="w-3 h-3" />
                        <span>{row.attachments.length} ไฟล์</span>
                      </span>
                    )}
                    {row.readStatus === 'read' && (
                      <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded" title="คุณเปิดอ่านแล้ว">
                        ✓✓ เปิดแล้ว
                      </span>
                    )}
                    {row.readStatus === 'reading' && (
                      <span className="text-[10px] text-green-500 font-bold bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded flex items-center gap-1" title="คุณกำลังอ่านอยู่">
                        <span className="flex h-1.5 w-1.5 relative shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                        </span>
                        กำลังอ่าน
                      </span>
                    )}
                    {row.readStatus === 'sent' && (
                      <span className="text-[10px] text-slate-400 font-medium bg-slate-500/10 border border-slate-500/10 px-1.5 py-0.5 rounded" title="ส่งถึงคุณแล้ว (ยังไม่ได้เปิด)">
                        ✓ ส่งแล้ว
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--bg-elevated)] p-2.5 rounded-lg border border-[var(--border-light)] text-[var(--text-secondary)]">
                  <div>
                    <span className="text-[var(--text-muted)] block mb-0.5">จาก</span>
                    <span className="font-medium text-[var(--text-primary)] line-clamp-1">{row.from || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block mb-0.5">ถึง</span>
                    <span className="font-medium text-[var(--text-primary)] line-clamp-1">{row.to || '-'}</span>
                  </div>
                  <div className="col-span-2 border-t border-[var(--border-lighter)]/50 pt-2 mt-1">
                    <span className="text-[var(--text-muted)] mr-1">ผู้รับผิดชอบ:</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {row.department || '-'} {row.assignee ? `(${row.assignee})` : ''}
                    </span>
                  </div>
                  {row.note && (
                    <div className="col-span-2 text-[var(--text-muted)] italic">
                      <span className="font-medium">หมายเหตุ:</span> {row.note}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
                  <span>ลงทะเบียน: {formatThaiDateTime(row.registerDate)}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onViewDoc(row)}
                      className="p-1.5 text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/20 rounded-md transition-colors"
                      title="รายละเอียด"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {onEditDoc && canEditDoc(row) && (
                      <button 
                        onClick={() => onEditDoc(row)}
                        className="p-1.5 text-amber-400 hover:bg-amber-400/10 border border-amber-400/20 rounded-md transition-colors"
                        title="แก้ไข"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {onDeleteDoc && canDeleteDoc(row) && (
                      <button 
                        onClick={() => onDeleteDoc(row.id)}
                        className="p-1.5 text-red-400 hover:bg-red-400/10 border border-red-400/20 rounded-md transition-colors"
                        title="ลบ"
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
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-lighter)] text-[0.8rem] text-[var(--text-secondary)] font-semibold tracking-wide">
                <th className="p-3.5 w-28 whitespace-nowrap">{title.includes('ส่ง') ? 'เลขส่ง' : 'เลขรับ'}</th>
                <th className="p-3.5 w-20 whitespace-nowrap">ปี พ.ศ.</th>
                <th className="p-3.5 w-36 whitespace-nowrap">เลขที่เอกสาร</th>
                <th className="p-3.5 w-32 whitespace-nowrap">ลงวันที่ (ไทย)</th>
                <th className="p-3.5 min-w-[260px]">เรื่อง / สาระสำคัญ</th>
                <th className="p-3.5 w-40 whitespace-nowrap">จาก</th>
                <th className="p-3.5 w-40 whitespace-nowrap">ถึง</th>
                <th className="p-3.5 w-40 whitespace-nowrap">กลุ่มปฏิบัติงาน</th>
                <th className="p-3.5 w-36 whitespace-nowrap">ผู้ปฏิบัติ</th>
                <th className="p-3.5 w-36 whitespace-nowrap">วันลงทะเบียน</th>
                <th className="p-3.5 w-28 text-right whitespace-nowrap sticky right-0 bg-[var(--bg-elevated)] z-10 border-l border-[var(--border-lighter)] shadow-[-4px_0_12px_rgba(0,0,0,0.15)]">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-[var(--border-lighter)]">
              {paginatedDocs.length > 0 ? (
                paginatedDocs.map((row) => (
                  <tr 
                    key={row.id} 
                    className="hover:bg-[var(--border-lighter)]/40 transition-colors group"
                  >
                    <td className="p-3.5 font-mono font-semibold text-[var(--primary-color)] align-top">
                      {getReceiveNumberDisplay(row, false)}
                    </td>
                    <td className="p-3.5 font-mono text-[var(--text-secondary)] align-top">
                      {row.year}
                    </td>
                    <td className="p-3.5 font-mono font-medium text-[var(--text-primary)] align-top whitespace-nowrap">
                      {row.docNumber}
                    </td>
                    <td className="p-3.5 text-[var(--text-secondary)] align-top whitespace-nowrap">
                      <span className="font-medium text-[var(--text-primary)]">
                        {formatThaiDateMedium(row.date)}
                      </span>
                    </td>
                    <td className="p-3.5 text-[var(--text-primary)] align-top leading-relaxed">
                      <div className="flex items-start gap-2 flex-wrap">
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
                        <span className="font-medium hover:text-[var(--primary-color)] cursor-pointer transition-colors" onClick={() => onViewDoc(row)}>
                          {row.title}
                        </span>
                        <div className="flex items-center gap-1 shrink-0 flex-wrap">
                          {getPriorityBadge(row.priority)}
                          {row.attachments && row.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-[var(--primary-color)]/10 text-[var(--primary-color)] px-1.5 py-0.5 rounded border border-[var(--primary-color)]/20 font-medium whitespace-nowrap" title={`${row.attachments.length} ไฟล์แนบ`}>
                              <Paperclip className="w-3 h-3" />
                              <span>{row.attachments.length}</span>
                            </span>
                          )}
                          {row.readStatus === 'read' && (
                            <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded" title="คุณเปิดอ่านแล้ว">
                              ✓✓ เปิดแล้ว
                            </span>
                          )}
                          {row.readStatus === 'reading' && (
                            <span className="text-[10px] text-green-500 font-bold bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded flex items-center gap-1" title="คุณกำลังอ่านอยู่">
                              <span className="flex h-1.5 w-1.5 relative shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                              </span>
                              กำลังอ่าน
                            </span>
                          )}
                          {row.readStatus === 'sent' && (
                            <span className="text-[10px] text-slate-400 font-medium bg-slate-500/10 border border-slate-500/10 px-1.5 py-0.5 rounded" title="ส่งถึงคุณแล้ว (ยังไม่ได้เปิด)">
                              ✓ ส่งแล้ว
                            </span>
                          )}
                        </div>
                      </div>
                      {row.note && (
                        <p className="text-xs text-[var(--text-muted)] italic mt-0.5">หมายเหตุ: {row.note}</p>
                      )}
                    </td>
                    <td className="p-3.5 text-[var(--text-secondary)] align-top">{row.from || '-'}</td>
                    <td className="p-3.5 text-[var(--text-secondary)] align-top">{row.to || '-'}</td>
                    <td className="p-3.5 text-[var(--text-secondary)] align-top">{row.department || '-'}</td>
                    <td className="p-3.5 text-[var(--text-secondary)] align-top">{row.assignee || '-'}</td>
                    <td className="p-3.5 text-xs text-[var(--text-muted)] align-top whitespace-nowrap font-mono">
                      {formatThaiDateTime(row.registerDate)}
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
                        {onEditDoc && canEditDoc(row) && (
                          <button 
                            onClick={() => onEditDoc(row)}
                            className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-md transition-colors"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {onDeleteDoc && canDeleteDoc(row) && (
                          <button 
                            onClick={() => onDeleteDoc(row.id)}
                            className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                            title="ลบ"
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
                  <td colSpan={11} className="p-12 text-center text-[var(--text-muted)]">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    ไม่พบข้อมูลหนังสือในทะเบียน
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

