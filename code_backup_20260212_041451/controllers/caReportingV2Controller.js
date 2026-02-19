const db = require("../models");
const { Op } = require("sequelize");

/**
 * Get CA Report Data V2 - No academic year/term dependency
 * Uses active CA setups only
 */
const getCAReportV2 = async (req, res) => {
  try {
    const { school_id, branch_id } = req.user;
    const { 
      class_id, 
      subject_id, 
      ca_type,
      week_number,
      student_id 
    } = req.query;

    if (!school_id || !branch_id) {
      return res.status(400).json({
        success: false,
        message: "School ID and Branch ID are required.",
      });
    }

    // Get active CA setup for the specified type
    const caSetup = await db.CASetupV2.findOne({
      where: {
        ca_type,
        school_id,
        branch_id,
        is_active: true,
      },
      include: [
        {
          model: db.CAWeekV2,
          as: 'weeks',
          where: { is_active: true },
          required: false,
          order: [['week_number', 'ASC']]
        },
        {
          model: db.GradeBoundaryV2,
          as: 'gradeBoundaries',
          where: { is_active: true },
          required: false,
          order: [['min_percentage', 'DESC']]
        }
      ]
    });

    if (!caSetup) {
      return res.status(404).json({
        success: false,
        message: `No active CA setup found for ${ca_type}`,
      });
    }

    // Build query for CA scores
    const whereClause = {
      school_id,
      branch_id,
      ca_type,
    };

    if (class_id) whereClause.class_id = class_id;
    if (subject_id) whereClause.subject_id = subject_id;
    if (week_number) whereClause.week_number = week_number;
    if (student_id) whereClause.student_id = student_id;

    // Get CA scores (assuming you have a ca_scores table)
    const caScores = await db.CAScore.findAll({
      where: whereClause,
      include: [
        {
          model: db.Student,
          as: 'student',
          attributes: ['id', 'admission_no', 'first_name', 'last_name', 'class_id']
        },
        {
          model: db.Subject,
          as: 'subject',
          attributes: ['id', 'subject_name', 'subject_code']
        }
      ],
      order: [
        ['student_id', 'ASC'],
        ['week_number', 'ASC']
      ]
    });

    // Calculate grades based on active grade boundaries
    const scoresWithGrades = caScores.map(score => {
      const percentage = caSetup.weeks.length > 0 
        ? (score.score / caSetup.weeks.find(w => w.week_number === score.week_number)?.max_score) * 100
        : 0;

      const grade = caSetup.gradeBoundaries.find(gb => 
        percentage >= gb.min_percentage && percentage <= gb.max_percentage
      );

      return {
        ...score.toJSON(),
        percentage: percentage.toFixed(2),
        grade: grade?.grade || 'N/A',
        remark: grade?.remark || '',
        max_score: caSetup.weeks.find(w => w.week_number === score.week_number)?.max_score || 0
      };
    });

    res.json({
      success: true,
      data: {
        caSetup: {
          id: caSetup.id,
          ca_type: caSetup.ca_type,
          setup_name: caSetup.setup_name,
          description: caSetup.description,
          overall_contribution_percent: caSetup.overall_contribution_percent,
          weeks: caSetup.weeks,
          gradeBoundaries: caSetup.gradeBoundaries
        },
        scores: scoresWithGrades,
        summary: {
          total_students: [...new Set(scoresWithGrades.map(s => s.student_id))].length,
          total_scores: scoresWithGrades.length,
          weeks_configured: caSetup.weeks.length,
          grade_boundaries: caSetup.gradeBoundaries.length
        }
      },
      message: "CA Report V2 data retrieved successfully",
    });

  } catch (error) {
    console.error("Error in getCAReportV2:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while generating CA report.",
      error: error.message,
    });
  }
};

/**
 * Get Class CA Summary V2 - Aggregated data per class
 */
const getClassCASummaryV2 = async (req, res) => {
  try {
    const { school_id, branch_id } = req.user;
    const { class_id, ca_type } = req.query;

    if (!school_id || !branch_id || !class_id || !ca_type) {
      return res.status(400).json({
        success: false,
        message: "School ID, Branch ID, Class ID, and CA Type are required.",
      });
    }

    // Get active CA setup
    const caSetup = await db.CASetupV2.findOne({
      where: {
        ca_type,
        school_id,
        branch_id,
        is_active: true,
      },
      include: [
        {
          model: db.CAWeekV2,
          as: 'weeks',
          where: { is_active: true },
          required: false,
          order: [['week_number', 'ASC']]
        },
        {
          model: db.GradeBoundaryV2,
          as: 'gradeBoundaries',
          where: { is_active: true },
          required: false,
          order: [['min_percentage', 'DESC']]
        }
      ]
    });

    if (!caSetup) {
      return res.status(404).json({
        success: false,
        message: `No active CA setup found for ${ca_type}`,
      });
    }

    // Get all students in the class
    const students = await db.Student.findAll({
      where: {
        class_id,
        school_id,
        branch_id,
        is_active: true
      },
      attributes: ['id', 'admission_no', 'first_name', 'last_name']
    });

    // Get CA scores for all students in the class
    const caScores = await db.CAScore.findAll({
      where: {
        school_id,
        branch_id,
        ca_type,
        class_id,
        student_id: { [Op.in]: students.map(s => s.id) }
      },
      include: [
        {
          model: db.Subject,
          as: 'subject',
          attributes: ['id', 'subject_name', 'subject_code']
        }
      ]
    });

    // Calculate summary statistics
    const summary = students.map(student => {
      const studentScores = caScores.filter(score => score.student_id === student.id);
      
      const totalPossibleScore = caSetup.weeks.reduce((sum, week) => sum + week.max_score, 0);
      const totalActualScore = studentScores.reduce((sum, score) => sum + score.score, 0);
      const overallPercentage = totalPossibleScore > 0 ? (totalActualScore / totalPossibleScore) * 100 : 0;
      
      const overallGrade = caSetup.gradeBoundaries.find(gb => 
        overallPercentage >= gb.min_percentage && overallPercentage <= gb.max_percentage
      );

      return {
        student: {
          id: student.id,
          admission_no: student.admission_no,
          name: `${student.first_name} ${student.last_name}`,
        },
        scores: studentScores.map(score => ({
          subject_id: score.subject_id,
          subject_name: score.subject?.subject_name,
          week_number: score.week_number,
          score: score.score,
          max_score: caSetup.weeks.find(w => w.week_number === score.week_number)?.max_score || 0,
          percentage: caSetup.weeks.find(w => w.week_number === score.week_number)?.max_score > 0 
            ? ((score.score / caSetup.weeks.find(w => w.week_number === score.week_number).max_score) * 100).toFixed(2)
            : '0.00'
        })),
        summary: {
          total_score: totalActualScore,
          total_possible: totalPossibleScore,
          overall_percentage: overallPercentage.toFixed(2),
          overall_grade: overallGrade?.grade || 'N/A',
          overall_remark: overallGrade?.remark || ''
        }
      };
    });

    res.json({
      success: true,
      data: {
        caSetup: {
          id: caSetup.id,
          ca_type: caSetup.ca_type,
          setup_name: caSetup.setup_name,
          overall_contribution_percent: caSetup.overall_contribution_percent,
          weeks: caSetup.weeks,
          gradeBoundaries: caSetup.gradeBoundaries
        },
        class_summary: summary,
        statistics: {
          total_students: students.length,
          students_with_scores: summary.filter(s => s.scores.length > 0).length,
          average_percentage: summary.length > 0 
            ? (summary.reduce((sum, s) => sum + parseFloat(s.summary.overall_percentage), 0) / summary.length).toFixed(2)
            : '0.00',
          grade_distribution: caSetup.gradeBoundaries.map(gb => ({
            grade: gb.grade,
            count: summary.filter(s => s.summary.overall_grade === gb.grade).length
          }))
        }
      },
      message: "Class CA Summary V2 retrieved successfully",
    });

  } catch (error) {
    console.error("Error in getClassCASummaryV2:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while generating class CA summary.",
      error: error.message,
    });
  }
};

/**
 * Get Student CA Progress V2 - Individual student progress across all CA types
 */
const getStudentCAProgressV2 = async (req, res) => {
  try {
    const { school_id, branch_id } = req.user;
    const { student_id } = req.params;

    if (!school_id || !branch_id || !student_id) {
      return res.status(400).json({
        success: false,
        message: "School ID, Branch ID, and Student ID are required.",
      });
    }

    // Get student details
    const student = await db.Student.findOne({
      where: {
        id: student_id,
        school_id,
        branch_id,
        is_active: true
      },
      attributes: ['id', 'admission_no', 'first_name', 'last_name', 'class_id']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Get all active CA setups
    const caSetups = await db.CASetupV2.findAll({
      where: {
        school_id,
        branch_id,
        is_active: true,
      },
      include: [
        {
          model: db.CAWeekV2,
          as: 'weeks',
          where: { is_active: true },
          required: false,
          order: [['week_number', 'ASC']]
        },
        {
          model: db.GradeBoundaryV2,
          as: 'gradeBoundaries',
          where: { is_active: true },
          required: false,
          order: [['min_percentage', 'DESC']]
        }
      ],
      order: [['ca_type', 'ASC']]
    });

    // Get all CA scores for the student
    const caScores = await db.CAScore.findAll({
      where: {
        student_id,
        school_id,
        branch_id,
      },
      include: [
        {
          model: db.Subject,
          as: 'subject',
          attributes: ['id', 'subject_name', 'subject_code']
        }
      ],
      order: [['ca_type', 'ASC'], ['subject_id', 'ASC'], ['week_number', 'ASC']]
    });

    // Process progress for each CA type
    const progress = caSetups.map(setup => {
      const setupScores = caScores.filter(score => score.ca_type === setup.ca_type);
      
      const subjectProgress = [...new Set(setupScores.map(s => s.subject_id))].map(subjectId => {
        const subjectScores = setupScores.filter(s => s.subject_id === subjectId);
        const subject = subjectScores[0]?.subject;
        
        const totalPossibleScore = setup.weeks.reduce((sum, week) => sum + week.max_score, 0);
        const totalActualScore = subjectScores.reduce((sum, score) => sum + score.score, 0);
        const overallPercentage = totalPossibleScore > 0 ? (totalActualScore / totalPossibleScore) * 100 : 0;
        
        const overallGrade = setup.gradeBoundaries.find(gb => 
          overallPercentage >= gb.min_percentage && overallPercentage <= gb.max_percentage
        );

        return {
          subject: {
            id: subjectId,
            name: subject?.subject_name,
            code: subject?.subject_code
          },
          weekly_scores: subjectScores.map(score => ({
            week_number: score.week_number,
            score: score.score,
            max_score: setup.weeks.find(w => w.week_number === score.week_number)?.max_score || 0,
            percentage: setup.weeks.find(w => w.week_number === score.week_number)?.max_score > 0 
              ? ((score.score / setup.weeks.find(w => w.week_number === score.week_number).max_score) * 100).toFixed(2)
              : '0.00'
          })),
          summary: {
            total_score: totalActualScore,
            total_possible: totalPossibleScore,
            overall_percentage: overallPercentage.toFixed(2),
            overall_grade: overallGrade?.grade || 'N/A',
            overall_remark: overallGrade?.remark || ''
          }
        };
      });

      return {
        ca_setup: {
          id: setup.id,
          ca_type: setup.ca_type,
          setup_name: setup.setup_name,
          overall_contribution_percent: setup.overall_contribution_percent,
          weeks: setup.weeks,
          gradeBoundaries: setup.gradeBoundaries
        },
        subject_progress: subjectProgress
      };
    });

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          admission_no: student.admission_no,
          name: `${student.first_name} ${student.last_name}`,
          class_id: student.class_id
        },
        ca_progress: progress,
        summary: {
          total_ca_types: caSetups.length,
          ca_types_with_scores: progress.filter(p => p.subject_progress.length > 0).length,
          total_subjects: [...new Set(caScores.map(s => s.subject_id))].length
        }
      },
      message: "Student CA Progress V2 retrieved successfully",
    });

  } catch (error) {
    console.error("Error in getStudentCAProgressV2:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while generating student CA progress.",
      error: error.message,
    });
  }
};

/**
 * Get Active CA Setups Summary
 */
const getActiveCASetupsSummary = async (req, res) => {
  try {
    const { school_id, branch_id } = req.user;

    if (!school_id || !branch_id) {
      return res.status(400).json({
        success: false,
        message: "School ID and Branch ID are required.",
      });
    }

    const activeSetups = await db.CASetupV2.findAll({
      where: {
        school_id,
        branch_id,
        is_active: true,
      },
      include: [
        {
          model: db.CAWeekV2,
          as: 'weeks',
          where: { is_active: true },
          required: false,
          attributes: ['week_number', 'max_score']
        },
        {
          model: db.GradeBoundaryV2,
          as: 'gradeBoundaries',
          where: { is_active: true },
          required: false,
          attributes: ['grade', 'min_percentage', 'max_percentage', 'remark']
        }
      ],
      order: [['ca_type', 'ASC']]
    });

    const summary = activeSetups.map(setup => ({
      id: setup.id,
      ca_type: setup.ca_type,
      setup_name: setup.setup_name,
      description: setup.description,
      overall_contribution_percent: setup.overall_contribution_percent,
      week_count: setup.weeks?.length || 0,
      total_max_score: setup.weeks?.reduce((sum, week) => sum + week.max_score, 0) || 0,
      grade_boundaries_count: setup.gradeBoundaries?.length || 0,
      is_default: setup.is_default,
      created_at: setup.created_at,
      updated_at: setup.updated_at
    }));

    res.json({
      success: true,
      data: {
        active_setups: summary,
        statistics: {
          total_active_setups: summary.length,
          total_contribution_percent: summary.reduce((sum, setup) => sum + setup.overall_contribution_percent, 0),
          ca_types_configured: [...new Set(summary.map(s => s.ca_type))],
          average_weeks_per_setup: summary.length > 0 
            ? (summary.reduce((sum, s) => sum + s.week_count, 0) / summary.length).toFixed(1)
            : '0.0'
        }
      },
      message: "Active CA setups summary retrieved successfully",
    });

  } catch (error) {
    console.error("Error in getActiveCASetupsSummary:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching active CA setups summary.",
      error: error.message,
    });
  }
};

module.exports = {
  getCAReportV2,
  getClassCASummaryV2,
  getStudentCAProgressV2,
  getActiveCASetupsSummary,
};