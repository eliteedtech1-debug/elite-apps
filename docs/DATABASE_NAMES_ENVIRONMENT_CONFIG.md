# Database Name Configuration - Environment-Based

## ✅ Problem Solved
Database names are now read from `.env` file instead of being hardcoded, making the system work across different environments (dev: `full_skcooly`, production: `kirmaskngov_skcooly_db`).

---

## Configuration File

**Location**: `/elscholar-api/src/config/dbNames.js`

```javascript
module.exports = {
  MAIN_DB: process.env.DB_NAME || 'full_skcooly',
  AUDIT_DB: process.env.AUDIT_DB_NAME || 'elite_logs',
  CONTENT_DB: process.env.CONTENT_DB_NAME || process.env.DB_NAME,
  AI_DB: process.env.AI_DB_NAME || 'elite_bot'
};
```

---

## Environment Variables (.env)

### Development
```bash
DB_NAME=full_skcooly
AUDIT_DB_NAME=elite_logs
AI_DB_NAME=elite_bot
```

### Production
```bash
DB_NAME=kirmaskngov_skcooly_db
AUDIT_DB_NAME=elite_logs
AI_DB_NAME=elite_bot
```

---

## Updated Files (5 files)

All files now use `${AUDIT_DB}` instead of hardcoded `elite_logs`:

1. **controllers/profileController.js**
   ```javascript
   const { AUDIT_DB } = require('../config/dbNames');
   `INSERT INTO ${AUDIT_DB}.user_activity_log ...`
   ```

2. **controllers/adminProfileController.js**
   ```javascript
   const { AUDIT_DB } = require('../config/dbNames');
   `INSERT INTO ${AUDIT_DB}.user_activity_log ...`
   ```

3. **middleware/profileAccessControl.js**
   ```javascript
   const { AUDIT_DB } = require('../config/dbNames');
   `INSERT INTO ${AUDIT_DB}.user_activity_log ...`
   ```

4. **routes/user.js**
   ```javascript
   const { AUDIT_DB } = require('../config/dbNames');
   `INSERT INTO ${AUDIT_DB}.user_activity_log ...`
   ```

5. **services/passwordService.js**
   ```javascript
   const { AUDIT_DB } = require('../config/dbNames');
   `INSERT INTO ${AUDIT_DB}.user_activity_log ...`
   ```

---

## Migration Script

**Location**: `/elscholar-api/src/migrations/run_user_activity_log_migration.sh`

### Usage
```bash
cd /elscholar-api/src/migrations
./run_user_activity_log_migration.sh
```

### What it does:
1. Reads `DB_NAME` and `AUDIT_DB_NAME` from `.env`
2. Replaces placeholders in SQL file
3. Executes migration
4. Shows verification commands

### Manual execution:
```bash
# From .env: DB_NAME=full_skcooly, AUDIT_DB_NAME=elite_logs
cd /elscholar-api
export $(grep -E "^(DB_NAME|AUDIT_DB_NAME)=" .env | xargs)
sed "s/@MAIN_DB@/$DB_NAME/g; s/@AUDIT_DB@/$AUDIT_DB_NAME/g" \
  src/migrations/move_user_activity_log_to_elite_logs.sql | mysql -u root
```

---

## Benefits

✅ **Environment Agnostic**
- Works in dev (`full_skcooly`) and production (`kirmaskngov_skcooly_db`)
- No code changes needed between environments

✅ **Single Source of Truth**
- Database names defined once in `.env`
- Imported via `dbNames.js` constant

✅ **Migration Safety**
- Script validates `.env` exists
- Shows configuration before running
- Provides verification commands

✅ **Maintainability**
- Easy to add new database constants
- Clear separation of config from code

---

## Testing

### Test 1: Verify constant works
```bash
node -e "console.log(require('./src/config/dbNames'))"
# Output: { MAIN_DB: 'full_skcooly', AUDIT_DB: 'elite_logs', ... }
```

### Test 2: Verify queries work
```bash
curl -X PUT 'http://localhost:34567/users/security-settings' \
  -H 'Content-Type: application/json' \
  -d '{"user_id": 912, "user_type": "teacher", "sms_notifications": true}'
# Should return: {"success": true}
```

### Test 3: Verify logging
```bash
mysql -u root elite_logs -e "SELECT * FROM user_activity_log ORDER BY created_at DESC LIMIT 1;"
# Should show recent activity
```

---

## Production Deployment Checklist

- [ ] Update `.env` with production database names
- [ ] Run migration script: `./run_user_activity_log_migration.sh`
- [ ] Verify data copied: `SELECT COUNT(*) FROM elite_logs.user_activity_log;`
- [ ] Test security settings update
- [ ] Drop old table: `DROP TABLE kirmaskngov_skcooly_db.user_activity_log;`
- [ ] Restart API server

---

## Rollback (if needed)

```bash
# 1. Copy data back
mysql -u root -e "
  CREATE TABLE $DB_NAME.user_activity_log LIKE $AUDIT_DB_NAME.user_activity_log;
  INSERT INTO $DB_NAME.user_activity_log SELECT * FROM $AUDIT_DB_NAME.user_activity_log;
"

# 2. Revert code changes
git checkout HEAD~1 -- src/config/dbNames.js
git checkout HEAD~1 -- src/controllers/profileController.js
git checkout HEAD~1 -- src/controllers/adminProfileController.js
git checkout HEAD~1 -- src/middleware/profileAccessControl.js
git checkout HEAD~1 -- src/routes/user.js
git checkout HEAD~1 -- src/services/passwordService.js
```

---

**Status**: ✅ Complete and Production-Ready  
**Tested**: ✅ Working in development environment  
**Environment-Safe**: ✅ Uses .env for all database names
