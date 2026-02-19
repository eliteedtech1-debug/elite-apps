const express = require('express');
const router = express.Router();
const KnowledgeDomainsController = require('../controllers/KnowledgeDomainsController');

/**
 * KNOWLEDGE DOMAINS ROUTES
 * 
 * These routes manage knowledge domains for assessment:
 * - Cognitive (Thinking & Knowledge)
 * - Affective (Emotions & Values)
 * - Psychomotor (Physical Skills)
 * - Social (Interpersonal Skills)
 * - Spiritual (Moral & Ethical)
 * 
 * All routes require authentication and are scoped to school/branch
 */

/**
 * @route GET /api/v2/knowledge-domains
 * @desc Get all knowledge domains for the authenticated user's school/branch
 * @access Private
 * @query {string} domain_type - Filter by domain type (cognitive, affective, psychomotor, social, spiritual)
 * @query {boolean} is_active - Filter by active status
 */
router.get('/', KnowledgeDomainsController.getAllDomains);

/**
 * @route GET /api/v2/knowledge-domains/types-summary
 * @desc Get summary of domain types with counts
 * @access Private
 */
router.get('/types-summary', KnowledgeDomainsController.getDomainTypesSummary);

/**
 * @route GET /api/v2/knowledge-domains/by-type/:type
 * @desc Get knowledge domains by specific type
 * @access Private
 * @param {string} type - Domain type (cognitive, affective, psychomotor, social, spiritual)
 * @query {boolean} is_active - Filter by active status
 */
router.get('/by-type/:type', KnowledgeDomainsController.getDomainsByType);

/**
 * @route GET /api/v2/knowledge-domains/:id
 * @desc Get a specific knowledge domain by ID
 * @access Private
 * @param {number} id - Domain ID
 */
router.get('/:id', KnowledgeDomainsController.getDomainById);

/**
 * @route POST /api/v2/knowledge-domains
 * @desc Create a new knowledge domain
 * @access Private
 * @body {string} domain_name - Name of the domain
 * @body {string} domain_type - Type of domain (cognitive, affective, psychomotor, social, spiritual)
 * @body {string} description - Optional description
 * @body {array} assessment_criteria - Array of assessment criteria objects
 * @body {boolean} is_active - Whether domain is active (default: true)
 */
router.post('/', KnowledgeDomainsController.createDomain);

/**
 * @route PUT /api/v2/knowledge-domains/:id
 * @desc Update a knowledge domain
 * @access Private
 * @param {number} id - Domain ID
 * @body {string} domain_name - Name of the domain
 * @body {string} domain_type - Type of domain
 * @body {string} description - Optional description
 * @body {array} assessment_criteria - Array of assessment criteria objects
 * @body {boolean} is_active - Whether domain is active
 */
router.put('/:id', KnowledgeDomainsController.updateDomain);

/**
 * @route DELETE /api/v2/knowledge-domains/:id
 * @desc Delete a knowledge domain
 * @access Private
 * @param {number} id - Domain ID
 */
router.delete('/:id', KnowledgeDomainsController.deleteDomain);

module.exports = router;