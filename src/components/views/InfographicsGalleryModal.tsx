import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  updated_at: string;
  thumbnail?: string;
}

interface GalleryModalProps {
  onClose: () => void;
  onLoad: (id: string) => void;
}

export const InfographicsGalleryModal: React.FC<GalleryModalProps> = ({ onClose, onLoad }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('ยืนยันการลบโปรเจกต์นี้?')) {
      try {
        await fetch(`/api/infographics/${id}`, { method: 'DELETE' });
        fetchProjects();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl flex flex-col h-[80vh]">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 font-noto-serif-thai">โปรเจกต์ทั้งหมดของคุณ</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">กำลังโหลด...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-gray-500">ยังไม่มีโปรเจกต์ที่บันทึกไว้</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {projects.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => onLoad(p.id)}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group relative bg-gray-50 dark:bg-gray-900"
                >
                  <div className="aspect-[4/3] bg-white dark:bg-gray-800 mb-3 rounded border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden">
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt={p.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-gray-400">ภาพจำลอง</span>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-800 dark:text-gray-200 truncate">{p.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{new Date(p.updated_at).toLocaleString('th-TH')}</p>
                  
                  <button 
                    onClick={(e) => handleDelete(e, p.id)}
                    className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
