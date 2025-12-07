-- Fix asset_transfers foreign key constraints
-- This makes the constraints more flexible by using ON DELETE SET NULL

USE elite_yazid;

-- Drop existing foreign key constraints
ALTER TABLE asset_transfers 
DROP FOREIGN KEY IF EXISTS asset_transfers_ibfk_3;

ALTER TABLE asset_transfers 
DROP FOREIGN KEY IF EXISTS asset_transfers_ibfk_4;

ALTER TABLE asset_transfers 
DROP FOREIGN KEY IF EXISTS asset_transfers_ibfk_5;

-- Recreate with ON DELETE SET NULL to be more flexible
ALTER TABLE asset_transfers
ADD CONSTRAINT asset_transfers_ibfk_3
FOREIGN KEY (from_branch_id) REFERENCES school_locations(branch_id)
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE asset_transfers
ADD CONSTRAINT asset_transfers_ibfk_4
FOREIGN KEY (to_branch_id) REFERENCES school_locations(branch_id)
ON DELETE SET NULL ON UPDATE CASCADE;

-- Note: Make sure branch_id columns allow NULL
ALTER TABLE asset_transfers 
MODIFY COLUMN from_branch_id VARCHAR(20) NULL;

ALTER TABLE asset_transfers 
MODIFY COLUMN to_branch_id VARCHAR(20) NULL;
