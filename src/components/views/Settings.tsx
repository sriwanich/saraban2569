import React, { useState, useEffect } from 'react';
import { Save, UserPlus, Shield, Settings as SettingsIcon, Building2, Plus, Lock, Key, Trash2, X, ShieldCheck, Calendar, Activity, Image, Type, Search, Filter, User as UserIcon, Crown, BadgeCheck, Briefcase, AlertTriangle, Camera, Upload, Database, Download, RefreshCw, CheckCircle2, Mail, Eye, Send, HardDrive, Files, Copy, Layers, Zap, Sparkles, Hash, Bookmark } from 'lucide-react';
import { parseEnabledFeatures, DEFAULT_ENABLED_FEATURES } from '../../utils/featureFlags';
import CustomNumberingSettings from '../CustomNumberingSettings';

interface SettingsProps {
  onSettingsUpdated?: () => void;
  enabledFeatures?: Record<string, boolean>;
  setEnabledFeatures?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  user?: any;
  hasPermission?: (key: string) => boolean;
}

export default function Settings(props: SettingsProps) {
  const { onSettingsUpdated } = props;
  const [activeTab, setActiveTab] = useState<'system' | 'system_doc' | 'users' | 'permissions' | 'departments' | 'positions' | 'smtp' | 'backup' | 'dedup' | 'control'>('system');

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
  
  // Deduplication state
  const [dedupStats, setDedupStats] = useState<any>(null);
  const [isScanningDedup, setIsScanningDedup] = useState<boolean>(false);
  const [isExecutingDedup, setIsExecutingDedup] = useState<boolean>(false);
  const [dedupMsg, setDedupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [autoDedupOnUpload, setAutoDedupOnUpload] = useState<boolean>(true);
  
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

  // Role & Permissions state
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [isUpdatingPermission, setIsUpdatingPermission] = useState<string | null>(null);
  const [permissionSearchTerm, setPermissionSearchTerm] = useState<string>('');

  const fetchRolePermissions = async () => {
    setIsLoadingPermissions(true);
    try {
      const res = await fetch('/api/role-permissions', { cache: 'no-cache' });
      if (res.ok) {
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
    const roleName = targetRole === 'admin' ? 'Admin' : targetRole === 'moderator' ? 'Moderator' : 'User';
    if (!window.confirm(`คุณต้องการ${actionText} สำหรับบทบาท "${roleName}" ใช่หรือไม่?`)) return;

    const allKeys = [
      'view_all_docs', 'create_docs', 'edit_all_docs', 'delete_docs', 'approve_docs', 'export_docs',
      'admin_docs', 'ai_assistant', 'infographics', 'draft_docs',
      'digital_folders', 'workflow_sla', 'digital_signatures', 'recycle_bin',
      'manage_users', 'system_settings', 'backup_restore', 'audit_logs'
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
      const response = await fetch('/api/backup?username=' + encodeURIComponent('ผู้ดูแลระบบ'));
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
      formData.append('username', 'ผู้ดูแลระบบ');

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
    if (!confirm('ยืนยันการรวมไฟล์ซ้ำทั้งหมดในเซิร์ฟเวอร์? ระบบจะรวมไฟล์ซ้ำ และสร้าง Pointer เชื่อมโยงไปยังไฟล์ต้นฉบับเพื่อประหยัดพื้นที่คลาวด์')) {
      return;
    }
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
          text: `รวมไฟล์ซ้ำเรียบร้อยแล้ว! รวมไฟล์แล้ว ${data.filesMerged} ไฟล์ ประหยัดพื้นที่ได้ ${data.bytesReclaimedFormatted}`
        });
        if (data.updatedStats) {
          setDedupStats(data.updatedStats);
        } else {
          fetchDedupStats();
        }
      } else {
        setDedupMsg({ type: 'error', text: data.error || 'การรวมไฟล์ซ้ำล้มเหลว' });
      }
    } catch (err: any) {
      setDedupMsg({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการรวมไฟล์ซ้ำ' });
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
  }, [activeTab]);

  const fetchSystemSettings = async () => {
    try {
      const res = await fetch('/api/settings', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
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
        
        localStorage.setItem('moi_settings', JSON.stringify(data));
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    }
  };

  const saveSystemSettings = async () => {
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
      alert('บันทึกการตั้งค่าระบบ, ตราครุฑ/โลโก้, Gemini API Key และค่าเปิด-ปิดฟังก์ชันเรียบร้อยแล้ว');
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon' | 'garuda15' | 'garuda30') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('files', file);
      formData.append('subfolder', 'system');
      formData.append('uploadedBy', 'admin');

      try {
        const res = await fetch('/api/upload', {
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
      const res = await fetch('/api/departments');
      if (res.ok) {
        const depsData = await res.json();
        setDepartments(depsData);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
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
      const res = await fetch('/api/positions');
      if (res.ok) {
        const posData = await res.json();
        setPositions(posData);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
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
      const res = await fetch('/api/users');
      if (res.ok) {
        const usersData = await res.json();
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
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

    setIsSubmittingUser(true);
    try {
      const defaultDept = newUser.department || (departments.length > 0 ? departments[0].name : 'ฝ่ายบริหารงานทั่วไป');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-noto-serif-thai font-semibold text-[var(--text-primary)]">ตั้งค่าระบบ</h2>
          <p className="text-[var(--text-secondary)] mt-1 text-sm">จัดการข้อมูลพื้นฐานและสิทธิ์การใช้งานของระบบ</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border-light)] pb-4 overflow-x-auto scrollbar-none whitespace-nowrap">
        {(!props.user?.role || (props.hasPermission ? props.hasPermission('system_settings') : props.user?.role === 'admin')) && (
          <>
            <button 
              onClick={() => setActiveTab('system')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'system' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)]'
              }`}
            >
              <SettingsIcon className="w-4 h-4" /> ตั้งค่าข้อมูลพื้นฐาน
            </button>
            <button 
              onClick={() => setActiveTab('smtp')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'smtp' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)]'
              }`}
            >
              <SettingsIcon className="w-4 h-4" /> ตั้งค่า SMTP
            </button>
            <button 
              onClick={() => setActiveTab('system_doc')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'system_doc' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Calendar className="w-4 h-4" /> ตั้งค่าระบบสารบรรณ
            </button>
          </>
        )}

        {(!props.user?.role || (props.hasPermission ? props.hasPermission('manage_users') : (props.user?.role === 'admin' || props.user?.role === 'moderator'))) && (
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'users' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Shield className="w-4 h-4" /> {props.user?.role === 'moderator' ? 'จัดการบุคลากรในฝ่าย' : 'จัดการข้อมูลบุคลากร'}
          </button>
        )}

        <button 
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'permissions' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> กำหนดสิทธิ์ผู้ใช้งาน (Role & Permission)
        </button>

        {(!props.user?.role || (props.hasPermission ? props.hasPermission('backup_restore') : props.user?.role === 'admin')) && (
          <>
            <button 
              onClick={() => setActiveTab('backup')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'backup' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Database className="w-4 h-4" /> สำรองและคืนค่าข้อมูล
            </button>
            <button 
              onClick={() => setActiveTab('dedup')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === 'dedup' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)]'
              }`}
            >
              <HardDrive className="w-4 h-4" /> จัดการไฟล์ซ้ำ
            </button>
          </>
        )}
      </div>

      {/* Datalist for Position Autocomplete from MySQL / Local DB */}
      <datalist id="positions-list">
        {positions.map((p: any) => (
          <option key={p.id} value={p.name}>{p.description ? `${p.name} - ${p.description}` : p.name}</option>
        ))}
      </datalist>

      {/* Content */}
      <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl p-6 shadow-lg">
        {activeTab === 'system' && (
          <div className="max-w-4xl space-y-6 animate-fade-in">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6">
              <h3 className="text-lg font-noto-serif-thai font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
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
                <h3 className="text-lg font-noto-serif-thai font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-[var(--primary-color)]" /> ตราครุฑ ๑.๕ ซม. (หนังสือภายใน/บันทึกข้อความ)
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-lg border-2 border-dashed border-[var(--border-medium)] bg-[var(--bg-overlay)] flex items-center justify-center overflow-hidden relative">
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
                <h3 className="text-lg font-noto-serif-thai font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-[var(--primary-color)]" /> ตราครุฑ ๓.๐ ซม. (หนังสือภายนอก/คำสั่ง/ประกาศ)
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-lg border-2 border-dashed border-[var(--border-medium)] bg-[var(--bg-overlay)] flex items-center justify-center overflow-hidden relative">
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
                <h3 className="text-lg font-noto-serif-thai font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5 text-[var(--primary-color)]" /> โลโก้หน่วยงาน
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-lg border-2 border-dashed border-[var(--border-medium)] bg-[var(--bg-overlay)] flex items-center justify-center overflow-hidden relative">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <Image className="w-8 h-8 text-[var(--text-muted)]" />
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
                <h3 className="text-lg font-noto-serif-thai font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[var(--primary-color)]" /> Favicon (ไอคอนแท็บ)
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-lg border-2 border-dashed border-[var(--border-medium)] bg-[var(--bg-overlay)] flex items-center justify-center overflow-hidden relative">
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
              <h3 className="text-lg font-noto-serif-thai font-medium text-[var(--text-primary)] mb-1 flex items-center gap-2">
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
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> บันทึก Gemini API Key ในระบบเรียบร้อยแล้ว พร้อมใช้งาน AI สแกนเอกสาร
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> ยังไม่ได้กำหนด API Key ในฐานข้อมูล (ระบบจะลองใช้จาก Settings &gt; Secrets เป็นลำดับถัดไป)
                  </p>
                )}
              </div>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6 space-y-6">
              <h3 className="text-lg font-noto-serif-thai font-medium text-[var(--text-primary)] mb-1 flex items-center gap-2">
                <Zap className="w-5 h-5 text-[var(--primary-color)]" /> การเปิด-ปิดฟังก์ชันการใช้งานระบบ (System Feature Control)
              </h3>
              <p className="text-xs text-[var(--text-muted)] mb-4 font-sans">
                เลือกเปิดหรือปิดระบบงานต่างๆ ฟังก์ชันที่ถูกปิดใช้งานจะไม่ปรากฏบนแถบเมนูด้านข้างและหน้ากระดานทำงานของเจ้าหน้าที่ทั่วไป
              </p>
              
              {/* Master Control Panel */}
              <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-500/20 p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/25 flex items-center justify-center font-bold text-blue-500">
                    🎮
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-[var(--text-primary)] font-noto-serif-thai">
                      สวิตช์ควบคุมหลัก (Master Controller)
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-sans">
                      เปิดหรือปิดการทำงานของฟังก์ชันเสริมและระบบงานหลักทั้งหมดพร้อมกันในครั้งเดียว
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleAllFeatures(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-semibold transition-all cursor-pointer font-sans"
                  >
                    เปิดทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleAllFeatures(false);
                    }}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-lg text-xs font-semibold transition-all cursor-pointer font-sans"
                  >
                    ปิดทั้งหมด
                  </button>
                </div>
              </div>

              {/* Toggles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                {/* Left Column: Main Navigation Features */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-[var(--border-lighter)] bg-[var(--bg-canvas)]/30">
                    <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2 font-noto-serif-thai">
                      <Layers className="w-4.5 h-4.5 text-[var(--primary-color)]" />
                      เมนูการทำงานหลัก (Main Application Tabs)
                    </h4>
                  </div>
                  <div className="p-4 divide-y divide-[var(--border-lighter)]">
                    {/* Overview */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">📊</span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">หน้าภาพรวมระบบ (System Overview)</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">แสดงสถิติความเคลื่อนไหว กราฟ และสรุปงาน</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={enabledFeatures.overview !== false}
                          onChange={() => handleToggleFeature('overview')}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                      </label>
                    </div>

                    {/* Inbox */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">📥</span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">ทะเบียนหนังสือรับ (Receipt Registry)</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">จัดการ ลงทะเบียน และจัดเก็บเอกสารเข้า</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={enabledFeatures.inbox !== false}
                          onChange={() => handleToggleFeature('inbox')}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                      </label>
                    </div>

                    {/* Outbox */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">📤</span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">ทะเบียนหนังสือส่ง (Dispatch Registry)</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">ออกเลข ออกรหัส และติดตามหนังสือออก</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={enabledFeatures.outbox !== false}
                          onChange={() => handleToggleFeature('outbox')}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                      </label>
                    </div>

                    {/* Admin Docs */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">📋</span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">ระบบงานธุรการ (Administrative Docs)</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">คำสั่ง ประกาศ หนังสือเวียน งานส่วนกลาง</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={enabledFeatures.admin_docs !== false}
                          onChange={() => handleToggleFeature('admin_docs')}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                      </label>
                    </div>

                    {/* Draft Docs */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">✍️</span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">ระบบร่างเอกสาร (Drafting System)</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">เครื่องมือช่วยเขียน ร่าง และประมวลผลอัจฉริยะ</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={enabledFeatures.draft_docs !== false}
                          onChange={() => handleToggleFeature('draft_docs')}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                      </label>
                    </div>

                    {/* Folders */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">📂</span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">แฟ้มเอกสารดิจิทัล (Digital Folders)</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">สิทธิ์แยกตามแผนก/บุคคล แฟ้มส่วนตัวและส่วนกลาง</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={enabledFeatures.folders !== false}
                          onChange={() => handleToggleFeature('folders')}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                      </label>
                    </div>

                    {/* System History Logs */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">🛡️</span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">บันทึกประวัติระบบ (Audit History Logs)</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">บันทึกการกระทำ การดาวน์โหลด และอัปโหลดไฟล์</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={enabledFeatures.logs !== false}
                          onChange={() => handleToggleFeature('logs')}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Right Column: Drafting & Smart Features */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-[var(--border-lighter)] bg-[var(--bg-canvas)]/30">
                    <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2 font-noto-serif-thai">
                      <Sparkles className="w-4.5 h-4.5 text-[var(--primary-color)] animate-pulse" />
                      ฟังก์ชันงานร่างและระบบอัจฉริยะ (Drafting & AI Options)
                    </h4>
                  </div>
                  <div className="p-4 divide-y divide-[var(--border-lighter)]">
                    {/* Draft */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">📄</span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">ร่างหนังสือราชการ (Letter Drafting)</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">แบบฟอร์มร่างจดหมายภายใน/ภายนอกแบบมาตรฐาน</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={enabledFeatures.draft !== false}
                          onChange={() => handleToggleFeature('draft')}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                      </label>
                    </div>

                    {/* Ai Scan */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">✨</span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">AI สแกนเอกสาร (AI Document Scanner)</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">แปลงไฟล์สแกน PDF/รูปภาพ เป็นฟิลด์แบบฟอร์มอัตโนมัติ</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={enabledFeatures.aiscan !== false}
                          onChange={() => handleToggleFeature('aiscan')}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                      </label>
                    </div>

                    {/* Orders / Announcement */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">🏆</span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">สืบค้นคำสั่ง / ประกาศมาตรฐาน (Orders Template)</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">เทมเพลตมาตรฐานกว่า 40 รูปแบบตามระเบียบงานสารบรรณ</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={enabledFeatures.order !== false}
                          onChange={() => handleToggleFeature('order')}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                      </label>
                    </div>

                    {/* Custom Order */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">✒️</span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">สร้างคำสั่ง/ประกาศเอง (Custom Order Creator)</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">ร่างจัดพิมพ์ประกาศและคำสั่งของหน่วยงานแบบฟอร์มกำหนดเอง</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={enabledFeatures.customorder !== false}
                          onChange={() => handleToggleFeature('customorder')}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                      </label>
                    </div>

                    {/* Speeches / Reports */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">🎤</span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">คำกล่าว / รายงานเปิดงาน (Speeches Template)</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">เทมเพลตคำกล่าวรายงานในพิธี คำกล่าวเปิดงานกว่า 100+ แบบ</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={enabledFeatures.speech !== false}
                          onChange={() => handleToggleFeature('speech')}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                      </label>
                    </div>

                    {/* Meeting Minutes */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">👥</span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">บันทึกรายงานการประชุม (Meeting Minutes)</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">จดบันทึกระเบียบวาระการประชุม และพิมพ์รายงานได้ทันที</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={enabledFeatures.meeting !== false}
                          onChange={() => handleToggleFeature('meeting')}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                      </label>
                    </div>

                    {/* Project Summary */}
                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">📈</span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">สรุปโครงการด้วย AI (AI Project Summarizer)</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">คำนวณงบประมาณ ตัวชี้วัด และสรุปรูปโครงการอัตโนมัติ</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={enabledFeatures.summary !== false}
                          onChange={() => handleToggleFeature('summary')}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                      </label>
                    </div>

                    {/* Workflow & SLA Tracking */}
                    <div className="py-3 flex items-center justify-between gap-4 border-t border-[var(--border-lighter)] pt-3">
                      <div className="flex items-start gap-3">
                        <span className="text-lg mt-0.5">⏱️</span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">ระบบ Workflow และ SLA ติดตามงาน</div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">กำหนดเส้นทางเสนออนุมัติหลายขั้น กำหนดระยะเวลา SLA และ Dashboard งานค้างรายบุคคล/ฝ่าย</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={enabledFeatures.workflow !== false}
                          onChange={() => handleToggleFeature('workflow')}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>


            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6">
              <h3 className="text-lg font-noto-serif-thai font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
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
              <h3 className="text-lg font-noto-serif-thai font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
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
            <div className="flex gap-2 border-b border-[var(--border-light)] pb-4 overflow-x-auto scrollbar-none whitespace-nowrap">
              <button 
                onClick={() => setActiveSystemDocTab('docSettings')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0 ${
                  activeSystemDocTab === 'docSettings' ? 'bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--primary-color)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)]'
                }`}
              >
                <SettingsIcon className="w-4 h-4" /> ตั้งค่าระบบสารบรรณ
              </button>
              <button 
                onClick={() => setActiveSystemDocTab('customNumbering')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0 ${
                  activeSystemDocTab === 'customNumbering' ? 'bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--primary-color)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Hash className="w-4 h-4" /> รูปแบบเลขหนังสือและรหัสแฟ้ม
              </button>
              <button 
                onClick={() => setActiveSystemDocTab('departments')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0 ${
                  activeSystemDocTab === 'departments' ? 'bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--primary-color)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Building2 className="w-4 h-4" /> จัดการข้อมูลแผนก/ฝ่าย
              </button>
              <button 
                onClick={() => setActiveSystemDocTab('positions')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0 ${
                  activeSystemDocTab === 'positions' ? 'bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--primary-color)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Briefcase className="w-4 h-4" /> จัดการตำแหน่ง
              </button>
            </div>

            {activeSystemDocTab === 'customNumbering' && (
              <CustomNumberingSettings />
            )}

            {activeSystemDocTab === 'docSettings' && (
              <div className="max-w-xl space-y-6">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6">
                  <h3 className="text-lg font-noto-serif-thai font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
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

                <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6">
                  <h3 className="text-lg font-noto-serif-thai font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[var(--primary-color)]" /> เลขที่เริ่มต้นของระบบ
                  </h3>
                  
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
              <h3 className="text-lg font-noto-serif-thai font-medium text-[var(--text-primary)]">รายชื่อแผนก/กลุ่มงาน</h3>
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
                <h3 className="text-lg font-noto-serif-thai font-medium text-[var(--text-primary)] flex items-center gap-2">
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
            {/* Header & Controls */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-noto-serif-thai font-semibold text-[var(--text-primary)]">จัดการเจ้าหน้าที่ในหน่วยงาน</h3>
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
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface)] shadow-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[var(--bg-canvas)] border-b border-[var(--border-light)] text-[var(--text-secondary)] text-xs font-semibold uppercase tracking-wider">
                          <th className="py-3 px-4">ชื่อผู้ใช้งาน</th>
                          <th className="py-3 px-4">อีเมล</th>
                          <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                          <th className="py-3 px-4">ตำแหน่ง</th>
                          <th className="py-3 px-4">ฝ่าย/กลุ่มงาน</th>
                          <th className="py-3 px-4">สิทธิ์การใช้งาน</th>
                          <th className="py-3 px-4 text-right">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(user => {
                          const isEditingAdmin = user.role === 'admin';
                          const isCurrentModerator = props.user?.role === 'moderator';
                          const canEditThisUser = !isCurrentModerator || !isEditingAdmin;

                          return (
                      <tr key={user.id} className={`border-b border-[var(--border-lighter)] hover:bg-[var(--border-lighter)]/50 transition-colors group ${!canEditThisUser ? 'opacity-80' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="font-mono text-sm text-[var(--primary-color)] font-semibold">{user.username || '-'}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              <Lock className="w-2.5 h-2.5" /> Argon2id
                            </span>
                            {user.role === 'admin' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/15 text-amber-500 text-[10px] font-bold rounded">
                                <Crown className="w-2.5 h-2.5" /> Admin
                              </span>
                            )}
                            {user.role === 'moderator' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/15 text-blue-500 text-[10px] font-bold rounded">
                                <ShieldCheck className="w-2.5 h-2.5" /> Moderator
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input 
                            type="email"
                            value={user.email || ""}
                            disabled={!canEditThisUser}
                            onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, email: e.target.value } : u))}
                            onBlur={(e) => updateUser(user.id, "email", e.target.value)}
                            className={`bg-transparent border border-transparent hover:border-[var(--border-medium)] focus:border-[var(--primary-color)] focus:bg-[var(--bg-canvas)] rounded px-2 py-1 outline-none text-[var(--text-primary)] transition-colors w-full ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                            placeholder="อีเมล"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1.5">
                            <input 
                              type="text"
                              value={user.firstName || ''}
                              disabled={!canEditThisUser}
                              onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, firstName: e.target.value } : u))}
                              onBlur={(e) => updateUser(user.id, 'firstName', e.target.value)}
                              className={`bg-transparent border border-transparent hover:border-[var(--border-medium)] focus:border-[var(--primary-color)] focus:bg-[var(--bg-canvas)] rounded px-2 py-1 outline-none text-[var(--text-primary)] transition-colors w-1/2 ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                              placeholder="ชื่อ"
                            />
                            <input 
                              type="text"
                              value={user.lastName || ''}
                              disabled={!canEditThisUser}
                              onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, lastName: e.target.value } : u))}
                              onBlur={(e) => updateUser(user.id, 'lastName', e.target.value)}
                              className={`bg-transparent border border-transparent hover:border-[var(--border-medium)] focus:border-[var(--primary-color)] focus:bg-[var(--bg-canvas)] rounded px-2 py-1 outline-none text-[var(--text-primary)] transition-colors w-1/2 ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                              placeholder="นามสกุล"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <select 
                            value={user.position || ''}
                            disabled={!canEditThisUser}
                            onChange={(e) => updateUser(user.id, 'position', e.target.value)}
                            className={`bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded px-2 py-1 outline-none text-[var(--text-primary)] text-sm focus:border-[var(--primary-color)] w-full ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                          >
                            <option value="">-- เลือกตำแหน่ง (ตาราง positions) --</option>
                            {positions.map((pos: any) => (
                              <option key={pos.id} value={pos.name}>{pos.name}</option>
                            ))}
                            {user.position && !positions.some(p => p.name === user.position) && (
                              <option value={user.position}>{user.position}</option>
                            )}
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <select 
                            value={user.department || (departments.length > 0 ? departments[0].name : 'ฝ่ายบริหารงานทั่วไป')}
                            disabled={!canEditThisUser}
                            onChange={(e) => updateUser(user.id, 'department', e.target.value)}
                            className={`bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded px-2 py-1 outline-none text-[var(--text-primary)] text-sm focus:border-[var(--primary-color)] w-full ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                          >
                            {departments.length === 0 ? (
                              <option value="ฝ่ายบริหารงานทั่วไป">ฝ่ายบริหารงานทั่วไป</option>
                            ) : (
                              departments.map((dept: any) => (
                                <option key={dept.id} value={dept.name}>{dept.name}</option>
                              ))
                            )}
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <select 
                            value={user.role || 'user'}
                            disabled={!canEditThisUser}
                            onChange={(e) => updateUser(user.id, 'role', e.target.value)}
                            className={`bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded px-2 py-1 outline-none text-[var(--text-primary)] text-sm focus:border-[var(--primary-color)] font-medium ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                          >
                            <option value="user">ผู้ใช้งานทั่วไป (User)</option>
                            <option value="moderator">ผู้ตรวจสอบ/เจ้าหน้าที่สารบรรณ (Moderator)</option>
                            {(props.user?.role === 'admin' || user.role === 'admin') && (
                              <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                            )}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canEditThisUser ? (
                              <>
                                <button
                                  onClick={() => setResetPassUser(user)}
                                  title="เปลี่ยนรหัสผ่าน (Argon2id)"
                                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => confirmDeleteUser(user)}
                                  title="ลบข้อมูลเจ้าหน้าที่"
                                  className="p-1.5 text-[var(--text-secondary)] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-[var(--text-muted)] italic px-2 py-1 bg-[var(--bg-canvas)] rounded border border-[var(--border-lighter)]">
                                สงวนสิทธิ์สำหรับ Admin
                              </span>
                            )}
                          </div>
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
                    className={`bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-4 shadow-xs space-y-3.5 ${!canEditThisUser ? 'opacity-85' : ''}`}
                  >
                    {/* Card Top Row: User Avatar, Username & Actions */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border-lighter)]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center shrink-0 font-bold text-sm">
                          {(user.firstName || user.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-[var(--primary-color)] truncate">@{user.username}</span>
                            {user.role === 'admin' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-md shrink-0">
                                <Crown className="w-2.5 h-2.5" /> Admin
                              </span>
                            )}
                            {user.role === 'moderator' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded-md shrink-0">
                                <ShieldCheck className="w-2.5 h-2.5" /> Moderator
                              </span>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono mt-0.5">
                            <Lock className="w-2.5 h-2.5" /> Argon2id
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {canEditThisUser ? (
                          <>
                            <button
                              onClick={() => setResetPassUser(user)}
                              className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 rounded-xl transition active:scale-95 cursor-pointer"
                              title="เปลี่ยนรหัสผ่าน"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => confirmDeleteUser(user)}
                              className="p-2 text-[var(--text-secondary)] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition active:scale-95 cursor-pointer"
                              title="ลบข้อมูล"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-[var(--text-muted)] italic px-2 py-0.5 bg-[var(--bg-canvas)] rounded border border-[var(--border-lighter)]">
                            Admin Only
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">อีเมล</label>
                      <input
                        type="email"
                        value={user.email || ""}
                        disabled={!canEditThisUser}
                        onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, email: e.target.value } : u))}
                        onBlur={(e) => updateUser(user.id, "email", e.target.value)}
                        className={`w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                        placeholder="user@example.com"
                      />
                    </div>

                    {/* Editable Form Fields Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">ชื่อ</label>
                        <input 
                          type="text"
                          value={user.firstName || ''}
                          disabled={!canEditThisUser}
                          onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, firstName: e.target.value } : u))}
                          onBlur={(e) => updateUser(user.id, 'firstName', e.target.value)}
                          className={`w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                          placeholder="ชื่อ"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">นามสกุล</label>
                        <input 
                          type="text"
                          value={user.lastName || ''}
                          disabled={!canEditThisUser}
                          onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, lastName: e.target.value } : u))}
                          onBlur={(e) => updateUser(user.id, 'lastName', e.target.value)}
                          className={`w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                          placeholder="นามสกุล"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">ตำแหน่ง (ตาราง positions)</label>
                      <select 
                        value={user.position || ''}
                        disabled={!canEditThisUser}
                        onChange={(e) => updateUser(user.id, 'position', e.target.value)}
                        className={`w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                      >
                        <option value="">-- เลือกตำแหน่ง --</option>
                        {positions.map((pos: any) => (
                          <option key={pos.id} value={pos.name}>{pos.name}</option>
                        ))}
                        {user.position && !positions.some(p => p.name === user.position) && (
                          <option value={user.position}>{user.position}</option>
                        )}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">ฝ่าย / กลุ่มงาน</label>
                        <select 
                          value={user.department || (departments.length > 0 ? departments[0].name : 'ฝ่ายบริหารงานทั่วไป')}
                          disabled={!canEditThisUser}
                          onChange={(e) => updateUser(user.id, 'department', e.target.value)}
                          className={`w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                        >
                          {departments.length === 0 ? (
                            <option value="ฝ่ายบริหารงานทั่วไป">ฝ่ายบริหารงานทั่วไป</option>
                          ) : (
                            departments.map((dept: any) => (
                              <option key={dept.id} value={dept.name}>{dept.name}</option>
                            ))
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">สิทธิ์การใช้งาน</label>
                        <select 
                          value={user.role || 'user'}
                          disabled={!canEditThisUser}
                          onChange={(e) => updateUser(user.id, 'role', e.target.value)}
                          className={`w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-2.5 py-2 text-xs font-semibold text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none ${!canEditThisUser ? 'cursor-not-allowed opacity-75' : ''}`}
                        >
                          <option value="user">ผู้ใช้งานทั่วไป (User)</option>
                          <option value="moderator">ผู้ตรวจสอบ/เจ้าหน้าที่สารบรรณ (Moderator)</option>
                          {(props.user?.role === 'admin' || user.role === 'admin') && (
                            <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                          )}
                        </select>
                      </div>
                    </div>

                    {isSavingUser === String(user.id) && (
                      <div className="text-[10px] text-[var(--primary-color)] font-medium text-right animate-pulse pt-1">
                        กำลังบันทึกการเปลี่ยนแปลง...
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </>
          );
        })()}
          </div>
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
                  title: 'ลบข้อมูลเอกสาร / ย้ายเข้าถังขยะ (Delete Documents)',
                  desc: 'สิทธิ์การส่งเอกสารไปที่ถังขยะ หรือลบรายการเอกสารที่ไม่ถูกต้องออกจากระบบสารบรรณ',
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
                  title: 'ติดตามกระบวนการและ SLA (Workflow & SLA Tracking)',
                  desc: 'สิทธิ์ตรวจสอบเส้นทางหนังสือ ระยะเวลาประมวลผล ความล่าช้า และกำหนดแจ้งเตือน SLA',
                  note: 'ช่วยบริหารจัดการเวลาเสนอหนังสือ'
                },
                {
                  key: 'digital_signatures',
                  title: 'ศูนย์ลงนามดิจิทัล ETDA (Digital Signatures Hub)',
                  desc: 'สิทธิ์เข้าถึงศูนย์ตรวจสอบและลงนามดิจิทัลตามมาตรฐาน ETDA Gateway',
                  note: 'ตรวจสอบความถูกต้องของใบรับรองลายมือชื่อ'
                },
                {
                  key: 'recycle_bin',
                  title: 'ถังขยะเอกสารและการกู้คืน (Recycle Bin & Restore)',
                  desc: 'สิทธิ์เข้าถึงถังขยะระบบ กู้คืนหนังสือที่ถูกลบ หรือทำลายเอกสารทิ้งถาวร',
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
                }
              ]
            }
          ];

          // Calculate active permission count per role
          const totalKeysCount = 18;
          const getActiveCount = (role: string) => {
            const rolePerms = rolePermissions.filter(p => p.role === role && p.is_allowed === 1);
            return rolePerms.length;
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

          const renderToggle = (role: string, key: string) => {
            const perm = rolePermissions.find(p => p.role === role && p.permission_key === key);
            // Default fallbacks if not explicitly set
            let isAllowed = false;
            if (perm) {
              isAllowed = perm.is_allowed === 1;
            } else {
              if (role === 'admin') isAllowed = true;
              else if (role === 'moderator') isAllowed = !['system_settings', 'backup_restore', 'audit_logs'].includes(key);
              else if (role === 'user') isAllowed = ['create_docs', 'export_docs', 'ai_assistant', 'infographics', 'draft_docs', 'digital_folders', 'workflow_sla'].includes(key);
            }

            const updateKey = `${role}-${key}`;
            const isUpdating = isUpdatingPermission === updateKey;
            const isAdmin = props.user?.role === 'admin';
            
            // Protect Admin from self-lockout
            const isProtected = role === 'admin' && (key === 'system_settings' || key === 'manage_users');

            return (
              <div className="flex flex-col items-center justify-center gap-1 py-1">
                <button
                  disabled={!isAdmin || isProtected || isLoadingPermissions || isUpdating}
                  onClick={() => handleTogglePermission(role, key, isAllowed ? 1 : 0)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isAllowed 
                      ? (role === 'admin' ? 'bg-amber-500' : role === 'moderator' ? 'bg-indigo-600' : 'bg-emerald-500') 
                      : 'bg-slate-200 dark:bg-slate-700'
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
                  {isUpdating ? 'บันทึก...' : isAllowed ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
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
                      <h3 className="text-xl sm:text-2xl font-bold font-noto-serif-thai text-white">
                        การกำหนดสิทธิ์ผู้ใช้งาน (Role & Permission Control Hub)
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl pt-1">
                      แผงควบคุมสิทธิ์ตามระดับผู้ใช้แบบโต้ตอบ (Interactive Matrix) ครอบคลุมทั้ง 18 ฟังก์ชันหลักในระบบสารบรรณอิเล็กทรอนิกส์
                      สามารถปรับเปลี่ยนและมีผลใช้งานทันทีทั่วทั้งองค์กร
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

              {/* Role Summary Cards with Quick Actions */}
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

              {/* Dynamic Search & Control Header */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 bg-[var(--bg-elevated)] border-b border-[var(--border-lighter)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[var(--primary-color)]" />
                    <h4 className="font-bold text-[var(--text-primary)] text-sm sm:text-base font-noto-serif-thai">
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
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-[var(--bg-canvas)] border-b border-[var(--border-lighter)] text-xs font-semibold text-[var(--text-secondary)]">
                          <th className="p-4 w-2/5">ฟังก์ชันระบบ / รายการสิทธิ์การใช้งาน</th>
                          <th className="p-4 text-center w-36 bg-amber-500/5 text-amber-600 dark:text-amber-400 font-bold border-x border-[var(--border-lighter)]/40">
                            <div className="flex items-center justify-center gap-1">
                              <Crown className="w-3.5 h-3.5" /> Admin
                            </div>
                          </th>
                          <th className="p-4 text-center w-36 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 font-bold border-x border-[var(--border-lighter)]/40">
                            <div className="flex items-center justify-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> Moderator
                            </div>
                          </th>
                          <th className="p-4 text-center w-36 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold border-x border-[var(--border-lighter)]/40">
                            <div className="flex items-center justify-center gap-1">
                              <UserIcon className="w-3.5 h-3.5" /> User
                            </div>
                          </th>
                          <th className="p-4">ข้อแนะนำและผลกระทบเชิงความปลอดภัย</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-lighter)] text-xs sm:text-sm">
                        {filteredSections.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">
                              ไม่พบฟังก์ชันที่ตรงกับคำค้นหา "{permissionSearchTerm}"
                            </td>
                          </tr>
                        ) : (
                          filteredSections.map((sec, idx) => (
                            <React.Fragment key={idx}>
                              <tr className="bg-[var(--bg-canvas)]/80 font-bold text-[var(--primary-color)] text-xs border-y border-[var(--border-lighter)]">
                                <td colSpan={5} className="py-3 px-4 flex items-center gap-2">
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
                                  <td className="p-4 text-center bg-amber-500/5 border-x border-[var(--border-lighter)]/40 align-middle">
                                    {renderToggle('admin', item.key)}
                                  </td>
                                  <td className="p-4 text-center bg-indigo-500/5 border-x border-[var(--border-lighter)]/40 align-middle">
                                    {renderToggle('moderator', item.key)}
                                  </td>
                                  <td className="p-4 text-center bg-emerald-500/5 border-x border-[var(--border-lighter)]/40 align-middle">
                                    {renderToggle('user', item.key)}
                                  </td>
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
                )}
              </div>
            </div>
          );
        })()}

        {activeTab === 'backup' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header section */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[var(--primary-color)]/10 text-[var(--primary-color)] rounded-xl">
                  <Database className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-noto-serif-thai font-semibold text-[var(--text-primary)]">
                    สำรองและคืนค่าข้อมูลระบบ (Backup & Restore)
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                    จัดการส่งออกและนำเข้าข้อมูลระบบสารบรรณอิเล็กทรอนิกส์ทั้งหมด รวมถึงข้อมูลในตาราง MySQL (หนังสือรับ, หนังสือส่ง, เวียน, ภายใน, คำสั่ง, ผู้ใช้งาน, การตั้งค่า) และไฟล์เอกสารแนบทั้งหมดในรูปแบบไฟล์บีบอัดมาตรฐาน <span className="font-mono px-1.5 py-0.5 bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded text-xs text-[var(--primary-color)] font-semibold">.tar</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Grid 2 Columns: Backup Panel and Restore Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Backup Card */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-6 flex flex-col justify-between shadow-sm hover:border-[var(--primary-color)]/40 transition-colors">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 border-b border-[var(--border-light)] pb-4">
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-noto-serif-thai font-medium text-base text-[var(--text-primary)]">
                        1. สำรองข้อมูลระบบ (Export Backup)
                      </h4>
                      <p className="text-xs text-[var(--text-muted)]">
                        ดาวน์โหลดไฟล์ .tar บีบอัดข้อมูลสารบรรณและไฟล์แนบทั้งหมด
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    ระบบจะทำการอ่านข้อมูลจากตาราง MySQL ทั้งหมดในระบบ สร้างไฟล์ดัมพ์ JSON และคัดลอกไฟล์เอกสารแนบทั้งหมดในระบบ รวบรวมและบีบอัดเป็นไฟล์เดียวในรูปแบบ <strong className="text-[var(--text-primary)]">.tar</strong> เพื่อให้คุณสามารถนำไปจัดเก็บอย่างปลอดภัยหรือนำไปย้ายระบบไปยังเซิร์ฟเวอร์อื่นได้
                  </p>

                  <div className="bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-lg p-4 space-y-2 text-xs text-[var(--text-secondary)]">
                    <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> ข้อมูลที่จะถูกสำรองไว้ในไฟล์ .tar:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">• ทะเบียนหนังสือรับ / หนังสือส่ง / หนังสือเวียน</div>
                      <div className="flex items-center gap-1.5">• งานธุรการ / คำสั่ง / ประกาศ / หนังสือรับรอง</div>
                      <div className="flex items-center gap-1.5">• บัญชีผู้ใช้งานและสิทธิ์เข้าระบบ</div>
                      <div className="flex items-center gap-1.5">• ข้อมูลโครงสร้างฝ่ายและตำแหน่งงาน</div>
                      <div className="flex items-center gap-1.5">• การตั้งค่าองค์กรและ SMTP</div>
                      <div className="flex items-center gap-1.5">• ไฟล์เอกสารแนบ (PDF/รูปภาพ/เอกสาร)</div>
                    </div>
                  </div>

                  {backupStatusMsg && (
                    <div className={`p-3.5 rounded-lg text-xs flex items-center gap-2.5 ${
                      backupStatusMsg.type === 'success' 
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                    }`}>
                      {backupStatusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                      <span>{backupStatusMsg.text}</span>
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-6 border-t border-[var(--border-light)]">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    disabled={isBackingUp}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer animate-pulse-subtle"
                  >
                    {isBackingUp ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังรวบรวมข้อมูล...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>ดาวน์โหลดข้อมูลสำรอง (.tar)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Restore Card */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-6 flex flex-col justify-between shadow-sm hover:border-[var(--primary-color)]/40 transition-colors">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 border-b border-[var(--border-light)] pb-4">
                    <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-lg">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-noto-serif-thai font-medium text-base text-[var(--text-primary)]">
                        2. คืนค่าข้อมูลระบบ (Import Restore)
                      </h4>
                      <p className="text-xs text-[var(--text-muted)]">
                        อัปโหลดไฟล์สำรองข้อมูล (.tar) เพื่อกู้คืนสารบรรณและไฟล์แนบ
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    เลือกไฟล์สำรองข้อมูล <strong className="text-[var(--text-primary)] font-mono">.tar</strong> ที่คุณเคยดาวน์โหลดไว้ เพื่อคืนค่าระบบทั้งหมดให้กลับไปยังช่วงเวลานั้น ข้อมูลหนังสือ บัญชี และไฟล์ต่างๆ จะถูกรีเซ็ตและอัปเดตตามไฟล์กู้คืน
                  </p>

                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">เลือกไฟล์สำรองข้อมูล (.tar)</label>
                    <div className="flex items-center gap-3">
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
                        className="py-2 px-4 bg-[var(--bg-canvas)] hover:bg-[var(--border-lighter)] text-[var(--text-primary)] border border-[var(--border-medium)] rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Files className="w-4 h-4 text-[var(--text-muted)]" />
                        <span>เลือกไฟล์ .tar...</span>
                      </button>

                      {restoreFile && (
                        <div className="flex items-center gap-2 text-xs text-[var(--text-primary)] bg-[var(--bg-canvas)] px-3 py-1.5 rounded-lg border border-[var(--border-light)] font-mono">
                          <span className="truncate max-w-[150px] sm:max-w-xs">{restoreFile.name}</span>
                          <button
                            type="button"
                            onClick={() => setRestoreFile(null)}
                            className="text-rose-400 hover:text-rose-500 font-semibold p-0.5"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {restoreStatusMsg && (
                    <div className={`p-3.5 rounded-lg text-xs flex flex-col gap-1.5 border ${
                      restoreStatusMsg.type === 'success' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        {restoreStatusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                        <span className="font-semibold">{restoreStatusMsg.text}</span>
                      </div>
                      {restoreStatusMsg.details && (
                        <div className="pl-6 space-y-0.5 text-[10px] opacity-90 font-mono">
                          <div>• นำเข้าเอกสาร: {restoreStatusMsg.details.documentsCount || 0} รายการ</div>
                          <div>• คืนค่าไฟล์แนบ: {restoreStatusMsg.details.filesCount || 0} ไฟล์</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-6 border-t border-[var(--border-light)]">
                  <button
                    type="button"
                    onClick={() => setShowRestoreConfirmModal(true)}
                    disabled={!restoreFile || isRestoring}
                    className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังคืนค่าระบบ... โปรดรอสักครู่</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>เริ่มต้นคืนค่าข้อมูลระบบ (Restore)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Confirmation Modal for Restore */}
            {showRestoreConfirmModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-[scaleIn_0.2s_ease-out]">
                  <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)] bg-amber-500/10">
                    <h3 className="font-noto-serif-thai font-semibold text-base text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-400" /> ยืนยันการคืนค่าข้อมูลระบบ
                    </h3>
                    <button 
                      type="button"
                      onClick={() => setShowRestoreConfirmModal(false)}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      คุณกำลังจะทำการคืนค่าข้อมูลระบบจากไฟล์ <strong className="text-[var(--text-primary)] font-mono">{restoreFile?.name}</strong>
                    </p>
                    <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg leading-relaxed">
                      ⚠️ <strong>คำเตือน:</strong> ข้อมูลหนังสือสารบรรณ, บัญชีผู้ใช้ และการตั้งค่าทั้งหมดในระบบปัจจุบันจะถูกลบและเขียนทับด้วยข้อมูลจากไฟล์สำรองข้อมูลนี้ การดำเนินการนี้ไม่สามารถย้อนกลับได้
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      คุณแน่ใจหรือว่าต้องการดำเนินการต่อ?
                    </p>

                    <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border-light)]">
                      <button
                        type="button"
                        onClick={() => setShowRestoreConfirmModal(false)}
                        className="px-4 py-2 border border-[var(--border-medium)] rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleRestoreSubmit}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
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
                      <h3 className="text-lg sm:text-xl font-noto-serif-thai font-semibold text-[var(--text-primary)]">
                        ระบบบริหารจัดการและลดความซ้ำซ้อนของไฟล์
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-500 font-sans border border-emerald-500/20 font-medium">
                        ประหยัดพื้นที่เซิร์ฟเวอร์
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-4xl">
                      สแกนและตรวจจับไฟล์เอกสารแนบที่มีเนื้อหาตรงกันแบบ 100% (SHA-256 Checksum) เพื่อรวมให้เหลือไฟล์ต้นฉบับจริงเพียงหนึ่งไฟล์ในระบบจัดเก็บ และสร้าง Pointer Link ชี้ลิงก์เดิมทั้งหมดไปยังไฟล์จริง ช่วยประหยัดเนื้อที่เซิร์ฟเวอร์ได้อย่างมหาศาลโดยไม่ทำให้โครงสร้างลิงก์เดิมเสียหาย
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
                        <span>กำลังดำเนินการรวมไฟล์...</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-4 h-4" />
                        <span>เริ่มเคลียร์ไฟล์ซ้ำ (สร้าง Pointer)</span>
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
                  <h4 className="font-semibold text-base text-[var(--text-primary)] flex items-center gap-2 font-noto-serif-thai">
                    <Copy className="w-5 h-5 text-indigo-500" />
                    กลุ่มไฟล์แนบที่ตรวจพบความซ้ำซ้อน ({dedupStats?.groups?.length || 0} กลุ่ม)
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    ไฟล์ซ้ำที่มี Hash ตรงกัน จะเหลือเพียงไฟล์มาสเตอร์ไฟล์เดียวบนระบบดิสก์ ส่วนไฟล์อื่นจะถูกแปลงเป็น Pointer
                  </p>
                </div>
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
                  {dedupStats.groups.map((group: any, idx: number) => (
                    <div key={group.hash || idx} className="p-4 sm:p-5 hover:bg-[var(--bg-canvas)]/20 transition-colors space-y-4">
                      {/* Group Header Info */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[var(--bg-canvas)]/50 p-3 sm:p-4 rounded-xl border border-[var(--border-lighter)] shadow-inner">
                        <div className="flex items-start sm:items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-indigo-500/15 text-indigo-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-[var(--text-primary)]">ขนาดกลุ่ม: {group.fileSizeFormatted}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--bg-surface)] text-[var(--text-muted)] font-mono border border-[var(--border-lighter)]">
                                SHA-256: {group.hash.substring(0, 12)}
                              </span>
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                              พบคู่ซ้ำทั้งหมด <strong className="text-indigo-400 font-medium">{group.duplicatesCount}</strong> สำเนา • ประหยัดเนื้อที่กลุ่มนี้ได้ <strong className="text-emerald-500 font-medium">{group.savedSpaceFormatted}</strong>
                            </div>
                          </div>
                        </div>

                        <a
                          href={`/api/files/view?url=${encodeURIComponent(group.masterFile.url)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 self-start md:self-auto cursor-pointer border border-indigo-500/20 shadow-xs h-[36px] min-w-[120px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>เปิดไฟล์หลัก</span>
                        </a>
                      </div>

                      {/* Master file Section */}
                      <div className="pl-3 sm:pl-4 border-l-2 border-indigo-500 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>ไฟล์หลัก (Master File):</span>
                        </div>
                        <div className="text-xs text-[var(--text-primary)] font-mono bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-lighter)] flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-xs">
                          <span className="break-all leading-relaxed select-all pr-2">{group.masterFile.url}</span>
                          <span className="text-[10px] text-indigo-400 font-sans font-medium px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/10 shrink-0 self-start md:self-auto mt-1 md:mt-0">
                            {group.masterFile.referencedDocs?.length > 0 ? `เชื่อมกับ ${group.masterFile.referencedDocs.length} เอกสาร` : 'ไฟล์ของระบบ'}
                          </span>
                        </div>
                      </div>

                      {/* Duplicates Section */}
                      <div className="pl-3 sm:pl-4 border-l-2 border-[var(--border-medium)] space-y-2.5">
                        <div className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Copy className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                          <span>รายการสำเนาไฟล์ที่ซ้ำและสร้าง Pointer ลิงก์ ({group.duplicates.length} ไฟล์):</span>
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}



      </div>
      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl w-full max-w-lg overflow-hidden shadow-xl animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)] bg-[var(--bg-canvas)]">
              <h3 className="font-noto-serif-thai font-semibold text-lg text-[var(--text-primary)] flex items-center gap-2">
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
                      <option value="ฝ่ายบริหารงานทั่วไป">ฝ่ายบริหารงานทั่วไป</option>
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
              <h3 className="font-noto-serif-thai font-semibold text-base text-[var(--text-primary)] flex items-center gap-2">
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
              <h3 className="font-noto-serif-thai font-semibold text-base text-rose-500 flex items-center gap-2">
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
              <h3 className="font-noto-serif-thai font-semibold text-base text-[var(--text-primary)] flex items-center gap-2">
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
              <h3 className="font-noto-serif-thai font-semibold text-base text-[var(--text-primary)] flex items-center gap-2">
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
                      src={logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Seal_of_the_Ministry_of_Interior_of_Thailand.svg'}
                      alt="Logo"
                      className="w-full h-full object-contain rounded-xl"
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
