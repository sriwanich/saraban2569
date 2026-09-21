import React, { useState } from 'react';
import { 
  Palette, 
  Sparkles, 
  Check, 
  Image as ImageIcon, 
  Type, 
  Square, 
  Layers, 
  Sun, 
  Moon, 
  Calendar, 
  MapPin, 
  Phone, 
  Clock, 
  FileCheck,
  Zap,
  Shield,
  Crown,
  Leaf,
  Heart,
  Waves,
  AlertTriangle,
  Building2,
  Upload,
  RefreshCw,
  CheckCircle2,
  Link2,
  X
} from 'lucide-react';
import { SurveySettings, SurveyThemeConfig } from '../../types/survey';
import { 
  SURVEY_THEME_PRESETS, 
  getMergedThemeConfig, 
  getFontFamilyClass, 
  getBorderRadiusClass, 
  getCardShadowClass 
} from '../../data/surveyThemes';
import { getSystemBrandingInfo, getResolvedSurveyLogoUrl } from '../../utils/surveyLogoHelper';

interface SurveyThemeCustomizerProps {
  settings: SurveySettings;
  onChangeSettings: (newSettings: SurveySettings) => void;
  department?: string;
  onChangeDepartment?: (department: string) => void;
}

const PRESET_ICONS: Record<string, any> = {
  Shield,
  AlertTriangle,
  Crown,
  Leaf,
  Moon,
  Heart,
  Waves,
  Zap
};

const COLOR_SWATCHES = [
  { label: 'น้ำเงินกรมท่า (ปภ.)', hex: '#1e3a8a' },
  { label: 'ฟ้าครามระยอง', hex: '#0284c7' },
  { label: 'ส้มแสดเตือนภัย', hex: '#ea580c' },
  { label: 'เขียวเอเมอรัลด์', hex: '#047857' },
  { label: 'ม่วงกษัตริย์', hex: '#6b21a8' },
  { label: 'ชมพูกุหลาบ', hex: '#e11d48' },
  { label: 'ทองคำพรีเมียม', hex: '#d97706' },
  { label: 'เทาดำไทเทเนียม', hex: '#0f172a' },
];

export const SurveyThemeCustomizer: React.FC<SurveyThemeCustomizerProps> = ({
  settings,
  onChangeSettings,
  department,
  onChangeDepartment
}) => {
  const [brandingInfo, setBrandingInfo] = useState(() => getSystemBrandingInfo());
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const currentTheme = getMergedThemeConfig(settings.themeConfig, settings.themeColor);

  // Re-sync with System Settings
  const handleRefreshSystemBranding = () => {
    const latest = getSystemBrandingInfo();
    setBrandingInfo(latest);
    if (onChangeDepartment && (!department || department.trim() === '')) {
      onChangeDepartment(latest.orgName);
    }
    setSyncMessage('อัปเดตข้อมูลตราสัญลักษณ์และชื่อองค์กรจากระบบเรียบร้อยแล้ว');
    setTimeout(() => setSyncMessage(null), 3500);
  };

  // Helper to update theme config
  const updateTheme = (patch: Partial<SurveyThemeConfig>) => {
    const updatedTheme: SurveyThemeConfig = {
      ...(settings.themeConfig || {}),
      ...patch,
      presetId: patch.presetId || 'custom'
    };

    onChangeSettings({
      ...settings,
      themeColor: updatedTheme.primaryColor || settings.themeColor,
      themeConfig: updatedTheme
    });
  };

  // Select Preset
  const handleSelectPreset = (presetId: string) => {
    const found = SURVEY_THEME_PRESETS.find(p => p.id === presetId);
    if (found) {
      onChangeSettings({
        ...settings,
        themeColor: found.config.primaryColor || settings.themeColor,
        themeConfig: { ...found.config }
      });
    }
  };

  // Handle Custom Logo Upload
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onChangeSettings({
        ...settings,
        headerLogoType: 'custom',
        customLogoUrl: dataUrl
      });
      setIsUploadingLogo(false);
    };
    reader.onerror = () => {
      alert('เกิดข้อผิดพลาดในการอ่านไฟล์รูปภาพ');
      setIsUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  // Resolved logo for live preview
  const previewLogoUrl = getResolvedSurveyLogoUrl(settings.headerLogoType, settings.customLogoUrl);
  const displayOrgTitle = department || brandingInfo.orgName;

  return (
    <div className="space-y-8 text-left animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>การตั้งค่าธีมและเอกลักษณ์องค์กร (Theme & Branding)</span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">
              ออกแบบธีม & ตราสัญลักษณ์หน่วยงาน (DDPM / Official Crest)
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              ดึงรูปโลโก้ ตราครุฑ ตรา ปภ. และชื่อหน่วยงานจากตั้งค่าระบบ (System Settings) และผู้ดูแลองค์กรโดยอัตโนมัติ
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefreshSystemBranding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span>ดึงค่าจากระบบผู้ดูแลองค์กร</span>
          </button>
        </div>

        {syncMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}
      </div>

      {/* 1. Theme Presets Gallery */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Palette className="w-4 h-4 text-blue-500" />
            <span>ตัวอย่างแม่แบบ Theme สำเร็จรูป (Theme Presets)</span>
          </h3>
          <span className="text-xs text-[var(--text-muted)]">
            คลิกเพื่อใช้ธีมตั้งต้น
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SURVEY_THEME_PRESETS.map((preset) => {
            const isSelected = currentTheme.presetId === preset.id;
            const IconComp = PRESET_ICONS[preset.icon] || Palette;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={`group relative p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-full ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/5 shadow-md'
                    : 'border-[var(--border-lighter)] bg-[var(--bg-canvas)] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Header Preview Bar */}
                <div className={`h-12 w-full rounded-xl bg-gradient-to-r ${preset.previewGradient} p-2 flex items-center justify-between text-white shadow-xs relative overflow-hidden mb-3`}>
                  <div className="flex items-center gap-1.5 relative z-10">
                    <IconComp className="w-4 h-4" />
                    <span className="text-[11px] font-bold truncate">{preset.badgeText}</span>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-white text-blue-600 flex items-center justify-center shrink-0 shadow-xs relative z-10">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Preset Info */}
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors">
                    {preset.name}
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customization Controls */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Organization Crest & Branding (ตราสัญลักษณ์ & เอกลักษณ์องค์กร) */}
          <div className="p-5 rounded-3xl bg-[var(--bg-canvas)] border border-blue-500/30 space-y-5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-lighter)]">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>1. ตราสัญลักษณ์ & เอกลักษณ์องค์กร (Theme & Organization Branding)</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                ดึงรูปจากระบบผู้ดูแลองค์กร
              </span>
            </div>

            {/* Department / Org Name Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-primary)] block">
                  ชื่อหน่วยงานบนหัวแบบสำรวจ (Organization / Department Name):
                </label>
                {onChangeDepartment && (
                  <button
                    type="button"
                    onClick={() => onChangeDepartment(brandingInfo.orgName)}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>ใช้ชื่อระบบ ({brandingInfo.orgName.slice(0, 25)}...)</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={department || ''}
                onChange={(e) => onChangeDepartment?.(e.target.value)}
                placeholder="เช่น สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] text-xs font-bold focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Header Logo Type Selection Grid */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[var(--text-primary)] block">
                เลือกตราสัญลักษณ์หัวแบบสำรวจ (Official Crest / Agency Logo):
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* 1. Garuda Official */}
                <button
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, headerLogoType: 'garuda' })}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer relative flex flex-col items-center justify-between h-28 ${
                    settings.headerLogoType === 'garuda'
                      ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/10'
                      : 'border-[var(--border-lighter)] bg-[var(--bg-surface)] hover:border-slate-300'
                  }`}
                >
                  <img 
                    src={brandingInfo.garudaLogoUrl} 
                    alt="Garuda" 
                    className="w-10 h-10 object-contain mx-auto" 
                  />
                  <div>
                    <span className="text-xs font-bold block text-[var(--text-primary)]">ตราครุฑระบบ</span>
                    <span className="text-[10px] text-[var(--text-muted)] block">
                      {brandingInfo.hasCustomGaruda ? 'ไฟล์จากตั้งค่าระบบ' : 'มาตรฐานราชการ'}
                    </span>
                  </div>
                  {settings.headerLogoType === 'garuda' && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">✓</div>
                  )}
                </button>

                {/* 2. DDPM Official Crest */}
                <button
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, headerLogoType: 'ddpm' })}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer relative flex flex-col items-center justify-between h-28 ${
                    settings.headerLogoType === 'ddpm'
                      ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/10'
                      : 'border-[var(--border-lighter)] bg-[var(--bg-surface)] hover:border-slate-300'
                  }`}
                >
                  <img 
                    src={brandingInfo.ddpmLogoUrl} 
                    alt="DDPM Crest" 
                    className="w-10 h-10 object-contain mx-auto" 
                  />
                  <div>
                    <span className="text-xs font-bold block text-[var(--text-primary)]">ตรา กรม ปภ.</span>
                    <span className="text-[10px] text-[var(--text-muted)] block">โลโก้ทางการ ปภ.</span>
                  </div>
                  {settings.headerLogoType === 'ddpm' && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">✓</div>
                  )}
                </button>

                {/* 3. Rayong Provincial Seal */}
                <button
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, headerLogoType: 'rayong' })}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer relative flex flex-col items-center justify-between h-28 ${
                    settings.headerLogoType === 'rayong'
                      ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/10'
                      : 'border-[var(--border-lighter)] bg-[var(--bg-surface)] hover:border-slate-300'
                  }`}
                >
                  <img 
                    src={brandingInfo.rayongLogoUrl} 
                    alt="Rayong Seal" 
                    className="w-10 h-10 object-contain mx-auto" 
                  />
                  <div>
                    <span className="text-xs font-bold block text-[var(--text-primary)]">ตราประจำจังหวัด</span>
                    <span className="text-[10px] text-[var(--text-muted)] block">ตราจังหวัดระยอง</span>
                  </div>
                  {settings.headerLogoType === 'rayong' && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">✓</div>
                  )}
                </button>

                {/* 4. System / Custom Org Logo */}
                <button
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, headerLogoType: 'custom' })}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer relative flex flex-col items-center justify-between h-28 ${
                    settings.headerLogoType === 'custom'
                      ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/10'
                      : 'border-[var(--border-lighter)] bg-[var(--bg-surface)] hover:border-slate-300'
                  }`}
                >
                  <img 
                    src={settings.customLogoUrl || brandingInfo.systemOrgLogoUrl} 
                    alt="System Org Logo" 
                    className="w-10 h-10 object-contain mx-auto" 
                  />
                  <div>
                    <span className="text-xs font-bold block text-[var(--text-primary)]">ตราสัญลักษณ์หน่วยงาน</span>
                    <span className="text-[10px] text-[var(--text-muted)] block truncate max-w-[100px]">
                      {settings.customLogoUrl ? 'ไฟล์อัปโหลดเฉพาะ' : 'โลโก้จากตั้งค่าระบบ'}
                    </span>
                  </div>
                  {settings.headerLogoType === 'custom' && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">✓</div>
                  )}
                </button>

                {/* 5. None */}
                <button
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, headerLogoType: 'none' })}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer relative flex flex-col items-center justify-between h-28 ${
                    settings.headerLogoType === 'none'
                      ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/10'
                      : 'border-[var(--border-lighter)] bg-[var(--bg-surface)] hover:border-slate-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-[var(--text-muted)] my-auto">
                    ✕
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-[var(--text-primary)]">ไม่แสดงตรา</span>
                    <span className="text-[10px] text-[var(--text-muted)] block">เน้นชื่ออย่างเดียว</span>
                  </div>
                  {settings.headerLogoType === 'none' && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">✓</div>
                  )}
                </button>
              </div>
            </div>

            {/* Custom Logo Upload & URL Box (if custom is active or user wants to specify custom) */}
            {settings.headerLogoType === 'custom' && (
              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>อัปโหลดหรือระบุลิงก์ตราสัญลักษณ์เฉพาะฟอร์มนี้:</span>
                  </span>
                  {settings.customLogoUrl && (
                    <button
                      type="button"
                      onClick={() => onChangeSettings({ ...settings, customLogoUrl: undefined })}
                      className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>คืนค่าเป็นโลโก้ระบบ</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* File Upload Button */}
                  <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-blue-400 bg-[var(--bg-surface)] hover:bg-blue-500/10 cursor-pointer transition-all font-bold text-blue-600">
                    <Upload className="w-4 h-4" />
                    <span>{isUploadingLogo ? 'กำลังอ่านไฟล์...' : 'เลือกไฟล์รูปภาพ (PNG/JPG/SVG)'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoFileUpload} 
                      className="hidden" 
                    />
                  </label>

                  {/* URL Input */}
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                    <input
                      type="text"
                      value={settings.customLogoUrl || ''}
                      onChange={(e) => onChangeSettings({ ...settings, customLogoUrl: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Color Palette Customization */}
          <div className="p-5 rounded-3xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] space-y-4">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-500" />
              <span>2. สีและโทนเน้นหลัก (Color Palette)</span>
            </h3>

            {/* Quick Swatches */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">จานสีมาตรฐาน (Quick Swatches):</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_SWATCHES.map((s) => (
                  <button
                    key={s.hex}
                    type="button"
                    onClick={() => updateTheme({ primaryColor: s.hex })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      currentTheme.primaryColor === s.hex
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                        : 'border-[var(--border-lighter)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: s.hex }} />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] mb-1.5 block">สีหลัก (Primary Color):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentTheme.primaryColor}
                    onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-[var(--border-lighter)] p-1 bg-transparent"
                  />
                  <input
                    type="text"
                    value={currentTheme.primaryColor}
                    onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] mb-1.5 block">สีพื้นหลังแคนวาส (Canvas Background):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentTheme.bgColor}
                    onChange={(e) => updateTheme({ bgColor: e.target.value })}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-[var(--border-lighter)] p-1 bg-transparent"
                  />
                  <input
                    type="text"
                    value={currentTheme.bgColor}
                    onChange={(e) => updateTheme({ bgColor: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Typography & Shape Styling */}
          <div className="p-5 rounded-3xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)] space-y-4">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <Type className="w-4 h-4 text-emerald-500" />
              <span>3. รูปแบบอักษรและความโค้งมน (Typography & Shapes)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Font Selection */}
              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] mb-1.5 block">แบบอักษร (Font Family):</label>
                <select
                  value={currentTheme.fontFamily}
                  onChange={(e) => updateTheme({ fontFamily: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] text-xs font-bold cursor-pointer"
                >
                  <option value="sarabun">Sarabun (สารบรรณ - มาตรฐานราชการ)</option>
                  <option value="prompt">Prompt (พร้อม - สโมสรโมเดิร์น)</option>
                  <option value="kanit">Kanit (คณิต - คมชัดล้ำสมัย)</option>
                  <option value="noto_sans">Noto Sans Thai (เนียนสบายตา)</option>
                  <option value="inter">Inter / Standard (สากล)</option>
                </select>
              </div>

              {/* Border Radius */}
              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] mb-1.5 block">ความโค้งมนของกล่อง (Border Radius):</label>
                <select
                  value={currentTheme.borderRadius}
                  onChange={(e) => updateTheme({ borderRadius: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] text-xs font-bold cursor-pointer"
                >
                  <option value="none">เหลี่ยมตรงคมชัด (0px - Cyber/Formal)</option>
                  <option value="sm">มนเล็กน้อย (8px - Soft Compact)</option>
                  <option value="md">มนมาตรฐาน (12px - Balanced)</option>
                  <option value="xl">มนโค้งสไตล์แอป (16px - Modern App)</option>
                  <option value="full">มนโค้งมนทรงแคปซูล (24px - Pill Soft)</option>
                </select>
              </div>
            </div>

            {/* Header Style & Pattern */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] mb-1.5 block">สไตล์สีแบนเนอร์ส่วนหัว (Header Style):</label>
                <select
                  value={currentTheme.headerStyle}
                  onChange={(e) => updateTheme({ headerStyle: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] text-xs font-bold cursor-pointer"
                >
                  <option value="gradient">ไล่เฉดสีทูโทน (Linear Gradient)</option>
                  <option value="solid">สีทึบเรียบหรู (Solid Color)</option>
                  <option value="banner_pattern">ลวดลายการ์ด (Textured Pattern)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] mb-1.5 block">ลวดลายพื้นหลังแบนเนอร์ (Header Pattern):</label>
                <select
                  value={currentTheme.headerPattern}
                  onChange={(e) => updateTheme({ headerPattern: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] text-xs font-bold cursor-pointer"
                >
                  <option value="thai_motif">ลายไทยประยุกต์ / ตราครุฑ (Thai Elegance)</option>
                  <option value="waves">ลายคลื่นน้ำเตือนภัย (Disaster Waves)</option>
                  <option value="grid">ลายตารางเทคโนโลยี (Tech Grid)</option>
                  <option value="dots">ลายจุดมินิมอล (Subtle Dots)</option>
                  <option value="none">ไม่มีลวดลาย (None)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: RSVP & Attendance Form Settings */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-purple-500/10 border border-indigo-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span>4. ตั้งค่าแบบตอบรับเข้าร่วมงาน / รับทราบคำสั่ง (RSVP & Acknowledgment)</span>
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!settings.isRsvpForm}
                  onChange={(e) => onChangeSettings({
                    ...settings,
                    isRsvpForm: e.target.checked,
                    showRsvpReceipt: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {settings.isRsvpForm && (
              <div className="space-y-3 pt-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[var(--text-primary)] mb-1 block">ชื่อกิจกรรม / ประกาศคำสั่ง:</label>
                    <input
                      type="text"
                      value={settings.rsvpEventTitle || ''}
                      onChange={(e) => onChangeSettings({ ...settings, rsvpEventTitle: e.target.value })}
                      placeholder="เช่น การประชุมสัมมนาจัดทำแผน ปภ. ระยอง"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[var(--text-primary)] mb-1 block">กำหนดการ / วันเวลากิจกรรม:</label>
                    <input
                      type="text"
                      value={settings.rsvpEventDate || ''}
                      onChange={(e) => onChangeSettings({ ...settings, rsvpEventDate: e.target.value })}
                      placeholder="เช่น 28 กันยายน 2026 (08:30 - 16:30 น.)"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[var(--text-primary)] mb-1 block">สถานที่จัดงาน / เป้าหมาย:</label>
                    <input
                      type="text"
                      value={settings.rsvpEventLocation || ''}
                      onChange={(e) => onChangeSettings({ ...settings, rsvpEventLocation: e.target.value })}
                      placeholder="เช่น ห้องประชุมศาลากลางจังหวัดระยอง"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[var(--text-primary)] mb-1 block">เบอร์โทรศัพท์ประสานงาน:</label>
                    <input
                      type="text"
                      value={settings.rsvpContactPhone || ''}
                      onChange={(e) => onChangeSettings({ ...settings, rsvpContactPhone: e.target.value })}
                      placeholder="เช่น 038-694000 ต่อ 102"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-lighter)]"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-indigo-900 dark:text-indigo-200 block">เปิดระบบออกบัตรตอบรับ (E-RSVP Ticket Receipt):</span>
                    <span className="text-[11px] text-[var(--text-secondary)]">ผู้ตอบแบบสำรวจจะได้รับบัตรตอบรับอิเล็กทรอนิกส์พร้อม QR Code หลังกดส่ง</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showRsvpReceipt !== false}
                    onChange={(e) => onChangeSettings({ ...settings, showRsvpReceipt: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Interactive Device Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>ตัวอย่างแสดงผลสด (Live Preview)</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
              {currentTheme.fontFamily.toUpperCase()}
            </span>
          </div>

          {/* Simulated Mobile Device Frame */}
          <div 
            className={`p-4 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-2xl transition-all duration-300 ${getFontFamilyClass(currentTheme.fontFamily)}`}
            style={{ backgroundColor: currentTheme.bgColor }}
          >
            {/* Top Bar simulation */}
            <div className="w-16 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 opacity-60" />

            {/* Header Card Preview */}
            <div 
              className={`p-4 text-white shadow-lg mb-3 relative overflow-hidden ${getBorderRadiusClass(currentTheme.borderRadius)}`}
              style={{
                background: currentTheme.headerStyle === 'gradient'
                  ? `linear-gradient(135deg, ${currentTheme.headerGradientFrom || currentTheme.primaryColor}, ${currentTheme.headerGradientTo || currentTheme.accentColor})`
                  : currentTheme.primaryColor
              }}
            >
              <div className="flex items-center gap-2.5 mb-2">
                {previewLogoUrl && (
                  <img 
                    src={previewLogoUrl} 
                    alt="Logo" 
                    className="w-7 h-7 object-contain shrink-0" 
                  />
                )}
                <span className="text-[11px] font-bold tracking-wide opacity-90 line-clamp-1">
                  {displayOrgTitle}
                </span>
              </div>
              <h4 className="text-sm font-black leading-snug">
                {settings.isRsvpForm ? (settings.rsvpEventTitle || 'แบบตอบรับการเข้าร่วมประชุม') : 'แบบสำรวจความคิดเห็นและความพึงพอใจ'}
              </h4>
              <p className="text-[10px] opacity-80 mt-1 line-clamp-2">
                {settings.isRsvpForm ? 'กรุณากรอกข้อมูลเพื่อออกบัตรตอบรับการเข้าร่วม' : 'แบบสำรวจข้อมูลมาตรฐานฉบับย่อ'}
              </p>
            </div>

            {/* Questions Sample Card Preview */}
            <div 
              className={`p-3.5 space-y-3 border border-slate-200 dark:border-slate-800 ${getBorderRadiusClass(currentTheme.borderRadius)} ${getCardShadowClass(currentTheme.cardShadow)}`}
              style={{ backgroundColor: currentTheme.cardBgColor, color: currentTheme.textColor }}
            >
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                  คำถามตัวอย่างที่ 1
                </span>
                <h5 className="text-xs font-bold">
                  {settings.isRsvpForm ? 'ยืนยันสถานะการเข้าร่วมงาน' : 'ท่านมีความพึงพอใจต่อการให้บริการระดับใด?'}
                </h5>
              </div>

              {/* Sample Option Pills */}
              <div className="space-y-1.5 text-xs">
                <div 
                  className="p-2 rounded-xl border flex items-center justify-between text-[11px] font-medium"
                  style={{ borderColor: currentTheme.primaryColor, backgroundColor: `${currentTheme.primaryColor}15` }}
                >
                  <span className="font-bold" style={{ color: currentTheme.primaryColor }}>
                    {settings.isRsvpForm ? '✅ ตอบรับเข้าร่วมงานด้วยตนเอง' : '⭐ มากที่สุด (5)'}
                  </span>
                  <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[9px]" style={{ backgroundColor: currentTheme.primaryColor }}>
                    ✓
                  </span>
                </div>

                <div className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-[var(--text-secondary)] opacity-70">
                  <span>{settings.isRsvpForm ? '👥 มอบหมายผู้แทนเข้าร่วม' : '⭐ มาก (4)'}</span>
                </div>
              </div>

              {/* Sample Button */}
              <button
                type="button"
                className={`w-full py-2 px-3 text-xs font-bold text-white shadow-md transition-all cursor-default ${getBorderRadiusClass(currentTheme.borderRadius)}`}
                style={{
                  backgroundColor: currentTheme.primaryColor,
                }}
              >
                {settings.isRsvpForm ? 'ยืนยันแบบตอบรับ (Submit RSVP)' : 'ส่งแบบสำรวจ (Submit Survey)'}
              </button>
            </div>

            {/* Live RSVP Receipt Preview Banner if RSVP */}
            {settings.isRsvpForm && (
              <div className="mt-3 p-3 rounded-2xl bg-indigo-900 text-white text-xs space-y-1.5 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-300">ตัวอย่างตั๋วตอบรับ (E-RSVP Ticket)</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-800 text-indigo-200">#RSVP-9812</span>
                </div>
                <div className="font-bold text-xs truncate">
                  {settings.rsvpEventTitle || 'กิจกรรมประชุม ปภ. ระยอง'}
                </div>
                <div className="text-[10px] text-indigo-200 flex items-center gap-1">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span className="truncate">{settings.rsvpEventDate || '28 ก.ย. 2026'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
