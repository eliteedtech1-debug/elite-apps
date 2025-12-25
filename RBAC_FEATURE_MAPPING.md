# Complete Feature Mapping: sidebarData.tsx → API Structure

> **Date:** 2025-12-24  
> **Purpose:** Map every missing feature from sidebarData.tsx to proper API categories

---

## 🗺️ Complete Feature Mapping

### 1. Dashboard Section
**sidebarData.tsx:** `MAIN` section with dynamic dashboard based on user_type  
**API Mapping:** New "Dashboard" category

```json
{
  "name": "Dashboard",
  "icon": "DashboardOutlined",
  "items": [
    {
      "key": "ADMIN_DASHBOARD",
      "label": "Admin Dashboard",
      "icon": "DashboardOutlined", 
      "route": "/admin/dashboard",
      "requiredAccess": ["admin", "branchadmin"]
    },
    {
      "key": "TEACHER_DASHBOARD", 
      "label": "Teacher Dashboard",
      "icon": "DashboardOutlined",
      "route": "/teacher/dashboard",
      "requiredAccess": ["teacher"]
    },
    {
      "key": "STUDENT_DASHBOARD",
      "label": "Student Dashboard", 
      "icon": "DashboardOutlined",
      "route": "/student/dashboard",
      "requiredAccess": ["student"]
    },
    {
      "key": "PARENT_DASHBOARD",
      "label": "Parent Dashboard",
      "icon": "DashboardOutlined", 
      "route": "/parent/dashboard",
      "requiredAccess": ["parent"]
    },
    {
      "key": "SUPERADMIN_DASHBOARD",
      "label": "Super Admin Dashboard",
      "icon": "DashboardOutlined",
      "route": "/superadmin/dashboard", 
      "requiredAccess": ["superadmin"]
    }
  ]
}
```

### 2. People Management (Expanded Students)
**sidebarData.tsx:** `Personal Data Mngr` section  
**API Mapping:** Expand existing "Students" category

```json
{
  "name": "People Management",
  "icon": "TeamOutlined",
  "items": [
    {
      "key": "STUDENT_MANAGEMENT",
      "label": "Student List", 
      "icon": "UserOutlined",
      "route": "/students"
    },
    {
      "key": "CLASS_LIST",
      "label": "Class List",
      "icon": "TeamOutlined",
      "route": "/classes"
    },
    {
      "key": "PARENT_MANAGEMENT",
      "label": "Parent List",
      "icon": "UserOutlined", 
      "route": "/parents"
    },
    {
      "key": "STAFF_MANAGEMENT", 
      "label": "Staff List",
      "icon": "UserOutlined",
      "route": "/staff"
    },
    {
      "key": "ADMISSION_DASHBOARD",
      "label": "Admission Dashboard",
      "icon": "UserAddOutlined",
      "route": "/admission/dashboard"
    },
    {
      "key": "ADMISSION_APPLICATIONS",
      "label": "Admission Applications", 
      "icon": "FileTextOutlined",
      "route": "/admission/applications"
    },
    {
      "key": "STUDENT_PROMOTION",
      "label": "Promotion & Graduation",
      "icon": "TrophyOutlined",
      "route": "/students/promotion"
    }
  ]
}
```

### 3. Academic Management (Enhanced)
**sidebarData.tsx:** `Class Management` + `Academic` sections  
**API Mapping:** Enhance existing "Academic" category

```json
{
  "name": "Academic Management", 
  "icon": "BookOutlined",
  "items": [
    {
      "key": "CLASS_MANAGEMENT",
      "label": "Classes",
      "icon": "TeamOutlined",
      "route": "/classes"
    },
    {
      "key": "SUBJECTS",
      "label": "Subjects", 
      "icon": "BookOutlined",
      "route": "/subjects"
    },
    {
      "key": "TIMETABLE",
      "label": "Timetable",
      "icon": "CalendarOutlined",
      "route": "/timetable"
    },
    {
      "key": "CLASS_TIMETABLE",
      "label": "Class Timetable",
      "icon": "TableOutlined", 
      "route": "/timetable/class"
    },
    {
      "key": "LESSONS",
      "label": "Lessons",
      "icon": "BookOutlined",
      "route": "/lessons"
    },
    {
      "key": "ASSIGNMENTS", 
      "label": "Assignments",
      "icon": "EditOutlined",
      "route": "/assignments"
    },
    {
      "key": "VIRTUAL_CLASS",
      "label": "Virtual Class",
      "icon": "VideoCameraOutlined",
      "route": "/virtual-class",
      "premium": true
    },
    {
      "key": "SYLLABUS",
      "label": "Syllabus", 
      "icon": "FileTextOutlined",
      "route": "/syllabus"
    }
  ]
}
```

### 4. Attendance Management
**sidebarData.tsx:** Attendance section in `Personal Data Mngr`  
**API Mapping:** New "Attendance" category

```json
{
  "name": "Attendance",
  "icon": "CheckCircleOutlined",
  "items": [
    {
      "key": "ATTENDANCE",
      "label": "Student Attendance",
      "icon": "CheckCircleOutlined", 
      "route": "/attendance"
    },
    {
      "key": "ATTENDANCE_REPORTS",
      "label": "Attendance Reports",
      "icon": "BarChartOutlined",
      "route": "/attendance/reports"
    },
    {
      "key": "STAFF_ATTENDANCE",
      "label": "Staff Attendance", 
      "icon": "IdcardOutlined",
      "route": "/attendance/staff"
    },
    {
      "key": "ATTENDANCE_DASHBOARD",
      "label": "Attendance Dashboard",
      "icon": "DashboardOutlined",
      "route": "/attendance/dashboard"
    }
  ]
}
```

### 5. Examinations & Assessment
**sidebarData.tsx:** `Exams & Records` section  
**API Mapping:** New "Examinations" category

```json
{
  "name": "Examinations",
  "icon": "FileTextOutlined",
  "items": [
    {
      "key": "ASSESSMENT_FORM",
      "label": "Assessment Form",
      "icon": "FormOutlined", 
      "route": "/assessments/form"
    },
    {
      "key": "FORMMASTER_REVIEW",
      "label": "FormMaster Review",
      "icon": "AuditOutlined",
      "route": "/assessments/review"
    },
    {
      "key": "REPORTS_GENERATOR",
      "label": "Reports Generator",
      "icon": "FileTextOutlined",
      "route": "/reports/generator"
    },
    {
      "key": "BROAD_SHEET", 
      "label": "Broad Sheet",
      "icon": "TableOutlined",
      "route": "/reports/broadsheet"
    },
    {
      "key": "EXAM_ANALYTICS",
      "label": "Exam Analytics",
      "icon": "BarChartOutlined",
      "route": "/reports/analytics"
    },
    {
      "key": "REPORT_TEMPLATE",
      "label": "Report Template",
      "icon": "SettingOutlined", 
      "route": "/reports/template"
    },
    {
      "key": "CA_EXAM_SETUP",
      "label": "CA/Exam Setup",
      "icon": "SettingOutlined",
      "route": "/exams/setup"
    },
    {
      "key": "SUBMIT_QUESTIONS",
      "label": "Submit Questions",
      "icon": "UploadOutlined",
      "route": "/exams/questions/submit"
    },
    {
      "key": "MODERATION",
      "label": "Moderation", 
      "icon": "CheckCircleOutlined",
      "route": "/exams/moderation"
    },
    {
      "key": "PRINT_QUESTIONS",
      "label": "Print Questions",
      "icon": "PrinterOutlined",
      "route": "/exams/questions/print"
    },
    {
      "key": "PROGRESS_TRACKING",
      "label": "Progress Tracking",
      "icon": "LineChartOutlined",
      "route": "/exams/progress"
    }
  ]
}
```

### 6. Enhanced Finance Management
**sidebarData.tsx:** `Express Finance` section  
**API Mapping:** Expand existing "Finance" category

```json
{
  "name": "Finance Management",
  "icon": "DollarOutlined", 
  "items": [
    {
      "key": "COLLECT_FEES",
      "label": "Fee Collection",
      "icon": "DollarOutlined",
      "route": "/payments"
    },
    {
      "key": "BASIC_REPORTS",
      "label": "Financial Reports", 
      "icon": "FileTextOutlined",
      "route": "/reports/financial"
    },
    {
      "key": "FINANCE_DASHBOARD",
      "label": "Finance Dashboard",
      "icon": "DashboardOutlined",
      "route": "/finance/dashboard",
      "premium": true
    },
    {
      "key": "BANK_ACCOUNTS",
      "label": "Bank Accounts",
      "icon": "BankOutlined", 
      "route": "/finance/banks",
      "premium": true
    },
    {
      "key": "FEES_SETUP",
      "label": "Fees Setup",
      "icon": "SettingOutlined",
      "route": "/finance/fees/setup",
      "premium": true
    },
    {
      "key": "SINGLE_BILLING",
      "label": "Single Billing",
      "icon": "FileTextOutlined",
      "route": "/finance/billing/single",
      "premium": true
    },
    {
      "key": "FAMILY_BILLING", 
      "label": "Family Billing",
      "icon": "TeamOutlined",
      "route": "/finance/billing/family",
      "premium": true
    },
    {
      "key": "INCOME_REPORTS",
      "label": "Income Reports",
      "icon": "RiseOutlined",
      "route": "/finance/reports/income",
      "premium": true
    },
    {
      "key": "EXPENSE_REPORTS",
      "label": "Expense Reports", 
      "icon": "FallOutlined",
      "route": "/finance/reports/expenses",
      "premium": true
    },
    {
      "key": "PROFIT_LOSS",
      "label": "Profit & Loss",
      "icon": "LineChartOutlined",
      "route": "/finance/reports/pnl",
      "premium": true
    },
    {
      "key": "PAYROLL_MANAGEMENT",
      "label": "Payroll Management",
      "icon": "TeamOutlined",
      "route": "/finance/payroll",
      "elite": true
    },
    {
      "key": "SALARY_STRUCTURE", 
      "label": "Salary Structure",
      "icon": "BarsOutlined",
      "route": "/finance/payroll/structure",
      "elite": true
    },
    {
      "key": "LOAN_MANAGEMENT",
      "label": "Loan Management",
      "icon": "CreditCardOutlined",
      "route": "/finance/loans",
      "elite": true
    }
  ]
}
```

### 7. Supply Management (Elite Package)
**sidebarData.tsx:** `Supply Management` section  
**API Mapping:** New "Supply Management" category

```json
{
  "name": "Supply Management",
  "icon": "ShoppingCartOutlined",
  "elite": true,
  "items": [
    {
      "key": "ASSET_DASHBOARD", 
      "label": "Asset Dashboard",
      "icon": "DashboardOutlined",
      "route": "/assets/dashboard",
      "elite": true
    },
    {
      "key": "ASSET_INVENTORY",
      "label": "Asset Inventory",
      "icon": "AppstoreOutlined",
      "route": "/assets/inventory",
      "elite": true
    },
    {
      "key": "ASSET_CATEGORIES",
      "label": "Asset Categories", 
      "icon": "TagsOutlined",
      "route": "/assets/categories",
      "elite": true
    },
    {
      "key": "FACILITY_ROOMS",
      "label": "Facility Rooms",
      "icon": "HomeOutlined",
      "route": "/assets/rooms",
      "elite": true
    },
    {
      "key": "ASSET_INSPECTIONS",
      "label": "Asset Inspections",
      "icon": "SearchOutlined", 
      "route": "/assets/inspections",
      "elite": true
    },
    {
      "key": "MAINTENANCE_REQUESTS",
      "label": "Maintenance Requests",
      "icon": "ToolOutlined",
      "route": "/assets/maintenance",
      "elite": true
    },
    {
      "key": "INVENTORY_DASHBOARD",
      "label": "Inventory Dashboard",
      "icon": "DashboardOutlined",
      "route": "/inventory/dashboard",
      "elite": true
    },
    {
      "key": "PRODUCT_CATALOG", 
      "label": "Product Catalog",
      "icon": "AppstoreOutlined",
      "route": "/inventory/products",
      "elite": true
    },
    {
      "key": "STOCK_MANAGEMENT",
      "label": "Stock Management",
      "icon": "InboxOutlined",
      "route": "/inventory/stock",
      "elite": true
    },
    {
      "key": "PURCHASE_ORDERS",
      "label": "Purchase Orders",
      "icon": "ShoppingOutlined", 
      "route": "/inventory/orders",
      "elite": true
    }
  ]
}
```

### 8. School Setup & Configuration
**sidebarData.tsx:** `General Setups` section  
**API Mapping:** Expand existing "Settings" category

```json
{
  "name": "School Setup",
  "icon": "SettingOutlined",
  "items": [
    {
      "key": "SETTINGS",
      "label": "School Settings", 
      "icon": "SettingOutlined",
      "route": "/settings"
    },
    {
      "key": "ACADEMIC_CALENDAR",
      "label": "Academic Calendar",
      "icon": "CalendarOutlined",
      "route": "/setup/calendar"
    },
    {
      "key": "REPORT_CONFIG",
      "label": "Report Sheet Config",
      "icon": "FileTextOutlined", 
      "route": "/setup/reports"
    },
    {
      "key": "RELIGION_SETUP",
      "label": "Religion Setup",
      "icon": "HeartOutlined",
      "route": "/setup/religion"
    },
    {
      "key": "SCHOOL_BRANCHES",
      "label": "School Branches",
      "icon": "BankOutlined",
      "route": "/setup/branches"
    },
    {
      "key": "SCHOOL_SECTIONS", 
      "label": "School Sections",
      "icon": "AppstoreOutlined",
      "route": "/setup/sections"
    },
    {
      "key": "CLASSES_SETUP",
      "label": "Classes Setup",
      "icon": "TeamOutlined",
      "route": "/setup/classes"
    },
    {
      "key": "SUBJECTS_SETUP",
      "label": "Subjects Setup",
      "icon": "BookOutlined",
      "route": "/setup/subjects"
    },
    {
      "key": "PERSONAL_DEV_SETUP", 
      "label": "Personal Dev. Setup",
      "icon": "UserOutlined",
      "route": "/setup/character"
    },
    {
      "key": "ASSESSMENT_SETUP",
      "label": "Assessment Setup",
      "icon": "EditOutlined",
      "route": "/setup/assessment"
    },
    {
      "key": "COMMUNICATION_SETUP",
      "label": "Communication Setup",
      "icon": "MessageOutlined",
      "route": "/setup/communication"
    }
  ]
}
```

### 9. Notifications & Tasks
**sidebarData.tsx:** `Notifications` section  
**API Mapping:** New "Notifications" category

```json
{
  "name": "Notifications",
  "icon": "BellOutlined",
  "items": [
    {
      "key": "TODO_TASKS",
      "label": "Task/Todo", 
      "icon": "CheckSquareOutlined",
      "route": "/tasks"
    },
    {
      "key": "NOTICE_BOARD",
      "label": "Notice Board",
      "icon": "NotificationOutlined",
      "route": "/notices"
    }
  ]
}
```

### 10. Parent Portal
**sidebarData.tsx:** `My Children` section  
**API Mapping:** New "Parent Portal" category

```json
{
  "name": "Parent Portal",
  "icon": "UserOutlined",
  "requiredAccess": ["parent"],
  "items": [
    {
      "key": "MY_CHILDREN", 
      "label": "My Children",
      "icon": "TeamOutlined",
      "route": "/parent/children",
      "requiredAccess": ["parent"]
    },
    {
      "key": "SCHOOL_FEES_PARENT",
      "label": "Bills / School Fees",
      "icon": "DollarOutlined",
      "route": "/parent/fees",
      "requiredAccess": ["parent"]
    }
  ]
}
```

### 11. Student Portal
**sidebarData.tsx:** `My School Activities` section  
**API Mapping:** New "Student Portal" category

```json
{
  "name": "Student Portal",
  "icon": "BookOutlined",
  "requiredAccess": ["student"], 
  "items": [
    {
      "key": "MY_ATTENDANCE",
      "label": "My Attendance",
      "icon": "CheckCircleOutlined",
      "route": "/student/attendance",
      "requiredAccess": ["student"]
    },
    {
      "key": "MY_TIMETABLE",
      "label": "My Timetable",
      "icon": "CalendarOutlined",
      "route": "/student/timetable",
      "requiredAccess": ["student"]
    },
    {
      "key": "MY_LESSONS", 
      "label": "My Lessons",
      "icon": "BookOutlined",
      "route": "/student/lessons",
      "requiredAccess": ["student"]
    },
    {
      "key": "MY_ASSIGNMENTS",
      "label": "My Assignments",
      "icon": "EditOutlined",
      "route": "/student/assignments",
      "requiredAccess": ["student"]
    }
  ]
}
```

### 12. Super Admin Portal
**sidebarData.tsx:** `Super Admin` section  
**API Mapping:** New "Super Admin" category

```json
{
  "name": "Super Admin",
  "icon": "CrownOutlined",
  "requiredAccess": ["superadmin"],
  "items": [
    {
      "key": "CREATE_SCHOOL",
      "label": "Create School", 
      "icon": "PlusOutlined",
      "route": "/superadmin/schools/create",
      "requiredAccess": ["superadmin"]
    },
    {
      "key": "SCHOOL_LIST",
      "label": "School List",
      "icon": "UnorderedListOutlined",
      "route": "/superadmin/schools",
      "requiredAccess": ["superadmin"]
    },
    {
      "key": "SUPPORT_DASHBOARD",
      "label": "Support Dashboard",
      "icon": "CustomerServiceOutlined", 
      "route": "/superadmin/support",
      "requiredAccess": ["superadmin"]
    },
    {
      "key": "QUEUE_DASHBOARD",
      "label": "Queue Dashboard",
      "icon": "UnorderedListOutlined",
      "route": "/superadmin/queue",
      "requiredAccess": ["superadmin"]
    },
    {
      "key": "SCHOOL_ACCESS_MANAGEMENT",
      "label": "School Access Management",
      "icon": "KeyOutlined",
      "route": "/superadmin/access",
      "requiredAccess": ["developer"]
    },
    {
      "key": "APP_CONFIGURATIONS", 
      "label": "App Configurations",
      "icon": "SettingOutlined",
      "route": "/superadmin/config",
      "requiredAccess": ["developer"]
    }
  ]
}
```

---

## 📊 Summary Statistics

| Category | Items Count | Package Requirements |
|----------|-------------|---------------------|
| Dashboard | 5 | All packages |
| People Management | 7 | All packages |
| Academic Management | 8 | All packages |
| Attendance | 4 | All packages |
| Examinations | 11 | All packages |
| Finance Management | 13 | Standard (2), Premium (8), Elite (3) |
| Supply Management | 10 | Elite only |
| School Setup | 11 | All packages |
| Notifications | 2 | All packages |
| Parent Portal | 2 | Parent access only |
| Student Portal | 4 | Student access only |
| Super Admin | 6 | SuperAdmin/Developer only |

**Total Missing Items:** 83 menu items across 12 categories

---

*Next: Create curl commands to implement these mappings*
