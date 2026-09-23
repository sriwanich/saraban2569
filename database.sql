CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  firstName VARCHAR(255),
  lastName VARCHAR(255),
  position VARCHAR(255),
  department VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  avatar VARCHAR(1000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  currentYear INT DEFAULT 2569,
  startSequence INT DEFAULT 1,
  orgName VARCHAR(255),
  headerOrgName VARCHAR(255),
  logoUrl TEXT,
  garuda15Url TEXT,
  garuda30Url TEXT,
  faviconUrl TEXT,
  footerText VARCHAR(255),
  geminiApiKey TEXT,
  smtpHost VARCHAR(255),
  smtpPort INT,
  smtpUser VARCHAR(255),
  smtpPassword VARCHAR(255),
  smtpFrom VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS folders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inbox_documents (
  id VARCHAR(255) PRIMARY KEY,
  receiveNumber VARCHAR(255),
  year VARCHAR(50),
  docNumber VARCHAR(255),
  date VARCHAR(255),
  priority VARCHAR(50),
  title VARCHAR(255),
  fromDept VARCHAR(255),
  toDept VARCHAR(255),
  department VARCHAR(255),
  assignee VARCHAR(255),
  note TEXT,
  content TEXT,
  registerDate VARCHAR(255),
  folderId INT,
  status VARCHAR(50) DEFAULT 'ลงทะเบียน',
  attachments TEXT,
  forwardedTo TEXT,
  forwardedBy VARCHAR(255),
  forwardedAt VARCHAR(255),
  forwardNote TEXT,
  isCentral INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS circular_documents (
  id VARCHAR(255) PRIMARY KEY,
  receiveNumber VARCHAR(255),
  year VARCHAR(50),
  docNumber VARCHAR(255),
  date VARCHAR(255),
  priority VARCHAR(50),
  secrecy VARCHAR(50) DEFAULT "ปกติ",
  title VARCHAR(255),
  fromDept VARCHAR(255),
  toDept VARCHAR(255),
  department VARCHAR(255),
  assignee VARCHAR(255),
  note TEXT,
  content TEXT,
  registerDate VARCHAR(255),
  folderId INT,
  status VARCHAR(50) DEFAULT "ลงทะเบียน",
  attachments TEXT,
  forwardedTo TEXT,
  forwardedBy VARCHAR(255),
  forwardedAt VARCHAR(255),
  forwardNote TEXT,
  isCentral INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS outbox_documents (
  id VARCHAR(255) PRIMARY KEY,
  receiveNumber VARCHAR(255),
  year VARCHAR(50),
  docNumber VARCHAR(255),
  date VARCHAR(255),
  priority VARCHAR(50),
  title VARCHAR(255),
  fromDept VARCHAR(255),
  toDept VARCHAR(255),
  department VARCHAR(255),
  assignee VARCHAR(255),
  note TEXT,
  content TEXT,
  registerDate VARCHAR(255),
  folderId INT,
  status VARCHAR(50) DEFAULT 'ลงทะเบียน',
  attachments TEXT,
  forwardedTo TEXT,
  forwardedBy VARCHAR(255),
  forwardedAt VARCHAR(255),
  forwardNote TEXT,
  isCentral INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS internal_documents (
  id VARCHAR(255) PRIMARY KEY,
  receiveNumber VARCHAR(255),
  year VARCHAR(50),
  docNumber VARCHAR(255),
  date VARCHAR(255),
  priority VARCHAR(50),
  title VARCHAR(255),
  fromDept VARCHAR(255),
  toDept VARCHAR(255),
  department VARCHAR(255),
  assignee VARCHAR(255),
  note TEXT,
  content TEXT,
  registerDate VARCHAR(255),
  folderId INT,
  status VARCHAR(50) DEFAULT 'ลงทะเบียน',
  attachments TEXT,
  forwardedTo TEXT,
  forwardedBy VARCHAR(255),
  forwardedAt VARCHAR(255),
  forwardNote TEXT,
  isCentral INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_documents (
  id VARCHAR(255) PRIMARY KEY,
  category VARCHAR(50), -- 'order' (คำสั่ง), 'announcement' (ประกาศ), 'circular' (หนังสือเวียน)
  docNumber VARCHAR(255),
  year VARCHAR(50),
  date VARCHAR(255),
  title VARCHAR(255),
  department VARCHAR(255),
  assignee VARCHAR(255),
  note TEXT,
  content TEXT,
  registerDate VARCHAR(255),
  folderId INT,
  status VARCHAR(50) DEFAULT 'ลงทะเบียน',
  attachments TEXT,
  forwardedTo TEXT,
  forwardedBy VARCHAR(255),
  forwardedAt VARCHAR(255),
  forwardNote TEXT,
  isCentral INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




-- Table for Numbering Rules
CREATE TABLE IF NOT EXISTS numbering_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ruleName VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  divisionCode VARCHAR(50),
  docType VARCHAR(100),
  prefixPattern VARCHAR(100),
  suffixPattern VARCHAR(100),
  numberFormat VARCHAR(100),
  runningScope VARCHAR(50),
  currentSeq INT DEFAULT 1,
  startSeq INT DEFAULT 1,
  resetFrequency VARCHAR(50),
  isActive TINYINT(1) DEFAULT 1,
  description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for File Codes
CREATE TABLE IF NOT EXISTS file_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for Reserved Numbers
CREATE TABLE IF NOT EXISTS reserved_numbers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ruleId INT,
  docType VARCHAR(100),
  department VARCHAR(255),
  numberString VARCHAR(100),
  seqNumber INT,
  year VARCHAR(20),
  type VARCHAR(50),
  status VARCHAR(50),
  reservedBy VARCHAR(255),
  reservedFor TEXT,
  expiresAt VARCHAR(50),
  usedAt VARCHAR(50),
  usedForDocId VARCHAR(100),
  createdAt VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for Scheduled Auto-Reservations (ตั้งเวลาจองเลขอัตโนมัติตามช่วงเวลา)
CREATE TABLE IF NOT EXISTS scheduled_reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  docType VARCHAR(100),
  prefix VARCHAR(100),
  count INT DEFAULT 1,
  scheduleType VARCHAR(50) DEFAULT 'daily',
  scheduledTime VARCHAR(20) DEFAULT '18:00',
  reservedFor TEXT,
  reservedBy VARCHAR(255),
  isActive TINYINT(1) DEFAULT 1,
  lastRunAt VARCHAR(50),
  nextRunAt VARCHAR(50),
  createdAt VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS draft_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  docType VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  docNumber VARCHAR(255),
  date VARCHAR(255),
  urgency VARCHAR(50) DEFAULT 'ปกติ',
  secrecy VARCHAR(50) DEFAULT 'ปกติ',
  fromDept VARCHAR(255),
  toDept VARCHAR(255),
  subject VARCHAR(500),
  content LONGTEXT,
  signatory VARCHAR(255),
  signatoryPosition VARCHAR(255),
  sealMode VARCHAR(50) DEFAULT 'garuda30',
  status VARCHAR(50) DEFAULT 'draft',
  createdBy VARCHAR(255),
  extraData LONGTEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS department_receives (
  id INT AUTO_INCREMENT PRIMARY KEY,
  docId VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  receiveNumber INT NOT NULL,
  year VARCHAR(50) NOT NULL,
  receivedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  receivedBy VARCHAR(255),
  UNIQUE KEY unique_doc_dept (docId, department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  docId VARCHAR(255) NOT NULL,
  docType VARCHAR(50) NOT NULL, -- 'inbox', 'outbox', 'internal', 'admin', 'memo', 'certificate'
  status VARCHAR(100) NOT NULL,
  comments TEXT,
  updatedBy VARCHAR(255),
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  username VARCHAR(255) DEFAULT 'System',
  ipAddress VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_summaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  year VARCHAR(50),
  type VARCHAR(100),
  owner VARCHAR(255),
  dateStart VARCHAR(100),
  dateEnd VARCHAR(100),
  venue VARCHAR(255),
  budget DECIMAL(15,2) DEFAULT 0,
  budgetPlan DECIMAL(15,2) DEFAULT 0,
  target VARCHAR(255),
  participants INT DEFAULT 0,
  grade VARCHAR(255),
  speaker VARCHAR(255),
  objectives TEXT,
  activities TEXT,
  resultQty TEXT,
  resultQl TEXT,
  problems TEXT,
  suggestions TEXT,
  success VARCHAR(100),
  satisfaction VARCHAR(100),
  policy VARCHAR(255),
  html LONGTEXT,
  createdBy VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert seed users
INSERT INTO users (id, username, password, firstName, lastName, position, department, role) VALUES
(1, 'admin', 'admin', 'ผู้ดูแลระบบ', 'ระบบงาน', 'นักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', 'ฝ่ายบริหารงานทั่วไป', 'admin'),
(2, 'somchai', 'password', 'สมชาย', 'ใจดี', 'นักป้องกันและบรรเทาสาธารณภัยปฏิบัติการ', 'ฝ่ายป้องกันและปฏิบัติการ', 'user'),
(3, 'somsee', 'password', 'สมศรี', 'รักษ์ดี', 'เจ้าพนักงานธุรการชำนาญงาน', 'ฝ่ายบริหารงานทั่วไป', 'user'),
(4, 'preecha', 'password', 'ปรีชา', 'มั่นคง', 'นายช่างเครื่องกลชำนาญงาน', 'ฝ่ายยุทธศาสตร์และการจัดการ', 'user')
ON DUPLICATE KEY UPDATE 
  password=VALUES(password),
  firstName=VALUES(firstName),
  lastName=VALUES(lastName),
  position=VALUES(position),
  department=VALUES(department),
  role=VALUES(role);

-- Insert seed settings
INSERT INTO settings (id, currentYear, startSequence, orgName, logoUrl, footerText)
VALUES (1, 2569, 1, 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง', 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Seal_of_the_Ministry_of_Interior_of_Thailand.svg', '© 2026 ระบบสารบรรณอิเล็กทรอนิกส์ - สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง')
ON DUPLICATE KEY UPDATE
  currentYear=VALUES(currentYear),
  startSequence=VALUES(startSequence),
  orgName=VALUES(orgName),
  logoUrl=VALUES(logoUrl),
  footerText=VALUES(footerText);

-- Insert seed departments
INSERT INTO departments (id, name, description) VALUES
(1, 'ฝ่ายบริหารงานทั่วไป', 'ดูแลงานธุรการ สารบรรณ การเงิน พัสดุ และงานสนับสนุนทั่วไป'),
(2, 'ฝ่ายยุทธศาสตร์และการจัดการ', 'วางแผนและวิเคราะห์นโยบาย จัดทำแผนเผชิญเหตุและแผนงานโครงการต่างๆ'),
(3, 'ฝ่ายสงเคราะห์ผู้ประสบภัย', 'ประสานการให้ความช่วยเหลือ และบรรเทาความเดือดร้อนแก่ผู้ประสบอุทกภัย วาตภัย และภัยพิบัติต่างๆ'),
(4, 'ฝ่ายป้องกันและปฏิบัติการ', 'ปฏิบัติงานกู้ภัย จัดเตรียมบุคลากร เครื่องจักรกล และวิทยากรฝึกอบรมสาธารณภัย')
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  description=VALUES(description);

-- Insert seed positions
INSERT INTO positions (id, name, description) VALUES
(1, 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด', 'ผู้บริหารระดับสูงประจำสำนักงาน ปภ.จังหวัด'),
(2, 'นักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', 'หัวหน้ากลุ่มงาน/ฝ่ายยุทธศาสตร์และการจัดการ'),
(3, 'นักวิเคราะห์นโยบายและแผนชำนาญการ', 'ฝ่ายยุทธศาสตร์และการจัดการ'),
(4, 'เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยชำนาญงาน', 'ฝ่ายป้องกันและปฏิบัติการ'),
(5, 'เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยปฏิบัติงาน', 'ฝ่ายป้องกันและปฏิบัติการ'),
(6, 'เจ้าพนักงานสงเคราะห์ผู้ประสบภัยชำนาญงาน', 'ฝ่ายสงเคราะห์ผู้ประสบภัย'),
(7, 'เจ้าพนักงานการเงินและบัญชีชำนาญงาน', 'ฝ่ายบริหารงานทั่วไป'),
(8, 'เจ้าพนักงานธุรการชำนาญงาน', 'ฝ่ายบริหารงานทั่วไป'),
(9, 'นายช่างเครื่องกลชำนาญงาน', 'ฝ่ายป้องกันและปฏิบัติการ')
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  description=VALUES(description);

-- Insert seed folders
INSERT INTO folders (id, name, description) VALUES
(1, 'แฟ้มคำสั่งผู้ว่าราชการจังหวัด', 'บันทึกคำสั่งสำคัญจากทางจังหวัดและผู้ว่าราชการจังหวัดระยอง'),
(2, 'แฟ้มแผนเตรียมรับมืออุทกภัย 2569', 'แฟ้มรวบรวมแผน ยุทธศาสตร์ และการปฏิบัติการป้องกันอุทกภัยประจำปี'),
(3, 'แฟ้มเอกสารงานสารบรรณทั่วไป', 'เอกสารรับ-ส่งทั่วไปที่ลงทะเบียนไว้ในระบบ'),
(4, 'แฟ้มโครงการอบรมและวิชาการ', 'เอกสารเกี่ยวกับการขอสนับสนุนวิทยากรและจัดอบรมบุคลากร/ประชาชน')
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  description=VALUES(description);

CREATE TABLE IF NOT EXISTS infographics (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  data LONGTEXT,
  thumbnail LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for Changelogs & Release Notes
CREATE TABLE IF NOT EXISTS changelogs (
  id VARCHAR(100) PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  releaseDate VARCHAR(50) NOT NULL,
  type VARCHAR(50) DEFAULT 'minor',
  summary TEXT,
  changes LONGTEXT,
  images LONGTEXT,
  author VARCHAR(255),
  isLatest TINYINT(1) DEFAULT 0,
  isPublished TINYINT(1) DEFAULT 1,
  createdAt VARCHAR(50),
  updatedAt VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS urgent_incidents (
  id VARCHAR(255) PRIMARY KEY,
  docNumber VARCHAR(255),
  docDate VARCHAR(255),
  fromPerson VARCHAR(255),
  toPerson VARCHAR(255),
  incidentTypes TEXT,
  incidentTypeOther VARCHAR(255),
  severity VARCHAR(50),
  startDate VARCHAR(255),
  startTime VARCHAR(255),
  endDate VARCHAR(255),
  endTime VARCHAR(255),
  location TEXT,
  affectedPeople VARCHAR(100),
  affectedHouseholds VARCHAR(100),
  injured VARCHAR(100),
  dead VARCHAR(100),
  missing VARCHAR(100),
  evacuatedPeople VARCHAR(100),
  evacuatedHouseholds VARCHAR(100),
  damageHouses VARCHAR(100),
  damageHighRises VARCHAR(100),
  damageTemples VARCHAR(100),
  damageGovBuildings VARCHAR(100),
  damageOtherBuildings VARCHAR(100),
  damageBuildingCost VARCHAR(100),
  damageAgricultureCrops VARCHAR(100),
  damageAgricultureRice VARCHAR(100),
  damageAgricultureOrchard VARCHAR(100),
  damageAgricultureFish VARCHAR(100),
  damageAgricultureShrimp VARCHAR(100),
  damageLivestockCow VARCHAR(100),
  damageLivestockPig VARCHAR(100),
  damageLivestockPoultry VARCHAR(100),
  damageLivestockOther TEXT,
  damageAgricultureCost VARCHAR(100),
  damagePublicRoads VARCHAR(100),
  damagePublicBridges VARCHAR(100),
  damagePublicBridgeApproaches VARCHAR(100),
  damagePublicWeirs VARCHAR(100),
  damagePublicOther TEXT,
  damagePublicCost VARCHAR(100),
  totalDamageCost VARCHAR(100),
  mitigation TEXT,
  toolsFireTrucks VARCHAR(100),
  toolsWaterTrucks VARCHAR(100),
  toolsRescueTrucks VARCHAR(100),
  toolsFireBoats VARCHAR(100),
  toolsWaterPumps VARCHAR(100),
  toolsOther TEXT,
  opsGovAgencies VARCHAR(100),
  opsPrivateSector VARCHAR(100),
  proposals TEXT,
  reporterName VARCHAR(255),
  reporterPosition VARCHAR(255),
  signatureImage LONGTEXT,
  damageImages TEXT,
  createdAt VARCHAR(255),
  updatedAt VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS document_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  docId VARCHAR(255) NOT NULL,
  versionNumber INT NOT NULL,
  content LONGTEXT,
  changeSummary TEXT,
  modifiedBy VARCHAR(255),
  modifiedAt VARCHAR(100),
  isCurrent TINYINT(1) DEFAULT 0,
  INDEX idx_dv_docId (docId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  content LONGTEXT,
  author VARCHAR(255),
  priority VARCHAR(50) DEFAULT 'normal',
  isActive TINYINT(1) DEFAULT 1,
  createdAt VARCHAR(100),
  updatedAt VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  details TEXT,
  module VARCHAR(100),
  ipAddress VARCHAR(100),
  createdAt VARCHAR(100),
  INDEX idx_ua_username (username),
  INDEX idx_ua_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS custom_doc_numbers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  docId VARCHAR(255) NOT NULL,
  customNumber VARCHAR(255),
  year VARCHAR(50),
  department VARCHAR(255),
  createdAt VARCHAR(100),
  UNIQUE KEY unique_custom_doc (docId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(100),
  type VARCHAR(50) DEFAULT 'external',
  isActive TINYINT(1) DEFAULT 1,
  createdAt VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_templates (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  docType VARCHAR(100) NOT NULL,
  description TEXT,
  steps LONGTEXT,
  isActive TINYINT(1) DEFAULT 1,
  createdAt VARCHAR(50),
  updatedAt VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_instances (
  id VARCHAR(100) PRIMARY KEY,
  templateId VARCHAR(100) NOT NULL,
  templateName VARCHAR(255),
  docId VARCHAR(255) NOT NULL,
  docType VARCHAR(100) NOT NULL,
  docNumber VARCHAR(255),
  docTitle VARCHAR(255),
  currentStepIndex INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'in_progress',
  steps LONGTEXT,
  startedBy VARCHAR(255),
  startedAt VARCHAR(50),
  completedAt VARCHAR(50),
  lastActionAt VARCHAR(50),
  comments LONGTEXT,
  INDEX idx_wfi_doc (docId, docType),
  INDEX idx_wfi_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS digital_signatures (
  id VARCHAR(100) PRIMARY KEY,
  docId VARCHAR(255) NOT NULL,
  docType VARCHAR(100) NOT NULL,
  docTitle VARCHAR(255),
  docNumber VARCHAR(255),
  signerId INT,
  signerName VARCHAR(255) NOT NULL,
  signerPosition VARCHAR(255),
  signerDepartment VARCHAR(255),
  signatureImage LONGTEXT,
  certType VARCHAR(50) DEFAULT 'self_signed',
  signatureHash VARCHAR(255),
  signedAt VARCHAR(50) NOT NULL,
  ipAddress VARCHAR(100),
  verificationUrl TEXT,
  status VARCHAR(50) DEFAULT 'valid',
  metadata LONGTEXT,
  INDEX idx_sig_doc (docId, docType),
  INDEX idx_sig_signer (signerName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  docId VARCHAR(255) NOT NULL,
  docType VARCHAR(100) NOT NULL,
  createdAt VARCHAR(50),
  UNIQUE KEY unique_user_fav (userId, docId, docType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_reads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  docId VARCHAR(255) NOT NULL,
  docType VARCHAR(100) NOT NULL,
  userId INT,
  username VARCHAR(255),
  readAt VARCHAR(50),
  ipAddress VARCHAR(100),
  INDEX idx_reads_doc (docId, docType),
  INDEX idx_reads_user (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recycle_bin (
  id VARCHAR(255) PRIMARY KEY,
  originalId VARCHAR(255) NOT NULL,
  docType VARCHAR(100) NOT NULL,
  docData LONGTEXT NOT NULL,
  deletedBy VARCHAR(255) NOT NULL,
  deletedAt VARCHAR(50) NOT NULL,
  reason TEXT,
  INDEX idx_bin_type (docType),
  INDEX idx_bin_date (deletedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  permissionKey VARCHAR(100) NOT NULL,
  isAllowed TINYINT(1) DEFAULT 1,
  departmentOverride VARCHAR(255) DEFAULT NULL,
  updatedBy VARCHAR(255),
  updatedAt VARCHAR(50),
  UNIQUE KEY unique_role_perm (role, permissionKey, departmentOverride)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enterprise_dynamic_qrs (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  shortCode VARCHAR(50) UNIQUE NOT NULL,
  targetUrl TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  department VARCHAR(255) DEFAULT '',
  createdBy VARCHAR(255) DEFAULT 'ผู้ดูแลระบบ',
  qrStyle LONGTEXT,
  scanCount INT DEFAULT 0,
  isActive TINYINT(1) DEFAULT 1,
  expiresAt VARCHAR(50),
  createdAt VARCHAR(50),
  updatedAt VARCHAR(50),
  INDEX idx_qr_code (shortCode),
  INDEX idx_qr_dept (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enterprise_qr_scans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  qrId VARCHAR(100) NOT NULL,
  shortCode VARCHAR(50) NOT NULL,
  ipAddress VARCHAR(100),
  userAgent TEXT,
  deviceType VARCHAR(50) DEFAULT 'desktop',
  os VARCHAR(50),
  browser VARCHAR(50),
  scannedAt VARCHAR(50),
  INDEX idx_scan_qrid (qrId),
  INDEX idx_scan_date (scannedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enterprise_qr_templates (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  config LONGTEXT,
  isOfficial TINYINT(1) DEFAULT 0,
  createdAt VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS surveys (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  category VARCHAR(100) DEFAULT 'satisfaction',
  category_label VARCHAR(100) DEFAULT 'ความพึงพอใจ',
  department VARCHAR(255) DEFAULT '',
  creator_id VARCHAR(100) DEFAULT 'admin',
  creator_name VARCHAR(255) DEFAULT 'ผู้ดูแลระบบ',
  status VARCHAR(50) DEFAULT 'published',
  settings LONGTEXT,
  questions LONGTEXT,
  view_count INT DEFAULT 0,
  response_count INT DEFAULT 0,
  created_at VARCHAR(50),
  updated_at VARCHAR(50),
  INDEX idx_survey_cat (category),
  INDEX idx_survey_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS survey_responses (
  id VARCHAR(100) PRIMARY KEY,
  survey_id VARCHAR(100) NOT NULL,
  survey_title VARCHAR(255) DEFAULT NULL,
  respondent_name VARCHAR(255) DEFAULT NULL,
  respondent_department VARCHAR(255) DEFAULT NULL,
  respondent_position VARCHAR(255) DEFAULT NULL,
  respondent_phone VARCHAR(50) DEFAULT NULL,
  respondent_email VARCHAR(255) DEFAULT NULL,
  respondent_ip VARCHAR(100) DEFAULT NULL,
  device_info VARCHAR(255) DEFAULT NULL,
  time_spent_seconds INT DEFAULT 0,
  total_score DECIMAL(10,2) DEFAULT NULL,
  answers LONGTEXT,
  submitted_at VARCHAR(50),
  INDEX idx_resp_survey_id (survey_id),
  INDEX idx_resp_submitted (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_backups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fileName VARCHAR(255) NOT NULL,
  fileSize BIGINT NOT NULL,
  backupType VARCHAR(50) NOT NULL,
  createdAt VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS scheduled_backups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  scheduleType VARCHAR(50) DEFAULT 'daily',
  scheduledTime VARCHAR(20) DEFAULT '00:00',
  weeklyDay VARCHAR(20) DEFAULT 'monday',
  intervalHours INT DEFAULT 24,
  backupScope VARCHAR(50) DEFAULT 'full',
  retentionDays INT DEFAULT 7,
  isActive TINYINT(1) DEFAULT 1,
  lastRunAt VARCHAR(50),
  lastStatus VARCHAR(50) DEFAULT 'idle',
  lastFilename VARCHAR(255),
  lastFileSize BIGINT DEFAULT 0,
  description TEXT,
  createdBy VARCHAR(255) DEFAULT 'ผู้ดูแลระบบ',
  createdAt VARCHAR(50),
  nextRunAt VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PERFORMANCE INDEXES --
-- Optimize document filtering and sorting
CREATE INDEX idx_inbox_dept_status ON inbox_documents(department, status);
CREATE INDEX idx_inbox_year ON inbox_documents(year);
CREATE INDEX idx_inbox_created ON inbox_documents(createdAt);

CREATE INDEX idx_outbox_dept_status ON outbox_documents(department, status);
CREATE INDEX idx_outbox_year ON outbox_documents(year);
CREATE INDEX idx_outbox_created ON outbox_documents(createdAt);

CREATE INDEX idx_internal_dept_status ON internal_documents(department, status);
CREATE INDEX idx_internal_year ON internal_documents(year);
CREATE INDEX idx_internal_created ON internal_documents(createdAt);

CREATE INDEX idx_circular_dept_status ON circular_documents(department, status);
CREATE INDEX idx_circular_year ON circular_documents(year);
CREATE INDEX idx_circular_created ON circular_documents(createdAt);

CREATE INDEX idx_admin_category_status ON admin_documents(category, status);
CREATE INDEX idx_admin_year ON admin_documents(year);
CREATE INDEX idx_admin_created ON admin_documents(createdAt);

CREATE INDEX idx_urgent_docdate ON urgent_incidents(docDate);
CREATE INDEX idx_urgent_severity ON urgent_incidents(severity);
CREATE INDEX idx_urgent_created ON urgent_incidents(createdAt);

CREATE INDEX idx_draft_status ON draft_documents(status);
CREATE INDEX idx_draft_created ON draft_documents(createdAt);

CREATE INDEX idx_dept_rec_dept ON department_receives(department);
CREATE INDEX idx_dept_rec_year ON department_receives(year);

CREATE INDEX idx_track_docid_type ON document_tracking(docId, docType);
CREATE INDEX idx_track_status ON document_tracking(status);

CREATE INDEX idx_logs_action ON system_logs(action);
CREATE INDEX idx_logs_created ON system_logs(createdAt);

CREATE INDEX idx_ua_username ON user_activity(username);
CREATE INDEX idx_ua_action ON user_activity(action);
CREATE INDEX idx_ua_created ON user_activity(createdAt);



