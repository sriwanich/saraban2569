import React, { useState, useEffect } from 'react';
import { DocumentItem, User, formatThaiDate, formatThaiDateShort, formatThaiDateMedium, formatThaiDateTime } from '../../types';
import { Search, Eye, Edit2, Trash2, FileText, Plus, Printer, Paperclip, X } from 'lucide-react';

interface Props {
  title: string;
  documents: DocumentItem[];
  user?: User | null;
  onViewDoc: (doc: DocumentItem) => void;
  onCreateDoc?: () => void;
  onEditDoc?: (doc: DocumentItem) => void;
  onDeleteDoc?: (id: string) => void;
}

export default function DocumentList({ title, documents, user, onViewDoc, onCreateDoc, onEditDoc, onDeleteDoc }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [orgName, setOrgName] = useState('สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  const [logoUrl, setLogoUrl] = useState('https://upload.wikimedia.org/wikipedia/commons/4/4b/Seal_of_the_Ministry_of_Interior_of_Thailand.svg');

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.orgName) setOrgName(data.orgName);
        if (data.logoUrl) setLogoUrl(data.logoUrl);
      })
      .catch(() => {});
  }, []);

  // Filter docs
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (doc.receiveNumber && doc.receiveNumber.includes(searchTerm)) ||
      doc.docNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.to.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = selectedYear === 'all' || doc.year === selectedYear;

    return matchesSearch && matchesYear;
  });

  const sortedFilteredDocs = [...filteredDocs].sort((a, b) => {
    return Number(b.receiveNumber) - Number(a.receiveNumber);
  });

  // Extract unique years
  const availableYears = Array.from(new Set(documents.map(d => d.year))).filter(Boolean).sort((a, b) => b.localeCompare(a));

  const getReceiveNumberDisplay = (row: DocumentItem, isMobile: boolean) => {
    if (user && user.role !== 'admin' && user.department && row.departmentReceives) {
      const deptRec = row.departmentReceives.find(r => r.department === user.department);
      if (deptRec) {
        if (isMobile) {
          return `${deptRec.receiveNumber} (ฝ่าย)`;
        }
        return (
          <div className="flex flex-col">
            <span className="text-emerald-500 font-bold">{deptRec.receiveNumber} <span className="text-[10px] font-normal text-[var(--text-muted)]">(ฝ่าย)</span></span>
            <span className="text-[11px] text-[var(--text-muted)]">{row.receiveNumber} (กลาง)</span>
          </div>
        );
      }
    }
    return row.receiveNumber || '-';
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
            <h1 className="text-2xl font-noto-serif-thai font-bold text-[var(--text-primary)]">{title}</h1>
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

      {/* Main Table Container */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl overflow-hidden shadow-sm flex flex-col">
        {/* Mobile View: Cards */}
        <div className="block lg:hidden divide-y divide-[var(--border-lighter)]">
          {sortedFilteredDocs.length > 0 ? (
            sortedFilteredDocs.map((row) => (
              <div key={row.id} className="p-4 space-y-3 hover:bg-[var(--border-lighter)]/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5 items-center">
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
                    {onEditDoc && (
                      <button 
                        onClick={() => onEditDoc(row)}
                        className="p-1.5 text-amber-400 hover:bg-amber-400/10 border border-amber-400/20 rounded-md transition-colors"
                        title="แก้ไข"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {onDeleteDoc && (
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
              {sortedFilteredDocs.length > 0 ? (
                sortedFilteredDocs.map((row) => (
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
                        <span className="font-medium hover:text-[var(--primary-color)] cursor-pointer transition-colors" onClick={() => onViewDoc(row)}>
                          {row.title}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {getPriorityBadge(row.priority)}
                          {row.attachments && row.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-[var(--primary-color)]/10 text-[var(--primary-color)] px-1.5 py-0.5 rounded border border-[var(--primary-color)]/20 font-medium whitespace-nowrap" title={`${row.attachments.length} ไฟล์แนบ`}>
                              <Paperclip className="w-3 h-3" />
                              <span>{row.attachments.length}</span>
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
                        {onEditDoc && (
                          <button 
                            onClick={() => onEditDoc(row)}
                            className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-md transition-colors"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {onDeleteDoc && (
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
      </div>
    </div>
  );
}

