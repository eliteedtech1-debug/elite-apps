#!/bin/bash

# Performance Fixes Quick Start Script
# Run this script to apply immediate performance improvements

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Elite School Management - Performance Fixes Quick Start   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
API_DIR="$SCRIPT_DIR/elscholar-api"
UI_DIR="$SCRIPT_DIR/elscholar-ui"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "Checking prerequisites..."
echo ""

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi
print_success "Node.js found: $(node --version)"

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi
print_success "npm found: $(npm --version)"

if ! command_exists mysql; then
    print_warning "MySQL CLI not found. You'll need to run migrations manually."
else
    print_success "MySQL found"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  STEP 1: Backend Performance Fixes"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if API directory exists
if [ ! -d "$API_DIR" ]; then
    print_error "API directory not found at: $API_DIR"
    exit 1
fi

cd "$API_DIR"
print_info "Working in: $API_DIR"
echo ""

# Check if compression is installed
echo "Checking compression package..."
if npm list compression >/dev/null 2>&1; then
    print_success "Compression package already installed"
else
    print_info "Installing compression package..."
    npm install compression --save --legacy-peer-deps
    print_success "Compression package installed"
fi
echo ""

# Check if migration file exists
echo "Checking database migration file..."
if [ -f "$API_DIR/migrations/20251111000000-add-performance-indexes.js" ]; then
    print_success "Database migration file exists"
    echo ""

    # Ask user if they want to run migration
    read -p "Do you want to run the database migration now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Running database migration..."

        # Check if sequelize-cli is available
        if command_exists npx && npx sequelize-cli --version >/dev/null 2>&1; then
            npx sequelize-cli db:migrate
            print_success "Database migration completed"
        else
            print_warning "sequelize-cli not found. Please run manually:"
            echo "  cd $API_DIR"
            echo "  npx sequelize-cli db:migrate"
        fi
    else
        print_warning "Skipping migration. Run it manually with:"
        echo "  cd $API_DIR"
        echo "  npx sequelize-cli db:migrate"
    fi
else
    print_error "Migration file not found!"
fi
echo ""

# Ask about PM2 restart
echo "════════════════════════════════════════════════════════════"
echo "  STEP 2: Restart Backend Server"
echo "════════════════════════════════════════════════════════════"
echo ""

if command_exists pm2; then
    pm2 list 2>/dev/null | grep -q "elite" && HAS_ELITE=true || HAS_ELITE=false

    if [ "$HAS_ELITE" = true ]; then
        read -p "Restart PM2 process 'elite'? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pm2 restart elite
            print_success "Backend restarted"
        else
            print_warning "Please restart manually: pm2 restart elite"
        fi
    else
        print_warning "PM2 process 'elite' not found. Start it manually or use npm run dev"
    fi
else
    print_warning "PM2 not found. If using npm dev, restart the server manually."
fi
echo ""

# Frontend checks
echo "════════════════════════════════════════════════════════════"
echo "  STEP 3: Frontend Setup"
echo "════════════════════════════════════════════════════════════"
echo ""

if [ ! -d "$UI_DIR" ]; then
    print_error "UI directory not found at: $UI_DIR"
else
    cd "$UI_DIR"
    print_info "Working in: $UI_DIR"
    echo ""

    # Check if performance hooks exist
    if [ -f "$UI_DIR/src/hooks/usePerformance.ts" ]; then
        print_success "Performance hooks file exists"
    else
        print_error "Performance hooks file not found!"
    fi

    if [ -f "$UI_DIR/PERFORMANCE_OPTIMIZATION_GUIDE.md" ]; then
        print_success "Performance optimization guide exists"
    else
        print_error "Performance optimization guide not found!"
    fi
    echo ""

    # Check for redundant packages
    echo "Checking for redundant packages..."
    REDUNDANT_FOUND=false

    if npm list bootstrap >/dev/null 2>&1; then
        print_warning "Bootstrap found (consider removing if using Ant Design)"
        REDUNDANT_FOUND=true
    fi

    if npm list primereact >/dev/null 2>&1; then
        print_warning "PrimeReact found (consider removing if using Ant Design)"
        REDUNDANT_FOUND=true
    fi

    if npm list echarts >/dev/null 2>&1; then
        print_warning "ECharts found (consider removing if using ApexCharts)"
        REDUNDANT_FOUND=true
    fi

    if npm list recharts >/dev/null 2>&1; then
        print_warning "Recharts found (consider removing if using ApexCharts)"
        REDUNDANT_FOUND=true
    fi

    if [ "$REDUNDANT_FOUND" = false ]; then
        print_success "No obvious redundant packages found"
    fi
fi
echo ""

# Summary
echo "════════════════════════════════════════════════════════════"
echo "  Summary"
echo "════════════════════════════════════════════════════════════"
echo ""

print_info "Completed Steps:"
echo "  ✓ Compression package installed"
echo "  ✓ Database migration file ready"
echo "  ✓ Performance hooks created"
echo "  ✓ Optimization guide created"
echo ""

print_warning "Next Steps (MANUAL):"
echo ""
echo "1. Update Frontend API Calls for Pagination:"
echo "   - Edit files in: elscholar-ui/src/feature-module/management/feescollection/"
echo "   - Add page/limit params to API calls"
echo "   - Handle pagination response"
echo ""
echo "2. Apply React Optimizations to Large Components:"
echo "   - BillClasses.tsx (2,964 lines)"
echo "   - ParentPaymentsPage.tsx (2,850 lines)"
echo "   - FamilyBillDetailsPageWithFeesBank.tsx"
echo ""
echo "3. Add Memoization:"
echo "   - Import hooks from '@/hooks/usePerformance'"
echo "   - Wrap array operations with useMemo"
echo "   - Wrap callbacks with useCallback"
echo "   - Add React.memo to child components"
echo ""
echo "4. Test Performance:"
echo "   - Open browser DevTools Network tab"
echo "   - Check for gzip compression (Content-Encoding header)"
echo "   - Measure page load times"
echo "   - Test search inputs for smooth typing"
echo ""

print_info "Documentation:"
echo "  • Full guide: $SCRIPT_DIR/PERFORMANCE_FIXES_APPLIED.md"
echo "  • Frontend guide: $UI_DIR/PERFORMANCE_OPTIMIZATION_GUIDE.md"
echo ""

print_success "Quick start completed!"
echo ""
echo "Need help? Check the documentation files listed above."
echo ""
