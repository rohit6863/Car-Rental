-- Migration 012: Vehicle return confirmation tracking on tblbooking
-- Additive & idempotent: keeps all legacy columns intact.

SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';
SET @dbname = DATABASE();

-- 1. tblbooking: ReturnedAt
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblbooking' AND table_schema = @dbname AND column_name = 'ReturnedAt') > 0,
  "SELECT 1",
  "ALTER TABLE tblbooking ADD COLUMN ReturnedAt DATETIME NULL"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. tblbooking: ReturnOdometerKm
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblbooking' AND table_schema = @dbname AND column_name = 'ReturnOdometerKm') > 0,
  "SELECT 1",
  "ALTER TABLE tblbooking ADD COLUMN ReturnOdometerKm INT NULL"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. tblbooking: ReturnNotes
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblbooking' AND table_schema = @dbname AND column_name = 'ReturnNotes') > 0,
  "SELECT 1",
  "ALTER TABLE tblbooking ADD COLUMN ReturnNotes VARCHAR(255) NULL"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
