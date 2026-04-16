# RBAC Menu Implementation: curl Commands

> **Date:** 2025-12-24  
> **Purpose:** curl commands to populate the complete menu structure

---

## 🚀 Implementation Commands

### Step 1: Update Menu Cache with Complete Structure

```bash
# Update the menu cache with complete structure
curl -X PUT 'http://localhost:34567/api/rbac/menu-config' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer [DEVELOPER_TOKEN]' \
  -d '{
    "menu_data": [
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
      },
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
      },
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
      },
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
      },
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
      },
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
      },
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
      },
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
      },
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
      },
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
      },
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
      },
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
    ]
  }'
```

### Step 2: Update Subscription Packages with New Features

```bash
# Update Standard Package
curl -X POST 'http://localhost:34567/api/rbac/super-admin/packages' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer [SUPERADMIN_TOKEN]' \
  -d '{
    "package_name": "standard",
    "features": [
      "students", "teachers", "parents", "classes", "subjects", "timetable", 
      "attendance", "exams", "fees", "reports", "communication", "settings",
      "dashboard", "assignments", "lessons", "notices", "tasks"
    ]
  }'

# Update Premium Package  
curl -X POST 'http://localhost:34567/api/rbac/super-admin/packages' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer [SUPERADMIN_TOKEN]' \
  -d '{
    "package_name": "premium", 
    "features": [
      "students", "teachers", "parents", "classes", "subjects", "timetable",
      "attendance", "exams", "fees", "reports", "communication", "settings",
      "dashboard", "assignments", "lessons", "notices", "tasks",
      "accounting", "lesson_plans", "virtual_class", "advanced_reports",
      "finance_dashboard", "bank_accounts", "fees_setup", "billing",
      "income_reports", "expense_reports", "profit_loss"
    ]
  }'

# Update Elite Package
curl -X POST 'http://localhost:34567/api/rbac/super-admin/packages' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer [SUPERADMIN_TOKEN]' \
  -d '{
    "package_name": "elite",
    "features": [
      "students", "teachers", "parents", "classes", "subjects", "timetable",
      "attendance", "exams", "fees", "reports", "communication", "settings", 
      "dashboard", "assignments", "lessons", "notices", "tasks",
      "accounting", "lesson_plans", "virtual_class", "advanced_reports",
      "finance_dashboard", "bank_accounts", "fees_setup", "billing",
      "income_reports", "expense_reports", "profit_loss",
      "payroll", "assets", "inventory", "recitation", "supply_management",
      "asset_management", "maintenance", "purchase_orders", "stock_management"
    ]
  }'
```

### Step 3: Test the Updated Menu

```bash
# Test menu for Admin user
curl 'http://localhost:34567/api/rbac/menu' \
  -H 'Authorization: Bearer [ADMIN_TOKEN]' \
  -H 'X-School-Id: SCH/10' \
  -H 'X-User-Type: Admin' | jq .

# Test menu for Teacher user  
curl 'http://localhost:34567/api/rbac/menu' \
  -H 'Authorization: Bearer [TEACHER_TOKEN]' \
  -H 'X-School-Id: SCH/10' \
  -H 'X-User-Type: Teacher' | jq .

# Test menu for SuperAdmin user
curl 'http://localhost:34567/api/rbac/menu' \
  -H 'Authorization: Bearer [SUPERADMIN_TOKEN]' \
  -H 'X-User-Type: SuperAdmin' | jq .
```

### Step 4: Verify Package-based Filtering

```bash
# Check school's current package
curl 'http://localhost:34567/api/rbac/schools/SCH%2F10/features' \
  -H 'Authorization: Bearer [ADMIN_TOKEN]' | jq .

# Assign Elite package to school (SuperAdmin only)
curl -X POST 'http://localhost:34567/api/rbac/super-admin/assign-package' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer [SUPERADMIN_TOKEN]' \
  -d '{
    "school_id": "SCH/10",
    "package_id": 1,
    "start_date": "2025-01-01", 
    "end_date": "2025-12-31"
  }'

# Test menu after package assignment
curl 'http://localhost:34567/api/rbac/menu' \
  -H 'Authorization: Bearer [ADMIN_TOKEN]' \
  -H 'X-School-Id: SCH/10' \
  -H 'X-User-Type: Admin' | jq .
```

---

## 🔧 Direct Database Updates (Alternative)

If curl commands fail, use direct database updates:

```sql
-- Update menu cache directly
UPDATE rbac_menu_cache 
SET menu_data = '[COMPLETE_JSON_STRUCTURE]'
WHERE id = (SELECT MAX(id) FROM rbac_menu_cache);

-- Update subscription packages
UPDATE subscription_packages 
SET features = '["students","teachers","parents","classes","subjects","timetable","attendance","exams","fees","reports","communication","settings","dashboard","assignments","lessons","notices","tasks","accounting","lesson_plans","virtual_class","advanced_reports","finance_dashboard","bank_accounts","fees_setup","billing","income_reports","expense_reports","profit_loss","payroll","assets","inventory","recitation","supply_management","asset_management","maintenance","purchase_orders","stock_management"]'
WHERE package_name = 'elite';
```

---

## 📋 Validation Checklist

- [ ] Menu cache updated with complete structure
- [ ] Subscription packages updated with new features  
- [ ] Package-based filtering working correctly
- [ ] Role-based access control functioning
- [ ] User type filtering operational
- [ ] Elite features only visible to elite package users
- [ ] Premium features only visible to premium+ users
- [ ] SuperAdmin features only visible to superadmins
- [ ] Parent/Student portals only visible to respective user types

---

*Execute these commands sequentially and validate each step before proceeding.*
