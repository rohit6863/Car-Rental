-- Migration 004: Extend tblpayments for modern gateway integration (Razorpay / automated payments)
-- Retains all existing columns and records so legacy data remains intact

SET @dbname = DATABASE();

-- 1. gateway_order_id
SET @columnname = "gateway_order_id";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblpayments' AND table_schema = @dbname AND column_name = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE tblpayments ADD COLUMN gateway_order_id VARCHAR(100) NULL AFTER transaction_id"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. gateway_payment_id
SET @columnname = "gateway_payment_id";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblpayments' AND table_schema = @dbname AND column_name = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE tblpayments ADD COLUMN gateway_payment_id VARCHAR(100) NULL AFTER gateway_order_id"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. gateway_signature
SET @columnname = "gateway_signature";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblpayments' AND table_schema = @dbname AND column_name = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE tblpayments ADD COLUMN gateway_signature VARCHAR(255) NULL AFTER gateway_payment_id"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. currency
SET @columnname = "currency";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblpayments' AND table_schema = @dbname AND column_name = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE tblpayments ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'INR' AFTER gateway_signature"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. failure_reason
SET @columnname = "failure_reason";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblpayments' AND table_schema = @dbname AND column_name = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE tblpayments ADD COLUMN failure_reason TEXT NULL AFTER currency"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
