-- ========================================================
-- ระบบสารบรรณอิเล็กทรอนิกส์ระดับ Enterprise (EDMS Saraban Enterprise)
-- Schema: PostgreSQL 14+ / 15+ / 16+
-- Engine: Relational PostgreSQL with UTF-8 Encoding
-- Security: Full RBAC, Constraints, Cascading FKs, Audit Logging
-- ========================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ตารางข้อมูลผู้ใช้งาน (Users)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  "firstName" VARCHAR(150),
  "lastName" VARCHAR(150),
  position VARCHAR(150),
  department VARCHAR(150),
  role VARCHAR(50) DEFAULT 'user',
  avatar TEXT,
  email VARCHAR(150),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_dept ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- 2. ตารางหน่วยงาน / กอง / กลุ่มงาน (Departments)
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ตารางตำแหน่ง (Positions)
CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  level VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. ตารางการตั้งค่าระบบองค์กร (Settings)
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  "currentYear" INT DEFAULT 2569,
  "startSequence" INT DEFAULT 1,
  "orgName" VARCHAR(255) DEFAULT 'สำนักงานป้องกันและบรรเทาสาธารณภัย',
  "headerOrgName" VARCHAR(255) DEFAULT 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง',
  "orgCode" VARCHAR(50) DEFAULT 'รย 0021',
  "logoUrl" TEXT,
  "garuda15Url" TEXT,
  "garuda30Url" TEXT,
  "faviconUrl" TEXT,
  "footerText" VARCHAR(255) DEFAULT 'ระบบสารบรรณอิเล็กทรอนิกส์ (EDMS Enterprise)',
  "geminiApiKey" TEXT,
  "smtpHost" VARCHAR(255),
  "smtpPort" INT DEFAULT 587,
  "smtpUser" VARCHAR(255),
  "smtpPassword" VARCHAR(255),
  "smtpFrom" VARCHAR(255),
  "enabledFeatures" JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ตารางโฟลเดอร์เอกสารดิจิทัล (Folders)
CREATE TABLE IF NOT EXISTS folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(50) DEFAULT '#2563eb',
  description TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_folders_creator ON folders(created_by);

-- 6. ทะเบียนหนังสือรับ (Inbox Documents)
CREATE TABLE IF NOT EXISTS inbox_documents (
  id VARCHAR(100) PRIMARY KEY,
  doc_number VARCHAR(100) NOT NULL,
  receive_number VARCHAR(100),
  receive_date DATE,
  receive_time TIME,
  title TEXT NOT NULL,
  doc_date DATE,
  from_source VARCHAR(255),
  to_destination VARCHAR(255),
  urgency VARCHAR(50) DEFAULT 'ปกติ',
  secrecy VARCHAR(50) DEFAULT 'ปกติ',
  department VARCHAR(150),
  assignee VARCHAR(150),
  status VARCHAR(50) DEFAULT 'received',
  file_url TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  content TEXT,
  folder_id INT REFERENCES folders(id) ON DELETE SET NULL,
  forwarded_to TEXT,
  forwarded_by VARCHAR(150),
  forwarded_at VARCHAR(100),
  forward_note TEXT,
  is_central INT DEFAULT 1,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inbox_docnum ON inbox_documents(doc_number);
CREATE INDEX IF NOT EXISTS idx_inbox_recvnum ON inbox_documents(receive_number);
CREATE INDEX IF NOT EXISTS idx_inbox_status ON inbox_documents(status);
CREATE INDEX IF NOT EXISTS idx_inbox_dept ON inbox_documents(department);
CREATE INDEX IF NOT EXISTS idx_inbox_deleted ON inbox_documents(is_deleted);

-- 7. ทะเบียนหนังสือส่ง (Outbox Documents)
CREATE TABLE IF NOT EXISTS outbox_documents (
  id VARCHAR(100) PRIMARY KEY,
  doc_number VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  doc_date DATE,
  from_source VARCHAR(255),
  to_destination VARCHAR(255),
  urgency VARCHAR(50) DEFAULT 'ปกติ',
  secrecy VARCHAR(50) DEFAULT 'ปกติ',
  department VARCHAR(150),
  assignee VARCHAR(150),
  status VARCHAR(50) DEFAULT 'sent',
  file_url TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  content TEXT,
  signer_name VARCHAR(150),
  signer_position VARCHAR(150),
  folder_id INT REFERENCES folders(id) ON DELETE SET NULL,
  forwarded_to TEXT,
  forwarded_by VARCHAR(150),
  forwarded_at VARCHAR(100),
  forward_note TEXT,
  is_central INT DEFAULT 1,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_outbox_docnum ON outbox_documents(doc_number);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_documents(status);
CREATE INDEX IF NOT EXISTS idx_outbox_dept ON outbox_documents(department);
CREATE INDEX IF NOT EXISTS idx_outbox_deleted ON outbox_documents(is_deleted);

-- 8. หนังสือภายใน / บันทึกข้อความ (Internal Documents)
CREATE TABLE IF NOT EXISTS internal_documents (
  id VARCHAR(100) PRIMARY KEY,
  doc_number VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  doc_date DATE,
  from_source VARCHAR(255),
  to_destination VARCHAR(255),
  urgency VARCHAR(50) DEFAULT 'ปกติ',
  secrecy VARCHAR(50) DEFAULT 'ปกติ',
  department VARCHAR(150),
  assignee VARCHAR(150),
  status VARCHAR(50) DEFAULT 'pending',
  content_html TEXT,
  file_url TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  signer_name VARCHAR(150),
  signer_position VARCHAR(150),
  folder_id INT REFERENCES folders(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_internal_docnum ON internal_documents(doc_number);
CREATE INDEX IF NOT EXISTS idx_internal_status ON internal_documents(status);
CREATE INDEX IF NOT EXISTS idx_internal_dept ON internal_documents(department);
CREATE INDEX IF NOT EXISTS idx_internal_deleted ON internal_documents(is_deleted);

-- 9. หนังสือเวียน (Circular Documents)
CREATE TABLE IF NOT EXISTS circular_documents (
  id VARCHAR(100) PRIMARY KEY,
  doc_number VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  doc_date DATE,
  from_source VARCHAR(255),
  urgency VARCHAR(50) DEFAULT 'ปกติ',
  secrecy VARCHAR(50) DEFAULT 'ปกติ',
  department VARCHAR(150),
  file_url TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  target_groups TEXT,
  content TEXT,
  folder_id INT REFERENCES folders(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_circular_docnum ON circular_documents(doc_number);
CREATE INDEX IF NOT EXISTS idx_circular_deleted ON circular_documents(is_deleted);

-- 10. เอกสารงานธุรการ (คำสั่ง, ประกาศ, ระเบียบ - Admin Documents)
CREATE TABLE IF NOT EXISTS admin_documents (
  id VARCHAR(100) PRIMARY KEY,
  category VARCHAR(50) NOT NULL DEFAULT 'order', -- 'order' (คำสั่ง), 'announcement' (ประกาศ), 'circular' (หนังสือเวียน)
  doc_number VARCHAR(100) NOT NULL,
  year VARCHAR(50),
  doc_date DATE,
  title TEXT NOT NULL,
  department VARCHAR(150),
  assignee VARCHAR(150),
  content TEXT,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'ลงทะเบียน',
  file_url TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  folder_id INT REFERENCES folders(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_docs_cat ON admin_documents(category);
CREATE INDEX IF NOT EXISTS idx_admin_docs_num ON admin_documents(doc_number);
CREATE INDEX IF NOT EXISTS idx_admin_docs_deleted ON admin_documents(is_deleted);

-- 11. เอกสารร่าง (Draft Documents)
CREATE TABLE IF NOT EXISTS draft_documents (
  id SERIAL PRIMARY KEY,
  doc_type VARCHAR(100) NOT NULL DEFAULT 'internal',
  title VARCHAR(500) NOT NULL,
  doc_number VARCHAR(255),
  date VARCHAR(100),
  urgency VARCHAR(50) DEFAULT 'ปกติ',
  secrecy VARCHAR(50) DEFAULT 'ปกติ',
  from_dept VARCHAR(255),
  to_dept VARCHAR(255),
  subject VARCHAR(500),
  content TEXT,
  signatory VARCHAR(255),
  signatory_position VARCHAR(255),
  seal_mode VARCHAR(50) DEFAULT 'garuda30',
  status VARCHAR(50) DEFAULT 'draft',
  extra_data JSONB,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_draft_doctype ON draft_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_draft_creator ON draft_documents(created_by);

-- 12. กฎการออกเลขเอกสารอัตโนมัติ (Numbering Rules)
CREATE TABLE IF NOT EXISTS numbering_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  division_code VARCHAR(50),
  doc_type VARCHAR(100) NOT NULL,
  prefix_pattern VARCHAR(100),
  suffix_pattern VARCHAR(100),
  number_format VARCHAR(100),
  running_scope VARCHAR(50) DEFAULT 'yearly',
  current_seq INT DEFAULT 1,
  start_seq INT DEFAULT 1,
  reset_frequency VARCHAR(50) DEFAULT 'year',
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. รหัสแฟ้มจัดเก็บเอกสาร (File Codes)
CREATE TABLE IF NOT EXISTS file_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. การจองเลขหนังสือ (Reserved Numbers)
CREATE TABLE IF NOT EXISTS reserved_numbers (
  id SERIAL PRIMARY KEY,
  rule_id INT REFERENCES numbering_rules(id) ON DELETE SET NULL,
  doc_type VARCHAR(50) NOT NULL,
  doc_number VARCHAR(100) NOT NULL,
  year INT NOT NULL,
  title VARCHAR(255),
  reserved_by VARCHAR(100) NOT NULL,
  department VARCHAR(150),
  status VARCHAR(50) DEFAULT 'reserved',
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP WITH TIME ZONE,
  used_for_doc_id VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_reserved_docnum ON reserved_numbers(doc_number);
CREATE INDEX IF NOT EXISTS idx_reserved_status ON reserved_numbers(status);

-- 15. เส้นทางเดินหนังสือ / บันทึกการเกษียร (Document Tracking & Workflow)
CREATE TABLE IF NOT EXISTS document_tracking (
  id SERIAL PRIMARY KEY,
  doc_id VARCHAR(100) NOT NULL,
  doc_type VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  actor VARCHAR(100) NOT NULL,
  actor_role VARCHAR(100),
  to_user VARCHAR(100),
  comment TEXT,
  signature_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_doctracking_doc ON document_tracking(doc_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_doctracking_actor ON document_tracking(actor);

-- 16. การรับเอกสารระดับหน่วยงานย่อย (Department Receives)
CREATE TABLE IF NOT EXISTS department_receives (
  id SERIAL PRIMARY KEY,
  doc_id VARCHAR(100) NOT NULL,
  department VARCHAR(255) NOT NULL,
  receive_number INT NOT NULL,
  year VARCHAR(50) NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  received_by VARCHAR(255),
  UNIQUE (doc_id, department)
);

-- 17. ลายมือชื่อดิจิทัลและตราประทับอิเล็กทรอนิกส์ (Digital Signatures & Seals)
CREATE TABLE IF NOT EXISTS digital_signatures (
  id SERIAL PRIMARY KEY,
  doc_id VARCHAR(100),
  doc_number VARCHAR(100),
  signer_id INT REFERENCES users(id) ON DELETE SET NULL,
  signer_name VARCHAR(150) NOT NULL,
  signer_position VARCHAR(150),
  signature_data TEXT NOT NULL,
  hash_checksum VARCHAR(255),
  certificate_id VARCHAR(100),
  ip_address VARCHAR(50),
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_digitalsig_docnum ON digital_signatures(doc_number);
CREATE INDEX IF NOT EXISTS idx_digitalsig_cert ON digital_signatures(certificate_id);

-- 18. รายงานเหตุด่วนสาธารณภัย ปภ. 24 ชั่วโมง (Urgent Disaster Incidents)
CREATE TABLE IF NOT EXISTS urgent_incidents (
  id VARCHAR(255) PRIMARY KEY,
  doc_number VARCHAR(255),
  doc_date VARCHAR(255),
  from_person VARCHAR(255),
  to_person VARCHAR(255),
  incident_types TEXT,
  incident_type_other VARCHAR(255),
  severity VARCHAR(50) DEFAULT 'ปานกลาง',
  start_date VARCHAR(255),
  start_time VARCHAR(255),
  end_date VARCHAR(255),
  end_time VARCHAR(255),
  location TEXT,
  affected_people VARCHAR(100) DEFAULT '0',
  affected_households VARCHAR(100) DEFAULT '0',
  injured VARCHAR(100) DEFAULT '0',
  dead VARCHAR(100) DEFAULT '0',
  missing VARCHAR(100) DEFAULT '0',
  evacuated_people VARCHAR(100) DEFAULT '0',
  evacuated_households VARCHAR(100) DEFAULT '0',
  damage_houses VARCHAR(100) DEFAULT '0',
  damage_high_rises VARCHAR(100) DEFAULT '0',
  damage_temples VARCHAR(100) DEFAULT '0',
  damage_gov_buildings VARCHAR(100) DEFAULT '0',
  damage_other_buildings VARCHAR(100) DEFAULT '0',
  damage_building_cost VARCHAR(100) DEFAULT '0',
  damage_agriculture_crops VARCHAR(100) DEFAULT '0',
  damage_agriculture_rice VARCHAR(100) DEFAULT '0',
  damage_agriculture_orchard VARCHAR(100) DEFAULT '0',
  damage_agriculture_fish VARCHAR(100) DEFAULT '0',
  damage_agriculture_shrimp VARCHAR(100) DEFAULT '0',
  damage_livestock_cow VARCHAR(100) DEFAULT '0',
  damage_livestock_pig VARCHAR(100) DEFAULT '0',
  damage_livestock_poultry VARCHAR(100) DEFAULT '0',
  damage_livestock_other TEXT,
  damage_agriculture_cost VARCHAR(100) DEFAULT '0',
  damage_public_roads VARCHAR(100) DEFAULT '0',
  damage_public_bridges VARCHAR(100) DEFAULT '0',
  damage_public_bridge_approaches VARCHAR(100) DEFAULT '0',
  damage_public_weirs VARCHAR(100) DEFAULT '0',
  damage_public_other TEXT,
  damage_public_cost VARCHAR(100) DEFAULT '0',
  total_damage_cost VARCHAR(100) DEFAULT '0',
  mitigation TEXT,
  tools_fire_trucks VARCHAR(100) DEFAULT '0',
  tools_water_trucks VARCHAR(100) DEFAULT '0',
  tools_rescue_trucks VARCHAR(100) DEFAULT '0',
  tools_fire_boats VARCHAR(100) DEFAULT '0',
  tools_water_pumps VARCHAR(100) DEFAULT '0',
  tools_other TEXT,
  ops_gov_agencies VARCHAR(100),
  ops_private_sector VARCHAR(100),
  proposals TEXT,
  reporter_name VARCHAR(255),
  reporter_position VARCHAR(255),
  signature_image TEXT,
  damage_images JSONB DEFAULT '[]'::jsonb,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_urgent_inc_num ON urgent_incidents(doc_number);
CREATE INDEX IF NOT EXISTS idx_urgent_inc_sev ON urgent_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_urgent_inc_date ON urgent_incidents(doc_date);

-- 19. ยานพาหนะและเครื่องจักรกลสาธารณภัย (Vehicles - ปภ.)
CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(100) PRIMARY KEY,
  license_plate VARCHAR(50) NOT NULL,
  vehicle_number VARCHAR(100),
  province VARCHAR(100) DEFAULT 'ระยอง',
  brand VARCHAR(100),
  model VARCHAR(100),
  vehicle_type VARCHAR(100) DEFAULT 'รถยนต์ตรวจการณ์',
  department VARCHAR(255),
  current_mileage INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  image_url TEXT,
  responsible_person VARCHAR(255),
  responsible_user_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

-- 20. บันทึกการตรวจสภาพยานพาหนะ (Vehicle Inspections)
CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id VARCHAR(100) PRIMARY KEY,
  vehicle_id VARCHAR(100) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  inspection_date VARCHAR(50) NOT NULL,
  mileage INT DEFAULT 0,
  fuel_level VARCHAR(50),
  overall_status VARCHAR(50) DEFAULT 'พร้อมใช้งาน',
  inspector_name VARCHAR(150),
  inspector_user_id VARCHAR(100),
  notes TEXT,
  photos_json JSONB DEFAULT '[]'::jsonb,
  items_checked_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_insp_veh ON vehicle_inspections(vehicle_id);

-- 21. บันทึกการซ่อมบำรุงยานพาหนะ (Vehicle Maintenance)
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id VARCHAR(100) PRIMARY KEY,
  vehicle_id VARCHAR(100) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  maintenance_date VARCHAR(50) NOT NULL,
  mileage INT DEFAULT 0,
  service_type VARCHAR(100),
  cost NUMERIC(12,2) DEFAULT 0.00,
  vendor VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_maint_veh ON vehicle_maintenance(vehicle_id);

-- 22. แบบสำรวจและประเมินผลออนไลน์ (Surveys)
CREATE TABLE IF NOT EXISTS surveys (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'general',
  status VARCHAR(50) DEFAULT 'published',
  elements_json JSONB DEFAULT '[]'::jsonb,
  theme_json JSONB DEFAULT '{}'::jsonb,
  settings_json JSONB DEFAULT '{}'::jsonb,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 23. ผลการตอบแบบสำรวจ (Survey Responses)
CREATE TABLE IF NOT EXISTS survey_responses (
  id SERIAL PRIMARY KEY,
  survey_id INT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  respondent_name VARCHAR(150) DEFAULT 'ผู้ตอบแบบสำรวจ',
  answers_json JSONB NOT NULL,
  score INT DEFAULT 0,
  ip_address VARCHAR(50),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_survey_resp ON survey_responses(survey_id);

-- 24. เทมเพลตและอินสแตนซ์ผังกระบวนการ (Workflow Management)
CREATE TABLE IF NOT EXISTS workflow_templates (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  doc_type VARCHAR(100) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_instances (
  id VARCHAR(100) PRIMARY KEY,
  template_id VARCHAR(100) REFERENCES workflow_templates(id) ON DELETE SET NULL,
  template_name VARCHAR(255),
  doc_id VARCHAR(100) NOT NULL,
  doc_type VARCHAR(100) NOT NULL,
  current_step INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  initiated_by VARCHAR(150),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wf_instance_doc ON workflow_instances(doc_id, doc_type);

CREATE TABLE IF NOT EXISTS workflow_tasks (
  id VARCHAR(100) PRIMARY KEY,
  instance_id VARCHAR(100) NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_index INT NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  assigned_role VARCHAR(100),
  assigned_user VARCHAR(150),
  status VARCHAR(50) DEFAULT 'pending',
  action_taken VARCHAR(100),
  comments TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wf_tasks_inst ON workflow_tasks(instance_id);

-- 25. เวอร์ชันเอกสาร (Document Versioning)
CREATE TABLE IF NOT EXISTS document_versions (
  id SERIAL PRIMARY KEY,
  doc_id VARCHAR(100) NOT NULL,
  version_number INT NOT NULL,
  content TEXT,
  change_summary TEXT,
  modified_by VARCHAR(150),
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_current BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_doc_ver_docid ON document_versions(doc_id);

-- 26. สื่อ Infographics (Infographics Designer)
CREATE TABLE IF NOT EXISTS infographics (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  data JSONB,
  thumbnail TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 27. ประวัติการอัปเดตระบบ (Changelogs)
CREATE TABLE IF NOT EXISTS changelogs (
  id VARCHAR(100) PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  release_date VARCHAR(50) NOT NULL,
  type VARCHAR(50) DEFAULT 'minor',
  summary TEXT,
  changes JSONB,
  images JSONB,
  author VARCHAR(255),
  is_latest BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 28. บันทึกประวัติการใช้งานและ Audit Logs (System Logs)
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  user_id INT,
  username VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  details TEXT,
  module VARCHAR(100),
  ip_address VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_syslogs_user ON system_logs(username);
CREATE INDEX IF NOT EXISTS idx_syslogs_action ON system_logs(action);
CREATE INDEX IF NOT EXISTS idx_syslogs_created ON system_logs(created_at DESC);

-- ========================================================
-- ข้อมูลเริ่มต้นขององค์กร (Enterprise Seed Data)
-- ========================================================

INSERT INTO users (username, password, "firstName", "lastName", position, department, role) 
VALUES 
  ('admin', '$argon2id$v=19$m=65536,t=3,p=4$d7R1p8B6J1A$q/4iO9z2WvjVfX5Z1sT6u8y0x9', 'ผู้ดูแลระบบ', 'สารบรรณองค์กร', 'หัวหน้างานสารบรรณ', 'กลุ่มงานยุทธศาสตร์และการจัดการ', 'admin'),
  ('somchai', '$argon2id$v=19$m=65536,t=3,p=4$d7R1p8B6J1A$q/4iO9z2WvjVfX5Z1sT6u8y0x9', 'สมชาย', 'ใจดี', 'นักป้องกันและบรรเทาสาธารณภัยปฏิบัติการ', 'ฝ่ายป้องกันและปฏิบัติการ', 'user'),
  ('somsee', '$argon2id$v=19$m=65536,t=3,p=4$d7R1p8B6J1A$q/4iO9z2WvjVfX5Z1sT6u8y0x9', 'สมศรี', 'รักษ์ดี', 'เจ้าพนักงานธุรการชำนาญงาน', 'ฝ่ายบริหารงานทั่วไป', 'moderator')
ON CONFLICT (username) DO NOTHING;

INSERT INTO settings (id, "currentYear", "startSequence", "orgName", "headerOrgName", "orgCode")
VALUES (1, 2569, 1, 'สำนักงานป้องกันและบรรเทาสาธารณภัย', 'สำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัดระยอง', 'รย 0021')
ON CONFLICT (id) DO NOTHING;

INSERT INTO departments (name, code, description) VALUES
('กลุ่มงานยุทธศาสตร์และการจัดการ', 'STRAT', 'งานแผนงาน นโยบาย ยุทธศาสตร์ และสารสนเทศ'),
('กลุ่มงานป้องกันและปฏิบัติการ', 'PREV', 'งานปฏิบัติการ เตรียมความพร้อมรับมือภัยพิบัติ และเครื่องจักรกล'),
('กลุ่มงานฟื้นฟูและพัฒนา', 'DEV', 'งานเยียวยา ฟื้นฟู พัฒนา และสนับสนุนผู้ประสบภัย'),
('ฝ่ายบริหารงานทั่วไป', 'ADMIN', 'งานสารบรรณ การเงิน พัสดุ และยานพาหนะกลาง')
ON CONFLICT (name) DO NOTHING;

INSERT INTO positions (name, level, description) VALUES
('หัวหน้าสำนักงานป้องกันและบรรเทาสาธารณภัยจังหวัด', 'บริหาร', 'ผู้บริหารระดับสูงประจำสำนักงาน ปภ.จังหวัด'),
('นักวิเคราะห์นโยบายและแผนชำนาญการพิเศษ', 'วิชาการ', 'หัวหน้ากลุ่มงานยุทธศาสตร์และการจัดการ'),
('เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยชำนาญงาน', 'ทั่วไป', 'เจ้าหน้าที่ปฏิบัติการภาคสนาม'),
('เจ้าพนักงานธุรการชำนาญงาน', 'ทั่วไป', 'เจ้าหน้าที่งานสารบรรณและงานธุรการ')
ON CONFLICT (name) DO NOTHING;

INSERT INTO folders (name, color, description, created_by) VALUES
('คำสั่งและประกาศจังหวัดระยอง', '#2563eb', 'แฟ้มเก็บคำสั่งและประกาศสำคัญประจำปี 2569', 'admin'),
('แผนเผชิญเหตุอุทกภัยและวาตภัย', '#059669', 'เอกสารและแผนยุทธศาสตร์เตรียมรับมือน้ำท่วมระยอง', 'admin'),
('เอกสารราชการทั่วไป', '#7c3aed', 'ทะเบียนหนังสือรับ-ส่งทั่วไปในสำนักงาน', 'admin')
ON CONFLICT DO NOTHING;
