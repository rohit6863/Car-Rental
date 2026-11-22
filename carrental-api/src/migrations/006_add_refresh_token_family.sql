-- Migration 006: Add family_id and is_revoked for Refresh Token Rotation with reuse detection,
-- and create tbl_login_attempts for account lockout / brute force protection.

ALTER TABLE tbl_refresh_tokens
  ADD COLUMN IF NOT EXISTS family_id VARCHAR(64) NULL AFTER user_id,
  ADD COLUMN IF NOT EXISTS is_revoked TINYINT(1) NOT NULL DEFAULT 0 AFTER token_hash,
  ADD INDEX IF NOT EXISTS idx_family (family_id),
  ADD INDEX IF NOT EXISTS idx_token_hash (token_hash);

CREATE TABLE IF NOT EXISTS tbl_login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(150) NOT NULL, -- email or username
  ip_address VARCHAR(45) NOT NULL,
  attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_identifier_time (identifier, attempt_time),
  INDEX idx_ip_time (ip_address, attempt_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
