-- Migration 010: Fleet Ops operational tables and columns
-- Additive & idempotent: keeps all legacy tables/columns intact.

SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';
SET @dbname = DATABASE();

-- 1. tblvehicles: RegistrationPlate, HubLocation, OdometerKm, FuelChargePct
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblvehicles' AND table_schema = @dbname AND column_name = 'RegistrationPlate') > 0,
  "SELECT 1",
  "ALTER TABLE tblvehicles ADD COLUMN RegistrationPlate VARCHAR(32) NULL AFTER Category"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblvehicles' AND table_schema = @dbname AND column_name = 'HubLocation') > 0,
  "SELECT 1",
  "ALTER TABLE tblvehicles ADD COLUMN HubLocation VARCHAR(120) DEFAULT 'Pune Koregaon Park' AFTER RegistrationPlate"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblvehicles' AND table_schema = @dbname AND column_name = 'OdometerKm') > 0,
  "SELECT 1",
  "ALTER TABLE tblvehicles ADD COLUMN OdometerKm INT DEFAULT 0 AFTER HubLocation"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblvehicles' AND table_schema = @dbname AND column_name = 'FuelChargePct') > 0,
  "SELECT 1",
  "ALTER TABLE tblvehicles ADD COLUMN FuelChargePct TINYINT UNSIGNED DEFAULT 100 AFTER OdometerKm"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill sensible defaults for existing rows without plates or hubs
UPDATE tblvehicles
SET RegistrationPlate = CONCAT('MH 12 WW ', LPAD(id, 4, '0'))
WHERE RegistrationPlate IS NULL OR RegistrationPlate = '';

UPDATE tblvehicles
SET HubLocation = 'Pune Koregaon Park'
WHERE HubLocation IS NULL OR HubLocation = '';

UPDATE tblvehicles
SET FuelChargePct = 100
WHERE FuelChargePct IS NULL;

-- 2. tblusers: DrivingLicenseNo, KycStatus
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblusers' AND table_schema = @dbname AND column_name = 'DrivingLicenseNo') > 0,
  "SELECT 1",
  "ALTER TABLE tblusers ADD COLUMN DrivingLicenseNo VARCHAR(50) NULL"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'tblusers' AND table_schema = @dbname AND column_name = 'KycStatus') > 0,
  "SELECT 1",
  "ALTER TABLE tblusers ADD COLUMN KycStatus ENUM('Pending','Verified','Rejected') NOT NULL DEFAULT 'Pending'"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. tblmaintenance
CREATE TABLE IF NOT EXISTS `tblmaintenance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `VehicleId` int(11) NOT NULL,
  `TaskTitle` varchar(255) NOT NULL,
  `DueDate` date NOT NULL,
  `EstimatedCost` decimal(10,2) NOT NULL DEFAULT 0.00,
  `Status` ENUM('Scheduled','Pending','Completed') NOT NULL DEFAULT 'Scheduled',
  `CreatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_maintenance_vehicle` (`VehicleId`),
  CONSTRAINT `fk_maintenance_vehicle` FOREIGN KEY (`VehicleId`) REFERENCES `tblvehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. tblpricing_rules
CREATE TABLE IF NOT EXISTS `tblpricing_rules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `WeekendSurgeEnabled` tinyint(1) NOT NULL DEFAULT 0,
  `WeekendSurgePct` tinyint(3) unsigned NOT NULL DEFAULT 15,
  `HolidaySurgeEnabled` tinyint(1) NOT NULL DEFAULT 0,
  `HolidaySurgePct` tinyint(3) unsigned NOT NULL DEFAULT 20,
  `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `tblpricing_rules` (`id`, `WeekendSurgeEnabled`, `WeekendSurgePct`, `HolidaySurgeEnabled`, `HolidaySurgePct`)
VALUES (1, 0, 15, 0, 20);

-- 5. tbladmin_notes
CREATE TABLE IF NOT EXISTS `tbladmin_notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Title` varchar(200) NOT NULL,
  `Description` varchar(500) DEFAULT '',
  `Category` ENUM('Maintenance','KYC','Fleet Ops') NOT NULL DEFAULT 'Fleet Ops',
  `IsDone` tinyint(1) NOT NULL DEFAULT 0,
  `CreatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
