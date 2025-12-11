-- Enable Remark column in End of Term Report
-- The configuration is stored as JSON in the 'configuration' column

UPDATE report_configurations 
SET configuration = JSON_SET(
  configuration,
  '$.visibility.showRemark', 
  true
)
WHERE school_id = 'SCH/20';

-- Verify the update
SELECT 
  school_id,
  JSON_EXTRACT(configuration, '$.visibility.showRemark') as showRemark
FROM report_configurations
WHERE school_id = 'SCH/20';
