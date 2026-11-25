-- Migration 013: MySQL 8 Strict Mode Compatibility
-- Ensures legacy Password columns and tblpayments columns allow NULL/default values
-- so STRICT_TRANS_TABLES mode in MySQL 8 does not reject operations when columns
-- are migrated or omitted during pending order initialization.

SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';

-- 1. tblpayments: Allow NULL for user_email, payment_method, and transaction_id
ALTER TABLE tblpayments MODIFY COLUMN user_email VARCHAR(100) NULL DEFAULT NULL;
ALTER TABLE tblpayments MODIFY COLUMN payment_method VARCHAR(50) NULL DEFAULT NULL;
ALTER TABLE tblpayments MODIFY COLUMN transaction_id VARCHAR(255) NULL DEFAULT NULL;

-- 2. admin: Allow NULL for legacy Password column (e.g. after password_hash migration)
ALTER TABLE admin MODIFY COLUMN Password VARCHAR(255) NULL DEFAULT NULL;

-- 3. tblusers: Ensure legacy Password column allows NULL
ALTER TABLE tblusers MODIFY COLUMN Password VARCHAR(255) NULL DEFAULT NULL;
