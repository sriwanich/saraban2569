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

-- Insert seed documents - Inbox
INSERT INTO inbox_documents (id, receiveNumber, year, docNumber, date, priority, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status) VALUES
('doc_001', '1', '2569', 'มท 0612/ว1234', '2026-07-15', 'ด่วนที่สุด', 'ขอส่งแผนการเตรียมพร้อมรับมือสถานการณ์อุทกภัยในช่วงฤดูฝน ประจำปี 2569', 'กรมป้องกันและบรรเทาสาธารณภัย', 'ฝ่ายยุทธศาสตร์และการจัดการ', 'ฝ่ายยุทธศาสตร์และการจัดการ', 'สมชาย ใจดี', 'โปรดศึกษาและดำเนินการจัดเตรียมข้อมูลตามแผนที่กำหนด', 'เนื่องด้วยกรมป้องกันและบรรเทาสาธารณภัยได้คาดการณ์สถานการณ์น้ำฝนในปีนี้...', '2026-07-15', 2, 'เสนอผู้บริหาร'),
('doc_002', '2', '2569', 'รย 0023/567', '2026-07-16', 'ปกติ', 'ขอความอนุเคราะห์สนับสนุนวิทยากรและอุปกรณ์ฝึกอบรมการดับเพลิงเบื้องต้น', 'เทศบาลนครระยอง', 'ฝ่ายป้องกันและปฏิบัติการ', 'ฝ่ายป้องกันและปฏิบัติการ', 'ปรีชา มั่นคง', 'ส่งนายปรีชา มั่นคง เป็นวิทยากรหลักและจัดเตรียมชุดจำลองสถานการณ์ดับเพลิง', 'ด้วยเทศบาลนครระยองมีกำหนดจัดโครงการฝึกอบรมเยาวชนอาสาสมัครป้องกันภัยฝ่ายพลเรือน...', '2026-07-16', 4, 'เสร็จสิ้น')
ON DUPLICATE KEY UPDATE
  receiveNumber=VALUES(receiveNumber),
  year=VALUES(year),
  docNumber=VALUES(docNumber),
  date=VALUES(date),
  priority=VALUES(priority),
  title=VALUES(title),
  fromDept=VALUES(fromDept),
  toDept=VALUES(toDept),
  department=VALUES(department),
  assignee=VALUES(assignee),
  note=VALUES(note),
  content=VALUES(content),
  registerDate=VALUES(registerDate),
  folderId=VALUES(folderId),
  status=VALUES(status);

-- Insert seed documents - Outbox
INSERT INTO outbox_documents (id, receiveNumber, year, docNumber, date, priority, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status) VALUES
('doc_003', '1', '2569', 'รย 0618/789', '2026-07-17', 'ด่วน', 'รายงานสถานการณ์และการให้ความช่วยเหลือเบื้องต้นเหตุวาตภัยในพื้นที่ อ.นิคมพัฒนา', 'ฝ่ายสงเคราะห์ผู้ประสบภัย', 'กรมป้องกันและบรรเทาสาธารณภัย', 'ฝ่ายสงเคราะห์ผู้ประสบภัย', 'สมศรี รักษ์ดี', 'เสนอผู้ว่าราชการจังหวัดลงนามเรียบร้อยและส่งไปยังส่วนกลางแล้ว', 'เรียนอธิบดีกรมป้องกันและบรรเทาสาธารณภัย ตามที่เกิดเหตุวาตภัยเมื่อวันที่ 16 กรกฎาคม...', '2026-07-17', 3, 'เสร็จสิ้น')
ON DUPLICATE KEY UPDATE
  receiveNumber=VALUES(receiveNumber),
  year=VALUES(year),
  docNumber=VALUES(docNumber),
  date=VALUES(date),
  priority=VALUES(priority),
  title=VALUES(title),
  fromDept=VALUES(fromDept),
  toDept=VALUES(toDept),
  department=VALUES(department),
  assignee=VALUES(assignee),
  note=VALUES(note),
  content=VALUES(content),
  registerDate=VALUES(registerDate),
  folderId=VALUES(folderId),
  status=VALUES(status);

-- Insert seed documents - Internal
INSERT INTO internal_documents (id, receiveNumber, year, docNumber, date, priority, title, fromDept, toDept, department, assignee, note, content, registerDate, folderId, status) VALUES
('doc_004', '1', '2569', 'บันทึกข้อความ 1/2569', '2026-07-18', 'ปกติ', 'ขออนุมัติซ่อมบำรุงรถบรรทุกน้ำอเนกประสงค์ หมายเลขทะเบียน บย-4567 ระยอง', 'ฝ่ายป้องกันและปฏิบัติการ', 'ฝ่ายบริหารงานทั่วไป', 'ฝ่ายบริหารงานทั่วไป', 'ปรีชา มั่นคง', 'ประสานอู่ซ่อมด่วนเพื่อความพร้อมในการออกปฏิบัติงาน', 'เนื่องจากรถบรรทุกน้ำอเนกประสงค์ของหน่วยมีอาการสตาร์ทติดยากและมีน้ำมันรั่วไหล...', '2026-07-18', 3, 'ส่งต่อกลุ่มงาน')
ON DUPLICATE KEY UPDATE
  receiveNumber=VALUES(receiveNumber),
  year=VALUES(year),
  docNumber=VALUES(docNumber),
  date=VALUES(date),
  priority=VALUES(priority),
  title=VALUES(title),
  fromDept=VALUES(fromDept),
  toDept=VALUES(toDept),
  department=VALUES(department),
  assignee=VALUES(assignee),
  note=VALUES(note),
  content=VALUES(content),
  registerDate=VALUES(registerDate),
  folderId=VALUES(folderId),
  status=VALUES(status);

-- Insert seed documents - Admin (คำสั่ง/ประกาศ/หนังสือเวียน)
INSERT INTO admin_documents (id, category, docNumber, year, date, title, department, assignee, note, content, registerDate, folderId, status) VALUES
('admin_001', 'order', 'คำสั่ง ปภ.ระยอง ที่ 15/2569', '2569', '2026-07-01', 'คำสั่งแต่งตั้งคณะทำงานเตรียมรับมืออุทกภัยและวาตภัย ประจำฤดูฝน ปี 2569', 'ฝ่ายยุทธศาสตร์และการจัดการ', 'สมชาย ใจดี', 'คำสั่งอย่างเป็นทางการ ลงนามโดยผู้ว่าราชการจังหวัด', 'เรื่อง แต่งตั้งคณะทำงานเตรียมรับมืออุทกภัยและวาตภัย ประจำปี พ.ศ. 2569 ณ จังหวัดระยอง...', '2026-07-01', 1, 'เสร็จสิ้น'),
('admin_002', 'announcement', 'ประกาศ ปภ.ระยอง ที่ 2/2569', '2569', '2026-07-10', 'ประกาศเตือนเฝ้าระวังระดับน้ำในแม่น้ำระยองและแม่น้ำประแสร์ ฉบับที่ 1', 'ฝ่ายป้องกันและปฏิบัติการ', 'ปรีชา มั่นคง', 'ประกาศเพื่อแจ้งเตือนประชาชนผ่านสถานีวิทยุและสื่อออนไลน์', 'ตามประกาศกรมอุตุนิยมวิทยา เรื่องฝนตกหนักถึงหนักมากบริเวณภาคตะวันออก...', '2026-07-10', 2, 'เสร็จสิ้น'),
('admin_003', 'circular', 'หนังสือเวียน ด่วนที่สุด ที่ รย 001/2569', '2569', '2026-07-12', 'แนวทางปฏิบัติเกี่ยวกับการรายงานด่วนกรณีเกิดสาธารณภัยรุนแรงในพื้นที่จังหวัดระยอง', 'ฝ่ายบริหารงานทั่วไป', 'สมศรี รักษ์ดี', 'หนังสือเวียนส่งทุกหน่วยงานส่วนท้องถิ่นและอำเภอในจังหวัดระยอง', 'ถึง นายอำเภอทุกอำเภอ และนายกองค์กรปกครองส่วนท้องถิ่นทุกแห่ง เพื่อความรวดเร็วในการช่วยเหลือ...', '2026-07-12', 3, 'เสร็จสิ้น')
ON DUPLICATE KEY UPDATE
  category=VALUES(category),
  docNumber=VALUES(docNumber),
  year=VALUES(year),
  date=VALUES(date),
  title=VALUES(title),
  department=VALUES(department),
  assignee=VALUES(assignee),
  note=VALUES(note),
  content=VALUES(content),
  registerDate=VALUES(registerDate),
  folderId=VALUES(folderId),
  status=VALUES(status);

-- Insert seed tracking history
INSERT INTO document_tracking (docId, docType, status, comments, updatedBy) VALUES
('doc_001', 'inbox', 'ลงทะเบียน', 'ลงทะเบียนหนังสือรับอย่างเป็นทางการเข้าระบบ', 'สมศรี รักษ์ดี'),
('doc_001', 'inbox', 'เสนอผู้บริหาร', 'เสนอ ผอ.ปภ.ระยอง พิจารณาและสั่งการ', 'สมศรี รักษ์ดี'),
('doc_002', 'inbox', 'ลงทะเบียน', 'ลงทะเบียนหนังสือรับจากเทศบาลนครระยอง', 'สมศรี รักษ์ดี'),
('doc_002', 'inbox', 'ส่งต่อกลุ่มงาน', 'ส่งเรื่องให้ฝ่ายป้องกันและปฏิบัติการพิจารณาจัดเตรียมทีมวิทยากร', 'สมศรี รักษ์ดี'),
('doc_002', 'inbox', 'เสร็จสิ้น', 'มอบหมาย นายปรีชา มั่นคง ออกปฏิบัติงานเป็นวิทยากรเรียบร้อย', 'สมชาย ใจดี');
