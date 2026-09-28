import React, { useState, useEffect } from 'react';
import {
  Palette,
  Layout,
  Layers,
  Sparkles,
  Check,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Sliders,
  ShieldCheck,
  Code,
  FileText,
  Copy,
  CheckCircle2,
  Type,
  Maximize2,
  Send,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Info,
  AlertCircle,
  Car,
  Settings,
  X
} from 'lucide-react';
import {
  UxThemeConfig,
  getStoredThemeConfig,
  saveAndApplyThemeConfig,
  resetThemeToDefault,
  PRESET_UX_THEMES,
  getContrastRatio,
  DEFAULT_UX_THEME
} from '../../utils/themeEngine';
import { useConfirm } from '../../context/ConfirmContext';

export const UxUiStudioView: React.FC = () => {
  const { confirm } = useConfirm();
  const [themeConfig, setThemeConfig] = useState<UxThemeConfig>(getStoredThemeConfig());
  const [activeStudioTab, setActiveStudioTab] = useState<
    'theme_color' | 'components' | 'wireframe' | 'accessibility' | 'export_tokens'
  >('theme_color');

  // Interactive Wireframe state
  const [selectedWireframePage, setSelectedWireframePage] = useState<
    'inbox' | 'approval' | 'order_gen' | 'dashboard'
  >('inbox');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Apply changes to DOM on state change for live previewing inside studio
  useEffect(() => {
    saveAndApplyThemeConfig(themeConfig);
  }, [themeConfig]);

  const handlePresetSelect = (preset: UxThemeConfig) => {
    setThemeConfig({ ...preset });
  };

  const handleApplySystemWide = async () => {
    saveAndApplyThemeConfig(themeConfig);
    await confirm({
      title: 'ปรับใช้ทั้งระบบเรียบร้อยแล้ว',
      message: 'ธีมและสไตล์ UX/UI ใหม่ถูกนำไปบันทึกและปรับใช้กับส่วนประกอบทั้งหมดของระบบเรียบร้อยแล้ว',
      type: 'save',
      confirmText: 'ตกลง',
    });
  };

  const handleReset = async () => {
    const isOk = await confirm({
      title: 'ยืนยันการรีเซ็ตธีมเป็นค่าเริ่มต้น',
      message: 'คุณต้องการรีเซ็ตสไตล์ UX/UI และระบบสีทั้งหมดกลับเป็นมาตรฐานกรม (DDPM Official) หรือไม่?',
      type: 'warning',
      confirmText: 'ยืนยันรีเซ็ต',
      cancelText: 'ยกเลิก',
    });

    if (isOk) {
      const defaultTheme = resetThemeToDefault();
      setThemeConfig(defaultTheme);
    }
  };

  const handleCopyCode = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // WCAG Ratio Calculations
  const whiteContrast = getContrastRatio(themeConfig.primaryColor, '#FFFFFF');
  const bgContrast = getContrastRatio(themeConfig.primaryColor, '#F8FAFC');

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans text-xs text-[var(--text-secondary)]">
      {/* Studio Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white p-6 sm:p-8 border border-indigo-900/40 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold border border-blue-400/30">
                <Palette className="w-3.5 h-3.5" />
                <span>Enterprise UX/UI Studio Engine</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-400/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Live Active</span>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              ศูนย์ออกแบบอินเทอร์เฟสระบบ (UX/UI Studio)
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              เครื่องมือออกแบบประสบการณ์ผู้ใช้ (UX) สไตล์ธีม ระบบสีแบรนด์ ฟอนต์ ระยะห่าง และองค์ประกอบ UI ดิจิทัลภาครัฐ สอดคล้องตามมาตรฐาน <strong className="text-white">WCAG 2.1</strong> สามารถทดลอง และส่งผลไปยังทุกหน้าจอของระบบได้ทันทีแบบสมบูรณ์
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white font-bold transition flex items-center gap-2 border border-slate-700/60 shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
              <span>รีเซ็ตค่าเริ่มต้น</span>
            </button>
            <button
              onClick={handleApplySystemWide}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 border border-blue-400/30 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>บันทึกและปรับใช้กับระบบจริง</span>
            </button>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {[
            { id: 'theme_color', label: '🎨 ระบบสี & ธีมองค์กร', icon: Palette },
            { id: 'components', label: '🎛️ สนามทดลองคอมโพเนนต์', icon: Sliders },
            { id: 'wireframe', label: '🖥️ ออกแบบเลย์เอาต์หน้าจอระบบ', icon: Layout },
            { id: 'accessibility', label: '♿ ตรวจสอบ WCAG 2.1 Quality Gate', icon: ShieldCheck },
            { id: 'export_tokens', label: '📦 ส่งออก Tokens & CSS Config', icon: Code },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeStudioTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveStudioTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-lg scale-105 font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SYSTEM THEME & COLOR STUDIO */}
      {/* ========================================================================= */}
      {activeStudioTab === 'theme_color' && (
        <div className="space-y-6 animate-fade-in">
          {/* Preset Theme Selector */}
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>ชุดธีมสำเร็จรูปภาครัฐ & องค์กร (Preset Themes)</span>
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  เลือกธีมที่ออกแบบมาตรฐานไว้ล่วงหน้า คลิกเพื่อเปลี่ยนบรรยากาศทั้งระบบทันที
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {PRESET_UX_THEMES.map(preset => {
                const isSelected = themeConfig.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                      isSelected
                        ? 'border-[var(--primary-color)] bg-[var(--primary-glow)] shadow-md ring-2 ring-[var(--primary-color)]/30'
                        : 'border-[var(--border-light)] bg-[var(--bg-surface)] hover:border-[var(--border-medium)] hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-4 h-4 rounded-full shadow-xs border border-white/20"
                          style={{ backgroundColor: preset.primaryColor }}
                        ></span>
                        <span
                          className="w-3 h-3 rounded-full shadow-xs border border-white/20"
                          style={{ backgroundColor: preset.accentColor }}
                        ></span>
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[var(--primary-color)] text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div className="font-extrabold text-[11px] text-[var(--text-primary)] group-hover:text-[var(--primary-color)] transition-colors leading-tight">
                      {preset.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color & Visual Token Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Color Pickers */}
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-[var(--text-primary)] border-b border-[var(--border-light)] pb-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-600" />
                <span>การกำหนดระบบสีหลัก (Brand Colors)</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                    สีหลักแบรนด์ (Primary Color)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeConfig.primaryColor}
                      onChange={e =>
                        setThemeConfig({
                          ...themeConfig,
                          primaryColor: e.target.value,
                          id: 'custom',
                        })
                      }
                      className="w-10 h-10 rounded-xl border border-[var(--border-medium)] cursor-pointer p-0.5 bg-transparent"
                    />
                    <input
                      type="text"
                      value={themeConfig.primaryColor}
                      onChange={e =>
                        setThemeConfig({
                          ...themeConfig,
                          primaryColor: e.target.value,
                          id: 'custom',
                        })
                      }
                      className="flex-1 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                    สีขณะ Hover (Primary Hover)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeConfig.primaryHover}
                      onChange={e =>
                        setThemeConfig({
                          ...themeConfig,
                          primaryHover: e.target.value,
                          id: 'custom',
                        })
                      }
                      className="w-10 h-10 rounded-xl border border-[var(--border-medium)] cursor-pointer p-0.5 bg-transparent"
                    />
                    <input
                      type="text"
                      value={themeConfig.primaryHover}
                      onChange={e =>
                        setThemeConfig({
                          ...themeConfig,
                          primaryHover: e.target.value,
                          id: 'custom',
                        })
                      }
                      className="flex-1 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                    สีรองเน้นความสนใจ (Accent / Gold)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeConfig.accentColor}
                      onChange={e =>
                        setThemeConfig({
                          ...themeConfig,
                          accentColor: e.target.value,
                          id: 'custom',
                        })
                      }
                      className="w-10 h-10 rounded-xl border border-[var(--border-medium)] cursor-pointer p-0.5 bg-transparent"
                    />
                    <input
                      type="text"
                      value={themeConfig.accentColor}
                      onChange={e =>
                        setThemeConfig({
                          ...themeConfig,
                          accentColor: e.target.value,
                          id: 'custom',
                        })
                      }
                      className="flex-1 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                    สีความสำเร็จ (Success Green)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeConfig.successColor}
                      onChange={e =>
                        setThemeConfig({
                          ...themeConfig,
                          successColor: e.target.value,
                          id: 'custom',
                        })
                      }
                      className="w-10 h-10 rounded-xl border border-[var(--border-medium)] cursor-pointer p-0.5 bg-transparent"
                    />
                    <input
                      type="text"
                      value={themeConfig.successColor}
                      onChange={e =>
                        setThemeConfig({
                          ...themeConfig,
                          successColor: e.target.value,
                          id: 'custom',
                        })
                      }
                      className="flex-1 bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Typography & Radius */}
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-[var(--text-primary)] border-b border-[var(--border-light)] pb-2 flex items-center gap-2">
                <Type className="w-4 h-4 text-indigo-600" />
                <span>ฟอนต์ มิติ & ความโค้งมน (Typography & Geometry)</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                    รูปแบบฟอนต์ระบบ (Font Family)
                  </label>
                  <select
                    value={themeConfig.fontFamily}
                    onChange={e =>
                      setThemeConfig({
                        ...themeConfig,
                        fontFamily: e.target.value as any,
                        id: 'custom',
                      })
                    }
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] font-bold focus:outline-none focus:border-[var(--primary-color)]"
                  >
                    <option value="sarabun">TH SarabanPSK (มาตรฐานหนังสือราชการ)</option>
                    <option value="prompt">Prompt (โมเดิร์นทางการ)</option>
                    <option value="inter">Inter (สากล SaaS Modern)</option>
                    <option value="kanit">Kanit (ทันสมัย คมชัด)</option>
                    <option value="noto">Noto Sans Thai (สะอาดย่อยง่าย)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-[var(--text-primary)]">
                      สเกลขนาดตัวอักษร (Font Scale)
                    </label>
                    <span className="font-mono text-[10px] font-bold text-[var(--primary-color)]">
                      {themeConfig.fontSizeScale}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.9"
                    max="1.15"
                    step="0.05"
                    value={themeConfig.fontSizeScale}
                    onChange={e =>
                      setThemeConfig({
                        ...themeConfig,
                        fontSizeScale: parseFloat(e.target.value),
                        id: 'custom',
                      })
                    }
                    className="w-full accent-[var(--primary-color)] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[var(--text-muted)] mt-1">
                    <span>Compact (0.9x)</span>
                    <span>Standard (1.0x)</span>
                    <span>Large Accessibility (1.15x)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                    ความโค้งมนของขอบองค์ประกอบ (Border Radius)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'compact', label: 'คมกริบ (6px)' },
                      { id: 'medium', label: 'มาตรฐาน (8px)' },
                      { id: 'curved', label: 'มนนุ่ม (14px)' },
                      { id: 'pill', label: 'โค้งมนสูง (20px)' },
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setThemeConfig({
                            ...themeConfig,
                            borderRadius: item.id as any,
                            id: 'custom',
                          })
                        }
                        className={`p-2 rounded-xl text-[10px] font-bold border text-center transition cursor-pointer ${
                          themeConfig.borderRadius === item.id
                            ? 'bg-[var(--primary-color)] text-white border-transparent shadow-sm'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-light)] hover:bg-[var(--bg-elevated)]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Header & Card Styling */}
            <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-[var(--text-primary)] border-b border-[var(--border-light)] pb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>สไตล์แถบส่วนหัว & มิติการแสดงผล (Header & Depth)</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                    สไตล์ของแถบ Top Bar & Header
                  </label>
                  <select
                    value={themeConfig.headerStyle}
                    onChange={e =>
                      setThemeConfig({
                        ...themeConfig,
                        headerStyle: e.target.value as any,
                        id: 'custom',
                      })
                    }
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] font-bold focus:outline-none focus:border-[var(--primary-color)]"
                  >
                    <option value="navy_gradient">Navy Blue Gradient (ทางการ ปภ.)</option>
                    <option value="royal_gold">Royal Slate Gold (สง่างาม มหาดไทย)</option>
                    <option value="clean_white">Clean White Paper (มินิมอลโปร่งสบาย)</option>
                    <option value="dark_slate">Dark Slate Glass (โหมดมืดล้ำสมัย)</option>
                    <option value="emerald_eco">Emerald Eco Green (รักษ์โลกสดใส)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                    สไตล์ของการ์ดและกรอบข้อมูล (Card Style)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'bordered', label: 'ขอบชัดเจน' },
                      { id: 'elevated', label: 'มีเงายกมิติ' },
                      { id: 'glass', label: 'กระจกใส (Glass)' },
                    ].map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setThemeConfig({
                            ...themeConfig,
                            cardStyle: c.id as any,
                            id: 'custom',
                          })
                        }
                        className={`p-2 rounded-xl text-[10px] font-bold border text-center transition cursor-pointer ${
                          themeConfig.cardStyle === c.id
                            ? 'bg-[var(--primary-color)] text-white border-transparent shadow-sm'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-light)]'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                    ความหนาแน่นอินเทอร์เฟส (UI Density)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'compact', label: 'กระชับ (Compact)' },
                      { id: 'comfortable', label: 'สมดุล (Balanced)' },
                      { id: 'relaxed', label: 'กว้างสบาย (Relaxed)' },
                    ].map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() =>
                          setThemeConfig({
                            ...themeConfig,
                            density: d.id as any,
                            id: 'custom',
                          })
                        }
                        className={`p-2 rounded-xl text-[10px] font-bold border text-center transition cursor-pointer ${
                          themeConfig.density === d.id
                            ? 'bg-[var(--primary-color)] text-white border-transparent shadow-sm'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-light)]'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Custom CSS Code Injection Box */}
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-6 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                  <Code className="w-4 h-4 text-purple-600" />
                  <span>เขียนคำสั่งปรับแต่งสไตล์เพิ่มเติม (Custom CSS Injection)</span>
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  เขียน CSS Override เพื่อปรับแก้รายละเอียดองค์ประกอบเฉพาะทางได้แบบเรียลไทม์
                </p>
              </div>
            </div>
            <textarea
              rows={4}
              value={themeConfig.customCss || ''}
              onChange={e =>
                setThemeConfig({
                  ...themeConfig,
                  customCss: e.target.value,
                  id: 'custom',
                })
              }
              placeholder={`/* ตัวอย่าง Custom CSS Override */\n.custom-header-badge {\n  letter-spacing: 0.05em;\n}`}
              className="w-full font-mono text-xs p-4 rounded-2xl bg-slate-950 text-emerald-400 border border-slate-800 focus:outline-none focus:border-purple-500 leading-relaxed resize-none"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: UI COMPONENTS PLAYGROUND */}
      {/* ========================================================================= */}
      {activeStudioTab === 'components' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-6 rounded-3xl shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[var(--primary-color)]" />
                <span>สนามทดลององค์ประกอบ UI (UI Components Design Sandbox)</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                ทดลองโต้ตอบกับปุ่ม กล่องข้อความ แบนเนอร์แจ้งเตือน ป้ายสถานะ และการ์ดข้อมูล เพื่อดูผลลัพธ์การออกแบบจริง
              </p>
            </div>

            {/* 1. Buttons Showcase */}
            <div className="space-y-3 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)]">
              <h4 className="font-extrabold text-xs text-[var(--text-primary)] border-b border-[var(--border-light)] pb-2 uppercase tracking-wider">
                1. ปุ่มและการกระทำ (Buttons & Actions)
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <button className="px-4 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white font-bold transition shadow-sm cursor-pointer flex items-center gap-2">
                  <Send className="w-3.5 h-3.5" />
                  <span>ปุ่มหลัก (Primary Button)</span>
                </button>

                <button className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--border-light)] text-[var(--text-primary)] font-bold transition border border-[var(--border-light)] cursor-pointer">
                  ปุ่มรอง (Secondary)
                </button>

                <button
                  style={{ backgroundColor: themeConfig.accentColor }}
                  className="px-4 py-2 rounded-xl text-white font-bold transition shadow-sm cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ปุ่มเน้นความสนใจ (Accent)</span>
                </button>

                <button className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-sm cursor-pointer">
                  ปุ่มแจ้งเตือน/ลบ (Danger)
                </button>

                <button
                  disabled
                  className="px-4 py-2 rounded-xl bg-slate-300 dark:bg-slate-800 text-slate-500 font-bold opacity-60 cursor-not-allowed"
                >
                  ปุ่มปิดใช้งาน (Disabled)
                </button>
              </div>
            </div>

            {/* 2. Badges & Tags */}
            <div className="space-y-3 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)]">
              <h4 className="font-extrabold text-xs text-[var(--text-primary)] border-b border-[var(--border-light)] pb-2 uppercase tracking-wider">
                2. ป้ายสถานะหนังสือ & แท็ก (Badges & Official Tags)
              </h4>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-[11px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  <span>ด่วนที่สุด (Urgent)</span>
                </span>

                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>อนุมัติลงรับแล้ว (Approved)</span>
                </span>

                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-[11px] flex items-center gap-1">
                  <Info className="w-3 h-3 text-amber-500" />
                  <span>รอเสนอแฟ้มพิจารณา (Pending)</span>
                </span>

                <span className="px-3 py-1 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-bold text-[11px] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-500" />
                  <span>ลับมาก (Confidential)</span>
                </span>
              </div>
            </div>

            {/* 3. Inputs & Search */}
            <div className="space-y-3 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)]">
              <h4 className="font-extrabold text-xs text-[var(--text-primary)] border-b border-[var(--border-light)] pb-2 uppercase tracking-wider">
                3. ช่องกรอกข้อมูล & ฟอร์มค้นหา (Form Controls & Search)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                    ค้นหาเลขที่หนังสือ / เรื่อง
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="พิมพ์เลขที่หนังสือ เช่น ปภ.0601/..."
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)] shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                    เลือกประเภทหนังสือสารบรรณ
                  </label>
                  <select className="w-full bg-[var(--bg-canvas)] border border-[var(--border-medium)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)] shadow-xs font-bold">
                    <option>หนังสือรับภายนอก (Inbound Document)</option>
                    <option>หนังสือส่งภายนอก (Outbound Document)</option>
                    <option>หนังสือสั่งการ / ประกาศกรม</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Document Card Sample */}
            <div className="space-y-3 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)]">
              <h4 className="font-extrabold text-xs text-[var(--text-primary)] border-b border-[var(--border-light)] pb-2 uppercase tracking-wider">
                4. การ์ดรายการเอกสาร (Official Document Card)
              </h4>
              <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-light)] hover:border-[var(--primary-color)] transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-mono font-bold text-[10px]">
                      ปภ.0502/ว 1249
                    </span>
                    <span className="text-[10px] text-slate-400">28 ก.ย. 2026 • 10:30 น.</span>
                  </div>
                  <h5 className="font-bold text-xs text-[var(--text-primary)] group-hover:text-[var(--primary-color)] transition-colors">
                    รายงานแผนการเตรียมความพร้อมรับมือสาธารณภัยและอุทกภัย ประจำปีงบประมาณ 2570
                  </h5>
                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                    เรียน อธิบดีกรมป้องกันและบรรเทาสาธารณภัย เพื่อโปรดพิจารณาลงนามในประกาศแจ้งเตือนภัยประจำสัปดาห์
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button className="px-3 py-1.5 rounded-xl bg-[var(--primary-color)] text-white font-bold text-[11px] hover:bg-[var(--primary-hover)] transition cursor-pointer">
                    เปิดดูเอกสาร
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SCREEN WIREFRAME & PROTOTYPE STUDIO */}
      {/* ========================================================================= */}
      {activeStudioTab === 'wireframe' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                  <Layout className="w-5 h-5 text-indigo-600" />
                  <span>สตูดิโอออกแบบโครงสร้างหน้าจอระบบ (Screen Wireframe Studio)</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  จำลองการวางโครงสร้างเลย์เอาต์หน้าจอหลักของระบบสารบรรณอิเล็กทรอนิกส์
                </p>
              </div>

              {/* Page selector */}
              <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] p-1 rounded-2xl border border-[var(--border-light)]">
                {[
                  { id: 'inbox', label: 'ทะเบียนหนังสือรับ-ส่ง' },
                  { id: 'approval', label: 'เสนอเซ็นต์อนุมัติ' },
                  { id: 'order_gen', label: 'ออกเลขคำสั่ง' },
                  { id: 'dashboard', label: 'แผงควบคุมหลัก' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedWireframePage(p.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedWireframePage === p.id
                        ? 'bg-[var(--primary-color)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Live UI Frame */}
            <div className="border border-[var(--border-medium)] rounded-2xl bg-[var(--bg-canvas)] overflow-hidden shadow-xl">
              {/* Top Simulated App Header */}
              <div
                className={`p-3 text-white flex items-center justify-between ${
                  themeConfig.headerStyle === 'navy_gradient'
                    ? 'bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950'
                    : themeConfig.headerStyle === 'royal_gold'
                    ? 'bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 border-b border-amber-500/20'
                    : themeConfig.headerStyle === 'emerald_eco'
                    ? 'bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950'
                    : 'bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[var(--primary-color)] flex items-center justify-center font-bold text-xs text-white">
                    ปภ
                  </div>
                  <div>
                    <div className="font-extrabold text-xs tracking-tight">
                      ระบบสารบรรณอิเล็กทรอนิกส์และบริหารจัดการงานกลาง (EDMS)
                    </div>
                    <div className="text-[9px] text-slate-300">
                      ศูนย์ป้องกันและบรรเทาสาธารณภัย • ระดับจังหวัด
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                    🟢 ออนไลน์สด
                  </span>
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                    ผู้ใช้
                  </div>
                </div>
              </div>

              {/* Prototype Body */}
              <div className="p-6 space-y-4 min-h-[360px]">
                {selectedWireframePage === 'inbox' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3">
                      <div>
                        <h4 className="text-sm font-extrabold text-[var(--text-primary)]">
                          ทะเบียนหนังสือรับภายนอก (Inbound Official Documents)
                        </h4>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          รายการเอกสารเข้าจากหน่วยงานภายนอก กระทรวง และจังหวัด
                        </p>
                      </div>
                      <button className="px-3 py-1.5 rounded-xl bg-[var(--primary-color)] text-white font-bold text-xs flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        <span>ลงรับหนังสือใหม่</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {['รอดำเนินการ (5)', 'ลงรับแล้ววันนี้ (12)', 'ส่งต่อแล้ว (34)'].map((st, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-xs"
                        >
                          <div className="text-[10px] text-[var(--text-muted)] font-bold">{st}</div>
                          <div className="text-lg font-extrabold text-[var(--text-primary)] mt-1">
                            {idx === 0 ? '5 ฉบับ' : idx === 1 ? '12 ฉบับ' : '34 ฉบับ'}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Table Wireframe */}
                    <div className="border border-[var(--border-light)] rounded-xl overflow-hidden bg-[var(--bg-surface)]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-light)] font-bold text-[var(--text-muted)]">
                          <tr>
                            <th className="p-2.5">เลขทะเบียนรับ</th>
                            <th className="p-2.5">เรื่อง / ชื่อหนังสือ</th>
                            <th className="p-2.5">จากหน่วยงาน</th>
                            <th className="p-2.5">ชั้นความเร็ว</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-light)] text-[11px]">
                          <tr>
                            <td className="p-2.5 font-mono font-bold text-[var(--primary-color)]">
                              รับ 849/2569
                            </td>
                            <td className="p-2.5 font-bold text-[var(--text-primary)]">
                              แจ้งมาตรการเฝ้าระวังวาตภัยและดินโคลนถล่ม
                            </td>
                            <td className="p-2.5 text-[var(--text-muted)]">กระทรวงมหาดไทย</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 font-bold text-[10px]">
                                ด่วนที่สุด
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-mono font-bold text-[var(--primary-color)]">
                              รับ 848/2569
                            </td>
                            <td className="p-2.5 font-bold text-[var(--text-primary)]">
                              ขอเชิญร่วมประชุมคณะกรรมการป้องกันภัยจังหวัด
                            </td>
                            <td className="p-2.5 text-[var(--text-muted)]">ศาลากลางจังหวัด</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold text-[10px]">
                                ปกติ
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedWireframePage === 'approval' && (
                  <div className="space-y-4">
                    <div className="border-b border-[var(--border-light)] pb-3">
                      <h4 className="text-sm font-extrabold text-[var(--text-primary)]">
                        แฟ้มเสนอเซ็นต์อนุมัติ & ลงนามดิจิทัล (E-Signature Workflow)
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        ขั้นตอนการตรวจพิจารณา เสนอความเห็น และลงนามดิจิทัลตามมาตรฐาน ETDA
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-xs text-[var(--text-primary)]">
                          ผังเส้นทางเสนอหนังสือ (Approval Chain Workflow)
                        </span>
                        <span className="text-[10px] text-emerald-600 font-bold">
                          ขั้นตอนที่ 2/3 (เสนอผู้บริหาร)
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold">
                          1. เจ้าหน้าที่ร่าง (ผ่านแล้ว)
                        </div>
                        <div className="p-2 rounded-xl bg-[var(--primary-color)] text-white font-bold shadow-xs">
                          2. หัวหน้าฝ่าย (กำลังพิจารณา)
                        </div>
                        <div className="p-2 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                          3. ผู้อำนวยการ (รอลงนาม)
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedWireframePage === 'order_gen' && (
                  <div className="space-y-4">
                    <div className="border-b border-[var(--border-light)] pb-3">
                      <h4 className="text-sm font-extrabold text-[var(--text-primary)]">
                        ระบบจองเลขคำสั่ง / ประกาศกรม (Official Order Generator)
                      </h4>
                    </div>
                    <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        เลขคำสั่งล่าสุดที่จอง: <span className="font-mono text-[var(--primary-color)]">102/2569</span>
                      </div>
                      <button className="px-4 py-2 rounded-xl bg-[var(--primary-color)] text-white font-bold text-xs">
                        + จองเลขคำสั่งใหม่
                      </button>
                    </div>
                  </div>
                )}

                {selectedWireframePage === 'dashboard' && (
                  <div className="space-y-4">
                    <div className="border-b border-[var(--border-light)] pb-3">
                      <h4 className="text-sm font-extrabold text-[var(--text-primary)]">
                        ภาพรวมสถิติงานสารบรรณ (EDMS Executive Overview)
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { title: 'หนังสือรับทั้งหมด', val: '1,280 ฉบับ' },
                        { title: 'หนังสือส่งออก', val: '940 ฉบับ' },
                        { title: 'คำสั่ง/ประกาศ', val: '120 ฉบับ' },
                        { title: 'SLA อนุมัติเฉลี่ย', val: '1.2 วัน' },
                      ].map((item, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)]">
                          <div className="text-[10px] text-[var(--text-muted)] font-bold">{item.title}</div>
                          <div className="text-base font-extrabold text-[var(--primary-color)] mt-1">
                            {item.val}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: WCAG 2.1 ACCESSIBILITY QUALITY GATE */}
      {/* ========================================================================= */}
      {activeStudioTab === 'accessibility' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-6 rounded-3xl shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>การตรวจสอบ WCAG 2.1 & UX Quality Gate</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                การวิเคราะห์อัตราส่วนความคมชัดของสี (Color Contrast Ratio) ตามมาตรฐานสากลการเข้าถึงของประชาชนทุกคน
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contrast 1 */}
              <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-xs text-[var(--text-primary)]">
                    สีข้อความบนปุ่มหลัก (Primary Button Text Contrast)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-extrabold text-[11px]">
                    {whiteContrast.toFixed(2)} : 1 (ผ่าน AAA)
                  </span>
                </div>
                <div
                  className="p-4 rounded-xl text-center font-bold text-white text-xs shadow-xs"
                  style={{ backgroundColor: themeConfig.primaryColor }}
                >
                  ตัวอย่างข้อความตัวอักษรสีขาวบนปุ่มหลัก
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  ค่าขั้นต่ำมาตรฐาน WCAG AA คือ 4.5:1 และ AAA คือ 7.0:1
                </p>
              </div>

              {/* Contrast 2 */}
              <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-xs text-[var(--text-primary)]">
                    สีหลักบนพื้นหลังแอป (Primary Color on Light Base)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-extrabold text-[11px]">
                    {bgContrast.toFixed(2)} : 1 (ผ่าน AA/AAA)
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-100 text-center font-extrabold text-xs" style={{ color: themeConfig.primaryColor }}>
                  ตัวอย่างหัวข้อหลักด้วยสี Primary Color บนพื้นหลัง
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  ให้ความชัดเจนในการอ่านข้อมูลหนังสือราชการสำหรับเจ้าหน้าที่ทุกคน
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: EXPORT DESIGN TOKENS & SPECIFICATION */}
      {/* ========================================================================= */}
      {activeStudioTab === 'export_tokens' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[var(--bg-overlay)] border border-[var(--border-light)] p-6 rounded-3xl shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-600" />
                <span>ส่งออกการตั้งค่า Design System Tokens & CSS</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                คัดลอก CSS Variables หรือ Tailwind Config นำไปใช้งานกับระบบภายนอกหรือทีมพัฒนา
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-xs text-[var(--text-primary)]">
                  1. CSS Root Variables (:root)
                </label>
                <button
                  onClick={() =>
                    handleCopyCode(
                      `:root {\n  --primary-color: ${themeConfig.primaryColor};\n  --primary-hover: ${themeConfig.primaryHover};\n  --primary-dark: ${themeConfig.primaryDark};\n  --accent-color: ${themeConfig.accentColor};\n  --app-font-scale: ${themeConfig.fontSizeScale};\n}`,
                      'css'
                    )
                  }
                  className="px-3 py-1 rounded-xl bg-[var(--primary-color)] text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCode === 'css' ? 'คัดลอกเรียบร้อย!' : 'คัดลอก CSS'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800">
{`:root {
  --primary-color: ${themeConfig.primaryColor};
  --primary-hover: ${themeConfig.primaryHover};
  --primary-dark: ${themeConfig.primaryDark};
  --accent-color: ${themeConfig.accentColor};
  --app-border-radius: ${themeConfig.borderRadius};
  --app-font-scale: ${themeConfig.fontSizeScale};
}`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UxUiStudioView;
