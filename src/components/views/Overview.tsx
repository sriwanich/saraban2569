import React, { useState, useMemo } from 'react';
import { DocumentItem, User } from '../../types';
import { 
  FileText, Eye, Inbox, Send, FileSpreadsheet, TrendingUp, AlertTriangle, 
  ShieldAlert, BarChart3, PieChart, Layers, Filter, CheckCircle2, Clock, 
  Building2, Lock, FileCheck, ArrowUpRight, Activity, Calendar, Zap, ChevronRight
} from 'lucide-react';

interface Props {
  documents: DocumentItem[];
  user?: User;
  onCreateDoc: (type?: 'inbox' | 'outbox' | 'admin') => void;
  onViewDoc: (doc: DocumentItem) => void;
  enabledFeatures?: Record<string, boolean>;
}

export default function Overview({ documents, user, onCreateDoc, onViewDoc, enabledFeatures }: Props) {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'recent' | 'urgent'>('recent');

  const showInbox = !enabledFeatures || enabledFeatures.inbox !== false;
  const showOutbox = !enabledFeatures || enabledFeatures.outbox !== false;
  const showAdmin = !enabledFeatures || enabledFeatures.admin_docs !== false;

  // Available Years
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(documents.map(d => d.year).filter(Boolean)));
    years.sort((a, b) => String(b).localeCompare(String(a)));
    return years;
  }, [documents]);

  // Filtered Documents
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      // Filter out disabled feature types
      if (doc.type === 'inbox' && !showInbox) return false;
      if (doc.type === 'outbox' && !showOutbox) return false;
      if (doc.type === 'admin' && !showAdmin) return false;

      const matchYear = selectedYear === 'all' || doc.year === selectedYear;
      const matchType = selectedType === 'all' || doc.type === selectedType;
      return matchYear && matchType;
    });
  }, [documents, selectedYear, selectedType, showInbox, showOutbox, showAdmin]);

  // Core Counts
  const totalCount = filteredDocs.length;
  const inboxDocs = filteredDocs.filter(d => d.type === 'inbox');
  const outboxDocs = filteredDocs.filter(d => d.type === 'outbox');
  const adminDocs = filteredDocs.filter(d => d.type === 'admin');

  // Urgent & Secrecy
  const topUrgentDocs = filteredDocs.filter(d => d.priority === 'ด่วนที่สุด');
  const highUrgentDocs = filteredDocs.filter(d => d.priority === 'ด่วนมาก');
  const urgentCount = topUrgentDocs.length + highUrgentDocs.length;
  
  const confidentialDocs = filteredDocs.filter(d => d.secrecy && d.secrecy !== 'ปกติ');
  const confidentialCount = confidentialDocs.length;

  // Sub Category breakdown
  const circularCount = outboxDocs.filter(d => d.isCircular).length;
  const ordersCount = adminDocs.filter(d => d.category === 'order').length;
  const announcementsCount = adminDocs.filter(d => d.category === 'announcement').length;
  const certificatesCount = adminDocs.filter(d => d.category === 'certificate').length;

  // Department Workload Distribution
  const deptStats = useMemo(() => {
    const map: Record<string, number> = {};
    filteredDocs.forEach(d => {
      const dept = d.department && d.department.trim() !== '' ? d.department : 'ไม่ระบุกลุ่มงาน';
      map[dept] = (map[dept] || 0) + 1;
    });

    const items = Object.entries(map).map(([name, count]) => ({
      name,
      count,
      percent: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
    }));

    items.sort((a, b) => b.count - a.count);
    return items;
  }, [filteredDocs, totalCount]);

  // Priority Breakdown
  const priorityStats = useMemo(() => {
    const normal = filteredDocs.filter(d => !d.priority || d.priority === 'ปกติ').length;
    const urgent = filteredDocs.filter(d => d.priority === 'ด่วน').length;
    const veryUrgent = filteredDocs.filter(d => d.priority === 'ด่วนมาก').length;
    const topUrgent = filteredDocs.filter(d => d.priority === 'ด่วนที่สุด').length;

    return {
      normal,
      urgent,
      veryUrgent,
      topUrgent,
      pNormal: totalCount > 0 ? Math.round((normal / totalCount) * 100) : 0,
      pUrgent: totalCount > 0 ? Math.round((urgent / totalCount) * 100) : 0,
      pVeryUrgent: totalCount > 0 ? Math.round((veryUrgent / totalCount) * 100) : 0,
      pTopUrgent: totalCount > 0 ? Math.round((topUrgent / totalCount) * 100) : 0,
    };
  }, [filteredDocs, totalCount]);

  // Status Workflow Pipeline
  const statusStats = useMemo(() => {
    const registered = filteredDocs.filter(d => !d.status || d.status === 'ลงทะเบียน').length;
    const proposed = filteredDocs.filter(d => d.status === 'เสนอผู้บริหาร').length;
    const forwarded = filteredDocs.filter(d => d.status === 'ส่งต่อกลุ่มงาน').length;
    const completed = filteredDocs.filter(d => d.status === 'เสร็จสิ้น').length;

    const completionRate = totalCount > 0 ? Math.round((completed / totalCount) * 100) : 0;

    return {
      registered,
      proposed,
      forwarded,
      completed,
      completionRate
    };
  }, [filteredDocs, totalCount]);

  const getPriorityBadge = (priority: string) => {
    if (priority === 'ปกติ') return null;
    let color = '';
    if (priority === 'ด่วนที่สุด') color = 'text-red-400 border-red-400/30 bg-red-400/10';
    else if (priority === 'ด่วนมาก') color = 'text-orange-400 border-orange-400/30 bg-orange-400/10';
    else color = 'text-amber-400 border-amber-400/30 bg-amber-400/10';
    
    return (
      <span className={`text-[0.7rem] px-1.5 py-0.5 rounded border ${color} ml-2 whitespace-nowrap inline-flex items-center gap-1 font-medium`}>
        {priority === 'ด่วนที่สุด' && <Zap className="w-3 h-3 text-red-400" />}
        {priority}
      </span>
    );
  };

  const urgentAlertDocs = useMemo(() => {
    return filteredDocs.filter(d => d.priority === 'ด่วนที่สุด' || d.priority === 'ด่วนมาก').slice(0, 5);
  }, [filteredDocs]);

  return (
    <div className="space-y-6 lg:space-y-8 pb-10 animate-fade-in">
      {/* Executive Header Banner */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-6 lg:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--primary-color)]/5 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--primary-color)] mb-1.5">
              <Activity className="w-4 h-4 text-[var(--primary-color)] animate-pulse" />
              <span className="tracking-widest">Executive Analytics Dashboard</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-noto-serif-thai font-extrabold text-[var(--text-primary)] tracking-tight leading-none">
              ภาพรวมและสถิติงานสารบรรณ
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 max-w-2xl leading-relaxed">
              ศูนย์สรุปข้อมูล สถิติการรับ-ส่งเอกสาร ระดับความเร่งด่วน และสถานะการดำเนินงานของสำนักงานอย่างเป็นระบบและโปร่งใสตามมาตรฐานงานสารบรรณ
            </p>
          </div>

          {/* Quick Filters & Action */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Year Selector */}
            <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs transition-all hover:border-[var(--primary-color)]/30">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)] font-medium">ปี พ.ศ.:</span>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-[var(--text-primary)] font-bold focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">ทุกปี พ.ศ.</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>ปี {yr}</option>
                ))}
              </select>
            </div>

            {/* Doc Type Selector */}
            <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs transition-all hover:border-[var(--primary-color)]/30">
              <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)] font-medium">ระบบงาน:</span>
              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-transparent text-[var(--text-primary)] font-bold focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">ระบบงานทั้งหมด</option>
                {showInbox && <option value="inbox">หนังสือรับ</option>}
                {showOutbox && <option value="outbox">หนังสือส่ง</option>}
                {showAdmin && <option value="admin">งานธุรการ</option>}
              </select>
            </div>

            {(showInbox || showOutbox || showAdmin) && (
              <button 
                onClick={() => {
                  if (showInbox) onCreateDoc('inbox');
                  else if (showOutbox) onCreateDoc('outbox');
                  else if (showAdmin) onCreateDoc('admin');
                }}
                className="flex items-center justify-center gap-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md shadow-[var(--primary-color)]/10 hover:shadow-lg hover:shadow-[var(--primary-color)]/20 active:scale-[0.98] border border-[var(--primary-dark)]/10 cursor-pointer"
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>+ ลงทะเบียนหนังสือ</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Action Shortcuts for Mobile & PC */}
        {(showInbox || showOutbox || showAdmin) && (
          <div className="mt-6 pt-5 border-t border-[var(--border-lighter)]">
            <div className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>ทางลัดการลงทะเบียนด่วน (Quick Registration Shortcuts)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {showInbox && (
                <button
                  type="button"
                  onClick={() => onCreateDoc('inbox')}
                  className="flex items-center gap-3.5 p-3.5 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/10 hover:border-blue-500/30 transition-all text-xs font-semibold text-left group shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-all duration-300">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">ลงทะเบียนหนังสือรับ</div>
                    <div className="text-[11px] text-[var(--text-secondary)] font-normal mt-0.5">บันทึกและจำแนกเรื่องเข้าหน่วยงาน</div>
                  </div>
                </button>
              )}

              {showOutbox && (
                <button
                  type="button"
                  onClick={() => onCreateDoc('outbox')}
                  className="flex items-center gap-3.5 p-3.5 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 hover:border-emerald-500/30 transition-all text-xs font-semibold text-left group shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-all duration-300">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">ออกเลขหนังสือส่ง</div>
                    <div className="text-[11px] text-[var(--text-secondary)] font-normal mt-0.5">จัดส่งหนังสือออกภายนอก / ลงทะเบียนเวียน</div>
                  </div>
                </button>
              )}

              {showAdmin && (
                <button
                  type="button"
                  onClick={() => onCreateDoc('admin')}
                  className="flex items-center gap-3.5 p-3.5 rounded-xl bg-violet-500/5 hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/10 hover:border-violet-500/30 transition-all text-xs font-semibold text-left group shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-all duration-300">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)] group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">สร้างคำสั่ง / ประกาศ</div>
                    <div className="text-[11px] text-[var(--text-secondary)] font-normal mt-0.5">ออกเลขรับรอง จังหวัด ประกาศ และเอกสารธุรการ</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* KPI Highlight Cards (5 Metrics) */}
      {(() => {
        const activeCardsCount = 2 + (showInbox ? 1 : 0) + (showOutbox ? 1 : 0) + (showAdmin ? 1 : 0);
        const gridColsClass = 
          activeCardsCount === 5 ? 'lg:grid-cols-5' :
          activeCardsCount === 4 ? 'lg:grid-cols-4' :
          activeCardsCount === 3 ? 'lg:grid-cols-3' :
          'lg:grid-cols-2';
        return (
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridColsClass} gap-4`}>
            {/* Metric 1: Total Docs */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">เอกสารรวมทั้งหมด</span>
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-105 transition-transform duration-300">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-3xl lg:text-4xl font-extrabold font-mono text-[var(--text-primary)] tracking-tight flex items-baseline gap-1.5">
                  {totalCount}
                  <span className="text-xs font-sarabun font-semibold text-[var(--text-muted)]">ฉบับ</span>
                </div>
                <div className="mt-3 text-[0.75rem] text-[var(--text-muted)] flex items-center gap-1 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span>ฐานข้อมูลดิจิทัลรวมขององค์กร</span>
                </div>
              </div>
            </div>

            {/* Metric 2: Inbox Docs */}
            {showInbox && (
              <div className="bg-[var(--bg-surface)] border border-blue-500/15 dark:border-blue-500/30 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">หนังสือรับ (Inbox)</span>
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform duration-300">
                    <Inbox className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl lg:text-4xl font-extrabold font-mono text-blue-600 dark:text-blue-400 tracking-tight flex items-baseline gap-1.5">
                    {inboxDocs.length}
                    <span className="text-xs font-sarabun font-semibold text-[var(--text-muted)]">ฉบับ</span>
                  </div>
                  <div className="mt-3 text-[0.75rem] text-[var(--text-muted)] flex items-center justify-between font-semibold">
                    <span>สัดส่วน {totalCount > 0 ? Math.round((inboxDocs.length / totalCount) * 100) : 0}% ของทั้งหมด</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{inboxDocs.filter(d => d.status === 'เสนอผู้บริหาร').length} เสนอผู้บริหาร</span>
                  </div>
                </div>
              </div>
            )}

            {/* Metric 3: Outbox Docs */}
            {showOutbox && (
              <div className="bg-[var(--bg-surface)] border border-emerald-500/15 dark:border-emerald-500/30 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">หนังสือส่ง (Outbox)</span>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform duration-300">
                    <Send className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl lg:text-4xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight flex items-baseline gap-1.5">
                    {outboxDocs.length}
                    <span className="text-xs font-sarabun font-semibold text-[var(--text-muted)]">ฉบับ</span>
                  </div>
                  <div className="mt-3 text-[0.75rem] text-[var(--text-muted)] flex items-center justify-between font-semibold">
                    <span>สัดส่วน {totalCount > 0 ? Math.round((outboxDocs.length / totalCount) * 100) : 0}% ของทั้งหมด</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{circularCount} หนังสือเวียน</span>
                  </div>
                </div>
              </div>
            )}

            {/* Metric 4: Admin Docs */}
            {showAdmin && (
              <div className="bg-[var(--bg-surface)] border border-violet-500/15 dark:border-violet-500/30 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">งานธุรการ / คำสั่ง</span>
                  <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:scale-105 transition-transform duration-300">
                    <FileCheck className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl lg:text-4xl font-extrabold font-mono text-violet-600 dark:text-violet-400 tracking-tight flex items-baseline gap-1.5">
                    {adminDocs.length}
                    <span className="text-xs font-sarabun font-semibold text-[var(--text-muted)]">ฉบับ</span>
                  </div>
                  <div className="mt-3 text-[0.75rem] text-[var(--text-muted)] flex items-center justify-between font-semibold">
                    <span>สัดส่วน {totalCount > 0 ? Math.round((adminDocs.length / totalCount) * 100) : 0}% ของทั้งหมด</span>
                    <span className="text-violet-600 dark:text-violet-400 font-bold">คำสั่ง {ordersCount} | ประกาศ {announcementsCount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Metric 5: Urgent & Confidential Alert */}
            <div className="bg-rose-50/20 dark:bg-rose-950/5 border border-rose-500/20 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
                  ด่วนมาก / ชั้นลับ
                </span>
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 group-hover:scale-105 transition-transform duration-300">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-3xl lg:text-4xl font-extrabold font-mono text-rose-600 dark:text-rose-400 tracking-tight flex items-baseline gap-1.5">
                  {urgentCount}
                  <span className="text-xs font-sarabun font-semibold text-[var(--text-muted)]">ฉบับ</span>
                </div>
                <div className="mt-3 text-[0.75rem] text-[var(--text-muted)] flex items-center justify-between font-semibold">
                  <span className="text-rose-600 dark:text-rose-400 font-bold">ด่วนพิเศษ {urgentCount} ฉบับ</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{confidentialCount} เอกสารลับ</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Analytics Visual Grid: 3 Main Statistics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visual Analytics 1: Category & Type Proportion */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-5 lg:p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[var(--border-lighter)]">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[var(--primary-color)]" />
                <h3 className="text-base font-noto-serif-thai font-semibold text-[var(--text-primary)]">สัดส่วนประเภทหนังสือ</h3>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">สถิติมวลรวม</span>
            </div>

            {/* Custom Segmented Progress Bar */}
            {(() => {
              const activeTotalCount = (showInbox ? inboxDocs.length : 0) + (showOutbox ? outboxDocs.length : 0) + (showAdmin ? adminDocs.length : 0);
              return (
                <div className="space-y-5">
                  <div className="h-3 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden flex p-0.5 border border-[var(--border-light)] shadow-inner">
                    {showInbox && inboxDocs.length > 0 && (
                      <div 
                        style={{ width: `${activeTotalCount > 0 ? (inboxDocs.length / activeTotalCount) * 100 : 33}%` }} 
                        className="bg-blue-500 h-full rounded-l-full transition-all duration-500 hover:opacity-90" 
                        title={`หนังสือรับ ${inboxDocs.length} ฉบับ`}
                      />
                    )}
                    {showOutbox && outboxDocs.length > 0 && (
                      <div 
                        style={{ width: `${activeTotalCount > 0 ? (outboxDocs.length / activeTotalCount) * 100 : 33}%` }} 
                        className={`bg-emerald-500 h-full transition-all duration-500 hover:opacity-90 ${!showInbox ? 'rounded-l-full' : ''} ${!showAdmin ? 'rounded-r-full' : ''}`} 
                        title={`หนังสือส่ง ${outboxDocs.length} ฉบับ`}
                      />
                    )}
                    {showAdmin && adminDocs.length > 0 && (
                      <div 
                        style={{ width: `${activeTotalCount > 0 ? (adminDocs.length / activeTotalCount) * 100 : 34}%` }} 
                        className={`bg-violet-500 h-full rounded-r-full transition-all duration-500 hover:opacity-90 ${(!showInbox && !showOutbox) ? 'rounded-l-full' : ''}`} 
                        title={`งานธุรการ ${adminDocs.length} ฉบับ`}
                      />
                    )}
                  </div>

                  {/* Legends with Details */}
                  <div className="space-y-3 pt-1">
                    {showInbox && (
                      <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 hover:border-blue-500/20 transition-all">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shrink-0" />
                          <span className="font-medium text-[var(--text-secondary)]">หนังสือรับ (Inbox)</span>
                        </div>
                        <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {inboxDocs.length} <span className="text-[var(--text-muted)] font-normal text-[0.7rem] ml-1">({activeTotalCount > 0 ? Math.round((inboxDocs.length / activeTotalCount) * 100) : 0}%)</span>
                        </div>
                      </div>
                    )}

                    {showOutbox && (
                      <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 transition-all">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                          <span className="font-medium text-[var(--text-secondary)]">หนังสือส่ง (Outbox)</span>
                        </div>
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {outboxDocs.length} <span className="text-[var(--text-muted)] font-normal text-[0.7rem] ml-1">({activeTotalCount > 0 ? Math.round((outboxDocs.length / activeTotalCount) * 100) : 0}%)</span>
                        </div>
                      </div>
                    )}

                    {showAdmin && (
                      <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-violet-500/5 dark:bg-violet-500/10 border border-violet-500/10 hover:border-violet-500/20 transition-all">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block shrink-0" />
                          <span className="font-medium text-[var(--text-secondary)]">ธุรการ / คำสั่ง / ประกาศ</span>
                        </div>
                        <div className="font-mono font-bold text-violet-600 dark:text-violet-400">
                          {adminDocs.length} <span className="text-[var(--text-muted)] font-normal text-[0.7rem] ml-1">({activeTotalCount > 0 ? Math.round((adminDocs.length / activeTotalCount) * 100) : 0}%)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {showAdmin && (
            <div className="mt-5 pt-3 border-t border-[var(--border-lighter)] text-xs text-[var(--text-muted)] flex items-center justify-between">
              <span className="font-medium">หมวดหมู่ย่อยระบบธุรการ</span>
              <span className="font-mono text-[var(--text-primary)] font-bold">
                คำสั่ง {ordersCount} | ประกาศ {announcementsCount}
              </span>
            </div>
          )}
        </div>

        {/* Visual Analytics 2: Priority & Secrecy Metrics */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-5 lg:p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[var(--border-lighter)]">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                <h3 className="text-base font-noto-serif-thai font-semibold text-[var(--text-primary)]">ระดับความเร่งด่วน</h3>
              </div>
              <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2.5 py-1 rounded-xl border border-red-500/10">
                ด่วนรวม {priorityStats.urgent + priorityStats.veryUrgent + priorityStats.topUrgent} ฉบับ
              </span>
            </div>

            {/* Priority Progress Bars */}
            <div className="space-y-4">
              {/* ปกติ */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    ปกติ
                  </span>
                  <span className="font-mono text-[var(--text-primary)]">{priorityStats.normal} ฉบับ ({priorityStats.pNormal}%)</span>
                </div>
                <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full overflow-hidden border border-[var(--border-light)] shadow-inner">
                  <div className="bg-slate-400 h-full rounded-full transition-all duration-500" style={{ width: `${priorityStats.pNormal}%` }} />
                </div>
              </div>

              {/* ด่วน */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-amber-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    ด่วน
                  </span>
                  <span className="font-mono text-amber-500">{priorityStats.urgent} ฉบับ ({priorityStats.pUrgent}%)</span>
                </div>
                <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full overflow-hidden border border-[var(--border-light)] shadow-inner">
                  <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${priorityStats.pUrgent}%` }} />
                </div>
              </div>

              {/* ด่วนมาก */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-orange-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    ด่วนมาก
                  </span>
                  <span className="font-mono text-orange-500">{priorityStats.veryUrgent} ฉบับ ({priorityStats.pVeryUrgent}%)</span>
                </div>
                <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full overflow-hidden border border-[var(--border-light)] shadow-inner">
                  <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${priorityStats.pVeryUrgent}%` }} />
                </div>
              </div>

              {/* ด่วนที่สุด */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-rose-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                    ด่วนที่สุด
                  </span>
                  <span className="font-mono text-rose-600 font-bold">{priorityStats.topUrgent} ฉบับ ({priorityStats.pTopUrgent}%)</span>
                </div>
                <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full overflow-hidden border border-[var(--border-light)] shadow-inner">
                  <div className="bg-rose-600 h-full rounded-full transition-all duration-500 animate-pulse" style={{ width: `${priorityStats.pTopUrgent}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Secrecy Footer Badge */}
          <div className="mt-5 pt-3 border-t border-[var(--border-lighter)] flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] flex items-center gap-1.5 font-medium">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              เอกสารชั้นลับในสารระบบ:
            </span>
            <span className="font-mono font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 text-[11px]">
              {confidentialCount} ฉบับ
            </span>
          </div>
        </div>

        {/* Visual Analytics 3: Department Workload Distribution */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-5 lg:p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[var(--border-lighter)]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-500" />
                <h3 className="text-base font-noto-serif-thai font-semibold text-[var(--text-primary)]">ปริมาณงานแยกตามกลุ่มงาน</h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/10 font-mono">
                {deptStats.length} กลุ่มปฏิบัติ
              </span>
            </div>

            {/* Department Meters */}
            <div className="space-y-4 max-h-[190px] overflow-y-auto pr-1 custom-scrollbar">
              {deptStats.slice(0, 5).map((dept, idx) => (
                <div key={idx} className="group/item">
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-[var(--text-primary)] truncate max-w-[170px] group-hover/item:text-[var(--primary-color)] transition-colors" title={dept.name}>{dept.name}</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{dept.count} ฉบับ ({dept.percent}%)</span>
                  </div>
                  <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full overflow-hidden border border-[var(--border-light)] shadow-inner">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${dept.percent}%` }} 
                    />
                  </div>
                </div>
              ))}
              {deptStats.length === 0 && (
                <div className="text-center py-8 text-xs text-[var(--text-muted)] font-medium">ไม่มีข้อมูลการกระจายงาน</div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[var(--border-lighter)] flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-medium">กลุ่มงานรับภาระสูงสุด</span>
            <span className="font-bold text-[var(--text-primary)] truncate max-w-[160px]">
              {deptStats.length > 0 ? deptStats[0].name : '-'}
            </span>
          </div>
        </div>

      </div>

      {/* Processing Pipeline / Workflow Pipeline Bar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-5 lg:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-3 border-b border-[var(--border-lighter)]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500 animate-pulse" />
            <h3 className="text-base font-noto-serif-thai font-bold text-[var(--text-primary)]">
              สถานะวงจรการดำเนินงานสารบรรณ (Document Processing Pipeline)
            </h3>
          </div>
          <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl text-xs font-mono font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>อัตราดำเนินงานสำเร็จ: {statusStats.completionRate}%</span>
          </div>
        </div>

        {/* Cohesive Connected Pipeline Row */}
        <div className="flex flex-col lg:flex-row items-center gap-3 w-full">
          {/* Step 1: Registered */}
          <div className="w-full bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-2xl p-4 flex items-center justify-between hover:border-slate-400/40 transition-colors shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-slate-500/10 text-slate-500 flex items-center justify-center font-bold font-mono text-sm border border-slate-500/10">
                1
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider">ลงทะเบียนแล้ว</div>
                <div className="text-base font-bold font-mono text-[var(--text-primary)] mt-0.5">{statusStats.registered} ฉบับ</div>
              </div>
            </div>
            <Clock className="w-4.5 h-4.5 text-slate-400" />
          </div>

          <ChevronRight className="hidden lg:block w-5 h-5 text-[var(--text-muted)] shrink-0 opacity-60" />

          {/* Step 2: Proposed to Executives */}
          <div className="w-full bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-2xl p-4 flex items-center justify-between hover:border-blue-400/40 transition-colors shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold font-mono text-sm border border-blue-500/10">
                2
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider">เสนอผู้บริหาร</div>
                <div className="text-base font-bold font-mono text-blue-500 mt-0.5">{statusStats.proposed} ฉบับ</div>
              </div>
            </div>
            <ArrowUpRight className="w-4.5 h-4.5 text-blue-500" />
          </div>

          <ChevronRight className="hidden lg:block w-5 h-5 text-[var(--text-muted)] shrink-0 opacity-60" />

          {/* Step 3: Forwarded */}
          <div className="w-full bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-2xl p-4 flex items-center justify-between hover:border-amber-400/40 transition-colors shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold font-mono text-sm border border-amber-500/10">
                3
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider">ส่งต่อกลุ่มงาน</div>
                <div className="text-base font-bold font-mono text-amber-500 mt-0.5">{statusStats.forwarded} ฉบับ</div>
              </div>
            </div>
            <Send className="w-4.5 h-4.5 text-amber-500" />
          </div>

          <ChevronRight className="hidden lg:block w-5 h-5 text-[var(--text-muted)] shrink-0 opacity-60" />

          {/* Step 4: Completed */}
          <div className="w-full bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-2xl p-4 flex items-center justify-between hover:border-emerald-400/40 transition-colors shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold font-mono text-sm border border-emerald-500/10">
                4
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider">เสร็จสิ้น/ยุติ</div>
                <div className="text-base font-bold font-mono text-emerald-500 mt-0.5">{statusStats.completed} ฉบับ</div>
              </div>
            </div>
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Main Table View: Recent vs Urgent Tabs */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 lg:p-5 border-b border-[var(--border-lighter)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.01]">
          {/* Segmented Control Tabs */}
          <div className="bg-[var(--bg-elevated)] p-1 rounded-2xl flex border border-[var(--border-light)] max-w-md w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('recent')}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'recent' 
                  ? 'bg-[var(--primary-color)] text-white shadow-md' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>หนังสือล่าสุด ({filteredDocs.length})</span>
            </button>

            <button 
              onClick={() => setActiveTab('urgent')}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'urgent' 
                  ? 'bg-rose-600 text-white shadow-md' 
                  : 'text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/[0.03]'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>ติดตามหนังสือด่วน ({urgentAlertDocs.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-[var(--text-muted)] font-mono flex items-center gap-1.5 self-end sm:self-auto font-semibold bg-[var(--bg-elevated)] px-3 py-1.5 rounded-xl border border-[var(--border-light)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>อัปเดตข้อมูลแบบเรียลไทม์</span>
          </div>
        </div>
        
        {/* Mobile View: list of items as cards */}
        <div className="block md:hidden divide-y divide-[var(--border-lighter)] max-h-[500px] overflow-y-auto custom-scrollbar">
          {(activeTab === 'recent' ? filteredDocs.slice(0, 5) : urgentAlertDocs).map((row) => (
            <div key={row.id} className="p-4 space-y-3 hover:bg-[var(--border-lighter)]/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[0.75rem] font-mono text-[var(--text-primary)] bg-[var(--bg-elevated)] px-2.5 py-1 rounded-lg border border-[var(--border-light)] font-bold">
                  {row.docNumber}
                </span>
                {row.receiveNumber && (
                  <span className="text-[0.75rem] font-mono text-[var(--text-muted)] font-semibold bg-slate-500/5 px-2 py-0.5 rounded">
                    รับ: {row.receiveNumber}
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-relaxed line-clamp-2">
                  {row.title}
                </h4>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {getPriorityBadge(row.priority)}
                  <span className={`text-[0.7rem] px-2 py-0.5 rounded-lg border whitespace-nowrap font-bold ${
                    row.type === 'inbox' ? 'text-blue-500 border-blue-500/20 bg-blue-500/10' :
                    row.type === 'outbox' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' :
                    'text-violet-500 border-violet-500/20 bg-violet-500/10'
                  }`}>
                    {row.type === 'inbox' ? 'หนังสือรับ' : row.type === 'outbox' ? 'หนังสือส่ง' : 'งานธุรการ'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-2.5 border-t border-[var(--border-lighter)]/50">
                <div className="truncate pr-4">
                  <span className="text-[var(--text-muted)] font-medium">
                    {row.type === 'inbox' ? 'จาก: ' : row.type === 'outbox' ? 'ถึง: ' : 'ประเภท: '}
                  </span>
                  <span className="font-bold text-[var(--text-primary)] ml-1">
                    {row.type === 'inbox' ? row.from : row.type === 'outbox' ? row.to : (row.category === 'order' ? 'คำสั่ง' : row.category === 'announcement' ? 'ประกาศ' : 'หนังสือรับรอง')}
                  </span>
                </div>
                <button 
                  onClick={() => onViewDoc(row)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 rounded-xl transition-colors shrink-0 font-bold border border-[var(--primary-color)]/10"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>เปิดดู</span>
                </button>
              </div>
            </div>
          ))}
          {(activeTab === 'recent' ? filteredDocs.length === 0 : urgentAlertDocs.length === 0) && (
            <div className="p-10 text-center text-[var(--text-muted)] text-sm font-medium">ไม่พบข้อมูลหนังสือ</div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-lighter)] text-[0.78rem] text-[var(--text-secondary)] uppercase tracking-wider font-mono">
                <th className="p-4 lg:p-5 font-bold whitespace-nowrap">เลขรับ/ที่หนังสือ</th>
                <th className="p-4 lg:p-5 font-bold min-w-[240px]">ชื่อเรื่องหนังสือ</th>
                <th className="p-4 lg:p-5 font-bold whitespace-nowrap">ผู้ส่ง / ผู้รับ</th>
                <th className="p-4 lg:p-5 font-bold whitespace-nowrap">กลุ่มปฏิบัติงาน</th>
                <th className="p-4 lg:p-5 font-bold whitespace-nowrap">สถานะดำเนินงาน</th>
                <th className="p-4 lg:p-5 font-bold whitespace-nowrap text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="text-[0.92rem] divide-y divide-[var(--border-lighter)]">
              {(activeTab === 'recent' ? filteredDocs.slice(0, 8) : urgentAlertDocs).map((row) => (
                <tr 
                  key={row.id} 
                  className="hover:bg-[var(--primary-color)]/[0.015] dark:hover:bg-slate-800/10 transition-colors group"
                >
                  <td className="p-4 lg:p-5">
                    <div className="font-bold text-[var(--text-primary)] mb-1 group-hover:text-[var(--primary-color)] transition-colors font-mono">
                      {row.docNumber}
                    </div>
                    {row.receiveNumber && (
                      <div className="text-[0.75rem] text-[var(--text-muted)] font-mono font-semibold">
                        เลขรับ: {row.receiveNumber}
                      </div>
                    )}
                  </td>
                  <td className="p-4 lg:p-5 text-[var(--text-secondary)] leading-relaxed pr-6">
                    <div className="font-bold text-[var(--text-primary)] line-clamp-2 hover:line-clamp-none transition-all duration-300">
                      {row.title}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`text-[0.68rem] px-2 py-0.5 rounded-lg border whitespace-nowrap font-bold ${
                        row.type === 'inbox' ? 'text-blue-500 border-blue-500/20 bg-blue-500/5' :
                        row.type === 'outbox' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' :
                        'text-violet-500 border-violet-500/20 bg-violet-500/5'
                      }`}>
                        {row.type === 'inbox' ? 'หนังสือรับ' : row.type === 'outbox' ? 'หนังสือส่ง' : 'งานธุรการ'}
                      </span>
                      {getPriorityBadge(row.priority)}
                    </div>
                  </td>
                  <td className="p-4 lg:p-5 text-[var(--text-secondary)] whitespace-nowrap text-xs font-semibold">
                    {row.type === 'inbox' ? row.from : row.type === 'outbox' ? row.to : 'งานธุรการ'}
                  </td>
                  <td className="p-4 lg:p-5 text-[var(--text-secondary)] whitespace-nowrap text-xs font-semibold">
                    <div className="max-w-[150px] truncate" title={row.department || '-'}>
                      {row.department || '-'}
                    </div>
                  </td>
                  <td className="p-4 lg:p-5 whitespace-nowrap text-xs">
                    {(() => {
                      const status = row.status || 'ลงทะเบียน';
                      let statusStyle = 'bg-slate-500/10 text-slate-500 border-slate-500/20';
                      if (status === 'เสนอผู้บริหาร') {
                        statusStyle = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
                      } else if (status === 'ส่งต่อกลุ่มงาน' || status === 'กำลังดำเนินการ') {
                        statusStyle = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
                      } else if (status === 'เสร็จสิ้น' || status === 'ยุติ') {
                        statusStyle = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
                      }
                      return (
                        <span className={`px-2.5 py-1 rounded-xl border font-bold text-[11px] inline-block ${statusStyle}`}>
                          {status}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="p-4 lg:p-5 text-right">
                    <button 
                      onClick={() => onViewDoc(row)}
                      className="p-2.5 text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 rounded-xl transition-all inline-flex items-center gap-1 border border-transparent hover:border-[var(--primary-color)]/20 active:scale-95 cursor-pointer"
                      title="ดูรายละเอียดเอกสาร"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {(activeTab === 'recent' ? filteredDocs.length === 0 : urgentAlertDocs.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-[var(--text-muted)] text-sm font-semibold">
                    ไม่พบข้อมูลเอกสารในระบบงานสารบรรณ
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
