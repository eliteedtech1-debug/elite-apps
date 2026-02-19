'use strict';

module.exports = (sequelize, DataTypes) => {
  const Subject = sequelize.define('Subject', {
    subject_code: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
      comment: 'Unique identifier for the subject'
    },
    subject: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Subject name'
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'School identifier - references school_setup.school_id'
    },
    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      defaultValue: 'Active',
      comment: 'Subject status'
    },
    section: {
      type: DataTypes.STRING(45),
      allowNull: false,
      comment: 'Educational section (NURSERY, PRIMARY, JUNIOR SECONDARY, SENIOR SECONDARY)'
    },
    sub_section: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Sub-section or stream within the main section'
    },
    type: {
      type: DataTypes.STRING(50),
      defaultValue: 'core',
      allowNull: false,
      comment: 'Subject type: core, science, art, commercial, technology, vocational, health, language, Selective',
      validate: {
        isIn: [['Core', 'Science',  'science', 'Arts', 'Commercial', 'Technical', 'Vocational', 'Selective','General']]
      }
    },
    is_elective: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Indicates if this subject is an elective course'
    },
    elective_group: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Group identifier for elective subjects (e.g., Science, Arts, Commercial)'
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Branch identifier - REQUIRED for multi-branch support - references school_locations.branch_id'
    },
    weekly_hours: {
      type: DataTypes.DECIMAL(3, 1),
      defaultValue: 0.0,
      allowNull: true,
      comment: 'Weekly teaching hours for this subject (optional)'
    },
    class_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Class identifier this subject is assigned to'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Record creation timestamp'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Record last update timestamp'
    }
  }, {
    tableName: 'subjects',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['school_id']
      },
      {
        fields: ['section']
      },
      {
        fields: ['status']
      },
      {
        fields: ['type']
      },
      {
        fields: ['is_elective']
      },
      {
        fields: ['elective_group']
      },
      {
        fields: ['branch_id']
      },
      {
        fields: ['class_code']
      },
      {
        fields: ['school_id', 'section', 'status']
      },
      {
        fields: ['class_code', 'status']
      },
      {
        fields: ['school_id', 'type', 'status']
      },
      {
        fields: ['school_id', 'branch_id', 'status']
      },
      {
        fields: ['branch_id', 'section', 'status']
      },
      {
        fields: ['school_id', 'branch_id', 'section', 'status']
      }
    ]
  });

  Subject.associate = function(models) {
    // Define associations here
    
    // Association with SchoolSetup (main school table)
    if (models.SchoolSetup) {
      Subject.belongsTo(models.SchoolSetup, {
        foreignKey: 'school_id',
        targetKey: 'school_id',
        as: 'school'
      });
    }
    
    // Fallback association with School model if it exists
    if (models.School && !models.SchoolSetup) {
      Subject.belongsTo(models.School, {
        foreignKey: 'school_id',
        as: 'school'
      });
    }
    
    // Association with Class
    if (models.Class) {
      Subject.belongsTo(models.Class, {
        foreignKey: 'class_code',
        targetKey: 'class_code',
        as: 'class'
      });
    }

    // Association with SchoolLocation (branches/locations)
    if (models.SchoolLocation) {
      Subject.belongsTo(models.SchoolLocation, {
        foreignKey: 'branch_id',
        targetKey: 'branch_id',
        as: 'branch'
      });
    }
  };

  // Instance methods

  Subject.prototype.getDisplayName = function() {
    if (this.is_elective) {
      return `${this.subject} (Elective${this.elective_group ? ` - ${this.elective_group}` : ''})`;
    }
    return this.subject;
  };

  Subject.prototype.getTypeDescription = function() {
    const typeDescriptions = {
      'core': 'Core Subject',
      'science': 'Science Subject',
      'art': 'Arts Subject',
      'commercial': 'Commercial Subject',
      'technology': 'Technology Subject',
      'vocational': 'Vocational Subject',
      'health': 'Health & PE Subject',
      'language': 'Language Subject',
      'selective': 'Selective Subject'
    };
    return typeDescriptions[this.type] || 'General Subject';
  };

  // Class methods for enhanced querying - BRANCH-AWARE
  Subject.getBySection = async function(school_id, section, options = {}) {
    const whereClause = {
      school_id,
      section,
      status: 'Active'
    };

    // CRITICAL: Branch ID is REQUIRED for all queries
    if (!options.branch_id) {
      throw new Error('branch_id is required for all subject queries - subjects are branch-specific');
    }
    whereClause.branch_id = options.branch_id;

    if (options.includeElectives !== undefined) {
      whereClause.is_elective = options.includeElectives;
    }

    if (options.electiveGroup) {
      whereClause.elective_group = options.electiveGroup;
    }

    if (options.type) {
      whereClause.type = options.type;
    }

    if (options.class_code) {
      whereClause.class_code = options.class_code;
    }

    return await this.findAll({
      where: whereClause,
      order: [
        ['is_elective', 'ASC'],
        ['type', 'ASC'],
        ['elective_group', 'ASC'],
        ['subject', 'ASC']
      ],
      include: options.include || []
    });
  };

  Subject.getCoreSubjects = async function(school_id, section, branch_id, options = {}) {
    if (!branch_id) {
      throw new Error('branch_id is required - core subjects are branch-specific');
    }
    return await this.getBySection(school_id, section, { 
      ...options, 
      branch_id,
      includeElectives: false 
    });
  };

  Subject.getElectiveSubjects = async function(school_id, section, branch_id, electiveGroup = null, options = {}) {
    if (!branch_id) {
      throw new Error('branch_id is required - elective subjects are branch-specific');
    }
    const queryOptions = { 
      ...options, 
      branch_id,
      includeElectives: true 
    };
    if (electiveGroup) {
      queryOptions.electiveGroup = electiveGroup;
    }
    return await this.getBySection(school_id, section, queryOptions);
  };

  Subject.getByType = async function(school_id, type, branch_id, options = {}) {
    if (!branch_id) {
      throw new Error('branch_id is required - subjects by type are branch-specific');
    }
    
    const whereClause = {
      school_id,
      branch_id,
      type,
      status: 'Active'
    };

    if (options.section) {
      whereClause.section = options.section;
    }

    return await this.findAll({
      where: whereClause,
      order: [
        ['section', 'ASC'],
        ['subject', 'ASC']
      ],
      include: options.include || []
    });
  };

  Subject.getElectiveGroups = async function(school_id, section, branch_id, options = {}) {
    if (!branch_id) {
      throw new Error('branch_id is required - elective groups are branch-specific');
    }
    
    const whereClause = {
      school_id,
      branch_id,
      section,
      status: 'Active',
      is_elective: true,
      elective_group: {
        [sequelize.Sequelize.Op.ne]: null
      }
    };

    const results = await this.findAll({
      attributes: ['elective_group'],
      where: whereClause,
      group: ['elective_group'],
      raw: true
    });

    return results.map(result => result.elective_group);
  };

  Subject.getSubjectTypes = async function(school_id, branch_id, section = null, options = {}) {
    if (!branch_id) {
      throw new Error('branch_id is required - subject types are branch-specific');
    }
    
    const whereClause = {
      school_id,
      branch_id,
      status: 'Active'
    };

    if (section) {
      whereClause.section = section;
    }

    const results = await this.findAll({
      attributes: ['type'],
      where: whereClause,
      group: ['type'],
      raw: true
    });

    return results.map(result => result.type);
  };

  // GLOBALLY UNIQUE SUBJECT CODE GENERATOR
  Subject.generateSubjectCode = async function(school_id, branch_id) {
    if (!branch_id) {
      throw new Error('branch_id is required for subject code generation - codes are branch-specific');
    }
    const transaction = await sequelize.transaction();
    try {
      // Get the last subject code number GLOBALLY (not just for school/branch)
      const lastSubject = await this.findOne({
        where: {
          subject_code: {
            [sequelize.Sequelize.Op.regexp]: '^SBJ[0-9]+$'
          }
        },
        order: [
          [sequelize.Sequelize.literal('CAST(SUBSTRING(subject_code, 4) AS UNSIGNED)'), 'DESC']
        ],
        transaction
      });

      let nextNumber = 1;
      if (lastSubject) {
        const lastNumber = parseInt(lastSubject.subject_code.substring(3));
        nextNumber = lastNumber + 1;
      }

      let newCode = `SBJ${nextNumber.toString().padStart(4, '0')}`;
      
      // Ensure uniqueness GLOBALLY (not just within school and branch)
      while (await this.findOne({ 
        where: { 
          subject_code: newCode
        }, 
        transaction 
      })) {
        nextNumber++;
        newCode = `SBJ${nextNumber.toString().padStart(4, '0')}`;
      }

      await transaction.commit();
      return newCode;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  Subject.bulkCreateSubjects = async function(subjectsData, options = {}) {
    const transaction = options.transaction || await sequelize.transaction();
    const shouldCommit = !options.transaction;

    try {
      const results = [];
      
      for (const subjectData of subjectsData) {
        // Ensure branch_id is present
        if (!subjectData.branch_id) {
          throw new Error('branch_id is required for all subjects - subjects are branch-specific');
        }
        
        if (!subjectData.subject_code) {
          // Generate globally unique subject code with retry logic
          let attempts = 0;
          const maxAttempts = 5;
          
          while (attempts < maxAttempts) {
            try {
              subjectData.subject_code = await this.generateSubjectCode(subjectData.school_id, subjectData.branch_id);
              
              // Double-check uniqueness
              const existing = await this.findOne({
                where: { subject_code: subjectData.subject_code },
                transaction
              });
              
              if (!existing) {
                break; // Code is unique
              } else {
                attempts++;
                if (attempts >= maxAttempts) {
                  // Final fallback
                  const timestamp = Date.now();
                  const random = Math.random().toString(36).substr(2, 6);
                  subjectData.subject_code = `SBJ_${timestamp}_${random}`;
                }
              }
            } catch (codeError) {
              attempts++;
              if (attempts >= maxAttempts) {
                // Final fallback
                const timestamp = Date.now();
                const random = Math.random().toString(36).substr(2, 6);
                subjectData.subject_code = `SBJ_${timestamp}_${random}`;
              }
            }
          }
        }
        
        const subject = await this.create(subjectData, { transaction });
        results.push(subject);
      }

      if (shouldCommit) {
        await transaction.commit();
      }
      
      return results;
    } catch (error) {
      if (shouldCommit) {
        await transaction.rollback();
      }
      throw error;
    }
  };

  Subject.updateBySubjectCode = async function(subject_code, updateData, options = {}) {
    const whereClause = { subject_code };
    
    if (options.school_id) {
      whereClause.school_id = options.school_id;
    }
    
    // CRITICAL: Include branch_id in updates for branch isolation
    if (options.branch_id) {
      whereClause.branch_id = options.branch_id;
    }

    const [affectedRows] = await this.update(updateData, {
      where: whereClause,
      transaction: options.transaction
    });

    return affectedRows;
  };

  Subject.softDelete = async function(subject_code, school_id, branch_id, options = {}) {
    if (!branch_id) {
      throw new Error('branch_id is required for subject deletion - ensures branch isolation');
    }
    return await this.updateBySubjectCode(subject_code, 
      { status: 'Inactive' }, 
      { school_id, branch_id, ...options }
    );
  };

  Subject.reactivate = async function(subject_code, school_id, branch_id, options = {}) {
    if (!branch_id) {
      throw new Error('branch_id is required for subject reactivation - ensures branch isolation');
    }
    return await this.updateBySubjectCode(subject_code, 
      { status: 'Active' }, 
      { school_id, branch_id, ...options }
    );
  };

  // New branch-specific methods
  Subject.getByBranch = async function(school_id, branch_id, options = {}) {
    if (!branch_id) {
      throw new Error('branch_id is required - subjects are branch-specific');
    }
    
    const whereClause = {
      school_id,
      branch_id,
      status: options.status || 'Active'
    };

    if (options.section) {
      whereClause.section = options.section;
    }

    if (options.type) {
      whereClause.type = options.type;
    }

    if (options.is_elective !== undefined) {
      whereClause.is_elective = options.is_elective;
    }

    return await this.findAll({
      where: whereClause,
      order: [
        ['section', 'ASC'],
        ['type', 'ASC'],
        ['is_elective', 'ASC'],
        ['subject', 'ASC']
      ],
      include: options.include || []
    });
  };

  Subject.getBranchSummary = async function(school_id, branch_id) {
    if (!branch_id) {
      throw new Error('branch_id is required for branch summary');
    }
    
    const summary = await this.findAll({
      attributes: [
        'section',
        'type',
        'is_elective',
        [sequelize.fn('COUNT', sequelize.col('subject_code')), 'count']
      ],
      where: {
        school_id,
        branch_id,
        status: 'Active'
      },
      group: ['section', 'type', 'is_elective'],
      raw: true
    });

    return summary;
  };

  // Hook to automatically update teacher_classes when subject name changes
  Subject.addHook('afterUpdate', async (subject, options) => {
    // Check if the subject name was changed
    if (subject.changed('subject') && subject._previousDataValues.subject !== subject.subject) {
      const oldSubjectName = subject._previousDataValues.subject;
      const newSubjectName = subject.subject;
      const classCode = subject.class_code;
      
      console.log(`🔄 Subject name changed from "${oldSubjectName}" to "${newSubjectName}" for class ${classCode}`);
      
      try {
        // Update teacher_classes table
        const [affectedRows] = await sequelize.query(
          'UPDATE teacher_classes SET subject = :newSubject WHERE subject = :oldSubject AND class_code = :classCode',
          {
            replacements: {
              newSubject: newSubjectName,
              oldSubject: oldSubjectName,
              classCode: classCode
            },
            type: sequelize.QueryTypes.UPDATE,
            transaction: options.transaction
          }
        );
        
        if (affectedRows > 0) {
          console.log(`✅ Updated ${affectedRows} teacher_classes records for subject name change`);
        }
      } catch (error) {
        console.error('❌ Error updating teacher_classes after subject name change:', error);
        // Don't throw error to avoid breaking the subject update
      }
    }
  });

  return Subject;
};