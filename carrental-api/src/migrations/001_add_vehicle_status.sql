-- Migration 001: Add vehicle_status to tblvehicles
-- Non-destructive & idempotent: checks if column exists before adding or uses safe ALTER TABLE
-- Note: MariaDB/MySQL 8+ supports IF NOT EXISTS for ADD COLUMN; for compatibility with older MySQL,
-- we check column existence via stored procedure or direct safe statement.

SET @dbname = DATABASE();
SET @tablename = "tblvehicles";
SET @columnname = "vehicle_status";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE tblvehicles ADD COLUMN vehicle_status VARCHAR(50) DEFAULT 'Available'"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Ensure default value is set for any existing rows where vehicle_status is null
UPDATE tblvehicles SET vehicle_status = 'Available' WHERE vehicle_status IS NULL OR vehicle_status = '';
