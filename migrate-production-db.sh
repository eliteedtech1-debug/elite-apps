#!/bin/bash

# Database Migration Script
# Restores production backup and applies local changes

set -e

DB_NAME="elitedeploy"
DB_USER="root"
DB_PASS=""
BACKUP_FILE="/Users/apple/Downloads/kirmaskngov_skcooly_db (3).sql"
API_DIR="/Users/apple/Downloads/apps/elite/elscholar-api"

echo "🔄 Starting database migration process..."

# Step 1: Drop and recreate database
echo "📦 Dropping existing database..."
mysql -u$DB_USER -p$DB_PASS -e "DROP DATABASE IF EXISTS $DB_NAME;"
mysql -u$DB_USER -p$DB_PASS -e "CREATE DATABASE $DB_NAME;"

# Step 2: Restore production backup
echo "📥 Restoring production backup..."
mysql -u$DB_USER -p$DB_PASS $DB_NAME -e "SET FOREIGN_KEY_CHECKS=0;"
mysql -u$DB_USER -p$DB_PASS $DB_NAME < "$BACKUP_FILE"
mysql -u$DB_USER -p$DB_PASS $DB_NAME -e "SET FOREIGN_KEY_CHECKS=1;"

# Step 3: Apply migration files
echo "🔧 Applying migration files..."

# RBAC Phase 1 Schema
if [ -f "$API_DIR/src/migrations/20241221_rbac_phase1_schema.sql" ]; then
    echo "  - Applying RBAC Phase 1 schema..."
    mysql -u$DB_USER -p$DB_PASS $DB_NAME < "$API_DIR/src/migrations/20241221_rbac_phase1_schema.sql"
fi

# Simple Account Activation
if [ -f "$API_DIR/src/migrations/simple_account_activation_tables.sql" ]; then
    echo "  - Applying Simple Account Activation tables..."
    mysql -u$DB_USER -p$DB_PASS $DB_NAME < "$API_DIR/src/migrations/simple_account_activation_tables.sql"
fi

# Step 4: Run setup scripts
echo "🚀 Running setup scripts..."

cd "$API_DIR"

# Setup standard plan
if [ -f "src/scripts/setup-standard-plan.js" ]; then
    echo "  - Setting up standard plan..."
    node src/scripts/setup-standard-plan.js
fi

# Populate menu cache
if [ -f "src/scripts/populate-menu-cache.js" ]; then
    echo "  - Populating menu cache..."
    node src/scripts/populate-menu-cache.js
fi

# Step 5: Verify setup
echo "✅ Verifying setup..."
if [ -f "src/scripts/verify-standard-setup.js" ]; then
    node src/scripts/verify-standard-setup.js
fi

echo "🎉 Migration completed successfully!"
echo "📊 Database: $DB_NAME"
echo "🔗 Connection: mysql -u$DB_USER -p$DB_PASS $DB_NAME"
