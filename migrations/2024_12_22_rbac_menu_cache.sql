-- =====================================================
-- Elite Scholar RBAC Menu Cache Migration
-- Date: 2024-12-22
-- Description: Updates menu cache with SuperAdmin & Developer sections
-- Safe to re-run multiple times (replaces entire cache)
-- =====================================================

-- =====================================================
-- 1. CREATE rbac_menu_cache TABLE IF NOT EXISTS
-- =====================================================
CREATE TABLE IF NOT EXISTS `rbac_menu_cache` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `menu_data` JSON NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 2. CLEAR AND INSERT FRESH MENU DATA
-- =====================================================
DELETE FROM rbac_menu_cache;

INSERT INTO rbac_menu_cache (menu_data) VALUES (
'[
  {
    "name": "Personal Data Mngr",
    "requiredAccess": ["admin", "branchadmin"],
    "items": [
      {
        "key": "STUDENTS",
        "label": "Students",
        "icon": "ti ti-school",
        "feature": "students",
        "requiredAccess": ["admin", "branchadmin", "superadmin"],
        "submenu": true,
        "submenuItems": [
          {"label": "Student List", "link": "/student/student-list"},
          {"label": "Add Student", "link": "/student/add-student"}
        ]
      },
      {
        "key": "STAFF",
        "label": "Staff",
        "icon": "ti ti-users",
        "feature": "teachers",
        "requiredAccess": ["admin", "branchadmin", "superadmin"],
        "submenu": true,
        "submenuItems": [
          {"label": "Staff", "link": "/teacher/teacher-list"},
          {"label": "Add Staff", "link": "/teacher/add-teacher"}
        ]
      }
    ]
  },
  {
    "name": "Attendance",
    "requiredAccess": ["admin", "branchadmin", "teacher"],
    "items": [
      {
        "key": "STUDENT_ATTENDANCE",
        "label": "Student Attendance",
        "icon": "ti ti-school",
        "feature": "student_attendance",
        "requiredAccess": ["admin", "branchadmin"],
        "submenu": true,
        "submenuItems": [
          {"label": "Student Reports", "link": "/attendance/dashboard", "requiredAccess": ["admin", "branchadmin"]},
          {"label": "Take Attendance", "link": "/attendance"}
        ]
      },
      {
        "key": "STAFF_ATTENDANCE",
        "label": "Staff Attendance",
        "icon": "ti ti-id-badge",
        "feature": "staff_attendance",
        "premium": true,
        "requiredAccess": ["admin", "branchadmin"],
        "submenu": true,
        "submenuItems": [
          {"label": "Staff Attendance", "link": "/hrm/staff-attendance"},
          {"label": "Staff Report", "link": "/hrm/staff-attendance-overview"}
        ]
      }
    ]
  },
  {
    "name": "Class Management",
    "requiredAccess": ["teacher"],
    "items": [
      {
        "key": "DAILY_ROUTINE",
        "label": "Daily Routine",
        "icon": "fa fa-gears",
        "requiredAccess": ["teacher"],
        "submenu": true,
        "submenuItems": [
          {"label": "Class Time Table", "link": "/academic/class-time-table", "requiredPermissions": ["Class Time Table", "Time Table", "admin", "branchadmin"]},
          {"label": "Class Attendance", "link": "/academic/attendance-register", "requiredPermissions": ["Class Attendance"]},
          {"label": "Lessons", "link": "/academic/tearcher-lessons", "requiredPermissions": ["Lessons"]},
          {"label": "Assignments", "link": "/academic/class-assignment", "requiredPermissions": ["Assignments"]}
        ]
      },
      {
        "key": "EXTRAS",
        "label": "Extras",
        "icon": "fa fa-gears",
        "requiredAccess": ["teacher"],
        "submenu": true,
        "submenuItems": [
          {"label": "Virtual Class", "link": "/application/video-call", "feature": "virtual_class", "elite": true},
          {"label": "Syllabus", "link": "/academic/class-syllabus", "feature": "lesson_plans", "premium": true}
        ]
      },
      {
        "key": "EXAMINATIONS_TEACHER",
        "label": "Examinations",
        "icon": "ti ti-certificate",
        "feature": "exams",
        "requiredAccess": ["teacher"],
        "submenu": true,
        "submenuItems": [
          {"label": "Assessment Form", "link": "/academic/assessments", "requiredPermissions": ["Teacher"]},
          {"label": "FormMaster Review", "link": "/academic/formmaster-score-sheet", "requiredPermissions": ["Subject Score Sheet", "Form Master", "branchadmin", "exam_officer"]}
        ]
      }
    ]
  },
  {
    "name": "My Children",
    "requiredAccess": ["parent"],
    "items": [
      {"key": "BILLS", "label": "Bills / School Fees", "icon": "ti ti-receipt", "link": "/student/payment", "requiredAccess": ["parent"]}
    ]
  },
  {
    "name": "My School Activities",
    "requiredAccess": ["student"],
    "items": [
      {"key": "MY_ATTENDANCE", "label": "My Attendances", "icon": "ti ti-id-badge", "link": "/academic/student-attendance", "requiredAccess": ["student"]},
      {"key": "MY_TIMETABLE", "label": "Class Time Table", "icon": "ti ti-table", "link": "/academic/student-time-table", "requiredAccess": ["student"]},
      {"key": "MY_LESSONS", "label": "Lessons", "icon": "ti ti-book", "link": "/academic/lessons", "requiredAccess": ["student"]},
      {"key": "MY_ASSIGNMENTS", "label": "My Assignments", "icon": "ti ti-license", "link": "/academic/student-assignments", "requiredAccess": ["student"]}
    ]
  },
  {
    "name": "Academic",
    "requiredAccess": ["admin", "branchadmin", "superadmin"],
    "items": [
      {"key": "CLASS_MANAGEMENT", "label": "Classes", "link": "/academic/class-list", "feature": "classes", "requiredAccess": ["admin", "branchadmin"]},
      {"key": "SUBJECTS", "label": "Subjects", "link": "/academic/subjects", "feature": "classes", "requiredAccess": ["admin", "branchadmin"]},
      {
        "key": "EXAMINATIONS",
        "label": "Examinations",
        "icon": "ti ti-certificate",
        "feature": "exams",
        "requiredAccess": ["admin", "branchadmin", "teacher", "exam_officer"],
        "submenu": true,
        "submenuItems": [
          {"label": "Assessment Form", "link": "/academic/assessments"},
          {"label": "FormMaster Review", "link": "/academic/formmaster-score-sheet", "requiredAccess": ["admin", "branchadmin", "exam_officer"]},
          {"label": "Reports Generator", "link": "/report/exams/generate-report", "requiredAccess": ["admin", "branchadmin", "exam_officer"]},
          {"label": "Broad Sheet", "link": "/academic/broad-sheet"},
          {"label": "CA Setup", "link": "/academic/ca-setup"},
          {"label": "Report Template", "link": "/academic/report-configuration", "requiredAccess": ["admin", "branchadmin"]},
          {"label": "Exam Analytics", "link": "/academic/exam-analytics", "feature": "exam_analytics", "premium": true, "requiredAccess": ["admin", "branchadmin", "exam_officer"]},
          {"label": "Submit Questions", "link": "/examinations/submit-questions", "feature": "exam_analytics", "premium": true},
          {"label": "Moderation", "link": "/examinations/moderation", "feature": "exam_analytics", "premium": true},
          {"label": "Print Questions", "link": "/examinations/print-questions", "feature": "exam_analytics", "premium": true},
          {"label": "Progress Tracking", "link": "/examinations/progress", "feature": "exam_analytics", "premium": true}
        ]
      }
    ]
  },
  {
    "name": "Express Finance",
    "requiredAccess": ["admin", "branchadmin"],
    "items": [
      {"key": "FINANCE_REPORT", "label": "Finance Report", "link": "/management/finance/report", "feature": "fees", "requiredAccess": ["admin", "branchadmin"]},
      {"key": "BANK_ACCOUNTS", "label": "Bank Accounts", "link": "/management/finance/bank-accounts", "requiredAccess": ["admin", "branchadmin"]},
      {
        "key": "SCHOOL_FEES",
        "label": "School Fees",
        "icon": "ti ti-coin",
        "feature": "fees",
        "requiredAccess": ["admin", "branchadmin"],
        "submenu": true,
        "submenuItems": [
          {"label": "Fees Setup", "link": "/management/student-fees"},
          {"label": "Single Billing", "link": "/management/collect-fees"},
          {"label": "Single Payments", "link": "/management/receipt-classes"},
          {"label": "Family Billing", "link": "/management/family-billing"},
          {"label": "Family Payments", "link": "/parent/parentpayments"}
        ]
      },
      {
        "key": "INCOME_EXPENSES",
        "label": "Income & Expenses",
        "icon": "ti ti-coin",
        "requiredAccess": ["admin", "branchadmin"],
        "submenu": true,
        "submenuItems": [
          {"label": "Income Reports", "link": "/accounts/income-report"},
          {"label": "Expenses Reports", "link": "/accounts/expesnes/new"},
          {"label": "Profit and Loss", "link": "/accounts/profit/report"}
        ]
      },
      {
        "key": "PAYROLL",
        "label": "Payroll",
        "icon": "ti ti-briefcase",
        "feature": "payroll",
        "elite": true,
        "requiredAccess": ["admin", "branchadmin"],
        "submenu": true,
        "submenuItems": [
          {"label": "Staff Management", "link": "/payroll/staff-payroll"},
          {"label": "Salary Structure", "link": "/payroll/structure"},
          {"label": "Allowance & Deductions", "link": "/payrol/Allowances/deductions"},
          {"label": "Salary Disbursement", "link": "/payroll/salary-disbursement"}
        ]
      }
    ]
  },
  {
    "name": "Asset & Supply Mngr",
    "elite": true,
    "feature": "assets",
    "requiredAccess": ["admin", "branchadmin"],
    "items": [
      {
        "key": "ASSET_MANAGEMENT",
        "label": "Asset Management",
        "icon": "ti ti-building",
        "feature": "assets",
        "elite": true,
        "requiredAccess": ["admin", "branchadmin"],
        "submenu": true,
        "submenuItems": [
          {"label": "Dashboard", "link": "/supply-management/asset/dashboard"},
          {"label": "Asset Inventory", "link": "/supply-management/asset/inventory"},
          {"label": "Categories", "link": "/supply-management/asset/categories"},
          {"label": "Facility Rooms", "link": "/supply-management/asset/facility-rooms"}
        ]
      },
      {
        "key": "INVENTORY_MANAGEMENT",
        "label": "Inventory & Supply",
        "icon": "ti ti-package",
        "feature": "assets",
        "elite": true,
        "requiredAccess": ["admin", "branchadmin"],
        "submenu": true,
        "submenuItems": [
          {"label": "Dashboard", "link": "/supply-management/inventory/dashboard"},
          {"label": "Product Catalog", "link": "/supply-management/inventory/products"},
          {"label": "Stock Management", "link": "/supply-management/inventory/stock"},
          {"label": "Purchase Orders", "link": "/supply-management/inventory/purchase-orders"},
          {"label": "Suppliers", "link": "/supply-management/inventory/suppliers"}
        ]
      }
    ]
  },
  {
    "name": "General Setups",
    "requiredAccess": ["admin", "branchadmin", "superadmin"],
    "items": [
      {
        "key": "SCHOOL_SETUP",
        "label": "School Setup",
        "icon": "fa fa-gears",
        "requiredAccess": ["admin", "branchadmin"],
        "submenu": true,
        "submenuItems": [
          {"label": "Academic Calendar", "link": "/school-setup/academic-year-setup"},
          {"label": "School Branches", "link": "/school-setup/branches", "requiredAccess": ["admin"]},
          {"label": "School Sections", "link": "/school-setup/section-form"},
          {"label": "Classes Setup", "link": "/academic/classes-setup"},
          {"label": "Subjects Setup", "link": "/academic/subjects"},
          {"label": "Assessment Setup", "link": "/academic/ca-setup"},
          {"label": "Personal Dev. Setup", "link": "/academic/character-subjects"},
          {"label": "Time Table", "link": "/academic/simple-timetable"},
          {"label": "Communication Setup", "link": "/school-setup/communication-setup"}
        ]
      }
    ]
  },
  {
    "name": "SuperAdmin",
    "requiredAccess": ["superadmin"],
    "items": [
      {"key": "CREATE_SCHOOL_SA", "label": "Create School", "link": "/school-setup/add-school", "requiredAccess": ["superadmin"]},
      {"key": "SCHOOL_LIST_SA", "label": "School List", "link": "/school-setup/school-list", "requiredAccess": ["superadmin"]},
      {"key": "SUPPORT_DASHBOARD_SA", "label": "Support Dashboard", "link": "/support/superadmin-dashboard", "requiredAccess": ["superadmin"]},
      {"key": "QUEUE_DASHBOARD_SA", "label": "Queue Dashboard", "link": "/superadmin/queues", "requiredAccess": ["superadmin"]}
    ]
  },
  {
    "name": "Developer",
    "requiredAccess": ["developer"],
    "items": [
      {"key": "CREATE_SCHOOL", "label": "Create School", "link": "/school-setup/add-school", "requiredAccess": ["developer"]},
      {"key": "SCHOOL_LIST", "label": "School List", "link": "/school-setup/school-list", "requiredAccess": ["developer"]},
      {"key": "SUPERADMIN_LIST", "label": "SuperAdmin Management", "link": "/school-setup/superadmin-list", "icon": "ti ti-users", "requiredAccess": ["developer"]},
      {"key": "SUPPORT_DASHBOARD", "label": "Support Dashboard", "link": "/support/superadmin-dashboard", "requiredAccess": ["developer"]},
      {"key": "MENU_CONFIG", "label": "Menu Configuration", "link": "/school-setup/menu-config", "icon": "ti ti-settings", "requiredAccess": ["developer"]},
      {"key": "QUEUE_DASHBOARD", "label": "Queue Dashboard", "link": "/superadmin/queues", "icon": "ti ti-list-check", "requiredAccess": ["developer"]},
      {"key": "CREATE_SUPERADMIN", "label": "Create SuperAdmin", "link": "/school-setup/add-school", "icon": "ti ti-user-plus", "requiredAccess": ["developer"]}
    ]
  }
]'
);

SELECT 'RBAC Menu Cache updated successfully' AS status;
