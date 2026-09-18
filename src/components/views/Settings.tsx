import React, { useState, useEffect } from 'react';
import { Save, UserPlus, Shield, Settings as SettingsIcon, Building2, Plus, Lock, Key, Trash2, X, ShieldCheck, Calendar, Activity, Image, Type, Search, Filter, User as UserIcon, Crown, BadgeCheck, Briefcase, AlertTriangle, Camera, Upload, Database, Download, RefreshCw, CheckCircle2, Mail, Eye, Send, HardDrive, Files, Copy, Layers, Zap, Sparkles, Hash, Bookmark, Sliders, ChevronLeft, ChevronRight, ChevronDown, Check, Cpu, Server, Gauge, FileText, Radio, Globe, Laptop, Smartphone, Tablet, Clock } from 'lucide-react';
import { parseEnabledFeatures, DEFAULT_ENABLED_FEATURES } from '../../utils/featureFlags';
import CustomNumberingSettings from '../CustomNumberingSettings';
import { useConfirm } from '../../context/ConfirmContext';
import ActiveUsersRealtimeView from './ActiveUsersRealtimeView';
import { useRealtimeSync, realtimeSync } from '../../utils/realtimeSync';

interface SettingsProps {
  onSettingsUpdated?: () => void;
  enabledFeatures?: Record<string, boolean>;
  setEnabledFeatures?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  user?: any;
  hasPermission?: (key: string) => boolean;
  onNavigateTab?: (tab: string) => void;
}

export default function Settings(props: SettingsProps) {
  const { confirm } = useConfirm();
  const { onSettingsUpdated } = props;
  const [activeTab, setActiveTab] = useState<'system' | 'system_health' | 'system_doc' | 'users' | 'active_users' | 'permissions' | 'departments' | 'positions' | 'smtp' | 'backup' | 'dedup' | 'control'>('system');
  const [userSubTab, setUserSubTab] = useState<'list' | 'realtime'>('list');
  const [onlineUsersCount, setOnlineUsersCount] = useState<number>(() => {
    return typeof window !== 'undefined' ? realtimeSync.getOnlineUsers() : 0;
  });

  useRealtimeSync(['ONLINE_USERS_COUNT', 'ACTIVE_USERS_UPDATED'], (data) => {
    if (data?.count !== undefined) {
      setOnlineUsersCount(Number(data.count) || 0);
    } else if (data?.users && Array.isArray(data.users)) {
      setOnlineUsersCount(data.users.length);
    }
  });

  useEffect(() => {
    if (!props.hasPermission) return;
    
    const isSystemAdmin = props.user?.role === 'admin';
    const canManageUsers = props.hasPermission('manage_users') || isSystemAdmin;
    const canManageSystem = props.hasPermission('system_settings') || isSystemAdmin;
    
    if (!canManageSystem && (activeTab === 'system' || activeTab === 'smtp' || activeTab === 'system_doc' || activeTab === 'backup' || activeTab === 'dedup')) {
      if (canManageUsers) {
        setActiveTab('users');
      } else {
        setActiveTab('permissions');
      }
    }
  }, [props.user?.role, props.hasPermission, activeTab]);
  const [activeSystemDocTab, setActiveSystemDocTab] = useState<'docSettings' | 'customNumbering' | 'departments' | 'positions'>('docSettings');
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  
  // Deduplication state
  const [dedupStats, setDedupStats] = useState<any>(null);
  const [isScanningDedup, setIsScanningDedup] = useState<boolean>(false);
  const [isExecutingDedup, setIsExecutingDedup] = useState<boolean>(false);
  const [dedupMsg, setDedupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [autoDedupOnUpload, setAutoDedupOnUpload] = useState<boolean>(true);
  const [collapsedGroupHashes, setCollapsedGroupHashes] = useState<Record<string, boolean>>({});

  const toggleGroupCollapse = (hash: string) => {
    setCollapsedGroupHashes(prev => ({
      ...prev,
      [hash]: !prev[hash]
    }));
  };

  const expandAllGroups = () => {
    setCollapsedGroupHashes({});
  };

  const collapseAllGroups = () => {
    if (!dedupStats?.groups) return;
    const next: Record<string, boolean> = {};
    dedupStats.groups.forEach((g: any) => {
      if (g.hash) next[g.hash] = true;
    });
    setCollapsedGroupHashes(next);
  };
  
  // Feature flags control
  const [localEnabledFeatures, setLocalEnabledFeatures] = useState<Record<string, boolean>>({
    overview: true,
    inbox: true,
    outbox: true,
    admin_docs: true,
    draft_docs: true,
    folders: true,
    logs: true,
    draft: true,
    aiscan: true,
    order: true,
    customorder: true,
    speech: true,
    meeting: true,
    summary: true,
  });

  const enabledFeatures = props.enabledFeatures || localEnabledFeatures;
  const setEnabledFeatures = (val: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => {
    if (props.setEnabledFeatures) {
      if (typeof val === 'function') {
        props.setEnabledFeatures((prev) => (val as Function)(prev));
      } else {
        props.setEnabledFeatures(val);
      }
    } else {
      if (typeof val === 'function') {
        setLocalEnabledFeatures((prev) => (val as Function)(prev));
      } else {
        setLocalEnabledFeatures(val);
      }
    }
  };

  const [isSavingFeatures, setIsSavingFeatures] = useState(false);
  
  // System Settings state
  const [currentYear, setCurrentYear] = useState<number>(2569);
  const [startSequence, setStartSequence] = useState<number>(1);
  const [orgName, setOrgName] = useState<string>('สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  const [headerOrgName, setHeaderOrgName] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [garuda15Url, setGaruda15Url] = useState<string>('');
  const [garuda30Url, setGaruda30Url] = useState<string>('');
  const [faviconUrl, setFaviconUrl] = useState<string>('');
  const [footerText, setFooterText] = useState<string>('© 2026 ระบบสารบรรณอิเล็กทรอนิกส์ - สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [showGeminiKey, setShowGeminiKey] = useState<boolean>(false);
  
  const [smtpHost, setSmtpHost] = useState<string>('');
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpUser, setSmtpUser] = useState<string>('');
  const [smtpPassword, setSmtpPassword] = useState<string>('');
  const [smtpFrom, setSmtpFrom] = useState<string>('');

  const [showOtpPreviewModal, setShowOtpPreviewModal] = useState<boolean>(false);
  const [testEmailAddress, setTestEmailAddress] = useState<string>('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState<boolean>(false);

  const getLogoSrc = (url: string | null | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '' || url === 'null' || url === 'undefined') {
      return 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png';
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return url.startsWith('/') ? url : `/${url}`;
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      alert('กรุณากรอกอีเมลผู้รับทดสอบ');
      return;
    }
    setIsSendingTestEmail(true);
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail: testEmailAddress.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || 'ส่งอีเมลทดสอบเรียบร้อยแล้ว');
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการส่งอีเมลทดสอบ: ' + (data.message || ''));
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์: ' + err.message);
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const [isSavingSystem, setIsSavingSystem] = useState(false);

  // Detailed System Health & Diagnostics State (Admin Only)
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(false);
  const [isAutoRefreshHealth, setIsAutoRefreshHealth] = useState<boolean>(false);
  const [diagRunningAction, setDiagRunningAction] = useState<string | null>(null);
  const [diagActionMsg, setDiagActionMsg] = useState<{ type: 'success' | 'error' | 'info'; title: string; detail: string } | null>(null);

  const fetchSystemHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const res = await fetch('/api/system/health');
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
      }
    } catch (err) {
      console.error('Error fetching system health:', err);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'system_health' && props.user?.role === 'admin') {
      fetchSystemHealth();
    }
  }, [activeTab, props.user?.role]);

  useEffect(() => {
    let timer: any = null;
    if (activeTab === 'system_health' && props.user?.role === 'admin' && isAutoRefreshHealth) {
      timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          fetchSystemHealth();
        }
      }, 30000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeTab, props.user?.role, isAutoRefreshHealth]);

  const handleTestDbConnection = async () => {
    setDiagRunningAction('db');
    setDiagActionMsg(null);
    try {
      const res = await fetch('/api/system/test-db', { method: 'POST' });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('ระบบตอบกลับรูปแบบที่ไม่ถูกต้อง (อาจเกิดจากข้อผิดพลาดที่เซิร์ฟเวอร์)');
      }
      if (data.success) {
        setDiagActionMsg({
          type: 'success',
          title: 'ทดสอบ MySQL Connection สำเร็จ',
          detail: `${data.message} (Latency: ${data.latencyMs}ms | Engine: ${data.engine})`
        });
      } else {
        setDiagActionMsg({
          type: 'error',
          title: 'ทดสอบ MySQL ล้มเหลว',
          detail: data.message
        });
      }
      fetchSystemHealth();
    } catch (err: any) {
      setDiagActionMsg({
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการทดสอบ',
        detail: err.message
      });
    } finally {
      setDiagRunningAction(null);
    }
  };

  const handleTestAiEngine = async () => {
    setDiagRunningAction('ai');
    setDiagActionMsg(null);
    try {
      const res = await fetch('/api/system/test-ai', { method: 'POST' });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('ระบบตอบกลับรูปแบบที่ไม่ถูกต้อง (อาจเกิดจากข้อผิดพลาดที่เซิร์ฟเวอร์)');
      }
      if (data.success) {
        setDiagActionMsg({
          type: 'success',
          title: 'ทดสอบเอนจิน AI สำเร็จ',
          detail: `${data.message} (Model: ${data.primaryModel})`
        });
      } else {
        setDiagActionMsg({
          type: 'error',
          title: 'ทดสอบ AI ล้มเหลว',
          detail: data.message
        });
      }
      fetchSystemHealth();
    } catch (err: any) {
      setDiagActionMsg({
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการทดสอบ AI',
        detail: err.message
      });
    } finally {
      setDiagRunningAction(null);
    }
  };

  const handleCleanMemoryCache = async () => {
    setDiagRunningAction('memory');
    setDiagActionMsg(null);
    try {
      const res = await fetch('/api/system/clean-memory', { method: 'POST' });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('ระบบตอบกลับรูปแบบที่ไม่ถูกต้อง (อาจเกิดจากข้อผิดพลาดที่เซิร์ฟเวอร์)');
      }
      if (data.success) {
        setDiagActionMsg({
          type: 'success',
          title: 'ปรับปรุงหน่วยความจำสำเร็จ',
          detail: data.message
        });
      } else {
        setDiagActionMsg({
          type: 'error',
          title: 'ล้างหน่วยความจำล้มเหลว',
          detail: data.message
        });
      }
      fetchSystemHealth();
    } catch (err: any) {
      setDiagActionMsg({
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการล้างหน่วยความจำ',
        detail: err.message
      });
    } finally {
      setDiagRunningAction(null);
    }
  };

  const handleVerifyFileStorage = async () => {
    setDiagRunningAction('storage');
    setDiagActionMsg(null);
    try {
      const res = await fetch('/api/system/verify-storage', { method: 'POST' });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('ระบบตอบกลับรูปแบบที่ไม่ถูกต้อง (อาจเกิดจากข้อผิดพลาดที่เซิร์ฟเวอร์)');
      }
      if (data.success) {
        setDiagActionMsg({
          type: 'success',
          title: 'ตรวจสอบคลังจัดเก็บไฟล์สำเร็จ',
          detail: `${data.message} (ไฟล์แนบทั้งหมด: ${data.fileCount} ไฟล์, ขนาดรวม: ${data.sizeFormatted})`
        });
      } else {
        setDiagActionMsg({
          type: 'error',
          title: 'ตรวจสอบคลังจัดเก็บไฟล์ล้มเหลว',
          detail: data.message
        });
      }
      fetchSystemHealth();
    } catch (err: any) {
      setDiagActionMsg({
        type: 'error',
        title: 'เกิดข้อผิดพลาดในการตรวจสอบคลังไฟล์',
        detail: err.message
      });
    } finally {
      setDiagRunningAction(null);
    }
  };

  const handleExportDiagnosticReport = () => {
    if (!systemHealth) return;
    const reportData = {
      title: 'RAYONG-EDMS System Diagnostics Report',
      exportedAt: new Date().toISOString(),
      exportedAtThai: new Date().toLocaleString('th-TH'),
      metrics: systemHealth
    };
    const jsonStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSavingUser, setIsSavingUser] = useState<string | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userDeptFilter, setUserDeptFilter] = useState('ALL');
  const [userPosFilter, setUserPosFilter] = useState('ALL');

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
    position: '',
    department: '',
    role: 'user'
  });

  // Password Reset Modal State
  const [resetPassUser, setResetPassUser] = useState<any | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [isResettingPass, setIsResettingPass] = useState(false);

  // Departments state
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isSavingDepartment, setIsSavingDepartment] = useState<string | null>(null);

  // Add Department Modal State
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newDeptData, setNewDeptData] = useState({ name: '', description: '' });
  const [isAddingDept, setIsAddingDept] = useState(false);

  // Positions state
  const [positions, setPositions] = useState<any[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);
  const [isSavingPosition, setIsSavingPosition] = useState<string | null>(null);

  // Add Position Modal State
  const [showAddPosModal, setShowAddPosModal] = useState(false);
  const [newPosData, setNewPosData] = useState({ name: '', description: '' });
  const [isAddingPos, setIsAddingPos] = useState(false);

  // Confirm Delete Modal State
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    type: 'user' | 'department' | 'position' | null;
    item: any;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: null,
    item: null,
    title: '',
    message: '',
  });
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Backup & Restore State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
  const [restoreStatusMsg, setRestoreStatusMsg] = useState<{ type: 'success' | 'error'; text: string; details?: any } | null>(null);
  const [backupStatusMsg, setBackupStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Automated Backup History States
  // Automated Daily Backups Daemon State
  const [backupSubTab, setBackupSubTab] = useState<'schedules' | 'files'>('schedules');
  const [scheduledBackups, setScheduledBackups] = useState<any[]>([]);
  const [isLoadingScheduledBackups, setIsLoadingScheduledBackups] = useState(false);
  const [runningBackupScheduleId, setRunningBackupScheduleId] = useState<number | null>(null);
  const [isManualRunningBackup, setIsManualRunningBackup] = useState(false);
  const [showBackupScheduleModal, setShowBackupScheduleModal] = useState(false);
  const [editingBackupSchedule, setEditingBackupSchedule] = useState<any | null>(null);
  const [backupDaemonStats, setBackupDaemonStats] = useState<{ enabled: boolean; activeSchedulesCount: number; totalSchedulesCount: number }>({
    enabled: true,
    activeSchedulesCount: 0,
    totalSchedulesCount: 0
  });
  const [backupScheduleFormData, setBackupScheduleFormData] = useState({
    name: 'สำรองข้อมูลระบบฉบับเต็มประจำวัน (รอบเที่ยงคืน 00:00 น.)',
    scheduleType: 'daily',
    scheduledTime: '00:00',
    weeklyDay: 'monday',
    intervalHours: 24,
    backupScope: 'full',
    retentionDays: 7,
    description: 'สำรองตารางฐานข้อมูลและสารบรรณระบบทั้งหมดทุกคืนอัตโนมัติ พร้อมระบบหมุนเวียนลบไฟล์เก่า',
    isActive: true
  });

  const [automatedBackups, setAutomatedBackups] = useState<any[]>([]);
  const [isLoadingAutomatedBackups, setIsLoadingAutomatedBackups] = useState(false);
  const [isRestoringAutomated, setIsRestoringAutomated] = useState(false);
  const [automatedBackupMsg, setAutomatedBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAutomatedBackupEnabled, setIsAutomatedBackupEnabled] = useState(true);

  const fetchScheduledBackups = async () => {
    setIsLoadingScheduledBackups(true);
    try {
      const res = await fetch(`/api/scheduled-backups?role=${props.user?.role || 'admin'}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setScheduledBackups(data.schedules || []);
        }
      }
    } catch (e) {
      console.error('Error fetching scheduled backups:', e);
    } finally {
      setIsLoadingScheduledBackups(false);
    }
  };

  const fetchAutomatedBackups = async () => {
    setIsLoadingAutomatedBackups(true);
    setAutomatedBackupMsg(null);
    try {
      const statusRes = await fetch(`/api/automated-backups/status?role=${props.user?.role || 'admin'}&t=${Date.now()}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.success) {
          setIsAutomatedBackupEnabled(statusData.enabled);
          setBackupDaemonStats({
            enabled: statusData.enabled,
            activeSchedulesCount: statusData.activeSchedulesCount || 0,
            totalSchedulesCount: statusData.totalSchedulesCount || 0
          });
        }
      }

      const res = await fetch(`/api/automated-backups?role=${props.user?.role || 'admin'}&t=${Date.now()}`);
      if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลประวัติสำรองข้อมูลได้');
      const data = await res.json();
      if (data.success) {
        setAutomatedBackups(data.files || []);
      } else {
        throw new Error(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingAutomatedBackups(false);
    }
  };

  const handleSaveBackupSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingBackupSchedule ? `/api/scheduled-backups/${editingBackupSchedule.id}` : '/api/scheduled-backups';
      const method = editingBackupSchedule ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...backupScheduleFormData,
          role: props.user?.role || 'admin',
          username: props.user?.firstName || 'ผู้ดูแลระบบ'
        })
      });

      const data = await res.json();
      if (data.success) {
        setAutomatedBackupMsg({
          type: 'success',
          text: editingBackupSchedule ? 'บันทึกการแก้ไขคิวตั้งเวลาสำรองข้อมูลสำเร็จ' : 'เพิ่มคิวตั้งเวลาสำรองข้อมูลใหม่สำเร็จแล้ว'
        });
        setShowBackupScheduleModal(false);
        setEditingBackupSchedule(null);
        fetchScheduledBackups();
        fetchAutomatedBackups();
      } else {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err: any) {
      setAutomatedBackupMsg({ type: 'error', text: err.message });
    }
  };

  const handleToggleBackupSchedule = async (id: number) => {
    try {
      const res = await fetch(`/api/scheduled-backups/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: props.user?.role || 'admin',
          username: props.user?.firstName || 'ผู้ดูแลระบบ'
        })
      });
      const data = await res.json();
      if (data.success) {
        setScheduledBackups(prev => prev.map(s => s.id === id ? { ...s, isActive: data.isActive } : s));
        fetchAutomatedBackups();
      }
    } catch (err: any) {
      setAutomatedBackupMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteBackupSchedule = async (id: number, name: string) => {
    const confirmed = await confirm({
      title: 'ยืนยันการลบคิวตั้งเวลา',
      message: `คุณต้องการลบคิวตั้งเวลาสำรองข้อมูล "${name}" ใช่หรือไม่?`,
      type: 'delete',
      confirmText: 'ยืนยันการลบ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/scheduled-backups/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: props.user?.role || 'admin',
          username: props.user?.firstName || 'ผู้ดูแลระบบ'
        })
      });
      const data = await res.json();
      if (data.success) {
        setAutomatedBackupMsg({ type: 'success', text: `ลบคิวตั้งเวลา "${name}" เรียบร้อยแล้ว` });
        fetchScheduledBackups();
        fetchAutomatedBackups();
      }
    } catch (err: any) {
      setAutomatedBackupMsg({ type: 'error', text: err.message });
    }
  };

  const handleRunBackupScheduleNow = async (id: number, name: string) => {
    setRunningBackupScheduleId(id);
    setAutomatedBackupMsg(null);
    try {
      const res = await fetch(`/api/scheduled-backups/${id}/run-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: props.user?.role || 'admin',
          username: props.user?.firstName || 'ผู้ดูแลระบบ'
        })
      });
      const data = await res.json();
      if (data.success) {
        setAutomatedBackupMsg({
          type: 'success',
          text: `สั่งรันคิวสำรองข้อมูล "${name}" สำเร็จแล้ว! ไฟล์: ${data.filename} (${((data.fileSize || 0) / 1024).toFixed(1)} KB)`
        });
        fetchScheduledBackups();
        fetchAutomatedBackups();
      } else {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการรัน');
      }
    } catch (err: any) {
      setAutomatedBackupMsg({ type: 'error', text: err.message });
    } finally {
      setRunningBackupScheduleId(null);
    }
  };

  const handleManualRunBackup = async () => {
    setIsManualRunningBackup(true);
    setAutomatedBackupMsg(null);
    try {
      const res = await fetch('/api/automated-backups/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: props.user?.role || 'admin',
          username: props.user?.firstName || 'ผู้ดูแลระบบ'
        })
      });
      const data = await res.json();
      if (data.success) {
        setAutomatedBackupMsg({
          type: 'success',
          text: `สั่งสำรองข้อมูลระบบทันทีสำเร็จ! ไฟล์: ${data.filename}`
        });
        fetchAutomatedBackups();
        fetchScheduledBackups();
      } else {
        throw new Error(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err: any) {
      setAutomatedBackupMsg({ type: 'error', text: err.message });
    } finally {
      setIsManualRunningBackup(false);
    }
  };

  const handleToggleAutomatedBackup = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/automated-backups/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role: props.user?.role || 'admin', 
          username: props.user?.firstName || 'ผู้ดูแลระบบ',
          enabled 
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAutomatedBackupEnabled(enabled);
        setBackupDaemonStats(prev => ({ ...prev, enabled }));
        setAutomatedBackupMsg({ type: 'success', text: `ตั้งค่าสวิตช์หลักของระบบสำรองข้อมูลอัตโนมัติเป็น "${enabled ? 'เปิดการทำงาน' : 'ปิดการทำงาน'}" เรียบร้อยแล้ว` });
      } else {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการตั้งค่า');
      }
    } catch (err: any) {
      setAutomatedBackupMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteAutomatedBackup = async (fileName: string) => {
    const confirmed = await confirm({
      title: 'ยืนยันการลบไฟล์สำรองข้อมูล',
      message: `คุณต้องการลบไฟล์สำรองข้อมูล "${fileName}" ใช่หรือไม่?\nการดำเนินการนี้ไม่สามารถกู้คืนได้`,
      type: 'delete',
      confirmText: 'ลบไฟล์',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;
    
    try {
      const res = await fetch(`/api/automated-backups/${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: props.user?.role || 'admin', username: props.user?.firstName || 'ผู้ดูแลระบบ' })
      });
      const data = await res.json();
      if (data.success) {
        setAutomatedBackupMsg({ type: 'success', text: `ลบไฟล์ ${fileName} สำเร็จแล้ว` });
        fetchAutomatedBackups();
      } else {
        throw new Error(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err: any) {
      setAutomatedBackupMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteAllAutomatedBackups = async () => {
    const confirmed = await confirm({
      title: 'ยืนยันการลบข้อมูลทั้งหมด',
      message: '⚠️ คำเตือน: คุณแน่ใจหรือไม่ว่าต้องการ "ลบไฟล์สำรองข้อมูลอัตโนมัติทั้งหมด"?\nข้อมูลสำรองเหล่านี้จะไม่สามารถกู้คืนได้อีกต่อไป',
      type: 'delete',
      confirmText: 'ยืนยันการลบทั้งหมด',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;
    
    try {
      const res = await fetch('/api/automated-backups/all', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: props.user?.role || 'admin', username: props.user?.firstName || 'ผู้ดูแลระบบ' })
      });
      const data = await res.json();
      if (data.success) {
        setAutomatedBackupMsg({ type: 'success', text: 'ลบไฟล์สำรองข้อมูลอัตโนมัติทั้งหมดสำเร็จแล้ว' });
        fetchAutomatedBackups();
      } else {
        throw new Error(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err: any) {
      setAutomatedBackupMsg({ type: 'error', text: err.message });
    }
  };

  const handleRestoreAutomatedBackup = async (fileName: string) => {
    const confirmed = await confirm({
      title: '⚠️ ยืนยันการกู้คืนข้อมูลระบบ (Database Restore)',
      message: `คุณต้องการกู้คืนข้อมูลระบบย้อนกลับไปยังช่วงเวลาของไฟล์สำรองข้อมูล "${fileName}" ใช่หรือไม่?\n\nข้อมูลปัจจุบันในตารางระบบทั้งหมดจะถูกเขียนทับด้วยข้อมูลจากไฟล์นี้!`,
      type: 'warning',
      confirmText: 'ยืนยันการกู้คืนข้อมูล',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    setIsRestoringAutomated(true);
    setAutomatedBackupMsg(null);
    try {
      const res = await fetch(`/api/automated-backups/restore/${encodeURIComponent(fileName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: props.user?.role || 'admin',
          username: props.user?.firstName || 'ผู้ดูแลระบบ'
        })
      });
      const data = await res.json();
      if (data.success) {
        setAutomatedBackupMsg({
          type: 'success',
          text: `กู้คืนข้อมูลระบบสำเร็จเรียบร้อยแล้ว! (นำเข้า ${data.details?.recordsCount || 0} รายการ ใน ${data.details?.tablesCount || 0} ตาราง)`
        });
        if (props.onSettingsUpdated) {
          props.onSettingsUpdated();
        }
      } else {
        throw new Error(data.error || 'การคืนค่าข้อมูลล้มเหลว');
      }
    } catch (err: any) {
      setAutomatedBackupMsg({
        type: 'error',
        text: err.message || 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล'
      });
    } finally {
      setIsRestoringAutomated(false);
    }
  };

  // Role & Permissions state
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [isUpdatingPermission, setIsUpdatingPermission] = useState<string | null>(null);
  const [permissionSearchTerm, setPermissionSearchTerm] = useState<string>('');
  const [permissionViewMode, setPermissionViewMode] = useState<'roles' | 'departments' | 'combined'>('roles');
  const [permissionDeptFilter, setPermissionDeptFilter] = useState<string>('ALL');

  const fetchRolePermissions = async () => {
    setIsLoadingPermissions(true);
    try {
      const res = await fetch(`/api/role-permissions?t=${Date.now()}`, { cache: 'no-cache' });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setRolePermissions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const handleTogglePermission = async (role: string, permission_key: string, currentVal: number) => {
    const nextVal = currentVal === 1 ? 0 : 1;
    const updateKey = `${role}-${permission_key}`;
    setIsUpdatingPermission(updateKey);
    
    try {
      const res = await fetch('/api/role-permissions', {
        method: 'PUT',
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          permission_key,
          is_allowed: nextVal,
          username: `${props.user?.firstName || ''} ${props.user?.lastName || ''}`.trim() || props.user?.username
        })
      });
      
      if (res.ok) {
        setRolePermissions(prev => {
          const exists = prev.some(p => p.role === role && p.permission_key === permission_key);
          if (exists) {
            return prev.map(p => (p.role === role && p.permission_key === permission_key) ? { ...p, is_allowed: nextVal } : p);
          } else {
            return [...prev, { role, permission_key, is_allowed: nextVal }];
          }
        });
        props.onSettingsUpdated?.();
      } else {
        alert('ไม่สามารถอัปเดตสิทธิ์การใช้งานได้');
      }
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsUpdatingPermission(null);
    }
  };

  const handleBatchToggleRole = async (targetRole: string, targetValue: number) => {
    if (props.user?.role !== 'admin') return;
    const actionText = targetValue === 1 ? 'เปิดใช้งานสิทธิ์ทั้งหมด' : 'ปิดใช้งานสิทธิ์ทั้งหมด';
    const roleName = targetRole === 'admin' 
      ? 'Admin (ผู้ดูแลระบบ)' 
      : targetRole === 'moderator' 
        ? 'Moderator (ผู้ตรวจสอบ)' 
        : targetRole === 'user' 
          ? 'User (ผู้ใช้งานทั่วไป)' 
          : targetRole.startsWith('dept:') 
            ? `ฝ่าย/กลุ่มงาน "${targetRole.replace('dept:', '')}"` 
            : targetRole;

    const confirmed = await confirm({
      title: 'ยืนยันการเปลี่ยนสิทธิ์การเข้าถึงทั้งหมด',
      message: `คุณต้องการ${actionText} สำหรับ ${roleName} ใช่หรือไม่?`,
      type: 'warning',
      confirmText: 'ยืนยันดำเนินการ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    const allKeys = [
      'view_all_docs', 'create_docs', 'edit_all_docs', 'delete_docs', 'approve_docs', 'export_docs',
      'admin_docs', 'ai_assistant', 'infographics', 'qr_generator', 'draft_docs',
      'digital_folders', 'workflow_sla', 'digital_signatures', 'recycle_bin',
      'manage_users', 'system_settings', 'backup_restore', 'audit_logs', 'manage_changelog',
      'urgent_incidents'
    ];

    setIsLoadingPermissions(true);
    try {
      for (const key of allKeys) {
        if (targetRole === 'admin' && (key === 'system_settings' || key === 'manage_users') && targetValue === 0) {
          continue;
        }
        await fetch('/api/role-permissions', {
          method: 'PUT',
          cache: 'no-cache',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: targetRole,
            permission_key: key,
            is_allowed: targetValue,
            username: `${props.user?.firstName || ''} ${props.user?.lastName || ''}`.trim() || props.user?.username
          })
        });
      }
      await fetchRolePermissions();
      props.onSettingsUpdated?.();
    } catch (err) {
      console.error('Batch permission toggle error:', err);
      alert('เกิดข้อผิดพลาดในการอัปเดตสิทธิ์กลุ่ม');
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    setBackupStatusMsg(null);
    try {
      const usernameParam = encodeURIComponent(props.user?.firstName || 'ผู้ดูแลระบบ');
      const roleParam = encodeURIComponent(props.user?.role || 'admin');
      const response = await fetch(`/api/backup?username=${usernameParam}&role=${roleParam}`);
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'ไม่สามารถดาวน์โหลดไฟล์สำรองข้อมูลได้');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EDMS_Backup_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${Date.now()}.tar`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setBackupStatusMsg({
        type: 'success',
        text: 'สร้างและดาวน์โหลดไฟล์สำรองข้อมูล (.tar) สำเร็จแล้ว'
      });
    } catch (err: any) {
      console.error('Backup error:', err);
      setBackupStatusMsg({
        type: 'error',
        text: err.message || 'เกิดข้อผิดพลาดในการสำรองข้อมูล'
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreSubmit = async () => {
    if (!restoreFile) return;
    setIsRestoring(true);
    setRestoreStatusMsg(null);
    setShowRestoreConfirmModal(false);

    try {
      const formData = new FormData();
      formData.append('file', restoreFile);
      formData.append('username', props.user?.firstName || 'ผู้ดูแลระบบ');
      formData.append('role', props.user?.role || 'admin');

      const response = await fetch('/api/restore', {
        method: 'POST',
        body: formData
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'การคืนค่าข้อมูลล้มเหลว');
      }

      setRestoreStatusMsg({
        type: 'success',
        text: resData.message || 'คืนค่าข้อมูลระบบสำเร็จเรียบร้อยแล้ว',
        details: resData.summary
      });
      setRestoreFile(null);

      // Refresh system data
      fetchSystemSettings();
      fetchDepartments();
      fetchPositions();
      fetchUsers();
      if (onSettingsUpdated) {
        onSettingsUpdated();
      }
    } catch (err: any) {
      console.error('Restore error:', err);
      setRestoreStatusMsg({
        type: 'error',
        text: err.message || 'เกิดข้อผิดพลาดในการคืนค่าข้อมูล'
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const fetchDedupStats = async () => {
    setIsScanningDedup(true);
    try {
      const res = await fetch('/api/deduplication/scan');
      const data = await res.json();
      if (data.success && data.stats) {
        setDedupStats(data.stats);
        if (typeof data.stats.autoDedupOnUpload === 'boolean') {
          setAutoDedupOnUpload(data.stats.autoDedupOnUpload);
        }
      }
    } catch (err: any) {
      console.error('Error fetching dedup stats:', err);
    } finally {
      setIsScanningDedup(false);
    }
  };

  const handleExecuteDedup = async () => {
    const confirmed = await confirm({
      title: 'ยืนยันการย้ายไฟล์ซ้ำไป Pointer & ลบไฟล์ซ้ำ',
      message: 'ยืนยันการย้ายไฟล์ซ้ำทั้งหมดไป Pointer? ระบบจะเก็บรักษาไฟล์ต้นฉบับไว้ สร้าง Pointer Link และลบไฟล์ซ้ำทางกายภาพออกจากเซิร์ฟเวอร์เพื่อประหยัดพื้นที่ดิสก์',
      type: 'warning',
      confirmText: 'ยืนยันการย้ายไฟล์และลบไฟล์ซ้ำ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    setIsExecutingDedup(true);
    setDedupMsg(null);
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const res = await fetch('/api/deduplication/deduplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username || 'admin' })
      });
      const data = await res.json();
      if (data.success) {
        setDedupMsg({
          type: 'success',
          text: `ย้ายไฟล์ซ้ำไป Pointer และลบไฟล์ซ้ำออกจากเซิร์ฟเวอร์เรียบร้อยแล้ว! จัดการแล้ว ${data.filesMerged} ไฟล์ ประหยัดพื้นที่ได้ ${data.bytesReclaimedFormatted}`
        });
        if (data.updatedStats) {
          setDedupStats(data.updatedStats);
        } else {
          fetchDedupStats();
        }
      } else {
        setDedupMsg({ type: 'error', text: data.error || 'การย้ายไฟล์ซ้ำล้มเหลว' });
      }
    } catch (err: any) {
      setDedupMsg({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการย้ายไฟล์ซ้ำ' });
    } finally {
      setIsExecutingDedup(false);
    }
  };

  const handleExecuteDedupGroup = async (hash: string) => {
    const confirmed = await confirm({
      title: 'ยืนยันการย้ายกลุ่มนี้ไป Pointer',
      message: 'ระบบจะเก็บไฟล์ต้นฉบับไว้ ย้ายสำเนาทั้งหมดในกลุ่มนี้ไป Pointer และลบไฟล์ซ้ำออกจากเซิร์ฟเวอร์ ต้องการดำเนินการหรือไม่?',
      type: 'warning',
      confirmText: 'ย้ายกลุ่มนี้ไป Pointer',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    setIsExecutingDedup(true);
    setDedupMsg(null);
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const res = await fetch('/api/deduplication/deduplicate-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username || 'admin', hash })
      });
      const data = await res.json();
      if (data.success) {
        setDedupMsg({
          type: 'success',
          text: `ย้ายกลุ่มไฟล์ซ้ำไป Pointer และลบไฟล์ซ้ำเรียบร้อยแล้ว! ประหยัดพื้นที่ได้ ${data.bytesReclaimedFormatted}`
        });
        if (data.updatedStats) {
          setDedupStats(data.updatedStats);
        } else {
          fetchDedupStats();
        }
      } else {
        setDedupMsg({ type: 'error', text: data.error || 'การย้ายกลุ่มไฟล์ซ้ำล้มเหลว' });
      }
    } catch (err: any) {
      setDedupMsg({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการย้ายกลุ่มไฟล์ซ้ำ' });
    } finally {
      setIsExecutingDedup(false);
    }
  };

  const handleToggleAutoDedup = async () => {
    const nextVal = !autoDedupOnUpload;
    setAutoDedupOnUpload(nextVal);
    try {
      await fetch('/api/deduplication/toggle-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextVal })
      });
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchSystemSettings();
    fetchDepartments();
    fetchPositions();
    if (activeTab === 'users') {
      fetchUsers();
    }
    if (activeTab === 'dedup') {
      fetchDedupStats();
    }
    if (activeTab === 'permissions') {
      fetchRolePermissions();
    }
    if (activeTab === 'backup') {
      fetchAutomatedBackups();
      fetchScheduledBackups();
    }
  }, [activeTab]);

  const fetchWithRetry = async (url: string, options?: RequestInit, retries = 3, delay = 600): Promise<Response> => {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 1.5);
      }
      throw err;
    }
  };

  const applySettingsData = (data: any) => {
    if (data.currentYear) setCurrentYear(data.currentYear);
    if (data.startSequence) setStartSequence(data.startSequence);
    if (data.orgName) setOrgName(data.orgName || '');
    if (data.headerOrgName !== undefined) setHeaderOrgName(data.headerOrgName || '');
    if (data.logoUrl !== undefined) {
      setLogoUrl(data.logoUrl || '');
      if (data.logoUrl) {
        localStorage.setItem('moi_logo', data.logoUrl);
        localStorage.setItem('moi_schoolLogo', data.logoUrl);
      }
    }
    if (data.garuda15Url !== undefined) {
      setGaruda15Url(data.garuda15Url || '');
      if (data.garuda15Url) {
        localStorage.setItem('moi_garuda15', data.garuda15Url);
        localStorage.setItem('moi_garudaCustom', data.garuda15Url);
      }
    }
    if (data.garuda30Url !== undefined) {
      setGaruda30Url(data.garuda30Url || '');
      if (data.garuda30Url) {
        localStorage.setItem('moi_garuda30', data.garuda30Url);
        if (!data.garuda15Url) localStorage.setItem('moi_garudaCustom', data.garuda30Url);
      }
    }
    if (data.faviconUrl !== undefined) setFaviconUrl(data.faviconUrl || '');
    if (data.footerText) setFooterText(data.footerText || '');
    if (data.geminiApiKey !== undefined) setGeminiApiKey(data.geminiApiKey || '');
    if (data.smtpHost !== undefined) setSmtpHost(data.smtpHost || '');
    if (data.smtpPort !== undefined) setSmtpPort(data.smtpPort || 587);
    if (data.smtpUser !== undefined) setSmtpUser(data.smtpUser || '');
    if (data.smtpPassword !== undefined) setSmtpPassword(data.smtpPassword || '');
    if (data.smtpFrom !== undefined) setSmtpFrom(data.smtpFrom || '');
    if (data.enabledFeatures !== undefined) {
      const parsed = parseEnabledFeatures(data.enabledFeatures);
      setEnabledFeatures(parsed);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const res = await fetchWithRetry('/api/settings', { cache: 'no-cache' });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        applySettingsData(data);
        localStorage.setItem('moi_settings', JSON.stringify(data));
      }
    } catch (error: any) {
      console.warn('Network issue fetching settings, falling back to local cache:', error?.message || error);
      const cached = localStorage.getItem('moi_settings');
      if (cached) {
        try {
          applySettingsData(JSON.parse(cached));
        } catch (e) {
          // ignore parse error
        }
      }
    }
  };

  const saveSystemSettings = async () => {
    const confirmed = await confirm({
      title: 'ยืนยันการบันทึกการตั้งค่าระบบ',
      message: 'คุณต้องการบันทึกการเปลี่ยนแปลงการตั้งค่าระบบทั้งหมดใช่หรือไม่? การเปลี่ยนแปลงนี้อาจส่งผลต่อการทำงานของระบบในภาพรวม',
      type: 'warning',
      confirmText: 'ยืนยันการบันทึก'
    });
    if (!confirmed) return;

    setIsSavingSystem(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentYear,
          startSequence,
          orgName,
          headerOrgName,
          logoUrl,
          garuda15Url,
          garuda30Url,
          faviconUrl,
          footerText,
          geminiApiKey,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPassword,
          smtpFrom,
          enabledFeatures: JSON.stringify(enabledFeatures)
        })
      });
      if (logoUrl) {
        localStorage.setItem('moi_logo', logoUrl);
        localStorage.setItem('moi_schoolLogo', logoUrl);
      } else {
        localStorage.removeItem('moi_logo');
        localStorage.removeItem('moi_schoolLogo');
      }
      if (garuda15Url) {
        localStorage.setItem('moi_garuda15', garuda15Url);
        localStorage.setItem('moi_garudaCustom', garuda15Url);
      } else {
        localStorage.removeItem('moi_garuda15');
      }
      if (garuda30Url) {
        localStorage.setItem('moi_garuda30', garuda30Url);
        if (!garuda15Url) localStorage.setItem('moi_garudaCustom', garuda30Url);
      } else {
        localStorage.removeItem('moi_garuda30');
      }
      if (!garuda15Url && !garuda30Url) {
        localStorage.removeItem('moi_garudaCustom');
      }
      localStorage.setItem('moi_settings', JSON.stringify({
        currentYear, startSequence, orgName, headerOrgName, logoUrl, garuda15Url, garuda30Url, faviconUrl, footerText, geminiApiKey, smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, enabledFeatures: JSON.stringify(enabledFeatures)
      }));
      alert('บันทึกการตั้งค่าระบบและข้อมูลหน่วยงานเรียบร้อยแล้ว');
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSavingSystem(false);
    }
  };

  const featureNameMap: Record<string, string> = {
    overview: 'หน้าภาพรวม',
    inbox: 'กล่องข้อความเข้า',
    outbox: 'กล่องข้อความออก',
    admin_docs: 'สารบรรณกลาง',
    draft_docs: 'ร่างหนังสือ',
    folders: 'แฟ้มเอกสาร',
    logs: 'ประวัติการใช้งาน',
    draft: 'ร่างเอกสาร (เมนูย่อย)',
    aiscan: 'AI สแกนเอกสาร',
    order: 'ร่างคำสั่ง',
    customorder: 'ร่างคำสั่งสถิติ',
    speech: 'ร่างคำกล่าว',
    meeting: 'ร่างระเบียบวาระการประชุม',
    summary: 'ร่างสรุปโครงการ',
  };

  const handleToggleFeature = async (featureKey: string) => {
    const currentValue = enabledFeatures[featureKey] !== false;
    const newValue = !currentValue;
    const updated = {
      ...enabledFeatures,
      [featureKey]: newValue
    };
    setEnabledFeatures(updated);
    const label = featureNameMap[featureKey] || featureKey;
    const actionText = newValue ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
    const detail = `${actionText}ฟังก์ชันระบบ: ${label}`;
    await saveFeaturesSettings(updated, true, detail);
  };

  const handleToggleAllFeatures = async (enable: boolean) => {
    const updated = { ...enabledFeatures };
    const featureKeys = [
      'overview', 'inbox', 'outbox', 'admin_docs', 'draft_docs', 
      'folders', 'logs', 'draft', 'aiscan', 'order', 'customorder', 
      'speech', 'meeting', 'summary'
    ];
    featureKeys.forEach(key => {
      updated[key] = enable;
    });
    setEnabledFeatures(updated);
    const detail = enable ? 'เปิดใช้งานฟังก์ชันระบบทั้งหมด' : 'ปิดใช้งานฟังก์ชันระบบทั้งหมด';
    await saveFeaturesSettings(updated, true, detail);
  };

  const saveFeaturesSettings = async (featuresToSave?: Record<string, boolean>, quiet = false, customDetail?: string) => {
    setIsSavingFeatures(true);
    const targetFeatures = featuresToSave || enabledFeatures;
    
    // Attempt to get user from props or local storage
    let username = 'ผู้ดูแลระบบ';
    if (props.user) {
      if (props.user.firstName) {
        username = `${props.user.firstName} ${props.user.lastName || ''}`.trim();
      } else if (props.user.username) {
        username = props.user.username;
      }
    } else {
      try {
        const stored = localStorage.getItem('edms_user_data');
        if (stored) {
          const u = JSON.parse(stored);
          if (u && (u.firstName || u.username)) {
            username = u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.username;
          }
        }
      } catch (e) {}
    }

    try {
      const res = await fetch('/api/settings/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabledFeatures: JSON.stringify(targetFeatures),
          updatedBy: username,
          details: customDetail || 'อัปเดตการตั้งค่าเปิด-ปิดฟังก์ชันระบบ'
        })
      });
      if (res.ok) {
        if (!quiet) {
          alert('บันทึกการตั้งค่าระบบเปิด-ปิดฟังก์ชันเรียบร้อยแล้ว');
        }
        // Update local storage representation so the current app session is updated immediately
        try {
          const currentSettings = localStorage.getItem('moi_settings');
          if (currentSettings) {
            const parsed = JSON.parse(currentSettings);
            parsed.enabledFeatures = JSON.stringify(targetFeatures);
            localStorage.setItem('moi_settings', JSON.stringify(parsed));
          } else {
            localStorage.setItem('moi_settings', JSON.stringify({ enabledFeatures: JSON.stringify(targetFeatures) }));
          }
        } catch (e) {}
        if (onSettingsUpdated) onSettingsUpdated();
      } else {
        if (!quiet) {
          alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
      }
    } catch (error) {
      console.error('Error saving features:', error);
      if (!quiet) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      }
    } finally {
      setIsSavingFeatures(false);
    }
  };

  const [activeDragType, setActiveDragType] = useState<string | null>(null);

  const handleDragOverType = (e: React.DragEvent, type: string) => {
    e.preventDefault();
    setActiveDragType(type);
  };

  const handleDragLeaveType = (e: React.DragEvent) => {
    e.preventDefault();
    setActiveDragType(null);
  };

  const handleDropType = async (e: React.DragEvent, type: 'logo' | 'favicon' | 'garuda15' | 'garuda30') => {
    e.preventDefault();
    setActiveDragType(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const mockEvent = {
          target: {
            files: [file]
          }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        await handleImageUpload(mockEvent, type);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon' | 'garuda15' | 'garuda30') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('subfolder', 'system');
      formData.append('uploadedBy', 'admin');
      formData.append('files', file);

      try {
        const res = await fetch('/api/upload?subfolder=system&uploadedBy=admin', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          if (data.files && data.files.length > 0) {
            const uploadedUrl = data.files[0].url;
            if (type === 'logo') {
              setLogoUrl(uploadedUrl);
              localStorage.setItem('moi_logo', uploadedUrl);
              localStorage.setItem('moi_schoolLogo', uploadedUrl);
            } else if (type === 'favicon') {
              setFaviconUrl(uploadedUrl);
            } else if (type === 'garuda15') {
              setGaruda15Url(uploadedUrl);
              localStorage.setItem('moi_garuda15', uploadedUrl);
              localStorage.setItem('moi_garudaCustom', uploadedUrl);
            } else if (type === 'garuda30') {
              setGaruda30Url(uploadedUrl);
              localStorage.setItem('moi_garuda30', uploadedUrl);
              if (!garuda15Url) localStorage.setItem('moi_garudaCustom', uploadedUrl);
            }
          }
        } else {
          alert('ไม่สามารถอัปโหลดรูปได้');
        }
      } catch (err) {
        console.error('Error uploading image:', err);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อเพื่ออัปโหลด');
      }
    }
  };

  const fetchDepartments = async () => {
    setIsLoadingDepartments(true);
    try {
      const res = await fetchWithRetry('/api/departments');
      if (res.ok) {
        const depsData = await res.json();
        setDepartments(depsData);
        try { localStorage.setItem('moi_departments_cache', JSON.stringify(depsData)); } catch (e) {}
      }
    } catch (error: any) {
      console.warn('Network issue fetching departments, using cache:', error?.message || error);
      try {
        const cached = localStorage.getItem('moi_departments_cache');
        if (cached) setDepartments(JSON.parse(cached));
      } catch (e) {}
    } finally {
      setIsLoadingDepartments(false);
    }
  };

  const updateDepartment = async (deptId: string | number, field: string, value: string) => {
    setIsSavingDepartment(String(deptId));
    try {
      const deptToUpdate = departments.find(d => String(d.id) === String(deptId));
      if (deptToUpdate) {
        await fetch(`/api/departments/${deptId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...deptToUpdate, [field]: value })
        });
        setDepartments(departments.map(d => String(d.id) === String(deptId) ? { ...d, [field]: value } : d));
      }
    } catch (error) {
      console.error('Error updating department:', error);
      alert('ไม่สามารถอัพเดทข้อมูลได้');
    } finally {
      setIsSavingDepartment(null);
    }
  };

  const handleAddDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptData.name || !newDeptData.name.trim()) return;
    const confirmed = await confirm({
      title: 'ยืนยันการเพิ่มกลุ่มงาน/ฝ่ายงาน',
      message: `คุณต้องการเพิ่มแผนก/กลุ่มงาน "${newDeptData.name.trim()}" ใช่หรือไม่?`,
      type: 'info',
      confirmText: 'ยืนยันการเพิ่ม',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    setIsAddingDept(true);
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeptData.name.trim(), description: newDeptData.description.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setDepartments(prev => [...prev, { id: data.id, name: newDeptData.name.trim(), description: newDeptData.description.trim() }]);
        setShowAddDeptModal(false);
        setNewDeptData({ name: '', description: '' });
      } else {
        alert('เกิดข้อผิดพลาดในการเพิ่มแผนก/กลุ่มงาน');
      }
    } catch (error) {
      console.error('Error adding department:', error);
      alert('ไม่สามารถเพิ่มแผนก/กลุ่มงานได้');
    } finally {
      setIsAddingDept(false);
    }
  };

  const confirmDeleteDepartment = (dept: any) => {
    setConfirmDeleteModal({
      isOpen: true,
      type: 'department',
      item: dept,
      title: 'ยืนยันการลบแผนก/กลุ่มงาน',
      message: `คุณต้องการลบแผนก/กลุ่มงาน "${dept.name}" ใช่หรือไม่?`
    });
  };

  const fetchPositions = async () => {
    setIsLoadingPositions(true);
    try {
      const res = await fetchWithRetry('/api/positions');
      if (res.ok) {
        const posData = await res.json();
        setPositions(posData);
        try { localStorage.setItem('moi_positions_cache', JSON.stringify(posData)); } catch (e) {}
      }
    } catch (error: any) {
      console.warn('Network issue fetching positions, using cache:', error?.message || error);
      try {
        const cached = localStorage.getItem('moi_positions_cache');
        if (cached) setPositions(JSON.parse(cached));
      } catch (e) {}
    } finally {
      setIsLoadingPositions(false);
    }
  };

  const updatePosition = async (posId: string | number, field: string, value: string) => {
    setIsSavingPosition(String(posId));
    try {
      const posToUpdate = positions.find(p => String(p.id) === String(posId));
      if (posToUpdate) {
        await fetch(`/api/positions/${posId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...posToUpdate, [field]: value })
        });
        setPositions(positions.map(p => String(p.id) === String(posId) ? { ...p, [field]: value } : p));
      }
    } catch (error) {
      console.error('Error updating position:', error);
      alert('ไม่สามารถอัพเดทข้อมูลตำแหน่งได้');
    } finally {
      setIsSavingPosition(null);
    }
  };

  const handleAddPosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosData.name || !newPosData.name.trim()) return;
    const confirmed = await confirm({
      title: 'ยืนยันการเพิ่มตำแหน่งงาน',
      message: `คุณต้องการเพิ่มตำแหน่งงาน "${newPosData.name.trim()}" ใช่หรือไม่?`,
      type: 'info',
      confirmText: 'ยืนยันการเพิ่ม',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    setIsAddingPos(true);
    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPosData.name.trim(), description: newPosData.description.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setPositions(prev => [...prev, data]);
        setShowAddPosModal(false);
        setNewPosData({ name: '', description: '' });
      } else {
        alert('เกิดข้อผิดพลาดในการเพิ่มตำแหน่ง');
      }
    } catch (error) {
      console.error('Error adding position:', error);
      alert('ไม่สามารถเพิ่มตำแหน่งได้');
    } finally {
      setIsAddingPos(false);
    }
  };

  const confirmDeletePosition = (pos: any) => {
    setConfirmDeleteModal({
      isOpen: true,
      type: 'position',
      item: pos,
      title: 'ยืนยันการลบตำแหน่งงาน',
      message: `คุณต้องการลบตำแหน่งงาน "${pos.name}" ใช่หรือไม่?`
    });
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetchWithRetry('/api/users');
      if (res.ok) {
        const usersData = await res.json();
        setUsers(usersData);
        try { localStorage.setItem('moi_users_cache', JSON.stringify(usersData)); } catch (e) {}
      }
    } catch (error: any) {
      console.warn('Network issue fetching users, using cache:', error?.message || error);
      try {
        const cached = localStorage.getItem('moi_users_cache');
        if (cached) setUsers(JSON.parse(cached));
      } catch (e) {}
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const updateUser = async (userId: string | number, field: string, value: string) => {
    setIsSavingUser(String(userId));
    try {
      const userToUpdate = users.find(u => String(u.id) === String(userId));
      if (userToUpdate) {
        const updatedUser = { ...userToUpdate, [field]: value };
        await fetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUser)
        });
        setUsers(users.map(u => String(u.id) === String(userId) ? updatedUser : u));
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('ไม่สามารถอัพเดทข้อมูลได้');
    } finally {
      setIsSavingUser(null);
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password || !newUser.firstName) {
      alert('กรุณากรอกข้อมูล ชื่อผู้ใช้, รหัสผ่าน และชื่อเจ้าหน้าที่ ให้ครบถ้วน');
      return;
    }

    const confirmed = await confirm({
      title: 'ยืนยันการเพิ่มเจ้าหน้าที่ใหม่',
      message: `คุณต้องการบันทึกข้อมูลเจ้าหน้าที่ "${newUser.firstName} ${newUser.lastName || ''}" (ชื่อผู้ใช้: ${newUser.username}) ใช่หรือไม่?`,
      type: 'info',
      confirmText: 'ยืนยันการบันทึก',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    setIsSubmittingUser(true);
    try {
      const defaultDept = newUser.department || (departments.length > 0 ? departments[0].name : 'ฝ่ายยุทธศาสตร์และการจัดการ');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUser,
          department: defaultDept
        })
      });

      if (res.ok) {
        alert('เพิ่มข้อมูลเจ้าหน้าที่สำเร็จ (รหัสผ่านถูกเข้ารหัสความปลอดภัย Argon2id เรียบร้อยแล้ว)');
        setShowAddModal(false);
        setNewUser({
          username: '',
          password: '',
          email: '',
          firstName: '',
          lastName: '',
          position: '',
          department: '',
          role: 'user'
        });
        fetchUsers();
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('ไม่สามารถเพิ่มเจ้าหน้าที่ได้');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPassUser || !newPasswordValue) {
      alert('กรุณากรอกรหัสผ่านใหม่');
      return;
    }

    setIsResettingPass(true);
    try {
      const res = await fetch(`/api/users/${resetPassUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...resetPassUser,
          password: newPasswordValue
        })
      });

      if (res.ok) {
        alert(`เปลี่ยนรหัสผ่านสำหรับเจ้าหน้าที่ ${resetPassUser.firstName} ${resetPassUser.lastName || ''} สำเร็จ (เข้ารหัสด้วย Argon2id)`);
        setResetPassUser(null);
        setNewPasswordValue('');
        fetchUsers();
      } else {
        alert('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('ไม่สามารถเปลี่ยนรหัสผ่านได้');
    } finally {
      setIsResettingPass(false);
    }
  };

  const confirmDeleteUser = (userToDelete: any) => {
    if (!userToDelete || userToDelete.id === undefined) return;
    const fullName = `${userToDelete.firstName || ''} ${userToDelete.lastName || ''}`.trim() || userToDelete.username;
    setConfirmDeleteModal({
      isOpen: true,
      type: 'user',
      item: userToDelete,
      title: 'ยืนยันการลบข้อมูลเจ้าหน้าที่',
      message: `คุณต้องการลบข้อมูลเจ้าหน้าที่ "${fullName}" (@${userToDelete.username || ''}) ออกจากระบบใช่หรือไม่?`
    });
  };

  const handleExecuteDelete = async () => {
    const { type, item } = confirmDeleteModal;
    if (!type || !item) return;

    setIsDeletingItem(true);
    try {
      if (type === 'department') {
        const res = await fetch(`/api/departments/${item.id}`, { method: 'DELETE' });
        if (res.ok) {
          setDepartments(prev => prev.filter(d => String(d.id) !== String(item.id)));
        } else {
          alert('เกิดข้อผิดพลาดในการลบแผนก/กลุ่มงาน');
        }
      } else if (type === 'user') {
        const res = await fetch(`/api/users/${item.id}`, { method: 'DELETE' });
        if (res.ok) {
          setUsers(prev => prev.filter(u => String(u.id) !== String(item.id)));
        } else {
          alert('เกิดข้อผิดพลาดในการลบข้อมูลเจ้าหน้าที่');
        }
      } else if (type === 'position') {
        const res = await fetch(`/api/positions/${item.id}`, { method: 'DELETE' });
        if (res.ok) {
          setPositions(prev => prev.filter(p => String(p.id) !== String(item.id)));
        } else {
          alert('เกิดข้อผิดพลาดในการลบตำแหน่งงาน');
        }
      }
    } catch (error) {
      console.error('Error during deletion:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
    } finally {
      setIsDeletingItem(false);
      setConfirmDeleteModal({ isOpen: false, type: null, item: null, title: '', message: '' });
    }
  };

  const canManageSystem = !props.user?.role || (props.hasPermission ? props.hasPermission('system_settings') : props.user?.role === 'admin');
  const canManageUsers = !props.user?.role || (props.hasPermission ? props.hasPermission('manage_users') : (props.user?.role === 'admin' || props.user?.role === 'moderator'));
  const canBackup = !props.user?.role || (props.hasPermission ? props.hasPermission('backup_restore') : props.user?.role === 'admin');

  interface NavItem {
    id: 'system' | 'system_health' | 'system_doc' | 'users' | 'active_users' | 'permissions' | 'departments' | 'positions' | 'smtp' | 'backup' | 'dedup' | 'control';
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    visible: boolean;
    badge?: string;
  }

  interface NavCategory {
    category: string;
    items: NavItem[];
  }

  const navCategories: NavCategory[] = [
    {
      category: 'ทั่วไป',
      items: [
        {
          id: 'system',
          label: 'องค์กร',
          sublabel: 'ชื่อหน่วยงาน, ตราครุฑ, Gemini AI',
          icon: SettingsIcon,
          visible: canManageSystem
        },
        {
          id: 'system_health',
          label: 'สถานะระบบ',
          sublabel: 'เซิร์ฟเวอร์, ฐานข้อมูล, AI และวินิจฉัย',
          icon: Activity,
          visible: props.user?.role === 'admin'
        },
        {
          id: 'system_doc',
          label: 'สารบรรณ',
          sublabel: 'ปี พ.ศ., เลขหนังสือ, แผนก, ตำแหน่ง',
          icon: Calendar,
          visible: canManageSystem,
          badge: departments.length > 0 ? `${departments.length}` : undefined
        },
        {
          id: 'smtp',
          label: 'อีเมล',
          sublabel: 'การส่งแจ้งเตือน และเทมเพลต OTP',
          icon: Mail,
          visible: canManageSystem
        }
      ]
    },
    {
      category: 'ความปลอดภัย',
      items: [
        {
          id: 'users',
          label: props.user?.role === 'moderator' ? 'บุคลากร' : 'บุคลากร',
          sublabel: 'รายชื่อเจ้าหน้าที่, สังกัดฝ่าย, รหัสผ่าน',
          icon: Shield,
          visible: canManageUsers,
          badge: users.length > 0 ? `${users.length}` : undefined
        },
        {
          id: 'active_users',
          label: 'ผู้ใช้ Real-time',
          sublabel: 'ติดตามผู้ใช้สด และหน้าจอที่เปิดอยู่',
          icon: Radio,
          visible: canManageUsers,
          badge: onlineUsersCount > 0 ? `${onlineUsersCount} ออนไลน์` : undefined
        },
        {
          id: 'permissions',
          label: 'สิทธิ์',
          sublabel: 'กำหนดสิทธิ์ 4 บทบาท และฟังก์ชัน',
          icon: ShieldCheck,
          visible: true
        }
      ]
    },
    {
      category: 'พื้นที่จัดเก็บ',
      items: [
        {
          id: 'backup',
          label: 'สำรองข้อมูล',
          sublabel: 'Export/Import ฐานข้อมูลและระบบ',
          icon: Database,
          visible: canBackup
        },
        {
          id: 'dedup',
          label: 'ไฟล์ซ้ำ',
          sublabel: 'สแกนไฟล์ซ้ำเพื่อประหยัดพื้นที่จัดเก็บ',
          icon: HardDrive,
          visible: canBackup
        }
      ]
    }
  ];

  const allVisibleNavItems: NavItem[] = navCategories.flatMap(c => c.items).filter(i => i.visible);
  const currentTabMeta: NavItem = allVisibleNavItems.find(i => i.id === activeTab) || allVisibleNavItems[0] || {
    id: 'system',
    label: 'ตั้งค่าระบบ',
    sublabel: 'จัดการข้อมูลพื้นฐานของระบบ',
    icon: SettingsIcon,
    visible: true
  };
  const currentCategory = navCategories.find(c => c.items.some(i => i.id === activeTab))?.category || 'การตั้งค่าระบบ';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Executive Header */}
      <div className="relative overflow-hidden bg-[var(--bg-overlay)] backdrop-blur-2xl border border-[var(--border-light)] rounded-3xl p-6 sm:p-8 shadow-xs group">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--primary-color)] text-white flex items-center justify-center shadow-sm shrink-0">
              <Sliders className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-sans font-bold text-[var(--text-primary)] tracking-tight">
                  ตั้งค่าระบบ<span className="font-normal text-[var(--primary-color)]">และผู้ดูแล</span>
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-900/10 text-blue-900 dark:text-blue-300 border border-blue-900/20 shadow-xs">
                  <Shield className="w-3.5 h-3.5" />
                  {props.user?.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : props.user?.role === 'moderator' ? 'สารบรรณฝ่าย (Moderator)' : 'ผู้ใช้งาน (User)'}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-1.5 font-medium max-w-xl">
                ศูนย์ควบคุมการตั้งค่าระบบ สิทธิ์การเข้าถึง อัตลักษณ์องค์กร และฐานข้อมูลสารบรรณอิเล็กทรอนิกส์
              </p>
            </div>
          </div>

          {/* Quick status chips */}
          <div className="flex items-center gap-3 flex-wrap pt-4 md:pt-0 border-t md:border-t-0 border-[var(--border-lighter)]">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-[var(--border-light)] text-sm text-[var(--text-secondary)] font-bold shadow-xs">
              <Calendar className="w-4 h-4 text-[var(--primary-color)]" />
              <span>ปี พ.ศ. {currentYear}</span>
            </div>
            {users.length > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-[var(--border-light)] text-sm text-[var(--text-secondary)] font-bold shadow-xs">
                <UserIcon className="w-4 h-4 text-emerald-600" />
                <span>{users.length} บุคลากร</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Responsive Layout */}
      <div className="space-y-6">
        
        {/* Navigation Grid Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {navCategories.map(cat => cat.items.filter(i => i.visible).map(item => {
            const ItemIcon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`group relative flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer outline-none select-none text-center ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 border-[var(--primary-color)] shadow-xs ring-1 ring-[var(--primary-color)]/30'
                    : 'bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-900 border-[var(--border-light)] hover:border-[var(--border-medium)] shadow-2xs hover:shadow-xs'
                }`}
              >
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-2 transition-transform duration-200 ${
                  isActive
                    ? 'bg-[var(--primary-color)] text-white shadow-xs scale-105'
                    : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-secondary)] group-hover:bg-[var(--primary-color)]/10 group-hover:text-[var(--primary-color)] group-hover:scale-105'
                }`}>
                  <ItemIcon className="w-5 h-5 stroke-[2]" />
                </div>
                
                <span className={`text-xs sm:text-sm font-bold tracking-tight transition-colors line-clamp-1 ${
                  isActive ? 'text-[var(--primary-color)]' : 'text-[var(--text-primary)]'
                }`}>
                  {item.label}
                </span>

                <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-1 max-w-[140px] opacity-80">
                  {item.sublabel}
                </span>

                {/* Badge Overlay */}
                {item.badge && (
                  <span className="absolute top-2.5 right-2.5 text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-[var(--primary-color)]/10 text-[var(--primary-color)] border border-[var(--primary-color)]/20">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          }))}
        </div>
        </div>

        {/* Content Section */}
        <div className="space-y-5">
          {/* Active Section Banner */}
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center shrink-0 border border-[var(--primary-color)]/20">
                <currentTabMeta.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-[var(--primary-color)] uppercase tracking-wider">
                  {currentCategory}
                </div>
                <h2 className="text-lg sm:text-xl font-sans font-bold text-[var(--text-primary)]">
                  {currentTabMeta.label}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {currentTabMeta.sublabel}
                </p>
              </div>
            </div>

            {/* Contextual Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {activeTab === 'system' && (
                <button
                  type="button"
                  onClick={saveSystemSettings}
                  disabled={isSavingSystem}
                  className="inline-flex items-center justify-center gap-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition shadow-xs cursor-pointer disabled:opacity-70"
                >
                  {isSavingSystem ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>บันทึกข้อมูลพื้นฐาน</span>
                </button>
              )}

              {activeTab === 'system_health' && (
                <button
                  type="button"
                  onClick={fetchSystemHealth}
                  disabled={isLoadingHealth}
                  className="inline-flex items-center justify-center gap-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition shadow-xs cursor-pointer disabled:opacity-70"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingHealth ? 'animate-spin' : ''}`} />
                  <span>{isLoadingHealth ? 'กำลังวิเคราะห์...' : 'รีเฟรชการวินิจฉัย'}</span>
                </button>
              )}

              {activeTab === 'smtp' && (
                <button
                  type="button"
                  onClick={saveSystemSettings}
                  disabled={isSavingSystem}
                  className="inline-flex items-center justify-center gap-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition shadow-xs cursor-pointer disabled:opacity-70"
                >
                  {isSavingSystem ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>บันทึกข้อมูล SMTP</span>
                </button>
              )}

              {activeTab === 'users' && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center justify-center gap-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition shadow-xs cursor-pointer active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>เพิ่มเจ้าหน้าที่</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Tab Main Card */}
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-2xl p-4 sm:p-6 lg:p-7 shadow-xs">
        {activeTab === 'system_health' && props.user?.role === 'admin' && (
          <div className="max-w-5xl space-y-6 animate-fade-in">
            {/* System Health & Diagnostics Panel (Admin Only) */}
            <div className="space-y-6">

              {/* Top Header & Interactive Control Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[var(--border-light)]">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 dark:from-blue-700 dark:via-blue-900 dark:to-slate-950 border border-blue-400/30 flex items-center justify-center text-white shadow-md shadow-blue-900/20 shrink-0">
                    <Activity className="w-6 h-6 animate-pulse text-blue-200" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                        ศูนย์ตรวจวัดสถานะระบบและวินิจฉัยเครื่องมือเซิร์ฟเวอร์
                      </h3>
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> สิทธิ์ผู้ดูแลระบบ (Admin Only)
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-ping"></span>
                      <span>ระบบตรวจวัดฮาร์ดแวร์ CPU, RAM, V8 Engine, พื้นที่จัดเก็บข้อมูลดิสก์, MySQL และความมั่นคงปลอดภัยสารสนเทศภาครัฐ</span>
                    </p>
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAutoRefreshHealth(!isAutoRefreshHealth)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      isAutoRefreshHealth 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-400 dark:border-emerald-600/50 shadow-xs' 
                        : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-2xs'
                    }`}
                    title="เปิด/ปิดการดึงข้อมูลสดอัตโนมัติทุก 10 วินาที"
                  >
                    <span className={`w-2 h-2 rounded-full ${isAutoRefreshHealth ? 'bg-emerald-600 dark:bg-emerald-400 animate-pulse' : 'bg-slate-400'}`}></span>
                    <span>{isAutoRefreshHealth ? 'รีเฟรชสดอัตโนมัติ (10s)' : 'เปิดรีเฟรชอัตโนมัติ'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={fetchSystemHealth}
                    disabled={isLoadingHealth}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold transition shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingHealth ? 'animate-spin' : ''}`} />
                    <span>{isLoadingHealth ? 'กำลังวิเคราะห์...' : 'รีเฟรชข้อมูล'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportDiagnosticReport}
                    disabled={!systemHealth}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-2xs"
                    title="ดาวน์โหลดรายงานผลการวินิจฉัยระบบไฟล์ .JSON"
                  >
                    <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>ส่งออกรายงาน (.JSON)</span>
                  </button>
                </div>
              </div>

              {/* Executive Summary Cards (4 Top KPIs) */}
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: CPU Hardware */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-4.5 space-y-1.5 shadow-xs hover:shadow-md transition-all backdrop-blur-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 text-blue-800 dark:text-blue-400 font-bold">
                      <Cpu className="w-4 h-4" /> ภาระ CPU (Load)
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">1m / 5m</span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-blue-100">
                      {systemHealth?.cpu?.loadAvg1Min || '0.00'}
                    </span>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      5m: {systemHealth?.cpu?.loadAvg5Min || '0.00'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    {systemHealth?.cpu?.cores || 1} Cores @ {systemHealth?.cpu?.speedGhz || '2.40'} GHz ({systemHealth?.cpu?.benchmarkUs ? `${systemHealth?.cpu?.benchmarkUs} µs` : '< 1ms'})
                  </p>
                </div>

                {/* KPI 2: Host RAM & V8 Heap */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-4.5 space-y-1.5 shadow-xs hover:shadow-md transition-all backdrop-blur-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 text-indigo-800 dark:text-indigo-400 font-bold">
                      <Gauge className="w-4 h-4" /> RAM เครื่องแม่ข่าย
                    </span>
                    <span className="font-mono text-[10px] text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/40">
                      {systemHealth?.systemRam?.usedPercent || '0'}%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-indigo-100">
                      {systemHealth?.systemRam?.usedGb || '0'} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/ {systemHealth?.systemRam?.totalGb || '0'} GB</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    Heap: {systemHealth?.memory?.heapUsedMb || '0'} MB / {systemHealth?.v8Engine?.heapSizeLimitMb || '4096'} MB
                  </p>
                </div>

                {/* KPI 3: Disk Space Capacity */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-4.5 space-y-1.5 shadow-xs hover:shadow-md transition-all backdrop-blur-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 font-bold">
                      <HardDrive className="w-4 h-4" /> พื้นที่ดิสก์คงเหลือ
                    </span>
                    <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40">
                      ใช้ไป {systemHealth?.storage?.diskSpace?.usedPercent || '0'}%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-emerald-100">
                      {systemHealth?.storage?.diskSpace?.freeGb || '0'} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">GB ว่าง</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    ไฟล์แนบ /uploads: {systemHealth?.storage?.diskSpace?.uploadDirSizeFormatted || '0 KB'} ({systemHealth?.storage?.uploadedFilesCount || 0} ไฟล์)
                  </p>
                </div>

                {/* KPI 4: Database Engine Latency */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-4.5 space-y-1.5 shadow-xs hover:shadow-md transition-all backdrop-blur-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 text-blue-900 dark:text-blue-400 font-bold">
                      <Database className="w-4 h-4" /> คลังข้อมูล MySQL
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      systemHealth?.database?.status === 'healthy' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/40' 
                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/40'
                    }`}>
                      {systemHealth?.database?.status === 'healthy' ? 'พร้อมใช้งาน' : 'โหมดสำรอง'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-blue-100">
                      {systemHealth?.database?.latencyMs || 1} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">ms Latency</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    รวมเอกสารทั้งหมด: {systemHealth?.database?.counts?.totalDocs || 0} ฉบับ ({systemHealth?.database?.counts?.users || 0} ผู้ใช้งาน)
                  </p>
                </div>
              </div>

              {/* Interactive Server Diagnostic Action Toolbar */}
              <div className="relative z-10 bg-slate-50/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      เครื่องมือทดสอบ & ตรวจสอบความพร้อมเครื่องแม่ข่าย (Interactive Server Diagnostics)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">คลิกเพื่อสั่งการทดสอบระบบจริงในทันที</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={handleTestDbConnection}
                    disabled={diagRunningAction !== null}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-2xs hover:shadow-xs"
                  >
                    <Database className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${diagRunningAction === 'db' ? 'animate-spin' : ''}`} />
                    <span>{diagRunningAction === 'db' ? 'กำลังทดสอบ...' : 'ทดสอบ MySQL Ping'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestAiEngine}
                    disabled={diagRunningAction !== null}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-indigo-800 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-2xs hover:shadow-xs"
                  >
                    <Zap className={`w-4 h-4 text-indigo-600 dark:text-indigo-400 ${diagRunningAction === 'ai' ? 'animate-spin' : ''}`} />
                    <span>{diagRunningAction === 'ai' ? 'กำลังทดสอบ...' : 'ทดสอบเอนจิน AI'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCleanMemoryCache}
                    disabled={diagRunningAction !== null}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-blue-800 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-2xs hover:shadow-xs"
                  >
                    <Gauge className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${diagRunningAction === 'memory' ? 'animate-spin' : ''}`} />
                    <span>{diagRunningAction === 'memory' ? 'กำลังล้าง...' : 'ล้างแคช Heap RAM'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleVerifyFileStorage}
                    disabled={diagRunningAction !== null}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-slate-200 dark:border-slate-700 hover:border-teal-400 text-teal-800 dark:text-teal-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-2xs hover:shadow-xs"
                  >
                    <HardDrive className={`w-4 h-4 text-teal-600 dark:text-teal-400 ${diagRunningAction === 'storage' ? 'animate-spin' : ''}`} />
                    <span>{diagRunningAction === 'storage' ? 'กำลังตรวจ...' : 'ตรวจไฟล์แนบดิสก์'}</span>
                  </button>
                </div>

                {/* Diagnostic Result Callout Message */}
                {diagActionMsg && (
                  <div className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 animate-fade-in ${
                    diagActionMsg.type === 'success' 
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200' 
                      : diagActionMsg.type === 'error'
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
                        : 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200'
                  }`}>
                    <div className="flex items-start gap-2.5">
                      {diagActionMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <strong className="block font-bold text-xs">{diagActionMsg.title}</strong>
                        <span className="text-[11px] opacity-90">{diagActionMsg.detail}</span>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setDiagActionMsg(null)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Detailed 6-Panel Diagnostic Cards Grid */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Panel 1: CPU Hardware & OS Kernel */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs backdrop-blur-sm">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-blue-900 dark:text-blue-400 font-bold text-sm">
                      <Cpu className="w-4 h-4" />
                      <span>ขุมพลังฮาร์ดแวร์ CPU & โฮสต์ OS (Hardware Core)</span>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-mono font-bold border border-blue-200 dark:border-blue-800/40">
                      {systemHealth?.cpu?.cores || 1} Cores @ {systemHealth?.cpu?.speedGhz || '2.40'} GHz
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">รุ่นหน่วยประมวลผล</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate block" title={systemHealth?.cpu?.model || 'Generic CPU'}>
                        {systemHealth?.cpu?.model || 'Intel / AMD Cloud Instance'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">ระบบปฏิบัติการ Kernel</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                        {systemHealth?.server?.osType || 'Linux'} ({systemHealth?.server?.osRelease || '6.x'})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">ค่าเฉลี่ยภาระ CPU (Load Avg)</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-[11px]">
                        1m: {systemHealth?.cpu?.loadAvg1Min || '0.00'} | 5m: {systemHealth?.cpu?.loadAvg5Min || '0.00'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">ความเร็วตอบสนอง (Benchmark)</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                        {systemHealth?.cpu?.benchmarkUs ? `${systemHealth?.cpu?.benchmarkUs} µs` : '< 1ms'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">ระยะเวลาทำงานกระบวนการ (Process Uptime)</span>
                      <span className="font-bold text-blue-900 dark:text-blue-300 text-[11px]">{systemHealth?.server?.processUptimeFormatted || 'กำลังวิเคราะห์...'}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">ระยะเวลาทำงานแม่ข่าย (Host Uptime)</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">{systemHealth?.server?.sysUptimeFormatted || 'กำลังวิเคราะห์...'}</span>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Host RAM & V8 Heap Memory */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs backdrop-blur-sm">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-400 font-bold text-sm">
                      <Gauge className="w-4 h-4" />
                      <span>หน่วยความจำ RAM & V8 Engine (Memory Diagnostics)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCleanMemoryCache}
                      className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition font-bold border border-indigo-200 dark:border-indigo-800/40 cursor-pointer"
                    >
                      ล้างแคช RAM
                    </button>
                  </div>

                  {/* OS RAM Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">หน่วยความจำเครื่องแม่ข่าย (OS RAM Used):</span>
                      <span className="font-mono text-indigo-900 dark:text-indigo-300 font-bold">
                        {systemHealth?.systemRam?.usedGb || '0'} GB ({systemHealth?.systemRam?.usedPercent || '0'}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, parseFloat(systemHealth?.systemRam?.usedPercent || '0')))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* V8 Node Process Heap Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">Node Heap Memory (Used / Max Limit):</span>
                      <span className="font-mono text-indigo-900 dark:text-indigo-300 font-bold">
                        {systemHealth?.memory?.heapUsedMb || '0'} MB / {systemHealth?.v8Engine?.heapSizeLimitMb || '4096'} MB
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 dark:from-indigo-400 dark:to-indigo-600 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, parseFloat(systemHealth?.memory?.heapPercent || '0')))}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-600 dark:text-slate-300 pt-1 text-center">
                    <div className="bg-slate-50 dark:bg-slate-950/40 py-2 px-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="block text-slate-500 dark:text-slate-400">RSS Allocated</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{systemHealth?.memory?.rssMb || '0'} MB</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/40 py-2 px-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="block text-slate-500 dark:text-slate-400">Malloced Mem</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{systemHealth?.v8Engine?.mallocedMemoryMb || '0'} MB</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/40 py-2 px-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="block text-slate-500 dark:text-slate-400">V8 Heap Limit</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{systemHealth?.v8Engine?.heapSizeLimitMb || '4096'} MB</span>
                    </div>
                  </div>
                </div>

                {/* Panel 3: Database & MySQL Storage */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs backdrop-blur-sm">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-400 font-bold text-sm">
                      <Database className="w-4 h-4" />
                      <span>คลังข้อมูล MySQL & สถิติสารบรรณ (Database Engine)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestDbConnection}
                      className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition font-bold border border-emerald-200 dark:border-emerald-800/40 cursor-pointer"
                    >
                      {systemHealth?.database?.status === 'healthy' ? `Latency ${systemHealth?.database?.latencyMs || 1}ms` : 'ทดสอบ Ping'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">หนังสือรับสารบรรณ</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">{systemHealth?.database?.counts?.inboxDocs || 0} <span className="text-[10px] text-slate-400 font-normal">ฉบับ</span></span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">หนังสือส่งสารบรรณ</span>
                      <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">{systemHealth?.database?.counts?.outboxDocs || 0} <span className="text-[10px] text-slate-400 font-normal">ฉบับ</span></span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">หนังสือเวียน</span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-400 text-sm">{systemHealth?.database?.counts?.circularDocs || 0} <span className="text-[10px] text-slate-400 font-normal">ฉบับ</span></span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">คำสั่ง & ประกาศ</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400 text-sm">{systemHealth?.database?.counts?.adminDocs || 0} <span className="text-[10px] text-slate-400 font-normal">ฉบับ</span></span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-950/70 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">รวมเอกสารสารบรรณทั้งหมด:</span>
                    <span className="font-extrabold text-blue-900 dark:text-blue-300 text-sm">
                      {systemHealth?.database?.counts?.totalDocs || 0} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">ฉบับ</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-[10px] text-slate-600 dark:text-slate-300 pt-1 text-center">
                    <div className="bg-slate-50 dark:bg-slate-950/40 py-1.5 px-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="block text-slate-500 dark:text-slate-400">บุคลากร</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{systemHealth?.database?.counts?.users || 0} คน</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/40 py-1.5 px-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="block text-slate-500 dark:text-slate-400">ฝ่าย/กลุ่มงาน</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{systemHealth?.database?.counts?.departments || 0} ฝ่าย</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/40 py-1.5 px-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="block text-slate-500 dark:text-slate-400">ตำแหน่ง</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{systemHealth?.database?.counts?.positions || 0} ตำแหน่ง</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/40 py-1.5 px-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="block text-slate-500 dark:text-slate-400">ประวัติระบบ</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{systemHealth?.database?.counts?.systemLogs || 0} แถว</span>
                    </div>
                  </div>
                </div>

                {/* Panel 4: Disk Space & File Storage */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs backdrop-blur-sm">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-400 font-bold text-sm">
                      <HardDrive className="w-4 h-4" />
                      <span>พื้นที่จัดเก็บข้อมูลดิสก์ & คลังไฟล์ (Disk Space & Storage)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyFileStorage}
                      className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition font-bold border border-emerald-200 dark:border-emerald-800/40 cursor-pointer"
                    >
                      ตรวจไฟล์แนบ
                    </button>
                  </div>

                  {/* Disk Used Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">พื้นที่ใช้ไป (Used Disk Space):</span>
                      <span className="font-mono text-emerald-800 dark:text-emerald-300 font-bold">
                        {systemHealth?.storage?.diskSpace?.usedGb || '0'} GB ({systemHealth?.storage?.diskSpace?.usedPercent || '0'}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          parseFloat(systemHealth?.storage?.diskSpace?.usedPercent || '0') > 85 
                            ? 'bg-gradient-to-r from-amber-500 to-rose-600' 
                            : 'bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-500 dark:to-teal-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(3, parseFloat(systemHealth?.storage?.diskSpace?.usedPercent || '0')))}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <span>คงเหลือใช้งานได้: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{systemHealth?.storage?.diskSpace?.freeGb || '0'} GB</strong></span>
                      <span>ทั้งหมด: {systemHealth?.storage?.diskSpace?.totalGb || '0'} GB</span>
                    </div>
                  </div>

                  {/* Metric Sub-blocks */}
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-600 dark:text-slate-300 pt-1 text-center">
                    <div className="bg-slate-50 dark:bg-slate-950/40 py-2 px-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="block text-slate-500 dark:text-slate-400">พื้นที่ใช้งานไป</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">{systemHealth?.storage?.diskSpace?.usedGb || '0'} GB</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/40 py-2 px-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="block text-slate-500 dark:text-slate-400">พื้นที่คงเหลือ</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">{systemHealth?.storage?.diskSpace?.freeGb || '0'} GB</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/40 py-2 px-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="block text-slate-500 dark:text-slate-400">ขนาดไฟล์แนบ (/uploads)</span>
                      <span className="font-bold text-blue-900 dark:text-blue-300">{systemHealth?.storage?.diskSpace?.uploadDirSizeFormatted || '0 KB'}</span>
                    </div>
                  </div>
                </div>

                {/* Panel 5: Node Process, File I/O & Network Stack */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs backdrop-blur-sm">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-400 font-bold text-sm">
                      <Server className="w-4 h-4" />
                      <span>เครือข่ายเซิร์ฟเวอร์ & File I/O (Network & I/O Stack)</span>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-mono font-bold border border-indigo-200 dark:border-indigo-800/40">
                      Port 3000 (0.0.0.0)
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">กระบวนการ Process ID (PID):</span>
                      <span className="font-mono font-bold text-indigo-800 dark:text-indigo-300">PID {systemHealth?.server?.pid || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">โซนเวลาเซิร์ฟเวอร์ (Timezone):</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{systemHealth?.server?.timezone || 'Asia/Bangkok (GMT+7)'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">ไฟล์แนบในระบบ (Uploaded Attachments):</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {systemHealth?.storage?.uploadedFilesCount || 0} ไฟล์ (/uploads)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">เครือข่ายการเชื่อมต่อ (Active Network IF):</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                        {systemHealth?.network?.interfaces?.join(', ') || 'eth0, lo'} ({systemHealth?.network?.activeInterfacesCount || 2} interfaces)
                      </span>
                    </div>
                    {systemHealth?.resourceUsage && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400">เวลาการประมวลผลสะสม (CPU Time):</span>
                        <span className="font-mono text-amber-700 dark:text-amber-400 text-[11px]">
                          User: {systemHealth?.resourceUsage?.userCpuTimeSec}s | Sys: {systemHealth?.resourceUsage?.systemCpuTimeSec}s
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-indigo-950/30 border border-blue-200 dark:border-indigo-800/40 text-[11px] text-blue-900 dark:text-indigo-200 flex items-center justify-between">
                    <span>การทำงานผ่าน Nginx Reverse Proxy Container:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> บายพาสพอร์ต 3000 สมบูรณ์
                    </span>
                  </div>
                </div>

                {/* Panel 6: AI Vision & Gemini */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs backdrop-blur-sm">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-400 font-bold text-sm">
                      <Zap className="w-4 h-4" />
                      <span>เอนจินปัญญาประดิษฐ์ (AI Vision & OCR Engine)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestAiEngine}
                      className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition font-bold border border-indigo-200 dark:border-indigo-800/40 cursor-pointer"
                    >
                      ทดสอบ AI
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">โมเดลประมวลผลหลัก:</span>
                      <span className="font-bold text-indigo-800 dark:text-indigo-300 font-mono">AI Engine</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">ลำดับการ Fallback สำรอง:</span>
                      <span className="text-[11px] text-slate-700 dark:text-slate-300 font-mono">2.0 Flash &rarr; 1.5 Flash</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">การตั้งค่า Gemini API Key:</span>
                      {systemHealth?.aiEngine?.apiKeyConfigured ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมใช้งานใน DB
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> พร้อมใช้งาน (Secrets)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 text-[11px] text-purple-900 dark:text-purple-200">
                    รองรับการสแกนเอกสาร ปภ.๑, OCR อ่านข้อความตราครุฑ, ตัดแยกภาพถ่ายความเสียหาย และสกัดลายเซ็นอัตโนมัติ
                  </div>
                </div>

                {/* Panel 7: Enterprise Security & Auth */}
                <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs backdrop-blur-sm md:col-span-2">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold text-sm">
                      <ShieldCheck className="w-4 h-4" />
                      <span>ความปลอดภัยและการรักษาสภาพ (Enterprise Security & Compliance)</span>
                    </div>
                    <span className="text-[10px] px-3 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-700/50">
                      e-Government Security Compliance
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-0.5">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] block">การเข้ารหัสรหัสผ่าน</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">Argon2id Salted Hash</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-0.5">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] block">การยืนยันตัวตน & เซสชัน</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">HTTP-Only Cookie + Bearer</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-0.5">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] block">การควบคุมสิทธิ์ใช้งาน (RBAC)</span>
                      <span className="font-bold text-blue-800 dark:text-blue-300 text-[11px]">4 Roles + Dept 2D Matrix</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-0.5">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] block">มาตรฐานลายมือชื่อดิจิทัล</span>
                      <span className="font-bold text-amber-800 dark:text-amber-300 text-[11px]">SHA-256 + TSA ETDA B.E. 2544</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>ระบบตรวจเช็กการเข้าถึงเอกสารและบันทึกร่องรอยการใช้งาน (Audit Trail Security Log)</span>
                    </div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ตรวจสอบเรียบร้อย
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer status line */}
              <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
                  <span>อัปเดตข้อมูลล่าสุดเมื่อ: {systemHealth?.timestampThai || new Date().toLocaleString('th-TH')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-500 dark:text-slate-400 text-[10px]">
                    Node.js {systemHealth?.server?.nodeVersion || 'v20'} ({systemHealth?.server?.platform || 'Linux'})
                  </span>
                  <span className="font-mono text-slate-600 dark:text-slate-400 text-[10px] bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                    RAYONG-EDMS v2.9.0-PROD-CONTAINER
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="max-w-4xl space-y-6 animate-fade-in">

            <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6">
              <h3 className="text-lg font-sans font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[var(--primary-color)]" /> ชื่อหน่วยงาน
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-[var(--text-secondary)]">ชื่อหน่วยงานที่จะแสดงในระบบ</label>
                  <input 
                    type="text" 
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-[var(--text-secondary)]">ชื่อหน่วยงานบน Header / แถบเมนูด้านข้าง (Navigation Bar)</label>
                  <input 
                    type="text" 
                    value={headerOrgName}
                    onChange={e => setHeaderOrgName(e.target.value)}
                    placeholder="ปล่อยว่างหากต้องการใช้ชื่อเดียวกับหน่วยงานในระบบ"
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition-colors"
                  />
                  <p className="text-xs text-[var(--text-muted)]">ใช้สำหรับแสดงผลตรงส่วนหัวของ Navigation Bar ด้านข้าง สามารถตั้งค่าแยกต่างหากได้</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-sans font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-[var(--primary-color)]" /> ตราครุฑ ๑.๕ ซม. (หนังสือภายใน/บันทึกข้อความ)
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="relative group">
                      <div 
                        onDragOver={(e) => handleDragOverType(e, 'garuda15')}
                        onDragLeave={handleDragLeaveType}
                        onDrop={(e) => handleDropType(e, 'garuda15')}
                        className={`w-24 h-24 rounded-lg border-2 border-dashed bg-[var(--bg-overlay)] flex items-center justify-center overflow-hidden relative transition-all duration-200 ${
                          activeDragType === 'garuda15' 
                            ? 'border-indigo-500 bg-indigo-50/10 scale-105 shadow-md' 
                            : 'border-[var(--border-medium)]'
                        }`}
                      >
                        {garuda15Url ? (
                          <img src={garuda15Url} alt="Garuda 1.5cm" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <Crown className="w-8 h-8 text-[var(--text-muted)]" />
                        )}
                        <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white">
                          <Upload className="w-5 h-5 mb-1" />
                          <span className="text-[10px]">อัปโหลดรูป</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'garuda15')} />
                        </label>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">URL ตราครุฑ ๑.๕ ซม.</label>
                      <input 
                        type="text" 
                        value={garuda15Url}
                        onChange={e => {
                          setGaruda15Url(e.target.value);
                          localStorage.setItem('moi_garuda15', e.target.value);
                        }}
                        placeholder="ปล่อยว่างเพื่อใช้ค่าเริ่มต้น"
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition-colors"
                      />
                      {garuda15Url && (
                        <button
                          onClick={() => {
                            setGaruda15Url('');
                            localStorage.removeItem('moi_garuda15');
                          }}
                          className="text-xs text-red-500 hover:text-red-600 font-medium"
                        >
                          ลบตราครุฑ ๑.๕ ซม.
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-sans font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-[var(--primary-color)]" /> ตราครุฑ ๓.๐ ซม. (หนังสือส่ง/คำสั่ง/ประกาศ)
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="relative group">
                      <div 
                        onDragOver={(e) => handleDragOverType(e, 'garuda30')}
                        onDragLeave={handleDragLeaveType}
                        onDrop={(e) => handleDropType(e, 'garuda30')}
                        className={`w-24 h-24 rounded-lg border-2 border-dashed bg-[var(--bg-overlay)] flex items-center justify-center overflow-hidden relative transition-all duration-200 ${
                          activeDragType === 'garuda30' 
                            ? 'border-indigo-500 bg-indigo-50/10 scale-105 shadow-md' 
                            : 'border-[var(--border-medium)]'
                        }`}
                      >
                        {garuda30Url ? (
                          <img src={garuda30Url} alt="Garuda 3.0cm" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <Crown className="w-8 h-8 text-[var(--text-muted)]" />
                        )}
                        <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white">
                          <Upload className="w-5 h-5 mb-1" />
                          <span className="text-[10px]">อัปโหลดรูป</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'garuda30')} />
                        </label>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">URL ตราครุฑ ๓.๐ ซม.</label>
                      <input 
                        type="text" 
                        value={garuda30Url}
                        onChange={e => {
                          setGaruda30Url(e.target.value);
                          localStorage.setItem('moi_garuda30', e.target.value);
                        }}
                        placeholder="ปล่อยว่างเพื่อใช้ค่าเริ่มต้น"
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition-colors"
                      />
                      {garuda30Url && (
                        <button
                          onClick={() => {
                            setGaruda30Url('');
                            localStorage.removeItem('moi_garuda30');
                          }}
                          className="text-xs text-red-500 hover:text-red-600 font-medium"
                        >
                          ลบตราครุฑ ๓.๐ ซม.
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-sans font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5 text-[var(--primary-color)]" /> โลโก้หน่วยงาน
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="relative group">
                      <div 
                        onDragOver={(e) => handleDragOverType(e, 'logo')}
                        onDragLeave={handleDragLeaveType}
                        onDrop={(e) => handleDropType(e, 'logo')}
                        className={`w-24 h-24 rounded-lg border-2 border-dashed bg-[var(--bg-overlay)] flex items-center justify-center overflow-hidden relative transition-all duration-200 ${
                          activeDragType === 'logo' 
                            ? 'border-indigo-500 bg-indigo-50/10 scale-105 shadow-md' 
                            : 'border-[var(--border-medium)]'
                        }`}
                      >
                        {logoUrl ? (
                          <img
                            src={getLogoSrc(logoUrl)}
                            alt="Logo"
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const fallback = 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png';
                              if (target.src !== fallback) {
                                target.src = fallback;
                              }
                            }}
                          />
                        ) : (
                          <img src="https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png" alt="Default Logo" className="max-w-full max-h-full object-contain opacity-70" />
                        )}
                        <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white">
                          <Upload className="w-5 h-5 mb-1" />
                          <span className="text-[10px]">อัปโหลดรูป</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
                        </label>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">URL รูปภาพ</label>
                      <input 
                        type="text" 
                        value={logoUrl}
                        onChange={e => setLogoUrl(e.target.value)}
                        placeholder="ปล่อยว่างเพื่อใช้ค่าเริ่มต้น"
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition-colors"
                      />
                      {logoUrl && (
                        <button
                          onClick={() => setLogoUrl('')}
                          className="text-xs text-red-500 hover:text-red-600 font-medium"
                        >
                          ลบโลโก้
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-sans font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[var(--primary-color)]" /> Favicon (ไอคอนแท็บ)
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="relative group">
                      <div 
                        onDragOver={(e) => handleDragOverType(e, 'favicon')}
                        onDragLeave={handleDragLeaveType}
                        onDrop={(e) => handleDropType(e, 'favicon')}
                        className={`w-24 h-24 rounded-lg border-2 border-dashed bg-[var(--bg-overlay)] flex items-center justify-center overflow-hidden relative transition-all duration-200 ${
                          activeDragType === 'favicon' 
                            ? 'border-indigo-500 bg-indigo-50/10 scale-105 shadow-md' 
                            : 'border-[var(--border-medium)]'
                        }`}
                      >
                        {faviconUrl ? (
                          <img src={faviconUrl} alt="Favicon" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <Camera className="w-8 h-8 text-[var(--text-muted)]" />
                        )}
                        <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white">
                          <Upload className="w-5 h-5 mb-1" />
                          <span className="text-[10px]">อัปโหลดรูป</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'favicon')} />
                        </label>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">URL รูปภาพ Favicon</label>
                      <input 
                        type="text" 
                        value={faviconUrl}
                        onChange={e => setFaviconUrl(e.target.value)}
                        placeholder="ปล่อยว่างเพื่อใช้ค่าเริ่มต้น"
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition-colors"
                      />
                      {faviconUrl && (
                        <button
                          onClick={() => setFaviconUrl('')}
                          className="text-xs text-red-500 hover:text-red-600 font-medium"
                        >
                          ลบ Favicon
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6">
              <h3 className="text-lg font-sans font-medium text-[var(--text-primary)] mb-1 flex items-center gap-2">
                <Key className="w-5 h-5 text-[var(--primary-color)]" /> ตั้งค่า Gemini API Key (สำหรับ AI สแกนและถอดความเอกสาร)
              </h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                กำหนด Key จาก Google AI Studio เพื่อใช้สแกน อ่าน และถอดความเอกสารราชการโดยอัตโนมัติ ข้อมูลจะถูกจัดเก็บไว้ในฐานข้อมูล MySQL
              </p>
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-secondary)] font-medium">Google Gemini API Key</label>
                <div className="relative flex items-center">
                  <input 
                    type={showGeminiKey ? "text" : "password"} 
                    value={geminiApiKey}
                    onChange={e => setGeminiApiKey(e.target.value)}
                    placeholder="ระบุ Gemini API Key (เช่น AIzaSy...)"
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg pl-4 pr-24 py-2.5 text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition-colors font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-2 px-3 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-md font-medium transition-colors"
                  >
                    {showGeminiKey ? 'ซ่อน Key' : 'แสดง Key'}
                  </button>
                </div>
                {geminiApiKey ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> บันทึก Gemini API Key ในระบบเรียบร้อยแล้ว
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> ยังไม่ได้กำหนด API Key ในฐานข้อมูล (ระบบจะลองใช้จาก Settings &gt; Secrets เป็นลำดับถัดไป)
                  </p>
                )}
              </div>
            </div>



            <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6">
              <h3 className="text-lg font-sans font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Type className="w-5 h-5 text-[var(--primary-color)]" /> ข้อความส่วนท้าย (Footer)
              </h3>
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-secondary)]">ข้อความที่จะแสดงส่วนท้ายของทุกหน้า</label>
                <input 
                  type="text" 
                  value={footerText}
                  onChange={e => setFooterText(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition-colors"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-light)] flex justify-end">
              <button 
                onClick={saveSystemSettings}
                disabled={isSavingSystem}
                className="flex items-center gap-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg disabled:opacity-70"
              >
                {isSavingSystem ? 'กำลังบันทึก...' : <><Save className="w-4 h-4" /> บันทึกการตั้งค่า</>}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'smtp' && (
          <div className="max-w-xl space-y-6 animate-fade-in">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6">
              <h3 className="text-lg font-sans font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-[var(--primary-color)]" /> การเชื่อมต่อ SMTP สำหรับส่งอีเมล
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg bg-[var(--bg-overlay)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all"
                    placeholder="e.g., smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">SMTP Port</label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg bg-[var(--bg-overlay)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all"
                    placeholder="587 หรือ 465"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">SMTP User (อีเมล)</label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg bg-[var(--bg-overlay)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">SMTP Password</label>
                  <input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg bg-[var(--bg-overlay)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">ชื่อผู้ส่ง (From Name / Email)</label>
                  <input
                    type="text"
                    value={smtpFrom}
                    onChange={(e) => setSmtpFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg bg-[var(--bg-overlay)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all"
                    placeholder='"ระบบสารบรรณ" <no-reply@example.com>'
                  />
                </div>
              </div>
            </div>

            {/* Test Email & Preview Box */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-500" /> รูปแบบและทดสอบส่งอีเมล OTP
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    อีเมล OTP จะใช้ตราโลโก้, ชื่อหน่วยงาน และ Footer ตามที่ตั้งค่าไว้ในหน้าระบบ
                  </p>
                </div>
                <button
                  onClick={() => setShowOtpPreviewModal(true)}
                  className="px-3.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-500/20 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> ดูตัวอย่างรูปแบบอีเมล
                </button>
              </div>

              <div className="pt-2 border-t border-[var(--border-lighter)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="ระบุอีเมลผู้รับทดสอบ (เช่น test@example.com)"
                  className="flex-1 px-3 py-2 border border-[var(--border-medium)] rounded-lg bg-[var(--bg-overlay)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                />
                <button
                  onClick={handleSendTestEmail}
                  disabled={isSendingTestEmail}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {isSendingTestEmail ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  ส่งอีเมลทดสอบ
                </button>
              </div>
            </div>
            
            <div className="flex justify-end pt-2">
              <button
                onClick={saveSystemSettings}
                disabled={isSavingSystem}
                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
              >
                {isSavingSystem ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                บันทึกข้อมูล SMTP
              </button>
            </div>
          </div>
        )}

        {activeTab === 'system_doc' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[var(--bg-canvas)] p-1.5 rounded-xl border border-[var(--border-light)] shadow-2xs">
              <button 
                type="button"
                onClick={() => setActiveSystemDocTab('docSettings')}
                className={`px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeSystemDocTab === 'docSettings' 
                    ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] font-semibold shadow-xs border border-[var(--border-medium)]' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
                }`}
              >
                <SettingsIcon className="w-4 h-4 shrink-0" />
                <span className="truncate">ปีการใช้งาน</span>
              </button>
              <button 
                type="button"
                onClick={() => setActiveSystemDocTab('customNumbering')}
                className={`px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeSystemDocTab === 'customNumbering' 
                    ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] font-semibold shadow-xs border border-[var(--border-medium)]' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
                }`}
              >
                <Hash className="w-4 h-4 shrink-0" />
                <span className="truncate">เลขหนังสือ & แฟ้ม</span>
              </button>
              <button 
                type="button"
                onClick={() => setActiveSystemDocTab('departments')}
                className={`px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeSystemDocTab === 'departments' 
                    ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] font-semibold shadow-xs border border-[var(--border-medium)]' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="truncate">แผนก/กลุ่มงาน</span>
                {departments.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-overlay)] text-[var(--text-muted)] border border-[var(--border-lighter)] hidden md:inline">
                    {departments.length}
                  </span>
                )}
              </button>
              <button 
                type="button"
                onClick={() => setActiveSystemDocTab('positions')}
                className={`px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeSystemDocTab === 'positions' 
                    ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] font-semibold shadow-xs border border-[var(--border-medium)]' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
                }`}
              >
                <Briefcase className="w-4 h-4 shrink-0" />
                <span className="truncate">ตำแหน่งงาน</span>
                {positions.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-overlay)] text-[var(--text-muted)] border border-[var(--border-lighter)] hidden md:inline">
                    {positions.length}
                  </span>
                )}
              </button>
            </div>

            {activeSystemDocTab === 'customNumbering' && (
              <CustomNumberingSettings />
            )}

            {activeSystemDocTab === 'docSettings' && (
              <div className="max-w-xl space-y-6">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6">
                  <h3 className="text-lg font-sans font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[var(--primary-color)]" /> ปีการใช้งานปัจจุบัน
                  </h3>
                  <div className="space-y-2">
                    <label className="text-sm text-[var(--text-secondary)]">ปี พ.ศ. (เช่น 2569)</label>
                    <input 
                      type="number" 
                      value={currentYear}
                      onChange={e => setCurrentYear(Number(e.target.value))}
                      className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition-colors"
                    />
                  </div>
                </div>



                <div className="pt-4 border-t border-[var(--border-light)] flex justify-end">
                  <button 
                    onClick={saveSystemSettings}
                    disabled={isSavingSystem}
                    className="flex items-center gap-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg disabled:opacity-70"
                  >
                    {isSavingSystem ? 'กำลังบันทึก...' : <><Save className="w-4 h-4" /> บันทึกการตั้งค่า</>}
                  </button>
                </div>
              </div>
            )}
        {activeSystemDocTab === 'departments' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-sans font-medium text-[var(--text-primary)]">รายชื่อแผนก/กลุ่มงาน</h3>
              <button 
                onClick={() => setShowAddDeptModal(true)}
                className="flex items-center gap-2 bg-[var(--primary-dark)] hover:bg-[var(--primary-hover)] border border-[var(--primary-color)]/30 text-[var(--primary-color)] px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                <Plus className="w-4 h-4" /> เพิ่มแผนก
              </button>
            </div>

            {isLoadingDepartments ? (
              <div className="text-center py-12 text-[var(--text-secondary)]">กำลังโหลดข้อมูล...</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-surface)] border-b border-[var(--border-light)] text-[var(--text-secondary)] text-sm">
                      <th className="py-3 px-4 font-medium">ชื่อแผนก/กลุ่มงาน</th>
                      <th className="py-3 px-4 font-medium">รายละเอียด</th>
                      <th className="py-3 px-4 font-medium text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-[var(--text-secondary)]">ไม่พบข้อมูลแผนก</td>
                      </tr>
                    ) : departments.map(dept => (
                      <tr key={dept.id} className="border-b border-[var(--border-lighter)] hover:bg-[var(--border-lighter)] transition-colors group">
                        <td className="py-3 px-4">
                          <input 
                            type="text"
                            value={dept.name || ''}
                            onChange={(e) => setDepartments(departments.map(d => String(d.id) === String(dept.id) ? { ...d, name: e.target.value } : d))}
                            onBlur={(e) => updateDepartment(dept.id, 'name', e.target.value)}
                            className="bg-transparent border border-transparent hover:border-[var(--border-medium)] focus:border-[var(--primary-color)] focus:bg-[var(--bg-surface)] rounded px-2 py-1 outline-none text-[var(--text-primary)] transition-colors w-full"
                            placeholder="ชื่อแผนก..."
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input 
                            type="text"
                            value={dept.description || ''}
                            onChange={(e) => setDepartments(departments.map(d => String(d.id) === String(dept.id) ? { ...d, description: e.target.value } : d))}
                            onBlur={(e) => updateDepartment(dept.id, 'description', e.target.value)}
                            className="bg-transparent border border-transparent hover:border-[var(--border-medium)] focus:border-[var(--primary-color)] focus:bg-[var(--bg-surface)] rounded px-2 py-1 outline-none text-[var(--text-primary)] transition-colors w-full"
                            placeholder="รายละเอียด..."
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-xs ${isSavingDepartment === String(dept.id) ? 'text-[var(--primary-color)] font-medium' : 'text-transparent group-hover:text-[var(--text-muted)]'} transition-colors`}>
                              {isSavingDepartment === String(dept.id) ? 'กำลังบันทึก...' : 'บันทึกอัตโนมัติ'}
                            </span>
                            <button
                              onClick={() => confirmDeleteDepartment(dept)}
                              className="p-1.5 text-[var(--text-secondary)] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="ลบแผนก/กลุ่มงานนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSystemDocTab === 'positions' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
              <div>
                <h3 className="text-lg font-sans font-medium text-[var(--text-primary)] flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[var(--primary-color)]" /> รายชื่อตำแหน่งงานในหน่วยงาน
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  รายการตำแหน่งจะถูกดึงและจัดเก็บในฐานข้อมูล MySQL (ตาราง positions) เพื่อใช้เป็นตัวเลือกมาตรฐานสำหรับบุคลากร
                </p>
              </div>
              <button 
                onClick={() => setShowAddPosModal(true)}
                className="flex items-center gap-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" /> เพิ่มตำแหน่งงาน
              </button>
            </div>

            {isLoadingPositions ? (
              <div className="text-center py-12 text-[var(--text-secondary)]">กำลังโหลดข้อมูลตำแหน่งงาน...</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-surface)] border-b border-[var(--border-light)] text-[var(--text-secondary)] text-sm">
                      <th className="py-3 px-4 font-medium w-16">#</th>
                      <th className="py-3 px-4 font-medium min-w-[220px]">ชื่อตำแหน่งงาน</th>
                      <th className="py-3 px-4 font-medium">รายละเอียด / กลุ่มงาน</th>
                      <th className="py-3 px-4 font-medium text-right w-28">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-[var(--text-secondary)]">ไม่พบข้อมูลตำแหน่งงาน</td>
                      </tr>
                    ) : positions.map((pos, index) => (
                      <tr key={pos.id} className="border-b border-[var(--border-lighter)] hover:bg-[var(--border-lighter)] transition-colors group">
                        <td className="py-3 px-4 text-xs font-mono text-[var(--text-muted)]">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4">
                          <input 
                            type="text"
                            value={pos.name || ''}
                            onChange={(e) => setPositions(positions.map(p => String(p.id) === String(pos.id) ? { ...p, name: e.target.value } : p))}
                            onBlur={(e) => updatePosition(pos.id, 'name', e.target.value)}
                            className="bg-transparent border border-transparent hover:border-[var(--border-medium)] focus:border-[var(--primary-color)] focus:bg-[var(--bg-surface)] rounded px-2 py-1 outline-none text-[var(--text-primary)] font-medium transition-colors w-full"
                            placeholder="ชื่อตำแหน่ง..."
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input 
                            type="text"
                            value={pos.description || ''}
                            onChange={(e) => setPositions(positions.map(p => String(p.id) === String(pos.id) ? { ...p, description: e.target.value } : p))}
                            onBlur={(e) => updatePosition(pos.id, 'description', e.target.value)}
                            className="bg-transparent border border-transparent hover:border-[var(--border-medium)] focus:border-[var(--primary-color)] focus:bg-[var(--bg-surface)] rounded px-2 py-1 outline-none text-[var(--text-primary)] transition-colors w-full"
                            placeholder="รายละเอียด / กลุ่มงาน..."
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isSavingPosition === String(pos.id) ? (
                              <span className="text-xs text-[var(--primary-color)] animate-pulse">กำลังบันทึก...</span>
                            ) : (
                              <button
                                onClick={() => confirmDeletePosition(pos)}
                                title="ลบตำแหน่ง"
                                className="p-1 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-5 animate-fade-in">
            {/* Sub-tabs: User Directory vs Live Real-time Activity */}
            <div className="flex items-center gap-2 border-b border-[var(--border-light)] pb-3">
              <button
                type="button"
                onClick={() => setUserSubTab('list')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  userSubTab === 'list'
                    ? 'bg-[var(--primary-color)] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-light)]'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>รายชื่อบุคลากร ({users.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setUserSubTab('realtime')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  userSubTab === 'realtime'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>ติดตามกิจกรรมผู้ใช้ Real-time ({onlineUsersCount || 0})</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-700/30 text-white font-mono font-bold">
                  LIVE
                </span>
              </button>
            </div>

            {userSubTab === 'realtime' ? (
              <ActiveUsersRealtimeView 
                onNavigateToLogs={() => props.onNavigateTab ? props.onNavigateTab('logs') : undefined} 
                departments={departments} 
              />
            ) : (
            <>
            {/* Header & Controls */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-sans font-semibold text-[var(--text-primary)]">จัดการเจ้าหน้าที่ในหน่วยงาน</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">เชื่อมโยงข้อมูลฝ่ายงาน และรักษาความปลอดภัยด้วยรหัสผ่าน Argon2id</p>
                </div>
                
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center justify-center gap-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white px-4 py-2.5 rounded-xl font-medium transition text-sm shadow-xs active:scale-95 cursor-pointer w-full sm:w-auto shrink-0"
                >
                  <UserPlus className="w-4 h-4" /> 
                  <span>เพิ่มเจ้าหน้าที่</span>
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="ค้นหาชื่อ, ชื่อผู้ใช้, ตำแหน่ง..."
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition"
                  />
                  {userSearchTerm && (
                    <button 
                      onClick={() => setUserSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Briefcase className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={userPosFilter}
                    onChange={(e) => setUserPosFilter(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition"
                  >
                    <option value="ALL">ทุกตำแหน่งงาน ({positions.length})</option>
                    {positions.map((pos: any) => (
                      <option key={pos.id} value={pos.name}>{pos.name}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Filter className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={userDeptFilter}
                    onChange={(e) => setUserDeptFilter(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition"
                  >
                    <option value="ALL">ทุกฝ่าย / กลุ่มงาน ({departments.length})</option>
                    {departments.map((dept: any) => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div className="hidden lg:flex items-center justify-end text-xs text-[var(--text-muted)] font-medium px-1">
                  จำนวนทั้งหมด: <span className="text-[var(--text-primary)] font-bold ml-1">{users.filter(u => {
                    const matchesSearch = !userSearchTerm || 
                      (u.username || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                      (u.firstName || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                      (u.lastName || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                      (u.position || '').toLowerCase().includes(userSearchTerm.toLowerCase());
                    const matchesDept = userDeptFilter === 'ALL' || u.department === userDeptFilter;
                    const matchesPos = userPosFilter === 'ALL' || u.position === userPosFilter;
                    return matchesSearch && matchesDept && matchesPos;
                  }).length}</span> รายการ
                </div>
              </div>
            </div>

            {/* Argon2 Security Banner */}
            <div className="p-3.5 rounded-xl bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/30 flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--primary-color)] shrink-0" />
                <span className="leading-relaxed">
                  <strong>การเข้ารหัสรหัสผ่านมาตรฐาน Argon2id:</strong> รหัสผ่านได้รับการป้องกันด้วยอัลกอริทึม Argon2id
                </span>
              </div>
              <span className="hidden sm:inline-block px-2.5 py-1 bg-[var(--primary-color)]/20 text-[var(--primary-color)] rounded-lg font-mono text-[11px] font-semibold shrink-0">
                Argon2id Active
              </span>
            </div>

            {isLoadingUsers ? (
              <div className="text-center py-12 text-[var(--text-secondary)]">กำลังโหลดข้อมูลบุคลากร...</div>
            ) : (() => {
              const filteredUsers = users.filter(user => {
                const matchesSearch = !userSearchTerm || 
                  (user.username || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                  (user.firstName || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                  (user.lastName || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                  (user.position || '').toLowerCase().includes(userSearchTerm.toLowerCase());
                const matchesDept = userDeptFilter === 'ALL' || user.department === userDeptFilter;
                const matchesPos = userPosFilter === 'ALL' || user.position === userPosFilter;
                return matchesSearch && matchesDept && matchesPos;
              });

              if (filteredUsers.length === 0) {
                return (
                  <div className="text-center py-12 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-light)] text-[var(--text-secondary)]">
                    <UserIcon className="w-10 h-10 mx-auto opacity-30 mb-2" />
                    <p className="font-medium">ไม่พบข้อมูลเจ้าหน้าที่ในระบบ</p>
                    <p className="text-xs opacity-75 mt-1">ลองปรับการค้นหาหรือเลือกฝ่ายงานอื่น</p>
                  </div>
                );
              }

              return (
                <>
                  {/* Desktop Table Layout (Visible on md screens and up) */}
                  <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--border-light)] bg-[var(--bg-surface)] shadow-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[var(--bg-canvas)] border-b border-[var(--border-light)]">
                          <th className="py-3.5 px-5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">บัญชีผู้ใช้</th>
                          <th className="py-3.5 px-5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">ข้อมูลติดต่อ</th>
                          <th className="py-3.5 px-5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">ชื่อ - นามสกุล</th>
                          <th className="py-3.5 px-5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">ฝ่าย & ตำแหน่ง</th>
                          <th className="py-3.5 px-5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">สิทธิ์ระบบ</th>
                          <th className="py-3.5 px-5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(user => {
                          const isEditingAdmin = user.role === 'admin';
                          const isCurrentModerator = props.user?.role === 'moderator';
                          const canEditThisUser = !isCurrentModerator || !isEditingAdmin;

                          return (
                      <tr key={user.id} className={`border-b border-[var(--border-lighter)] last:border-b-0 hover:bg-[var(--bg-overlay)] transition-colors group ${!canEditThisUser ? 'opacity-80' : ''}`}>
                        <td className="py-3.5 px-5 align-top">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary-color)]/20 to-[var(--primary-hover)]/20 text-[var(--primary-color)] flex items-center justify-center shrink-0 font-bold text-sm shadow-inner">
                              {(user.firstName || user.username || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-sans font-bold text-sm text-[var(--text-primary)]">@{user.username || '-'}</div>
                              <div className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-mono font-medium border border-emerald-500/20">
                                <Lock className="w-2.5 h-2.5" /> Argon2id
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 align-top">
                          <div className="relative group/input">
                            <Mail className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 group-hover/input:text-[var(--primary-color)] transition-colors" />
                            <input 
                              type="email"
                              value={user.email || ""}
                              disabled={!canEditThisUser}
                              onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, email: e.target.value } : u))}
                              onBlur={(e) => updateUser(user.id, "email", e.target.value)}
                              className={`bg-transparent border border-transparent hover:border-[var(--border-medium)] focus:border-[var(--primary-color)] focus:bg-[var(--bg-canvas)] rounded-lg pl-8 pr-3 py-1.5 outline-none text-xs text-[var(--text-primary)] transition-all w-full focus:shadow-sm ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                              placeholder="อีเมลติดต่อ"
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-5 align-top">
                          <div className="flex flex-col gap-1.5">
                            <input 
                              type="text"
                              value={user.firstName || ''}
                              disabled={!canEditThisUser}
                              onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, firstName: e.target.value } : u))}
                              onBlur={(e) => updateUser(user.id, 'firstName', e.target.value)}
                              className={`bg-transparent border border-transparent hover:border-[var(--border-medium)] focus:border-[var(--primary-color)] focus:bg-[var(--bg-canvas)] rounded-lg px-2.5 py-1 outline-none text-xs font-medium text-[var(--text-primary)] transition-all w-full focus:shadow-sm ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                              placeholder="ชื่อจริง"
                            />
                            <input 
                              type="text"
                              value={user.lastName || ''}
                              disabled={!canEditThisUser}
                              onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, lastName: e.target.value } : u))}
                              onBlur={(e) => updateUser(user.id, 'lastName', e.target.value)}
                              className={`bg-transparent border border-transparent hover:border-[var(--border-medium)] focus:border-[var(--primary-color)] focus:bg-[var(--bg-canvas)] rounded-lg px-2.5 py-1 outline-none text-xs text-[var(--text-secondary)] transition-all w-full focus:shadow-sm ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                              placeholder="นามสกุล"
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-5 align-top">
                          <div className="flex flex-col gap-2">
                            <select 
                              value={user.department || (departments.length > 0 ? departments[0].name : 'ฝ่ายยุทธศาสตร์และการจัดการ')}
                              disabled={!canEditThisUser}
                              onChange={(e) => updateUser(user.id, 'department', e.target.value)}
                              className={`bg-transparent hover:bg-[var(--bg-canvas)] border border-transparent hover:border-[var(--border-light)] rounded-lg px-2 py-1 outline-none text-xs font-medium text-[var(--text-primary)] focus:border-[var(--primary-color)] transition-all w-full ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                            >
                              {departments.length === 0 ? (
                                <option value="ฝ่ายยุทธศาสตร์และการจัดการ">ฝ่ายยุทธศาสตร์และการจัดการ</option>
                              ) : (
                                departments.map((dept: any) => (
                                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                                ))
                              )}
                            </select>
                            <select 
                              value={user.position || ''}
                              disabled={!canEditThisUser}
                              onChange={(e) => updateUser(user.id, 'position', e.target.value)}
                              className={`bg-transparent hover:bg-[var(--bg-canvas)] border border-transparent hover:border-[var(--border-light)] rounded-lg px-2 py-1 outline-none text-[11px] text-[var(--text-secondary)] focus:border-[var(--primary-color)] transition-all w-full ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                            >
                              <option value="">-- ไม่ระบุตำแหน่ง --</option>
                              {positions.map((pos: any) => (
                                <option key={pos.id} value={pos.name}>{pos.name}</option>
                              ))}
                              {user.position && !positions.some(p => p.name === user.position) && (
                                <option value={user.position}>{user.position}</option>
                              )}
                            </select>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 align-top">
                          <select 
                            value={user.role || 'user'}
                            disabled={!canEditThisUser}
                            onChange={(e) => updateUser(user.id, 'role', e.target.value)}
                            className={`bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-lg px-3 py-1.5 outline-none text-xs font-bold ${
                              user.role === 'admin' ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' : 
                              user.role === 'moderator' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20' : 
                              'text-[var(--text-primary)]'
                            } focus:border-[var(--primary-color)] transition-colors ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                          >
                            <option value="user">ผู้ใช้งานทั่วไป</option>
                            <option value="moderator">ผู้ตรวจสอบ/สารบรรณ</option>
                            {(props.user?.role === 'admin' || user.role === 'admin') && (
                              <option value="admin">ผู้ดูแลระบบ</option>
                            )}
                          </select>
                        </td>
                        <td className="py-3.5 px-5 text-right align-top">
                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            {canEditThisUser ? (
                              <>
                                <button
                                  onClick={() => setResetPassUser(user)}
                                  title="เปลี่ยนรหัสผ่าน (Argon2id)"
                                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary-color)] hover:bg-[var(--primary-color)]/15 rounded-xl transition-colors cursor-pointer"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => confirmDeleteUser(user)}
                                  title="ลบข้อมูลเจ้าหน้าที่"
                                  className="p-2 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/15 rounded-xl transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-[var(--text-muted)] font-medium italic px-2 py-1 bg-[var(--bg-canvas)] rounded-md border border-[var(--border-lighter)]">
                                Admin Only
                              </span>
                            )}
                          </div>
                          {isSavingUser === String(user.id) && (
                            <div className="text-[10px] text-[var(--primary-color)] font-medium mt-2 animate-pulse pr-1">
                              บันทึก...
                            </div>
                          )}
                        </td>
                      </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards Layout (Visible on sm/mobile screens) */}
              <div className="block md:hidden space-y-3.5">
                {filteredUsers.map(user => {
                  const isEditingAdmin = user.role === 'admin';
                  const isCurrentModerator = props.user?.role === 'moderator';
                  const canEditThisUser = !isCurrentModerator || !isEditingAdmin;

                  return (
                  <div 
                    key={user.id} 
                    className={`bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-4 shadow-sm space-y-4 ${!canEditThisUser ? 'opacity-85' : ''}`}
                  >
                    {/* Card Top Row: User Avatar, Username & Actions */}
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-lighter)]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary-color)]/20 to-[var(--primary-hover)]/20 text-[var(--primary-color)] flex items-center justify-center shrink-0 font-bold text-base shadow-inner">
                          {(user.firstName || user.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-sans text-sm font-bold text-[var(--text-primary)] truncate">@{user.username}</span>
                            {user.role === 'admin' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold rounded-md shrink-0 border border-amber-500/20">
                                <Crown className="w-2.5 h-2.5" /> Admin
                              </span>
                            )}
                            {user.role === 'moderator' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-bold rounded-md shrink-0 border border-blue-500/20">
                                <ShieldCheck className="w-2.5 h-2.5" /> Moderator
                              </span>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[9px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-mono mt-1 border border-emerald-500/20 font-medium">
                            <Lock className="w-2.5 h-2.5" /> Argon2id
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {canEditThisUser ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => setResetPassUser(user)}
                              className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary-color)] hover:bg-[var(--primary-color)]/15 rounded-xl transition cursor-pointer"
                              title="เปลี่ยนรหัสผ่าน"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => confirmDeleteUser(user)}
                              className="p-2 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/15 rounded-xl transition cursor-pointer"
                              title="ลบข้อมูล"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[var(--text-muted)] font-medium italic px-2 py-1 bg-[var(--bg-canvas)] rounded-md border border-[var(--border-lighter)]">
                            Admin Only
                          </span>
                        )}
                        {isSavingUser === String(user.id) && (
                          <div className="text-[9px] text-[var(--primary-color)] font-medium animate-pulse">
                            กำลังบันทึก...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 px-1">อีเมลติดต่อ</label>
                        <div className="relative group/input">
                          <Mail className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            value={user.email || ""}
                            disabled={!canEditThisUser}
                            onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, email: e.target.value } : u))}
                            onBlur={(e) => updateUser(user.id, "email", e.target.value)}
                            className={`w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition-all ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                            placeholder="user@example.com"
                          />
                        </div>
                      </div>

                      {/* Editable Form Fields Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 px-1">ชื่อ</label>
                          <input 
                            type="text"
                            value={user.firstName || ''}
                            disabled={!canEditThisUser}
                            onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, firstName: e.target.value } : u))}
                            onBlur={(e) => updateUser(user.id, 'firstName', e.target.value)}
                            className={`w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition-all ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                            placeholder="ชื่อจริง"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 px-1">นามสกุล</label>
                          <input 
                            type="text"
                            value={user.lastName || ''}
                            disabled={!canEditThisUser}
                            onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, lastName: e.target.value } : u))}
                            onBlur={(e) => updateUser(user.id, 'lastName', e.target.value)}
                            className={`w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition-all ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                            placeholder="นามสกุล"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 px-1">ฝ่าย / กลุ่มงาน</label>
                          <select 
                            value={user.department || (departments.length > 0 ? departments[0].name : 'ฝ่ายยุทธศาสตร์และการจัดการ')}
                            disabled={!canEditThisUser}
                            onChange={(e) => updateUser(user.id, 'department', e.target.value)}
                            className={`w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-2.5 py-2 text-xs font-medium text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition-all ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                          >
                            {departments.length === 0 ? (
                              <option value="ฝ่ายยุทธศาสตร์และการจัดการ">ฝ่ายยุทธศาสตร์และการจัดการ</option>
                            ) : (
                              departments.map((dept: any) => (
                                <option key={dept.id} value={dept.name}>{dept.name}</option>
                              ))
                            )}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 px-1">ตำแหน่ง</label>
                          <select 
                            value={user.position || ''}
                            disabled={!canEditThisUser}
                            onChange={(e) => updateUser(user.id, 'position', e.target.value)}
                            className={`w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition-all ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                          >
                            <option value="">-- ไม่ระบุตำแหน่ง --</option>
                            {positions.map((pos: any) => (
                              <option key={pos.id} value={pos.name}>{pos.name}</option>
                            ))}
                            {user.position && !positions.some(p => p.name === user.position) && (
                              <option value={user.position}>{user.position}</option>
                            )}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1.5 px-1">สิทธิ์การใช้งาน (Role)</label>
                        <select 
                          value={user.role || 'user'}
                          disabled={!canEditThisUser}
                          onChange={(e) => updateUser(user.id, 'role', e.target.value)}
                          className={`w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs font-bold ${
                            user.role === 'admin' ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' : 
                            user.role === 'moderator' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20' : 
                            'text-[var(--text-primary)]'
                          } focus:border-[var(--primary-color)] outline-none transition-colors ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                        >
                          <option value="user">ผู้ใช้งานทั่วไป (User)</option>
                          <option value="moderator">ผู้ตรวจสอบ/สารบรรณ (Moderator)</option>
                          {(props.user?.role === 'admin' || user.role === 'admin') && (
                            <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </>
          );
        })()}
            </>
            )}
          </div>
        )}

        {activeTab === 'active_users' && (
          <ActiveUsersRealtimeView 
            onNavigateToLogs={() => props.onNavigateTab ? props.onNavigateTab('logs') : undefined} 
            departments={departments} 
          />
        )}

        {activeTab === 'permissions' && (() => {
          const permissionsList = [
            {
              section: '1. งานสารบรรณหลัก และเอกสาร (Core Document Operations)',
              items: [
                {
                  key: 'view_all_docs',
                  title: 'ดูข้อมูลเอกสารสารบรรณทั้งหมด (View All Documents)',
                  desc: 'สิทธิ์ในการสืบค้น ค้นหา และเปิดดูเอกสารราชการทั้งหมดในระบบสารบรรณ (หากปิด จะดูได้เฉพาะระดับฝ่ายงานตนเอง)',
                  note: 'ใช้ควบคุมความลับและการเข้าถึงเอกสารข้ามฝ่ายงาน'
                },
                {
                  key: 'create_docs',
                  title: 'เพิ่ม / ออกเลข / ลงทะเบียนหนังสือ (Create & Register Docs)',
                  desc: 'สิทธิ์ในการออกเลขทะเบียนรับ-ส่ง ออกเลขคำสั่ง/ประกาศ หรือลงทะเบียนหนังสือราชการเข้าระบบ',
                  note: 'ป้องกันการลงทะเบียนหนังสือซ้ำซ้อน'
                },
                {
                  key: 'edit_all_docs',
                  title: 'แก้ไขข้อมูลเอกสารของผู้อื่น (Edit All Documents)',
                  desc: 'สิทธิ์ในการแก้ไขรายละเอียด ฟิลด์ข้อมูล หรืออัปโหลดไฟล์แนบเพิ่มเติมของเอกสารอื่น',
                  note: 'หากปิด จะแก้ไขได้เฉพาะเอกสารที่ตนเองสร้างขึ้น'
                },
                {
                  key: 'delete_docs',
                  title: 'ลบข้อมูลเอกสาร / ย้ายเข้าคลังกู้คืน (Delete Documents)',
                  desc: 'สิทธิ์การส่งเอกสารไปที่คลังกู้คืน หรือลบรายการเอกสารที่ไม่ถูกต้องออกจากระบบสารบรรณ',
                  note: 'แนะนำให้เปิดเฉพาะ Admin และ Moderator'
                },
                {
                  key: 'approve_docs',
                  title: 'อนุมัติเอกสาร / ลงนามดิจิทัล (Approve & Sign Docs)',
                  desc: 'สิทธิ์สำหรับผู้บริหารและหัวหน้ากลุ่มงานในการอนุมัติขั้นตอน และลงลายมือชื่อดิจิทัล PKI',
                  note: 'ต้องใช้ใบรับรองอิเล็กทรอนิกส์สำหรับลงนาม'
                },
                {
                  key: 'export_docs',
                  title: 'ส่งออกข้อมูลรายงานและเอกสาร (Export Reports & Data)',
                  desc: 'สิทธิ์ในการดาวน์โหลดรายงานสารบรรณ สรุปสถิติ หรือส่งออกไฟล์เป็น Excel/PDF/ZIP',
                  note: 'จำกัดสิทธิ์การนำข้อมูลภายนอกองค์กร'
                }
              ]
            },
            {
              section: '2. ระบบงานธุรการ และผู้ช่วยดิจิทัล (Admin Tools, AI & Infographics)',
              items: [
                {
                  key: 'admin_docs',
                  title: 'ระบบงานธุรการและแบบฟอร์ม (Admin Forms & Orders)',
                  desc: 'สิทธิ์เข้าถึงงานธุรการ คำสั่ง ประกาศ ขอซื้อขอจ้าง ขอใช้รถราชการ และจองห้องประชุม',
                  note: 'ครอบคลุมงานสนับสนุนและธุรการกลาง'
                },
                {
                  key: 'urgent_incidents',
                  title: 'แบบรายงานเหตุด่วนสาธารณภัย (Urgent Incidents)',
                  desc: 'สิทธิ์เข้าถึง สร้าง แก้ไข และลบ แบบฟอร์มรายงานเหตุด่วนสาธารณภัย และดูแดชบอร์ดสรุปผล',
                  note: 'สำหรับฝ่ายสงเคราะห์ผู้ประสบภัยโดยเฉพาะ'
                },
                {
                  key: 'ai_assistant',
                  title: 'ผู้ช่วย AI Smart สารบรรณ (AI Assistant & Auto Draft)',
                  desc: 'สิทธิ์ใช้งาน AI ในการสรุปเนื้อหาหนังสือ ยกร่างหนังสือตอบกลับอัตโนมัติ และสืบค้นระเบียบ',
                  note: 'ช่วยเพิ่มความเร็วและถูกต้องในการร่างหนังสือ'
                },
                {
                  key: 'infographics',
                  title: 'เครื่องมือออกแบบ Infographics (Infographics Editor)',
                  desc: 'สิทธิ์ใช้งานสตูดิโอออกแบบสื่อประชาสัมพันธ์ สไลด์นำเสนอ และแผนภูมิสรุปผลงาน',
                  note: 'รองรับการบันทึกโปรเจกต์และดาวน์โหลดภาพ high-res'
                },
                {
                  key: 'qr_generator',
                  title: 'เครื่องมือสร้าง QR Code สารบรรณ & สติ๊กเกอร์ (QR Code Studio & PDF Label)',
                  desc: 'สิทธิ์ใช้งานเครื่องมือสร้าง QR Code เอกสารสารบรรณ แทรกใน PDF และจัดพิมพ์สติ๊กเกอร์บาร์โค้ด',
                  note: 'ช่วยให้ประชาชนและเจ้าหน้าที่สแกนตรวจสอบสถานะหนังสือได้รวดเร็ว'
                },
                {
                  key: 'draft_docs',
                  title: 'ระบบร่างและจัดทำหนังสือ (Draft Documents Management)',
                  desc: 'สิทธิ์ในการสร้าง บันทึกร่างหนังสือ ตรวจสอบร่าง และเสนอพิจารณาตามลำดับชั้น',
                  note: 'ช่วยตรวจสอบก่อนลงรับหรือออกเลขจริง'
                }
              ]
            },
            {
              section: '3. แฟ้มดิจิทัล กระบวนการทำงาน และความปลอดภัย (Folders, Workflow, Signatures & Bin)',
              items: [
                {
                  key: 'digital_folders',
                  title: 'แฟ้มเอกสารดิจิทัลและตู้ลับ (Digital Folders & Cabinet)',
                  desc: 'สิทธิ์สร้าง จัดการ จัดหมวดหมู่ และจัดเก็บหนังสือลงแฟ้มฝ่ายงาน หรือตู้เอกสารควบคุมลับ',
                  note: 'ควบคุมชั้นความลับของแฟ้มงาน'
                },
                {
                  key: 'workflow_sla',
                  title: 'ผังการเดินเอกสารและติดตาม SLA (Workflow & SLA Tracking)',
                  desc: 'สิทธิ์ตรวจสอบและบริหารจัดการผังเสนอหนังสือ เสนอความเห็น เกษียณหนังสือ และควบคุมเวลา SLA ตามระเบียบสารบรรณ พ.ศ. 2526',
                  note: 'ควบคุมเวลาประมวลผลหนังสือเสนอผู้บังคับบัญชา'
                },
                {
                  key: 'digital_signatures',
                  title: 'ศูนย์ลงนามดิจิทัล ETDA (Digital Signatures Hub)',
                  desc: 'สิทธิ์เข้าถึงศูนย์ตรวจสอบและลงนามดิจิทัลตามมาตรฐาน ETDA Gateway',
                  note: 'ตรวจสอบความถูกต้องของใบรับรองลายมือชื่อ'
                },
                {
                  key: 'recycle_bin',
                  title: 'คลังกู้คืนเอกสาร (Recycle Bin & Restore)',
                  desc: 'สิทธิ์เข้าถึงคลังกู้คืนระบบ กู้คืนหนังสือที่ถูกลบ หรือทำลายเอกสารทิ้งถาวร',
                  note: 'กู้คืนเอกสารที่ถูกลบโดยไม่ตั้งใจ'
                }
              ]
            },
            {
              section: '4. การบริหารจัดการและตั้งค่าระบบ (User Management & System Settings)',
              items: [
                {
                  key: 'manage_users',
                  title: 'จัดการผู้ใช้งานและบทบาท (User & Role Management)',
                  desc: 'สิทธิ์ในการเพิ่ม แก้ไข กำหนดฝ่ายงาน หรือระงับบัญชีผู้ใช้งานในระบบ',
                  note: 'สงวนสิทธิ์การเปลี่ยน Role ให้ Admin เท่านั้น'
                },
                {
                  key: 'system_settings',
                  title: 'ตั้งค่าระบบและเลขสารบรรณ (System Settings & SMTP)',
                  desc: 'สิทธิ์ตั้งค่ารูปแบบเลขสารบรรณ ข้อมูลสำนักงาน โครงสร้างฝ่ายงาน และเมลเซิร์ฟเวอร์',
                  note: 'สิทธิ์ขั้นสูงระดับโครงสร้างระบบ'
                },
                {
                  key: 'backup_restore',
                  title: 'สำรองและคืนค่าข้อมูลระบบ (Backup & Restore .tar)',
                  desc: 'สิทธิ์ในการดาวน์โหลดไฟล์ .tar สำรองข้อมูลระบบทั้งหมด หรือสั่งคืนค่าฐานข้อมูล',
                  note: 'ป้องกันความเสียหายของข้อมูลราชการ'
                },
                {
                  key: 'audit_logs',
                  title: 'ดูประวัติบันทึกระบบ (Security Audit History Logs)',
                  desc: 'สิทธิ์ในการสืบค้นประวัติการเข้าใช้งาน การแก้ไข และกิจกรรมความปลอดภัยเชิงลึก',
                  note: 'ใช้สำหรับการตรวจสอบเชิงกฎหมายและ IT Audit'
                },
                {
                  key: 'manage_changelog',
                  title: 'จัดการประวัติเวอร์ชันระบบ (Changelog & Release Notes Management)',
                  desc: 'สิทธิ์ในการสร้าง แก้ไข ลบ บันทึกประวัติการเปลี่ยนแปลงของระบบ (Changelog) และแนบรูปภาพพรีวิวฟังก์ชัน',
                  note: 'สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น'
                }
              ]
            }
          ];

          const defaultDeptList = [
            { id: 'd1', name: 'ฝ่ายบริหารงานทั่วไป', description: 'งานธุรการ งานสารบรรณกลาง และงานอำนวยการ' },
            { id: 'd2', name: 'ฝ่ายยุทธศาสตร์และการจัดการ', description: 'งานแผนงาน งบประมาณ และยุทธศาสตร์พัฒนา' },
            { id: 'd3', name: 'ฝ่ายป้องกันและบรรเทาสาธารณภัย', description: 'งานป้องกัน บรรเทา และเตรียมพร้อมรับมือภัยพิบัติ' },
            { id: 'd4', name: 'ฝ่ายสงเคราะห์ผู้ประสบภัย', description: 'งานฟื้นฟู สังคมสงเคราะห์ และช่วยเหลือผู้ประสบภัย' },
            { id: 'd5', name: 'ฝ่ายส่งเสริมและพัฒนา', description: 'งานฝึกอบรมวิชาชีพ และพัฒนาชุมชนท้องถิ่น' }
          ];

          const effectiveDepartments = departments.length > 0 ? departments : defaultDeptList;
          const displayedDepartments = permissionDeptFilter === 'ALL' 
            ? effectiveDepartments 
            : effectiveDepartments.filter((d: any) => d.name === permissionDeptFilter);

          // Calculate active permission count per role dynamically
          const totalKeysCount = permissionsList.reduce((acc, sec) => acc + sec.items.length, 0);
          const getActiveCount = (role: string) => {
            const rolePerms = rolePermissions.filter(p => p.role === role && p.is_allowed === 1);
            return rolePerms.length;
          };

          const getDeptActiveCount = (deptName: string) => {
            const deptKey = `dept:${deptName}`;
            const deptPerms = rolePermissions.filter(p => p.role === deptKey && p.is_allowed === 1);
            if (deptPerms.length > 0) return deptPerms.length;
            const defaultKeys = ['create_docs', 'export_docs', 'ai_assistant', 'infographics', 'qr_generator', 'draft_docs', 'digital_folders', 'workflow_sla', 'urgent_incidents'];
            return defaultKeys.length;
          };

          const adminActiveCount = getActiveCount('admin');
          const modActiveCount = getActiveCount('moderator');
          const userActiveCount = getActiveCount('user');

          // Filter by search term
          const filteredSections = permissionsList.map(sec => {
            if (!permissionSearchTerm.trim()) return sec;
            const term = permissionSearchTerm.toLowerCase();
            const matchedItems = sec.items.filter(item => 
              item.title.toLowerCase().includes(term) ||
              item.desc.toLowerCase().includes(term) ||
              item.key.toLowerCase().includes(term)
            );
            return { ...sec, items: matchedItems };
          }).filter(sec => sec.items.length > 0);

          const renderToggle = (roleOrDept: string, key: string, isMobileInline: boolean = false) => {
            const perm = rolePermissions.find(p => p.role === roleOrDept && p.permission_key === key);
            let isAllowed = false;
            let isExplicit = false;

            if (perm) {
              isAllowed = perm.is_allowed === 1 || perm.is_allowed === true;
              isExplicit = true;
            } else {
              if (roleOrDept === 'admin') isAllowed = true;
              else if (roleOrDept === 'moderator') isAllowed = !['system_settings', 'backup_restore', 'audit_logs'].includes(key);
              else if (roleOrDept === 'user') isAllowed = ['create_docs', 'export_docs', 'ai_assistant', 'infographics', 'qr_generator', 'draft_docs', 'digital_folders', 'workflow_sla', 'urgent_incidents'].includes(key);
              else if (roleOrDept.startsWith('dept:')) {
                isAllowed = ['create_docs', 'export_docs', 'ai_assistant', 'infographics', 'qr_generator', 'draft_docs', 'digital_folders', 'workflow_sla', 'urgent_incidents'].includes(key);
              }
            }

            const updateKey = `${roleOrDept}-${key}`;
            const isUpdating = isUpdatingPermission === updateKey;
            const isAdmin = props.user?.role === 'admin';
            
            // Protect Admin from self-lockout
            const isProtected = roleOrDept === 'admin' && (key === 'system_settings' || key === 'manage_users');

            const isDept = roleOrDept.startsWith('dept:');
            const roleColorClass = isDept 
              ? 'bg-indigo-600' 
              : roleOrDept === 'admin' 
                ? 'bg-amber-500' 
                : roleOrDept === 'moderator' 
                  ? 'bg-indigo-600' 
                  : 'bg-emerald-500';

            if (isMobileInline) {
              return (
                <div className="flex items-center gap-2">
                  <button
                    disabled={!isAdmin || isProtected || isLoadingPermissions || isUpdating}
                    onClick={() => handleTogglePermission(roleOrDept, key, isAllowed ? 1 : 0)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isAllowed ? roleColorClass : 'bg-slate-300 dark:bg-slate-700'
                    } ${(!isAdmin || isProtected) ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 active:scale-95 shadow-xs'}`}
                    title={isProtected ? 'สงวนสิทธิ์ขั้นต่ำสำหรับ Admin (ห้ามปิด)' : !isAdmin ? 'เฉพาะ Admin ที่แก้ไขสิทธิ์ได้' : 'คลิกเพื่อสลับสิทธิ์การใช้งาน'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isAllowed ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className={`text-[11px] font-bold tracking-tight ${isAllowed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    {isUpdating ? 'บันทึก...' : isAllowed ? (isExplicit ? 'เปิด' : 'เปิด (Default)') : (isExplicit ? 'ปิด' : 'ปิด (Default)')}
                  </span>
                </div>
              );
            }

            return (
              <div className="flex flex-col items-center justify-center gap-1 py-1">
                <button
                  disabled={!isAdmin || isProtected || isLoadingPermissions || isUpdating}
                  onClick={() => handleTogglePermission(roleOrDept, key, isAllowed ? 1 : 0)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isAllowed ? roleColorClass : 'bg-slate-200 dark:bg-slate-700'
                  } ${(!isAdmin || isProtected) ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 active:scale-95 shadow-sm'}`}
                  title={isProtected ? 'สงวนสิทธิ์ขั้นต่ำสำหรับ Admin (ห้ามปิด)' : !isAdmin ? 'เฉพาะ Admin ที่แก้ไขสิทธิ์ได้' : 'คลิกเพื่อสลับสิทธิ์การใช้งาน'}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isAllowed ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className={`text-[10px] font-bold tracking-tight ${isAllowed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {isUpdating ? 'บันทึก...' : isAllowed ? (isExplicit ? 'เปิด' : 'เปิด (Default)') : (isExplicit ? 'ปิด' : 'ปิด (Default)')}
                </span>
              </div>
            );
          };

          return (
            <div className="space-y-6 animate-fade-in">
              {/* Header banner */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
                        <Shield className="w-6 h-6 text-indigo-400" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold font-sans text-white">
                        การกำหนดสิทธิ์ผู้ใช้งาน (Role & Permission Control Hub)
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl pt-1">
                      ระบบบริหารจัดการสิทธิ์แบบ 2 มิติ (2D Permission Engine) รองรับทั้งการแบ่งตามบทบาทผู้ใช้ (User Roles) 
                      และสิทธิ์เจาะจงรายฝ่าย/กลุ่มงาน (Department-Level Overrides) สามารถปรับเปลี่ยนยืดหยุ่นและมีผลทันทีทั่วทั้งองค์กร
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-white/10 shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                      <Crown className="w-3.5 h-3.5 text-amber-400" /> Admin ({adminActiveCount}/{totalKeysCount})
                    </div>
                    <span className="text-slate-500 text-xs">&gt;</span>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Moderator ({modActiveCount}/{totalKeysCount})
                    </div>
                    <span className="text-slate-500 text-xs">&gt;</span>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                      <UserIcon className="w-3.5 h-3.5 text-emerald-400" /> User ({userActiveCount}/{totalKeysCount})
                    </div>
                  </div>
                </div>
              </div>

              {/* Control Mode Switcher Tabs */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] p-2 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar p-0.5">
                  <button
                    type="button"
                    onClick={() => setPermissionViewMode('roles')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      permissionViewMode === 'roles'
                        ? 'bg-[var(--primary-color)] text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-canvas)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>กำหนดสิทธิ์ตามบทบาท (User Roles)</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${permissionViewMode === 'roles' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-[var(--text-muted)]'}`}>
                      3 บทบาท
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPermissionViewMode('departments')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      permissionViewMode === 'departments'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-canvas)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>กำหนดสิทธิ์เจาะจงตามฝ่าย/กลุ่มงาน (Departments)</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${permissionViewMode === 'departments' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-[var(--text-muted)]'}`}>
                      {effectiveDepartments.length} ฝ่าย
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPermissionViewMode('combined')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      permissionViewMode === 'combined'
                        ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-800'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-canvas)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>ตารางภาพรวมทุกสิทธิ์ (Combined Matrix)</span>
                  </button>
                </div>

                {permissionViewMode === 'departments' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl shrink-0 text-xs">
                    <Filter className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                    <span className="text-[var(--text-muted)] font-medium">กรองฝ่ายงาน:</span>
                    <select
                      value={permissionDeptFilter}
                      onChange={(e) => setPermissionDeptFilter(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-[var(--text-primary)] outline-none cursor-pointer"
                    >
                      <option value="ALL">แสดงทุกฝ่าย ({effectiveDepartments.length})</option>
                      {effectiveDepartments.map((d: any) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Conditional Summary Cards View */}
              {permissionViewMode === 'roles' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Admin Card */}
                  <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-amber-500/30 shadow-sm space-y-3.5 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                            <Crown className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-[var(--text-primary)]">Admin (ผู้ดูแลระบบ)</h4>
                            <span className="text-xs text-[var(--text-muted)]">สิทธิ์สูงสุดควบคุมโครงสร้างระบบ</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                          Level 1
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        มีสิทธิ์จัดการระบบสารบรรณเต็มรูปแบบ จัดการบทบาทผู้ใช้ ตั้งค่าเลขสารบรรณ และสำรองข้อมูล
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[var(--border-lighter)]">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-[var(--text-muted)]">สถานะสิทธิ์ในระบบ:</span>
                        <span className="text-amber-500">{adminActiveCount} / {totalKeysCount} ฟังก์ชัน</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${(adminActiveCount / totalKeysCount) * 100}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Moderator Card */}
                  <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-indigo-500/30 shadow-sm space-y-3.5 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-[var(--text-primary)]">Moderator (ผู้ตรวจสอบ)</h4>
                            <span className="text-xs text-[var(--text-muted)]">หัวหน้ากลุ่มงาน / เจ้าหน้าที่สารบรรณ</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-500 border border-indigo-500/30">
                          Level 2
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        มีสิทธิ์ออกเลขสารบรรณ ตรวจสอบร่างหนังสือ อนุมัติเอกสาร ลงนามดิจิทัล และดูแลผู้ใช้ในฝ่าย
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[var(--border-lighter)]">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-[var(--text-muted)]">สถานะสิทธิ์ในระบบ:</span>
                        <span className="text-indigo-500">{modActiveCount} / {totalKeysCount} ฟังก์ชัน</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${(modActiveCount / totalKeysCount) * 100}%` }} />
                      </div>
                      {props.user?.role === 'admin' && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleBatchToggleRole('moderator', 1)}
                            disabled={isLoadingPermissions}
                            className="flex-1 py-1 px-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors"
                          >
                            เปิดสิทธิ์ทั้งหมด
                          </button>
                          <button
                            onClick={() => handleBatchToggleRole('moderator', 0)}
                            disabled={isLoadingPermissions}
                            className="flex-1 py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                          >
                            ปิดสิทธิ์ทั้งหมด
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User Card */}
                  <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-emerald-500/30 shadow-sm space-y-3.5 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                            <UserIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-[var(--text-primary)]">User (ผู้ใช้งานทั่วไป)</h4>
                            <span className="text-xs text-[var(--text-muted)]">เจ้าหน้าที่ผู้ปฏิบัติงาน</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                          Level 3
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        สร้างและแก้ไขเอกสารของตนเอง ใช้งาน AI สารบรรณ ออกแบบ Infographics และจัดเก็บลงแฟ้มงาน
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[var(--border-lighter)]">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-[var(--text-muted)]">สถานะสิทธิ์ในระบบ:</span>
                        <span className="text-emerald-500">{userActiveCount} / {totalKeysCount} ฟังก์ชัน</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${(userActiveCount / totalKeysCount) * 100}%` }} />
                      </div>
                      {props.user?.role === 'admin' && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleBatchToggleRole('user', 1)}
                            disabled={isLoadingPermissions}
                            className="flex-1 py-1 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800 transition-colors"
                          >
                            เปิดสิทธิ์ทั้งหมด
                          </button>
                          <button
                            onClick={() => handleBatchToggleRole('user', 0)}
                            disabled={isLoadingPermissions}
                            className="flex-1 py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                          >
                            ปิดสิทธิ์ทั้งหมด
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Department Cards View */}
              {permissionViewMode === 'departments' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedDepartments.map((dept: any) => {
                    const count = getDeptActiveCount(dept.name);
                    const deptRoleKey = `dept:${dept.name}`;
                    return (
                      <div key={dept.id || dept.name} className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-indigo-500/20 shadow-xs space-y-3 relative overflow-hidden flex flex-col justify-between hover:border-indigo-500/40 transition-all">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">{dept.name}</h4>
                                <span className="text-[10px] text-[var(--text-muted)] block line-clamp-1">{dept.description || 'กลุ่มงานภายในองค์กร'}</span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                              Dept
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-[var(--border-lighter)]">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-[var(--text-muted)]">สิทธิ์เฉพาะเปิดใช้งาน:</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{count} / {totalKeysCount}</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${(count / totalKeysCount) * 100}%` }} />
                          </div>
                          {props.user?.role === 'admin' && (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => handleBatchToggleRole(deptRoleKey, 1)}
                                disabled={isLoadingPermissions}
                                className="flex-1 py-1 px-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 text-[10px] font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors"
                              >
                                เปิดสิทธิ์เฉพาะทั้งหมด
                              </button>
                              <button
                                onClick={() => handleBatchToggleRole(deptRoleKey, 0)}
                                disabled={isLoadingPermissions}
                                className="flex-1 py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 text-[10px] font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                              >
                                รีเซ็ตสิทธิ์
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Combined View Notice */}
              {permissionViewMode === 'combined' && (
                <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">ตารางเปรียบเทียบสิทธิ์ทุกบทบาทและฝ่ายงาน (2D Combined Matrix)</h4>
                      <p className="text-xs text-indigo-300/80">
                        ตารางจะแสดงบทบาทหลัก (Admin, Moderator, User) เคียงคู่กับฝ่ายงานที่เลือกเพื่อสอบทานและเปรียบเทียบสิทธิ์โดยรวม
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-indigo-300">ฝ่ายงานที่แสดง:</span>
                    <select
                      value={permissionDeptFilter}
                      onChange={(e) => setPermissionDeptFilter(e.target.value)}
                      className="bg-indigo-900/80 border border-indigo-500/40 text-xs font-bold text-white rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
                    >
                      <option value="ALL">ทุกฝ่าย ({effectiveDepartments.length})</option>
                      {effectiveDepartments.map((d: any) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Dynamic Search & Control Header */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 bg-[var(--bg-elevated)] border-b border-[var(--border-lighter)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[var(--primary-color)]" />
                    <h4 className="font-bold text-[var(--text-primary)] text-sm sm:text-base font-sans">
                      แผงตารางควบคุมสิทธิ์ทุกฟังก์ชัน (Role Permission Matrix)
                    </h4>
                  </div>

                  {/* Search Bar & Refresh */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="ค้นหาฟังก์ชันหรือสิทธิ์..."
                        value={permissionSearchTerm}
                        onChange={(e) => setPermissionSearchTerm(e.target.value)}
                        className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                      />
                      {permissionSearchTerm && (
                        <button 
                          onClick={() => setPermissionSearchTerm('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button
                      onClick={fetchRolePermissions}
                      disabled={isLoadingPermissions}
                      className="p-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors"
                      title="โหลดข้อมูลสิทธิ์ใหม่"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingPermissions ? 'animate-spin text-[var(--primary-color)]' : ''}`} />
                    </button>
                  </div>
                </div>

                {props.user?.role !== 'admin' && (
                  <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>คุณกำลังดูตารางสิทธิ์ในโหมดอ่านอย่างเดียว (Read-only) เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถสลับการเปิด/ปิดสิทธิ์ได้</span>
                  </div>
                )}

                {isLoadingPermissions ? (
                  <div className="p-12 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-[var(--primary-color)] mx-auto" />
                    <p className="text-sm text-[var(--text-muted)]">กำลังอัปเดตและดึงข้อมูลกำหนดสิทธิ์จากเซิร์ฟเวอร์...</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card List View (< md) */}
                    <div className="block md:hidden p-3 sm:p-4 space-y-4">
                      {filteredSections.length === 0 ? (
                        <div className="p-8 text-center text-[var(--text-muted)] bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-lighter)]">
                          ไม่พบฟังก์ชันที่ตรงกับคำค้นหา "{permissionSearchTerm}"
                        </div>
                      ) : (
                        filteredSections.map((sec, idx) => (
                          <div key={idx} className="space-y-3">
                            {/* Section Header */}
                            <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs font-bold text-[var(--primary-color)]">
                              <span className="w-2 h-2 rounded-full bg-[var(--primary-color)] shrink-0" />
                              <span>{sec.section}</span>
                            </div>

                            {/* Section Permission Items */}
                            <div className="space-y-3">
                              {sec.items.map((item) => (
                                <div
                                  key={item.key}
                                  className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] shadow-xs space-y-3"
                                >
                                  {/* Header Info */}
                                  <div className="space-y-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <h5 className="font-bold text-[var(--text-primary)] text-xs sm:text-sm leading-snug">
                                        {item.title}
                                      </h5>
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-[var(--text-secondary)] border border-[var(--border-lighter)] shrink-0">
                                        {item.key}
                                      </span>
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                      {item.desc}
                                    </p>
                                  </div>

                                  {/* Security Note */}
                                  <div className="p-2.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-lighter)] text-[11px] text-[var(--text-muted)] flex items-start gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-semibold text-[var(--text-primary)] block">{item.note}</span>
                                      <span className="text-[10px]">ควบคุมสิทธิ์การเข้าถึงและการมองเห็นในระบบ</span>
                                    </div>
                                  </div>

                                  {/* Roles Toggle Controls (Mobile Grid) */}
                                  <div className="pt-2 border-t border-[var(--border-lighter)] space-y-2">
                                    <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                                      {permissionViewMode === 'roles' ? 'สิทธิ์แยกตามระดับผู้ใช้งาน (Role Permissions)' : permissionViewMode === 'departments' ? 'สิทธิ์แยกตามฝ่าย/กลุ่มงาน (Department Permissions)' : 'สิทธิ์แบบรวมทุกมิติ (2D Permissions Matrix)'}
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                      {/* Roles View */}
                                      {(permissionViewMode === 'roles' || permissionViewMode === 'combined') && (
                                        <>
                                          <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                                                <Crown className="w-3.5 h-3.5" />
                                              </div>
                                              <div>
                                                <span className="text-xs font-bold text-[var(--text-primary)]">Admin</span>
                                                <span className="text-[10px] text-[var(--text-muted)] block">ผู้ดูแลระบบ</span>
                                              </div>
                                            </div>
                                            <div>{renderToggle('admin', item.key, true)}</div>
                                          </div>

                                          <div className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                              </div>
                                              <div>
                                                <span className="text-xs font-bold text-[var(--text-primary)]">Moderator</span>
                                                <span className="text-[10px] text-[var(--text-muted)] block">ผู้ตรวจสอบ/สารบรรณ</span>
                                              </div>
                                            </div>
                                            <div>{renderToggle('moderator', item.key, true)}</div>
                                          </div>

                                          <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                                                <UserIcon className="w-3.5 h-3.5" />
                                              </div>
                                              <div>
                                                <span className="text-xs font-bold text-[var(--text-primary)]">User</span>
                                                <span className="text-[10px] text-[var(--text-muted)] block">ผู้ใช้งานทั่วไป</span>
                                              </div>
                                            </div>
                                            <div>{renderToggle('user', item.key, true)}</div>
                                          </div>
                                        </>
                                      )}

                                      {/* Departments View */}
                                      {(permissionViewMode === 'departments' || permissionViewMode === 'combined') && (
                                        displayedDepartments.map((dept: any) => (
                                          <div key={dept.id || dept.name} className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                                                <Building2 className="w-3.5 h-3.5" />
                                              </div>
                                              <div>
                                                <span className="text-xs font-bold text-[var(--text-primary)]">{dept.name}</span>
                                                <span className="text-[10px] text-[var(--text-muted)] block">ฝ่าย/กลุ่มงาน</span>
                                              </div>
                                            </div>
                                            <div>{renderToggle(`dept:${dept.name}`, item.key, true)}</div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Desktop Table View (>= md) */}
                    <div className="hidden md:block overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-sm border-collapse min-w-[850px]">
                        <thead>
                          <tr className="bg-[var(--bg-canvas)] border-b border-[var(--border-lighter)] text-xs font-semibold text-[var(--text-secondary)]">
                            <th className="p-4 w-1/3">ฟังก์ชันระบบ / รายการสิทธิ์การใช้งาน</th>
                            
                            {(permissionViewMode === 'roles' || permissionViewMode === 'combined') && (
                              <>
                                <th className="p-4 text-center w-32 bg-amber-500/5 text-amber-600 dark:text-amber-400 font-bold border-x border-[var(--border-lighter)]/40">
                                  <div className="flex items-center justify-center gap-1">
                                    <Crown className="w-3.5 h-3.5" /> Admin
                                  </div>
                                </th>
                                <th className="p-4 text-center w-32 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 font-bold border-x border-[var(--border-lighter)]/40">
                                  <div className="flex items-center justify-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Moderator
                                  </div>
                                </th>
                                <th className="p-4 text-center w-32 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold border-x border-[var(--border-lighter)]/40">
                                  <div className="flex items-center justify-center gap-1">
                                    <UserIcon className="w-3.5 h-3.5" /> User
                                  </div>
                                </th>
                              </>
                            )}

                            {(permissionViewMode === 'departments' || permissionViewMode === 'combined') && (
                              displayedDepartments.map((dept: any) => (
                                <th key={dept.id || dept.name} className="p-4 text-center min-w-[140px] bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 font-bold border-x border-[var(--border-lighter)]/40">
                                  <div className="flex items-center justify-center gap-1 text-[11px]">
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span className="line-clamp-1" title={dept.name}>{dept.name}</span>
                                  </div>
                                </th>
                              ))
                            )}

                            <th className="p-4">ข้อแนะนำและผลกระทบเชิงความปลอดภัย</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-lighter)] text-xs sm:text-sm">
                          {filteredSections.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="p-8 text-center text-[var(--text-muted)]">
                                ไม่พบฟังก์ชันที่ตรงกับคำค้นหา "{permissionSearchTerm}"
                              </td>
                            </tr>
                          ) : (
                            filteredSections.map((sec, idx) => (
                              <React.Fragment key={idx}>
                                <tr className="bg-[var(--bg-canvas)]/80 font-bold text-[var(--primary-color)] text-xs border-y border-[var(--border-lighter)]">
                                  <td colSpan={10} className="py-3 px-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[var(--primary-color)] inline-block" />
                                    {sec.section}
                                  </td>
                                </tr>
                                {sec.items.map((item) => (
                                  <tr key={item.key} className="hover:bg-[var(--border-lighter)]/30 transition-colors">
                                    <td className="p-4">
                                      <div className="font-semibold text-[var(--text-primary)] text-sm">{item.title}</div>
                                      <div className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{item.desc}</div>
                                      <div className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-[var(--text-secondary)] border border-[var(--border-lighter)]">
                                        key: {item.key}
                                      </div>
                                    </td>

                                    {(permissionViewMode === 'roles' || permissionViewMode === 'combined') && (
                                      <>
                                        <td className="p-4 text-center bg-amber-500/5 border-x border-[var(--border-lighter)]/40 align-middle">
                                          {renderToggle('admin', item.key)}
                                        </td>
                                        <td className="p-4 text-center bg-indigo-500/5 border-x border-[var(--border-lighter)]/40 align-middle">
                                          {renderToggle('moderator', item.key)}
                                        </td>
                                        <td className="p-4 text-center bg-emerald-500/5 border-x border-[var(--border-lighter)]/40 align-middle">
                                          {renderToggle('user', item.key)}
                                        </td>
                                      </>
                                    )}

                                    {(permissionViewMode === 'departments' || permissionViewMode === 'combined') && (
                                      displayedDepartments.map((dept: any) => (
                                        <td key={dept.id || dept.name} className="p-4 text-center bg-indigo-500/5 border-x border-[var(--border-lighter)]/40 align-middle">
                                          {renderToggle(`dept:${dept.name}`, item.key)}
                                        </td>
                                      ))
                                    )}

                                    <td className="p-4 text-[var(--text-secondary)] text-xs leading-relaxed align-middle">
                                      <div className="p-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] space-y-1">
                                        <div className="font-semibold text-[var(--text-primary)]">{item.note}</div>
                                        <div className="text-[11px] text-[var(--text-muted)]">
                                          มีผลกับการเข้าถึงหน้าต่าง ย่อ/ขยายเมนู และปุ่มดำเนินการในระบบ
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {activeTab === 'backup' && (
          <div className="space-y-6 sm:space-y-8 animate-fade-in">
            {/* Header section */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-5 sm:p-7 shadow-sm bg-gradient-to-br from-[var(--bg-surface)] via-[var(--bg-surface)] to-indigo-500/5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
                <div className="p-3.5 sm:p-4 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-500/20 shrink-0 shadow-sm">
                  <Database className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                      สำรองและคืนค่าข้อมูลระบบ (Backup & Restore Management)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      System Disaster Recovery
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-4xl">
                    จัดการส่งออกและนำเข้าข้อมูลระบบสารบรรณอิเล็กทรอนิกส์ทั้งหมด รวมถึงข้อมูลตารางฐานข้อมูล MySQL และ LocalDB (หนังสือรับ, หนังสือส่ง, เวียน, ภายใน, คำสั่ง, บัญชีผู้ใช้งาน, การตั้งค่า) และไฟล์เอกสารแนบทั้งหมดในระบบ
                  </p>
                </div>
              </div>
            </div>

            {/* Grid 2 Columns: Backup Panel and Restore Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
              
              {/* Backup Card */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-sm hover:border-emerald-500/40 transition-all group">
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5 border-b border-[var(--border-light)] pb-4">
                    <div className="p-3 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
                      <Download className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        1. สำรองข้อมูลระบบฉบับเต็ม (Export Full Backup)
                      </h4>
                      <p className="text-xs text-[var(--text-muted)]">
                        ดาวน์โหลดไฟล์ .tar บีบอัดข้อมูลสารบรรณและไฟล์แนบทั้งหมด
                      </p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    ระบบจะทำการอ่านข้อมูลจากตารางฐานข้อมูลทั้งหมด สร้างไฟล์ดัมพ์ JSON และคัดลอกไฟล์เอกสารแนบในระบบ รวบรวมและบีบอัดเป็นไฟล์เดียวในรูปแบบ <strong className="text-[var(--text-primary)] font-mono">.tar</strong> เพื่อความปลอดภัยสูงสุด
                  </p>

                  <div className="bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl p-4 space-y-2.5 text-xs text-[var(--text-secondary)]">
                    <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> ข้อมูลที่ครอบคลุมในไฟล์ .tar:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] sm:text-xs">
                      <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-lighter)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ทะเบียนรับ/ส่ง/เวียน/ภายใน
                      </div>
                      <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-lighter)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> งานธุรการ/คำสั่ง/ประกาศ
                      </div>
                      <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-lighter)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> บัญชีผู้ใช้และสิทธิ์เข้าระบบ
                      </div>
                      <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-lighter)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ข้อมูลฝ่ายและตำแหน่งงาน
                      </div>
                      <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-lighter)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> การตั้งค่าองค์กรและเลขจอง
                      </div>
                      <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-lighter)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ไฟล์เอกสารแนบทั้งหมด
                      </div>
                    </div>
                  </div>

                  {backupStatusMsg && (
                    <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
                      backupStatusMsg.type === 'success' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                    }`}>
                      {backupStatusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                      <span className="font-medium">{backupStatusMsg.text}</span>
                    </div>
                  )}
                </div>

                <div className="pt-5 mt-5 border-t border-[var(--border-light)]">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    disabled={isBackingUp}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    {isBackingUp ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังรวบรวมและบีบอัดข้อมูลสารบรรณ...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>ดาวน์โหลดข้อมูลสำรองฉบับเต็ม (.tar)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Restore Card */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-sm hover:border-amber-500/40 transition-all group">
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5 border-b border-[var(--border-light)] pb-4">
                    <div className="p-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
                      <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-[var(--text-primary)] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        2. คืนค่าข้อมูลระบบ (Import Restore Archive)
                      </h4>
                      <p className="text-xs text-[var(--text-muted)]">
                        อัปโหลดไฟล์สำรองข้อมูล (.tar) เพื่อกู้คืนสารบรรณและไฟล์แนบ
                      </p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    เลือกไฟล์สำรองข้อมูล <strong className="text-[var(--text-primary)] font-mono">.tar</strong> ที่คุณเคยดาวน์โหลดไว้ เพื่อคืนค่าระบบทั้งหมด ข้อมูลหนังสือ บัญชี และไฟล์แนบต่างๆ จะถูกอัปเดตตามไฟล์กู้คืน
                  </p>

                  <div className="space-y-3 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl p-4">
                    <label className="block text-xs font-bold text-[var(--text-secondary)]">เลือกไฟล์สำรองข้อมูล (.tar)</label>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="file"
                        accept=".tar"
                        id="restore-file-input"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setRestoreFile(e.target.files[0]);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('restore-file-input')?.click()}
                        className="py-2.5 px-4 bg-[var(--bg-surface)] hover:bg-[var(--border-lighter)] text-[var(--text-primary)] border border-[var(--border-medium)] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs min-h-[40px]"
                      >
                        <Files className="w-4 h-4 text-amber-500" />
                        <span>เลือกไฟล์ .tar จากเครื่อง...</span>
                      </button>

                      {restoreFile && (
                        <div className="flex items-center gap-2 text-xs text-[var(--text-primary)] bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20 font-mono">
                          <span className="truncate max-w-[160px] sm:max-w-xs">{restoreFile.name}</span>
                          <button
                            type="button"
                            onClick={() => setRestoreFile(null)}
                            className="text-rose-500 hover:text-rose-600 font-semibold p-0.5 rounded cursor-pointer"
                            title="ยกเลิกไฟล์"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {restoreStatusMsg && (
                    <div className={`p-3.5 rounded-xl text-xs flex flex-col gap-1.5 border ${
                      restoreStatusMsg.type === 'success' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        {restoreStatusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                        <span className="font-bold">{restoreStatusMsg.text}</span>
                      </div>
                      {restoreStatusMsg.details && (
                        <div className="pl-6 space-y-0.5 text-[11px] opacity-90 font-mono">
                          <div>• นำเข้าเอกสาร: {restoreStatusMsg.details.documentsCount || 0} รายการ</div>
                          <div>• คืนค่าไฟล์แนบ: {restoreStatusMsg.details.filesCount || 0} ไฟล์</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-5 mt-5 border-t border-[var(--border-light)]">
                  <button
                    type="button"
                    onClick={() => setShowRestoreConfirmModal(true)}
                    disabled={!restoreFile || isRestoring}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังคืนค่าระบบ... โปรดรอสักครู่</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>เริ่มต้นคืนค่าข้อมูลระบบ (Restore Archive)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Automated Backups Section (Automated Daily Backups Engine & Daemon) */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 sm:p-7 shadow-sm space-y-6">
              {/* Header Banner & Daemon Status */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5">
                <div className="flex items-start gap-3.5 sm:gap-4">
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 border border-indigo-500/30 shadow-xs">
                    <Database className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                      <h3 className="font-bold text-base sm:text-lg text-[var(--text-primary)]">
                        3. ระบบตั้งเวลาสำรองข้อมูลอัตโนมัติ (Automated Daily Backups Engine)
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border flex items-center gap-1.5 shadow-xs ${
                        isAutomatedBackupEnabled 
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${isAutomatedBackupEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                        {isAutomatedBackupEnabled ? 'DAEMON ACTIVE' : 'DAEMON PAUSED'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-2xl">
                      ระบบประมวลผลพื้นหลัง (Daemon Engine) สำรองฐานข้อมูลสารบรรณตามรอบเวลา พร้อมระบบหมุนเวียน (Retention Rotation) เพื่อความปลอดภัยสูงสุด
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end pt-2 xl:pt-0 border-t xl:border-t-0 border-indigo-500/10">
                  {/* Master Daemon Toggle Switch */}
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-xs">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">Daemon หลัก:</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAutomatedBackup(!isAutomatedBackupEnabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${isAutomatedBackupEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      title="เปิด/ปิดการทำงานของ Daemon สำรองข้อมูลอัตโนมัติทั้งระบบ"
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isAutomatedBackupEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-xs font-bold text-[var(--text-primary)] w-8">{isAutomatedBackupEnabled ? 'เปิด' : 'ปิด'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      fetchScheduledBackups();
                      fetchAutomatedBackups();
                    }}
                    disabled={isLoadingScheduledBackups || isLoadingAutomatedBackups}
                    className="p-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs min-h-[38px]"
                    title="รีเฟรชข้อมูล"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingScheduledBackups || isLoadingAutomatedBackups ? 'animate-spin' : ''}`} />
                    <span>รีเฟรช</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleManualRunBackup}
                    disabled={isManualRunningBackup}
                    className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[38px]"
                    title="สั่งให้ระบบรันสำรองข้อมูลฉบับเต็มทันทีโดยไม่ต้องรอรอบเวลา"
                  >
                    <Zap className={`w-3.5 h-3.5 ${isManualRunningBackup ? 'animate-bounce' : ''}`} />
                    <span>{isManualRunningBackup ? 'กำลังสำรอง...' : 'สำรองข้อมูลทันที'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingBackupSchedule(null);
                      setBackupScheduleFormData({
                        name: 'สำรองข้อมูลระบบฉบับเต็มประจำวัน (รอบ 00:00 น.)',
                        scheduleType: 'daily',
                        scheduledTime: '00:00',
                        weeklyDay: 'monday',
                        intervalHours: 24,
                        backupScope: 'full',
                        retentionDays: 7,
                        description: 'สำรองตารางฐานข้อมูลและสารบรรณระบบทั้งหมดทุกคืนอัตโนมัติ พร้อมระบบหมุนเวียนลบไฟล์เก่า',
                        isActive: true
                      });
                      setShowBackupScheduleModal(true);
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มคิวตั้งเวลาใหม่</span>
                  </button>
                </div>
              </div>

              {/* Status & Feedback Message */}
              {automatedBackupMsg && (
                <div className={`p-4 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 border shadow-xs animate-fade-in ${
                  automatedBackupMsg.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                }`}>
                  {automatedBackupMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> : <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />}
                  <span className="font-semibold">{automatedBackupMsg.text}</span>
                </div>
              )}

              {/* Sub-tab Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-light)] pb-3 gap-3">
                <div className="flex items-center gap-2 p-1 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-2xl w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setBackupSubTab('schedules')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      backupSubTab === 'schedules'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-lighter)]'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>คิวตั้งเวลาสำรอง ({scheduledBackups.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBackupSubTab('files')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      backupSubTab === 'files'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-lighter)]'
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    <span>คลังไฟล์สำรอง ({automatedBackups.length})</span>
                  </button>
                </div>

                {backupSubTab === 'files' && automatedBackups.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllAutomatedBackups}
                    className="px-3.5 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer self-end sm:self-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบไฟล์สำรองทั้งหมด</span>
                  </button>
                )}
              </div>

              {/* TAB 1: SCHEDULES MANAGEMENT */}
              {backupSubTab === 'schedules' && (
                <div className="space-y-4">
                  {isLoadingScheduledBackups ? (
                    <div className="py-12 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-2.5">
                      <RefreshCw className="w-7 h-7 animate-spin text-indigo-500" />
                      <span className="font-medium">กำลังโหลดรายการคิวตั้งเวลาสำรองข้อมูล...</span>
                    </div>
                  ) : scheduledBackups.length === 0 ? (
                    <div className="py-12 px-4 text-center rounded-2xl bg-[var(--bg-canvas)] border border-dashed border-[var(--border-medium)] space-y-3">
                      <Clock className="w-12 h-12 text-[var(--text-muted)] mx-auto opacity-40" />
                      <h4 className="font-bold text-sm sm:text-base text-[var(--text-primary)]">ยังไม่มีคิวตั้งเวลาสำรองข้อมูลอัตโนมัติ</h4>
                      <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                        กำหนดเวลาสำรองข้อมูล เช่น ทุกวัน เวลา 00:00 น. หรือ ทุกๆ 6 ชั่วโมง เพื่อให้ระบบสำรองข้อมูลอัตโนมัติและเก็บรักษาไฟล์ตามนโยบาย Retention
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBackupSchedule(null);
                          setShowBackupScheduleModal(true);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Plus className="w-4 h-4" /> เพิ่มตั้งเวลาแรก
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                      {scheduledBackups.map((sch) => {
                        const scopeBadge = sch.backupScope === 'documents' 
                          ? { label: 'เฉพาะทะเบียนสารบรรณ', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' }
                          : sch.backupScope === 'system_config'
                          ? { label: 'เฉพาะผู้ใช้ & การตั้งค่า', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' }
                          : sch.backupScope === 'logs_audit'
                          ? { label: 'เฉพาะบันทึกระบบ Logs', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' }
                          : { label: 'ฉบับเต็มทั้งระบบ (Full)', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };

                        const scheduleText = sch.scheduleType === 'daily'
                          ? `ทุกวัน เวลา ${sch.scheduledTime || '00:00'} น.`
                          : sch.scheduleType === 'workdays'
                          ? `วันทำการ (จันทร์-ศุกร์) เวลา ${sch.scheduledTime || '00:00'} น.`
                          : sch.scheduleType === 'weekly'
                          ? `ทุกวัน${sch.weeklyDay === 'monday' ? 'จันทร์' : sch.weeklyDay === 'tuesday' ? 'อังคาร' : sch.weeklyDay === 'wednesday' ? 'พุธ' : sch.weeklyDay === 'thursday' ? 'พฤหัสบดี' : sch.weeklyDay === 'friday' ? 'ศุกร์' : sch.weeklyDay === 'saturday' ? 'เสาร์' : 'อาทิตย์'} เวลา ${sch.scheduledTime || '00:00'} น.`
                          : `ทุกๆ ${sch.intervalHours || 24} ชั่วโมง`;

                        return (
                          <div
                            key={sch.id}
                            className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-4 shadow-sm ${
                              sch.isActive
                                ? 'bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-canvas)] border-indigo-500/30 hover:border-indigo-500/60 shadow-indigo-500/5'
                                : 'bg-[var(--bg-overlay)]/40 border-[var(--border-light)] opacity-75'
                            }`}
                          >
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    sch.isActive 
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                                      : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                  }`}>
                                    {sch.isActive ? '● กำลังทำงาน' : '○ พักการทำงาน'}
                                  </span>
                                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${scopeBadge.color}`}>
                                    {scopeBadge.label}
                                  </span>
                                </div>
                                <h4 className="font-bold text-sm sm:text-base text-[var(--text-primary)]">{sch.name}</h4>
                              </div>

                              {/* Toggle Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleBackupSchedule(sch.id)}
                                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                                  sch.isActive 
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30' 
                                    : 'bg-gray-200 dark:bg-gray-800 text-gray-500 hover:bg-gray-300'
                                }`}
                                title={sch.isActive ? 'คลิกเพื่อพักการทำงาน' : 'คลิกเพื่อเปิดใช้งาน'}
                              >
                                {sch.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                <span>{sch.isActive ? 'เปิด' : 'ปิด'}</span>
                              </button>
                            </div>

                            {/* Details Box */}
                            <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-light)] text-xs space-y-2.5">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span className="text-[var(--text-muted)] flex items-center gap-1.5 font-medium">
                                  <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> กำหนดเวลาสำรอง:
                                </span>
                                <span className="font-bold text-[var(--text-primary)] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-lg text-[11px] border border-indigo-500/20 self-start sm:self-auto">
                                  ⏰ {scheduleText}
                                </span>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span className="text-[var(--text-muted)] flex items-center gap-1.5 font-medium">
                                  <Database className="w-3.5 h-3.5 text-purple-500 shrink-0" /> นโยบายการเก็บรักษา:
                                </span>
                                <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2.5 py-0.5 rounded-lg text-[11px] border border-purple-500/20 self-start sm:self-auto">
                                  📦 เก็บย้อนหลัง {sch.retentionDays || 7} วัน (หมุนเวียน)
                                </span>
                              </div>

                              {sch.description && (
                                <div className="pt-2 border-t border-[var(--border-light)] text-[11px] text-[var(--text-muted)] leading-relaxed">
                                  <span className="font-bold text-[var(--text-secondary)]">หมายเหตุ:</span> {sch.description}
                                </div>
                              )}
                            </div>

                            {/* Footer Stats & Actions */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-1 gap-3 border-t border-[var(--border-light)]">
                              <div className="text-[10px] text-[var(--text-muted)] space-y-0.5 font-mono">
                                <div>รันล่าสุด: {sch.lastRunAt ? new Date(sch.lastRunAt).toLocaleString('th-TH') : 'ยังไม่เคยรัน'}</div>
                                {sch.lastRunStatus && (
                                  <div className="flex items-center gap-1">
                                    <span>สถานะ:</span>
                                    <span className={sch.lastRunStatus === 'success' ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                                      {sch.lastRunStatus.toUpperCase()}
                                    </span>
                                    {sch.lastBackupFile && (
                                      <span className="text-[var(--text-muted)] truncate max-w-[140px]" title={sch.lastBackupFile}>
                                        ({sch.lastBackupFile})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => handleRunBackupScheduleNow(sch.id, sch.name)}
                                  disabled={runningBackupScheduleId === sch.id}
                                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 min-h-[36px]"
                                  title="ทดสอบรันสำรองข้อมูลตามกำหนดเวลานี้ทันที"
                                >
                                  <Zap className={`w-3.5 h-3.5 ${runningBackupScheduleId === sch.id ? 'animate-bounce' : ''}`} />
                                  <span>{runningBackupScheduleId === sch.id ? 'กำลังรัน...' : 'รันทันที'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingBackupSchedule(sch);
                                    setBackupScheduleFormData({
                                      name: sch.name,
                                      scheduleType: sch.scheduleType || 'daily',
                                      scheduledTime: sch.scheduledTime || '00:00',
                                      weeklyDay: sch.weeklyDay || 'monday',
                                      intervalHours: sch.intervalHours || 24,
                                      backupScope: sch.backupScope || 'full',
                                      retentionDays: sch.retentionDays || 7,
                                      description: sch.description || '',
                                      isActive: Boolean(sch.isActive)
                                    });
                                    setShowBackupScheduleModal(true);
                                  }}
                                  className="p-2 rounded-xl border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center shadow-xs"
                                  title="แก้ไขการตั้งเวลา"
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteBackupSchedule(sch.id, sch.name)}
                                  className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center shadow-xs"
                                  title="ลบการตั้งเวลา"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: BACKUP ARCHIVES TABLE */}
              {backupSubTab === 'files' && (
                <div className="space-y-4">
                  {isLoadingAutomatedBackups ? (
                    <div className="py-12 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-2.5">
                      <RefreshCw className="w-7 h-7 animate-spin text-[var(--primary-color)]" />
                      <span className="font-medium">กำลังโหลดประวัติและไฟล์สำรองข้อมูลอัตโนมัติ...</span>
                    </div>
                  ) : automatedBackups.length === 0 ? (
                    <div className="py-12 px-4 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-medium)] rounded-2xl bg-[var(--bg-canvas)] space-y-2">
                      <Database className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-40" />
                      <div className="font-bold text-sm text-[var(--text-primary)]">ไม่พบไฟล์สำรองข้อมูลในระบบ</div>
                      <p className="max-w-md mx-auto text-[var(--text-muted)]">
                        ระบบจะทำการสำรองข้อมูลอัตโนมัติตามรอบเวลาที่กำหนด หรือคุณสามารถกดปุ่ม "สำรองข้อมูลทันที" ด้านบนเพื่อสร้างไฟล์สำรองแรกได้ทันที
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card View (< md) */}
                      <div className="block md:hidden space-y-3">
                        {automatedBackups.map((bk, idx) => {
                          const date = new Date(bk.createdAt);
                          const formattedDate = date.toLocaleString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                          const sizeKB = (bk.size / 1024).toFixed(1);

                          return (
                            <div key={bk.filename} className="p-4 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-canvas)] space-y-3 shadow-xs">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-[var(--text-muted)]">#{idx + 1}</span>
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                      {bk.scope === 'documents' ? 'เอกสารสารบรรณ' : bk.scope === 'system_config' ? 'การตั้งค่าระบบ' : bk.scope === 'logs_audit' ? 'บันทึก Logs' : 'ฉบับเต็ม (Full)'}
                                    </span>
                                  </div>
                                  <div className="font-mono text-xs font-bold text-[var(--primary-color)] break-all">
                                    {bk.filename}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] border-y border-[var(--border-light)] py-2 font-mono">
                                <span>ขนาด: <strong>{sizeKB} KB</strong></span>
                                <span>วันที่: <strong>{formattedDate}</strong></span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 pt-1">
                                <a
                                  href={`/api/automated-backups/download/${encodeURIComponent(bk.filename)}?role=${props.user?.role || 'admin'}`}
                                  download={bk.filename}
                                  className="py-2 px-2 bg-[var(--bg-surface)] border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-[var(--text-primary)] font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-xs"
                                  title="ดาวน์โหลดไฟล์ .tar"
                                >
                                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>โหลด</span>
                                </a>
                                <button
                                  type="button"
                                  disabled={isRestoringAutomated}
                                  onClick={() => handleRestoreAutomatedBackup(bk.filename)}
                                  className="py-2 px-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-xs disabled:opacity-50 cursor-pointer"
                                  title="กู้คืนฐานข้อมูลระบบ"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${isRestoringAutomated ? 'animate-spin' : ''}`} />
                                  <span>กู้คืน</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isRestoringAutomated}
                                  onClick={() => handleDeleteAutomatedBackup(bk.filename)}
                                  className="py-2 px-2 border border-rose-200 dark:border-rose-900/50 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-xs disabled:opacity-50 cursor-pointer"
                                  title="ลบไฟล์สำรองนี้"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>ลบ</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop Table View (>= md) */}
                      <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--border-light)] bg-[var(--bg-canvas)] shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[var(--bg-surface)] text-xs font-bold text-[var(--text-secondary)] border-b border-[var(--border-light)]">
                              <th className="p-3.5 font-sans">#</th>
                              <th className="p-3.5 font-sans">ชื่อไฟล์สำรองข้อมูล (.tar)</th>
                              <th className="p-3.5 font-sans">ขอบเขต (Scope)</th>
                              <th className="p-3.5 font-sans">ขนาดไฟล์</th>
                              <th className="p-3.5 font-sans">วันที่สร้างระบบ</th>
                              <th className="p-3.5 font-sans text-right">การจัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs text-[var(--text-primary)] divide-y divide-[var(--border-lighter)]">
                            {automatedBackups.map((bk, idx) => {
                              const date = new Date(bk.createdAt);
                              const formattedDate = date.toLocaleString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              });
                              const sizeKB = (bk.size / 1024).toFixed(1);
                              
                              return (
                                <tr key={bk.filename} className="hover:bg-[var(--bg-surface)] transition-colors">
                                  <td className="p-3.5 font-mono text-[var(--text-muted)]">{idx + 1}</td>
                                  <td className="p-3.5 font-mono text-[var(--primary-color)] font-bold max-w-[280px] truncate">
                                    {bk.filename}
                                  </td>
                                  <td className="p-3.5">
                                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                      {bk.scope === 'documents' ? 'เอกสารสารบรรณ' : bk.scope === 'system_config' ? 'การตั้งค่าระบบ' : bk.scope === 'logs_audit' ? 'บันทึก Logs' : 'ฉบับเต็ม (Full)'}
                                    </span>
                                  </td>
                                  <td className="p-3.5 font-mono text-[var(--text-secondary)] font-semibold">{sizeKB} KB</td>
                                  <td className="p-3.5 text-[var(--text-secondary)]">{formattedDate}</td>
                                  <td className="p-3.5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <a
                                        href={`/api/automated-backups/download/${encodeURIComponent(bk.filename)}?role=${props.user?.role || 'admin'}`}
                                        download={bk.filename}
                                        className="px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-[var(--text-primary)] font-bold rounded-xl text-xs transition-colors inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                        title="ดาวน์โหลดไฟล์สำรองข้อมูล JSON"
                                      >
                                        <Download className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>ดาวน์โหลด</span>
                                      </a>
                                      <button
                                        type="button"
                                        disabled={isRestoringAutomated}
                                        onClick={() => handleRestoreAutomatedBackup(bk.filename)}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-xs"
                                        title="กู้คืนฐานข้อมูลระบบกลับไปใช้ข้อมูลจากไฟล์นี้"
                                      >
                                        <RefreshCw className={`w-3 h-3 ${isRestoringAutomated ? 'animate-spin' : ''}`} />
                                        <span>กู้คืน (Restore)</span>
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isRestoringAutomated}
                                        onClick={() => handleDeleteAutomatedBackup(bk.filename)}
                                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                                        title="ลบไฟล์สำรองข้อมูลนี้"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* MODAL: ADD / EDIT BACKUP SCHEDULE */}
            {showBackupScheduleModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up max-h-[92vh] flex flex-col">
                  <div className="p-4 sm:p-5 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-canvas)] shrink-0">
                    <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
                      {editingBackupSchedule ? 'แก้ไขคิวตั้งเวลาสำรองข้อมูล' : 'เพิ่มคิวตั้งเวลาสำรองข้อมูลอัตโนมัติ'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowBackupScheduleModal(false)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-xl hover:bg-[var(--border-lighter)] cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveBackupSchedule} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
                    {/* Schedule Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        ชื่อรายการตั้งเวลา <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={backupScheduleFormData.name}
                        onChange={(e) => setBackupScheduleFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="เช่น สำรองข้อมูลฉบับเต็มประจำวัน (รอบเที่ยงคืน)"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Backup Scope */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-purple-500" />
                        ขอบเขตข้อมูลที่ต้องการสำรอง (Backup Scope) <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                        {[
                          { id: 'full', label: 'ฉบับเต็มทั้งระบบ (Full)', desc: 'รวมเอกสาร, ผู้ใช้, logs, การตั้งค่าทั้งหมด' },
                          { id: 'documents', label: 'เฉพาะทะเบียนสารบรรณ', desc: 'หนังสือรับ-ส่ง, คำสั่ง, ประกาศ, เลขจอง' },
                          { id: 'system_config', label: 'เฉพาะผู้ใช้ & การตั้งค่า', desc: 'บัญชีผู้ใช้, สิทธิ์, หน่วยงาน, ตำแหน่ง' },
                          { id: 'logs_audit', label: 'เฉพาะบันทึกระบบ Logs', desc: 'ประวัติการเข้าใช้งาน, ร่องรอยกิจกรรม' }
                        ].map((sc) => (
                          <div
                            key={sc.id}
                            onClick={() => setBackupScheduleFormData(prev => ({ ...prev, backupScope: sc.id }))}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                              backupScheduleFormData.backupScope === sc.id
                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                                : 'bg-[var(--bg-canvas)] border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]'
                            }`}
                          >
                            <div className="font-bold text-xs sm:text-sm">{sc.label}</div>
                            <div className="text-[10px] text-[var(--text-muted)] mt-1 leading-tight">{sc.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Schedule Type & Timing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          ความถี่ในการสำรอง
                        </label>
                        <select
                          value={backupScheduleFormData.scheduleType}
                          onChange={(e) => setBackupScheduleFormData(prev => ({ ...prev, scheduleType: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                        >
                          <option value="daily">ทุกวัน (Daily)</option>
                          <option value="workdays">วันทำการ (จันทร์ - ศุกร์)</option>
                          <option value="weekly">ประจำสัปดาห์ (Weekly)</option>
                          <option value="interval">ตามช่วงระยะเวลา (Interval Hours)</option>
                        </select>
                      </div>

                      {backupScheduleFormData.scheduleType === 'weekly' ? (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[var(--text-primary)]">วันที่กำหนดในสัปดาห์</label>
                          <select
                            value={backupScheduleFormData.weeklyDay}
                            onChange={(e) => setBackupScheduleFormData(prev => ({ ...prev, weeklyDay: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                          >
                            <option value="monday">วันจันทร์</option>
                            <option value="tuesday">วันอังคาร</option>
                            <option value="wednesday">วันพุธ</option>
                            <option value="thursday">วันพฤหัสบดี</option>
                            <option value="friday">วันศุกร์</option>
                            <option value="saturday">วันเสาร์</option>
                            <option value="sunday">วันอาทิตย์</option>
                          </select>
                        </div>
                      ) : backupScheduleFormData.scheduleType === 'interval' ? (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[var(--text-primary)]">ระยะเวลาทุกๆ (ชั่วโมง)</label>
                          <input
                            type="number"
                            min="1"
                            max="72"
                            value={backupScheduleFormData.intervalHours}
                            onChange={(e) => setBackupScheduleFormData(prev => ({ ...prev, intervalHours: parseInt(e.target.value) || 24 }))}
                            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            เวลาที่ต้องการรัน (HH:mm)
                          </label>
                          <input
                            type="time"
                            required
                            value={backupScheduleFormData.scheduledTime}
                            onChange={(e) => setBackupScheduleFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Retention Policy */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        นโยบายการเก็บรักษาไฟล์ (Retention Rotation)
                      </label>
                      <select
                        value={backupScheduleFormData.retentionDays}
                        onChange={(e) => setBackupScheduleFormData(prev => ({ ...prev, retentionDays: parseInt(e.target.value) || 7 }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                      >
                        <option value={3}>เก็บย้อนหลัง 3 วัน</option>
                        <option value={7}>เก็บย้อนหลัง 7 วัน (ค่ามาตรฐาน)</option>
                        <option value={14}>เก็บย้อนหลัง 14 วัน (2 สัปดาห์)</option>
                        <option value={30}>เก็บย้อนหลัง 30 วัน (1 เดือน)</option>
                        <option value={60}>เก็บย้อนหลัง 60 วัน (2 เดือน)</option>
                        <option value={90}>เก็บย้อนหลัง 90 วัน (3 เดือน)</option>
                        <option value={180}>เก็บย้อนหลัง 180 วัน (6 เดือน)</option>
                      </select>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        * ระบบจะทำการลบไฟล์สำรองข้อมูลอัตโนมัติที่เก่ากว่าจำนวนวันที่กำหนดให้อัตโนมัติเพื่อประหยัดพื้นที่
                      </p>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)]">คำอธิบายเพิ่มเติม</label>
                      <textarea
                        rows={2}
                        value={backupScheduleFormData.description}
                        onChange={(e) => setBackupScheduleFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="ระบุหมายเหตุหรือวัตถุประสงค์ของคิวสำรองข้อมูลนี้..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-light)]">
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">เปิดใช้งานคิวนี้ทันที</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Daemon จะตรวจรอบเวลาและสั่งรันอัตโนมัติ</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBackupScheduleFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                          backupScheduleFormData.isActive ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          backupScheduleFormData.isActive ? 'translate-x-4' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    {/* Modal Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-light)]">
                      <button
                        type="button"
                        onClick={() => setShowBackupScheduleModal(false)}
                        className="px-4 py-2.5 rounded-xl border border-[var(--border-light)] hover:bg-[var(--border-lighter)] text-xs font-bold text-[var(--text-secondary)] cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md hover:shadow-lg cursor-pointer"
                      >
                        {editingBackupSchedule ? 'บันทึกการแก้ไข' : 'บันทึกคิวตั้งเวลา'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Confirmation Modal for Restore */}
            {showRestoreConfirmModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
                  <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border-light)] bg-amber-500/10">
                    <h3 className="font-bold text-base text-amber-500 dark:text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" /> ยืนยันการคืนค่าข้อมูลระบบ
                    </h3>
                    <button 
                      type="button"
                      onClick={() => setShowRestoreConfirmModal(false)}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-xl hover:bg-amber-500/10 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 sm:p-6 space-y-4">
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                      คุณกำลังจะทำการคืนค่าข้อมูลระบบจากไฟล์ <strong className="text-[var(--text-primary)] font-mono">{restoreFile?.name}</strong>
                    </p>
                    <div className="p-3.5 rounded-xl text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 leading-relaxed space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> คำเตือนความปลอดภัย:
                      </div>
                      <div>ข้อมูลหนังสือสารบรรณ, บัญชีผู้ใช้ และการตั้งค่าทั้งหมดในระบบปัจจุบันจะถูกลบและเขียนทับด้วยข้อมูลจากไฟล์สำรองข้อมูลนี้ การดำเนินการนี้ไม่สามารถย้อนกลับได้</div>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      คุณแน่ใจหรือว่าต้องการดำเนินการต่อ?
                    </p>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-light)]">
                      <button
                        type="button"
                        onClick={() => setShowRestoreConfirmModal(false)}
                        className="px-4 py-2.5 border border-[var(--border-light)] rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleRestoreSubmit}
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" /> ยืนยันการคืนค่าข้อมูล
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dedup' && (
          <div className="space-y-6 animate-fade-in text-[var(--text-primary)]">
            {/* Header section */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl shrink-0">
                    <HardDrive className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-sans font-semibold text-[var(--text-primary)]">
                        ระบบบริหารจัดการและลดความซ้ำซ้อนของไฟล์ (File Deduplication & Pointer Engine)
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-500 font-sans border border-emerald-500/20 font-medium">
                        ย้ายไป Pointer & ลบไฟล์ซ้ำ (เก็บต้นฉบับ)
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-4xl">
                      สแกนและตรวจจับไฟล์เอกสารแนบที่มีเนื้อหาตรงกันแบบ 100% (SHA-256 Checksum) เมื่อพบไฟล์ซ้ำ ระบบจะเก็บไฟล์ต้นฉบับไว้ ย้ายไปยัง Pointer Hub และลบไฟล์ซ้ำออกจากเซิร์ฟเวอร์เพื่อประหยัดพื้นที่ดิสก์อย่างมีประสิทธิภาพ โดยที่ลิงก์และการเรียกดูไฟล์ทั้งหมดยังคงใช้งานได้ตามปกติ
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={fetchDedupStats}
                    disabled={isScanningDedup}
                    className="py-2.5 px-4 bg-[var(--bg-canvas)] hover:bg-[var(--border-lighter)] text-[var(--text-primary)] border border-[var(--border-medium)] rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-4 h-4 ${isScanningDedup ? 'animate-spin' : ''}`} />
                    <span>สแกนหาไฟล์ซ้ำ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteDedup}
                    disabled={isExecutingDedup || !dedupStats || (dedupStats.duplicateCount === 0 && dedupStats.potentialSavedSpaceBytes === 0)}
                    className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isExecutingDedup ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังย้ายไป Pointer & ลบไฟล์ซ้ำ...</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4" />
                        <span>ย้ายไฟล์ซ้ำไป Pointer & ลบไฟล์ซ้ำทั้งหมด</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Notification message */}
            {dedupMsg && (
              <div className={`p-4 rounded-xl text-sm flex items-start sm:items-center gap-3 ${
                dedupMsg.type === 'success' 
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}>
                {dedupMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />}
                <span className="font-medium leading-relaxed">{dedupMsg.text}</span>
              </div>
            )}

            {/* Metrics cards */}
            {dedupStats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] p-5 rounded-xl shadow-xs hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center justify-between text-[var(--text-muted)] text-xs mb-1.5">
                    <span className="font-medium">พื้นที่ดิสก์ที่ประหยัดได้/ประหยัดแล้ว</span>
                    <Zap className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-500 font-mono tracking-tight">
                    {dedupStats.potentialSavedSpaceFormatted || '0 B'}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1.5">
                    จากคู่ซ้ำซ้อนทั้งหมด <strong className="text-emerald-500 font-semibold">{dedupStats.duplicateCount || 0}</strong> ไฟล์
                  </div>
                </div>

                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] p-5 rounded-xl shadow-xs hover:border-sky-500/30 transition-all">
                  <div className="flex items-center justify-between text-[var(--text-muted)] text-xs mb-1.5">
                    <span className="font-medium">จำนวนไฟล์แนบทั้งหมดในระบบ</span>
                    <Files className="w-4 h-4 text-sky-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] font-mono tracking-tight">
                    {dedupStats.totalFiles || 0} <span className="text-sm font-normal text-[var(--text-secondary)]">ไฟล์</span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1.5">
                    ขนาดทั้งหมดในดิสก์ {dedupStats.totalSizeFormatted || '0 B'}
                  </div>
                </div>

                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] p-5 rounded-xl shadow-xs hover:border-indigo-500/30 transition-all">
                  <div className="flex items-center justify-between text-[var(--text-muted)] text-xs mb-1.5">
                    <span className="font-medium">ไฟล์ต้นฉบับจริง (Unique Masters)</span>
                    <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-indigo-400 font-mono tracking-tight">
                    {dedupStats.uniqueMasterFiles || 0} <span className="text-sm font-normal text-[var(--text-secondary)]">ไฟล์</span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1.5">
                    ขนาดพื้นที่ข้อมูลจริง {dedupStats.uniqueSizeFormatted || '0 B'}
                  </div>
                </div>

                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] p-5 rounded-xl shadow-xs hover:border-amber-500/30 transition-all">
                  <div className="flex items-center justify-between text-[var(--text-muted)] text-xs mb-1.5">
                    <span className="font-medium">Pointer Links ที่ทำงานอยู่</span>
                    <Copy className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono tracking-tight">
                    {dedupStats.pointerCount || 0} <span className="text-xs font-normal text-[var(--text-secondary)]">พอยน์เตอร์</span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1.5">
                    ชี้เชื่อมโยงไปยังมาสเตอร์ไฟล์เพื่อลดการเก็บซ้ำ
                  </div>
                </div>
              </div>
            )}

            {/* Auto Deduplication Toggle Option */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] p-5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-lg shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-[var(--text-primary)]">
                    รวมไฟล์ซ้ำอัตโนมัติทันทีที่อัปโหลด
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    เมื่อเจ้าหน้าที่อัปโหลดไฟล์แนบ ระบบจะสแกนหาไฟล์ที่ตรงกันทันที หากพบไฟล์ที่ซ้ำกันอยู่แล้ว จะทำการแปลงให้เป็น Pointer Link โดยอัตโนมัติ โดยไม่ต้องรอกดสั่งสแกนรายสัปดาห์
                  </p>
                </div>
              </div>

              <div className="flex items-center sm:self-center shrink-0 pl-11 sm:pl-0">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDedupOnUpload}
                    onChange={handleToggleAutoDedup}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {/* Duplicate File Groups List */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-xs overflow-hidden">
              <div className="p-5 border-b border-[var(--border-light)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-canvas)]/35">
                <div>
                  <h4 className="font-semibold text-base text-[var(--text-primary)] flex items-center gap-2 font-sans">
                    <Copy className="w-5 h-5 text-indigo-500" />
                    กลุ่มไฟล์แนบที่ตรวจพบความซ้ำซ้อน ({dedupStats?.groups?.length || 0} กลุ่ม)
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    ไฟล์ซ้ำที่มี Hash ตรงกัน จะเหลือเพียงไฟล์มาสเตอร์ไฟล์เดียวบนระบบดิสก์ ส่วนไฟล์อื่นจะถูกแปลงเป็น Pointer (คลิกเพื่อแสดง/ซ่อนรายละเอียดของแต่ละกลุ่ม)
                  </p>
                </div>

                {dedupStats?.groups && dedupStats.groups.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={expandAllGroups}
                      className="px-3 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-medium)] rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                      <span>ขยายทั้งหมด</span>
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllGroups}
                      className="px-3 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-medium)] rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                      <span>ย่อทั้งหมด</span>
                    </button>
                  </div>
                )}
              </div>

              {isScanningDedup ? (
                <div className="p-12 text-center text-[var(--text-secondary)]">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-3" />
                  <p className="text-sm font-medium">กำลังคำนวณ Checksum และสแกนหาไฟล์ที่ซ้ำในระบบ...</p>
                </div>
              ) : !dedupStats || !dedupStats.groups || dedupStats.groups.length === 0 ? (
                <div className="p-12 text-center text-[var(--text-secondary)] space-y-3">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 opacity-80" />
                  <p className="font-medium text-base text-[var(--text-primary)]">ไม่พบไฟล์ซ้ำในระบบ</p>
                  <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                    ระบบจัดเก็บไฟล์ทั้งหมดของคุณสะอาด มีความเป็นระเบียบเรียบร้อย หรือไฟล์ซ้ำได้รับการบีบอัดเรียบร้อยหมดแล้ว
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-light)]">
                  {dedupStats.groups.map((group: any, idx: number) => {
                    const isCollapsed = Boolean(collapsedGroupHashes[group.hash]);
                    return (
                      <div key={group.hash || idx} className="p-4 sm:p-5 hover:bg-[var(--bg-canvas)]/20 transition-colors space-y-4">
                        {/* Group Header Info */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[var(--bg-canvas)]/50 p-3 sm:p-4 rounded-xl border border-[var(--border-lighter)] shadow-inner">
                          <div
                            onClick={() => toggleGroupCollapse(group.hash)}
                            className="flex items-start sm:items-center gap-3 cursor-pointer select-none flex-1 group/header"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroupCollapse(group.hash);
                              }}
                              className="w-7 h-7 rounded-full bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 transition-colors font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-indigo-500/20"
                              title={isCollapsed ? 'คลิกเพื่อแสดงรายละเอียด' : 'คลิกเพื่อซ่อนรายละเอียด'}
                            >
                              {isCollapsed ? (
                                <ChevronRight className="w-4 h-4 text-indigo-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-indigo-400" />
                              )}
                            </button>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-[var(--text-primary)] group-hover/header:text-indigo-400 transition-colors">
                                  กลุ่มที่ #{idx + 1}: ขนาด {group.fileSizeFormatted}
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--bg-surface)] text-[var(--text-muted)] font-mono border border-[var(--border-lighter)]">
                                  SHA-256: {group.hash.substring(0, 12)}
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-sans border border-indigo-500/20 font-medium">
                                  {isCollapsed ? 'ซ่อนอยู่ (คลิกเปิด)' : 'กำลังแสดง'}
                                </span>
                              </div>
                              <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                                พบคู่ซ้ำทั้งหมด <strong className="text-indigo-400 font-medium">{group.duplicatesCount}</strong> สำเนา • ประหยัดเนื้อที่กลุ่มนี้ได้ <strong className="text-emerald-500 font-medium">{group.savedSpaceFormatted}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleGroupCollapse(group.hash)}
                              className="px-2.5 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--border-lighter)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-medium)] rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer h-[36px]"
                            >
                              {isCollapsed ? (
                                <>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                  <span>แสดงกลุ่ม</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                  <span>ซ่อนกลุ่ม</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExecuteDedupGroup(group.hash)}
                              disabled={isExecutingDedup || group.duplicates.every((d: any) => d.isHardLinked)}
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs h-[36px]"
                              title="ย้ายสำเนาในกลุ่มนี้ไป Pointer และลบไฟล์ซ้ำออกจากเซิร์ฟเวอร์"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>ย้ายกลุ่มนี้ไป Pointer</span>
                            </button>

                            <a
                              href={`/api/files/view?url=${encodeURIComponent(group.masterFile.url)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-500/20 shadow-xs h-[36px] min-w-[110px]"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>เปิดไฟล์ต้นฉบับ</span>
                            </a>
                          </div>
                        </div>

                        {/* Collapsed Info Bar */}
                        {isCollapsed ? (
                          <div
                            onClick={() => toggleGroupCollapse(group.hash)}
                            className="p-3 bg-[var(--bg-canvas)]/30 hover:bg-[var(--bg-canvas)]/60 border border-dashed border-[var(--border-medium)] rounded-lg text-xs text-[var(--text-secondary)] flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                              <span>ซ่อนรายละเอียดกลุ่มนี้อยู่ (มี 1 ไฟล์ต้นฉบับ และ {group.duplicates.length} ไฟล์สำเนา)</span>
                            </span>
                            <span className="text-indigo-400 font-medium flex items-center gap-1">
                              <span>คลิกเพื่อขยายดูรายละเอียด</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        ) : (
                          <>
                            {/* Master file Section */}
                            <div className="pl-3 sm:pl-4 border-l-2 border-emerald-500 space-y-1.5">
                              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                                <span>ไฟล์ต้นฉบับจริง (Master File - เก็บรักษาไว้):</span>
                              </div>
                              <div className="text-xs text-[var(--text-primary)] font-mono bg-[var(--bg-surface)] p-3 rounded-lg border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-xs">
                                <span className="break-all leading-relaxed select-all pr-2">{group.masterFile.url}</span>
                                <span className="text-[10px] text-emerald-400 font-sans font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0 self-start md:self-auto mt-1 md:mt-0">
                                  {group.masterFile.referencedDocs?.length > 0 ? `เชื่อมกับ ${group.masterFile.referencedDocs.length} เอกสาร` : 'ไฟล์ของระบบ'}
                                </span>
                              </div>
                            </div>

                            {/* Duplicates Section */}
                            <div className="pl-3 sm:pl-4 border-l-2 border-[var(--border-medium)] space-y-2.5">
                              <div className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                                <Copy className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                                <span>รายการสำเนาไฟล์ที่ซ้ำ (ย้ายไป Pointer & ลบไฟล์ซ้ำออกจากเซิร์ฟเวอร์ - {group.duplicates.length} ไฟล์):</span>
                              </div>

                              <div className="space-y-2">
                                {group.duplicates.map((dup: any, dIdx: number) => (
                                  <div key={dup.url || dIdx} className="text-xs bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-lighter)] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                                    <div className="font-mono text-[var(--text-secondary)] break-all flex items-start gap-2 leading-relaxed">
                                      <span className="text-[10px] text-[var(--text-muted)] font-sans mt-0.5">[{dIdx + 1}]</span>
                                      <span className="select-all">{dup.url}</span>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-[var(--border-lighter)] mt-1 md:mt-0">
                                      {dup.isHardLinked ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans font-medium">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                          <span>ย้ายไป Pointer แล้ว (0 B)</span>
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-1 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans font-medium">
                                          รอเคลียร์เป็น Pointer ({group.fileSizeFormatted})
                                        </span>
                                      )}

                                      <a
                                        href={`/api/files/download?url=${encodeURIComponent(dup.url)}`}
                                        className="w-[34px] h-[34px] flex items-center justify-center bg-[var(--bg-canvas)] hover:bg-[var(--border-lighter)] border border-[var(--border-medium)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-xs"
                                        title="ทดสอบดาวน์โหลดผ่านลิงก์สำเนา"
                                      >
                                        <Download className="w-4 h-4" />
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl w-full max-w-lg overflow-hidden shadow-xl animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)] bg-[var(--bg-canvas)]">
              <h3 className="font-sans font-semibold text-lg text-[var(--text-primary)] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[var(--primary-color)]" /> เพิ่มเจ้าหน้าที่ในหน่วยงาน
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">ชื่อผู้ใช้ (Username) *</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                    placeholder="เช่น somchai"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">รหัสผ่าน (Password) *</label>
                  <input 
                    type="password" 
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                    placeholder="กำหนดรหัสผ่าน"
                  />
                </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">อีเมล</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                  placeholder="เช่น user@example.com"
                />
              </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">ชื่อ *</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                    placeholder="เช่น สมชาย"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">นามสกุล</label>
                  <input 
                    type="text" 
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                    placeholder="เช่น ใจดี"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">ตำแหน่ง (ตาราง positions)</label>
                <select 
                  value={newUser.position}
                  onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                >
                  <option value="">-- เลือกตำแหน่งจากตาราง positions --</option>
                  {positions.map((pos: any) => (
                    <option key={pos.id} value={pos.name}>{pos.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">ฝ่าย/กลุ่มงาน (ตาราง Departments)</label>
                  <select 
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                  >
                    {departments.length === 0 ? (
                      <option value="ฝ่ายยุทธศาสตร์และการจัดการ">ฝ่ายยุทธศาสตร์และการจัดการ</option>
                    ) : (
                      departments.map((dept: any) => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">สิทธิ์การใช้งาน (Role)</label>
                  <select 
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none font-medium"
                  >
                    <option value="user">ผู้ใช้งานทั่วไป (User)</option>
                    <option value="moderator">ผู้ตรวจสอบ/เจ้าหน้าที่สารบรรณ (Moderator)</option>
                    {(props.user?.role === 'admin' || !props.user?.role) && (
                      <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-[var(--bg-canvas)] rounded-lg border border-[var(--border-light)] text-xs text-[var(--text-secondary)] flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>รหัสผ่านจะถูกเข้ารหัสด้วย <strong>Argon2id</strong> ก่อนบันทึก</span>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-light)]">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[var(--border-medium)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--border-lighter)]"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium"
                >
                  {isSubmittingUser ? 'กำลังบันทึก...' : 'บันทึกเจ้าหน้าที่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPassUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl w-full max-w-md overflow-hidden shadow-xl animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)] bg-[var(--bg-canvas)]">
              <h3 className="font-sans font-semibold text-base text-[var(--text-primary)] flex items-center gap-2">
                <Key className="w-4 h-4 text-[var(--primary-color)]" /> เปลี่ยนรหัสผ่านเจ้าหน้าที่
              </h3>
              <button 
                onClick={() => setResetPassUser(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-sm text-[var(--text-secondary)]">
                เปลี่ยนรหัสผ่านสำหรับ: <strong className="text-[var(--text-primary)]">{resetPassUser.firstName} {resetPassUser.lastName || ''}</strong> ({resetPassUser.username})
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">รหัสผ่านใหม่ (Argon2id Encrypted)</label>
                <input 
                  type="password" 
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                  placeholder="กรอกรหัสผ่านใหม่..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setResetPassUser(null)}
                  className="px-4 py-2 border border-[var(--border-medium)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--border-lighter)]"
                >
                  ยกเลิก
                </button>
                <button 
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isResettingPass}
                  className="px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium"
                >
                  {isResettingPass ? 'กำลังบันทึก...' : 'อัปเดตรหัสผ่าน Argon2id'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)] bg-[var(--bg-canvas)]">
              <h3 className="font-sans font-semibold text-base text-rose-500 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" /> {confirmDeleteModal.title}
              </h3>
              <button 
                onClick={() => setConfirmDeleteModal({ isOpen: false, type: null, item: null, title: '', message: '' })}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                {confirmDeleteModal.message}
              </p>

              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>คำเตือน: ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนกลับมาได้</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-light)]">
                <button 
                  type="button"
                  onClick={() => setConfirmDeleteModal({ isOpen: false, type: null, item: null, title: '', message: '' })}
                  className="px-4 py-2 border border-[var(--border-medium)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="button"
                  onClick={handleExecuteDelete}
                  disabled={isDeletingItem}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeletingItem ? 'กำลังลบข้อมูล...' : 'ยืนยันการลบ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)] bg-[var(--bg-canvas)]">
              <h3 className="font-sans font-semibold text-base text-[var(--text-primary)] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[var(--primary-color)]" /> เพิ่มแผนก/กลุ่มงานใหม่
              </h3>
              <button 
                onClick={() => setShowAddDeptModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDeptSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">ชื่อแผนก/กลุ่มงาน *</label>
                <input 
                  type="text" 
                  required
                  value={newDeptData.name}
                  onChange={(e) => setNewDeptData({ ...newDeptData, name: e.target.value })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                  placeholder="เช่น กลุ่มงานยุทธศาสตร์และการจัดการ"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">รายละเอียดแผนก/กลุ่มงาน (ถ้ามี)</label>
                <textarea 
                  value={newDeptData.description}
                  onChange={(e) => setNewDeptData({ ...newDeptData, description: e.target.value })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none resize-none h-20"
                  placeholder="รายละเอียดหน้าที่หรือขอบเขตงาน..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-light)]">
                <button 
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 border border-[var(--border-medium)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  disabled={isAddingDept}
                  className="px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {isAddingDept ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Position Modal */}
      {showAddPosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)] bg-[var(--bg-canvas)]">
              <h3 className="font-sans font-semibold text-base text-[var(--text-primary)] flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[var(--primary-color)]" /> เพิ่มตำแหน่งงานใหม่
              </h3>
              <button 
                onClick={() => setShowAddPosModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPosSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">ชื่อตำแหน่งงาน *</label>
                <input 
                  type="text" 
                  required
                  value={newPosData.name}
                  onChange={(e) => setNewPosData({ ...newPosData, name: e.target.value })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                  placeholder="เช่น นักป้องกันและบรรเทาสาธารณภัยปฏิบัติการ"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">รายละเอียด / กลุ่มงาน (ถ้ามี)</label>
                <input 
                  type="text" 
                  value={newPosData.description}
                  onChange={(e) => setNewPosData({ ...newPosData, description: e.target.value })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                  placeholder="เช่น กลุ่มงานยุทธศาสตร์ฯ"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-light)]">
                <button 
                  type="button"
                  onClick={() => setShowAddPosModal(false)}
                  className="px-4 py-2 border border-[var(--border-medium)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  disabled={isAddingPos}
                  className="px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {isAddingPos ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OTP Email Theme Preview Modal */}
      {showOtpPreviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[var(--border-lighter)] flex items-center justify-between bg-[var(--bg-canvas)]">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-base text-[var(--text-primary)]">
                  ตัวอย่างรูปแบบอีเมล OTP (OTP Email Theme Preview)
                </h3>
              </div>
              <button
                onClick={() => setShowOtpPreviewModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--border-lighter)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-100 dark:bg-slate-900 flex-1">
              {/* Fake Email Envelope Header */}
              <div className="mb-4 bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1 shadow-sm">
                <div className="flex gap-2">
                  <span className="font-semibold text-slate-400 w-16">ผู้ส่ง:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{smtpFrom || '"ระบบสารบรรณ" <no-reply@example.com>'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold text-slate-400 w-16">หัวข้อ:</span>
                  <span className="font-bold text-slate-900 dark:text-white">รหัสผ่านใหม่ (OTP) - {orgName || 'ระบบงานสารบรรณ'}</span>
                </div>
              </div>

              {/* Rendered HTML Email Preview */}
              <div className="max-w-xl mx-auto bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                {/* Top Accent Line */}
                <div className="h-1.5 bg-gradient-to-r from-blue-700 via-blue-500 to-amber-500"></div>

                {/* Header */}
                <div className="bg-[#0f172a] p-8 text-center text-white">
                  <div className="w-16 h-16 bg-white rounded-2xl p-1.5 inline-flex items-center justify-center shadow-lg mb-3">
                    <img
                      key={`otp-preview-${logoUrl}`}
                      src={getLogoSrc(logoUrl)}
                      alt="Logo"
                      className="w-12 h-12 object-contain"
                      style={{ maxWidth: '48px', maxHeight: '48px' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const fallback = 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png';
                        if (target.src !== fallback) {
                          target.src = fallback;
                        }
                      }}
                    />
                  </div>
                  <h1 className="text-lg font-bold text-white leading-snug">{orgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'}</h1>
                  <p className="text-xs text-slate-400 font-medium mt-1">ระบบสารบรรณและบริหารเอกสารอิเล็กทรอนิกส์ (EDMS)</p>
                </div>

                {/* Body */}
                <div className="p-8 text-center bg-white">
                  <div className="inline-block bg-blue-50 text-blue-700 border border-blue-200 px-4 py-1.5 rounded-full text-xs font-semibold mb-5">
                    🔑 รหัสยืนยันตัวตน / OTP Verification
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 mb-2">คำร้องขอตั้งรหัสผ่านใหม่</h2>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-md mx-auto">
                    ท่านได้ทำการขอรหัสผ่านชั่วคราว (OTP) เพื่อเข้าใช้งานระบบ โปรดนำรหัสผ่านด้านล่างนี้ไปกรอกในหน้ายืนยันตัวตน
                  </p>

                  {/* OTP Code Box */}
                  <div className="bg-gradient-to-b from-slate-50 to-blue-50 border-2 border-dashed border-blue-500 rounded-2xl p-6 mb-6">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">รหัส OTP ของคุณคือ</div>
                    <div className="font-mono text-4xl font-extrabold text-blue-800 tracking-[10px] leading-none">
                      849201
                    </div>
                  </div>

                  {/* Notice Box */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                    <p className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
                      ⏰ ระยะเวลาการใช้งาน & ข้อควรระวัง
                    </p>
                    <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                      <li>รหัส OTP นี้มีอายุการใช้งาน <strong>15 นาที</strong> เท่านั้น</li>
                      <li>หากท่านไม่ได้เป็นผู้ทำรายการนี้ โปรดละเว้นอีเมลฉบับนี้และแจ้งผู้ดูแลระบบ</li>
                    </ul>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 border-t border-slate-200 p-6 text-center text-slate-600">
                  <p className="text-xs font-bold text-slate-700 mb-1">{orgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'}</p>
                  <p className="text-[11px] text-slate-500 mb-3">{footerText || 'ระบบสารบรรณและบริหารเอกสารอิเล็กทรอนิกส์ (EDMS)'}</p>
                  <div className="w-4/5 h-px bg-slate-200 mx-auto mb-3"></div>
                  <p className="text-[10px] text-slate-400">
                    ข้อความนี้เป็นอีเมลอัตโนมัติจากระบบสารบรรณอิเล็กทรอนิกส์ กรุณาอย่าตอบกลับอีเมลนี้
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--border-lighter)] flex justify-end bg-[var(--bg-canvas)]">
              <button
                onClick={() => setShowOtpPreviewModal(false)}
                className="px-5 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
