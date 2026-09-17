// Shared types, datasets and builders for ร่างเอกสาร (Draft Documents)

export interface DraftItem {
  id: number;
  dbId?: number;
  type: string;
  docType: string;
  docNum: string;
  date: string;
  to: string;
  subject: string;
  urgency: string;
  secrecy: string;
  body: string;
  content?: string;
  signer: string;
  signerPos: string;
  ref?: string;
  att?: string;
  createdAt?: string;
}

export interface CustomOrderItem {
  id: number;
  doctype: string;
  num: string;
  date: string;
  signdate: string;
  subject: string;
  signer: string;
  signerpos: string;
  place: string;
  body: string;
  garudaSrc?: string | null;
  sealMode?: string;
  createdAt?: string;
}

export interface MeetingItem {
  id: number;
  no: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  closeTime: string;
  title: string;
  venue: string;
  chair: string;
  recorder: string;
  note: string;
  attendees: { name: string; position: string; note: string }[];
  absents: { name: string; reason: string }[];
  agendas: { type: string; title: string; detail: string; resolution: string }[];
  createdAt?: string;
}

export interface AiScanResult {
  docType?: string;
  docNum?: string;
  date?: string;
  urgency?: string;
  secrecy?: string;
  subject?: string;
  to?: string;
  from?: string;
  ref?: string;
  att?: string;
  body?: string;
  signer?: string;
  signerPos?: string;
  rawText?: string;
  confidence?: string;
  confidenceNote?: string;
  
  // Disaster report fields
  incidentTypes?: string[];
  incidentTypeOther?: string;
  severity?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  location?: string;
  affectedPeople?: string;
  affectedHouseholds?: string;
  injured?: string;
  dead?: string;
  missing?: string;
  evacuatedPeople?: string;
  evacuatedHouseholds?: string;
  damageHouses?: string;
  damageFactories?: string;
  damageBuildingCost?: string;
  damageAgricultureCost?: string;
  damagePublicCost?: string;
  totalDamageCost?: string;
  mitigation?: string;
  reporterName?: string;
  reporterPosition?: string;
}

// ── Thai Formatting Helpers ──
export function toThaiNumeral(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[0-9]/g, d => '๐๑๒๓๔๕๖๗๘๙'[parseInt(d, 10)] || d);
}

export function toArabicNumeral(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[๐-๙]/g, d => {
    const idx = '๐๑๒๓๔๕๖๗๘๙'.indexOf(d);
    return idx !== -1 ? String(idx) : d;
  });
}

export function convertHtmlDigitsToThai(html: string): string {
  if (!html) return '';
  // Convert digits that are outside HTML tags (<...>) and outside character entities (&...;)
  return html.replace(/(<[^>]+>)|(&[a-zA-Z0-9#]+;)|([0-9]+)/g, (match, tag, entity, digits) => {
    if (tag) return tag;
    if (entity) return entity;
    return toThaiNumeral(digits);
  });
}

export function convertHtmlDigitsToArabic(html: string): string {
  if (!html) return '';
  return html.replace(/(<[^>]+>)|(&[a-zA-Z0-9#]+;)|([๐-๙]+)/g, (match, tag, entity, digits) => {
    if (tag) return tag;
    if (entity) return entity;
    return toArabicNumeral(digits);
  });
}

export function countArabicDigitsInHtml(html: string): number {
  if (!html) return 0;
  let count = 0;
  html.replace(/(<[^>]+>)|(&[a-zA-Z0-9#]+;)|([0-9])/g, (match, tag, entity, digit) => {
    if (digit) count++;
    return match;
  });
  return count;
}

export function convertDomElementToThaiNumerals(element: HTMLElement | null): number {
  if (!element) return 0;
  let convertedCount = 0;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeValue && /[0-9]/.test(node.nodeValue)) {
      const original = node.nodeValue;
      const matches = original.match(/[0-9]/g);
      if (matches) convertedCount += matches.length;
      node.nodeValue = toThaiNumeral(original);
    }
  }
  return convertedCount;
}

export function convertDomElementToArabicNumerals(element: HTMLElement | null): number {
  if (!element) return 0;
  let convertedCount = 0;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeValue && /[๐-๙]/.test(node.nodeValue)) {
      const original = node.nodeValue;
      const matches = original.match(/[๐-๙]/g);
      if (matches) convertedCount += matches.length;
      node.nodeValue = toArabicNumeral(original);
    }
  }
  return convertedCount;
}

export function thDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '-';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const buddhYear = d.getFullYear() + 543;
    return `${day} ${month} ${buddhYear}`;
  } catch {
    return isoDate;
  }
}

export function thDateFull(isoDate: string | null | undefined): string {
  const t = thDate(isoDate);
  if (!t || t === '-') return '-';
  return toThaiNumeral(t);
}

export const DEFAULT_GARUDA_URL = 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Garuda_Emblem_of_Thailand.svg';
export const DEFAULT_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Seal_Rayong_Province.png';

let _cachedGarudaUrl: { url: string; time: number } | null = null;
let _cachedLogoUrl: { url: string; time: number } | null = null;
const CACHE_TTL = 10000; // 10s cache

export function getGarudaUrl(): string {
  const now = Date.now();
  if (_cachedGarudaUrl && (now - _cachedGarudaUrl.time < CACHE_TTL)) {
    return _cachedGarudaUrl.url;
  }
  try {
    const settings = JSON.parse(localStorage.getItem('moi_settings') || '{}');
    const url = localStorage.getItem('moi_garudaCustom') ||
           localStorage.getItem('moi_garuda30') ||
           localStorage.getItem('moi_garuda15') ||
           settings.garuda30Url ||
           settings.garuda15Url ||
           DEFAULT_GARUDA_URL;
    _cachedGarudaUrl = { url, time: now };
    return url;
  } catch (e) {
    return DEFAULT_GARUDA_URL;
  }
}

export function getLogoUrl(): string {
  const now = Date.now();
  if (_cachedLogoUrl && (now - _cachedLogoUrl.time < CACHE_TTL)) {
    return _cachedLogoUrl.url;
  }
  try {
    const settings = JSON.parse(localStorage.getItem('moi_settings') || '{}');
    const url = localStorage.getItem('moi_logo') ||
           localStorage.getItem('moi_schoolLogo') ||
           settings.logoUrl ||
           DEFAULT_LOGO_URL;
    _cachedLogoUrl = { url, time: now };
    return url;
  } catch (e) {
    return DEFAULT_LOGO_URL;
  }
}

export function getLogoHTML(size = 80, overrideUrl?: string): string {
  const logo = overrideUrl || getLogoUrl();
  return `<div style="text-align:center;margin-bottom:6px;">
    <img src="${logo}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;object-fit:contain;display:inline-block;" alt="ตราประจำหน่วยงาน">
  </div>`;
}

export function getSingleSealHTML(size = 80, overrideUrl?: string): string {
  const garudaSrc = overrideUrl || getGarudaUrl();
  return `<div style="text-align:center;margin-bottom:6px;">
    <img src="${garudaSrc}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;object-fit:contain;display:inline-block;" alt="ตราครุฑ">
  </div>`;
}

// ── Word Export helper ──
export function fallbackDownloadAsDoc(bodyHTML: string, filename = 'document') {
  const wordCSS = `
    @font-face{font-family:'TH SarabunPSK';src:local('TH SarabunPSK'),local('TH Sarabun New'),local('Sarabun New');}
    @page Section1{size:210mm 297mm;margin:25mm 20mm 20mm 30mm;}
    div.Section1{page:Section1;}
    *{font-family:'TH SarabunPSK','TH Sarabun New','Sarabun',sans-serif!important;}
    html,body{font-family:'TH SarabunPSK','Sarabun',sans-serif;font-size:16pt;line-height:1.5;color:#000;background:#fff;margin:0;padding:0;}
    p{font-family:'TH SarabunPSK';font-size:16pt;line-height:1.5;margin:0 0 3pt;text-align:justify;}
    table{border-collapse:collapse;width:100%;margin:5pt 0;}
    td,th{border:1pt solid #555;padding:4pt 7pt;font-size:16pt;line-height:1.5;vertical-align:middle;}
    th{background:#d9d9d9;font-weight:700;text-align:center;}
  `;

  const wordDoc = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title>${filename}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>${wordCSS}</style>
</head>
<body>
<div class="Section1">${bodyHTML}</div>
</body>
</html>`;

  const blob = new Blob(['\ufeff' + wordDoc], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Letter Templates Definition ──
export const LETTER_TYPES = [
  { icon: 'FileText', title: 'หนังสือส่ง', desc: 'ติดต่อราชการกับหน่วยงานอื่น (หนังสือส่ง)', template: 'external' },
  { icon: 'Mail', title: 'หนังสือภายใน', desc: 'บันทึกข้อความภายในหน่วยงาน', template: 'internal' },
  { icon: 'Award', title: 'หนังสือประทับตรา', desc: 'หนังสือประทับตราแทนลงชื่อ', template: 'stamp' },
  { icon: 'CheckSquare', title: 'หนังสือรับรอง', desc: 'ออกหนังสือรับรองบุคคล/หน่วยงาน', template: 'cert' },
  { icon: 'MessageSquare', title: 'หนังสือตอบรับ', desc: 'ตอบรับหนังสือที่ได้รับ', template: 'reply' },
  { icon: 'FileCode', title: 'บันทึกข้อความ', desc: 'บันทึกภายในระหว่างฝ่าย/งาน', template: 'memo' },
  { icon: 'BookOpen', title: 'ระเบียบ', desc: 'ระเบียบปฏิบัติของหน่วยงาน', template: 'regulation' },
  { icon: 'Shield', title: 'ข้อบังคับ', desc: 'ข้อบังคับของหน่วยงาน', template: 'bylaw' },
  { icon: 'Volume2', title: 'แถลงการณ์', desc: 'แถลงการณ์ประชาสัมพันธ์', template: 'statement' },
  { icon: 'Newspaper', title: 'ข่าว', desc: 'ข่าวประชาสัมพันธ์', template: 'news' },
  { icon: 'Send', title: 'หนังสือเวียน (ว.)', desc: 'หนังสือเวียนถึงหลายหน่วยงาน', template: 'circular' },
];

// ── Official Letter Document HTML Builder ──
export function buildOfficialDoc({
  docType, docNum, date, to, subject, ref, att, body, signer, signerPos, urgency, secrecy, orgName,
  deptContact, phone, fax, email
}: {
  docType?: string;
  docNum?: string;
  date?: string;
  to?: string;
  subject?: string;
  ref?: string;
  att?: string;
  body?: string;
  signer?: string;
  signerPos?: string;
  urgency?: string;
  secrecy?: string;
  orgName?: string;
  deptContact?: string;
  phone?: string;
  fax?: string;
  email?: string;
}): string {
  if (docType && (docType.includes('ภายใน') || docType.includes('บันทึก'))) {
    return buildMemoDoc({ docNum, date, to, subject, body, signer, signerPos, urgency, secrecy, orgName, deptContact, phone, fax, email });
  }

  const school = orgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
  const docNumThai = toThaiNumeral(docNum || 'มท ๐๖๑๘/..........');
  const dateThai = thDateFull(date);

  const secrecyStamp = secrecy && secrecy !== 'ไม่ลับ'
    ? `<div style="text-align:center;color:#dc2626;font-size:22pt;font-weight:900;letter-spacing:6pt;line-height:1.1;margin:0 0 4pt;">${secrecy}</div>` : '';

  const urgStamp = urgency && urgency !== 'ปกติ'
    ? `<div style="color:#dc2626;font-size:32pt;font-weight:900;line-height:1;margin:0 0 2pt;">${urgency}</div>` : '';

  const sealHTML = getSingleSealHTML(113);

  const subjectThai = toThaiNumeral(subject || '');
  const refThai = ref ? toThaiNumeral(ref) : '';
  const attThai = att ? toThaiNumeral(att) : '';
  const toThai = to ? toThaiNumeral(to) : '...';

  return `<div style="font-family:'TH SarabunPSK','Sarabun',sans-serif;font-size:16pt;line-height:1.5;max-width:800px;margin:0 auto;padding:0;color:#000;">
${secrecyStamp}
<div style="text-align:center;margin-bottom:6pt;">${sealHTML}</div>

<table width="100%" cellpadding="0" cellspacing="0" style="border:none;border-collapse:collapse;font-size:16pt;line-height:1.5;">
  <tr>
    <td style="border:none;vertical-align:top;padding:0;width:55%;">
      ${urgStamp}ที่&nbsp;&nbsp;${docNumThai}
    </td>
    <td style="border:none;vertical-align:top;text-align:left;padding:0;">
      <div>${school}</div>
    </td>
  </tr>
  <tr>
    <td style="border:none;padding:0;"></td>
    <td style="border:none;padding:8pt 0 0;text-align:left;">
      ${dateThai}
    </td>
  </tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="border:none;border-collapse:collapse;margin-top:8pt;font-size:16pt;line-height:1.5;">
  <tr><td style="border:none;padding:0 0 4pt 0;">เรื่อง&nbsp;&nbsp;${subjectThai}</td></tr>
  <tr><td style="border:none;padding:0 0 4pt 0;">เรียน&nbsp;&nbsp;${toThai}</td></tr>
  ${refThai ? `<tr><td style="border:none;padding:0 0 4pt 0;">อ้างถึง&nbsp;&nbsp;${refThai}</td></tr>` : ''}
  ${attThai ? `<tr><td style="border:none;padding:0 0 4pt 0;">สิ่งที่ส่งมาด้วย&nbsp;&nbsp;${attThai}</td></tr>` : ''}
</table>

<div style="font-size:16pt;line-height:1.5;margin-top:6pt;text-align:justify;">
  ${body || ''}
</div>

<table width="100%" cellpadding="0" cellspacing="0" style="border:none;border-collapse:collapse;margin-top:16pt;">
  <tr>
    <td width="42%" style="border:none;"></td>
    <td width="58%" style="border:none;text-align:center;vertical-align:bottom;padding:0;">
      <div style="font-size:16pt;line-height:1.5;">ขอแสดงความนับถือ</div>
      <div style="height:48pt;"></div>
      <div style="font-size:16pt;line-height:1.5;">(${signer || '..................................'})</div>
      <div style="font-size:16pt;line-height:1.5;">${signerPos || 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด'}</div>
    </td>
  </tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="border:none;border-collapse:collapse;margin-top:24pt;font-size:15pt;line-height:1.4;">
  <tr>
    <td style="border:none;padding:0;">
      <div>${deptContact || 'ฝ่ายยุทธศาสตร์และการจัดการ'}</div>
      <div>โทรศัพท์ ${phone ? toThaiNumeral(phone) : '๐ ๓๘๖๙ ๔๑๐๙'}</div>
      <div>โทรสาร ${fax ? toThaiNumeral(fax) : '๐ ๓๘๖๙ ๔๑๑๐'}</div>
      <div>ไปรษณีย์อิเล็กทรอนิกส์ ${email || 'rayong_dpm@moi.go.th'}</div>
    </td>
  </tr>
</table>
</div>`;
}

export function buildMemoDoc({
  docNum, date, to, subject, body, signer, signerPos, urgency, secrecy, orgName,
  deptContact, phone, fax, email
}: {
  docNum?: string;
  date?: string;
  to?: string;
  subject?: string;
  body?: string;
  signer?: string;
  signerPos?: string;
  urgency?: string;
  secrecy?: string;
  orgName?: string;
  deptContact?: string;
  phone?: string;
  fax?: string;
  email?: string;
}): string {
  const school = orgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
  const docNumThai = toThaiNumeral(docNum || 'มท ๐๖๑๘/..........');
  const dateThai = thDateFull(date);

  const secrecyStamp = secrecy && secrecy !== 'ไม่ลับ'
    ? `<div style="text-align:center;color:#dc2626;font-size:20pt;font-weight:900;letter-spacing:6pt;line-height:1.1;margin:0 0 4pt;">${secrecy}</div>` : '';

  const urgStamp = urgency && urgency !== 'ปกติ'
    ? `<span style="color:#dc2626;font-size:20pt;font-weight:900;margin-right:8pt;">${urgency}</span>` : '';

  const garudaSrc = getGarudaUrl();
  const seal = `<img src="${garudaSrc}" width="57" height="57" style="width:57px;height:57px;object-fit:contain;" alt="ตราครุฑ">`;

  const subjectThai = toThaiNumeral(subject || '');
  const toThai = to ? toThaiNumeral(to) : '...';

  return `<div style="font-family:'TH SarabunPSK','Sarabun',sans-serif;font-size:16pt;line-height:1.5;max-width:800px;margin:0 auto;color:#000;">
${secrecyStamp}
<table width="100%" cellpadding="0" cellspacing="0" style="border:none;border-collapse:collapse;">
  <tr>
    <td style="border:none;width:90px;vertical-align:top;padding:0;">${seal}</td>
    <td style="border:none;text-align:center;vertical-align:middle;padding:0;">
      <span style="font-size:29pt;font-weight:700;">บันทึกข้อความ</span>
    </td>
    <td style="border:none;width:90px;padding:0;"></td>
  </tr>
</table>

<div style="margin-top:6pt;line-height:1.6;">
  <span style="font-size:20pt;font-weight:700;">ส่วนราชการ</span>&nbsp;&nbsp;${deptContact || 'ฝ่ายยุทธศาสตร์และการจัดการ'}&nbsp;&nbsp;${school}&nbsp;&nbsp;โทร.&nbsp;${phone ? toThaiNumeral(phone) : '๐ ๓๘๖๙ ๔๑๐๙'}
</div>
<table width="100%" cellpadding="0" cellspacing="0" style="border:none;border-collapse:collapse;line-height:1.6;">
  <tr>
    <td style="border:none;padding:0;width:55%;">
      ${urgStamp}<span style="font-size:20pt;font-weight:700;">ที่</span>&nbsp;&nbsp;${docNumThai}
    </td>
    <td style="border:none;padding:0;">
      <span style="font-size:20pt;font-weight:700;">วันที่</span>&nbsp;&nbsp;${dateThai}
    </td>
  </tr>
</table>
<div style="line-height:1.6;">
  <span style="font-size:20pt;font-weight:700;">เรื่อง</span>&nbsp;&nbsp;${subjectThai}
</div>
<div style="margin-top:8pt;">เรียน&nbsp;&nbsp;${toThai}</div>

<div style="margin-top:6pt;text-align:justify;">${body || ''}</div>

<table width="100%" cellpadding="0" cellspacing="0" style="border:none;border-collapse:collapse;margin-top:16pt;">
  <tr>
    <td width="45%" style="border:none;"></td>
    <td width="55%" style="border:none;text-align:center;vertical-align:bottom;padding:0;">
      <div style="height:48pt;"></div>
      <div style="font-size:16pt;line-height:1.5;">(${signer || '..................................'})</div>
      <div style="font-size:16pt;line-height:1.5;">${signerPos || 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด'}</div>
    </td>
  </tr>
</table>
</div>`;
}

// ── Order Authority Presets ──
export const ORDER_AUTHORITY: Record<string, string> = {
  // 1. งานป้องกันและบรรเทาสาธารณภัย
  appoint_disaster_center: `อาศัยอำนาจตามมาตรา ๑๕ และมาตรา ๒๑ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐`,
  appoint_disaster_cmd: `อาศัยอำนาจตามมาตรา ๑๕ และมาตรา ๒๒ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐`,
  appoint_road_safety: `อาศัยอำนาจตามมาตรา ๑๕ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐ ประกอบมติคณะกรรมการศูนย์อำนวยการความปลอดภัยทางถนน`,
  appoint_eval_team: `อาศัยอำนาจตามมาตรา ๑๙ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐`,
  appoint_rescue_team: `อาศัยอำนาจตามมาตรา ๑๙ และมาตรา ๒๑ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐`,
  appoint_oppor: `อาศัยอำนาจตามมาตรา ๔๑ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐ และระเบียบกระทรวงมหาดไทยว่าด้วยอาสาสมัครป้องกันภัยฝ่ายพลเรือน พ.ศ. ๒๕๕๓`,
  appoint_relief_com: `อาศัยอำนาจตามระเบียบกระทรวงการคลังว่าด้วยเงินทดรองราชการเพื่อช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน พ.ศ. ๒๕๖๒`,
  appoint_drill_com: `อาศัยอำนาจตามมาตรา ๑๑ และมาตรา ๑๖ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐`,

  // 2. งานบริหารองค์กรและบุคลากร สนง.ปภ.จ.
  appoint_office_board: `อาศัยอำนาจตามระเบียบบริหารราชการแผ่นดิน พ.ศ. ๒๕๓๔ และกฎกระทรวงแบ่งส่วนราชการกรมป้องกันและบรรเทาสาธารณภัย`,
  appoint_head_division: `อาศัยอำนาจตามพระราชบัญญัติระเบียบข้าราชการพลเรือน พ.ศ. ๒๕๕๑`,
  appoint_duty_annual: `อาศัยอำนาจตามพระราชบัญญัติระเบียบข้าราชการพลเรือน พ.ศ. ๒๕๕๑ และกฎกระทรวงแบ่งส่วนราชการกรมป้องกันและบรรเทาสาธารณภัย`,
  appoint_act_head: `อาศัยอำนาจตามมาตรา ๔๔ และมาตรา ๔๕ แห่งพระราชบัญญัติระเบียบบริหารราชการแผ่นดิน พ.ศ. ๒๕๓๔ และที่แก้ไขเพิ่มเติม`,
  appoint_guard_ddpm: `อาศัยอำนาจตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยการรักษาความปลอดภัยแห่งชาติ พ.ศ. ๒๕๕๒`,
  appoint_welfare_ddpm: `อาศัยอำนาจตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยการจัดสวัสดิการภายในส่วนราชการ พ.ศ. ๒๕๔๗`,
  appoint_eval_personnel: `อาศัยอำนาจตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยพนักงานราชการ พ.ศ. ๒๕๔๗`,
  appoint_audit_internal: `อาศัยอำนาจตามระเบียบกระทรวงการคลังว่าด้วยการตรวจสอบภายในของส่วนราชการ พ.ศ. ๒๕๕๑`,

  // 3. งานครุภัณฑ์กู้ภัย พัสดุ และจัดซื้อจัดจ้าง
  appoint_rescue_procure: `อาศัยอำนาจตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐ มาตรา ๓๒ และมาตรา ๓๖`,
  appoint_rescue_inspect: `อาศัยอำนาจตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐ มาตรา ๑๐๓`,
  appoint_rescue_price: `อาศัยอำนาจตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐ มาตรา ๓๒`,
  appoint_rescue_dispose: `อาศัยอำนาจตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐`,

  // 4. งานการเงิน งบประมาณ และเงินทดรองราชการ
  appoint_emergency_finance: `อาศัยอำนาจตามระเบียบกระทรวงการคลังว่าด้วยเงินทดรองราชการเพื่อช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน พ.ศ. ๒๕๖๒`,
  appoint_disaster_audit: `อาศัยอำนาจตามระเบียบกระทรวงการคลังว่าด้วยเงินทดรองราชการเพื่อช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน พ.ศ. ๒๕๖๒`,
  appoint_budget_ddpm: `อาศัยอำนาจตามพระราชบัญญัติวิธีการงบประมาณ พ.ศ. ๒๕๖๑`,

  // 5. การเดินทางไปราชการ / ฝึกอบรม / ปฏิบัติการกู้ภัย
  travel_field_rescue: `อาศัยอำนาจตามระเบียบกระทรวงการคลังว่าด้วยการเบิกจ่ายค่าใช้จ่ายในการเดินทางไปราชการ พ.ศ. ๒๕๕๐ และที่แก้ไขเพิ่มเติม`,
  attend_ddpm_training: `อาศัยอำนาจตามระเบียบกระทรวงการคลังว่าด้วยค่าใช้จ่ายในการฝึกอบรม การจัดงาน และการประชุมภาคเอกชนและภาครัฐ พ.ศ. ๒๕๔๙`,
  travel_nation_mission: `อาศัยอำนาจตามระเบียบกระทรวงการคลังว่าด้วยการเบิกจ่ายค่าใช้จ่ายในการเดินทางไปราชการ พ.ศ. ๒๕๕๐`,
  study_disaster_trip: `อาศัยอำนาจตามระเบียบกระทรวงการคลังว่าด้วยค่าใช้จ่ายในการฝึกอบรม พ.ศ. ๒๕๔๙`,
  travel_disaster_survey: `อาศัยอำนาจตามระเบียบกระทรวงการคลังว่าด้วยการเบิกจ่ายค่าใช้จ่ายในการเดินทางไปราชการ พ.ศ. ๒๕๕๐ และมาตรา ๑๙ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐`,
  appoint_flood_survey: `อาศัยอำนาจตามระเบียบกระทรวงการคลังว่าด้วยเงินทดรองราชการเพื่อช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน พ.ศ. ๒๕๖๒ และมาตรา ๑๙ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐`,
  appoint_it_security: `อาศัยอำนาจตามพระราชบัญญัติการรักษาความมั่นคงปลอดภัยไซเบอร์ พ.ศ. ๒๕๖๒ และพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. ๒๕๖๒`,
  appoint_inventory_audit: `อาศัยอำนาจตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖โ ข้อ ๒๑๓`,
  appoint_vehicle_maint: `อาศัยอำนาจตามระเบียบว่าด้วยการใช้รถราชการ พ.ศ. ๒๕๒๓ และที่แก้ไขเพิ่มเติม`,
  appoint_cashier_guard: `อาศัยอำนาจตามระเบียบการเบิกจ่ายเงินจากคลัง การเก็บรักษาเงิน และการนำเงินส่งคลัง พ.ศ. ๒๕๖๒`,
  appoint_budget_eval: `อาศัยอำนาจตามพระราชบัญญัติวิธีการงบประมาณ พ.ศ. ๒๕๖๑ และระเบียบบริหารราชการแผ่นดิน พ.ศ. ๒๕๓๔`,

  // 6. ประกาศ สำนักงาน ปภ.จังหวัด / จังหวัด
  announce_disaster_zone: `อาศัยอำนาจตามระเบียบกระทรวงการคลังว่าด้วยเงินทดรองราชการเพื่อช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน พ.ศ. ๒๕๖๒ ข้อ ๒๐`,
  announce_warning_disaster: `อาศัยอำนาจตามมาตรา ๒๒ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐`,
  announce_no_burn: `อาศัยอำนาจตามมาตรา ๑๕ และมาตรา ๒๒ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐ และมาตรา ๒๑ แห่งพระราชบัญญัติส่งเสริมและรักษาคุณภาพสิ่งแวดล้อมแห่งชาติ`,
  announce_road_campaign: `อาศัยอำนาจตามแผนบูรณาการป้องกันและลดอุบัติเหตุทางถนนแห่งชาติ`,
  announce_enroll_ddpm: `อาศัยอำนาจตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยพนักงานราชการ พ.ศ. ๒๕๔๗`,
  announce_result_ddpm: `อาศัยอำนาจตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยพนักงานราชการ พ.ศ. ๒๕๔๗`,
  announce_procure_rescue: `อาศัยอำนาจตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐`,
  announce_winner_rescue: `อาศัยอำนาจตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐ มาตรา ๖๖`,
  announce_oppor_award: `อาศัยอำนาจตามระเบียบกระทรวงมหาดไทยว่าด้วยอาสาสมัครป้องกันภัยฝ่ายพลเรือน พ.ศ. ๒๕๕๓`,
  announce_emergency_hotline: `อาศัยอำนาจตามพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐`,
  announce_disaster_plan: `อาศัยอำนาจตามมาตรา ๑๑ แห่งพระราชบัญญัติป้องกันและบรรเทาสาธารณภัย พ.ศ. ๒๕๕๐`,
};

export const ORDER_DATA = [
  {
    group: '🚨 งานป้องกันและบรรเทาสาธารณภัย', items: [
      { id: 'appoint_disaster_center', title: 'คำสั่งจัดตั้งศูนย์บัญชาการเหตุการณ์อุทกภัย วาตภัย และดินโคลนถล่ม', type: 'order' },
      { id: 'appoint_disaster_cmd', title: 'คำสั่งจัดตั้งศูนย์บัญชาการเหตุการณ์ภัยแล้ง ไฟป่า และ PM2.5', type: 'order' },
      { id: 'appoint_road_safety', title: 'คำสั่งจัดตั้งศูนย์ปฏิบัติการป้องกันและลดอุบัติเหตุทางถนนช่วงเทศกาล', type: 'order' },
      { id: 'appoint_eval_team', title: 'คำสั่งแต่งตั้งคณะทำงานตรวจประเมินความพร้อมเครื่องมือกู้ภัย', type: 'order' },
      { id: 'appoint_rescue_team', title: 'คำสั่งแต่งตั้งชุดปฏิบัติการฉุกเฉินและเผชิญเหตุประจำ สนง.ปภ.จ.', type: 'order' },
      { id: 'appoint_oppor', title: 'คำสั่งแต่งตั้งคณะกรรมการส่งเสริมและพัฒนาระบบ อปพร. จังหวัด', type: 'order' },
      { id: 'appoint_relief_com', title: 'คำสั่งแต่งตั้งคณะกรรมการพิจารณาช่วยเหลือผู้ประสบสาธารณภัย', type: 'order' },
      { id: 'appoint_drill_com', title: 'คำสั่งแต่งตั้งคณะทำงานฝึกซ้อมแผนป้องกันและบรรเทาสาธารณภัยจังหวัด', type: 'order' },
      { id: 'appoint_flood_survey', title: 'คำสั่งแต่งตั้งคณะทำงานสำรวจความเสียหายและประเมินมูลค่าทรัพย์สินผู้ประสบอุทกภัย', type: 'order' },
    ]
  },
  {
    group: '🏢 งานบริหารองค์กรและบุคลากร', items: [
      { id: 'appoint_office_board', title: 'คำสั่งแต่งตั้งคณะกรรมการบริหารสำนักงาน ปภ.จังหวัด', type: 'order' },
      { id: 'appoint_head_division', title: 'คำสั่งแต่งตั้งหัวหน้าฝ่าย/กลุ่มงานในสังกัด สนง.ปภ.จ.', type: 'order' },
      { id: 'appoint_duty_annual', title: 'คำสั่งมอบหมายหน้าที่การปฏิบัติงานบุคลากรประจำปีงบประมาณ', type: 'order' },
      { id: 'appoint_act_head', title: 'คำสั่งแต่งตั้งผู้รักษาราชการแทนหัวหน้าสำนักงาน ปภ.จังหวัด', type: 'order' },
      { id: 'appoint_guard_ddpm', title: 'คำสั่งแต่งตั้งเวรรักษาการณ์สถานที่ราชการและคลังเครื่องมือกู้ภัย', type: 'order' },
      { id: 'appoint_welfare_ddpm', title: 'คำสั่งแต่งตั้งคณะกรรมการสวัสดิการเจ้าหน้าที่ สนง.ปภ.จ.', type: 'order' },
      { id: 'appoint_eval_personnel', title: 'คำสั่งแต่งตั้งคณะกรรมการประเมินผลการปฏิบัติงานพนักงานราชการ', type: 'order' },
      { id: 'appoint_audit_internal', title: 'คำสั่งแต่งตั้งคณะกรรมการตรวจสอบและควบคุมภายใน', type: 'order' },
      { id: 'appoint_it_security', title: 'คำสั่งแต่งตั้งคณะทำงานรักษาความมั่นคงปลอดภัยไซเบอร์และสารสนเทศ', type: 'order' },
    ]
  },
  {
    group: '🚜 งานครุภัณฑ์กู้ภัยและจัดซื้อจัดจ้าง', items: [
      { id: 'appoint_rescue_procure', title: 'คำสั่งแต่งตั้งคณะกรรมการจัดซื้อจัดจ้างเครื่องมือกู้ภัย', type: 'order' },
      { id: 'appoint_rescue_inspect', title: 'คำสั่งแต่งตั้งคณะกรรมการตรวจรับพัสดุและเครื่องจักรกลกู้ภัย', type: 'order' },
      { id: 'appoint_rescue_price', title: 'คำสั่งแต่งตั้งคณะกรรมการกำหนดราคากลางจัดซื้ออุปกรณ์กู้ภัย', type: 'order' },
      { id: 'appoint_rescue_dispose', title: 'คำสั่งแต่งตั้งคณะกรรมการจำหน่ายครุภัณฑ์กู้ภัยชำรุดเสื่อมสภาพ', type: 'order' },
      { id: 'appoint_inventory_audit', title: 'คำสั่งแต่งตั้งคณะกรรมการตรวจสอบพัสดุและคลังครุภัณฑ์ประจำปี', type: 'order' },
      { id: 'appoint_vehicle_maint', title: 'คำสั่งแต่งตั้งคณะทำงานตรวจสภาพและซ่อมบำรุงยานพาหนะเครื่องจักรกู้ภัย', type: 'order' },
    ]
  },
  {
    group: '💰 งานการเงินและเงินทดรองราชการ', items: [
      { id: 'appoint_emergency_finance', title: 'คำสั่งแต่งตั้งคณะกรรมการบริหารเงินทดรองราชการช่วยผู้ประสบภัย', type: 'order' },
      { id: 'appoint_disaster_audit', title: 'คำสั่งแต่งตั้งคณะกรรมการตรวจสอบการจ่ายเงินช่วยเหลือผู้ประสบภัย', type: 'order' },
      { id: 'appoint_budget_ddpm', title: 'คำสั่งแต่งตั้งคณะกรรมการบริหารงบประมาณ สนง.ปภ.จ.', type: 'order' },
      { id: 'appoint_cashier_guard', title: 'คำสั่งแต่งตั้งกรรมการเก็บรักษาเงินและตรวจสอบเงินสดคงเหลือประจำวัน', type: 'order' },
      { id: 'appoint_budget_eval', title: 'คำสั่งแต่งตั้งคณะทำงานติดตามและประเมินผลการใช้จ่ายงบประมาณ', type: 'order' },
    ]
  },
  {
    group: '🚒 การเดินทางไปราชการ/ปฏิบัติการกู้ภัย', items: [
      { id: 'travel_field_rescue', title: 'คำสั่งอนุมัติให้ชุดกู้ภัยเดินทางไปปฏิบัติราชการช่วยเหลือผู้ประสบภัย', type: 'order' },
      { id: 'attend_ddpm_training', title: 'คำสั่งให้บุคลากรเข้ารับการฝึกอบรมหลักสูตรกู้ภัยและการจัดการภัยพิบัติ', type: 'order' },
      { id: 'travel_nation_mission', title: 'คำสั่งอนุมัตินำชุดกู้ภัยสนับสนุนภารกิจบรรเทาสาธารณภัยระดับประเทศ', type: 'order' },
      { id: 'study_disaster_trip', title: 'คำสั่งอนุมัติเดินทางเข้าร่วมสัมมนาและฝึกซ้อมแผนกู้ภัยระดับภูมิภาค', type: 'order' },
      { id: 'travel_disaster_survey', title: 'คำสั่งอนุมัติเดินทางไปปฏิบัติราชการสำรวจจุดเสี่ยงและจัดทำแผนผังพื้นที่ภัยพิบัติ', type: 'order' },
    ]
  },
  {
    group: '📢 ประกาศ ปภ.จังหวัด/จังหวัด', items: [
      { id: 'announce_disaster_zone', title: 'ประกาศ เขตการให้ความช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน', type: 'announce' },
      { id: 'announce_warning_disaster', title: 'ประกาศ แจ้งเตือนภัยพิบัติทางธรรมชาติและแนวทางปฏิบัติสำหรับประชาชน', type: 'announce' },
      { id: 'announce_no_burn', title: 'ประกาศ มาตรการห้ามเผาในที่โล่งเด็ดขาดและป้องกัน PM2.5 จังหวัด', type: 'announce' },
      { id: 'announce_road_campaign', title: 'ประกาศ มาตรการป้องกันและลดอุบัติเหตุทางถนนช่วงเทศกาล', type: 'announce' },
      { id: 'announce_enroll_ddpm', title: 'ประกาศ รับสมัครพนักงานราชการ/ลูกจ้าง สนง.ปภ.จ.', type: 'announce' },
      { id: 'announce_result_ddpm', title: 'ประกาศ ผลการคัดเลือกพนักงานราชการ สนง.ปภ.จ.', type: 'announce' },
      { id: 'announce_procure_rescue', title: 'ประกาศ ประกวดราคาจัดซื้อยานพาหนะและเครื่องจักรกลกู้ภัย', type: 'announce' },
      { id: 'announce_winner_rescue', title: 'ประกาศ ผู้ชนะการเสนอราคาจัดซื้อจัดจ้างวัสดุช่วยเหลือผู้ประสบภัย', type: 'announce' },
      { id: 'announce_oppor_award', title: 'ประกาศ เชิดชูเกียรติอาสาสมัครป้องกันภัยฝ่ายพลเรือน (อปพร.) ดีเด่น', type: 'announce' },
      { id: 'announce_emergency_hotline', title: 'ประกาศ ช่องทางแจ้งเหตุสาธารณภัยตลอด ๒๔ ชั่วโมง (สายด่วน ๑๗๘๔)', type: 'announce' },
      { id: 'announce_disaster_plan', title: 'ประกาศ แผนป้องกันและบรรเทาสาธารณภัยจังหวัดประจำปี', type: 'announce' },
    ]
  }
];

export function getOrderBackground(id: string, orgName: string, foundTitle?: string): string {
  const org = orgName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด';
  const bgMap: Record<string, string> = {
    appoint_disaster_center: `ด้วย จังหวัดมีความจำเป็นต้องเตรียมความพร้อมรับมือสถานการณ์อุทกภัย วาตภัย และดินโคลนถล่ม เพื่อให้การอำนวยการ บัญชาการ และประสานการปฏิบัติในการป้องกันและบรรเทาสาธารณภัยเป็นไปด้วยความรวดเร็วและมีประสิทธิภาพสูงสุด`,
    appoint_disaster_cmd: `ด้วย ในช่วงฤดูแล้งจังหวัดมักประสบปัญหาภัยแล้ง ไฟป่า หมอกควัน และฝุ่นละอองขนาดเล็ก (PM2.5) ซึ่งส่งผลกระทบต่อสุขภาพและชีวิตความเป็นอยู่ของประชาชน จึงต้องจัดตั้งศูนย์บัญชาการเหตุการณ์เพื่อบูรณาการการแก้ไขปัญหาอย่างใกล้ชิด`,
    appoint_road_safety: `ด้วย ช่วงเทศกาลมีวันหยุดต่อเนื่อง ประชาชนเดินทางกลับภูมิลำเนาและท่องเที่ยวเป็นจำนวนมาก มีความเสี่ยงต่อการเกิดอุบัติเหตุทางถนน จึงต้องจัดตั้งศูนย์ปฏิบัติการป้องกันและลดอุบัติเหตุทางถนนเพื่อควบคุมความปลอดภัยเข้มข้น`,
    appoint_eval_team: `ด้วย ${org} มีความจำเป็นต้องตรวจสอบและประเมินความพร้อมของเครื่องมือ อุปกรณ์ ยานพาหนะ และเครื่องจักรกลกู้ภัย เพื่อให้พร้อมใช้งานในการเผชิญเหตุสาธารณภัยตลอด ๒๔ ชั่วโมง`,
    appoint_rescue_team: `ด้วย ${org} มีภารกิจหลักในการเข้าช่วยเหลือผู้ประสบภัยพิบัติอย่างทันท่วงที จึงต้องแต่งตั้งชุดปฏิบัติการฉุกเฉินและเผชิญเหตุเพื่อเตรียมพร้อมออกปฏิบัติการกู้ภัย`,
    appoint_oppor: `ด้วย ${org} มีความจำเป็นต้องส่งเสริม พัฒนา และกำกับดูแลเครือข่ายอาสาสมัครป้องกันภัยฝ่ายพลเรือน (อปพร.) ในพื้นที่จังหวัด ให้มีความรู้ความสามารถและสนับสนุนภารกิจบรรเทาสาธารณภัยได้อย่างมีประสิทธิภาพ`,
    appoint_relief_com: `ด้วย เกิดเหตุสาธารณภัยในพื้นที่จังหวัด ส่งผลให้ประชาชนได้รับความเดือดร้อน จึงต้องแต่งตั้งคณะกรรมการเพื่อพิจารณากลั่นกรองการจ่ายเงินชดเชยและช่วยเหลือผู้ประสบภัยให้เป็นไปตามระเบียบกระทรวงการคลัง`,
    appoint_office_board: `ด้วย ${org} มีภารกิจขับเคลื่อนงานยุทธศาสตร์และปฏิบัติตามนโยบายด้านความปลอดภัยและภัยพิบัติ จึงต้องแต่งตั้งคณะกรรมการบริหารสำนักงานเพื่อกำกับติดตามการปฏิบัติงาน`,
    appoint_duty_annual: `ด้วย ${org} มีความจำเป็นต้องมอบหมายหน้าที่การปฏิบัติงานของข้าราชการ พนักงานราชการ และลูกจ้าง ประจำปีงบประมาณ เพื่อให้งานบริหารราชการและการบรรเทาสาธารณภัยดำเนินไปด้วยความเรียบร้อย`,
    appoint_act_head: `ด้วย หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด มีภารกิจไปปฏิบัติราชการนอกพื้นที่/ติดภารกิจ จึงต้องแต่งตั้งผู้รักษาราชการแทน เพื่อให้การบริหารจัดการดำเนินไปอย่างต่อเนื่อง`,
    appoint_rescue_procure: `ด้วย ${org} มีความจำเป็นต้องดำเนินการจัดซื้อจัดจ้างเครื่องมือกู้ภัยและอุปกรณ์บรรเทาสาธารณภัย เพื่อเพิ่มประสิทธิภาพในการช่วยเหลือผู้ประสบภัย จึงต้องแต่งตั้งคณะกรรมการจัดซื้อจัดจ้างตามพระราชบัญญัติการจัดซื้อจัดจ้างและบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖โ`,
    travel_field_rescue: `ด้วย ${org} มีความจำเป็นต้องส่งชุดปฏิบัติการกู้ภัยพร้อมเครื่องมือและยานพาหนะ เดินทางไปปฏิบัติราชการช่วยเหลือผู้ประสบภัยพิบัติ ณ พื้นที่รับผิดชอบ`,
    attend_ddpm_training: `ด้วย ${org} ได้ส่งบุคลากรเข้าร่วมการฝึกอบรมและทดสอบสมรรถนะด้านการกู้ภัยและการจัดการสาธารณภัย เพื่อเพิ่มศักยภาพในการปฏิบัติงาน`,
    announce_disaster_zone: `ด้วย ได้เกิดเหตุสาธารณภัยขึ้นในพื้นที่จังหวัด ก่อให้เกิดความเสียหายแก่ทรัพย์สิน บ้านเรือน และพื้นที่การเกษตรของประชาชน จึงมีความจำเป็นต้องประกาศเขตการให้ความช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน เพื่อให้ส่วนราชการที่เกี่ยวข้องนำเงินทดรองราชการเข้าช่วยเหลือโดยเร็ว`,
    announce_warning_disaster: `ด้วย กรมอุตุนิยมวิทยาและกองอำนวยการป้องกันและบรรเทาสาธารณภัยแห่งชาติ ได้แจ้งเตือนสภาพอากาศแปรปรวน อาจเกิดฝนตกหนักและน้ำท่วมฉับพลัน จึงขอประกาศแจ้งเตือนภัยและให้ประชาชนเตรียมพร้อมรับมือ`,
    announce_no_burn: `ด้วย จังหวัดประสบปัญหาหมอกควันและฝุ่นละอองขนาดเล็ก (PM2.5) เกินค่ามาตรฐาน จึงประกาศกำหนดเขตควบคุมการเผาและห้ามเผาในที่โล่งเด็ดขาด เพื่อป้องกันภัยพิบัติทางอากาศ`,
  };
  return bgMap[id] || `ด้วย ${org} มีความจำเป็นต้องดำเนินการ${foundTitle ? foundTitle.replace('คำสั่ง', '').replace('ประกาศ', '') : 'ตามภารกิจ'} เพื่อให้การบริหารจัดการงานป้องกันและบรรเทาสาธารณภัยเป็นไปด้วยความเรียบร้อยและมีประสิทธิภาพสูงสุด`;
}

// ── Speech Templates (100+ แบบฟอร์มคำกล่าว) ──
export const SPEECH_DATA = [
  {
    group: '🇹🇭 วันสำคัญแห่งชาติ ราชสำนัก และพิธีการถวายพระพร', level: 'all', items: [
      {
        id: 'national_day',
        type: 'national',
        title: 'คำกล่าวเนื่องในวันชาติ / วันเฉลิมพระชนมพรรษา',
        content: (d: any) => `<p style="text-align:center;font-size:16pt;font-weight:bold;margin:0 0 4pt;">คำกล่าวถวายพระพรชัยมงคล</p>
<p style="text-align:center;font-size:15pt;margin:0 0 2pt;">เนื่องในโอกาสวันเฉลิมพระชนมพรรษา ประจำปีพุทธศักราช ${d.year || '๒๕๖๙'}</p>
<p style="text-align:center;font-size:14pt;margin:0 0 12pt;">${d.schoolName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'}</p>
<p style="text-indent:3em;margin:0 0 8pt;">ขอเดชะฝ่าละอองบังคลธุลีพระบาทปกเกล้าปกกระหม่อม</p>
<p style="text-indent:3em;margin:0 0 8pt;">ข้าพระพุทธเจ้า ${d.speaker || 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด'} พร้อมด้วยข้าราชการ พนักงานราชการ และเจ้าหน้าที่ปฏิบัติการกู้ภัย ขอน้อมเกล้าน้อมกระหม่อมถวายพระพรชัยมงคล แด่พระบาทสมเด็จพระปรเมนทรรามาธิบดีศรีสินทรมหาวชิราลงกรณ พระวชิรเกล้าเจ้าอยู่หัว ด้วยความจงรักภักดีและสำนึกในพระมหากรุณาธิคุณเป็นล้นพ้น</p>
<p style="text-indent:3em;margin:0 0 8pt;">ขออัญเชิญคุณพระศรีรัตนตรัยและสิ่งศักดิ์สิทธิ์ในสากลโลก ได้โปรดอภิบาลประทานพรให้พระองค์ทรงพระเจริญด้วยจตุรพิธพรชัย ทรงพระเกษมสำราญ พระบรมเดชานุภาพแผ่พายพาย สถิตเป็นฉัตรแก้วร่มเกล้าของปวงชนชาวไทยตราบกาลนาน</p>
<p style="text-indent:3em;margin:0 0 8pt;">ด้วยเกล้าด้วยกระหม่อม ขอเดชะ</p>`
      },
      {
        id: 'queen_birthday',
        type: 'national',
        title: 'คำกล่าวเนื่องในวันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ พระบรมราชินี',
        content: (d: any) => `<p style="text-align:center;font-size:16pt;font-weight:bold;margin:0 0 4pt;">คำกล่าวถวายพระพรชัยมงคล</p>
<p style="text-align:center;font-size:15pt;margin:0 0 2pt;">เนื่องในโอกาสวันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสุทิดา พัชรสุธาพิมลลักษณ พระบรมราชินี</p>
<p style="text-align:center;font-size:14pt;margin:0 0 12pt;">${d.schoolName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด'}</p>
<p style="text-indent:3em;margin:0 0 8pt;">ขอเดชะฝ่าละอองอุลีพระบาทปกเกล้าปกกระหม่อม</p>
<p style="text-indent:3em;margin:0 0 8pt;">ข้าพระพุทธเจ้า คณะผู้บริหาร ข้าราชการ และพนักงานในสังกัด ${d.schoolName || 'สำนักงาน ปภ.จังหวัด'} มีความปิติโสมนัสเป็นล้นพ้นที่ได้มาร่วมชุมนุมพร้อมเพรียงกัน ถวายพระพรชัยมงคลด้วยความสำนึกในพระมหากรุณาธิคุณที่พระองค์ทรงมีต่อปวงชนชาวไทย</p>
<p style="text-indent:3em;margin:0 0 8pt;">ด้วยเกล้าด้วยกระหม่อม ขอเดชะ</p>`
      },
      {
        id: 'queen_mother_birthday',
        type: 'national',
        title: 'คำกล่าวเนื่องในวันแม่แห่งชาติ (๑๒ สิงหาคม)',
        content: (d: any) => `<p style="text-align:center;font-size:16pt;font-weight:bold;margin:0 0 4pt;">คำกล่าวถวายพระพรชัยมงคล</p>
<p style="text-align:center;font-size:15pt;margin:0 0 2pt;">เนื่องในวันแม่แห่งชาติ ๑๒ สิงหาคม ประจำปีพุทธศักราช ${d.year || '๒๕๖๙'}</p>
<p style="text-indent:3em;margin:0 0 8pt;">ข้าพระพุทธเจ้า คณะข้าราชการและบุคลากร ${d.schoolName || 'สำนักงาน ปภ.จังหวัด'} น้อมเกล้าฯ ถวายพระพรชัยมงคลแด่ สมเด็จพระนางเจ้าสิริกิติ์ พระบรมราชินีนาถ พระบรมราชชนนีพันปีหลวง ขอพระองค์ทรงพระเจริญยิ่งยืนนาน</p>`
      },
      {
        id: 'father_day',
        type: 'national',
        title: 'คำกล่าวเนื่องในวันพ่อแห่งชาติ ๕ ธันวาคม',
        content: (d: any) => `<p style="text-align:center;font-size:16pt;font-weight:bold;margin:0 0 4pt;">คำกล่าวถวายราชสดุดี</p>
<p style="text-align:center;font-size:15pt;margin:0 0 2pt;">เนื่องในวันคล้ายวันพระบรมราชสมภพ พระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร</p>
<p style="text-indent:3em;margin:0 0 8pt;">ข้าพระพุทธเจ้า คณะผู้บริหาร ข้าราชการ และพนักงาน ขอน้อมรำลึกในพระมหากรุณาธิคุณอันหาที่สุดมิได้ ที่ทรงปฏิบัติพระราชกรณียกิจเพื่อนัยประโยชน์สุขแก่ปวงชนชาวไทยตลอดมา</p>`
      },
      { id: 'chakri_day', type: 'national', title: 'คำกล่าวเนื่องในวันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช และวันที่ระลึกมหาจักรีบรมราชวงศ์ (๖ เมษายน)', content: (d: any) => buildStandardSpeechHtml('คำกล่าวถวายราชสดุดี วันมหาจักรีบรมราชวงศ์', d) },
      { id: 'piya_day', type: 'national', title: 'คำกล่าวเนื่องในวันคล้ายวันสวรรคต พระบาทสมเด็จพระจุลจอมเกล้าเจ้าอยู่หัว (วันปิยมหาราช ๒๓ ตุลาคม)', content: (d: any) => buildStandardSpeechHtml('คำกล่าวถวายราชสดุดี วันปิยมหาราช', d) },
      { id: 'navamin_day', type: 'national', title: 'คำกล่าวเนื่องในวันนวมินทรมหาราช (๑๓ ตุลาคม)', content: (d: any) => buildStandardSpeechHtml('คำกล่าว น้อมรำลึกในพระมหากรุณาธิคุณ วันนวมินทรมหาราช', d) },
      { id: 'flag_day', type: 'national', title: 'คำกล่าวเนื่องในวันพระราชทานธงชาติไทย (๒๘ กันยายน)', content: (d: any) => buildStandardSpeechHtml('คำกล่าวเนื่องในวันพระราชทานธงชาติไทย (Thai National Flag Day)', d) },
      { id: 'chatramongkol_day', type: 'national', title: 'คำกล่าวเนื่องในวันฉัตรมงคล (๔ พฤษภาคม)', content: (d: any) => buildStandardSpeechHtml('คำกล่าวถวายพระพรชัยมงคล เนื่องในวันฉัตรมงคล', d) },
      { id: 'constitution_day', type: 'national', title: 'คำกล่าวเนื่องในวันรัฐธรรมนูญ (๑๐ ธันวาคม)', content: (d: any) => buildStandardSpeechHtml('คำกล่าวเนื่องในวันรัฐธรรมนูญแห่งราชอาณาจักรไทย', d) },
      { id: 'damrong_day', type: 'national', title: 'คำกล่าวเนื่องในวันดำรงราชานุภาพ (๑ ธันวาคม)', content: (d: any) => buildStandardSpeechHtml('คำกล่าวสดุดี สมเด็จพระเจ้าบรมวงศ์เธอ กรมพระยาดำรงราชานุภาพ เนื่องในวันดำรงราชานุภาพ', d) },
      { id: 'king_narai_day', type: 'national', title: 'คำกล่าวเนื่องในวันสมเด็จพระนเรศวรมหาราช (วันยุทธหัตถี / วันกองทัพไทย)', content: (d: any) => buildStandardSpeechHtml('คำกล่าวถวายราชสดุดี สมเด็จพระนเรศวรมหาราช', d) },
      { id: 'taksin_day', type: 'national', title: 'คำกล่าวเนื่องในวันสมเด็จพระเจ้าตากสินมหาราช (๒๘ ธันวาคม)', content: (d: any) => buildStandardSpeechHtml('คำกล่าวถวายราชสดุดี สมเด็จพระเจ้าตากสินมหาราช', d) },
      { id: 'visakha_day', type: 'national', title: 'คำกล่าวเนื่องในพิธีเวียนเทียนวันวิสาขบูชา และวันสำคัญทางพระพุทธศาสนา', content: (d: any) => buildStandardSpeechHtml('คำกล่าวในพิธีทำบุญตักบาตรและเวียนเทียนวันวิสาขบูชา', d) },
      { id: 'songkran_day', type: 'national', title: 'คำกล่าวขอพรและรดน้ำดำหัวผู้ใหญ่เนื่องในเทศกาลสงกรานต์', content: (d: any) => buildStandardSpeechHtml('คำกล่าวขอขมาและขอพรผู้ใหญ่ เนื่องในประเพณีสงกรานต์', d) },
      { id: 'loy_krathong', type: 'national', title: 'คำกล่าวเปิดงานประเพณีลอยกระทงประจำปี', content: (d: any) => buildStandardSpeechHtml('คำกล่าวเปิดงานประเพณีลอยกระทงและสืบสานวัฒนธรรมไทย', d) },
      { id: 'new_year_blessing', type: 'national', title: 'คำกล่าวอวยพรเนื่องในโอกาสวันขึ้นปีใหม่', content: (d: any) => buildStandardSpeechHtml('คำกล่าวส่งท้ายปีเก่าต้อนรับปีใหม่ และอวยพรบุคลากร', d) },
      { id: 'red_cross_day', type: 'national', title: 'คำกล่าวเปิดงานวันกาชาดและกิจกรรมบริจาคโลหิต', content: (d: any) => buildStandardSpeechHtml('คำกล่าวเปิดงานวันสถาปนากาชาดและรวมใจบริจาคโลหิต', d) }
    ]
  },
  {
    group: '🚒 พิธีการงานป้องกันและบรรเทาสาธารณภัย กู้ภัย และความปลอดภัย', level: 'all', items: [
      { id: 'disaster_drill', type: 'report', title: 'คำกล่าวเปิดการฝึกซ้อมแผนป้องกันและบรรเทาสาธารณภัยจังหวัด', content: (d: any) => buildStandardSpeechHtml('การฝึกซ้อมแผนป้องกันและบรรเทาสาธารณภัยระดับจังหวัด', d) },
      { id: 'road_safety_speech', type: 'report', title: 'คำกล่าวเปิดศูนย์ปฏิบัติการป้องกันและลดอุบัติเหตุทางถนนช่วงเทศกาล', content: (d: any) => buildStandardSpeechHtml('ศูนย์ปฏิบัติการป้องกันและลดอุบัติเหตุทางถนนช่วงเทศกาล', d) },
      { id: 'oppor_speech', type: 'report', title: 'คำกล่าวเปิดการอบรมอาสาสมัครป้องกันภัยฝ่ายพลเรือน (อปพร.)', content: (d: any) => buildStandardSpeechHtml('โครงการฝึกอบรมทบทวนและเพิ่มศักยภาพอาสาสมัครป้องกันภัยฝ่ายพลเรือน (อปพร.)', d) },
      { id: 'fire_drill_speech', type: 'report', title: 'คำกล่าวเปิดการซ้อมอพยพหนีไฟและระงับอัคคีภัยในอาคารราชการ/สถานศึกษา', content: (d: any) => buildStandardSpeechHtml('โครงการซ้อมแผนการป้องกันและระงับอัคคีภัย การอพยพหนีไฟ', d) },
      { id: 'pm25_center_opening', type: 'report', title: 'คำกล่าวเปิดศูนย์บัญชาการแก้ไขปัญหาฝุ่นละอองขนาดเล็ก (PM2.5)', content: (d: any) => buildStandardSpeechHtml('พิธีเปิดศูนย์บัญชาการแก้ไขปัญหาฝุ่นละอองขนาดเล็ก (PM2.5) และมลพิษทางอากาศ', d) },
      { id: 'flood_war_room', type: 'report', title: 'คำกล่าวเปิดศูนย์บัญชาการเหตุการณ์อุทกภัย วาตภัย และดินโคลนถล่ม', content: (d: any) => buildStandardSpeechHtml('การเปิดศูนย์บัญชาการเหตุการณ์อุทกภัยและดินโคลนถล่มประจำปี', d) },
      { id: 'drought_assist', type: 'report', title: 'คำกล่าวเปิดโครงการแจกจ่ายน้ำอุปโภคบริโภคช่วยเหลือผู้ประสบภัยแล้ง', content: (d: any) => buildStandardSpeechHtml('โครงการปล่อยแถวขบวนรถน้ำแจกจ่ายน้ำอุปโภคบริโภคช่วยเหลือผู้ประสบภัยแล้ง', d) },
      { id: 'tsunami_drill', type: 'report', title: 'คำกล่าวเปิดการฝึกซ้อมเตือนภัยและอพยพหลบภัยสึนามิ', content: (d: any) => buildStandardSpeechHtml('การฝึกซ้อมเตือนภัยและอพยพหลบภัยคลื่นยักษ์สึนามิในพื้นที่ชายฝั่ง', d) },
      { id: 'hazmat_drill', type: 'report', title: 'คำกล่าวเปิดการฝึกซ้อมแผนเผชิญเหตุสารเคมีและวัตถุอันตรายรั่วไหล', content: (d: any) => buildStandardSpeechHtml('การฝึกตอบโต้สถานการณ์อุบัติภัยสารเคมีและวัตถุอันตราย', d) },
      { id: 'earthquake_drill', type: 'report', title: 'คำกล่าวเปิดการฝึกตอบโต้สถานการณ์แผ่นดินไหวและอาคารถล่ม', content: (d: any) => buildStandardSpeechHtml('การฝึกซ้อมแผนเผชิญเหตุแผ่นดินไหวและการค้นหาผู้ประสบภัยในอาคารถล่ม (USAR)', d) },
      { id: 'water_rescue_training', type: 'report', title: 'คำกล่าวเปิดโครงการอบรมกู้ภัยทางน้ำและการช่วยเหลือคนจมน้ำ', content: (d: any) => buildStandardSpeechHtml('โครงการอบรมทักษะกู้ภัยทางน้ำและการกู้ชีพทางทะเล', d) },
      { id: 'child_safety_helmet', type: 'report', title: 'คำกล่าวเปิดโครงการสวมหมวกนิรภัย ๑๐๐ เปอร์เซ็นต์ในสถานศึกษา', content: (d: any) => buildStandardSpeechHtml('โครงการรณรงค์การสวมหมวกนิรภัย ๑๐๐% เพื่อความปลอดภัยในสถานศึกษา', d) },
      { id: 'safety_day_12nov', type: 'report', title: 'คำกล่าวเนื่องในวันเจ้าหน้าที่ความปลอดภัยในการทำงาน (จป.)', content: (d: any) => buildStandardSpeechHtml('คำกล่าวเปิดงานสัปดาห์ความปลอดภัยในการทำงานและสถานประกอบการ', d) },
      { id: 'disaster_day_16dec', type: 'report', title: 'คำกล่าวเนื่องในวันจัดการภัยพิบัติแห่งชาติ (๑๖ ธันวาคม)', content: (d: any) => buildStandardSpeechHtml('คำกล่าวรำลึกเนื่องในวันจัดการภัยพิบัติแห่งชาติ ๑๖ ธันวาคม', d) },
      { id: 'ddpm_anniversary', type: 'report', title: 'คำกล่าวเนื่องในวันสถาปนากรมป้องกันและบรรเทาสาธารณภัย (๙ ตุลาคม)', content: (d: any) => buildStandardSpeechHtml('คำกล่าวเนื่องในวันสถาปนากรมป้องกันและบรรเทาสาธารณภัย ครบรอบปี', d) },
      { id: 'charity_disaster_relief', type: 'report', title: 'คำกล่าวในพิธีมอบสิ่งของพระราชทานและเงินช่วยเหลือผู้ประสบสาธารณภัย', content: (d: any) => buildStandardSpeechHtml('พิธีมอบถุงยังชีพและเงินช่วยเหลือบรรเทาทุกข์ผู้ประสบสาธารณภัย', d) },
      { id: 'volunteer_rescue_cert', type: 'report', title: 'คำกล่าวในพิธีมอบเกียรติบัตรและเข็มเชิดชูเกียรติแก่อาสาสมัครกู้ภัยดีเด่น', content: (d: any) => buildStandardSpeechHtml('พิธีมอบเกียรติบัตรเชิดชูเกียรติอาสาสมัครป้องกันภัยและกู้ภัยดีเด่น', d) },
      { id: 'safe_school_campaign', type: 'report', title: 'คำกล่าวเปิดโครงการสถานศึกษาร่วมใจ ปลอดภัยภัยพิบัติ', content: (d: any) => buildStandardSpeechHtml('โครงการสร้างความตระหนักรู้และการรับมือภัยพิบัติในสถานศึกษา', d) },
      { id: 'community_cbdrr', type: 'report', title: 'คำกล่าวเปิดการอบรมการจัดการภัยพิบัติโดยอาศัยชุมชนเป็นฐาน (CBDRR)', content: (d: any) => buildStandardSpeechHtml('โครงการจัดการภัยพิบัติโดยอาศัยชุมชนเป็นฐาน (Community Based Disaster Risk Management)', d) },
      { id: 'safe_factory_speech', type: 'report', title: 'คำกล่าวเปิดการตรวจความปลอดภัยโรงงานอุตสาหกรรมในพื้นที่เสี่ยง', content: (d: any) => buildStandardSpeechHtml('โครงการบูรณาการตรวจความปลอดภัยโรงงานอุตสาหกรรมและสถานประกอบการ', d) },
      { id: 'marine_safety_center', type: 'report', title: 'คำกล่าวเปิดศูนย์ดูแลความปลอดภัยทางน้ำและชายฝั่งช่วงเทศกาล', content: (d: any) => buildStandardSpeechHtml('การเปิดศูนย์อำนวยความปลอดภัยทางน้ำและชายหาดท่องเที่ยว', d) },
      { id: 'disaster_fund_handover', type: 'report', title: 'คำกล่าวส่งมอบอุปกรณ์เครื่องมือกู้ภัยและรถดับเพลิงแก่ อปท.', content: (d: any) => buildStandardSpeechHtml('พิธีส่งมอบเครื่องจักรกลกู้ภัย รถบรรทุกน้ำ และอุปกรณ์ดับเพลิงแก่ อปท.', d) }
    ]
  },
  {
    group: '🏛️ งานบริหาร อปท. ประชุมสภา และบริการประชาชน', level: 'all', items: [
      { id: 'dla_day_18mar', type: 'report', title: 'คำกล่าวเนื่องในวันท้องถิ่นไทย (๑๘ มีนาคม)', content: (d: any) => buildStandardSpeechHtml('คำกล่าวรำลึกและน้อมรำลึกเนื่องในวันท้องถิ่นไทย ๑๘ มีนาคม', d) },
      { id: 'council_opening', type: 'report', title: 'คำกล่าวเปิดการประชุมสภาท้องถิ่นสมัยสามัญ ครั้งที่ ๑', content: (d: any) => buildStandardSpeechHtml('การเปิดการประชุมสภาองค์กรปกครองส่วนท้องถิ่น สมัยสามัญ ครั้งที่ ๑', d) },
      { id: 'policy_statement', type: 'opening', title: 'คำแถลงนโยบายของนายกองค์กรปกครองส่วนท้องถิ่นต่อสภาท้องถิ่น', content: (d: any) => buildStandardSpeechHtml('คำแถลงนโยบายการบริหารงานต่อสภาองค์กรปกครองส่วนท้องถิ่น', d) },
      { id: 'mobile_governor', type: 'report', title: 'คำกล่าวรายงานในโครงการจังหวัดเคลื่อนที่ / บำบัดทุกข์ บำรุงสุข', content: (d: any) => buildStandardSpeechHtml('โครงการหน่วยบริการจังหวัดเคลื่อนที่ บำบัดทุกข์ บำรุงสุข สร้างรอยยิ้มให้ประชาชน', d) },
      { id: 'one_stop_service', type: 'report', title: 'คำกล่าวเปิดศูนย์บริการร่วม / ศูนย์บริการประชาชนแบบเบ็ดเสร็จ (OSS)', content: (d: any) => buildStandardSpeechHtml('พิธีเปิดศูนย์บริการประชาชนแบบเบ็ดเสร็จ (One Stop Service: OSS)', d) },
      { id: 'new_office_building', type: 'report', title: 'คำกล่าวเปิดอาคารสำนักงานใหม่ / อาคารศูนย์กู้ภัยประจำท้องถิ่น', content: (d: any) => buildStandardSpeechHtml('พิธีเปิดอาคารสำนักงานและศูนย์กู้ภัยบรรเทาสาธารณภัยแห่งใหม่', d) },
      { id: 'community_health_fund', type: 'report', title: 'คำกล่าวเปิดโครงการกองทุนสุขภาพตำบลและผู้สูงอายุ', content: (d: any) => buildStandardSpeechHtml('โครงการส่งเสริมสุขภาพประชาชนและสนับสนุนกองทุนหลักประกันสุขภาพระดับท้องถิ่น', d) },
      { id: 'waste_management_campaign', type: 'report', title: 'คำกล่าวเปิดกิจกรรมคิกออฟ (Kick-off) ชุมชนปลอดขยะและคัดแยกขยะมูลฝอย', content: (d: any) => buildStandardSpeechHtml('กิจกรรมคิกออฟ (Kick-off) ชุมชนปลอดขยะและการบริหารจัดการขยะอย่างยั่งยืน', d) },
      { id: 'local_tax_service', type: 'report', title: 'คำกล่าวเปิดโครงการคลินิกภาษีและบริการรับชำระภาษีเคลื่อนที่', content: (d: any) => buildStandardSpeechHtml('โครงการคลินิกภาษีท้องถิ่นและออกบริการรับชำระภาษีที่ดินและสิ่งปลูกสร้างเคลื่อนที่', d) },
      { id: 'elderly_quality_life', type: 'report', title: 'คำกล่าวเปิดโรงเรียนผู้สูงอายุและการส่งเสริมอาชีพผู้สูงวัย', content: (d: any) => buildStandardSpeechHtml('พิธีเปิดโรงเรียนผู้สูงอายุและส่งเสริมคุณภาพชีวิตผู้สูงวัยในชุมชน', d) },
      { id: 'child_dev_center', type: 'report', title: 'คำกล่าวเปิดศูนย์พัฒนาเด็กเล็กมาตรฐานและโครงการโภชนาการสมวัย', content: (d: any) => buildStandardSpeechHtml('พิธีเปิดอาคารศูนย์พัฒนาเด็กเล็กมาตรฐานและการส่งเสริมโภชนาการปฐมวัย', d) },
      { id: 'public_hearing_speech', type: 'report', title: 'คำกล่าวเปิดการรับฟังความคิดเห็นของประชาชน (Public Hearing)', content: (d: any) => buildStandardSpeechHtml('เวทีประชาคมและการรับฟังความคิดเห็นของประชาชนในการจัดทำแผนพัฒนาท้องถิ่น', d) },
      { id: 'smart_city_launch', type: 'report', title: 'คำกล่าวเปิดระบบบริการดิจิทัลและกล้อง CCTV อัจฉริยะเพื่อความปลอดภัย', content: (d: any) => buildStandardSpeechHtml('พิธีเปิดศูนย์ควบคุมระบบกล้องวงจรปิด CCTV อัจฉริยะและระบบเมืองปลอดภัย (Smart Safety City)', d) },
      { id: 'village_fund_meeting', type: 'report', title: 'คำกล่าวเปิดการประชุมสัมมนาคณะกรรมการหมู่บ้านและกองทุนหมู่บ้าน', content: (d: any) => buildStandardSpeechHtml('โครงการประชุมสัมมนาและเสริมสร้างความเข้มแข็งคณะกรรมการหมู่บ้าน', d) },
      { id: 'pr_village_announcer', type: 'report', title: 'คำกล่าวเปิดการอบรมผู้กระจายข่าวประจำหมู่บ้านและหอกระจายข่าว', content: (d: any) => buildStandardSpeechHtml('โครงการพัฒนาเครือข่ายผู้สื่อข่าวและผู้กระจายข่าวเตือนภัยประจำหมู่บ้าน', d) },
      { id: 'local_market_fair', type: 'report', title: 'คำกล่าวเปิดตลาดนัดชุมชนและงานแสดงสินค้า OTOP ท้องถิ่น', content: (d: any) => buildStandardSpeechHtml('พิธีเปิดงานตลาดนัดกระตุ้นเศรษฐกิจชุมชนและสินค้า OTOP นวัตวิถี', d) },
      { id: 'transparency_mou', type: 'report', title: 'คำกล่าวลงนามบันทึกข้อตกลงความร่วมมือ (MOU) องค์กรโปร่งใสไร้ทุจริต', content: (d: any) => buildStandardSpeechHtml('พิธีลงนามบันทึกข้อตกลงความร่วมมือ (MOU) การส่งเสริมคุณธรรมและความโปร่งใส (ITA)', d) },
      { id: 'land_deed_handover', type: 'report', title: 'คำกล่าวพิธีมอบโฉนดที่ดิน / ส.ป.ก. แก่เกษตรกรในพื้นที่', content: (d: any) => buildStandardSpeechHtml('พิธีมอบโฉนดที่ดินตามโครงการแก้ไขปัญหาที่ดินทำกินของประชาชน', d) },
      { id: 'street_light_solar', type: 'report', title: 'คำกล่าวเปิดโครงการติดตั้งไฟส่องสว่างโซลาร์เซลล์เพื่อความปลอดภัย', content: (d: any) => buildStandardSpeechHtml('โครงการติดตั้งระบบไฟฟ้าส่องสว่างพลังงานแสงอาทิตย์ในจุดเสี่ยงภัย', d) },
      { id: 'clean_water_supply', type: 'report', title: 'คำกล่าวเปิดโครงการประปาสัมภาษณ์และปรับปรุงระบบน้ำดื่มสะอาด', content: (d: any) => buildStandardSpeechHtml('โครงการก่อสร้างและปรับปรุงระบบประปาหมู่บ้านเพื่อน้ำดื่มสะอาดอนามัย', d) }
    ]
  },
  {
    group: '🎓 งานศึกษาอบรม สัมมนา และพัฒนาบุคลากร', level: 'all', items: [
      { id: 'procurement_law_speech', type: 'report', title: 'คำกล่าวเปิดการอบรมกฎหมายการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ', content: (d: any) => buildStandardSpeechHtml('โครงการเพิ่มประสิทธิภาพการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ', d) },
      { id: 'e_saraban_training', type: 'report', title: 'คำกล่าวเปิดการฝึกอบรมระบบสารบรรณอิเล็กทรอนิกส์และการเขียนหนังสือราชการ', content: (d: any) => buildStandardSpeechHtml('โครงการอบรมเทคนิคการเขียนหนังสือราชการและการใช้ระบบสารบรรณดิจิทัล', d) },
      { id: 'cybersecurity_training', type: 'report', title: 'คำกล่าวเปิดการสัมมนาความมั่นคงปลอดภัยไซเบอร์และการคุ้มครองข้อมูลส่วนบุคคล (PDPA)', content: (d: any) => buildStandardSpeechHtml('โครงการฝึกอบรมความมั่นคงปลอดภัยไซเบอร์และการปฏิบัติตามกฎหมาย PDPA', d) },
      { id: 'budget_efficiency_speech', type: 'report', title: 'คำกล่าวเปิดการประชุมเชิงปฏิบัติการการจัดทำคำของบประมาณและการเร่งรัดการใช้จ่าย', content: (d: any) => buildStandardSpeechHtml('โครงการสัมมนาการจัดทำงบประมาณและการบริหารงบประมาณให้มีประสิทธิภาพ', d) },
      { id: 'disciplinary_law', type: 'report', title: 'คำกล่าวเปิดการอบรมวินัย จริยธรรม และการป้องกันการทุจริตของเจ้าหน้าที่รัฐ', content: (d: any) => buildStandardSpeechHtml('โครงการส่งเสริมวินัย จริยธรรม และเสริมสร้างวัฒนธรรมสุจริตในองค์กร', d) },
      { id: 'pmo_kpi_training', type: 'report', title: 'คำกล่าวเปิดการสัมมนาการจัดทำตัวชี้วัดผลการปฏิบัติงาน (KPI) และเกณฑ์ PMQA', content: (d: any) => buildStandardSpeechHtml('โครงการพัฒนาคุณภาพการบริหารจัดการภาครัฐ (PMQA) และตัวชี้วัดความสำเร็จ', d) },
      { id: 'first_aid_cpr_training', type: 'report', title: 'คำกล่าวเปิดการอบรมการปฐมพยาบาลเบื้องต้นและการใช้เครื่องกระตุกหัวใจ AED', content: (d: any) => buildStandardSpeechHtml('โครงการอบรมทักษะการช่วยชีวิตขั้นพื้นฐาน (CPR) และการใช้เครื่อง AED', d) },
      { id: 'driver_safety_training', type: 'report', title: 'คำกล่าวเปิดการฝึกอบรมขับขี่รถราชการและรถฉุกเฉินอย่างปลอดภัย (Defensive Driving)', content: (d: any) => buildStandardSpeechHtml('โครงการฝึกอบรมเทคนิคการขับขี่รถฉุกเฉินและรถราชการอย่างปลอดภัย', d) },
      { id: 'gis_disaster_map', type: 'report', title: 'คำกล่าวเปิดการอบรมระบบสารสนเทศภูมิศาสตร์ (GIS) เพื่อการจัดการภัยพิบัติ', content: (d: any) => buildStandardSpeechHtml('โครงการประยุกต์ใช้ระบบแผนที่ GIS ในการวิเคราะห์และเตือนภัยพิบัติ', d) },
      { id: 'drone_survey_disaster', type: 'report', title: 'คำกล่าวเปิดการอบรมการใช้โดรน (UAV) สำรวจพื้นที่ประสบภัยและค้นหาผู้รอดชีวิต', content: (d: any) => buildStandardSpeechHtml('โครงการฝึกอบรมเทคโนโลยีอากาศไร้คนขับ (UAV) ในการค้นหาและกู้ภัย', d) },
      { id: 'crisis_comms_training', type: 'report', title: 'คำกล่าวเปิดการสัมมนาการสื่อสารในภาวะวิกฤตและการแถลงข่าวสาธารณภัย', content: (d: any) => buildStandardSpeechHtml('โครงการอบรมเทคนิคการโฆษกและการสื่อสารในภาวะวิกฤต (Crisis Communication)', d) },
      { id: 'local_leader_academy', type: 'report', title: 'คำกล่าวเปิดโครงการพัฒนาศักยภาพผู้นำท้องที่และกำนัน ผู้ใหญ่บ้าน', content: (d: any) => buildStandardSpeechHtml('โครงการเพิ่มประสิทธิภาพการปฏิบัติงานของกำนัน ผู้ใหญ่บ้าน และผู้นำชุมชน', d) },
      { id: 'civil_rights_pdpa', type: 'report', title: 'คำกล่าวเปิดการอบรมสิทธิมนุษยชนและการบริการประชาชนด้วยหัวใจ', content: (d: any) => buildStandardSpeechHtml('โครงการบริการด้วยใจ (Service Mind) และการยกระดับการอำนวยความสะดวกประชาชน', d) },
      { id: 'financial_audit_prep', type: 'report', title: 'คำกล่าวเปิดการติวเข้มรับการตรวจเงินแผ่นดิน (สตง.) และการตรวจสอบภายใน', content: (d: any) => buildStandardSpeechHtml('โครงการเตรียมความพร้อมรับการตรวจเงินแผ่นดินและการบริหารความเสี่ยงทางการเงิน', d) },
      { id: 'public_relations_ai', type: 'report', title: 'คำกล่าวเปิดการอบรมการประยุกต์ใช้ AI ในการประชาสัมพันธ์และการทำงานราชการ', content: (d: any) => buildStandardSpeechHtml('โครงการพัฒนาทักษะปัญญาประดิษฐ์ (AI Assistant) เพิ่มประสิทธิภาพงานราชการ', d) },
      { id: 'fire_fighter_certified', type: 'report', title: 'คำกล่าวในพิธีมอบวุฒิบัตรผู้ผ่านการฝึกอบรมดับเพลิงขั้นสูง', content: (d: any) => buildStandardSpeechHtml('พิธีมอบวุฒิบัตรและปิดการฝึกอบรมหลักสูตรดับเพลิงกู้ภัยระดับสูง', d) },
      { id: 'young_rescue_camp', type: 'report', title: 'คำกล่าวเปิดค่ายเยาวชนกู้ชีพกู้ภัยน้อยประจำท้องถิ่น', content: (d: any) => buildStandardSpeechHtml('โครงการค่ายเยาวชนกู้ชีพกู้ภัยจิตอาสาเพื่ออนาคตความปลอดภัย', d) },
      { id: 'km_sharing_speech', type: 'report', title: 'คำกล่าวเปิดกิจกรรมแลกเปลี่ยนเรียนรู้และจัดการความรู้ (KM)', content: (d: any) => buildStandardSpeechHtml('กิจกรรมการจัดการความรู้ (Knowledge Management: KM) และการถอดบทเรียนการทำงาน', d) }
    ]
  },
  {
    group: '🤝 งานต้อนรับ มอบรางวัล และต้อนรับคณะตรวจเยี่ยม', level: 'all', items: [
      { id: 'welcome_governor_inspection', type: 'welcome', title: 'คำกล่าวต้อนรับผู้ว่าราชการจังหวัดและคณะตรวจติดตามราชการ', content: (d: any) => buildStandardSpeechHtml('คำกล่าวต้อนรับผู้ว่าราชการจังหวัด ในโอกาสตรวจติดตามการปฏิบัติราชการ', d) },
      { id: 'welcome_parliament_committee', type: 'welcome', title: 'คำกล่าวต้อนรับคณะกรรมาธิการสภาผู้แทนราษฎร / วุฒิสภา', content: (d: any) => buildStandardSpeechHtml('คำกล่าวต้อนรับคณะกรรมาธิการการป้องกันและบรรเทาสาธารณภัย', d) },
      { id: 'welcome_study_tour', type: 'welcome', title: 'คำกล่าวต้อนรับคณะศึกษาดูงานด้านการจัดการภัยพิบัติจากต่างจังหวัด', content: (d: any) => buildStandardSpeechHtml('คำกล่าวต้อนรับคณะผู้บริหารและเจ้าหน้าที่ศึกษาดูงานระบบเตือนภัยพิบัติ', d) },
      { id: 'welcome_new_director', type: 'welcome', title: 'คำกล่าวต้อนรับหัวหน้าส่วนราชการ / ผู้บริหารย้ายมาดำรงตำแหน่งใหม่', content: (d: any) => buildStandardSpeechHtml('คำกล่าวแสดงความยินดีและต้อนรับหัวหน้าหน่วยงานเนื่องในโอกาสย้ายมารับตำแหน่งใหม่', d) },
      { id: 'farewell_retirement', type: 'congratulation', title: 'คำกล่าวแสดงมุทิตาจิตแด่ผู้เกษียณอายุราชการ', content: (d: any) => buildStandardSpeechHtml('คำกล่าวแสดงมุทิตาจิต "ด้วยรักและผูกพัน" แด่ผู้เกษียณอายุราชการประจำปี', d) },
      { id: 'congrat_promotion', type: 'congratulation', title: 'คำกล่าวแสดงความยินดีแก่ข้าราชการที่ได้รับการเลื่อนตำแหน่งสูงขึ้น', content: (d: any) => buildStandardSpeechHtml('คำกล่าวแสดงความยินดีเนื่องในโอกาสได้รับการแต่งตั้งให้ดำรงตำแหน่งสูงขึ้น', d) },
      { id: 'good_governance_award', type: 'congratulation', title: 'คำกล่าวในพิธีมอบรางวัลการบริหารจัดการที่ดี (Good Governance Award)', content: (d: any) => buildStandardSpeechHtml('พิธีมอบรางวัลการบริหารจัดการที่ดี และเชิดชูเกียรติหน่วยงานโปร่งใส', d) },
      { id: 'outstanding_official_award', type: 'congratulation', title: 'คำกล่าวในพิธีมอบเกียรติบัตรข้าราชการและพนักงานดีเด่นประจำปี', content: (d: any) => buildStandardSpeechHtml('พิธีมอบเกียรติบัตรเชิดชูเกียรติข้าราชการและเจ้าหน้าที่ผู้ปฏิบัติงานดีเด่น', d) },
      { id: 'volunteer_hero_thanks', type: 'congratulation', title: 'คำกล่าวขอบคุณจิตอาสาและกู้ภัยภาคเอกชนที่ช่วยภารกิจกู้ภัยค้นหา', content: (d: any) => buildStandardSpeechHtml('คำกล่าวแสดงความขอบคุณมูลนิธิกู้ภัยและจิตอาสาผู้สนับสนุนภารกิจค้นหาและกู้ภัย', d) },
      { id: 'welcome_foreign_delegation', type: 'welcome', title: 'คำกล่าวต้อนรับคณะผู้แทนและองค์กรระหว่างประเทศด้านสาธารณภัย', content: (d: any) => buildStandardSpeechHtml('คำกล่าวต้อนรับผู้แทนองค์กรระหว่างประเทศในการประชุมความร่วมมือเตือนภัย', d) },
      { id: 'mou_university_tech', type: 'congratulation', title: 'คำกล่าวพิธีลงนาม MOU ร่วมกับมหาวิทยาลัยด้านงานวิจัยเทคโนโลยีกู้ภัย', content: (d: any) => buildStandardSpeechHtml('พิธีลงนามบันทึกความเข้าใจ (MOU) พัฒนานวัตกรรมและเทคโนโลยีกู้ภัยอัจฉริยะ', d) },
      { id: 'thank_donors_disaster', type: 'congratulation', title: 'คำกล่าวขอบคุณภาคเอกชนและมูลนิธิที่บริจาคเครื่องมือสนับสนุนกู้ภัย', content: (d: any) => buildStandardSpeechHtml('พิธีรับมอบสิ่งของบริจาคและอุปกรณ์กู้ภัยจากภาคเอกชนเพื่อผู้ประสบภัย', d) },
      { id: 'welcome_dla_inspector', type: 'welcome', title: 'คำกล่าวต้อนรับผู้ตรวจราชการกระทรวงมหาดไทย / กรม ปภ.', content: (d: any) => buildStandardSpeechHtml('คำกล่าวต้อนรับผู้ตรวจราชการ ในโอกาสลงพื้นที่ตรวจติดตามผลการดำเนินงาน', d) },
      { id: 'congrat_new_council_members', type: 'congratulation', title: 'คำกล่าวแสดงความยินดีแก่สมาชิกสภาท้องถิ่นที่ได้รับการเลือกตั้งใหม่', content: (d: any) => buildStandardSpeechHtml('คำกล่าวแสดงความยินดีแก่สมาชิกสภาท้องถิ่นเนื่องในโอกาสเข้ารับหน้าที่', d) },
      { id: 'congrat_cert_safety_org', type: 'congratulation', title: 'คำกล่าวมอบประกาศนียบัตรเชิดชูเกียรติสถานประกอบการปลอดภัย', content: (d: any) => buildStandardSpeechHtml('พิธีมอบใบประกาศนียบัตรเชิดชูเกียรติสถานประกอบการและโรงเรียนปลอดภัยดีเด่น', d) },
      { id: 'farewell_transfer_speech', type: 'congratulation', title: 'คำกล่าวอำลาและขอบคุณในโอกาสย้ายไปดำรงตำแหน่ง ณ หน่วยงานใหม่', content: (d: any) => buildStandardSpeechHtml('คำกล่าวแสดงความขอบคุณและอำลาเนื่องในโอกาสย้ายไปปฏิบัติราชการแห่งใหม่', d) }
    ]
  },
  {
    group: '🏆 งานกีฬา วัฒนธรรม จิตอาสา และกิจกรรมชุมชน', level: 'all', items: [
      { id: 'local_sports_opening', type: 'report', title: 'คำกล่าวเปิดการแข่งขันกีฬาสัมพันธ์ส่วนราชการและ อปท.', content: (d: any) => buildStandardSpeechHtml('การแข่งขันกีฬาสัมพันธ์ส่วนราชการ อปท. และประชาชนท้องถิ่น', d) },
      { id: 'royal_volunteer_kickoff', type: 'report', title: 'คำกล่าวเปิดกิจกรรมจิตอาสาพระราชทาน "เราทำความดี ด้วยหัวใจ"', content: (d: any) => buildStandardSpeechHtml('กิจกรรมจิตอาสาพัฒนาพระราชทาน "เราทำความดี ด้วยหัวใจ" เพื่อสังคม', d) },
      { id: 'tree_planting_king', type: 'report', title: 'คำกล่าวเปิดโครงการปลูกป่าและปลูกต้นไม้เฉลิมพระเกียรติ', content: (d: any) => buildStandardSpeechHtml('โครงการปลูกป่า เพิ่มพื้นที่สีเขียว และปลูกต้นไม้เฉลิมพระเกียรติ', d) },
      { id: 'dredging_canal_volunteer', type: 'report', title: 'คำกล่าวเปิดกิจกรรมจิตอาสาพัฒนาขุดลอกคูคลองกำจัดวัชพืชเปิดทางน้ำ', content: (d: any) => buildStandardSpeechHtml('กิจกรรมจิตอาสาพัฒนาขุดลอกคูคลองและกำจัดสิ่งกีดขวางทางน้ำป้องกันน้ำท่วม', d) },
      { id: 'dharma_moral_office', type: 'report', title: 'คำกล่าวเปิดโครงการส่งเสริมคุณธรรม จริยธรรม และการปฏิบัติธรรม', content: (d: any) => buildStandardSpeechHtml('โครงการส่งเสริมคุณธรรม จริยธรรม และการปฏิบัติธรรมเสริมสร้างองค์กรผาสุก', d) },
      { id: 'elderly_sport_day', type: 'report', title: 'คำกล่าวเปิดการแข่งขันกีฬาผู้สูงอายุแห่งชาติระดับท้องถิ่น', content: (d: any) => buildStandardSpeechHtml('การแข่งขันกีฬานันทนาการผู้สูงอายุและเชื่อมความสัมพันธ์ชุมชน', d) },
      { id: 'youth_against_drugs', type: 'report', title: 'คำกล่าวเปิดกิจกรรมวันต่อต้านยาเสพติดโลกและการแข่งขันกีฬาต้านยาเสพติด', content: (d: any) => buildStandardSpeechHtml('กิจกรรมวันต่อต้านยาเสพติดโลกและการแข่งขันกีฬาเยาวชนต้านยาเสพติด', d) },
      { id: 'blood_donation_charity', type: 'report', title: 'คำกล่าวเปิดกิจกรรมบริจาคโลหิตและดวงตาเฉลิมพระเกียรติ', content: (d: any) => buildStandardSpeechHtml('กิจกรรมรวมใจบริจาคโลหิตและอวัยวะถวายเป็นพระราชกุศล', d) },
      { id: 'cultural_preservation_fair', type: 'report', title: 'คำกล่าวเปิดงานสืบสานวัฒนธรรมและภูมิปัญญาท้องถิ่น', content: (d: any) => buildStandardSpeechHtml('งานมหกรรมสืบสานมรดกทางวัฒนธรรมและภูมิปัญญาท้องถิ่น', d) },
      { id: 'big_cleaning_day', type: 'report', title: 'คำกล่าวเปิดกิจกรรมทำความสะอาดใหญ่ (Big Cleaning Day)', content: (d: any) => buildStandardSpeechHtml('กิจกรรมรวมพลังทำความสะอาด Big Cleaning Day ในพื้นที่สาธารณะ', d) },
      { id: 'dengue_fever_campaign', type: 'report', title: 'คำกล่าวเปิดกิจกรรมรณรงค์หยอดทรายอะเบทและกำจัดยุงลาย', content: (d: any) => buildStandardSpeechHtml('โครงการรณรงค์กำจัดแหล่งเพาะพันธุ์ยุงลายป้องกันโรคไข้เลือดออก', d) },
      { id: 'rabies_free_zone', type: 'report', title: 'คำกล่าวเปิดโครงการสัตว์เลี้ยงเกร็ดรอด ปลอดโรคพิษสุนัขบ้า', content: (d: any) => buildStandardSpeechHtml('โครงการฉีดวัคซีนป้องกันโรคพิษสุนัขบ้าและทำหมันสัตว์เลี้ยงในชุมชน', d) },
      { id: 'bicycle_tour_safety', type: 'report', title: 'คำกล่าวเปิดกิจกรรมปั่นจักรยานเพื่อสุขภาพและการท่องเที่ยวปลอดภัย', content: (d: any) => buildStandardSpeechHtml('กิจกรรมปั่นจักรยานเพื่อสุขภาพ รณรงค์ความปลอดภัยทางถนนและการท่องเที่ยว', d) },
      { id: 'scout_disaster_camp', type: 'report', title: 'คำกล่าวเปิดการฝึกอบรมลูกเสือบรรเทาสาธารณภัยและค่ายลูกเสือ', content: (d: any) => buildStandardSpeechHtml('โครงการฝึกอบรมค่ายลูกเสือช่วยเหลือผู้ประสบภัยและบรรเทาสาธารณภัย', d) },
      { id: 'beach_cleanup_volunteer', type: 'report', title: 'คำกล่าวเปิดกิจกรรมจิตอาสาอนุรักษ์ธรรมชาติและทำความสะอาดชายหาด', content: (d: any) => buildStandardSpeechHtml('กิจกรรมจิตอาสาฟื้นฟูสิ่งแวดล้อมและทำความสะอาดชายหาดท่องเที่ยว', d) },
      { id: 'candle_festival_opening', type: 'report', title: 'คำกล่าวเปิดงานประเพณีแห่เทียนพรรษาและถวายผ้าอาบน้ำฝน', content: (d: any) => buildStandardSpeechHtml('งานประเพณีหล่อเทียนพรรษา แห่เทียนพรรษา และทำบุญวันเข้าพรรษาประจำปี', d) }
    ]
  }
];

// Helper Builder for Standard Official Speech Format
export function buildStandardSpeechHtml(title: string, d: any) {
  const year = d.year || '๒๕๖๙';
  const orgName = d.schoolName || 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
  const projName = d.projectName ? `เรื่อง "${d.projectName}"` : '';
  const chairman = d.chairman || 'ท่านผู้ว่าราชการจังหวัดระยอง';
  const speaker = d.speaker || 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง';
  const venue = d.venue || 'ห้องประชุมศาลากลางจังหวัดระยอง';
  const count = d.participantsCount || '๑๐๐';

  return `<div style="font-family:'TH SarabunPSK','Sarabun',sans-serif;">
<p style="text-align:center;font-size:16pt;font-weight:bold;margin:0 0 4pt;">คำกล่าวรายงาน</p>
<p style="text-align:center;font-size:15pt;font-weight:bold;margin:0 0 2pt;">${title} ${projName}</p>
<p style="text-align:center;font-size:14pt;margin:0 0 12pt;">ประจำปีพุทธศักราช ${year} ณ ${venue}</p>

<p style="text-indent:3em;margin:0 0 8pt;">กราบเรียน ${chairman} ที่เคารพอย่างสูง</p>

<p style="text-indent:3em;margin:0 0 8pt;">กระผม/ดิฉัน ${speaker} ในนามของคณะผู้จัดงาน ข้าราชการ บุคลากร และผู้เข้าร่วมกิจกรรมทุกท่าน ขอขอบพระคุณท่านประธานเป็นอย่างยิ่ง ที่ได้ให้เกียรติมาเป็นประธานในพิธีเปิด ${title} ในวันนี้</p>

<p style="text-indent:3em;margin:0 0 8pt;">การจัดกิจกรรมในครั้งนี้ มีวัตถุประสงค์สำคัญเพื่อตระหนักถึงความปลอดภัย ความพร้อมในการรับมือสถานการณ์ฉุกเฉิน และการบูรณาการความร่วมมือระหว่างหน่วยงานที่เกี่ยวข้อง โดยมีผู้เข้าร่วมกิจกรรมประกอบด้วย ข้าราชการ เจ้าหน้าที่ อาสาสมัคร และเครือข่ายประชาชน รวมทั้งสิ้น ${count} คน</p>

<p style="text-indent:3em;margin:0 0 8pt;">บัดนี้ ได้เวลาอันเป็นมงคลสมควรแล้ว กระผม/ดิฉัน ขอเรียนเชิญท่านประธาน ได้โปรดกล่าวเปิดงาน และให้โอวาทแก่ผู้เข้าร่วมกิจกรรม เพื่อเป็นสิริมงคลและขวัญกำลังใจในการปฏิบัติหน้าที่ต่อไป กราบเรียนเชิญครับ/ค่ะ</p>

<hr style="border:none;border-top:1px dashed #bbb;margin:20pt 0;" />

<p style="text-align:center;font-size:16pt;font-weight:bold;margin:0 0 4pt;">คำกล่าวเปิดงาน / กล่าวตอบ</p>
<p style="text-align:center;font-size:15pt;font-weight:bold;margin:0 0 2pt;">โดย ${chairman}</p>
<p style="text-align:center;font-size:14pt;margin:0 0 12pt;">ในพิธีเปิด ${title}</p>

<p style="text-indent:3em;margin:0 0 8pt;">ท่านผู้บริหาร ข้าราชการ คณะวิทยากร และผู้เข้าร่วมกิจกรรมทุกท่าน</p>

<p style="text-indent:3em;margin:0 0 8pt;">ผมมีความยินดีและเป็นเกียรติอย่างยิ่ง ที่ได้มาเป็นประธานในพิธีเปิด ${title} ในวันนี้ ขอชื่นชม ${orgName} และคณะทำงานทุกท่าน ที่ได้เล็งเห็นความสำคัญและตระหนักถึงการพัฒนาศักยภาพองค์กรเพื่อประโยชน์สูงสุดแก่ประชาชน</p>

<p style="text-indent:3em;margin:0 0 8pt;">หวังเป็นอย่างยิ่งว่า การดำเนินงานในครั้งนี้จะบรรลุวัตถุประสงค์ที่ตั้งไว้ ขออวยพรให้การจัดงานสำเร็จลุล่วงด้วยดี ขอให้ผู้เข้าร่วมกิจกรรมทุกท่านประสบความสุข ความเจริญ และขอเปิด ${title} ณ บัดนี้</p>
</div>`;
}

// ── Official Standard Phrases for Thai Bureaucracy ──
export const OFFICIAL_STANDARD_PHRASES = {
  openings: [
    { label: 'ด้วย (เรื่องใหม่)', text: 'ด้วย ฝ่ายยุทธศาสตร์และการจัดการ สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง มีภารกิจในการ' },
    { label: 'ตามที่...ความละเอียดแจ้งแล้ว นั้น (เรื่องเดิม)', text: 'ตามที่ ได้มีการแจ้งเรื่องการดำเนินงานด้านการป้องกันและบรรเทาสาธารณภัย ความละเอียดแจ้งแล้ว นั้น' },
    { label: 'ตามหนังสือที่อ้างถึง (อ้างอิงหนังสือ)', text: 'ตามหนังสือที่อ้างถึง ได้แจ้งกำหนดการและการเตรียมความพร้อมในการปฏิบัติราชการ ความละเอียดแจ้งแล้ว นั้น' },
    { label: 'เนื่องด้วย (ระบุเหตุผลความจำเป็น)', text: 'เนื่องด้วย ในช่วงฤดูมรสุมมีแนวโน้มการเกิดสถานการณ์อุทกภัยและวาตภัยในพื้นที่ จึงมีความจำเป็นต้อง' },
    { label: 'สืบเนื่องจากการประชุม (มติที่ประชุม)', text: 'สืบเนื่องจากการประชุมคณะกรรมการศูนย์บัญชาการเหตุการณ์จังหวัดระยอง เมื่อวันที่ ได้มีมติเห็นชอบให้' }
  ],
  transitions: [
    { label: 'ในการนี้...ใคร่ขอความอนุเคราะห์', text: 'ในการนี้ จึงใคร่ขอความอนุเคราะห์จากท่าน โปรดพิจารณาให้ความอนุเคราะห์' },
    { label: 'ในการนี้...ขอเรียนเชิญเข้าร่วมประชุม', text: 'ในการนี้ จึงขอเรียนเชิญท่านหรือผู้แทนที่มีอำนาจตัดสินใจ เข้าร่วมการประชุมดังกล่าว ในวัน' },
    { label: 'เพื่อประโยชน์ในการประสานงาน', text: 'เพื่อประโยชน์ในการประสานการปฏิบัติราชการและการบูรณาการร่วมกันระหว่างหน่วยงาน จึงขอความร่วมมือ' },
    { label: 'เพื่อให้การดำเนินงานเป็นไปด้วยความเรียบร้อย', text: 'เพื่อให้การดำเนินงานด้านการป้องกันและบรรเทาสาธารณภัยเป็นไปด้วยความเรียบร้อย มีประสิทธิภาพ และบรรลุวัตถุประสงค์ จึงขอ' }
  ],
  closings: [
    { label: 'จึงเรียนมาเพื่อโปรดพิจารณา (มาตรฐาน)', text: 'จึงเรียนมาเพื่อโปรดพิจารณา' },
    { label: 'จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ (ขออนุมัติ)', text: 'จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ' },
    { label: 'จึงเรียนมาเพื่อโปรดทราบ (แจ้งทราบ)', text: 'จึงเรียนมาเพื่อโปรดทราบ' },
    { label: 'จึงเรียนมาเพื่อโปรดให้ความอนุเคราะห์ (ขอความร่วมมือ)', text: 'จึงเรียนมาเพื่อโปรดให้ความอนุเคราะห์ และขอขอบคุณมา ณ โอกาสนี้' },
    { label: 'จึงเรียนมาเพื่อโปรดประสานการปฏิบัติต่อไป (ส่งต่อเรื่อง)', text: 'จึงเรียนมาเพื่อโปรดประสานการปฏิบัติต่อไป' }
  ]
};

// ── Realistic Preset Official Templates ──
export interface PresetOfficialTemplate {
  id: string;
  name: string;
  category: string;
  docType: string;
  urgency: string;
  secrecy: string;
  subject: string;
  to: string;
  ref?: string;
  att?: string;
  body: string;
  signer: string;
  signerPos: string;
}

export const PRESET_OFFICIAL_TEMPLATES: PresetOfficialTemplate[] = [
  {
    id: 'req_speaker',
    name: 'หนังสือขอความอนุเคราะห์วิทยากร',
    category: 'หนังสือภายนอก',
    docType: 'หนังสือส่ง',
    urgency: 'ปกติ',
    secrecy: 'ไม่ลับ',
    subject: 'ขอความอนุเคราะห์วิทยากรบรรยายการฝึกอบรมการป้องกันและบรรเทาสาธารณภัย',
    to: 'ผู้ว่าราชการจังหวัดระยอง / หัวหน้าส่วนราชการ',
    att: 'กำหนดการฝึกอบรม จำนวน ๑ ฉบับ',
    body: `<p style="text-indent: 2.5em; margin-bottom: 0.8em;">ด้วย สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้กำหนดจัดโครงการฝึกอบรมเพิ่มประสิทธิภาพการป้องกันและระงับอัคคีภัยเบื้องต้น ประจำปีงบประมาณ พ.ศ. ๒๕๖๙ ในวันที่ ๑๕ พฤษภาคม ๒๕๖๙ ณ อาคารอเนกประสงค์ ศูนย์ราชการจังหวัดระยอง โดยมีกลุ่มเป้าหมายเป็นเจ้าหน้าที่และอาสาสมัครในพื้นที่ จำนวน ๖๐ คน</p>
<p style="text-indent: 2.5em; margin-bottom: 0.8em;">ในการนี้ สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง พิจารณาเห็นว่าหน่วยงานของท่านมีบุคลากรที่มีความรู้ ความเชี่ยวชาญ และประสบการณ์ด้านการระงับเหตุอัคคีภัยและการช่วยเหลือผู้ประสบภัยเป็นอย่างดียิ่ง จึงใคร่ขอความอนุเคราะห์บุคลากรในสังกัดของท่าน จำนวน ๒ ท่าน ไปเป็นวิทยากรบรรยายและฝึกปฏิบัติในวัน เวลา และสถานที่ดังกล่าว โดยมีกำหนดการตามสิ่งที่ส่งมาด้วย</p>
<p style="text-indent: 2.5em; margin-bottom: 0.8em;">จึงเรียนมาเพื่อโปรดพิจารณาให้ความอนุเคราะห์ และขอขอบคุณมา ณ โอกาสนี้</p>`,
    signer: 'นายสมชาย มุ่งมั่นพัฒนา',
    signerPos: 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'
  },
  {
    id: 'invite_disaster_meeting',
    name: 'หนังสือขอเชิญประชุมคณะกรรมการศูนย์บัญชาการเหตุการณ์',
    category: 'หนังสือภายนอก',
    docType: 'หนังสือส่ง',
    urgency: 'ด่วนมาก',
    secrecy: 'ไม่ลับ',
    subject: 'ขอเชิญประชุมเตรียมความพร้อมรับสถานการณ์อุทกภัย วาตภัย และดินโคลนถล่ม',
    to: 'คณะกรรมการศูนย์บัญชาการเหตุการณ์จังหวัดระยอง ทุกท่าน',
    ref: 'แผนการป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง พ.ศ. ๒๕๖๔ - ๒๕๗๐',
    att: 'ระเบียบวาระการประชุม จำนวน ๑ ชุด',
    body: `<p style="text-indent: 2.5em; margin-bottom: 0.8em;">ด้วย กรมอุตุนิยมวิทยาได้คาดหมายสภาวะอากาศว่าจะมีฝนตกหนักถึงหนักมากในพื้นที่ภาคตะวันออก อันอาจก่อให้เกิดน้ำท่วมฉับพลัน น้ำป่าไหลหลาก และดินโคลนถล่มในหลายพื้นที่ของจังหวัดระยอง ซึ่งอาจส่งผลกระทบต่อความปลอดภัยและทรัพย์สินของประชาชน</p>
<p style="text-indent: 2.5em; margin-bottom: 0.8em;">ในการนี้ เพื่อเป็นการเตรียมความพร้อมในการติดตามสถานการณ์ วางแผนจัดสรรทรัพยากร เครื่องจักรกลกู้ภัย และกำลังพลในการเผชิญเหตุได้อย่างทันท่วงที จึงขอเรียนเชิญท่านหรือผู้แทนที่มีอำนาจตัดสินใจ เข้าร่วมการประชุมคณะกรรมการศูนย์บัญชาการเหตุการณ์จังหวัดระยอง ในวันศุกร์ที่ ๒๐ มีนาคม ๒๕๖๙ เวลา ๐๙.๓๐ น. ณ ห้องประชุมภักดีศรีสงคราม ศาลากลางจังหวัดระยอง</p>
<p style="text-indent: 2.5em; margin-bottom: 0.8em;">จึงเรียนมาเพื่อโปรดทราบและเข้าร่วมการประชุมตามวัน เวลา และสถานที่ดังกล่าว โดยพร้อมเพรียงกัน</p>`,
    signer: 'นายสมชาย มุ่งมั่นพัฒนา',
    signerPos: 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'
  },
  {
    id: 'memo_procure_disaster',
    name: 'บันทึกขออนุมัติดำเนินการจัดซื้อเครื่องมืออุปกรณ์กู้ภัย',
    category: 'หนังสือภายใน',
    docType: 'บันทึกข้อความ',
    urgency: 'ปกติ',
    secrecy: 'ไม่ลับ',
    subject: 'ขออนุมัติดำเนินการจัดซื้อเครื่องสูบน้ำและอุปกรณ์กู้ภัยทางน้ำ ประจำปีงบประมาณ พ.ศ. ๒๕๖๙',
    to: 'ผู้ว่าราชการจังหวัดระยอง (ผ่านหัวหน้าสำนักงาน ปภ.จังหวัดระยอง)',
    body: `<p style="text-indent: 2.5em; margin-bottom: 0.8em;"><b>๑. เรื่องเดิม</b> ด้วย ฝ่ายยุทธศาสตร์และการจัดการ สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้รับจัดสรรงบประมาณรายจ่ายประจำปี พ.ศ. ๒๕๖๙ แผนงานบูรณาการบริหารจัดการทรัพยากรน้ำ โครงการเพิ่มประสิทธิภาพการเผชิญเหตุอุทกภัย เพื่อจัดซื้อครุภัณฑ์กู้ภัยประจำจุดเสี่ยง</p>
<p style="text-indent: 2.5em; margin-bottom: 0.8em;"><b>๒. ข้อเท็จจริง</b> ปัจจุบันอุปกรณ์กู้ภัยทางน้ำและเครื่องสูบน้ำแบบเคลื่อนที่เร็วของสำนักงานฯ บางส่วนได้ผ่านการใช้งานมาเป็นเวลานานและชำรุดตามสภาพ เพื่อให้มีความพร้อมสูงสุดในการเข้าช่วยเหลือประชาชนในพื้นที่น้ำท่วมขัง จึงมีความจำเป็นต้องจัดซื้อเครื่องสูบน้ำขนาด ๘ นิ้ว พร้อมอุปกรณ์ประจำเครื่อง จำนวน ๒ ชุด ภายในวงเงินงบประมาณ ๔๕๐,๐๐๐ บาท (สี่แสนห้าหมื่นบาทถ้วน) ตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐</p>
<p style="text-indent: 2.5em; margin-bottom: 0.8em;"><b>๓. ข้อพิจารณาและข้อเสนอ</b> ฝ่ายยุทธศาสตร์และการจัดการ ได้จัดทำรายละเอียดคุณลักษณะเฉพาะ (TOR) และราคากลางเรียบร้อยแล้ว จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติให้ดำเนินการจัดซื้อตามระเบียบพัสดุภาครัฐต่อไป</p>`,
    signer: 'นางสาวกานดา รักชาติยิ่ง',
    signerPos: 'นักวิเคราะห์นโยบายและแผนชำนาญการ'
  },
  {
    id: 'memo_official_travel',
    name: 'บันทึกขออนุมัติเดินทางไปปฏิบัติราชการ',
    category: 'หนังสือภายใน',
    docType: 'บันทึกข้อความ',
    urgency: 'ปกติ',
    secrecy: 'ไม่ลับ',
    subject: 'ขออนุมัติเดินทางไปปฏิบัติราชการตรวจสอบพื้นที่เสี่ยงภัยดินโคลนถล่ม',
    to: 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
    body: `<p style="text-indent: 2.5em; margin-bottom: 0.8em;"><b>๑. ความเป็นมา</b> ด้วย ศูนย์เตือนภัยพิบัติแห่งชาติได้แจ้งเตือนความเสี่ยงการเกิดดินโคลนถล่มและน้ำป่าไหลหลากในพื้นที่ลาดชันเชิงเขา อำเภอเขาชะเมา และอำเภอแกลง จังหวัดระยอง</p>
<p style="text-indent: 2.5em; margin-bottom: 0.8em;"><b>๒. ข้อเท็จจริง</b> เพื่อเป็นการตรวจสอบระบบแจ้งเตือนภัยประจำหมู่บ้าน (Early Warning) และสำรวจจุดอพยพประชาชนให้มีความพร้อมใช้งาน จึงมีความจำเป็นต้องเดินทางไปปฏิบัติราชการในพื้นที่ดังกล่าว ในวันที่ ๑๘-๑๙ มีนาคม ๒๕๖๙ โดยมีคณะผู้เดินทางประกอบด้วยข้าพเจ้าพร้อมด้วยเจ้าหน้าที่ชุดเผชิญเหตุ รวม ๔ ท่าน โดยใช้ยานพาหนะส่วนกลาง หมายเลขทะเบียน กข ๙๙๙๙ ระยอง</p>
<p style="text-indent: 2.5em; margin-bottom: 0.8em;"><b>๓. ข้อเสนอ</b> จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติให้เดินทางไปปฏิบัติราชการตามกำหนดเวลาดังกล่าว และขออนุมัติเบิกจ่ายค่าเบี้ยเลี้ยง ค่าที่พัก และค่าน้ำมันเชื้อเพลิงตามระเบียบทางราชการ</p>`,
    signer: 'นายธีระพล วิทยาการ',
    signerPos: 'นายช่างเครื่องกลชำนาญงาน'
  },
  {
    id: 'circular_disaster_alert',
    name: 'หนังสือเวียน (ว.) แจ้งเตือนภัยและเฝ้าระวัง',
    category: 'หนังสือเวียน',
    docType: 'หนังสือเวียน (ว.)',
    urgency: 'ด่วนที่สุด',
    secrecy: 'ไม่ลับ',
    subject: 'แจ้งเตือนเฝ้าระวังสถานการณ์น้ำท่วมฉับพลันและคลื่นลมแรงในพื้นที่ชายฝั่ง',
    to: 'นายอำเภอ ทุกอำเภอ และนายกองค์กรปกครองส่วนท้องถิ่น ทุกแห่งในจังหวัดระยอง',
    body: `<p style="text-indent: 2.5em; margin-bottom: 0.8em;">ด้วย กองอำนวยการป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ได้ติดตามสภาวะอากาศร่วมกับกรมอุตุนิยมวิทยา พบว่าความกดอากาศต่ำกำลังแรงส่งผลให้เกิดฝนตกหนักอย่างต่อเนื่อง ระหว่างวันที่ ๑๒ - ๑๖ เมษายน ๒๕๖๙ มีปริมาณฝนสะสมสูง อาจทำให้เกิดน้ำท่วมขังในเขตชุมชนเมืองและคลื่นลมแรงบริเวณชายฝั่งทะเล</p>
<p style="text-indent: 2.5em; margin-bottom: 0.8em;">ในการนี้ กองอำนวยการป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง จึงขอให้อำเภอและองค์กรปกครองส่วนท้องถิ่นทุกแห่ง ดำเนินการดังนี้<br/>
๑. จัดตั้งชุดปฏิบัติการเฝ้าระวังและเตรียมความพร้อมตลอด ๒๔ ชั่วโมง<br/>
๒. ตรวจสอบสิ่งกีดขวางทางน้ำ ท่อระบายน้ำ และติดตั้งเครื่องสูบน้ำในจุดเสี่ยงภัยล่วงหน้า<br/>
๓. ประชาสัมพันธ์แจ้งเตือนชาวเรือและเรือประมงขนาดเล็กให้งดออกจากฝั่งจนกว่าสถานการณ์จะคลี่คลาย<br/>
๔. หากเกิดสถานการณ์สาธารณภัยในพื้นที่ ให้รายงานเหตุด่วนสาธารณภัยให้กองอำนวยการฯ จังหวัด ทราบทันที</p>
<p style="text-indent: 2.5em; margin-bottom: 0.8em;">จึงเรียนมาเพื่อโปรดพิจารณาดำเนินการโดยด่วนที่สุด</p>`,
    signer: 'นายสมชาย มุ่งมั่นพัฒนา',
    signerPos: 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'
  },
  {
    id: 'cert_training_attend',
    name: 'หนังสือรับรองการผ่านการฝึกอบรม',
    category: 'หนังสือรับรอง',
    docType: 'หนังสือรับรอง',
    urgency: 'ปกติ',
    secrecy: 'ไม่ลับ',
    subject: 'หนังสือรับรองการผ่านการฝึกอบรมหลักสูตรอาสาสมัครกู้ชีพกู้ภัยเบื้องต้น',
    to: 'ผู้ที่เกี่ยวข้อง',
    body: `<p style="text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 1.5em;">หนังสือรับรองฉบับนี้ให้ไว้เพื่อรับรองว่า</p>
<p style="text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 1em;">นายวิชัย ชัยชนะเลิศ</p>
<p style="text-indent: 2.5em; margin-bottom: 0.8em;">ได้ผ่านการฝึกอบรมหลักสูตร "อาสาสมัครป้องกันภัยฝ่ายพลเรือนและการกู้ชีพกู้ภัยทางน้ำขั้นพื้นฐาน" ประจำปีงบประมาณ พ.ศ. ๒๕๖๙ จัดโดยสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง ระหว่างวันที่ ๑ - ๕ กุมภาพันธ์ ๒๕๖๙ รวมระยะเวลาการฝึกอบรมทั้งสิ้น ๓๐ ชั่วโมง และมีผลการทดสอบผ่านเกณฑ์มาตรฐานที่กำหนดทุกประการ</p>
<p style="text-indent: 2.5em; margin-bottom: 1.5em;">ให้ไว้ ณ วันที่ ๑๐ กุมภาพันธ์ พุทธศักราช ๒๕๖๙</p>`,
    signer: 'นายสมชาย มุ่งมั่นพัฒนา',
    signerPos: 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง'
  }
];


export async function downloadAsDoc(bodyHTML: string, filename = 'document') {
  try {
    const res = await fetch('/api/export-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: bodyHTML, filename })
    });
    
    if (!res.ok) {
      throw new Error('Failed to generate DOCX via API');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading docx, falling back to .doc:', error);
    fallbackDownloadAsDoc(bodyHTML, filename);
  }
}
