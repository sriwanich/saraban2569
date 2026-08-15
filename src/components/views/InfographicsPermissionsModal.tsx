import React, { useState, useEffect } from 'react';
import {
  X, ShieldCheck, Users, UserPlus, UserCheck, Lock, Globe, Building2, Search, Check, Trash2, Info
} from 'lucide-react';

export interface EditorUser {
  id: string | number;
  username: string;
  name: string;
  department?: string;
  position?: string;
}

interface InfographicsPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  scope: 'central' | 'personal';
  onChangeScope: (s: 'central' | 'personal') => void;
  allowedEditors: EditorUser[];
  onChangeAllowedEditors: (editors: EditorUser[]) => void;
  allowDepartmentEdit: boolean;
  onChangeAllowDepartmentEdit: (allow: boolean) => void;
  ownerName?: string;
  ownerDepartment?: string;
  onSave?: () => void;
}

export const InfographicsPermissionsModal: React.FC<InfographicsPermissionsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  scope,
  onChangeScope,
  allowedEditors,
  onChangeAllowedEditors,
  allowDepartmentEdit,
  onChangeAllowDepartmentEdit,
  ownerName,
  ownerDepartment,
  onSave
}) => {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users for permission modal:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  if (!isOpen) return null;

  const currentUserName = ownerName || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || currentUser?.username || 'คุณ';
  const currentUserDept = ownerDepartment || currentUser?.department || 'หน่วยงานภาครัฐ';

  const isEditorSelected = (u: any) => {
    return allowedEditors.some(e => String(e.id) === String(u.id) || e.username === u.username);
  };

  const toggleUserEditor = (u: any) => {
    if (isEditorSelected(u)) {
      onChangeAllowedEditors(allowedEditors.filter(e => String(e.id) !== String(u.id) && e.username !== u.username));
    } else {
      const newUser: EditorUser = {
        id: u.id,
        username: u.username,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
        department: u.department,
        position: u.position
      };
      onChangeAllowedEditors([...allowedEditors, newUser]);
    }
  };

  const removeEditor = (idOrUsername: string | number) => {
    onChangeAllowedEditors(allowedEditors.filter(e => String(e.id) !== String(idOrUsername) && e.username !== idOrUsername));
  };

  const filteredUsers = allUsers.filter(u => {
    // Exclude owner
    if (String(u.id) === String(currentUser?.id) || u.username === currentUser?.username) return false;
    const fullName = `${u.firstName || ''} ${u.lastName || ''} ${u.username} ${u.department || ''} ${u.position || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] text-left">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-slate-900 dark:to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 font-noto-serif-thai">
                กำหนดขอบเขต & มอบสิทธิ์แก้ไขเพิ่มเติม
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                สิทธิ์ความเป็นเจ้าของผลงาน Infographics และการมอบสิทธิ์ให้ผู้ใช้งานอื่น
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Owner Info Box */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-bold text-sm flex items-center justify-center">
                {currentUserName.charAt(0)}
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">เจ้าของผลงาน (Owner)</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{currentUserName}</div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[11px] font-bold">
              {currentUserDept}
            </span>
          </div>

          {/* 1. Storage Scope Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span>1. ขอบเขตการจัดเก็บผลงาน (Infographic Scope)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Central Scope */}
              <button
                type="button"
                onClick={() => onChangeScope('central')}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                  scope === 'central'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
                    <Globe className="w-5 h-5" />
                  </div>
                  {scope === 'central' && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">ส่วนกลางองค์กร (Central)</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    แสดงในคลังส่วนกลาง บุคลากรในองค์กรสามารถดูเทมเพลต และนำไปต่อยอดได้
                  </p>
                </div>
              </button>

              {/* Personal Scope */}
              <button
                type="button"
                onClick={() => onChangeScope('personal')}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                  scope === 'personal'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
                    <Lock className="w-5 h-5" />
                  </div>
                  {scope === 'personal' && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">ส่วนบุคคล (Personal / Private)</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    สงวนสิทธิ์เฉพาะส่วนตัว สงวนการแก้ไขเฉพาะเจ้าของและผู้ที่ได้รับสิทธิ์
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Department Editing Option */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowDepartmentEdit}
                onChange={(e) => onChangeAllowDepartmentEdit(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>อนุญาตให้สมาชิกในฝ่าย/แผนก ({currentUserDept}) แก้ไขผลงานนี้ได้</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  เพื่อนร่วมงานที่สังกัดฝ่ายเดียวกันจะได้รับสิทธิ์แก้ไขและอัปเดตผลงานนี้ทันที
                </p>
              </div>
            </label>
          </div>

          {/* 3. Granted Individual Editors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>2. มอบสิทธิ์แก้ไขเพิ่มเติมให้ Users รายบุคคล (Co-Editors)</span>
              </label>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                มอบสิทธิ์แล้ว {allowedEditors.length} ท่าน
              </span>
            </div>

            {/* List of current editors */}
            {allowedEditors.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                {allowedEditors.map(ed => (
                  <div
                    key={ed.id}
                    className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{ed.name || ed.username}</span>
                    {ed.department && (
                      <span className="text-[10px] text-slate-400">({ed.department})</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeEditor(ed.id)}
                      className="p-1 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 rounded-md text-slate-400 transition-colors ml-1"
                      title="ถอดสิทธิ์"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* User Search & Selection */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อผู้ใช้งาน, ฝ่าย/แผนก หรือตำแหน่ง..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* User Selection List */}
              <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                {loadingUsers ? (
                  <div className="p-6 text-center text-slate-400 text-xs">กำลังโหลดผู้ใช้งาน...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    {searchQuery ? 'ไม่พบผู้ใช้งานตามเงื่อนไขค้นหา' : 'ไม่มีผู้ใช้งานอื่นในระบบ'}
                  </div>
                ) : (
                  filteredUsers.map(u => {
                    const selected = isEditorSelected(u);
                    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username;
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleUserEditor(u)}
                        className={`p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                          selected ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            selected ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}>
                            {name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <span>{name}</span>
                              <span className="text-[10px] text-slate-400 font-normal">(@{u.username})</span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              {u.position && <span>{u.position}</span>}
                              {u.department && <span className="text-blue-500 font-semibold">• {u.department}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`px-3 py-1.2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                            selected
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white'
                          }`}
                        >
                          {selected ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>ได้รับสิทธิ์แล้ว</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>มอบสิทธิ์</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>สิทธิ์การแก้ไขจะถูกอัปเดตและบันทึกรวมกับโปรเจกต์</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onSave) onSave();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>เสร็จสิ้นการตั้งค่า</span>
          </button>
        </div>
      </div>
    </div>
  );
};
