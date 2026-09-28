// System-Wide UX/UI Theme & Design System Engine for EDMS
export interface UxThemeConfig {
  id?: string;
  name?: string;
  primaryColor: string;
  primaryHover: string;
  primaryDark: string;
  accentColor: string;
  successColor: string;
  dangerColor: string;
  warningColor: string;
  bgBase?: string;
  bgSurface?: string;
  borderRadius: 'compact' | 'medium' | 'curved' | 'pill';
  fontSizeScale: number; // 0.9 = compact, 1.0 = standard, 1.1 = large
  fontFamily: 'sarabun' | 'inter' | 'prompt' | 'kanit' | 'noto';
  density: 'compact' | 'comfortable' | 'relaxed';
  headerStyle: 'navy_gradient' | 'dark_slate' | 'clean_white' | 'royal_gold' | 'emerald_eco';
  cardStyle: 'bordered' | 'elevated' | 'glass';
  sidebarPosition: 'left' | 'top_header';
  glassmorphism: boolean;
  customCss?: string;
}

export const DEFAULT_UX_THEME: UxThemeConfig = {
  id: 'ddpm_official',
  name: 'กรมป้องกันและบรรเทาสาธารณภัย (DDPM Official)',
  primaryColor: '#1E3A8A',
  primaryHover: '#1D4ED8',
  primaryDark: '#0F294A',
  accentColor: '#D97706',
  successColor: '#059669',
  dangerColor: '#DC2626',
  warningColor: '#D97706',
  borderRadius: 'curved',
  fontSizeScale: 1.0,
  fontFamily: 'sarabun',
  density: 'comfortable',
  headerStyle: 'navy_gradient',
  cardStyle: 'elevated',
  sidebarPosition: 'left',
  glassmorphism: true,
  customCss: '',
};

export const PRESET_UX_THEMES: UxThemeConfig[] = [
  DEFAULT_UX_THEME,
  {
    id: 'ministry_royal',
    name: 'มหาดไทยทรงคุณค่า (Ministry Royal Navy & Gold)',
    primaryColor: '#0F172A',
    primaryHover: '#1E293B',
    primaryDark: '#020617',
    accentColor: '#B45309',
    successColor: '#047857',
    dangerColor: '#B91C1C',
    warningColor: '#B45309',
    borderRadius: 'medium',
    fontSizeScale: 1.0,
    fontFamily: 'prompt',
    density: 'comfortable',
    headerStyle: 'royal_gold',
    cardStyle: 'bordered',
    sidebarPosition: 'left',
    glassmorphism: false,
    customCss: '',
  },
  {
    id: 'clean_paper_slate',
    name: 'กระดาษมินิมอลสะอาดตา (Clean Paper Modern)',
    primaryColor: '#2563EB',
    primaryHover: '#3B82F6',
    primaryDark: '#1E40AF',
    accentColor: '#475569',
    successColor: '#10B981',
    dangerColor: '#EF4444',
    warningColor: '#F59E0B',
    borderRadius: 'curved',
    fontSizeScale: 1.0,
    fontFamily: 'inter',
    density: 'comfortable',
    headerStyle: 'clean_white',
    cardStyle: 'bordered',
    sidebarPosition: 'left',
    glassmorphism: true,
    customCss: '',
  },
  {
    id: 'cyber_dark_high_contrast',
    name: 'โหมดถนอมสายตาสมัยใหม่ (Cyber Dark Modern)',
    primaryColor: '#0284C7',
    primaryHover: '#38BDF8',
    primaryDark: '#0369A1',
    accentColor: '#F43F5E',
    successColor: '#10B981',
    dangerColor: '#F43F5E',
    warningColor: '#F59E0B',
    borderRadius: 'pill',
    fontSizeScale: 1.05,
    fontFamily: 'kanit',
    density: 'comfortable',
    headerStyle: 'dark_slate',
    cardStyle: 'glass',
    sidebarPosition: 'left',
    glassmorphism: true,
    customCss: '',
  },
  {
    id: 'eco_green_gov',
    name: 'ดิจิทัลเขียวรักษ์โลก (Eco Emerald Digital)',
    primaryColor: '#059669',
    primaryHover: '#10B981',
    primaryDark: '#064E3B',
    accentColor: '#0284C7',
    successColor: '#10B981',
    dangerColor: '#E11D48',
    warningColor: '#D97706',
    borderRadius: 'curved',
    fontSizeScale: 1.0,
    fontFamily: 'noto',
    density: 'comfortable',
    headerStyle: 'emerald_eco',
    cardStyle: 'elevated',
    sidebarPosition: 'left',
    glassmorphism: true,
    customCss: '',
  },
];

const STORAGE_KEY = 'edms_ux_theme_config';

export function getStoredThemeConfig(): UxThemeConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_UX_THEME, ...parsed };
    }
  } catch (e) {
    console.error('Error reading UX theme config:', e);
  }
  return DEFAULT_UX_THEME;
}

export function applyThemeToDOM(config: UxThemeConfig) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Set primary colors
  root.style.setProperty('--primary-color', config.primaryColor);
  root.style.setProperty('--primary-hover', config.primaryHover);
  root.style.setProperty('--primary-dark', config.primaryDark);
  root.style.setProperty('--gov-blue', config.primaryColor);
  root.style.setProperty('--gov-navy', config.primaryDark);

  if (config.accentColor) {
    root.style.setProperty('--gov-gold', config.accentColor);
  }
  if (config.successColor) {
    root.style.setProperty('--success', config.successColor);
  }
  if (config.dangerColor) {
    root.style.setProperty('--danger', config.dangerColor);
  }

  // Border radius map
  const radiusMap = {
    compact: '0.375rem',  // 6px
    medium: '0.5rem',    // 8px
    curved: '0.875rem',  // 14px
    pill: '1.25rem',     // 20px
  };
  root.style.setProperty('--app-border-radius', radiusMap[config.borderRadius] || '0.875rem');

  // Font family map
  const fontMap = {
    sarabun: "'TH SarabunPSK', 'TH Sarabun New', sans-serif",
    inter: "'Inter', sans-serif",
    prompt: "'Prompt', sans-serif",
    kanit: "'Kanit', sans-serif",
    noto: "'Noto Sans Thai', sans-serif",
  };
  root.style.setProperty('--app-font-family', fontMap[config.fontFamily] || fontMap.sarabun);

  // Font scale
  root.style.setProperty('--app-font-scale', `${config.fontSizeScale}`);

  // Density spacing factor
  const densityMap = {
    compact: '0.85',
    comfortable: '1.0',
    relaxed: '1.15',
  };
  root.style.setProperty('--app-density-factor', densityMap[config.density] || '1.0');

  // Inject or update Custom CSS element
  let customStyleEl = document.getElementById('edms-custom-ux-styles');
  if (!customStyleEl) {
    customStyleEl = document.createElement('style');
    customStyleEl.id = 'edms-custom-ux-styles';
    document.head.appendChild(customStyleEl);
  }

  const customCssContent = `
    ${config.customCss || ''}
  `;
  customStyleEl.textContent = customCssContent;
}

export function saveAndApplyThemeConfig(config: UxThemeConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save UX theme config:', e);
  }
  applyThemeToDOM(config);
}

export function resetThemeToDefault(): UxThemeConfig {
  saveAndApplyThemeConfig(DEFAULT_UX_THEME);
  return DEFAULT_UX_THEME;
}

// WCAG Contrast ratio helper
export function getLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return 0.5;
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map(v => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}
