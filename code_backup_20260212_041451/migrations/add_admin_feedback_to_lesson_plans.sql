-- Add remark and reviewed_by columns to lesson_plans table
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS remark TEXT AFTER status;
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS reviewed_by INT AFTER remark;
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP NULL AFTER reviewed_by;

-- Add index for reviewed_by
ALTER TABLE lesson_plans ADD INDEX IF NOT EXISTS idx_reviewed_by (reviewed_by);
