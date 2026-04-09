-- Run this against your database to remove unused and redundant columns.
-- This will remove:
-- 1. 'status' (no longer needed)
-- 2. 'image_link' (redundant, replaced by 'picture_link')
-- 3. 'modelling_link' (redundant, replaced by 'model_link')

-- Drop from main table
ALTER TABLE solidworks_assemblies DROP COLUMN status, image_link, modelling_link;

-- Drop from testing table
ALTER TABLE solidworks_assemblies_testing DROP COLUMN status, image_link, modelling_link;
