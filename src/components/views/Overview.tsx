import React, { useState, useMemo, useEffect } from 'react';
import { DocumentItem, User } from '../../types';
import { 
  FileText, Eye, Inbox, Send, FileSpreadsheet, TrendingUp, AlertTriangle, 
  ShieldAlert, BarChart3, PieChart, Filter, CheckCircle2, 
  Building2, Lock, FileCheck, Activity, Calendar, Zap, Paperclip
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'motion/react';
import EecWeatherWidget from './EecWeatherWidget';

interface Props {
  documents: DocumentItem[];
  user?: User;
  onCreateDoc: (type?: 'inbox' | 'outbox' | 'admin', prefillData?: Partial<DocumentItem>) => void;
  onViewDoc: (doc: DocumentItem) => void;
  enabledFeatures?: Record<string, boolean>;
  onNavigateTab?: (tab: string, subTab?: string) => void;
}

export default function Overview({ documents, user, onCreateDoc, onViewDoc, enabledFeatures, onNavigateTab }: Props) {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const showInbox = !enabledFeatures || enabledFeatures.inbox !== false;
  const showOutbox = !enabledFeatures || enabledFeatures.outbox !== false;
  const showAdmin = !enabledFeatures || enabledFeatures.admin_docs !== false;

  const [inboxPage, setInboxPage] = useState<number>(0);
  const [outboxPage, setOutboxPage] = useState<number>(0);
  const [adminPage, setAdminPage] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'inbox' | 'outbox' | 'admin'>(
    showInbox ? 'inbox' : (showOutbox ? 'outbox' : 'admin')
  );

  // Available Years
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(documents.map(d => d.year).filter(Boolean)));
    years.sort((a, b) => b.localeCompare(a));
    return years;
  }, [documents]);

  // Filtered Documents
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      if (doc.type === 'inbox' && !showInbox) return false;
      if (doc.type === 'outbox' && !showOutbox) return false;
      if (doc.type === 'admin' && !showAdmin) return false;
      const matchYear = selectedYear === 'all' || doc.year === selectedYear;
      const matchType = selectedType === 'all' || doc.type === selectedType;
      return matchYear && matchType;
    });
  }, [documents, selectedYear, selectedType, showInbox, showOutbox, showAdmin]);

  const totalCount = filteredDocs.length;

  // Filtered Documents Categorization
  const categorizedDocs = useMemo(() => {
    const inbox: DocumentItem[] = [];
    const outbox: DocumentItem[] = [];
    const admin: DocumentItem[] = [];

    filteredDocs.forEach(doc => {
      if (doc.type === 'inbox') inbox.push(doc);
      else if (doc.type === 'outbox') outbox.push(doc);
      else if (doc.type === 'admin') admin.push(doc);
    });

    return { inbox, outbox, admin };
  }, [filteredDocs]);

  const { inbox: inboxDocsList, outbox: outboxDocsList, admin: adminDocsList } = categorizedDocs;

  // For compatibility with any direct references to these variables
  const inboxDocs = inboxDocsList;
  const outboxDocs = outboxDocsList;
  const adminDocs = adminDocsList;

  const itemsPerPage = 5;

  const paginatedInboxDocs = useMemo(() => {
    return inboxDocsList.slice(inboxPage * itemsPerPage, (inboxPage + 1) * itemsPerPage);
  }, [inboxDocsList, inboxPage]);

  const paginatedOutboxDocs = useMemo(() => {
    return outboxDocsList.slice(outboxPage * itemsPerPage, (outboxPage + 1) * itemsPerPage);
  }, [outboxDocsList, outboxPage]);

  const paginatedAdminDocs = useMemo(() => {
    return adminDocsList.slice(adminPage * itemsPerPage, (adminPage + 1) * itemsPerPage);
  }, [adminDocsList, adminPage]);

  const activeDocs = useMemo(() => {
    if (activeTab === 'inbox') return paginatedInboxDocs;
    if (activeTab === 'outbox') return paginatedOutboxDocs;
    return paginatedAdminDocs;
  }, [activeTab, paginatedInboxDocs, paginatedOutboxDocs, paginatedAdminDocs]);

  const activeTotalCount = useMemo(() => {
    if (activeTab === 'inbox') return inboxDocsList.length;
    if (activeTab === 'outbox') return outboxDocsList.length;
    return adminDocsList.length;
  }, [activeTab, inboxDocsList, outboxDocsList, adminDocsList]);

  const activePage = useMemo(() => {
    if (activeTab === 'inbox') return inboxPage;
    if (activeTab === 'outbox') return outboxPage;
    return adminPage;
  }, [activeTab, inboxPage, outboxPage, adminPage]);

  const setActivePage = (page: number) => {
    if (activeTab === 'inbox') setInboxPage(page);
    else if (activeTab === 'outbox') setOutboxPage(page);
    else setAdminPage(page);
  };

  useEffect(() => {
    const totalPages = Math.ceil(inboxDocsList.length / itemsPerPage);
    if (inboxPage >= totalPages && totalPages > 0) {
      setInboxPage(totalPages - 1);
    }
  }, [inboxDocsList, inboxPage]);

  useEffect(() => {
    const totalPages = Math.ceil(outboxDocsList.length / itemsPerPage);
    if (outboxPage >= totalPages && totalPages > 0) {
      setOutboxPage(totalPages - 1);
    }
  }, [outboxDocsList, outboxPage]);

  useEffect(() => {
    const totalPages = Math.ceil(adminDocsList.length / itemsPerPage);
    if (adminPage >= totalPages && totalPages > 0) {
      setAdminPage(totalPages - 1);
    }
  }, [adminDocsList, adminPage]);

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

  // Monthly Trend Data for Recharts
  const monthlyTrendData = useMemo(() => {
    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    const data = months.map((month) => ({
      name: month,
      'หนังสือรับ': 0,
      'หนังสือส่ง': 0,
      'งานธุรการ': 0,
      'รวมทั้งหมด': 0
    }));

    filteredDocs.forEach(doc => {
      let monthIndex = -1;
      if (doc.registerDate) {
        const parts = doc.registerDate.split('-');
        if (parts.length >= 2) {
          monthIndex = parseInt(parts[1], 10) - 1;
        }
      }
      if ((monthIndex < 0 || monthIndex > 11) && doc.date) {
        const parts = doc.date.split('-');
        if (parts.length >= 2) {
          monthIndex = parseInt(parts[1], 10) - 1;
        } else {
          const slashParts = doc.date.split('/');
          if (slashParts.length >= 2) {
            monthIndex = parseInt(slashParts[1], 10) - 1;
          }
        }
      }

      if (monthIndex >= 0 && monthIndex < 12) {
        if (doc.type === 'inbox') data[monthIndex]['หนังสือรับ'] += 1;
        else if (doc.type === 'outbox') data[monthIndex]['หนังสือส่ง'] += 1;
        else if (doc.type === 'admin') data[monthIndex]['งานธุรการ'] += 1;
        data[monthIndex]['รวมทั้งหมด'] += 1;
      }
    });

    return data;
  }, [filteredDocs]);

  // Priority Distribution for Recharts
  const priorityChartData = useMemo(() => {
    const categories = ['ปกติ', 'ด่วน', 'ด่วนมาก', 'ด่วนที่สุด'];
    return categories.map(cat => {
      const docsInCat = filteredDocs.filter(d => (d.priority || 'ปกติ') === cat);
      return {
        name: cat,
        'หนังสือรับ': docsInCat.filter(d => d.type === 'inbox').length,
        'หนังสือส่ง': docsInCat.filter(d => d.type === 'outbox').length,
        'งานธุรการ': docsInCat.filter(d => d.type === 'admin').length,
      };
    });
  }, [filteredDocs]);

  // Status Distribution for Recharts
  const statusChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredDocs.forEach(d => {
      const status = d.status || 'ลงทะเบียน';
      map[status] = (map[status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({
      name,
      value
    }));
  }, [filteredDocs]);

  const STATUS_COLORS: Record<string, string> = {
    'ลงทะเบียน': '#3b82f6',     // blue
    'เสนอผู้บริหาร': '#f59e0b',   // amber
    'ส่งต่อกลุ่มงาน': '#8b5cf6',   // violet
    'เสร็จสิ้น': '#10b981',       // emerald
    'default': '#64748b'        // slate
  };

  // --- APACHE ECHARTS CONFIGURATIONS ---
  const monthlyTrendOption = useMemo(() => {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { backgroundColor: '#334155' } },
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        borderRadius: 12,
        padding: 10
      },
      legend: {
        data: ['หนังสือรับ', 'หนังสือส่ง', 'งานธุรการ'].filter(name => {
          if (name === 'หนังสือรับ' && !showInbox) return false;
          if (name === 'หนังสือส่ง' && !showOutbox) return false;
          if (name === 'งานธุรการ' && !showAdmin) return false;
          return true;
        }),
        textStyle: { color: '#94a3b8', fontSize: 11, fontWeight: 600 },
        bottom: 0
      },
      grid: { left: '2%', right: '3%', bottom: '14%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: monthlyTrendData.map(d => d.name),
        axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.2)' } },
        axisLabel: { color: '#94a3b8', fontSize: 11, fontWeight: 600 }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 11, fontWeight: 600 }
      },
      series: [
        showInbox && {
          name: 'หนังสือรับ',
          type: 'line',
          smooth: 0.35,
          symbolSize: 6,
          lineStyle: { width: 3, color: '#3b82f6' },
          itemStyle: { color: '#3b82f6' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(59, 130, 246, 0.35)' }, { offset: 1, color: 'rgba(59, 130, 246, 0.02)' }]
            }
          },
          data: monthlyTrendData.map(d => d['หนังสือรับ'])
        },
        showOutbox && {
          name: 'หนังสือส่ง',
          type: 'line',
          smooth: 0.35,
          symbolSize: 6,
          lineStyle: { width: 3, color: '#10b981' },
          itemStyle: { color: '#10b981' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(16, 185, 129, 0.35)' }, { offset: 1, color: 'rgba(16, 185, 129, 0.02)' }]
            }
          },
          data: monthlyTrendData.map(d => d['หนังสือส่ง'])
        },
        showAdmin && {
          name: 'งานธุรการ',
          type: 'line',
          smooth: 0.35,
          symbolSize: 6,
          lineStyle: { width: 3, color: '#8b5cf6' },
          itemStyle: { color: '#8b5cf6' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(139, 92, 246, 0.35)' }, { offset: 1, color: 'rgba(139, 92, 246, 0.02)' }]
            }
          },
          data: monthlyTrendData.map(d => d['งานธุรการ'])
        }
      ].filter(Boolean)
    };
  }, [monthlyTrendData, showInbox, showOutbox, showAdmin]);

  const priorityEChartsOption = useMemo(() => {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        borderRadius: 12
      },
      legend: {
        data: ['หนังสือรับ', 'หนังสือส่ง', 'งานธุรการ'].filter(name => {
          if (name === 'หนังสือรับ' && !showInbox) return false;
          if (name === 'หนังสือส่ง' && !showOutbox) return false;
          if (name === 'งานธุรการ' && !showAdmin) return false;
          return true;
        }),
        textStyle: { color: '#94a3b8', fontSize: 11, fontWeight: 600 },
        bottom: 0
      },
      grid: { left: '2%', right: '2%', bottom: '15%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: priorityChartData.map(d => d.name),
        axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.2)' } },
        axisLabel: { color: '#94a3b8', fontSize: 11, fontWeight: 700 }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 11, fontWeight: 600 }
      },
      series: [
        showInbox && {
          name: 'หนังสือรับ',
          type: 'bar',
          stack: 'total',
          emphasis: { focus: 'series' },
          itemStyle: { color: '#3b82f6' },
          data: priorityChartData.map(d => d['หนังสือรับ'])
        },
        showOutbox && {
          name: 'หนังสือส่ง',
          type: 'bar',
          stack: 'total',
          emphasis: { focus: 'series' },
          itemStyle: { color: '#10b981' },
          data: priorityChartData.map(d => d['หนังสือส่ง'])
        },
        showAdmin && {
          name: 'งานธุรการ',
          type: 'bar',
          stack: 'total',
          emphasis: { focus: 'series' },
          itemStyle: { color: '#8b5cf6', borderRadius: [4, 4, 0, 0] },
          data: priorityChartData.map(d => d['งานธุรการ'])
        }
      ].filter(Boolean)
    };
  }, [priorityChartData, showInbox, showOutbox, showAdmin]);

  const statusEChartsOption = useMemo(() => {
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: '{b}: <b>{c} ฉบับ</b> ({d}%)',
        borderRadius: 12
      },
      series: [
        {
          name: 'สถานะความคืบหน้า',
          type: 'pie',
          radius: ['52%', '78%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: 2
          },
          label: { show: false },
          emphasis: {
            scale: true,
            scaleSize: 6,
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold',
              color: 'var(--text-primary)'
            }
          },
          data: statusChartData.map(s => ({
            name: s.name,
            value: s.value,
            itemStyle: { color: STATUS_COLORS[s.name] || STATUS_COLORS['default'] }
          }))
        }
      ]
    };
  }, [statusChartData]);

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

  const getPriorityBadgeDashboard = (priority: string) => {
    let color = '';
    const cleanPriority = (priority || 'ปกติ').trim();
    if (cleanPriority === 'ด่วนที่สุด') color = 'text-red-600 border-red-500/20 bg-red-500/10 dark:text-red-400';
    else if (cleanPriority === 'ด่วนมาก') color = 'text-orange-600 border-orange-500/20 bg-orange-500/10 dark:text-orange-400';
    else if (cleanPriority === 'ด่วน') color = 'text-amber-600 border-amber-500/20 bg-amber-500/10 dark:text-amber-400';
    else color = 'text-slate-500 border-slate-500/15 bg-slate-500/5 dark:text-slate-400 dark:bg-slate-500/10';
    
    return (
      <span className={`text-[0.72rem] px-2 py-0.5 rounded border ${color} whitespace-nowrap inline-flex items-center gap-1 font-bold`}>
        {cleanPriority === 'ด่วนที่สุด' && <Zap className="w-3 h-3 text-red-500 dark:text-red-400 animate-pulse" />}
        {cleanPriority}
      </span>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 lg:space-y-6 pb-8"
    >
      {/* 1. Quick Registration Shortcuts (Top Priority Action Bar) */}
      {(showInbox || showOutbox || showAdmin) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-[var(--bg-overlay)] backdrop-blur-3xl border border-[var(--border-light)] rounded-[2rem] p-6 sm:p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] relative overflow-hidden"
        >
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
            {showInbox && (
              <motion.button
                type="button"
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onCreateDoc('inbox')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] hover:border-blue-500/50 hover:shadow-lg transition-all duration-300 text-xs font-semibold text-left group shadow-sm cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Inbox className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-[var(--text-primary)] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">รับหนังสือใหม่</div>
                  <div className="text-xs text-[var(--text-secondary)] font-medium mt-0.5 leading-tight opacity-80">บันทึกและจำแนกเรื่องเข้าหน่วยงาน</div>
                </div>
              </motion.button>
            )}

            {showOutbox && (
              <motion.button
                type="button"
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onCreateDoc('outbox')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] hover:border-emerald-500/50 hover:shadow-lg transition-all duration-300 text-xs font-semibold text-left group shadow-sm cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">ส่งหนังสือออก</div>
                  <div className="text-xs text-[var(--text-secondary)] font-medium mt-0.5 leading-tight opacity-80">จัดส่งเอกสารออก / ลงทะเบียนเวียน</div>
                </div>
              </motion.button>
            )}

            {showAdmin && (
              <motion.button
                type="button"
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onCreateDoc('admin')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] hover:border-violet-500/50 hover:shadow-lg transition-all duration-300 text-xs font-semibold text-left group shadow-sm cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-[var(--text-primary)] group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">สร้างคำสั่ง / ประกาศ</div>
                  <div className="text-xs text-[var(--text-secondary)] font-medium mt-0.5 leading-tight opacity-80">ออกเลขรับรองและเอกสารธุรการ</div>
                </div>
              </motion.button>
            )}
          </div>
        </motion.div>
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

      {/* Analytics Visual Grid: Data Visualization Dashboard */}
      <div className="space-y-6 lg:space-y-8 mt-8">
        
        {/* Row 1: Document Flow Trends & Urgency/Priority Matrix */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Chart 1: Document Flow Trend AreaChart (2/3 width on desktop) */}
          <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-3xl p-6 lg:p-8 shadow-sm hover:shadow-md transition-all duration-300 xl:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-light)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--primary-color)]/10 text-[var(--primary-color)]">
                    <TrendingUp className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-sans font-bold text-[var(--text-primary)]">แนวโน้มการไหลดิจิทัล (Document Flow Trends)</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">กราฟแสดงปริมาณการบันทึกเอกสารสะสมในแต่ละเดือน</p>
                  </div>
                </div>
                <span className="text-[11px] uppercase font-bold tracking-widest text-[var(--text-muted)] bg-[var(--bg-elevated)] px-3 py-1.5 rounded-xl border border-[var(--border-light)] font-mono">
                  {selectedYear === 'all' ? 'ทุกปีงบประมาณ' : `ปีงบประมาณ ${selectedYear}`}
                </span>
              </div>

              {/* Chart container */}
              <div className="w-full h-[300px] mt-2 relative">
                {totalCount === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] text-sm font-semibold">
                    ไม่มีข้อมูลเอกสารสำหรับแสดงกราฟแนวโน้ม
                  </div>
                ) : (
                  <ReactECharts
                    option={monthlyTrendOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                  />
                )}
              </div>
            </div>

            {/* Custom Interactive Legend with Live Percentages */}
            <div className="mt-4 pt-3 border-t border-[var(--border-lighter)] flex flex-wrap gap-4 items-center justify-between text-xs text-[var(--text-muted)] font-medium">
              <span className="font-sans font-bold text-slate-500">สัดส่วนตามประเภท:</span>
              <div className="flex flex-wrap gap-4">
                {showInbox && (
                  <div className="flex items-center gap-1.5 bg-blue-500/5 dark:bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                    <span>หนังสือรับ: {totalCount > 0 ? Math.round((inboxDocs.length / totalCount) * 100) : 0}%</span>
                  </div>
                )}
                {showOutbox && (
                  <div className="flex items-center gap-1.5 bg-emerald-500/5 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                    <span>หนังสือส่ง: {totalCount > 0 ? Math.round((outboxDocs.length / totalCount) * 100) : 0}%</span>
                  </div>
                )}
                {showAdmin && (
                  <div className="flex items-center gap-1.5 bg-violet-500/5 dark:bg-violet-500/10 px-2.5 py-1 rounded-lg border border-violet-500/10 text-violet-600 dark:text-violet-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                    <span>งานธุรการ: {totalCount > 0 ? Math.round((adminDocs.length / totalCount) * 100) : 0}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chart 2: Priority Breakdown BarChart (1/3 width on desktop) */}
          <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-3xl p-6 lg:p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-light)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-sans font-bold text-[var(--text-primary)]">จำแนกตามความด่วน</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">ปริมาณความด่วนแยกประเภทหนังสือ</p>
                  </div>
                </div>
              </div>

              {/* BarChart Container */}
              <div className="w-full h-[230px] relative">
                {totalCount === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] text-sm font-semibold">
                    ไม่มีข้อมูลเอกสาร
                  </div>
                ) : (
                  <ReactECharts
                    option={priorityEChartsOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                  />
                )}
              </div>
            </div>

            {/* Quick Summary list of priority numbers */}
            <div className="mt-4 pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)] flex items-center gap-2 font-semibold">
                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>หนังสือลับพิเศษ:</span>
              </span>
              <span className="font-mono font-bold text-amber-600 bg-amber-500/5 px-2.5 py-1 rounded-xl border border-amber-500/15">
                {confidentialCount} ชั้นความลับ
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Department Workload & Status Lifecycle Progression */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Chart 3: Department Workload (Horizontal BarChart) */}
          <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-3xl p-6 lg:p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-light)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-sans font-bold text-[var(--text-primary)]">ปริมาณงานแยกตามกลุ่มงาน</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">วิเคราะห์สัดส่วนภาระงานของแต่ละฝ่ายงานใน ปภ.</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/15 font-mono">
                  {deptStats.length} กลุ่มปฏิบัติ
                </span>
              </div>

              {/* Workload list & Mini Bar simulation */}
              <div className="space-y-4 max-h-[230px] overflow-y-auto pr-1 custom-scrollbar">
                {deptStats.slice(0, 5).map((dept, idx) => (
                  <div key={idx} className="group/item">
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-[var(--text-primary)] font-bold truncate max-w-[240px] group-hover/item:text-[var(--primary-color)] transition-colors" title={dept.name}>
                        {idx + 1}. {dept.name}
                      </span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{dept.count} ฉบับ ({dept.percent}%)</span>
                    </div>
                    <div className="w-full bg-[var(--bg-elevated)] h-3 rounded-xl overflow-hidden border border-[var(--border-light)] p-0.5 shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-xl transition-all duration-500" 
                        style={{ width: `${dept.percent}%` }} 
                      />
                    </div>
                  </div>
                ))}
                {deptStats.length === 0 && (
                  <div className="text-center py-10 text-xs text-[var(--text-muted)] font-semibold">
                    ไม่มีข้อมูลการกระจายงานของกลุ่มงาน
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
              <span>กลุ่มงานที่รับหนังสือสูงสุด:</span>
              <span className="font-extrabold text-[var(--text-primary)] truncate max-w-[200px] bg-[var(--bg-elevated)] px-3 py-1.5 rounded-xl border border-[var(--border-light)]">
                {deptStats.length > 0 ? deptStats[0].name : '-'}
              </span>
            </div>
          </div>

          {/* Chart 4: Status Lifecycle Progression Donut Chart */}
          <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-3xl p-6 lg:p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-light)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500">
                    <PieChart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-sans font-bold text-[var(--text-primary)]">สถานะความคืบหน้า (Lifecycle Progression)</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">ติดตามขั้นตอนการเดินสารบรรณและการจัดการ SLA</p>
                  </div>
                </div>
              </div>

              {/* Donut chart layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                
                {/* Pie chart frame */}
                <div className="w-full h-[180px] relative flex items-center justify-center">
                  {statusChartData.length === 0 ? (
                    <div className="text-[var(--text-muted)] text-xs font-semibold">ไม่มีข้อมูลขั้นตอน</div>
                  ) : (
                    <ReactECharts
                      option={statusEChartsOption}
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'canvas' }}
                    />
                  )}
                  {/* Central Text inside donut */}
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-extrabold">ทั้งหมด</span>
                    <span className="text-xl font-extrabold font-mono text-[var(--text-primary)] leading-none mt-0.5">{totalCount}</span>
                  </div>
                </div>

                {/* Legend panel */}
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                  {statusChartData.map((status, index) => {
                    const color = STATUS_COLORS[status.name] || STATUS_COLORS['default'];
                    const percent = totalCount > 0 ? Math.round((status.value / totalCount) * 100) : 0;
                    return (
                      <div key={index} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-[var(--bg-elevated)]/50 transition-colors">
                        <div className="flex items-center gap-2 truncate max-w-[130px]" title={status.name}>
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-bold text-[var(--text-secondary)] truncate">{status.name}</span>
                        </div>
                        <span className="font-mono font-bold text-[var(--text-primary)] shrink-0">
                          {status.value} ({percent}%)
                        </span>
                      </div>
                    );
                  })}
                  {statusChartData.length === 0 && (
                    <div className="text-center text-xs text-[var(--text-muted)] py-10 font-semibold">ไม่มีข้อมูลสถานะ</div>
                  )}
                </div>

              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-xs text-[var(--text-muted)] font-medium">
              <span>สถานะดำเนินงานหลัก:</span>
              <div className="flex items-center gap-1.5 font-bold text-[var(--success)] bg-emerald-500/5 dark:bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/15">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />
                <span>เสร็จสิ้น {filteredDocs.filter(d => d.status === 'เสร็จสิ้น').length} เรื่อง</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Main Table View: Recent Tab */}
      <div className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-3xl overflow-hidden flex flex-col shadow-sm mt-8 transition-all hover:shadow-md">
        <div className="p-5 lg:p-6 border-b border-[var(--border-light)] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[var(--bg-elevated)] to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--primary-color)]/10 text-[var(--primary-color)]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-sans font-bold text-[var(--text-primary)]">
                หนังสือราชการล่าสุด
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">แบ่งตามประเภทสารบรรณหลัก แสดงผลประเภทละ 5 รายการ</p>
            </div>
          </div>

          {/* Elegant Category Switcher tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {showInbox && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('inbox');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  activeTab === 'inbox'
                    ? 'bg-blue-500 text-white border-blue-500 shadow-sm shadow-blue-500/20'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-light)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                หนังสือรับเข้า ({inboxDocsList.length})
              </button>
            )}
            {showOutbox && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('outbox');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  activeTab === 'outbox'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-light)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                หนังสือส่งออก ({outboxDocsList.length})
              </button>
            )}
            {showAdmin && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-violet-500 text-white border-violet-500 shadow-sm shadow-violet-500/20'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-light)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                คำสั่ง & ประกาศ ({adminDocsList.length})
              </button>
            )}
          </div>
        </div>
        
        {/* Mobile View: list of items as cards */}
        <div className="block md:hidden divide-y divide-[var(--border-lighter)] max-h-[500px] overflow-y-auto custom-scrollbar">
          {activeDocs.map((row) => (
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
                  {getPriorityBadgeDashboard(row.priority)}
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
          {activeDocs.length === 0 && (
            <div className="p-10 text-center text-[var(--text-muted)] text-sm font-medium">ไม่พบข้อมูลหนังสือในหมวดหมู่นี้</div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-lighter)] text-[0.75rem] text-[var(--text-secondary)] uppercase tracking-wider font-sans font-bold">
                <th className="p-4 text-center font-bold whitespace-nowrap w-[180px]">
                  {activeTab === 'admin' ? 'เลขที่คำสั่ง/ประกาศ' : 'เลขรับ/ที่หนังสือ'}
                </th>
                <th className="p-4 text-center font-bold min-w-[280px]">ชื่อเรื่องหนังสือ</th>
                <th className="p-4 text-center font-bold whitespace-nowrap w-[130px]">ความเร่งด่วน</th>
                <th className="p-4 text-center font-bold whitespace-nowrap w-[200px]">
                  {activeTab === 'inbox' ? 'จากผู้ส่ง' : activeTab === 'outbox' ? 'ถึงผู้รับ' : 'หมวดหมู่ย่อย'}
                </th>
                <th className="p-4 text-center font-bold whitespace-nowrap w-[180px]">กลุ่มปฏิบัติงาน</th>
                <th className="p-4 text-center font-bold whitespace-nowrap w-[110px]">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="text-[13px] divide-y divide-[var(--border-lighter)] bg-[var(--bg-overlay)]/20">
              {activeDocs.map((row) => (
                <tr 
                  key={row.id} 
                  className="hover:bg-[var(--primary-color)]/[0.015] dark:hover:bg-slate-800/10 transition-colors group"
                >
                  <td className="p-4 text-center align-middle">
                    <div className="font-bold text-[var(--text-primary)] mb-1 group-hover:text-[var(--primary-color)] transition-colors font-mono text-xs">
                      {row.docNumber}
                    </div>
                    {row.receiveNumber && (
                      <div className="text-[10px] text-[var(--text-muted)] font-mono font-bold">
                        เลขรับ: {row.receiveNumber}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-left align-middle leading-relaxed pr-6">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[var(--text-primary)] hover:text-[var(--primary-color)] transition-colors">
                        {row.title}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className={`text-[0.68rem] px-2 py-0.5 rounded-lg border whitespace-nowrap font-bold ${
                        row.type === 'inbox' ? 'text-blue-500 border-blue-500/20 bg-blue-500/5' :
                        row.type === 'outbox' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' :
                        'text-violet-500 border-violet-500/20 bg-violet-500/5'
                      }`}>
                        {row.type === 'inbox' ? 'หนังสือรับ' : row.type === 'outbox' ? 'หนังสือส่ง' : 'งานธุรการ'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-center align-middle">
                    <div className="flex flex-col items-center gap-1.5 justify-center">
                      {getPriorityBadgeDashboard(row.priority)}
                      {row.attachments && row.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-md border border-sky-500/20 font-bold shrink-0" title={`${row.attachments.length} ไฟล์แนบ`}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0">
                            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                          </svg>
                          <span>{row.attachments.length}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center align-middle text-xs font-semibold text-[var(--text-secondary)]">
                    {row.type === 'inbox' ? (
                      <span className="font-bold text-[var(--text-primary)]">{row.from || '-'}</span>
                    ) : row.type === 'outbox' ? (
                      <span className="font-bold text-[var(--text-primary)]">{row.to || '-'}</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded border border-violet-500/10 text-violet-600 bg-violet-500/5 font-bold">
                        {row.category === 'order' ? 'คำสั่ง' : row.category === 'announcement' ? 'ประกาศ' : 'หนังสือรับรอง'}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center align-middle text-xs font-semibold text-[var(--text-secondary)]">
                    {row.department ? (
                      <span className="text-xs font-bold bg-violet-500/5 text-violet-600 border border-violet-500/10 px-2 py-0.5 rounded-lg inline-block">
                        {row.department}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="p-4 text-center align-middle">
                    <div className="flex items-center justify-center">
                      <button 
                        onClick={() => onViewDoc(row)}
                        className="p-2 text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 rounded-xl transition-all border border-transparent hover:border-[var(--primary-color)]/20 active:scale-95 cursor-pointer"
                        title="ดูรายละเอียดเอกสาร"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {activeDocs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-[var(--text-muted)] text-sm font-semibold">
                    ไม่พบข้อมูลเอกสารในส่วนนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Controls Footer */}
        {(() => {
          const totalPages = Math.ceil(activeTotalCount / itemsPerPage);
          if (totalPages <= 1) return null;

          return (
            <div className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] border-t border-[var(--border-light)] text-xs text-[var(--text-secondary)] font-semibold rounded-b-3xl">
              <span>
                แสดงรายการที่ {activePage * itemsPerPage + 1} - {Math.min((activePage + 1) * itemsPerPage, activeTotalCount)} จากทั้งหมด {activeTotalCount} รายการ
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivePage(Math.max(0, activePage - 1))}
                  disabled={activePage === 0}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-light)] hover:bg-[var(--bg-surface)] disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer font-bold bg-[var(--bg-surface)] text-[var(--text-primary)]"
                >
                  ก่อนหน้า
                </button>
                <span className="font-mono font-bold">
                  หน้า {activePage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setActivePage(Math.min(totalPages - 1, activePage + 1))}
                  disabled={activePage >= totalPages - 1}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-light)] hover:bg-[var(--bg-surface)] disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer font-bold bg-[var(--bg-surface)] text-[var(--text-primary)]"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </motion.div>
  );
}
