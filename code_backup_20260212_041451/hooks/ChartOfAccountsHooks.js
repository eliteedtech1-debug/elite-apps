/**
 * Chart of Accounts Database Hooks
 * 
 * Automatically triggers chart of accounts setup when schools or branches are created.
 * Ensures every new school/branch gets their accounting structure automatically.
 * 
 * Security Features:
 * - Async hook execution to prevent blocking
 * - Error handling that doesn't break main operations
 * - Comprehensive logging for audit trails
 * - Rollback protection for failed setups
 */

const ChartOfAccountsSetupService = require('../services/ChartOfAccountsSetupService');

class ChartOfAccountsHooks {
  /**
   * Hook for after school creation
   */
  static async afterSchoolCreate(school, options) {
    try {
      console.log(`Chart of Accounts Hook: School created - ${school.id} (${school.school_name || school.name})`);
      
      // Run setup asynchronously to not block the main operation
      setImmediate(async () => {
        try {
          const result = await ChartOfAccountsSetupService.setupSchoolChartOfAccounts(
            school.id || school.school_id,
            school.school_name || school.name || 'New School',
            'system-hook'
          );
          
          console.log(`Chart of Accounts Hook: Setup completed for school ${school.id}:`, result.message);
        } catch (error) {
          console.error(`Chart of Accounts Hook: Failed to setup for school ${school.id}:`, error.message);
          // Don't throw error to prevent breaking the main school creation
        }
      });
      
    } catch (error) {
      console.error('Chart of Accounts Hook: Error in afterSchoolCreate:', error);
      // Don't throw error to prevent breaking the main operation
    }
  }

  /**
   * Hook for after branch creation
   */
  static async afterBranchCreate(branch, options) {
    try {
      console.log(`Chart of Accounts Hook: Branch created - ${branch.id} (${branch.branch_name || branch.name}) in school ${branch.school_id}`);
      
      // Run setup asynchronously to not block the main operation
      setImmediate(async () => {
        try {
          const result = await ChartOfAccountsSetupService.setupBranchChartOfAccounts(
            branch.school_id,
            branch.id || branch.branch_id,
            branch.branch_name || branch.name || 'New Branch',
            'system-hook'
          );
          
          console.log(`Chart of Accounts Hook: Setup completed for branch ${branch.id}:`, result.message);
        } catch (error) {
          console.error(`Chart of Accounts Hook: Failed to setup for branch ${branch.id}:`, error.message);
          // Don't throw error to prevent breaking the main branch creation
        }
      });
      
    } catch (error) {
      console.error('Chart of Accounts Hook: Error in afterBranchCreate:', error);
      // Don't throw error to prevent breaking the main operation
    }
  }

  /**
   * Register hooks with Sequelize models
   */
  static registerHooks(models) {
    try {
      let hooksRegistered = 0;
      
      // Register school creation hooks - try multiple model names
      const schoolModels = ['School', 'SchoolSetup'];
      for (const modelName of schoolModels) {
        if (models[modelName]) {
          models[modelName].addHook('afterCreate', 'setupChartOfAccounts', (school, options) => {
            this.afterSchoolCreate({
              id: school.school_id || school.id,
              school_id: school.school_id || school.id,
              school_name: school.school_name || school.name,
              name: school.school_name || school.name,
              short_name: school.short_name
            }, options);
          });
          console.log(`Chart of Accounts Hook: Registered afterCreate hook for ${modelName} model`);
          hooksRegistered++;
          break; // Only register for the first found model to avoid duplicates
        }
      }
      
      if (hooksRegistered === 0) {
        console.log('Chart of Accounts Hook: No school models found (School, SchoolSetup), skipping school hooks');
      }

      // Register branch creation hooks - try multiple model names
      const branchModels = ['Branch', 'Branches', 'SchoolBranch', 'SchoolLocation', 'SchoolLocations'];
      let branchHookRegistered = false;
      for (const modelName of branchModels) {
        if (models[modelName]) {
          // Check if the model has a table (branches might not exist yet)
          try {
            models[modelName].addHook('afterCreate', 'setupChartOfAccounts', (branch, options) => {
              this.afterBranchCreate({
                id: branch.branch_id || branch.id,
                branch_id: branch.branch_id || branch.id,
                branch_name: branch.branch_name || branch.name,
                name: branch.branch_name || branch.name,
                school_id: branch.school_id,
                location: branch.location
              }, options);
            });
            console.log(`Chart of Accounts Hook: Registered afterCreate hook for ${modelName} model`);
            branchHookRegistered = true;
            break;
          } catch (error) {
            console.log(`Chart of Accounts Hook: ${modelName} model exists but table not ready, skipping`);
          }
        }
      }
      
      if (!branchHookRegistered) {
        console.log('Chart of Accounts Hook: No branch models found or ready, skipping branch hooks');
        console.log('Chart of Accounts Hook: Branch hooks will be available when branch functionality is implemented');
      }
      
      console.log('Chart of Accounts Hook: Hook registration completed successfully');
      
    } catch (error) {
      console.error('Chart of Accounts Hook: Error registering hooks:', error);
    }
  }

  /**
   * Manual trigger for chart of accounts setup
   */
  static async manualSetupTrigger(type, data) {
    try {
      if (type === 'school') {
        return await ChartOfAccountsSetupService.setupSchoolChartOfAccounts(
          data.school_id,
          data.school_name,
          data.created_by || 'manual-trigger'
        );
      } else if (type === 'branch') {
        return await ChartOfAccountsSetupService.setupBranchChartOfAccounts(
          data.school_id,
          data.branch_id,
          data.branch_name,
          data.created_by || 'manual-trigger'
        );
      } else {
        throw new Error('Invalid setup type. Must be \"school\" or \"branch\"');
      }
    } catch (error) {
      console.error('Chart of Accounts Hook: Error in manual setup trigger:', error);
      throw error;
    }
  }

  /**
   * Bulk setup for existing schools/branches
   */
  static async bulkSetupExisting(models) {
    try {
      console.log('Chart of Accounts Hook: Starting bulk setup for existing schools/branches...');
      
      const results = {
        schools_processed: 0,
        branches_processed: 0,
        schools_success: 0,
        branches_success: 0,
        errors: []
      };

      // Setup for existing schools - try multiple model names
      const schoolModels = ['School', 'SchoolSetup'];
      let schoolModelFound = false;
      
      for (const modelName of schoolModels) {
        if (models[modelName]) {
          try {
            console.log(`Bulk Setup: Using ${modelName} model for schools`);
            const schools = await models[modelName].findAll();
            schoolModelFound = true;
            
            for (const school of schools) {
              results.schools_processed++;
              try {
                const schoolId = school.school_id || school.id;
                const schoolName = school.school_name || school.name || 'Existing School';
                
                const setupResult = await ChartOfAccountsSetupService.setupSchoolChartOfAccounts(
                  schoolId,
                  schoolName,
                  'bulk-setup'
                );
                
                if (setupResult.success) {
                  results.schools_success++;
                }
                
                console.log(`Bulk Setup: School ${schoolId} - ${setupResult.message}`);
              } catch (error) {
                results.errors.push(`School ${school.school_id || school.id}: ${error.message}`);
                console.error(`Bulk Setup: Failed for school ${school.school_id || school.id}:`, error.message);
              }
            }
            break; // Use the first available model
          } catch (error) {
            console.error(`Bulk Setup: Error processing schools with ${modelName}:`, error);
            results.errors.push(`Schools processing error with ${modelName}: ${error.message}`);
          }
        }
      }
      
      if (!schoolModelFound) {
        console.log('Bulk Setup: No school models found, skipping school setup');
      }

      // Setup for existing branches - try multiple model names
      const branchModels = ['Branch', 'Branches', 'SchoolBranch', 'SchoolLocation', 'SchoolLocations'];
      let branchModelFound = false;
      
      for (const modelName of branchModels) {
        if (models[modelName]) {
          try {
            console.log(`Bulk Setup: Using ${modelName} model for branches`);
            const branches = await models[modelName].findAll();
            branchModelFound = true;
            
            for (const branch of branches) {
              results.branches_processed++;
              try {
                const branchId = branch.branch_id || branch.id;
                const schoolId = branch.school_id;
                const branchName = branch.branch_name || branch.name || 'Existing Branch';
                
                const setupResult = await ChartOfAccountsSetupService.setupBranchChartOfAccounts(
                  schoolId,
                  branchId,
                  branchName,
                  'bulk-setup'
                );
                
                if (setupResult.success) {
                  results.branches_success++;
                }
                
                console.log(`Bulk Setup: Branch ${branchId} - ${setupResult.message}`);
              } catch (error) {
                results.errors.push(`Branch ${branch.branch_id || branch.id}: ${error.message}`);
                console.error(`Bulk Setup: Failed for branch ${branch.branch_id || branch.id}:`, error.message);
              }
            }
            break; // Use the first available model
          } catch (error) {
            console.error(`Bulk Setup: Error processing branches with ${modelName}:`, error);
            results.errors.push(`Branches processing error with ${modelName}: ${error.message}`);
          }
        }
      }
      
      if (!branchModelFound) {
        console.log('Bulk Setup: No branch models found, skipping branch setup');
        console.log('Bulk Setup: This is normal if branch functionality is not yet implemented');
      }

      console.log('Chart of Accounts Hook: Bulk setup completed:', results);
      return results;
      
    } catch (error) {
      console.error('Chart of Accounts Hook: Error in bulk setup:', error);
      throw error;
    }
  }
}

module.exports = ChartOfAccountsHooks;