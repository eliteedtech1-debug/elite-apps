#!/bin/bash

# Restore smsWorker.js on Production Server
# Run this on your production server

echo "🔄 Restoring smsWorker.js on production..."

# Navigate to the API directory
cd /path/to/production/elscholar-api

# Pull the latest changes from the expirement branch
git fetch origin
git checkout expirement
git pull origin expirement

# Verify the file exists
if [ -f "src/queues/smsWorker.js" ]; then
    echo "✅ smsWorker.js restored successfully"
    ls -lh src/queues/smsWorker.js
else
    echo "❌ File not found after pull"
    exit 1
fi

# Rebuild if needed
echo "🔨 Rebuilding..."
npm run build-server

# Restart the service
echo "🔄 Restarting services..."
pm2 restart all

echo "✅ Done! smsWorker.js restored and services restarted"
