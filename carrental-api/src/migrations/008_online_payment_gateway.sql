-- Migration 008: Online Payment Gateway & Webhook Deduplication Support
-- Idempotent & non-destructive: supports Razorpay & Mock Gateway adapters while preserving legacy rows

SET @dbname = DATABASE();

-- 1. Add 'gateway' column to tblpayments if not exists
SET @columnname = "gateway";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblpayments' AND table_schema = @dbname AND column_name = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE tblpayments ADD COLUMN gateway VARCHAR(50) NULL AFTER booking_id"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Modify payment_status to support 'pending', 'confirmed', 'failed', 'refunded', 'rejected'
ALTER TABLE tblpayments MODIFY COLUMN payment_status VARCHAR(50) NOT NULL DEFAULT 'pending';

-- 3. Unique index on gateway_order_id
SET @indexname = "uq_tblpayments_gateway_order_id";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE table_name = 'tblpayments' AND table_schema = @dbname AND index_name = @indexname) > 0,
  "SELECT 1",
  "CREATE UNIQUE INDEX uq_tblpayments_gateway_order_id ON tblpayments (gateway_order_id)"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Unique index on gateway_payment_id
SET @indexname = "uq_tblpayments_gateway_payment_id";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE table_name = 'tblpayments' AND table_schema = @dbname AND index_name = @indexname) > 0,
  "SELECT 1",
  "CREATE UNIQUE INDEX uq_tblpayments_gateway_payment_id ON tblpayments (gateway_payment_id)"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Webhook event deduplication table
CREATE TABLE IF NOT EXISTS tbl_payment_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  gateway VARCHAR(50) NOT NULL,
  payload LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payment_event_id (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
