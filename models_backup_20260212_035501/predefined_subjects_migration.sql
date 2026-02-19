-- Migration: Create predefined_subjects table
CREATE TABLE IF NOT EXISTS predefined_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'Core',
  section VARCHAR(50) NOT NULL COMMENT 'Nursery, Primary, Junior Secondary, Senior Secondary',
  stream VARCHAR(50) NULL COMMENT 'For Senior Secondary: General, Science, Arts, Commercial, Technical',
  school_id VARCHAR(20) NULL COMMENT 'NULL for system-wide, specific school_id for school-specific subjects',
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_section_stream (section, stream),
  INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed with default subjects (system-wide, school_id = NULL)
INSERT INTO predefined_subjects (name, type, section, stream, school_id, created_at, updated_at) VALUES
-- Nursery
('English Language (Phonics, Reading, Writing, Oral English)', 'Core', 'Nursery', NULL, NULL, NOW(), NOW()),
('Basic Mathematics / Number Work', 'Core', 'Nursery', NULL, NULL),
('Basic Science / Nature Study', 'Core', 'Nursery', NULL, NULL),
('Social Habits / Civic Education', 'Core', 'Nursery', NULL, NULL),
('Health Habits', 'Core', 'Nursery', NULL, NULL),
('Rhymes & Poetry', 'Arts', 'Nursery', NULL, NULL),
('Handwriting', 'Arts', 'Nursery', NULL, NULL),
('Creative Arts / Colouring / Drawing', 'Arts', 'Nursery', NULL, NULL),
('Music & Rhymes', 'Arts', 'Nursery', NULL, NULL),
('Verbal Reasoning', 'Core', 'Nursery', NULL, NULL),
('Quantitative Reasoning', 'Core', 'Nursery', NULL, NULL),
('Computer Appreciation', 'Technical', 'Nursery', NULL, NULL),
('Physical & Health Education (PHE)', 'Core', 'Nursery', NULL, NULL),

-- Primary
('English Language', 'Core', 'Primary', NULL, NULL),
('Mathematics', 'Core', 'Primary', NULL, NULL),
('Basic Science & Technology (BST)', 'Science', 'Primary', NULL, NULL),
('Social Studies', 'Core', 'Primary', NULL, NULL),
('Civic Education', 'Core', 'Primary', NULL, NULL),
('Agricultural Science', 'Science', 'Primary', NULL, NULL),
('Computer Studies / ICT', 'Technical', 'Primary', NULL, NULL),
('Creative Arts (Arts, Crafts, Music, Drama)', 'Arts', 'Primary', NULL, NULL),
('Physical & Health Education (PHE)', 'Core', 'Primary', NULL, NULL),
('Home Economics', 'Vocational', 'Primary', NULL, NULL),
('Religious Studies', 'Selective', 'Primary', NULL, NULL),
('Verbal Reasoning', 'Core', 'Primary', NULL, NULL),
('Quantitative Reasoning', 'Core', 'Primary', NULL, NULL),
('Nigerian Language', 'Core', 'Primary', NULL, NULL),
('French', 'Core', 'Primary', NULL, NULL),

-- Junior Secondary
('English Studies', 'Core', 'Junior Secondary', NULL, NULL),
('Mathematics', 'Core', 'Junior Secondary', NULL, NULL),
('Basic Science', 'Science', 'Junior Secondary', NULL, NULL),
('Basic Technology', 'Technical', 'Junior Secondary', NULL, NULL),
('Business Studies', 'Commercial', 'Junior Secondary', NULL, NULL),
('Social Studies', 'Core', 'Junior Secondary', NULL, NULL),
('Civic Education', 'Core', 'Junior Secondary', NULL, NULL),
('Agricultural Science', 'Science', 'Junior Secondary', NULL, NULL),
('Computer Studies / ICT', 'Technical', 'Junior Secondary', NULL, NULL),
('Home Economics', 'Vocational', 'Junior Secondary', NULL, NULL),
('Creative & Cultural Arts (CCA)', 'Arts', 'Junior Secondary', NULL, NULL),
('Christian Religious Studies (CRS)', 'Selective', 'Junior Secondary', NULL, NULL),
('Islamic Religious Studies (IRS)', 'Selective', 'Junior Secondary', NULL, NULL),
('Nigerian Language (Hausa/Yoruba/Igbo)', 'Core', 'Junior Secondary', NULL, NULL),
('French (optional)', 'Core', 'Junior Secondary', NULL, NULL),
('Physical & Health Education (PHE)', 'Core', 'Junior Secondary', NULL, NULL),

-- Senior Secondary - General
('English Language', 'Core', 'Senior Secondary', 'General', NULL),
('Mathematics', 'Core', 'Senior Secondary', 'General', NULL),
('Civic Education', 'Core', 'Senior Secondary', 'General', NULL),
('Trade/Entrepreneurship Subject', 'Vocational', 'Senior Secondary', 'General', NULL),
('Christian Religious Studies (CRS)', 'Core', 'Senior Secondary', 'General', NULL),
('Islamic Religious Studies (IRS)', 'Core', 'Senior Secondary', 'General', NULL),
('Health Science / PHE', 'Core', 'Senior Secondary', 'General', NULL),

-- Senior Secondary - Science
('Physics', 'Science', 'Senior Secondary', 'Science', NULL),
('Chemistry', 'Science', 'Senior Secondary', 'Science', NULL),
('Biology', 'Science', 'Senior Secondary', 'Science', NULL),
('Further Mathematics', 'Science', 'Senior Secondary', 'Science', NULL),
('Agricultural Science', 'Science', 'Senior Secondary', 'Science', NULL),
('Geography', 'Science', 'Senior Secondary', 'Science', NULL),

-- Senior Secondary - Arts
('Literature-in-English', 'Arts', 'Senior Secondary', 'Arts', NULL),
('Government', 'Arts', 'Senior Secondary', 'Arts', NULL),
('History', 'Arts', 'Senior Secondary', 'Arts', NULL),
('Economics', 'Arts', 'Senior Secondary', 'Arts', NULL),
('Geography', 'Arts', 'Senior Secondary', 'Arts', NULL),
('Music', 'Arts', 'Senior Secondary', 'Arts', NULL),
('Theatre Arts', 'Arts', 'Senior Secondary', 'Arts', NULL),

-- Senior Secondary - Commercial
('Accounting', 'Commercial', 'Senior Secondary', 'Commercial', NULL),
('Commerce', 'Commercial', 'Senior Secondary', 'Commercial', NULL),
('Economics', 'Commercial', 'Senior Secondary', 'Commercial', NULL),
('Office Practice', 'Commercial', 'Senior Secondary', 'Commercial', NULL),
('Marketing', 'Commercial', 'Senior Secondary', 'Commercial', NULL),
('Business Management', 'Commercial', 'Senior Secondary', 'Commercial', NULL),

-- Senior Secondary - Technical
('Physics', 'Technical', 'Senior Secondary', 'Technical', NULL),
('Chemistry', 'Technical', 'Senior Secondary', 'Technical', NULL),
('Technical Drawing', 'Technical', 'Senior Secondary', 'Technical', NULL),
('Auto Mechanics', 'Technical', 'Senior Secondary', 'Technical', NULL),
('Wood Work', 'Technical', 'Senior Secondary', 'Technical', NULL),
('Metal Work', 'Technical', 'Senior Secondary', 'Technical', NULL),
('Electronics', 'Technical', 'Senior Secondary', 'Technical', NULL),
('Building Construction', 'Technical', 'Senior Secondary', 'Technical', NULL),
('Applied Electricity', 'Technical', 'Senior Secondary', 'Technical', NULL),
('Data Processing', 'Technical', 'Senior Secondary', 'Technical', NULL),
('Computer Studies / ICT', 'Technical', 'Senior Secondary', 'Technical', NULL),
('Further Mathematics', 'Technical', 'Senior Secondary', 'Technical', NULL);
