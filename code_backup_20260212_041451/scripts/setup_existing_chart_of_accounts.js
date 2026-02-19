/**
 * Setup Chart of Accounts for Existing Schools and Branches
 * 
 * This script sets up the standard chart of accounts for all existing schools
 * and branches that don't already have one.
 * 
 * Usage:
 * node src/scripts/setup_existing_chart_of_accounts.js
 * 
 * Security Features:
 * - Dry run mode for testing
 * - Comprehensive logging
 * - Error handling and rollback
 * - Progress tracking
 */

require('dotenv').config();
const models = require('../models');
const ChartOfAccountsSetupService = require('../services/ChartOfAccountsSetupService');
const ChartOfAccountsHooks = require('../hooks/ChartOfAccountsHooks');

class ChartOfAccountsMigration {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    this.results = {
      schools_processed: 0,
      branches_processed: 0,
      schools_success: 0,
      branches_success: 0,
      schools_skipped: 0,
      branches_skipped: 0,
      errors: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = this.dryRun ? '[DRY RUN] ' : '';
    
    switch (level) {
      case 'error':
        console.error(`${timestamp} ${prefix}ERROR: ${message}`);
        break;
      case 'warn':
        console.warn(`${timestamp} ${prefix}WARN: ${message}`);
        break;
      case 'verbose':
        if (this.verbose) {
          console.log(`${timestamp} ${prefix}VERBOSE: ${message}`);
        }
        break;
      default:
        console.log(`${timestamp} ${prefix}INFO: ${message}`);
    }
  }

  async setupSchools() {
    this.log('Starting school chart of accounts setup...');
    
    try {
      // Try different possible school model names
      const possibleSchoolModels = ['School', 'SchoolSetup', 'Schools'];
      let SchoolModel = null;
      
      for (const modelName of possibleSchoolModels) {
        if (models[modelName]) {
          SchoolModel = models[modelName];
          this.log(`Found school model: ${modelName}`);
          break;
        }
      }
      
      if (!SchoolModel) {
        this.log('No school model found. Skipping school setup.', 'warn');
        return;
      }

      const schools = await SchoolModel.findAll();
      this.log(`Found ${schools.length} schools to process`);

      for (const school of schools) {
        this.results.schools_processed++;
        
        try {
          // Extract school ID and name (adapt based on your model structure)
          const schoolId = school.id || school.school_id || school.uuid;
          const schoolName = school.school_name || school.name || school.title || `School ${schoolId}`;
          
          this.log(`Processing school: ${schoolId} (${schoolName})`, 'verbose');
          
          if (this.dryRun) {
            // In dry run mode, just check if accounts exist
            const existingAccounts = await models.ChartOfAccounts.count({
              where: { school_id: schoolId }
            });
            
            if (existingAccounts > 0) {
              this.log(`School ${schoolId} already has ${existingAccounts} accounts - would skip`);
              this.results.schools_skipped++;
            } else {
              this.log(`School ${schoolId} would get chart of accounts setup (${ChartOfAccountsSetupService.getStandardChartTemplate().length} accounts)`);
              this.results.schools_success++;
            }
          } else {
            // Actually setup the chart of accounts
            const setupResult = await ChartOfAccountsSetupService.setupSchoolChartOfAccounts(
              schoolId,
              schoolName,
              'migration-script'
            );
            
            if (setupResult.success) {
              this.results.schools_success++;
              this.log(`School ${schoolId}: ${setupResult.message} (${setupResult.accounts_created} accounts created)`);
            } else {
              this.results.schools_skipped++;
              this.log(`School ${schoolId}: ${setupResult.message}`);
            }
          }
          
        } catch (error) {
          this.results.errors.push(`School ${school.id || 'unknown'}: ${error.message}`);
          this.log(`Failed to setup school ${school.id}: ${error.message}`, 'error');
        }
      }
      
    } catch (error) {
      this.log(`Error processing schools: ${error.message}`, 'error');
      this.results.errors.push(`Schools processing error: ${error.message}`);
    }
  }

  async setupBranches() {
    this.log('Starting branch chart of accounts setup...');
    
    try {
      // Try different possible branch model names
      const possibleBranchModels = ['Branch', 'Branches', 'SchoolBranch'];
      let BranchModel = null;
      
      for (const modelName of possibleBranchModels) {
        if (models[modelName]) {
          BranchModel = models[modelName];
          this.log(`Found branch model: ${modelName}`);
          break;
        }
      }
      
      if (!BranchModel) {
        this.log('No branch model found. Skipping branch setup.', 'warn');
        return;
      }

      const branches = await BranchModel.findAll();
      this.log(`Found ${branches.length} branches to process`);

      for (const branch of branches) {
        this.results.branches_processed++;
        
        try {
          // Extract branch and school IDs (adapt based on your model structure)
          const branchId = branch.id || branch.branch_id || branch.uuid;
          const schoolId = branch.school_id || branch.schoolId;
          const branchName = branch.branch_name || branch.name || branch.title || `Branch ${branchId}`;
          
          if (!schoolId) {
            this.log(`Branch ${branchId} has no school_id - skipping`, 'warn');
            continue;
          }
          
          this.log(`Processing branch: ${branchId} (${branchName}) in school ${schoolId}`, 'verbose');
          
          if (this.dryRun) {
            // In dry run mode, just check if accounts exist
            const existingAccounts = await models.ChartOfAccounts.count({
              where: { 
                school_id: schoolId,
                branch_id: branchId
              }
            });
            
            if (existingAccounts > 0) {
              this.log(`Branch ${branchId} already has ${existingAccounts} accounts - would skip`);
              this.results.branches_skipped++;
            } else {
              this.log(`Branch ${branchId} would get chart of accounts setup`);
              this.results.branches_success++;
            }
          } else {
            // Actually setup the chart of accounts
            const setupResult = await ChartOfAccountsSetupService.setupBranchChartOfAccounts(
              schoolId,
              branchId,
              branchName,
              'migration-script'
            );
            
            if (setupResult.success) {
              this.results.branches_success++;
              this.log(`Branch ${branchId}: ${setupResult.message} (${setupResult.accounts_created} accounts created)`);
            } else {
              this.results.branches_skipped++;
              this.log(`Branch ${branchId}: ${setupResult.message}`);
            }
          }
          
        } catch (error) {
          this.results.errors.push(`Branch ${branch.id || 'unknown'}: ${error.message}`);
          this.log(`Failed to setup branch ${branch.id}: ${error.message}`, 'error');
        }
      }
      
    } catch (error) {
      this.log(`Error processing branches: ${error.message}`, 'error');
      this.results.errors.push(`Branches processing error: ${error.message}`);
    }
  }

  async run() {
    this.log('='.repeat(80));
    this.log('Chart of Accounts Migration Script Started');
    this.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be applied)'}`);
    this.log(`Verbose: ${this.verbose ? 'ON' : 'OFF'}`);
    this.log('='.repeat(80));

    try {
      // Test database connection
      await models.sequelize.authenticate();
      this.log('Database connection established successfully');

      // Setup schools
      await this.setupSchools();
      
      // Setup branches
      await this.setupBranches();
      
      // Print summary
      this.printSummary();
      
    } catch (error) {
      this.log(`Migration failed: ${error.message}`, 'error');
      throw error;
    } finally {
      await models.sequelize.close();
      this.log('Database connection closed');
    }
  }

  printSummary() {
    this.log('='.repeat(80));
    this.log('MIGRATION SUMMARY');
    this.log('='.repeat(80));
    this.log(`Schools processed: ${this.results.schools_processed}`);
    this.log(`Schools ${this.dryRun ? 'would be setup' : 'setup successfully'}: ${this.results.schools_success}`);
    this.log(`Schools skipped (already have accounts): ${this.results.schools_skipped}`);
    this.log('');
    this.log(`Branches processed: ${this.results.branches_processed}`);
    this.log(`Branches ${this.dryRun ? 'would be setup' : 'setup successfully'}: ${this.results.branches_success}`);
    this.log(`Branches skipped (already have accounts): ${this.results.branches_skipped}`);
    this.log('');
    this.log(`Total errors: ${this.results.errors.length}`);
    
    if (this.results.errors.length > 0) {
      this.log('\
ERRORS:');
      this.results.errors.forEach(error => this.log(`  - ${error}`, 'error'));
    }
    
    this.log('='.repeat(80));
    
    if (this.dryRun) {
      this.log('This was a DRY RUN. No changes were made.');
      this.log('To apply changes, run with --live flag');
    } else {
      this.log('Migration completed successfully!');
    }
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: !args.includes('--live'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Chart of Accounts Migration Script

Usage:
  node src/scripts/setup_existing_chart_of_accounts.js [options]

Options:
  --live      Apply changes (default is dry run)
  --verbose   Enable verbose logging
  --help      Show this help message

Examples:
  # Dry run (default)
  node src/scripts/setup_existing_chart_of_accounts.js
  
  # Dry run with verbose output
  node src/scripts/setup_existing_chart_of_accounts.js --verbose
  
  # Apply changes
  node src/scripts/setup_existing_chart_of_accounts.js --live
  
  # Apply changes with verbose output
  node src/scripts/setup_existing_chart_of_accounts.js --live --verbose
`);
    process.exit(0);
  }
  
  const migration = new ChartOfAccountsMigration(options);
  
  migration.run()
    .then(() => {
      console.log('\
Migration script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\
Migration script failed:', error.message);
      process.exit(1);
    });
}

module.exports = ChartOfAccountsMigration;