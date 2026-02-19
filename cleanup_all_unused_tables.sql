-- Complete Database Cleanup - All Removed Tables
-- Date: 2026-02-12
-- Purpose: Remove all unused/standalone tables identified during elite_content migration prep

-- ============================================
-- UNUSED KNOWLEDGE DOMAIN & GRADING TABLES
-- ============================================
-- Reason: No data, no controller usage, no integration

DROP TABLE IF EXISTS `ca_knowledge_domain_links`;
DROP TABLE IF EXISTS `assessment_criteria_enhanced`;
DROP TABLE IF EXISTS `knowledge_domains_enhanced`;
DROP TABLE IF EXISTS `grading_systems`;

-- ============================================
-- STANDALONE KNOWLEDGE DOMAIN TABLES
-- ============================================
-- Reason: No integration with system, removed 3 of 4 tables

DROP TABLE IF EXISTS `assessment_criteria_simplified`;
DROP TABLE IF EXISTS `knowledge_domain_criteria`;
DROP TABLE IF EXISTS `knowledge_domains`;
DROP TABLE IF EXISTS `knowledge_domains_simplified`;

-- ============================================
-- UNUSED SUBJECT TABLE
-- ============================================
-- Reason: 0 rows, minimal code reference, not actively used

DROP TABLE IF EXISTS `subject_streams`;

-- ============================================
-- SUMMARY
-- ============================================
-- Total tables removed: 9
-- Data loss: 0 rows (all tables were empty)
-- Space saved: ~2 MB schema overhead
-- Foreign key constraints removed: 3
