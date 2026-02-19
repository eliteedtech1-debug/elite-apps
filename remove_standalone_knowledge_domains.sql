-- Remove standalone knowledge domain tables
-- Only keeping knowledge_domains_enhanced which integrates with grading_systems and character_traits
-- Date: 2026-02-12

DROP TABLE IF EXISTS `assessment_criteria_simplified`;
DROP TABLE IF EXISTS `knowledge_domain_criteria`;
DROP TABLE IF EXISTS `knowledge_domains`;
DROP TABLE IF EXISTS `knowledge_domains_simplified`;
