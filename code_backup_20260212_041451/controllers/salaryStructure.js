const { where } = require("sequelize");
const { GradeLevel, SalaryStructureHistory } = require("../models");

// ✅ Create Grade Level (with history entry)
exports.createGradeLevel = async (req, res) => {
  console.log('🔧 CREATE GRADE LEVEL - NEW VERSION WITH RAW SQL');
  console.log('Request body:', req.body);
  try {
    const {
      grade_name,
      grade_code,
      description,
      basic_salary,
      increment_rate,
      minimum_years_for_increment,
      maximum_steps,
      notes,
      school_id,
      branch_id,
      created_by,
      change_reason,
      effective_date
    } = req.body;

    // Validate required fields
    if (!grade_name || grade_name.trim() === '') {
      console.log('❌ Validation failed: grade_name is missing or empty');
      return res.status(400).json({
        success: false,
        message: 'grade_name is required and cannot be empty'
      });
    }

    if (!grade_code || grade_code.trim() === '') {
      console.log('❌ Validation failed: grade_code is missing or empty');
      console.log('Received grade_code:', grade_code);
      console.log('Type of grade_code:', typeof grade_code);
      return res.status(400).json({
        success: false,
        message: 'grade_code is required and cannot be empty'
      });
    }

    // Create new GradeLevel (explicitly exclude grade_id to let AUTO_INCREMENT work)
    const gradeData = {
      grade_name,
      grade_code,
      description,
      basic_salary: basic_salary || 0,
      increment_rate: increment_rate || 0,
      minimum_years_for_increment: minimum_years_for_increment || 1,
      maximum_steps: maximum_steps || 10,
      notes,
      school_id: school_id || req.user.school_id,
      branch_id: branch_id || req.user.branch_id,
      effective_date
    };
    
    // Remove undefined values to avoid issues
    Object.keys(gradeData).forEach(key => {
      if (gradeData[key] === undefined) {
        delete gradeData[key];
      }
    });
    
    const grade = await GradeLevel.create(gradeData, {
      fields: ['grade_name', 'grade_code', 'description', 'basic_salary', 'increment_rate', 
               'minimum_years_for_increment', 'maximum_steps', 'notes', 'school_id', 
               'branch_id', 'effective_date', 'is_active']
    });

    // No need to create individual step records - steps are calculated dynamically
    // Formula: basic_salary + (step_number * increment_rate)

    // Save first history log
    await SalaryStructureHistory.create({
      grade_id: grade.grade_id,
      old_basic_salary: null,
      new_basic_salary: basic_salary,
      old_increment_rate: null,
      new_increment_rate: increment_rate,
      change_reason: change_reason || "Initial creation",
      effective_date: effective_date || new Date(),
      changed_by: req.user.id || 0,
      school_id: school_id || req.user.school_id,
      branch_id: branch_id || req.user.branch_id
    });

    res.status(201).json({ success: true, grade });
  } catch (error) {
    console.error("❌ Error creating grade level:", error);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ Error message:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getGradeSteps = async (req, res) => {
  try {
    const { gradeId } = req.params;
    
    // Get the grade level to access basic_salary, increment_rate, and maximum_steps
    const grade = await GradeLevel.findByPk(gradeId);
    if (!grade) {
      return res.status(404).json({ success: false, message: "Grade not found" });
    }

    // Generate steps dynamically using the formula: basic_salary + (step_number * increment_rate)
    const steps = [];
    const baseSalary = parseFloat(grade.basic_salary);
    const incrementRate = parseFloat(grade.increment_rate) || 0;
    const maxSteps = parseInt(grade.maximum_steps) || 10;

    for (let stepNumber = 1; stepNumber <= maxSteps; stepNumber++) {
      const calculatedSalary = baseSalary + ((stepNumber - 1) * incrementRate);
      
      steps.push({
        step_id: stepNumber, // Virtual ID for frontend compatibility
        grade_id: gradeId,
        step_number: stepNumber,
        calculated_salary: calculatedSalary,
        is_active: true
      });
    }

    res.json({ success: true, steps });
  } catch (error) {
    console.error("❌ Error fetching grade steps:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get all Grade Levels
exports.getGradeLevels = async (req, res) => {
  try {
    const grades = await GradeLevel.findAll({ where: { 
      school_id: req.user.school_id
    }});
    res.json({ success: true, grades });
  } catch (error) {
    console.error("❌ Error fetching grade levels:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Update Grade Level (with history log)
exports.updateGradeLevel = async (req, res) => {
  console.log('🔧 UPDATE GRADE LEVEL');
  console.log('Request params:', req.params);
  console.log('Request body:', req.body);
  
  try {
    const { id } = req.params;
    const {
      grade_name,
      grade_code,
      description,
      basic_salary,
      increment_rate,
      minimum_years_for_increment,
      maximum_steps,
      notes,
      change_reason,
      effective_date,
      changed_by
    } = req.body;

    const grade = await GradeLevel.findByPk(id);
    if (!grade) {
      console.log('❌ Grade not found with ID:', id);
      return res.status(404).json({ success: false, message: "Grade level not found" });
    }

    console.log('✅ Found grade:', grade.toJSON());

    // Save history log before updating (only for salary changes)
    if (basic_salary !== undefined || increment_rate !== undefined) {
      await SalaryStructureHistory.create({
        grade_id: grade.grade_id,
        old_basic_salary: grade.basic_salary,
        new_basic_salary: basic_salary || grade.basic_salary,
        old_increment_rate: grade.increment_rate,
        new_increment_rate: increment_rate || grade.increment_rate,
        change_reason: change_reason || "Grade level update",
        effective_date: effective_date || new Date(),
        changed_by: changed_by || req.user.id || 0,
        school_id: grade.school_id,
        branch_id: grade.branch_id
      });
    }

    // Prepare update data
    const updateData = {};
    if (grade_name !== undefined) updateData.grade_name = grade_name;
    if (grade_code !== undefined) updateData.grade_code = grade_code;
    if (description !== undefined) updateData.description = description;
    if (basic_salary !== undefined) updateData.basic_salary = basic_salary;
    if (increment_rate !== undefined) updateData.increment_rate = increment_rate;
    if (minimum_years_for_increment !== undefined) updateData.minimum_years_for_increment = minimum_years_for_increment;
    if (maximum_steps !== undefined) updateData.maximum_steps = maximum_steps;
    if (notes !== undefined) updateData.notes = notes;
    if (effective_date !== undefined) updateData.effective_date = effective_date;

    console.log('📝 Update data:', updateData);

    // Apply update
    await grade.update(updateData);

    console.log('✅ Grade updated successfully');
    res.json({ success: true, grade: await grade.reload() });
  } catch (error) {
    console.error("❌ Error updating grade level:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.deleteGradeLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const grade = await GradeLevel.findByPk(id);
    if (!grade) return res.status(404).json({ success: false, message: "Not found" });

    await grade.destroy();
    res.json({ success: true, message: "Grade level deleted" });
  } catch (error) {
    console.error("❌ Error deleting grade level:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get Grade History
exports.getGradeHistory = async (req, res) => {
  try {
    const { gradeId } = req.params;
    const history = await SalaryStructureHistory.findAll({
      where: { grade_id: gradeId },
      include: [{ model: GradeLevel, as: "grade" }],
      order: [["created_at", "DESC"]]
    });
    res.json({ success: true, history });
  } catch (error) {
    console.error("❌ Error fetching grade history:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }


};

// ✅ Analytics API (average, highest, lowest, total counts)
exports.getAnalytics = async (req, res) => {
  try {
    // Fetch all grade levels
    const grades = await GradeLevel.findAll();

    if (!grades.length) {
      return res.json({ success: true, analytics: {} });
    }

    // Compute basic analytics
    const totalGrades = grades.length;
    const totalBasicSalary = grades.reduce((sum, g) => sum + Number(g.basic_salary), 0);
    const avgBasicSalary = totalBasicSalary / totalGrades;
    const highestSalary = Math.max(...grades.map((g) => Number(g.basic_salary)));
    const lowestSalary = Math.min(...grades.map((g) => Number(g.basic_salary)));

    // Count total salary structure updates (from history)
    const totalUpdates = await SalaryStructureHistory.count();

    // Response
    res.json({
      success: true,
      analytics: {
        totalGrades,
        avgBasicSalary,
        highestSalary,
        lowestSalary,
        totalUpdates,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching analytics:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


