#!/bin/bash
# Quick Migration Script for Communication Packages Update
# Run this on your deployment server after pulling latest code

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Communication Packages Migration Script ===${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please run this script from the elscholar-api directory"
    exit 1
fi

# Load database credentials from .env
export $(cat .env | grep -E '^DB_' | xargs)

if [ -z "$DB_USERNAME" ] || [ -z "$DB_NAME" ]; then
    echo -e "${RED}Error: Could not load database credentials from .env${NC}"
    exit 1
fi

echo -e "${YELLOW}Database: $DB_NAME${NC}"
echo -e "${YELLOW}Username: $DB_USERNAME${NC}"
echo ""

# Ask for password
echo -e "${YELLOW}Enter database password:${NC}"
read -s DB_PASSWORD
echo ""

# Test database connection
echo "Testing database connection..."
mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT 1;" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Could not connect to database${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Create backup
BACKUP_DIR="/var/backups/mysql"
BACKUP_FILE="$BACKUP_DIR/messaging_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "Creating backup..."
mkdir -p "$BACKUP_DIR"
mysqldump -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" messaging_packages messaging_subscriptions messaging_usage > "$BACKUP_FILE" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠ Backup failed, but continuing...${NC}"
fi
echo ""

# Check if messaging_packages table exists
echo "Checking if messaging_packages table exists..."
TABLE_EXISTS=$(mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='messaging_packages';")

if [ "$TABLE_EXISTS" = "0" ]; then
    echo -e "${YELLOW}Table doesn't exist. Creating fresh...${NC}"

    # Run full migration
    mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" < src/migrations/create_messaging_packages_tables.sql
    echo -e "${GREEN}✓ Tables created with default packages${NC}"
else
    echo -e "${GREEN}✓ Table exists. Updating...${NC}"

    # Step 1: Update enum to include 'annual'
    echo "Adding 'annual' to package_type enum..."
    mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" << EOF
ALTER TABLE messaging_packages
MODIFY COLUMN package_type ENUM('payg', 'termly', 'annual') NOT NULL
COMMENT 'Pay-as-you-go, termly subscription, or annual subscription';
EOF
    echo -e "${GREEN}✓ Enum updated${NC}"

    # Step 2: Update package names and prices
    echo "Updating package names (Bronze→Standard, Silver→Premium, Gold→Elite)..."
    mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" < database-samples/update_to_standard_premium_elite.sql > /dev/null 2>&1
    echo -e "${GREEN}✓ Package names and prices updated${NC}"

    # Step 3: Check if annual packages exist
    echo "Checking for annual packages..."
    ANNUAL_COUNT=$(mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM messaging_packages WHERE package_type='annual';")

    if [ "$ANNUAL_COUNT" = "0" ]; then
        echo "Inserting annual packages..."
        mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" << 'EOF'
-- SMS Annual Packages
INSERT INTO messaging_packages (package_name, service_type, package_type, messages_per_term, unit_cost, package_cost, description, is_active) VALUES
('Standard', 'sms', 'annual', 1500, 4.2500, 6375.0000, 'Standard: 1,500 SMS per year at ₦4.25/msg (15% discount) - Total: ₦6,375', 1),
('Premium', 'sms', 'annual', 4500, 4.2500, 19125.0000, 'Premium: 4,500 SMS per year at ₦4.25/msg (15% discount) - Total: ₦19,125', 1),
('Elite', 'sms', 'annual', 9000, 4.2500, 38250.0000, 'Elite: 9,000 SMS per year at ₦4.25/msg (15% discount) - Total: ₦38,250', 1);

-- WhatsApp Annual Packages
INSERT INTO messaging_packages (package_name, service_type, package_type, messages_per_term, unit_cost, package_cost, description, is_active) VALUES
('Standard', 'whatsapp', 'annual', 1500, 1.7000, 2550.0000, 'Standard: 1,500 WhatsApp per year at ₦1.70/msg (15% discount) - Total: ₦2,550', 1),
('Premium', 'whatsapp', 'annual', 4500, 1.7000, 7650.0000, 'Premium: 4,500 WhatsApp per year at ₦1.70/msg (15% discount) - Total: ₦7,650', 1),
('Elite', 'whatsapp', 'annual', 9000, 1.7000, 15300.0000, 'Elite: 9,000 WhatsApp per year at ₦1.70/msg (15% discount) - Total: ₦15,300', 1);
EOF
        echo -e "${GREEN}✓ Annual packages added${NC}"
    else
        echo -e "${GREEN}✓ Annual packages already exist ($ANNUAL_COUNT packages)${NC}"
    fi

    # Step 4: Convert to UTF8MB4
    echo "Converting to UTF8MB4..."
    mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" -e "ALTER TABLE messaging_packages CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
    echo -e "${GREEN}✓ Character set updated${NC}"
fi

echo ""
echo -e "${GREEN}=== Migration Summary ===${NC}"

# Show package summary
mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" << 'EOF'
SELECT
    CONCAT('Total Packages: ', COUNT(*)) as summary
FROM messaging_packages
UNION ALL
SELECT CONCAT(package_type, ': ', COUNT(*), ' packages')
FROM messaging_packages
GROUP BY package_type
ORDER BY summary;
EOF

echo ""
echo -e "${GREEN}=== Verification ===${NC}"

# Check for old names
OLD_NAMES=$(mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM messaging_packages WHERE package_name LIKE '%Bronze%' OR package_name LIKE '%Silver%' OR package_name LIKE '%Gold%';")

if [ "$OLD_NAMES" = "0" ]; then
    echo -e "${GREEN}✓ No old package names found${NC}"
else
    echo -e "${YELLOW}⚠ Warning: $OLD_NAMES packages still have old names${NC}"
fi

# Show SMS pricing
echo ""
echo "SMS Pricing:"
mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT package_name, package_type, unit_cost, package_cost FROM messaging_packages WHERE service_type='sms' ORDER BY package_type, unit_cost DESC;"

echo ""
echo "WhatsApp Pricing:"
mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT package_name, package_type, unit_cost, package_cost FROM messaging_packages WHERE service_type='whatsapp' ORDER BY package_type, unit_cost DESC;"

echo ""
echo -e "${GREEN}=== Migration Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Restart your application: ${YELLOW}pm2 restart elite${NC}"
echo "2. Clear browser cache and test the Communication Setup page"
echo "3. Verify that packages show as: Standard, Premium, Elite"
echo ""
echo "Backup location: ${YELLOW}$BACKUP_FILE${NC}"
