# RBAC API Quick Reference Card

## Authentication
```bash
# Login
POST /users/login
Body: {"username": "Elite Developer", "password": "123456", "school_id": "SCH/1"}
Returns: {"success": true, "token": "Bearer ..."}

# Use token in all requests
Authorization: Bearer <token>
```

## Developer APIs (Developer role only)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/rbac/developer/super-admins` | GET | List all SuperAdmins |
| `/api/rbac/developer/create-superadmin` | POST | Create new SuperAdmin |
| `/api/rbac/developer/update-superadmin-permissions` | POST | Update SuperAdmin features |

### Create SuperAdmin
```bash
POST /api/rbac/developer/create-superadmin
{
  "name": "Admin Name",
  "email": "admin@example.com",
  "password": "password123"
}
```

### Update Permissions
```bash
POST /api/rbac/developer/update-superadmin-permissions
{
  "superadmin_id": 1030,
  "allowed_features": ["student_management", "attendance"]
}
```

## SuperAdmin/Developer APIs

| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/api/rbac/super-admin/schools-subscriptions` | GET | List schools | SA: own schools, Dev: all |
| `/api/rbac/super-admin/packages` | GET | List packages | Both |
| `/api/rbac/super-admin/all-features` | GET | List features | Both |
| `/api/rbac/super-admin/assign-package` | POST | Assign package | SA: own schools, Dev: all |
| `/api/rbac/super-admin/school-overrides/:id` | GET | Get overrides | SA: own schools, Dev: all |
| `/api/rbac/super-admin/toggle-feature` | POST | Toggle feature | SA: own schools, Dev: all |

### Assign Package
```bash
POST /api/rbac/super-admin/assign-package
{
  "school_id": "SCH/1",
  "package_id": 1,
  "start_date": "2025-01-01",
  "end_date": "2025-12-31"
}
```

### Toggle Feature
```bash
POST /api/rbac/super-admin/toggle-feature
{
  "school_id": "SCH/1",
  "feature_code": "financial_management",
  "enabled": false
}
```

## Packages

| ID | Name | Price | Features Count |
|----|------|-------|----------------|
| 1 | Standard | 500 | 3 |
| 2 | Premium | 700 | 5 |
| 3 | Elite | 1000 | 8 |

## Features by Package

### Standard (3)
- student_management
- attendance
- basic_reports

### Premium (5)
- All Standard +
- financial_management
- sms_notifications

### Elite (8)
- All Premium +
- advanced_analytics
- parent_portal
- teacher_portal

## Access Control Rules

### Developer
- ✅ Create/manage SuperAdmins
- ✅ View ALL schools
- ✅ Assign packages to ANY school
- ✅ Toggle features for ANY school

### SuperAdmin
- ❌ Cannot manage other SuperAdmins
- ✅ View ONLY schools they created
- ✅ Assign packages to OWN schools only
- ✅ Toggle features for OWN schools only

## Test Scripts

```bash
# Complete RBAC flow test
./TEST_RBAC_COMPLETE_FLOW.sh

# Package subscription test
./TEST_PACKAGE_SUBSCRIPTION.sh
```

## Common Responses

### Success
```json
{"success": true, "message": "..."}
{"success": true, "data": [...]}
```

### Errors
```json
{"success": false, "error": "Developer access only"}
{"success": false, "error": "Super admin or Developer only"}
{"success": false, "error": "Access denied to this school"}
```

## Database Tables

- `subscription_packages` - Package definitions
- `rbac_school_packages` - School-package assignments
- `features` - Available features
- `users` - User accounts (has `allowed_features` JSON column)

## Key Files

- `/elscholar-api/src/routes/rbac.js` - RBAC routes
- `/elscholar-api/src/middleware/auth.js` - JWT authentication
- `RBAC_MINIMAL_MIGRATION.sql` - Database setup
- `RBAC_API_TESTING_GUIDE.md` - Full documentation
