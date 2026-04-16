# 🧠 Smart Role Assignment - Auto-Permissions

## How It Works

When you assign a role like **"Accountant"** to a staff member, the system **automatically**:

### 1. ✅ Grants ALL Permissions for That Role

```javascript
// Example: Assigning "Accountant" role
POST /api/rbac/assign-role
{
  "user_id": 123,
  "role_id": 9, // Accountant
  "school_id": "SCH/1",
  "branch_id": "BRCH00001"
}

// Response shows what was granted
{
  "success": true,
  "message": "Role assigned successfully! User now has 25 permissions across 5 modules.",
  "data": {
    "user_role": { ... },
    "synced_permissions": {
      "permissions": [
        "View Financial Records",
        "Create Invoices",
        "Receive Payments",
        "Financial Reports",
        "Journal Entries",
        "Account Reconciliation",
        ...
      ],
      "accessTo": [
        "finance",
        "reports",
        "dashboard",
        "students",
        "settings"
      ],
      "roles": ["Accountant"]
    }
  }
}
```

### 2. ✅ Updates Legacy Fields (Backward Compatibility)

The system updates BOTH:
- **New RBAC tables** (user_roles, role_permissions)
- **Legacy fields** (users.permissions, users.accessTo)

This ensures:
- Existing code continues to work
- New RBAC features are fully enabled
- No breaking changes

### 3. ✅ Syncs on Every Assignment/Revocation

```javascript
// When role is assigned
1. Create user_role record
2. Get all permissions from that role
3. Combine with permissions from other roles user has
4. Update users.permissions = JSON array
5. Update users.accessTo = JSON array
6. Return summary of what was granted
```

---

## Role Permission Mappings

Here's what each role automatically grants:

### 🏦 **Accountant Role**
**Automatically grants 25+ permissions:**
- ✅ View Financial Records
- ✅ Create Invoices
- ✅ Receive Payments
- ✅ Void Transactions
- ✅ Manage Expenses
- ✅ Financial Reports
- ✅ Journal Entries
- ✅ Account Reconciliation
- ✅ View Students (for billing)
- ✅ View Dashboard

### 💰 **Cashier Role**
**Automatically grants 8+ permissions:**
- ✅ View Dashboard
- ✅ View Students
- ✅ View Financial Records
- ✅ Create Invoices
- ✅ Receive Payments
- ✅ Financial Reports

### 📦 **Storekeeper Role**
**Automatically grants 15+ permissions:**
- ✅ View Dashboard
- ✅ View Inventory
- ✅ Add Inventory
- ✅ Update Inventory
- ✅ Delete Inventory
- ✅ Stock In
- ✅ Stock Out
- ✅ Inventory Reports

### 👔 **Manager Role**
**Automatically grants 40+ permissions:**
- ✅ All read permissions across modules
- ✅ All report generation
- ✅ Cross-department viewing
- ✅ Analytics access

### 👨‍🏫 **Form Master Role**
**Automatically grants 20+ permissions:**
- ✅ View Students
- ✅ Update Students
- ✅ View Classes
- ✅ View/Mark/Update Attendance
- ✅ Attendance Reports
- ✅ Enter/Update Results
- ✅ Send SMS/Email/WhatsApp
- ✅ Generate Student Reports

---

## Real-World Example

### Scenario: Assign Accountant to Staff Member

**Step 1: Admin clicks "Assign Roles"**
```
Teacher: John Doe
Current Roles: None
Current Permissions: 0
```

**Step 2: Admin selects "Accountant" role**

The system **immediately shows preview**:
```
Role: Accountant
Will grant:
  ✅ 25 permissions
  ✅ 5 modules (finance, reports, dashboard, students, settings)

Permissions to be added:
  Finance:
    ✅ View Financial Records
    ✅ Create Invoices
    ✅ Receive Payments
    ✅ Manage Expenses
    ✅ Financial Reports
    ✅ Journal Entries
    ✅ Account Reconciliation

  Reports:
    ✅ Financial Reports
    ✅ Student Reports (billing related)

  Dashboard:
    ✅ View Dashboard
    ✅ View Analytics
```

**Step 3: Admin clicks "Assign Role"**

System automatically:
1. Creates user_role record
2. Loads all 25 permissions from accountant role
3. Updates users.permissions = ["View Financial Records", "Create Invoices", ...]
4. Updates users.accessTo = ["finance", "reports", "dashboard", ...]
5. Creates audit log entry
6. Returns success message

**Step 4: User logs in**

The system automatically:
1. Loads user_roles
2. Loads all permissions from all roles
3. Stores in Redux: `user.permissions = [...]`
4. sidebarData.tsx filters menu items
5. User sees:
   - ✅ Finance menu (with all sub-items)
   - ✅ Reports menu (financial reports)
   - ✅ Dashboard
   - ❌ Students (full management) - Only view for billing
   - ❌ Classes - Not accountant's concern
   - ❌ Exams - Not accountant's concern

---

## Permission Aggregation (Multiple Roles)

If a user has multiple roles, permissions are **combined**:

```javascript
// User assigned two roles
Roles: ["Teacher", "Accountant"]

// System automatically combines
Teacher permissions: 15
Accountant permissions: 25
Total unique permissions: 38 (some overlap removed)

Modules:
  From Teacher: ["students", "classes", "attendance", "exams"]
  From Accountant: ["finance", "reports"]
  Combined: ["students", "classes", "attendance", "exams", "finance", "reports"]
```

---

## API Endpoints for Smart Features

### 1. Get Role Permission Preview
```bash
GET /api/rbac/role-preview/9
# Returns all permissions this role will grant
```

### 2. Get User's Current Effective Permissions
```bash
GET /api/rbac/user-effective-permissions/123?school_id=SCH/1
# Returns combined permissions from all user's roles
```

### 3. Calculate Permission Diff
```bash
POST /api/rbac/permission-diff
{
  "user_id": 123,
  "role_id": 9,
  "action": "assign",
  "school_id": "SCH/1"
}

# Returns:
{
  "permissions_to_add": 25,
  "new_permissions": ["View Financial Records", ...],
  "total_after": 38
}
```

---

## Frontend Integration

The `RoleAssignmentModal` can be enhanced to show **live preview**:

```tsx
// When role is selected in dropdown
const handleRoleChange = async (roleId) => {
  // Get role preview
  const preview = await _get(`api/rbac/role-preview/${roleId}`);

  // Show what will be granted
  setPreview({
    role_name: preview.role_name,
    total_permissions: preview.total_permissions,
    modules: preview.modules,
    permissions_by_module: preview.permissions_by_module
  });
};

// Display in modal
{preview && (
  <Alert
    type="info"
    message={`This role will grant ${preview.total_permissions} permissions across ${preview.modules.length} modules`}
    description={
      <Collapse>
        {Object.entries(preview.permissions_by_module).map(([module, perms]) => (
          <Panel header={`${module} (${perms.length} permissions)`}>
            <ul>
              {perms.map(p => <li>✅ {p.display_name}</li>)}
            </ul>
          </Panel>
        ))}
      </Collapse>
    }
  />
)}
```

---

## Database Sync Process

### On Role Assignment:
```sql
-- 1. Insert into user_roles
INSERT INTO user_roles (user_id, role_id, school_id, branch_id, assigned_by, is_active)
VALUES (123, 9, 'SCH/1', 'BRCH00001', 1, 1);

-- 2. Auto-sync runs
-- Get all permissions from all user's active roles
SELECT p.* FROM permissions p
INNER JOIN role_permissions rp ON p.id = rp.permission_id
INNER JOIN user_roles ur ON rp.role_id = ur.role_id
WHERE ur.user_id = 123 AND ur.is_active = 1;

-- 3. Update user record
UPDATE users
SET
  permissions = '["View Financial Records","Create Invoices",...]',
  accessTo = '["finance","reports","dashboard",...]'
WHERE id = 123;
```

---

## Benefits

### 🎯 **For Admins**
- ✅ One-click role assignment
- ✅ See exactly what you're granting
- ✅ No manual permission selection
- ✅ Consistent access control

### 👥 **For Users**
- ✅ Get all necessary permissions immediately
- ✅ No missing access issues
- ✅ Clear role-based access
- ✅ Easy to understand what they can do

### 🔒 **For Security**
- ✅ Admin can't grant what they don't have
- ✅ Full audit trail
- ✅ Consistent permission sets
- ✅ No permission creep

### 📊 **For Management**
- ✅ Clear role definitions
- ✅ Easy permission audits
- ✅ Compliance reporting
- ✅ Access analytics

---

## Summary

**Before:**
```
Admin: "I need to give John access to finance"
System: "Please select 25 individual permissions"
Admin: "Which ones? I don't know all of them..."
Result: ❌ Incomplete access, user can't do their job
```

**After:**
```
Admin: "I need to give John access to finance"
System: "Assign 'Accountant' role?"
Preview: "Will grant 25 permissions across finance, reports, dashboard"
Admin: "Yes!"
System: ✅ Role assigned, all permissions granted automatically
Result: ✅ John can do his job immediately
```

**🎉 That's the power of smart role assignment!**

---

**Next Steps:**
1. Run `./setup-rbac.sh`
2. Assign roles via UI
3. Watch permissions sync automatically
4. Monitor with audit log

**No manual permission management needed!** 🚀
