-- Migration: Create report_configurations table
-- This table stores customizable report configuration settings for each school

CREATE TABLE IF NOT EXISTS report_configurations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id VARCHAR(50) NOT NULL,
  configuration JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_school_id (school_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add a comment to the table
ALTER TABLE report_configurations COMMENT = 'Stores customizable report configuration settings for schools including colors, layout, visibility options, and content settings';

-- Sample data (optional - for testing)
-- INSERT INTO report_configurations (school_id, configuration) VALUES 
-- ('SCH/1', '{"visibility":{"showPosition":true,"showOutOf":true},"colors":{"primary":"#6f42c1"}}');

-- Verify table creation
SELECT 
  TABLE_NAME,
  TABLE_COMMENT,
  CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'report_configurations';

-- Show table structure
DESCRIBE report_configurations;