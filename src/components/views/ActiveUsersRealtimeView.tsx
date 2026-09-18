import React, { useState, useEffect } from 'react';
import { 
  Users, Activity, Radio, RefreshCw, Search, Filter, X, 
  Globe, Monitor, Smartphone, Tablet, Laptop, Clock, ShieldCheck, 
  Eye, FileText, Send, Briefcase, FileEdit, Image, Files, 
  Bookmark, Database, Settings as SettingsIcon, AlertTriangle, 
  Sparkles, Hash, Layers, CheckCircle2, User as UserIcon, Crown, ArrowRight
} from 'lucide-react';
import { useRealtimeSync } from '../../utils/realtimeSync';

interface ActiveUser {
  userId: string;
  username: string;
  fullName: string;
  position?: string;
  department?: string;
  departmentId?: number;
  role?: string;
  avatar?: string;
  currentView?: string;
  viewTitle?: string;
  activeDetails?: string;
  documentId?: string | number;
  device?: string;
  browser?: string;
  ipAddress?: string;
  status?: string;
  loginTime?: number;
  lastActive: number;
}

interface ActiveUsersRealtimeViewProps {
  onNavigateToLogs?: () => void;
  departments?: any[];
}

export default function ActiveUsersRealtimeView({ onNavigateToLogs, departments = [] }: ActiveUsersRealtimeViewProps) {
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedScreen, setSelectedScreen] = useState<string>('ALL');
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [now, setNow] = useState<number>(Date.now());

  // Update relative time tickers every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchActiveUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/active-users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Error fetching active users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveUsers();
  }, []);

  // SSE Real-time sync listener
  useRealtimeSync(['ACTIVE_USERS_UPDATED', 'ONLINE_USERS_COUNT'], (data) => {
    if (data?.users && Array.isArray(data.users)) {
      setUsers(data.users);
      setLastRefreshed(new Date());
    } else {
      fetchActiveUsers();
    }
  });

  // Auto polling fallback interval (every 5 seconds)
  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(fetchActiveUsers, 5000);
    return () => clearInterval(interval);
  }, [isAutoRefresh]);

  const getViewMeta = (viewKey?: string) => {
    switch (viewKey) {
      case 'overview':
        return { label: 'ภาพรวมระบบ (Overview)', icon: Activity, bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
      case 'inbox':
        return { label: 'ทะเบียนหนังสือรับ (Inbox)', icon: FileText, bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
      case 'outbox':
        return { label: 'ทะเบียนหนังสือส่ง (Outbox)', icon: Send, bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' };
      case 'admin_docs':
        return { label: 'ระบบงานธุรการ (Admin Docs)', icon: Briefcase, bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' };
      case 'draft_docs':
        return { label: 'ร่างเอกสารราชการ (Drafts)', icon: FileEdit, bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
      case 'infographics':
        return { label: 'ออกแบบ Infographics', icon: Image, bg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20' };
      case 'favorites':
        return { label: 'เอกสารสำคัญปักหมุด', icon: Bookmark, bg: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' };
      case 'folders':
        return { label: 'แฟ้มเอกสารดิจิทัล (Folders)', icon: Files, bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' };
      case 'workflow_sla':
        return { label: 'ผังการเดินเอกสาร & SLA', icon: Activity, bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' };
      case 'digital_signatures':
        return { label: 'ศูนย์ลงนามดิจิทัล (ETDA)', icon: ShieldCheck, bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' };
      case 'qr_generator':
        return { label: 'สร้าง QR Code สารบรรณ', icon: Hash, bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' };
      case 'urgent_incidents':
        return { label: 'แบบรายงานเหตุด่วนสาธารณภัย', icon: AlertTriangle, bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
      case 'ai_assistant':
        return { label: 'ผู้ช่วย AI Smart Assistant', icon: Sparkles, bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' };
      case 'user_manual':
        return { label: 'คู่มือการใช้งานระบบ (Manual)', icon: Bookmark, bg: 'bg-blue-600/10 text-blue-700 dark:text-blue-300 border-blue-600/20' };
      case 'logs':
        return { label: 'บันทึกประวัติระบบ (System Logs)', icon: Database, bg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20' };
      case 'settings':
        return { label: 'ตั้งค่าระบบและผู้ดูแล', icon: SettingsIcon, bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' };
      default:
        return { label: viewKey || 'กำลังใช้งานระบบ', icon: Globe, bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' };
    }
  };

  const getDeviceIcon = (device?: string) => {
    if (!device) return <Monitor className="w-4 h-4" />;
    const d = device.toLowerCase();
    if (d.includes('mobile') || d.includes('iphone') || d.includes('android')) {
      return <Smartphone className="w-4 h-4" />;
    }
    if (d.includes('tablet') || d.includes('ipad')) {
      return <Tablet className="w-4 h-4" />;
    }
    if (d.includes('mac') || d.includes('laptop')) {
      return <Laptop className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
            <Crown className="w-3 h-3 text-amber-600" /> แอดมิน (Admin)
          </span>
        );
      case 'moderator':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
            <ShieldCheck className="w-3 h-3 text-blue-600" /> นายทะเบียน (Moderator)
          </span>
        );
      case 'officer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            <Briefcase className="w-3 h-3 text-emerald-600" /> เจ้าหน้าที่ (Officer)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-500/30">
            <UserIcon className="w-3 h-3 text-slate-500" /> ผู้ใช้งาน (User)
          </span>
        );
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const elapsedSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
    if (elapsedSeconds < 5) return 'กำลังใช้งานอยู่ขณะนี้';
    if (elapsedSeconds < 60) return `${elapsedSeconds} วินาทีที่แล้ว`;
    const minutes = Math.floor(elapsedSeconds / 60);
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ชั่วโมงที่แล้ว`;
  };

  const formatLoginTime = (timestamp?: number) => {
    if (!timestamp) return '-';
    const d = new Date(timestamp);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s} น.`;
  };

  // Distinct modules for filter
  const distinctScreens = Array.from(new Set(users.map(u => u.currentView).filter(Boolean)));
  // Distinct departments
  const distinctDepts = Array.from(new Set(users.map(u => u.department).filter(Boolean)));

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchSearch = !searchTerm || 
      (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.position || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.viewTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.activeDetails || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.ipAddress || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchDept = selectedDept === 'ALL' || u.department === selectedDept;
    const matchScreen = selectedScreen === 'ALL' || u.currentView === selectedScreen;

    return matchSearch && matchDept && matchScreen;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold font-mono tracking-widest text-emerald-400 uppercase bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                LIVE REAL-TIME PRESENCE & ACTIVITY TRACKER
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>ติดตามผู้ใช้งานและหน้าจอที่เปิดใช้งานสด</span>
              <span className="text-sm font-normal text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                {users.length} คนออนไลน์
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              แสดงข้อมูลเจ้าหน้าที่ที่กำลังล็อกอินใช้งานระบบในขณะนี้ ตรวจสอบว่าใครกำลังทำงานอยู่หน้าไหน เปิดดูหรือแก้ไขเอกสารอะไร พร้อมบันทึกทุกกิจกรรมลงใน <strong>System Logs</strong> อัตโนมัติ
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                isAutoRefresh
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950/50'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
              title="เปิด/ปิดการดึงข้อมูลสดอัตโนมัติทุก 5 วินาที"
            >
              <span className={`w-2 h-2 rounded-full ${isAutoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{isAutoRefresh ? 'อัปเดตสดอัตโนมัติ (5s)' : 'เปิดอัปเดตอัตโนมัติ'}</span>
            </button>

            <button
              type="button"
              onClick={fetchActiveUsers}
              disabled={isLoading}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>รีเฟรช ({users.length})</span>
            </button>

            {onNavigateToLogs && (
              <button
                type="button"
                onClick={onNavigateToLogs}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-emerald-900/30 cursor-pointer active:scale-95"
              >
                <Database className="w-4 h-4" />
                <span>ดูประวัติใน System Logs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between group hover:border-emerald-500/30 transition-all">
          <div>
            <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">ผู้ใช้ออนไลน์สด</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono tracking-tight group-hover:scale-105 origin-left transition-transform">
              {users.length}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">นับเฉพาะที่ Login แล้ว</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between group hover:border-blue-500/30 transition-all">
          <div>
            <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">หน้าจอที่เปิดใช้งาน</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 font-mono tracking-tight group-hover:scale-105 origin-left transition-transform">
              {distinctScreens.length}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">โมดูลระบบที่กำลังทำงาน</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
            <Monitor className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between group hover:border-purple-500/30 transition-all">
          <div>
            <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">ฝ่ายงานที่ปฏิบัติงาน</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1 font-mono tracking-tight group-hover:scale-105 origin-left transition-transform">
              {distinctDepts.length}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">กลุ่ม/ฝ่ายงาน ปภ. ระยอง</p>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between group hover:border-sky-500/30 transition-all">
          <div>
            <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">สถานะซิงค์ Realtime</p>
            <p className="text-base sm:text-lg font-bold text-sky-600 dark:text-sky-400 mt-1 tracking-tight flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span>SSE เชื่อมต่อสด</span>
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">
              {lastRefreshed.toLocaleTimeString('th-TH')}
            </p>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-2xl shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 sm:p-5 bg-[var(--bg-overlay)] backdrop-blur-xl rounded-2xl border border-[var(--border-light)] shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder="ค้นหาชื่อเจ้าหน้าที่, ตำแหน่ง, หน้าจอ หรือกิจกรรม..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900/50 border border-[var(--border-light)] rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-[var(--text-primary)] transition placeholder:text-[var(--text-muted)]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-rose-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="relative">
            <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900/50 border border-[var(--border-light)] rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500 text-[var(--text-primary)] transition cursor-pointer"
            >
              <option value="ALL">ทุกฝ่ายงาน ({distinctDepts.length} ฝ่ายที่ออนไลน์)</option>
              {distinctDepts.map((d: any) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Module / Screen Filter */}
          <div className="relative">
            <Monitor className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <select
              value={selectedScreen}
              onChange={(e) => setSelectedScreen(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900/50 border border-[var(--border-light)] rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500 text-[var(--text-primary)] transition cursor-pointer"
            >
              <option value="ALL">ทุกหน้าจอ/เมนู ({distinctScreens.length} หน้า)</option>
              {distinctScreens.map((s: any) => {
                const meta = getViewMeta(s);
                return (
                  <option key={s} value={s}>{meta.label}</option>
                );
              })}
            </select>
          </div>
        </div>

        {(searchTerm || selectedDept !== 'ALL' || selectedScreen !== 'ALL') && (
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-light)] text-xs">
            <span className="text-[var(--text-muted)]">
              พบ {filteredUsers.length} จาก {users.length} ผู้ใช้งานออนไลน์
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedDept('ALL');
                setSelectedScreen('ALL');
              }}
              className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* Active Users List Cards */}
      {filteredUsers.length === 0 ? (
        <div className="p-12 text-center bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-3xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center animate-pulse">
            <Radio className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-base font-bold text-[var(--text-primary)]">
              {users.length === 0 ? 'ยังไม่มีผู้ใช้งานเข้าสู่ระบบในขณะนี้' : 'ไม่พบผู้ใช้งานตามเงื่อนไขที่ค้นหา'}
            </h4>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
              {users.length === 0 
                ? 'ระบบจะแสดงรายการเจ้าหน้าที่แบบ Real-time ทันทีที่มีการเข้าสู่ระบบและเริ่มใช้งานหน้าจอต่าง ๆ'
                : 'ลองปรับเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองฝ่ายงานและหน้าจอ'}
            </p>
          </div>
          {users.length > 0 && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setSelectedDept('ALL'); setSelectedScreen('ALL'); }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              แสดงผู้ใช้ออนไลน์ทั้งหมด ({users.length})
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const viewMeta = getViewMeta(user.currentView);
            const ViewIcon = viewMeta.icon;
            const isIdle = user.status === 'idle';

            return (
              <div 
                key={user.userId || user.username}
                className="bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] hover:border-emerald-500/40 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_35px_rgb(0,0,0,0.08)] transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Top Active Indicator Bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${isIdle ? 'bg-amber-400' : 'bg-emerald-500'}`} />

                <div className="space-y-4">
                  {/* User Profile Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.fullName || user.username} 
                            className="w-12 h-12 rounded-2xl object-cover border border-[var(--border-light)] shadow-xs"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                            {(user.fullName || user.username || 'U').substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className={`absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                          isIdle ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}>
                          {!isIdle && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--text-primary)] truncate flex items-center gap-1.5">
                          <span>{user.fullName || user.username}</span>
                        </h4>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono truncate">
                          @{user.username}
                        </p>
                        <div className="mt-1">
                          {getRoleBadge(user.role)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isIdle 
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isIdle ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse'}`} />
                        {isIdle ? 'พักหน้าจอ' : 'ออนไลน์สด'}
                      </span>
                    </div>
                  </div>

                  {/* Department & Position */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-[var(--border-light)] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[var(--text-secondary)]">
                      <span className="text-[11px] text-[var(--text-muted)]">ฝ่ายงาน:</span>
                      <span className="font-semibold text-[var(--text-primary)] truncate ml-2">
                        {user.department || 'ไม่ระบุสังกัดฝ่าย'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[var(--text-secondary)]">
                      <span className="text-[11px] text-[var(--text-muted)]">ตำแหน่ง:</span>
                      <span className="font-medium text-[var(--text-secondary)] truncate ml-2">
                        {user.position || 'เจ้าหน้าที่'}
                      </span>
                    </div>
                  </div>

                  {/* Active Page / Screen & Live Activity */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                        <Eye className="w-3 h-3 text-emerald-500" />
                        หน้าจอที่เปิดใช้งานอยู่
                      </span>
                    </div>

                    <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${viewMeta.bg}`}>
                      <ViewIcon className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">
                          {user.viewTitle || viewMeta.label}
                        </p>
                        <p className="text-[10px] opacity-80 truncate font-mono">
                          โมดูล: {user.currentView || 'overview'}
                        </p>
                      </div>
                    </div>

                    {user.activeDetails && (
                      <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-500/20 text-xs">
                        <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium leading-snug">
                          <strong>กิจกรรมสด:</strong> {user.activeDetails}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Metadata: Device, IP, Timestamps */}
                <div className="mt-4 pt-3 border-t border-[var(--border-light)] text-[11px] text-[var(--text-muted)] space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      {getDeviceIcon(user.device)}
                      <span className="truncate">{user.browser || 'Web Browser'}</span>
                      {user.ipAddress && (
                        <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                          {user.ipAddress}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(user.lastActive)}</span>
                    </div>
                  </div>

                  {user.loginTime && (
                    <div className="text-[10px] text-[var(--text-muted)] text-right">
                      เข้าสู่ระบบเมื่อ: {formatLoginTime(user.loginTime)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
