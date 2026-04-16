# RBAC Menu System Analysis & Implementation Guide

> **Date:** 2025-12-24  
> **Purpose:** Document current API structure vs sidebarData.tsx and create implementation plan

---

## 🔍 Current API Structure Analysis

### API Endpoint: `/api/rbac/menu`
- **Controller:** `rbacController.getUserMenu()`
- **Data Source:** `rbac_menu_cache` table
- **Features:** Plan/subscription aware, role-based filtering
- **Structure:** Flat categories with items array

### Current Menu Cache Structure:
```json
[
  {
    "name": "Students",
    "icon": "UserOutlined", 
    "items": [
      {
        "key": "STUDENT_MANAGEMENT",
        "label": "Student List",
        "icon": "UserOutlined",
        "route": "/students"
      }
    ]
  }
]
```

### Key API Features:
1. **Subscription Awareness:** Checks `subscription_packages` and `rbac_school_packages`
2. **Feature Filtering:** Based on package features + overrides
3. **Role-based Access:** `requiredAccess` and `requiredPermissions` filtering
4. **User Type Filtering:** Direct user_type matching (superadmin, developer, etc.)

---

## 📊 Subscription Packages

| Package | Features | Price/Student/Term |
|---------|----------|-------------------|
| **Standard** | students, teachers, classes, exams, fees, reports, communication | ₦500 |
| **Premium** | Standard + accounting, lesson_plans | ₦700 |
| **Elite** | Premium + recitation, payroll, assets | ₦1000 |

---

## 🔄 sidebarData.tsx vs API Comparison

### Current API (6 sections):
1. Students (2 items)
2. Academic (3 items) 
3. Staff (1 item)
4. Finance (2 items)
5. Communication (1 item)
6. Settings (1 item)

### sidebarData.tsx (11+ major sections):
1. **MAIN** - Dashboard
2. **Personal Data Mngr** - Students, Parents, Staff, Admission, Attendance
3. **Class Management** - Daily Routine, Extras
4. **Supply Management** - Asset Management, Inventory (Elite)
5. **Notifications** - Task/Todo, Notice Board
6. **My Children** - Parent routes
7. **My School Activities** - Student routes
8. **General Setups** - School Setup
9. **Exams & Records** - Examinations
10. **Super Admin** - School management
11. **Express Finance** - Advanced finance features

---

## 🎯 Missing Features Mapping

### 1. Dashboard Section
**API Location:** New top-level category
```json
{
  "name": "Dashboard",
  "icon": "DashboardOutlined",
  "requiredAccess": ["admin", "teacher", "student", "parent"],
  "items": [
    {
      "key": "ADMIN_DASHBOARD",
      "label": "Admin Dashboard", 
      "route": "/admin/dashboard",
      "requiredAccess": ["admin", "branchadmin"]
    },
    {
      "key": "TEACHER_DASHBOARD",
      "label": "Teacher Dashboard",
      "route": "/teacher/dashboard", 
      "requiredAccess": ["teacher"]
    }
  ]
}
```

### 2. Personal Data Management
**API Location:** Expand "Students" section or create new "People Management"
```json
{
  "name": "People Management",
  "icon": "TeamOutlined",
  "items": [
    {
      "key": "STUDENT_LIST",
      "label": "Student List",
      "route": "/students"
    },
    {
      "key": "PARENT_LIST", 
      "label": "Parent List",
      "route": "/parents"
    },
    {
      "key": "STAFF_LIST",
      "label": "Staff List", 
      "route": "/staff"
    },
    {
      "key": "ADMISSION_DASHBOARD",
      "label": "Admission",
      "route": "/admission"
    }
  ]
}
```

### 3. Class Management
**API Location:** Expand "Academic" section
```json
{
  "name": "Academic",
  "icon": "BookOutlined",
  "items": [
    {
      "key": "CLASS_TIMETABLE",
      "label": "Class Timetable",
      "route": "/timetable"
    },
    {
      "key": "LESSONS",
      "label": "Lessons", 
      "route": "/lessons"
    },
    {
      "key": "ASSIGNMENTS",
      "label": "Assignments",
      "route": "/assignments"
    },
    {
      "key": "VIRTUAL_CLASS",
      "label": "Virtual Class",
      "route": "/virtual-class",
      "feature": "virtual_classroom"
    }
  ]
}
```

### 4. Supply Management (Elite Package)
**API Location:** New category with elite package requirement
```json
{
  "name": "Supply Management", 
  "icon": "ShoppingCartOutlined",
  "elite": true,
  "items": [
    {
      "key": "ASSET_MANAGEMENT",
      "label": "Asset Management",
      "route": "/assets",
      "elite": true
    },
    {
      "key": "INVENTORY_MANAGEMENT", 
      "label": "Inventory Management",
      "route": "/inventory",
      "elite": true
    }
  ]
}
```

### 5. Examinations & Records
**API Location:** New "Examinations" category
```json
{
  "name": "Examinations",
  "icon": "FileTextOutlined", 
  "items": [
    {
      "key": "ASSESSMENT_FORM",
      "label": "Assessment Form",
      "route": "/assessments"
    },
    {
      "key": "REPORTS_GENERATOR",
      "label": "Reports Generator", 
      "route": "/reports/generator"
    },
    {
      "key": "BROAD_SHEET",
      "label": "Broad Sheet",
      "route": "/reports/broadsheet"
    }
  ]
}
```

### 6. Advanced Finance (Premium/Elite)
**API Location:** Expand "Finance" section
```json
{
  "name": "Finance",
  "icon": "DollarOutlined",
  "items": [
    {
      "key": "FEE_COLLECTION",
      "label": "Fee Collection", 
      "route": "/payments"
    },
    {
      "key": "FINANCIAL_REPORTS",
      "label": "Financial Reports",
      "route": "/reports/financial"
    },
    {
      "key": "PAYROLL_MANAGEMENT",
      "label": "Payroll Management",
      "route": "/payroll",
      "premium": true
    },
    {
      "key": "ACCOUNTING_COMPLIANCE",
      "label": "Accounting",
      "route": "/accounting", 
      "premium": true
    }
  ]
}
```

### 7. Super Admin Features
**API Location:** New category with superadmin access
```json
{
  "name": "Super Admin",
  "icon": "CrownOutlined",
  "requiredAccess": ["superadmin"],
  "items": [
    {
      "key": "CREATE_SCHOOL",
      "label": "Create School",
      "route": "/superadmin/schools/create"
    },
    {
      "key": "SCHOOL_LIST", 
      "label": "School List",
      "route": "/superadmin/schools"
    },
    {
      "key": "SUPPORT_DASHBOARD",
      "label": "Support Dashboard",
      "route": "/superadmin/support"
    }
  ]
}
```

---

## 🛠️ Implementation Strategy

### Phase 1: Database Updates
1. **Update menu cache** with comprehensive structure
2. **Add missing feature keys** to features table
3. **Update subscription packages** with new features

### Phase 2: API Structure Enhancement
1. **Hierarchical menu support** (submenuItems)
2. **Enhanced filtering logic** for packages
3. **Role-based permission checking**

### Phase 3: Feature Addition via curl
1. **Create curl commands** for each missing section
2. **Test subscription filtering**
3. **Validate role-based access**

---

## 📝 Next Steps

1. **Map all sidebarData.tsx sections** to API structure
2. **Create curl commands** to populate missing features
3. **Test subscription-based filtering**
4. **Document final API structure**

---

*This document will be updated as we implement each phase.*
