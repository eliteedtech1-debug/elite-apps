# Restore smsWorker.js on Production

## Problem
The file `src/queues/smsWorker.js` was deleted on production server but exists in the git repository.

## Solution

### Option 1: SSH to Production and Pull
```bash
# SSH to production server
ssh user@your-production-server

# Navigate to API directory
cd /path/to/elscholar-api

# Pull latest changes
git fetch origin
git pull origin expirement

# Verify file exists
ls -lh src/queues/smsWorker.js

# Rebuild
npm run build-server

# Restart services
pm2 restart all
```

### Option 2: Restore Specific File
```bash
# SSH to production
ssh user@your-production-server

# Navigate to API directory
cd /path/to/elscholar-api

# Restore just this file from git
git checkout origin/expirement -- src/queues/smsWorker.js

# Verify
ls -lh src/queues/smsWorker.js

# Rebuild
npm run build-server

# Restart
pm2 restart all
```

### Option 3: Copy from Local
```bash
# From your local machine, copy to production
scp elscholar-api/src/queues/smsWorker.js user@production:/path/to/elscholar-api/src/queues/

# Then SSH and rebuild
ssh user@production
cd /path/to/elscholar-api
npm run build-server
pm2 restart all
```

## Verify File is Restored
```bash
# Check file exists
ls -lh src/queues/smsWorker.js

# Check file content (should be ~800 lines)
wc -l src/queues/smsWorker.js

# Check git status
git status src/queues/smsWorker.js
```

## After Restoration
1. ✅ File should exist: `src/queues/smsWorker.js`
2. ✅ Build directory should have it: `build/queues/smsWorker.js`
3. ✅ SMS queue should work again
4. ✅ No errors in PM2 logs

## Check Logs
```bash
# Check if SMS worker is running
pm2 logs sms-worker

# Should see:
# 🚀 SMS worker is ready and waiting for jobs
```

---

**Quick Command (if you have SSH access):**
```bash
ssh production "cd /path/to/elscholar-api && git checkout origin/expirement -- src/queues/smsWorker.js && npm run build-server && pm2 restart all"
```
