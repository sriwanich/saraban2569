import React, { useState, useEffect, useRef } from 'react';
import { 
  Type as FontIcon, Upload, Plus, Search, X, Check, 
  Sparkles, RefreshCw, Globe, FileText, Trash2, FolderUp 
} from 'lucide-react';

export interface FontOption {
  name: string;
  category: 'thai' | 'english' | 'custom' | 'system';
  isGoogle?: boolean;
  fileType?: string;
  url?: string;
}

export interface CustomFontItem {
  name: string;
  url: string;
  fileName: string;
}

const PRESET_FONTS: FontOption[] = [
  // Thai Google Fonts
  { name: 'Sarabun', category: 'thai', isGoogle: true },
  { name: 'Prompt', category: 'thai', isGoogle: true },
  { name: 'Kanit', category: 'thai', isGoogle: true },
  { name: 'Noto Sans Thai', category: 'thai', isGoogle: true },
  { name: 'Noto Serif Thai', category: 'thai', isGoogle: true },
  { name: 'IBM Plex Sans Thai', category: 'thai', isGoogle: true },
  { name: 'Chakra Petch', category: 'thai', isGoogle: true },
  { name: 'Bai Jamjuree', category: 'thai', isGoogle: true },
  { name: 'Mitr', category: 'thai', isGoogle: true },
  { name: 'Mali', category: 'thai', isGoogle: true },
  { name: 'Srisakdi', category: 'thai', isGoogle: true },
  { name: 'Pattaya', category: 'thai', isGoogle: true },
  { name: 'Charm', category: 'thai', isGoogle: true },
  { name: 'Charmonman', category: 'thai', isGoogle: true },
  { name: 'Taviraj', category: 'thai', isGoogle: true },
  { name: 'Trirong', category: 'thai', isGoogle: true },
  { name: 'K2D', category: 'thai', isGoogle: true },
  { name: 'Fahkwang', category: 'thai', isGoogle: true },
  { name: 'Thasadak', category: 'thai', isGoogle: true },
  { name: 'Krub', category: 'thai', isGoogle: true },
  { name: 'Kodchasan', category: 'thai', isGoogle: true },
  { name: 'KoHo', category: 'thai', isGoogle: true },
  { name: 'Maitree', category: 'thai', isGoogle: true },
  { name: 'Pridi', category: 'thai', isGoogle: true },
  { name: 'Niramit', category: 'thai', isGoogle: true },
  { name: 'Itim', category: 'thai', isGoogle: true },
  { name: 'Athiti', category: 'thai', isGoogle: true },
  { name: 'Anuphan', category: 'thai', isGoogle: true },
  { name: 'Chonburi', category: 'thai', isGoogle: true },

  // English / Display Google Fonts
  { name: 'Inter', category: 'english', isGoogle: true },
  { name: 'Roboto', category: 'english', isGoogle: true },
  { name: 'Open Sans', category: 'english', isGoogle: true },
  { name: 'Montserrat', category: 'english', isGoogle: true },
  { name: 'Poppins', category: 'english', isGoogle: true },
  { name: 'Lato', category: 'english', isGoogle: true },
  { name: 'Oswald', category: 'english', isGoogle: true },
  { name: 'Playfair Display', category: 'english', isGoogle: true },
  { name: 'Merriweather', category: 'english', isGoogle: true },
  { name: 'Raleway', category: 'english', isGoogle: true },
  { name: 'Pacifico', category: 'english', isGoogle: true },
  { name: 'Dancing Script', category: 'english', isGoogle: true },
  { name: 'Bebas Neue', category: 'english', isGoogle: true },
  { name: 'Cinzel', category: 'english', isGoogle: true },
  { name: 'Lobster', category: 'english', isGoogle: true },
  { name: 'Fira Code', category: 'english', isGoogle: true },
  { name: 'JetBrains Mono', category: 'english', isGoogle: true },
  { name: 'Silkscreen', category: 'english', isGoogle: true },
  { name: 'Press Start 2P', category: 'english', isGoogle: true },

  // System Fonts
  { name: 'Arial', category: 'system' },
  { name: 'Helvetica', category: 'system' },
  { name: 'Times New Roman', category: 'system' },
  { name: 'Courier New', category: 'system' },
  { name: 'Georgia', category: 'system' }
];

// Helper to inject Google Font CSS link dynamically
export async function ensureGoogleFontLoaded(fontName: string): Promise<boolean> {
  if (!fontName) return false;
  
  // Clean font name: remove quotes and take first part if it's a stack
  const cleanName = fontName.split(',')[0].replace(/['"]/g, '').trim();
  if (!cleanName) return false;

  // Clean standard fonts that don't need Google API
  const systemFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Impact', 'Comic Sans MS', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'];
  if (systemFonts.some(f => cleanName.toLowerCase() === f.toLowerCase())) return true;

  try {
    const fontId = `gf-link-${cleanName.replace(/\s+/g, '-').toLowerCase()}`;
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      const formattedNameForUrl = cleanName.replace(/\s+/g, '+');
      // Using a slightly more conservative set of weights to ensure compatibility
      link.href = `https://fonts.googleapis.com/css2?family=${formattedNameForUrl}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,700&display=swap`;
      document.head.appendChild(link);
    }

    if ('fonts' in document) {
      // Use a timeout to avoid hanging if the font fails to load
      // Increased to 5s for mobile stability
      const loadPromise = (document as any).fonts.load(`16px "${cleanName}"`);
      const timeoutPromise = new Promise(r => setTimeout(r, 5000));
      await Promise.race([loadPromise, timeoutPromise]);
    } else {
      await new Promise(r => setTimeout(r, 1000));
    }
    return true;
  } catch (err) {
    console.warn(`Could not load Google Font ${cleanName}:`, err);
    return false;
  }
}

interface FontSelectorProps {
  currentFont: string;
  onSelectFont: (fontName: string) => void;
}

export function FontSelector({ currentFont, onSelectFont }: FontSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'thai' | 'english' | 'custom' | 'system'>('all');
  const [customFonts, setCustomFonts] = useState<CustomFontItem[]>([]);
  const [dynamicallyAddedFonts, setDynamicallyAddedFonts] = useState<FontOption[]>([]);
  const [customGoogleInput, setCustomGoogleInput] = useState('');
  const [isLoadingFont, setIsLoadingFont] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore custom uploaded fonts from localStorage on initial render
  useEffect(() => {
    try {
      const saved = localStorage.getItem('edms_custom_uploaded_fonts');
      if (saved) {
        const parsed: CustomFontItem[] = JSON.parse(saved);
        parsed.forEach(async (item) => {
          try {
            const resp = await fetch(item.url);
            const buffer = await resp.arrayBuffer();
            const fontFace = new FontFace(item.name, buffer);
            const loaded = await fontFace.load();
            (document.fonts as any).add(loaded);
            setCustomFonts(prev => [...prev.filter(f => f.name !== item.name), item]);
          } catch (err) {
            console.warn(`Error loading stored custom font ${item.name}:`, err);
          }
        });
      }
    } catch (e) {
      console.warn('Error reading custom fonts from storage', e);
    }
  }, []);

  // Pre-load current font if it's a Google Font
  useEffect(() => {
    if (currentFont) {
      ensureGoogleFontLoaded(currentFont);
    }
  }, [currentFont]);

  const handleSelectFont = async (fontName: string) => {
    setIsLoadingFont(true);
    setStatusMessage(`กำลังโหลดฟอนต์ ${fontName}...`);
    
    await ensureGoogleFontLoaded(fontName);
    
    setIsLoadingFont(false);
    setStatusMessage(null);
    onSelectFont(fontName);
    setIsOpen(false);
  };

  const handleAddCustomGoogleFont = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = customGoogleInput.trim();
    if (!cleanName) return;

    setIsLoadingFont(true);
    setStatusMessage(`กำลังค้นหาและดึงฟอนต์ "${cleanName}" จาก Google Fonts...`);

    const success = await ensureGoogleFontLoaded(cleanName);
    setIsLoadingFont(false);

    if (success) {
      // Check if already in options
      const existsInPreset = PRESET_FONTS.some(f => f.name.toLowerCase() === cleanName.toLowerCase());
      const existsInDynamic = dynamicallyAddedFonts.some(f => f.name.toLowerCase() === cleanName.toLowerCase());

      if (!existsInPreset && !existsInDynamic) {
        const newFontOption: FontOption = {
          name: cleanName,
          category: 'english',
          isGoogle: true
        };
        setDynamicallyAddedFonts(prev => [newFontOption, ...prev]);
      }

      setStatusMessage(`โหลดฟอนต์ "${cleanName}" เรียบร้อยแล้ว!`);
      setTimeout(() => setStatusMessage(null), 3000);
      onSelectFont(cleanName);
      setCustomGoogleInput('');
    } else {
      setStatusMessage(`ไม่พบฟอนต์ "${cleanName}" บน Google Fonts หรือเกิดข้อผิดพลาดในการดึงข้อมูล`);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoadingFont(true);
    setStatusMessage('กำลังประมวลผลไฟล์ฟอนต์...');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['ttf', 'otf', 'woff', 'woff2'].includes(ext || '')) {
        alert(`ไฟล์ ${file.name} ไม่รองรับ กรุณาใช้ไฟล์ .ttf, .otf, .woff หรือ .woff2`);
        continue;
      }

      let fontName = file.name.substring(0, file.name.lastIndexOf('.'));
      fontName = fontName.replace(/[^a-zA-Z0-9ก-๙\s_-]/g, '').trim() || `CustomFont_${Date.now()}`;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const fontFace = new FontFace(fontName, arrayBuffer);
        const loadedFace = await fontFace.load();
        (document.fonts as any).add(loadedFace);

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const fontItem: CustomFontItem = {
            name: fontName,
            url: dataUrl,
            fileName: file.name
          };

          setCustomFonts(prev => {
            const updated = [fontItem, ...prev.filter(f => f.name !== fontName)];
            try {
              localStorage.setItem('edms_custom_uploaded_fonts', JSON.stringify(updated.slice(0, 8)));
            } catch (err) {
              console.warn('Storage error:', err);
            }
            return updated;
          });

          setStatusMessage(`เพิ่มฟอนต์ "${fontName}" เรียบร้อยแล้ว!`);
          setTimeout(() => setStatusMessage(null), 3000);
          onSelectFont(fontName);
        };
        reader.readAsDataURL(file);

      } catch (err: any) {
        console.error('Font upload error:', err);
        alert(`ไม่สามารถโหลดฟอนต์ ${file.name}: ${err.message || 'โครงสร้างไฟล์ไม่ถูกต้อง'}`);
      }
    }

    setIsLoadingFont(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveCustomFont = (fontName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`คุณต้องการลบฟอนต์อัปโหลด "${fontName}" ใช่หรือไม่?`)) return;

    setCustomFonts(prev => {
      const updated = prev.filter(f => f.name !== fontName);
      try {
        localStorage.setItem('edms_custom_uploaded_fonts', JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }
      return updated;
    });

    if (currentFont === fontName) {
      onSelectFont('Sarabun');
    }
  };

  // Combine all font lists
  const allFontsList: FontOption[] = [
    ...customFonts.map(cf => ({ name: cf.name, category: 'custom' as const, fileType: cf.fileName.split('.').pop()?.toUpperCase() })),
    ...dynamicallyAddedFonts,
    ...PRESET_FONTS
  ];

  // Filter fonts according to search & category tab
  const filteredFonts = allFontsList.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'all') return true;
    if (activeTab === 'thai') return f.category === 'thai';
    if (activeTab === 'english') return f.category === 'english';
    if (activeTab === 'custom') return f.category === 'custom';
    if (activeTab === 'system') return f.category === 'system';
    return true;
  });

  return (
    <div className="relative">
      {/* Selector Main Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-elevated)] hover:border-[var(--primary-color)] transition-all shadow-sm group"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="p-1.5 rounded-lg bg-[var(--primary-color)]/10 text-[var(--primary-color)] group-hover:scale-105 transition-transform shrink-0">
            <FontIcon className="w-4 h-4" />
          </div>
          <div className="text-left overflow-hidden">
            <div className="text-xs text-[var(--text-muted)] font-medium">ฟอนต์ตัวอักษร</div>
            <div className="text-sm font-bold text-[var(--text-primary)] truncate" style={{ fontFamily: currentFont }}>
              {currentFont} <span className="text-[11px] font-normal text-[var(--text-muted)] font-sans">(ตัวอย่าง / Sample)</span>
            </div>
          </div>
        </div>
        <div className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[var(--primary-color)]/10 text-[var(--primary-color)] shrink-0">
          เปลี่ยนฟอนต์
        </div>
      </button>

      {/* Font Picker Modal / Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
                  <Sparkles className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-noto-serif-thai text-white">
                    ศูนย์ฟอนต์สารบรรณ (Google Fonts & Custom Fonts Hub)
                  </h3>
                  <p className="text-xs text-indigo-200/80">
                    เลือกรองรับฟอนต์ Google Fonts ภาษาไทย/สากลทั้งหมด หรืออัปโหลดไฟล์ฟอนต์ประจำหน่วยงาน (.ttf, .otf, .woff)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Upload & Custom Google Font Actions Bar */}
            <div className="p-4 bg-[var(--bg-elevated)] border-b border-[var(--border-lighter)] space-y-3 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Upload Font File */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    onChange={handleFileUpload}
                    className="hidden"
                    multiple
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoadingFont}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                  >
                    <FolderUp className="w-4 h-4" />
                    <span>อัปโหลดฟอนต์ (.ttf, .otf, .woff, .woff2)</span>
                  </button>
                </div>

                {/* 2. Custom Google Font Search Input */}
                <form onSubmit={handleAddCustomGoogleFont} className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Globe className="w-3.5 h-3.5 text-indigo-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="พิมพ์ชื่อ Google Font (เช่น Silkscreen)"
                      value={customGoogleInput}
                      onChange={(e) => setCustomGoogleInput(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-xs bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoadingFont || !customGoogleInput.trim()}
                    className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shrink-0 flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> ดึงฟอนต์
                  </button>
                </form>
              </div>

              {/* Status Banner */}
              {statusMessage && (
                <div className="p-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-medium text-indigo-700 dark:text-indigo-300 flex items-center gap-2 animate-fade-in">
                  <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isLoadingFont ? 'animate-spin text-indigo-500' : ''}`} />
                  <span>{statusMessage}</span>
                </div>
              )}
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="p-4 bg-[var(--bg-surface)] border-b border-[var(--border-lighter)] space-y-3 shrink-0">
              {/* Category Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    activeTab === 'all'
                      ? 'bg-[var(--primary-color)] text-white shadow-sm'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border-light)]'
                  }`}
                >
                  ทั้งหมด ({allFontsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('thai')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    activeTab === 'thai'
                      ? 'bg-[var(--primary-color)] text-white shadow-sm'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border-light)]'
                  }`}
                >
                  🇹🇭 Google Fonts ภาษาไทย ({allFontsList.filter(f => f.category === 'thai').length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('english')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    activeTab === 'english'
                      ? 'bg-[var(--primary-color)] text-white shadow-sm'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border-light)]'
                  }`}
                >
                  🌐 Google Fonts สากล ({allFontsList.filter(f => f.category === 'english').length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    activeTab === 'custom'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border-light)]'
                  }`}
                >
                  📁 อัปโหลดเอง ({customFonts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('system')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    activeTab === 'system'
                      ? 'bg-[var(--primary-color)] text-white shadow-sm'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border-light)]'
                  }`}
                >
                  💻 ฟอนต์ระบบ ({PRESET_FONTS.filter(f => f.category === 'system').length})
                </button>
              </div>

              {/* Search Filter */}
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อฟอนต์..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--primary-color)] outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Font Grid / List Display with Live Preview */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2 custom-scrollbar min-h-[250px]">
              {filteredFonts.length === 0 ? (
                <div className="p-12 text-center text-[var(--text-muted)] space-y-2">
                  <FontIcon className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
                  <p className="text-sm font-semibold">ไม่พบฟอนต์ที่ตรงกับ "{searchTerm}"</p>
                  <p className="text-xs">สามารถพิมพ์ชื่อ Google Font ที่ช่องด้านบนแล้วกด "ดึงฟอนต์" เพื่อเพิ่มได้ทันที</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredFonts.map((font) => {
                    const isSelected = currentFont === font.name;
                    // Trigger dynamic loading on hover/focus to render sample text in that font
                    ensureGoogleFontLoaded(font.name);

                    return (
                      <div
                        key={font.name}
                        onClick={() => handleSelectFont(font.name)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-2 group ${
                          isSelected
                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/30'
                            : 'bg-[var(--bg-canvas)] border-[var(--border-lighter)] hover:border-indigo-400 hover:bg-[var(--bg-elevated)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-[var(--text-primary)]">
                              {font.name}
                            </span>
                            {font.category === 'thai' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                Thai Google
                              </span>
                            )}
                            {font.category === 'english' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                                Google
                              </span>
                            )}
                            {font.category === 'custom' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                File ({font.fileType || 'Custom'})
                              </span>
                            )}
                            {font.category === 'system' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
                                System
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {font.category === 'custom' && (
                              <button
                                type="button"
                                onClick={(e) => handleRemoveCustomFont(font.name, e)}
                                className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                                title="ลบฟอนต์อัปโหลด"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isSelected && (
                              <span className="p-1 rounded-full bg-indigo-600 text-white">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Live Rendered Font Sample */}
                        <div 
                          className="text-base sm:text-lg pt-1 pb-1 text-[var(--text-primary)] border-t border-[var(--border-lighter)] overflow-hidden text-ellipsis whitespace-nowrap"
                          style={{ fontFamily: font.name }}
                        >
                          หนังสือราชการไทย 0123456789 ABCabc
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[var(--bg-elevated)] border-t border-[var(--border-lighter)] text-xs text-[var(--text-muted)] flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>รองรับ Google Fonts และฟอนต์ภาษาไทยมาตรฐานทั้งหมด</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-medium)] hover:bg-[var(--border-light)] text-[var(--text-primary)] font-semibold transition-colors"
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
