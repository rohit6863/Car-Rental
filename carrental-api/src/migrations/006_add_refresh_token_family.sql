-- Migration 006: Add family_id and is_revoked for Refresh Token Rotation with reuse detection,
-- and create tbl_login_attempts for account lockout / brute force protection.
-- Uses INFORMATION_SCHEMA guards for MySQL 8 and MariaDB compatibility.

SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';
SET @dbname = DATABASE();

-- 1. tbl_refresh_tokens.family_id
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tbl_refresh_tokens' AND table_schema = @dbname AND column_name = 'family_id') > 0,
  "SELECT 1",
  "ALTER TABLE tbl_refresh_tokens ADD COLUMN family_id VARCHAR(64) NULL AFTER user_id"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. tbl_refresh_tokens.is_revoked
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tbl_refresh_tokens' AND table_schema = @dbname AND column_name = 'is_revoked') > 0,
  "SELECT 1",
  "ALTER TABLE tbl_refresh_tokens ADD COLUMN is_revoked TINYINT(1) NOT NULL DEFAULT 0 AFTER token_hash"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. tbl_refresh_tokens idx_family
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE table_name = 'tbl_refresh_tokens' AND table_schema = @dbname AND index_name = 'idx_family') > 0,
  "SELECT 1",
  "ALTER TABLE tbl_refresh_tokens ADD INDEX idx_family (family_id)"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. tbl_refresh_tokens idx_token_hash
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE table_name = 'tbl_refresh_tokens' AND table_schema = @dbname AND index_name = 'idx_token_hash') > 0,
  "SELECT 1",
  "ALTER TABLE tbl_refresh_tokens ADD INDEX idx_token_hash (token_hash)"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. tbl_login_attempts
CREATE TABLE IF NOT EXISTS tbl_login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(150) NOT NULL, -- email or username
  ip_address VARCHAR(45) NOT NULL,
  attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_identifier_time (identifier, attempt_time),
  INDEX idx_ip_time (ip_address, attempt_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
