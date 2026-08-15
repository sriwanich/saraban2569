import React, { useState, useEffect } from 'react';
import {
  X, Trash2, Share2, Globe, Lock, Eye, Download, Code2, Search, Sparkles, Building2, UserCheck, ShieldCheck, Copy
} from 'lucide-react';
import { InfographicShareSettings } from './InfographicsShareModal';
import { useRealtimeSync } from '../../utils/realtimeSync';

interface Project extends InfographicShareSettings {}

interface GalleryModalProps {
  onClose: () => void;
  onLoad: (id: string) => void;
  onShare?: (project: Project) => void;
  currentUser?: any;
}

export const InfographicsGalleryModal: React.FC<GalleryModalProps> = ({ onClose, onLoad, onShare, currentUser }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'central' | 'mine' | 'shared'>('all');

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/infographics');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useRealtimeSync(['INFOGRAPHICS_UPDATED', 'TAB_FOCUSED', 'DATA_UPDATED'], () => {
    fetchProjects();
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('ยืนยันการลบโปรเจกต์นี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      try {
        await fetch(`/api/infographics/${id}`, { method: 'DELETE' });
        fetchProjects();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleShareClick = (e: React.MouseEvent, p: Project) => {
    e.stopPropagation();
    if (onShare) {
      onShare(p);
    }
  };

  // Helper permission check
  const isOwner = (p: Project) => {
    if (!currentUser) return true;
    if (p.ownerId && String(p.ownerId) === String(currentUser.id)) return true;
    const myName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username;
    if (p.ownerName && p.ownerName === myName) return true;
    if (p.authorName && p.authorName === myName) return true;
    return false;
  };

  const isGrantedEditor = (p: Project) => {
    if (!currentUser) return false;
    // Check department edit permission
    if (p.allowDepartmentEdit && p.ownerDepartment && currentUser.department && p.ownerDepartment === currentUser.department) {
      return true;
    }
    // Check allowedEditors
    if (p.allowedEditors) {
      let list: any[] = [];
      try {
        list = typeof p.allowedEditors === 'string' ? JSON.parse(p.allowedEditors) : p.allowedEditors;
      } catch (e) {}
      if (Array.isArray(list)) {
        return list.some(e => String(e.id) === String(currentUser.id) || e.username === currentUser.username);
      }
    }
    return false;
  };

  const canEdit = (p: Project) => {
    if (!currentUser) return true;
    if (currentUser.role === 'admin' || currentUser.role === 'moderator') return true;
    if (isOwner(p)) return true;
    if (p.scope === 'central') return true;
    return isGrantedEditor(p);
  };

  const filteredProjects = projects.filter(p => {
    // Tab filtering
    if (filterTab === 'central' && p.scope === 'personal') return false;
    if (filterTab === 'mine' && !isOwner(p)) return false;
    if (filterTab === 'shared' && (!isGrantedEditor(p) || isOwner(p))) return false;

    // Search filtering
    const q = searchQuery.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.authorName || '').toLowerCase().includes(q) ||
      (p.authorDepartment || '').toLowerCase().includes(q) ||
      (p.ownerName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col h-[85vh] border border-slate-200 dark:border-slate-800 overflow-hidden text-left">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 font-noto-serif-thai">
                คลังผลงาน Infographics ทั้งหมด
              </h2>
              <p className="text-xs text-slate-500">
                สิทธิ์ส่วนกลาง สิทธิ์ส่วนบุคคล และผลงานที่คุณได้รับสิทธิ์แก้ไขเพิ่มเติม
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

        {/* Filter Tabs & Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>ทั้งหมด ({projects.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('central')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterTab === 'central'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>ส่วนกลางองค์กร</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('mine')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterTab === 'mine'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>ส่วนตัวของฉัน</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('shared')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterTab === 'shared'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>ได้รับสิทธิ์แก้ไข</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อผลงาน, ผู้ออกแบบ หรือหน่วยงาน..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        
        {/* Project Grid */}
        <div className="p-5 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold">กำลังโหลดผลงาน...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <p className="text-sm font-semibold">ยังไม่พบผลงาน Infographics ที่ตรงกับเงื่อนไข</p>
              <p className="text-xs text-slate-500">คุณสามารถเริ่มสร้างและเลือกขอบเขตส่วนบุคคล/ส่วนกลางได้จากหน้าหลัก</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map(p => {
                const owner = isOwner(p);
                const granted = isGrantedEditor(p);
                const editable = canEdit(p);

                return (
                  <div 
                    key={p.id} 
                    onClick={() => onLoad(p.id)}
                    className="group relative bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 cursor-pointer hover:border-blue-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Thumbnail */}
                      <div className="aspect-[4/3] bg-white dark:bg-slate-900 mb-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden relative shadow-inner">
                        {p.thumbnail ? (
                          <img src={p.thumbnail} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <span className="text-slate-400 text-xs">ไม่มีภาพจำลอง</span>
                        )}

                        {/* Badges Overlay */}
                        <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5 max-w-[90%]">
                          {/* Scope badge */}
                          {p.scope === 'personal' ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-extrabold flex items-center gap-1 shadow-sm backdrop-blur-sm">
                              <Lock className="w-3 h-3" /> ส่วนตัว
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-sm backdrop-blur-sm">
                              <Building2 className="w-3 h-3" /> ส่วนกลาง
                            </span>
                          )}

                          {/* Ownership / Editor Badge */}
                          {owner ? (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-sm backdrop-blur-sm">
                              👑 เจ้าของ
                            </span>
                          ) : granted ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-sm backdrop-blur-sm">
                              <UserCheck className="w-3 h-3" /> ได้รับสิทธิ์แก้ไข
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Metadata */}
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate group-hover:text-blue-600 transition-colors flex items-center justify-between gap-1">
                        <span className="truncate">{p.name || 'ไม่มีชื่อผลงาน'}</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                        <span>โดย: {p.ownerName || p.authorName || 'หน่วยงานภาครัฐ'}</span>
                        {(p.ownerDepartment || p.authorDepartment) && (
                          <span className="text-slate-400">({p.ownerDepartment || p.authorDepartment})</span>
                        )}
                      </p>
                    </div>

                    {/* Footer Metrics & Actions */}
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        <span className="flex items-center gap-1" title="ยอดเข้าชม">
                          <Eye className="w-3 h-3 text-blue-500" /> {p.viewCount || 0}
                        </span>
                        <span className="flex items-center gap-1" title="ยอดฝัง Embed">
                          <Code2 className="w-3 h-3 text-indigo-500" /> {p.embedCount || 0}
                        </span>
                        <span className="flex items-center gap-1" title="ยอดดาวน์โหลด">
                          <Download className="w-3 h-3 text-emerald-500" /> {p.downloadCount || 0}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {onShare && (
                          <button
                            type="button"
                            onClick={(e) => handleShareClick(e, p)}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 dark:text-blue-300 transition-colors"
                            title="แชร์ & ฝังโค้ด Embed"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        
                        {(owner || currentUser?.role === 'admin') && (
                          <button 
                            type="button"
                            onClick={(e) => handleDelete(e, p.id)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-300 transition-colors"
                            title="ลบโปรเจกต์"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
