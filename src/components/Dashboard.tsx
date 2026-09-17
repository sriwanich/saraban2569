import React, { useState, useEffect, useMemo } from 'react';
import { Menu, X, CheckCheck, Home, FileText, Bell, User, LogOut, Search, Send, FolderArchive, Settings as SettingsIcon, Sun, Moon, Monitor, FileSpreadsheet, FolderOpen, ShieldCheck, Key, Briefcase, AlertTriangle, Trash2, Building2, Camera, Download, FileEdit, GitMerge, Sparkles, Pin, QrCode, ShieldAlert, Lock, Workflow, BarChart3 } from 'lucide-react';
import WorkflowSlaView from './views/WorkflowSlaView';

import { DocumentItem, DocType } from '../types';
import Overview from './views/Overview';
import DocumentList from './views/DocumentList';
import Settings from './views/Settings';
import LogsView from './views/LogsView';
import DocumentFormModal from './DocumentModal';
import DocumentDetailModal from './DocumentDetailModal';
import AdminDocsView from './views/AdminDocsView';
import FoldersView from './views/FoldersView';
import DraftDocsView from './views/DraftDocsView';
import SmartAiAssistantView from './views/SmartAiAssistantView';
import NotificationsView from './views/NotificationsView';
import DigitalSignatureView from './DigitalSignatureView';
import RecycleBinView from './views/RecycleBinView';
import QrGeneratorView from './views/QrGeneratorView';
import UrgentIncidentReportView from './views/disaster/UrgentIncidentReportView';
import ChangelogModal from './ChangelogModal';
import VersionBadge from './VersionBadge';
import { LoadingIndicator } from './LoadingIndicator';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const InfographicsEditorView = lazyWithRetry(() => import('./views/InfographicsEditorView'));
import { ThemeMode } from '../App';
import { parseEnabledFeatures, DEFAULT_ENABLED_FEATURES } from '../utils/featureFlags';
import { useRealtimeSync } from '../utils/realtimeSync';
import { useConfirm } from '../context/ConfirmContext';

export default function Dashboard({ onLogout, theme, setTheme, user, isSystemDark }: { onLogout: () => void, theme: ThemeMode, setTheme: (mode: ThemeMode) => void, user: any, isSystemDark?: boolean }) {
  const { confirm } = useConfirm();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('edms_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    const nextState = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextState);
    localStorage.setItem('edms_sidebar_collapsed', String(nextState));
  };

  const [activeTab, setActiveTab] = useState('overview');
  const [disasterPrefillData, setDisasterPrefillData] = useState<any>(null);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);

  // Feature flags control from settings
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('moi_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.enabledFeatures) {
          return parseEnabledFeatures(parsed.enabledFeatures);
        }
      }
    } catch (e) {
      console.error('Error loading initial enabledFeatures:', e);
    }
    return { ...DEFAULT_ENABLED_FEATURES };
  });

  // Redirect to first enabled tab if active tab gets disabled
  useEffect(() => {
    const isCurrentTabEnabled = enabledFeatures[activeTab] !== false || activeTab === 'settings' || activeTab === 'notifications';
    if (!isCurrentTabEnabled) {
      const firstEnabledItem = navItems.find(item => enabledFeatures[item.id] !== false);
      if (firstEnabledItem) {
        setActiveTab(firstEnabledItem.id);
      }
    }
  }, [enabledFeatures, activeTab]);

  const [currentUser, setCurrentUser] = useState(user);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [positionsList, setPositionsList] = useState<any[]>([
    { id: 1, name: 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด', description: 'ผู้บริหารระดับสูงประจำสำนักงาน ปภ.จังหวัด' },
    { id: 2, name: 'นักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', description: 'หัวหน้ากลุ่มงาน/ฝ่ายยุทธศาสตร์และการจัดการ' },
    { id: 3, name: 'นักวิเคราะห์นโยบายและแผนชำนาญการ', description: 'ฝ่ายยุทธศาสตร์และการจัดการ' },
    { id: 4, name: 'เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยชำนาญงาน', description: 'ฝ่ายป้องกันและปฏิบัติการ' },
    { id: 5, name: 'เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยปฏิบัติงาน', description: 'ฝ่ายป้องกันและปฏิบัติการ' },
    { id: 6, name: 'เจ้าพนักงานสงเคราะห์ผู้ประสบภัยชำนาญงาน', description: 'ฝ่ายสงเคราะห์ผู้ประสบภัย' },
    { id: 7, name: 'เจ้าพนักงานการเงินและบัญชีชำนาญงาน', description: 'ฝ่ายยุทธศาสตร์และการจัดการ' },
    { id: 8, name: 'เจ้าพนักงานธุรการชำนาญงาน', description: 'ฝ่ายยุทธศาสตร์และการจัดการ' },
    { id: 9, name: 'นายช่างเครื่องกลชำนาญงาน', description: 'ฝ่ายป้องกันและปฏิบัติการ' }
  ]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([
    { id: 1, name: 'ฝ่ายยุทธศาสตร์และการจัดการ', description: 'งานธุรการ สารบรรณ การเงิน พัสดุ นโยบาย แผนงาน และยุทธศาสตร์' },
    { id: 2, name: 'ฝ่ายป้องกันและปฏิบัติการ', description: 'งานป้องกันและบรรเทาสาธารณภัย กู้ภัย การฝึกซ้อม และการเผชิญเหตุ' },
    { id: 3, name: 'ฝ่ายสงเคราะห์ผู้ประสบภัย', description: 'งานช่วยเหลือ เยียวยา และฟื้นฟูผู้ประสบสาธารณภัย' }
  ]);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    position: user?.position || '',
    department: user?.department || '',
    emailNotifications: user?.emailNotifications !== undefined ? user.emailNotifications : true,
    currentPassword: '',
    password: '',
    confirmPassword: '',
    avatar: user?.avatar || ''
  });

  useEffect(() => {
    setCurrentUser(user);
    setProfileForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      position: user?.position || '',
      department: user?.department || '',
      currentPassword: '',
      password: '',
      confirmPassword: '',
      avatar: user?.avatar || ''
    ,
    emailNotifications: profileForm.emailNotifications
  });
  }, [user]);

  const fetchMeta = async () => {
    try {
      const results = await Promise.allSettled([
        fetch('/api/positions').then(async res => res.ok ? res.json() : null),
        fetch('/api/departments').then(async res => res.ok ? res.json() : null),
        fetch(`/api/role-permissions?t=${Date.now()}`, { cache: 'no-store' }).then(async res => res.ok ? res.json() : null)
      ]);

      if (results[0].status === 'fulfilled' && Array.isArray(results[0].value) && results[0].value.length > 0) {
        setPositionsList(results[0].value);
      }
      if (results[1].status === 'fulfilled' && Array.isArray(results[1].value) && results[1].value.length > 0) {
        setDepartmentsList(results[1].value);
      }
      if (results[2].status === 'fulfilled' && Array.isArray(results[2].value) && results[2].value.length > 0) {
        setRolePermissions(results[2].value);
      }
    } catch (err) {
      console.warn('Meta lists fetch fallback active:', err);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  const getLogoSrc = (url: string | null | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '' || url === 'null' || url === 'undefined') {
      return 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png';
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return url.startsWith('/') ? url : `/${url}`;
  };

  const hasPermission = (key: string): boolean => {
    if (!currentUser?.role) return false;

    // Hardcoded minimums to prevent lockout
    if (currentUser.role === 'admin' && (key === 'system_settings' || key === 'manage_users')) {
      return true;
    }

    // 1. Check department-specific override first if user belongs to a department
    if (currentUser?.department) {
      const deptTag = `dept:${currentUser.department}`;
      const deptPerm = rolePermissions.find(p => (p.role === deptTag || p.role === currentUser.department) && p.permission_key === key);
      if (deptPerm) {
        return deptPerm.is_allowed === 1 || deptPerm.is_allowed === true;
      }
    }

    // 2. Fall back to role-based permission
    const perm = rolePermissions.find(p => p.role === currentUser.role && p.permission_key === key);
    if (perm) {
      return perm.is_allowed === 1 || perm.is_allowed === true;
    }
    
    // Fallbacks if not configured in DB yet
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'moderator') {
      return [
        'view_all_docs', 'create_docs', 'edit_all_docs', 'delete_docs', 'approve_docs', 'export_docs',
        'admin_docs', 'ai_assistant', 'infographics', 'qr_generator', 'draft_docs',
        'digital_folders', 'workflow_sla', 'digital_signatures', 'recycle_bin', 'manage_users', 'urgent_incidents'
      ].includes(key);
    }
    if (currentUser.role === 'user') {
      return [
        'create_docs', 'export_docs', 'ai_assistant', 'infographics', 'qr_generator',
        'draft_docs', 'digital_folders', 'workflow_sla', 'urgent_incidents'
      ].includes(key);
    }
    return false;
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      const username = currentUser?.username || 'user';
      formData.append('subfolder', 'avatars');
      formData.append('uploadedBy', username);
      formData.append('files', file);

      try {
        const res = await fetch(`/api/upload?subfolder=avatars&uploadedBy=${encodeURIComponent(username)}`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          if (data.files && data.files.length > 0) {
            setProfileForm(prev => ({ ...prev, avatar: data.files[0].url }));
          }
        } else {
          alert('ไม่สามารถอัปโหลดรูปโปรไฟล์ได้');
        }
      } catch (err) {
        console.error('Error uploading avatar:', err);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อเพื่ออัปโหลด');
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileForm.password) {
      if (!profileForm.currentPassword) {
        alert('กรุณากรอกรหัสผ่านปัจจุบัน (รหัสผ่านเดิม) เพื่อยืนยันการเปลี่ยนรหัสผ่านใหม่');
        return;
      }
      if (profileForm.password !== profileForm.confirmPassword) {
        alert('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }
    }

    const confirmed = await confirm({
      title: 'ยืนยันการบันทึกข้อมูลส่วนตัว',
      message: 'คุณต้องการบันทึกการแก้ไขข้อมูลโปรไฟล์ผู้ใช้งานใช่หรือไม่?',
      type: 'edit',
      confirmText: 'ยืนยันการบันทึก',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    setIsSavingProfile(true);
    try {
      const payload = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        position: profileForm.position,
        department: profileForm.department,
        role: currentUser?.role || 'user',
        avatar: profileForm.avatar,
        ...(profileForm.password ? {
          currentPassword: profileForm.currentPassword,
          password: profileForm.password,
          requireCurrentPassword: true
        } : {}),
        updatedBy: `${profileForm.firstName} ${profileForm.lastName}`
      };
      const res = await fetch(`/api/users/${currentUser?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = { ...currentUser, ...payload };
        delete updated.password;
        delete updated.currentPassword;
        setCurrentUser(updated);
        localStorage.setItem('edms_user_data', JSON.stringify(updated));
        alert('บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว');
        setIsProfileModalOpen(false);
        setProfileForm(prev => ({ ...prev, currentPassword: '', password: '', confirmPassword: '' }));
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'ไม่สามารถบันทึกโปรไฟล์ได้');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSavingProfile(false);
    }
  };
  
  const [inboxDocs, setInboxDocs] = useState<DocumentItem[]>([]);
  const [outboxDocs, setOutboxDocs] = useState<DocumentItem[]>([]);
  const [adminDocs, setAdminDocs] = useState<DocumentItem[]>([]);

  const [hasInboxLoaded, setHasInboxLoaded] = useState(false);
  const [hasOutboxLoaded, setHasOutboxLoaded] = useState(false);
  const [hasAdminLoaded, setHasAdminLoaded] = useState(false);

  const [createDocType, setCreateDocType] = useState<DocType>('inbox');

  const documents = [...inboxDocs, ...outboxDocs, ...adminDocs];

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [docToEdit, setDocToEdit] = useState<DocumentItem | null>(null);

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [dropdownFilter, setDropdownFilter] = useState<'unread' | 'all'>('unread');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dismissed_notifications') {
        try {
          setDismissedIds(JSON.parse(e.newValue || '[]'));
        } catch {}
      }
      if (e.key === 'read_notifications') {
        try {
          const readIds = JSON.parse(e.newValue || '[]');
          setNotifications(prev => prev.map(n => ({ ...n, read: readIds.includes(n.id) })));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const visibleNotifications = useMemo(() => {
    return notifications.filter(n => !dismissedIds.includes(n.id));
  }, [notifications, dismissedIds]);

  const unreadNotifications = useMemo(() => {
    return visibleNotifications.filter(n => !n.read);
  }, [visibleNotifications]);

  const unreadCount = unreadNotifications.length;

  const handleDismissNotification = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDismissedIds(prev => {
      const updated = prev.includes(id) ? prev : [...prev, id];
      localStorage.setItem('dismissed_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearReadNotifications = () => {
    const readItemIds = notifications.filter(n => n.read).map(n => n.id);
    setDismissedIds(prev => {
      const updated = Array.from(new Set([...prev, ...readItemIds]));
      localStorage.setItem('dismissed_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllNotifications = () => {
    const allIds = notifications.map(n => n.id);
    setDismissedIds(prev => {
      const updated = Array.from(new Set([...prev, ...allIds]));
      localStorage.setItem('dismissed_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const formatThaiRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      if (diffMs < 0) return 'เมื่อครู่';
      
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'เมื่อครู่';
      if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'เมื่อวานนี้';
      if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
      
      const monthsThai = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      const day = date.getDate();
      const month = monthsThai[date.getMonth()];
      const year = date.getFullYear() + 543;
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${day} ${month} ${year} ${hours}:${minutes} น.`;
    } catch (e) {
      return dateString;
    }
  };

  const fetchNotifications = async () => {
    try {
      const fullName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : '';
      const params = new URLSearchParams({
        department: currentUser?.department || '',
        name: fullName,
        role: currentUser?.role || ''
      });
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        const updated = data.map((n: any) => ({
          ...n,
          read: readIds.includes(n.id),
          timeFormatted: formatThaiRelativeTime(n.time)
        }));
        setNotifications(updated);
      }
    } catch (err) {
      console.warn('Warning: Could not fetch notifications (possibly disconnected):', err);
    }
  };


  const markAsRead = (id: string) => {
    const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem('read_notifications', JSON.stringify(readIds));
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  
  const markAllAsRead = () => {
    const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
    notifications.forEach(n => {
      if (!readIds.includes(n.id)) {
        readIds.push(n.id);
      }
    });
    localStorage.setItem('read_notifications', JSON.stringify(readIds));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    const doc = documents.find(d => d.id === notification.docId);
    if (doc) {
      setSelectedDoc(doc);
    }
    setIsNotificationOpen(false);
  };

  const [orgName, setOrgName] = useState('สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  const [headerOrgName, setHeaderOrgName] = useState('');
  const [logoUrl, setLogoUrl] = useState('/public/ddpm-logo.svg');
  const [currentYear, setCurrentYear] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('moi_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.currentYear) {
          return Number(parsed.currentYear);
        }
      }
    } catch (e) {}
    return 2569;
  });

  const isCentralPrivileged = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const isCentralUser = isCentralPrivileged;

  const isDocForUserDepartment = (doc: DocumentItem) => {
    if (isCentralPrivileged) return true;

    if (!currentUser?.department) return false;

    const userDept = currentUser.department.trim();
    const userName = currentUser.username;
    const userFirstName = currentUser.firstName;
    const isCentralDoc = !(doc.isCentral === 0 || Number(doc.isCentral) === 0);

    const matchesDept = 
      doc.department === userDept ||
      doc.from === userDept ||
      doc.to === userDept ||
      (doc.createdBy && userName && doc.createdBy === userName) ||
      (doc.assignee && ((userName && doc.assignee.includes(userName)) || (userFirstName && doc.assignee.includes(userFirstName)))) ||
      (doc.forwardedTo && doc.forwardedTo.includes(userDept)) ||
      (doc.departmentReceives && Array.isArray(doc.departmentReceives) && doc.departmentReceives.some(r => r.department === userDept));

    if (isCentralDoc) {
      const matchesForward = doc.forwardedTo && doc.forwardedTo.includes(userDept);
      const matchesReceive = doc.departmentReceives && Array.isArray(doc.departmentReceives) && doc.departmentReceives.some(r => r.department === userDept);
      return Boolean(matchesForward || matchesReceive);
    }

    return Boolean(matchesDept);
  };

  const fetchDocuments = async () => {
    try {
      const queryParams = new URLSearchParams({
        role: currentUser?.role || 'user',
        department: currentUser?.department || '',
        isCentral: isCentralUser ? '1' : '0',
        username: currentUser?.username || ''
      }).toString();
      const res = await fetch(`/api/documents?${queryParams}`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setInboxDocs(data.filter(d => d.type === 'inbox'));
          setOutboxDocs(data.filter(d => d.type === 'outbox'));
          setAdminDocs(data.filter(d => d.type === 'admin'));
          setHasInboxLoaded(true);
          setHasOutboxLoaded(true);
          setHasAdminLoaded(true);
          return;
        }
      }
      setHasInboxLoaded(true);
      setHasOutboxLoaded(true);
      setHasAdminLoaded(true);
    } catch (err) {
      console.warn('Documents fetch fallback active:', err);
      setHasInboxLoaded(true);
      setHasOutboxLoaded(true);
      setHasAdminLoaded(true);
    }
  };

  const [favorites, setFavorites] = useState<string[]>([]);

  const fetchFavorites = async () => {
    if (!currentUser?.username) return;
    try {
      const res = await fetch(`/api/favorites?username=${encodeURIComponent(currentUser.username)}`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (data && Array.isArray(data.favorites)) {
          setFavorites(data.favorites.map((f: any) => f.docId));
        }
      }
    } catch (err) {
      console.warn('Favorites fetch fallback active:', err);
    }
  };

  const handleToggleFavorite = async (doc: DocumentItem) => {
    if (!currentUser?.username) {
      alert('กรุณาเข้าสู่ระบบเพื่อใช้งานฟังก์ชันนี้');
      return;
    }
    try {
      const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username,
          docId: doc.id,
          docType: doc.type || 'inbox'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pinned) {
          setFavorites(prev => [...prev, doc.id]);
        } else {
          setFavorites(prev => prev.filter(id => id !== doc.id));
        }
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const refreshData = async () => {
    await fetchDocuments();
    await fetchNotifications();
    await fetchFavorites();
  };

  const fetchRolePermissions = async () => {
    try {
      const permRes = await fetch(`/api/role-permissions?t=${Date.now()}`, { cache: 'no-cache' });
      if (permRes.ok && permRes.headers.get('content-type')?.includes('application/json')) {
        setRolePermissions(await permRes.json());
      }
    } catch (_) {
      // Graceful fallback during server boot
    }
  };

  const fetchSettings = async () => {
    try {
      fetchRolePermissions();
      const res = await fetch('/api/settings');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        localStorage.setItem('moi_settings', JSON.stringify(data));
        if (data.orgName) setOrgName(data.orgName);
        if (data.headerOrgName !== undefined) setHeaderOrgName(data.headerOrgName || '');
        if (data.logoUrl !== undefined) setLogoUrl(data.logoUrl);
        if (data.currentYear) setCurrentYear(data.currentYear);
        if (data.enabledFeatures !== undefined) {
          const parsed = parseEnabledFeatures(data.enabledFeatures);
          setEnabledFeatures(parsed);
        }
      }
    } catch (_) {
      // Gracefully fall back to local stored settings
      try {
        const cached = localStorage.getItem('moi_settings');
        if (cached) {
          const data = JSON.parse(cached);
          if (data.orgName) setOrgName(data.orgName);
          if (data.logoUrl) setLogoUrl(data.logoUrl);
          if (data.currentYear) setCurrentYear(data.currentYear);
          if (data.enabledFeatures) setEnabledFeatures(parseEnabledFeatures(data.enabledFeatures));
        }
      } catch (e) {}
    }
  };

  // Real-time synchronization hooks: updates UI instantly across all tabs & users without Ctrl+F5
  useRealtimeSync(
    ['DOCUMENTS_UPDATED', 'RECYCLE_UPDATED', 'WORKFLOW_UPDATED', 'FAVORITES_UPDATED', 'DRAFTS_UPDATED', 'TAB_FOCUSED', 'DATA_UPDATED'],
    () => {
      refreshData();
    },
    [currentUser]
  );

  useRealtimeSync(
    ['NOTIFICATIONS_UPDATED'],
    () => {
      fetchNotifications();
    },
    [currentUser]
  );

  useRealtimeSync(
    ['SETTINGS_UPDATED', 'USERS_UPDATED', 'TAB_FOCUSED'],
    () => {
      fetchSettings();
      fetchMeta();
    }
  );

  useEffect(() => {
    refreshData();
    fetchSettings();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchNotifications();
        fetchSettings();
      }
    }, 60000); // 60s resilient fallback interval, real-time SSE handles instant updates
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveDoc = async (newDoc: DocumentItem) => {
    try {
      const oldDoc = documents.find(d => d.id === newDoc.id);
      
      if (oldDoc) {
        // Update
        await fetch(`/api/documents/${newDoc.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDoc)
        });
      } else {
        // Create
        await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newDoc)
        });
      }

      await refreshData();
      setIsCreateModalOpen(false);
      setDocToEdit(null);
    } catch (err) {
      console.error("Error saving document:", err);
    }
  };

  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  const handleEditDoc = (docToEditItem: DocumentItem) => {
    setDocToEdit(docToEditItem);
    setIsCreateModalOpen(true);
  };

  const handleDeleteDoc = (id: string) => {
    setDeletingDocId(id);
  };

  const confirmDeleteDoc = async () => {
    if (!deletingDocId) return;
    setIsDeletingDoc(true);
    try {
      const userFullName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username : 'ผู้ใช้งาน';
      await fetch(`/api/documents/${deletingDocId}?username=${encodeURIComponent(userFullName)}`, {
        method: 'DELETE'
      });
      if (selectedDoc && selectedDoc.id === deletingDocId) {
        setSelectedDoc(null);
      }
      setDeletingDocId(null);
      await refreshData();
    } catch (err) {
      console.error("Error deleting document:", err);
    } finally {
      setIsDeletingDoc(false);
    }
  };

  const baseNavItems: { id: string; icon: any; label: string; permKey?: string }[] = [
    { id: 'overview', icon: Home, label: 'ภาพรวมระบบ' },
    { id: 'ai_assistant', icon: Sparkles, label: 'ผู้ช่วย AI Smart', permKey: 'ai_assistant' },
    { id: 'inbox', icon: FileText, label: 'ทะเบียนหนังสือรับ' },
    { id: 'outbox', icon: Send, label: 'ทะเบียนหนังสือส่ง' },
    { id: 'admin_docs', icon: FileSpreadsheet, label: 'ระบบงานธุรการ', permKey: 'admin_docs' },
    { id: 'infographics', icon: Camera, label: 'ออกแบบ Infographics', permKey: 'infographics' },
    { id: 'favorites', icon: Pin, label: 'เอกสารสำคัญปักหมุด' },
    { id: 'draft_docs', icon: FileEdit, label: 'ร่างเอกสาร', permKey: 'draft_docs' },
    { id: 'folders', icon: FolderOpen, label: 'แฟ้มเอกสารดิจิทัล', permKey: 'digital_folders' },
    { id: 'workflow_sla', icon: Workflow, label: 'ผังการเดินเอกสาร & SLA', permKey: 'workflow_sla' },
    { id: 'digital_signatures', icon: ShieldCheck, label: 'ศูนย์ลงนามดิจิทัล (ETDA)', permKey: 'digital_signatures' },
    { id: 'qr_generator', icon: QrCode, label: 'สร้าง QR Code สารบรรณ', permKey: 'qr_generator' },
    { id: 'urgent_incidents', icon: AlertTriangle, label: 'แบบรายงานเหตุด่วน', permKey: 'urgent_incidents' },
  ];

  const navItems = baseNavItems.filter(item => {
    if (enabledFeatures[item.id] === false) return false;
    if (item.permKey && !hasPermission(item.permKey)) return false;
    return true;
  });

  if (hasPermission('audit_logs') && enabledFeatures['logs'] !== false) {
    navItems.push({ id: 'logs', icon: ShieldCheck, label: 'บันทึกประวัติระบบ' });
  }

  if (currentUser?.role === 'admin') {
    navItems.push({ id: 'settings', icon: SettingsIcon, label: 'ตั้งค่าระบบ' });
  } else if (currentUser?.role === 'moderator') {
    navItems.push({ id: 'settings', icon: SettingsIcon, label: 'ตั้งค่า & สิทธิ์การใช้งาน' });
  } else if (currentUser?.role === 'user') {
    navItems.push({ id: 'settings', icon: SettingsIcon, label: 'สิทธิ์การใช้งาน' });
  }

  const handleViewDoc = (docOrId: DocumentItem | string) => {
    if (typeof docOrId === 'string') {
      const found = documents.find(d => d.id === docOrId || d.docNumber === docOrId || d.receiveNumber === docOrId);
      if (found) {
        setSelectedDoc(found);
      }
    } else {
      setSelectedDoc(docOrId);
    }
  };

  const renderGuardedView = (permKey: string, featureName: string, viewComponent: React.ReactNode) => {
    if (!hasPermission(permKey)) {
      return (
        <div className="p-8 sm:p-12 bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl text-center space-y-4 max-w-2xl mx-auto my-12 shadow-sm animate-fade-in">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold font-sans text-[var(--text-primary)]">
              ไม่มีสิทธิ์เข้าถึงฟังก์ชัน {featureName}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              บัญชีผู้ใช้งานของคุณ ({currentUser?.firstName || currentUser?.username} - {currentUser?.role === 'admin' ? 'ผู้ดูแลระบบ' : currentUser?.role === 'moderator' ? 'ผู้ตรวจสอบ' : 'ผู้ใช้งานทั่วไป'}) ไม่ได้รับอนุญาตให้ใช้งานในส่วนนี้ กรุณาติดต่อผู้ดูแลระบบ (Admin) เพื่อเปิดสิทธิ์ในแผงควบคุมสิทธิ์ (Interactive Role Permission Matrix)
            </p>
          </div>
          <div className="p-3 bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl text-xs text-[var(--text-muted)] font-mono inline-block">
            Required Permission Key: <span className="font-bold text-[var(--primary-color)]">{permKey}</span>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setActiveTab('overview')}
              className="px-5 py-2.5 rounded-xl bg-[var(--primary-color)] text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              กลับสู่หน้าภาพรวมระบบ
            </button>
          </div>
        </div>
      );
    }
    return viewComponent;
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'overview':
        return <Overview 
          documents={documents.filter(isDocForUserDepartment)} 
          user={currentUser} 
          onCreateDoc={(type, prefillData) => { 
            setCreateDocType(type || 'inbox'); 
            if (prefillData) {
              setDocToEdit(prefillData as DocumentItem);
            } else {
              setDocToEdit(null);
            }
            setIsCreateModalOpen(true); 
          }} 
          onViewDoc={setSelectedDoc} 
          enabledFeatures={enabledFeatures} 
        />;
      case 'ai_assistant':
        return renderGuardedView('ai_assistant', 'ผู้ช่วย AI Smart สารบรรณ', (
          <SmartAiAssistantView 
            user={currentUser} 
            documents={documents.filter(isDocForUserDepartment)} 
            onViewDoc={handleViewDoc} 
            onNavigateToDrafts={() => setActiveTab('draft_docs')}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        ));
      case 'inbox':
        return <DocumentList 
          title="ทะเบียนหนังสือรับ" 
          documents={inboxDocs.filter(isDocForUserDepartment)} 
          onViewDoc={setSelectedDoc} 
          onCreateDoc={() => { setCreateDocType('inbox'); setIsCreateModalOpen(true); }}
          onEditDoc={handleEditDoc}
          onDeleteDoc={handleDeleteDoc}
          user={currentUser}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          hasPermission={hasPermission}
        />;
      case 'outbox':
        return <DocumentList 
          title="ทะเบียนหนังสือส่ง" 
          documents={outboxDocs.filter(isDocForUserDepartment)} 
          onViewDoc={setSelectedDoc} 
          onCreateDoc={() => { setCreateDocType('outbox'); setIsCreateModalOpen(true); }}
          onEditDoc={handleEditDoc}
          onDeleteDoc={handleDeleteDoc}
          user={currentUser}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          hasPermission={hasPermission}
        />;
      case 'admin_docs':
        return renderGuardedView('admin_docs', 'ระบบงานธุรการและแบบฟอร์ม', (
          <AdminDocsView 
            documents={documents.filter(isDocForUserDepartment)} 
            onViewDoc={setSelectedDoc}
            onCreateDoc={() => { setCreateDocType('admin'); setIsCreateModalOpen(true); }}
            onEditDoc={handleEditDoc}
            onDeleteDoc={handleDeleteDoc}
            user={currentUser}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        ));
      case 'infographics':
        return renderGuardedView('infographics', 'เครื่องมือออกแบบ Infographics', (
          <React.Suspense fallback={
            <LoadingIndicator fullScreen={false} message="กำลังโหลดเครื่องมือออกแบบ Infographics..." />
          }>
            <InfographicsEditorView user={currentUser} />
          </React.Suspense>
        ));
      case 'favorites':
        return <DocumentList 
          title="เอกสารสำคัญปักหมุด" 
          documents={documents.filter(d => favorites.includes(d.id)).filter(isDocForUserDepartment)} 
          onViewDoc={setSelectedDoc} 
          onEditDoc={handleEditDoc}
          onDeleteDoc={handleDeleteDoc}
          user={currentUser}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          hasPermission={hasPermission}
        />;
      case 'draft_docs':
        return renderGuardedView('draft_docs', 'ระบบร่างและจัดทำหนังสือ', (
          <DraftDocsView 
            user={currentUser} 
            enabledFeatures={enabledFeatures}
            onSaveToRegistry={() => {
              setCreateDocType('outbox');
              setIsCreateModalOpen(true);
            }}
            onSendToDisasterReport={(data) => {
              setDisasterPrefillData(data);
              setActiveTab('urgent_incidents');
            }}
          />
        ));
      case 'folders':
        return renderGuardedView('digital_folders', 'แฟ้มเอกสารดิจิทัล', (
          <FoldersView 
            documents={documents.filter(isDocForUserDepartment)} 
            onViewDoc={setSelectedDoc}
            onRefreshDocs={refreshData}
            user={currentUser}
            hasPermission={hasPermission}
          />
        ));
      case 'workflow_sla':
        return renderGuardedView('workflow_sla', 'ผังการเดินเอกสารและติดตาม SLA (Workflow & SLA Tracking Center)', (
          <WorkflowSlaView 
            documents={documents.filter(isDocForUserDepartment)} 
            user={currentUser} 
            onViewDoc={handleViewDoc} 
          />
        ));
      case 'digital_signatures':
        return renderGuardedView('digital_signatures', 'ศูนย์ลงนามดิจิทัล ETDA', (
          <DigitalSignatureView 
            user={currentUser} 
            documents={documents.filter(isDocForUserDepartment)} 
            onViewDoc={handleViewDoc} 
            onRefreshData={refreshData} 
          />
        ));
      case 'qr_generator':
        return renderGuardedView('qr_generator', 'เครื่องมือสร้าง QR Code สารบรรณ', (
          <QrGeneratorView 
            user={currentUser} 
            documents={documents.filter(isDocForUserDepartment)} 
            onViewDoc={handleViewDoc} 
          />
        ));
      case 'urgent_incidents':
        return renderGuardedView('urgent_incidents', 'รายงานเหตุด่วนสาธารณภัย', (
          <UrgentIncidentReportView 
            user={currentUser} 
            prefillData={disasterPrefillData}
            onClearPrefillData={() => setDisasterPrefillData(null)}
          />
        ));

      case 'recycle_bin':
        return renderGuardedView('recycle_bin', 'ถังขยะเอกสารและการกู้คืน', (
          <RecycleBinView 
            user={currentUser} 
            onRefreshMainData={refreshData} 
          />
        ));
      case 'logs':
        return renderGuardedView('audit_logs', 'บันทึกประวัติระบบ (Audit Logs)', (
          <LogsView user={currentUser} />
        ));
      case 'settings':
        return <Settings onSettingsUpdated={fetchSettings} enabledFeatures={enabledFeatures} setEnabledFeatures={setEnabledFeatures} user={currentUser} hasPermission={hasPermission} />;
      case 'notifications':
        return (
          <NotificationsView
            user={currentUser}
            notifications={visibleNotifications}
            documents={documents}
            onViewDoc={handleViewDoc}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onRefresh={fetchNotifications}
            onNavigateToAi={(prompt, doc) => {
              setActiveTab('ai_assistant');
            }}
            onDismiss={handleDismissNotification}
            onClearRead={handleClearReadNotifications}
          />
        );
      default:
        return <Overview documents={documents} onCreateDoc={() => setIsCreateModalOpen(true)} onViewDoc={setSelectedDoc} />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans flex selection:bg-[var(--primary-color)] selection:text-white">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 bottom-0 bg-[var(--bg-surface)]/80 backdrop-blur-3xl border-r border-[var(--border-light)] z-50
        transform transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] shadow-[4px_0_32px_rgba(0,0,0,0.03)]
        lg:translate-x-0 lg:static lg:flex-shrink-0 flex flex-col
        ${isSidebarCollapsed ? 'lg:w-[84px]' : 'w-[280px] lg:w-[280px]'}
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
         {/* Logo / Header */}
         <div className={`h-[72px] flex items-center justify-between border-b border-[var(--border-light)] shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'lg:px-0 lg:justify-center' : 'px-5'}`}>
            <div className={`flex items-center gap-3.5 w-full ${isSidebarCollapsed ? 'lg:justify-center' : ''}`}>
               <div className="relative w-10 h-10 rounded-xl border border-[var(--primary-color)]/20 bg-gradient-to-b from-[var(--primary-color)]/10 to-transparent flex items-center justify-center overflow-hidden shrink-0 shadow-sm group">
                 <div className="absolute inset-0 bg-[var(--primary-color)]/10 opacity-0 group-hover:opacity-100 text-[var(--text-primary)] font-semibold transition-opacity duration-300" />
                 <img
                   src={getLogoSrc(logoUrl)}
                   className="w-3/4 h-3/4 object-contain relative z-10 drop-shadow-sm"
                   alt="Logo"
                   onError={(e) => {
                     const target = e.target as HTMLImageElement;
                     const fallback = 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png';
                     if (target.src !== fallback) {
                       target.src = fallback;
                     }
                   }}
                 />
               </div>
               <div className={`min-w-0 flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'lg:hidden lg:opacity-0' : 'opacity-100 text-[var(--text-primary)] font-semibold'}`}>
                 <div className="font-sans font-bold tracking-tight text-[var(--text-primary)] text-sm truncate" title={headerOrgName || orgName}>
                   {headerOrgName || orgName}
                 </div>
               </div>
            </div>
            <button className={`lg:hidden text-[var(--text-secondary)] p-2 hover:bg-[var(--bg-elevated)] rounded-xl transition-colors ml-2 ${isSidebarCollapsed ? 'lg:hidden' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
              <X className="w-5 h-5" />
            </button>
         </div>
         {/* Nav Links */}
         <nav className={`flex-1 p-3.5 space-y-1.5 overflow-y-auto custom-scrollbar transition-all duration-300 ${isSidebarCollapsed ? 'lg:px-2' : ''}`}>
           {navItems.map((item) => {
             const isActive = activeTab === item.id;
             return (
               <a 
                 key={item.id} 
                 href={`#${item.id}`} 
                 onClick={(e) => { 
                   e.preventDefault(); 
                   setActiveTab(item.id);
                   setIsMobileMenuOpen(false); 
                 }} 
                 className={`group relative flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                   isActive 
                     ? 'bg-gradient-to-r from-[var(--primary-color)] to-blue-600 text-white shadow-lg shadow-[var(--primary-color)]/25 border border-white/10' 
                     : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                 } ${isSidebarCollapsed ? 'lg:justify-center lg:px-0 lg:w-11 lg:h-11 lg:mx-auto' : ''}`}
                 title={item.label}
               >
                 <item.icon className={`w-[18px] h-[18px] shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white drop-shadow-md' : 'text-[var(--text-muted)] group-hover:text-[var(--primary-color)]'}`} />
                 <span className={`truncate transition-all duration-300 ${isSidebarCollapsed ? 'lg:hidden lg:opacity-0 lg:w-0' : 'opacity-100 text-[var(--text-primary)] font-semibold'}`}>{item.label}</span>
               </a>
             );
           })}
         </nav>

          {/* Sidebar Version / Changelog Footer */}
          <div className={`p-4 border-t border-[var(--border-light)] shrink-0 bg-[var(--bg-surface)] ${isSidebarCollapsed ? 'lg:px-2' : ''}`}>
            {isSidebarCollapsed ? (
              <button
                type="button"
                onClick={() => setIsChangelogModalOpen(true)}
                className="hidden lg:flex w-11 h-11 mx-auto rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--primary-color)] hover:text-white items-center justify-center text-[var(--primary-color)] transition-all duration-300 border border-[var(--border-light)] shadow-sm cursor-pointer hover:shadow-md hover:shadow-[var(--primary-color)]/20"
                title="ดูประวัติการอัปเดตเวอร์ชัน (Changelog)"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            ) : null}
            <div className={`${isSidebarCollapsed ? 'lg:hidden' : ''}`}>
              <VersionBadge variant="sidebar" onClick={() => setIsChangelogModalOpen(true)} />
            </div>
          </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[var(--bg-base)]">
        {/* Topbar */}
        <header className="h-[72px] shrink-0 bg-[var(--bg-surface)]/80 backdrop-blur-3xl border-b border-[var(--border-light)] flex items-center justify-between px-4 sm:px-6 lg:px-8 z-30 sticky top-0 shadow-sm transition-all duration-300">
           <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 mr-4">
             <button 
               className="lg:hidden text-[var(--text-primary)] p-2 hover:bg-[var(--bg-elevated)] active:scale-95 rounded-xl transition-all shrink-0 -ml-2 touch-target-min flex items-center justify-center" 
               onClick={() => setIsMobileMenuOpen(true)}
               aria-label="เปิดเมนูการใช้งาน"
             >
                <Menu className="w-5 h-5" />
              </button>

              {/* Desktop Sidebar Collapse Button */}
              <button 
                onClick={toggleSidebar}
                className="hidden lg:flex text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 hover:bg-[var(--bg-elevated)] active:scale-95 rounded-xl transition-all shrink-0 -ml-2"
                title={isSidebarCollapsed ? "ขยายเมนู" : "ย่อเมนู"}
              >
                <Menu className="w-5 h-5" />
              </button>
             
             {/* Header Title Badge */}
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--bg-elevated)] to-[var(--bg-surface)] border border-[var(--border-light)] min-w-0 max-w-[240px] sm:max-w-full transition-colors shadow-xs">
                <Building2 className="w-4 h-4 text-[var(--primary-color)] shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] font-sans truncate tracking-tight">
                  {currentUser?.role === 'admin'
                    ? `EDMS: ${headerOrgName || orgName || 'ส่วนกลาง'}`
                    : `EDMS: ${currentUser?.department || 'ฝ่ายงาน'}`
                  }
                </span>
              </div>
           </div>

           <div className="flex items-center gap-2 sm:gap-4 relative shrink-0">
             <div className="flex bg-[var(--bg-elevated)] rounded-xl p-1 border border-[var(--border-light)] shadow-inner">
               <button
                 onClick={() => setTheme('light')}
                 className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${theme === 'light' ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] shadow-sm scale-105' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                 title="โหมดสว่าง (Light Mode)"
               >
                 <Sun className="w-4 h-4" />
               </button>
               <button
                 onClick={() => setTheme('dark')}
                 className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${theme === 'dark' ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] shadow-sm scale-105' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                 title="โหมดมืด (Dark Mode)"
               >
                 <Moon className="w-4 h-4" />
               </button>
               <button
                 onClick={() => setTheme('auto')}
                 className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${theme === 'auto' ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] shadow-sm scale-105' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                 title={`โหมดอัตโนมัติ (ปัจจุบัน: ${isSystemDark ? 'โหมดมืด' : 'โหมดสว่าง'})`}
               >
                 <Monitor className="w-4 h-4" />
               </button>
             </div>
             
             <div className="relative">
                <button 
                  onClick={() => {
                    const next = !isNotificationOpen;
                    setIsNotificationOpen(next);
                    if (next) {
                      setDropdownFilter(unreadCount > 0 ? "unread" : "unread");
                    }
                  }}
                  className="relative text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2.5 hover:bg-[var(--bg-elevated)] rounded-xl transition-all duration-200 cursor-pointer"
                  title="การแจ้งเตือน"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-[var(--bg-surface)] flex items-center justify-center shadow-sm animate-pulse">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {isNotificationOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsNotificationOpen(false)}
                    />
                    <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[var(--bg-overlay)] backdrop-blur-2xl border border-[var(--border-light)] rounded-2xl shadow-2xl z-50 overflow-hidden transform origin-top-right animate-in zoom-in-95 duration-200">
                      
                      {/* Header with Sub-tabs and Actions */}
                      <div className="p-3 border-b border-[var(--border-light)] bg-[var(--bg-surface)]/90 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDropdownFilter("unread")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              dropdownFilter === "unread"
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            <span>ยังไม่อ่าน</span>
                            {unreadCount > 0 && (
                              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                                dropdownFilter === "unread" ? "bg-white/25 text-white" : "bg-red-500 text-white"
                              }`}>
                                {unreadCount}
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setDropdownFilter("all")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              dropdownFilter === "all"
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            <span>ทั้งหมด</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                              dropdownFilter === "all" ? "bg-white/25 text-white" : "bg-[var(--border-light)] text-[var(--text-muted)]"
                            }`}>
                              {visibleNotifications.length}
                            </span>
                          </button>
                        </div>

                        {/* Dropdown Quick Actions */}
                        <div className="flex items-center gap-1">
                          {unreadCount > 0 ? (
                            <button 
                              onClick={markAllAsRead}
                              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-500/10 cursor-pointer"
                              title="ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว"
                            >
                              อ่านทั้งหมด
                            </button>
                          ) : visibleNotifications.some(n => n.read) ? (
                            <button 
                              onClick={handleClearReadNotifications}
                              className="text-xs font-semibold text-[var(--text-secondary)] hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10 cursor-pointer flex items-center gap-1"
                              title="ล้างรายการที่อ่านแล้วออกจากหน้านี้"
                            >
                              <span>ล้างที่อ่านแล้ว</span>
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {/* Dropdown Notification Items List */}
                      <div className="max-h-[360px] overflow-y-auto custom-scrollbar divide-y divide-[var(--border-lighter)]">
                        {(() => {
                          const itemsToDisplay = dropdownFilter === "unread" ? unreadNotifications : visibleNotifications;
                          
                          if (itemsToDisplay.length === 0) {
                            if (dropdownFilter === "unread") {
                              return (
                                <div className="p-8 text-center text-[var(--text-secondary)] text-xs flex flex-col items-center gap-2">
                                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <CheckCheck className="w-5 h-5" />
                                  </div>
                                  <span className="font-bold text-sm text-[var(--text-primary)]">ไม่มีการแจ้งเตือนค้าง</span>
                                  <span className="text-[11px] text-[var(--text-muted)]">คุณได้จัดการหรืออ่านการแจ้งเตือนทั้งหมดแล้ว</span>
                                  {visibleNotifications.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setDropdownFilter("all")}
                                      className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                                    >
                                      ดูประวัติการแจ้งเตือน ({visibleNotifications.length})
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div className="p-8 text-center text-[var(--text-secondary)] text-xs flex flex-col items-center gap-2">
                                <Bell className="w-8 h-8 text-[var(--border-medium)] opacity-40" />
                                <span className="font-bold text-sm text-[var(--text-primary)]">ไม่มีรายการแจ้งเตือน</span>
                                <span className="text-[11px] text-[var(--text-muted)]">ไม่มีประวัติการแจ้งเตือนในระบบ</span>
                              </div>
                            );
                          }

                          return itemsToDisplay.slice(0, 15).map(notification => {
                            const isUrgent = notification.type === "urgent" || notification.priority === "ด่วนที่สุด" || notification.priority === "ด่วนมาก";
                            return (
                              <div 
                                key={notification.id} 
                                onClick={() => handleNotificationClick(notification)}
                                className={`p-3.5 cursor-pointer transition-all duration-200 group relative ${
                                  notification.read 
                                    ? "hover:bg-[var(--bg-elevated)]" 
                                    : isUrgent 
                                    ? "bg-red-500/5 hover:bg-red-500/10 border-l-4 border-l-red-500" 
                                    : "bg-[var(--primary-color)]/5 hover:bg-[var(--primary-color)]/10 border-l-4 border-l-indigo-500"
                                }`}
                              >
                                <div className="flex gap-3 items-start">
                                  {!notification.read && (
                                    <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(79,70,229,0.8)]" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1.5">
                                      <h4 className={`text-xs tracking-tight truncate ${notification.read ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-primary)] font-bold"}`}>
                                        {notification.title}
                                      </h4>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {notification.docNumber && (
                                          <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold px-1 rounded bg-indigo-500/10">
                                            {notification.docNumber}
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => handleDismissNotification(notification.id, e)}
                                          className="p-1 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 opacity-60 hover:opacity-100 transition-all cursor-pointer"
                                          title="ซ่อนการแจ้งเตือนนี้"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">{notification.message}</p>
                                    <div className="flex items-center justify-between mt-1.5">
                                      <span className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide">{notification.timeFormatted || notification.time}</span>
                                      {notification.read && (
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">อ่านแล้ว</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {/* Footer */}
                      <div 
                        className="p-3 border-t border-[var(--border-light)] bg-[var(--bg-surface)]/80 text-center hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                        onClick={() => {
                          setActiveTab("notifications");
                          setIsNotificationOpen(false);
                        }}
                      >
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700">ดูศูนย์การแจ้งเตือนทั้งหมด</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

             <div className="relative">
               <div 
                 onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                 className="flex items-center gap-3.5 pl-3 sm:pl-5 lg:pl-6 border-l border-[var(--border-light)] cursor-pointer hover:opacity-80 transition-opacity select-none group"
               >
                 <div className="hidden lg:block text-right">
                   <div className="text-[0.9rem] font-semibold tracking-tight text-[var(--text-primary)] group-hover:text-[var(--primary-color)] transition-colors">{currentUser?.firstName} {currentUser?.lastName}</div>
                   <div className="text-[0.75rem] text-[var(--text-muted)] mt-0.5 font-medium">{currentUser?.position || currentUser?.role || 'User'}</div>
                 </div>
                 <button className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-color)] to-[var(--primary-dark)] flex items-center justify-center shadow-md shrink-0 overflow-hidden ring-2 ring-white/10 dark:ring-black/20 group-hover:ring-[var(--primary-color)]/30 transition-all duration-300">
                   {currentUser?.avatar ? (
                     <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                   ) : (
                     <User className="w-5 h-5 text-white" />
                   )}
                 </button>
               </div>

               {/* Profile Dropdown Menu */}
               {isProfileDropdownOpen && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)} />
                   <div className="absolute right-0 mt-3 w-64 bg-[var(--bg-overlay)] backdrop-blur-2xl border border-[var(--border-light)] rounded-2xl shadow-2xl z-50 py-2 animate-in zoom-in-95 duration-200 origin-top-right">
                     <div className="px-5 py-4 border-b border-[var(--border-light)] lg:hidden bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-surface)]">
                       <div className="font-semibold text-[var(--text-primary)]">{currentUser?.firstName} {currentUser?.lastName}</div>
                       <div className="text-xs text-[var(--text-secondary)] font-medium mt-1">{currentUser?.position || currentUser?.role || 'User'}</div>
                     </div>
                     <button
                       onClick={() => {
                         setIsProfileDropdownOpen(false);
                         setProfileForm({
                           firstName: currentUser?.firstName || '',
                           lastName: currentUser?.lastName || '',
                           position: currentUser?.position || '',
                           department: currentUser?.department || '',
                           currentPassword: '',
                           password: '',
                           confirmPassword: '',
                           avatar: currentUser?.avatar || '',
                           emailNotifications: profileForm.emailNotifications
                         });
                         setIsProfileModalOpen(true);
                       }}
                       className="w-full text-left px-5 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-3 transition-colors"
                     >
                       <User className="w-4 h-4 text-[var(--text-secondary)]" /> จัดการโปรไฟล์ส่วนตัว
                     </button>
                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            setActiveTab('settings');
                          }}
                          className="w-full text-left px-5 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center gap-3 transition-colors"
                        >
                          <SettingsIcon className="w-4 h-4 text-[var(--text-secondary)]" /> ไปยังตั้งค่าระบบ
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          setIsChangelogModalOpen(true);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--border-lighter)] flex items-center gap-2.5 transition-colors"
                      >
                        <Sparkles className="w-4 h-4 text-amber-500" /> ประวัติเวอร์ชัน & Changelog
                      </button>
                     <div className="my-1 border-t border-[var(--border-lighter)]" />
                     <button
                       onClick={() => {
                         setIsProfileDropdownOpen(false);
                         onLogout();
                       }}
                       className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                     >
                       <LogOut className="w-4 h-4" /> ออกจากระบบ
                     </button>
                   </div>
                 </>
               )}
             </div>
           </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-8 scroll-smooth custom-scrollbar">
           <div className="max-w-[1600px] w-full mx-auto">
             <div 
               key={activeTab}
               className="animate-fade-in"
             >
               {renderContent()}
             </div>
           </div>
        </div>
      </main>

      {/* Modals */}
      {isCreateModalOpen && (
        <DocumentFormModal 
          initialData={docToEdit || undefined}
          defaultType={createDocType}
          documents={documents}
          currentYear={currentYear}
          user={currentUser}
          onClose={() => {
            setIsCreateModalOpen(false);
            setDocToEdit(null);
          }} 
          onSave={handleSaveDoc} 
        />
      )}

      {selectedDoc && (
        <DocumentDetailModal 
          doc={selectedDoc} 
          allDocuments={documents}
          user={currentUser}
          onStatusUpdated={refreshData}
          onSelectDoc={(docToSelect) => setSelectedDoc(docToSelect)}
          onEdit={(docToEdit) => {
            setSelectedDoc(null);
            setDocToEdit(docToEdit);
            setIsCreateModalOpen(true);
          }}
          onClose={() => {
            setSelectedDoc(null);
            refreshData();
          }} 
        />
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)] bg-[var(--bg-surface)]">
              <h3 className="font-sans font-medium text-lg text-[var(--text-primary)] flex items-center gap-2">
                <User className="w-5 h-5 text-[var(--primary-color)]" /> จัดการโปรไฟล์ส่วนตัว
              </h3>
              <button 
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full border-4 border-[var(--bg-surface)] bg-[var(--border-lighter)] flex items-center justify-center overflow-hidden shadow-lg relative">
                    {profileForm.avatar ? (
                      <img src={profileForm.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-[var(--text-muted)]" />
                    )}
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 text-[var(--text-primary)] font-semibold flex flex-col items-center justify-center cursor-pointer transition-opacity text-white">
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-[10px]">เปลี่ยนรูป</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                    </label>
                  </div>
                  {profileForm.avatar && (
                    <button
                      type="button"
                      onClick={() => setProfileForm(prev => ({ ...prev, avatar: '' }))}
                      className="text-xs text-red-500 mt-2 block w-full text-center hover:underline"
                    >
                      ลบรูปโปรไฟล์
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">ชื่อจริง</label>
                  <input
                    type="text"
                    required
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                    placeholder="ชื่อจริง..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">นามสกุล</label>
                  <input
                    type="text"
                    required
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                    placeholder="นามสกุล..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">ตำแหน่ง</label>
                <select
                  value={profileForm.position}
                  onChange={(e) => setProfileForm({ ...profileForm, position: e.target.value })}
                  disabled={currentUser?.role !== 'admin'}
                  className={`w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none ${currentUser?.role !== 'admin' ? 'opacity-70 bg-[var(--bg-elevated)] cursor-not-allowed' : ''}`}
                >
                  <option value="">-- เลือกตำแหน่งงาน --</option>
                  {positionsList.map((p: any) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                  {profileForm.position && !positionsList.some(p => p.name === profileForm.position) && (
                    <option value={profileForm.position}>{profileForm.position}</option>
                  )}
                </select>
                
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">ฝ่าย / กลุ่มงาน</label>
                <select
                  value={profileForm.department}
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  disabled={currentUser?.role !== 'admin'}
                  className={`w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none ${currentUser?.role !== 'admin' ? 'opacity-70 bg-[var(--bg-elevated)] cursor-not-allowed' : ''}`}
                >
                  <option value="">-- เลือกฝ่าย / กลุ่มงาน --</option>
                  {departmentsList.map((d: any) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                  {profileForm.department && !departmentsList.some(d => d.name === profileForm.department) && (
                    <option value={profileForm.department}>{profileForm.department}</option>
                  )}
                </select>
                
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">สถานะสิทธิ์การใช้งาน (Role)</label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-lg text-sm">
                  <ShieldCheck className="w-4 h-4 text-[var(--primary-color)]" />
                  <span className="font-medium text-[var(--text-primary)]">
                    {currentUser?.role === 'admin' ? 'ผู้ดูแลระบบ (Administrator)' : currentUser?.role === 'moderator' ? 'ผู้ตรวจสอบ / เจ้าหน้าที่สารบรรณ (Moderator)' : 'ผู้ใช้งานทั่วไป (User)'}
                  </span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-mono">
                    {currentUser?.role || 'user'}
                  </span>
                </div>
              </div>

              <div className="border-t border-[var(--border-lighter)] pt-4 mt-2">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[var(--primary-color)]" /> เปลี่ยนรหัสผ่านใหม่ (ต้องระบุรหัสผ่านเดิมเพื่อยืนยัน)
                </h4>
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-[var(--border-lighter)]">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                      รหัสผ่านปัจจุบัน (รหัสผ่านเดิม) {profileForm.password ? <span className="text-red-500">*</span> : null}
                    </label>
                    <input
                      type="password"
                      value={profileForm.currentPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                      placeholder={profileForm.password ? "กรอกรหัสผ่านเดิมเพื่อยืนยันการเปลี่ยนรหัสผ่าน..." : "ระบุรหัสผ่านเดิมหากต้องการเปลี่ยนรหัสผ่าน..."}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">รหัสผ่านใหม่</label>
                      <input
                        type="password"
                        value={profileForm.password}
                        onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                        className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                        placeholder="ปล่อยว่างหากไม่เปลี่ยน"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">ยืนยันรหัสผ่านใหม่</label>
                      <input
                        type="password"
                        value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                        className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                        placeholder="ยืนยันรหัสผ่านใหม่..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              
              <div className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl mt-4">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">รับการแจ้งเตือนทางอีเมล</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">ระบบจะส่งอีเมลแจ้งเตือนเมื่อมีการมอบหมายงานหรืออัปเดตสถานะเอกสาร</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={profileForm.emailNotifications}
                    onChange={(e) => setProfileForm({ ...profileForm, emailNotifications: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-[var(--border-medium)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-light)]">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 rounded-lg text-sm bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white font-medium transition-colors shadow-md disabled:opacity-50"
                >
                  {isSavingProfile ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Document Confirmation Modal */}
      {deletingDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)] bg-red-500/5">
              <h3 className="font-sans font-medium text-lg text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> ยืนยันการลบหนังสือราชการ
              </h3>
              <button 
                onClick={() => setDeletingDocId(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                คุณต้องการลบหนังสือราชการฉบับนี้ออกจากสารบบ EDMS ใช่หรือไม่? การดำเนินการนี้จะไม่สามารถย้อนคืนได้
              </p>

              
              <div className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl mt-4">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">รับการแจ้งเตือนทางอีเมล</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">ระบบจะส่งอีเมลแจ้งเตือนเมื่อมีการมอบหมายงานหรืออัปเดตสถานะเอกสาร</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={profileForm.emailNotifications}
                    onChange={(e) => setProfileForm({ ...profileForm, emailNotifications: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-[var(--border-medium)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-light)]">
                <button
                  type="button"
                  onClick={() => setDeletingDocId(null)}
                  className="px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteDoc}
                  disabled={isDeletingDoc}
                  className="px-5 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white font-medium transition-colors shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeletingDoc ? 'กำลังลบ...' : 'ยืนยันการลบหนังสือ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Changelog & Release Notes Modal */}
      <ChangelogModal
        isOpen={isChangelogModalOpen}
        onClose={() => setIsChangelogModalOpen(false)}
        currentUser={currentUser}
        hasPermission={hasPermission}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
