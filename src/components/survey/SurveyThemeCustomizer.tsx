import React from 'react';
import { Palette, Layers, HelpCircle, Shield, AlertTriangle } from 'lucide-react';
import { SurveySettings, SurveyThemeConfig } from '../../types/survey';

interface SurveyThemeCustomizerProps {
  settings: SurveySettings;
  onChangeSettings: (newSettings: SurveySettings) => void;
  department: string;
  onChangeDepartment: (dept: string) => void;
}

const THEME_PRESETS: Array<{
  id: NonNullable<SurveyThemeConfig['presetId']>;
  name: string;
  primary: string;
  accent: string;
  bg: string;
  text: string;
  description: string;
}> = [
  {
    id: 'thai_gov',
    name: 'มาตรฐานรัฐบาลไทย (Thai Gov)',
    primary: '#1e3a8a',
    accent: '#3b82f6',
    bg: '#f8fafc',
    text: '#1e293b',
    description: 'โทนสีน้ำเงินเข้ม เป็นทางการ เหมาะสำหรับแบบประเมินและแบบสำรวจราชการ'
  },
  {
    id: 'disaster_alert',
    name: 'แจ้งเตือนสาธารณภัย (Disaster Alert)',
    primary: '#ea580c',
    accent: '#f97316',
    bg: '#fff7ed',
    text: '#1c1917',
    description: 'โทนสีแสดสะดุดตา เพื่อการระวังภัยและการรายงานความเสียหายเร่งด่วน'
  },
  {
    id: 'rayong_azure',
    name: 'ระยอง ทะเลคราม (Rayong Azure)',
    primary: '#0284c7',
    accent: '#0ea5e9',
    bg: '#f0f9ff',
    text: '#0f172a',
    description: 'โทนสีน้ำเงินครามทะเลสดใส เหมาะสำหรับงานประชุมสัมมนาและงานท่องเที่ยว'
  },
  {
    id: 'emerald_eco',
    name: 'เขียวพฤกษา (Emerald Eco)',
    primary: '#16a34a',
    accent: '#22c55e',
    bg: '#f0fdf4',
    text: '#14532d',
    description: 'โทนสีเขียวธรรมชาติ เหมาะกับงานเกษตรกรรมและสิ่งแวดล้อม'
  },
  {
    id: 'royal_purple',
    name: 'ม่วงราชสำนัก (Royal Purple)',
    primary: '#8b5cf6',
    accent: '#a78bfa',
    bg: '#faf5ff',
    text: '#1e1b4b',
    description: 'โทนสีม่วงพรีเมียม สวยงามและหรูหรา เหมาะกับแบบทดสอบเกียรติบัตร'
  },
  {
    id: 'midnight_dark',
    name: 'รัตติกาล (Midnight Dark)',
    primary: '#374151',
    accent: '#4b5563',
    bg: '#1f2937',
    text: '#f9fafb',
    description: 'โทนสีเทาเข้มรักษาสายตา เหมาะกับงานเทคโนโลยีและอุตสาหกรรมเฉพาะทาง'
  }
];

export const SurveyThemeCustomizer: React.FC<SurveyThemeCustomizerProps> = ({
  settings,
  onChangeSettings,
  department,
  onChangeDepartment,
}) => {
  const currentPresetId = settings.themeConfig?.presetId || 'thai_gov';

  const handleSelectPreset = (preset: typeof THEME_PRESETS[0]) => {
    const updatedThemeConfig: SurveyThemeConfig = {
      presetId: preset.id,
      primaryColor: preset.primary,
      accentColor: preset.accent,
      bgColor: preset.bg,
      textColor: preset.text,
      cardBgColor: '#ffffff',
      fontFamily: preset.id === 'thai_gov' ? 'sarabun' : 'prompt',
      borderRadius: 'lg',
      headerStyle: 'solid',
      headerGradientFrom: preset.primary,
      headerGradientTo: preset.primary,
      headerPattern: 'none',
      cardShadow: 'md',
      buttonStyle: 'filled'
    };

    onChangeSettings({
      ...settings,
      themeColor: preset.primary,
      themeConfig: updatedThemeConfig
    });
  };

  const updateThemeConfigField = (key: keyof SurveyThemeConfig, value: any) => {
    const currentThemeConfig = settings.themeConfig || {};
    onChangeSettings({
      ...settings,
      themeConfig: {
        ...currentThemeConfig,
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Theme Presets */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-5 shadow-sm">
        <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-blue-500" />
          <span>เลือกแม่แบบสีของแบบสำรวจ (Visual Theme Presets)</span>
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {THEME_PRESETS.map((p) => {
            const isSelected = currentPresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`text-left p-3.5 rounded-xl border transition flex items-start gap-3 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/20'
                    : 'border-[var(--border-lighter)] hover:border-[var(--text-muted)] bg-[var(--bg-canvas)]'
                }`}
              >
                {/* Visual indicator */}
                <div className="w-8 h-8 rounded-lg shrink-0 border border-black/5 flex flex-col overflow-hidden">
                  <div className="h-1/2 w-full" style={{ backgroundColor: p.primary }} />
                  <div className="h-1/2 w-full" style={{ backgroundColor: p.bg }} />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="font-bold text-xs text-[var(--text-primary)] block">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] line-clamp-2 mt-0.5">
                    {p.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Header & Branding Options */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-5 shadow-sm space-y-4">
        <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-500" />
          <span>หัวสัญลักษณ์สากลและองค์กร (Branding & Logo)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Department */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">หน่วยงานผู้จัดทำแบบประเมิน</label>
            <input
              type="text"
              value={department}
              onChange={(e) => onChangeDepartment(e.target.value)}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl p-3 text-xs text-[var(--text-primary)] outline-none"
              placeholder="เช่น กลุ่มงานยุทธศาสตร์และการจัดการ ปภ. ระยอง"
            />
          </div>

          {/* Logo Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">ตราสัญลักษณ์บนหัวกระดาษ</label>
            <select
              value={settings.headerLogoType}
              onChange={(e) => onChangeSettings({ ...settings, headerLogoType: e.target.value as any })}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-lighter)] rounded-xl p-3 text-xs text-[var(--text-primary)] outline-none"
            >
              <option value="ddpm">ตรากรมป้องกันและบรรเทาสาธารณภัย (ปภ.)</option>
              <option value="garuda">ตราครุฑพ่าห์สากล (รัฐบาลไทย)</option>
              <option value="rayong">ตราสัญลักษณ์จังหวัดระยอง</option>
              <option value="none">ไม่แสดงโลโก้ใดๆ</option>
            </select>
          </div>

        </div>
      </div>

      {/* 3. Navigation & Presentation */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-2xl p-5 shadow-sm space-y-4">
        <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-500" />
          <span>การนำเสนอและความปลอดภัย (Display & Security)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Progress Bar */}
          <div className="flex items-center justify-between p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-lighter)]">
            <div>
              <span className="font-bold text-xs text-[var(--text-primary)] block">แถบความคืบหน้า (Progress Bar)</span>
              <span className="text-[10px] text-[var(--text-muted)]">แสดงความคืบหน้าด้านล่างแบบสำรวจ</span>
            </div>
            <input
              type="checkbox"
              checked={settings.showProgressBar}
              onChange={(e) => onChangeSettings({ ...settings, showProgressBar: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          {/* Question Numbers */}
          <div className="flex items-center justify-between p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-lighter)]">
            <div>
              <span className="font-bold text-xs text-[var(--text-primary)] block">แสดงหมายเลขข้อคำถาม</span>
              <span className="text-[10px] text-[var(--text-muted)]">แสดงหมายเลข 1, 2, 3 หน้าหัวข้อ</span>
            </div>
            <input
              type="checkbox"
              checked={settings.showQuestionNumbers}
              onChange={(e) => onChangeSettings({ ...settings, showQuestionNumbers: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          {/* Anonymous responses */}
          <div className="flex items-center justify-between p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-lighter)]">
            <div>
              <span className="font-bold text-xs text-[var(--text-primary)] block">ไม่เปิดเผยตัวตน (Anonymous)</span>
              <span className="text-[10px] text-[var(--text-muted)]">อนุญาตให้ผู้ตอบส่งข้อมูลโดยไม่เปิดเผยชื่อ</span>
            </div>
            <input
              type="checkbox"
              checked={settings.allowAnonymous}
              onChange={(e) => onChangeSettings({ ...settings, allowAnonymous: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

          {/* Limit One Response */}
          <div className="flex items-center justify-between p-3 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-lighter)]">
            <div>
              <span className="font-bold text-xs text-[var(--text-primary)] block">จำกัด 1 คำตอบต่ออุปกรณ์</span>
              <span className="text-[10px] text-[var(--text-muted)]">ป้องกันสแปมโดยบันทึกค่าคุกกี้เบราว์เซอร์</span>
            </div>
            <input
              type="checkbox"
              checked={settings.limitOneResponsePerDevice}
              onChange={(e) => onChangeSettings({ ...settings, limitOneResponsePerDevice: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>

        </div>
      </div>

    </div>
  );
};
