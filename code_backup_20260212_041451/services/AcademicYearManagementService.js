const db = require('../models');
const AcademicIdCardService = require('./AcademicIdCardService');

class AcademicYearManagementService {
  /**
   * Handle academic year transition for ID cards
   */
  static async transitionAcademicYear(school_id, branch_id, new_academic_year, options = {}) {
    const transaction = options.transaction || await db.sequelize.transaction();
    
    try {
      // Get current academic year from school setup
      const school = await db.SchoolSetup.findOne({
        where: { school_id },
        transaction
      });

      const current_academic_year = school?.academic_year;

      if (current_academic_year === new_academic_year) {
        return {
          success: true,
          message: 'Academic year is already current',
          current_year: current_academic_year
        };
      }

      // Mark previous year cards as expired
      const expiredCount = await db.IdCardGeneration.update(
        { status: 'expired' },
        {
          where: {
            school_id,
            branch_id,
            academic_year: current_academic_year,
            status: { [db.Sequelize.Op.in]: ['completed', 'pending', 'processing'] }
          },
          transaction
        }
      );

      // Update school setup
      await db.SchoolSetup.update(
        { academic_year: new_academic_year },
        { 
          where: { school_id },
          transaction
        }
      );

      // Auto-generate cards for new academic year if templates are configured
      const autoTemplates = await db.IdCardTemplate.findAll({
        where: {
          school_id,
          branch_id,
          auto_generate: true,
          is_active: true
        },
        transaction
      });

      let newGenerations = 0;
      if (autoTemplates.length > 0) {
        // Get active students
        const activeStudents = await db.Student.findAll({
          where: {
            school_id,
            branch_id,
            status: 'Active'
          },
          transaction
        });

        for (const template of autoTemplates) {
          for (const student of activeStudents) {
            if (AcademicIdCardService.templateAppliesTo(template, student.current_class, student.section)) {
              await AcademicIdCardService.createIdCardGeneration({
                school_id,
                branch_id,
                template_id: template.id,
                student_id: student.admission_no,
                academic_year: new_academic_year,
                class_code: student.current_class,
                section: student.section,
                enrollment_trigger: false
              }, transaction);
              newGenerations++;
            }
          }
        }
      }

      if (!options.transaction) {
        await transaction.commit();
      }

      return {
        success: true,
        message: `Academic year transitioned from ${current_academic_year} to ${new_academic_year}`,
        previous_year: current_academic_year,
        new_year: new_academic_year,
        expired_cards: expiredCount[0] || 0,
        new_generations: newGenerations
      };
    } catch (error) {
      if (!options.transaction) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  /**
   * Get academic year statistics
   */
  static async getAcademicYearStats(school_id, branch_id) {
    try {
      // Get all academic years with ID card data
      const yearStats = await db.IdCardGeneration.findAll({
        where: { school_id, branch_id },
        attributes: [
          'academic_year',
          'status',
          [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
        ],
        group: ['academic_year', 'status'],
        order: [['academic_year', 'DESC']],
        raw: true
      });

      // Get current academic year
      const school = await db.SchoolSetup.findOne({
        where: { school_id },
        attributes: ['academic_year']
      });

      // Process stats by year
      const statsByYear = yearStats.reduce((acc, stat) => {
        const year = stat.academic_year;
        if (!acc[year]) {
          acc[year] = { total: 0, by_status: {} };
        }
        acc[year].by_status[stat.status] = parseInt(stat.count);
        acc[year].total += parseInt(stat.count);
        return acc;
      }, {});

      return {
        current_academic_year: school?.academic_year,
        years: Object.keys(statsByYear).sort().reverse(),
        statistics: statsByYear
      };
    } catch (error) {
      console.error('Error getting academic year stats:', error);
      throw error;
    }
  }

  /**
   * Validate academic year format
   */
  static validateAcademicYear(academic_year) {
    // Expected format: "2024-2025" or "2024"
    const yearPattern = /^(\d{4})(-\d{4})?$/;
    return yearPattern.test(academic_year);
  }

  /**
   * Generate next academic year
   */
  static generateNextAcademicYear(current_year) {
    if (!current_year) {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      return `${year}-${year + 1}`;
    }

    // Handle different formats
    if (current_year.includes('-')) {
      const [startYear] = current_year.split('-');
      const nextStart = parseInt(startYear) + 1;
      return `${nextStart}-${nextStart + 1}`;
    } else {
      const nextYear = parseInt(current_year) + 1;
      return `${nextYear}-${nextYear + 1}`;
    }
  }

  /**
   * Cleanup expired cards
   */
  static async cleanupExpiredCards(school_id, branch_id, retention_days = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retention_days);

      const deletedCount = await db.IdCardGeneration.destroy({
        where: {
          school_id,
          branch_id,
          status: 'expired',
          updated_at: { [db.Sequelize.Op.lt]: cutoffDate }
        }
      });

      return {
        success: true,
        message: `Cleaned up ${deletedCount} expired ID card records`,
        deleted_count: deletedCount
      };
    } catch (error) {
      console.error('Error cleaning up expired cards:', error);
      throw error;
    }
  }

  /**
   * Bulk update academic year for students
   */
  static async bulkUpdateStudentAcademicYear(school_id, branch_id, new_academic_year, class_filters = []) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const whereClause = {
        school_id,
        branch_id,
        status: 'Active'
      };

      if (class_filters.length > 0) {
        whereClause.current_class = { [db.Sequelize.Op.in]: class_filters };
      }

      const [updatedCount] = await db.Student.update(
        { academic_year: new_academic_year },
        {
          where: whereClause,
          transaction
        }
      );

      await transaction.commit();

      return {
        success: true,
        message: `Updated academic year for ${updatedCount} students`,
        updated_count: updatedCount
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = AcademicYearManagementService;