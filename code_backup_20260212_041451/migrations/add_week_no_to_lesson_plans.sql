-- Add week_no column to lesson_plans table
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS week_no TINYINT DEFAULT NULL AFTER term;

-- Add index for better query performance
ALTER TABLE lesson_plans ADD INDEX IF NOT EXISTS idx_week_no (week_no);

-- Add composite index for common queries
ALTER TABLE lesson_plans ADD INDEX IF NOT EXISTS idx_school_term_week (school_id, term, week_no);
