/**
 * Thai Date & Fiscal Year Utilities
 * ตามระเบียบราชการไทย:
 * ปีงบประมาณ เริ่มตั้งแต่วันที่ 1 ตุลาคม ของปีก่อนหน้า ถึง 30 กันยายน ของปีงบประมาณนั้น
 * เช่น 1 ต.ค. 2568 - 30 ก.ย. 2569 คือ ปีงบประมาณ 2569
 */

export const THAI_MONTH_MAP: Record<string, number> = {
  'มกราคม': 1, 'ม.ค.': 1, 'ม.ค': 1,
  'กุมภาพันธ์': 2, 'ก.พ.': 2, 'ก.พ': 2,
  'มีนาคม': 3, 'มี.ค.': 3, 'มี.ค': 3,
  'เมษายน': 4, 'เม.ย.': 4, 'เม.ย': 4,
  'พฤษภาคม': 5, 'พ.ค.': 5, 'พ.ค': 5,
  'มิถุนายน': 6, 'มิ.ย.': 6, 'มิ.ย': 6,
  'กรกฎาคม': 7, 'ก.ค.': 7, 'ก.ค': 7,
  'สิงหาคม': 8, 'ส.ค.': 8, 'ส.ค': 8,
  'กันยายน': 9, 'ก.ย.': 9, 'ก.ย': 9,
  'ตุลาคม': 10, 'ต.ค.': 10, 'ต.ค': 10,
  'พฤศจิกายน': 11, 'พ.ย.': 11, 'พ.ย': 11,
  'ธันวาคม': 12, 'ธ.ค.': 12, 'ธ.ค': 12
};

/**
 * ดึงปีงบประมาณ (พ.ศ.) จากข้อความวันที่ในเอกสาร (docDate)
 * ไม่ใช้วันที่ลงทะเบียน (createdAt)
 */
export function getFiscalYearFromDocDate(docDateStr?: string, startDateStr?: string): number | null {
  const raw = (docDateStr || startDateStr || '').trim();
  if (!raw) return null;

  // แปลงเลขไทยเป็นเลขอารบิก
  const normalized = raw.replace(/[๐-๙]/g, m => '๐๑๒๓๔๕๖๗๘๙'.indexOf(m).toString());

  // 1. ตรวจสอบปี พ.ศ. (4 หลัก เช่น 2568, 2569)
  let year: number | null = null;
  const matchThaiYear = normalized.match(/(?:พ\.?ศ\.?\s*)?(25\d{2}|26\d{2})/);
  if (matchThaiYear) {
    year = parseInt(matchThaiYear[1], 10);
  } else {
    // ปี ค.ศ. (เช่น 2025 -> 2568)
    const matchCEYear = normalized.match(/(20\d{2})/);
    if (matchCEYear) {
      year = parseInt(matchCEYear[1], 10) + 543;
    } else {
      // ปี 2 หลัก (เช่น 68, 69)
      const matchShortYear = normalized.match(/(?:[\s\/\-\.]|^)(\d{2})(?:$|[\s\/\-\.])/);
      if (matchShortYear) {
        const val = parseInt(matchShortYear[1], 10);
        if (val >= 50 && val <= 99) year = 2500 + val;
      }
    }
  }

  if (!year) return null;

  // 2. ตรวจสอบเดือน (ชื่อเดือนภาษาไทย)
  let month: number | null = null;
  for (const [mName, mNum] of Object.entries(THAI_MONTH_MAP)) {
    if (normalized.includes(mName)) {
      month = mNum;
      break;
    }
  }

  // หากไม่พบชื่อเดือน ให้ตรวจหาจากรูปแบบตัวเลข เช่น DD/MM/YYYY หรือ YYYY-MM-DD
  if (!month) {
    const isoMatch = normalized.match(/\d{4}[\-\/](\d{1,2})[\-\/]\d{1,2}/);
    if (isoMatch) {
      month = parseInt(isoMatch[1], 10);
    } else {
      const dmyMatch = normalized.match(/\d{1,2}[\-\/](\d{1,2})[\-\/]\d{2,4}/);
      if (dmyMatch) {
        month = parseInt(dmyMatch[1], 10);
      }
    }
  }

  // กฎปีงบประมาณไทย: เดือน 10 (ตุลาคม), 11 (พฤศจิกายน), 12 (ธันวาคม)
  // นับเป็นปีงบประมาณถัดไป (ปี พ.ศ. + 1)
  if (month && month >= 10 && month <= 12) {
    return year + 1;
  }

  return year;
}

/**
 * ดึงปีปฏิทิน (พ.ศ.) จากข้อความวันที่ในเอกสาร
 */
export function getCalendarYearFromDocDate(docDateStr?: string, startDateStr?: string): number | null {
  const raw = (docDateStr || startDateStr || '').trim();
  if (!raw) return null;
  const normalized = raw.replace(/[๐-๙]/g, m => '๐๑๒๓๔๕๖๗๘๙'.indexOf(m).toString());
  const matchThaiYear = normalized.match(/(?:พ\.?ศ\.?\s*)?(25\d{2}|26\d{2})/);
  if (matchThaiYear) return parseInt(matchThaiYear[1], 10);
  const matchCEYear = normalized.match(/(20\d{2})/);
  if (matchCEYear) return parseInt(matchCEYear[1], 10) + 543;
  return null;
}

/**
 * แปลงข้อความวันที่ในเอกสารให้เป็น Date Object สำหรับเรียงลำดับหรือแสดงผล
 */
export function parseDateFromDocString(docDateStr?: string, startDateStr?: string): Date | null {
  const raw = (docDateStr || startDateStr || '').trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }

  const normalized = raw.replace(/[๐-๙]/g, m => '๐๑๒๓๔๕๖๗๘๙'.indexOf(m).toString());

  let year: number | null = null;
  const matchThaiYear = normalized.match(/(?:พ\.?ศ\.?\s*)?(25\d{2}|26\d{2})/);
  if (matchThaiYear) {
    year = parseInt(matchThaiYear[1], 10);
  } else {
    const matchCEYear = normalized.match(/(20\d{2})/);
    if (matchCEYear) {
      year = parseInt(matchCEYear[1], 10) + 543;
    }
  }

  let month: number = 1;
  for (const [mName, mNum] of Object.entries(THAI_MONTH_MAP)) {
    if (normalized.includes(mName)) {
      month = mNum;
      break;
    }
  }

  let day: number = 1;
  const slashMatch = normalized.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (slashMatch) {
    day = parseInt(slashMatch[1], 10);
    month = parseInt(slashMatch[2], 10);
    const yr = parseInt(slashMatch[3], 10);
    year = yr < 100 ? 2500 + yr : (yr < 2400 ? yr + 543 : yr);
  } else {
    const dayMatch = normalized.match(/(?:วันที่\s*)?(\d{1,2})\s*(?:[มกพสตธ]|[\/\-\.])/);
    if (dayMatch) {
      const dVal = parseInt(dayMatch[1], 10);
      if (dVal >= 1 && dVal <= 31) day = dVal;
    }
  }

  if (!year) return null;
  const gregorianYear = year > 2400 ? year - 543 : year;
  const d = new Date(gregorianYear, month - 1, day);
  return isNaN(d.getTime()) ? null : d;
}
