const AcademicIdCardService = require('../services/AcademicIdCardService');

/**
 * Student Enrollment Hooks for ID Card Integration
 */
class StudentEnrollmentHooks {
  /**
   * Hook to trigger ID card generation on student enrollment
   */
  static async afterStudentCreate(student, options) {
    try {
      console.log(`🎓 Student enrollment detected: ${student.admission_no}`);
      
      // Trigger automatic ID card generation
      const result = await AcademicIdCardService.handleEnrollmentTrigger(
        {
          admission_no: student.admission_no,
          school_id: student.school_id,
          branch_id: student.branch_id,
          current_class: student.current_class,
          section: student.section,
          academic_year: student.academic_year
        },
        options.transaction
      );

      if (result.success && result.generations?.length > 0) {
        console.log(`✅ Auto-generated ${result.generations.length} ID cards for student ${student.admission_no}`);
      }
    } catch (error) {
      console.error('❌ Error in student enrollment hook:', error);
      // Don't fail the enrollment if ID card generation fails
    }
  }

  /**
   * Hook to handle class/section changes
   */
  static async afterStudentUpdate(student, options) {
    try {
      const changed = student.changed();
      
      // Check if class or section changed
      if (changed.includes('current_class') || changed.includes('section')) {
        console.log(`📚 Class/section change detected for student: ${student.admission_no}`);
        
        // Mark old cards as expired if class changed
        if (changed.includes('current_class')) {
          const { IdCardGeneration } = require('../models');
          
          await IdCardGeneration.update(
            { status: 'expired' },
            {
              where: {
                student_id: student.admission_no,
                school_id: student.school_id,
                branch_id: student.branch_id,
                class_code: student._previousDataValues.current_class,
                status: { [require('sequelize').Op.in]: ['completed', 'pending', 'processing'] }
              },
              transaction: options.transaction
            }
          );

          // Trigger new card generation for new class
          await AcademicIdCardService.handleEnrollmentTrigger(
            {
              admission_no: student.admission_no,
              school_id: student.school_id,
              branch_id: student.branch_id,
              current_class: student.current_class,
              section: student.section,
              academic_year: student.academic_year
            },
            options.transaction
          );
        }
      }
    } catch (error) {
      console.error('❌ Error in student update hook:', error);
    }
  }

  /**
   * Hook to handle student status changes
   */
  static async afterStudentStatusChange(student, options) {
    try {
      if (student.changed('status') && student.status === 'Inactive') {
        console.log(`🚫 Student deactivated: ${student.admission_no}`);
        
        // Mark all active cards as expired
        const { IdCardGeneration } = require('../models');
        
        await IdCardGeneration.update(
          { status: 'expired' },
          {
            where: {
              student_id: student.admission_no,
              school_id: student.school_id,
              branch_id: student.branch_id,
              status: { [require('sequelize').Op.in]: ['completed', 'pending', 'processing'] }
            },
            transaction: options.transaction
          }
        );
      }
    } catch (error) {
      console.error('❌ Error in student status change hook:', error);
    }
  }
}

module.exports = StudentEnrollmentHooks;