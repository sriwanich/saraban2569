export type DocType = 'inbox' | 'outbox' | 'admin';
export type DocCategory = 'order' | 'announcement' | 'circular' | 'certificate' | 'memo';
export type DocPriority = 'ปกติ' | 'ด่วน' | 'ด่วนมาก' | 'ด่วนที่สุด';
export type DocSecrecy = 'ปกติ' | 'ลับ' | 'ลับมาก' | 'ลับที่สุด';

export interface Folder {
  id: number;
  name: string;
  description?: string;
  departmentId?: number | null;
  departmentName?: string | null;
  createdAt?: string;
}

export interface SystemLog {
  id: number;
  action: string;
  details: string;
  username: string;
  ipAddress?: string;
  createdAt: string;
}

export interface TrackingLog {
  id: number;
  docId: string;
  docType: string;
  status: string;
  comments: string;
  updatedBy: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  receiveNumber?: string; // เลขทะเบียนรับ (Optional for admin orders)
  year: string; // ปี
  docNumber: string; // ที่
  date: string; // ลงวันที่
  from: string; // จาก
  to: string; // ถึง
  title: string; // เรื่อง
  department: string; // กลุ่มปฏิบัติ
  assignee: string; // บุคคลปฏิบัติ
  note: string; // หมายเหตุ
  registerDate: string; // วันลงทะเบียน
  type: DocType;
  category?: DocCategory; // หมวดหมู่ระบบธุรการ (order/announcement/circular)
  priority: DocPriority;
  secrecy: DocSecrecy;
  content?: string;
  attachments?: string[];
  folderId?: number | null; // แฟ้มเอกสารดิจิทัล
  folderName?: string | null; // ชื่อแฟ้มเอกสารดิจิทัลจริง
  status?: string; // สถานะหนังสือ เช่น 'ลงทะเบียน', 'เสนอผู้บริหาร', 'ส่งต่อกลุ่มงาน', 'เสร็จสิ้น'
  forwardedTo?: string; // ฝ่ายที่ได้รับส่งต่อหนังสือ
  forwardedBy?: string; // ผู้ส่งต่อหนังสือ
  forwardedAt?: string; // วันเวลาส่งต่อ
  forwardNote?: string; // หมายเหตุ/คำสั่งการส่งต่อ
  isCentral?: number; // 1 = สารบรรณกลาง, 0 = สารบรรณฝ่าย
  isCircular?: boolean; // เป็นหนังสือเวียน (สำหรับหนังสือส่ง)
  departmentReceives?: {
    id: number;
    docId: string;
    department: string;
    receiveNumber: number;
    year: string;
    receivedAt: string;
    receivedBy: string;
  }[];
}

export interface User {
  id: number | string;
  username: string;
  password?: string;
  firstName: string;
  lastName: string;
  position: string;
  department?: string;
  role: 'admin' | 'user';
  isArgon2?: boolean;
  avatar?: string;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
}

export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const parseDateParts = (dateString: string | undefined | null) => {
  if (!dateString) return null;
  const str = String(dateString).trim();
  if (!str) return null;

  // Match YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    let year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1; // 0-indexed
    const day = parseInt(ymdMatch[3], 10);
    
    let hours = 0;
    let minutes = 0;
    const timeMatch = str.match(/T(\d{1,2}):(\d{1,2})/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
    }
    
    if (year < 2400) year += 543; // convert AD to BE if needed

    return { day, month, year, hours, minutes, hasTime: !!timeMatch };
  }

  // Fallback to JS Date object
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;

  let year = d.getFullYear();
  if (year < 2400) year += 543;
  
  return {
    day: d.getDate(),
    month: d.getMonth(),
    year,
    hours: d.getHours(),
    minutes: d.getMinutes(),
    hasTime: true
  };
};

// Returns "15 กรกฎาคม 2569"
export const formatThaiDate = (dateString: string | undefined | null) => {
  const parts = parseDateParts(dateString);
  if (!parts) return dateString || '-';
  return `${parts.day} ${THAI_MONTHS_FULL[parts.month]} ${parts.year}`;
};

// Returns "15/07/2569"
export const formatThaiDateShort = (dateString: string | undefined | null) => {
  const parts = parseDateParts(dateString);
  if (!parts) return dateString || '-';
  const dayStr = String(parts.day).padStart(2, '0');
  const monthStr = String(parts.month + 1).padStart(2, '0');
  return `${dayStr}/${monthStr}/${parts.year}`;
};

// Returns "15 ก.ค. 2569"
export const formatThaiDateMedium = (dateString: string | undefined | null) => {
  const parts = parseDateParts(dateString);
  if (!parts) return dateString || '-';
  return `${parts.day} ${THAI_MONTHS_SHORT[parts.month]} ${parts.year}`;
};

// Returns "15/07/2569 14:30 น."
export const formatThaiDateTime = (dateString: string | undefined | null) => {
  const parts = parseDateParts(dateString);
  if (!parts) return dateString || '-';
  const dayStr = String(parts.day).padStart(2, '0');
  const monthStr = String(parts.month + 1).padStart(2, '0');
  const hh = String(parts.hours).padStart(2, '0');
  const mm = String(parts.minutes).padStart(2, '0');
  return `${dayStr}/${monthStr}/${parts.year} ${hh}:${mm} น.`;
};

// Returns "15 กรกฎาคม 2569 เวลา 14:30 น."
export const formatThaiDateFull = (dateString: string | undefined | null) => {
  const parts = parseDateParts(dateString);
  if (!parts) return dateString || '-';
  const hh = String(parts.hours).padStart(2, '0');
  const mm = String(parts.minutes).padStart(2, '0');
  return `${parts.day} ${THAI_MONTHS_FULL[parts.month]} ${parts.year} เวลา ${hh}:${mm} น.`;
};

export interface WorkflowStep {
  id?: string;
  stepNumber: number;
  title: string;
  assignedRole: string;
  department?: string;
  actionType: 'review' | 'approve' | 'sign' | 'action' | 'archive';
  slaHours: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultPriority?: DocPriority;
  steps: WorkflowStep[];
  createdAt?: string;
}

export interface WorkflowStepInstance {
  stepNumber: number;
  title: string;
  assignedRole: string;
  department: string;
  assignee: string;
  slaHours: number;
  dueAt: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'skipped';
  actionNote?: string;
  actionBy?: string;
  actionAt?: string;
}

export type SLAStatus = 'NORMAL' | 'WARNING' | 'OVERDUE' | 'COMPLETED_ON_TIME' | 'COMPLETED_LATE';

export interface WorkflowInstance {
  id: string;
  docId: string;
  docTitle: string;
  docNumber: string;
  docType: DocType;
  templateId?: string;
  templateName?: string;
  currentStepIndex: number;
  status: 'active' | 'completed' | 'rejected' | 'escalated';
  startedAt: string;
  dueAt: string;
  completedAt?: string;
  department: string;
  assignee: string;
  priority: DocPriority;
  steps: WorkflowStepInstance[];
  slaStatus: SLAStatus;
  lastEscalatedAt?: string;
  escalationsCount?: number;
}

export interface DocumentVersion {
  id: string;
  docId: string;
  docType?: DocType;
  versionNumber: number;
  title: string;
  docNumber: string;
  from?: string;
  to?: string;
  department?: string;
  assignee?: string;
  priority?: DocPriority;
  secrecy?: DocSecrecy;
  content?: string;
  note?: string;
  attachments?: string[];
  changeSummary: string;
  modifiedBy: string;
  modifiedAt: string;
  isCurrent?: boolean;
}


