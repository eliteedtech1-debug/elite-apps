# Production Migration Checklist

## Pre-Migration
- [ ] Read PRODUCTION_MIGRATION_GUIDE.md
- [ ] Schedule maintenance window (2-4 AM recommended)
- [ ] Notify users of maintenance
- [ ] Take full database backup
- [ ] Test migration on staging/dev first
- [ ] Verify .env has correct credentials

## Migration (Choose One)

### Option A: Automated (Recommended)
- [ ] Run: `./scripts/production-migration.sh`
- [ ] Verify backup created in `backups/` directory
- [ ] Check output for any errors

### Option B: Manual SQL
- [ ] Run: `mysql -u root -p < scripts/migration/01_create_databases.sql`
- [ ] Run: `mysql -u root -p < scripts/migration/02_copy_audit_tables.sql`
- [ ] Run: `mysql -u root -p < scripts/migration/03_copy_ai_tables.sql`
- [ ] Run: `mysql -u root -p < scripts/migration/04_add_indexes.sql`

## Post-Migration
- [ ] Update .env with AUDIT_DB_NAME and AI_DB_NAME
- [ ] Restart backend: `npm run dev` or `pm2 restart`
- [ ] Check logs for database connections
- [ ] Verify: `./scripts/test-db-setup.sh`

## Testing (Critical - Do Not Skip)
- [ ] Login as admin
- [ ] View students list (check performance)
- [ ] Create a test payment
- [ ] Verify audit log: `SELECT * FROM skcooly_audit.audit_trails ORDER BY createdAt DESC LIMIT 5;`
- [ ] Check dashboard loads
- [ ] Test search functionality
- [ ] Monitor logs for 1 hour

## 24-48 Hour Monitoring
- [ ] Check error logs daily
- [ ] Monitor performance metrics
- [ ] Verify audit logging continues
- [ ] Check database sizes
- [ ] Confirm no user complaints

## Cleanup (After 48 Hours Success)
- [ ] Run: `mysql -u root -p < backups/YYYYMMDD_HHMMSS/drop_migrated_tables.sql`
- [ ] Verify old tables dropped
- [ ] Keep backups for 30 days
- [ ] Document any issues encountered

## Rollback (If Issues Occur)
- [ ] Run: `cd backups/YYYYMMDD_HHMMSS && ./rollback.sh`
- [ ] Restart backend
- [ ] Verify application works
- [ ] Investigate issues before retry

## Success Indicators
- ✅ Backend starts with "✅ Main DB connected, ✅ Audit DB connected, ✅ AI DB connected"
- ✅ Response times 50-70% faster
- ✅ Audit logs saving to skcooly_audit
- ✅ No errors in logs
- ✅ All features working

## Emergency Contacts
- Database Admin: _____________
- Backend Developer: _____________
- DevOps: _____________

## Notes
_Add any environment-specific notes here_
