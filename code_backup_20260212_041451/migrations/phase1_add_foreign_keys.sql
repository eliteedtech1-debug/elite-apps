-- Add Foreign Keys to lesson_plan_reviews (run after verifying table structure)

-- Check if tables exist and have correct structure before adding constraints
ALTER TABLE lesson_plan_reviews 
ADD CONSTRAINT fk_lesson_plan_reviews_lesson_plan 
FOREIGN KEY (lesson_plan_id) REFERENCES lesson_plans(id) ON DELETE CASCADE;

ALTER TABLE lesson_plan_reviews 
ADD CONSTRAINT fk_lesson_plan_reviews_staff 
FOREIGN KEY (reviewed_by) REFERENCES staff(id) ON DELETE RESTRICT;
