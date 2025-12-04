# Teacher Soft Delete - Production Deployment Guide

## Pre-Deployment Checklist

- [ ] Backup current database
- [ ] Notify users of brief maintenance window
- [ ] Verify database credentials
- [ ] Test on staging environment first (if available)
- [ ] Have rollback script ready

## Step 1: Backup Database

**On production server:**
```bash
# Navigate to deployment directory
cd /var/www/html/elite-apiv2

# Create backup directory if it doesn't exist
mkdir -p backups

# Backup teachers and users tables
mysqldump -u root -p skcooly_db teachers users > backups/backup_teachers_users_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created
ls -lh backups/
```

## Step 2: Upload SQL Script to Server

**From your local machine:**
```bash
# Copy SQL file to server
scp DEPLOY_TEACHER_SOFT_DELETE.sql user@server:/var/www/html/elite-apiv2/
```

## Step 3: Run Database Migration

**On production server:**
```bash
# Run the SQL script
mysql -u root -p skcooly_db < DEPLOY_TEACHER_SOFT_DELETE.sql
```

## Step 4: Verify Database Changes

```bash
mysql -u root -p skcooly_db -e "
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'skcooly_db'
  AND TABLE_NAME = 'teachers'
  AND COLUMN_NAME IN ('is_deleted', 'deleted_at', 'deleted_by');
"
```

## Step 5: Deploy Code via GitHub Actions

Since the project uses GitHub Actions for deployment, simply:

```bash
# From local machine, push changes to main branch
git add .
git commit -m "feat: implement teacher soft delete mechanism"
git push origin main
```

GitHub Actions will automatically:
1. Deploy to `/var/www/html/elite-apiv2`
2. Run `npm ci --only=production`
3. Restart PM2

## Step 6: Monitor Deployment

```bash
# SSH into production server
ssh user@server

# Check PM2 status
pm2 list

# Monitor logs
pm2 logs elite --lines 50
```

## Step 7: Test the Implementation

### Verify soft delete endpoint works:
```bash
curl -X DELETE "http://your-domain/teachers/{teacher_id}" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-school-id: SCH/1"
```

## Rollback SQL (If Needed)

```sql
ALTER TABLE teachers DROP COLUMN is_deleted;
ALTER TABLE teachers DROP COLUMN deleted_at;
ALTER TABLE teachers DROP COLUMN deleted_by;
ALTER TABLE teachers DROP INDEX unique_email_active;
ALTER TABLE teachers DROP INDEX unique_phone_active;
ALTER TABLE teachers ADD UNIQUE KEY teachers_school_id_email (school_id, email);
ALTER TABLE teachers ADD UNIQUE KEY teachers_school_id_mobile_no (school_id, mobile_no);

ALTER TABLE users DROP COLUMN is_deleted;
ALTER TABLE users DROP COLUMN deleted_at;
ALTER TABLE users DROP COLUMN deleted_by;
ALTER TABLE users DROP INDEX unique_email_active;
ALTER TABLE users ADD UNIQUE KEY email (email, school_id);
```
