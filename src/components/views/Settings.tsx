import React, { useState, useEffect } from 'react';
import { Save, UserPlus, Shield, Settings as SettingsIcon, Building2, Plus, Lock, Key, Trash2, X, ShieldCheck, Calendar, Activity, Image, Type, Search, Filter, User as UserIcon, Crown, BadgeCheck, Briefcase, AlertTriangle, Camera, Upload, Database, Download, RefreshCw, CheckCircle2 } from 'lucide-react';

interface SettingsProps {
  onSettingsUpdated?: () => void;
}

export default function Settings({ onSettingsUpdated }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'system' | 'system_doc' | 'users' | 'departments' | 'positions' | 'smtp' | 'backup'>('system');
  const [activeSystemDocTab, setActiveSystemDocTab] = useState<'docSettings' | 'departments' | 'positions'>('docSettings');
  
  // System Settings state
  const [currentYear, setCurrentYear] = useState<number>(2569);
  const [startSequence, setStartSequence] = useState<number>(1);
  const [orgName, setOrgName] = useState<string>('สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [faviconUrl, setFaviconUrl] = useState<string>('');
  const [footerText, setFooterText] = useState<string>('© 2026 ระบบสารบรรณอิเล็กทรอนิกส์');
  
  const [smtpHost, setSmtpHost] = useState<string>('');
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpUser, setSmtpUser] = useState<string>('');
  const [smtpPassword, setSmtpPassword] = useState<string>('');
  const [smtpFrom, setSmtpFrom] = useState<string>('');

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

  useEffect(() => {
    fetchSystemSettings();
    fetchDepartments();
    fetchPositions();
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchSystemSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.currentYear) setCurrentYear(data.currentYear);
        if (data.startSequence) setStartSequence(data.startSequence);
        if (data.orgName) setOrgName(data.orgName || '');
        if (data.logoUrl !== undefined) setLogoUrl(data.logoUrl || '');
        if (data.faviconUrl !== undefined) setFaviconUrl(data.faviconUrl || '');
        if (data.footerText) setFooterText(data.footerText || '');
        if (data.smtpHost !== undefined) setSmtpHost(data.smtpHost || '');
        if (data.smtpPort !== undefined) setSmtpPort(data.smtpPort || 587);
        if (data.smtpUser !== undefined) setSmtpUser(data.smtpUser || '');
        if (data.smtpPassword !== undefined) setSmtpPassword(data.smtpPassword || '');
        if (data.smtpFrom !== undefined) setSmtpFrom(data.smtpFrom || '');
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
          logoUrl,
          faviconUrl,
          footerText,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPassword,
          smtpFrom
        })
      });
      alert('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว');
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSavingSystem(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
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
            if (type === 'logo') {
              setLogoUrl(data.files[0].url);
            } else {
              setFaviconUrl(data.files[0].url);
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
        <button 
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'system' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)]'
          }`}
        >
          <SettingsIcon className="w-4 h-4" /> ตั้งค่าข้อมูลพื้นฐาน
        </button>
        <button 
          onClick={() => setActiveTab('smtp')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'smtp' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)]'
          }`}
        >
          <SettingsIcon className="w-4 h-4" /> ตั้งค่า SMTP
        </button>
        <button 
          onClick={() => setActiveTab('system_doc')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'system_doc' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Calendar className="w-4 h-4" /> ตั้งค่าระบบสารบรรณ
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'users' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Shield className="w-4 h-4" /> จัดการข้อมูลบุคลากร
        </button>
        <button 
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'backup' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Database className="w-4 h-4" /> สำรองและคืนค่าข้อมูล
        </button>
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
          <div className="max-w-xl space-y-6 animate-fade-in">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-6">
              <h3 className="text-lg font-noto-serif-thai font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[var(--primary-color)]" /> ชื่อหน่วยงาน
              </h3>
              <div className="space-y-2">
                <label className="text-sm text-[var(--text-secondary)]">ชื่อหน่วยงานที่จะแสดงในระบบ</label>
                <input 
                  type="text" 
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none transition-colors"
                />
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
                  <div className="space-y-2">
                    <label className="text-sm text-[var(--text-secondary)]">เลขที่รับ/ส่งหนังสือเริ่มต้น (สำหรับปีใหม่)</label>
                    <input 
                      type="number" 
                      value={startSequence}
                      onChange={e => setStartSequence(Number(e.target.value))}
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
                        {filteredUsers.map(user => (
                      <tr key={user.id} className="border-b border-[var(--border-lighter)] hover:bg-[var(--border-lighter)]/50 transition-colors group">
                        <td className="py-3 px-4">
                          <div className="font-mono text-sm text-[var(--primary-color)] font-semibold">{user.username || '-'}</div>
                          <div className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1">
                            <Lock className="w-2.5 h-2.5" /> Argon2id
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input 
                            type="email"
                            value={user.email || ""}
                            onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, email: e.target.value } : u))}
                            onBlur={(e) => updateUser(user.id, "email", e.target.value)}
                            className="bg-transparent border border-transparent hover:border-[var(--border-medium)] focus:border-[var(--primary-color)] focus:bg-[var(--bg-canvas)] rounded px-2 py-1 outline-none text-[var(--text-primary)] transition-colors w-full"
                            placeholder="อีเมล"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1.5">
                            <input 
                              type="text"
                              value={user.firstName || ''}
                              onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, firstName: e.target.value } : u))}
                              onBlur={(e) => updateUser(user.id, 'firstName', e.target.value)}
                              className="bg-transparent border border-transparent hover:border-[var(--border-medium)] focus:border-[var(--primary-color)] focus:bg-[var(--bg-canvas)] rounded px-2 py-1 outline-none text-[var(--text-primary)] transition-colors w-1/2"
                              placeholder="ชื่อ"
                            />
                            <input 
                              type="text"
                              value={user.lastName || ''}
                              onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, lastName: e.target.value } : u))}
                              onBlur={(e) => updateUser(user.id, 'lastName', e.target.value)}
                              className="bg-transparent border border-transparent hover:border-[var(--border-medium)] focus:border-[var(--primary-color)] focus:bg-[var(--bg-canvas)] rounded px-2 py-1 outline-none text-[var(--text-primary)] transition-colors w-1/2"
                              placeholder="นามสกุล"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <select 
                            value={user.position || ''}
                            onChange={(e) => updateUser(user.id, 'position', e.target.value)}
                            className="bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded px-2 py-1 outline-none text-[var(--text-primary)] text-sm focus:border-[var(--primary-color)] w-full"
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
                            onChange={(e) => updateUser(user.id, 'department', e.target.value)}
                            className="bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded px-2 py-1 outline-none text-[var(--text-primary)] text-sm focus:border-[var(--primary-color)] w-full"
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
                            onChange={(e) => updateUser(user.id, 'role', e.target.value)}
                            className="bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded px-2 py-1 outline-none text-[var(--text-primary)] text-sm focus:border-[var(--primary-color)] font-medium"
                          >
                            <option value="user">ผู้ใช้งานทั่วไป (User)</option>
                            <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setResetPassUser(user)}
                              title="เปลี่ยนรหัสผ่าน (Argon2id)"
                              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 rounded-lg transition-colors"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => confirmDeleteUser(user)}
                              title="ลบข้อมูลเจ้าหน้าที่"
                              className="p-1.5 text-[var(--text-secondary)] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
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

              {/* Mobile Cards Layout (Visible on sm/mobile screens) */}
              <div className="block md:hidden space-y-3.5">
                {filteredUsers.map(user => (
                  <div 
                    key={user.id} 
                    className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-4 shadow-xs space-y-3.5"
                  >
                    {/* Card Top Row: User Avatar, Username & Actions */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border-lighter)]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[var(--primary-color)]/10 text-[var(--primary-color)] flex items-center justify-center shrink-0 font-bold text-sm">
                          {(user.firstName || user.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-[var(--primary-color)] truncate">@{user.username}</span>
                            {user.role === 'admin' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded-md shrink-0">
                                <Crown className="w-2.5 h-2.5" /> Admin
                              </span>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono mt-0.5">
                            <Lock className="w-2.5 h-2.5" /> Argon2id
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
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
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">อีเมล</label>
                      <input
                        type="email"
                        value={user.email || ""}
                        onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, email: e.target.value } : u))}
                        onBlur={(e) => updateUser(user.id, "email", e.target.value)}
                        className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
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
                          onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, firstName: e.target.value } : u))}
                          onBlur={(e) => updateUser(user.id, 'firstName', e.target.value)}
                          className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                          placeholder="ชื่อ"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">นามสกุล</label>
                        <input 
                          type="text"
                          value={user.lastName || ''}
                          onChange={(e) => setUsers(users.map(u => String(u.id) === String(user.id) ? { ...u, lastName: e.target.value } : u))}
                          onBlur={(e) => updateUser(user.id, 'lastName', e.target.value)}
                          className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                          placeholder="นามสกุล"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">ตำแหน่ง (ตาราง positions)</label>
                      <select 
                        value={user.position || ''}
                        onChange={(e) => updateUser(user.id, 'position', e.target.value)}
                        className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
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
                          onChange={(e) => updateUser(user.id, 'department', e.target.value)}
                          className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-2.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
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
                          onChange={(e) => updateUser(user.id, 'role', e.target.value)}
                          className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-2.5 py-2 text-xs font-semibold text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                        >
                          <option value="user">ผู้ใช้งานทั่วไป (User)</option>
                          <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                        </select>
                      </div>
                    </div>

                    {isSavingUser === user.id && (
                      <div className="text-[10px] text-[var(--primary-color)] font-medium text-right animate-pulse pt-1">
                        กำลังบันทึกการเปลี่ยนแปลง...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          );
        })()}
          </div>
        )}

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
                    onClick={handleDownloadBackup}
                    disabled={isBackingUp}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isBackingUp ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังรวบรวมข้อมูลและสร้างไฟล์ .tar...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>สำรองและดาวน์โหลดไฟล์ข้อมูล (.tar)</span>
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
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-noto-serif-thai font-medium text-base text-[var(--text-primary)]">
                        2. คืนค่าข้อมูลระบบ (Import Restore)
                      </h4>
                      <p className="text-xs text-[var(--text-muted)]">
                        อัปโหลดไฟล์ .tar เพื่อคืนค่าข้อมูลระบบและไฟล์แนบทั้งหมด
                      </p>
                    </div>
                  </div>

                  {/* Warning Notice */}
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200/90 rounded-lg p-3.5 text-xs space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> คำเตือนสำคัญสำหรับการคืนค่าข้อมูล:
                    </div>
                    <p className="leading-relaxed">
                      การคืนค่าจะทำการเขียนทับตารางข้อมูลเดิมทั้งหมดและคัดลอกไฟล์เอกสารแนบจากไฟล์ .tar กลับเข้าสู่ระบบ โปรดตรวจสอบให้แน่ใจว่าได้ใช้ไฟล์สำรองข้อมูลที่ถูกต้อง
                    </p>
                  </div>

                  {/* File Upload Dropzone */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-[var(--text-secondary)]">
                      เลือกหรือลากไฟล์สำรองข้อมูล (.tar)
                    </label>
                    <div className="relative border-2 border-dashed border-[var(--border-medium)] hover:border-[var(--primary-color)] rounded-xl p-5 text-center bg-[var(--bg-canvas)] transition-colors">
                      <input 
                        type="file" 
                        accept=".tar"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setRestoreFile(e.target.files[0]);
                            setRestoreStatusMsg(null);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      {restoreFile ? (
                        <div className="flex items-center justify-between bg-[var(--bg-surface)] border border-[var(--primary-color)]/50 p-3 rounded-lg relative z-20">
                          <div className="flex items-center gap-3 min-w-0 text-left">
                            <div className="p-2 bg-[var(--primary-color)]/10 text-[var(--primary-color)] rounded-lg">
                              <Database className="w-5 h-5 shrink-0" />
                            </div>
                            <div className="truncate">
                              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{restoreFile.name}</p>
                              <p className="text-xs text-[var(--text-muted)]">{(restoreFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setRestoreFile(null);
                            }}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-light)] rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="py-2 space-y-2">
                          <Upload className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                          <div>
                            <p className="text-xs font-medium text-[var(--text-primary)]">คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์ .tar มาวางที่นี่</p>
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">รองรับเฉพาะไฟล์อาร์ไคฟ์ .tar เท่านั้น (ขนาดไม่เกิน 500MB)</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {restoreStatusMsg && (
                    <div className={`p-3.5 rounded-lg text-xs space-y-1.5 ${
                      restoreStatusMsg.type === 'success' 
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                    }`}>
                      <div className="flex items-center gap-2 font-medium">
                        {restoreStatusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                        <span>{restoreStatusMsg.text}</span>
                      </div>
                      {restoreStatusMsg.details && (
                        <div className="mt-2 pt-2 border-t border-emerald-500/20 text-[11px] text-emerald-300/80 grid grid-cols-2 gap-1 font-mono">
                          {Object.entries(restoreStatusMsg.details).map(([tbl, cnt]) => (
                            <div key={tbl}>• {tbl}: {String(cnt)} รายการ</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-6 border-t border-[var(--border-light)]">
                  <button
                    onClick={() => setShowRestoreConfirmModal(true)}
                    disabled={!restoreFile || isRestoring}
                    className="w-full py-3 px-4 bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังคืนค่าข้อมูลระบบ... โปรดรอสักครู่</span>
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
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                  >
                    <option value="user">ผู้ใช้งานทั่วไป (User)</option>
                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
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
    </div>
  );
}
