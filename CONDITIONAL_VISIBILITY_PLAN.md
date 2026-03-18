# Conditional Visibility Implementation Plan
**Elite Scholar - Teacher Menu Conditional Access**

**Date:** February 27, 2026  
**Priority:** HIGH  
**Effort:** 3 weeks  
**Cost:** $6,000

---

## 📋 Overview

Implement conditional menu visibility based on staff type, role, and assignments:
- **Academic Staff (Form Masters)** see class management features
- **Academic Staff (Subject Teachers)** see teaching tools and lesson planning
- **Non-Academic Staff (Security, Cashier, Accountant)** see role-specific features only
- **Regular Teachers** see basic features only

### Staff Classification

**From `teachers` table:**
- `staff_type`: "Academic Staff" or "Non Academic Staff"
- `staff_role`: "School Head", "Subject Teacher", "Form Master", "Security", "Cashier", "Accountant", etc.
- `user_type`: "Teacher" (for all staff in teachers table)

**Key Insight:**
- Security, Cashier, Accountant are in `teachers` table with `staff_type = "Non Academic Staff"`
- They have 0 subjects, 0 form master roles
- But so do other non-teaching staff
- **Must check `staff_role` to differentiate**

---

## 🎯 Conditional Menu Rules

### **Data Sources**

#### Backend (Database Tables)
```sql
-- Staff Type & Role (PRIMARY CHECK)
SELECT staff_type, staff_role, user_type 
FROM teachers 
WHERE user_id = ?

-- Form Master Data
SELECT * FROM class_role 
WHERE teacher_id = ? AND role = 'Form Master'

-- Subject Assignments
SELECT * FROM active_teacher_classes 
WHERE teacher_id = ?

-- Teacher Subjects (from Redux)
store.auth.subjects = [
  { subject: "Mathematics", class_code: "CLS0423", class_name: "Primary 1" },
  { subject: "English", class_code: "CLS0427", class_name: "Primary 2 A" }
]

-- Teacher Roles (from Redux)
store.auth.teacher_roles = [
  { role: "Form Master", class_name: "Primary 2 A", class_code: "CLS0427" }
]

-- Staff Info (from Redux)
store.auth.user = {
  user_type: "Teacher",
  staff_type: "Academic Staff" | "Non Academic Staff",
  staff_role: "Subject Teacher" | "Form Master" | "Security" | "Cashier" | "Accountant"
}
```

#### Frontend (Redux Store)
```javascript
const { user, subjects, teacher_roles } = useSelector((state) => state.auth);

// Check staff type
const isAcademicStaff = user?.staff_type === "Academic Staff";
const isNonAcademicStaff = user?.staff_type === "Non Academic Staff";

// Check staff role
const staffRole = user?.staff_role; // "Security", "Cashier", "Accountant", etc.

// Check if Form Master
const isFormMaster = teacher_roles?.some(role => role.role === "Form Master");

// Check if has subjects
const hasSubjects = subjects && subjects.length > 0;

// Get form master class
const formMasterClass = teacher_roles?.find(role => role.role === "Form Master");
```

---

## 🎯 Staff Type Classification

### **Academic Staff**
```javascript
staff_type: "Academic Staff"
staff_role: "School Head" | "Vice School Head" | "Subject Teacher" | "Form Master" | "Liberian"

Characteristics:
- Has subject assignments (active_teacher_classes)
- May have form master role (class_role)
- Can access teaching tools

Multiple Roles Possible:
- A teacher can be BOTH "Subject Teacher" AND "Form Master"
- A teacher can be "Exam Officer" AND "Subject Teacher" AND "Form Master"
- Roles are additive (not exclusive)
```

### **User Roles vs Staff Roles**
```javascript
// user_type (from users table or JWT)
user_type: "Teacher" | "exam_officer" | "form_master" | etc.

// staff_role (from teachers table)
staff_role: "Subject Teacher" | "Form Master" | "School Head" | etc.

// Multiple user_type roles via role_inheritance
userRoles: ["exam_officer", "teacher"]  // exam_officer inherits teacher

// Multiple staff responsibilities
teacher_roles: [
  { role: "Form Master", class_code: "CLS0427" },
  { role: "Exam Officer", department: "Science" }
]

subjects: [
  { subject: "Mathematics", class_code: "CLS0423" },
  { subject: "Physics", class_code: "CLS0427" }
]
```

**Key Insight:**
- `user_type` determines menu access (via RBAC)
- `staff_role` determines job title/position
- `teacher_roles` determines specific responsibilities (Form Master, Exam Officer)
- `subjects` determines teaching assignments

A single teacher can have:
- 1 `user_type` (with inherited roles)
- 1 `staff_role` (job title)
- Multiple `teacher_roles` (responsibilities)
- Multiple `subjects` (teaching assignments)

### **Non-Academic Staff**
```javascript
staff_type: "Non Academic Staff"
staff_role: "Director" | "Deputy Director" | "Accountant" | "Cashier" | "Security" | "Cleaner" | "Driver" | "School Nurse" | "Metron"

Characteristics:
- 0 subject assignments
- 0 form master roles
- Role-specific menu access only
```

### **Differentiation Logic**
```javascript
// Security Staff
if (staff_type === "Non Academic Staff" && staff_role === "Security") {
  // Show: My Pay Slip, Scan Student Attendance, Scan Staff Attendance
}

// Cashier
if (staff_type === "Non Academic Staff" && staff_role === "Cashier") {
  // Show: My Pay Slip, Fees Collection, Payment Reports
}

// Accountant
if (staff_type === "Non Academic Staff" && staff_role === "Accountant") {
  // Show: My Pay Slip, Financial Reports, Accounting
}

// Academic Staff with no subjects (e.g., School Head)
if (staff_type === "Academic Staff" && subjects.length === 0) {
  // Show: Administrative features, no teaching tools
}
```

---

## 📊 Menu Conditional Rules

### **1. Class Management (Form Master Only)**

#### **Menu Items:**
- "My Class Students" → `/students/my-class`
- "Class Attendance" → `/attendance/my-class`
- "Class Timetable" → `/timetable/my-class`
- "FormMaster Review" → `/examinations/formmaster-review`

#### **Condition:**
```javascript
// Frontend Check
show: isFormMaster === true

// Backend Check
EXISTS (
  SELECT 1 FROM class_role 
  WHERE teacher_id = ? 
  AND role = 'Form Master' 
  AND school_id = ?
)
```

#### **Data Filter:**
```javascript
// When menu clicked, filter by form master class
const formMasterClass = teacher_roles.find(r => r.role === "Form Master");
const classCode = formMasterClass?.class_code; // e.g., "CLS0427"

// API call
GET /students/my-class?class_code=${classCode}
```

---

### **2. Teaching Tools (Subject Teachers Only)**

#### **Menu Items:**
- "Lessons" → `/teacher/lessons`
- "Assignments" → `/teacher/assignments`
- "Virtual Class" → `/teacher/virtual-class`
- "Generate Assessment" → `/teacher/assessment-generator`
- "Recitation" → `/teacher/recitation`

#### **Condition:**
```javascript
// Frontend Check
show: hasSubjects === true  // subjects.length > 0

// Backend Check
EXISTS (
  SELECT 1 FROM active_teacher_classes 
  WHERE teacher_id = ? 
  AND school_id = ?
)
```

---

### **3. Lesson Planning (Subject Teachers Only)**

#### **Menu Items:**
- "Syllabus" → `/teacher/syllabus-hub`
- "Lesson Plan" → `/teacher/lesson-plan-creator`
- "Lesson Plans Review" → `/teacher/lesson-plans-review`

#### **Condition:**
```javascript
// Frontend Check
show: hasSubjects === true

// Backend Check
EXISTS (
  SELECT 1 FROM active_teacher_classes 
  WHERE teacher_id = ?
)
```

---

### **4. Examinations (Mixed Access)**

#### **Menu Structure:**
```
Examinations
├── Assessment Form (Subject Teachers)
├── FormMaster Review (Form Masters ONLY)
└── Submit Questions (Subject Teachers)
```

#### **Conditions:**

**Assessment Form:**
```javascript
show: hasSubjects === true
```

**FormMaster Review:**
```javascript
show: isFormMaster === true
```

**Submit Questions:**
```javascript
show: hasSubjects === true
```

---

### **5. Non-Academic Staff Menus**

#### **A. Security Staff**

**Menu Items:**
- "My Pay Slip" → `/my-payslip`
- "Scan Student Attendance" → `/attendance/quick-scanner`
- "Scan Staff Attendance" → `/hrm/staff-attendance-scanner`

**Condition:**
```javascript
// Frontend Check
show: user?.staff_type === "Non Academic Staff" && user?.staff_role === "Security"

// Backend Check
SELECT 1 FROM teachers 
WHERE user_id = ? 
AND staff_type = 'Non Academic Staff' 
AND staff_role = 'Security'
```

**Hide:**
- All teaching tools
- Class management
- Lesson planning
- Examinations
- Student management (except scanning)

---

#### **B. Cashier**

**Menu Items:**
- "My Pay Slip" → `/my-payslip`
- "Collect Fees" → `/management/collect-fees`
- "Payment Reports" → `/management/payment-reports`
- "Daily Collections" → `/management/daily-collections`

**Condition:**
```javascript
show: user?.staff_type === "Non Academic Staff" && user?.staff_role === "Cashier"
```

**Hide:**
- Teaching tools
- Class management
- Student management
- Examinations

---

#### **C. Accountant**

**Menu Items:**
- "My Pay Slip" → `/my-payslip`
- "Financial Reports" → `/management/financial-reports`
- "Accounting" → `/management/accounting`
- "Budget Management" → `/management/budget`
- "Expense Tracking" → `/management/expenses`

**Condition:**
```javascript
show: user?.staff_type === "Non Academic Staff" && user?.staff_role === "Accountant"
```

**Hide:**
- Teaching tools
- Class management
- Student management (except reports)

---

#### **D. Other Non-Academic Staff (Cleaner, Driver, Nurse, etc.)**

**Menu Items:**
- "My Pay Slip" → `/my-payslip`
- "My Profile" → `/professional-profile`

**Condition:**
```javascript
show: user?.staff_type === "Non Academic Staff" && 
      !["Security", "Cashier", "Accountant"].includes(user?.staff_role)
```

**Hide:**
- All teaching tools
- All management features
- Only basic access

---

### **6. Dashboard Conditional Button**

#### **Location:** Teacher Dashboard (`/teacher-dashboard`)

#### **Button:**
```jsx
{isFormMaster && (
  <Button 
    type="primary" 
    onClick={() => navigate('/students/my-class')}
  >
    Manage My Class Students
  </Button>
)}
```

#### **Condition:**
```javascript
show: teacher_roles?.some(role => role.role === "Form Master")
```

---

## ⚠️ Role Inheritance Issues

### **Problem: Incorrect Role Inheritance**

**Issue Found:**
```json
{
  "user_type": "exam_officer",
  "userRoles": [
    "exam_officer",
    "teacher",      // ✅ CORRECT (exam_officer is a teacher)
    "vp_academic"   // ❌ WRONG (should not inherit this)
  ]
}
```

**Root Cause:**
The `role_inheritance` table has an incorrect entry:
```sql
-- WRONG ENTRY
child_role: 'exam_officer'
parent_role: 'vp_academic'
```

**Expected Behavior:**
- `exam_officer` should ONLY inherit from `teacher`
- `exam_officer` should NOT inherit from `vp_academic`

**Fix:**
```sql
-- Remove incorrect inheritance
DELETE FROM role_inheritance 
WHERE child_role = 'exam_officer' 
AND parent_role = 'vp_academic';

-- Ensure correct inheritance
INSERT IGNORE INTO role_inheritance (child_role, parent_role)
VALUES ('exam_officer', 'teacher');
```

**File:** `/elscholar-api/src/migrations/fix_exam_officer_inheritance.sql`

---

## 📋 Correct Role Inheritance Matrix

| Child Role | Parent Role(s) | Explanation |
|------------|----------------|-------------|
| `exam_officer` | `teacher` | Exam officers are teachers with exam responsibilities |
| `form_master` | `teacher` | Form masters are teachers with class management duties |
| `subject_teacher` | `teacher` | Subject teachers are regular teachers |
| `vp_academic` | `teacher` | VP Academic is a senior teacher role |
| `school_head` | `teacher` | School head is the most senior teacher |
| `cashier` | - | No inheritance (non-academic staff) |
| `accountant` | - | No inheritance (non-academic staff) |
| `security` | - | No inheritance (non-academic staff) |

**Rule:** Only academic staff roles should inherit from `teacher`. Non-academic staff should have NO inheritance.

---

## 🔧 Technical Implementation

### **Phase 1: Backend API Enhancement (Week 1)**

#### **Task 1.1: Update Menu Query**
**File:** `elscholar-api/src/controllers/rbacController.js`

```javascript
// Add conditional checks to menu query
const getUserMenu = async (req, res) => {
  const userId = req.user.id;
  const schoolId = req.user.school_id;
  
  // Get staff info (PRIMARY CHECK)
  const [staffInfo] = await db.sequelize.query(
    `SELECT staff_type, staff_role, user_type 
     FROM teachers 
     WHERE user_id = ? AND school_id = ?`,
    { replacements: [userId, schoolId], type: db.Sequelize.QueryTypes.SELECT }
  );
  
  if (!staffInfo) {
    return res.status(404).json({ success: false, error: 'Staff not found' });
  }
  
  const { staff_type, staff_role, user_type } = staffInfo;
  const isAcademicStaff = staff_type === 'Academic Staff';
  const isNonAcademicStaff = staff_type === 'Non Academic Staff';
  
  // For Academic Staff, check Form Master and Subjects
  let isFormMaster = false;
  let hasSubjects = false;
  let formMasterData = null;
  
  if (isAcademicStaff) {
    // Check if user is Form Master
    [formMasterData] = await db.sequelize.query(
      `SELECT class_role_id, class_name, class_code 
       FROM class_role 
       WHERE teacher_id = (SELECT id FROM teachers WHERE user_id = ?) 
       AND role = 'Form Master' 
       AND school_id = ?`,
      { replacements: [userId, schoolId], type: db.Sequelize.QueryTypes.SELECT }
    );
    
    // Check if user has subject assignments
    const [subjectData] = await db.sequelize.query(
      `SELECT COUNT(*) as count 
       FROM active_teacher_classes 
       WHERE teacher_id = (SELECT id FROM teachers WHERE user_id = ?) 
       AND school_id = ?`,
      { replacements: [userId, schoolId], type: db.Sequelize.QueryTypes.SELECT }
    );
    
    isFormMaster = !!formMasterData;
    hasSubjects = subjectData.count > 0;
  }
  
  // Fetch menu items
  let items = await db.sequelize.query(itemsQuery, { replacements, type: db.Sequelize.QueryTypes.SELECT });
  
  // Filter menu items based on staff type and role
  items = items.filter(item => {
    // Non-Academic Staff filtering
    if (isNonAcademicStaff) {
      // Security: Only attendance scanning and pay slip
      if (staff_role === 'Security') {
        const allowedItems = ['My Pay Slip', 'Scan Student Attendance', 'Scan Staff Attendance', 'Student Attendance', 'Staff Attendance'];
        return allowedItems.some(allowed => item.label.includes(allowed));
      }
      
      // Cashier: Only payment features and pay slip
      if (staff_role === 'Cashier') {
        const allowedItems = ['My Pay Slip', 'Collect Fees', 'Payment', 'Daily Collections', 'Financial'];
        return allowedItems.some(allowed => item.label.includes(allowed));
      }
      
      // Accountant: Only financial features and pay slip
      if (staff_role === 'Accountant') {
        const allowedItems = ['My Pay Slip', 'Financial', 'Accounting', 'Budget', 'Expense', 'Reports'];
        return allowedItems.some(allowed => item.label.includes(allowed));
      }
      
      // Other non-academic staff: Only pay slip and profile
      const basicItems = ['My Pay Slip', 'My Profile', 'Dashboard'];
      return basicItems.some(allowed => item.label.includes(allowed));
    }
    
    // Academic Staff filtering
    if (isAcademicStaff) {
      // Form Master only items
      if (item.requires_form_master && !isFormMaster) {
        return false;
      }
      
      // Subject Teacher only items
      if (item.requires_subjects && !hasSubjects) {
        return false;
      }
    }
    
    return true;
  });
  
  // Add metadata
  return res.json({
    success: true,
    data: items,
    metadata: {
      staff_type,
      staff_role,
      isAcademicStaff,
      isNonAcademicStaff,
      isFormMaster,
      hasSubjects,
      formMasterClass: formMasterData || null
    }
  });
};
```

#### **Task 1.2: Add Conditional Columns to Menu Items**
**File:** `elscholar-api/src/migrations/add_conditional_menu_columns.sql`

```sql
ALTER TABLE rbac_menu_items 
ADD COLUMN requires_form_master BOOLEAN DEFAULT 0,
ADD COLUMN requires_subjects BOOLEAN DEFAULT 0,
ADD COLUMN conditional_logic JSON DEFAULT NULL;

-- Update existing menu items
UPDATE rbac_menu_items SET requires_form_master = 1 
WHERE label IN ('My Class Students', 'Class Attendance', 'Class Timetable', 'FormMaster Review');

UPDATE rbac_menu_items SET requires_subjects = 1 
WHERE label IN ('Lessons', 'Assignments', 'Virtual Class', 'Generate Assessment', 
                'Recitation', 'Syllabus', 'Lesson Plan', 'Lesson Plans Review', 
                'Assessment Form', 'Submit Questions');
```

#### **Task 1.3: Create Conditional Check API**
**File:** `elscholar-api/src/routes/rbac.js`

```javascript
// New endpoint to check teacher conditions
router.get('/teacher-conditions', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const schoolId = req.user.school_id;
  
  try {
    // Check Form Master status
    const [formMasterData] = await db.sequelize.query(
      `SELECT class_role_id, class_name, class_code, section 
       FROM class_role 
       WHERE teacher_id = ? AND role = 'Form Master' AND school_id = ?`,
      { replacements: [userId, schoolId], type: db.Sequelize.QueryTypes.SELECT }
    );
    
    // Check Subject assignments
    const subjectData = await db.sequelize.query(
      `SELECT subject, class_name, class_code, section 
       FROM active_teacher_classes 
       WHERE teacher_id = ? AND school_id = ?`,
      { replacements: [userId, schoolId], type: db.Sequelize.QueryTypes.SELECT }
    );
    
    res.json({
      success: true,
      data: {
        isFormMaster: !!formMasterData,
        hasSubjects: subjectData.length > 0,
        formMasterClass: formMasterData || null,
        subjects: subjectData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

### **Phase 2: Frontend Implementation (Week 2)**

#### **Task 2.1: Update RBACContext**
**File:** `elscholar-ui/src/contexts/RBACContext.tsx`

```typescript
interface RBACContextType {
  permissions: Record<string, FeaturePermissions>;
  menu: MenuCategory[];
  loading: boolean;
  schoolPackage: string;
  isFormMaster: boolean;  // NEW
  hasSubjects: boolean;   // NEW
  formMasterClass: any;   // NEW
  hasFeature: (featureKey: string, action?: keyof FeaturePermissions) => boolean;
  refreshPermissions: () => void;
}

export const RBACProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isFormMaster, setIsFormMaster] = useState(false);
  const [hasSubjects, setHasSubjects] = useState(false);
  const [formMasterClass, setFormMasterClass] = useState(null);
  
  const { user, subjects, teacher_roles } = useSelector((state: RootState) => state.auth);

  const fetchRBACData = useCallback(async () => {
    if (!user?.id) return;

    // Check from Redux first (faster)
    const isFormMasterRedux = teacher_roles?.some(role => role.role === "Form Master");
    const hasSubjectsRedux = subjects && subjects.length > 0;
    
    setIsFormMaster(isFormMasterRedux);
    setHasSubjects(hasSubjectsRedux);
    
    if (isFormMasterRedux) {
      const fmClass = teacher_roles.find(role => role.role === "Form Master");
      setFormMasterClass(fmClass);
    }

    // Fetch menu with conditions
    _get(
      `api/rbac/menu`,
      (response: any) => {
        if (response.success) {
          setMenu(response.data);
          
          // Update from backend metadata (authoritative)
          if (response.metadata) {
            setIsFormMaster(response.metadata.isFormMaster);
            setHasSubjects(response.metadata.hasSubjects);
            setFormMasterClass(response.metadata.formMasterClass);
          }
        }
        setLoading(false);
      },
      (error: any) => {
        console.error('Failed to fetch RBAC data:', error);
        setLoading(false);
      }
    );
  }, [user?.id, teacher_roles, subjects]);

  const value: RBACContextType = {
    permissions,
    menu,
    loading,
    schoolPackage,
    isFormMaster,
    hasSubjects,
    formMasterClass,
    hasFeature,
    refreshPermissions: clearCacheAndRefresh,
  };

  return (
    <RBACContext.Provider value={value}>
      {children}
    </RBACContext.Provider>
  );
};
```

#### **Task 2.2: Update DynamicSidebar**
**File:** `elscholar-ui/src/core/common/sidebar/DynamicSidebar.tsx`

```typescript
import { useRBAC } from '../../../contexts/RBACContext';

const DynamicSidebar = () => {
  const { menu, loading, isFormMaster, hasSubjects } = useRBAC();
  
  const shouldShowMenuItem = (item: MenuItem) => {
    // Form Master only items
    if (item.requires_form_master && !isFormMaster) {
      return false;
    }
    
    // Subject Teacher only items
    if (item.requires_subjects && !hasSubjects) {
      return false;
    }
    
    return true;
  };
  
  return (
    <div className="sidebar">
      {menu.map(category => (
        <div key={category.name}>
          <h3>{category.name}</h3>
          {category.items
            .filter(item => shouldShowMenuItem(item))
            .map(item => (
              <MenuItem key={item.key} {...item} />
            ))}
        </div>
      ))}
    </div>
  );
};
```

#### **Task 2.3: Add Conditional Button to Teacher Dashboard**
**File:** `elscholar-ui/src/feature-module/academic/teacher/teacherDashboard/index.tsx`

```typescript
import { useRBAC } from '../../../../contexts/RBACContext';
import { useNavigate } from 'react-router-dom';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { isFormMaster, formMasterClass } = useRBAC();
  
  return (
    <div className="teacher-dashboard">
      <h1>Teacher Dashboard</h1>
      
      {/* Conditional Button for Form Masters */}
      {isFormMaster && formMasterClass && (
        <Card className="form-master-card">
          <Title level={4}>Form Master Actions</Title>
          <Space>
            <Button 
              type="primary" 
              icon={<UserOutlined />}
              onClick={() => navigate(`/students/my-class/${formMasterClass.class_code}`)}
            >
              Manage My Class Students ({formMasterClass.class_name})
            </Button>
            <Button 
              icon={<ClockCircleOutlined />}
              onClick={() => navigate(`/attendance/my-class/${formMasterClass.class_code}`)}
            >
              Class Attendance
            </Button>
            <Button 
              icon={<CalendarOutlined />}
              onClick={() => navigate(`/timetable/my-class/${formMasterClass.class_code}`)}
            >
              Class Timetable
            </Button>
          </Space>
        </Card>
      )}
      
      {/* Rest of dashboard */}
    </div>
  );
};
```

#### **Task 2.4: Create My Class Students Page**
**File:** `elscholar-ui/src/feature-module/peoples/students/my-class/index.tsx`

```typescript
import { useRBAC } from '../../../../contexts/RBACContext';
import { useParams, Navigate } from 'react-router-dom';

const MyClassStudents = () => {
  const { class_code } = useParams();
  const { isFormMaster, formMasterClass } = useRBAC();
  const [students, setStudents] = useState([]);
  
  // Security: Redirect if not Form Master
  if (!isFormMaster) {
    return <Navigate to="/teacher-dashboard" />;
  }
  
  // Security: Verify class_code matches form master class
  if (class_code && class_code !== formMasterClass?.class_code) {
    return <Navigate to="/teacher-dashboard" />;
  }
  
  useEffect(() => {
    // Fetch students for form master class only
    _get(
      `students?class_code=${formMasterClass.class_code}&school_id=${user.school_id}`,
      (res) => {
        if (res.success) {
          setStudents(res.data);
        }
      }
    );
  }, [formMasterClass]);
  
  return (
    <PageLayout
      title={`My Class Students - ${formMasterClass.class_name}`}
      description="Manage students in your form class"
    >
      <Table
        dataSource={students}
        columns={[
          { title: 'Name', dataIndex: 'student_name' },
          { title: 'Admission No', dataIndex: 'admission_no' },
          { title: 'Status', dataIndex: 'status' },
          {
            title: 'Actions',
            render: (_, record) => (
              <Space>
                <Button onClick={() => viewStudent(record)}>View</Button>
                <Button onClick={() => editStudent(record)}>Edit</Button>
              </Space>
            )
          }
        ]}
      />
    </PageLayout>
  );
};
```

---

### **Phase 3: Menu Configuration (Week 3)**

#### **Task 3.1: Update Menu Items in Database**

```sql
-- Form Master Menu Items
UPDATE rbac_menu_items 
SET requires_form_master = 1, 
    conditional_logic = '{"check": "isFormMaster", "source": "class_role"}'
WHERE label IN (
  'My Class Students',
  'Class Attendance', 
  'Class Timetable',
  'FormMaster Review'
);

-- Subject Teacher Menu Items
UPDATE rbac_menu_items 
SET requires_subjects = 1,
    conditional_logic = '{"check": "hasSubjects", "source": "active_teacher_classes"}'
WHERE label IN (
  'Lessons',
  'Assignments',
  'Virtual Class',
  'Generate Assessment',
  'Recitation',
  'Syllabus',
  'Lesson Plan',
  'Lesson Plans Review',
  'Assessment Form',
  'Submit Questions'
);

-- Mixed Access (Examinations parent)
UPDATE rbac_menu_items 
SET conditional_logic = '{"children_conditional": true}'
WHERE label = 'Examinations';
```

#### **Task 3.2: Create Menu Items (if not exist)**

```sql
-- Add "My Class Students" menu item
INSERT INTO rbac_menu_items (parent_id, label, icon, link, sort_order, requires_form_master, is_active)
VALUES (
  (SELECT id FROM rbac_menu_items WHERE label = 'Students' LIMIT 1),
  'My Class Students',
  'ti ti-users',
  '/students/my-class',
  1,
  1,
  1
);

-- Add "Class Attendance" menu item
INSERT INTO rbac_menu_items (parent_id, label, icon, link, sort_order, requires_form_master, is_active)
VALUES (
  (SELECT id FROM rbac_menu_items WHERE label = 'Attendance' LIMIT 1),
  'Class Attendance',
  'ti ti-clock',
  '/attendance/my-class',
  1,
  1,
  1
);

-- Add "Class Timetable" menu item
INSERT INTO rbac_menu_items (parent_id, label, icon, link, sort_order, requires_form_master, is_active)
VALUES (
  (SELECT id FROM rbac_menu_items WHERE label = 'Academic' LIMIT 1),
  'Class Timetable',
  'ti ti-calendar',
  '/timetable/my-class',
  5,
  1,
  1
);
```

#### **Task 3.3: Grant Access to Teacher Role**

```sql
-- Grant Form Master items to teacher role
INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type)
SELECT id, 'teacher', 'default'
FROM rbac_menu_items
WHERE requires_form_master = 1
ON DUPLICATE KEY UPDATE access_type = 'default';

-- Grant Subject Teacher items to teacher role
INSERT INTO rbac_menu_access (menu_item_id, user_type, access_type)
SELECT id, 'teacher', 'default'
FROM rbac_menu_items
WHERE requires_subjects = 1
ON DUPLICATE KEY UPDATE access_type = 'default';
```

---

## 📋 Complete Conditional Rules Matrix

| Menu Item | User Type | Condition | Data Source | Frontend Check | Backend Check |
|-----------|-----------|-----------|-------------|----------------|---------------|
| **My Class Students** | Academic Staff | Form Master | `class_role` | `isFormMaster` | `EXISTS (SELECT 1 FROM class_role WHERE teacher_id = ? AND role = 'Form Master')` |
| **Class Attendance** | Academic Staff | Form Master | `class_role` | `isFormMaster` | Same as above |
| **Class Timetable** | Academic Staff | Form Master | `class_role` | `isFormMaster` | Same as above |
| **Lessons** | Academic Staff | Has Subjects | `active_teacher_classes` | `hasSubjects` | `EXISTS (SELECT 1 FROM active_teacher_classes WHERE teacher_id = ?)` |
| **Assignments** | Academic Staff | Has Subjects | `active_teacher_classes` | `hasSubjects` | Same as above |
| **Virtual Class** | Academic Staff | Has Subjects | `active_teacher_classes` | `hasSubjects` | Same as above |
| **Generate Assessment** | Academic Staff | Has Subjects | `active_teacher_classes` | `hasSubjects` | Same as above |
| **Recitation** | Academic Staff | Has Subjects | `active_teacher_classes` | `hasSubjects` | Same as above |
| **Syllabus** | Academic Staff | Has Subjects | `active_teacher_classes` | `hasSubjects` | Same as above |
| **Lesson Plan** | Academic Staff | Has Subjects | `active_teacher_classes` | `hasSubjects` | Same as above |
| **Lesson Plans Review** | Academic Staff | Has Subjects | `active_teacher_classes` | `hasSubjects` | Same as above |
| **Assessment Form** | Academic Staff | Has Subjects | `active_teacher_classes` | `hasSubjects` | Same as above |
| **Submit Questions** | Academic Staff | Has Subjects | `active_teacher_classes` | `hasSubjects` | Same as above |
| **FormMaster Review** | Academic Staff | Form Master | `class_role` | `isFormMaster` | `EXISTS (SELECT 1 FROM class_role WHERE teacher_id = ? AND role = 'Form Master')` |
| **My Pay Slip** | All Staff | Always | `teachers` | `true` | `EXISTS (SELECT 1 FROM teachers WHERE user_id = ?)` |
| **Scan Student Attendance** | Security | Staff Role | `teachers.staff_role` | `staffRole === "Security"` | `SELECT 1 FROM teachers WHERE user_id = ? AND staff_role = 'Security'` |
| **Scan Staff Attendance** | Security | Staff Role | `teachers.staff_role` | `staffRole === "Security"` | Same as above |
| **Collect Fees** | Cashier | Staff Role | `teachers.staff_role` | `staffRole === "Cashier"` | `SELECT 1 FROM teachers WHERE user_id = ? AND staff_role = 'Cashier'` |
| **Payment Reports** | Cashier | Staff Role | `teachers.staff_role` | `staffRole === "Cashier"` | Same as above |
| **Financial Reports** | Accountant | Staff Role | `teachers.staff_role` | `staffRole === "Accountant"` | `SELECT 1 FROM teachers WHERE user_id = ? AND staff_role = 'Accountant'` |
| **Accounting** | Accountant | Staff Role | `teachers.staff_role` | `staffRole === "Accountant"` | Same as above |

---

## 🔒 Security Considerations

### **Frontend Security (UX Only)**
```typescript
// Frontend checks are for UX only - hide menu items
if (!isFormMaster) {
  // Don't show "My Class Students" menu
}
```

### **Backend Security (Enforced)**
```javascript
// Backend MUST validate on every API call
app.get('/students/my-class/:class_code', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const classCode = req.params.class_code;
  
  // Verify user is Form Master of this class
  const [formMaster] = await db.sequelize.query(
    `SELECT 1 FROM class_role 
     WHERE teacher_id = ? AND class_code = ? AND role = 'Form Master'`,
    { replacements: [userId, classCode], type: db.Sequelize.QueryTypes.SELECT }
  );
  
  if (!formMaster) {
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied: Not form master of this class' 
    });
  }
  
  // Proceed with query
});
```

---

## 🧪 Testing Plan

### **Test Case 1: Form Master Access**
```javascript
// Given: Teacher is Form Master of Primary 2 A
// When: Teacher logs in
// Then: Should see "My Class Students" menu
// And: Clicking it shows only Primary 2 A students

// Given: Teacher is NOT Form Master
// When: Teacher logs in
// Then: Should NOT see "My Class Students" menu
// And: Direct URL access should redirect to dashboard
```

### **Test Case 2: Subject Teacher Access**
```javascript
// Given: Teacher has 3 subject assignments
// When: Teacher logs in
// Then: Should see "Lessons", "Lesson Plan", "Syllabus" menus

// Given: Teacher has NO subject assignments
// When: Teacher logs in
// Then: Should NOT see teaching tool menus
```

### **Test Case 3: Mixed Access (Examinations)**
```javascript
// Given: Teacher is Form Master AND has subjects
// When: Teacher opens Examinations menu
// Then: Should see "Assessment Form", "FormMaster Review", "Submit Questions"

// Given: Teacher is Form Master but NO subjects
// When: Teacher opens Examinations menu
// Then: Should see only "FormMaster Review"

// Given: Teacher has subjects but NOT Form Master
// When: Teacher opens Examinations menu
// Then: Should see "Assessment Form" and "Submit Questions" only
```

### **Test Case 4: Dashboard Button**
```javascript
// Given: Teacher is Form Master
// When: Teacher visits dashboard
// Then: Should see "Manage My Class Students" button
// And: Button shows correct class name

// Given: Teacher is NOT Form Master
// When: Teacher visits dashboard
// Then: Should NOT see "Manage My Class Students" button
```

### **Test Case 5: Security Bypass Attempt**
```javascript
// Given: Teacher is NOT Form Master
// When: Teacher manually navigates to /students/my-class/CLS0427
// Then: Should be redirected to dashboard
// And: API should return 403 Forbidden
```

---

## 📊 Additional Scenarios

### **Scenario 1: Teacher with Multiple Roles**
```javascript
// Teacher is BOTH Form Master AND Subject Teacher
// Should see:
// - My Class Students (Form Master)
// - Class Attendance (Form Master)
// - Lessons (Subject Teacher)
// - Lesson Plan (Subject Teacher)
// - FormMaster Review (Form Master)
// - Submit Questions (Subject Teacher)
```

### **Scenario 2: Security Staff**
```javascript
// User: Mr. Bello
// staff_type: "Non Academic Staff"
// staff_role: "Security"
// subjects: [] (0 subjects)
// teacher_roles: [] (not form master)

// Should see ONLY:
// - My Pay Slip
// - Scan Student Attendance
// - Scan Staff Attendance

// Should NOT see:
// - Any teaching tools
// - Class management
// - Student management
// - Financial features
```

### **Scenario 3: Cashier**
```javascript
// User: Mrs. Amina
// staff_type: "Non Academic Staff"
// staff_role: "Cashier"
// subjects: [] (0 subjects)
// teacher_roles: [] (not form master)

// Should see ONLY:
// - My Pay Slip
// - Collect Fees
// - Payment Reports
// - Daily Collections

// Should NOT see:
// - Teaching tools
// - Class management
// - Student management
```

### **Scenario 4: Accountant**
```javascript
// User: Mr. Chukwu
// staff_type: "Non Academic Staff"
// staff_role: "Accountant"
// subjects: [] (0 subjects)
// teacher_roles: [] (not form master)

// Should see ONLY:
// - My Pay Slip
// - Financial Reports
// - Accounting
// - Budget Management
// - Expense Tracking

// Should NOT see:
// - Teaching tools
// - Class management
```

### **Scenario 5: School Head (Academic Staff, No Subjects)**
```javascript
// User: Dr. Okonkwo
// staff_type: "Academic Staff"
// staff_role: "School Head"
// subjects: [] (0 subjects - doesn't teach)
// teacher_roles: [] (not form master)

// Should see:
// - All administrative features
// - Student management
// - Staff management
// - Reports
// - School setup

// Should NOT see:
// - Teaching tools (no subjects)
// - Lesson planning (no subjects)
// - My Class Students (not form master)
```

### **Scenario 6: Cleaner/Driver (Basic Staff)**
```javascript
// User: Mr. Ibrahim
// staff_type: "Non Academic Staff"
// staff_role: "Cleaner" or "Driver"
// subjects: [] (0 subjects)
// teacher_roles: [] (not form master)

// Should see ONLY:
// - My Pay Slip
// - My Profile

// Should NOT see:
// - Any other features
```

### **Scenario 7: Teacher Promoted to Form Master**
```javascript
// Before: Teacher has subjects only
// Menu: Lessons, Assignments, Syllabus

// After: Teacher assigned as Form Master
// Menu: Lessons, Assignments, Syllabus, My Class Students, Class Attendance

// Implementation:
// 1. Admin assigns Form Master role in class_role table
// 2. Teacher logs out and logs in (or cache expires)
// 3. Menu automatically updates with new items
```

### **Scenario 3: Teacher Loses Subject Assignment**
```javascript
// Before: Teacher has 2 subjects
// Menu: Lessons, Lesson Plan, Syllabus

// After: All subjects removed from active_teacher_classes
// Menu: Only Dashboard (teaching tools hidden)

// Implementation:
// 1. Admin removes subject assignments
// 2. Teacher refreshes page
// 3. Menu automatically hides teaching tools
```

### **Scenario 4: School Disables Feature**
```javascript
// School has "Virtual Class" disabled in package
// Even if teacher has subjects:
// - Should NOT see "Virtual Class" menu
// - Package restriction overrides conditional visibility

// Priority: Package > Conditional > Role
```

### **Scenario 5: Temporary Form Master**
```javascript
// Teacher assigned as Form Master for 1 term only
// Use time-based permissions:

UPDATE class_role 
SET valid_from = '2026-01-01', 
    valid_until = '2026-04-30'
WHERE teacher_id = 824 AND role = 'Form Master';

// After April 30, 2026:
// - Menu automatically hides Form Master items
// - Teacher reverts to Subject Teacher only
```

---

## 🚀 Deployment Checklist

### **Pre-Deployment**
- [ ] Run database migrations
- [ ] Update menu items with conditional flags
- [ ] Test with Form Master account
- [ ] Test with Subject Teacher account
- [ ] Test with regular Teacher account
- [ ] Test security bypass attempts
- [ ] Clear all menu caches

### **Deployment**
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Run SQL updates on production
- [ ] Monitor error logs
- [ ] Verify menu loading times

### **Post-Deployment**
- [ ] Test with real teacher accounts
- [ ] Collect feedback from Form Masters
- [ ] Monitor API performance
- [ ] Check cache hit rates
- [ ] Document any issues

---

## 💰 Cost Breakdown

| Phase | Tasks | Duration | Cost |
|-------|-------|----------|------|
| **Phase 1: Backend** | Menu query, API, migrations | 1 week | $2,000 |
| **Phase 2: Frontend** | Context, sidebar, pages | 1 week | $2,000 |
| **Phase 3: Configuration** | Menu setup, testing | 1 week | $2,000 |
| **Total** | | **3 weeks** | **$6,000** |

---

## 📈 Expected Benefits

### **Quantifiable:**
- 40% reduction in menu clutter for teachers
- 60% faster navigation (fewer irrelevant items)
- 30% reduction in support tickets ("I can't find X")

### **Qualitative:**
- Improved teacher experience
- Better security (role-based access)
- Clearer feature discovery
- Reduced confusion

---

## 🔄 Future Enhancements

### **Phase 4: Advanced Conditionals (Q3 2026)**
- Show "Library" only if school has library
- Show "Transport" only if school has buses
- Show "Hostel" only if school has boarding

### **Phase 5: Personalization (Q4 2026)**
- Teachers can hide/show menu items
- Teachers can reorder menu items
- Teachers can create custom shortcuts

---

**Document Created:** February 27, 2026  
**Last Updated:** February 27, 2026  
**Next Review:** March 27, 2026
