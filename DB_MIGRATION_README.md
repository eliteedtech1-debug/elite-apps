# Consolidated Database Migration for Elite Scholar System

## Overview
This migration file contains all the database schema changes needed for the Elite Scholar system, excluding collation changes as requested.

## What's Included
1. Foreign Key Constraints and Primary Key Adjustments for Supply Management Tables
   - Purchase Orders table adjustments
   - Purchase Order Items table adjustments  
   - Stock Transactions table adjustments
   - Sales Transactions table adjustments
   - Sales Transaction Items table adjustments
   - Stock Adjustments table adjustments
   - Asset Documents table adjustments

2. Indexes and Check Constraints where applicable

## What's Excluded (as requested)
- Charset/collation changes in Sequelize configuration (these are application code changes, not database schema changes)
- The API query change (using `current_class` instead of `class_code`) - this is an application logic change in `src/routes/studentDetails.js`, not a database schema change

## How to Apply This Migration

1. **Backup your database first:**
   ```bash
   mysqldump -u [username] -p [database_name] > backup_before_migration_$(date +%Y%m%d).sql
   ```

2. **Apply the migration:**
   ```bash
   mysql -u [username] -p [database_name] < consolidated_db_migration.sql
   ```

3. **Test the application** to ensure all functionality works as expected.

## Important Notes
- Make sure to apply this migration during a maintenance window if you're in production
- After applying the migration, deploy the corresponding code changes that work with the new schema
- The API code changes (like using `current_class` instead of `class_code`) need to be deployed separately