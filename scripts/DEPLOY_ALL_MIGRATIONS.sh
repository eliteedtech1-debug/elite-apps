#!/bin/bash

# ============================================================================
# Master Migration Deployment Script
# Created: December 8, 2025
# Description: Deploy all migrations from 48-hour journey
# ============================================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="elite_pts"
DB_USER="root"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Elite Core - Migration Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
  echo -e "${RED}⚠️  Do not run as root${NC}"
  exit 1
fi

# Prompt for password
read -sp "Enter MySQL password for $DB_USER: " DB_PASS
echo ""

# Test connection
echo -e "${YELLOW}Testing database connection...${NC}"
mysql -u"$DB_USER" -p"$DB_PASS" -e "SELECT 1" > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Database connection failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
echo -e "${YELLOW}Creating database backup...${NC}"
mysqldump -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_DIR/backup_$TIMESTAMP.sql"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Backup created: $BACKUP_DIR/backup_$TIMESTAMP.sql${NC}"
else
  echo -e "${RED}✗ Backup failed${NC}"
  exit 1
fi
echo ""

# Function to run migration
run_migration() {
  local file=$1
  local description=$2
  
  if [ ! -f "$file" ]; then
    echo -e "${YELLOW}⚠️  Skipping: $file (not found)${NC}"
    return
  fi
  
  echo -e "${BLUE}Running: $description${NC}"
  mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$file"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Success${NC}"
  else
    echo -e "${RED}✗ Failed${NC}"
    echo -e "${RED}Rolling back...${NC}"
    mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < ROLLBACK_MIGRATION_2025_12_07.sql
    exit 1
  fi
  echo ""
}

# Confirmation
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Ready to deploy migrations to: $DB_NAME${NC}"
echo -e "${YELLOW}Backup location: $BACKUP_DIR/backup_$TIMESTAMP.sql${NC}"
echo -e "${YELLOW}========================================${NC}"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo -e "${RED}Deployment cancelled${NC}"
  exit 0
fi
echo ""

# ============================================================================
# PHASE 1: Core RBAC System (CRITICAL)
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PHASE 1: Core RBAC System${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

run_migration "elscholar-api/src/migrations/PRODUCTION_MIGRATION_2025_12_07.sql" "RBAC Package System"

# Verify Phase 1
echo -e "${YELLOW}Verifying Phase 1...${NC}"
mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < TEST_MIGRATION_2025_12_07.sql
echo ""

# ============================================================================
# PHASE 2: Database Cleanup
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PHASE 2: Database Cleanup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

run_migration "elscholar-api/migrations/20251208021417-drop-v2-tables.sql" "Drop V2 Tables"

# ============================================================================
# PHASE 3: Academic Features
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PHASE 3: Academic Features${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

run_migration "install_GetSectionCASetup_procedure.sql" "CA Setup Procedure"
run_migration "recitations_class_fields_migration.sql" "Recitations Fields"
run_migration "sql/lesson_plans_schema.sql" "Lesson Plans Schema"
run_migration "elscholar-api/migrations/add_is_late_submission_column.sql" "Late Submission Column"

# ============================================================================
# PHASE 4: Bug Fixes
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PHASE 4: Bug Fixes${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

run_migration "elscholar-api/src/migrations/fix_teacher_classes_active_filter.sql" "Teacher Classes Fix"
run_migration "add_expected_life_years.sql" "Asset Depreciation Field"

# ============================================================================
# Final Verification
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Final Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < elscholar-api/src/migrations/VERIFY_MIGRATION.sql

# ============================================================================
# Success
# ============================================================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ ALL MIGRATIONS COMPLETED SUCCESSFULLY${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Restart backend: cd elscholar-api && npm restart"
echo "2. Restart frontend: cd elscholar-ui && npm start"
echo "3. Test RBAC endpoints"
echo "4. Monitor logs for errors"
echo ""
echo -e "${YELLOW}Backup Location:${NC} $BACKUP_DIR/backup_$TIMESTAMP.sql"
echo ""
