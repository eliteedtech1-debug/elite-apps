# Database Migration Guide - Communication Packages Update

## Overview
This guide helps you migrate the messaging packages database from Bronze/Silver/Gold to Standard/Premium/Elite with correct pricing and annual packages.

## Changes Being Applied
1. Package names: Bronze → Standard, Silver → Premium, Gold → Elite
2. SMS base rate: ₦5.00 (correct pricing)
3. WhatsApp base rate: ₦2.00
4. New package type: `annual` (12-month subscriptions)
5. Correct discount structure (0%, 5%, 15%)

---

## Step 1: Backup Your Database

**IMPORTANT: Always backup before migration!**

```bash
# SSH into your deployment server
ssh username@server.brainstorm.ng

# Navigate to a backup directory
cd /var/backups/mysql

# Create a timestamped backup
mysqldump -u DB_USERNAME -p DB_NAME > messaging_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created
ls -lh messaging_backup_*.sql
```

---

## Step 2: Pull Latest Code

```bash
# Navigate to your project directory
cd /var/www/html/elite-apiv2

# Pull latest changes
git pull origin main

# Navigate to elite-api directory if needed
cd elscholar-api
```

---

## Step 3: Run Database Migration

### Option A: If Starting Fresh (No Existing Packages)

```bash
# Run the main migration file (drops and recreates table)
mysql -u DB_USERNAME -p DB_NAME < src/migrations/create_messaging_packages_tables.sql
```

### Option B: If You Have Existing Packages (Recommended)

```bash
# First, update the package_type enum to include 'annual'
mysql -u DB_USERNAME -p DB_NAME -e "
ALTER TABLE messaging_packages
MODIFY COLUMN package_type ENUM('payg', 'termly', 'annual') NOT NULL
COMMENT 'Pay-as-you-go, termly subscription, or annual subscription';
"

# Update existing package names and pricing
mysql -u DB_USERNAME -p DB_NAME < database-samples/update_to_standard_premium_elite.sql
```

---

## Step 4: Insert New Annual Packages

If you used Option B above, you need to add the new annual packages:

```bash
# Create a temporary SQL file for annual packages only
cat > /tmp/insert_annual_packages.sql << 'EOF'
-- SMS Annual Packages
INSERT INTO messaging_packages (package_name, service_type, package_type, messages_per_term, unit_cost, package_cost, description, is_active) VALUES
('Standard', 'sms', 'annual', 1500, 4.2500, 6375.0000, 'Standard: 1,500 SMS per year at ₦4.25/msg (15% discount) - Total: ₦6,375', 1),
('Premium', 'sms', 'annual', 4500, 4.2500, 19125.0000, 'Premium: 4,500 SMS per year at ₦4.25/msg (15% discount) - Total: ₦19,125', 1),
('Elite', 'sms', 'annual', 9000, 4.2500, 38250.0000, 'Elite: 9,000 SMS per year at ₦4.25/msg (15% discount) - Total: ₦38,250', 1);

-- WhatsApp Annual Packages
INSERT INTO messaging_packages (package_name, service_type, package_type, messages_per_term, unit_cost, package_cost, description, is_active) VALUES
('Standard', 'whatsapp', 'annual', 1500, 1.7000, 2550.0000, 'Standard: 1,500 WhatsApp per year at ₦1.70/msg (15% discount) - Total: ₦2,550', 1),
('Premium', 'whatsapp', 'annual', 4500, 1.7000, 7650.0000, 'Premium: 4,500 WhatsApp per year at ₦1.70/msg (15% discount) - Total: ₦7,650', 1),
('Elite', 'whatsapp', 'annual', 9000, 1.7000, 15300.0000, 'Elite: 9,000 WhatsApp per year at ₦1.70/msg (15% discount) - Total: ₦15,300', 1);
EOF

# Run the SQL file
mysql -u DB_USERNAME -p DB_NAME < /tmp/insert_annual_packages.sql

# Clean up
rm /tmp/insert_annual_packages.sql
```

---

## Step 5: Verify Migration

```bash
# Check that packages are updated correctly
mysql -u DB_USERNAME -p DB_NAME -e "
SELECT
    id,
    package_name,
    service_type,
    package_type,
    messages_per_term,
    unit_cost,
    package_cost,
    is_active
FROM messaging_packages
ORDER BY service_type, package_type, messages_per_term;
"
```

**Expected Output:**
- SMS PAYG: Unit at ₦5.00
- SMS Termly: Standard (₦5.00), Premium (₦4.75), Elite (₦4.75)
- SMS Annual: Standard (₦4.25), Premium (₦4.25), Elite (₦4.25)
- WhatsApp PAYG: Unit at ₦2.00
- WhatsApp Termly: Standard (₦2.00), Premium (₦1.90), Elite (₦1.90)
- WhatsApp Annual: Standard (₦1.70), Premium (₦1.70), Elite (₦1.70)

---

## Step 6: Check for Old Package Names

```bash
# Verify no old package names remain
mysql -u DB_USERNAME -p DB_NAME -e "
SELECT id, package_name, service_type, package_type
FROM messaging_packages
WHERE package_name LIKE '%Bronze%'
   OR package_name LIKE '%Silver%'
   OR package_name LIKE '%Gold%';
"
```

**Expected Output:** Empty result (no rows)

---

## Step 7: Restart Application

```bash
# Restart the API using PM2
pm2 restart elite

# Check logs for any errors
pm2 logs elite --lines 50

# Verify API is running
pm2 list
```

---

## Step 8: Test Frontend

1. Open your browser and navigate to the Communication Setup page
2. You should see:
   - ✅ Package names: Standard, Premium, Elite
   - ✅ Three sections: "Termly Packages (3 Months)", "Annual Packages (Best Value - 15% OFF)", "Pay-As-You-Go"
   - ✅ Correct pricing displayed
   - ✅ SMS base: ₦5.00, WhatsApp base: ₦2.00

---

## Quick Migration Script (All-in-One)

For convenience, here's a complete script:

```bash
#!/bin/bash
# migration_script.sh

set -e  # Exit on error

# Configuration
DB_USER="your_db_username"
DB_NAME="your_db_name"
BACKUP_DIR="/var/backups/mysql"

echo "=== Starting Database Migration ==="

# 1. Create backup
echo "Step 1: Creating backup..."
mkdir -p $BACKUP_DIR
mysqldump -u $DB_USER -p $DB_NAME > $BACKUP_DIR/messaging_backup_$(date +%Y%m%d_%H%M%S).sql
echo "✓ Backup created"

# 2. Update package_type enum
echo "Step 2: Updating package_type enum..."
mysql -u $DB_USER -p $DB_NAME -e "
ALTER TABLE messaging_packages
MODIFY COLUMN package_type ENUM('payg', 'termly', 'annual') NOT NULL;
"
echo "✓ Enum updated"

# 3. Run update script
echo "Step 3: Updating package names and prices..."
mysql -u $DB_USER -p $DB_NAME < database-samples/update_to_standard_premium_elite.sql
echo "✓ Packages updated"

# 4. Add character set conversion
echo "Step 4: Converting to UTF8MB4..."
mysql -u $DB_USER -p $DB_NAME -e "
ALTER TABLE messaging_packages CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"
echo "✓ Character set updated"

# 5. Verify
echo "Step 5: Verifying changes..."
mysql -u $DB_USER -p $DB_NAME -e "
SELECT COUNT(*) as total_packages FROM messaging_packages;
SELECT package_type, COUNT(*) as count FROM messaging_packages GROUP BY package_type;
"

echo "=== Migration Complete ==="
echo "Next steps:"
echo "1. pm2 restart elite"
echo "2. Test the Communication Setup page"
```

---

## Rollback (If Needed)

If something goes wrong, you can restore from backup:

```bash
# Restore from backup
mysql -u DB_USERNAME -p DB_NAME < /var/backups/mysql/messaging_backup_TIMESTAMP.sql

# Restart application
pm2 restart elite
```

---

## Troubleshooting

### Issue: "Duplicate entry" error when inserting packages

**Solution:** Remove duplicate packages first:

```bash
mysql -u DB_USERNAME -p DB_NAME -e "
DELETE FROM messaging_packages
WHERE package_name IN ('Standard', 'Premium', 'Elite')
AND package_type = 'annual';
"
```

Then re-run the insert annual packages step.

---

### Issue: Active subscriptions showing wrong package names

**Solution:** Subscriptions reference packages by ID, not name. The frontend will automatically show the new names.

---

### Issue: Frontend still showing old names

**Solution:**
1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Check if frontend was rebuilt: `cd elscholar-ui && npm run build`

---

## Environment-Specific Notes

### Production Server (server.brainstorm.ng)

```bash
# Your specific configuration
DB_USER="root" or check your .env file
DB_NAME="skcooly_db" or check your .env file
PROJECT_PATH="/var/www/html/elite-apiv2"
PM2_APP_NAME="elite"
```

### Get database credentials from .env

```bash
cd /var/www/html/elite-apiv2/elscholar-api
cat .env | grep DB_
```

---

## Post-Migration Checklist

- [ ] Backup created and verified
- [ ] Migration SQL executed successfully
- [ ] New packages visible in database
- [ ] No old package names (Bronze/Silver/Gold) remain
- [ ] Application restarted (PM2)
- [ ] Frontend shows new package names
- [ ] Annual packages section visible
- [ ] Pricing is correct (SMS: ₦5.00, WhatsApp: ₦2.00)
- [ ] Can subscribe to packages successfully
- [ ] Test subscription expiry dates (termly: 3 months, annual: 12 months)

---

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs elite --lines 100`
2. Check MySQL error log: `tail -f /var/log/mysql/error.log`
3. Verify database connection: `mysql -u DB_USERNAME -p DB_NAME -e "SELECT 1;"`

---

**REMEMBER:** Always test on a staging environment first if available!
