-- Migration 011: Customer Driving License KYC submission & rejection tracking
-- Additive & idempotent: keeps all legacy columns intact.

SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';
SET @dbname = DATABASE();

-- 1. tblusers: KycDocumentPath
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblusers' AND table_schema = @dbname AND column_name = 'KycDocumentPath') > 0,
  "SELECT 1",
  "ALTER TABLE tblusers ADD COLUMN KycDocumentPath VARCHAR(255) NULL AFTER KycStatus"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. tblusers: KycSubmittedAt
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblusers' AND table_schema = @dbname AND column_name = 'KycSubmittedAt') > 0,
  "SELECT 1",
  "ALTER TABLE tblusers ADD COLUMN KycSubmittedAt TIMESTAMP NULL AFTER KycDocumentPath"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. tblusers: KycRejectionReason
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblusers' AND table_schema = @dbname AND column_name = 'KycRejectionReason') > 0,
  "SELECT 1",
  "ALTER TABLE tblusers ADD COLUMN KycRejectionReason VARCHAR(255) NULL AFTER KycSubmittedAt"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
