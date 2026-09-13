import React, { useState, useEffect } from 'react';
import { DocumentItem, Folder, formatThaiDateShort } from '../../types';
import { FolderIcon, FolderPlus, Trash2, Calendar, FileText, ChevronRight, Eye, ChevronLeft, Info, HelpCircle, Pencil, X, AlertTriangle, FileCode } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { DEFAULT_FILE_CODES, parseFileCodeFromDoc } from '../../lib/fileCodeUtils';
import { useRealtimeSync } from '../../utils/realtimeSync';

interface Props {
  documents: DocumentItem[];
  onViewDoc: (doc: DocumentItem) => void;
  onRefreshDocs: () => void;
  user: any;
  hasPermission?: (key: string) => boolean;
}

export default function FoldersView({ documents, onViewDoc, onRefreshDocs, user, hasPermission }: Props) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);
  
  // Folder Creation Form State
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [folderType, setFolderType] = useState<'central' | 'private'>('private');
  const [selectedDept, setSelectedDept] = useState(user?.department || '');
  const [departments, setDepartments] = useState<any[]>([]);

  // Folder Edit Modal State
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // Folder Delete Modal State
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

  const fetchFolders = async () => {
    try {
      const res = await fetch(`/api/folders?department=${encodeURIComponent(user?.department || '')}&role=${user?.role || ''}`);
      if (res.ok) {
        const data = await res.json();
        setFolders(data);
      }
    } catch (err) {
      console.error('Error fetching folders:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  useEffect(() => {
    fetchFolders();
    fetchDepartments();
  }, [user]);

  useRealtimeSync(['FOLDERS_UPDATED', 'DOCUMENTS_UPDATED', 'SETTINGS_UPDATED', 'TAB_FOCUSED', 'DATA_UPDATED'], () => {
    fetchFolders();
    fetchDepartments();
  }, [user]);

  useEffect(() => {
    if (user?.department) {
      setSelectedDept(user.department);
    }
  }, [user]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      setErrorMsg('กรุณากรอกชื่อแฟ้มเอกสาร');
      return;
    }
    setErrorMsg('');
    setIsCreating(true);

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          description: newFolderDesc,
          isPrivate: (hasPermission ? hasPermission('system_settings') : user?.role === 'admin') ? (folderType === 'private') : true,
          departmentName: (hasPermission ? hasPermission('system_settings') : user?.role === 'admin') ? (folderType === 'private' ? selectedDept : '') : user?.department,
          username: `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
        })
      });

      if (res.ok) {
        setNewFolderName('');
        setNewFolderDesc('');
        await fetchFolders();
        if (onRefreshDocs) onRefreshDocs();
      } else {
        setErrorMsg('ไม่สามารถบันทึกแฟ้มเอกสารได้');
      }
    } catch (err) {
      console.error('Error creating folder:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEdit = (folder: Folder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingFolder(folder);
    setEditName(folder.name);
    setEditDesc(folder.description || '');
    setEditErrorMsg('');
  };

  const handleUpdateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder) return;
    if (!editName.trim()) {
      setEditErrorMsg('กรุณากรอกชื่อแฟ้มเอกสาร');
      return;
    }
    setEditErrorMsg('');
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/folders/${editingFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          role: user?.role,
          username: `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
        })
      });

      if (res.ok) {
        setEditingFolder(null);
        await fetchFolders();
        if (onRefreshDocs) onRefreshDocs();
      } else {
        const errData = await res.json();
        setEditErrorMsg(errData.error || 'ไม่สามารถแก้ไขแฟ้มเอกสารได้');
      }
    } catch (err) {
      console.error('Error updating folder:', err);
      setEditErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenDelete = (folder: Folder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingFolder(folder);
    setDeleteErrorMsg('');
  };

  const handleConfirmDeleteFolder = async () => {
    if (!deletingFolder) return;
    setIsDeletingFolder(true);
    setDeleteErrorMsg('');

    try {
      const res = await fetch(`/api/folders/${deletingFolder.id}?role=${user?.role || ''}&username=${encodeURIComponent(`${user?.firstName || ''} ${user?.lastName || ''}`.trim())}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (activeFolder && Number(activeFolder.id) === Number(deletingFolder.id)) {
          setActiveFolder(null);
        }
        setDeletingFolder(null);
        await fetchFolders();
        if (onRefreshDocs) onRefreshDocs();
      } else {
        const data = await res.json();
        setDeleteErrorMsg(data.error || 'ไม่สามารถลบแฟ้มเอกสารได้');
      }
    } catch (err) {
      console.error('Error deleting folder:', err);
      setDeleteErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsDeletingFolder(false);
    }
  };

  // Get documents associated with a specific folder
  const getFolderDocs = (folderId: number) => {
    return documents.filter(d => d.folderId && Number(d.folderId) === Number(folderId));
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'inbox': return 'หนังสือรับ';
      case 'outbox': return 'หนังสือส่ง';
      case 'admin': return 'ธุรการ';
      default: return 'ทั่วไป';
    }
  };

  const getDocTypeColor = (type: string) => {
    switch (type) {
      case 'inbox': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'outbox': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'admin': return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 pb-10 animate-fade-in">
      {/* Header */}
      <div className="bg-[var(--bg-overlay)] backdrop-blur-3xl border border-[var(--border-light)] rounded-3xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[var(--primary-color)]/10 to-transparent rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20 transition-all duration-700 group-hover:from-[var(--primary-color)]/20" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-sans font-extrabold text-[var(--text-primary)] tracking-tight">
                จัดการแฟ้มเอกสารดิจิทัล
              </h2>
            </div>
            <p className="text-[var(--text-secondary)] text-sm font-medium">
              จัดการระบบสารบบแฟ้มดิจิทัลเพื่อคัดแยก จัดเก็บ บันทึกประกาศ หรือติดตามหนังสือรับรองแยกเป็นรายแฟ้มแผนก
            </p>
          </div>
          {activeFolder && (
            <button
              onClick={() => setActiveFolder(null)}
              className="flex items-center justify-center gap-2 bg-[var(--bg-overlay)] hover:bg-[var(--bg-surface)] border border-[var(--border-light)] hover:border-[var(--primary-color)]/40 text-[var(--text-primary)] px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-[0.98] shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" /> ย้อนกลับไปยังรายการแฟ้ม
            </button>
          )}
        </div>
      </div>

      {activeFolder ? (
        /* Folder Details View (List of docs inside folder) */
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] bg-[var(--bg-surface)] rounded-xl p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                  <FolderIcon className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)]">
                      แฟ้ม: {activeFolder.name}
                    </h3>
                    {activeFolder.departmentName ? (
                      <span className="text-[10px] bg-purple-500/15 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-medium">
                        {activeFolder.departmentName}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                        ส่วนกลาง
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {activeFolder.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                  </p>
                  <div className="text-xs text-[var(--text-muted)] pt-1 flex items-center gap-2">
                    <span>มีจำนวนเอกสารจัดเก็บ: <strong className="text-amber-500 font-mono text-sm">{getFolderDocs(activeFolder.id).length}</strong> ฉบับ</span>
                  </div>
                </div>
              </div>

              {(hasPermission ? (hasPermission('manage_users') || hasPermission('system_settings')) : (user?.role === 'admin' || user?.role === 'moderator')) && (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={(e) => handleOpenEdit(activeFolder, e)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-amber-500 bg-[var(--bg-overlay)] hover:bg-amber-500/10 border border-[var(--border-light)] rounded-lg transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" /> แก้ไขแฟ้ม
                  </button>
                  <button
                    onClick={(e) => handleOpenDelete(activeFolder, e)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> ลบแฟ้มนี้
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-[var(--bg-elevated)] border-b border-[var(--border-lighter)] flex justify-between items-center">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">รายการหนังสือภายในแฟ้มดิจิทัล</h4>
              <span className="text-xs text-[var(--text-secondary)] font-mono">EDMS SYSTEM</span>
            </div>

            <div className="divide-y divide-[var(--border-lighter)]">
              {getFolderDocs(activeFolder.id).length > 0 ? (
                getFolderDocs(activeFolder.id).map(doc => (
                  <div 
                    key={doc.id} 
                    onClick={() => onViewDoc(doc)}
                    className="p-4 hover:bg-[var(--border-lighter)]/30 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer group"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs font-mono font-semibold rounded border ${getDocTypeColor(doc.type)}`}>
                          {getDocTypeLabel(doc.type)}
                        </span>
                        <span className="text-xs font-mono text-[var(--text-muted)]">
                          เลขที่: {doc.docNumber}
                        </span>
                        {doc.priority !== 'ปกติ' && (
                          <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 rounded">
                            {doc.priority}
                          </span>
                        )}
                      </div>
                      <h5 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary-color)] transition-colors leading-relaxed">
                        {doc.title}
                      </h5>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                        {doc.from ? `จาก: ${doc.from} ถึง: ${doc.to}` : `ประเภทธุรการ: ${doc.category === 'order' ? 'คำสั่ง' : doc.category === 'announcement' ? 'ประกาศ' : 'หนังสือรับรอง'}`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-[var(--text-primary)] font-mono">ลงวันที่ {formatThaiDateShort(doc.date)}</div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">สถานะ: {doc.status || 'ลงทะเบียน'}</div>
                      </div>
                      <div className="p-2 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-all">
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-[var(--text-muted)]">
                  <FileText className="w-12 h-12 text-[var(--text-muted)]/40 mx-auto mb-3" />
                  <p className="text-sm font-medium">ยังไม่มีการนำเข้าและจัดเก็บหนังสือลงในแฟ้มนี้</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">คุณสามารถเลือกแฟ้มเอกสารนี้ได้ในขั้นตอนลงทะเบียนเอกสารใหม่ หรือคลิกแก้ไขหนังสือทั่วไป</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Folder Grid View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Create Folder Form Card */}
          <div className="lg:col-span-1 bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-5 sm:p-6 shadow-sm h-fit space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-light)] pb-2">
              <FolderPlus className="w-5 h-5 text-[var(--primary-color)]" /> เพิ่มแฟ้มเอกสารใหม่
            </h3>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">ชื่อแฟ้มเอกสารราชการ <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder="เช่น แฟ้มคำสั่งแต่งตั้งปีงบประมาณ 2569"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors placeholder-[var(--text-muted)]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">คำอธิบายเพิ่มเติม / หมายเหตุจัดเก็บ</label>
                <textarea
                  rows={3}
                  placeholder="เช่น แฟ้มสำหรับคัดแยกเฉพาะคำสั่งของจังหวัดระยอง เพื่อเสนอต่อหัวหน้ากลุ่มงาน..."
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors placeholder-[var(--text-muted)] resize-none"
                />
              </div>

              {(hasPermission ? (hasPermission('manage_users') || hasPermission('system_settings')) : (user?.role === 'admin' || user?.role === 'moderator')) ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">ประเภทแฟ้มเอกสาร</label>
                    <select
                      value={folderType}
                      onChange={(e: any) => setFolderType(e.target.value)}
                      className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors"
                    >
                      <option value="central">แฟ้มส่วนกลาง (เข้าถึงได้ทุกฝ่าย)</option>
                      <option value="private">แฟ้มส่วนตัวเฉพาะฝ่าย</option>
                    </select>
                  </div>

                  {folderType === 'private' && (
                    <div className="space-y-1.5 animate-[fadeIn_0.15s_ease-out]">
                      <label className="text-xs font-medium text-[var(--text-secondary)]">เลือกฝ่าย / กลุ่มงาน</label>
                      <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors"
                        required
                      >
                        <option value="">-- เลือกฝ่าย --</option>
                        {departments.map((d: any) => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : null}

              {errorMsg && (
                <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium">
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isCreating}
                className="w-full bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white py-2.5 rounded-lg text-sm font-medium transition-all shadow-md cursor-pointer"
              >
                {isCreating ? 'กำลังบันทึก...' : 'สร้างแฟ้มดิจิทัล'}
              </button>
            </form>

            <div className="bg-[var(--primary-color)]/5 border border-[var(--primary-color)]/15 p-3.5 rounded-lg flex gap-2 text-[var(--text-secondary)] text-xs leading-relaxed">
              <Info className="w-4 h-4 text-[var(--primary-color)] shrink-0 mt-0.5" />
              <span>
                แฟ้มเอกสารดิจิทัลช่วยให้จัดระเบียบเอกสารจำนวนมากของสำนักงาน สามารถคัดกรอง หรือแยกแยะหมวดหมู่ได้ชัดเจน รวดเร็วยิ่งขึ้น
              </span>
            </div>
          </div>

          {/* Folder Grid Cards */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] font-sans">
                รายการแฟ้มเอกสารทั้งหมด ({folders.length})
              </h3>
              <span className="text-xs text-[var(--text-muted)] font-mono">EDMS DIRECTORY</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {folders.map(folder => {
                const docCount = getFolderDocs(folder.id).length;
                return (
                  <div
                    key={folder.id}
                    onClick={() => setActiveFolder(folder)}
                    className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] hover:border-amber-500/40 p-5 rounded-xl flex flex-col justify-between hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-0.5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl group-hover:scale-110 transition-transform">
                          <FolderIcon className="w-5 h-5 fill-amber-500/20" />
                        </div>
                        {(hasPermission ? (hasPermission('manage_users') || hasPermission('system_settings')) : (user?.role === 'admin' || user?.role === 'moderator')) && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleOpenEdit(folder, e)}
                              className="p-1.5 text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/10 rounded transition-colors"
                              title="แก้ไขแฟ้ม"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleOpenDelete(folder, e)}
                              className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              title="ลบแฟ้ม"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          {folder.departmentName ? (
                            <span className="text-[10px] bg-purple-500/15 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-medium">
                              {folder.departmentName}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                              ส่วนกลาง
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] group-hover:text-amber-500 transition-colors line-clamp-1 leading-snug">
                          {folder.name}
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 h-8 leading-relaxed">
                          {folder.description || 'ไม่มีคำอธิบายเพิ่มเติมเกี่ยวกับแฟ้มเก็บเรื่องนี้'}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-[var(--border-lighter)]/60 pt-3 mt-4 flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">
                        เอกสารภายใน: <strong className="text-amber-500 font-mono text-sm">{docCount}</strong> ฉบับ
                      </span>
                      <span className="text-[var(--primary-color)] group-hover:translate-x-1 transition-transform flex items-center gap-0.5 font-medium">
                        เปิดแฟ้ม <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {folders.length === 0 && (
                <div className="col-span-full bg-[var(--bg-surface)] border border-dashed border-[var(--border-medium)] rounded-xl p-12 text-center text-[var(--text-muted)]">
                  <FolderIcon className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)]/55" />
                  <p className="text-sm font-medium">ยังไม่มีแฟ้มเอกสารราชการดิจิทัล</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">เริ่มต้นได้โดยการป้อนชื่อและข้อมูลด้านซ้ายมือเพื่อทำการเพิ่มระบบจัดการแฟ้มใหม่</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Edit Folder Modal */}
      {editingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)] bg-[var(--bg-surface)]">
              <h3 className="font-sans font-medium text-lg text-[var(--text-primary)] flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-500" /> แก้ไขแฟ้มเอกสารดิจิทัล
              </h3>
              <button 
                onClick={() => setEditingFolder(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateFolder} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">ชื่อแฟ้มเอกสาร</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">คำอธิบายเพิ่มเติม / หมายเหตุ</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary-color)] transition-colors resize-none"
                />
              </div>

              {editErrorMsg && (
                <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium">
                  ⚠️ {editErrorMsg}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-light)]">
                <button
                  type="button"
                  onClick={() => setEditingFolder(null)}
                  className="px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-lg text-sm bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white font-medium transition-colors shadow-md disabled:opacity-50"
                >
                  {isUpdating ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Modal */}
      {deletingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)] bg-red-500/5">
              <h3 className="font-sans font-medium text-lg text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> ยืนยันการลบแฟ้มเอกสาร
              </h3>
              <button 
                onClick={() => setDeletingFolder(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                คุณต้องการลบแฟ้มเอกสารดิจิทัล <strong className="text-amber-500 font-semibold">"{deletingFolder.name}"</strong> ใช่หรือไม่?
              </p>

              {getFolderDocs(deletingFolder.id).length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs leading-relaxed space-y-1">
                  <div className="font-medium text-amber-400 flex items-center gap-1.5">
                    <Info className="w-4 h-4 shrink-0" /> มีเอกสารจัดเก็บอยู่จำนวน {getFolderDocs(deletingFolder.id).length} ฉบับ
                  </div>
                  <p className="text-amber-200/80">
                    การลบแฟ้มนี้ จะปลดเอกสารทั้งหมดออกจากแฟ้ม โดยเอกสารจะยังคงอยู่ในระบบราชการดิจิทัล (ย้ายเข้าสู่สารบรรณทั่วไป)
                  </p>
                </div>
              )}

              {deleteErrorMsg && (
                <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium">
                  ⚠️ {deleteErrorMsg}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-light)]">
                <button
                  type="button"
                  onClick={() => setDeletingFolder(null)}
                  className="px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteFolder}
                  disabled={isDeletingFolder}
                  className="px-5 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white font-medium transition-colors shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeletingFolder ? 'กำลังลบ...' : 'ยืนยันการลบแฟ้ม'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
