-- Remove unused knowledge domain and grading tables
-- Date: 2026-02-12
-- Reason: No longer in use, no data, no controller references

-- Drop tables with FK constraints first
DROP TABLE IF EXISTS `ca_knowledge_domain_links`;
DROP TABLE IF EXISTS `assessment_criteria_enhanced`;

-- Drop knowledge domains table
DROP TABLE IF EXISTS `knowledge_domains_enhanced`;

-- Drop grading systems table
DROP TABLE IF EXISTS `grading_systems`;
