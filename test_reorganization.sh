#!/bin/bash
# Test reorganized code structure

echo "=== Testing Reorganized Code ==="
echo ""

echo "[1/3] Testing database connections..."
cd elscholar-api
node -e "
const { testConnections } = require('./src/config/databases');
testConnections().then(() => process.exit(0)).catch(() => process.exit(1));
"
if [ $? -eq 0 ]; then
  echo "✓ All databases connected"
else
  echo "✗ Database connection failed"
  exit 1
fi
echo ""

echo "[2/3] Checking domain structure..."
if [ -d "src/domains/content/models" ] && [ -d "src/domains/content/controllers" ] && [ -d "src/domains/content/routes" ]; then
  echo "✓ Domain structure exists"
else
  echo "✗ Domain structure missing"
  exit 1
fi
echo ""

echo "[3/3] Checking files..."
echo "Models: $(ls src/domains/content/models/*.js 2>/dev/null | wc -l | tr -d ' ')"
echo "Controllers: $(ls src/domains/content/controllers/*.js 2>/dev/null | wc -l | tr -d ' ')"
echo "Routes: $(ls src/domains/content/routes/*.js 2>/dev/null | wc -l | tr -d ' ')"
echo "Helpers: $(ls src/domains/shared/helpers/*.js 2>/dev/null | wc -l | tr -d ' ')"
echo ""

echo "✅ Reorganization verified!"
echo ""
echo "To start server: npm run dev"
echo "Test endpoints:"
echo "  curl http://localhost:34567/api/subjects"
echo "  curl http://localhost:34567/api/lessons"
