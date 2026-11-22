-- Migration 002: Add password_hash, google_id, and security flags
-- For tblusers:
-- password_hash (VARCHAR 255 for Argon2id)
-- google_id (VARCHAR 255 NULL)
-- auth_provider (VARCHAR 50 DEFAULT 'local')

SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';
SET @dbname = DATABASE();

-- 1. tblusers.password_hash
SET @columnname = "password_hash";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblusers' AND table_schema = @dbname AND column_name = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE tblusers ADD COLUMN password_hash VARCHAR(255) NULL AFTER Password"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. tblusers.google_id
SET @columnname = "google_id";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblusers' AND table_schema = @dbname AND column_name = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE tblusers ADD COLUMN google_id VARCHAR(255) NULL AFTER password_hash"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. tblusers.auth_provider
SET @columnname = "auth_provider";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblusers' AND table_schema = @dbname AND column_name = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE tblusers ADD COLUMN auth_provider VARCHAR(50) NOT NULL DEFAULT 'local' AFTER google_id"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. admin.password_hash
SET @columnname = "password_hash";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'admin' AND table_schema = @dbname AND column_name = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE admin ADD COLUMN password_hash VARCHAR(255) NULL AFTER Password"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. admin.must_change_password
SET @columnname = "must_change_password";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'admin' AND table_schema = @dbname AND column_name = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE admin ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 1 AFTER password_hash"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
