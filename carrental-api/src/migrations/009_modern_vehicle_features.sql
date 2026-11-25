-- Migration 009: Add modern vehicle specifications and features to tblvehicles
-- Additive & idempotent: keeps all legacy columns intact for 100% backwards compatibility.

SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';
SET @dbname = DATABASE();

-- 1. Transmission
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblvehicles' AND table_schema = @dbname AND column_name = 'Transmission') > 0,
  "SELECT 1",
  "ALTER TABLE tblvehicles ADD COLUMN Transmission VARCHAR(30) NOT NULL DEFAULT 'Automatic' AFTER FuelType"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Category
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblvehicles' AND table_schema = @dbname AND column_name = 'Category') > 0,
  "SELECT 1",
  "ALTER TABLE tblvehicles ADD COLUMN Category VARCHAR(50) NOT NULL DEFAULT 'Sedan' AFTER Transmission"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Sunroof
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblvehicles' AND table_schema = @dbname AND column_name = 'Sunroof') > 0,
  "SELECT 1",
  "ALTER TABLE tblvehicles ADD COLUMN Sunroof TINYINT(1) NOT NULL DEFAULT 0"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. AppleCarPlay (Apple CarPlay / Android Auto)
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblvehicles' AND table_schema = @dbname AND column_name = 'AppleCarPlay') > 0,
  "SELECT 1",
  "ALTER TABLE tblvehicles ADD COLUMN AppleCarPlay TINYINT(1) NOT NULL DEFAULT 0"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. ReverseCamera
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblvehicles' AND table_schema = @dbname AND column_name = 'ReverseCamera') > 0,
  "SELECT 1",
  "ALTER TABLE tblvehicles ADD COLUMN ReverseCamera TINYINT(1) NOT NULL DEFAULT 0"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. CruiseControl
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblvehicles' AND table_schema = @dbname AND column_name = 'CruiseControl') > 0,
  "SELECT 1",
  "ALTER TABLE tblvehicles ADD COLUMN CruiseControl TINYINT(1) NOT NULL DEFAULT 0"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7. KeylessEntry
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblvehicles' AND table_schema = @dbname AND column_name = 'KeylessEntry') > 0,
  "SELECT 1",
  "ALTER TABLE tblvehicles ADD COLUMN KeylessEntry TINYINT(1) NOT NULL DEFAULT 0"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 8. GPSNavigation
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblvehicles' AND table_schema = @dbname AND column_name = 'GPSNavigation') > 0,
  "SELECT 1",
  "ALTER TABLE tblvehicles ADD COLUMN GPSNavigation TINYINT(1) NOT NULL DEFAULT 0"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 9. FastCharging (EV Fast Charging / Regenerative Braking)
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblvehicles' AND table_schema = @dbname AND column_name = 'FastCharging') > 0,
  "SELECT 1",
  "ALTER TABLE tblvehicles ADD COLUMN FastCharging TINYINT(1) NOT NULL DEFAULT 0"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
