# Quick Migration Guide - Deploy to Production

## 🚀 Quick Start (Recommended)

SSH into your server and run these commands:

```bash
# 1. Navigate to API directory
cd /var/www/html/elite-apiv2/elscholar-api

# 2. Pull latest code
git pull origin main

# 3. Run automated migration script
bash database-samples/migrate.sh

# 4. Restart application
pm2 restart elite

# 5. Check logs
pm2 logs elite --lines 20
```

That's it! The script will:
- ✅ Automatically backup your database
- ✅ Update package names (Bronze→Standard, Silver→Premium, Gold→Elite)
- ✅ Fix SMS pricing to ₦5.00 base rate
- ✅ Add annual packages with 15% discount
- ✅ Verify all changes

---

## 📋 What Gets Updated

### Database Schema
- `package_type` enum: adds `'annual'` option
- Character set: converts to UTF8MB4

### Package Names
| Before | After |
|--------|-------|
| Bronze | Standard |
| Silver | Premium |
| Gold | Elite |

### Pricing
| Service | Type | Rate |
|---------|------|------|
| SMS | PAYG | ₦5.00 |
| SMS | Standard Termly | ₦5.00 (0% off) |
| SMS | Premium Termly | ₦4.75 (5% off) |
| SMS | Annual | ₦4.25 (15% off) |
| WhatsApp | PAYG | ₦2.00 |
| WhatsApp | Standard Termly | ₦2.00 (0% off) |
| WhatsApp | Premium Termly | ₦1.90 (5% off) |
| WhatsApp | Annual | ₦1.70 (15% off) |

### New Features
- ✅ Annual subscription packages (12 months)
- ✅ Clear visual separation: Termly (3 months) vs Annual (1 year)
- ✅ Automatic expiry date calculation based on package type

---

## ⚠️ Important Notes

1. **Backup**: The script automatically creates a backup at `/var/backups/mysql/`
2. **Downtime**: Minimal - only during PM2 restart (~2 seconds)
3. **Existing Subscriptions**: Will continue to work, names update automatically
4. **Browser Cache**: Users may need to hard refresh (Ctrl+Shift+R)

---

## 🔍 Manual Verification (Optional)

After migration, verify in MySQL:

```bash
mysql -u root -p skcooly_db

# Check packages exist
SELECT package_name, package_type, service_type, unit_cost
FROM messaging_packages
ORDER BY service_type, package_type;

# Should show no old names
SELECT * FROM messaging_packages
WHERE package_name LIKE '%Bronze%'
   OR package_name LIKE '%Silver%'
   OR package_name LIKE '%Gold%';
-- Expected: Empty result
```

---

## 🌐 Frontend Verification

1. Navigate to: `Settings > Communication Setup`
2. Check you see:
   - ✅ **Termly Packages** [3 Months tag]
   - ✅ **Annual Packages** [Best Value - 15% OFF tag]
   - ✅ **Pay-As-You-Go** section
3. Package names should be: Standard, Premium, Elite
4. Subscribe button for annual should say: "Subscribe (1 Year)"

---

## 🔄 Rollback (If Needed)

If something goes wrong:

```bash
# Find your backup
ls -lh /var/backups/mysql/messaging_backup_*.sql

# Restore (replace TIMESTAMP with actual timestamp)
mysql -u root -p skcooly_db < /var/backups/mysql/messaging_backup_TIMESTAMP.sql

# Restart app
pm2 restart elite
```

---

## 📞 Support

If you encounter issues:

**Check Application Logs:**
```bash
pm2 logs elite --lines 50
```

**Check Database Connection:**
```bash
cd /var/www/html/elite-apiv2/elscholar-api
cat .env | grep DB_
mysql -u root -p skcooly_db -e "SELECT 1;"
```

**Check Migration Status:**
```bash
mysql -u root -p skcooly_db -e "
SELECT package_type, COUNT(*) as count
FROM messaging_packages
GROUP BY package_type;
"
```

Expected output:
```
+-------------+-------+
| package_type| count |
+-------------+-------+
| payg        |   2   |
| termly      |   6   |
| annual      |   6   |
+-------------+-------+
```

---

## ✅ Post-Migration Checklist

- [ ] Migration script ran successfully
- [ ] No errors in PM2 logs
- [ ] Frontend shows "Standard, Premium, Elite"
- [ ] Three package sections visible (Termly, Annual, PAYG)
- [ ] SMS base rate is ₦5.00
- [ ] WhatsApp base rate is ₦2.00
- [ ] Can subscribe to packages
- [ ] Backup file exists in /var/backups/mysql/

---

**Need detailed documentation?** See `database-samples/migration_guide.md`
