const express = require('express');
const router = express.Router();
const KnowledgeDomainsEnhancedController = require('../controllers/KnowledgeDomainsEnhancedController');

/**
 * ENHANCED KNOWLEDGE DOMAINS ROUTES
 * 
 * These routes manage enhanced knowledge domains with:
 * - Integration with existing character_traits table
 * - Flexible grading systems (numeric, alphanumeric, alphabetic)
 * - Support for multiple grade scales (1-5, 0-10, A-F, A1-B2, etc.)
 * - Foundation for teacher grading form selection
 * 
 * All routes require authentication and are scoped to school/branch
 */

// ==================== GRADING SYSTEMS ====================

/**
 * @route GET /api/v2/knowledge-domains-enhanced/grading-systems
 * @desc Get all grading systems for the authenticated user's school/branch
 * @access Private
 * @query {string} system_type - Filter by system type (numeric, alphanumeric, alphabetic)
 * @query {boolean} is_active - Filter by active status
 */
router.get('/grading-systems', KnowledgeDomainsEnhancedController.getAllGradingSystems);

/**
 * @route POST /api/v2/knowledge-domains-enhanced/grading-systems
 * @desc Create a new grading system
 * @access Private
 * @body {string} system_name - Name of the grading system
 * @body {string} system_type - Type (numeric, alphanumeric, alphabetic)
 * @body {string} min_value - Minimum value in the scale
 * @body {string} max_value - Maximum value in the scale
 * @body {object} scale_definition - JSON definition of the complete scale
 * @body {boolean} is_default - Whether this is the default system
 */
router.post('/grading-systems', KnowledgeDomainsEnhancedController.createGradingSystem);

/**
 * @route GET /api/v2/knowledge-domains-enhanced/grading-scales
 * @desc Get predefined grading scales for different systems
 * @access Private
 */
router.get('/grading-scales', KnowledgeDomainsEnhancedController.getPredefinedGradingScales);

// ==================== CHARACTER TRAITS INTEGRATION ====================

/**
 * @route GET /api/v2/knowledge-domains-enhanced/character-traits
 * @desc Get character traits integration data from existing character_traits table
 * @access Private
 */
router.get('/character-traits', KnowledgeDomainsEnhancedController.getCharacterTraitsIntegration);

// ==================== ENHANCED KNOWLEDGE DOMAINS ====================

/**
 * @route GET /api/v2/knowledge-domains-enhanced
 * @desc Get all enhanced knowledge domains for the authenticated user's school/branch
 * @access Private
 * @query {string} domain_type - Filter by domain type (cognitive, affective, psychomotor, social, spiritual)
 * @query {boolean} is_active - Filter by active status
 * @query {number} grading_system_id - Filter by grading system
 */
router.get('/', KnowledgeDomainsEnhancedController.getAllDomainsEnhanced);

/**
 * @route POST /api/v2/knowledge-domains-enhanced
 * @desc Create a new enhanced knowledge domain
 * @access Private
 * @body {string} domain_name - Name of the domain
 * @body {string} domain_type - Type of domain (cognitive, affective, psychomotor, social, spiritual)
 * @body {string} description - Optional description
 * @body {number} grading_system_id - Reference to grading system
 * @body {string} character_trait_category - Maps to character_traits.category
 * @body {string} section - Section this domain applies to
 * @body {number} weight - Weight/importance of this domain
 * @body {array} assessment_criteria - Array of assessment criteria objects
 * @body {boolean} is_active - Whether domain is active (default: true)
 */
router.post('/', KnowledgeDomainsEnhancedController.createDomainEnhanced);

/**
 * @route PUT /api/v2/knowledge-domains-enhanced/:id
 * @desc Update an enhanced knowledge domain
 * @access Private
 * @param {number} id - Domain ID
 * @body {string} domain_name - Name of the domain
 * @body {string} domain_type - Type of domain
 * @body {string} description - Optional description
 * @body {number} grading_system_id - Reference to grading system
 * @body {string} character_trait_category - Maps to character_traits.category
 * @body {string} section - Section this domain applies to
 * @body {number} weight - Weight/importance of this domain
 * @body {array} assessment_criteria - Array of assessment criteria objects
 * @body {boolean} is_active - Whether domain is active
 */
router.put('/:id', KnowledgeDomainsEnhancedController.updateDomainEnhanced);

/**
 * @route DELETE /api/v2/knowledge-domains-enhanced/:id
 * @desc Delete an enhanced knowledge domain
 * @access Private
 * @param {number} id - Domain ID
 */
router.delete('/:id', KnowledgeDomainsEnhancedController.deleteDomainEnhanced);

module.exports = router;