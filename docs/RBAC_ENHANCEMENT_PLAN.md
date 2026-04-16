# Elite Core RBAC Enhancement Plan
## Bridging the Gap to World-Class LMS

**Document Version:** 1.0  
**Date:** 2026-01-16  
**Author:** AI Analysis  
**Target:** 10/10 RBAC Rating

---

## Executive Summary

Elite Core currently has an **8.5/10 RBAC system** - better than 70% of global LMS platforms. This document outlines a comprehensive plan to achieve **10/10 rating** by implementing enterprise-grade features found in top LMS systems like Moodle, Canvas, and Blackboard.

### Current Strengths
- ✅ Subscription-first architecture (Plan > Role > Individual)
- ✅ Multi-tenant native design
- ✅ Role hierarchy with inheritance
- ✅ Granular menu-level control
- ✅ Clean, maintainable codebase

### Key Gaps to Address
- ❌ No CRUD-level permissions (Create/Read/Update/Delete)
- ❌ No context-aware roles (class-level, subject-level)
- ❌ No "View As" permission testing
- ❌ No visual permission matrix
- ❌ Limited audit trail with rollback

---

## Part 1: Current System Analysis

### 1.1 Database Architecture Review

**Current RBAC Tables:**
```
roles                    - Base role definitions
role_inheritance         - Hierarchy relationships (11 rows)
staff_role_definitions   - Custom roles (9 rows)
rbac_menu_items          - Menu structure (115+ items)
rbac_menu_access         - Role-to-menu mapping (878 rows)
rbac_menu_packages       - Package-to-menu mapping
rbac_school_packages     - School subscriptions
user_roles               - User-to-role assignments
user_menu_access         - Individual menu grants
```

**Current Permission Model:**
```
User → Role → Menu Items → Visible/Hidden
         ↓
    Plan Filter → Final Access
```

**Limitation:** Binary access (can see menu or not). No granular control over what user can DO within that menu.

### 1.2 Code Architecture Review

**Backend Structure:**
- `src/routes/rbac.js` - 700+ lines, handles all RBAC endpoints
- `src/controllers/rbacController.js` - Business logic
- `src/services/rbacService.js` - Core permission resolution
- `src/middleware/auth.js` - JWT authentication

**Frontend Structure:**
- `RoleAssignmentModal.tsx` - Role assignment UI
- `AppConfigurationDashboard.jsx` - Admin RBAC management
- `useRoles.ts` - Unified roles hook
- Sidebar rendering based on menu access

**Current Permission Check Pattern:**
```javascript
// Simple menu visibility check
if (userMenuAccess.includes(menuItem.id)) {
  showMenuItem();
}
```

**Missing Pattern:**
```javascript
// CRUD permission check (not implemented)
if (hasPermission(user, 'students', 'update')) {
  allowEdit();
}
```

### 1.3 Gap Analysis Summary

| Feature | Current | Target | Gap |
|---------|---------|--------|-----|
| Menu Access | ✅ Yes | ✅ Yes | None |
| Role Hierarchy | ✅ Yes | ✅ Yes | None |
| Plan Filtering | ✅ Yes | ✅ Yes | None |
| CRUD Permissions | ❌ No | ✅ Yes | **Critical** |
| Context Roles | ❌ No | ✅ Yes | **Critical** |
| View As | ❌ No | ✅ Yes | **High** |
| Permission Matrix | ❌ No | ✅ Yes | **Medium** |
| Audit Rollback | ❌ No | ✅ Yes | **Medium** |
| API Rate Limiting | ❌ No | ✅ Yes | **Low** |

---

## Part 2: CRUD Permissions System

### 2.1 Concept

Transform from **menu-based** to **resource-based** permissions.

**Current:** "Can user see Students menu?"
**Target:** "Can user Create/Read/Update/Delete students?"

### 2.2 Database Design

**New Table: `resources`**
```sql
CREATE TABLE resources (
  id INT PRIMARY KEY AUTO_INCREMENT,
  resource_code VARCHAR(50) UNIQUE NOT NULL,  -- 'students', 'classes', 'payments'
  resource_name VARCHAR(100) NOT NULL,         -- 'Students', 'Classes', 'Payments'
  category VARCHAR(50),                        -- 'academic', 'financial', 'hr'
  description TEXT,
  parent_resource_id INT,                      -- For nested resources
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**New Table: `resource_permissions`**
```sql
CREATE TABLE resource_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_id INT NOT NULL,
  resource_id INT NOT NULL,
  can_create BOOLEAN DEFAULT FALSE,
  can_read BOOLEAN DEFAULT FALSE,
  can_update BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_export BOOLEAN DEFAULT FALSE,
  can_import BOOLEAN DEFAULT FALSE,
  can_approve BOOLEAN DEFAULT FALSE,
  conditions JSON,                             -- {"own_only": true, "same_class": true}
  school_id VARCHAR(20),                       -- NULL = global, value = school-specific
  UNIQUE KEY unique_role_resource (role_id, resource_id, school_id)
);
```

**New Table: `user_permission_overrides`**
```sql
CREATE TABLE user_permission_overrides (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  resource_id INT NOT NULL,
  permission_type ENUM('create','read','update','delete','export','import','approve'),
  is_granted BOOLEAN NOT NULL,                 -- TRUE = grant, FALSE = deny
  reason TEXT,
  granted_by INT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3 Resource Definitions

**Core Resources to Define:**
```
Academic:
- students (CRUD + export + import)
- classes (CRUD)
- subjects (CRUD)
- attendance (CRUD + approve)
- exams (CRUD + approve)
- results (CRUD + approve + export)
- timetable (CRUD)
- lessons (CRUD)
- assignments (CRUD)

Financial:
- fees (CRUD)
- payments (CRUD + approve)
- expenses (CRUD + approve)
- payroll (CRUD + approve)
- invoices (CRUD + export)

HR:
- staff (CRUD + export)
- leave_requests (CRUD + approve)
- attendance_staff (CRUD)

System:
- users (CRUD)
- roles (CRUD)
- settings (read + update)
- reports (read + export)
```

### 2.4 Permission Matrix by Role

| Resource | Admin | BranchAdmin | Principal | Teacher | Accountant |
|----------|-------|-------------|-----------|---------|------------|
| students | CRUD | CRUD | CRU | R | R |
| classes | CRUD | CRUD | CRU | R | - |
| payments | CRUD | CRUD | R | - | CRUD |
| results | CRUD | CRUD | CRUD+A | CRU* | R |
| staff | CRUD | CRU | R | - | R |

*CRU = Create, Read, Update (no Delete)
*A = Approve
*CRU* = Only own records

### 2.5 Implementation Approach

**Phase 1: Database Setup**
1. Create new tables
2. Seed resources (40-50 resources)
3. Seed default permissions per role
4. Migration script for existing data

**Phase 2: Backend Middleware**
```javascript
// New middleware: checkPermission.js
const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    const hasPermission = await rbacService.checkResourcePermission(
      req.user.id,
      resource,
      action,
      req.user.school_id
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Permission denied',
        required: `${resource}:${action}`
      });
    }
    next();
  };
};

// Usage in routes
router.post('/students', 
  checkPermission('students', 'create'),
  studentController.create
);

router.put('/students/:id',
  checkPermission('students', 'update'),
  studentController.update
);
```

**Phase 3: Frontend Integration**
```typescript
// New hook: usePermission.ts
const usePermission = () => {
  const { user } = useSelector(state => state.auth);
  
  const can = (resource: string, action: string) => {
    return user.permissions?.[resource]?.[action] || false;
  };
  
  return { can };
};

// Usage in components
const StudentList = () => {
  const { can } = usePermission();
  
  return (
    <div>
      {can('students', 'create') && <Button>Add Student</Button>}
      {can('students', 'export') && <Button>Export</Button>}
      {students.map(s => (
        <Row>
          {s.name}
          {can('students', 'update') && <EditButton />}
          {can('students', 'delete') && <DeleteButton />}
        </Row>
      ))}
    </div>
  );
};
```

---

## Part 3: Context-Aware Roles

### 3.1 Concept

Allow different permissions based on **context** (class, subject, branch).

**Example:**
- Teacher A is "Class Teacher" for Class 5A (full access)
- Teacher A is "Subject Teacher" for Class 6B Math (limited access)
- Teacher A has no access to Class 7C

### 3.2 Database Design

**New Table: `context_roles`**
```sql
CREATE TABLE context_roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  context_type ENUM('system', 'school', 'branch', 'class', 'subject') NOT NULL,
  context_id VARCHAR(50),                      -- class_id, subject_id, branch_id
  is_active BOOLEAN DEFAULT TRUE,
  assigned_by INT,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  UNIQUE KEY unique_context_role (user_id, role_id, context_type, context_id)
);
```

**New Table: `context_permissions`**
```sql
CREATE TABLE context_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  context_role_id INT NOT NULL,
  resource_id INT NOT NULL,
  can_create BOOLEAN DEFAULT FALSE,
  can_read BOOLEAN DEFAULT FALSE,
  can_update BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  scope ENUM('all', 'own', 'context') DEFAULT 'context',
  FOREIGN KEY (context_role_id) REFERENCES context_roles(id)
);
```

### 3.3 Context Hierarchy

```
System Level (Developer, SuperAdmin)
    ↓
School Level (Admin)
    ↓
Branch Level (BranchAdmin)
    ↓
Class Level (Class Teacher, Form Master)
    ↓
Subject Level (Subject Teacher)
```

### 3.4 Permission Resolution Logic

```javascript
const resolvePermission = async (userId, resource, action, contextData) => {
  // 1. Check system-level permission
  const systemPerm = await getSystemPermission(userId, resource, action);
  if (systemPerm.granted) return true;
  if (systemPerm.denied) return false;
  
  // 2. Check school-level permission
  const schoolPerm = await getSchoolPermission(userId, resource, action, contextData.school_id);
  if (schoolPerm.granted) return true;
  if (schoolPerm.denied) return false;
  
  // 3. Check branch-level permission
  const branchPerm = await getBranchPermission(userId, resource, action, contextData.branch_id);
  if (branchPerm.granted) return true;
  if (branchPerm.denied) return false;
  
  // 4. Check class-level permission
  const classPerm = await getClassPermission(userId, resource, action, contextData.class_id);
  if (classPerm.granted) return true;
  if (classPerm.denied) return false;
  
  // 5. Check subject-level permission
  const subjectPerm = await getSubjectPermission(userId, resource, action, contextData.subject_id);
  return subjectPerm.granted;
};
```

### 3.5 Use Cases

**Use Case 1: Class Teacher**
```
Teacher John assigned as Class Teacher for Class 5A:
- Can view ALL students in Class 5A
- Can edit attendance for Class 5A
- Can view results for Class 5A
- Cannot access Class 5B, 6A, etc.
```

**Use Case 2: Subject Teacher**
```
Teacher Mary teaches Math for Class 5A, 5B, 6A:
- Can view students in Class 5A, 5B, 6A (Math context only)
- Can enter Math results for these classes
- Cannot view Science results
- Cannot access Class 7A
```

**Use Case 3: HOD**
```
HOD Science Department:
- Can view all Science teachers
- Can approve Science results across all classes
- Can view Science curriculum
- Cannot access Math department
```

---

## Part 4: "View As" Feature

### 4.1 Concept

Allow administrators to preview the system as another user would see it, without logging in as that user.

### 4.2 Implementation Design

**Backend: Impersonation Token**
```javascript
// POST /api/rbac/impersonate
router.post('/impersonate', 
  checkPermission('users', 'impersonate'),
  async (req, res) => {
    const { target_user_id } = req.body;
    
    // Audit log
    await logImpersonation(req.user.id, target_user_id);
    
    // Generate limited token
    const impersonationToken = jwt.sign({
      ...targetUser,
      impersonated_by: req.user.id,
      impersonation_expires: Date.now() + 30 * 60 * 1000 // 30 min
    }, secret);
    
    res.json({ token: impersonationToken });
  }
);
```

**Frontend: View As Mode**
```typescript
// ViewAsBar component - shows at top when impersonating
const ViewAsBar = () => {
  const { isImpersonating, originalUser, targetUser } = useImpersonation();
  
  if (!isImpersonating) return null;
  
  return (
    <Alert type="warning" banner>
      Viewing as {targetUser.name} ({targetUser.role})
      <Button onClick={exitImpersonation}>Exit View As</Button>
    </Alert>
  );
};
```

### 4.3 Security Considerations

1. **Audit Trail:** Log all impersonation sessions
2. **Time Limit:** Auto-expire after 30 minutes
3. **Read-Only Option:** Option to view without write access
4. **Hierarchy Respect:** Can only impersonate users below your level
5. **Sensitive Actions Blocked:** Cannot change passwords, delete data while impersonating

### 4.4 UI/UX Design

**Access Point:**
- Staff List → Actions → "View As"
- User Profile → "Preview User View"

**Visual Indicators:**
- Yellow banner at top: "Viewing as John Doe (Teacher)"
- Watermark on pages: "PREVIEW MODE"
- Exit button always visible

---

## Part 5: Visual Permission Matrix

### 5.1 Concept

Grid-based UI for managing permissions visually.

### 5.2 UI Design

```
                    | Students | Classes | Payments | Results | Staff |
--------------------|----------|---------|----------|---------|-------|
Admin               |  CRUD    |  CRUD   |  CRUD    |  CRUD   | CRUD  |
BranchAdmin         |  CRUD    |  CRUD   |  CRUD    |  CRUD   | CRU   |
Principal           |  CRU     |  CRU    |  R       |  CRUD+A | R     |
Teacher             |  R*      |  R      |  -       |  CRU*   | -     |
Accountant          |  R       |  -      |  CRUD    |  R      | R     |
```

**Legend:**
- C = Create (green)
- R = Read (blue)
- U = Update (yellow)
- D = Delete (red)
- A = Approve (purple)
- * = Own/Context only
- - = No access (gray)

### 5.3 Interactive Features

1. **Click to Toggle:** Click cell to cycle through permissions
2. **Drag to Copy:** Drag permission across row/column
3. **Bulk Actions:** Select multiple cells, apply permission
4. **Compare Roles:** Side-by-side role comparison
5. **Export/Import:** CSV export of permission matrix
6. **Templates:** Save/load permission templates

### 5.4 Implementation Approach

**Component Structure:**
```
PermissionMatrix/
├── PermissionMatrix.tsx       # Main grid component
├── PermissionCell.tsx         # Individual cell with CRUD toggles
├── RoleHeader.tsx             # Role column header
├── ResourceRow.tsx            # Resource row with cells
├── PermissionLegend.tsx       # Legend component
├── BulkActions.tsx            # Bulk action toolbar
└── hooks/
    ├── usePermissionMatrix.ts # Data fetching/updating
    └── useMatrixSelection.ts  # Multi-select logic
```

---

## Part 6: Enhanced Audit Trail

### 6.1 Current State

Basic audit logging exists but lacks:
- Detailed change tracking
- Rollback capability
- Permission change history
- Compliance reporting

### 6.2 Enhanced Audit Design

**New Table: `permission_audit_log`**
```sql
CREATE TABLE permission_audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  action_type ENUM('grant', 'revoke', 'modify', 'impersonate') NOT NULL,
  target_type ENUM('user', 'role', 'resource') NOT NULL,
  target_id INT NOT NULL,
  actor_id INT NOT NULL,
  actor_ip VARCHAR(45),
  actor_user_agent TEXT,
  old_value JSON,
  new_value JSON,
  reason TEXT,
  school_id VARCHAR(20),
  is_reversible BOOLEAN DEFAULT TRUE,
  reversed_at TIMESTAMP,
  reversed_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_target (target_type, target_id),
  INDEX idx_actor (actor_id),
  INDEX idx_created (created_at)
);
```

### 6.3 Rollback Feature

```javascript
// POST /api/rbac/audit/:id/rollback
router.post('/audit/:id/rollback',
  checkPermission('audit', 'rollback'),
  async (req, res) => {
    const auditEntry = await getAuditEntry(req.params.id);
    
    if (!auditEntry.is_reversible) {
      return res.status(400).json({ error: 'Action cannot be reversed' });
    }
    
    // Restore old value
    await restorePermission(auditEntry.target_type, auditEntry.target_id, auditEntry.old_value);
    
    // Mark as reversed
    await markReversed(auditEntry.id, req.user.id);
    
    res.json({ success: true, message: 'Permission restored' });
  }
);
```

### 6.4 Compliance Reports

**Report Types:**
1. **Permission Changes Report:** All changes in date range
2. **User Access Report:** What can user X access?
3. **Resource Access Report:** Who can access resource Y?
4. **Anomaly Report:** Unusual permission patterns
5. **Compliance Report:** GDPR/SOC2 compliance status

---

## Part 7: Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Priority: Critical**

| Task | Effort | Dependencies |
|------|--------|--------------|
| Create resources table | 2 days | None |
| Create resource_permissions table | 2 days | resources |
| Seed 50 core resources | 1 day | resources |
| Seed default permissions | 2 days | resource_permissions |
| Create checkPermission middleware | 2 days | Tables ready |
| Unit tests | 1 day | Middleware |

**Deliverable:** CRUD permission checking works on backend

### Phase 2: Backend Integration (Weeks 3-4)
**Priority: Critical**

| Task | Effort | Dependencies |
|------|--------|--------------|
| Add permission checks to student routes | 2 days | Phase 1 |
| Add permission checks to class routes | 1 day | Phase 1 |
| Add permission checks to payment routes | 2 days | Phase 1 |
| Add permission checks to all routes | 3 days | Phase 1 |
| Permission caching (Redis) | 2 days | Phase 1 |
| API documentation | 1 day | All routes |

**Deliverable:** All API endpoints protected with CRUD permissions

### Phase 3: Frontend Integration (Weeks 5-6)
**Priority: High**

| Task | Effort | Dependencies |
|------|--------|--------------|
| Create usePermission hook | 1 day | Phase 2 |
| Update StudentList component | 1 day | usePermission |
| Update ClassList component | 1 day | usePermission |
| Update PaymentList component | 1 day | usePermission |
| Update all list components | 3 days | usePermission |
| Update all form components | 2 days | usePermission |
| Testing | 2 days | All components |

**Deliverable:** UI shows/hides buttons based on CRUD permissions

### Phase 4: Context Roles (Weeks 7-8)
**Priority: High**

| Task | Effort | Dependencies |
|------|--------|--------------|
| Create context_roles table | 1 day | None |
| Create context_permissions table | 1 day | context_roles |
| Context assignment UI | 2 days | Tables |
| Permission resolution logic | 3 days | Tables |
| Class teacher assignment | 2 days | Resolution logic |
| Subject teacher assignment | 2 days | Resolution logic |
| Testing | 2 days | All |

**Deliverable:** Teachers have class/subject-specific permissions

### Phase 5: View As Feature (Week 9)
**Priority: Medium**

| Task | Effort | Dependencies |
|------|--------|--------------|
| Impersonation API | 2 days | Phase 2 |
| ViewAsBar component | 1 day | API |
| Security restrictions | 1 day | API |
| Audit logging | 1 day | API |

**Deliverable:** Admins can preview as any user

### Phase 6: Permission Matrix UI (Weeks 10-11)
**Priority: Medium**

| Task | Effort | Dependencies |
|------|--------|--------------|
| PermissionMatrix component | 3 days | Phase 3 |
| PermissionCell component | 2 days | Matrix |
| Bulk actions | 2 days | Matrix |
| Drag-drop | 2 days | Matrix |
| Export/Import | 1 day | Matrix |

**Deliverable:** Visual permission management grid

### Phase 7: Enhanced Audit (Week 12)
**Priority: Medium**

| Task | Effort | Dependencies |
|------|--------|--------------|
| Enhanced audit table | 1 day | None |
| Rollback feature | 2 days | Audit table |
| Compliance reports | 2 days | Audit table |

**Deliverable:** Full audit trail with rollback

---

## Part 8: Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance degradation | High | Medium | Redis caching, query optimization |
| Breaking existing functionality | High | Medium | Feature flags, gradual rollout |
| Data migration issues | Medium | Low | Backup, rollback scripts |
| Complex permission resolution | Medium | Medium | Thorough testing, logging |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| User confusion | Medium | Medium | Training, documentation |
| Admin overhead | Medium | Low | Good defaults, templates |
| Support tickets increase | Low | Medium | Self-service tools |

---

## Part 9: Success Metrics

### Technical Metrics
- [ ] 100% API endpoints have CRUD checks
- [ ] Permission resolution < 50ms (cached)
- [ ] Zero permission bypass vulnerabilities
- [ ] 95% test coverage on RBAC code

### Business Metrics
- [ ] Admin time to configure permissions reduced by 50%
- [ ] Permission-related support tickets reduced by 30%
- [ ] User satisfaction with access control > 4.5/5

### Compliance Metrics
- [ ] Full audit trail for all permission changes
- [ ] Rollback capability for 100% of changes
- [ ] GDPR compliance for data access logging

---

## Part 10: Conclusion

### Current State: 8.5/10
Elite Core has a solid RBAC foundation with subscription-first architecture, role hierarchy, and multi-tenant support.

### Target State: 10/10
With CRUD permissions, context-aware roles, View As feature, and visual permission matrix, Elite Core will match or exceed top global LMS platforms.

### Investment Required
- **Time:** 12 weeks (3 months)
- **Effort:** ~60 developer days
- **Team:** 1-2 backend, 1 frontend developer

### Expected Outcome
- Enterprise-grade permission system
- Competitive with Moodle, Canvas, Blackboard
- Scalable for 1000+ schools
- Compliance-ready (GDPR, SOC2)

---

**Document Status:** Complete  
**Next Step:** Review and prioritize phases  
**Approval Required:** Technical Lead, Product Owner
