#!/bin/bash

# ============================================================================
# Setup elite_db from Production Copy
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DB_USER="root"
SOURCE_SQL="/Users/apple/Downloads/kirmaskngov_skcooly_db.sql"
NEW_DB="elite_db"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Setup elite_db from Production${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check source file exists
if [ ! -f "$SOURCE_SQL" ]; then
  echo -e "${RED}✗ Source file not found: $SOURCE_SQL${NC}"
  exit 1
fi

read -sp "Enter MySQL password for $DB_USER: " DB_PASS
echo ""

# Test connection
echo -e "${YELLOW}Testing database connection...${NC}"
mysql -u"$DB_USER" -p"$DB_PASS" -e "SELECT 1" > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Database connection failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Connected${NC}"
echo ""

# Drop if exists
echo -e "${YELLOW}Dropping existing elite_db (if exists)...${NC}"
mysql -u"$DB_USER" -p"$DB_PASS" -e "DROP DATABASE IF EXISTS $NEW_DB"
echo -e "${GREEN}✓ Done${NC}"
echo ""

# Create new database
echo -e "${YELLOW}Creating $NEW_DB...${NC}"
mysql -u"$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE $NEW_DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
echo -e "${GREEN}✓ Database created${NC}"
echo ""

# Import production data
echo -e "${YELLOW}Importing production data (this may take a while)...${NC}"
(
  echo "SET FOREIGN_KEY_CHECKS=0;"
  echo "SET SESSION sql_mode = '';"
  cat "$SOURCE_SQL"
  echo "SET FOREIGN_KEY_CHECKS=1;"
) | mysql -u"$DB_USER" -p"$DB_PASS" "$NEW_DB" --force
echo -e "${GREEN}✓ Data imported${NC}"
echo ""

# Create backup
mkdir -p "$BACKUP_DIR"
echo -e "${YELLOW}Creating backup before migrations...${NC}"
mysqldump -u"$DB_USER" -p"$DB_PASS" "$NEW_DB" > "$BACKUP_DIR/elite_db_before_migration_$TIMESTAMP.sql"
echo -e "${GREEN}✓ Backup: $BACKUP_DIR/elite_db_before_migration_$TIMESTAMP.sql${NC}"
echo ""

# Run migrations
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Running Migrations${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

run_migration() {
  local file=$1
  local desc=$2
  
  if [ ! -f "$file" ]; then
    echo -e "${YELLOW}⚠️  Skip: $file (not found)${NC}"
    return
  fi
  
  echo -e "${BLUE}→ $desc${NC}"
  mysql -u"$DB_USER" -p"$DB_PASS" "$NEW_DB" < "$file" 2>&1 | grep -v "MallocStackLogging" || true
  
  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✓ Success${NC}"
  else
    echo -e "${RED}✗ Failed${NC}"
    exit 1
  fi
  echo ""
}

# Phase 1: RBAC
echo -e "${YELLOW}PHASE 1: RBAC System${NC}"
run_migration "elscholar-api/src/migrations/PRODUCTION_MIGRATION_2025_12_07.sql" "RBAC Package System"

# Phase 2: Cleanup
echo -e "${YELLOW}PHASE 2: Database Cleanup${NC}"
run_migration "elscholar-api/migrations/20251208021417-drop-v2-tables.sql" "Drop V2 Tables"

# Phase 3: Academic
echo -e "${YELLOW}PHASE 3: Academic Features${NC}"
run_migration "install_GetSectionCASetup_procedure.sql" "CA Setup Procedure"
run_migration "recitations_class_fields_migration.sql" "Recitations Fields"
run_migration "sql/lesson_plans_schema.sql" "Lesson Plans Schema"
run_migration "elscholar-api/migrations/add_is_late_submission_column.sql" "Late Submission"

# Phase 4: Fixes
echo -e "${YELLOW}PHASE 4: Bug Fixes${NC}"
run_migration "elscholar-api/src/migrations/fix_teacher_classes_active_filter.sql" "Teacher Classes"
run_migration "add_expected_life_years.sql" "Asset Depreciation"

# Verify
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

mysql -u"$DB_USER" -p"$DB_PASS" "$NEW_DB" < TEST_MIGRATION_2025_12_07.sql 2>&1 | grep -v "MallocStackLogging" || true

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ elite_db Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Database: $NEW_DB${NC}"
echo -e "${YELLOW}Backup: $BACKUP_DIR/elite_db_before_migration_$TIMESTAMP.sql${NC}"
echo ""
echo -e "${YELLOW}Update .env file:${NC}"
echo "DB_NAME=elite_db"
echo ""
