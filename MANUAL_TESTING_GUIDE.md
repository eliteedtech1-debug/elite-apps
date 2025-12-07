# Manual Testing Guide - RBAC System

## Prerequisites

1. **Start Backend Server**
```bash
cd /Users/apple/Downloads/apps/elite/elscholar-api
npm run dev
# Or
pm2 start elite
```

2. **Verify Backend is Running**
```bash
curl http://localhost:34567/api/health
# Should return: {"status":"ok"}
```

---

## Test Flow

### 1. Login as Developer

**Endpoint**: `POST /api/auth/login`

**Request**:
```bash
curl -X POST http://localhost:34567/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@elitescholar.ng",
    "password": "123456"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Elite Developer",
    "email": "developer@elitescholar.ng",
    "user_type": "Developer"
  }
}
```

**Save the token** for subsequent requests!

---

### 2. Verify Token

**Endpoint**: `GET /api/auth/verify-token`

**Request**:
```bash
curl -X GET http://localhost:34567/api/auth/verify-token \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "email": "developer@elitescholar.ng",
    "user_type": "Developer"
  }
}
```

---

### 3. Get All SuperAdmins

**Endpoint**: `GET /api/developer/super-admins`

**Request**:
```bash
curl -X GET http://localhost:34567/api/developer/super-admins \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "success": true,
  "data": []
}
```

---

### 4. Create SuperAdmin

**Endpoint**: `POST /api/developer/create-superadmin`

**Request**:
```bash
curl -X POST http://localhost:34567/api/developer/create-superadmin \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Marketing SuperAdmin",
    "email": "marketing@elitescholar.ng",
    "password": "super123456"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "SuperAdmin created successfully"
}
```

---

### 5. Update SuperAdmin Permissions

**Endpoint**: `POST /api/developer/update-superadmin-permissions`

**Request**:
```bash
curl -X POST http://localhost:34567/api/developer/update-superadmin-permissions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "superadmin_id": 2,
    "allowed_features": ["students", "teachers", "fees"]
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Permissions updated successfully"
}
```

---

### 6. Get All Subscription Packages

**Endpoint**: `GET /api/super-admin/packages`

**Request**:
```bash
curl -X GET http://localhost:34567/api/super-admin/packages \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "package_name": "elite",
      "display_name": "Elite Package",
      "price_monthly": 1000.00,
      "features": ["students", "teachers", "classes", "exams", "fees", "accounting", "reports", "communication", "recitation", "lesson_plans", "payroll", "assets", "inventory"]
    },
    {
      "id": 2,
      "package_name": "premium",
      "display_name": "Premium Package",
      "price_monthly": 700.00,
      "features": ["students", "teachers", "classes", "exams", "fees", "accounting", "reports", "communication", "lesson_plans"]
    },
    {
      "id": 3,
      "package_name": "standard",
      "display_name": "Standard Package",
      "price_monthly": 500.00,
      "features": ["students", "teachers", "classes", "exams", "fees", "reports", "communication"]
    }
  ]
}
```

---

### 7. Get All Features

**Endpoint**: `GET /api/super-admin/all-features`

**Request**:
```bash
curl -X GET http://localhost:34567/api/super-admin/all-features \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "feature_key": "students",
      "feature_name": "Student Management",
      "is_active": 1
    },
    {
      "feature_key": "teachers",
      "feature_name": "Teacher Management",
      "is_active": 1
    }
  ]
}
```

---

### 8. Create School with Subscription

**Endpoint**: `POST /api/school/create`

**Request**:
```bash
curl -X POST http://localhost:34567/api/school/create \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "school_name": "Elite Test School",
    "short_name": "ETS",
    "email_address": "info@elitetestschool.ng",
    "primary_contact_number": "08012345678",
    "state": "Lagos",
    "lga": "Ikeja",
    "address": "123 Test Street, Ikeja",
    "school_motto": "Excellence in Education",
    "admin_name": "School Admin",
    "admin_email": "admin@elitetestschool.ng",
    "admin_password": "admin123456",
    "nurserySection": true,
    "primarySection": true,
    "juniorSecondary": true,
    "seniorSecondary": true,
    "pricing_plan_id": 1,
    "subscription_type": "annually",
    "active_students_count": 500,
    "agreed_discount_percentage": 0
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "School created successfully",
  "school_id": "SCH/XX"
}
```

**This should**:
- Create school in `school_setup` table
- Create subscription in `school_subscriptions` table
- Create invoice in `subscription_invoices` table
- Calculate: 500 students × NGN 500 × 3 terms = NGN 750,000
- Apply 15% discount: NGN 750,000 - NGN 112,500 = NGN 637,500

---

### 9. Verify School Subscription Created

**Query Database**:
```sql
-- Check school created
SELECT school_id, school_name, created_by FROM school_setup 
WHERE school_name = 'Elite Test School';

-- Check subscription created
SELECT * FROM school_subscriptions 
WHERE school_id = 'SCH/XX';

-- Check invoice created
SELECT * FROM subscription_invoices 
WHERE school_id = 'SCH/XX';
```

---

### 10. Assign RBAC Package to School

**Endpoint**: `POST /api/super-admin/assign-package`

**Request**:
```bash
curl -X POST http://localhost:34567/api/super-admin/assign-package \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "school_id": "SCH/XX",
    "package_id": 2,
    "start_date": "2025-12-07",
    "end_date": "2026-12-07"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Package assigned successfully"
}
```

---

### 11. Get Schools with RBAC Packages

**Endpoint**: `GET /api/super-admin/schools-subscriptions`

**Request**:
```bash
curl -X GET http://localhost:34567/api/super-admin/schools-subscriptions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "school_id": "SCH/XX",
      "school_name": "Elite Test School",
      "package_name": "premium",
      "package_display_name": "Premium Package",
      "start_date": "2025-12-07",
      "end_date": "2026-12-07",
      "is_active": 1
    }
  ]
}
```

---

### 12. Toggle Feature for School

**Endpoint**: `POST /api/super-admin/toggle-feature`

**Request**:
```bash
curl -X POST http://localhost:34567/api/super-admin/toggle-feature \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "school_id": "SCH/XX",
    "feature_code": "recitation",
    "enabled": true
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Feature toggled successfully"
}
```

---

### 13. Get School Feature Overrides

**Endpoint**: `GET /api/super-admin/school-overrides/SCH/XX`

**Request**:
```bash
curl -X GET http://localhost:34567/api/super-admin/school-overrides/SCH/XX \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "recitation": true
  }
}
```

---

## Test Different Packages

### Test 1: Standard Package (500 students)
```bash
# Create school with Standard package
pricing_plan_id: 1
active_students_count: 500
subscription_type: "annually"

# Expected Calculation:
# Per term: 500 × NGN 500 = NGN 250,000
# Annual: NGN 250,000 × 3 = NGN 750,000
# Discount (15%): NGN 750,000 × 0.15 = NGN 112,500
# Final: NGN 750,000 - NGN 112,500 = NGN 637,500
```

### Test 2: Premium Package (1000 students)
```bash
# Create school with Premium package
pricing_plan_id: 2
active_students_count: 1000
subscription_type: "annually"

# Expected Calculation:
# Per term: 1000 × NGN 700 = NGN 700,000
# Annual: NGN 700,000 × 3 = NGN 2,100,000
# Discount (15%): NGN 2,100,000 × 0.15 = NGN 315,000
# Final: NGN 2,100,000 - NGN 315,000 = NGN 1,785,000
```

### Test 3: Elite Package (2000 students)
```bash
# Create school with Elite package
pricing_plan_id: 3
active_students_count: 2000
subscription_type: "annually"

# Expected Calculation:
# Per term: 2000 × NGN 1000 = NGN 2,000,000
# Annual: NGN 2,000,000 × 3 = NGN 6,000,000
# Discount (15%): NGN 6,000,000 × 0.15 = NGN 900,000
# Final: NGN 6,000,000 - NGN 900,000 = NGN 5,100,000
```

---

## Verification Queries

```sql
-- Check all schools created
SELECT school_id, school_name, created_by FROM school_setup 
ORDER BY created_at DESC LIMIT 10;

-- Check subscriptions (OLD pricing system)
SELECT 
  school_id, 
  pricing_plan_id, 
  subscription_type,
  active_students_count,
  base_cost,
  total_cost,
  status
FROM school_subscriptions 
ORDER BY created_at DESC LIMIT 10;

-- Check invoices
SELECT 
  school_id,
  amount,
  discount_amount,
  total_amount,
  status
FROM subscription_invoices 
ORDER BY created_at DESC LIMIT 10;

-- Check RBAC packages assigned
SELECT 
  rsp.school_id,
  sp.package_name,
  sp.display_name,
  rsp.start_date,
  rsp.end_date,
  rsp.is_active
FROM rbac_school_packages rsp
JOIN subscription_packages sp ON rsp.package_id = sp.id
ORDER BY rsp.created_at DESC;

-- Check SuperAdmins created
SELECT id, name, email, user_type, allowed_features 
FROM users 
WHERE user_type = 'SuperAdmin';
```

---

## Expected Results Summary

✅ **Developer Login**: Token generated successfully  
✅ **Token Verification**: Valid token with Developer permissions  
✅ **SuperAdmin Creation**: New SuperAdmin account created  
✅ **Permission Management**: SuperAdmin permissions updated  
✅ **Package Listing**: 3 packages (Standard, Premium, Elite)  
✅ **Feature Listing**: 12+ features available  
✅ **School Creation**: School + Subscription + Invoice created  
✅ **Invoice Calculation**: Correct pricing with 15% annual discount  
✅ **RBAC Package Assignment**: Package assigned to school  
✅ **Feature Override**: Custom features enabled for school  

---

## Troubleshooting

**Issue**: Login fails  
**Solution**: Check if developer account exists and user_type is 'Developer'
```sql
SELECT * FROM users WHERE email = 'developer@elitescholar.ng';
UPDATE users SET user_type = 'Developer' WHERE email = 'developer@elitescholar.ng';
```

**Issue**: 403 Forbidden  
**Solution**: Check token is valid and user has correct permissions

**Issue**: School creation fails  
**Solution**: Check if subscription_pricing table has data
```sql
SELECT * FROM subscription_pricing;
```

**Issue**: Invoice not created  
**Solution**: Check school_subscriptions and subscription_invoices tables exist

---

**Ready for Testing!**  
Start the backend and follow the steps above to test the complete RBAC system.
