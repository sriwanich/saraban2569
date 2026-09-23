export function getResolvedSurveyLogoUrl(typeOrUrl?: string, customUrl?: string, resolvedUrl?: string): string {
  if (resolvedUrl && resolvedUrl.trim()) {
    return resolvedUrl;
  }
  if (customUrl && customUrl.trim()) {
    return customUrl;
  }
  if (!typeOrUrl || typeOrUrl === 'default' || typeOrUrl === 'ddpm') {
    return '/ddpm_logo.png';
  }
  if (typeOrUrl === 'none') {
    return '';
  }
  if (typeOrUrl === 'garuda') {
    return '/garuda_logo.png';
  }
  if (typeOrUrl === 'rayong') {
    return '/rayong_logo.png';
  }
  if (typeOrUrl.startsWith('http://') || typeOrUrl.startsWith('https://') || typeOrUrl.startsWith('data:') || typeOrUrl.startsWith('/')) {
    return typeOrUrl;
  }
  return '/ddpm_logo.png';
}

export function getSystemBrandingInfo() {
  return {
    name: 'ระบบบริหารจัดการแบบสำรวจและแบบข้อสอบ (Survey & Assessment)',
    organizationName: 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
    orgName: 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
    logoUrl: '/ddpm_logo.png',
    garudaLogoUrl: '/garuda_logo.png',
    ddpmLogoUrl: '/ddpm_logo.png',
    rayongLogoUrl: '/rayong_logo.png',
    systemOrgLogoUrl: '/ddpm_logo.png'
  };
}
