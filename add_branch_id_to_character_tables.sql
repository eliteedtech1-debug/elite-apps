-- Add branch_id column to character_traits table (the subjects/domains)
ALTER TABLE character_traits 
ADD COLUMN branch_id VARCHAR(50) AFTER school_id;



-- Add index for better query performance
CREATE INDEX idx_character_traits_branch ON character_traits(branch_id);
