import React, { useState, useEffect } from 'react';
import { Menu, X, Home, FileText, Bell, User, LogOut, Search, Send, FolderArchive, Settings as SettingsIcon, Sun, Moon, Monitor, FileSpreadsheet, FolderOpen, ShieldCheck, Key, Briefcase, AlertTriangle, Trash2, Building2, Camera, Download, Smartphone, FileEdit } from 'lucide-react';

import { db } from '../firebase';
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
import { ThemeMode } from '../App';

export default function Dashboard({ onLogout, theme, setTheme, user }: { onLogout: () => void, theme: ThemeMode, setTheme: (mode: ThemeMode) => void, user: any }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('overview');

  // PWA Install State & Handler
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };
  
  const [currentUser, setCurrentUser] = useState(user);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [positionsList, setPositionsList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    position: user?.position || '',
    department: user?.department || '',
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
      password: '',
      confirmPassword: '',
      avatar: user?.avatar || ''
    });
  }, [user]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [posRes, deptRes] = await Promise.all([
          fetch('/api/positions'),
          fetch('/api/departments')
        ]);
        if (posRes.ok) setPositionsList(await posRes.json());
        if (deptRes.ok) setDepartmentsList(await deptRes.json());
      } catch (err) {
        console.error('Error fetching meta lists:', err);
      }
    };
    fetchMeta();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('files', file);
      formData.append('subfolder', 'avatars');
      formData.append('uploadedBy', currentUser?.username || 'user');

      try {
        const res = await fetch('/api/upload', {
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
    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      alert('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    setIsSavingProfile(true);
    try {
      const payload = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        position: profileForm.position,
        department: profileForm.department,
        role: currentUser?.role || 'user',
        avatar: profileForm.avatar,
        ...(profileForm.password ? { password: profileForm.password } : {}),
        updatedBy: `${profileForm.firstName} ${profileForm.lastName}`
      };
      const res = await fetch(`/api/users/${currentUser?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = { ...currentUser, ...payload };
        setCurrentUser(updated);
        localStorage.setItem('edms_user_data', JSON.stringify(updated));
        alert('บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว');
        setIsProfileModalOpen(false);
        setProfileForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
      } else {
        alert('ไม่สามารถบันทึกโปรไฟล์ได้');
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
  const [notifications, setNotifications] = useState<any[]>([]);

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
      if (res.ok) {
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
      console.error('Error fetching notifications:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
  const [logoUrl, setLogoUrl] = useState('https://upload.wikimedia.org/wikipedia/commons/4/4b/Seal_of_the_Ministry_of_Interior_of_Thailand.svg');
  const [currentYear, setCurrentYear] = useState<number>(2569);

  const fetchDocuments = async () => {
    try {
      const queryParams = new URLSearchParams({
        role: currentUser?.role || 'user',
        department: currentUser?.department || ''
      }).toString();
      const res = await fetch(`/api/documents?${queryParams}`);
      if (res.ok) {
        const data: DocumentItem[] = await res.json();
        setInboxDocs(data.filter(d => d.type === 'inbox'));
        setOutboxDocs(data.filter(d => d.type === 'outbox'));
        setAdminDocs(data.filter(d => d.type === 'admin'));
        setHasInboxLoaded(true);
        setHasOutboxLoaded(true);
        setHasAdminLoaded(true);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const refreshData = async () => {
    await fetchDocuments();
    await fetchNotifications();
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.orgName) setOrgName(data.orgName);
        if (data.logoUrl !== undefined) setLogoUrl(data.logoUrl);
        if (data.currentYear) setCurrentYear(data.currentYear);
      }
    } catch (err: any) {
      console.error('Error fetching settings', err);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(fetchNotifications, 30000);
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
      await fetch(`/api/documents/${deletingDocId}`, {
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

  const navItems = [
    { id: 'overview', icon: Home, label: 'ภาพรวมระบบ' },
    { id: 'inbox', icon: FileText, label: 'ทะเบียนหนังสือรับ' },
    { id: 'outbox', icon: Send, label: 'ทะเบียนหนังสือส่ง' },
    { id: 'admin_docs', icon: FileSpreadsheet, label: 'ระบบงานธุรการ' },
    { id: 'draft_docs', icon: FileEdit, label: 'ร่างเอกสาร' },
    { id: 'folders', icon: FolderOpen, label: 'แฟ้มเอกสารดิจิทัล' },
  ];

  if (currentUser?.role === 'admin') {
    navItems.push({ id: 'logs', icon: ShieldCheck, label: 'บันทึกประวัติระบบ' });
    navItems.push({ id: 'settings', icon: SettingsIcon, label: 'ตั้งค่าระบบ' });
  }

  const renderContent = () => {
    switch(activeTab) {
      case 'overview':
        return <Overview documents={documents} user={currentUser} onCreateDoc={() => { setCreateDocType('inbox'); setIsCreateModalOpen(true); }} onViewDoc={setSelectedDoc} />;
      case 'inbox':
        return <DocumentList 
          title="ทะเบียนหนังสือรับ" 
          documents={documents.filter(d => d.type === 'inbox')} 
          onViewDoc={setSelectedDoc} 
          onCreateDoc={() => { setCreateDocType('inbox'); setIsCreateModalOpen(true); }}
          onEditDoc={handleEditDoc}
          onDeleteDoc={handleDeleteDoc}
          user={currentUser}
        />;
      case 'outbox':
        return <DocumentList 
          title="ทะเบียนหนังสือส่ง" 
          documents={documents.filter(d => d.type === 'outbox')} 
          onViewDoc={setSelectedDoc} 
          onCreateDoc={() => { setCreateDocType('outbox'); setIsCreateModalOpen(true); }}
          onEditDoc={handleEditDoc}
          onDeleteDoc={handleDeleteDoc}
          user={currentUser}
        />;
      case 'admin_docs':
        return <AdminDocsView 
          documents={documents} 
          onViewDoc={setSelectedDoc}
          onCreateDoc={() => { setCreateDocType('admin'); setIsCreateModalOpen(true); }}
          onEditDoc={handleEditDoc}
          onDeleteDoc={handleDeleteDoc}
          user={currentUser}
        />;
      case 'draft_docs':
        return <DraftDocsView 
          user={currentUser} 
          onSaveToRegistry={() => {
            setCreateDocType('outbox');
            setIsCreateModalOpen(true);
          }}
        />;
      case 'folders':
        return <FoldersView 
          documents={documents} 
          onViewDoc={setSelectedDoc}
          onRefreshDocs={refreshData}
          user={currentUser}
        />;
      case 'logs':
        if (currentUser?.role !== 'admin') {
          return <Overview documents={documents} user={currentUser} onCreateDoc={() => { setCreateDocType('inbox'); setIsCreateModalOpen(true); }} onViewDoc={setSelectedDoc} />;
        }
        return <LogsView user={currentUser} />;
      case 'settings':
        return <Settings onSettingsUpdated={fetchSettings} />;
      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-noto-serif-thai font-semibold text-[var(--text-primary)]">การแจ้งเตือนทั้งหมด</h2>
                <p className="text-[var(--text-secondary)] mt-1 text-sm">รายการอัพเดทและข้อความแจ้งเตือนต่างๆ</p>
              </div>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="bg-[var(--primary-dark)] hover:bg-[var(--primary-hover)] border border-[var(--primary-color)]/30 text-[var(--primary-color)] px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  อ่านทั้งหมดแล้ว
                </button>
              )}
            </div>
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl overflow-hidden shadow-lg">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-secondary)]">ไม่มีการแจ้งเตือน</div>
              ) : (
                <div className="divide-y divide-[var(--border-lighter)]">
                  {notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-6 cursor-pointer transition-colors ${notification.read ? 'hover:bg-[var(--border-lighter)]' : 'bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)]/20'}`}
                    >
                      <div className="flex gap-4">
                        {!notification.read && <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary-color)] mt-1.5 shrink-0" />}
                        <div>
                          <h4 className={`text-base ${notification.read ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)] font-medium'}`}>{notification.title}</h4>
                          <p className="text-sm text-[var(--text-secondary)] mt-1.5">{notification.message}</p>
                          <span className="text-xs text-[var(--text-muted)] mt-3 block">{notification.timeFormatted}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      default:
        return <Overview documents={documents} onCreateDoc={() => setIsCreateModalOpen(true)} onViewDoc={setSelectedDoc} />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sarabun flex">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 bottom-0 w-[280px] lg:w-[260px] bg-[var(--bg-surface)] border-r border-[var(--border-light)] z-50
        transform transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
        lg:translate-x-0 lg:static lg:flex-shrink-0 flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
         {/* Logo / Header */}
         <div className="h-16 flex items-center justify-between px-5 border-b border-[var(--border-light)] shrink-0">
            <div className="flex items-center gap-3 w-full">
               <div className="w-8 h-8 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-elevated)] flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                 <img src={logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Seal_of_the_Ministry_of_Interior_of_Thailand.svg'} className="w-[80%] h-[80%] object-contain" alt="Logo" />
               </div>
               <span className="font-noto-serif-thai font-bold tracking-wide text-[var(--text-primary)] text-[0.95rem] truncate flex-1">
                 {orgName}
               </span>
            </div>
            <button className="lg:hidden text-[var(--text-secondary)] p-1.5 hover:bg-[var(--border-lighter)] rounded-lg transition-colors ml-2" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="w-5 h-5" />
            </button>
         </div>
         {/* Nav Links */}
         <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
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
                 className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${isActive ? 'bg-[var(--primary-color)] text-white font-medium shadow-sm shadow-[var(--primary-color)]/20' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] font-medium'}`}
               >
                 <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                 <span className="truncate">{item.label}</span>
               </a>
             );
           })}
         </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[var(--bg-base)]">
        {/* Topbar */}
        <header className="h-16 shrink-0 bg-[var(--bg-surface)]/80 backdrop-blur-md border-b border-[var(--border-light)] flex items-center justify-between px-4 lg:px-6 z-30 sticky top-0">
           <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
             <button className="lg:hidden text-[var(--text-primary)] p-1.5 hover:bg-[var(--border-lighter)] rounded-lg transition-colors shrink-0 -ml-1.5" onClick={() => setIsMobileMenuOpen(true)}>
               <Menu className="w-5 h-5" />
             </button>
             
             {/* Header Title Badge */}
             <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-light)] min-w-0 max-w-full transition-colors">
               <Building2 className="w-4 h-4 text-[var(--primary-color)] shrink-0" />
               <span className="text-xs sm:text-sm font-medium text-[var(--text-primary)] font-sarabun truncate">
                 {currentUser?.role === 'admin' 
                   ? `สารบรรณอิเล็กทรอนิกส์ ${orgName || 'ส่วนกลาง'}`
                   : `สารบรรณอิเล็กทรอนิกส์ ${currentUser?.department || 'ฝ่ายงาน'}`
                 }
               </span>
             </div>
           </div>

           <div className="flex items-center gap-3 lg:gap-5 relative shrink-0">
             <div className="flex bg-[var(--bg-elevated)] rounded-full p-0.5 border border-[var(--border-light)]">
               <button
                 onClick={() => setTheme('light')}
                 className={`p-1.5 sm:p-2 rounded-full transition-colors ${theme === 'light' ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                 title="Light Mode"
               >
                 <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </button>
               <button
                 onClick={() => setTheme('dark')}
                 className={`p-1.5 sm:p-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                 title="Dark Mode"
               >
                 <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </button>
               <button
                 onClick={() => setTheme('auto')}
                 className={`p-1.5 sm:p-2 rounded-full transition-colors ${theme === 'auto' ? 'bg-[var(--bg-surface)] text-[var(--primary-color)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                 title="Auto Mode"
               >
                 <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </button>
             </div>
             
             <div className="relative">
               <button 
                 onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                 className="relative text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-2 hover:bg-[var(--border-light)] rounded-full transition-colors"
               >
                 <Bell className="w-5 h-5" />
                 {unreadCount > 0 && (
                   <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-[var(--bg-surface)] shadow-sm"></span>
                 )}
               </button>

               {/* Notification Dropdown */}
               {isNotificationOpen && (
                 <>
                   <div 
                     className="fixed inset-0 z-40" 
                     onClick={() => setIsNotificationOpen(false)}
                   />
                   <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl shadow-xl z-50 overflow-hidden">
                     <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-surface)]/50">
                       <h3 className="font-noto-serif-thai font-medium text-[var(--text-primary)]">การแจ้งเตือน</h3>
                       {unreadCount > 0 && (
                         <button 
                           onClick={markAllAsRead}
                           className="text-xs text-[var(--primary-color)] hover:text-[var(--primary-color)] transition-colors"
                         >
                           อ่านทั้งหมด
                         </button>
                       )}
                     </div>
                     <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                       {notifications.length === 0 ? (
                         <div className="p-6 text-center text-[var(--text-secondary)] text-sm">ไม่มีการแจ้งเตือน</div>
                       ) : (
                         notifications.map(notification => (
                           <div 
                             key={notification.id} 
                             onClick={() => handleNotificationClick(notification)}
                             className={`p-4 border-b border-[var(--border-lighter)] cursor-pointer transition-colors ${notification.read ? 'hover:bg-[var(--border-lighter)]' : 'bg-[var(--primary-color)]/10 hover:bg-[var(--primary-color)]/20'}`}
                           >
                             <div className="flex gap-3">
                               {!notification.read && <div className="w-2 h-2 rounded-full bg-[var(--primary-color)] mt-1.5 shrink-0" />}
                               <div>
                                 <h4 className={`text-sm ${notification.read ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)] font-medium'}`}>{notification.title}</h4>
                                 <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{notification.message}</p>
                                 <span className="text-[10px] text-[var(--text-muted)] mt-2 block">{notification.timeFormatted}</span>
                               </div>
                             </div>
                           </div>
                         ))
                       )}
                     </div>
                     <div className="p-3 border-t border-[var(--border-light)] bg-[var(--bg-surface)]/50 text-center">
                       <button 
                         onClick={() => {
                           setActiveTab('notifications');
                           setIsNotificationOpen(false);
                         }}
                         className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                       >
                         ดูการแจ้งเตือนทั้งหมด
                       </button>
                     </div>
                   </div>
                 </>
               )}
             </div>

             <div className="relative">
               <div 
                 onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                 className="flex items-center gap-3 pl-3 lg:pl-6 border-l border-[var(--border-light)] cursor-pointer hover:opacity-80 transition-opacity select-none"
               >
                 <div className="hidden lg:block text-right">
                   <div className="text-[0.9rem] font-medium text-[var(--text-primary)]">{currentUser?.firstName} {currentUser?.lastName}</div>
                   <div className="text-[0.75rem] text-[var(--text-muted)] mt-0.5">{currentUser?.position || currentUser?.role || 'User'}</div>
                 </div>
                 <button className="w-9 h-9 rounded-full bg-[var(--primary-color)] flex items-center justify-center border border-[var(--primary-color)]/50 shadow-sm shrink-0 overflow-hidden">
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
                   <div className="absolute right-0 mt-2 w-64 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl shadow-xl z-50 py-2 animate-fade-in">
                     <div className="px-4 py-3 border-b border-[var(--border-lighter)] lg:hidden">
                       <div className="font-medium text-[var(--text-primary)]">{currentUser?.firstName} {currentUser?.lastName}</div>
                       <div className="text-xs text-[var(--text-muted)] mt-0.5">{currentUser?.position || currentUser?.role || 'User'}</div>
                     </div>
                     <button
                       onClick={() => {
                         setIsProfileDropdownOpen(false);
                         setProfileForm({
                           firstName: currentUser?.firstName || '',
                           lastName: currentUser?.lastName || '',
                           position: currentUser?.position || '',
                           department: currentUser?.department || '',
                           password: '',
                           confirmPassword: '',
                           avatar: currentUser?.avatar || ''
                         });
                         setIsProfileModalOpen(true);
                       }}
                       className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--border-lighter)] flex items-center gap-2.5 transition-colors"
                     >
                       <User className="w-4 h-4 text-[var(--primary-color)]" /> จัดการโปรไฟล์ส่วนตัว
                     </button>
                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            setActiveTab('settings');
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--border-lighter)] flex items-center gap-2.5 transition-colors"
                        >
                          <SettingsIcon className="w-4 h-4 text-[var(--primary-color)]" /> ไปยังตั้งค่าระบบ
                        </button>
                      )}
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
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth custom-scrollbar">
           <div className="max-w-7xl mx-auto">
             {renderContent()}
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
          user={currentUser}
          onStatusUpdated={refreshData}
          onEdit={(docToEdit) => {
            setSelectedDoc(null);
            setDocToEdit(docToEdit);
            setIsCreateModalOpen(true);
          }}
          onClose={() => setSelectedDoc(null)} 
        />
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)] bg-[var(--bg-surface)]">
              <h3 className="font-noto-serif-thai font-medium text-lg text-[var(--text-primary)] flex items-center gap-2">
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
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white">
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
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
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
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
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
                    {currentUser?.role === 'admin' ? 'ผู้ดูแลระบบ (Administrator)' : currentUser?.role === 'approver' ? 'ผู้อนุมัติ / ผู้บริหาร' : 'ผู้ใช้งานทั่วไป (User)'}
                  </span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-mono">
                    {currentUser?.role || 'user'}
                  </span>
                </div>
              </div>

              <div className="border-t border-[var(--border-lighter)] pt-4 mt-2">
                <h4 className="text-xs font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[var(--primary-color)]" /> เปลี่ยนรหัสผ่านใหม่ (ไม่บังคับ หากไม่ต้องการเปลี่ยน)
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">รหัสผ่านใหม่</label>
                    <input
                      type="password"
                      value={profileForm.password}
                      onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                      placeholder="ปล่อยว่างหากไม่เปลี่ยนรหัสผ่าน"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">ยืนยันรหัสผ่านใหม่</label>
                    <input
                      type="password"
                      value={profileForm.confirmPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                      placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง"
                    />
                  </div>
                </div>
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
              <h3 className="font-noto-serif-thai font-medium text-lg text-red-400 flex items-center gap-2">
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

      {/* PWA Install Instructions Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-light)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-noto-serif-thai font-semibold text-[var(--text-primary)]">ติดตั้งแอปพลิเคชัน (PWA)</h3>
                  <p className="text-xs text-[var(--text-secondary)]">ใช้งานระบบสารบรรณฯ ได้เสมือนแอปพลิเคชันบนมือถือและคอมพิวเตอร์</p>
                </div>
              </div>
              <button onClick={() => setShowInstallModal(false)} className="p-2 text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-[var(--text-secondary)] leading-relaxed">
              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-light)] space-y-2">
                <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <span>📱 สำหรับ iPhone / iPad (iOS Safari)</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-xs pl-2">
                  <li>เปิดเว็บไซต์นี้ผ่านเบราว์เซอร์ <b>Safari</b> บน iOS</li>
                  <li>แตะปุ่ม <b>แชร์ (Share)</b> 📤 ที่แถบเครื่องมือด้านล่างของจอ</li>
                  <li>เลื่อนหาและเลือกเมนู <b>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</b> ➕</li>
                  <li>แตะ <b>"เพิ่ม" (Add)</b> ที่มุมขวาบน เพื่อติดตั้งแอปพลิเคชันลงบนหน้าจอหลัก</li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-light)] space-y-2">
                <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <span>🤖 สำหรับ Android / PC (Chrome / Edge)</span>
                </h4>
                <p className="text-xs">
                  หากเบราว์เซอร์ไม่แสดงปุ่มติดตั้งอัตโนมัติ ให้คลิกที่ไอคอน <b>เมนู (...)</b> หรือ <b>ไอคอนติดตั้ง (สี่เหลี่ยมมีลูกศรชี้ลง)</b> ที่มุมขวาบนของแถบที่อยู่เว็บเบราว์เซอร์ แล้วเลือก <b>"ติดตั้งแอปพลิเคชัน" (Install App)</b>
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--border-light)]">
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="px-5 py-2.5 rounded-xl text-sm bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white font-medium transition-colors shadow-md"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}

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
