-- Migration: Create predefined_subjects table (GLOBAL TEMPLATES ONLY)
-- This table contains global subject templates that schools can copy from
-- Schools create their own subjects in the 'subjects' table with their school_id

CREATE TABLE IF NOT EXISTS predefined_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'Core',
  section VARCHAR(50) NOT NULL COMMENT 'Nursery, Primary, Junior Secondary, Senior Secondary',
  stream VARCHAR(50) NULL COMMENT 'For Senior Secondary: General, Science, Arts, Commercial, Technical',
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_section_stream (section, stream)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed with global subject templates (NO school_id - these are templates)
INSERT INTO predefined_subjects (name, type, section, stream) VALUES
-- Nursery
('English Language (Phonics, Reading, Writing, Oral English)', 'Core', 'Nursery', NULL),
('Basic Mathematics / Number Work', 'Core', 'Nursery', NULL),
('Basic Science / Nature Study', 'Core', 'Nursery', NULL),
('Social Habits / Civic Education', 'Core', 'Nursery', NULL),
('Health Habits', 'Core', 'Nursery', NULL),
('Rhymes & Poetry', 'Arts', 'Nursery', NULL),
('Handwriting', 'Arts', 'Nursery', NULL),
('Creative Arts / Colouring / Drawing', 'Arts', 'Nursery', NULL),
('Music & Rhymes', 'Arts', 'Nursery', NULL),
('Verbal Reasoning', 'Core', 'Nursery', NULL),
('Quantitative Reasoning', 'Core', 'Nursery', NULL),
('Computer Appreciation', 'Technical', 'Nursery', NULL),
('Physical & Health Education (PHE)', 'Core', 'Nursery', NULL),

-- Primary
('English Language', 'Core', 'Primary', NULL),
('Mathematics', 'Core', 'Primary', NULL),
('Basic Science & Technology (BST)', 'Science', 'Primary', NULL),
('Social Studies', 'Core', 'Primary', NULL),
('Civic Education', 'Core', 'Primary', NULL),
('Agricultural Science', 'Science', 'Primary', NULL),
('Computer Studies / ICT', 'Technical', 'Primary', NULL),
('Creative Arts (Arts, Crafts, Music, Drama)', 'Arts', 'Primary', NULL),
('Physical & Health Education (PHE)', 'Core', 'Primary', NULL),
('Home Economics', 'Vocational', 'Primary', NULL),
('Religious Studies', 'Selective', 'Primary', NULL),
('Verbal Reasoning', 'Core', 'Primary', NULL),
('Quantitative Reasoning', 'Core', 'Primary', NULL),
('Nigerian Language', 'Core', 'Primary', NULL),
('French', 'Core', 'Primary', NULL),

-- Junior Secondary
('English Studies', 'Core', 'Junior Secondary', NULL),
('Mathematics', 'Core', 'Junior Secondary', NULL),
('Basic Science', 'Science', 'Junior Secondary', NULL),
('Basic Technology', 'Technical', 'Junior Secondary', NULL),
('Business Studies', 'Commercial', 'Junior Secondary', NULL),
('Social Studies', 'Core', 'Junior Secondary', NULL),
('Civic Education', 'Core', 'Junior Secondary', NULL),
('Agricultural Science', 'Science', 'Junior Secondary', NULL),
('Computer Studies / ICT', 'Technical', 'Junior Secondary', NULL),
('Home Economics', 'Vocational', 'Junior Secondary', NULL),
('Creative & Cultural Arts (CCA)', 'Arts', 'Junior Secondary', NULL),
('Christian Religious Studies (CRS)', 'Selective', 'Junior Secondary', NULL),
('Islamic Religious Studies (IRS)', 'Selective', 'Junior Secondary', NULL),
('Nigerian Language (Hausa/Yoruba/Igbo)', 'Core', 'Junior Secondary', NULL),
('French (optional)', 'Core', 'Junior Secondary', NULL),
('Physical & Health Education (PHE)', 'Core', 'Junior Secondary', NULL),

-- Senior Secondary - General
('English Language', 'Core', 'Senior Secondary', 'General'),
('Mathematics', 'Core', 'Senior Secondary', 'General'),
('Civic Education', 'Core', 'Senior Secondary', 'General'),
('Trade/Entrepreneurship Subject', 'Vocational', 'Senior Secondary', 'General'),
('Christian Religious Studies (CRS)', 'Core', 'Senior Secondary', 'General'),
('Islamic Religious Studies (IRS)', 'Core', 'Senior Secondary', 'General'),
('Health Science / PHE', 'Core', 'Senior Secondary', 'General'),

-- Senior Secondary - Science
('Physics', 'Science', 'Senior Secondary', 'Science'),
('Chemistry', 'Science', 'Senior Secondary', 'Science'),
('Biology', 'Science', 'Senior Secondary', 'Science'),
('Further Mathematics', 'Science', 'Senior Secondary', 'Science'),
('Agricultural Science', 'Science', 'Senior Secondary', 'Science'),
('Geography', 'Science', 'Senior Secondary', 'Science'),

-- Senior Secondary - Arts
('Literature-in-English', 'Arts', 'Senior Secondary', 'Arts'),
('Government', 'Arts', 'Senior Secondary', 'Arts'),
('History', 'Arts', 'Senior Secondary', 'Arts'),
('Economics', 'Arts', 'Senior Secondary', 'Arts'),
('Geography', 'Arts', 'Senior Secondary', 'Arts'),
('Music', 'Arts', 'Senior Secondary', 'Arts'),
('Theatre Arts', 'Arts', 'Senior Secondary', 'Arts'),

-- Senior Secondary - Commercial
('Accounting', 'Commercial', 'Senior Secondary', 'Commercial'),
('Commerce', 'Commercial', 'Senior Secondary', 'Commercial'),
('Economics', 'Commercial', 'Senior Secondary', 'Commercial'),
('Office Practice', 'Commercial', 'Senior Secondary', 'Commercial'),
('Marketing', 'Commercial', 'Senior Secondary', 'Commercial'),
('Business Management', 'Commercial', 'Senior Secondary', 'Commercial'),

-- Senior Secondary - Technical
('Physics', 'Technical', 'Senior Secondary', 'Technical'),
('Chemistry', 'Technical', 'Senior Secondary', 'Technical'),
('Technical Drawing', 'Technical', 'Senior Secondary', 'Technical'),
('Auto Mechanics', 'Technical', 'Senior Secondary', 'Technical'),
('Wood Work', 'Technical', 'Senior Secondary', 'Technical'),
('Metal Work', 'Technical', 'Senior Secondary', 'Technical'),
('Electronics', 'Technical', 'Senior Secondary', 'Technical'),
('Building Construction', 'Technical', 'Senior Secondary', 'Technical'),
('Applied Electricity', 'Technical', 'Senior Secondary', 'Technical'),
('Data Processing', 'Technical', 'Senior Secondary', 'Technical'),
('Computer Studies / ICT', 'Technical', 'Senior Secondary', 'Technical'),
('Further Mathematics', 'Technical', 'Senior Secondary', 'Technical');
