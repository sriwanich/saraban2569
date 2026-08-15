import React, { useState, useEffect } from 'react';
import { X, Trash2, Share2, Globe, Lock, Eye, Download, Code2, Search, Sparkles } from 'lucide-react';
import { InfographicShareSettings } from './InfographicsShareModal';
import { useRealtimeSync } from '../../utils/realtimeSync';

interface Project extends InfographicShareSettings {}

interface GalleryModalProps {
  onClose: () => void;
  onLoad: (id: string) => void;
  onShare?: (project: Project) => void;
}

export const InfographicsGalleryModal: React.FC<GalleryModalProps> = ({ onClose, onLoad, onShare }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredProjects = projects.filter(p => 
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.authorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.authorDepartment || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                เลือกโปรเจกต์เพื่อเปิดแก้ไขต่อ หรือกดแชร์ / ฝังโค้ด Embed ได้ทันที
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตามชื่อผลงาน, ผู้ออกแบบ หรือหน่วยงาน..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              <p className="text-xs text-slate-500">คุณสามารถเริ่มสร้างและบันทึกผลงานใหม่ได้จากหน้าหลัก</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map(p => (
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

                      {/* Status Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        {p.isProtected ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-slate-950 text-[10px] font-bold flex items-center gap-1 shadow-sm backdrop-blur-sm">
                            <Lock className="w-3 h-3" /> ล็อกรหัส
                          </span>
                        ) : p.isPublic !== false ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm backdrop-blur-sm">
                            <Globe className="w-3 h-3" /> สาธารณะ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-700/90 text-slate-200 text-[10px] font-bold flex items-center gap-1 shadow-sm backdrop-blur-sm">
                            🔒 ส่วนตัว
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate group-hover:text-blue-600 transition-colors">
                      {p.name || 'ไม่มีชื่อผลงาน'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {p.authorName || p.authorDepartment || 'หน่วยงานภาครัฐ'}
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
                      <button 
                        type="button"
                        onClick={(e) => handleDelete(e, p.id)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-300 transition-colors"
                        title="ลบโปรเจกต์"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

