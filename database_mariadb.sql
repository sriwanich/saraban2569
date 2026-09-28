-- ========================================================
-- ระบบสารบรรณอิเล็กทรอนิกส์ระดับ Enterprise (EDMS Saraban Enterprise)
-- Schema: MariaDB 10.6+ / 11+ & MySQL 8.0+
-- Engine: InnoDB with utf8mb4_unicode_ci
-- ========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. ตารางข้อมูลผู้ใช้งาน (Users)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `firstName` VARCHAR(150) DEFAULT NULL,
  `lastName` VARCHAR(150) DEFAULT NULL,
  `position` VARCHAR(150) DEFAULT NULL,
  `department` VARCHAR(150) DEFAULT NULL,
  `role` VARCHAR(50) DEFAULT 'user',
  `avatar` TEXT DEFAULT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_dept` (`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ตารางหน่วยงาน / กอง / กลุ่มงาน (Departments)
CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `code` VARCHAR(50) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ตารางตำแหน่ง (Positions)
CREATE TABLE IF NOT EXISTS `positions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `level` VARCHAR(100) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ตารางการตั้งค่าระบบองค์กร (Settings)
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `currentYear` INT DEFAULT 2569,
  `startSequence` INT DEFAULT 1,
  `orgName` VARCHAR(255) DEFAULT 'สำนักงานป้องกันและบรรเทาสาธารณภัย',
  `headerOrgName` VARCHAR(255) DEFAULT 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
  `orgCode` VARCHAR(50) DEFAULT 'รย 0021',
  `logoUrl` TEXT DEFAULT NULL,
  `garuda15Url` TEXT DEFAULT NULL,
  `garuda30Url` TEXT DEFAULT NULL,
  `faviconUrl` TEXT DEFAULT NULL,
  `footerText` VARCHAR(255) DEFAULT 'ระบบสารบรรณอิเล็กทรอนิกส์ (EDMS Enterprise)',
  `geminiApiKey` TEXT DEFAULT NULL,
  `smtpHost` VARCHAR(255) DEFAULT NULL,
  `smtpPort` INT DEFAULT 587,
  `smtpUser` VARCHAR(255) DEFAULT NULL,
  `smtpPassword` VARCHAR(255) DEFAULT NULL,
  `smtpFrom` VARCHAR(255) DEFAULT NULL,
  `enabledFeatures` LONGTEXT DEFAULT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ตารางโฟลเดอร์เอกสารดิจิทัล (Folders)
CREATE TABLE IF NOT EXISTS `folders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `color` VARCHAR(50) DEFAULT '#2563eb',
  `description` TEXT DEFAULT NULL,
  `created_by` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_folders_creator` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ทะเบียนหนังสือรับ (Inbox Documents)
CREATE TABLE IF NOT EXISTS `inbox_documents` (
  `id` VARCHAR(100) PRIMARY KEY,
  `doc_number` VARCHAR(100) NOT NULL,
  `receive_number` VARCHAR(100) DEFAULT NULL,
  `receive_date` DATE DEFAULT NULL,
  `receive_time` TIME DEFAULT NULL,
  `title` TEXT NOT NULL,
  `doc_date` DATE DEFAULT NULL,
  `from_source` VARCHAR(255) DEFAULT NULL,
  `to_destination` VARCHAR(255) DEFAULT NULL,
  `urgency` VARCHAR(50) DEFAULT 'ปกติ',
  `secrecy` VARCHAR(50) DEFAULT 'ปกติ',
  `department` VARCHAR(150) DEFAULT NULL,
  `assignee` VARCHAR(150) DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'received',
  `file_url` TEXT DEFAULT NULL,
  `attachments` LONGTEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `content` LONGTEXT DEFAULT NULL,
  `folder_id` INT DEFAULT NULL,
  `forwarded_to` TEXT DEFAULT NULL,
  `forwarded_by` VARCHAR(150) DEFAULT NULL,
  `forwarded_at` VARCHAR(100) DEFAULT NULL,
  `forward_note` TEXT DEFAULT NULL,
  `is_central` INT DEFAULT 1,
  `is_deleted` TINYINT(1) DEFAULT 0,
  `deleted_at` DATETIME DEFAULT NULL,
  `created_by` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_inbox_docnum` (`doc_number`),
  INDEX `idx_inbox_recvnum` (`receive_number`),
  INDEX `idx_inbox_status` (`status`),
  INDEX `idx_inbox_dept` (`department`),
  INDEX `idx_inbox_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. ทะเบียนหนังสือส่ง (Outbox Documents)
CREATE TABLE IF NOT EXISTS `outbox_documents` (
  `id` VARCHAR(100) PRIMARY KEY,
  `doc_number` VARCHAR(100) NOT NULL,
  `title` TEXT NOT NULL,
  `doc_date` DATE DEFAULT NULL,
  `from_source` VARCHAR(255) DEFAULT NULL,
  `to_destination` VARCHAR(255) DEFAULT NULL,
  `urgency` VARCHAR(50) DEFAULT 'ปกติ',
  `secrecy` VARCHAR(50) DEFAULT 'ปกติ',
  `department` VARCHAR(150) DEFAULT NULL,
  `assignee` VARCHAR(150) DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'sent',
  `file_url` TEXT DEFAULT NULL,
  `attachments` LONGTEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `content` LONGTEXT DEFAULT NULL,
  `signer_name` VARCHAR(150) DEFAULT NULL,
  `signer_position` VARCHAR(150) DEFAULT NULL,
  `folder_id` INT DEFAULT NULL,
  `forwarded_to` TEXT DEFAULT NULL,
  `forwarded_by` VARCHAR(150) DEFAULT NULL,
  `forwarded_at` VARCHAR(100) DEFAULT NULL,
  `forward_note` TEXT DEFAULT NULL,
  `is_central` INT DEFAULT 1,
  `is_deleted` TINYINT(1) DEFAULT 0,
  `deleted_at` DATETIME DEFAULT NULL,
  `created_by` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_outbox_docnum` (`doc_number`),
  INDEX `idx_outbox_status` (`status`),
  INDEX `idx_outbox_dept` (`department`),
  INDEX `idx_outbox_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. หนังสือภายใน / บันทึกข้อความ (Internal Documents)
CREATE TABLE IF NOT EXISTS `internal_documents` (
  `id` VARCHAR(100) PRIMARY KEY,
  `doc_number` VARCHAR(100) NOT NULL,
  `title` TEXT NOT NULL,
  `doc_date` DATE DEFAULT NULL,
  `from_source` VARCHAR(255) DEFAULT NULL,
  `to_destination` VARCHAR(255) DEFAULT NULL,
  `urgency` VARCHAR(50) DEFAULT 'ปกติ',
  `secrecy` VARCHAR(50) DEFAULT 'ปกติ',
  `department` VARCHAR(150) DEFAULT NULL,
  `assignee` VARCHAR(150) DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'pending',
  `content_html` LONGTEXT DEFAULT NULL,
  `file_url` TEXT DEFAULT NULL,
  `attachments` LONGTEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `signer_name` VARCHAR(150) DEFAULT NULL,
  `signer_position` VARCHAR(150) DEFAULT NULL,
  `folder_id` INT DEFAULT NULL,
  `is_deleted` TINYINT(1) DEFAULT 0,
  `deleted_at` DATETIME DEFAULT NULL,
  `created_by` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_internal_docnum` (`doc_number`),
  INDEX `idx_internal_status` (`status`),
  INDEX `idx_internal_dept` (`department`),
  INDEX `idx_internal_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. หนังสือเวียน (Circular Documents)
CREATE TABLE IF NOT EXISTS `circular_documents` (
  `id` VARCHAR(100) PRIMARY KEY,
  `doc_number` VARCHAR(100) NOT NULL,
  `title` TEXT NOT NULL,
  `doc_date` DATE DEFAULT NULL,
  `from_source` VARCHAR(255) DEFAULT NULL,
  `urgency` VARCHAR(50) DEFAULT 'ปกติ',
  `secrecy` VARCHAR(50) DEFAULT 'ปกติ',
  `department` VARCHAR(150) DEFAULT NULL,
  `file_url` TEXT DEFAULT NULL,
  `attachments` LONGTEXT DEFAULT NULL,
  `target_groups` TEXT DEFAULT NULL,
  `content` LONGTEXT DEFAULT NULL,
  `folder_id` INT DEFAULT NULL,
  `is_deleted` TINYINT(1) DEFAULT 0,
  `deleted_at` DATETIME DEFAULT NULL,
  `created_by` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_circular_docnum` (`doc_number`),
  INDEX `idx_circular_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. เอกสารงานธุรการ (Admin Documents)
CREATE TABLE IF NOT EXISTS `admin_documents` (
  `id` VARCHAR(100) PRIMARY KEY,
  `category` VARCHAR(50) NOT NULL DEFAULT 'order',
  `doc_number` VARCHAR(100) NOT NULL,
  `year` VARCHAR(50) DEFAULT NULL,
  `doc_date` DATE DEFAULT NULL,
  `title` TEXT NOT NULL,
  `department` VARCHAR(150) DEFAULT NULL,
  `assignee` VARCHAR(150) DEFAULT NULL,
  `content` LONGTEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'ลงทะเบียน',
  `file_url` TEXT DEFAULT NULL,
  `attachments` LONGTEXT DEFAULT NULL,
  `folder_id` INT DEFAULT NULL,
  `is_deleted` TINYINT(1) DEFAULT 0,
  `deleted_at` DATETIME DEFAULT NULL,
  `created_by` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_admin_docs_cat` (`category`),
  INDEX `idx_admin_docs_num` (`doc_number`),
  INDEX `idx_admin_docs_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. เอกสารร่าง (Draft Documents)
CREATE TABLE IF NOT EXISTS `draft_documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `doc_type` VARCHAR(100) NOT NULL DEFAULT 'internal',
  `title` VARCHAR(500) NOT NULL,
  `doc_number` VARCHAR(255) DEFAULT NULL,
  `date` VARCHAR(100) DEFAULT NULL,
  `urgency` VARCHAR(50) DEFAULT 'ปกติ',
  `secrecy` VARCHAR(50) DEFAULT 'ปกติ',
  `from_dept` VARCHAR(255) DEFAULT NULL,
  `to_dept` VARCHAR(255) DEFAULT NULL,
  `subject` VARCHAR(500) DEFAULT NULL,
  `content` LONGTEXT DEFAULT NULL,
  `signatory` VARCHAR(255) DEFAULT NULL,
  `signatory_position` VARCHAR(255) DEFAULT NULL,
  `seal_mode` VARCHAR(50) DEFAULT 'garuda30',
  `status` VARCHAR(50) DEFAULT 'draft',
  `extra_data` LONGTEXT DEFAULT NULL,
  `created_by` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_draft_doctype` (`doc_type`),
  INDEX `idx_draft_creator` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. กฎการออกเลขเอกสารอัตโนมัติ (Numbering Rules)
CREATE TABLE IF NOT EXISTS `numbering_rules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `rule_name` VARCHAR(255) NOT NULL,
  `department` VARCHAR(255) DEFAULT NULL,
  `division_code` VARCHAR(50) DEFAULT NULL,
  `doc_type` VARCHAR(100) NOT NULL,
  `prefix_pattern` VARCHAR(100) DEFAULT NULL,
  `suffix_pattern` VARCHAR(100) DEFAULT NULL,
  `number_format` VARCHAR(100) DEFAULT NULL,
  `running_scope` VARCHAR(50) DEFAULT 'yearly',
  `current_seq` INT DEFAULT 1,
  `start_seq` INT DEFAULT 1,
  `reset_frequency` VARCHAR(50) DEFAULT 'year',
  `is_active` TINYINT(1) DEFAULT 1,
  `description` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. รหัสแฟ้มจัดเก็บเอกสาร (File Codes)
CREATE TABLE IF NOT EXISTS `file_codes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `department` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. การจองเลขหนังสือ (Reserved Numbers)
CREATE TABLE IF NOT EXISTS `reserved_numbers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `rule_id` INT DEFAULT NULL,
  `doc_type` VARCHAR(50) NOT NULL,
  `doc_number` VARCHAR(100) NOT NULL,
  `year` INT NOT NULL,
  `title` VARCHAR(255) DEFAULT NULL,
  `reserved_by` VARCHAR(100) NOT NULL,
  `department` VARCHAR(150) DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'reserved',
  `reserved_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `used_at` DATETIME DEFAULT NULL,
  `used_for_doc_id` VARCHAR(100) DEFAULT NULL,
  INDEX `idx_reserved_docnum` (`doc_number`),
  INDEX `idx_reserved_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. เส้นทางเดินหนังสือ / บันทึกการเกษียร (Document Tracking & Workflow)
CREATE TABLE IF NOT EXISTS `document_tracking` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `doc_id` VARCHAR(100) NOT NULL,
  `doc_type` VARCHAR(50) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `actor` VARCHAR(100) NOT NULL,
  `actor_role` VARCHAR(100) DEFAULT NULL,
  `to_user` VARCHAR(100) DEFAULT NULL,
  `comment` TEXT DEFAULT NULL,
  `signature_url` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_doctracking_doc` (`doc_id`, `doc_type`),
  INDEX `idx_doctracking_actor` (`actor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. การรับเอกสารระดับหน่วยงานย่อย (Department Receives)
CREATE TABLE IF NOT EXISTS `department_receives` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `doc_id` VARCHAR(100) NOT NULL,
  `department` VARCHAR(255) NOT NULL,
  `receive_number` INT NOT NULL,
  `year` VARCHAR(50) NOT NULL,
  `received_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `received_by` VARCHAR(255) DEFAULT NULL,
  UNIQUE KEY `unique_doc_dept` (`doc_id`, `department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. ลายมือชื่อดิจิทัลและตราประทับอิเล็กทรอนิกส์ (Digital Signatures & Seals)
CREATE TABLE IF NOT EXISTS `digital_signatures` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `doc_id` VARCHAR(100) DEFAULT NULL,
  `doc_number` VARCHAR(100) DEFAULT NULL,
  `signer_id` INT DEFAULT NULL,
  `signer_name` VARCHAR(150) NOT NULL,
  `signer_position` VARCHAR(150) DEFAULT NULL,
  `signature_data` LONGTEXT NOT NULL,
  `hash_checksum` VARCHAR(255) DEFAULT NULL,
  `certificate_id` VARCHAR(100) DEFAULT NULL,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `signed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_digitalsig_docnum` (`doc_number`),
  INDEX `idx_digitalsig_cert` (`certificate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. รายงานเหตุด่วนสาธารณภัย ปภ. 24 ชั่วโมง (Urgent Disaster Incidents)
CREATE TABLE IF NOT EXISTS `urgent_incidents` (
  `id` VARCHAR(255) PRIMARY KEY,
  `doc_number` VARCHAR(255) DEFAULT NULL,
  `doc_date` VARCHAR(255) DEFAULT NULL,
  `from_person` VARCHAR(255) DEFAULT NULL,
  `to_person` VARCHAR(255) DEFAULT NULL,
  `incident_types` TEXT DEFAULT NULL,
  `incident_type_other` VARCHAR(255) DEFAULT NULL,
  `severity` VARCHAR(50) DEFAULT 'ปานกลาง',
  `start_date` VARCHAR(255) DEFAULT NULL,
  `start_time` VARCHAR(255) DEFAULT NULL,
  `end_date` VARCHAR(255) DEFAULT NULL,
  `end_time` VARCHAR(255) DEFAULT NULL,
  `location` TEXT DEFAULT NULL,
  `affected_people` VARCHAR(100) DEFAULT '0',
  `affected_households` VARCHAR(100) DEFAULT '0',
  `injured` VARCHAR(100) DEFAULT '0',
  `dead` VARCHAR(100) DEFAULT '0',
  `missing` VARCHAR(100) DEFAULT '0',
  `evacuated_people` VARCHAR(100) DEFAULT '0',
  `evacuated_households` VARCHAR(100) DEFAULT '0',
  `damage_houses` VARCHAR(100) DEFAULT '0',
  `damage_high_rises` VARCHAR(100) DEFAULT '0',
  `damage_temples` VARCHAR(100) DEFAULT '0',
  `damage_gov_buildings` VARCHAR(100) DEFAULT '0',
  `damage_other_buildings` VARCHAR(100) DEFAULT '0',
  `damage_building_cost` VARCHAR(100) DEFAULT '0',
  `damage_agriculture_crops` VARCHAR(100) DEFAULT '0',
  `damage_agriculture_rice` VARCHAR(100) DEFAULT '0',
  `damage_agriculture_orchard` VARCHAR(100) DEFAULT '0',
  `damage_agriculture_fish` VARCHAR(100) DEFAULT '0',
  `damage_agriculture_shrimp` VARCHAR(100) DEFAULT '0',
  `damage_livestock_cow` VARCHAR(100) DEFAULT '0',
  `damage_livestock_pig` VARCHAR(100) DEFAULT '0',
  `damage_livestock_poultry` VARCHAR(100) DEFAULT '0',
  `damage_livestock_other` TEXT DEFAULT NULL,
  `damage_agriculture_cost` VARCHAR(100) DEFAULT '0',
  `damage_public_roads` VARCHAR(100) DEFAULT '0',
  `damage_public_bridges` VARCHAR(100) DEFAULT '0',
  `damage_public_bridge_approaches` VARCHAR(100) DEFAULT '0',
  `damage_public_weirs` VARCHAR(100) DEFAULT '0',
  `damage_public_other` TEXT DEFAULT NULL,
  `damage_public_cost` VARCHAR(100) DEFAULT '0',
  `total_damage_cost` VARCHAR(100) DEFAULT '0',
  `mitigation` TEXT DEFAULT NULL,
  `tools_fire_trucks` VARCHAR(100) DEFAULT '0',
  `tools_water_trucks` VARCHAR(100) DEFAULT '0',
  `tools_rescue_trucks` VARCHAR(100) DEFAULT '0',
  `tools_fire_boats` VARCHAR(100) DEFAULT '0',
  `tools_water_pumps` VARCHAR(100) DEFAULT '0',
  `tools_other` TEXT DEFAULT NULL,
  `ops_gov_agencies` VARCHAR(100) DEFAULT NULL,
  `ops_private_sector` VARCHAR(100) DEFAULT NULL,
  `proposals` TEXT DEFAULT NULL,
  `reporter_name` VARCHAR(255) DEFAULT NULL,
  `reporter_position` VARCHAR(255) DEFAULT NULL,
  `signature_image` LONGTEXT DEFAULT NULL,
  `damage_images` LONGTEXT DEFAULT NULL,
  `is_deleted` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_urgent_inc_num` (`doc_number`),
  INDEX `idx_urgent_inc_sev` (`severity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. ยานพาหนะและเครื่องจักรกลสาธารณภัย (Vehicles - ปภ.)
CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` VARCHAR(100) PRIMARY KEY,
  `license_plate` VARCHAR(50) NOT NULL,
  `vehicle_number` VARCHAR(100) DEFAULT NULL,
  `province` VARCHAR(100) DEFAULT 'ระยอง',
  `brand` VARCHAR(100) DEFAULT NULL,
  `model` VARCHAR(100) DEFAULT NULL,
  `vehicle_type` VARCHAR(100) DEFAULT 'รถยนต์ตรวจการณ์',
  `department` VARCHAR(255) DEFAULT NULL,
  `current_mileage` INT DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'active',
  `image_url` TEXT DEFAULT NULL,
  `responsible_person` VARCHAR(255) DEFAULT NULL,
  `responsible_user_id` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_vehicles_plate` (`license_plate`),
  INDEX `idx_vehicles_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. บันทึกการตรวจสภาพยานพาหนะ (Vehicle Inspections)
CREATE TABLE IF NOT EXISTS `vehicle_inspections` (
  `id` VARCHAR(100) PRIMARY KEY,
  `vehicle_id` VARCHAR(100) NOT NULL,
  `inspection_date` VARCHAR(50) NOT NULL,
  `mileage` INT DEFAULT 0,
  `fuel_level` VARCHAR(50) DEFAULT NULL,
  `overall_status` VARCHAR(50) DEFAULT 'พร้อมใช้งาน',
  `inspector_name` VARCHAR(150) DEFAULT NULL,
  `inspector_user_id` VARCHAR(100) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `photos_json` LONGTEXT DEFAULT NULL,
  `items_checked_json` LONGTEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_insp_veh` (`vehicle_id`),
  CONSTRAINT `fk_insp_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. บันทึกการซ่อมบำรุงยานพาหนะ (Vehicle Maintenance)
CREATE TABLE IF NOT EXISTS `vehicle_maintenance` (
  `id` VARCHAR(100) PRIMARY KEY,
  `vehicle_id` VARCHAR(100) NOT NULL,
  `maintenance_date` VARCHAR(50) NOT NULL,
  `mileage` INT DEFAULT 0,
  `service_type` VARCHAR(100) DEFAULT NULL,
  `cost` DECIMAL(12,2) DEFAULT 0.00,
  `vendor` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'completed',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_maint_veh` (`vehicle_id`),
  CONSTRAINT `fk_maint_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. แบบสำรวจและประเมินผลออนไลน์ (Surveys)
CREATE TABLE IF NOT EXISTS `surveys` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` VARCHAR(100) DEFAULT 'general',
  `status` VARCHAR(50) DEFAULT 'published',
  `elements_json` LONGTEXT DEFAULT NULL,
  `theme_json` LONGTEXT DEFAULT NULL,
  `settings_json` LONGTEXT DEFAULT NULL,
  `created_by` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. ผลการตอบแบบสำรวจ (Survey Responses)
CREATE TABLE IF NOT EXISTS `survey_responses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `survey_id` INT NOT NULL,
  `respondent_name` VARCHAR(150) DEFAULT 'ผู้ตอบแบบสำรวจ',
  `answers_json` LONGTEXT NOT NULL,
  `score` INT DEFAULT 0,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `submitted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_survey_resp` (`survey_id`),
  CONSTRAINT `fk_survey_responses_survey` FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. เทมเพลตและอินสแตนซ์ผังกระบวนการ (Workflow Management)
CREATE TABLE IF NOT EXISTS `workflow_templates` (
  `id` VARCHAR(100) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `doc_type` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `steps` LONGTEXT NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `workflow_instances` (
  `id` VARCHAR(100) PRIMARY KEY,
  `template_id` VARCHAR(100) DEFAULT NULL,
  `template_name` VARCHAR(255) DEFAULT NULL,
  `doc_id` VARCHAR(100) NOT NULL,
  `doc_type` VARCHAR(100) NOT NULL,
  `current_step` INT DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'pending',
  `initiated_by` VARCHAR(150) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_wf_instance_doc` (`doc_id`, `doc_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `workflow_tasks` (
  `id` VARCHAR(100) PRIMARY KEY,
  `instance_id` VARCHAR(100) NOT NULL,
  `step_index` INT NOT NULL,
  `step_name` VARCHAR(255) NOT NULL,
  `assigned_role` VARCHAR(100) DEFAULT NULL,
  `assigned_user` VARCHAR(150) DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'pending',
  `action_taken` VARCHAR(100) DEFAULT NULL,
  `comments` TEXT DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_wf_tasks_inst` (`instance_id`),
  CONSTRAINT `fk_wf_tasks_inst` FOREIGN KEY (`instance_id`) REFERENCES `workflow_instances` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. เวอร์ชันเอกสาร (Document Versioning)
CREATE TABLE IF NOT EXISTS `document_versions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `doc_id` VARCHAR(100) NOT NULL,
  `version_number` INT NOT NULL,
  `content` LONGTEXT DEFAULT NULL,
  `change_summary` TEXT DEFAULT NULL,
  `modified_by` VARCHAR(150) DEFAULT NULL,
  `modified_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `is_current` TINYINT(1) DEFAULT 0,
  INDEX `idx_doc_ver_docid` (`doc_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. สื่อ Infographics (Infographics Designer)
CREATE TABLE IF NOT EXISTS `infographics` (
  `id` VARCHAR(100) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `data` LONGTEXT DEFAULT NULL,
  `thumbnail` LONGTEXT DEFAULT NULL,
  `created_by` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. ประวัติการอัปเดตระบบ (Changelogs)
CREATE TABLE IF NOT EXISTS `changelogs` (
  `id` VARCHAR(100) PRIMARY KEY,
  `version` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `release_date` VARCHAR(50) NOT NULL,
  `type` VARCHAR(50) DEFAULT 'minor',
  `summary` TEXT DEFAULT NULL,
  `changes` LONGTEXT DEFAULT NULL,
  `images` LONGTEXT DEFAULT NULL,
  `author` VARCHAR(255) DEFAULT NULL,
  `is_latest` TINYINT(1) DEFAULT 0,
  `is_published` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 28. บันทึกประวัติการใช้งานและ Audit Logs (System Logs)
CREATE TABLE IF NOT EXISTS `system_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `username` VARCHAR(100) DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` TEXT DEFAULT NULL,
  `module` VARCHAR(100) DEFAULT NULL,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_syslogs_user` (`username`),
  INDEX `idx_syslogs_action` (`action`),
  INDEX `idx_syslogs_created` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- ข้อมูลเริ่มต้นขององค์กร (Enterprise Seed Data)
-- ========================================================

INSERT INTO `users` (`id`, `username`, `password`, `firstName`, `lastName`, `position`, `department`, `role`) VALUES
(1, 'admin', '$argon2id$v=19$m=65536,t=3,p=4$d7R1p8B6J1A$q/4iO9z2WvjVfX5Z1sT6u8y0x9', 'ผู้ดูแลระบบ', 'สารบรรณองค์กร', 'หัวหน้างานสารบรรณ', 'กลุ่มงานยุทธศาสตร์และการจัดการ', 'admin'),
(2, 'somchai', '$argon2id$v=19$m=65536,t=3,p=4$d7R1p8B6J1A$q/4iO9z2WvjVfX5Z1sT6u8y0x9', 'สมชาย', 'ใจดี', 'นักป้องกันและบรรเทาสาธารณภัยปฏิบัติการ', 'ฝ่ายป้องกันและปฏิบัติการ', 'user'),
(3, 'somsee', '$argon2id$v=19$m=65536,t=3,p=4$d7R1p8B6J1A$q/4iO9z2WvjVfX5Z1sT6u8y0x9', 'สมศรี', 'รักษ์ดี', 'เจ้าพนักงานธุรการชำนาญงาน', 'ฝ่ายบริหารงานทั่วไป', 'moderator')
ON DUPLICATE KEY UPDATE `role`=VALUES(`role`);

INSERT INTO `settings` (`id`, `currentYear`, `startSequence`, `orgName`, `headerOrgName`, `orgCode`) VALUES
(1, 2569, 1, 'สำนักงานป้องกันและบรรเทาสาธารณภัย', 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง', 'รย 0021')
ON DUPLICATE KEY UPDATE `currentYear`=VALUES(`currentYear`);

INSERT INTO `departments` (`id`, `name`, `code`, `description`) VALUES
(1, 'กลุ่มงานยุทธศาสตร์และการจัดการ', 'STRAT', 'งานแผนงาน นโยบาย ยุทธศาสตร์ และสารสนเทศ'),
(2, 'กลุ่มงานป้องกันและปฏิบัติการ', 'PREV', 'งานปฏิบัติการ เตรียมความพร้อมรับมือภัยพิบัติ และเครื่องจักรกล'),
(3, 'กลุ่มงานฟื้นฟูและพัฒนา', 'DEV', 'งานเยียวยา ฟื้นฟู พัฒนา และสนับสนุนผู้ประสบภัย'),
(4, 'ฝ่ายบริหารงานทั่วไป', 'ADMIN', 'งานสารบรรณ การเงิน พัสดุ และยานพาหนะกลาง')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

INSERT INTO `positions` (`id`, `name`, `level`, `description`) VALUES
(1, 'หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด', 'บริหาร', 'ผู้บริหารระดับสูงประจำสำนักงาน ปภ.จังหวัด'),
(2, 'นักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', 'วิชาการ', 'หัวหน้ากลุ่มงานยุทธศาสตร์และการจัดการ'),
(3, 'เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยชำนาญงาน', 'ทั่วไป', 'เจ้าหน้าที่ปฏิบัติการภาคสนาม'),
(4, 'เจ้าพนักงานธุรการชำนาญงาน', 'ทั่วไป', 'เจ้าหน้าที่งานสารบรรณและงานธุรการ')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

SET FOREIGN_KEY_CHECKS = 1;
