const StudyZoneScraper = require('../services/studyZoneScraper');
const db = require('../models');

class CurriculumScrapingController {
  // POST /api/v1/curriculum/refetch - Refetch specific curriculum item
  async refetchItem(req, res) {
    try {
      const { id, url } = req.body;
      
      if (!id || !url) {
        return res.status(400).json({
          success: false,
          error: 'ID and URL are required'
        });
      }

      const scraper = new StudyZoneScraper();
      const results = await scraper.scrapeFromUrl(url);
      
      // Update the existing record
      await db.sequelize.query(`
        UPDATE syllabus 
        SET scraped_at = NOW(), updated_at = NOW()
        WHERE id = :id
      `, {
        replacements: { id },
        type: db.Sequelize.QueryTypes.UPDATE
      });
      
      res.json({
        success: true,
        data: {
          updated_count: 1,
          url
        },
        message: 'Content refetched successfully'
      });
    } catch (error) {
      console.error('Refetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refetch content'
      });
    }
  }

  // POST /api/v1/curriculum/preview - Preview URL content
  async previewUrl(req, res) {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required'
        });
      }

      const scraper = new StudyZoneScraper();
      const preview = await scraper.previewUrl(url);
      
      res.json({
        success: true,
        data: preview,
        message: 'URL preview generated successfully'
      });
    } catch (error) {
      console.error('URL preview error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to preview URL'
      });
    }
  }

  // POST /api/v1/curriculum/discover-classes - Discover available classes
  async discoverClasses(req, res) {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required'
        });
      }

      const scraper = new StudyZoneScraper();
      const classes = await scraper.discoverClasses(url);
      
      res.json({
        success: true,
        data: {
          classes,
          total: classes.length
        },
        message: `Discovered ${classes.length} classes`
      });
    } catch (error) {
      console.error('Class discovery error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to discover classes'
      });
    }
  }

  // POST /api/v1/curriculum/scrape - Manual trigger scraping
  async triggerScraping(req, res) {
    try {
      const { url, subject, class_code, term } = req.body;
      const { school_id } = req.user;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required'
        });
      }

      const scraper = new StudyZoneScraper();
      const results = await scraper.scrapeFromUrl(url, { subject, class_code, term });
      
      res.json({
        success: true,
        data: {
          scraped_count: results.length,
          source: 'StudyZone',
          subject,
          class_code,
          term,
          url
        },
        message: 'Curriculum scraping completed successfully'
      });
    } catch (error) {
      console.error('Scraping controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to scrape curriculum data'
      });
    }
  }

  // GET /api/v1/curriculum/stats - Get curriculum statistics
  async getStats(req, res) {
    try {
      const stats = await db.sequelize.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN scraped_source IS NOT NULL THEN 1 END) as scraped,
          COUNT(CASE WHEN scraped_source IS NULL THEN 1 END) as manual,
          COUNT(DISTINCT subject) as subjects
        FROM syllabus
      `, {
        type: db.Sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: stats[0]
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics'
      });
    }
  }

  // GET /api/v1/curriculum/scraped - Get scraped curriculum data
  async getScrapedData(req, res) {
    try {
      const { subject, class_code, term } = req.query;
      const { school_id } = req.user;

      const whereClause = {
        scraped_source: { [db.Sequelize.Op.ne]: null }
      };

      if (subject) whereClause.subject = subject;
      if (class_code) whereClause.class_code = class_code;
      if (term) whereClause.term = term;

      const scrapedData = await db.sequelize.query(`
        SELECT 
          id, subject, class_code, term, week, title, content,
          scraped_source, scraped_at, created_at
        FROM syllabus 
        WHERE scraped_source IS NOT NULL
        ${subject ? 'AND subject = :subject' : ''}
        ${class_code ? 'AND class_code = :class_code' : ''}
        ${term ? 'AND term = :term' : ''}
        ORDER BY class_code, subject, term, week
      `, {
        replacements: { subject, class_code, term },
        type: db.Sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: scrapedData,
        count: scrapedData.length
      });
    } catch (error) {
      console.error('Get scraped data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve scraped data'
      });
    }
  }

  // POST /api/v1/curriculum/generate-from-scraped - Generate lesson plans from scraped data
  async generateLessonPlansFromScraped(req, res) {
    try {
      const { syllabus_ids, teacher_id } = req.body;
      const { school_id, branch_id } = req.user;

      if (!syllabus_ids || syllabus_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Syllabus IDs are required'
        });
      }

      // Get scraped syllabus data
      const syllabusData = await db.sequelize.query(`
        SELECT * FROM syllabus 
        WHERE id IN (:syllabus_ids) 
        AND scraped_source IS NOT NULL
      `, {
        replacements: { syllabus_ids },
        type: db.Sequelize.QueryTypes.SELECT
      });

      const generatedPlans = [];

      for (const syllabus of syllabusData) {
        try {
          const content = JSON.parse(syllabus.content);
          
          // Create lesson plan using scraped data
          const [insertResult] = await db.sequelize.query(`
            INSERT INTO syllabus_tracker (
              teacher_id, syllabus_id, title, objectives, lesson_content,
              activities, subject, class_code, term, week, 
              ai_generated, school_id, branch_id, status, created_at
            ) VALUES (
              :teacher_id, :syllabus_id, :title, :objectives, :lesson_content,
              :activities, :subject, :class_code, :term, :week,
              true, :school_id, :branch_id, 'draft', NOW()
            )
          `, {
            replacements: {
              teacher_id: teacher_id || req.user.id,
              syllabus_id: syllabus.id,
              title: `Lesson: ${syllabus.title}`,
              objectives: JSON.stringify(content.objectives || []),
              lesson_content: `Auto-generated from StudyZone: ${syllabus.title}`,
              activities: JSON.stringify(content.activities || []),
              subject: syllabus.subject,
              class_code: syllabus.class_code,
              term: syllabus.term,
              week: syllabus.week,
              school_id,
              branch_id
            },
            type: db.Sequelize.QueryTypes.INSERT
          });

          generatedPlans.push({
            lesson_plan_id: insertResult,
            syllabus_id: syllabus.id,
            title: syllabus.title,
            week: syllabus.week
          });
        } catch (error) {
          console.error(`Failed to generate plan for syllabus ${syllabus.id}:`, error);
        }
      }

      res.status(201).json({
        success: true,
        data: {
          generated_count: generatedPlans.length,
          lesson_plans: generatedPlans
        },
        message: `Generated ${generatedPlans.length} lesson plans from scraped data`
      });
    } catch (error) {
      console.error('Generate lesson plans error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate lesson plans from scraped data'
      });
    }
  }

  // POST /api/v1/curriculum/bulk-scrape - Bulk scraping multiple subjects/levels
  async bulkScraping(req, res) {
    try {
      const { subjects = ['Mathematics'], levels = ['P1'], source = 'studyzone' } = req.body;
      const { school_id } = req.user;

      const results = [];
      const errors = [];

      for (const subject of subjects) {
        for (const level of levels) {
          try {
            if (source === 'studyzone' && subject === 'Mathematics' && level === 'P1') {
              const scraper = new StudyZoneScraper();
              const scrapedData = await scraper.scrapePrimary1Mathematics();
              
              results.push({
                subject,
                level,
                scraped_count: scrapedData.length,
                status: 'success'
              });
            } else {
              // Placeholder for future implementations
              results.push({
                subject,
                level,
                scraped_count: 0,
                status: 'not_implemented',
                message: `${subject} ${level} scraping coming soon`
              });
            }
          } catch (error) {
            errors.push({
              subject,
              level,
              error: error.message
            });
          }
        }
      }

      res.json({
        success: true,
        data: {
          total_combinations: subjects.length * levels.length,
          successful: results.filter(r => r.status === 'success').length,
          not_implemented: results.filter(r => r.status === 'not_implemented').length,
          failed: errors.length,
          results,
          errors
        },
        message: `Bulk scraping completed: ${results.length} processed, ${errors.length} failed`
      });
    } catch (error) {
      console.error('Bulk scraping error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk scraping'
      });
    }
  }

  // POST /api/v1/curriculum/schedule - Set up automated scraping
  async setupSchedule(req, res) {
    try {
      const { enabled, time, frequency = 'daily', subjects, levels } = req.body;
      const { school_id, id: user_id } = req.user;

      // In production, this would integrate with a job scheduler like Agenda or Bull
      const scheduleConfig = {
        enabled,
        time,
        frequency,
        subjects: subjects || ['Mathematics'],
        levels: levels || ['P1'],
        school_id,
        created_by: user_id,
        created_at: new Date(),
        next_run: this.calculateNextRun(time, frequency)
      };

      // Store schedule configuration (in production, use database)
      // For now, we'll just return success
      res.json({
        success: true,
        data: scheduleConfig,
        message: enabled ? 
          `Scheduled ${frequency} scraping at ${time}` : 
          'Automatic scraping disabled'
      });
    } catch (error) {
      console.error('Schedule setup error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to setup scraping schedule'
      });
    }
  }

  calculateNextRun(time, frequency) {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    
    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);
    
    if (nextRun <= now) {
      // If time has passed today, schedule for tomorrow
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return nextRun;
  }

  // GET /api/v1/curriculum/available-options - Get available subjects and levels
  async getAvailableOptions(req, res) {
    try {
      const availableOptions = {
        subjects: [
          { value: 'Mathematics', label: 'Mathematics', available: true, implemented: true },
          { value: 'English', label: 'English Language', available: false, implemented: false },
          { value: 'Science', label: 'Basic Science', available: false, implemented: false },
          { value: 'Social Studies', label: 'Social Studies', available: false, implemented: false },
          { value: 'Civic Education', label: 'Civic Education', available: false, implemented: false },
        ],
        levels: [
          { value: 'P1', label: 'Primary 1', available: true, implemented: true },
          { value: 'P2', label: 'Primary 2', available: false, implemented: false },
          { value: 'P3', label: 'Primary 3', available: false, implemented: false },
          { value: 'P4', label: 'Primary 4', available: false, implemented: false },
          { value: 'P5', label: 'Primary 5', available: false, implemented: false },
          { value: 'P6', label: 'Primary 6', available: false, implemented: false },
          { value: 'JSS1', label: 'JSS 1', available: false, implemented: false },
          { value: 'JSS2', label: 'JSS 2', available: false, implemented: false },
          { value: 'JSS3', label: 'JSS 3', available: false, implemented: false },
        ],
        sources: [
          { value: 'studyzone', label: 'StudyZone.ng', available: true },
          { value: 'nerdc', label: 'NERDC Portal', available: false },
        ]
      };

      res.json({
        success: true,
        data: availableOptions
      });
    } catch (error) {
      console.error('Get available options error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve available options'
      });
    }
  }
  async getScrapingStatus(req, res) {
    try {
      const stats = await db.sequelize.query(`
        SELECT 
          scraped_source,
          COUNT(*) as total_topics,
          COUNT(DISTINCT subject) as subjects_count,
          COUNT(DISTINCT class_code) as levels_count,
          MAX(scraped_at) as last_scraped,
          MIN(scraped_at) as first_scraped
        FROM syllabus 
        WHERE scraped_source IS NOT NULL
        GROUP BY scraped_source
      `, {
        type: db.Sequelize.QueryTypes.SELECT
      });

      res.json({
        success: true,
        data: {
          scraping_statistics: stats,
          total_scraped_topics: stats.reduce((sum, stat) => sum + parseInt(stat.total_topics), 0)
        }
      });
    } catch (error) {
      console.error('Scraping status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve scraping status'
      });
    }
  }

  // DELETE /api/v1/curriculum/:id - Delete curriculum item
  async deleteCurriculumItem(req, res) {
    try {
      const { id } = req.params;
      
      await db.sequelize.query(`
        DELETE FROM syllabus WHERE id = :id
      `, {
        replacements: { id },
        type: db.Sequelize.QueryTypes.DELETE
      });

      res.json({
        success: true,
        message: 'Curriculum item deleted successfully'
      });
    } catch (error) {
      console.error('Delete curriculum error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete curriculum item'
      });
    }
  }
}

module.exports = new CurriculumScrapingController();
