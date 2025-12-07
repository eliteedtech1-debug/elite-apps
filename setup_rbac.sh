#!/bin/bash

echo "🚀 RBAC Package-Based Setup"
echo "=============================="

# Run migration
echo "📊 Running database migration..."
mysql -u root elite_pts < elscholar-api/src/migrations/rbac_package_based_migration.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully"
else
    echo "❌ Migration failed"
    exit 1
fi

# Restart backend
echo "🔄 Restarting backend..."
cd elscholar-api
pm2 restart elite 2>/dev/null || echo "⚠️  Please restart backend manually"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Test with: curl http://localhost:34567/api/user/features -H 'Authorization: Bearer YOUR_TOKEN'"
echo "2. Check frontend sidebar for feature-based filtering"
echo "3. Review RBAC_IMPLEMENTATION_PROGRESS.md for details"
