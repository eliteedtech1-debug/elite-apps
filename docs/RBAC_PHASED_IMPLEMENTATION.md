# RBAC Sidebar Cleanup - Safe Phased Implementation Plan

## Current Crisis Summary
- **Admin sidebar**: 132 items (2200% bloat)
- **Student sidebar**: 6 items
- **9 critical conflicts**: Admin sees student/parent personal items
- **Impact**: Unusable admin interface, security concerns, user confusion

---

## PHASE 1: EMERGENCY TRIAGE (Day 1-2) ⚠️ CRITICAL

### Objective
Remove the most egregious contamination without breaking existing functionality.

### 1.1 Create Safety Backup
```sql
-- Full backup of current state
CREATE TABLE rbac_menu_access_backup_20260119 AS 
SELECT * FROM rbac_menu_access;

CREATE TABLE rbac_menu_items_backup_20260119 AS 
SELECT * FROM rbac_menu_items;

-- Verify backup
SELECT 
  'rbac_menu_access' as table_name, 
  COUNT(*) as record_count 
FROM rbac_menu_access_backup_20260119
UNION ALL
SELECT 
  'rbac_menu_items' as table_name, 
  COUNT(*) as record_count 
FROM rbac_menu_items_backup_20260119;
```

### 1.2 Identify Safe Removal Targets
```sql
-- Query to identify student-only items appearing in admin sidebar
SELECT 
  m.id,
  m.label,
  m.link,
  GROUP_CONCAT(DISTINCT ma.user_type) as current_access,
  'STUDENT_ONLY' as intended_access
FROM rbac_menu_items m
JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
WHERE m.label LIKE 'My %' 
  AND m.parent_id = 32 -- My School Activities parent
  AND ma.user_type IN ('admin', 'branchadmin', 'director', 'principal', 'vp_academic')
GROUP BY m.id;

-- Expected output: Items 32, 33, 34, 35, 36, 1085
```

### 1.3 Remove Student Personal Items from Admin
```sql
-- SAFE: These are clearly student-only items
DELETE FROM rbac_menu_access 
WHERE menu_item_id IN (
  32,  -- My School Activities
  33,  -- My Attendances  
  34,  -- Class Time Table (student view)
  35,  -- Lessons (student view)
  36,  -- My Assignments
  1085 -- My Recitation
)
AND user_type IN ('admin', 'branchadmin', 'director', 'principal', 'vp_academic', 'vice_principal', 'exam_officer', 'form_master', 'head_of_dept');

-- Verify removal
SELECT 
  'REMOVED' as action,
  ROW_COUNT() as affected_rows;
```

### 1.4 Remove Parent Personal Items from Admin
```sql
-- SAFE: Parent portal items should not be in admin sidebar
DELETE FROM rbac_menu_access 
WHERE menu_item_id = 30 -- My Children
AND user_type IN ('admin', 'branchadmin', 'director', 'principal', 'vp_academic', 'vice_principal', 'exam_officer', 'form_master');

-- Verify removal
SELECT 
  m.id,
  m.label,
  GROUP_CONCAT(DISTINCT ma.user_type) as remaining_access
FROM rbac_menu_items m
LEFT JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
WHERE m.id = 30
GROUP BY m.id;
```

### 1.5 Verify Phase 1 Results
```sql
-- Check new sidebar counts
SELECT 
  ma.user_type,
  COUNT(DISTINCT ma.menu_item_id) as total_items,
  COUNT(DISTINCT CASE WHEN m.parent_id IS NULL THEN m.id END) as top_level
FROM rbac_menu_access ma
JOIN rbac_menu_items m ON ma.menu_item_id = m.id
WHERE m.is_active = 1
  AND ma.user_type IN ('admin', 'student', 'parent')
GROUP BY ma.user_type
ORDER BY total_items DESC;

-- Expected: Admin should drop from 132 to ~120 items
```

### 1.6 Test Admin Sidebar API
```bash
# Test that admin sidebar still loads
curl -X GET "http://localhost:34567/api/rbac/menu" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.menu | length'

# Should return ~120 items instead of 132
```

**Phase 1 Success Criteria:**
- ✅ Admin sidebar reduced by 10-15 items
- ✅ No student/parent personal items in admin sidebar
- ✅ All user types can still login and see their sidebars
- ✅ No broken links or 404 errors

**Rollback Plan:**
```sql
-- If anything breaks, restore from backup
DELETE FROM rbac_menu_access;
INSERT INTO rbac_menu_access SELECT * FROM rbac_menu_access_backup_20260119;
```

---

## PHASE 2: STRUCTURAL FOUNDATION (Day 3-5) 🏗️

### Objective
Add database structure to prevent future contamination.

### 2.1 Add Access Type Classification
```sql
-- Add new columns to rbac_menu_access
ALTER TABLE rbac_menu_access 
ADD COLUMN access_type ENUM('default', 'additional', 'restricted') DEFAULT 'additional' AFTER user_type,
ADD COLUMN is_removable BOOLEAN DEFAULT TRUE AFTER access_type,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add indexes for performance
CREATE INDEX idx_access_type ON rbac_menu_access(access_type);
CREATE INDEX idx_removable ON rbac_menu_access(is_removable);
```

### 2.2 Add User Type Boundaries to Menu Items
```sql
-- Add boundary enforcement columns
ALTER TABLE rbac_menu_items
ADD COLUMN intended_user_types JSON COMMENT 'User types this item is designed for' AFTER link,
ADD COLUMN restricted_user_types JSON COMMENT 'User types that should never see this' AFTER intended_user_types;

-- Mark student-only items
UPDATE rbac_menu_items 
SET 
  intended_user_types = '["student"]',
  restricted_user_types = '["admin", "branchadmin", "director", "principal", "vp_academic", "teacher"]'
WHERE id IN (32, 33, 34, 35, 36, 1085);

-- Mark parent-only items
UPDATE rbac_menu_items 
SET 
  intended_user_types = '["parent"]',
  restricted_user_types = '["admin", "branchadmin", "director", "principal", "vp_academic", "teacher", "student"]'
WHERE id IN (30, 31);

-- Mark admin management items
UPDATE rbac_menu_items 
SET 
  intended_user_types = '["admin", "branchadmin", "director", "principal", "vp_academic"]',
  restricted_user_types = '["student", "parent"]'
WHERE id IN (1, 37, 70, 90, 109); -- Personal Data Mngr, General Setups, Finance, Supply, Staff
```

### 2.3 Mark Default Access (Non-Removable)
```sql
-- Admin core defaults
UPDATE rbac_menu_access 
SET 
  access_type = 'default',
  is_removable = FALSE
WHERE user_type = 'admin' 
  AND menu_item_id IN (
    1,   -- Personal Data Mngr
    37,  -- General Setups
    50,  -- Exams & Records
    70,  -- Express Finance
    90   -- Supply Management
  );

-- Student core defaults
UPDATE rbac_menu_access 
SET 
  access_type = 'default',
  is_removable = FALSE
WHERE user_type = 'student' 
  AND menu_item_id IN (32, 33, 34, 35, 36);

-- Parent core defaults
UPDATE rbac_menu_access 
SET 
  access_type = 'default',
  is_removable = FALSE
WHERE user_type = 'parent' 
  AND menu_item_id IN (30, 31);

-- Teacher core defaults
UPDATE rbac_menu_access 
SET 
  access_type = 'default',
  is_removable = FALSE
WHERE user_type = 'teacher' 
  AND menu_item_id IN (16, 11, 50); -- Class Management, Attendance, Exams
```

### 2.4 Verify Phase 2 Structure
```sql
-- Check access type distribution
SELECT 
  access_type,
  is_removable,
  COUNT(*) as count
FROM rbac_menu_access
GROUP BY access_type, is_removable;

-- Check boundary definitions
SELECT 
  id,
  label,
  intended_user_types,
  restricted_user_types
FROM rbac_menu_items
WHERE intended_user_types IS NOT NULL
ORDER BY id;
```

**Phase 2 Success Criteria:**
- ✅ All tables have new columns
- ✅ Core defaults marked as non-removable
- ✅ User type boundaries defined
- ✅ No data loss or corruption

---

## PHASE 3: NOTICE BOARD SEPARATION (Day 6-7) 📢

### Objective
Fix the Notice Board over-sharing issue with creator/viewer separation.

### 3.1 Analyze Current Notice Board Usage
```sql
-- Check current access pattern
SELECT 
  m.id,
  m.label,
  m.link,
  GROUP_CONCAT(DISTINCT ma.user_type ORDER BY ma.user_type) as user_types,
  COUNT(DISTINCT ma.user_type) as user_type_count
FROM rbac_menu_items m
JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
WHERE m.id = 29
GROUP BY m.id;

-- Expected: 7 user types (admin, branchadmin, director, parent, principal, teacher, vp_academic)
```

### 3.2 Create Separate Notice Board Items
```sql
-- Get parent_id for Notice Board
SELECT parent_id FROM rbac_menu_items WHERE id = 29;
-- Expected: 27 (Announcements parent)

-- Create management version (for creators)
INSERT INTO rbac_menu_items (parent_id, label, icon, link, sort_order, is_active) 
VALUES (27, 'Notice Board Management', 'edit', '/announcements/notice-board-admin', 10, 1);

SET @mgmt_id = LAST_INSERT_ID();

-- Create view version (for consumers)
INSERT INTO rbac_menu_items (parent_id, label, icon, link, sort_order, is_active) 
VALUES (27, 'Notice Board', 'eye', '/announcements/notice-board-view', 11, 1);

SET @view_id = LAST_INSERT_ID();

-- Verify creation
SELECT @mgmt_id as management_id, @view_id as view_id;
```

### 3.3 Assign Proper Access
```sql
-- Management version: admin, branchadmin, principal only
INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type, is_removable) VALUES
(@mgmt_id, 'admin', 'default', FALSE),
(@mgmt_id, 'branchadmin', 'default', FALSE),
(@mgmt_id, 'principal', 'default', FALSE),
(@mgmt_id, 'director', 'additional', TRUE);

-- View version: student, parent, teacher
INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type, is_removable) VALUES
(@view_id, 'student', 'default', FALSE),
(@view_id, 'parent', 'default', FALSE),
(@view_id, 'teacher', 'default', FALSE);

-- Mark boundaries
UPDATE rbac_menu_items 
SET 
  intended_user_types = '["admin", "branchadmin", "principal", "director"]',
  restricted_user_types = '["student", "parent"]'
WHERE id = @mgmt_id;

UPDATE rbac_menu_items 
SET 
  intended_user_types = '["student", "parent", "teacher"]',
  restricted_user_types = '[]'
WHERE id = @view_id;
```

### 3.4 Deactivate Old Notice Board
```sql
-- Soft delete old shared item
UPDATE rbac_menu_items 
SET is_active = 0 
WHERE id = 29;

-- Verify deactivation
SELECT id, label, is_active FROM rbac_menu_items WHERE id = 29;
```

### 3.5 Test Notice Board Separation
```sql
-- Verify admin sees management version
SELECT m.label, m.link 
FROM rbac_menu_items m
JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
WHERE ma.user_type = 'admin' 
  AND m.label LIKE '%Notice Board%'
  AND m.is_active = 1;

-- Expected: "Notice Board Management" with /announcements/notice-board-admin

-- Verify student sees view version
SELECT m.label, m.link 
FROM rbac_menu_items m
JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
WHERE ma.user_type = 'student' 
  AND m.label LIKE '%Notice Board%'
  AND m.is_active = 1;

-- Expected: "Notice Board" with /announcements/notice-board-view
```

**Phase 3 Success Criteria:**
- ✅ Two separate Notice Board items created
- ✅ Admin sees management version only
- ✅ Student/parent see view version only
- ✅ Old shared item deactivated
- ✅ No 404 errors on either route

---

## PHASE 4: BACKEND ENFORCEMENT (Day 8-10) 🔒

### Objective
Update backend API to enforce new access rules.

### 4.1 Update RBAC Controller Query
```javascript
// elscholar-api/src/controllers/rbacController.js

// OLD QUERY (allows contamination):
let itemsQuery = `
  SELECT DISTINCT m.id, m.parent_id, m.label, m.icon, m.link, m.sort_order
  FROM rbac_menu_items m
  WHERE m.is_active = 1 
  AND m.id IN (
    SELECT DISTINCT a.menu_item_id FROM rbac_menu_access a 
    WHERE a.user_type IN (?)
  )
  ORDER BY m.sort_order
`;

// NEW QUERY (enforces boundaries):
let itemsQuery = `
  SELECT DISTINCT m.id, m.parent_id, m.label, m.icon, m.link, m.sort_order
  FROM rbac_menu_items m
  JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
  WHERE m.is_active = 1 
  AND ma.user_type = ?
  AND ma.access_type IN ('default', 'additional')
  AND (
    m.restricted_user_types IS NULL 
    OR NOT JSON_CONTAINS(m.restricted_user_types, JSON_QUOTE(?))
  )
  ORDER BY m.sort_order
`;
```

### 4.2 Create Validation Function
```javascript
// elscholar-api/src/services/rbacService.js

const validateMenuAccess = async (userId, menuItemId) => {
  const user = await db.User.findByPk(userId);
  
  const query = `
    SELECT 
      m.id,
      m.restricted_user_types,
      ma.access_type,
      ma.is_removable
    FROM rbac_menu_items m
    LEFT JOIN rbac_menu_access ma ON m.id = ma.menu_item_id AND ma.user_type = ?
    WHERE m.id = ?
    AND m.is_active = 1
  `;
  
  const [result] = await db.sequelize.query(query, {
    replacements: [user.user_type, menuItemId],
    type: db.Sequelize.QueryTypes.SELECT
  });
  
  if (!result) return false;
  
  // Check if user type is restricted
  if (result.restricted_user_types) {
    const restricted = JSON.parse(result.restricted_user_types);
    if (restricted.includes(user.user_type)) {
      return false;
    }
  }
  
  // Check if access exists
  return result.access_type !== null;
};

module.exports = { validateMenuAccess };
```

### 4.3 Add Middleware Protection
```javascript
// elscholar-api/src/middleware/rbacMiddleware.js

const { validateMenuAccess } = require('../services/rbacService');

const checkMenuAccess = async (req, res, next) => {
  const menuItemId = req.params.menuItemId || req.body.menuItemId;
  
  if (!menuItemId) {
    return next();
  }
  
  const hasAccess = await validateMenuAccess(req.user.id, menuItemId);
  
  if (!hasAccess) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'You do not have permission to access this menu item'
    });
  }
  
  next();
};

module.exports = { checkMenuAccess };
```

### 4.4 Test Backend Enforcement
```bash
# Test admin cannot access student items
curl -X GET "http://localhost:34567/api/rbac/validate-access?menu_item_id=32" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Expected: {"hasAccess": false, "reason": "User type restricted"}

# Test student can access their items
curl -X GET "http://localhost:34567/api/rbac/validate-access?menu_item_id=32" \
  -H "Authorization: Bearer STUDENT_JWT_TOKEN"

# Expected: {"hasAccess": true}
```

**Phase 4 Success Criteria:**
- ✅ Backend enforces user type boundaries
- ✅ API returns only appropriate menu items
- ✅ Validation middleware blocks unauthorized access
- ✅ All existing functionality still works

---

## PHASE 5: FRONTEND CLEANUP (Day 11-12) 🎨

### Objective
Update frontend to respect new RBAC structure.

### 5.1 Update Sidebar Data Filter
```typescript
// elscholar-ui/src/core/data/json/sidebarData.tsx

const filterByAccessAndPermissions = (
  teacher_roles: number,
  user_type: string,
  items: any[],
  accessList: string[],
  permissionList: string[]
): any[] => {
  if (user_type === "Developer") {
    return items;
  }
  
  return items
    .map((item) => {
      // NEW: Check restricted_user_types
      if (item.restricted_user_types?.includes(user_type)) {
        return null;
      }
      
      // NEW: Check intended_user_types
      if (item.intended_user_types && 
          !item.intended_user_types.includes(user_type)) {
        return null;
      }
      
      // Existing access checks
      const hasAccess = item.requiredAccess?.includes(user_type) ||
                       item.requiredAccess?.some((a: string) => accessList.includes(a));
      
      const hasPermission = item.requiredPermissions?.includes(user_type) ||
                           item.requiredPermissions?.some((p: string) => permissionList.includes(p));
      
      if (!hasAccess && !hasPermission) return null;
      
      // Recursively filter submenu
      const filteredSubmenu = item.submenuItems
        ? filterByAccessAndPermissions(teacher_roles, user_type, item.submenuItems, accessList, permissionList)
        : [];
      
      return {
        ...item,
        submenuItems: filteredSubmenu.length > 0 ? filteredSubmenu : undefined,
      };
    })
    .filter(item => item !== null);
};
```

### 5.2 Update RBAC Context
```typescript
// elscholar-ui/src/contexts/RBACContext.tsx

const fetchMenu = async () => {
  try {
    const response = await fetch('/api/rbac/menu', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    // NEW: Filter out restricted items on client side too
    const filteredMenu = data.menu.filter((item: any) => {
      if (item.restricted_user_types?.includes(userType)) {
        return false;
      }
      return true;
    });
    
    setMenu(filteredMenu);
  } catch (error) {
    console.error('Failed to fetch menu:', error);
  }
};
```

### 5.3 Test Frontend Rendering
```bash
# Start frontend dev server
cd elscholar-ui && npm start

# Login as admin and verify:
# - No "My Attendances" or "My Assignments" in sidebar
# - No "My Children" in sidebar
# - Notice Board Management appears (not Notice Board)

# Login as student and verify:
# - Only student items appear
# - Notice Board (view) appears (not Management)
```

**Phase 5 Success Criteria:**
- ✅ Frontend respects backend restrictions
- ✅ Sidebar renders correctly for all user types
- ✅ No console errors or warnings
- ✅ UI is clean and uncluttered

---

## PHASE 6: VALIDATION & MONITORING (Day 13-14) ✅

### Objective
Comprehensive testing and monitoring setup.

### 6.1 Final Validation Queries
```sql
-- 1. Verify no contamination remains
SELECT 
  m.id,
  m.label,
  GROUP_CONCAT(DISTINCT ma.user_type) as user_types,
  m.intended_user_types,
  m.restricted_user_types
FROM rbac_menu_items m
JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
WHERE m.is_active = 1
  AND (
    (JSON_CONTAINS(m.restricted_user_types, JSON_QUOTE(ma.user_type)))
    OR
    (m.intended_user_types IS NOT NULL AND NOT JSON_CONTAINS(m.intended_user_types, JSON_QUOTE(ma.user_type)))
  )
GROUP BY m.id;

-- Expected: 0 rows (no violations)

-- 2. Check sidebar counts
SELECT 
  ma.user_type,
  COUNT(DISTINCT ma.menu_item_id) as total_items
FROM rbac_menu_access ma
JOIN rbac_menu_items m ON ma.menu_item_id = m.id
WHERE m.is_active = 1
  AND ma.user_type IN ('admin', 'student', 'parent', 'teacher')
GROUP BY ma.user_type
ORDER BY total_items DESC;

-- Expected: Admin ~50-60 items, Student 6, Parent 3

-- 3. Verify default protection
SELECT 
  user_type,
  COUNT(*) as protected_defaults
FROM rbac_menu_access
WHERE access_type = 'default' AND is_removable = FALSE
GROUP BY user_type;

-- Expected: Each user type has protected defaults
```

### 6.2 Create Monitoring View
```sql
-- Create view for ongoing monitoring
CREATE OR REPLACE VIEW v_rbac_health_check AS
SELECT 
  'Total Menu Items' as metric,
  COUNT(*) as value
FROM rbac_menu_items WHERE is_active = 1
UNION ALL
SELECT 
  'Total Access Records' as metric,
  COUNT(*) as value
FROM rbac_menu_access
UNION ALL
SELECT 
  CONCAT('Admin Sidebar Items') as metric,
  COUNT(DISTINCT ma.menu_item_id) as value
FROM rbac_menu_access ma
JOIN rbac_menu_items m ON ma.menu_item_id = m.id
WHERE ma.user_type = 'admin' AND m.is_active = 1
UNION ALL
SELECT 
  'Contamination Violations' as metric,
  COUNT(*) as value
FROM rbac_menu_items m
JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
WHERE m.is_active = 1
  AND JSON_CONTAINS(m.restricted_user_types, JSON_QUOTE(ma.user_type));

-- Query the view
SELECT * FROM v_rbac_health_check;
```

### 6.3 Performance Benchmarking
```sql
-- Benchmark sidebar query performance
SET @start_time = NOW(6);

SELECT DISTINCT m.id, m.parent_id, m.label, m.icon, m.link, m.sort_order
FROM rbac_menu_items m
JOIN rbac_menu_access ma ON m.id = ma.menu_item_id
WHERE m.is_active = 1 
AND ma.user_type = 'admin'
AND ma.access_type IN ('default', 'additional')
AND (
  m.restricted_user_types IS NULL 
  OR NOT JSON_CONTAINS(m.restricted_user_types, JSON_QUOTE('admin'))
)
ORDER BY m.sort_order;

SET @end_time = NOW(6);
SELECT TIMESTAMPDIFF(MICROSECOND, @start_time, @end_time) / 1000 as query_time_ms;

-- Expected: < 50ms
```

### 6.4 User Acceptance Testing Checklist
```markdown
## UAT Checklist

### Admin User
- [ ] Sidebar has 50-60 items (not 132)
- [ ] No student items ("My Attendances", "My Assignments")
- [ ] No parent items ("My Children")
- [ ] "Notice Board Management" appears
- [ ] All admin functions work correctly
- [ ] Can access finance, staff, student management

### Student User
- [ ] Sidebar has 6 items
- [ ] "My School Activities" section appears
- [ ] "Notice Board" (view) appears
- [ ] Cannot access admin functions
- [ ] All student functions work correctly

### Parent User
- [ ] Sidebar has 3 items
- [ ] "My Children" section appears
- [ ] "Bills / School Fees" appears
- [ ] "Notice Board" (view) appears
- [ ] Cannot access admin functions

### Teacher User
- [ ] Sidebar has appropriate teaching items
- [ ] "Class Management" appears
- [ ] "Notice Board" (view) appears
- [ ] No student personal items
- [ ] No admin-only items
```

**Phase 6 Success Criteria:**
- ✅ Zero contamination violations
- ✅ Admin sidebar reduced to 50-60 items
- ✅ All user types tested and approved
- ✅ Performance benchmarks met
- ✅ Monitoring in place

---

## ROLLBACK PROCEDURES

### Emergency Rollback (If Critical Issues Found)
```sql
-- Restore from Phase 1 backup
DELETE FROM rbac_menu_access;
INSERT INTO rbac_menu_access SELECT * FROM rbac_menu_access_backup_20260119;

DELETE FROM rbac_menu_items WHERE id > (SELECT MAX(id) FROM rbac_menu_items_backup_20260119);
UPDATE rbac_menu_items m
JOIN rbac_menu_items_backup_20260119 b ON m.id = b.id
SET 
  m.is_active = b.is_active,
  m.label = b.label,
  m.link = b.link;
```

### Partial Rollback (Specific Phase)
```sql
-- Rollback Phase 3 (Notice Board changes)
UPDATE rbac_menu_items SET is_active = 1 WHERE id = 29;
DELETE FROM rbac_menu_items WHERE id IN (@mgmt_id, @view_id);
DELETE FROM rbac_menu_access WHERE menu_item_id IN (@mgmt_id, @view_id);
```

---

## SUCCESS METRICS

### Before Cleanup
- Admin sidebar: 132 items
- Contamination: 9 critical conflicts
- User confusion: High
- Performance: Slow (large sidebar queries)

### After Cleanup (Target)
- Admin sidebar: 50-60 items (60% reduction)
- Contamination: 0 conflicts
- User confusion: Low (clean, role-appropriate sidebars)
- Performance: Fast (< 50ms sidebar queries)

---

## TIMELINE SUMMARY

| Phase | Duration | Risk Level | Can Rollback |
|-------|----------|------------|--------------|
| Phase 1: Emergency Triage | 2 days | Low | ✅ Yes |
| Phase 2: Structural Foundation | 3 days | Medium | ✅ Yes |
| Phase 3: Notice Board Separation | 2 days | Low | ✅ Yes |
| Phase 4: Backend Enforcement | 3 days | Medium | ✅ Yes |
| Phase 5: Frontend Cleanup | 2 days | Low | ✅ Yes |
| Phase 6: Validation & Monitoring | 2 days | Low | N/A |
| **Total** | **14 days** | | |

---

*Implementation Plan Created: 2026-01-19*
*Database: full_skcooly*
*Status: Ready for Phase 1 Execution*
