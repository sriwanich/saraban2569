// Shared types, datasets and builders for ร่างเอกสาร (Draft Documents)

export interface DraftItem {
  id: number;
  type: string;
  docType: string;
  docNum: string;
  date: string;
  to: string;
  subject: string;
  urgency: string;
  secrecy: string;
  body: string;
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
}

// ── Thai Formatting Helpers ──
export function toThaiNumeral(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[0-9]/g, d => '๐๑๒๓๔๕๖๗๘๙'[parseInt(d, 10)]);
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

export function getLogoHTML(size = 80): string {
  const settings = JSON.parse(localStorage.getItem('moi_settings') || '{}');
  const logo = localStorage.getItem('moi_logo') || localStorage.getItem('moi_schoolLogo') || settings.logoUrl || null;
  if (logo) {
    return `<div style="text-align:center;margin-bottom:6px;">
      <img src="${logo}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;object-fit:contain;display:inline-block;" alt="ตราประจำหน่วยงาน">
    </div>`;
  }
  return `<div style="text-align:center;margin-bottom:6px;">
    <div style="width:${size}px;height:${size}px;border:2px dashed #ccc;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:9px;color:#bbb;background:#fafafa;text-align:center;line-height:1.3;flex-direction:column;margin:0 auto;">ตรา<br>หน่วยงาน</div>
  </div>`;
}

export function getSingleSealHTML(size = 80): string {
  const settings = JSON.parse(localStorage.getItem('moi_settings') || '{}');
  const garudaSrc = localStorage.getItem('moi_garudaCustom') || localStorage.getItem('moi_garuda15') || localStorage.getItem('moi_garuda30') || settings.garuda15Url || settings.garuda30Url || null;
  if (garudaSrc) {
    return `<div style="text-align:center;margin-bottom:6px;">
      <img src="${garudaSrc}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;object-fit:contain;display:inline-block;" alt="ตราครุฑ">
    </div>`;
  }
  return getLogoHTML(size);
}

// ── Word Export helper ──
export function downloadAsDoc(bodyHTML: string, filename = 'document') {
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
  { icon: 'FileText', title: 'หนังสือภายนอก', desc: 'ติดต่อราชการกับหน่วยงานอื่น', template: 'external' },
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
  docType, docNum, date, to, subject, ref, att, body, signer, signerPos, urgency, secrecy, orgName
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
}): string {
  if (docType && (docType.includes('ภายใน') || docType.includes('บันทึก'))) {
    return buildMemoDoc({ docNum, date, to, subject, body, signer, signerPos, urgency, secrecy, orgName });
  }

  const school = orgName || 'องค์กรปกครองส่วนท้องถิ่น';
  const docNumThai = toThaiNumeral(docNum || 'อด ๗๑๒๐๑/..........');
  const dateThai = thDateFull(date);

  const secrecyStamp = secrecy && secrecy !== 'ไม่ลับ'
    ? `<div style="text-align:center;color:#dc2626;font-size:22pt;font-weight:900;letter-spacing:6pt;line-height:1.1;margin:0 0 4pt;">${secrecy}</div>` : '';

  const urgStamp = urgency && urgency !== 'ปกติ'
    ? `<div style="color:#dc2626;font-size:32pt;font-weight:900;line-height:1;margin:0 0 2pt;">${urgency}</div>` : '';

  const sealHTML = getSingleSealHTML(113);

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
  <tr><td style="border:none;padding:0 0 4pt 0;">เรื่อง&nbsp;&nbsp;${subject || ''}</td></tr>
  <tr><td style="border:none;padding:0 0 4pt 0;">เรียน&nbsp;&nbsp;${to || '...'}</td></tr>
  ${ref ? `<tr><td style="border:none;padding:0 0 4pt 0;">อ้างถึง&nbsp;&nbsp;${ref}</td></tr>` : ''}
  ${att ? `<tr><td style="border:none;padding:0 0 4pt 0;">สิ่งที่ส่งมาด้วย&nbsp;&nbsp;${att}</td></tr>` : ''}
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
      <div style="font-size:16pt;line-height:1.5;">${signerPos || 'ปลัดองค์กรปกครองส่วนท้องถิ่น'}</div>
    </td>
  </tr>
</table>
</div>`;
}

export function buildMemoDoc({
  docNum, date, to, subject, body, signer, signerPos, urgency, secrecy, orgName
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
}): string {
  const school = orgName || 'องค์กรปกครองส่วนท้องถิ่น';
  const docNumThai = toThaiNumeral(docNum || 'อด ๗๑๒๐๑/..........');
  const dateThai = thDateFull(date);

  const settings = JSON.parse(localStorage.getItem('moi_settings') || '{}');
  const garudaSrc = localStorage.getItem('moi_garudaCustom') || localStorage.getItem('moi_garuda15') || localStorage.getItem('moi_garuda30') || settings.garuda15Url || settings.garuda30Url || null;
  const seal = garudaSrc
    ? `<img src="${garudaSrc}" width="57" height="57" style="width:57px;height:57px;object-fit:contain;" alt="ตราครุฑ">`
    : `<div style="width:57px;height:57px;border:1px dashed #ccc;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:8px;color:#bbb;">ครุฑ ๑.๕ ซม.</div>`;

  return `<div style="font-family:'TH SarabunPSK','Sarabun',sans-serif;font-size:16pt;line-height:1.5;max-width:800px;margin:0 auto;color:#000;">
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
  <span style="font-size:20pt;font-weight:700;">ส่วนราชการ</span>&nbsp;&nbsp;สำนักปลัด&nbsp;&nbsp;${school}
</div>
<table width="100%" cellpadding="0" cellspacing="0" style="border:none;border-collapse:collapse;line-height:1.6;">
  <tr>
    <td style="border:none;padding:0;width:55%;">
      <span style="font-size:20pt;font-weight:700;">ที่</span>&nbsp;&nbsp;${docNumThai}
    </td>
    <td style="border:none;padding:0;">
      <span style="font-size:20pt;font-weight:700;">วันที่</span>&nbsp;&nbsp;${dateThai}
    </td>
  </tr>
</table>
<div style="line-height:1.6;">
  <span style="font-size:20pt;font-weight:700;">เรื่อง</span>&nbsp;&nbsp;${subject || ''}
</div>
<div style="margin-top:8pt;">เรียน&nbsp;&nbsp;${to || '...'}</div>

<div style="margin-top:6pt;text-align:justify;">${body || ''}</div>

<table width="100%" cellpadding="0" cellspacing="0" style="border:none;border-collapse:collapse;margin-top:16pt;">
  <tr>
    <td width="45%" style="border:none;"></td>
    <td width="55%" style="border:none;text-align:center;vertical-align:bottom;padding:0;">
      <div style="height:48pt;"></div>
      <div style="font-size:16pt;line-height:1.5;">(${signer || '..................................'})</div>
      <div style="font-size:16pt;line-height:1.5;">${signerPos || 'ปลัดองค์กรปกครองส่วนท้องถิ่น'}</div>
    </td>
  </tr>
</table>
</div>`;
}

// ── Order Authority Presets ──
export const ORDER_AUTHORITY: Record<string, string> = {
  appoint_committee: `อาศัยอำนาจตามมาตรา ๕๙ แห่งพระราชบัญญัติสภาตำบลและองค์การบริหารส่วนตำบล พ.ศ. ๒๕๓๗ และที่แก้ไขเพิ่มเติม`,
  appoint_council: `อาศัยอำนาจตามมาตรา ๔๕ แห่งพระราชบัญญัติสภาตำบลและองค์การบริหารส่วนตำบล พ.ศ. ๒๕๓๗ และที่แก้ไขเพิ่มเติม`,
  appoint_head: `อาศัยอำนาจตามมาตรา ๕๙ แห่งพระราชบัญญัติสภาตำบลและองค์การบริหารส่วนตำบล พ.ศ. ๒๕๓๗`,
  appoint_duty: `อาศัยอำนาจตามมาตรา ๕๙ แห่งพระราชบัญญัติสภาตำบลและองค์การบริหารส่วนตำบล พ.ศ. ๒๕๓๗ ประกอบระเบียบกระทรวงมหาดไทยว่าด้วยการบริหารงานบุคคล`,
  appoint_act: `อาศัยอำนาจตามมาตรา ๕๙ วรรคสอง แห่งพระราชบัญญัติสภาตำบลและองค์การบริหารส่วนตำบล พ.ศ. ๒๕๓๗`,
  appoint_welfare: `อาศัยอำนาจตามมาตรา ๕๙ แห่งพระราชบัญญัติสภาตำบลและองค์การบริหารส่วนตำบล พ.ศ. ๒๕๓๗`,
  appoint_finance: `อาศัยอำนาจตามระเบียบกระทรวงมหาดไทยว่าด้วยการรับเงิน การเบิกจ่ายเงิน การฝากเงิน การเก็บรักษาเงิน และการตรวจเงินขององค์กรปกครองส่วนท้องถิ่น พ.ศ. ๒๕๔๗`,
  appoint_procure: `อาศัยอำนาจตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖₀ มาตรา ๓๒ และมาตรา ๓๖`,
  appoint_audit: `อาศัยอำนาจตามระเบียบกระทรวงมหาดไทยว่าด้วยการตรวจสอบภายในขององค์กรปกครองส่วนท้องถิ่น พ.ศ. ๒๕๔๕`,
  appoint_inspect: `อาศัยอำนาจตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖₀ มาตรา ๙๓`,
  appoint_receive: `อาศัยอำนาจตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖₀ มาตรา ๑๐๓`,
  travel: `อาศัยอำนาจตามระเบียบกระทรวงการคลังว่าด้วยการเบิกค่าใช้จ่ายในการเดินทางไปราชการ พ.ศ. ๒๕๕๐ และที่แก้ไขเพิ่มเติม`,
  attend_training: `อาศัยอำนาจตามระเบียบกระทรวงมหาดไทยว่าด้วยค่าใช้จ่ายในการฝึกอบรม และการเข้ารับการฝึกอบรมของเจ้าหน้าที่ท้องถิ่น พ.ศ. ๒๕๕๗`,
};

export const ORDER_DATA = [
  {
    group: '🏛️ บริหารงานองค์กร', items: [
      { id: 'appoint_committee', title: 'คำสั่งแต่งตั้งคณะกรรมการบริหาร อปท.', type: 'order' },
      { id: 'appoint_council', title: 'คำสั่งแต่งตั้งคณะกรรมการสภา อปท.', type: 'order' },
      { id: 'appoint_head', title: 'คำสั่งแต่งตั้งหัวหน้าส่วนราชการ/หัวหน้ากอง', type: 'order' },
      { id: 'appoint_duty', title: 'คำสั่งมอบหมายหน้าที่บุคลากรประจำปีงบประมาณ', type: 'order' },
      { id: 'appoint_act', title: 'คำสั่งแต่งตั้งรักษาราชการแทน/ปฏิบัติหน้าที่แทน', type: 'order' },
      { id: 'appoint_welfare', title: 'คำสั่งแต่งตั้งคณะกรรมการสวัสดิการพนักงาน', type: 'order' },
      { id: 'appoint_finance', title: 'คำสั่งแต่งตั้งคณะกรรมการบริหารงบประมาณ/การเงิน', type: 'order' },
      { id: 'appoint_procure', title: 'คำสั่งแต่งตั้งกรรมการจัดซื้อจัดจ้าง/ตรวจรับพัสดุ', type: 'order' },
      { id: 'appoint_audit', title: 'คำสั่งแต่งตั้งคณะกรรมการตรวจสอบภายใน', type: 'order' },
    ]
  },
  {
    group: '🏗️ งานช่าง/โครงสร้างพื้นฐาน', items: [
      { id: 'appoint_survey', title: 'คำสั่งแต่งตั้งคณะกรรมการสำรวจออกแบบโครงการก่อสร้าง', type: 'order' },
      { id: 'appoint_inspect', title: 'คำสั่งแต่งตั้งคณะกรรมการตรวจการจ้างและควบคุมงาน', type: 'order' },
      { id: 'appoint_receive', title: 'คำสั่งแต่งตั้งคณะกรรมการตรวจรับงานจ้าง/พัสดุ', type: 'order' },
      { id: 'appoint_road', title: 'คำสั่งแต่งตั้งคณะทำงานโครงการปรับปรุง/ซ่อมแซมถนน', type: 'order' },
      { id: 'appoint_water', title: 'คำสั่งแต่งตั้งคณะทำงานโครงการระบบประปา', type: 'order' },
      { id: 'appoint_electric', title: 'คำสั่งแต่งตั้งคณะทำงานโครงการขยายเขตไฟฟ้า', type: 'order' },
      { id: 'appoint_drainage', title: 'คำสั่งแต่งตั้งคณะทำงานโครงการระบบระบายน้ำ', type: 'order' },
    ]
  },
  {
    group: '👥 งานพัฒนาชุมชนและสังคม', items: [
      { id: 'appoint_welfare_com', title: 'คำสั่งแต่งตั้งคณะกรรมการสงเคราะห์ผู้สูงอายุ/ผู้พิการ', type: 'order' },
      { id: 'appoint_child', title: 'คำสั่งแต่งตั้งคณะกรรมการศูนย์พัฒนาเด็กเล็ก', type: 'order' },
      { id: 'appoint_sport', title: 'คำสั่งแต่งตั้งคณะกรรมการดำเนินการแข่งขันกีฬาชุมชน', type: 'order' },
      { id: 'appoint_culture', title: 'คำสั่งแต่งตั้งคณะกรรมการจัดงานประเพณีวัฒนธรรมท้องถิ่น', type: 'order' },
      { id: 'appoint_otop', title: 'คำสั่งแต่งตั้งคณะกรรมการส่งเสริมอาชีพ/OTOP', type: 'order' },
      { id: 'appoint_guard', title: 'คำสั่งแต่งตั้งเวรรักษาการณ์สถานที่ราชการ', type: 'order' },
      { id: 'appoint_drug_local', title: 'คำสั่งแต่งตั้งคณะกรรมการป้องกันยาเสพติด', type: 'order' },
      { id: 'appoint_disaster', title: 'คำสั่งแต่งตั้งคณะกรรมการป้องกันบรรเทาสาธารณภัย', type: 'order' },
    ]
  },
  {
    group: '📋 งานพัสดุ/จัดซื้อจัดจ้าง', items: [
      { id: 'appoint_price', title: 'คำสั่งแต่งตั้งคณะกรรมการกำหนดราคากลาง', type: 'order' },
      { id: 'appoint_bid_e', title: 'คำสั่งแต่งตั้งคณะกรรมการจัดซื้อจัดจ้าง (e-bidding)', type: 'order' },
      { id: 'appoint_bid_special', title: 'คำสั่งแต่งตั้งคณะกรรมการจัดซื้อ (วิธีเฉพาะเจาะจง)', type: 'order' },
      { id: 'appoint_dispose', title: 'คำสั่งแต่งตั้งคณะกรรมการจำหน่ายพัสดุชำรุดเสื่อมสภาพ', type: 'order' },
    ]
  },
  {
    group: '✈️ การเดินทางราชการ', items: [
      { id: 'travel', title: 'คำสั่งอนุมัติให้บุคลากรไปราชการ', type: 'order' },
      { id: 'attend_training', title: 'คำสั่งให้บุคลากรเข้ารับการอบรม/ประชุม/สัมมนา', type: 'order' },
      { id: 'study_trip', title: 'คำสั่งอนุมัติเดินทางศึกษาดูงาน', type: 'order' },
      { id: 'competition_trip', title: 'คำสั่งให้บุคลากรเดินทางนำเสนอผลงาน/รับรางวัล', type: 'order' },
    ]
  },
  {
    group: '📢 ประกาศ อปท.', items: [
      { id: 'announce_enroll', title: 'ประกาศ รับสมัครพนักงาน/ลูกจ้าง อปท.', type: 'announce' },
      { id: 'announce_result', title: 'ประกาศ ผลการคัดเลือก/สอบแข่งขันบุคลากร', type: 'announce' },
      { id: 'announce_score', title: 'ประกาศ ผลการประเมินผลการปฏิบัติงาน', type: 'announce' },
      { id: 'announce_close', title: 'ประกาศ หยุดให้บริการ/ปิดทำการชั่วคราว', type: 'announce' },
      { id: 'announce_holiday', title: 'ประกาศ วันหยุดราชการพิเศษ/วันหยุดชดเชย', type: 'announce' },
      { id: 'announce_uniform', title: 'ประกาศ แนวปฏิบัติการแต่งกายบุคลากร อปท.', type: 'announce' },
      { id: 'announce_procure', title: 'ประกาศ ประกวดราคา/เชิญชวนจัดซื้อจัดจ้าง', type: 'announce' },
      { id: 'announce_winner', title: 'ประกาศ ผู้ชนะการเสนอราคา/จัดซื้อจัดจ้าง', type: 'announce' },
      { id: 'announce_award', title: 'ประกาศ บุคลากรดีเด่น / รางวัลผลงาน อปท.', type: 'announce' },
      { id: 'announce_fee', title: 'ประกาศ ค่าธรรมเนียม/ภาษีท้องถิ่น', type: 'announce' },
      { id: 'announce_disaster', title: 'ประกาศ สถานการณ์ภัยพิบัติ/เหตุฉุกเฉิน', type: 'announce' },
      { id: 'announce_rule', title: 'ประกาศ ข้อบัญญัติ/ระเบียบ อปท. ฉบับปรับปรุง', type: 'announce' },
      { id: 'announce_calendar', title: 'ประกาศ แผนการดำเนินงานประจำปีงบประมาณ', type: 'announce' },
      { id: 'announce_budget', title: 'ประกาศ ข้อบัญญัติงบประมาณรายจ่ายประจำปี', type: 'announce' },
      { id: 'announce_drug', title: 'ประกาศ รณรงค์ต้านยาเสพติดในชุมชน', type: 'announce' },
    ]
  }
];

export function getOrderBackground(id: string, orgName: string, foundTitle?: string): string {
  const org = orgName || 'องค์กรปกครองส่วนท้องถิ่น';
  const bgMap: Record<string, string> = {
    appoint_committee: `ด้วย ${org} มีความจำเป็นต้องแต่งตั้งคณะกรรมการบริหาร เพื่อทำหน้าที่กำกับ ส่งเสริม สนับสนุน และติดตามการดำเนินงานขององค์กรปกครองส่วนท้องถิ่น ให้เป็นไปตามนโยบายและแผนพัฒนาท้องถิ่น`,
    appoint_council: `ด้วย ${org} มีความจำเป็นต้องแต่งตั้งคณะกรรมการสภาท้องถิ่น เพื่อทำหน้าที่ตามอำนาจหน้าที่ที่กฎหมายบัญญัติไว้ ในการกำกับ ตรวจสอบ และให้ความเห็นชอบการดำเนินงาน`,
    appoint_head: `ด้วย ${org} มีความจำเป็นต้องแต่งตั้งหัวหน้าส่วนราชการเพื่อกำกับดูแลการปฏิบัติงานภายในแต่ละกองหรือส่วน ให้บรรลุเป้าหมายตามนโยบายและแผนพัฒนาท้องถิ่นอย่างมีประสิทธิภาพ`,
    appoint_duty: `ด้วย ${org} มีความจำเป็นต้องมอบหมายหน้าที่ให้พนักงานส่วนตำบล/เทศบาล ลูกจ้างประจำ และพนักงานจ้าง ปฏิบัติงานตามความรู้ความสามารถ เพื่อให้การบริหารราชการส่วนท้องถิ่นดำเนินไปด้วยความเรียบร้อยมีประสิทธิภาพ`,
    appoint_act: `ด้วยนายก ${org} หรือผู้บริหาร มีความจำเป็นต้องไม่อยู่ในที่ตั้ง/ลาพักผ่อน/ไปราชการ จึงมีความจำเป็นต้องแต่งตั้งผู้รักษาราชการแทน เพื่อให้การบริหารจัดการดำเนินไปอย่างต่อเนื่อง`,
    appoint_welfare: `ด้วย ${org} มีความจำเป็นต้องแต่งตั้งคณะกรรมการสวัสดิการพนักงาน เพื่อส่งเสริม ดูแล และพัฒนาสวัสดิการของบุคลากร ให้มีคุณภาพชีวิตที่ดีและมีขวัญกำลังใจในการปฏิบัติงาน`,
    appoint_finance: `ด้วย ${org} มีความจำเป็นต้องแต่งตั้งคณะกรรมการบริหารงบประมาณและการเงิน เพื่อกำกับดูแลการใช้จ่ายเงินงบประมาณให้เป็นไปตามระเบียบกระทรวงมหาดไทย`,
    appoint_procure: `ด้วย ${org} มีความจำเป็นต้องดำเนินการจัดซื้อจัดจ้าง จึงต้องแต่งตั้งคณะกรรมการตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐`,
    travel: `ด้วย ${org} มีความจำเป็นต้องส่งบุคลากรเดินทางไปปฏิบัติราชการ ณ สถานที่ตามระบุ`,
    attend_training: `ด้วย ${org} ได้รับแจ้งให้ส่งบุคลากรเข้ารับการอบรม/ประชุม/สัมมนา เพื่อพัฒนาศักยภาพและสมรรถนะในการบริหารจัดการองค์กรปกครองส่วนท้องถิ่น`
  };
  return bgMap[id] || `ด้วย ${org} มีความจำเป็นต้องดำเนินการ${foundTitle ? foundTitle.replace('คำสั่ง', '').replace('ประกาศ', '') : 'ตามภารกิจ'} เพื่อให้การบริหารจัดการองค์กรปกครองส่วนท้องถิ่นเป็นไปด้วยความเรียบร้อยและมีประสิทธิภาพ`;
}

// ── Speech Templates ──
export const SPEECH_DATA = [
  {
    group: '🇹🇭 วันสำคัญแห่งชาติและราชสำนัก', level: 'all', items: [
      {
        id: 'national_day',
        title: 'คำกล่าวเนื่องในวันชาติ / วันเฉลิมพระชนมพรรษา',
        content: (d: any) => `<p style="text-align:center;font-size:16pt;font-weight:bold;margin:0 0 4pt;">คำกล่าว</p>
<p style="text-align:center;font-size:15pt;margin:0 0 2pt;">เนื่องในโอกาสวันเฉลิมพระชนมพรรษา ประจำปีพุทธศักราช ${d.year || ''}</p>
<p style="text-align:center;font-size:14pt;margin:0 0 12pt;">${d.schoolName || ''}</p>
<p style="text-indent:3em;margin:0 0 8pt;">ข้าพระพุทธเจ้า คณะผู้บริหาร สมาชิกสภา พนักงาน และลูกจ้าง ${d.schoolName || 'องค์กรปกครองส่วนท้องถิ่น'} ขอน้อมเกล้าน้อมกระหม่อมถวายพระพรชัยมงคล แด่พระบาทสมเด็จพระปรเมนทรรามาธิบดีศรีสินทรมหาวชิราลงกรณฯ พระวชิรเกล้าเจ้าอยู่หัว ด้วยความจงรักภักดีและสำนึกในพระมหากรุณาธิคุณเป็นล้นพ้น</p>
<p style="text-indent:3em;margin:0 0 8pt;">ขอพระองค์ทรงพระเจริญยิ่งยืนนาน ด้วยเกล้าด้วยกระหม่อม ขอเดชะ</p>`
      },
      {
        id: 'father_day',
        title: 'คำกล่าวเนื่องในวันพ่อแห่งชาติ ๕ ธันวาคม',
        content: (d: any) => `<p style="text-align:center;font-size:16pt;font-weight:bold;margin:0 0 4pt;">คำกล่าว</p>
<p style="text-align:center;font-size:15pt;margin:0 0 2pt;">เนื่องในวันพ่อแห่งชาติ ๕ ธันวาคม ประจำปีพุทธศักราช ${d.year || ''}</p>
<p style="text-align:center;font-size:14pt;margin:0 0 12pt;">${d.schoolName || ''}</p>
<p style="text-indent:3em;margin:0 0 8pt;">ข้าพระพุทธเจ้า คณะผู้บริหาร สมาชิกสภา พนักงาน ลูกจ้าง และประชาชน ${d.schoolName || 'อปท.'} ขอน้อมรำลึกถึงพระมหากรุณาธิคุณของพระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร</p>`
      }
    ]
  },
  {
    group: '🏛️ พิธีการองค์กรปกครองส่วนท้องถิ่น', level: 'all', items: [
      {
        id: 'annual_day',
        title: 'คำกล่าวเปิดงานวันสถาปนา อปท. / วันครบรอบ',
        content: (d: any) => `<p style="text-align:center;font-size:16pt;font-weight:bold;margin:0 0 4pt;">คำกล่าวรายงาน</p>
<p style="text-align:center;font-size:15pt;margin:0 0 2pt;">งานวันครบรอบ${d.projectName || 'ก่อตั้ง'} ${d.schoolName || 'อปท.'}</p>
<p style="text-indent:3em;margin:0 0 8pt;">กราบเรียน ${d.chairman || 'ท่านประธาน'} ที่เคารพอย่างสูง</p>
<p style="text-indent:3em;margin:0 0 8pt;">กระผม/ดิฉัน ${d.speaker || '...'} ขอรายงานว่า ${d.schoolName || 'อปท.'} ได้ดำเนินงานพัฒนาท้องถิ่นรับใช้ประชาชนมาอย่างต่อเนื่อง...</p>`
      },
      {
        id: 'children_day',
        title: 'คำกล่าวเปิดงานวันเด็กแห่งชาติ',
        content: (d: any) => `<p style="text-align:center;font-size:16pt;font-weight:bold;margin:0 0 4pt;">คำกล่าวรายงาน</p>
<p style="text-align:center;font-size:15pt;margin:0 0 2pt;">งานวันเด็กแห่งชาติ ประจำปีพุทธศักราช ${d.year || ''}</p>
<p style="text-indent:3em;margin:0 0 8pt;">กราบเรียน ${d.chairman || 'ท่านประธาน'} ที่เคารพอย่างสูง</p>
<p style="text-indent:3em;margin:0 0 8pt;">${d.schoolName || 'อปท.'} ได้จัดงานวันเด็กแห่งชาติ เพื่อส่งเสริมเด็กและเยาวชนในชุมชน...</p>`
      }
    ]
  }
];
