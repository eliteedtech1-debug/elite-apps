#!/bin/bash

# ==============================================================================
# RBAC System Setup Script
# Elite Core - Top-Tier Role-Based Access Control
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_USER="${DB_USERNAME:-root}"
DB_PASS="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-elite_db}"
DB_HOST="${DB_HOST:-localhost}"

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║   🔐 RBAC System Setup - Elite Core                  ║"
echo "║   Top-Tier Role-Based Access Control                    ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to print step
print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✔ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✖ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if MySQL is installed
print_step "Checking MySQL installation..."
if ! command -v mysql &> /dev/null; then
    print_error "MySQL is not installed or not in PATH"
    exit 1
fi
print_success "MySQL found"

# Check if database exists
print_step "Checking database '$DB_NAME'..."
if mysql -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -h "$DB_HOST" -e "USE $DB_NAME" 2>/dev/null; then
    print_success "Database '$DB_NAME' exists"
else
    print_error "Database '$DB_NAME' not found"
    exit 1
fi

# Create backup
print_step "Creating database backup..."
BACKUP_FILE="backup_rbac_$(date +%Y%m%d_%H%M%S).sql"
mysqldump -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -h "$DB_HOST" "$DB_NAME" \
    roles permissions user_roles role_permissions 2>/dev/null > "$BACKUP_FILE" || true
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    print_success "Backup created: $BACKUP_FILE"
else
    print_warning "No existing RBAC tables to backup (this is OK for first install)"
    rm -f "$BACKUP_FILE"
fi

# Run migrations
echo ""
print_step "Running complete RBAC migration..."

# Single comprehensive migration file
if [ -f "migrations/RBAC_COMPLETE_MIGRATION.sql" ]; then
    print_step "  Running RBAC_COMPLETE_MIGRATION.sql..."
    mysql -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -h "$DB_HOST" "$DB_NAME" \
        < migrations/RBAC_COMPLETE_MIGRATION.sql
    print_success "  Complete migration executed successfully"
elif [ -f "migrations/001_create_rbac_tables.sql" ]; then
    # Fallback to individual migration files
    print_step "  [1/3] Creating RBAC tables..."
    mysql -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -h "$DB_HOST" "$DB_NAME" \
        < migrations/001_create_rbac_tables.sql
    print_success "  Tables created successfully"

    if [ -f "migrations/002_seed_rbac_default_data.sql" ]; then
        print_step "  [2/3] Seeding default roles and permissions..."
        mysql -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -h "$DB_HOST" "$DB_NAME" \
            < migrations/002_seed_rbac_default_data.sql
        print_success "  Default data seeded successfully"
    fi

    if [ -f "migrations/003_upgrade_existing_rbac_tables.sql" ]; then
        print_step "  [3/3] Upgrading existing RBAC tables..."
        mysql -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -h "$DB_HOST" "$DB_NAME" \
            < migrations/003_upgrade_existing_rbac_tables.sql
        print_success "  Existing tables upgraded successfully"
    fi
else
    print_error "No migration files found!"
    exit 1
fi

echo ""
print_success "Database migrations completed successfully!"

# Verify installation
echo ""
print_step "Verifying installation..."

ROLE_COUNT=$(mysql -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -h "$DB_HOST" "$DB_NAME" \
    -se "SELECT COUNT(*) FROM roles" 2>/dev/null || echo "0")
PERM_COUNT=$(mysql -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -h "$DB_HOST" "$DB_NAME" \
    -se "SELECT COUNT(*) FROM permissions" 2>/dev/null || echo "0")
ROLE_PERM_COUNT=$(mysql -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -h "$DB_HOST" "$DB_NAME" \
    -se "SELECT COUNT(*) FROM role_permissions" 2>/dev/null || echo "0")

echo ""
echo -e "${GREEN}📊 Installation Summary:${NC}"
echo "  • Roles created: $ROLE_COUNT"
echo "  • Permissions created: $PERM_COUNT"
echo "  • Role-Permission mappings: $ROLE_PERM_COUNT"

if [ "$ROLE_COUNT" -gt 0 ] && [ "$PERM_COUNT" -gt 0 ]; then
    print_success "RBAC system installed successfully!"
else
    print_error "Installation may have issues. Check the migration output above."
    exit 1
fi

# Restart backend server
echo ""
print_step "Restarting backend server..."
if [ -d "elscholar-api" ]; then
    cd elscholar-api

    # Check if PM2 is running the app
    if pm2 list 2>/dev/null | grep -q "elite"; then
        print_step "  Restarting with PM2..."
        pm2 restart elite
        print_success "  PM2 app restarted"
    else
        print_warning "  PM2 app 'elite' not found. Please restart manually with:"
        echo "    cd elscholar-api && yarn dev"
    fi

    cd ..
else
    print_warning "  elscholar-api directory not found. Please restart server manually."
fi

# Print next steps
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  🎉 Setup Complete!                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo "  1. Update Teacher List UI:"
echo "     • Add RoleAssignmentModal import"
echo "     • Add 'Assign Roles' to action dropdown"
echo ""
echo "  2. Test the API:"
echo "     curl http://localhost:34567/api/rbac/roles \\"
echo "       -H 'x-school-id: SCH/1'"
echo ""
echo "  3. View the Implementation Guide:"
echo "     cat RBAC_IMPLEMENTATION_GUIDE.md"
echo ""
echo "  4. Check server logs:"
echo "     pm2 logs elite"
echo ""
echo -e "${YELLOW}📖 For detailed instructions, read:${NC}"
echo "     RBAC_IMPLEMENTATION_GUIDE.md"
echo ""

print_success "RBAC system is ready to use! 🚀"
