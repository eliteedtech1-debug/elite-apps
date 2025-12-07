USE elite_yazid;

-- Update asset_inspections table to support file attachments
ALTER TABLE asset_inspections 
DROP COLUMN IF EXISTS photos_url,
ADD COLUMN attachments JSON COMMENT 'File attachments metadata (filename, path, size, etc.)';
