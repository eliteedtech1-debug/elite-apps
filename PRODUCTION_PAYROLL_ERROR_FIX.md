# Production Payroll Error Fix - Missing `percentage` Column

## 🐛 Error in Production

```
Error: Unknown column 'sa.percentage' in 'SELECT'
Code: ER_BAD_FIELD_ERROR
```

**Location**: PayrollController.js - Staff enrollment query  
**Affected**: Production database only  
**Status**: ❌ Blocking payroll functionality

---

## 🔍 Root Cause Analysis

### The Problem
The production database (`kirmaskngov_skcooly_db`) is missing the `percentage` column in the `staff_allowances` table, while the local development database (`full_skcooly`) has it.

### Schema Difference

**Local (Working):**
```sql
mysql> DESCRIBE staff_allowances;
+----------------+---------------+------+-----+---------+
| Field          | Type          | Null | Key | Default |
+----------------+---------------+------+-----+---------+
| id             | int(11)       | NO   | PRI | NULL    |
| staff_id       | int(11)       | NO   | MUL | NULL    |
| allowance_id   | int(11)       | NO   | MUL | NULL    |
| amount         | decimal(10,2) | YES  |     | NULL    |
| percentage     | decimal(5,2)  | YES  |     | NULL    | ✅ EXISTS
| effective_date | datetime      | NO   |     | NULL    |
| end_date       | datetime      | YES  |     | NULL    |
+----------------+---------------+------+-----+---------+
```

**Production (Broken):**
```sql
-- Missing 'percentage' column ❌
```

### Why It Works Locally
The local database was updated with the `percentage` column during development, but this migration was never run on production.

---

## 📊 Query Analysis

**File**: `/elscholar-api/src/controllers/PayrollController.js`  
**Lines**: 818, 853

The query calculates allowances using:
```sql
CASE 
  WHEN sa.percentage IS NOT NULL THEN 
    (basic_salary * sa.percentage / 100)
  ELSE sa.amount
END
```

**Purpose**: Allows allowances to be either:
1. **Fixed amount** (e.g., ₦5,000 transport allowance)
2. **Percentage of salary** (e.g., 20% housing allowance)

---

## ✅ Solution

### Step 1: Run Migration on Production

**File**: `/elscholar-api/src/migrations/add_percentage_columns_production.sql`

```bash
# SSH to production server
ssh user@production-server

# Navigate to API directory
cd /var/www/html/elite-apiv2

# Run migration
mysql -u root -p kirmaskngov_skcooly_db < src/migrations/add_percentage_columns_production.sql
```

### Step 2: Verify Migration

```bash
mysql -u root -p kirmaskngov_skcooly_db -e "
  SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'staff_allowances' 
  AND COLUMN_NAME = 'percentage';
"
```

**Expected Output:**
```
COLUMN_NAME | DATA_TYPE    | IS_NULLABLE
percentage  | decimal(5,2) | YES
```

### Step 3: Restart API

```bash
# If using PM2
pm2 restart elite-api

# If using systemd
sudo systemctl restart elite-api
```

### Step 4: Test Payroll

```bash
# Test the endpoint that was failing
curl -X GET 'https://your-domain.com/api/payroll/staff-enrollment?school_id=SCH/1&branch_id=BRCH00001' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

## 🔧 Migration Script Details

### What It Does:
1. Adds `percentage` column to `staff_allowances` table
2. Adds `percentage` column to `staff_deductions` table (for consistency)
3. Uses `ADD COLUMN IF NOT EXISTS` (safe to re-run)
4. Verifies columns were added

### Column Specification:
```sql
percentage DECIMAL(5,2) NULL 
COMMENT 'Percentage of basic salary (if not using fixed amount)'
```

- **Type**: DECIMAL(5,2) - Allows values like 25.50 (25.5%)
- **Nullable**: YES - Not all allowances use percentage
- **Position**: After `amount` column

---

## 📝 Usage Examples

### Fixed Amount Allowance:
```sql
INSERT INTO staff_allowances (staff_id, allowance_id, amount, percentage)
VALUES (123, 1, 5000.00, NULL);
-- Pays ₦5,000 regardless of salary
```

### Percentage-Based Allowance:
```sql
INSERT INTO staff_allowances (staff_id, allowance_id, amount, percentage)
VALUES (123, 2, NULL, 20.00);
-- Pays 20% of basic salary
```

### Calculation Logic:
```
If percentage IS NOT NULL:
  allowance = basic_salary × (percentage / 100)
Else:
  allowance = amount
```

---

## 🚨 Why This Happened

### Timeline:
1. **Development**: Column added during local development
2. **Testing**: Worked fine locally with updated schema
3. **Deployment**: Code deployed but migration not run
4. **Production**: Old schema + new code = ERROR

### Prevention:
- ✅ Document all schema changes
- ✅ Create migration scripts before deployment
- ✅ Run migrations as part of deployment process
- ✅ Test on staging with production-like schema

---

## 🔍 How to Detect Schema Differences

### Compare Local vs Production:
```bash
# Export local schema
mysqldump -u root -d full_skcooly staff_allowances > local_schema.sql

# Export production schema (on production server)
mysqldump -u root -d kirmaskngov_skcooly_db staff_allowances > prod_schema.sql

# Compare
diff local_schema.sql prod_schema.sql
```

### Check for Missing Columns:
```sql
-- Run on production
SELECT 
  'staff_allowances' as table_name,
  COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'kirmaskngov_skcooly_db'
  AND TABLE_NAME = 'staff_allowances'
ORDER BY ORDINAL_POSITION;
```

---

## ✅ Verification Checklist

After running migration:

- [ ] Column exists in `staff_allowances` table
- [ ] Column exists in `staff_deductions` table
- [ ] API server restarted
- [ ] Payroll enrollment endpoint works
- [ ] No errors in API logs
- [ ] Test with actual staff data

---

## 📞 Rollback Plan

If issues occur after migration:

```sql
-- Remove columns (not recommended unless critical issue)
ALTER TABLE staff_allowances DROP COLUMN IF EXISTS percentage;
ALTER TABLE staff_deductions DROP COLUMN IF EXISTS percentage;
```

**Note**: This will break the payroll calculation logic. Only rollback if absolutely necessary.

---

## 🎯 Related Files

- **Migration**: `/elscholar-api/src/migrations/add_percentage_columns_production.sql`
- **Controller**: `/elscholar-api/src/controllers/PayrollController.js` (lines 818, 853)
- **Error Log**: Production error logs showing `ER_BAD_FIELD_ERROR`

---

**Priority**: 🔴 CRITICAL - Blocking payroll functionality  
**Estimated Fix Time**: 5 minutes  
**Risk Level**: Low (adding nullable column)  
**Tested**: ✅ Working in local environment
