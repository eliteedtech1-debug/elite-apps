const db = require('../models');
const { SchoolSetup, Roles, UserRoles, SchoolFeatures, SchoolAccessAudit, sequelize } = db;
const { Op } = require('sequelize');

class SchoolAccessController {
  
  /**
   * GET /api/schools/access
   * Get all schools with access summary
   * 
   * new 
   */
  async getSchoolsWithAccess(req, res) {
    try {
      const schools = await SchoolSetup.findAll({
        attributes: [
          'school_id',
          'school_name', 
          'short_name',
          'status',
          'address',
          'email_address',
          'school_url',
          'cbt_url',
          'cbt_center',
          'created_at'
        ],
        include: [
          {
            model: Roles,
            as: 'roles',
            attributes: ['role_id', 'user_type', 'accessTo', 'permissions'],
            include: [
              {
                model: UserRoles,
                as: 'userRoles',
                attributes: ['user_id']
              }
            ]
          },
          {
            model: SchoolFeatures,
            as: 'features',
            attributes: ['feature_key', 'is_enabled']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      // Process the data to add summary statistics
      const schoolsWithSummary = schools.map(school => {
        const schoolData = school.toJSON();
        
        // Count total users
        const totalUsers = schoolData.roles.reduce((sum, role) => {
          return sum + (role.userRoles ? role.userRoles.length : 0);
        }, 0);

        // Count enabled features
        const enabledFeatures = schoolData.roles.reduce((features, role) => {
          if (role.accessTo) {
            const access = role.accessTo.split(',').map(a => a.trim());
            access.forEach(feature => features.add(feature));
          }
          return features;
        }, new Set()).size;

        return {
          ...schoolData,
          total_users: totalUsers,
          features_enabled: enabledFeatures,
          total_features: 12 // Based on your available features
        };
      });

      res.json({
        success: true,
        data: schoolsWithSummary
      });
    } catch (error) {
      console.error('Error fetching schools with access:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching schools: ' + error.message
      });
    }
  }

  /**
   * GET /api/schools/access/config?school_id=SCH/1
   * Get school access configuration
   */
  async getSchoolAccessConfig(req, res) {
    try {
      const { school_id } = req.query;
      
      if (!school_id) {
        return res.status(400).json({
          success: false,
          message: 'School ID is required'
        });
      }

      const roles = await Roles.findAll({
        where: { school_id },
        attributes: ['role_id', 'user_type', 'accessTo', 'permissions']
      });

      const accessConfig = {};
      const permissionsConfig = {};

      roles.forEach(role => {
        accessConfig[role.user_type] = role.accessTo ? 
          role.accessTo.split(',').map(a => a.trim()) : [];
        permissionsConfig[role.user_type] = role.permissions ? 
          role.permissions.split(',').map(p => p.trim()) : [];
      });

      res.json({
        success: true,
        data: {
          access_config: accessConfig,
          permissions_config: permissionsConfig
        }
      });
    } catch (error) {
      console.error('Error fetching school access config:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching school access config: ' + error.message
      });
    }
  }

  /**
   * POST /api/schools/access/config
   * Update school access configuration
   */
  async updateSchoolAccess(req, res) {
    console.log('🔧 Starting school access update with db.sequelize.query()...');
    
    try {
      const { school_id, access_config, permissions_config } = req.body;
      const userId = req.user?.id || 1; // Get from auth middleware

      if (!school_id || !access_config || !permissions_config) {
        return res.status(400).json({
          success: false,
          message: 'School ID, access config, and permissions config are required'
        });
      }

      // Process each user type
      for (const [user_type, access_list] of Object.entries(access_config)) {
        const permissions_list = permissions_config[user_type] || [];
        
        // Find existing role using raw SQL
        const [existingRoleResult] = await sequelize.query(`
          SELECT * FROM roles WHERE school_id = ? AND user_type = ?
        `, {
          replacements: [school_id, user_type],
          type: sequelize.QueryTypes.SELECT
        });

        const accessString = Array.isArray(access_list) ? access_list.join(',') : '';
        const permissionsString = Array.isArray(permissions_list) ? permissions_list.join(',') : '';

        if (existingRoleResult.length > 0) {
          const existingRole = existingRoleResult[0];
          
          // Log audit trail (optional)
          try {
            await sequelize.query(`
              INSERT INTO school_access_audits (
                school_id, user_type, action, old_value, new_value, changed_by, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, NOW())
            `, {
              replacements: [
                school_id,
                user_type,
                'UPDATE',
                JSON.stringify({
                  access: existingRole.accessTo,
                  permissions: existingRole.permissions
                }),
                JSON.stringify({
                  access: accessString,
                  permissions: permissionsString
                }),
                userId
              ],
              type: sequelize.QueryTypes.INSERT
            });
          } catch (auditError) {
            console.warn('⚠️ School access audit table not available, skipping audit log');
          }

          // Update existing role using raw SQL
          await sequelize.query(`
            UPDATE roles SET accessTo = ?, permissions = ?, updated_at = NOW() 
            WHERE school_id = ? AND user_type = ?
          `, {
            replacements: [accessString, permissionsString, school_id, user_type],
            type: sequelize.QueryTypes.UPDATE
          });
        } else {
          // Create new role using raw SQL
          await sequelize.query(`
            INSERT INTO roles (
              user_type, description, accessTo, permissions, school_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
          `, {
            replacements: [
              user_type,
              `Manages ${user_type} functions`,
              accessString,
              permissionsString,
              school_id
            ],
            type: sequelize.QueryTypes.INSERT
          });

          // Log audit trail (optional)
          try {
            await sequelize.query(`
              INSERT INTO school_access_audits (
                school_id, user_type, action, new_value, changed_by, created_at
              ) VALUES (?, ?, ?, ?, ?, NOW())
            `, {
              replacements: [
                school_id,
                user_type,
                'GRANT',
                JSON.stringify({
                  access: accessString,
                  permissions: permissionsString
                }),
                userId
              ],
              type: sequelize.QueryTypes.INSERT
            });
          } catch (auditError) {
            console.warn('⚠️ School access audit table not available, skipping audit log');
          }
        }
      }

      console.log('✅ School access updated successfully');

      res.json({
        success: true,
        message: 'School access updated successfully'
      });
    } catch (error) {
      console.error('❌ Error updating school access:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating school access: ' + error.message
      });
    }
  }

  /**
   * POST /api/schools/access/bulk-update
   * Bulk update features for multiple schools
   */
  async bulkUpdateSchoolFeatures(req, res) {
    console.log('🔧 Starting bulk school features update with db.sequelize.query()...');
    
    try {
      const { 
        school_ids, 
        features_to_enable = [], 
        features_to_disable = [], 
        user_types = ['admin', 'teacher'] 
      } = req.body;
      const userId = req.user?.id || 1;

      if (!school_ids || !Array.isArray(school_ids) || school_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'School IDs array is required'
        });
      }

      let updatedCount = 0;

      for (const school_id of school_ids) {
        for (const user_type of user_types) {
          // Find role using raw SQL
          const [roleResult] = await sequelize.query(`
            SELECT * FROM roles WHERE school_id = ? AND user_type = ?
          `, {
            replacements: [school_id, user_type],
            type: sequelize.QueryTypes.SELECT
          });

          if (roleResult.length > 0) {
            const role = roleResult[0];
            let currentAccess = role.accessTo ? role.accessTo.split(',').map(a => a.trim()) : [];
            const oldAccess = [...currentAccess];

            // Add new features
            features_to_enable.forEach(feature => {
              if (!currentAccess.includes(feature)) {
                currentAccess.push(feature);
              }
            });

            // Remove features
            features_to_disable.forEach(feature => {
              currentAccess = currentAccess.filter(f => f !== feature);
            });

            const newAccessString = currentAccess.join(',');

            if (newAccessString !== role.accessTo) {
              // Update role using raw SQL
              await sequelize.query(`
                UPDATE roles SET accessTo = ?, updated_at = NOW() 
                WHERE school_id = ? AND user_type = ?
              `, {
                replacements: [newAccessString, school_id, user_type],
                type: sequelize.QueryTypes.UPDATE
              });

              // Log audit trail (optional)
              try {
                await sequelize.query(`
                  INSERT INTO school_access_audits (
                    school_id, user_type, action, old_value, new_value, changed_by, created_at
                  ) VALUES (?, ?, ?, ?, ?, ?, NOW())
                `, {
                  replacements: [
                    school_id,
                    user_type,
                    'UPDATE',
                    oldAccess.join(','),
                    newAccessString,
                    userId
                  ],
                  type: sequelize.QueryTypes.INSERT
                });
              } catch (auditError) {
                console.warn('⚠️ School access audit table not available, skipping audit log');
              }

              updatedCount++;
            }
          }
        }
      }

      console.log('✅ Bulk update completed successfully');

      res.json({
        success: true,
        message: `Bulk update completed successfully. Updated ${updatedCount} roles.`,
        updated_count: updatedCount
      });
    } catch (error) {
      console.error('❌ Error in bulk update:', error);
      res.status(500).json({
        success: false,
        message: 'Error in bulk update: ' + error.message
      });
    }
  }

  /**
   * POST /api/schools/access/clone
   * Clone access configuration from one school to another
   */
  async cloneSchoolAccess(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { source_school_id, target_school_id } = req.body;
      const userId = req.user?.id || 1;

      if (!source_school_id || !target_school_id) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Source and target school IDs are required'
        });
      }

      // Get source school roles
      const sourceRoles = await Roles.findAll({
        where: { school_id: source_school_id },
        transaction
      });

      if (sourceRoles.length === 0) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Source school configuration not found'
        });
      }

      // Delete existing target school roles
      await Roles.destroy({
        where: { school_id: target_school_id },
        transaction
      });

      // Clone roles to target school
      for (const sourceRole of sourceRoles) {
        await Roles.create({
          user_type: sourceRole.user_type,
          description: sourceRole.description,
          accessTo: sourceRole.accessTo,
          permissions: sourceRole.permissions,
          school_id: target_school_id
        }, { transaction });

        // Log audit trail
        await SchoolAccessAudit.create({
          school_id: target_school_id,
          user_type: sourceRole.user_type,
          action: 'GRANT',
          new_value: JSON.stringify({
            access: sourceRole.accessTo,
            permissions: sourceRole.permissions
          }),
          changed_by: userId
        }, { transaction });
      }

      await transaction.commit();

      res.json({
        success: true,
        message: 'Access configuration cloned successfully'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error cloning access configuration:', error);
      res.status(500).json({
        success: false,
        message: 'Error cloning access configuration: ' + error.message
      });
    }
  }

  /**
   * POST /api/schools/access/reset
   * Reset school access to default configuration
   */
  async resetSchoolAccess(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { school_id } = req.body;
      const userId = req.user?.id || 1;

      if (!school_id) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'School ID is required'
        });
      }

      // Delete existing roles
      await Roles.destroy({
        where: { school_id },
        transaction
      });

      // Insert default roles
      const defaultRoles = [
        {
          user_type: 'admin',
          description: 'Manages core administrative functions',
          accessTo: 'Dashboard,Personal Data Mngr,Express Finance,Income & Expenses Reports',
          permissions: 'Students List,Promotion & Graduation,Application List,Staff List,Fees Setup,Fees & Billing,Payments & Receipts'
        },
        {
          user_type: 'teacher',
          description: 'Manages classroom activities',
          accessTo: 'Dashboard,Exams & Records,Class Management,Daily Routine,Extras',
          permissions: 'Class Attendance,Lessons,Assignments,Virtual Class,Syllabus,Subject Score Sheet'
        },
        {
          user_type: 'student',
          description: 'Has limited access to educational materials',
          accessTo: 'Dashboard,My School Activities',
          permissions: 'My School Activities'
        },
        {
          user_type: 'parent',
          description: 'Monitors student progress',
          accessTo: 'My Children,Bills & Notifications',
          permissions: 'Parent,Children,Bills / School Fees'
        },
        {
          user_type: 'finance',
          description: 'Monitors school finance',
          accessTo: 'Dashboard,Finance & Account,Express Finance,Income & Expenses Reports',
          permissions: 'Fees Setup,Fees & Billing,Payments & Receipts,Income Reports,Expenses reports'
        }
      ];

      for (const roleData of defaultRoles) {
        await Roles.create({
          ...roleData,
          school_id
        }, { transaction });

        // Log audit trail
        await SchoolAccessAudit.create({
          school_id,
          user_type: roleData.user_type,
          action: 'GRANT',
          new_value: JSON.stringify({
            access: roleData.accessTo,
            permissions: roleData.permissions
          }),
          changed_by: userId
        }, { transaction });
      }

      await transaction.commit();

      res.json({
        success: true,
        message: 'School access reset to default successfully'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error resetting school access:', error);
      res.status(500).json({
        success: false,
        message: 'Error resetting school access: ' + error.message
      });
    }
  }

  /**
   * GET /api/schools/access/summary?school_id=SCH/1
   * Get user access summary for a specific school
   */
  async getSchoolUserSummary(req, res) {
    try {
      const { school_id } = req.query;

      if (!school_id) {
        return res.status(400).json({
          success: false,
          message: 'School ID is required'
        });
      }

      const roles = await Roles.findAll({
        where: { school_id },
        attributes: ['role_id', 'user_type', 'accessTo', 'permissions'],
        include: [
          {
            model: UserRoles,
            as: 'userRoles',
            attributes: ['user_id']
          }
        ]
      });

      const userSummary = roles.map(role => {
        const roleData = role.toJSON();
        return {
          user_type: roleData.user_type,
          user_count: roleData.userRoles ? roleData.userRoles.length : 0,
          access_features: roleData.accessTo ? roleData.accessTo.split(',').map(a => a.trim()) : [],
          permissions: roleData.permissions ? roleData.permissions.split(',').map(p => p.trim()) : []
        };
      });

      res.json({
        success: true,
        data: userSummary
      });
    } catch (error) {
      console.error('Error fetching user summary:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user summary: ' + error.message
      });
    }
  }

  /**
   * GET /api/schools/access/analytics
   * Get access analytics across all schools
   */
  async getAccessAnalytics(req, res) {
    try {
      // Get overview statistics
      const [schoolStats] = await sequelize.query(`
        SELECT 
          COUNT(DISTINCT s.school_id) as total_schools,
          COUNT(DISTINCT CASE WHEN s.status = 'Active' THEN s.school_id END) as active_schools,
          COUNT(DISTINCT ur.user_id) as total_users,
          AVG(
            CASE 
              WHEN r.accessTo IS NOT NULL 
              THEN (CHAR_LENGTH(r.accessTo) - CHAR_LENGTH(REPLACE(r.accessTo, ',', '')) + 1)
              ELSE 0 
            END
          ) as avg_features_per_school
        FROM school_setup s
        LEFT JOIN roles r ON r.school_id = s.school_id
        LEFT JOIN user_roles ur ON ur.role_id = r.role_id
      `);

      // Get feature usage statistics
      const [featureStats] = await sequelize.query(`
        SELECT 
          TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(r.accessTo, ',', numbers.n), ',', -1)) as feature_name,
          COUNT(DISTINCT r.school_id) as school_count,
          COUNT(DISTINCT r.role_id) as role_count
        FROM roles r
        JOIN (
          SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 
          UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
        ) numbers ON CHAR_LENGTH(r.accessTo) - CHAR_LENGTH(REPLACE(r.accessTo, ',', '')) >= numbers.n - 1
        WHERE r.accessTo IS NOT NULL
        AND TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(r.accessTo, ',', numbers.n), ',', -1)) != ''
        GROUP BY feature_name
        ORDER BY school_count DESC
      `);

      // Get user type distribution
      const userTypeStats = await Roles.findAll({
        attributes: [
          'user_type',
          [sequelize.fn('COUNT', sequelize.col('role_id')), 'role_count']
        ],
        group: ['user_type'],
        order: [[sequelize.fn('COUNT', sequelize.col('role_id')), 'DESC']]
      });

      res.json({
        success: true,
        data: {
          overview: schoolStats[0],
          feature_usage: featureStats,
          user_type_distribution: userTypeStats
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching analytics: ' + error.message
      });
    }
  }

  /**
   * GET /api/schools/access/audit?school_id=SCH/1&limit=50
   * Get audit trail for school access changes
   */
  async getAccessAuditTrail(req, res) {
    try {
      const { school_id, limit = 50, offset = 0 } = req.query;

      const whereClause = school_id ? { school_id } : {};

      const auditRecords = await SchoolAccessAudit.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        attributes: [
          'id',
          'school_id', 
          'user_type',
          'action',
          'feature_key',
          'permission_key',
          'old_value',
          'new_value',
          'changed_by',
          'created_at'
        ]
      });

      res.json({
        success: true,
        data: {
          records: auditRecords.rows,
          total: auditRecords.count,
          page: Math.floor(offset / limit) + 1,
          total_pages: Math.ceil(auditRecords.count / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching audit trail: ' + error.message
      });
    }
  }

  /**
   * POST /api/schools/access/validate
   * Validate user access for specific features
   */
  async validateUserAccess(req, res) {
    try {
      const { user_id, school_id, feature_key, permission_key } = req.body;

      // Get user's role
      const userRole = await UserRoles.findOne({
        where: { user_id },
        include: [
          {
            model: Roles,
            as: 'role',
            where: { school_id }
          }
        ]
      });

      if (!userRole) {
        return res.status(404).json({
          success: false,
          message: 'User role not found for this school'
        });
      }

      const role = userRole.role;
      const userAccess = role.accessTo ? role.accessTo.split(',').map(a => a.trim()) : [];
      const userPermissions = role.permissions ? role.permissions.split(',').map(p => p.trim()) : [];

      const hasAccess = feature_key ? userAccess.includes(feature_key) : true;
      const hasPermission = permission_key ? userPermissions.includes(permission_key) : true;

      res.json({
        success: true,
        data: {
          has_access: hasAccess,
          has_permission: hasPermission,
          user_type: role.user_type,
          access_features: userAccess,
          permissions: userPermissions
        }
      });
    } catch (error) {
      console.error('Error validating user access:', error);
      res.status(500).json({
        success: false,
        message: 'Error validating user access: ' + error.message
      });
    }
  }
}

module.exports = SchoolAccessController;