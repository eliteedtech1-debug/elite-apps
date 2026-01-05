# Migration Simulation Plan: Production → Development

## Overview
Simulate migration from production (kirmaskngov_skcooly_db.sql) to development (skcooly_db) while preserving new RBAC features from elite_test_db.

## Current State
- **Production dump**: 237 tables in `/Users/apple/Downloads/kirmaskngov_skcooly_db.sql`
- **Development (elite_test_db)**: 293 tables with new RBAC features
- **Target (skcooly_db)**: Empty database for simulation

## Phase 1: Backup and Preparation

### 1.1 Create Backup of Current Development
```bash
mysqldump -u root elite_test_db > /Users/apple/Downloads/apps/elite/backup_elite_test_db_$(date +%Y%m%d_%H%M%S).sql
```

### 1.2 Identify New RBAC Tables in elite_test_db
```bash
mysql -u root -e "USE elite_test_db; SHOW TABLES LIKE '%rbac%';" > rbac_tables.txt
mysql -u root -e "USE elite_test_db; SHOW TABLES LIKE '%syllabus%';" > syllabus_tables.txt
mysql -u root -e "USE elite_test_db; SHOW TABLES LIKE '%lesson%';" > lesson_tables.txt
```

## Phase 2: Import Production Data to skcooly_db

### 2.1 Import Full Production Database
```bash
mysql -u root skcooly_db < /Users/apple/Downloads/kirmaskngov_skcooly_db.sql
```

### 2.2 Verify Import Success
```bash
mysql -u root -e "USE skcooly_db; SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'skcooly_db';"
```

## Phase 3: Extract New Features from elite_test_db

### 3.1 Export New RBAC Tables Structure and Data
```bash
# Export new RBAC tables
mysqldump -u root elite_test_db \
  --tables $(mysql -u root -e "USE elite_test_db; SHOW TABLES LIKE '%rbac%';" -s) \
  > new_rbac_tables.sql

# Export syllabus/lesson tables
mysqldump -u root elite_test_db \
  --tables $(mysql -u root -e "USE elite_test_db; SHOW TABLES;" -s | grep -E "(syllabus|lesson)") \
  > new_academic_tables.sql
```

### 3.2 Export Modified Tables (if any)
```bash
# Compare table structures between production and development
mysql -u root -e "
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'elite_test_db' 
AND table_name NOT LIKE '%rbac%' 
AND table_name NOT LIKE '%syllabus%' 
AND table_name NOT LIKE '%lesson%'
ORDER BY table_name, ordinal_position;" > elite_test_structure.txt
```

## Phase 4: Merge New Features into skcooly_db

### 4.1 Import New RBAC System
```bash
mysql -u root skcooly_db < new_rbac_tables.sql
```

### 4.2 Import Academic Features
```bash
mysql -u root skcooly_db < new_academic_tables.sql
```

### 4.3 Update Modified Tables
```bash
# Handle any schema changes to existing tables
# This will be determined after comparing structures
```

## Phase 5: Data Validation and Testing

### 5.1 Verify Table Counts
```bash
mysql -u root -e "
SELECT 
  'Production' as source, COUNT(*) as tables FROM information_schema.tables WHERE table_schema = 'skcooly_db'
UNION ALL
SELECT 
  'Development' as source, COUNT(*) as tables FROM information_schema.tables WHERE table_schema = 'elite_test_db';"
```

### 5.2 Test Critical Data
```bash
# Test user authentication
mysql -u root -e "USE skcooly_db; SELECT COUNT(*) FROM users;"

# Test RBAC functionality
mysql -u root -e "USE skcooly_db; SELECT COUNT(*) FROM rbac_permissions;"

# Test academic data
mysql -u root -e "USE skcooly_db; SELECT COUNT(*) FROM students;"
```

## Phase 6: Rollback Plan

### 6.1 Quick Rollback Commands
```bash
# Drop skcooly_db and recreate empty
mysql -u root -e "DROP DATABASE skcooly_db; CREATE DATABASE skcooly_db;"

# Or restore from backup if needed
mysql -u root skcooly_db < backup_elite_test_db_TIMESTAMP.sql
```

## Expected Outcomes

1. **skcooly_db** will contain:
   - All production data (237 tables)
   - New RBAC system from elite_test_db
   - New syllabus/lesson features
   - Merged functionality

2. **Validation Points**:
   - User login works with new RBAC
   - Academic data is preserved
   - New features are functional
   - No data loss from production

## Next Steps After Simulation

1. Document any conflicts or issues
2. Create automated migration scripts
3. Plan production migration timeline
4. Test rollback procedures
