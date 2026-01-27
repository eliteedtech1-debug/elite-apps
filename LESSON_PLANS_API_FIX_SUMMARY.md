# Lesson Plans API Fix Summary

## Issues Found and Fixed

### 1. **Model Table Mismatch**
- **Problem**: The `LessonPlan` model was pointing to `syllabus_tracker` table instead of `lesson_plans`
- **File**: `/src/models/LessonPlan.js`
- **Fix**: Changed `tableName: 'syllabus_tracker'` to `tableName: 'lesson_plans'`

### 2. **Field Name Mismatches**
- **Problem**: Model field names didn't match actual database columns
- **Fixes**:
  - `subject` → `subject_code`
  - `lesson_content` → `content`
  - Removed non-existent fields like `week_no` (needs to be added to DB)

### 3. **Controller Query Issues**
- **Problem**: `syllabusController.getLessonPlans()` was using wrong field names
- **File**: `/src/controllers/syllabusController.js`
- **Fix**: Updated filter to use `subject_code` instead of `subject`

### 4. **Missing Database Column**
- **Problem**: `week_no` column doesn't exist in `lesson_plans` table but is essential for lesson planning
- **Solution**: Run the migration to add it

## Required Database Migration

Run this SQL to add the missing `week_no` column:

```sql
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS week_no TINYINT DEFAULT NULL AFTER term;
ALTER TABLE lesson_plans ADD INDEX IF NOT EXISTS idx_week_no (week_no);
ALTER TABLE lesson_plans ADD INDEX IF NOT EXISTS idx_school_term_week (school_id, term, week_no);
```

Or use the migration file:
```bash
mysql -h localhost -u root full_skcooly < /src/migrations/add_week_no_to_lesson_plans.sql
```

## Files Modified

1. `/src/models/LessonPlan.js` - Fixed model definition
2. `/src/controllers/syllabusController.js` - Fixed field references
3. `/src/routes/lessonPlans.js` - Ensured correct query structure

## Testing the Fix

After running the migration, test with:

```bash
curl -X GET 'http://localhost:34567/api/v1/lesson-plans' \
  -H 'X-Branch-Id: BRCH/29' \
  -H 'X-School-Id: SCH/23' \
  -H 'Authorization: Bearer <token>'
```

Expected response:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total_items": 0,
    "page": 1,
    "limit": 10
  }
}
```

## Lesson Plans Table Schema

```
CREATE TABLE `lesson_plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `subject_code` varchar(50) NOT NULL,
  `class_code` varchar(50) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `lesson_date` datetime NOT NULL,
  `duration_minutes` int(11) DEFAULT 40,
  `objectives` text DEFAULT NULL,
  `content` text DEFAULT NULL,
  `activities` text DEFAULT NULL,
  `resources` text DEFAULT NULL,
  `assessment_methods` text DEFAULT NULL,
  `homework` text DEFAULT NULL,
  `status` enum('draft','submitted','approved','rejected') DEFAULT 'draft',
  `school_id` varchar(20) DEFAULT NULL,
  `branch_id` varchar(20) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `syllabus_id` varchar(50) DEFAULT NULL,
  `syllabus_topic` varchar(255) DEFAULT NULL,
  `nerdc_alignment` text DEFAULT NULL,
  `ai_generated` tinyint(1) DEFAULT 0,
  `ai_model_used` varchar(50) DEFAULT NULL,
  `ai_prompt_version` varchar(20) DEFAULT NULL,
  `teacher_edit_percentage` int(11) DEFAULT NULL,
  `syllabus_topics` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `curriculum_alignment_percentage` int(11) DEFAULT 0,
  `syllabus_coverage_tags` text DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `term` varchar(50) DEFAULT NULL,
  `week_no` tinyint DEFAULT NULL,  -- NEWLY ADDED
  PRIMARY KEY (`id`),
  KEY `lesson_plans_school_id` (`school_id`),
  KEY `lesson_plans_teacher_id` (`teacher_id`),
  KEY `lesson_plans_subject_code` (`subject_code`),
  KEY `lesson_plans_class_code` (`class_code`),
  KEY `lesson_plans_lesson_date` (`lesson_date`),
  KEY `lesson_plans_status` (`status`),
  KEY `idx_week_no` (`week_no`),  -- NEWLY ADDED
  KEY `idx_school_term_week` (`school_id`, `term`, `week_no`)  -- NEWLY ADDED
) ENGINE=InnoDB
```

## API Endpoints Fixed

- `GET /api/v1/lesson-plans` - List lesson plans with filters
- `GET /api/v1/lesson-plans/stats` - Get lesson plan statistics
- `GET /api/v1/lesson-plans/test` - Test endpoint for debugging
