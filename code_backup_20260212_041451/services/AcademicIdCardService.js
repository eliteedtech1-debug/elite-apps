const db = require('../models');
const { IdCardTemplate, IdCardGeneration, Student, Class, SchoolSetup } = db;

class AcademicIdCardService {
  /**
   * Auto-generate ID cards on student enrollment
   */
  static async handleEnrollmentTrigger(studentData, transaction = null) {
    try {
      const { admission_no, school_id, branch_id, current_class, section, academic_year } = studentData;

      // Find active auto-generate templates
      const templates = await IdCardTemplate.findAll({
        where: {
          school_id,
          branch_id,
          template_type: 'student',
          auto_generate: true,
          is_active: true
        },
        transaction
      });

      if (templates.length === 0) {
        console.log(`No auto-generate templates found for school ${school_id}`);
        return { success: true, message: 'No auto-generate templates configured' };
      }

      const generations = [];
      for (const template of templates) {
        // Check if template applies to this class/section
        if (this.templateAppliesTo(template, current_class, section)) {
          const generation = await this.createIdCardGeneration({
            school_id,
            branch_id,
            template_id: template.id,
            student_id: admission_no,
            academic_year: academic_year || new Date().getFullYear().toString(),
            class_code: current_class,
            section,
            enrollment_trigger: true
          }, transaction);
          
          generations.push(generation);
        }
      }

      return {
        success: true,
        message: `Generated ${generations.length} ID cards for enrollment`,
        generations
      };
    } catch (error) {
      console.error('Error in enrollment trigger:', error);
      throw error;
    }
  }

  /**
   * Batch process ID cards for new admissions
   */
  static async batchProcessNewAdmissions(filters = {}, options = {}) {
    try {
      const {
        school_id,
        branch_id,
        academic_year,
        class_codes = [],
        sections = [],
        student_type = 'Fresh'
      } = filters;

      const { template_id, batch_size = 50 } = options;

      // Build student query
      const whereClause = {
        school_id,
        branch_id,
        status: 'Active'
      };

      if (academic_year) whereClause.academic_year = academic_year;
      if (student_type) whereClause.student_type = student_type;
      if (class_codes.length > 0) whereClause.current_class = { [db.Sequelize.Op.in]: class_codes };
      if (sections.length > 0) whereClause.section = { [db.Sequelize.Op.in]: sections };

      // Get students in batches
      const students = await Student.findAll({
        where: whereClause,
        limit: batch_size,
        order: [['created_at', 'DESC']]
      });

      if (students.length === 0) {
        return { success: true, message: 'No students found for batch processing' };
      }

      // Get template
      const template = await IdCardTemplate.findOne({
        where: {
          id: template_id,
          school_id,
          branch_id,
          is_active: true
        }
      });

      if (!template) {
        throw new Error('Template not found or inactive');
      }

      // Generate batch ID
      const batchId = `BATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create generations
      const generations = await Promise.all(
        students.map(student => this.createIdCardGeneration({
          school_id,
          branch_id,
          template_id: template.id,
          student_id: student.admission_no,
          academic_year: student.academic_year || academic_year,
          class_code: student.current_class,
          section: student.section,
          batch_id: batchId,
          enrollment_trigger: false
        }))
      );

      return {
        success: true,
        message: `Batch processing initiated for ${generations.length} students`,
        batch_id: batchId,
        generations: generations.length
      };
    } catch (error) {
      console.error('Error in batch processing:', error);
      throw error;
    }
  }

  /**
   * Get class and section data for card generation
   */
  static async getClassSectionData(school_id, branch_id, class_code) {
    try {
      const classData = await Class.findOne({
        where: {
          school_id,
          branch_id,
          class_code,
          status: 'Active'
        }
      });

      return classData ? {
        class_name: classData.class_name,
        class_code: classData.class_code,
        section: classData.section,
        stream: classData.stream,
        level: classData.level
      } : null;
    } catch (error) {
      console.error('Error getting class data:', error);
      return null;
    }
  }

  /**
   * Manage academic year validity for ID cards
   */
  static async manageAcademicYearValidity(school_id, branch_id, new_academic_year) {
    try {
      // Mark previous year cards as expired
      await IdCardGeneration.update(
        { status: 'expired' },
        {
          where: {
            school_id,
            branch_id,
            academic_year: { [db.Sequelize.Op.ne]: new_academic_year },
            status: { [db.Sequelize.Op.in]: ['completed', 'pending', 'processing'] }
          }
        }
      );

      // Update school setup with new academic year
      await SchoolSetup.update(
        { academic_year: new_academic_year },
        { where: { school_id } }
      );

      return {
        success: true,
        message: `Academic year updated to ${new_academic_year}, previous cards marked as expired`
      };
    } catch (error) {
      console.error('Error managing academic year validity:', error);
      throw error;
    }
  }

  /**
   * Get student enrollment data for ID card
   */
  static async getStudentEnrollmentData(admission_no, school_id, branch_id) {
    try {
      const student = await Student.findOne({
        where: {
          admission_no,
          school_id,
          branch_id,
          status: 'Active'
        }
      });

      if (!student) {
        throw new Error('Student not found or inactive');
      }

      // Get class data
      const classData = await this.getClassSectionData(
        school_id, 
        branch_id, 
        student.current_class
      );

      // Get school data
      const school = await SchoolSetup.findOne({
        where: { school_id }
      });

      return {
        student: {
          admission_no: student.admission_no,
          student_name: `${student.surname} ${student.first_name} ${student.other_names || ''}`.trim(),
          surname: student.surname,
          first_name: student.first_name,
          other_names: student.other_names,
          date_of_birth: student.date_of_birth,
          sex: student.sex,
          profile_picture: student.profile_picture,
          admission_date: student.admission_date,
          academic_year: student.academic_year,
          student_type: student.student_type,
          blood_group: student.blood_group,
          home_address: student.home_address
        },
        class: classData,
        school: school ? {
          school_name: school.school_name,
          school_second_name: school.school_second_name,
          short_name: school.short_name,
          school_motto: school.school_motto,
          address: school.address,
          primary_contact_number: school.primary_contact_number,
          email_address: school.email_address,
          badge_url: school.badge_url
        } : null
      };
    } catch (error) {
      console.error('Error getting student enrollment data:', error);
      throw error;
    }
  }

  /**
   * Create ID card generation record
   */
  static async createIdCardGeneration(data, transaction = null) {
    try {
      // Calculate expiry date
      const template = await IdCardTemplate.findByPk(data.template_id, { transaction });
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (template?.validity_period || 365));

      // Get student data for card
      const enrollmentData = await this.getStudentEnrollmentData(
        data.student_id,
        data.school_id,
        data.branch_id
      );

      const generation = await IdCardGeneration.create({
        ...data,
        card_data: enrollmentData,
        expiry_date: expiryDate,
        qr_code_data: JSON.stringify({
          admission_no: data.student_id,
          school_id: data.school_id,
          academic_year: data.academic_year,
          generated_at: new Date().toISOString()
        }),
        barcode_data: data.student_id
      }, { transaction });

      return generation;
    } catch (error) {
      console.error('Error creating ID card generation:', error);
      throw error;
    }
  }

  /**
   * Check if template applies to class/section
   */
  static templateAppliesTo(template, class_code, section) {
    const { class_filter, section_filter } = template;

    // Check class filter
    if (class_filter && Array.isArray(class_filter) && class_filter.length > 0) {
      if (!class_filter.includes(class_code)) {
        return false;
      }
    }

    // Check section filter
    if (section_filter && Array.isArray(section_filter) && section_filter.length > 0) {
      if (!section_filter.includes(section)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get ID card generation statistics
   */
  static async getGenerationStats(school_id, branch_id, academic_year) {
    try {
      const stats = await IdCardGeneration.findAll({
        where: {
          school_id,
          branch_id,
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
        where: { school_id, branch_id, academic_year }
      });

      return {
        total,
        by_status: stats.reduce((acc, stat) => {
          acc[stat.status] = parseInt(stat.count);
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Error getting generation stats:', error);
      throw error;
    }
  }
}

module.exports = AcademicIdCardService;