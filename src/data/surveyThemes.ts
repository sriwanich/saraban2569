import { SurveyThemeConfig } from '../types/survey';

export const DEFAULT_THEME_CONFIG: SurveyThemeConfig = {
  presetId: 'rayong_azure',
  primaryColor: '#1e40af',
  accentColor: '#3b82f6',
  bgColor: '#f8fafc',
  cardBgColor: '#ffffff',
  textColor: '#0f172a',
  fontFamily: 'prompt',
  borderRadius: 'xl',
  headerStyle: 'gradient',
  headerGradientFrom: '#1e3a8a',
  headerGradientTo: '#3b82f6',
  cardShadow: 'md',
  buttonStyle: 'gradient'
};

export function getMergedThemeConfig(theme?: Partial<SurveyThemeConfig>, primaryColor?: string): SurveyThemeConfig {
  const base = theme ? { ...DEFAULT_THEME_CONFIG, ...theme } : { ...DEFAULT_THEME_CONFIG };
  if (primaryColor) {
    base.primaryColor = primaryColor;
  }
  return base;
}

export function getFontFamilyClass(fontFamily?: string): string {
  switch (fontFamily) {
    case 'prompt':
      return 'font-prompt';
    case 'kanit':
      return 'font-kanit';
    case 'sarabun':
      return 'font-sarabun';
    case 'noto_sans':
      return 'font-sans';
    default:
      return 'font-sans';
  }
}

export function getBorderRadiusClass(borderRadius?: string): string {
  switch (borderRadius) {
    case 'none':
      return 'rounded-none';
    case 'sm':
      return 'rounded-sm';
    case 'md':
      return 'rounded-md';
    case 'lg':
      return 'rounded-lg';
    case 'xl':
      return 'rounded-2xl';
    case 'full':
      return 'rounded-3xl';
    default:
      return 'rounded-2xl';
  }
}

export function getCardShadowClass(shadowStyle?: string): string {
  switch (shadowStyle) {
    case 'none':
      return 'shadow-none';
    case 'sm':
      return 'shadow-sm';
    case 'md':
      return 'shadow-md';
    case 'lg':
      return 'shadow-xl';
    case 'glow':
      return 'shadow-2xl shadow-blue-500/10';
    default:
      return 'shadow-md';
  }
}
