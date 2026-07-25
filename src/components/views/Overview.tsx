import React, { useState, useMemo } from 'react';
import { DocumentItem, User } from '../../types';
import { 
  FileText, Eye, Inbox, Send, FileSpreadsheet, TrendingUp, AlertTriangle, 
  ShieldAlert, BarChart3, PieChart, Layers, Filter, CheckCircle2, Clock, 
  Building2, Lock, FileCheck, ArrowUpRight, Activity, Calendar, Zap
} from 'lucide-react';

interface Props {
  documents: DocumentItem[];
  user?: User;
  onCreateDoc: () => void;
  onViewDoc: (doc: DocumentItem) => void;
}

export default function Overview({ documents, user, onCreateDoc, onViewDoc }: Props) {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'recent' | 'urgent'>('recent');

  // Available Years
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(documents.map(d => d.year).filter(Boolean)));
    years.sort((a, b) => b.localeCompare(a));
    return years;
  }, [documents]);

  // Filtered Documents
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchYear = selectedYear === 'all' || doc.year === selectedYear;
      const matchType = selectedType === 'all' || doc.type === selectedType;
      return matchYear && matchType;
    });
  }, [documents, selectedYear, selectedType]);

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
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-5 lg:p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--primary-color)]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--primary-color)] mb-1">
              <Activity className="w-4 h-4" />
              <span>Executive Analytics Dashboard</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-noto-serif-thai font-bold text-[var(--text-primary)] tracking-tight">
              ภาพรวมและสถิติงานสารบรรณ
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
              ศูนย์สรุปข้อมูล สถิติการรับ-ส่งเอกสาร ระดับความเร่งด่วน และสถานะการดำเนินงานของสำนักงาน
            </p>
          </div>

          {/* Quick Filters & Action */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl px-3 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)] font-medium">ปี พ.ศ.:</span>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-[var(--text-primary)] font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">ทุกปี พ.ศ.</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>ปี {yr}</option>
                ))}
              </select>
            </div>

            {/* Doc Type Selector */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl px-3 py-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)] font-medium">ระบบงาน:</span>
              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-transparent text-[var(--text-primary)] font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">ระบบงานทั้งหมด</option>
                <option value="inbox">หนังสือรับ</option>
                <option value="outbox">หนังสือส่ง</option>
                <option value="admin">งานธุรการ</option>
              </select>
            </div>

            <button 
              onClick={onCreateDoc}
              className="flex items-center justify-center gap-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-[var(--primary-color)]/20 border border-[var(--primary-dark)]/10"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>+ ลงทะเบียนหนังสือ</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Cards (5 Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Total Docs */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-4 lg:p-5 flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-[var(--primary-color)]/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">เอกสารรวมทั้งหมด</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-[var(--text-primary)] flex items-baseline gap-1.5">
              {totalCount}
              <span className="text-xs font-sarabun font-normal text-[var(--text-muted)]">ฉบับ</span>
            </div>
            <div className="mt-2 text-[0.75rem] text-[var(--text-muted)] flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span>ฐานข้อมูลดิจิทัลรวม</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Inbox Docs */}
        <div className="bg-[var(--bg-surface)] border border-blue-500/15 rounded-2xl p-4 lg:p-5 flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-blue-500/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">หนังสือรับ (Inbox)</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-blue-500 flex items-baseline gap-1.5">
              {inboxDocs.length}
              <span className="text-xs font-sarabun font-normal text-[var(--text-muted)]">ฉบับ</span>
            </div>
            <div className="mt-2 text-[0.75rem] text-[var(--text-muted)] flex items-center justify-between font-medium">
              <span>คิดเป็น {totalCount > 0 ? Math.round((inboxDocs.length / totalCount) * 100) : 0}%</span>
              <span className="text-blue-500 font-semibold">{inboxDocs.filter(d => d.status === 'เสนอผู้บริหาร').length} เสนอผู้บริหาร</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Outbox Docs */}
        <div className="bg-[var(--bg-surface)] border border-emerald-500/15 rounded-2xl p-4 lg:p-5 flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-emerald-500/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">หนังสือส่ง (Outbox)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-emerald-500 flex items-baseline gap-1.5">
              {outboxDocs.length}
              <span className="text-xs font-sarabun font-normal text-[var(--text-muted)]">ฉบับ</span>
            </div>
            <div className="mt-2 text-[0.75rem] text-[var(--text-muted)] flex items-center justify-between font-medium">
              <span>คิดเป็น {totalCount > 0 ? Math.round((outboxDocs.length / totalCount) * 100) : 0}%</span>
              <span className="text-emerald-500 font-semibold">{circularCount} หนังสือเวียน</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Admin Docs */}
        <div className="bg-[var(--bg-surface)] border border-violet-500/15 rounded-2xl p-4 lg:p-5 flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-violet-500/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">งานธุรการ / คำสั่ง</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-violet-500 flex items-baseline gap-1.5">
              {adminDocs.length}
              <span className="text-xs font-sarabun font-normal text-[var(--text-muted)]">ฉบับ</span>
            </div>
            <div className="mt-2 text-[0.75rem] text-[var(--text-muted)] flex items-center justify-between font-medium">
              <span>คำสั่ง {ordersCount} | ประกาศ {announcementsCount}</span>
              <span className="text-violet-500 font-semibold">{certificatesCount} ใบรับรอง</span>
            </div>
          </div>
        </div>

        {/* Metric 5: Urgent & Confidential Alert */}
        <div className="bg-[var(--bg-surface)] border border-red-500/20 rounded-2xl p-4 lg:p-5 flex flex-col justify-between relative overflow-hidden shadow-sm hover:border-red-500/40 transition-all group bg-red-500/[0.02]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              เร่งด่วน / ชั้นลับ
            </span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500 animate-pulse">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-red-500 flex items-baseline gap-1.5">
              {urgentCount}
              <span className="text-xs font-sarabun font-normal text-[var(--text-muted)]">ฉบับ</span>
            </div>
            <div className="mt-2 text-[0.75rem] text-[var(--text-muted)] flex items-center justify-between font-medium">
              <span>ด่วนมาก/ที่สุด {urgentCount}</span>
              <span className="text-amber-500 font-semibold">{confidentialCount} ชั้นลับ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Visual Grid: 3 Main Statistics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visual Analytics 1: Category & Type Proportion */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-lighter)]">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[var(--primary-color)]" />
                <h3 className="text-base font-noto-serif-thai font-semibold text-[var(--text-primary)]">สัดส่วนประเภทหนังสือ</h3>
              </div>
              <span className="text-xs font-mono font-medium text-[var(--text-muted)]">สถิติมวลรวม</span>
            </div>

            {/* Custom SVG Stacked Meter Bar */}
            <div className="space-y-4">
              <div className="h-4 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden flex p-0.5 border border-[var(--border-light)] shadow-inner">
                <div 
                  style={{ width: `${totalCount > 0 ? (inboxDocs.length / totalCount) * 100 : 33}%` }} 
                  className="bg-blue-500 h-full rounded-l-full transition-all duration-500" 
                  title={`หนังสือรับ ${inboxDocs.length} ฉบับ`}
                />
                <div 
                  style={{ width: `${totalCount > 0 ? (outboxDocs.length / totalCount) * 100 : 33}%` }} 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  title={`หนังสือส่ง ${outboxDocs.length} ฉบับ`}
                />
                <div 
                  style={{ width: `${totalCount > 0 ? (adminDocs.length / totalCount) * 100 : 34}%` }} 
                  className="bg-violet-500 h-full rounded-r-full transition-all duration-500" 
                  title={`งานธุรการ ${adminDocs.length} ฉบับ`}
                />
              </div>

              {/* Legends with Details */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md bg-blue-500 inline-block shrink-0" />
                    <span className="font-medium text-[var(--text-primary)]">หนังสือรับ (Inbox)</span>
                  </div>
                  <div className="font-mono font-semibold text-blue-500">
                    {inboxDocs.length} <span className="text-[var(--text-muted)] font-normal text-[0.7rem]">({totalCount > 0 ? Math.round((inboxDocs.length / totalCount) * 100) : 0}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block shrink-0" />
                    <span className="font-medium text-[var(--text-primary)]">หนังสือส่ง (Outbox)</span>
                  </div>
                  <div className="font-mono font-semibold text-emerald-500">
                    {outboxDocs.length} <span className="text-[var(--text-muted)] font-normal text-[0.7rem]">({totalCount > 0 ? Math.round((outboxDocs.length / totalCount) * 100) : 0}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-violet-500/5 border border-violet-500/10">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md bg-violet-500 inline-block shrink-0" />
                    <span className="font-medium text-[var(--text-primary)]">งานธุรการ / คำสั่ง / ประกาศ</span>
                  </div>
                  <div className="font-mono font-semibold text-violet-500">
                    {adminDocs.length} <span className="text-[var(--text-muted)] font-normal text-[0.7rem]">({totalCount > 0 ? Math.round((adminDocs.length / totalCount) * 100) : 0}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-lighter)] text-[0.75rem] text-[var(--text-muted)] flex items-center justify-between">
            <span>หมวดหมู่ย่อยระบบธุรการ</span>
            <span className="font-mono text-[var(--text-primary)] font-semibold">
              คำสั่ง {ordersCount} | ประกาศ {announcementsCount}
            </span>
          </div>
        </div>

        {/* Visual Analytics 2: Priority & Secrecy Metrics */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-lighter)]">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                <h3 className="text-base font-noto-serif-thai font-semibold text-[var(--text-primary)]">ระดับความเร่งด่วน</h3>
              </div>
              <span className="text-xs font-mono font-medium text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20">
                ด่วน {priorityStats.urgent + priorityStats.veryUrgent + priorityStats.topUrgent}
              </span>
            </div>

            {/* Priority Progress Bars */}
            <div className="space-y-3">
              {/* ปกติ */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-[var(--text-secondary)]">ปกติ</span>
                  <span className="font-mono text-[var(--text-primary)]">{priorityStats.normal} ฉบับ ({priorityStats.pNormal}%)</span>
                </div>
                <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full rounded-full transition-all duration-500" style={{ width: `${priorityStats.pNormal}%` }} />
                </div>
              </div>

              {/* ด่วน */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-amber-500">ด่วน</span>
                  <span className="font-mono text-amber-500">{priorityStats.urgent} ฉบับ ({priorityStats.pUrgent}%)</span>
                </div>
                <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${priorityStats.pUrgent}%` }} />
                </div>
              </div>

              {/* ด่วนมาก */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-orange-500">ด่วนมาก</span>
                  <span className="font-mono text-orange-500">{priorityStats.veryUrgent} ฉบับ ({priorityStats.pVeryUrgent}%)</span>
                </div>
                <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${priorityStats.pVeryUrgent}%` }} />
                </div>
              </div>

              {/* ด่วนที่สุด */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-red-500 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-red-500" />
                    ด่วนที่สุด
                  </span>
                  <span className="font-mono text-red-500 font-semibold">{priorityStats.topUrgent} ฉบับ ({priorityStats.pTopUrgent}%)</span>
                </div>
                <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full transition-all duration-500" style={{ width: `${priorityStats.pTopUrgent}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Secrecy Footer Badge */}
          <div className="mt-4 pt-3 border-t border-[var(--border-lighter)] flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              เอกสารชั้นลับในสารระบบ:
            </span>
            <span className="font-mono font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {confidentialCount} ฉบับ
            </span>
          </div>
        </div>

        {/* Visual Analytics 3: Department Workload Distribution */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-lighter)]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-500" />
                <h3 className="text-base font-noto-serif-thai font-semibold text-[var(--text-primary)]">ปริมาณงานแยกตามกลุ่มงาน</h3>
              </div>
              <span className="text-xs font-mono font-medium text-[var(--text-muted)]">
                {deptStats.length} กลุ่มปฏิบัติ
              </span>
            </div>

            {/* Department Meters */}
            <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1 custom-scrollbar">
              {deptStats.slice(0, 5).map((dept, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-[var(--text-primary)] truncate max-w-[170px]" title={dept.name}>{dept.name}</span>
                    <span className="font-mono text-emerald-500 font-semibold">{dept.count} ฉบับ ({dept.percent}%)</span>
                  </div>
                  <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${dept.percent}%` }} 
                    />
                  </div>
                </div>
              ))}
              {deptStats.length === 0 && (
                <div className="text-center py-6 text-xs text-[var(--text-muted)]">ไม่มีข้อมูลการกระจายงาน</div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-lighter)] flex items-center justify-between text-[0.75rem] text-[var(--text-muted)]">
            <span>กลุ่มงานรับภาระสูงสุด</span>
            <span className="font-medium text-[var(--text-primary)] truncate max-w-[160px]">
              {deptStats.length > 0 ? deptStats[0].name : '-'}
            </span>
          </div>
        </div>

      </div>

      {/* Processing Pipeline / Workflow Pipeline Bar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--border-lighter)]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <h3 className="text-base font-noto-serif-thai font-semibold text-[var(--text-primary)]">
              สถานะวงจรการดำเนินงานสารบรรณ (Document Processing Pipeline)
            </h3>
          </div>
          <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-xl text-xs font-mono font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>อัตราดำเนินงานสำเร็จ: {statusStats.completionRate}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1: Registered */}
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-500/10 text-slate-400 flex items-center justify-center font-bold font-mono text-sm">
                1
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] font-medium">ลงทะเบียนแล้ว</div>
                <div className="text-lg font-bold font-mono text-[var(--text-primary)]">{statusStats.registered} ฉบับ</div>
              </div>
            </div>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>

          {/* Step 2: Proposed to Executives */}
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold font-mono text-sm">
                2
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] font-medium">เสนอผู้บริหาร</div>
                <div className="text-lg font-bold font-mono text-blue-500">{statusStats.proposed} ฉบับ</div>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-blue-500" />
          </div>

          {/* Step 3: Forwarded */}
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold font-mono text-sm">
                3
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] font-medium">ส่งต่อกลุ่มงาน</div>
                <div className="text-lg font-bold font-mono text-amber-500">{statusStats.forwarded} ฉบับ</div>
              </div>
            </div>
            <Send className="w-4 h-4 text-amber-500" />
          </div>

          {/* Step 4: Completed */}
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold font-mono text-sm">
                4
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] font-medium">เสร็จสิ้น/ยุติ</div>
                <div className="text-lg font-bold font-mono text-emerald-500">{statusStats.completed} ฉบับ</div>
              </div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Main Table View: Recent vs Urgent Tabs */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 lg:p-5 border-b border-[var(--border-lighter)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('recent')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'recent' 
                  ? 'bg-[var(--primary-color)] text-white shadow-sm' 
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>รายการหนังสือล่าสุด ({filteredDocs.length})</span>
            </button>

            <button 
              onClick={() => setActiveTab('urgent')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'urgent' 
                  ? 'bg-red-500 text-white shadow-sm' 
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>หนังสือด่วนเร่งติดตาม ({urgentAlertDocs.length})</span>
            </button>
          </div>

          <div className="text-xs text-[var(--text-muted)] font-mono">
            แสดงข้อมูลล่าสุด ณ เวลาปัจจุบัน
          </div>
        </div>
        
        {/* Mobile View: list of items as cards */}
        <div className="block md:hidden divide-y divide-[var(--border-lighter)]">
          {(activeTab === 'recent' ? filteredDocs.slice(0, 5) : urgentAlertDocs).map((row) => (
            <div key={row.id} className="p-4 space-y-3 hover:bg-[var(--border-lighter)]/50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[0.75rem] font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded border border-[var(--border-light)] font-semibold">
                  {row.docNumber}
                </span>
                {row.receiveNumber && (
                  <span className="text-[0.75rem] font-mono text-[var(--text-muted)] font-medium">
                    รับ: {row.receiveNumber}
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-[var(--text-primary)] leading-relaxed line-clamp-2">
                  {row.title}
                </h4>
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  {getPriorityBadge(row.priority)}
                  <span className={`text-[0.7rem] px-1.5 py-0.5 rounded border whitespace-nowrap font-medium ${
                    row.type === 'inbox' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10' :
                    row.type === 'outbox' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10' :
                    'text-violet-400 border-violet-400/30 bg-violet-500/10'
                  }`}>
                    {row.type === 'inbox' ? 'หนังสือรับ' : row.type === 'outbox' ? 'หนังสือส่ง' : 'งานธุรการ'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-lighter)]/40">
                <div className="truncate pr-4">
                  <span className="text-[var(--text-muted)]">
                    {row.type === 'inbox' ? 'จาก: ' : row.type === 'outbox' ? 'ถึง: ' : 'ประเภท: '}
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {row.type === 'inbox' ? row.from : row.type === 'outbox' ? row.to : (row.category === 'order' ? 'คำสั่ง' : row.category === 'announcement' ? 'ประกาศ' : 'หนังสือรับรอง')}
                  </span>
                </div>
                <button 
                  onClick={() => onViewDoc(row)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 rounded-lg transition-colors shrink-0 font-medium border border-transparent hover:border-[var(--primary-color)]/20"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>รายละเอียด</span>
                </button>
              </div>
            </div>
          ))}
          {(activeTab === 'recent' ? filteredDocs.length === 0 : urgentAlertDocs.length === 0) && (
            <div className="p-8 text-center text-[var(--text-muted)] text-sm">ไม่พบข้อมูลหนังสือ</div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-lighter)] text-[0.8rem] text-[var(--text-secondary)] uppercase tracking-wider font-mono">
                <th className="p-4 font-semibold whitespace-nowrap">เลขรับ/ที่</th>
                <th className="p-4 font-semibold min-w-[220px]">เรื่อง</th>
                <th className="p-4 font-semibold whitespace-nowrap">จาก/ถึง</th>
                <th className="p-4 font-semibold whitespace-nowrap">กลุ่มปฏิบัติ</th>
                <th className="p-4 font-semibold whitespace-nowrap">สถานะ</th>
                <th className="p-4 font-semibold whitespace-nowrap text-right">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="text-[0.95rem] divide-y divide-[var(--border-lighter)]">
              {(activeTab === 'recent' ? filteredDocs.slice(0, 8) : urgentAlertDocs).map((row) => (
                <tr 
                  key={row.id} 
                  className="hover:bg-[var(--border-lighter)]/50 transition-colors group"
                >
                  <td className="p-4">
                    <div className="font-semibold text-[var(--text-primary)] mb-0.5 group-hover:text-[var(--primary-color)] transition-colors font-mono">
                      {row.docNumber}
                    </div>
                    {row.receiveNumber && (
                      <div className="text-[0.78rem] text-[var(--text-muted)] font-mono">
                        เลขรับ: {row.receiveNumber}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-[var(--text-secondary)] leading-relaxed pr-6">
                    <div className="font-medium text-[var(--text-primary)] line-clamp-2">
                      {row.title}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`text-[0.7rem] px-1.5 py-0.5 rounded border whitespace-nowrap font-medium ${
                        row.type === 'inbox' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10' :
                        row.type === 'outbox' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10' :
                        'text-violet-400 border-violet-400/30 bg-violet-500/10'
                      }`}>
                        {row.type === 'inbox' ? 'หนังสือรับ' : row.type === 'outbox' ? 'หนังสือส่ง' : 'งานธุรการ'}
                      </span>
                      {getPriorityBadge(row.priority)}
                    </div>
                  </td>
                  <td className="p-4 text-[var(--text-secondary)] whitespace-nowrap text-sm">
                    {row.type === 'inbox' ? row.from : row.type === 'outbox' ? row.to : 'งานธุรการ'}
                  </td>
                  <td className="p-4 text-[var(--text-secondary)] whitespace-nowrap text-sm">
                    {row.department || '-'}
                  </td>
                  <td className="p-4 whitespace-nowrap text-xs font-medium">
                    <span className="px-2 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-light)] text-[var(--text-secondary)]">
                      {row.status || 'ลงทะเบียน'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => onViewDoc(row)}
                      className="p-2 text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 rounded-xl transition-all inline-flex items-center gap-1 border border-transparent hover:border-[var(--primary-color)]/20"
                      title="ดูรายละเอียดเอกสาร"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {(activeTab === 'recent' ? filteredDocs.length === 0 : urgentAlertDocs.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-[var(--text-muted)] text-sm font-medium">
                    ไม่พบข้อมูลหนังสือในรายการ
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
