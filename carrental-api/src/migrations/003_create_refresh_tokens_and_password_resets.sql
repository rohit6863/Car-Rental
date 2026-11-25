-- Migration 003: Create refresh tokens and password reset token tables
-- Used for rotating refresh tokens and secure token-based password resets

CREATE TABLE IF NOT EXISTS tbl_refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_type ENUM('user', 'admin') NOT NULL,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_type, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tbl_password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(120) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_token (email, token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
