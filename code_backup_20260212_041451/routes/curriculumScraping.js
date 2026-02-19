const express = require('express');
const router = express.Router();
const curriculumScrapingController = require('../controllers/curriculumScrapingController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Scraping operations
router.post('/refetch', curriculumScrapingController.refetchItem);
router.post('/preview', curriculumScrapingController.previewUrl);
router.post('/discover-classes', curriculumScrapingController.discoverClasses);
router.post('/scrape', curriculumScrapingController.triggerScraping);
router.post('/bulk-scrape', curriculumScrapingController.bulkScraping);
router.get('/scraped', curriculumScrapingController.getScrapedData);
router.get('/stats', curriculumScrapingController.getStats);
router.get('/scraping-status', curriculumScrapingController.getScrapingStatus);

// Automation and scheduling
router.post('/schedule', curriculumScrapingController.setupSchedule);
router.get('/available-options', curriculumScrapingController.getAvailableOptions);

// Generate lesson plans from scraped data
router.post('/generate-from-scraped', curriculumScrapingController.generateLessonPlansFromScraped);

// Delete curriculum item
router.delete('/:id', curriculumScrapingController.deleteCurriculumItem);

module.exports = router;
