# Fix smsWorker.js Merge Conflict on Production

## What Happened
- Production had merge conflicts in `src/queues/smsWorker.js`
- You deleted the file to resolve the conflict
- Local version is clean and working

## Solution: Use Local Version

### Step 1: On Production Server
```bash
# SSH to production
ssh user@production

cd /path/to/elscholar-api

# Remove the deleted file from git tracking
git rm src/queues/smsWorker.js

# Commit the deletion
git commit -m "Remove conflicted smsWorker.js"

# Pull the clean version from origin
git pull origin expirement

# If still conflicts, force use remote version
git checkout --theirs src/queues/smsWorker.js
git add src/queues/smsWorker.js
git commit -m "Resolve smsWorker.js conflict - use remote version"
```

### Step 2: Or Copy Clean File from Local
```bash
# From your LOCAL machine (where it's clean)
scp elscholar-api/src/queues/smsWorker.js user@production:/path/to/elscholar-api/src/queues/

# Then on production
ssh user@production
cd /path/to/elscholar-api
git add src/queues/smsWorker.js
git commit -m "Restore smsWorker.js from clean local copy"
npm run build-server
pm2 restart all
```

### Step 3: Simplest - Force Overwrite
```bash
# On production
cd /path/to/elscholar-api

# Abort any merge in progress
git merge --abort

# Force checkout from remote
git fetch origin
git checkout origin/expirement -- src/queues/smsWorker.js

# Rebuild and restart
npm run build-server
pm2 restart all
```

## Quick Fix (Recommended)
```bash
# On production - just force use the remote version
cd /path/to/elscholar-api
git fetch origin
git checkout origin/expirement -- src/queues/smsWorker.js
git add src/queues/smsWorker.js
git commit -m "Fix: Restore smsWorker.js from remote"
npm run build-server
pm2 restart all
```

## Verify
```bash
# File should exist and be ~800 lines
wc -l src/queues/smsWorker.js

# Should show: 800 src/queues/smsWorker.js

# Check no conflicts
git status

# Should show: nothing to commit, working tree clean
```

---

**The conflict happened because production had local changes that conflicted with the remote. Using `git checkout origin/expirement -- src/queues/smsWorker.js` will force use the remote (clean) version.**
