-- =====================================================
-- GAAP COMPLIANCE PRODUCTION DEPLOYMENT GUIDE
-- Date: 2026-01-20
-- Purpose: Deploy GAAP compliance features to production
-- =====================================================

## PRE-DEPLOYMENT CHECKLIST

### 1. Database Backup (CRITICAL)
```bash
# Full database backup
mysqldump -u root -p production_db > backup_production_gaap_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_production_gaap_*.sql
```

### 2. Test Environment Validation
```bash
# Run migration on test database first
mysql -u root -p test_db < migrations/GAAP_COMPLIANCE_PHASE1_MIGRATION.sql

# Verify tables created
mysql -u root -p test_db -e "
SHOW TABLES LIKE '%bad_debt%';
SHOW TABLES LIKE '%deferred_revenue%';
SHOW TABLES LIKE '%period_adjustments%';
"
```

## DEPLOYMENT STEPS

### Step 1: Database Migration
```bash
cd /path/to/elscholar-api

# Execute GAAP compliance migration
mysql -u root -p production_db < migrations/GAAP_COMPLIANCE_PHASE1_MIGRATION.sql

# Capture output
mysql -u root -p production_db < migrations/GAAP_COMPLIANCE_PHASE1_MIGRATION.sql > gaap_migration_$(date +%Y%m%d_%H%M%S).log 2>&1
```

### Step 2: Deploy Backend Services
```bash
# Copy new files to production
cp src/services/GAAPComplianceService.js /production/elscholar-api/src/services/
cp src/controllers/GAAPComplianceController.js /production/elscholar-api/src/controllers/
cp src/routes/gaapCompliance.js /production/elscholar-api/src/routes/

# Update main app.js to include GAAP routes
# Add: require('./src/routes/gaapCompliance')(app);
```

### Step 3: Restart Application
```bash
# Restart API server
pm2 restart elscholar-api

# Check application health
curl -f http://localhost:34567/api/health || echo "API health check failed"
```

### Step 4: Verify GAAP Features
```bash
# Test GAAP compliance status endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:34567/api/gaap/compliance-status"

# Test bad debt calculation
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"academic_year":"2024/2025","term":"First Term"}' \
  "http://localhost:34567/api/gaap/bad-debt-allowance"
```

## POST-DEPLOYMENT VALIDATION

### 1. Database Structure Verification
```sql
-- Verify payment_entries columns added
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'payment_entries' 
  AND COLUMN_NAME IN ('payment_status', 'cash_received_date', 'accrued_revenue_date');

-- Verify new tables exist
SELECT TABLE_NAME, TABLE_ROWS 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'production_db' 
  AND TABLE_NAME IN ('bad_debt_allowance', 'deferred_revenue', 'period_adjustments');

-- Verify stored procedures created
SHOW PROCEDURE STATUS WHERE Name IN ('CalculateBadDebtAllowance', 'RecognizeDeferredRevenue');
```

### 2. Data Migration Verification
```sql
-- Check payment_entries updated with default values
SELECT 
  payment_status,
  COUNT(*) as count,
  MIN(accrued_revenue_date) as earliest_accrual,
  MAX(accrued_revenue_date) as latest_accrual
FROM payment_entries 
GROUP BY payment_status;

-- Verify no data loss
SELECT COUNT(*) as total_payment_entries FROM payment_entries;
```

### 3. GAAP Compliance Score
```sql
-- Check initial compliance status
SELECT 
  COUNT(CASE WHEN payment_status IS NOT NULL THEN 1 END) as accrual_tracking,
  COUNT(CASE WHEN cash_received_date IS NOT NULL THEN 1 END) as cash_tracking,
  (SELECT COUNT(*) FROM bad_debt_allowance) as bad_debt_records,
  (SELECT COUNT(*) FROM deferred_revenue) as deferred_revenue_records
FROM payment_entries;
```

## ROLLBACK PROCEDURE (If Issues Occur)

### Emergency Rollback
```bash
# 1. Stop application
pm2 stop elscholar-api

# 2. Restore database from backup
mysql -u root -p production_db < backup_production_gaap_TIMESTAMP.sql

# 3. Remove new backend files
rm /production/elscholar-api/src/services/GAAPComplianceService.js
rm /production/elscholar-api/src/controllers/GAAPComplianceController.js
rm /production/elscholar-api/src/routes/gaapCompliance.js

# 4. Restart application
pm2 start elscholar-api
```

### Selective Rollback (Using Migration Rollback)
```sql
-- Use rollback section from migration file
-- Drop stored procedures
DROP PROCEDURE IF EXISTS CalculateBadDebtAllowance;
DROP PROCEDURE IF EXISTS RecognizeDeferredRevenue;

-- Drop new tables
DROP TABLE IF EXISTS period_adjustments;
DROP TABLE IF EXISTS deferred_revenue;
DROP TABLE IF EXISTS bad_debt_allowance;

-- Remove new columns
ALTER TABLE payment_entries 
DROP COLUMN IF EXISTS payment_status,
DROP COLUMN IF EXISTS cash_received_date,
DROP COLUMN IF EXISTS accrued_revenue_date,
DROP COLUMN IF EXISTS days_outstanding;
```

## MONITORING & MAINTENANCE

### 1. Daily Monitoring
```sql
-- Check GAAP compliance score daily
SELECT 
  ROUND(
    (COUNT(CASE WHEN payment_status IS NOT NULL THEN 1 END) * 30 +
     COUNT(CASE WHEN cash_received_date IS NOT NULL THEN 1 END) * 20 +
     (SELECT COUNT(*) FROM bad_debt_allowance) * 20 +
     (SELECT COUNT(*) FROM deferred_revenue) * 15) / 
    GREATEST(COUNT(*), 1), 2
  ) as compliance_score_percentage
FROM payment_entries;
```

### 2. Monthly Tasks
```sql
-- Run bad debt calculation monthly
CALL CalculateBadDebtAllowance('SCHOOL_ID', 'BRANCH_ID', '2024/2025', 'Current_Term');

-- Recognize deferred revenue monthly
CALL RecognizeDeferredRevenue('SCHOOL_ID', CURDATE());

-- Generate period-end adjustments
-- (Call via API endpoint)
```

### 3. Performance Monitoring
```sql
-- Monitor query performance
SHOW PROCESSLIST;

-- Check table sizes
SELECT 
  table_name,
  table_rows,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'production_db' 
  AND table_name IN ('payment_entries', 'bad_debt_allowance', 'deferred_revenue', 'period_adjustments');
```

## SUCCESS CRITERIA

✅ **Migration Successful If:**
- All new tables created without errors
- payment_entries updated with new columns
- Stored procedures created successfully
- GAAP compliance score > 60%
- No data loss in existing tables
- API endpoints respond correctly

❌ **Rollback Required If:**
- Database migration fails
- Application fails to start
- GAAP compliance score = 0%
- Data corruption detected
- Performance degradation > 50%

## COMMUNICATION PLAN

### Before Deployment
- Email to all administrators about GAAP compliance upgrade
- System maintenance notice (estimated 30 minutes)
- Backup completion confirmation

### During Deployment
- Real-time status updates
- Progress monitoring
- Issue escalation procedures

### After Deployment
- Deployment completion notice
- GAAP compliance score report
- Training materials for new features

---
**Migration Files:**
- `GAAP_COMPLIANCE_PHASE1_MIGRATION.sql`
- `GAAPComplianceService.js`
- `GAAPComplianceController.js`
- `gaapCompliance.js` (routes)

**Estimated Duration:** 30-45 minutes
**Risk Level:** Medium (with proper backup)
**Business Impact:** High (enables full GAAP compliance)
