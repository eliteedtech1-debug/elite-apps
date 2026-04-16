# Production Server Troubleshooting

## Issue: Server Crash Loop After Migration

### Symptoms
```
(node:194035) Warning: Accessing non-existent property 'sequelize' of module exports inside circular dependency
It is highly recommended to use a minimum Redis version of 6.2.0
```

Server keeps restarting infinitely.

---

## Quick Fixes

### 1. Check PM2 Logs
```bash
pm2 logs elite --lines 100
```

Look for the actual error causing crash (after the warnings).

### 2. Stop PM2 and Test Manually
```bash
pm2 stop elite
cd /path/to/elscholar-api
node src/index.js
```

This will show the real error without PM2 restarting.

### 3. Common Causes

#### A. Missing Tables (Unlikely - migration succeeded)
```bash
mysql -h 62.72.0.209 -u kirmaskngov_skcooly -p kirmaskngov_skcooly_db -e "SHOW TABLES LIKE '%rbac%';"
```

Should show: rbac_school_packages

#### B. Model Circular Dependency (Warning only - not fatal)
The warning is normal and doesn't cause crashes. Ignore it.

#### C. Redis Connection Issue
```bash
# Check if Redis is running
redis-cli ping
```

If Redis fails, either:
- Start Redis: `redis-server`
- Or disable Redis features in code

#### D. Database Connection
```bash
# Test connection
mysql -h 62.72.0.209 -u kirmaskngov_skcooly -p kirmaskngov_skcooly_db -e "SELECT 1;"
```

#### E. Port Already in Use
```bash
# Check if port 34567 is in use
lsof -i :34567
# Or
netstat -tulpn | grep 34567
```

Kill the process if needed:
```bash
kill -9 <PID>
```

---

## Step-by-Step Debug

### Step 1: Get Full Error
```bash
pm2 stop elite
pm2 delete elite
cd /path/to/elscholar-api
NODE_ENV=production node src/index.js 2>&1 | tee server-error.log
```

### Step 2: Check for Missing Dependencies
```bash
npm install
```

### Step 3: Check .env File
```bash
cat .env | grep -E "DB_|PORT|REDIS"
```

Verify:
- DB_NAME=kirmaskngov_skcooly_db
- DB_HOST=62.72.0.209
- DB_USERNAME=kirmaskngov_skcooly
- PORT=34567

### Step 4: Test Database Connection
```bash
node -e "
const mysql = require('mysql2/promise');
require('dotenv').config();
mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}).then(() => console.log('✓ DB Connected')).catch(e => console.error('✗ DB Error:', e.message));
"
```

### Step 5: Check for Syntax Errors
```bash
node --check src/index.js
```

---

## Most Likely Cause

Based on the symptoms, the issue is probably:

1. **Port conflict** - Another process using port 34567
2. **Database max connections** - Too many connections open
3. **Missing environment variable** - Check .env file
4. **Redis not running** - If app requires Redis

---

## Quick Recovery

If you need to get the server running immediately:

```bash
# 1. Stop everything
pm2 stop all
pm2 delete all

# 2. Kill any hanging processes
pkill -f "node.*elite"

# 3. Restart MySQL (if needed)
systemctl restart mysql

# 4. Start fresh
cd /path/to/elscholar-api
pm2 start src/index.js --name elite --max-memory-restart 1G

# 5. Monitor
pm2 logs elite
```

---

## If Migration Caused Issues

### Rollback (Last Resort)
```bash
mysql -h 62.72.0.209 -u kirmaskngov_skcooly -p kirmaskngov_skcooly_db < /path/to/backup_before_migration.sql
```

### Or Just Drop New Tables
```bash
mysql -h 62.72.0.209 -u kirmaskngov_skcooly -p kirmaskngov_skcooly_db -e "
DROP TABLE IF EXISTS recitation_feedbacks;
DROP TABLE IF EXISTS recitation_replies;
DROP TABLE IF EXISTS recitations;
DROP TABLE IF EXISTS teacher_classes;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS facility_rooms;
DROP TABLE IF EXISTS asset_categories;
DROP TABLE IF EXISTS rbac_school_packages;
"
```

---

## Contact Support

If none of the above works, provide:
1. Full PM2 logs: `pm2 logs elite --lines 200 > error.log`
2. Server error log from Step 1
3. Database connection test result
4. Output of `pm2 list`

---

## Prevention

After fixing, add to PM2 config:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'elite',
    script: 'src/index.js',
    instances: 1,
    max_memory_restart: '1G',
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_restarts: 10,
    min_uptime: '10s',
    autorestart: true,
    watch: false
  }]
};
```

Then: `pm2 start ecosystem.config.js`
