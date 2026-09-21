import { SurveyThemeConfig } from '../types/survey';

export interface ThemePresetOption {
  id: Required<SurveyThemeConfig>['presetId'];
  name: string;
  description: string;
  icon: string;
  badgeText: string;
  previewGradient: string;
  config: SurveyThemeConfig;
}

export const SURVEY_THEME_PRESETS: ThemePresetOption[] = [
  {
    id: 'thai_gov',
    name: '🏛️ ราชการไทยมาตรฐาน (Thai Government Navy)',
    description: 'โทนสีน้ำเงินกรมท่าสง่างาม ตามมาตรฐานหน่วยงานภาครัฐและ ปภ.',
    icon: 'Shield',
    badgeText: 'มาตรฐาน ปภ.',
    previewGradient: 'from-blue-900 via-blue-800 to-indigo-900',
    config: {
      presetId: 'thai_gov',
      primaryColor: '#1e3a8a',
      accentColor: '#2563eb',
      bgColor: '#f8fafc',
      cardBgColor: '#ffffff',
      textColor: '#0f172a',
      fontFamily: 'sarabun',
      borderRadius: 'xl',
      headerStyle: 'gradient',
      headerGradientFrom: '#1e3a8a',
      headerGradientTo: '#1e40af',
      headerPattern: 'thai_motif',
      cardShadow: 'md',
      buttonStyle: 'filled'
    }
  },
  {
    id: 'disaster_alert',
    name: '🌿 ปภ. ส้มตระหนักภัย (Disaster Alert Amber)',
    description: 'โทนสีส้มแสดเตือนภัย อบอุ่น โดดเด่น มองเห็นชัดเจนสำหรับสาธารณภัย',
    icon: 'AlertTriangle',
    badgeText: 'ศูนย์เตือนภัย',
    previewGradient: 'from-orange-600 via-amber-600 to-amber-700',
    config: {
      presetId: 'disaster_alert',
      primaryColor: '#ea580c',
      accentColor: '#f97316',
      bgColor: '#fff7ed',
      cardBgColor: '#ffffff',
      textColor: '#1c1917',
      fontFamily: 'prompt',
      borderRadius: '2xl' as any,
      headerStyle: 'gradient',
      headerGradientFrom: '#c2410c',
      headerGradientTo: '#ea580c',
      headerPattern: 'waves',
      cardShadow: 'lg',
      buttonStyle: 'gradient'
    }
  },
  {
    id: 'royal_purple',
    name: '💎 หรูหราทันสมัย (Modern Royal Purple)',
    description: 'โทนสีม่วงกษัตริย์หรูหรา สำหรับพิธีการ ประชุมผู้บริหาร และสัมมนาวิชาการ',
    icon: 'Crown',
    badgeText: 'สัมมนา & พิธีการ',
    previewGradient: 'from-purple-900 via-indigo-900 to-purple-800',
    config: {
      presetId: 'royal_purple',
      primaryColor: '#6b21a8',
      accentColor: '#a855f7',
      bgColor: '#faf5ff',
      cardBgColor: '#ffffff',
      textColor: '#3b0764',
      fontFamily: 'kanit',
      borderRadius: '2xl' as any,
      headerStyle: 'gradient',
      headerGradientFrom: '#581c87',
      headerGradientTo: '#7e22ce',
      headerPattern: 'grid',
      cardShadow: 'glow',
      buttonStyle: 'gradient'
    }
  },
  {
    id: 'emerald_eco',
    name: '🍃 มินิมอลเขียวธรรมชาติ (Eco Natural Emerald)',
    description: 'โทนสีเขียวเอเมอรัลด์ สดชื่น สบายตา สำหรับแบบสำรวจสิ่งแวดล้อมและสุขภาพ',
    icon: 'Leaf',
    badgeText: 'สิ่งแวดล้อม & สุขภาพ',
    previewGradient: 'from-emerald-800 via-teal-700 to-green-800',
    config: {
      presetId: 'emerald_eco',
      primaryColor: '#047857',
      accentColor: '#10b981',
      bgColor: '#f0fdf4',
      cardBgColor: '#ffffff',
      textColor: '#064e3b',
      fontFamily: 'noto_sans',
      borderRadius: 'lg',
      headerStyle: 'gradient',
      headerGradientFrom: '#065f46',
      headerGradientTo: '#059669',
      headerPattern: 'dots',
      cardShadow: 'sm',
      buttonStyle: 'filled'
    }
  },
  {
    id: 'midnight_dark',
    name: '🌙 ดาร์กโหมดพรีเมียม (Midnight Dark Gold)',
    description: 'โทนเข้มดาร์กโหมด ถนอมสายตา ตัดด้วยไฮไลท์สีทองคำบริสุทธิ์',
    icon: 'Moon',
    badgeText: 'Dark Mode',
    previewGradient: 'from-slate-950 via-slate-900 to-slate-950',
    config: {
      presetId: 'midnight_dark',
      primaryColor: '#eab308',
      accentColor: '#facc15',
      bgColor: '#090d16',
      cardBgColor: '#1e293b',
      textColor: '#f8fafc',
      fontFamily: 'inter',
      borderRadius: 'xl',
      headerStyle: 'solid',
      headerGradientFrom: '#0f172a',
      headerGradientTo: '#1e293b',
      headerPattern: 'dots',
      cardShadow: 'glow',
      buttonStyle: 'gradient'
    }
  },
  {
    id: 'pastel_rose',
    name: '🌸 สบายตาชมพูพาสเทล (Pastel Soft Rose)',
    description: 'โทนสีชมพูกลีบกุหลาบ นุ่มนวล อบอุ่น สำหรับกิจกรรมสังคมและการรับฟังความคิดเห็น',
    icon: 'Heart',
    badgeText: 'ความพึงพอใจสูง',
    previewGradient: 'from-rose-600 via-pink-600 to-rose-700',
    config: {
      presetId: 'pastel_rose',
      primaryColor: '#e11d48',
      accentColor: '#f43f5e',
      bgColor: '#fff1f2',
      cardBgColor: '#ffffff',
      textColor: '#881337',
      fontFamily: 'sarabun',
      borderRadius: 'full',
      headerStyle: 'gradient',
      headerGradientFrom: '#be123c',
      headerGradientTo: '#fb7185',
      headerPattern: 'waves',
      cardShadow: 'md',
      buttonStyle: 'soft'
    }
  },
  {
    id: 'rayong_azure',
    name: '🌊 ทะเลระยองสดใส (Rayong Ocean Azure)',
    description: 'โทนสีฟ้าครามทะเลระยอง สดใส ทันสมัย สื่อถึงความโปร่งใสและเข้าถึงง่าย',
    icon: 'Waves',
    badgeText: 'เมืองระยอง',
    previewGradient: 'from-cyan-700 via-sky-700 to-blue-800',
    config: {
      presetId: 'rayong_azure',
      primaryColor: '#0284c7',
      accentColor: '#06b6d4',
      bgColor: '#f0f9ff',
      cardBgColor: '#ffffff',
      textColor: '#0c4a6e',
      fontFamily: 'prompt',
      borderRadius: 'xl',
      headerStyle: 'gradient',
      headerGradientFrom: '#0369a1',
      headerGradientTo: '#0284c7',
      headerPattern: 'grid',
      cardShadow: 'md',
      buttonStyle: 'filled'
    }
  },
  {
    id: 'futuristic_cyan',
    name: '⚡ พรีเมียมไซเบอร์ (Futuristic Tech Cyan)',
    description: 'โทนสีไซเบอร์โหมดเทคโนโลยี คมชัด โครงสร้างขอบตรง ดีไซน์ล้ำสมัย',
    icon: 'Zap',
    badgeText: 'Smart Tech',
    previewGradient: 'from-slate-900 via-sky-950 to-teal-950',
    config: {
      presetId: 'futuristic_cyan',
      primaryColor: '#06b6d4',
      accentColor: '#14b8a6',
      bgColor: '#020617',
      cardBgColor: '#0f172a',
      textColor: '#ecfeff',
      fontFamily: 'kanit',
      borderRadius: 'none',
      headerStyle: 'solid',
      headerGradientFrom: '#083344',
      headerGradientTo: '#115e59',
      headerPattern: 'grid',
      cardShadow: 'glow',
      buttonStyle: 'outline'
    }
  }
];

export const DEFAULT_THEME_CONFIG: Required<SurveyThemeConfig> = {
  presetId: 'thai_gov',
  primaryColor: '#1e3a8a',
  accentColor: '#2563eb',
  bgColor: '#f8fafc',
  cardBgColor: '#ffffff',
  textColor: '#0f172a',
  fontFamily: 'sarabun',
  borderRadius: 'xl',
  headerStyle: 'gradient',
  headerGradientFrom: '#1e3a8a',
  headerGradientTo: '#1e40af',
  headerPattern: 'thai_motif',
  cardShadow: 'md',
  buttonStyle: 'filled'
};

export function getMergedThemeConfig(customConfig?: SurveyThemeConfig, themeColor?: string): Required<SurveyThemeConfig> {
  const preset = SURVEY_THEME_PRESETS.find(p => p.id === customConfig?.presetId);
  const base = preset ? preset.config : DEFAULT_THEME_CONFIG;

  return {
    presetId: customConfig?.presetId || base.presetId || 'thai_gov',
    primaryColor: customConfig?.primaryColor || themeColor || base.primaryColor || '#1e3a8a',
    accentColor: customConfig?.accentColor || base.accentColor || '#2563eb',
    bgColor: customConfig?.bgColor || base.bgColor || '#f8fafc',
    cardBgColor: customConfig?.cardBgColor || base.cardBgColor || '#ffffff',
    textColor: customConfig?.textColor || base.textColor || '#0f172a',
    fontFamily: customConfig?.fontFamily || base.fontFamily || 'sarabun',
    borderRadius: customConfig?.borderRadius || base.borderRadius || 'xl',
    headerStyle: customConfig?.headerStyle || base.headerStyle || 'gradient',
    headerGradientFrom: customConfig?.headerGradientFrom || base.headerGradientFrom || '#1e3a8a',
    headerGradientTo: customConfig?.headerGradientTo || base.headerGradientTo || '#1e40af',
    headerPattern: customConfig?.headerPattern || base.headerPattern || 'thai_motif',
    cardShadow: customConfig?.cardShadow || base.cardShadow || 'md',
    buttonStyle: customConfig?.buttonStyle || base.buttonStyle || 'filled'
  };
}

export function getFontFamilyClass(fontFamily?: string): string {
  switch (fontFamily) {
    case 'prompt':
      return 'font-["Prompt",sans-serif]';
    case 'kanit':
      return 'font-["Kanit",sans-serif]';
    case 'noto_sans':
      return 'font-["Noto_Sans_Thai",sans-serif]';
    case 'inter':
      return 'font-sans';
    case 'sarabun':
    default:
      return 'font-["Sarabun",sans-serif]';
  }
}

export function getBorderRadiusClass(radius?: string): string {
  switch (radius) {
    case 'none':
      return 'rounded-none';
    case 'sm':
      return 'rounded-lg';
    case 'md':
      return 'rounded-xl';
    case 'lg':
      return 'rounded-2xl';
    case 'full':
      return 'rounded-3xl';
    case 'xl':
    default:
      return 'rounded-2xl';
  }
}

export function getCardShadowClass(shadow?: string): string {
  switch (shadow) {
    case 'none':
      return 'shadow-none';
    case 'sm':
      return 'shadow-xs';
    case 'lg':
      return 'shadow-xl';
    case 'glow':
      return 'shadow-2xl shadow-blue-500/20';
    case 'md':
    default:
      return 'shadow-md';
  }
}
