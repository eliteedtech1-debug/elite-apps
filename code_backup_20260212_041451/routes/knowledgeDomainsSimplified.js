const express = require('express');
const router = express.Router();
const KnowledgeDomainsSimplifiedController = require('../controllers/KnowledgeDomainsSimplifiedController');

/**
 * SIMPLIFIED KNOWLEDGE DOMAINS ROUTES
 * 
 * These routes manage simplified knowledge domains where:
 * - Domain Type replaces Character Trait Category
 * - Simple grading system: numeric (1-5, 1-10) or alphanumeric (A1-F9, A-F)
 * - No weights - teachers assign grades directly
 * - Clean, simple setup for practical use
 * 
 * All routes require authentication and are scoped to school/branch
 */

/**
 * @route GET /api/v2/knowledge-domains-simplified
 * @desc Get all simplified knowledge domains for the authenticated user's school/branch
 * @access Private
 * @query {string} domain_type - Filter by domain type (cognitive, affective, psychomotor, social, spiritual)
 * @query {string} grading_system - Filter by grading system (numeric, alphanumeric)
 * @query {boolean} is_active - Filter by active status
 */
router.get('/', KnowledgeDomainsSimplifiedController.getAllDomainsSimplified);

/**
 * @route GET /api/v2/knowledge-domains-simplified/types-summary
 * @desc Get summary of domain types with counts
 * @access Private
 */
router.get('/types-summary', KnowledgeDomainsSimplifiedController.getDomainTypesSummarySimplified);

/**
 * @route GET /api/v2/knowledge-domains-simplified/grading-values/:system
 * @desc Get standardized grading values for a specific grading system
 * @access Private
 * @param {string} system - Grading system (numeric_1_5, numeric_1_10, alpha_a_f, alphanumeric_a1_f9, descriptive_excellent_poor)
 */
router.get('/grading-values/:system', KnowledgeDomainsSimplifiedController.getStandardizedGradingValues);

/**
 * @route GET /api/v2/knowledge-domains-simplified/by-type/:type
 * @desc Get simplified knowledge domains by specific type
 * @access Private
 * @param {string} type - Domain type (cognitive, affective, psychomotor, social, spiritual)
 * @query {string} grading_system - Filter by grading system (numeric, alphanumeric)
 * @query {boolean} is_active - Filter by active status
 */
router.get('/by-type/:type', KnowledgeDomainsSimplifiedController.getDomainsByTypeSimplified);

/**
 * @route GET /api/v2/knowledge-domains-simplified/:id
 * @desc Get a specific simplified knowledge domain by ID
 * @access Private
 * @param {number} id - Domain ID
 */
router.get('/:id', KnowledgeDomainsSimplifiedController.getDomainByIdSimplified);

/**
 * @route POST /api/v2/knowledge-domains-simplified
 * @desc Create a new simplified knowledge domain
 * @access Private
 * @body {string} domain_name - Name of the domain
 * @body {string} domain_type - Type of domain (cognitive, affective, psychomotor, social, spiritual)
 * @body {string} description - Optional description
 * @body {string} grading_system - Grading system (numeric, alphanumeric) - default: numeric
 * @body {array} assessment_criteria - Array of assessment criteria objects
 * @body {boolean} is_active - Whether domain is active (default: true)
 */
router.post('/', KnowledgeDomainsSimplifiedController.createDomainSimplified);

/**
 * @route PUT /api/v2/knowledge-domains-simplified/:id
 * @desc Update a simplified knowledge domain
 * @access Private
 * @param {number} id - Domain ID
 * @body {string} domain_name - Name of the domain
 * @body {string} domain_type - Type of domain
 * @body {string} description - Optional description
 * @body {string} grading_system - Grading system (numeric, alphanumeric)
 * @body {array} assessment_criteria - Array of assessment criteria objects
 * @body {boolean} is_active - Whether domain is active
 */
router.put('/:id', KnowledgeDomainsSimplifiedController.updateDomainSimplified);

/**
 * @route DELETE /api/v2/knowledge-domains-simplified/:id
 * @desc Delete a simplified knowledge domain
 * @access Private
 * @param {number} id - Domain ID
 */
router.delete('/:id', KnowledgeDomainsSimplifiedController.deleteDomainSimplified);

module.exports = router;