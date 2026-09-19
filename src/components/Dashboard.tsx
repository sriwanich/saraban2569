import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Menu, X, CheckCheck, Home, FileText, Bell, User, LogOut, Search, Send, FolderArchive, Settings as SettingsIcon, Sun, Moon, Monitor, FileSpreadsheet, FolderOpen, ShieldCheck, Key, Briefcase, AlertTriangle, Trash2, Building2, Camera, Download, FileEdit, GitMerge, Sparkles, Pin, QrCode, ShieldAlert, Lock, Workflow, BarChart3, HelpCircle } from 'lucide-react';

import { DocumentItem, DocType } from '../types';
import Overview from './views/Overview';
import DocumentFormModal from './DocumentModal';
import DocumentDetailModal from './DocumentDetailModal';
import ChangelogModal from './ChangelogModal';
import VersionBadge from './VersionBadge';
import { LoadingIndicator } from './LoadingIndicator';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const DocumentList = lazyWithRetry(() => import('./views/DocumentList'));
const Settings = lazyWithRetry(() => import('./views/Settings'));
const LogsView = lazyWithRetry(() => import('./views/LogsView'));
const AdminDocsView = lazyWithRetry(() => import('./views/AdminDocsView'));
const FoldersView = lazyWithRetry(() => import('./views/FoldersView'));
const DraftDocsView = lazyWithRetry(() => import('./views/DraftDocsView'));
const SmartAiAssistantView = lazyWithRetry(() => import('./views/SmartAiAssistantView'));
const NotificationsView = lazyWithRetry(() => import('./views/NotificationsView'));
const DigitalSignatureView = lazyWithRetry(() => import('./DigitalSignatureView'));
const RecycleBinView = lazyWithRetry(() => import('./views/RecycleBinView'));
const QrGeneratorView = lazyWithRetry(() => import('./views/QrGeneratorView'));
const UrgentIncidentReportView = lazyWithRetry(() => import('./views/disaster/UrgentIncidentReportView'));
const WorkflowSlaView = lazyWithRetry(() => import('./views/WorkflowSlaView'));
const InfographicsEditorView = lazyWithRetry(() => import('./views/InfographicsEditorView'));
const UserManualView = lazyWithRetry(() => import('./views/UserManualView'));
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
  const [favActiveTab, setFavActiveTab] = useState<'inbox' | 'outbox' | 'admin'>('inbox');
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(['overview']));

  useEffect(() => {
    setVisitedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const [disasterPrefillData, setDisasterPrefillData] = useState<any>(null);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState<string>('system');
  const [isUserActive, setIsUserActive] = useState<boolean>(true);

  // User activity & idle state tracking for real-time presence
  useEffect(() => {
    let idleTimer: any = null;

    const resetIdle = () => {
      setIsUserActive(true);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setIsUserActive(false);
      }, 60000); // 1 minute of no interaction marks as idle
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, resetIdle, { passive: true }));
    resetIdle();

    return () => {
      clearTimeout(idleTimer);
      events.forEach(ev => window.removeEventListener(ev, resetIdle));
    };
  }, []);

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

    // Strict constraint: Moderator is never allowed to access or use manage_users
    if (currentUser.role === 'moderator' && key === 'manage_users') {
      return false;
    }

    // Fall back to role-based permission
    const perm = rolePermissions.find(p => p.role === currentUser.role && p.permission_key === key);
    if (perm) {
      return perm.is_allowed === 1 || perm.is_allowed === true;
    }
    
    // Automatic role-based fallbacks if not configured in DB yet
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'moderator') {
      return [
        'view_all_docs', 'create_docs', 'edit_all_docs', 'delete_docs', 'approve_docs', 'export_docs',
        'admin_docs', 'urgent_incidents', 'ai_assistant', 'infographics', 'qr_generator', 'draft_docs',
        'digital_folders', 'workflow_sla', 'digital_signatures', 'recycle_bin'
      ].includes(key);
    }
    if (currentUser.role === 'user') {
      return [
        'create_docs', 'export_docs', 'admin_docs', 'urgent_incidents', 'ai_assistant', 'infographics', 'qr_generator',
        'draft_docs', 'digital_folders', 'workflow_sla'
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
  const [draftDocsCount, setDraftDocsCount] = useState(0);
  const [urgentIncidentsCount, setUrgentIncidentsCount] = useState(0);
  const [recycleBinCount, setRecycleBinCount] = useState(0);

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

  // Real-time active user presence reporting with current page, view title, and activity details
  useEffect(() => {
    if (!currentUser) return;

    const computeActivityInfo = () => {
      let viewTitle = 'ภาพรวมระบบ (Overview)';
      let activeDetails = 'กำลังดูแดชบอร์ดภาพรวมและสถิติเอกสาร';

      switch (activeTab) {
        case 'overview':
          viewTitle = 'ภาพรวมระบบ (Overview)';
          activeDetails = 'กำลังดูสถิติและสถานะเอกสารภาพรวม';
          break;
        case 'inbox':
          viewTitle = 'ทะเบียนหนังสือรับ (Inbox)';
          activeDetails = selectedDoc 
            ? `กำลังเปิดอ่านหนังสือรับ: ${selectedDoc.docNumber || selectedDoc.title || 'เอกสาร'}`
            : isCreateModalOpen 
              ? 'กำลังลงทะเบียนหนังสือรับเข้าใหม่' 
              : 'กำลังตรวจสอบรายการหนังสือรับเข้า';
          break;
        case 'outbox':
          viewTitle = 'ทะเบียนหนังสือส่ง (Outbox)';
          activeDetails = selectedDoc 
            ? `กำลังเปิดอ่านหนังสือส่ง: ${selectedDoc.docNumber || selectedDoc.title || 'เอกสาร'}`
            : isCreateModalOpen 
              ? 'กำลังออกเลขหนังสือส่งออกใหม่' 
              : 'กำลังตรวจสอบรายการหนังสือส่งออก';
          break;
        case 'admin_docs':
          viewTitle = 'ระบบงานธุรการ (Admin Docs)';
          activeDetails = selectedDoc
            ? `กำลังดูเอกสารธุรการ: ${selectedDoc.docNumber || selectedDoc.title || 'เอกสาร'}`
            : 'กำลังจัดการงานสารบรรณกลางและงานธุรการ';
          break;
        case 'draft_docs':
          viewTitle = 'ร่างเอกสารราชการ (Drafts)';
          activeDetails = 'กำลังเขียนและแก้ไขร่างหนังสือราชการ / คำสั่ง';
          break;
        case 'infographics':
          viewTitle = 'ออกแบบ Infographics';
          activeDetails = 'กำลังออกแบบและจัดทำสื่อประชาสัมพันธ์ ปภ.';
          break;
        case 'favorites':
          viewTitle = 'เอกสารสำคัญปักหมุด (Favorites)';
          activeDetails = 'กำลังดูรายการเอกสารสำคัญที่ติดดาว';
          break;
        case 'folders':
          viewTitle = 'แฟ้มเอกสารดิจิทัล (Folders)';
          activeDetails = 'กำลังเปิดดูและสืบค้นแฟ้มจัดเก็บเอกสาร';
          break;
        case 'workflow_sla':
          viewTitle = 'ผังการเดินเอกสาร & SLA';
          activeDetails = 'กำลังติดตามเส้นทางหนังสือและระยะเวลา SLA';
          break;
        case 'digital_signatures':
          viewTitle = 'ศูนย์ลงนามดิจิทัล (ETDA)';
          activeDetails = 'กำลังตรวจสอบเอกสารและลงลายมือชื่อดิจิทัล';
          break;
        case 'qr_generator':
          viewTitle = 'สร้าง QR Code สารบรรณ';
          activeDetails = 'กำลังสร้างรหัส QR Code สำหรับเอกสารราชการ';
          break;
        case 'urgent_incidents':
          viewTitle = 'แบบรายงานเหตุด่วนสาธารณภัย';
          activeDetails = 'กำลังบันทึกและติดตามสถานการณ์สาธารณภัยเร่งด่วน';
          break;
        case 'ai_assistant':
          viewTitle = 'ผู้ช่วย AI Smart Assistant';
          activeDetails = 'กำลังปรึกษาผู้ช่วย AI และประมวลผลข้อความ';
          break;
        case 'user_manual':
          viewTitle = 'คู่มือการใช้งานระบบ (Manual)';
          activeDetails = 'กำลังเปิดอ่านคู่มือและขั้นตอนการปฏิบัติงาน';
          break;
        case 'logs':
          viewTitle = 'บันทึกประวัติระบบ (System Logs)';
          activeDetails = 'กำลังตรวจสอบบันทึกการใช้งานและ Audit Trail';
          break;
        case 'recycle_bin':
          viewTitle = 'คลังกู้คืนเอกสาร (Recycle Bin)';
          activeDetails = 'กำลังตรวจสอบและกู้คืนเอกสารราชการที่ถูกลบ';
          break;
        case 'settings':
          if (settingsSubTab === 'active_users' || settingsSubTab === 'realtime') {
            viewTitle = 'ติดตามผู้ใช้งานและหน้าจอที่เปิดใช้งานสด';
            activeDetails = 'กำลังตรวจสอบผู้ใช้ออนไลน์สดและหน้าจอที่เปิดอยู่';
          } else if (settingsSubTab === 'users') {
            viewTitle = 'จัดการข้อมูลเจ้าหน้าที่ & สิทธิ์';
            activeDetails = 'กำลังจัดการรายชื่อเจ้าหน้าที่และฝ่ายงาน';
          } else if (settingsSubTab === 'permissions') {
            viewTitle = 'กำหนดสิทธิ์การใช้งาน (Permissions Matrix)';
            activeDetails = 'กำลังกำหนดสิทธิ์การเข้าถึงโมดูล';
          } else if (settingsSubTab === 'departments') {
            viewTitle = 'โครงสร้างฝ่ายงาน ปภ.ระยอง';
            activeDetails = 'กำลังจัดการข้อมูลฝ่ายงานและหน่วยงาน';
          } else if (settingsSubTab === 'system_health') {
            viewTitle = 'ตรวจสอบความสมบูรณ์ของระบบ (System Health)';
            activeDetails = 'กำลังตรวจสอบสถานะเครือข่ายและระบบ';
          } else if (settingsSubTab === 'backup') {
            viewTitle = 'สำรองและกู้คืนฐานข้อมูล (Database Backup)';
            activeDetails = 'กำลังตรวจสอบไฟล์สำรองและสถานะข้อมูล';
          } else {
            viewTitle = 'ตั้งค่าระบบและผู้ดูแล';
            activeDetails = 'กำลังจัดการข้อมูลระบบและตั้งค่าทั่วไป';
          }
          break;
        default:
          viewTitle = activeTab;
          activeDetails = 'กำลังใช้งานระบบ';
      }

      return { viewTitle, activeDetails };
    };

    const sendPresenceUpdate = async () => {
      try {
        const { viewTitle, activeDetails } = computeActivityInfo();
        const currentViewVal = activeTab === 'settings' && (settingsSubTab === 'active_users' || settingsSubTab === 'realtime')
          ? 'active_users'
          : activeTab === 'settings'
            ? `settings_${settingsSubTab}`
            : activeTab;

        const payload = {
          userId: currentUser.id || currentUser.username,
          username: currentUser.username,
          fullName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
          position: currentUser.position || '',
          department: currentUser.department || '',
          departmentId: currentUser.departmentId,
          role: currentUser.role || 'user',
          avatar: currentUser.avatar || '',
          currentView: currentViewVal,
          viewTitle,
          activeDetails,
          documentId: selectedDoc?.id || undefined,
          status: (document.visibilityState === 'visible' && isUserActive) ? 'active' : 'idle'
        };
        await fetch('/api/user-presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (_) {}
    };

    sendPresenceUpdate();

    const interval = setInterval(sendPresenceUpdate, 15000);

    const handleVisibility = () => {
      sendPresenceUpdate();
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentUser, activeTab, settingsSubTab, isUserActive, selectedDoc, isCreateModalOpen]);

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
    const isCentralDoc = !(doc.isCentral === 0 || Number(doc.isCentral) === 0);
    if (isCentralPrivileged) return isCentralDoc;

    if (!currentUser?.department) return false;

    const userDept = currentUser.department.trim();
    const userName = currentUser.username;
    const userFirstName = currentUser.firstName;
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

  const fetchDraftDocsCount = async () => {
    try {
      const res = await fetch('/api/drafts');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const drafts = data.filter((d: any) => d.docType === 'draft_letter');
          setDraftDocsCount(drafts.length);
          return;
        }
      }
    } catch (err) {
      console.warn('Drafts fetch fallback active:', err);
    }

    // Local storage fallback
    try {
      const cached = localStorage.getItem('moi_drafts');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setDraftDocsCount(parsed.length);
        }
      }
    } catch (_) {}
  };

  const fetchUrgentIncidentsCount = async () => {
    try {
      const res = await fetch('/api/urgent-incidents');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUrgentIncidentsCount(data.length);
        }
      }
    } catch (err) {
      console.warn('Urgent incidents count fetch fallback active:', err);
    }
  };

  const fetchRecycleBinCount = async () => {
    try {
      const res = await fetch('/api/recycle-bin');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.items)) {
          setRecycleBinCount(data.items.length);
        }
      }
    } catch (err) {
      console.warn('Recycle bin count fetch fallback active:', err);
    }
  };

  const refreshData = async () => {
    await fetchDocuments();
    await fetchNotifications();
    await fetchFavorites();
    await fetchDraftDocsCount();
    await fetchUrgentIncidentsCount();
    await fetchRecycleBinCount();
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

  const handleReceiveDeptDoc = async (doc: DocumentItem) => {
    if (!currentUser?.department) return;
    
    const confirmed = await confirm({
      title: 'ยืนยันการลงรับหนังสือเข้าฝ่าย',
      message: `คุณต้องการลงรับหนังสือเรื่อง "${doc.title}" เข้าสารบรรณฝ่าย ${currentUser.department} ใช่หรือไม่?`,
      type: 'info',
      confirmText: 'ลงรับหนังสือ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    try {
      const username = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username;
      const res = await fetch(`/api/documents/${doc.id}/receive-department`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: currentUser.department,
          username,
          docType: doc.type,
          year: currentYear
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`ลงรับหนังสือสำเร็จ! เลขรับฝ่าย: ${data.receiveNumber}/${currentYear}`);
        await refreshData();
      } else {
        const err = await res.json();
        alert(`เกิดข้อผิดพลาด: ${err.error || 'ไม่สามารถลงรับหนังสือได้'}`);
      }
    } catch (err) {
      console.error("Error receiving department doc:", err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
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

  const isReceivedByDept = (doc: DocumentItem) => {
    if (!currentUser?.department) return false;
    const userDept = currentUser.department.trim();
    return doc.departmentReceives && Array.isArray(doc.departmentReceives) && 
           doc.departmentReceives.some((r: any) => r.department && r.department.trim() === userDept);
  };

  const pendingReceiptCount = useMemo(() => {
    // Only count as pending receipt if it's a doc for this department
    // and it hasn't been received by this department yet.
    // Central users should NOT have a pending receipt badge for everything.
    if (isCentralPrivileged) return 0;
    
    return inboxDocs.filter(d => isDocForUserDepartment(d) && !isReceivedByDept(d)).length;
  }, [inboxDocs, currentUser?.department, isCentralPrivileged]);

  const unreadInboxCount = useMemo(() => {
    return inboxDocs.filter(d => !d.isRead && isDocForUserDepartment(d)).length;
  }, [inboxDocs, currentUser, rolePermissions]);

  const outboxCount = useMemo(() => {
    return outboxDocs.filter(isDocForUserDepartment).length;
  }, [outboxDocs, currentUser, rolePermissions]);

  const adminDocsCount = useMemo(() => {
    return adminDocs.filter(isDocForUserDepartment).length;
  }, [adminDocs, currentUser, rolePermissions]);

  const favoritesCount = useMemo(() => {
    return documents.filter(d => favorites.includes(d.id)).filter(isDocForUserDepartment).length;
  }, [favorites, documents, currentUser, rolePermissions]);

  const categorizedNavGroups = useMemo(() => {
    const rawGroups: { category: string; items: { id: string; icon: any; label: string; permKey?: string; badge?: number | string; badgeColor?: string }[] }[] = [
      {
        category: 'หลัก & AI Smart',
        items: [
          { id: 'overview', icon: Home, label: 'ภาพรวมระบบ' },
          { id: 'ai_assistant', icon: Sparkles, label: 'ผู้ช่วย AI Smart', permKey: 'ai_assistant' },
        ]
      },
      {
        category: 'งานสารบรรณ & เอกสาร',
        items: [
          { id: 'inbox', icon: FileText, label: 'ทะเบียนหนังสือรับ', badge: pendingReceiptCount > 0 ? `รอลงรับ ${pendingReceiptCount}` : unreadInboxCount > 0 ? unreadInboxCount : undefined, badgeColor: pendingReceiptCount > 0 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-emerald-500 text-white' },
          { id: 'outbox', icon: Send, label: 'ทะเบียนหนังสือส่ง', badge: outboxCount > 0 ? outboxCount : undefined, badgeColor: 'bg-sky-500 text-white' },
          { id: 'admin_docs', icon: FileSpreadsheet, label: 'ระบบงานธุรการ', permKey: 'admin_docs', badge: adminDocsCount > 0 ? adminDocsCount : undefined, badgeColor: 'bg-teal-500 text-white' },
          { id: 'draft_docs', icon: FileEdit, label: 'ร่างเอกสาร', permKey: 'draft_docs', badge: draftDocsCount > 0 ? draftDocsCount : undefined, badgeColor: 'bg-indigo-500 text-white' },
          { id: 'favorites', icon: Pin, label: 'เอกสารสำคัญปักหมุด', badge: favoritesCount > 0 ? favoritesCount : undefined, badgeColor: 'bg-amber-500 text-slate-950 font-extrabold' },
          { id: 'folders', icon: FolderOpen, label: 'แฟ้มเอกสารดิจิทัล', permKey: 'digital_folders' },
        ]
      },
      {
        category: 'เครื่องมือ & ตรวจสอบ',
        items: [
          { id: 'workflow_sla', icon: Workflow, label: 'ผังการเดินเอกสาร & SLA', permKey: 'workflow_sla' },
          { id: 'digital_signatures', icon: ShieldCheck, label: 'ศูนย์ลงนามดิจิทัล (ETDA)', permKey: 'digital_signatures' },
          { id: 'infographics', icon: Camera, label: 'ออกแบบ Infographics', permKey: 'infographics' },
          { id: 'qr_generator', icon: QrCode, label: 'สร้าง QR Code สารบรรณ', permKey: 'qr_generator' },
          { id: 'urgent_incidents', icon: AlertTriangle, label: 'แบบรายงานเหตุด่วน', permKey: 'urgent_incidents', badge: urgentIncidentsCount > 0 ? urgentIncidentsCount : undefined, badgeColor: 'bg-rose-500 text-white' },
          { id: 'recycle_bin', icon: Trash2, label: 'คลังกู้คืนเอกสาร', permKey: 'recycle_bin', badge: recycleBinCount > 0 ? recycleBinCount : undefined, badgeColor: 'bg-slate-500 text-white' },
        ]
      },
      {
        category: 'ระบบ & การจัดการ',
        items: [
          ...(hasPermission('audit_logs') && enabledFeatures['logs'] !== false ? [{ id: 'logs', icon: ShieldCheck, label: 'บันทึกประวัติระบบ' }] : []),
          { id: 'user_manual', icon: HelpCircle, label: 'คู่มือการใช้งาน' },
          ...(currentUser?.role === 'admin'
            ? [{ id: 'settings', icon: SettingsIcon, label: 'ตั้งค่าระบบ' }]
            : (hasPermission('system_settings') || (currentUser?.role !== 'moderator' && hasPermission('manage_users')) || hasPermission('backup_restore'))
            ? [{ id: 'settings', icon: SettingsIcon, label: 'ตั้งค่าระบบ' }]
            : [])
        ]
      }
    ];

    return rawGroups.map(group => ({
      category: group.category,
      items: group.items.filter(item => {
        if (enabledFeatures[item.id] === false) return false;
        if (item.permKey && !hasPermission(item.permKey)) return false;
        return true;
      })
    })).filter(group => group.items.length > 0);
  }, [enabledFeatures, currentUser, rolePermissions, unreadInboxCount, outboxCount, adminDocsCount, draftDocsCount, favoritesCount, urgentIncidentsCount, recycleBinCount]);

  const navItems = useMemo(() => {
    return categorizedNavGroups.flatMap(g => g.items);
  }, [categorizedNavGroups]);

  const currentActiveTabMeta = useMemo(() => {
    const found = navItems.find(n => n.id === activeTab);
    if (found) return found;
    if (activeTab === 'notifications') return { id: 'notifications', label: 'ศูนย์การแจ้งเตือน', icon: Bell };
    return { id: 'overview', label: 'ภาพรวมระบบ', icon: Home };
  }, [navItems, activeTab]);

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

  const renderTabContent = (tabId: string) => {
    switch(tabId) {
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
          onReceiveDeptDoc={handleReceiveDeptDoc}
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
          onReceiveDeptDoc={handleReceiveDeptDoc}
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
      case 'favorites': {
        const favoriteDocs = documents.filter(d => favorites.includes(d.id)).filter(isDocForUserDepartment);
        const favInbox = favoriteDocs.filter(d => d.type === 'inbox');
        const favOutbox = favoriteDocs.filter(d => d.type === 'outbox');
        const favAdmin = favoriteDocs.filter(d => d.type === 'admin');

        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-500/10 to-indigo-500/5 border border-amber-500/20 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950">
                  <Pin className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--text-primary)] font-sans">เอกสารสำคัญปักหมุด แยกประเภท</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
                    แสดงรายการเอกสารสำคัญที่ปักหมุดไว้ แยกประเภทเป็นหมวดหมู่ และแสดงหน้าละ 20 รายการเพื่อความรวดเร็วและเป็นระเบียบเรียบร้อย
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Interactive Tabs - Matches Dashboard/Overview exactly */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-lighter)] pb-4">
              <button
                type="button"
                onClick={() => setFavActiveTab('inbox')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                  favActiveTab === 'inbox'
                    ? 'bg-blue-500 text-white border-blue-500 shadow-sm shadow-blue-500/20'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-light)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${favActiveTab === 'inbox' ? 'bg-white' : 'bg-blue-500'}`} />
                <span>หนังสือรับเข้า ({favInbox.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setFavActiveTab('outbox')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                  favActiveTab === 'outbox'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-light)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${favActiveTab === 'outbox' ? 'bg-white' : 'bg-emerald-500'}`} />
                <span>หนังสือส่งออก ({favOutbox.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setFavActiveTab('admin')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                  favActiveTab === 'admin'
                    ? 'bg-violet-500 text-white border-violet-500 shadow-sm shadow-violet-500/20'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-light)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${favActiveTab === 'admin' ? 'bg-white' : 'bg-violet-500'}`} />
                <span>งานธุรการ ({favAdmin.length})</span>
              </button>
            </div>

            {/* Tab Contents */}
            {favActiveTab === 'inbox' && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-xs animate-pulse"></span>
                  <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 font-sans">
                    รายการหนังสือรับปักหมุด
                  </h3>
                </div>
                <DocumentList 
                  title="หนังสือรับปักหมุด" 
                  documents={favInbox} 
                  onViewDoc={setSelectedDoc} 
                  onEditDoc={handleEditDoc}
                  onDeleteDoc={handleDeleteDoc}
                  user={currentUser}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onReceiveDeptDoc={handleReceiveDeptDoc}
                  hasPermission={hasPermission}
                  defaultPageSize={20}
                />
              </div>
            )}

            {favActiveTab === 'outbox' && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs animate-pulse"></span>
                  <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-sans">
                    รายการหนังสือส่งปักหมุด
                  </h3>
                </div>
                <DocumentList 
                  title="หนังสือส่งปักหมุด" 
                  documents={favOutbox} 
                  onViewDoc={setSelectedDoc} 
                  onEditDoc={handleEditDoc}
                  onDeleteDoc={handleDeleteDoc}
                  user={currentUser}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onReceiveDeptDoc={handleReceiveDeptDoc}
                  hasPermission={hasPermission}
                  defaultPageSize={20}
                />
              </div>
            )}

            {favActiveTab === 'admin' && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500 shadow-xs animate-pulse"></span>
                  <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400 font-sans">
                    รายการเอกสารงานธุรการปักหมุด
                  </h3>
                </div>
                <DocumentList 
                  title="เอกสารงานธุรการปักหมุด" 
                  documents={favAdmin} 
                  onViewDoc={setSelectedDoc} 
                  onEditDoc={handleEditDoc}
                  onDeleteDoc={handleDeleteDoc}
                  user={currentUser}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  onReceiveDeptDoc={handleReceiveDeptDoc}
                  hasPermission={hasPermission}
                  defaultPageSize={20}
                />
              </div>
            )}
          </div>
        );
      }
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
      case 'user_manual':
        return (
          <Suspense fallback={<LoadingIndicator fullScreen={false} message="กำลังโหลดคู่มือการใช้งานระบบ..." />}>
            <UserManualView user={currentUser} onNavigateToTab={(tab) => setActiveTab(tab)} />
          </Suspense>
        );

      case 'recycle_bin':
        return renderGuardedView('recycle_bin', 'คลังกู้คืนเอกสาร', (
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
        return <Settings onSettingsUpdated={fetchSettings} enabledFeatures={enabledFeatures} setEnabledFeatures={setEnabledFeatures} user={currentUser} hasPermission={hasPermission} onNavigateTab={(tab: string) => setActiveTab(tab)} onSubTabChange={setSettingsSubTab} />;
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
         <nav className={`flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar transition-all duration-300 ${isSidebarCollapsed ? 'lg:px-2' : ''}`}>
           {categorizedNavGroups.map((group, groupIdx) => (
             <div key={groupIdx} className="space-y-1">
               {/* Group Section Header */}
               <div className={`px-3 py-1 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>
                 <span className="truncate">{group.category}</span>
                 <div className="h-px flex-1 bg-[var(--border-lighter)] ml-2 opacity-60" />
               </div>

               {/* Group Items */}
               <div className="space-y-1">
                 {group.items.map((item) => {
                   const isActive = activeTab === item.id;
                   const ItemIcon = item.icon;
                   return (
                     <a 
                       key={item.id} 
                       href={`#${item.id}`} 
                       onClick={(e) => { 
                         e.preventDefault(); 
                         setActiveTab(item.id);
                         setIsMobileMenuOpen(false); 
                       }} 
                       className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                         isActive 
                           ? 'bg-gradient-to-r from-[var(--primary-color)] to-indigo-600 text-white shadow-md shadow-[var(--primary-color)]/25 font-bold' 
                           : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                       } ${isSidebarCollapsed ? 'lg:justify-center lg:px-0 lg:w-11 lg:h-11 lg:mx-auto' : ''}`}
                       title={isSidebarCollapsed ? item.label : undefined}
                     >
                       {/* Active Indicator bar */}
                       {isActive && !isSidebarCollapsed && (
                         <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-400 rounded-r-full shadow-xs" />
                       )}

                       {/* SVG Icon Badge Container */}
                       <div className={`p-1.5 rounded-lg transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                         isActive 
                           ? 'bg-white/20 text-white' 
                           : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] group-hover:text-[var(--primary-color)] group-hover:bg-[var(--primary-color)]/10'
                       }`}>
                         <ItemIcon className="w-4.5 h-4.5 shrink-0" />
                       </div>

                       {/* Label */}
                       <span className={`truncate flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'lg:hidden lg:opacity-0 lg:w-0' : 'opacity-100'}`}>
                         {item.label}
                       </span>

                       {/* Optional badge count */}
                       {item.badge !== undefined && (
                         <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full transition-all shrink-0 ${
                           isSidebarCollapsed ? 'lg:hidden' : ''
                         } ${
                           isActive 
                             ? 'bg-white text-[var(--primary-color)] shadow-xs' 
                             : item.badgeColor || 'bg-[var(--primary-color)] text-white'
                         }`}>
                           {item.badge}
                         </span>
                       )}

                       {/* Collapsed Sidebar Hover Tooltip */}
                       {isSidebarCollapsed && (
                         <div className="hidden lg:group-hover:flex absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl whitespace-nowrap shadow-xl z-50 pointer-events-none items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
                           <span>{item.label}</span>
                           {item.badge !== undefined && (
                             <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-bold text-[10px] rounded-full">
                               {item.badge}
                             </span>
                           )}
                         </div>
                       )}
                     </a>
                   );
                 })}
               </div>
             </div>
           ))}
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
             
             {/* Header Title Badge & Active Section Indicator */}
             <div className="flex items-center gap-2 max-w-full overflow-hidden">
               <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[var(--bg-elevated)] to-[var(--bg-surface)] border border-[var(--border-light)] min-w-0 transition-colors shadow-xs">
                 <Building2 className="w-4 h-4 text-[var(--primary-color)] shrink-0" />
                 <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] font-sans truncate tracking-tight">
                   {currentUser?.role === 'admin'
                     ? `EDMS: ${headerOrgName || orgName || 'ส่วนกลาง'}`
                     : `EDMS: ${currentUser?.department || 'ฝ่ายงาน'}`
                   }
                 </span>
               </div>

               {/* Active Section SVG Badge */}
               {currentActiveTabMeta && (
                 <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/25 text-[var(--primary-color)] font-bold text-xs shrink-0 animate-in fade-in duration-200">
                   {React.createElement(currentActiveTabMeta.icon, { className: "w-4 h-4 shrink-0" })}
                   <span className="truncate">{currentActiveTabMeta.label}</span>
                 </div>
               )}
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
             <Suspense fallback={<div className="py-16 text-center"><LoadingIndicator message="กำลังโหลดโมดูลระบบ..." /></div>}>
               {Array.from(visitedTabs).map(tabId => {
                 const isSelected = activeTab === tabId;
                 return (
                   <div 
                     key={tabId}
                     className={isSelected ? "animate-fade-in block" : "hidden"}
                     style={{ display: isSelected ? 'block' : 'none' }}
                   >
                     {renderTabContent(tabId)}
                   </div>
                 );
               })}
             </Suspense>
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
