# Sidebar Structure - Visual Reference

## 📊 Complete Sidebar Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    ELITE SCHOLAR SIDEBAR                     │
└─────────────────────────────────────────────────────────────┘

📌 MAIN
├── 🏠 Dashboard
│   └── [Role-specific dashboard]

📌 Personal Data Mngr
├── 🏫 Students List
│   ├── Student List
│   ├── Class List
│   └── Promotion & Graduation
├── 👨‍👩‍👧 Parent List
└── 👥 Staff List

📌 Class Management
├── ⚙️ Daily Routine
│   ├── Class Time Table
│   ├── Class Attendance
│   ├── Lessons
│   └── Assignments
└── ➕ Extras
    ├── Virtual Class
    └── Syllabus

📌 Supply Management
├── 📦 Asset Management
│   ├── Asset Dashboard
│   ├── Asset Inventory
│   ├── Asset Categories
│   ├── Facility Rooms
│   ├── Asset Inspections
│   ├── Maintenance Requests
│   └── Asset Transfers
└── 🛒 Inventory Management
    ├── Inventory Dashboard
    ├── Product Catalog
    ├── Stock Management
    ├── Purchase Orders
    ├── Sales Transactions
    └── Suppliers

📌 Notifications
├── ⏰ Task/Todo
└── 📋 Notice Board

📌 My Children (Parents Only)
└── 💰 Bills / School Fees

📌 My School Activities (Students Only)
├── 🆔 My Attendances
├── 📅 Class Time Table
├── 📚 Lessons
└── 📝 My Assignments

┌─────────────────────────────────────────────────────────────┐
│              ⭐ NEW: ATTENDANCE MODULE ⭐                     │
└─────────────────────────────────────────────────────────────┘

📌 Attendance ← NEW DEDICATED SECTION
├── 📊 Report
│   └── /attendance/dashboard
│       • Access: Admin, Branch Admin
│       • GPS attendance analytics
│       • Real-time tracking
│       • Attendance statistics
│
├── 🏫 Student Attendance
│   └── /academic/attendance-register
│       • Access: Teachers, Admin, Branch Admin
│       • Mark student attendance
│       • View attendance history
│       • Generate reports
│
├── 🆔 Staff Attendance
│   └── /hrm/staff-attendance
│       • Access: Admin, Branch Admin
│       • GPS-based check-in
│       • Staff attendance tracking
│       • Location verification
│
└── 👥 Staff Overview
    └── /hrm/teacher-attendance
        • Access: Admin, Branch Admin
        • Staff attendance summary
        • Performance metrics
        • Attendance trends

📌 General Setups
└── ⚙️ School Setup
    ├── Academic Calendar
    ├── Report Sheet Config
    ├── Religion Setup
    ├── School Branches
    ├── School Sections
    ├── Classes Setup
    ├── Subjects Setup
    ├── Personal Dev. Setup
    ├── Assessment Setup
    ├── Time Table
    └── Communication Setup

📌 Exams & Records
└── 📝 Examinations
    ├── Assessment Form
    ├── FormMaster Review
    ├── Student Reports
    ├── Broad Sheet
    ├── Exam Analytics
    ├── Assessment Setup
    └── Report Template

📌 Super Admin (Super Admin Only)
├── Create School
├── School List
├── Support Dashboard
├── Queue Dashboard
├── School Access Management
└── App Configurations

📌 Express Finance
├── 📊 Finance Report
├── 🏦 Bank Accounts
├── 💰 School Fees
│   ├── Fees Setup
│   ├── Single Billing
│   ├── Single Payments
│   ├── Family Billing
│   └── Family Payments
├── 💵 Income & Expenses
│   ├── Income Reports
│   ├── Expenses Reports
│   └── Profit and Loss
└── 💼 Payroll
    ├── Staff Management
    ├── Salary Structure
    ├── Allowance & Deductions
    ├── Loan Management
    ├── Salary Disbursement
    └── Salary Report
```

---

## 🎯 Attendance Module - Detailed View

```
┌─────────────────────────────────────────────────────────────┐
│                    ATTENDANCE MODULE                         │
│                  (GPS-Based System)                          │
└─────────────────────────────────────────────────────────────┘

📊 Report
├── Route: /attendance/dashboard
├── Icon: ti ti-chart-bar
├── Access: Admin, Branch Admin
└── Features:
    ├── GPS attendance analytics
    ├── Real-time tracking dashboard
    ├── Attendance statistics
    ├── Trend analysis
    ├── Export reports
    └── Visual charts

🏫 Student Attendance
├── Route: /academic/attendance-register
├── Icon: ti ti-school
├── Access: Teachers, Admin, Branch Admin
└── Features:
    ├── Mark daily attendance
    ├── View attendance history
    ├── Generate class reports
    ├── Attendance patterns
    ├── Absence tracking
    └── Parent notifications

🆔 Staff Attendance
├── Route: /hrm/staff-attendance
├── Icon: ti ti-id-badge
├── Access: Admin, Branch Admin
└── Features:
    ├── GPS-based check-in ⭐
    ├── Location verification ⭐
    ├── Automatic tracking ⭐
    ├── Distance calculation ⭐
    ├── Attendance logs
    ├── Late arrival alerts
    ├── Leave management
    └── Biometric integration

👥 Staff Overview
├── Route: /hrm/teacher-attendance
├── Icon: ti ti-users
├── Access: Admin, Branch Admin
└── Features:
    ├── Staff attendance summary
    ├── Performance metrics
    ├── Attendance trends
    ├── Department-wise view
    ├── Monthly reports
    ├── Punctuality analysis
    └── Export to Excel
```

---

## 🔐 Access Control Matrix

| Menu Item | Admin | Branch Admin | Teacher | Parent | Student |
|-----------|-------|--------------|---------|--------|---------|
| **Report 📊** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Student Attendance** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Staff Attendance** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Staff Overview** | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 🗺️ Route Flow

```
User Login
    ↓
Role Detection
    ↓
Sidebar Filtering
    ↓
┌─────────────────────────────────────┐
│   Attendance Section Visible?       │
│   (Based on Role & Permissions)     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│   User Clicks Menu Item             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│   Route Navigation                  │
│   - Report → /attendance/dashboard  │
│   - Student → /academic/attendance  │
│   - Staff → /hrm/staff-attendance   │
│   - Overview → /hrm/teacher-attend  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│   Component Loads                   │
│   - GPS features activated          │
│   - Data fetched from backend       │
│   - UI rendered                     │
└─────────────────────────────────────┘
```

---

## 📱 Responsive Behavior

### Desktop View
```
┌────────────────────────────────────────────────────┐
│  Sidebar (Expanded)          │  Main Content       │
│                              │                     │
│  📊 Attendance               │  [Dashboard]        │
│  ├── 📊 Report              │                     │
│  ├── 🏫 Student Attendance  │                     │
│  ├── 🆔 Staff Attendance    │                     │
│  └── 👥 Staff Overview      │                     │
│                              │                     │
└────────────────────────────────────────────────────┘
```

### Mobile View
```
┌──────────────────────┐
│  ☰ Menu              │
└──────────────────────┘
        ↓ (Click)
┌──────────────────────┐
│  📊 Attendance       │
│  ├── 📊 Report      │
│  ├── 🏫 Student     │
│  ├── 🆔 Staff       │
│  └── 👥 Overview    │
└──────────────────────┘
```

---

## 🎨 Visual Indicators

### Active State
```
📊 Attendance
├── 📊 Report ← ACTIVE (highlighted)
├── 🏫 Student Attendance
├── 🆔 Staff Attendance
└── 👥 Staff Overview
```

### Hover State
```
📊 Attendance
├── 📊 Report
├── 🏫 Student Attendance ← HOVER (background change)
├── 🆔 Staff Attendance
└── 👥 Staff Overview
```

### Disabled State (No Permission)
```
📊 Attendance
├── 📊 Report (grayed out)
├── 🏫 Student Attendance
├── 🆔 Staff Attendance (grayed out)
└── 👥 Staff Overview (grayed out)
```

---

## 🔄 State Management

```typescript
// Sidebar state for Attendance section
{
  label: "Attendance",
  submenuOpen: true,        // Section expanded by default
  submenuHdr: "Attendance", // Header text
  requiredAccess: [         // Who can see this section
    "Attendance",
    "admin",
    "branchadmin",
    "teacher"
  ],
  submenuItems: [           // Child menu items
    {
      label: "Report 📊",
      icon: "ti ti-chart-bar",
      link: "/attendance/dashboard",
      submenu: false,       // No sub-submenu
      showSubRoute: false,
      requiredAccess: ["Attendance", "admin", "branchadmin"]
    },
    // ... other items
  ]
}
```

---

## 🚀 Performance Optimization

### Lazy Loading
```typescript
// Routes are lazy-loaded
const AttendanceDashboard = lazy(() => 
  import('./feature-module/attendance/dashboard')
);
const StaffAttendance = lazy(() => 
  import('./feature-module/hrm/attendance/staff-attendance')
);
```

### Conditional Rendering
```typescript
// Only render if user has access
{hasAccess && (
  <MenuItem>
    <Link to="/attendance/dashboard">
      Report 📊
    </Link>
  </MenuItem>
)}
```

---

## 📊 Analytics Integration

The Attendance module tracks:

- **Page Views**: Which attendance pages are most visited
- **User Actions**: Check-ins, reports generated, etc.
- **GPS Usage**: How many staff use GPS check-in
- **Performance**: Page load times, API response times

---

## 🎉 Summary

The Attendance module is now:

✅ **Visible** - Dedicated section in sidebar  
✅ **Accessible** - Role-based access control  
✅ **Organized** - Clear hierarchy and structure  
✅ **Functional** - All routes working  
✅ **GPS-Ready** - GPS features integrated  
✅ **Responsive** - Works on all devices  
✅ **Performant** - Optimized loading  

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
