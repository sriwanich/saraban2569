import React, { useState, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Trash2,
  CheckCheck,
  Volume2,
  VolumeX,
  ExternalLink,
  ShieldAlert,
  Flame,
  FileText,
  FileEdit,
  RotateCcw,
  Sparkles,
  Building2,
  User,
  ArrowRight,
  Eye,
  Check,
  Send,
  HelpCircle,
  SlidersHorizontal,
  Bookmark,
  BellRing
} from 'lucide-react';
import { DocumentItem } from '../../types';

interface NotificationItem {
  id: string;
  docId?: string;
  docType?: string;
  type: 'urgent' | 'sla_warning' | 'status_change' | 'completed' | 'assignment' | 'system';
  category?: string;
  priority?: string;
  secrecy?: string;
  docNumber?: string;
  docTitle?: string;
  title: string;
  message: string;
  comments?: string;
  department?: string;
  assignee?: string;
  time: string;
  timeFormatted?: string;
  updater?: string;
  status?: string;
  read: boolean;
}

interface Props {
  user: any;
  notifications: NotificationItem[];
  documents: DocumentItem[];
  onViewDoc: (doc: DocumentItem | string) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRefresh: () => void;
  onNavigateToAi?: (prompt?: string, doc?: DocumentItem) => void;
  onDismiss?: (id: string) => void;
  onClearRead?: () => void;
}

type TabCategory = 'all' | 'unread' | 'urgent' | 'sla' | 'workflow' | 'assigned';

export default function NotificationsView({
  user,
  notifications,
  documents,
  onViewDoc,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
  onNavigateToAi,
  onDismiss,
  onClearRead
}: Props) {
  const [activeTab, setActiveTab] = useState<TabCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
    } catch {
      return [];
    }
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('moi_notif_sound') !== 'disabled';
    } catch {
      return true;
    }
  });

  // Toggle Sound Setting
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('moi_notif_sound', next ? 'enabled' : 'disabled');
    if (next) {
      playChime();
    }
  };

  // Pleasant notification chime using Web Audio API
  const playChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // AudioContext not allowed or muted
    }
  };

  // Request Browser Push Permission
  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      alert('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนแบบ Push Notifications');
      return;
    }
    if (Notification.permission === 'granted') {
      new Notification('ระบบสารบรรณอิเล็กทรอนิกส์ (e-Saraban)', {
        body: 'การแจ้งเตือนแบบ Push Notification เปิดใช้งานเรียบร้อยแล้ว',
        icon: '/favicon.ico'
      });
      playChime();
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      new Notification('ระบบสารบรรณอิเล็กทรอนิกส์ (e-Saraban)', {
        body: 'เปิดรับการแจ้งเตือนสำเร็จแล้ว! ระบบจะแจ้งเตือนเมื่อมีหนังสือด่วนหรือมอบหมายงานใหม่',
        icon: '/favicon.ico'
      });
      playChime();
    }
  };

  // Dismiss notification single
  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    localStorage.setItem('dismissed_notifications', JSON.stringify(updated));
    if (onDismiss) onDismiss(id);
  };

  // Clear all read notifications
  const handleClearRead = () => {
    const readItemIds = notifications.filter(n => n.read).map(n => n.id);
    const updated = Array.from(new Set([...dismissedIds, ...readItemIds]));
    setDismissedIds(updated);
    localStorage.setItem('dismissed_notifications', JSON.stringify(updated));
    if (onClearRead) onClearRead();
  };

  // Filter Active Notifications
  const activeNotifications = useMemo(() => {
    return notifications.filter(n => !dismissedIds.includes(n.id));
  }, [notifications, dismissedIds]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = activeNotifications.length;
    const unread = activeNotifications.filter(n => !n.read).length;
    const urgent = activeNotifications.filter(n => n.type === 'urgent' || n.priority === 'ด่วนที่สุด' || n.priority === 'ด่วนมาก').length;
    const sla = activeNotifications.filter(n => n.type === 'sla_warning').length;
    const completed = activeNotifications.filter(n => n.type === 'completed' || n.status === 'เสร็จสิ้น').length;

    return { total, unread, urgent, sla, completed };
  }, [activeNotifications]);

  // Filtered List based on Search & Tabs
  const filteredList = useMemo(() => {
    return activeNotifications.filter(item => {
      // 1. Tab category filter
      if (activeTab === 'unread' && item.read) return false;
      if (activeTab === 'urgent' && item.type !== 'urgent' && item.priority !== 'ด่วนที่สุด' && item.priority !== 'ด่วนมาก') return false;
      if (activeTab === 'sla' && item.type !== 'sla_warning') return false;
      if (activeTab === 'workflow' && item.category !== 'workflow' && item.type !== 'status_change') return false;
      if (activeTab === 'assigned') {
        const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
        const isAssigned = item.assignee?.includes(fullName) || item.message?.includes(fullName);
        if (!isAssigned) return false;
      }

      // 2. Department filter
      if (selectedDeptFilter !== 'all' && item.department !== selectedDeptFilter) return false;

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchMsg = item.message?.toLowerCase().includes(q);
        const matchDocNo = item.docNumber?.toLowerCase().includes(q);
        const matchComments = item.comments?.toLowerCase().includes(q);
        const matchUpdater = item.updater?.toLowerCase().includes(q);
        if (!matchTitle && !matchMsg && !matchDocNo && !matchComments && !matchUpdater) return false;
      }

      return true;
    });
  }, [activeNotifications, activeTab, selectedDeptFilter, searchQuery, user]);

  const getNotificationIcon = (type: string, priority?: string) => {
    if (type === 'urgent' || priority === 'ด่วนที่สุด' || priority === 'ด่วนมาก') {
      return (
        <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center shrink-0 shadow-sm">
          <Flame className="w-5 h-5 animate-pulse" />
        </div>
      );
    }
    if (type === 'sla_warning') {
      return (
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-sm">
          <Clock className="w-5 h-5" />
        </div>
      );
    }
    if (type === 'completed') {
      return (
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-sm">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 shadow-sm">
        <FileText className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in pb-12 font-sans text-[var(--text-primary)]">
      
      {/* Header Banner */}
      <div className="bg-[var(--bg-overlay)] backdrop-blur-3xl border border-[var(--border-light)] rounded-3xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-purple-500/10 to-transparent rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20 transition-all duration-700 group-hover:from-indigo-500/20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Bell className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                  ศูนย์การแจ้งเตือนงานสารบรรณ
                </h2>
                {stats.unread > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500 text-white font-bold animate-pulse shadow-sm">
                    {stats.unread} รายการใหม่
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--text-secondary)] font-medium">
                ติดตามความเคลื่อนไหวหนังสือราชการ หนังสือด่วน การมอบหมายงาน และกำหนดเวลา SLA ทันที
              </p>
            </div>
          </div>

          {/* Quick Global Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={toggleSound}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20'
                  : 'bg-[var(--bg-elevated)] border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'เปิดเสียงเตือน' : 'ปิดเสียงเตือน'}</span>
            </button>

            <button
              onClick={requestBrowserPermission}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-light)] hover:border-indigo-500/40 text-xs font-semibold text-[var(--text-secondary)] hover:text-indigo-600 transition-all shadow-sm cursor-pointer"
              title="เปิดการแจ้งเตือนบนเบราว์เซอร์"
            >
              <BellRing className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline">การแจ้งเตือนเบราว์เซอร์</span>
            </button>

            {stats.unread > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-sm shadow-indigo-500/20 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>อ่านทั้งหมดแล้ว</span>
              </button>
            )}

            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-light)] hover:border-indigo-500/40 text-[var(--text-secondary)] hover:text-indigo-600 transition-all shadow-sm cursor-pointer"
              title="รีเฟรชข้อมูลการแจ้งเตือน"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm ring-1 ring-indigo-500/30'
              : 'bg-[var(--bg-overlay)] border-[var(--border-light)] hover:border-[var(--border-medium)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-secondary)]">ทั้งหมด</span>
            <Bell className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold mt-2 text-[var(--text-primary)]">{stats.total}</div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">รายการแจ้งเตือนในระบบ</span>
        </div>

        <div
          onClick={() => setActiveTab('unread')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'unread'
              ? 'bg-red-500/10 border-red-500/40 shadow-sm ring-1 ring-red-500/30'
              : 'bg-[var(--bg-overlay)] border-[var(--border-light)] hover:border-[var(--border-medium)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-600 dark:text-red-400">ยังไม่อ่าน</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          </div>
          <div className="text-2xl font-extrabold mt-2 text-red-600 dark:text-red-400">{stats.unread}</div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">ต้องเปิดดู/ดำเนินการ</span>
        </div>

        <div
          onClick={() => setActiveTab('urgent')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'urgent'
              ? 'bg-rose-500/10 border-rose-500/40 shadow-sm ring-1 ring-rose-500/30'
              : 'bg-[var(--bg-overlay)] border-[var(--border-light)] hover:border-[var(--border-medium)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">ด่วนมาก/ด่วนที่สุด</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold mt-2 text-rose-600 dark:text-rose-400">{stats.urgent}</div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">ความเร่งด่วนสูงสุด</span>
        </div>

        <div
          onClick={() => setActiveTab('sla')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'sla'
              ? 'bg-amber-500/10 border-amber-500/40 shadow-sm ring-1 ring-amber-500/30'
              : 'bg-[var(--bg-overlay)] border-[var(--border-light)] hover:border-[var(--border-medium)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">เตือนเวลา SLA</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold mt-2 text-amber-600 dark:text-amber-400">{stats.sla}</div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">ค้างเกิน 2 วัน</span>
        </div>

        <div
          onClick={() => setActiveTab('workflow')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'workflow'
              ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/30'
              : 'bg-[var(--bg-overlay)] border-[var(--border-light)] hover:border-[var(--border-medium)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">สถานะเสร็จสิ้น</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold mt-2 text-emerald-600 dark:text-emerald-400">{stats.completed}</div>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">ปิดเรื่องเรียบร้อย</span>
        </div>
      </div>

      {/* Control Bar: Search & Filter Tabs */}
      <div className="bg-[var(--bg-overlay)] backdrop-blur-3xl border border-[var(--border-light)] rounded-2xl p-4 space-y-3 shadow-sm">
        
        {/* Top Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตามเลขที่หนังสือ, ชื่อเรื่อง, หมายเหตุ, หรือผู้ดำเนินการ..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
            />
          </div>

          {/* Department Filter Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <Building2 className="w-4 h-4 text-[var(--text-muted)] hidden sm:inline" />
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
            >
              <option value="all">ทุกฝ่ายงาน / กองงาน</option>
              <option value="ฝ่ายยุทธศาสตร์และการจัดการ">ฝ่ายยุทธศาสตร์และการจัดการ</option>
              <option value="ฝ่ายป้องกันและปฏิบัติการ">ฝ่ายป้องกันและปฏิบัติการ</option>
              <option value="ฝ่ายสงเคราะห์ผู้ประสบภัย">ฝ่ายสงเคราะห์ผู้ประสบภัย</option>
            </select>

            {activeNotifications.some(n => n.read) && (
              <button
                onClick={handleClearRead}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors cursor-pointer"
                title="ล้างการแจ้งเตือนที่อ่านแล้วออกจากรายการ"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ล้างที่อ่านแล้ว</span>
              </button>
            )}
          </div>
        </div>

        {/* Grid Navigation Menu */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 border-t border-[var(--border-lighter)] pt-3">
          {[
            { id: 'all', label: 'ทั้งหมด', count: stats.total, icon: Sparkles },
            { id: 'unread', label: 'ยังไม่อ่าน', count: stats.unread, icon: AlertCircle },
            { id: 'urgent', label: 'ด่วนที่สุด/ลับ', count: stats.urgent, icon: Flame },
            { id: 'sla', label: 'เตือนเวลา SLA', count: stats.sla, icon: Clock },
            { id: 'workflow', label: 'เคลื่อนไหว/ส่งต่อ', count: activeNotifications.filter(n => n.category === 'workflow').length, icon: RotateCcw },
            { id: 'assigned', label: 'มอบหมายถึงฉัน', count: activeNotifications.filter(n => n.assignee?.includes(user?.firstName || '')).length, icon: User }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabCategory)}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold'
                    : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-light)] hover:border-[var(--border-medium)]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[var(--primary-color)]'}`} />
                  <span className="text-xs font-semibold tracking-tight truncate">{tab.label}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ml-1 shrink-0 ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-light)]'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Notification List Container */}
      <div className="bg-[var(--bg-overlay)] backdrop-blur-3xl border border-[var(--border-light)] rounded-3xl overflow-hidden shadow-sm">
        {filteredList.length === 0 ? (
          <div className="p-16 text-center text-[var(--text-secondary)] flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-light)] flex items-center justify-center text-[var(--text-muted)]">
              <Bell className="w-8 h-8 opacity-40" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-[var(--text-primary)]">ไม่มีรายการแจ้งเตือนตามเงื่อนไขที่เลือก</h4>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                {searchQuery ? `ไม่พบผลการค้นหาสำหรับ "${searchQuery}"` : 'คุณไม่มีการแจ้งเตือนค้างดำเนินการในหมวดหมู่นี้ในขณะนี้'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-lighter)]">
            {filteredList.map((item) => {
              const realDoc = documents.find(d => d.id === item.docId || d.docNumber === item.docNumber);
              const isUrgent = item.type === 'urgent' || item.priority === 'ด่วนที่สุด' || item.priority === 'ด่วนมาก';
              
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onMarkAsRead(item.id);
                    if (realDoc || item.docId) {
                      onViewDoc(realDoc || item.docId!);
                    }
                  }}
                  className={`p-4 sm:p-5 cursor-pointer transition-all duration-200 group flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                    item.read
                      ? 'hover:bg-[var(--bg-elevated)]'
                      : isUrgent
                      ? 'bg-red-500/5 hover:bg-red-500/10 border-l-4 border-l-red-500'
                      : item.type === 'sla_warning'
                      ? 'bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500'
                      : 'bg-indigo-500/5 hover:bg-indigo-500/10 border-l-4 border-l-indigo-500'
                  }`}
                >
                  {/* Left Side: Icon & Details */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {getNotificationIcon(item.type, item.priority)}

                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Meta Tags Row */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 shadow-[0_0_8px_rgba(79,70,229,0.8)]" />
                        )}
                        {item.docNumber && (
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[11px]">
                            {item.docNumber}
                          </span>
                        )}
                        {item.priority && item.priority !== 'ปกติ' && (
                          <span className="font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[10px] flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            {item.priority}
                          </span>
                        )}
                        {item.department && (
                          <span className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-light)] text-[var(--text-secondary)] text-[10px]">
                            {item.department}
                          </span>
                        )}
                        <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.timeFormatted || item.time}
                        </span>
                      </div>

                      {/* Notification Title & Body */}
                      <h4 className={`text-sm tracking-tight ${item.read ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-primary)] font-bold text-base'}`}>
                        {item.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                        {item.message}
                      </p>

                      {item.updater && (
                        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] pt-0.5">
                          <span>โดย: <strong className="text-[var(--text-primary)]">{item.updater}</strong></span>
                          {item.assignee && (
                            <>
                              <span>•</span>
                              <span>ผู้รับมอบหมาย: <strong className="text-[var(--text-primary)]">{item.assignee}</strong></span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Quick Action Buttons */}
                  <div className="flex items-center gap-1.5 sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-lighter)] justify-end">
                    
                    {/* View Document Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsRead(item.id);
                        if (realDoc || item.docId) {
                          onViewDoc(realDoc || item.docId!);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>เปิดเอกสาร</span>
                    </button>

                    {/* AI Summarize Shortcut */}
                    {onNavigateToAi && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(item.id);
                          onNavigateToAi(`สรุปสาระสำคัญของหนังสือ "${item.docTitle || item.title}" (${item.docNumber || 'หนังสือรับ'})`, realDoc);
                        }}
                        className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-indigo-500/10 border border-[var(--border-light)] hover:border-indigo-500/40 text-xs font-medium text-[var(--text-secondary)] hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
                        title="สั่ง Smart AI สรุปเรื่องนี้"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="hidden md:inline">สรุปด้วย AI</span>
                      </button>
                    )}

                    {/* Dismiss / Delete Single Notification */}
                    <button
                      onClick={(e) => handleDismiss(item.id, e)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                      title="ซ่อนการแจ้งเตือนนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
