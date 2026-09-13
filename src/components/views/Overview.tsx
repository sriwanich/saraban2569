import React, { useState, useMemo } from 'react';
import { DocumentItem, User } from '../../types';
import { 
  FileText, Eye, Inbox, Send, FileSpreadsheet, TrendingUp, AlertTriangle, 
  ShieldAlert, BarChart3, PieChart, Filter, CheckCircle2, 
  Building2, Lock, FileCheck, Activity, Calendar, Zap
} from 'lucide-react';
import EecWeatherWidget from './EecWeatherWidget';

interface Props {
  documents: DocumentItem[];
  user?: User;
  onCreateDoc: (type?: 'inbox' | 'outbox' | 'admin', prefillData?: Partial<DocumentItem>) => void;
  onViewDoc: (doc: DocumentItem) => void;
  enabledFeatures?: Record<string, boolean>;
}

export default function Overview({ documents, user, onCreateDoc, onViewDoc, enabledFeatures }: Props) {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const showInbox = !enabledFeatures || enabledFeatures.inbox !== false;
  const showOutbox = !enabledFeatures || enabledFeatures.outbox !== false;
  const showAdmin = !enabledFeatures || enabledFeatures.admin_docs !== false;

  // Available Years
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(documents.map(d => d.year).filter(Boolean)));
    years.sort((a, b) => b.localeCompare(a));
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

  return (
    <div className="space-y-6 lg:space-y-8 pb-10 animate-fade-in">
      {/* 1. Quick Registration Shortcuts (Top Priority Action Bar) */}
      {(showInbox || showOutbox || showAdmin) && (
        <div className="bg-[var(--bg-overlay)] backdrop-blur-3xl border border-[var(--border-light)] rounded-[2rem] p-6 sm:p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -mr-20 -mt-20 transition-all duration-700" />
          <div className="flex items-center justify-between gap-3 mb-6 relative z-10">
            <div className="text-xs sm:text-sm uppercase font-extrabold tracking-widest text-[var(--primary-color)] flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <span className="font-sans text-sm font-extrabold text-[var(--text-primary)]">ทางลัดลงทะเบียนด่วน</span>
            </div>
            <span className="text-[11px] font-bold tracking-wider text-[var(--text-muted)] hidden sm:inline px-4 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-light)]">
              QUICK ACTIONS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
            {showInbox && (
              <button
                type="button"
                onClick={() => onCreateDoc('inbox')}
                className="flex items-center gap-5 p-5 rounded-3xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-light)] hover:border-[var(--primary-color)]/30 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] text-xs font-semibold text-left group shadow-sm hover:shadow-lg hover:shadow-[var(--primary-color)]/10 active:scale-[0.98] cursor-pointer"
              >
                <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-all duration-300">
                  <Inbox className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-[var(--text-primary)] group-hover:text-[var(--primary-color)] transition-colors">รับหนังสือใหม่</div>
                  <div className="text-xs text-[var(--text-secondary)] font-medium mt-1 leading-tight opacity-80">บันทึกและจำแนกเรื่องเข้าหน่วยงาน</div>
                </div>
              </button>
            )}

            {showOutbox && (
              <button
                type="button"
                onClick={() => onCreateDoc('outbox')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all duration-300 text-xs font-semibold text-left group shadow-sm hover:shadow-md hover:shadow-emerald-500/10 active:scale-[0.98] cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">ส่งหนังสือออก</div>
                  <div className="text-[11px] text-[var(--text-secondary)] font-medium mt-1 leading-tight">จัดส่งเอกสารออก / ลงทะเบียนเวียน</div>
                </div>
              </button>
            )}

            {showAdmin && (
              <button
                type="button"
                onClick={() => onCreateDoc('admin')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800/50 text-violet-600 dark:text-violet-400 border border-violet-500/20 hover:border-violet-500/50 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all duration-300 text-xs font-semibold text-left group shadow-sm hover:shadow-md hover:shadow-violet-500/10 active:scale-[0.98] cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-[var(--text-primary)] group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">สร้างคำสั่ง / ประกาศ</div>
                  <div className="text-[11px] text-[var(--text-secondary)] font-medium mt-1 leading-tight">ออกเลขรับรองและเอกสารธุรการ</div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Real-time Environmental & Disaster Climate Data Sources (TMD / EEC API) */}
      <EecWeatherWidget />

      {/* Executive Header Banner */}
      <div className="bg-[var(--bg-overlay)] backdrop-blur-3xl border border-[var(--border-light)] rounded-3xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[var(--primary-color)]/10 to-transparent rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20 transition-all duration-700 group-hover:from-[var(--primary-color)]/20" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-[80px] pointer-events-none transition-all duration-700 group-hover:from-blue-500/20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--primary-color)] mb-3 opacity-90">
              <Activity className="w-4 h-4 text-[var(--primary-color)] animate-pulse" />
              <span>Executive Analytics Dashboard</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-sans font-extrabold text-[var(--text-primary)] tracking-tight leading-tight mb-2">
              ภาพรวมและสถิติสารบรรณ
            </h1>
            <p className="text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed font-medium">
              ศูนย์ข้อมูลเชิงลึก สถิติการรับ-ส่งเอกสาร ระดับความเร่งด่วน และสถานะการดำเนินงานของสำนักงานอย่างเป็นระบบและโปร่งใส
            </p>
          </div>

          {/* Quick Filters & Action */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Year Selector */}
            <div className="flex items-center gap-2.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-sm transition-all hover:border-[var(--primary-color)]/40 hover:shadow-sm">
              <Calendar className="w-4 h-4 text-[var(--primary-color)]" />
              <span className="text-[var(--text-secondary)] font-medium">ปี พ.ศ.</span>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-[var(--text-primary)] font-bold focus:outline-none cursor-pointer pr-2 appearance-none"
              >
                <option value="all">ทั้งหมด</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            {/* Doc Type Selector */}
            <div className="flex items-center gap-2.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-sm transition-all hover:border-[var(--primary-color)]/40 hover:shadow-sm">
              <Filter className="w-4 h-4 text-[var(--primary-color)]" />
              <span className="text-[var(--text-secondary)] font-medium">ระบบงาน</span>
              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-transparent text-[var(--text-primary)] font-bold focus:outline-none cursor-pointer pr-2 appearance-none"
              >
                <option value="all">ทั้งหมด</option>
                {showInbox && <option value="inbox">รับ</option>}
                {showOutbox && <option value="outbox">ส่ง</option>}
                {showAdmin && <option value="admin">ธุรการ</option>}
              </select>
            </div>

            {(showInbox || showOutbox || showAdmin) && (
              <button 
                onClick={() => {
                  if (showInbox) onCreateDoc('inbox');
                  else if (showOutbox) onCreateDoc('outbox');
                  else if (showAdmin) onCreateDoc('admin');
                }}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-dark)] hover:from-[var(--primary-hover)] hover:to-[var(--primary-color)] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-[var(--primary-color)]/20 hover:shadow-xl hover:shadow-[var(--primary-color)]/30 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>ลงทะเบียนเอกสาร</span>
              </button>
            )}
          </div>
        </div>
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
            <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">เอกสารรวมทั้งหมด</span>
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-sm">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-extrabold font-mono text-[var(--text-primary)] tracking-tight flex items-baseline gap-2">
                  {totalCount}
                  <span className="text-sm font-sans font-semibold text-[var(--text-muted)]">ฉบับ</span>
                </div>
                <div className="mt-4 text-xs text-[var(--text-muted)] flex items-center gap-1.5 font-medium bg-[var(--bg-elevated)] w-fit px-2.5 py-1 rounded-md">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>ฐานข้อมูลดิจิทัลรวมขององค์กร</span>
                </div>
              </div>
            </div>

            {/* Metric 2: Inbox Docs */}
            {showInbox && (
              <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-blue-500/15 dark:border-blue-500/20 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgb(59,130,246,0.1)] hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">หนังสือรับ (Inbox)</span>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-sm">
                    <Inbox className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-4xl lg:text-5xl font-extrabold font-mono text-blue-600 dark:text-blue-400 tracking-tight flex items-baseline gap-2">
                    {inboxDocs.length}
                    <span className="text-sm font-sans font-semibold text-[var(--text-muted)]">ฉบับ</span>
                  </div>
                  <div className="mt-4 text-xs text-[var(--text-muted)] flex items-center justify-between font-medium bg-blue-50/50 dark:bg-blue-500/5 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-500/10">
                    <span>สัดส่วน {totalCount > 0 ? Math.round((inboxDocs.length / totalCount) * 100) : 0}% ของทั้งหมด</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{inboxDocs.filter(d => d.status === 'เสนอผู้บริหาร').length} เสนอผู้บริหาร</span>
                  </div>
                </div>
              </div>
            )}

            {/* Metric 3: Outbox Docs */}
            {showOutbox && (
              <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-emerald-500/15 dark:border-emerald-500/20 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgb(16,185,129,0.1)] hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">หนังสือส่ง (Outbox)</span>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-sm">
                    <Send className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-4xl lg:text-5xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight flex items-baseline gap-2">
                    {outboxDocs.length}
                    <span className="text-sm font-sans font-semibold text-[var(--text-muted)]">ฉบับ</span>
                  </div>
                  <div className="mt-4 text-xs text-[var(--text-muted)] flex items-center justify-between font-medium bg-emerald-50/50 dark:bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/10">
                    <span>สัดส่วน {totalCount > 0 ? Math.round((outboxDocs.length / totalCount) * 100) : 0}% ของทั้งหมด</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{circularCount} หนังสือเวียน</span>
                  </div>
                </div>
              </div>
            )}

            {/* Metric 4: Admin Docs */}
            {showAdmin && (
              <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-violet-500/15 dark:border-violet-500/20 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgb(139,92,246,0.1)] hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">งานธุรการ / คำสั่ง</span>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-500/5 text-violet-600 dark:text-violet-400 group-hover:scale-110 group-hover:bg-violet-500 group-hover:text-white transition-all duration-300 shadow-sm">
                    <FileCheck className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-4xl lg:text-5xl font-extrabold font-mono text-violet-600 dark:text-violet-400 tracking-tight flex items-baseline gap-2">
                    {adminDocs.length}
                    <span className="text-sm font-sans font-semibold text-[var(--text-muted)]">ฉบับ</span>
                  </div>
                  <div className="mt-4 text-xs text-[var(--text-muted)] flex items-center justify-between font-medium bg-violet-50/50 dark:bg-violet-500/5 px-3 py-1.5 rounded-lg border border-violet-100 dark:border-violet-500/10">
                    <span>สัดส่วน {totalCount > 0 ? Math.round((adminDocs.length / totalCount) * 100) : 0}% ของทั้งหมด</span>
                    <span className="text-violet-600 dark:text-violet-400 font-bold">คำสั่ง {ordersCount} | ประกาศ {announcementsCount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Metric 5: Urgent & Confidential Alert */}
            <div className="bg-gradient-to-br from-rose-50/80 to-red-50/30 dark:from-rose-950/20 dark:to-red-900/10 border border-rose-500/20 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgb(244,63,94,0.15)] hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" />
                  ด่วนมาก / ชั้นลับ
                </span>
                <div className="p-3 rounded-xl bg-gradient-to-br from-rose-500/10 to-rose-500/5 text-rose-500 group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all duration-300 shadow-sm">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-extrabold font-mono text-rose-600 dark:text-rose-400 tracking-tight flex items-baseline gap-2">
                  {urgentCount}
                  <span className="text-sm font-sans font-semibold text-[var(--text-muted)]">ฉบับ</span>
                </div>
                <div className="mt-4 text-xs text-[var(--text-muted)] flex items-center justify-between font-medium bg-white/50 dark:bg-rose-950/30 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-rose-100/50 dark:border-rose-900/30">
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
        <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-3xl p-6 lg:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 group">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-light)]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--primary-color)]/10 text-[var(--primary-color)]">
                  <PieChart className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-sans font-bold text-[var(--text-primary)]">สัดส่วนประเภทหนังสือ</h3>
              </div>
              <span className="text-[11px] uppercase font-bold tracking-widest text-[var(--text-muted)] bg-[var(--bg-elevated)] px-3 py-1 rounded-full">สถิติมวลรวม</span>
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
        <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-3xl p-6 lg:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 group">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-light)]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-sans font-bold text-[var(--text-primary)]">ระดับความเร่งด่วน</h3>
              </div>
              <span className="text-[11px] font-bold text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/10">
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
          <div className="mt-6 pt-4 border-t border-[var(--border-light)] flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] flex items-center gap-2 font-medium">
              <div className="p-1.5 rounded-md bg-amber-500/10">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              เอกสารชั้นลับในสารระบบ:
            </span>
            <span className="font-mono font-bold text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 text-[11px]">
              {confidentialCount} ฉบับ
            </span>
          </div>
        </div>

        {/* Visual Analytics 3: Department Workload Distribution */}
        <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-3xl p-6 lg:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 group">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-light)]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-sans font-bold text-[var(--text-primary)]">ปริมาณงานแยกตามกลุ่มงาน</h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/10 font-mono">
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

      {/* Main Table View: Recent Tab */}
      <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-3xl overflow-hidden flex flex-col shadow-sm mt-8 transition-all hover:shadow-md">
        <div className="p-5 lg:p-6 border-b border-[var(--border-light)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[var(--bg-elevated)] to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--primary-color)]/10 text-[var(--primary-color)]">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-sans font-bold text-[var(--text-primary)]">
              หนังสือราชการล่าสุด <span className="text-[var(--text-muted)] font-medium text-base ml-1">({filteredDocs.length})</span>
            </h3>
          </div>

          <div className="text-[11px] text-[var(--text-muted)] font-mono flex items-center gap-2 self-end sm:self-auto font-semibold bg-white/50 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-[var(--border-light)] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>Real-time Sync</span>
          </div>
        </div>
        
        {/* Mobile View: list of items as cards */}
        <div className="block md:hidden divide-y divide-[var(--border-lighter)] max-h-[500px] overflow-y-auto custom-scrollbar">
          {filteredDocs.slice(0, 10).map((row) => (
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
          {filteredDocs.length === 0 && (
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
                <th className="p-4 lg:p-5 font-bold whitespace-nowrap text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="text-[0.92rem] divide-y divide-[var(--border-lighter)]">
              {filteredDocs.slice(0, 10).map((row) => (
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
              {filteredDocs.length === 0 && (
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
