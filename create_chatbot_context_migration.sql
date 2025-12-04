-- Migration to create chatbot_context table for training data
-- This table will store mappings between sidebar menu items and routes for chatbot assistance

DROP TABLE IF EXISTS chatbot_context;

CREATE TABLE chatbot_context (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_label VARCHAR(255) NOT NULL,
    route_path VARCHAR(500) NOT NULL,
    submenu_label VARCHAR(255),
    description TEXT,
    keywords TEXT, -- Comma-separated keywords for search
    category VARCHAR(100), -- Main category like 'Personal Data Mngr', 'Class Management', etc.
    user_types JSON, -- JSON array of user types that can access this
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_menu_label (menu_label),
    INDEX idx_route_path (route_path),
    INDEX idx_category (category)
);

-- Insert some sample data based on common menu items
-- Main Dashboard Items
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Admin Dashboard', '/admin-dashboard', 'Main administrative dashboard for school management', 'dashboard,admin,overview,main', 'Dashboard', '["admin", "branchadmin"]');
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Teacher Dashboard', '/teacher-dashboard', 'Dashboard for teachers to manage classes and students', 'dashboard,teacher,class,students', 'Dashboard', '["teacher"]');
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Student Dashboard', '/student-dashboard', 'Dashboard for students to track courses and grades', 'dashboard,student,courses,grades', 'Dashboard', '["student"]');
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Parent Dashboard', '/parent-dashboard', 'Dashboard for parents to track student progress', 'dashboard,parent,student,progress', 'Dashboard', '["parent"]');

-- Student Management
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Student List', '/student/student-list', 'View and manage all enrolled students', 'student,list,manage,enrolled,view', 'Personal Data Mngr', '["admin", "branchadmin"]');
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Students List', '/student/list', 'Browse all students in the system', 'student,browse,all,list,system', 'Personal Data Mngr', '["admin", "branchadmin", "teacher"]');
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Add Student', '/student/add-student', 'Add new students to the system', 'student,add,new,enroll,register', 'Personal Data Mngr', '["admin", "branchadmin"]');

-- Class Management
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Class Time Table', '/academic/class-time-table', 'View and manage class schedules and timetables', 'class,schedule,timetable,time table,periods', 'Class Management', '["admin", "branchadmin", "teacher"]');
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Class Attendance', '/academic/class/attendance', 'Take and manage class attendance records', 'class,attendance,record,mark attendance,present,absent', 'Class Management', '["admin", "branchadmin", "teacher"]');
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Lessons', '/teacher/lessons', 'Create and manage lesson plans and materials', 'lesson,plan,material,curriculum,teach', 'Class Management', '["teacher"]');

-- Exam and Assessment
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Exams', '/academic/examinations/exam', 'Manage examinations and test schedules', 'exam,test,schedule,assessment,grade', 'Examinations', '["admin", "branchadmin", "teacher"]');
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Exam Results', '/academic/examinations/exam-results', 'View and publish exam results', 'exam,result,publish,grade,score', 'Examinations', '["admin", "branchadmin", "teacher", "parent"]');
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Grades', '/academic/examinations/grade', 'Manage grading systems and scales', 'grade,scale,grading,system,evaluation', 'Examinations', '["admin", "branchadmin", "teacher"]');

-- Finance and Accounting
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Student Payment', '/parent/studentpayment', 'Make payments for student fees and charges', 'payment,student,fee,charge,finance', 'Finance', '["parent"]');
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Collect Fees', '/management/collect-fees', 'Collect and process student fee payments', 'collect,fee,payment,process,receive', 'Finance', '["admin", "branchadmin"]');
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Financial Reports', '/accounts/financial-analytics-dashboard', 'View financial reports and analytics', 'finance,report,analytics,statement,income,expense', 'Finance', '["admin", "branchadmin"]');

-- Staff Management
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Staff List', '/hrm/staff', 'View and manage all staff members', 'staff,list,employee,worker,manage', 'HR Management', '["admin", "branchadmin"]');
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Teachers', '/teacher/teacher-list', 'Manage teacher profiles and assignments', 'teacher,list,profile,assign,staff', 'HR Management', '["admin", "branchadmin"]');

-- Settings
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Profile Settings', '/general-settings/profile-settings', 'Update personal profile information', 'profile,settings,update,information,personal', 'Settings', '["admin", "branchadmin", "teacher", "student", "parent"]');
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Security Settings', '/general-settings/security-settings', 'Manage account security and passwords', 'security,settings,password,change,password,secure', 'Settings', '["admin", "branchadmin", "teacher", "student", "parent"]');

-- Insert more comprehensive data for other common areas
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Subjects', '/academic/class-subject/subjects', 'Manage academic subjects offered in school', 'subject,academic,curriculum,teaching,learn', 'Academic', '["admin", "branchadmin"]');
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Classes', '/academic/classes/ClassesSetUp', 'Set up and manage school classes', 'class,set up,manage,academic,group', 'Academic', '["admin", "branchadmin"]');
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Academic Year', '/school-setup/academic-year-setup', 'Configure academic calendar and year settings', 'academic,year,calendar,session,term', 'Academic', '["admin", "branchadmin"]');

INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Parent Lists', '/parent/parent-list', 'View and manage parent contacts', 'parent,contact,list,guardian,communication', 'Personal Data Mngr', '["admin", "branchadmin"]');
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('School Settings', '/academic-settings/school-settings', 'Configure school-wide settings', 'school,settings,configure,setup,options', 'Settings', '["admin", "branchadmin"]');

-- Virtual Classroom
INSERT INTO chatbot_context (menu_label, route_path, description, keywords, category, user_types) VALUES
('Virtual Classroom', '/virtual-classroom/teacher', 'Access online classroom features', 'virtual,classroom,online,video,meeting,remote', 'Virtual Learning', '["teacher", "student", "admin"]');