#!/bin/bash

# Modularization Setup Script
# Creates directory structure for domain-driven architecture

set -e

echo "🏗️  Elite Scholar Modularization Setup"
echo "======================================"
echo ""

# Base directory
BASE_DIR="elscholar-api/src"

# Create directory structure
echo "📁 Creating directory structure..."

# Models
mkdir -p "$BASE_DIR/models/core"
mkdir -p "$BASE_DIR/models/audit"
mkdir -p "$BASE_DIR/models/bot"
mkdir -p "$BASE_DIR/models/hr"
mkdir -p "$BASE_DIR/models/finance"
mkdir -p "$BASE_DIR/models/academic"
mkdir -p "$BASE_DIR/models/content"
mkdir -p "$BASE_DIR/models/cbt"

# Controllers
mkdir -p "$BASE_DIR/controllers/core"
mkdir -p "$BASE_DIR/controllers/audit"
mkdir -p "$BASE_DIR/controllers/bot"
mkdir -p "$BASE_DIR/controllers/hr"
mkdir -p "$BASE_DIR/controllers/finance"
mkdir -p "$BASE_DIR/controllers/academic"
mkdir -p "$BASE_DIR/controllers/content"
mkdir -p "$BASE_DIR/controllers/cbt"

# Routes
mkdir -p "$BASE_DIR/routes/core"
mkdir -p "$BASE_DIR/routes/audit"
mkdir -p "$BASE_DIR/routes/bot"
mkdir -p "$BASE_DIR/routes/hr"
mkdir -p "$BASE_DIR/routes/finance"
mkdir -p "$BASE_DIR/routes/academic"
mkdir -p "$BASE_DIR/routes/content"
mkdir -p "$BASE_DIR/routes/cbt"

# Services
mkdir -p "$BASE_DIR/services/core"
mkdir -p "$BASE_DIR/services/audit"
mkdir -p "$BASE_DIR/services/bot"
mkdir -p "$BASE_DIR/services/hr"
mkdir -p "$BASE_DIR/services/finance"
mkdir -p "$BASE_DIR/services/academic"
mkdir -p "$BASE_DIR/services/content"
mkdir -p "$BASE_DIR/services/cbt"

echo "✅ Directory structure created"
echo ""

# Create placeholder index files
echo "📝 Creating index files..."

# Models index files
for domain in core audit bot hr finance academic content cbt; do
  cat > "$BASE_DIR/models/$domain/index.js" << 'EOF'
// TODO: Import and export models for this domain
// Example:
// const Model1 = require('./Model1');
// const Model2 = require('./Model2');
// module.exports = { Model1, Model2 };

module.exports = {};
EOF
done

# Controllers index files
for domain in core audit bot hr finance academic content cbt; do
  cat > "$BASE_DIR/controllers/$domain/.gitkeep" << 'EOF'
EOF
done

# Routes index files
for domain in core audit bot hr finance academic content cbt; do
  cat > "$BASE_DIR/routes/$domain/.gitkeep" << 'EOF'
EOF
done

# Services index files
for domain in core audit bot hr finance academic content cbt; do
  cat > "$BASE_DIR/services/$domain/.gitkeep" << 'EOF'
EOF
done

echo "✅ Index files created"
echo ""

# Create README files for each domain
echo "📚 Creating domain README files..."

domains=("core" "audit" "bot" "hr" "finance" "academic" "content" "cbt")
descriptions=(
  "Core: Authentication, users, schools, shared data"
  "Audit: Logs, audit trails, notifications"
  "Bot: AI, chatbot, machine learning"
  "HR: Staff, payroll, attendance, leave"
  "Finance: Payments, accounting, billing"
  "Academic: Students, classes, enrollment"
  "Content: Lesson plans, CMS, media"
  "CBT: Exams, assessments, grades"
)

for i in "${!domains[@]}"; do
  domain="${domains[$i]}"
  desc="${descriptions[$i]}"
  
  cat > "$BASE_DIR/models/$domain/README.md" << EOF
# ${domain^} Domain Models

**Description:** $desc

## Models
- TODO: List models here

## Database
- Database: elite_$domain (or full_skcooly for core)
- Connection: ${domain}DB

## Usage
\`\`\`javascript
const { Model1 } = require('../models/$domain');
\`\`\`
EOF
done

echo "✅ README files created"
echo ""

# Create migration tracking file
cat > "MODULARIZATION_PROGRESS.md" << 'EOF'
# Modularization Progress Tracker

## Status Legend
- ⏳ Pending
- 🔄 In Progress
- ✅ Complete
- ❌ Blocked

## Progress

### Week 1: Preparation
- [⏳] Directory structure created
- [⏳] Database connections configured
- [⏳] Base patterns documented
- [⏳] Model inventory completed

### Week 2: HR Module
- [⏳] Models moved
- [⏳] Controllers moved
- [⏳] Routes moved
- [⏳] Services moved
- [⏳] Tests passing

### Week 3: Finance Module
- [⏳] Models moved
- [⏳] Controllers moved
- [⏳] Routes moved
- [⏳] Services moved
- [⏳] Tests passing

### Week 4: Academic Module
- [⏳] Models moved
- [⏳] Controllers moved
- [⏳] Routes moved
- [⏳] Services moved
- [⏳] Tests passing

### Week 5: Content Module
- [⏳] Models moved
- [⏳] Controllers moved
- [⏳] Routes moved
- [⏳] Services moved
- [⏳] Tests passing

### Week 6: CBT Module
- [⏳] Models moved
- [⏳] Controllers moved
- [⏳] Routes moved
- [⏳] Services moved
- [⏳] Tests passing

### Week 7: Cleanup
- [⏳] Old files removed
- [⏳] Documentation updated
- [⏳] Integration tests passing
- [⏳] Performance verified

## Notes
- Add notes and blockers here
EOF

echo "✅ Progress tracker created"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review MODULARIZATION_PLAN.md"
echo "2. Update MODULARIZATION_PROGRESS.md as you work"
echo "3. Start with Week 1 preparation tasks"
echo "4. Begin HR module migration in Week 2"
echo ""
echo "Directory structure:"
tree -L 3 "$BASE_DIR" 2>/dev/null || find "$BASE_DIR" -type d | head -20
