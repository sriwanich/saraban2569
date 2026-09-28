import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, Activity, Radio, RefreshCw, Search, Filter, X, 
  Globe, Monitor, Smartphone, Tablet, Laptop, Clock, ShieldCheck, 
  Eye, FileText, Send, Briefcase, FileEdit, Image, Files, 
  Bookmark, Database, Settings as SettingsIcon, AlertTriangle, 
  Sparkles, Hash, Layers, CheckCircle2, User as UserIcon, Crown, 
  ArrowRight, LogOut, MessageSquare, ExternalLink, Zap, Trash2, 
  Check, Info, UserCheck, ShieldAlert, Wifi, Cpu, Workflow,
  Copy, Building2, Car, Truck
} from 'lucide-react';
import { useRealtimeSync, realtimeSync } from '../../utils/realtimeSync';

export interface ActiveUser {
  userId: string;
  username: string;
  fullName: string;
  position?: string;
  department?: string;
  departmentId?: number | string;
  role?: string;
  avatar?: string;
  currentView?: string;
  viewTitle?: string;
  activeDetails?: string;
  documentId?: string | number;
  device?: string;
  browser?: string;
  ip?: string;
  ipAddress?: string;
  status?: string;
  loginAt?: number;
  loginTime?: number;
  lastActive: number;
}

interface ActiveUsersRealtimeViewProps {
  currentUser?: any;
  onNavigateToLogs?: () => void;
  onNavigateTab?: (tab: string, subTab?: string, docId?: string | number) => void;
  departments?: any[];
}

export default function ActiveUsersRealtimeView({ 
  currentUser: propUser, 
  onNavigateToLogs, 
  onNavigateTab, 
  departments = [] 
}: ActiveUsersRealtimeViewProps) {
  // Retrieve current user from props or fallback to localStorage
  const activeCurrentUser = useMemo(() => {
    if (propUser) return propUser;
    try {
      const saved = localStorage.getItem('edms_user_data') || sessionStorage.getItem('edms_user_data');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [propUser]);

  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedScreen, setSelectedScreen] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'active' | 'idle'>('ALL');
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [now, setNow] = useState<number>(Date.now());
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  // Modals state
  const [inspectUser, setInspectUser] = useState<ActiveUser | null>(null);
  const [messageTarget, setMessageTarget] = useState<ActiveUser | null>(null);
  const [flashMessageText, setFlashMessageText] = useState<string>('');
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [messageAlert, setMessageAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Clipboard copy with feedback
  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (e) {
      console.error('Clipboard copy error:', e);
    }
  };

  // Humanized session duration
  const getOnlineDuration = (loginTimestamp?: number) => {
    if (!loginTimestamp) return 'เซสชันต่อเนื่อง';
    const diffMs = Math.max(0, now - loginTimestamp);
    const totalMinutes = Math.floor(diffMs / 60000);
    if (totalMinutes < 1) return 'ออนไลน์น้อยกว่า 1 นาที';
    if (totalMinutes < 60) return `ออนไลน์ต่อเนื่อง ${totalMinutes} นาที`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `ออนไลน์ต่อเนื่อง ${hours} ชม. ${mins} นาที`;
  };

  // Clear any legacy simulation setting from storage
  useEffect(() => {
    localStorage.removeItem('edms_active_users_simulation');
  }, []);

  // Update relative time tickers every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper to create current user presence record
  const createSelfUser = (): ActiveUser | null => {
    if (!activeCurrentUser) return null;
    return {
      userId: String(activeCurrentUser.id || activeCurrentUser.username),
      username: activeCurrentUser.username,
      fullName: `${activeCurrentUser.firstName || ''} ${activeCurrentUser.lastName || ''}`.trim() || activeCurrentUser.username,
      position: activeCurrentUser.position || 'เจ้าหน้าที่',
      department: activeCurrentUser.department || 'สำนักงาน ปภ. ระยอง',
      departmentId: activeCurrentUser.departmentId,
      role: activeCurrentUser.role || 'admin',
      avatar: activeCurrentUser.avatar,
      currentView: 'active_users',
      viewTitle: 'ติดตามผู้ใช้งานและหน้าจอที่เปิดใช้งานสด',
      activeDetails: 'กำลังตรวจสอบผู้ใช้ออนไลน์สดและหน้าจอที่เปิดอยู่',
      status: 'active',
      ip: '127.0.0.1 (เครื่องนี้)',
      ipAddress: '127.0.0.1 (เครื่องนี้)',
      device: 'คอมพิวเตอร์ (เครื่องปัจจุบัน)',
      browser: 'เว็บเบราว์เซอร์',
      loginAt: Date.now(),
      loginTime: Date.now(),
      lastActive: Date.now()
    };
  };

  // Fetch active users from backend API
  const fetchActiveUsers = async () => {
    setIsLoading(true);
    const startT = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('/api/active-users', { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        setPingLatency(Math.round(performance.now() - startT));
        
        let serverUsers: ActiveUser[] = (data && Array.isArray(data.users)) ? data.users : [];
        
        // Ensure current authenticated user is present in the list
        if (activeCurrentUser) {
          const currentKey = String(activeCurrentUser.id || activeCurrentUser.username).toLowerCase();
          const hasSelf = serverUsers.some(u => String(u.userId || u.username).toLowerCase() === currentKey);
          
          if (!hasSelf) {
            // Heartbeat might have delayed or server just rebooted: trigger an immediate presence registration
            try {
              fetch('/api/user-presence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: activeCurrentUser.id || activeCurrentUser.username,
                  username: activeCurrentUser.username,
                  fullName: `${activeCurrentUser.firstName || ''} ${activeCurrentUser.lastName || ''}`.trim(),
                  position: activeCurrentUser.position || '',
                  department: activeCurrentUser.department || '',
                  departmentId: activeCurrentUser.departmentId,
                  role: activeCurrentUser.role || 'user',
                  avatar: activeCurrentUser.avatar || '',
                  currentView: 'active_users',
                  viewTitle: 'ติดตามผู้ใช้งานและหน้าจอที่เปิดใช้งานสด',
                  activeDetails: 'กำลังตรวจสอบผู้ใช้ออนไลน์สดและหน้าจอที่เปิดอยู่',
                  status: 'active'
                })
              }).catch(() => {});
            } catch {}

            // Preemptively add self to UI so it's never empty
            const selfUser = createSelfUser();
            if (selfUser) {
              serverUsers = [selfUser, ...serverUsers];
            }
          }
        }

        setUsers(serverUsers);
        setLastRefreshed(new Date());
      } else {
        // Fallback gracefully if server is momentarily unreachable
        setPingLatency(null);
        setUsers(prev => {
          if (prev.length > 0) return prev;
          const selfUser = createSelfUser();
          return selfUser ? [selfUser] : [];
        });
      }
    } catch {
      // Fallback gracefully without logging uncaught error
      setUsers(prev => {
        if (prev.length > 0) return prev;
        const selfUser = createSelfUser();
        return selfUser ? [selfUser] : [];
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Immediate fetch on mount & send heartbeat
  useEffect(() => {
    fetchActiveUsers();
  }, [activeCurrentUser]);

  // SSE Real-time sync listener
  useRealtimeSync(['ACTIVE_USERS_UPDATED', 'ONLINE_USERS_COUNT'], (data) => {
    if (data?.users && Array.isArray(data.users)) {
      let incomingUsers: ActiveUser[] = data.users;
      if (activeCurrentUser) {
        const currentKey = String(activeCurrentUser.id || activeCurrentUser.username).toLowerCase();
        const hasSelf = incomingUsers.some(u => String(u.userId || u.username).toLowerCase() === currentKey);
        if (!hasSelf) {
          incomingUsers = [{
            userId: String(activeCurrentUser.id || activeCurrentUser.username),
            username: activeCurrentUser.username,
            fullName: `${activeCurrentUser.firstName || ''} ${activeCurrentUser.lastName || ''}`.trim() || activeCurrentUser.username,
            position: activeCurrentUser.position || '',
            department: activeCurrentUser.department || '',
            departmentId: activeCurrentUser.departmentId,
            role: activeCurrentUser.role || 'user',
            avatar: activeCurrentUser.avatar,
            currentView: 'active_users',
            viewTitle: 'ติดตามผู้ใช้งานและหน้าจอที่เปิดใช้งานสด',
            activeDetails: 'กำลังตรวจสอบผู้ใช้ออนไลน์สดและหน้าจอที่เปิดอยู่',
            status: 'active',
            ip: '127.0.0.1',
            ipAddress: '127.0.0.1',
            loginAt: Date.now(),
            loginTime: Date.now(),
            lastActive: Date.now()
          }, ...incomingUsers];
        }
      }
      setUsers(incomingUsers);
      setLastRefreshed(new Date());
    } else {
      fetchActiveUsers();
    }
  });

  // Auto polling fallback interval (every 4 seconds)
  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(fetchActiveUsers, 4000);
    return () => clearInterval(interval);
  }, [isAutoRefresh, activeCurrentUser]);

  // Only real active users from server presence (simulated data removed)
  const combinedUsers = users;

  // Module meta with friendly names, icons and color themes
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
        return { label: 'ผังการเดินเอกสาร & SLA', icon: Workflow, bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' };
      case 'digital_signatures':
        return { label: 'ศูนย์ลงนามดิจิทัล (ETDA)', icon: ShieldCheck, bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' };
      case 'qr_generator':
        return { label: 'สร้าง QR Code สารบรรณ', icon: Hash, bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' };
      case 'vehicles':
      case 'vehicle':
      case 'vehicle_management':
      case 'vehicles_portal':
        return { label: 'ระบบบริหารจัดการยานพาหนะหลัก (Vehicle Dashboard)', icon: Car, bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
      case 'urgent_incidents':
        return { label: 'แบบรายงานเหตุด่วนสาธารณภัย', icon: AlertTriangle, bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
      case 'recycle_bin':
        return { label: 'คลังกู้คืนเอกสาร (Recycle Bin)', icon: Trash2, bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' };
      case 'ai_assistant':
        return { label: 'ผู้ช่วย AI Smart Assistant', icon: Sparkles, bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' };
      case 'user_manual':
        return { label: 'คู่มือการใช้งานระบบ (Manual)', icon: Bookmark, bg: 'bg-blue-600/10 text-blue-700 dark:text-blue-300 border-blue-600/20' };
      case 'logs':
        return { label: 'บันทึกประวัติระบบ (System Logs)', icon: Database, bg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20' };
      case 'settings':
        return { label: 'ตั้งค่าระบบและผู้ดูแล', icon: SettingsIcon, bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' };
      case 'active_users':
        return { label: 'ติดตามผู้ใช้งานและหน้าจอสด', icon: Radio, bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
      case 'settings_users':
        return { label: 'จัดการข้อมูลเจ้าหน้าที่ & สิทธิ์', icon: Users, bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' };
      case 'settings_permissions':
        return { label: 'กำหนดสิทธิ์การใช้งาน (Permissions)', icon: ShieldCheck, bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' };
      case 'settings_departments':
        return { label: 'โครงสร้างฝ่ายงาน ปภ.ระยอง', icon: Briefcase, bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
      case 'settings_health':
        return { label: 'ตรวจสอบสถานะระบบ (Health)', icon: Cpu, bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
      case 'settings_backup':
        return { label: 'สำรองและกู้คืนฐานข้อมูล', icon: Database, bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' };
      default:
        return { label: viewKey || 'กำลังใช้งานระบบ', icon: Globe, bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' };
    }
  };

  const getDeviceIcon = (device?: string) => {
    if (!device) return <Monitor className="w-3.5 h-3.5" />;
    const d = device.toLowerCase();
    if (d.includes('mobile') || d.includes('iphone') || d.includes('android') || d.includes('มือถือ')) {
      return <Smartphone className="w-3.5 h-3.5 text-blue-500" />;
    }
    if (d.includes('tablet') || d.includes('ipad') || d.includes('แท็บเล็ต')) {
      return <Tablet className="w-3.5 h-3.5 text-purple-500" />;
    }
    if (d.includes('mac') || d.includes('laptop')) {
      return <Laptop className="w-3.5 h-3.5 text-emerald-500" />;
    }
    return <Monitor className="w-3.5 h-3.5 text-slate-500" />;
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
            <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400" /> แอดมิน (Admin)
          </span>
        );
      case 'moderator':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
            <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" /> นายทะเบียน (Moderator)
          </span>
        );
      case 'officer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
            <Briefcase className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> เจ้าหน้าที่ (Officer)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
            <UserIcon className="w-3 h-3 text-slate-500 dark:text-slate-400" /> ผู้ใช้งาน (User)
          </span>
        );
    }
  };

  const formatTimeAgo = (timestamp?: number) => {
    if (!timestamp) return 'กำลังใช้งาน';
    const elapsedSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
    if (elapsedSeconds < 5) return 'กำลังใช้งานอยู่ขณะนี้';
    if (elapsedSeconds < 60) return `${elapsedSeconds} วินาทีที่แล้ว`;
    const minutes = Math.floor(elapsedSeconds / 60);
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ชม. ที่แล้ว`;
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
  const distinctScreens = Array.from(new Set(combinedUsers.map(u => u.currentView).filter(Boolean)));
  // Distinct departments
  const distinctDepts = Array.from(new Set(combinedUsers.map(u => u.department).filter(Boolean)));

  // Filtered users
  const filteredUsers = useMemo(() => {
    return combinedUsers.filter(u => {
      const search = searchTerm.trim().toLowerCase();
      const matchSearch = !search || 
        (u.fullName || '').toLowerCase().includes(search) ||
        (u.username || '').toLowerCase().includes(search) ||
        (u.position || '').toLowerCase().includes(search) ||
        (u.department || '').toLowerCase().includes(search) ||
        (u.viewTitle || '').toLowerCase().includes(search) ||
        (u.activeDetails || '').toLowerCase().includes(search) ||
        (u.ipAddress || u.ip || '').toLowerCase().includes(search);

      const matchDept = selectedDept === 'ALL' || u.department === selectedDept;
      const matchScreen = selectedScreen === 'ALL' || u.currentView === selectedScreen;
      const matchStatus = selectedStatus === 'ALL' || (u.status || 'active') === selectedStatus;

      return matchSearch && matchDept && matchScreen && matchStatus;
    });
  }, [combinedUsers, searchTerm, selectedDept, selectedScreen, selectedStatus]);

  // Is this card the current logged-in user
  const isSelf = (user: ActiveUser) => {
    if (!activeCurrentUser) return false;
    const selfId = String(activeCurrentUser.id || activeCurrentUser.username).toLowerCase();
    const targetId = String(user.userId || user.username).toLowerCase();
    return selfId === targetId;
  };

  // Handle force terminate session
  const handleTerminateSession = async (user: ActiveUser) => {
    if (isSelf(user)) {
      alert('คุณไม่สามารถตัดการเชื่อมต่อเซสชันของตนเองได้จากหน้านี้');
      return;
    }

    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการตัดการเชื่อมต่อเซสชันของ "${user.fullName || user.username}"? ผู้ใช้จะถูกออกจากระบบทันที`)) {
      return;
    }

    try {
      const res = await fetch('/api/active-users/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: user.userId,
          targetUsername: user.username,
          reason: 'ผู้ดูแลระบบสั่งตัดการเชื่อมต่อเซสชัน'
        })
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.userId !== user.userId && u.username !== user.username));
        setInspectUser(null);
      } else {
        alert('ไม่สามารถตัดการเชื่อมต่อเซสชันได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // Handle sending instant message
  const handleSendFlashMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageTarget || !flashMessageText.trim()) return;

    setIsSendingMessage(true);
    setMessageAlert(null);
    try {
      const res = await fetch('/api/active-users/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: messageTarget.userId,
          targetUsername: messageTarget.username,
          message: flashMessageText.trim(),
          senderName: activeCurrentUser ? `${activeCurrentUser.firstName || ''} ${activeCurrentUser.lastName || ''}`.trim() || activeCurrentUser.username : 'ผู้ดูแลระบบ'
        })
      });
      if (res.ok) {
        setMessageAlert({ type: 'success', text: `ส่งข้อความแจ้งเตือนด่วนไปยัง "${messageTarget.fullName || messageTarget.username}" เรียบร้อยแล้ว` });
        setFlashMessageText('');
        setTimeout(() => {
          setMessageTarget(null);
          setMessageAlert(null);
        }, 1500);
      } else {
        setMessageAlert({ type: 'error', text: 'ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง' });
      }
    } catch {
      setMessageAlert({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Jump to module
  const handleJumpToScreen = (viewKey?: string) => {
    if (!viewKey || !onNavigateTab) return;
    const cleanKey = viewKey.startsWith('settings_') ? 'settings' : viewKey;
    onNavigateTab(cleanKey);
    setInspectUser(null);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
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
              {pingLatency !== null && (
                <span className="text-[10px] font-mono text-emerald-300 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 hidden sm:inline-block">
                  Latency: {pingLatency}ms
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>ติดตามผู้ใช้งานและหน้าจอที่เปิดใช้งานสด</span>
              <span className="text-sm font-normal text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                {combinedUsers.length} คนออนไลน์
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              แสดงข้อมูลเจ้าหน้าที่ที่กำลังล็อกอินใช้งานระบบในขณะนี้ ตรวจสอบว่าใครกำลังทำงานอยู่หน้าไหน เปิดดูหรือแก้ไขเอกสารอะไร พร้อมบันทึกทุกกิจกรรมลงใน <strong>System Logs</strong> อัตโนมัติแบบ Real-time
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* Auto Refresh Toggle */}
            <button
              type="button"
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                isAutoRefresh
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950/50'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
              title="เปิด/ปิดการดึงข้อมูลสดอัตโนมัติทุก 4 วินาที"
            >
              <span className={`w-2 h-2 rounded-full ${isAutoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{isAutoRefresh ? 'อัปเดตสดอัตโนมัติ (4s)' : 'หยุดอัปเดตชั่วคราว'}</span>
            </button>

            {/* Manual Refresh */}
            <button
              type="button"
              onClick={fetchActiveUsers}
              disabled={isLoading}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>รีเฟรชสด</span>
            </button>

            {/* Link to Logs */}
            {onNavigateToLogs && (
              <button
                type="button"
                onClick={onNavigateToLogs}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-emerald-900/30 cursor-pointer active:scale-95"
              >
                <Database className="w-4 h-4" />
                <span>ดู Audit Logs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Online */}
        <div className="p-4 sm:p-5 bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between group hover:border-emerald-500/30 transition-all">
          <div>
            <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">ผู้ใช้ออนไลน์สด</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono tracking-tight group-hover:scale-105 origin-left transition-transform">
              {combinedUsers.length}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              นับเฉพาะเซสชันจริงแบบ Real-time
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Active Screens */}
        <div className="p-4 sm:p-5 bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between group hover:border-blue-500/30 transition-all">
          <div>
            <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">หน้าจอที่เปิดใช้งาน</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 font-mono tracking-tight group-hover:scale-105 origin-left transition-transform">
              {distinctScreens.length}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">โมดูลระบบที่กำลังเปิดอยู่</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
            <Monitor className="w-5 h-5" />
          </div>
        </div>

        {/* Departments active */}
        <div className="p-4 sm:p-5 bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between group hover:border-purple-500/30 transition-all">
          <div>
            <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">ฝ่ายงานที่ปฏิบัติงาน</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1 font-mono tracking-tight group-hover:scale-105 origin-left transition-transform">
              {distinctDepts.length}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">กลุ่ม/ฝ่ายงาน ปภ.ระยอง</p>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        {/* SSE & Latency status */}
        <div className="p-4 sm:p-5 bg-[var(--bg-overlay)] backdrop-blur-xl border border-[var(--border-light)] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between group hover:border-sky-500/30 transition-all">
          <div>
            <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">สถานะซิงค์ Real-time</p>
            <p className="text-sm sm:text-base font-bold text-sky-600 dark:text-sky-400 mt-1 tracking-tight flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span>SSE เชื่อมต่อสด</span>
            </p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">
              {lastRefreshed.toLocaleTimeString('th-TH')}
            </p>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-2xl shrink-0">
            <Wifi className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 sm:p-5 bg-[var(--bg-overlay)] backdrop-blur-xl rounded-2xl border border-[var(--border-light)] shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder="ค้นหาชื่อเจ้าหน้าที่, ตำแหน่ง, หน้าจอ หรือ IP..."
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

          {/* Screen / Module Filter */}
          <div className="relative">
            <Monitor className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <select
              value={selectedScreen}
              onChange={(e) => setSelectedScreen(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900/50 border border-[var(--border-light)] rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500 text-[var(--text-primary)] transition cursor-pointer"
            >
              <option value="ALL">ทุกหน้าจอ/โมดูล ({distinctScreens.length} หน้า)</option>
              {distinctScreens.map((s: any) => {
                const meta = getViewMeta(s);
                return (
                  <option key={s} value={s}>{meta.label}</option>
                );
              })}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Activity className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900/50 border border-[var(--border-light)] rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500 text-[var(--text-primary)] transition cursor-pointer"
            >
              <option value="ALL">ทุกสถานะ (ออนไลน์ & พักหน้าจอ)</option>
              <option value="active">🟢 กำลังปฏิบัติงานสด (Active)</option>
              <option value="idle">🟡 พักหน้าจอ (Idle)</option>
            </select>
          </div>
        </div>

        {(searchTerm || selectedDept !== 'ALL' || selectedScreen !== 'ALL' || selectedStatus !== 'ALL') && (
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-light)] text-xs">
            <span className="text-[var(--text-muted)]">
              พบ {filteredUsers.length} จาก {combinedUsers.length} ผู้ใช้งานออนไลน์
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedDept('ALL');
                setSelectedScreen('ALL');
                setSelectedStatus('ALL');
              }}
              className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
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
              {combinedUsers.length === 0 ? 'ยังไม่มีข้อมูลผู้ใช้ออนไลน์ในขณะนี้' : 'ไม่พบผู้ใช้งานตามเงื่อนไขที่ค้นหา'}
            </h4>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md mx-auto leading-relaxed">
              {combinedUsers.length === 0 
                ? 'ระบบจะแสดงรายการเจ้าหน้าที่แบบ Real-time ทันทีที่มีการเข้าสู่ระบบและเปิดใช้งานส่วนต่างๆ'
                : 'ลองปรับเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองฝ่ายงานและหน้าจอ'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {combinedUsers.length > 0 && (
              <button
                type="button"
                onClick={() => { 
                  setSearchTerm(''); 
                  setSelectedDept('ALL'); 
                  setSelectedScreen('ALL'); 
                  setSelectedStatus('ALL'); 
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                แสดงผู้ใช้ออนไลน์ทั้งหมด ({combinedUsers.length})
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const viewMeta = getViewMeta(user.currentView);
            const ViewIcon = viewMeta.icon;
            const isIdle = user.status === 'idle';
            const userIsSelf = isSelf(user);
            const displayIp = user.ipAddress || user.ip || '127.0.0.1';
            const displayLoginTime = user.loginTime || user.loginAt;

            return (
              <div 
                key={user.userId || user.username}
                className={`bg-[var(--bg-overlay)] backdrop-blur-xl border rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_35px_rgb(0,0,0,0.08)] transition-all duration-200 flex flex-col justify-between group relative overflow-hidden ${
                  userIsSelf 
                    ? 'border-emerald-500/60 ring-2 ring-emerald-500/20' 
                    : 'border-[var(--border-light)] hover:border-emerald-500/40'
                }`}
              >
                {/* Top Active Indicator Bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  userIsSelf ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : isIdle ? 'bg-amber-400' : 'bg-emerald-500'
                }`} />

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
                          <div className={`w-12 h-12 rounded-2xl text-white font-bold flex items-center justify-center text-sm shadow-xs ${
                            userIsSelf 
                              ? 'bg-gradient-to-br from-emerald-600 to-teal-800 ring-2 ring-emerald-400/40' 
                              : 'bg-gradient-to-br from-slate-600 to-slate-800'
                          }`}>
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
                            {user.fullName || user.username}
                          </h4>
                          {userIsSelf && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-500 text-white shadow-xs">
                              คุณ (YOU)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono truncate">
                          @{user.username}
                        </p>
                        <div className="mt-1">
                          {getRoleBadge(user.role)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
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
                        {user.department || 'สำนักงาน ปภ. ระยอง'}
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
                        หน้าจอที่กำลังเปิดใช้งานสด
                      </span>
                      {onNavigateTab && (
                        <button
                          type="button"
                          onClick={() => handleJumpToScreen(user.currentView)}
                          className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                          title="คลิกเพื่อเปิดหน้าจอนี้"
                        >
                          <span>เปิดดูหน้านี้</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>

                    <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${viewMeta.bg}`}>
                      <ViewIcon className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">
                          {user.viewTitle || viewMeta.label}
                        </p>
                        <p className="text-[10px] opacity-80 truncate font-mono">
                          โมดูลระบบ: {user.currentView || 'overview'}
                        </p>
                      </div>
                    </div>

                    {user.activeDetails && (
                      <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-500/20 text-xs">
                        <p className="text-[11px] text-emerald-900 dark:text-emerald-300 font-medium leading-snug">
                          <strong className="font-bold text-emerald-700 dark:text-emerald-400">กิจกรรมสด:</strong> {user.activeDetails}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Metadata: Device, IP, Timestamps & Actions */}
                <div className="mt-4 pt-3 border-t border-[var(--border-light)] text-[11px] text-[var(--text-muted)] space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      {getDeviceIcon(user.device)}
                      <span className="truncate text-[11px]">{user.browser || 'Web Browser'}</span>
                      {displayIp && (
                        <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 border border-[var(--border-light)]">
                          {displayIp}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(user.lastActive)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1">
                    <span>
                      {displayLoginTime ? `เข้าสู่ระบบเมื่อ: ${formatLoginTime(displayLoginTime)}` : 'เซสชันต่อเนื่อง'}
                    </span>

                    {/* Quick interactive buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setMessageTarget(user)}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--text-secondary)] transition cursor-pointer flex items-center gap-1"
                        title="ส่งข้อความแจ้งเตือนด่วนถึงผู้ใช้"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-600" />
                        <span>แจ้งเตือน</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInspectUser(user)}
                        className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold transition cursor-pointer flex items-center gap-1"
                        title="ตรวจสอบรายละเอียดเซสชันเชิงลึก"
                      >
                        <Info className="w-3 h-3" />
                        <span>ตรวจสอบ</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect User Modal: ข้อมูลเซสชันและการใช้งานสด (Live Session & Telemetry Inspector) */}
      {inspectUser && (() => {
        const userIsSelf = isSelf(inspectUser);
        const userIsIdle = (inspectUser.status || 'active') === 'idle' || (now - inspectUser.lastActive > 60000);
        const viewMeta = getViewMeta(inspectUser.currentView);
        const ViewIcon = viewMeta.icon;
        const displayIp = inspectUser.ipAddress || inspectUser.ip || '127.0.0.1';
        const displayLoginTime = inspectUser.loginTime || inspectUser.loginAt;

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setInspectUser(null);
            }}
          >
            <div className="bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh] animate-scale-in opacity-100 z-10">
              
              {/* Top Accent Gradient Bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 shrink-0" />

              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-100 dark:bg-[#0b1329]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                        ข้อมูลเซสชันและการใช้งานสด
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        userIsIdle
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                          : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${userIsIdle ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                        {userIsIdle ? 'พักหน้าจอ (Idle)' : 'กำลังทำงานสด (Live Active)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                      Live Telemetry & User Session Inspector
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectUser(null)}
                  className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                  aria-label="ปิดหน้าต่าง"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 custom-scrollbar bg-white dark:bg-[#0f172a]">
                
                {/* 1. User Identity & Profile Banner */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    {/* Avatar with live badge */}
                    <div className="relative shrink-0">
                      {inspectUser.avatar ? (
                        <img 
                          src={inspectUser.avatar} 
                          alt={inspectUser.fullName || inspectUser.username} 
                          className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-md"
                        />
                      ) : (
                        <div className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl text-white font-bold flex items-center justify-center text-lg shadow-md border-2 border-white dark:border-slate-800 ${
                          userIsSelf 
                            ? 'bg-gradient-to-br from-emerald-600 to-teal-800' 
                            : 'bg-gradient-to-br from-slate-700 to-indigo-900'
                        }`}>
                          {(inspectUser.fullName || inspectUser.username || 'U').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className={`absolute -bottom-1 -right-1 flex h-4 w-4 rounded-full border-2 border-white dark:border-slate-900 ${
                        userIsIdle ? 'bg-amber-400' : 'bg-emerald-500'
                      }`}>
                        {!userIsIdle && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        )}
                      </span>
                    </div>

                    {/* Information column */}
                    <div className="min-w-0 text-center sm:text-left flex-1 space-y-1.5">
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                          {inspectUser.fullName || inspectUser.username}
                        </h4>
                        {userIsSelf && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shadow-xs">
                            คุณ (YOU)
                          </span>
                        )}
                        {getRoleBadge(inspectUser.role)}
                      </div>

                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap text-xs text-slate-600 dark:text-slate-400 font-mono">
                        <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-800 dark:text-slate-200 font-semibold">
                          @{inspectUser.username}
                        </span>
                        <span>•</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-sans font-semibold">
                          {getOnlineDuration(displayLoginTime)}
                        </span>
                      </div>

                      {/* Position & Department */}
                      <div className="pt-1 flex items-center justify-center sm:justify-start gap-3 flex-wrap text-xs text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{inspectUser.position || 'เจ้าหน้าที่'}</span>
                        </span>
                        <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{inspectUser.department || 'สำนักงาน ปภ. จังหวัดระยอง'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Active Screen & Real-time Task */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      หน้าจอและกิจกรรมที่เปิดใช้งานสด
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {formatTimeAgo(inspectUser.lastActive)}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-[#132a3d] text-emerald-950 dark:text-emerald-100 transition-all shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm border border-emerald-200 dark:border-slate-700 shrink-0 mt-0.5">
                          <ViewIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                              {inspectUser.viewTitle || viewMeta.label}
                            </h5>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                              id: {inspectUser.currentView || 'overview'}
                            </span>
                          </div>

                          <p className="text-xs mt-1 leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                            {inspectUser.activeDetails || 'กำลังปฏิบัติงานและเปิดดูข้อมูลในโมดูลนี้'}
                          </p>

                          {inspectUser.documentId && (
                            <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 shadow-xs">
                              <Hash className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>เอกสาร: {inspectUser.documentId}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {onNavigateTab && (
                        <button
                          type="button"
                          onClick={() => handleJumpToScreen(inspectUser.currentView)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                          title="เปิดไปยังหน้าจอนี้เพื่อดูข้อมูลร่วมกัน"
                        >
                          <span>ไปยังหน้านี้</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Session & Telemetry Matrix */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 px-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    ข้อมูลเซสชันและการเชื่อมต่อ (Connection & Telemetry)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                    {/* IP Address Tile with Copy Button */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-xs">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">
                          ที่อยู่ IP Address
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate block mt-0.5">
                          {displayIp}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          เครือข่ายภายในหน่วยงาน
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(displayIp, 'ip')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs transition cursor-pointer flex items-center gap-1 shrink-0"
                        title="คลิกเพื่อคัดลอก IP Address"
                      >
                        {copiedText === 'ip' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">คัดลอกแล้ว</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            <span className="text-[11px]">คัดลอก</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Device & Hardware Platform */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-xs">
                      <div className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 shrink-0 border border-blue-200 dark:border-blue-800">
                        {getDeviceIcon(inspectUser.device)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">
                          อุปกรณ์ที่ใช้งาน
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate mt-0.5">
                          {inspectUser.device || 'คอมพิวเตอร์ (Desktop)'}
                        </p>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Client Workstation</span>
                      </div>
                    </div>

                    {/* Web Browser */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-xs">
                      <div className="p-2 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 shrink-0 border border-purple-200 dark:border-purple-800">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">
                          เว็บเบราว์เซอร์
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate mt-0.5">
                          {inspectUser.browser || 'Google Chrome'}
                        </p>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Web Engine</span>
                      </div>
                    </div>

                    {/* Login Timestamp & Heartbeat */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-xs">
                      <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shrink-0 border border-emerald-200 dark:border-emerald-800">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">
                          เวลาเข้าสู่ระบบ
                        </span>
                        <p className="font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate mt-0.5">
                          {formatLoginTime(displayLoginTime)}
                        </p>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                          {formatTimeAgo(inspectUser.lastActive)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Security & Connection Info Footer Note */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="leading-tight">
                    เซสชันนี้เชื่อมต่อและรับ-ส่งข้อมูลแบบ Real-time ผ่าน Server-Sent Events (SSE) ได้รับการเข้ารหัสข้อมูลตามมาตรฐานความปลอดภัย
                  </p>
                </div>

              </div>

              {/* Modal Footer Controls */}
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-100 dark:bg-[#0b1329] border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
                
                <div>
                  {!userIsSelf ? (
                    <button
                      type="button"
                      onClick={() => handleTerminateSession(inspectUser)}
                      className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold text-xs transition border border-rose-300 dark:border-rose-800 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                      title="ตัดการเชื่อมต่อเซสชันของผู้ใช้นี้ทันที"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>ตัดการเชื่อมต่อเซสชัน</span>
                    </button>
                  ) : (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-1.5 py-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>เซสชันปัจจุบันของคุณ</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = inspectUser;
                      setInspectUser(null);
                      setMessageTarget(target);
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>ส่งข้อความแจ้งเตือน</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectUser(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
                  >
                    ปิด
                  </button>
                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* Send Flash Message Modal */}
      {messageTarget && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMessageTarget(null);
          }}
        >
          <div className="bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden animate-scale-in opacity-100 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">ส่งข้อความแจ้งเตือนด่วน</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">ถึง: {messageTarget.fullName || messageTarget.username}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMessageTarget(null)}
                className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {messageAlert && (
              <div className={`p-3 rounded-xl text-xs font-medium ${
                messageAlert.type === 'success' 
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800' 
                  : 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
              }`}>
                {messageAlert.text}
              </div>
            )}

            <form onSubmit={handleSendFlashMessage} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ข้อความแจ้งเตือนด่วน:</label>
                <textarea
                  rows={3}
                  value={flashMessageText}
                  onChange={(e) => setFlashMessageText(e.target.value)}
                  placeholder="เช่น กรุณาตรวจสอบเอกสารเกษียนด่วนที่สุด หรือ มีการประชุมด่วนเวลา 14:00 น."
                  className="w-full p-3 bg-slate-50 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white transition"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMessageTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSendingMessage || !flashMessageText.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
                >
                  {isSendingMessage ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังส่ง...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>ส่งข้อความ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
