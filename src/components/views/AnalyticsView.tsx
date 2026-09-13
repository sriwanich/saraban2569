import React, { useState, useMemo } from 'react';
import { DocumentItem } from '../../types';
import { 
  BarChart3, TrendingUp, PieChart as PieChartIcon, Calendar, Filter, 
  Download, FileText, Send, Inbox, ShieldAlert, CheckCircle2, 
  Clock, Award, Layers, Search, Eye, ArrowUpRight, ArrowDownRight, 
  Building2, Zap, RefreshCw, Printer, AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend
} from 'recharts';

interface Props {
  documents: DocumentItem[];
  onViewDoc?: (doc: DocumentItem) => void;
}

const COLORS = [
  '#2563eb', '#059669', '#d97706', '#dc2626', 
  '#7c3aed', '#0891b2', '#db2777', '#4b5563'
];

export default function AnalyticsView({ documents, onViewDoc }: Props) {
  // Filter States
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'all' | '30days' | '90days' | 'year'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'workload' | 'classification' | 'drilldown'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique years
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(documents.map(d => d.year).filter(Boolean))).sort().reverse();
    return years.length > 0 ? years : ['2569', '2568'];
  }, [documents]);

  // Extract unique departments
  const availableDepts = useMemo(() => {
    const depts = Array.from(new Set(documents.map(d => d.department).filter(Boolean))).sort();
    return depts.length > 0 ? depts : [
      'ฝ่ายยุทธศาสตร์และการจัดการ',
      'ฝ่ายป้องกันและปฏิบัติการ',
      'ฝ่ายสงเคราะห์ผู้ประสบภัย'
    ];
  }, [documents]);

  // Filtered Documents
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      if (selectedYear !== 'all' && doc.year !== selectedYear) return false;
      if (selectedDept !== 'all' && doc.department !== selectedDept) return false;
      if (selectedType !== 'all' && doc.type !== selectedType) return false;
      if (selectedPriority !== 'all' && doc.priority !== selectedPriority) return false;

      if (timeRange !== 'all') {
        const docDate = new Date(doc.registerDate || doc.date);
        if (!isNaN(docDate.getTime())) {
          const now = new Date();
          const diffDays = (now.getTime() - docDate.getTime()) / (1000 * 3600 * 24);
          if (timeRange === '30days' && diffDays > 30) return false;
          if (timeRange === '90days' && diffDays > 90) return false;
          if (timeRange === 'year' && diffDays > 365) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (doc.title || '').toLowerCase().includes(q);
        const matchNumber = (doc.docNumber || '').toLowerCase().includes(q);
        const matchDept = (doc.department || '').toLowerCase().includes(q);
        const matchFrom = (doc.from || '').toLowerCase().includes(q);
        const matchTo = (doc.to || '').toLowerCase().includes(q);
        if (!matchTitle && !matchNumber && !matchDept && !matchFrom && !matchTo) return false;
      }

      return true;
    });
  }, [documents, selectedYear, selectedDept, selectedType, selectedPriority, timeRange, searchQuery]);

  // Key KPI Metrics Calculations
  const stats = useMemo(() => {
    const total = filteredDocs.length;
    const inboxCount = filteredDocs.filter(d => d.type === 'inbox').length;
    const outboxCount = filteredDocs.filter(d => d.type === 'outbox').length;
    const adminCount = filteredDocs.filter(d => d.type === 'admin').length;
    const internalCount = filteredDocs.filter(d => d.type === 'internal').length;

    const urgentCount = filteredDocs.filter(d => 
      d.priority === 'ด่วนที่สุด' || d.priority === 'ด่วนมาก' || d.priority === 'ด่วน'
    ).length;
    const urgentRate = total > 0 ? ((urgentCount / total) * 100).toFixed(1) : '0';

    const secretCount = filteredDocs.filter(d => 
      d.secrecy === 'ลับที่สุด' || d.secrecy === 'ลับมาก' || d.secrecy === 'ลับ'
    ).length;

    const completedCount = filteredDocs.filter(d => 
      d.status === 'เสร็จสิ้น' || d.status === 'ลงนามแล้ว' || d.status === 'ประทับตราแล้ว'
    ).length;
    const completionRate = total > 0 ? ((completedCount / total) * 100).toFixed(1) : '0';

    return {
      total,
      inboxCount,
      outboxCount,
      adminCount,
      internalCount,
      urgentCount,
      urgentRate,
      secretCount,
      completedCount,
      completionRate
    };
  }, [filteredDocs]);

  // Monthly Trend Data
  const monthlyTrendData = useMemo(() => {
    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    
    const monthlyMap: Record<number, { inbox: number; outbox: number; admin: number; total: number }> = {};
    for (let i = 0; i < 12; i++) {
      monthlyMap[i] = { inbox: 0, outbox: 0, admin: 0, total: 0 };
    }

    filteredDocs.forEach(d => {
      const dateStr = d.registerDate || d.date;
      if (!dateStr) return;
      const dObj = new Date(dateStr);
      if (!isNaN(dObj.getTime())) {
        const m = dObj.getMonth();
        if (monthlyMap[m]) {
          if (d.type === 'inbox') monthlyMap[m].inbox += 1;
          else if (d.type === 'outbox') monthlyMap[m].outbox += 1;
          else monthlyMap[m].admin += 1;
          monthlyMap[m].total += 1;
        }
      }
    });

    return months.map((name, index) => ({
      name,
      'หนังสือรับ': monthlyMap[index].inbox,
      'หนังสือส่ง': monthlyMap[index].outbox,
      'คำสั่ง/ประกาศ': monthlyMap[index].admin,
      'รวมทั้งหมด': monthlyMap[index].total
    }));
  }, [filteredDocs]);

  // Department Workload Data
  const deptWorkloadData = useMemo(() => {
    const map: Record<string, { total: number; inbox: number; outbox: number; admin: number }> = {};
    
    filteredDocs.forEach(d => {
      const dept = d.department || 'ไม่ระบุฝ่าย';
      if (!map[dept]) {
        map[dept] = { total: 0, inbox: 0, outbox: 0, admin: 0 };
      }
      map[dept].total += 1;
      if (d.type === 'inbox') map[dept].inbox += 1;
      else if (d.type === 'outbox') map[dept].outbox += 1;
      else map[dept].admin += 1;
    });

    return Object.entries(map)
      .map(([name, counts]) => ({
        name,
        'หนังสือรับ': counts.inbox,
        'หนังสือส่ง': counts.outbox,
        'คำสั่ง/ภายใน': counts.admin,
        'รวมทั้งหมด': counts.total
      }))
      .sort((a, b) => b['รวมทั้งหมด'] - a['รวมทั้งหมด']);
  }, [filteredDocs]);

  // Document Type Distribution Data (Pie)
  const typePieData = useMemo(() => {
    return [
      { name: 'หนังสือรับภายนอก', value: stats.inboxCount, color: '#2563eb' },
      { name: 'หนังสือส่งออกภายนอก', value: stats.outboxCount, color: '#059669' },
      { name: 'คำสั่งและประกาศจังหวัด', value: stats.adminCount, color: '#d97706' },
      { name: 'หนังสือภายในหน่วยงาน', value: stats.internalCount, color: '#7c3aed' }
    ].filter(item => item.value > 0);
  }, [stats]);

  // Priority Distribution Data
  const priorityData = useMemo(() => {
    const map: Record<string, number> = {
      'ปกติ': 0,
      'ด่วน': 0,
      'ด่วนมาก': 0,
      'ด่วนที่สุด': 0
    };

    filteredDocs.forEach(d => {
      const p = d.priority || 'ปกติ';
      if (map[p] !== undefined) {
        map[p] += 1;
      } else {
        map['ปกติ'] += 1;
      }
    });

    return [
      { name: 'ปกติ', count: map['ปกติ'], color: '#64748b' },
      { name: 'ด่วน', count: map['ด่วน'], color: '#3b82f6' },
      { name: 'ด่วนมาก', count: map['ด่วนมาก'], color: '#f59e0b' },
      { name: 'ด่วนที่สุด', count: map['ด่วนที่สุด'], color: '#ef4444' }
    ];
  }, [filteredDocs]);

  // Secrecy Distribution Data
  const secrecyData = useMemo(() => {
    const map: Record<string, number> = {
      'ปกติ': 0,
      'ลับ': 0,
      'ลับมาก': 0,
      'ลับที่สุด': 0
    };

    filteredDocs.forEach(d => {
      const s = d.secrecy || 'ปกติ';
      if (map[s] !== undefined) {
        map[s] += 1;
      } else {
        map['ปกติ'] += 1;
      }
    });

    return [
      { name: 'เปิดเผยทั่วไป (ปกติ)', count: map['ปกติ'], color: '#10b981' },
      { name: 'ลับ', count: map['ลับ'], color: '#8b5cf6' },
      { name: 'ลับมาก', count: map['ลับมาก'], color: '#ec4899' },
      { name: 'ลับที่สุด', count: map['ลับที่สุด'], color: '#dc2626' }
    ];
  }, [filteredDocs]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredDocs.length === 0) return;
    const headers = ['เลขทะเบียน', 'ปี', 'เลขที่หนังสือ', 'ลงวันที่', 'เรื่อง', 'จาก', 'ถึง', 'ฝ่ายที่รับผิดชอบ', 'ชั้นความเร็ว', 'ชั้นความลับ', 'สถานะ'];
    const rows = filteredDocs.map(d => [
      `"${d.receiveNumber || '-'}"`,
      `"${d.year || '-'}"`,
      `"${d.docNumber || '-'}"`,
      `"${d.date || '-'}"`,
      `"${(d.title || '').replace(/"/g, '""')}"`,
      `"${(d.from || '').replace(/"/g, '""')}"`,
      `"${(d.to || '').replace(/"/g, '""')}"`,
      `"${d.department || '-'}"`,
      `"${d.priority || 'ปกติ'}"`,
      `"${d.secrecy || 'ปกติ'}"`,
      `"${d.status || 'ดำเนินการ'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EDMS_Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in pb-12">
      {/* 1. Header Banner with Action Buttons */}
      <div className="bg-[var(--bg-overlay)] backdrop-blur-3xl border border-[var(--border-light)] rounded-[2rem] p-6 lg:p-8 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.06)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--primary-color)]/5 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary-color)] to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-[var(--primary-color)]/25 shrink-0">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl lg:text-3xl font-extrabold text-[var(--text-primary)] font-sans tracking-tight">
                  แดชบอร์ดวิเคราะห์ข้อมูลสารบรรณ (Analytics Dashboard)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-600 border border-green-500/20">
                  Live Data
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                การวิเคราะห์สถิติหนังสือราชการ ภาระงานรายฝ่าย แนวโน้มรายเดือน และตัวชี้วัดประสิทธิภาพ SLA ประจำปีงบประมาณ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl border border-[var(--border-light)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[var(--text-muted)]" />
              พิมพ์รายงานสรุป
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-[var(--primary-color)]/20 active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              ส่งออกข้อมูล (Export CSV)
            </button>
          </div>
        </div>

        {/* 2. Global Filter Toolbar */}
        <div className="mt-8 pt-6 border-t border-[var(--border-light)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 relative z-10">
          {/* Year Filter */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--primary-color)]" /> ปีงบประมาณ
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full text-xs bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)] font-medium cursor-pointer"
            >
              <option value="all">ทุกปีงบประมาณ</option>
              {availableYears.map(y => (
                <option key={y} value={y}>พ.ศ. {y}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[var(--primary-color)]" /> กลุ่มงาน / ฝ่าย
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full text-xs bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)] font-medium cursor-pointer"
            >
              <option value="all">ทุกกลุ่มงาน/ฝ่าย</option>
              {availableDepts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Document Type Filter */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[var(--primary-color)]" /> ประเภทหนังสือ
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full text-xs bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)] font-medium cursor-pointer"
            >
              <option value="all">ทุกประเภทเอกสาร</option>
              <option value="inbox">หนังสือรับภายนอก</option>
              <option value="outbox">หนังสือส่งออกภายนอก</option>
              <option value="admin">คำสั่งและประกาศ</option>
              <option value="internal">หนังสือภายใน</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[var(--primary-color)]" /> ชั้นความเร็ว
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full text-xs bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)] font-medium cursor-pointer"
            >
              <option value="all">ทุกชั้นความเร็ว</option>
              <option value="ปกติ">ปกติ</option>
              <option value="ด่วน">ด่วน</option>
              <option value="ด่วนมาก">ด่วนมาก</option>
              <option value="ด่วนที่สุด">ด่วนที่สุด</option>
            </select>
          </div>

          {/* Time Horizon Filter */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[var(--primary-color)]" /> ช่วงเวลา
            </label>
            <select
              value={timeRange}
              onChange={(e: any) => setTimeRange(e.target.value)}
              className="w-full text-xs bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)] font-medium cursor-pointer"
            >
              <option value="all">ทั้งหมดตามฐานข้อมูล</option>
              <option value="30days">30 วันล่าสุด</option>
              <option value="90days">90 วันล่าสุด (ไตรมาส)</option>
              <option value="year">1 ปีล่าสุด</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1: Total Docs */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">เอกสารในระบบทั้งหมด</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)] font-mono">
              {stats.total.toLocaleString()}
            </span>
            <span className="text-xs text-[var(--text-secondary)] font-medium">ฉบับ</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 font-medium">
            <span>รับ {stats.inboxCount}</span>
            <span className="text-[var(--text-muted)]">•</span>
            <span>ส่ง {stats.outboxCount}</span>
            <span className="text-[var(--text-muted)]">•</span>
            <span>คำสั่ง {stats.adminCount}</span>
          </div>
        </div>

        {/* Metric 2: Completion Rate */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">อัตราดำเนินการสำเร็จ</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)] font-mono">
              {stats.completionRate}%
            </span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> ปกติ
            </span>
          </div>
          <div className="mt-3 text-xs text-[var(--text-secondary)]">
            ดำเนินเรื่องเสร็จสิ้นแล้ว <span className="font-bold text-[var(--text-primary)]">{stats.completedCount}</span> ฉบับ
          </div>
        </div>

        {/* Metric 3: Urgent Rate */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">เอกสารเร่งด่วน / สั่งการ</span>
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)] font-mono">
              {stats.urgentCount}
            </span>
            <span className="text-xs text-[var(--text-secondary)] font-medium">ฉบับ</span>
          </div>
          <div className="mt-3 text-xs text-red-600 font-medium flex items-center gap-1">
            <span>คิดเป็น {stats.urgentRate}% ของหนังสือทั้งหมด</span>
          </div>
        </div>

        {/* Metric 4: Secret Rate */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">เอกสารคุ้มครองความลับ</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)] font-mono">
              {stats.secretCount}
            </span>
            <span className="text-xs text-[var(--text-secondary)] font-medium">ฉบับ</span>
          </div>
          <div className="mt-3 text-xs text-purple-600 font-medium">
            เข้าถึงภายใต้สิทธิ์ RBAC ควบคุม
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation for Analytical Perspectives */}
      <div className="flex items-center gap-2 border-b border-[var(--border-light)] pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'แนวโน้มปริมาณงาน (Workload Trend)', icon: TrendingUp },
          { id: 'workload', label: 'ภาระงานรายฝ่าย (Department Analytics)', icon: Building2 },
          { id: 'classification', label: 'สัดส่วนและความเร่งด่วน (Classification)', icon: PieChartIcon },
          { id: 'drilldown', label: 'รายการเอกสารเจาะลึก (Drill-down Data)', icon: FileText, badge: `${filteredDocs.length}` }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[var(--primary-color)] text-white shadow-md shadow-[var(--primary-color)]/20'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              {t.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-[var(--bg-canvas)] text-[var(--text-muted)] border border-[var(--border-light)]'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview Timeline & Monthly Trend */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Monthly Area Chart */}
          <div className="lg:col-span-8 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] font-sans">
                  แนวโน้มปริมาณหนังสือรับ-ส่งรายเดือน (Monthly Flow Trends)
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  เปรียบเทียบปริมาณหนังสือรับเข้า หนังสือส่งออก และคำสั่งประกาศในแต่ละเดือน
                </p>
              </div>
              <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2.5 py-1 rounded-xl">
                12 เดือน
              </span>
            </div>

            <div className="h-[340px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInbox" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorOutbox" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" opacity={0.6} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-surface)', 
                      borderColor: 'var(--border-light)',
                      borderRadius: '16px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="หนังสือรับ" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInbox)" />
                  <Area type="monotone" dataKey="หนังสือส่ง" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOutbox)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Distribution Summary */}
          <div className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] font-sans">
                สัดส่วนประเภทหนังสือ (Category Proportion)
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                แยกตามระเบียบงานสารบรรณ
              </p>

              <div className="h-[220px] w-full relative flex items-center justify-center">
                {typePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {typePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-surface)', 
                          borderColor: 'var(--border-light)',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-[var(--text-muted)]">ไม่มีข้อมูลเอกสาร</div>
                )}
              </div>

              <div className="space-y-2 mt-2">
                {typePieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[var(--text-secondary)]">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-[var(--text-primary)]">{item.value} ฉบับ</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-light)] text-xs text-[var(--text-secondary)] flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <span>หนังสือรับคิดเป็นสัดส่วนสูงสุด {stats.total > 0 ? ((stats.inboxCount / stats.total) * 100).toFixed(0) : 0}% ของงานสารบรรณ</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Department Workload Analytics */}
      {activeTab === 'workload' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] font-sans">
                  การกระจายภาระงานเอกสารรายกลุ่มงาน/ฝ่าย (Department Workload Distribution)
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  เปรียบเทียบปริมาณงานรับเข้า งานส่งออก และคำสั่งของแต่ละกลุ่มงาน
                </p>
              </div>
              <span className="text-xs font-semibold text-[var(--primary-color)]">
                {deptWorkloadData.length} กลุ่มงาน
              </span>
            </div>

            <div className="h-[360px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptWorkloadData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" opacity={0.6} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-surface)', 
                      borderColor: 'var(--border-light)',
                      borderRadius: '16px',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="หนังสือรับ" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="หนังสือส่ง" fill="#059669" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="คำสั่ง/ภายใน" fill="#d97706" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Detail Summary Table */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 shadow-sm overflow-hidden space-y-4">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              ตารางสรุปปริมาณงานและความคล่องตัวรายฝ่าย
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase font-bold text-[11px] border-b border-[var(--border-light)]">
                  <tr>
                    <th className="py-3 px-4 rounded-l-xl">กลุ่มงาน / ฝ่าย</th>
                    <th className="py-3 px-4 text-center">หนังสือรับ (ฉบับ)</th>
                    <th className="py-3 px-4 text-center">หนังสือส่ง (ฉบับ)</th>
                    <th className="py-3 px-4 text-center">คำสั่ง/ภายใน (ฉบับ)</th>
                    <th className="py-3 px-4 text-center">รวมทั้งหมด</th>
                    <th className="py-3 px-4 text-center rounded-r-xl">สัดส่วนภาระงาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-light)]">
                  {deptWorkloadData.map((d) => {
                    const pct = stats.total > 0 ? ((d['รวมทั้งหมด'] / stats.total) * 100).toFixed(1) : '0';
                    return (
                      <tr key={d.name} className="hover:bg-[var(--bg-elevated)]/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">{d.name}</td>
                        <td className="py-3 px-4 text-center font-mono text-blue-600">{d['หนังสือรับ']}</td>
                        <td className="py-3 px-4 text-center font-mono text-emerald-600">{d['หนังสือส่ง']}</td>
                        <td className="py-3 px-4 text-center font-mono text-amber-600">{d['คำสั่ง/ภายใน']}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-[var(--text-primary)]">{d['รวมทั้งหมด']}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 h-2 bg-[var(--bg-canvas)] rounded-full overflow-hidden border border-[var(--border-light)]">
                              <div className="h-full bg-[var(--primary-color)]" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-mono text-[11px] text-[var(--text-muted)] w-8">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Classification & Urgency Analytics */}
      {activeTab === 'classification' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Priority Matrix */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] font-sans">
                  ชั้นความเร็วของหนังสือราชการ (Priority Distribution)
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  การจัดระดับความเร่งด่วนตามระเบียบงานสารบรรณ
                </p>
              </div>
              <Zap className="w-5 h-5 text-red-500" />
            </div>

            <div className="h-[260px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" opacity={0.6} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-surface)', 
                      borderColor: 'var(--border-light)',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {priorityData.map(p => (
                <div key={p.name} className="p-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-light)] text-center">
                  <div className="text-[11px] font-medium text-[var(--text-secondary)]">{p.name}</div>
                  <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-1">{p.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Secrecy Matrix */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] font-sans">
                  ชั้นความลับของหนังสือ (Secrecy Classification)
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  การควบคุมการเข้าถึงเอกสารตามชั้นความลับ
                </p>
              </div>
              <ShieldAlert className="w-5 h-5 text-purple-500" />
            </div>

            <div className="h-[260px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={secrecyData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" opacity={0.6} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-surface)', 
                      borderColor: 'var(--border-light)',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {secrecyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {secrecyData.map(s => (
                <div key={s.name} className="p-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-light)] text-center">
                  <div className="text-[11px] font-medium text-[var(--text-secondary)] truncate">{s.name}</div>
                  <div className="text-lg font-bold font-mono text-[var(--text-primary)] mt-1">{s.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Interactive Document Drill-Down */}
      {activeTab === 'drilldown' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] font-sans">
                รายการหนังสือตรงตามเงื่อนไขการวิเคราะห์ ({filteredDocs.length} ฉบับ)
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                คลิกรายการเพื่อดูรายละเอียดหนังสือ บันทึกเกษียน หรือผังการเดินเรื่อง SLA
              </p>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเลขที่, เรื่อง, หน่วยงาน..."
                className="w-full text-xs bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl pl-9 pr-4 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary-color)] font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase font-bold text-[11px] border-b border-[var(--border-light)]">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">เลขที่หนังสือ / ทะเบียน</th>
                  <th className="py-3 px-4">ลงวันที่</th>
                  <th className="py-3 px-4">เรื่อง</th>
                  <th className="py-3 px-4">ฝ่ายรับผิดชอบ</th>
                  <th className="py-3 px-4 text-center">ชั้นความเร็ว</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-center rounded-r-xl">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)]">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)]">
                      ไม่พบรายการเอกสารที่ตรงตามเงื่อนไขตัวกรอง
                    </td>
                  </tr>
                ) : (
                  filteredDocs.slice(0, 50).map((doc) => (
                    <tr 
                      key={doc.id} 
                      onClick={() => onViewDoc && onViewDoc(doc)}
                      className="hover:bg-[var(--bg-elevated)]/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[var(--primary-color)]">
                        {doc.docNumber || doc.receiveNumber || 'รย 0021/...'}
                      </td>
                      <td className="py-3.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                        {doc.date || doc.registerDate}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[var(--text-primary)] max-w-xs truncate group-hover:text-[var(--primary-color)] transition-colors">
                        {doc.title}
                      </td>
                      <td className="py-3.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                        {doc.department || 'ฝ่ายยุทธศาสตร์และการจัดการ'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          doc.priority === 'ด่วนที่สุด' 
                            ? 'bg-red-500/10 text-red-600 border border-red-500/20' 
                            : doc.priority === 'ด่วนมาก'
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            : doc.priority === 'ด่วน'
                            ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                            : 'bg-slate-500/10 text-slate-600 border border-slate-500/20'
                        }`}>
                          {doc.priority || 'ปกติ'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          {doc.status || 'ดำเนินการ'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onViewDoc) onViewDoc(doc);
                          }}
                          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--primary-color)] hover:bg-[var(--bg-surface)] transition-colors"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredDocs.length > 50 && (
            <div className="text-center text-xs text-[var(--text-muted)] pt-2">
              แสดง 50 รายการแรกจากทั้งหมด {filteredDocs.length} ฉบับ (สามารถส่งออกข้อมูลเป็น CSV เพื่อดูรายการทั้งหมด)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
