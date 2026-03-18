# Production Deployment - Quick Reference

## 🚀 Quick Commands

### **1. Push Code**
```bash
cd /Users/apple/Downloads/apps/elite
git add .
git commit -m "Fix: Reverse role inheritance direction for correct RBAC"
git push origin expirement
```

### **2. Deploy on Server**
```bash
# SSH to server
ssh user@your-server

# Pull code
cd /path/to/elscholar-api
git pull origin expirement

# Run migration
mysql -u root -p YOUR_DB_NAME < src/migrations/fix_role_inheritance_direction.sql

# Restart
pm2 restart elscholar-api
```

### **3. Verify**
```bash
# Check logs
pm2 logs elscholar-api --lines 50

# Test API
curl 'https://your-domain.com/api/rbac/menu' -H 'Authorization: Bearer TOKEN'
```

---

## ✅ Success Indicators

- Migration output shows: "6 total_inheritance_rules"
- Exam officer sees: ~45 menu items
- VP Academic sees: ~80 menu items
- Logs show: "Role exam_officer inherits from: ['teacher']"

---

## 🔄 Rollback (If Needed)

```bash
mysql -u root -p YOUR_DB_NAME
```
```sql
DELETE FROM role_inheritance;
INSERT INTO role_inheritance SELECT * FROM role_inheritance_backup_20260227;
```
```bash
pm2 restart elscholar-api
```

---

**Full Guide:** `/PRODUCTION_DEPLOYMENT.md`
