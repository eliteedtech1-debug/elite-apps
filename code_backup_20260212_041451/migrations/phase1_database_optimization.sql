-- Phase 1: Database Optimization & Normalization

-- 1. Create Audit Log Table (without foreign keys first)
CREATE TABLE IF NOT EXISTS lesson_plan_reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lesson_plan_id INT NOT NULL,
  reviewed_by INT NOT NULL,
  status ENUM('approved', 'rejected') NOT NULL,
  remark TEXT,
  reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lesson_plan_id (lesson_plan_id),
  INDEX idx_reviewed_by (reviewed_by),
  INDEX idx_reviewed_at (reviewed_at),
  INDEX idx_status (status)
);

-- 2. Add soft delete to lesson_plans
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- 3. Add soft delete to lesson_plan_reviews
ALTER TABLE lesson_plan_reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- 4. Add Missing Indexes on lesson_plans
ALTER TABLE lesson_plans ADD INDEX IF NOT EXISTS idx_status (status);
ALTER TABLE lesson_plans ADD INDEX IF NOT EXISTS idx_teacher_id (teacher_id);
ALTER TABLE lesson_plans ADD INDEX IF NOT EXISTS idx_school_branch (school_id, branch_id);
ALTER TABLE lesson_plans ADD INDEX IF NOT EXISTS idx_lesson_date (lesson_date);
ALTER TABLE lesson_plans ADD INDEX IF NOT EXISTS idx_created_at (created_at);

-- 5. Add last_reviewed_at to lesson_plans
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP NULL AFTER status;

-- 6. Drop old review columns if they exist
ALTER TABLE lesson_plans DROP COLUMN IF EXISTS remark;
ALTER TABLE lesson_plans DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE lesson_plans DROP COLUMN IF EXISTS reviewed_at;
