# PRODUCTION DEPLOYMENT: Teacher Menu Restrictions

## ✅ READY FOR PRODUCTION

### Items Removed from Default Teacher Menu (7 total)

#### Reports & Configuration (4 items)
1. **Reports Generator** - `/academic/reports/Exam`
2. **Broad Sheet** - `/academic/broad-sheet`
3. **Report Template** - `/academic/report-configuration`
4. **Print Answer Sheets** - `/academic/print-answer-sheets`

#### Curriculum Management (3 items)
5. **Subject Mapping** - `/academic/subject-mapping`
6. **Syllabus Dashboard** - `/developer/syllabus-dashboard`
7. **Syllabus & Curriculum** - `/academic/syllabus`

---

## 📋 Production Deployment Steps

### 1. Backup Database (CRITICAL)
```bash
mysqldump -u root -p elite_prod_db rbac_menu_access > backup_rbac_menu_access_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Execute SQL Script
```bash
mysql -u root -p elite_prod_db < production_teacher_menu_restriction.sql
```

### 3. Clear Redis Cache
```bash
redis-cli FLUSHALL
# OR specific keys only:
redis-cli KEYS "menu:*" | xargs redis-cli DEL
```

### 4. Verify Changes
```bash
# Check database
mysql -u root -p elite_prod_db -e "
SELECT m.id, m.label, GROUP_CONCAT(DISTINCT ma.user_type) as users
FROM rbac_menu_items m
LEFT JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
WHERE m.id IN (54, 55, 57, 1086, 21, 121, 1068)
GROUP BY m.id, m.label;"

# Test teacher menu endpoint
curl -s 'https://your-domain.com/api/rbac/menu' \
  -H "Authorization: Bearer <TEACHER_TOKEN>" \
  -H "X-School-Id: SCH/XX" \
  -H "X-User-Type: Teacher" | jq '.data'
```

---

## 🔍 Technical Details

### Database Changes
- **Table**: `rbac_menu_access`
- **Records Deleted**: 7 access records
- **Affected Menu Items**: IDs 21, 54, 55, 57, 121, 1068, 1086

### Access Removed
- Direct `teacher` access: 5 records
- `form_master` access (inherited by teacher): 2 records

### Final Access Control
All 7 items now restricted to administrative roles only:
- admin, branchadmin, principal, director
- exam_officer, vp_academic, vice_principal
- head_of_dept, accountant (where applicable)

---

## 🔄 Rollback Plan (If Needed)

```sql
-- Restore teacher access to Broad Sheet
INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type) 
VALUES (55, 'teacher', 'additional');

-- Restore teacher access to Print Answer Sheets
INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type) 
VALUES (1086, 'teacher', 'additional');

-- Restore teacher access to Syllabus & Curriculum
INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type) 
VALUES (21, 'teacher', 'additional');

-- Restore teacher access to Subject Mapping
INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type) 
VALUES (121, 'TEACHER', 'additional');

-- Restore teacher and form_master access to Syllabus Dashboard
INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type) 
VALUES (1068, 'TEACHER', 'additional'), (1068, 'form_master', 'additional');

-- Restore form_master access to Reports Generator
INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type) 
VALUES (54, 'form_master', 'additional');

-- Restore form_master access to Report Template
INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type) 
VALUES (57, 'form_master', 'additional');

-- Clear cache
-- redis-cli FLUSHALL
```

---

## ✅ Testing Results

**Environment**: Local Development (elite_prod_db)
**Test User**: Teacher ID 1423, SCH/23, BRCH/29
**Result**: ✅ All 7 items successfully removed
**Cache**: ✅ Cleared and verified

---

## 📝 Notes

- Teachers retain access to core teaching features (grade entry, CA assessment, attendance, etc.)
- Form masters will need explicit permission grants if they require these administrative features
- Role inheritance: `teacher` → `form_master` (form_master extends teacher)
- Cache TTL: 5 minutes (auto-refresh after changes)

---

## 🚀 Production Checklist

- [ ] Database backup completed
- [ ] SQL script executed successfully
- [ ] Redis cache cleared
- [ ] Teacher menu verified (no restricted items visible)
- [ ] Admin/Principal menu verified (items still accessible)
- [ ] Form master role tested (if applicable)
- [ ] Rollback script prepared and tested
- [ ] Stakeholders notified of changes

---

**Script Location**: `/tmp/production_teacher_menu_restriction.sql`
**Date Prepared**: 2026-02-18
**Tested**: ✅ Local environment
**Status**: Ready for production deployment
