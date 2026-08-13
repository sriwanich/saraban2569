export interface FileCodeItem {
  id?: number | string;
  code: string;
  name: string;
  department: string;
  description?: string;
}

export const DEFAULT_FILE_CODES: FileCodeItem[] = [
  { id: 1, code: '0021', name: 'งานบริหารทั่วไปและสารบรรณกลาง', department: 'ฝ่ายบริหารงานทั่วไป', description: 'งานบริหารทั่วไป งานสารบรรณกลาง สารบรรณจังหวัด' },
  { id: 2, code: '0021.1', name: 'งานยุทธศาสตร์และแผนงาน', department: 'ฝ่ายยุทธศาสตร์และการจัดการ', description: 'แผนป้องกันและบรรเทาสาธารณภัย โครงการยุทธศาสตร์' },
  { id: 3, code: '0021.2', name: 'งานสงเคราะห์และช่วยเหลือผู้ประสบภัย', department: 'ฝ่ายสงเคราะห์ผู้ประสบภัย', description: 'การให้ความช่วยเหลือ เงินชดเชย ผู้ประสบภัยพิบัติ' },
  { id: 4, code: '0021.3', name: 'งานป้องกัน ปฏิบัติการ และกู้ภัย', department: 'ฝ่ายป้องกันและปฏิบัติการ', description: 'งานบรรเทาสาธารณภัย เครื่องจักรกล อุปกรณ์กู้ภัย' },
  { id: 5, code: '0022', name: 'งานการเงิน บัญชี และงบประมาณ', department: 'ฝ่ายบริหารงานทั่วไป', description: 'งานเบิกจ่าย งบประมาณ บัญชี และการเงิน' },
  { id: 6, code: '0023', name: 'งานพัสดุและอาคารสถานที่', department: 'ฝ่ายบริหารงานทั่วไป', description: 'งานจัดซื้อจัดจ้าง พัสดุ คุรุภัณฑ์ และอาคารสถานที่' }
];

/**
 * Extracts or detects File Code (รหัสแฟ้ม) information from a document item
 */
export function parseFileCodeFromDoc(
  doc: { fileCode?: string; fileCodeName?: string; docNumber?: string; note?: string; department?: string },
  customFileCodes?: FileCodeItem[]
): { code: string; name: string; department: string } {
  const fileCodesList = customFileCodes && customFileCodes.length > 0 ? customFileCodes : DEFAULT_FILE_CODES;

  // 1. Direct explicit fileCode property
  if (doc.fileCode && doc.fileCode.trim()) {
    const found = fileCodesList.find(f => f.code === doc.fileCode?.trim());
    return {
      code: doc.fileCode.trim(),
      name: doc.fileCodeName || (found ? found.name : 'หมวดแฟ้มสารบรรณ'),
      department: found ? found.department : (doc.department || 'ฝ่ายบริหารงานทั่วไป')
    };
  }

  // 2. Check [FILE_CODE:...] inside note
  if (doc.note && doc.note.includes('[FILE_CODE:')) {
    const match = doc.note.match(/\[FILE_CODE:(.*?)\]/);
    if (match && match[1]) {
      const codeFromNote = match[1].trim();
      const found = fileCodesList.find(f => f.code === codeFromNote);
      return {
        code: codeFromNote,
        name: found ? found.name : 'หมวดแฟ้มสารบรรณ',
        department: found ? found.department : (doc.department || 'ฝ่ายบริหารงานทั่วไป')
      };
    }
  }

  // 3. Extract code pattern like 0021.1, 0021.2, 0021.3, 0021, 0022, 0023 from docNumber
  if (doc.docNumber) {
    // Match longest codes first (e.g. 0021.1 before 0021)
    const sortedCodes = [...fileCodesList].sort((a, b) => b.code.length - a.code.length);
    for (const fc of sortedCodes) {
      if (doc.docNumber.includes(fc.code)) {
        return {
          code: fc.code,
          name: fc.name,
          department: fc.department
        };
      }
    }

    // Regex fallback for any 00XX or 00XX.X format
    const match = doc.docNumber.match(/(00\d{2}(?:\.\d+)?)/);
    if (match && match[1]) {
      const code = match[1];
      const found = fileCodesList.find(f => f.code === code);
      return {
        code,
        name: found ? found.name : 'หมวดแฟ้มสารบรรณ',
        department: found ? found.department : (doc.department || 'ฝ่ายบริหารงานทั่วไป')
      };
    }
  }

  // 4. Fallback based on department
  if (doc.department) {
    const foundDept = fileCodesList.find(f => f.department === doc.department);
    if (foundDept) {
      return {
        code: foundDept.code,
        name: foundDept.name,
        department: foundDept.department
      };
    }
  }

  // Standard default
  return {
    code: '0021',
    name: 'งานบริหารทั่วไปและสารบรรณกลาง',
    department: 'ฝ่ายบริหารงานทั่วไป'
  };
}

/**
 * Parses and breaks down a document number into structural components
 */
export interface DocNumberStructure {
  raw: string;
  agencyPrefix?: string; // เช่น รย
  fileCode?: string; // เช่น 0021.1
  isCircular?: boolean; // มี ว หรือไม่
  sequenceNumber?: string; // เช่น 124
  year?: string; // เช่น 2569
  adminType?: string; // เช่น คำสั่ง, ประกาศ
  structureType: 'standard_outbox' | 'admin_order' | 'inbox' | 'custom';
  tags: { label: string; value: string; color: string }[];
}

export function parseDocNumberStructure(docNumber: string, docType?: string, category?: string): DocNumberStructure {
  const raw = (docNumber || '').trim();

  if (!raw) {
    return {
      raw: '-',
      structureType: 'custom',
      tags: [{ label: 'สถานะ', value: 'ยังไม่ระบุเลขที่หนังสือ', color: 'gray' }]
    };
  }

  // 1. Admin order/announcement pattern: คำสั่งจังหวัดระยอง ที่ 12/2569 or ประกาศจังหวัดระยอง ที่ 5/2569
  if (docType === 'admin' || raw.includes('คำสั่ง') || raw.includes('ประกาศ') || raw.includes('หนังสือรับรอง')) {
    const match = raw.match(/^(.*?)\s*ที่\s*(\d+)(?:\/(\d+))?/);
    if (match) {
      const titlePrefix = match[1] || (category === 'order' ? 'คำสั่ง' : 'ประกาศ');
      const seq = match[2] || '';
      const yr = match[3] || '2569';
      return {
        raw,
        adminType: titlePrefix,
        sequenceNumber: seq,
        year: yr,
        structureType: 'admin_order',
        tags: [
          { label: 'ชนิดหนังสือ', value: titlePrefix, color: 'purple' },
          { label: 'เลขลำดับคำสั่ง', value: `ที่ ${seq}`, color: 'blue' },
          { label: 'ปี พ.ศ.', value: yr, color: 'amber' }
        ]
      };
    }
  }

  // 2. Standard outbox / internal pattern: รย 0021/123 or รย 0021.1/ว 456
  const outboxMatch = raw.match(/^([ก-ฮA-Z]{2,4})\s*(\d{4}(?:\.\d+)?)\s*\/\s*(ว\s*)?(\d+)/i);
  if (outboxMatch) {
    const agencyPrefix = outboxMatch[1];
    const fileCode = outboxMatch[2];
    const isCircular = Boolean(outboxMatch[3]);
    const sequenceNumber = outboxMatch[4];

    return {
      raw,
      agencyPrefix,
      fileCode,
      isCircular,
      sequenceNumber,
      structureType: 'standard_outbox',
      tags: [
        { label: 'รหัสส่วนราชการ', value: agencyPrefix, color: 'emerald' },
        ...(isCircular ? [{ label: 'หนังสือเวียน', value: 'ว (เวียน)', color: 'amber' }] : []),
        { label: 'เลขลำดับหนังสือ', value: sequenceNumber, color: 'blue' }
      ]
    };
  }

  // 3. Inbox pattern or simple number pattern
  if (/^\d+$/.test(raw)) {
    return {
      raw,
      sequenceNumber: raw,
      structureType: 'inbox',
      tags: [{ label: 'เลขทะเบียนรับ/ลำดับ', value: raw, color: 'blue' }]
    };
  }

  // Fallback
  return {
    raw,
    structureType: 'custom',
    tags: [{ label: 'เลขที่หนังสือ', value: raw, color: 'slate' }]
  };
}
