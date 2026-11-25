-- Migration 007: Add email_verified, ensure nullable ContactNo, and google_id indexing
-- tblusers.email_verified: TINYINT(1) NOT NULL DEFAULT 0
-- tblusers.ContactNo: allow NULL for Google sign-in users
-- tblusers.google_id: unique index if not already present

SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';
SET @dbname = DATABASE();

-- 1. tblusers.email_verified
SET @columnname = "email_verified";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblusers' AND table_schema = @dbname AND column_name = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE tblusers ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER auth_provider"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Modify ContactNo to allow NULL
SET @preparedStatement = (SELECT IF(
  (SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblusers' AND table_schema = @dbname AND column_name = 'ContactNo') = 'YES',
  "SELECT 1",
  "ALTER TABLE tblusers MODIFY COLUMN ContactNo CHAR(11) NULL"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Add unique index on google_id if not exists
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE table_name = 'tblusers' AND table_schema = @dbname AND index_name = 'idx_tblusers_google_id') > 0,
  "SELECT 1",
  "ALTER TABLE tblusers ADD UNIQUE INDEX idx_tblusers_google_id (google_id)"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
