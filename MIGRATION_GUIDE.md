# Production Migration Guide: Notifications System

## Overview
Migrate from `elite_logs` table to `system_notifications` table for enhanced notification features.

## Pre-Migration Checklist
- [ ] Backup database
- [ ] Test migration on staging environment
- [ ] Schedule maintenance window (5-10 minutes)
- [ ] Notify users of brief downtime

## Migration Steps

### 1. Backup Database
```bash
mysqldump -u root elite_logs > elite_logs_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Run Migration Script
```bash
mysql -u root elite_logs < migrations/2026-02-26_migrate_to_system_notifications.sql
```

### 3. Update Code (Already Done in Dev)
Files already updated:
- ✅ `src/models/audit/SystemNotification.js` (renamed from EliteLog.js)
- ✅ `src/models/audit/index.js` (import path updated)
- ✅ `src/services/assignmentNotificationService.js` (uses system_notifications)

### 4. Deploy Code
```bash
cd elscholar-api
git pull origin expirement
npm install
pm2 restart elscholar-api
```

### 5. Verify Migration
```bash
mysql -u root elite_logs << 'EOF'
-- Check table exists
SELECT COUNT(*) as elite_logs_exists 
FROM information_schema.tables 
WHERE table_schema = 'elite_logs' AND table_name = 'elite_logs';

-- Check data migrated
SELECT COUNT(*) as total_notifications FROM system_notifications;

-- Check recent notifications
SELECT user_id, title, category, created_at 
FROM system_notifications 
ORDER BY created_at DESC LIMIT 5;
EOF
```

### 6. Test Functionality
```bash
# Test assignment notification
curl -X PUT 'http://your-domain/assignments' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"query_type":"update","id":"ASSIGNMENT_ID","status":"Opened"}'

# Check notifications created
mysql -u root elite_logs -e "SELECT COUNT(*) FROM system_notifications WHERE created_at > NOW() - INTERVAL 1 MINUTE"
```

## Rollback Plan (If Needed)

### If migration fails:
```sql
USE elite_logs;

-- Restore from backup table
CREATE TABLE elite_logs AS SELECT * FROM elite_logs_backup;

-- Restore model file
cd /path/to/elscholar-api/src/models/audit
git checkout EliteLog.js
git checkout index.js

-- Restart server
pm2 restart elscholar-api
```

## Post-Migration

### Cleanup (After 7 days of successful operation)
```sql
USE elite_logs;
DROP TABLE IF EXISTS elite_logs_backup;
```

### Monitor
- Check error logs: `tail -f logs/error.log`
- Monitor notifications: `SELECT COUNT(*) FROM system_notifications WHERE created_at > NOW() - INTERVAL 1 HOUR`

## Expected Results
- ✅ All notifications migrated to `system_notifications`
- ✅ `elite_logs` table removed
- ✅ New notifications use VARCHAR user_id (supports admission_no)
- ✅ Category is VARCHAR (no ENUM limits)
- ✅ Retention policies available
- ✅ Icon and bulk notification support

## Estimated Downtime
- **Small DB (<10k records):** 2-3 minutes
- **Medium DB (10k-100k):** 5-10 minutes
- **Large DB (>100k):** 15-30 minutes

## Support
If issues occur:
1. Check logs: `tail -f logs/error.log`
2. Verify table exists: `SHOW TABLES LIKE 'system_notifications'`
3. Check model loading: Restart API and check startup logs
4. Rollback if critical issues persist

## Success Criteria
- [ ] Migration script completes without errors
- [ ] `elite_logs` table no longer exists
- [ ] `system_notifications` has all records
- [ ] API starts without errors
- [ ] New notifications are created successfully
- [ ] Users can view notifications in UI
