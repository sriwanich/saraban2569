export interface SystemBrandingInfo {
  orgName: string;
  headerOrgName: string;
  garudaLogoUrl: string;
  garuda30Url: string;
  ddpmLogoUrl: string;
  rayongLogoUrl: string;
  systemOrgLogoUrl: string;
  hasCustomGaruda: boolean;
  hasCustomSystemOrgLogo: boolean;
}

const DEFAULT_GARUDA = 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Seal_of_the_Ministry_of_Interior_of_Thailand.svg';
const DEFAULT_RAYONG_SEAL = 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png';
const DEFAULT_DDPM_LOGO = '/ddpm-logo.svg';

export function getSystemBrandingInfo(): SystemBrandingInfo {
  let settings: any = {};
  if (typeof window !== 'undefined') {
    try {
      settings = JSON.parse(localStorage.getItem('moi_settings') || '{}');
    } catch (e) {
      settings = {};
    }
  }

  const localStorageMoiLogo = typeof window !== 'undefined' ? (localStorage.getItem('moi_logo') || localStorage.getItem('moi_schoolLogo')) : null;
  const localStorageGaruda15 = typeof window !== 'undefined' ? (localStorage.getItem('moi_garuda15') || localStorage.getItem('moi_garudaCustom')) : null;
  const localStorageGaruda30 = typeof window !== 'undefined' ? localStorage.getItem('moi_garuda30') : null;

  const garudaLogoUrl = settings.garuda15Url || localStorageGaruda15 || DEFAULT_GARUDA;
  const garuda30Url = settings.garuda30Url || localStorageGaruda30 || garudaLogoUrl;
  const systemOrgLogoUrl = settings.logoUrl || localStorageMoiLogo || DEFAULT_RAYONG_SEAL;

  const orgName = settings.orgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
  const headerOrgName = settings.headerOrgName || orgName;

  return {
    orgName,
    headerOrgName,
    garudaLogoUrl,
    garuda30Url,
    ddpmLogoUrl: DEFAULT_DDPM_LOGO,
    rayongLogoUrl: DEFAULT_RAYONG_SEAL,
    systemOrgLogoUrl,
    hasCustomGaruda: !!(settings.garuda15Url || localStorageGaruda15 || settings.garuda30Url || localStorageGaruda30),
    hasCustomSystemOrgLogo: !!(settings.logoUrl || localStorageMoiLogo)
  };
}

export function getResolvedSurveyLogoUrl(
  headerLogoType?: 'garuda' | 'ddpm' | 'rayong' | 'custom' | 'none',
  customLogoUrl?: string
): string | null {
  if (headerLogoType === 'none') {
    return null;
  }

  // If a custom logo URL is explicitly provided, use it
  if (customLogoUrl && customLogoUrl.trim() !== '') {
    return customLogoUrl;
  }

  const branding = getSystemBrandingInfo();

  if (headerLogoType === 'garuda') {
    return branding.garudaLogoUrl;
  }

  if (headerLogoType === 'ddpm') {
    return branding.ddpmLogoUrl;
  }

  if (headerLogoType === 'rayong') {
    return branding.rayongLogoUrl;
  }

  if (headerLogoType === 'custom') {
    return branding.systemOrgLogoUrl;
  }

  // Default fallback
  return branding.garudaLogoUrl;
}
