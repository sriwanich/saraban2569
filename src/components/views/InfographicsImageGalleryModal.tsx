import React, { useState, useEffect } from 'react';
import { 
  X, Image as ImageIcon, UploadCloud, Search, RefreshCw, 
  Check, Folder, HardDrive, Calendar, ArrowDownToLine, Sparkles, Filter, Trash2
} from 'lucide-react';

export interface UploadedImageItem {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  folder: string;
  size: number;
  createdAt: string;
}

interface InfographicsImageGalleryModalProps {
  onClose: () => void;
  onSelectImage: (imageUrl: string, imageName?: string) => void;
  onUploadNew?: (file: File) => void;
  currentUser?: any;
}

export const InfographicsImageGalleryModal: React.FC<InfographicsImageGalleryModalProps> = ({
  onClose,
  onSelectImage,
  onUploadNew,
  currentUser
}) => {
  const [images, setImages] = useState<UploadedImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedImage, setSelectedImage] = useState<UploadedImageItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const userId = currentUser?.id || currentUser?.username || 'guest';
  const userName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || currentUser?.username || 'ผู้ใช้งาน';

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/infographics-assets/images?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.images)) {
          setImages(data.images);
        }
      }
    } catch (err) {
      console.error('Error fetching uploaded images:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (img: UploadedImageItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`ยืนยันการลบรูปภาพ "${img.originalName}" หรือไม่?\n(ลบแล้วไม่สามารถกู้คืนได้)`)) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/infographics-assets/images?url=${encodeURIComponent(img.url)}&userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (selectedImage?.id === img.id) {
            setSelectedImage(null);
          }
          await fetchImages();
        } else {
          alert(data.error || 'ไม่สามารถลบรูปภาพได้');
        }
      } else {
        alert('เกิดข้อผิดพลาดในการลบรูปภาพ');
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      alert('เกิดข้อผิดพลาดในการลบรูปภาพ');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [userId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    if (onUploadNew) {
      onUploadNew(file);
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('files', file);
    formData.append('userId', userId);
    formData.append('uploadedBy', userName);

    try {
      const res = await fetch('/api/infographics/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.files && data.files.length > 0) {
          await fetchImages();
          // Auto select newly uploaded file
          const newFile = data.files[0];
          onSelectImage(newFile.url, newFile.originalName);
          onClose();
        }
      }
    } catch (err) {
      console.error('Error uploading image:', err);
    } finally {
      setUploading(false);
    }
  };

  // Compute available folders
  const folders = Array.from(new Set(images.map(img => img.folder))).filter(Boolean);

  // Filtered images
  const filteredImages = images.filter(img => {
    const matchesSearch = !searchQuery.trim() || 
      img.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.folder.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFolder = selectedFolder === 'all' || img.folder === selectedFolder;

    return matchesSearch && matchesFolder;
  });

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFolderBadgeLabel = (folderName: string) => {
    if (!folderName || folderName === 'root') return 'ทั่วไป';
    if (folderName.includes('inbox')) return 'หนังสือรับ';
    if (folderName.includes('outbox')) return 'หนังสือส่ง';
    if (folderName.includes('internal')) return 'หนังสือภายใน';
    if (folderName.includes('admin')) return 'งานบริหาร';
    if (folderName.includes('avatars')) return 'โปรไฟล์';
    if (folderName.includes('system')) return 'ระบบ/สตูดิโอ';
    return folderName;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col h-[85vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-light)] bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30">
              <ImageIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-noto-serif-thai text-white flex items-center gap-2">
                คลังรูปภาพที่เคยอัปโหลด (Uploaded Images Library)
                <span className="text-xs font-mono font-normal bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                  {images.length} รูป
                </span>
              </h2>
              <p className="text-xs text-blue-200/80">
                เลือกรูปภาพที่เคยอัปโหลดในระบบสารบรรณ หรืออัปโหลดรูปใหม่เพื่อนำมาใส่ใน Infographics ได้ทันที
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Search Bar */}
        <div className="p-3 sm:p-4 border-b border-[var(--border-light)] bg-[var(--bg-canvas)] flex flex-wrap gap-2.5 items-center justify-between shrink-0">
          <div className="flex flex-1 items-center gap-2 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อรูปภาพ, หมวดหมู่..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button 
              onClick={fetchImages} 
              className="p-2 border border-[var(--border-medium)] rounded-xl hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-semibold flex items-center gap-1"
              title="รีเฟรชรายการรูปภาพ"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-500' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Upload New Button */}
            <label className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:shadow-md active:scale-98">
              <UploadCloud className="w-4 h-4" />
              <span>{uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปภาพใหม่'}</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                disabled={uploading} 
                className="hidden" 
              />
            </label>
          </div>
        </div>

        {/* Folder Filter Bar */}
        {folders.length > 0 && (
          <div className="px-4 py-2 border-b border-[var(--border-light)] bg-[var(--bg-surface)] flex items-center gap-1.5 overflow-x-auto shrink-0 [&::-webkit-scrollbar]:hidden">
            <span className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3 h-3" /> หมวดโฟลเดอร์:
            </span>
            <button
              onClick={() => setSelectedFolder('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedFolder === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-[var(--bg-canvas)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:border-blue-400'
              }`}
            >
              ทั้งหมด ({images.length})
            </button>
            {folders.map(f => {
              const count = images.filter(i => i.folder === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setSelectedFolder(f)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    selectedFolder === f
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-[var(--bg-canvas)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:border-blue-400'
                  }`}
                >
                  <Folder className="w-3 h-3" />
                  <span>{getFolderBadgeLabel(f)}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Image Grid Content Area */}
        <div className="p-4 flex-1 overflow-y-auto bg-[var(--bg-canvas)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm font-medium">กำลังโหลดคลังรูปภาพ...</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                <ImageIcon className="w-10 h-10" />
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">ไม่พบรูปภาพในระบบ</h4>
              <p className="text-xs text-[var(--text-muted)] max-w-sm">
                {searchQuery ? 'ไม่พบรูปภาพที่ตรงกับคำค้นหา ลองเปลี่ยนคำค้นหรือเลือกหมวดอื่น' : 'ยังไม่มีรูปภาพที่เคยอัปโหลด คุณสามารถอัปโหลดรูปภาพใหม่จากเครื่องเพื่อนำมาใช้ได้ทันที'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredImages.map(img => {
                const isSelected = selectedImage?.id === img.id;
                return (
                  <div
                    key={img.id}
                    onClick={() => setSelectedImage(img)}
                    onDoubleClick={() => {
                      onSelectImage(img.url, img.originalName);
                      onClose();
                    }}
                    className={`group relative rounded-xl border p-2 bg-[var(--bg-surface)] cursor-pointer transition-all flex flex-col justify-between hover:shadow-md ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-md bg-blue-500/5'
                        : 'border-[var(--border-light)] hover:border-blue-400'
                    }`}
                  >
                    {/* Image Preview Box */}
                    <div className="aspect-square bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-[var(--border-lighter)] relative">
                      <img
                        src={img.url}
                        alt={img.originalName}
                        loading="lazy"
                        className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      
                      {/* Selection Checkmark */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}

                      {/* Folder Badge */}
                      <span className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-xs font-medium">
                        {getFolderBadgeLabel(img.folder)}
                      </span>
                      
                      {/* Delete Button (visible on hover) */}
                      <button
                        onClick={(e) => handleDeleteImage(img, e)}
                        disabled={isDeleting}
                        className="absolute top-1.5 left-1.5 p-1.5 rounded-md bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                        title="ลบรูปภาพ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Meta info */}
                    <div className="mt-2 space-y-0.5">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate" title={img.originalName}>
                        {img.originalName}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                        <span>{formatFileSize(img.size)}</span>
                        <span>{new Date(img.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer with Action Buttons */}
        <div className="p-3 sm:p-4 border-t border-[var(--border-light)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[var(--text-secondary)]">
            {selectedImage ? (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-600 dark:text-blue-400">เลือก:</span>
                <span className="truncate max-w-[200px] sm:max-w-[300px] font-medium text-[var(--text-primary)]">{selectedImage.originalName}</span>
                <span className="text-[10px] text-[var(--text-muted)]">({formatFileSize(selectedImage.size)})</span>
              </div>
            ) : (
              <span className="text-[var(--text-muted)]">คลิกเลือกรูปภาพ หรือดับเบิ้ลคลิกเพื่อนำไปใส่ใน Infographics ทันที</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs font-semibold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={() => {
                if (selectedImage) {
                  onSelectImage(selectedImage.url, selectedImage.originalName);
                  onClose();
                }
              }}
              disabled={!selectedImage}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-98"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>นำรูปภาพไปใช้บนกระดาน</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
