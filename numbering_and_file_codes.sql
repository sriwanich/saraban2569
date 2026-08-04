-- ==========================================================
-- SQL Seed File: Document Numbering Rules & File Category Codes
-- Based on the Regulations of the Prime Minister's Office on Correspondence (ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ)
-- ==========================================================

-- 1. Create numbering_rules table if it does not exist
CREATE TABLE IF NOT EXISTS `numbering_rules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ruleName` VARCHAR(255) NOT NULL,
  `department` VARCHAR(255) DEFAULT NULL,
  `divisionCode` VARCHAR(50) DEFAULT NULL,
  `docType` VARCHAR(100) DEFAULT NULL,
  `prefixPattern` VARCHAR(100) DEFAULT NULL,
  `suffixPattern` VARCHAR(100) DEFAULT NULL,
  `numberFormat` VARCHAR(100) DEFAULT NULL,
  `runningScope` VARCHAR(50) DEFAULT NULL,
  `currentSeq` INT DEFAULT 1,
  `year` VARCHAR(20) DEFAULT NULL,
  `resetFrequency` VARCHAR(50) DEFAULT NULL,
  `isActive` TINYINT(1) DEFAULT 1,
  `description` TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create file_codes table if it does not exist
CREATE TABLE IF NOT EXISTS `file_codes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `department` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Clear existing values to insert fresh, clean seeds
DELETE FROM `numbering_rules`;
DELETE FROM `file_codes`;

-- 4. Seed Standard Document Numbering Rules (รูปแบบเลขทะเบียนหนังสือ)
INSERT INTO `numbering_rules` (
  `id`, `ruleName`, `department`, `divisionCode`, `docType`, `prefixPattern`, `suffixPattern`, `numberFormat`, `runningScope`, `currentSeq`, `year`, `resetFrequency`, `isActive`, `description`
) VALUES
(1, 'ทะเบียนรับสารบรรณกลาง (หนังสือรับ)', 'ทุกฝ่ายงาน', '0021', 'หนังสือรับ', 'รย 0021', '/{seq}', '{prefix}/{seq}', 'global', 101, '2569', 'yearly', 1, 'ทะเบียนการออกเลขรับเอกสารทั่วไปสำหรับหนังสือราชการภายนอกและภายในส่งเข้าสารบรรณกลาง'),
(2, 'ทะเบียนส่งสารบรรณกลาง (หนังสือภายนอก)', 'ทุกฝ่ายงาน', '0021', 'หนังสือภายนอก', 'รย 0021', '/{seq}', '{prefix}/{isCircular ? "ว " : ""}{seq}', 'global', 201, '2569', 'yearly', 1, 'ทะเบียนออกเลขทะเบียนหนังสือส่งภายนอกส่วนราชการของสารบรรณกลาง'),
(3, 'ทะเบียนส่ง ฝ่ายบริหารงานทั่วไป', 'ฝ่ายบริหารงานทั่วไป', '0021.1', 'หนังสือภายนอก', 'รย 0021.1', '/{seq}', '{prefix}/{isCircular ? "ว " : ""}{seq}', 'department', 51, '2569', 'yearly', 1, 'ทะเบียนออกเลขหนังสือส่งภายนอกฝ่ายบริหารงานทั่วไป'),
(4, 'ทะเบียนส่ง ฝ่ายยุทธศาสตร์และการจัดการ', 'ฝ่ายยุทธศาสตร์และการจัดการ', '0021.2', 'หนังสือภายนอก', 'รย 0021.2', '/{seq}', '{prefix}/{isCircular ? "ว " : ""}{seq}', 'department', 41, '2569', 'yearly', 1, 'ทะเบียนออกเลขหนังสือส่งภายนอกฝ่ายยุทธศาสตร์และการจัดการ'),
(5, 'ทะเบียนส่ง ฝ่ายป้องกันและปฏิบัติการ', 'ฝ่ายป้องกันและปฏิบัติการ', '0021.4', 'หนังสือภายนอก', 'รย 0021.4', '/{seq}', '{prefix}/{isCircular ? "ว " : ""}{seq}', 'department', 31, '2569', 'yearly', 1, 'ทะเบียนออกเลขหนังสือส่งภายนอกฝ่ายป้องกันและปฏิบัติการ'),
(6, 'ทะเบียนหนังสือภายใน (บันทึกข้อความ)', 'ทุกฝ่ายงาน', '0021', 'หนังสือภายใน', 'บันทึกข้อความ', '{seq}/{year}', '{prefix} {seq}/{year}', 'global', 151, '2569', 'yearly', 1, 'ทะเบียนส่งหนังสือภายในสำหรับติดต่อประสานงานระหว่างฝ่ายในสำนักงาน'),
(7, 'ทะเบียนคำสั่งผู้บังคับบัญชา (คำสั่ง)', 'ทุกฝ่ายงาน', '0021', 'คำสั่ง', 'คำสั่ง ปภ.ระยอง ที่', '{seq}/{year}', '{prefix} {seq}/{year}', 'global', 21, '2569', 'yearly', 1, 'ทะเบียนออกเลขคำสั่งราชการสำนักงาน ปภ.ระยอง'),
(8, 'ทะเบียนประกาศหน่วยงาน (ประกาศ)', 'ทุกฝ่ายงาน', '0021', 'ประกาศ', 'ประกาศ ปภ.ระยอง ที่', '{seq}/{year}', '{prefix} {seq}/{year}', 'global', 11, '2569', 'yearly', 1, 'ทะเบียนออกเลขประกาศหน่วยงานทางการเพื่อแจ้งต่อสาธารณชน'),
(9, 'ทะเบียนหนังสือรับรองความประพฤติ/สิทธิ์ (หนังสือรับรอง)', 'ทุกฝ่ายงาน', '0021', 'หนังสือรับรอง', 'ใบรับรอง ปภ.รย', '{seq}/{year}', '{prefix} {seq}/{year}', 'global', 6, '2569', 'yearly', 1, 'ทะเบียนออกใบรับรองสิทธิ์ รับรองประวัติ หรือรับรองการอบรม');

-- 5. Seed File Category Codes (รหัสหมวดแฟ้มเอกสารสารบรรณ)
INSERT INTO `file_codes` (
  `id`, `code`, `name`, `department`, `description`
) VALUES
(1, '01', 'งานนโยบายและการบริหารงานทั่วไป', 'ฝ่ายบริหารงานทั่วไป', 'นโยบาย แผนปฏิบัติการ คำสั่งแต่งตั้ง และงานธุรการสนับสนุนทั่วไป'),
(2, '02', 'งานสารบรรณและการรับส่งหนังสือ', 'ฝ่ายบริหารงานทั่วไป', 'ทะเบียนรับ-ส่ง สมุดลงเวลา ทะเบียนหนังสือลับ และงานควบคุมความเร็วเอกสาร'),
(3, '03', 'งานบริหารทรัพยากรบุคคลและอัตรากำลัง', 'ฝ่ายบริหารงานทั่วไป', 'ประวัติพนักงาน แฟ้มเลื่อนระดับ การประเมินผลงาน และการพิจารณาความดีความชอบ'),
(4, '04', 'งานการเงิน บัญชี และพัสดุ', 'ฝ่ายบริหารงานทั่วไป', 'งบประมาณรายจ่าย ทะเบียนพัสดุ สัญญาจัดซื้อจัดจ้าง และเอกสารการเบิกจ่ายการเงิน'),
(5, '05', 'งานยุทธศาสตร์ แผนงาน และงบประมาณโครงการ', 'ฝ่ายยุทธศาสตร์และการจัดการ', 'แผนเผชิญเหตุ แผนป้องกันและบรรเทาสาธารณภัยระยะยาว โครงการความร่วมมือหน่วยงานอื่น'),
(6, '06', 'งานเตรียมความพร้อม ป้องกัน และระงับอัคคีภัย/ภัยพิบัติ', 'ฝ่ายป้องกันและปฏิบัติการ', 'แผนเฝ้าระวังระดับน้ำ แม่น้ำระยอง แม่น้ำประแสร์ และแผนซ้อมดับเพลิงเทศบาล'),
(7, '07', 'งานฝึกอบรมและเผยแพร่วิชาการด้านบรรเทาสาธารณภัย', 'ฝ่ายป้องกันและปฏิบัติการ', 'โครงการฝึกอบรมเยาวชนอาสา อุปกรณ์การสาธิตคู่มือผจญเพลิง'),
(8, '08', 'งานสงเคราะห์และช่วยเหลือผู้ประสบภัยพิบัติ', 'ฝ่ายสงเคราะห์ผู้ประสบภัย', 'รายงานสถานการณ์วาตภัย อุทกภัย รายชื่อผู้ได้รับชดเชยค่าความเสียหาย');
