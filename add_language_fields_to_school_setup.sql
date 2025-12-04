-- Migration: Add Language Fields to school_setup Table
-- Date: January 2025
-- Purpose: Replace is_arabic boolean with flexible default_lang and second_lang fields

-- Add default_lang column (primary language for the school)
ALTER TABLE `school_setup`
ADD COLUMN `default_lang` VARCHAR(5) NOT NULL DEFAULT 'en'
COMMENT 'Primary language for the school (e.g., en, ar, fr, es)'
AFTER `created_by`;

-- Add second_lang column (optional secondary language for bilingual schools)
ALTER TABLE `school_setup`
ADD COLUMN `second_lang` VARCHAR(5) NULL DEFAULT NULL
COMMENT 'Optional secondary language for bilingual schools (e.g., ar, fr, es)'
AFTER `default_lang`;

-- Migration for schools that previously used is_arabic = 1 (if that column exists)
-- If is_arabic column exists, migrate data:
-- UPDATE school_setup
-- SET second_lang = 'ar'
-- WHERE is_arabic = 1;

-- Then drop is_arabic column if it exists:
-- ALTER TABLE school_setup DROP COLUMN IF EXISTS is_arabic;

-- Verify the changes
SELECT
    school_id,
    school_name,
    default_lang,
    second_lang
FROM school_setup
LIMIT 10;

-- Example: Set Arabic as secondary language for a specific school
-- UPDATE school_setup
-- SET second_lang = 'ar'
-- WHERE school_id = 'YOUR_SCHOOL_ID';

-- Example: Set Arabic as default language and English as secondary
-- UPDATE school_setup
-- SET default_lang = 'ar', second_lang = 'en'
-- WHERE school_id = 'YOUR_SCHOOL_ID';

-- Common language codes:
-- 'en' - English
-- 'ar' - Arabic
-- 'fr' - French
-- 'es' - Spanish
-- 'sw' - Swahili
-- 'ha' - Hausa
-- 'yo' - Yoruba
-- 'ig' - Igbo
