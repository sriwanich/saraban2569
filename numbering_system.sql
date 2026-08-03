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
  currentSeq INT,
  year VARCHAR(20),
  resetFrequency VARCHAR(50),
  isActive TINYINT(1) DEFAULT 1,
  description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS file_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
