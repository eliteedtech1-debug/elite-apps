#!/bin/bash

# =====================================================
# Student ID Card Generator - Rollback Procedures
# Phase 1 Deployment - Emergency Rollback Script
# =====================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"
ROLLBACK_LOG="./logs/rollback.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

# Function to create backup before rollback
create_pre_rollback_backup() {
    print_status "Creating pre-rollback backup..."
    
    mkdir -p "$BACKUP_DIR/pre_rollback_$TIMESTAMP"
    
    # Backup database
    if [ -n "$DB_HOST" ] && [ -n "$DB_NAME" ] && [ -n "$DB_USERNAME" ]; then
        print_status "Backing up database..."
        mysqldump -h "$DB_HOST" -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" \
            --single-transaction --routines --triggers \
            > "$BACKUP_DIR/pre_rollback_$TIMESTAMP/database_backup.sql"
        
        if [ $? -eq 0 ]; then
            print_success "Database backup created successfully"
        else
            print_error "Database backup failed"
            return 1
        fi
    fi
    
    # Backup uploaded files
    if [ -d "uploads/id-cards" ]; then
        print_status "Backing up uploaded ID card files..."
        cp -r uploads/id-cards "$BACKUP_DIR/pre_rollback_$TIMESTAMP/"
        print_success "File backup created successfully"
    fi
    
    # Backup configuration
    if [ -f ".env" ]; then
        cp .env "$BACKUP_DIR/pre_rollback_$TIMESTAMP/"
    fi
    
    print_success "Pre-rollback backup completed"
}

# Function to rollback database changes
rollback_database() {
    print_status "Rolling back database changes..."
    
    # Check if rollback SQL exists
    if [ ! -f "deployment/rollback/rollback_id_card_migration.sql" ]; then
        print_error "Rollback SQL file not found"
        return 1
    fi
    
    # Execute rollback SQL
    mysql -h "$DB_HOST" -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" \
        < deployment/rollback/rollback_id_card_migration.sql
    
    if [ $? -eq 0 ]; then
        print_success "Database rollback completed successfully"
    else
        print_error "Database rollback failed"
        return 1
    fi
}

# Function to rollback application code
rollback_application() {
    print_status "Rolling back application code..."
    
    # Stop the application
    print_status "Stopping application..."
    pm2 stop elscholar-api 2>/dev/null || true
    
    # Remove ID Card Generator files
    print_status "Removing ID Card Generator files..."
    
    # Remove controllers
    rm -f src/controllers/IdCardTemplateController.js
    rm -f src/controllers/IdCardGenerationController.js
    
    # Remove services
    rm -f src/services/IdCardService.js
    
    # Remove routes
    rm -f src/routes/idCards.js
    rm -f src/routes/idCardTemplates.js
    rm -f src/routes/idCardGeneration.js
    
    # Remove models (if they were added)
    rm -f src/models/IdCardTemplate.js
    rm -f src/models/IdCardGeneration.js
    
    # Restore original index.js if backup exists
    if [ -f "src/index.js.backup" ]; then
        print_status "Restoring original index.js..."
        mv src/index.js.backup src/index.js
    else
        print_warning "No backup of index.js found. Manual restoration may be required."
    fi
    
    print_success "Application code rollback completed"
}

# Function to rollback dependencies
rollback_dependencies() {
    print_status "Rolling back dependencies..."
    
    # Remove ID Card Generator specific dependencies
    npm uninstall \
        @react-pdf/renderer \
        @react-pdf/fontkit \
        canvas \
        jsbarcode \
        sharp 2>/dev/null || true
    
    # Restore original package.json if backup exists
    if [ -f "package.json.backup" ]; then
        print_status "Restoring original package.json..."
        mv package.json.backup package.json
        npm install
    fi
    
    print_success "Dependencies rollback completed"
}

# Function to cleanup files and directories
cleanup_files() {
    print_status "Cleaning up ID Card Generator files..."
    
    # Remove uploaded ID card files (with confirmation)
    if [ -d "uploads/id-cards" ]; then
        read -p "Remove all uploaded ID card files? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf uploads/id-cards
            print_success "ID card files removed"
        else
            print_warning "ID card files preserved"
        fi
    fi
    
    # Remove temporary directories
    rm -rf tmp/id-card-uploads 2>/dev/null || true
    
    # Remove deployment files
    rm -rf deployment 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Function to restart application
restart_application() {
    print_status "Restarting application..."
    
    # Start the application
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js --env production
    else
        pm2 start src/index.js --name "elscholar-api"
    fi
    
    # Wait for application to start
    sleep 5
    
    # Check if application is running
    if pm2 list | grep -q "elscholar-api.*online"; then
        print_success "Application restarted successfully"
    else
        print_error "Application failed to start"
        return 1
    fi
}

# Function to verify rollback
verify_rollback() {
    print_status "Verifying rollback..."
    
    # Check if ID Card endpoints are no longer accessible
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:34567/api/id-cards/health" | grep -q "404"; then
        print_success "ID Card endpoints successfully removed"
    else
        print_warning "ID Card endpoints may still be accessible"
    fi
    
    # Check database tables
    if mysql -h "$DB_HOST" -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" \
        -e "SHOW TABLES LIKE 'id_card_%';" | grep -q "id_card_"; then
        print_warning "ID Card database tables still exist"
    else
        print_success "ID Card database tables removed"
    fi
    
    print_success "Rollback verification completed"
}

# Main rollback function
perform_rollback() {
    echo "========================================"
    echo "🔄 Student ID Card Generator Rollback"
    echo "========================================"
    echo "This will remove all ID Card Generator components"
    echo "and restore the system to its previous state."
    echo ""
    
    read -p "Are you sure you want to proceed with rollback? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Rollback cancelled by user"
        exit 0
    fi
    
    # Load environment variables
    if [ -f ".env" ]; then
        source .env
    fi
    
    # Create log directory
    mkdir -p logs
    
    # Start rollback process
    echo "$(date): Starting rollback process" >> "$ROLLBACK_LOG"
    
    # Step 1: Create backup
    create_pre_rollback_backup || {
        print_error "Pre-rollback backup failed. Aborting rollback."
        exit 1
    }
    
    # Step 2: Rollback database
    rollback_database || {
        print_error "Database rollback failed. Check logs and restore manually."
        exit 1
    }
    
    # Step 3: Rollback application code
    rollback_application || {
        print_error "Application rollback failed. Manual intervention required."
        exit 1
    }
    
    # Step 4: Rollback dependencies
    rollback_dependencies || {
        print_warning "Dependency rollback had issues. Check package.json manually."
    }
    
    # Step 5: Cleanup files
    cleanup_files
    
    # Step 6: Restart application
    restart_application || {
        print_error "Application restart failed. Manual restart required."
        exit 1
    }
    
    # Step 7: Verify rollback
    verify_rollback
    
    echo ""
    print_success "🎉 Rollback completed successfully!"
    echo ""
    echo "Backup created at: $BACKUP_DIR/pre_rollback_$TIMESTAMP"
    echo "Rollback log: $ROLLBACK_LOG"
    echo ""
    echo "Next steps:"
    echo "1. Verify application functionality"
    echo "2. Check logs for any issues"
    echo "3. Notify stakeholders of rollback completion"
}

# Function to show rollback status
show_rollback_status() {
    echo "========================================"
    echo "📊 Rollback Status Check"
    echo "========================================"
    
    # Check if ID Card tables exist
    if mysql -h "$DB_HOST" -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" \
        -e "SHOW TABLES LIKE 'id_card_%';" 2>/dev/null | grep -q "id_card_"; then
        echo "❌ ID Card database tables still exist"
    else
        echo "✅ ID Card database tables removed"
    fi
    
    # Check if ID Card files exist
    if [ -d "src/controllers" ] && ls src/controllers/IdCard*.js 1> /dev/null 2>&1; then
        echo "❌ ID Card controller files still exist"
    else
        echo "✅ ID Card controller files removed"
    fi
    
    # Check if ID Card routes exist
    if [ -d "src/routes" ] && ls src/routes/idCard*.js 1> /dev/null 2>&1; then
        echo "❌ ID Card route files still exist"
    else
        echo "✅ ID Card route files removed"
    fi
    
    # Check application status
    if pm2 list | grep -q "elscholar-api.*online"; then
        echo "✅ Application is running"
    else
        echo "❌ Application is not running"
    fi
}

# Main script logic
case "${1:-rollback}" in
    "rollback")
        perform_rollback
        ;;
    "status")
        show_rollback_status
        ;;
    "help")
        echo "Usage: $0 [rollback|status|help]"
        echo ""
        echo "Commands:"
        echo "  rollback  - Perform complete rollback of ID Card Generator"
        echo "  status    - Check current rollback status"
        echo "  help      - Show this help message"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac