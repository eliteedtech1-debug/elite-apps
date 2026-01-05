#!/bin/bash

# =====================================================
# Student ID Card Generator - Backup Strategy
# Phase 1 Deployment - Automated Backup System
# =====================================================

set -e

# Configuration
BACKUP_BASE_DIR="./backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_ONLY=$(date +"%Y%m%d")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
LOG_FILE="./logs/backup_${DATE_ONLY}.log"
mkdir -p logs

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
    log "INFO: $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    log "SUCCESS: $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log "WARNING: $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log "ERROR: $1"
}

# Load environment variables
load_env() {
    if [ -f ".env" ]; then
        source .env
        print_status "Environment variables loaded"
    else
        print_error ".env file not found"
        exit 1
    fi
}

# Create backup directory structure
create_backup_structure() {
    local backup_dir="$BACKUP_BASE_DIR/$TIMESTAMP"
    mkdir -p "$backup_dir"/{database,files,config,logs}
    echo "$backup_dir"
}

# Backup database
backup_database() {
    local backup_dir="$1"
    print_status "Starting database backup..."
    
    if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USERNAME" ]; then
        print_error "Database configuration not found in environment"
        return 1
    fi
    
    # Full database backup
    local db_backup_file="$backup_dir/database/full_backup_$TIMESTAMP.sql"
    mysqldump -h "$DB_HOST" -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --add-drop-table \
        --add-locks \
        --disable-keys \
        --extended-insert \
        --quick \
        --lock-tables=false \
        > "$db_backup_file"
    
    if [ $? -eq 0 ]; then
        print_success "Full database backup completed: $(basename "$db_backup_file")"
        
        # Compress the backup
        gzip "$db_backup_file"
        print_success "Database backup compressed"
    else
        print_error "Database backup failed"
        return 1
    fi
    
    # ID Card specific tables backup
    local id_card_backup_file="$backup_dir/database/id_card_tables_$TIMESTAMP.sql"
    mysqldump -h "$DB_HOST" -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" \
        --single-transaction \
        --routines \
        --triggers \
        id_card_templates \
        template_elements \
        school_branding \
        generated_id_cards \
        template_audit_log \
        > "$id_card_backup_file" 2>/dev/null || {
        print_warning "ID Card tables backup failed (tables may not exist yet)"
        rm -f "$id_card_backup_file"
    }
    
    if [ -f "$id_card_backup_file" ]; then
        gzip "$id_card_backup_file"
        print_success "ID Card tables backup completed"
    fi
}

# Backup files
backup_files() {
    local backup_dir="$1"
    print_status "Starting file backup..."
    
    # Backup ID Card uploads
    if [ -d "uploads/id-cards" ]; then
        print_status "Backing up ID card files..."
        cp -r uploads/id-cards "$backup_dir/files/"
        
        # Count files
        local file_count=$(find uploads/id-cards -type f | wc -l)
        print_success "Backed up $file_count ID card files"
    else
        print_warning "ID card uploads directory not found"
    fi
    
    # Backup other upload directories
    if [ -d "uploads" ]; then
        print_status "Backing up other upload files..."
        rsync -av --exclude='id-cards' uploads/ "$backup_dir/files/other_uploads/" 2>/dev/null || true
    fi
    
    # Backup logs
    if [ -d "logs" ]; then
        print_status "Backing up log files..."
        cp -r logs "$backup_dir/"
        
        # Only keep recent logs in backup
        find "$backup_dir/logs" -name "*.log" -mtime +7 -delete 2>/dev/null || true
    fi
}

# Backup configuration
backup_configuration() {
    local backup_dir="$1"
    print_status "Starting configuration backup..."
    
    # Backup environment files
    for env_file in .env .env.production .env.staging .env.local; do
        if [ -f "$env_file" ]; then
            cp "$env_file" "$backup_dir/config/"
            print_success "Backed up $env_file"
        fi
    done
    
    # Backup package files
    for pkg_file in package.json package-lock.json yarn.lock; do
        if [ -f "$pkg_file" ]; then
            cp "$pkg_file" "$backup_dir/config/"
        fi
    done
    
    # Backup PM2 ecosystem
    if [ -f "ecosystem.config.js" ]; then
        cp ecosystem.config.js "$backup_dir/config/"
        print_success "Backed up PM2 configuration"
    fi
    
    # Backup deployment scripts
    if [ -d "deployment" ]; then
        cp -r deployment "$backup_dir/config/"
        print_success "Backed up deployment scripts"
    fi
}

# Create backup manifest
create_backup_manifest() {
    local backup_dir="$1"
    local manifest_file="$backup_dir/backup_manifest.json"
    
    cat > "$manifest_file" << EOF
{
  "backup_timestamp": "$TIMESTAMP",
  "backup_date": "$(date -Iseconds)",
  "backup_type": "full",
  "environment": "${NODE_ENV:-development}",
  "database": {
    "host": "$DB_HOST",
    "name": "$DB_NAME",
    "backup_files": [
      $(ls "$backup_dir/database"/*.gz 2>/dev/null | sed 's/.*\///' | sed 's/^/"/' | sed 's/$/"/' | tr '\n' ',' | sed 's/,$//')
    ]
  },
  "files": {
    "id_card_files": $(find "$backup_dir/files/id-cards" -type f 2>/dev/null | wc -l || echo 0),
    "other_files": $(find "$backup_dir/files/other_uploads" -type f 2>/dev/null | wc -l || echo 0),
    "log_files": $(find "$backup_dir/logs" -type f 2>/dev/null | wc -l || echo 0)
  },
  "configuration": {
    "env_files": [
      $(ls "$backup_dir/config"/.env* 2>/dev/null | sed 's/.*\///' | sed 's/^/"/' | sed 's/$/"/' | tr '\n' ',' | sed 's/,$//')
    ],
    "package_files": [
      $(ls "$backup_dir/config"/package*.json "$backup_dir/config"/yarn.lock 2>/dev/null | sed 's/.*\///' | sed 's/^/"/' | sed 's/$/"/' | tr '\n' ',' | sed 's/,$//')
    ]
  },
  "backup_size": "$(du -sh "$backup_dir" | cut -f1)",
  "backup_path": "$backup_dir"
}
EOF
    
    print_success "Backup manifest created"
}

# Cleanup old backups
cleanup_old_backups() {
    print_status "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    if [ -d "$BACKUP_BASE_DIR" ]; then
        find "$BACKUP_BASE_DIR" -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
        
        local remaining_backups=$(find "$BACKUP_BASE_DIR" -maxdepth 1 -type d | wc -l)
        print_success "Cleanup completed. $remaining_backups backup directories remaining"
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_dir="$1"
    print_status "Verifying backup integrity..."
    
    local errors=0
    
    # Check database backup
    if [ ! -f "$backup_dir/database/full_backup_$TIMESTAMP.sql.gz" ]; then
        print_error "Database backup file missing"
        ((errors++))
    else
        # Test gzip integrity
        if ! gzip -t "$backup_dir/database/full_backup_$TIMESTAMP.sql.gz"; then
            print_error "Database backup file is corrupted"
            ((errors++))
        fi
    fi
    
    # Check manifest
    if [ ! -f "$backup_dir/backup_manifest.json" ]; then
        print_error "Backup manifest missing"
        ((errors++))
    else
        # Validate JSON
        if ! python3 -m json.tool "$backup_dir/backup_manifest.json" > /dev/null 2>&1; then
            print_error "Backup manifest is invalid JSON"
            ((errors++))
        fi
    fi
    
    if [ $errors -eq 0 ]; then
        print_success "Backup verification passed"
        return 0
    else
        print_error "Backup verification failed with $errors errors"
        return 1
    fi
}

# Send backup notification
send_notification() {
    local backup_dir="$1"
    local status="$2"
    
    if [ "$status" = "success" ]; then
        local message="✅ ID Card Generator backup completed successfully"
    else
        local message="❌ ID Card Generator backup failed"
    fi
    
    # Log notification
    log "NOTIFICATION: $message - Backup: $backup_dir"
    
    # Add webhook notification here if needed
    # curl -X POST "$WEBHOOK_URL" -d "{\"text\":\"$message\"}"
}

# Main backup function
perform_backup() {
    echo "========================================"
    echo "💾 Student ID Card Generator Backup"
    echo "========================================"
    
    load_env
    
    local backup_dir=$(create_backup_structure)
    print_status "Created backup directory: $backup_dir"
    
    # Perform backup steps
    if backup_database "$backup_dir" && \
       backup_files "$backup_dir" && \
       backup_configuration "$backup_dir"; then
        
        create_backup_manifest "$backup_dir"
        
        if verify_backup "$backup_dir"; then
            cleanup_old_backups
            send_notification "$backup_dir" "success"
            
            print_success "🎉 Backup completed successfully!"
            echo ""
            echo "Backup location: $backup_dir"
            echo "Backup size: $(du -sh "$backup_dir" | cut -f1)"
            echo "Manifest: $backup_dir/backup_manifest.json"
            
            return 0
        else
            send_notification "$backup_dir" "failed"
            print_error "Backup verification failed"
            return 1
        fi
    else
        send_notification "$backup_dir" "failed"
        print_error "Backup process failed"
        return 1
    fi
}

# List available backups
list_backups() {
    echo "========================================"
    echo "📋 Available Backups"
    echo "========================================"
    
    if [ ! -d "$BACKUP_BASE_DIR" ]; then
        print_warning "No backup directory found"
        return 0
    fi
    
    local backup_count=0
    for backup_dir in "$BACKUP_BASE_DIR"/*/; do
        if [ -d "$backup_dir" ]; then
            local manifest="$backup_dir/backup_manifest.json"
            if [ -f "$manifest" ]; then
                local timestamp=$(basename "$backup_dir")
                local size=$(du -sh "$backup_dir" | cut -f1)
                local date=$(date -d "${timestamp:0:8} ${timestamp:9:2}:${timestamp:11:2}:${timestamp:13:2}" 2>/dev/null || echo "Unknown")
                
                echo "📦 Backup: $timestamp"
                echo "   Date: $date"
                echo "   Size: $size"
                echo "   Path: $backup_dir"
                echo ""
                
                ((backup_count++))
            fi
        fi
    done
    
    if [ $backup_count -eq 0 ]; then
        print_warning "No valid backups found"
    else
        print_success "Found $backup_count backup(s)"
    fi
}

# Restore from backup
restore_backup() {
    local backup_timestamp="$1"
    
    if [ -z "$backup_timestamp" ]; then
        print_error "Backup timestamp required for restore"
        echo "Usage: $0 restore YYYYMMDD_HHMMSS"
        list_backups
        return 1
    fi
    
    local backup_dir="$BACKUP_BASE_DIR/$backup_timestamp"
    
    if [ ! -d "$backup_dir" ]; then
        print_error "Backup not found: $backup_dir"
        return 1
    fi
    
    echo "========================================"
    echo "🔄 Restoring from Backup"
    echo "========================================"
    echo "Backup: $backup_timestamp"
    echo "Path: $backup_dir"
    echo ""
    
    read -p "Are you sure you want to restore from this backup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Restore cancelled by user"
        return 0
    fi
    
    # Create pre-restore backup
    print_status "Creating pre-restore backup..."
    perform_backup
    
    load_env
    
    # Restore database
    if [ -f "$backup_dir/database/full_backup_$backup_timestamp.sql.gz" ]; then
        print_status "Restoring database..."
        gunzip -c "$backup_dir/database/full_backup_$backup_timestamp.sql.gz" | \
            mysql -h "$DB_HOST" -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME"
        
        if [ $? -eq 0 ]; then
            print_success "Database restored successfully"
        else
            print_error "Database restore failed"
            return 1
        fi
    fi
    
    # Restore files
    if [ -d "$backup_dir/files/id-cards" ]; then
        print_status "Restoring ID card files..."
        rm -rf uploads/id-cards
        cp -r "$backup_dir/files/id-cards" uploads/
        print_success "ID card files restored"
    fi
    
    print_success "🎉 Restore completed successfully!"
}

# Main script logic
case "${1:-backup}" in
    "backup")
        perform_backup
        ;;
    "list")
        list_backups
        ;;
    "restore")
        restore_backup "$2"
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "help")
        echo "Usage: $0 [backup|list|restore|cleanup|help]"
        echo ""
        echo "Commands:"
        echo "  backup           - Perform full backup (default)"
        echo "  list             - List available backups"
        echo "  restore <timestamp> - Restore from specific backup"
        echo "  cleanup          - Remove old backups"
        echo "  help             - Show this help message"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac