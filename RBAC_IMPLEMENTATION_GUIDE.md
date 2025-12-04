# 🔐 Top-Tier RBAC Implementation Guide
**Elite Scholar - Role-Based Access Control System**

## 📋 Table of Contents
1. [Overview](#overview)
2. [Quick Setup (5 Minutes)](#quick-setup)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Integration](#frontend-integration)
7. [Subscription-Based Permissions](#subscription-based-permissions)
8. [SuperAdmin Global Control](#superadmin-global-control)
9. [Testing Guide](#testing-guide)
10. [Troubleshooting](#troubleshooting)

---

## 📖 Overview

This RBAC system provides **enterprise-grade** role and permission management with:

✅ **Relational Permission Structure** - No more TEXT fields!
✅ **Dynamic Role Assignment** - Assign/revoke roles via UI
✅ **Admin Constraint** - Admins can only grant permissions they have
✅ **Subscription Integration** - Tie features to Standard/Premium/Elite plans
✅ **Full Audit Trail** - Track all permission changes
✅ **SuperAdmin Control** - Global management of all school admins
✅ **Multi-Tenancy Support** - School and branch-level isolation

### Default Roles
- **superadmin** - Full system access (all schools)
- **developer** - Technical system maintenance
- **admin** - School administrator (full school access)
- **branchadmin** - Branch administrator
- **teacher** - Regular teaching staff
- **form_master** - Class teacher with extended permissions
- **exam_officer** - Examination management
- **accountant** - Financial management
- **cashier** - Payment processing
- **manager** - Cross-department operations
- **storekeeper** - Inventory management
- **parent** - Student information access
- **student** - Personal academic information

---

## ⚡ Quick Setup (5 Minutes)

### Step 1: Run Database Migrations

```bash
cd /Users/apple/Downloads/apps/elite

# Option A: Run all migrations in order
mysql -u root elite_db < migrations/001_create_rbac_tables.sql
mysql -u root elite_db < migrations/002_seed_rbac_default_data.sql
mysql -u root elite_db < migrations/003_upgrade_existing_rbac_tables.sql

# Option B: Use the setup script
chmod +x setup-rbac.sh
./setup-rbac.sh
```

### Step 2: Restart Backend Server

```bash
cd elscholar-api
pm2 restart elite
# OR for development
yarn dev
```

### Step 3: Verify Installation

```bash
# Check tables were created
mysql -u root elite_db -e "SELECT COUNT(*) FROM roles; SELECT COUNT(*) FROM permissions;"

# Test API endpoint
curl http://localhost:34567/api/rbac/roles \
  -H "x-school-id: SCH/1" \
  -H "x-branch-id: BRCH00001"
```

### Step 4: Update Teacher List UI

Add the "Assign Roles" option to the teacher list action dropdown:

**File:** `elscholar-ui/src/feature-module/peoples/teacher/teacher-list/index.tsx`

```tsx
import RoleAssignmentModal from './RoleAssignmentModal';

// Add state
const [roleModalVisible, setRoleModalVisible] = useState(false);
const [selectedTeacherForRole, setSelectedTeacherForRole] = useState(null);

// Add to actions dropdown items (around line 800)
{
  key: 'assign_roles',
  label: 'Assign Roles',
  icon: <SafetyOutlined />,
  onClick: () => {
    setSelectedTeacherForRole(record);
    setRoleModalVisible(true);
  },
}

// Add modal at the bottom before closing tag
<RoleAssignmentModal
  visible={roleModalVisible}
  teacher={selectedTeacherForRole}
  onClose={() => {
    setRoleModalVisible(false);
    setSelectedTeacherForRole(null);
  }}
  onSuccess={() => {
    fetchTeachers();
  }}
/>
```

**✅ Done! You now have a fully functional RBAC system.**

---

## 🏗️ Architecture

### Data Flow

```
User Login
    ↓
JWT Token Generated (contains user_id, school_id, branch_id)
    ↓
Load User Roles (from user_roles table)
    ↓
Load Role Permissions (from role_permissions → permissions)
    ↓
Store in Redux (user.permissions array)
    ↓
Check Permission (sidebarData.tsx filters menu items)
    ↓
API Endpoint (middleware checks req.user.permissions)
```

### Permission Checking Logic

```javascript
// Backend middleware
const hasPermission = (user, requiredPermission) => {
  // 1. Check if superadmin/developer (auto-allow)
  if (['superadmin', 'Developer'].includes(user.user_type)) return true;

  // 2. Get all user roles
  const userRoles = await getUserRoles(user.id, user.school_id, user.branch_id);

  // 3. Get all permissions from all roles
  const permissions = userRoles.flatMap(role => role.permissions);

  // 4. Check if required permission exists
  return permissions.some(p => p.name === requiredPermission);
};
```

---

## 💾 Database Schema

### Core Tables

#### `roles`
```sql
id                INT PK AUTO_INCREMENT
name              VARCHAR(100) UNIQUE -- Machine name
display_name      VARCHAR(255)        -- Human-readable
description       TEXT
is_system_role    BOOLEAN            -- Cannot be deleted
school_id         VARCHAR(10)        -- NULL for global roles
branch_id         VARCHAR(20)        -- NULL for school-wide
created_by        INT FK(users.id)
updated_by        INT FK(users.id)
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

#### `permissions`
```sql
id                     INT PK AUTO_INCREMENT
name                   VARCHAR(100) UNIQUE -- e.g., "students.create"
display_name           VARCHAR(255)
description            TEXT
module                 VARCHAR(50)         -- e.g., "students", "finance"
action                 VARCHAR(50)         -- e.g., "create", "read", "update"
is_system_permission   BOOLEAN
created_at             TIMESTAMP
updated_at             TIMESTAMP
```

#### `user_roles`
```sql
id            INT PK AUTO_INCREMENT
user_id       INT FK(users.id)
role_id       INT FK(roles.id)
school_id     VARCHAR(10)
branch_id     VARCHAR(20)
assigned_by   INT FK(users.id)
assigned_at   TIMESTAMP
expires_at    TIMESTAMP NULL
is_active     BOOLEAN
revoked_by    INT FK(users.id)
revoked_at    TIMESTAMP NULL
revoke_reason TEXT
```

#### `role_permissions`
```sql
id            INT PK AUTO_INCREMENT
role_id       INT FK(roles.id)
permission_id INT FK(permissions.id)
granted_by    INT FK(users.id)
created_at    TIMESTAMP
```

#### `permission_audit_log`
```sql
id              INT PK AUTO_INCREMENT
user_id         INT FK(users.id)
target_user_id  INT FK(users.id)
action          ENUM(role_assigned, role_revoked, ...)
entity_type     ENUM(role, permission, user_role, ...)
entity_id       INT
old_value       JSON
new_value       JSON
reason          TEXT
ip_address      VARCHAR(45)
user_agent      TEXT
school_id       VARCHAR(10)
branch_id       VARCHAR(20)
created_at      TIMESTAMP
```

---

## 🔌 Backend Implementation

### API Endpoints

#### Get All Roles
```bash
GET /api/rbac/roles
Headers:
  x-school-id: SCH/1
  x-branch-id: BRCH00001
Query:
  include_system: true/false

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "admin",
      "display_name": "School Administrator",
      "permissions": [...]
    }
  ]
}
```

#### Assign Role to User
```bash
POST /api/rbac/assign-role
Headers:
  x-school-id: SCH/1
  x-user-id: 123
Body:
{
  "user_id": 456,
  "role_id": 3,
  "school_id": "SCH/1",
  "branch_id": "BRCH00001",
  "expires_at": null
}

Response:
{
  "success": true,
  "message": "Role assigned successfully"
}

Error (403):
{
  "success": false,
  "message": "You cannot assign a role with permissions you do not have",
  "missing_permissions": ["finance.view", "finance.create_invoice"]
}
```

#### Revoke Role
```bash
POST /api/rbac/revoke-role
Body:
{
  "user_id": 456,
  "role_id": 3,
  "school_id": "SCH/1",
  "branch_id": "BRCH00001",
  "reason": "Employee transferred to different department"
}
```

#### Get User Roles
```bash
GET /api/rbac/user-roles/456?school_id=SCH/1&branch_id=BRCH00001

Response:
{
  "success": true,
  "data": {
    "roles": [...],
    "all_permissions": ["students.view", "students.create", ...]
  }
}
```

#### Get All Permissions
```bash
GET /api/rbac/permissions

Response:
{
  "success": true,
  "data": {
    "permissions": [...],
    "grouped": {
      "students": [...],
      "finance": [...],
      "exams": [...]
    }
  }
}
```

#### Check Permission
```bash
GET /api/rbac/check-permission?permission=students.create

Response:
{
  "success": true,
  "has_permission": true
}
```

#### Audit Log
```bash
GET /api/rbac/audit-log?limit=50&offset=0&action=role_assigned

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "action": "role_assigned",
      "actor": { "name": "Admin User" },
      "target": { "name": "Teacher Name" },
      "new_value": { "role_name": "Form Master" },
      "created_at": "2025-11-19T10:30:00Z"
    }
  ]
}
```

---

## 🎨 Frontend Integration

### Step 1: Update sidebarData.tsx

**File:** `elscholar-ui/src/core/data/json/sidebarData.tsx`

```tsx
// Keep existing logic, it already works with the new system!
// The new backend loads user permissions and stores them in Redux
// sidebarData already filters by requiredPermissions array

// No changes needed unless you want to add new menu items
```

### Step 2: Add Role Assignment to Teacher List

Already created! Import and use `RoleAssignmentModal.tsx`

### Step 3: Create SuperAdmin Role Management Page

**File:** `elscholar-ui/src/feature-module/mainMenu/superAdminDashboard/RoleManagementPanel.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Tag, Space } from 'antd';
import { _get, _post } from '../../Utils/Helper';

const RoleManagementPanel = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = () => {
    _get('api/rbac/roles', (res) => {
      if (res.success) setRoles(res.data);
    });
  };

  const fetchPermissions = () => {
    _get('api/rbac/permissions', (res) => {
      if (res.success) setPermissions(res.data.permissions);
    });
  };

  const handleCreateRole = async () => {
    const values = await form.validateFields();
    _post('api/rbac/roles', values, (res) => {
      if (res.success) {
        message.success('Role created successfully');
        setModalVisible(false);
        fetchRoles();
      }
    });
  };

  const columns = [
    { title: 'Role Name', dataIndex: 'display_name' },
    { title: 'Description', dataIndex: 'description' },
    {
      title: 'Permissions',
      dataIndex: 'permissions',
      render: (perms: any[]) => (
        <Tag color="blue">{perms?.length || 0} permissions</Tag>
      ),
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Button size="small">Edit</Button>
          <Button size="small" danger disabled={record.is_system_role}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button type="primary" onClick={() => setModalVisible(true)}>
        Create New Role
      </Button>

      <Table
        dataSource={roles}
        columns={columns}
        rowKey="id"
        style={{ marginTop: 16 }}
      />

      <Modal
        title="Create New Role"
        open={modalVisible}
        onOk={handleCreateRole}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Role Name" rules={[{ required: true }]}>
            <Input placeholder="e.g., custom_manager" />
          </Form.Item>
          <Form.Item name="display_name" label="Display Name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Custom Manager" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="permission_ids" label="Permissions">
            <Select mode="multiple" placeholder="Select permissions">
              {permissions.map((p: any) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.display_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleManagementPanel;
```

---

## 💳 Subscription-Based Permissions

### Add Subscription Tier to Permissions

```sql
-- Add subscription_tier column to permissions
ALTER TABLE permissions
  ADD COLUMN subscription_tier ENUM('Standard', 'Premium', 'Elite') NULL
  COMMENT 'Required subscription tier for this permission';

-- Mark premium features
UPDATE permissions
SET subscription_tier = 'Premium'
WHERE module IN ('inventory', 'payroll');

UPDATE permissions
SET subscription_tier = 'Elite'
WHERE module = 'reports' AND action = 'custom';
```

### Backend Check

```javascript
// In rbac.js route
const hasSubscriptionForPermission = (school, permission) => {
  if (!permission.subscription_tier) return true;

  const tierLevels = {
    'Standard': 1,
    'Premium': 2,
    'Elite': 3
  };

  const requiredLevel = tierLevels[permission.subscription_tier] || 0;
  const schoolLevel = tierLevels[school.subscription_plan] || 0;

  return schoolLevel >= requiredLevel;
};

// Use in assign-role endpoint
const rolePermissions = role.permissions.filter(p =>
  hasSubscriptionForPermission(school, p)
);

if (rolePermissions.length < role.permissions.length) {
  return res.status(403).json({
    success: false,
    message: 'Some permissions require a higher subscription tier',
    required_tier: 'Premium' // or 'Elite'
  });
}
```

---

## 👑 SuperAdmin Global Control

### SuperAdmin Dashboard Integration

**File:** `elscholar-ui/src/feature-module/mainMenu/superAdminDashboard/SchoolAdminManagement.tsx`

```tsx
import React, { useState } from 'react';
import { Table, Button, Modal, message } from 'antd';
import { SafetyOutlined } from '@ant-design/icons';
import RoleAssignmentModal from '../../peoples/teacher/teacher-list/RoleAssignmentModal';

const SchoolAdminManagement = () => {
  const [schools, setSchools] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [roleModalVisible, setRoleModalVisible] = useState(false);

  const columns = [
    { title: 'School Name', dataIndex: 'school_name' },
    { title: 'Admin Name', dataIndex: 'admin_name' },
    { title: 'Current Roles', render: (_, record) => renderRoles(record.roles) },
    {
      title: 'Actions',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<SafetyOutlined />}
          onClick={() => {
            setSelectedAdmin(record.admin);
            setRoleModalVisible(true);
          }}
        >
          Manage Roles
        </Button>
      ),
    },
  ];

  return (
    <>
      <Table dataSource={schools} columns={columns} />

      <RoleAssignmentModal
        visible={roleModalVisible}
        teacher={selectedAdmin}
        onClose={() => setRoleModalVisible(false)}
        onSuccess={() => {
          message.success('School admin roles updated');
          // Refresh schools list
        }}
      />
    </>
  );
};
```

### Update School List Page

**File:** `elscholar-ui/src/feature-module/peoples/school-Setup/school-list.tsx`

Add "Manage Admin Roles" button to actions column, using the same `RoleAssignmentModal`.

---

## 🧪 Testing Guide

### 1. Test Role Assignment

```bash
# Login as admin
# Assign "accountant" role to a teacher
curl -X POST http://localhost:34567/api/rbac/assign-role \
  -H "Content-Type: application/json" \
  -H "x-school-id: SCH/1" \
  -H "x-user-id: 1" \
  -d '{
    "user_id": 123,
    "role_id": 9,
    "school_id": "SCH/1",
    "branch_id": "BRCH00001"
  }'
```

### 2. Test Permission Constraint

```bash
# Try to assign a role with permissions you don't have
# Should return 403 error with missing_permissions array
```

### 3. Test Role Revocation

```bash
curl -X POST http://localhost:34567/api/rbac/revoke-role \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 123,
    "role_id": 9,
    "school_id": "SCH/1",
    "reason": "Test revocation"
  }'
```

### 4. Verify Audit Log

```bash
curl http://localhost:34567/api/rbac/audit-log?limit=10
```

### 5. Frontend Testing

1. Login as admin
2. Go to Staff List
3. Click actions dropdown for a teacher
4. Click "Assign Roles"
5. Select "Accountant" role
6. Click "Assign Role"
7. Verify role appears in "Currently Assigned Roles"
8. Try to revoke the role
9. Verify audit log entry

---

## 🐛 Troubleshooting

### Issue: Migration fails with "Table already exists"

**Solution:** The upgrade migration (003) handles existing tables. Run it instead:

```bash
mysql -u root elite_db < migrations/003_upgrade_existing_rbac_tables.sql
```

### Issue: API returns "You do not have permission to manage roles"

**Cause:** Your user doesn't have `settings.roles` permission.

**Solution:**
```sql
-- Add permission to your role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
  AND p.name = 'settings.roles';
```

### Issue: Role assignment modal shows empty roles list

**Check:**
1. Backend API is running
2. Network request succeeds (check browser console)
3. Database has roles seeded

```sql
SELECT COUNT(*) FROM roles;
-- Should return > 0
```

### Issue: Cannot assign role - "missing permissions" error

**This is expected!** It means you're trying to assign a role with permissions you don't have. Only superadmin can bypass this check.

---

## 📝 Next Steps

### Phase 1: Basic Implementation (DONE)
- ✅ Database schema
- ✅ Backend API
- ✅ Role assignment UI
- ✅ Basic permission checking

### Phase 2: Advanced Features
- [ ] Permission expiration reminders
- [ ] Bulk role assignment
- [ ] Role templates
- [ ] Custom permission creation via UI

### Phase 3: Analytics & Reporting
- [ ] Permission usage analytics
- [ ] Role distribution charts
- [ ] Audit log visualization
- [ ] Compliance reports

---

## 🎉 Congratulations!

You now have a **top-tier enterprise-grade RBAC system** with:

- ✅ Dynamic role assignment
- ✅ Permission-level access control
- ✅ Admin constraints (can only grant what they have)
- ✅ Subscription-based feature gating
- ✅ SuperAdmin global control
- ✅ Full audit trail
- ✅ Multi-tenancy support

**Need help?** Check the troubleshooting section or review the API documentation.

---

**Version:** 1.0.0
**Last Updated:** 2025-11-19
**Author:** Claude Code
