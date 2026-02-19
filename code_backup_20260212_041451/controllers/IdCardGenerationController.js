const db = require('../models');
const AcademicIdCardService = require('../services/AcademicIdCardService');
const { IdCardGeneration, IdCardTemplate, Student, Class } = db;
const { QueryTypes } = require('sequelize');
const IdCardService = require('../services/IdCardService');
const { v4: uuidv4 } = require('uuid');

class IdCardGenerationController {
  /**
   * Generate ID cards for enrolled students
   */
  static async generateForEnrolledStudents(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const {
        template_id,
        academic_year,
        class_codes = [],
        sections = [],
        student_type = 'Fresh',
        batch_size = 50
      } = req.body;

      const result = await AcademicIdCardService.batchProcessNewAdmissions(
        {
          school_id,
          branch_id,
          academic_year,
          class_codes,
          sections,
          student_type
        },
        {
          template_id,
          batch_size
        }
      );

      res.json({
        success: true,
        message: result.message,
        data: {
          batch_id: result.batch_id,
          generations_count: result.generations
        }
      });
    } catch (error) {
      console.error('Error generating ID cards for enrolled students:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate ID cards',
        error: error.message
      });
    }
  }

  /**
   * Generate ID card for single student
   */
  static async generateForStudent(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { student_id, template_id, academic_year } = req.body;

      // Get student data
      const student = await Student.findOne({
        where: {
          admission_no: student_id,
          school_id,
          branch_id,
          status: 'Active'
        }
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found or inactive'
        });
      }

      // Create generation record
      const generation = await AcademicIdCardService.createIdCardGeneration({
        school_id,
        branch_id,
        template_id,
        student_id,
        academic_year: academic_year || student.academic_year,
        class_code: student.current_class,
        section: student.section,
        enrollment_trigger: false
      });

      res.json({
        success: true,
        message: 'ID card generation initiated',
        data: {
          generation_id: generation.id,
          student_name: `${student.surname} ${student.first_name}`,
          status: generation.status
        }
      });
    } catch (error) {
      console.error('Error generating ID card for student:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate ID card',
        error: error.message
      });
    }
  }

  /**
   * Legacy single card generation (backward compatibility)
   */
  static async generateSingleCard(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { template_id, student_id } = req.body;

      if (!template_id || !student_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Template ID and Student ID are required' 
        });
      }

      const template = await db.IdCardTemplate.findOne({
        where: { id: template_id, school_id, branch_id, is_active: true }
      });
      if (!template) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      const student = await db.sequelize.query(`
        SELECT s.*, c.class_name, c.class_code 
        FROM students s 
        LEFT JOIN classes c ON s.class_code = c.class_code 
        WHERE s.admission_no = :student_id AND s.school_id = :school_id AND s.branch_id = :branch_id
      `, {
        replacements: { student_id, school_id, branch_id },
        type: QueryTypes.SELECT
      });

      if (!student.length) {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }

      const cardGeneration = await db.IdCardGeneration.create({
        school_id,
        branch_id,
        template_id,
        student_id,
        academic_year: student[0].academic_year,
        class_code: student[0].class_code,
        section: student[0].section,
        card_data: student[0],
        status: 'processing',
        generated_by: req.user.id
      });

      const result = await IdCardService.generateCardData(cardGeneration, template);

      // Create financial tracking entry
      if (result) {
        try {
          const IdCardFinancialService = require('../services/IdCardFinancialService');
          const costData = await IdCardFinancialService.calculateCardCost(
            school_id, 
            branch_id, 
            template_id, 
            1
          );
          
          await IdCardFinancialService.createFinancialEntry(
            cardGeneration.id,
            costData,
            req.user.id
          );
        } catch (financialError) {
          console.error('Financial tracking error:', financialError);
          // Don't fail the card generation if financial tracking fails
        }
      }
      
      await cardGeneration.update({
        qr_code_data: result.qrCode,
        barcode_data: result.barcode,
        status: 'ready_for_pdf'
      });

      res.json({ 
        success: true, 
        message: 'ID card data generated successfully',
        data: {
          generation: cardGeneration,
          cardData: result.cardData,
          qrCode: result.qrCode,
          barcode: result.barcode,
          template: result.template
        }
      });
    } catch (error) {
      console.error('Generate single card error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Legacy batch card generation (backward compatibility)
   */
  static async generateBatchCards(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { template_id, student_ids, class_id } = req.body;
      const batch_id = uuidv4();

      if (!template_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Template ID is required' 
        });
      }

      if (!student_ids && !class_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Either student_ids or class_id is required' 
        });
      }

      const template = await db.IdCardTemplate.findOne({
        where: { id: template_id, school_id, branch_id, is_active: true }
      });
      if (!template) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      let students;
      if (class_id) {
        students = await db.sequelize.query(`
          SELECT s.*, c.class_name, c.class_code 
          FROM students s 
          LEFT JOIN classes c ON s.class_code = c.class_code 
          WHERE c.id = :class_id AND s.school_id = :school_id AND s.branch_id = :branch_id
        `, {
          replacements: { class_id, school_id, branch_id },
          type: QueryTypes.SELECT
        });
      } else {
        const studentIdList = Array.isArray(student_ids) ? student_ids : [student_ids];
        students = await db.sequelize.query(`
          SELECT s.*, c.class_name, c.class_code 
          FROM students s 
          LEFT JOIN classes c ON s.class_code = c.class_code 
          WHERE s.admission_no IN (:student_ids) AND s.school_id = :school_id AND s.branch_id = :branch_id
        `, {
          replacements: { student_ids: studentIdList, school_id, branch_id },
          type: QueryTypes.SELECT
        });
      }

      if (!students.length) {
        return res.status(404).json({ success: false, error: 'No students found' });
      }

      const generations = await Promise.all(
        students.map(student => 
          db.IdCardGeneration.create({
            school_id,
            branch_id,
            template_id,
            student_id: student.admission_no,
            academic_year: student.academic_year,
            class_code: student.class_code,
            section: student.section,
            batch_id,
            card_data: student,
            status: 'pending',
            generated_by: req.user.id
          })
        )
      );

      // Process batch asynchronously
      IdCardService.processBatch(batch_id, template).catch(error => {
        console.error('Batch processing error:', error);
      });

      res.json({ 
        success: true, 
        message: 'Batch generation started',
        data: { batch_id, count: generations.length }
      });
    } catch (error) {
      console.error('Generate batch cards error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get class-wise ID card generation status
   */
  static async getClassWiseStatus(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { academic_year } = req.query;

      // Get all classes
      const classes = await Class.findAll({
        where: {
          school_id,
          branch_id,
          status: 'Active'
        },
        attributes: ['class_code', 'class_name', 'section']
      });

      // Get generation stats by class
      const classStats = await Promise.all(
        classes.map(async (classItem) => {
          const stats = await IdCardGeneration.findAll({
            where: {
              school_id,
              branch_id,
              class_code: classItem.class_code,
              academic_year
            },
            attributes: [
              'status',
              [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
            ],
            group: ['status'],
            raw: true
          });

          const total = await IdCardGeneration.count({
            where: {
              school_id,
              branch_id,
              class_code: classItem.class_code,
              academic_year
            }
          });

          return {
            class_code: classItem.class_code,
            class_name: classItem.class_name,
            section: classItem.section,
            total_cards: total,
            status_breakdown: stats.reduce((acc, stat) => {
              acc[stat.status] = parseInt(stat.count);
              return acc;
            }, {})
          };
        })
      );

      res.json({
        success: true,
        data: {
          academic_year,
          classes: classStats
        }
      });
    } catch (error) {
      console.error('Error getting class-wise status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get class-wise status',
        error: error.message
      });
    }
  }

  /**
   * Manage academic year transition
   */
  static async manageAcademicYearTransition(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { new_academic_year } = req.body;

      const result = await AcademicIdCardService.manageAcademicYearValidity(
        school_id,
        branch_id,
        new_academic_year
      );

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Error managing academic year transition:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to manage academic year transition',
        error: error.message
      });
    }
  }

  /**
   * Get student enrollment data for ID card preview
   */
  static async getStudentEnrollmentData(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { student_id } = req.params;

      const enrollmentData = await AcademicIdCardService.getStudentEnrollmentData(
        student_id,
        school_id,
        branch_id
      );

      res.json({
        success: true,
        data: enrollmentData
      });
    } catch (error) {
      console.error('Error getting student enrollment data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get student data',
        error: error.message
      });
    }
  }

  /**
   * Get generation statistics
   */
  static async getGenerationStats(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { academic_year } = req.query;

      const stats = await AcademicIdCardService.getGenerationStats(
        school_id,
        branch_id,
        academic_year
      );

      res.json({
        success: true,
        data: {
          academic_year,
          ...stats
        }
      });
    } catch (error) {
      console.error('Error getting generation stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get generation statistics',
        error: error.message
      });
    }
  }

  /**
   * Get batch processing status
   */
  static async getBatchStatus(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { batch_id } = req.params;

      const batchGenerations = await IdCardGeneration.findAll({
        where: {
          school_id,
          branch_id,
          batch_id
        },
        include: [
          {
            model: Student,
            as: 'student',
            attributes: ['admission_no', 'surname', 'first_name', 'current_class']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      if (batchGenerations.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Batch not found'
        });
      }

      const statusSummary = batchGenerations.reduce((acc, gen) => {
        acc[gen.status] = (acc[gen.status] || 0) + 1;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          batch_id,
          total_cards: batchGenerations.length,
          status_summary: statusSummary,
          generations: batchGenerations.map(gen => ({
            id: gen.id,
            student_id: gen.student_id,
            student_name: gen.student ? `${gen.student.surname} ${gen.student.first_name}` : 'Unknown',
            class_code: gen.class_code,
            status: gen.status,
            created_at: gen.created_at,
            pdf_url: gen.pdf_url
          }))
        }
      });
    } catch (error) {
      console.error('Error getting batch status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get batch status',
        error: error.message
      });
    }
  }

  /**
   * Download card (legacy compatibility)
   */
  static async downloadCard(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { id } = req.params;

      const generation = await db.IdCardGeneration.findOne({
        where: { id, school_id, branch_id }
      });

      if (!generation || !generation.pdf_url) {
        return res.status(404).json({ success: false, error: 'Card not found or not ready' });
      }

      res.redirect(generation.pdf_url);
    } catch (error) {
      console.error('Download card error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get student cards (legacy compatibility)
   */
  static async getStudentCards(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { student_id } = req.params;

      const cards = await db.sequelize.query(`
        SELECT g.*, t.template_name, t.template_type
        FROM id_card_generations g
        LEFT JOIN id_card_templates t ON g.template_id = t.id
        WHERE g.student_id = :student_id AND g.school_id = :school_id AND g.branch_id = :branch_id
        ORDER BY g.created_at DESC
      `, {
        replacements: { student_id, school_id, branch_id },
        type: QueryTypes.SELECT
      });

      res.json({ 
        success: true, 
        data: cards,
        count: cards.length 
      });
    } catch (error) {
      console.error('Get student cards error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = IdCardGenerationController;