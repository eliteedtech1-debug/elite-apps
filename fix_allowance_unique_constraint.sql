-- Fix allowance_code unique constraint to be scoped by school_id and branch_id
-- Drop old constraint
ALTER TABLE allowance_types DROP INDEX uniq_allowance_code;

-- Add new constraint
ALTER TABLE allowance_types ADD UNIQUE KEY uniq_allowance_code_school_branch (allowance_code, school_id, branch_id);
