# Manual Setup Steps for elite_db

## Step 1: Create Database
```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS elite_db; CREATE DATABASE elite_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

## Step 2: Import Production Data
```bash
mysql -u root -p elite_db < /Users/apple/Downloads/kirmaskngov_skcooly_db.sql --force
```

**Note:** `--force` flag ignores non-critical errors (like generated column warnings)

## Step 3: Run All Migrations
```bash
cd /Users/apple/Downloads/apps/elite
mysql -u root -p elite_db < RUN_MIGRATIONS.sql
```

## Step 4: Verify
```bash
mysql -u root -p elite_db < TEST_MIGRATION_2025_12_07.sql
```

Should show all ✓ PASS

## Step 5: Update .env
```bash
# Backend
cd elscholar-api
nano .env
# Change: DB_NAME=elite_db

# Restart
npm restart
```

## Done!

Your elite_db is ready with all migrations applied.
