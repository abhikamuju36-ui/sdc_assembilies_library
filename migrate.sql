-- Run this once against free-sql-db-9499891 to add editable columns.
-- Existing columns (job_id, job_name, part_number, assembly_description) are never touched.

ALTER TABLE solidworks_assemblies ADD
  category     NVARCHAR(50)  NULL,
  comments     NVARCHAR(MAX) NULL,
  status       NVARCHAR(20)  NULL,
  updated_by   NVARCHAR(100) NULL,
  updated_at   DATETIME      NULL;

-- Add sdc_standard column (run separately if columns above already exist)
ALTER TABLE solidworks_assemblies ADD
  sdc_standard NVARCHAR(10)  NULL;

-- Clear unintended default values so blank rows show as null (run once)
UPDATE solidworks_assemblies SET sdc_standard = NULL WHERE sdc_standard = 'No';
