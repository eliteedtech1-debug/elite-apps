-- Migration to populate chatbot_knowledge_base table with menu and route information
-- This data will help the chatbot assist users in finding specific pages

-- Clear any existing data for menu/route related entries to avoid duplicates
DELETE FROM chatbot_knowledge_base WHERE category IN ('Menu Navigation', 'Route Information', 'Page Location', 'Dashboard Navigation');

-- Insert data to help users find dashboard pages
INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'How do I access the admin dashboard?', 'To access the admin dashboard, click on "Admin Dashboard" in the main navigation menu. The URL path is /admin-dashboard.', 'admin,dashboard,access,go to,find,master admin,administrator', 'nav.dashboard.admin', 10, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'Where is the teacher dashboard?', 'The teacher dashboard is available in the main navigation menu. Look for "Teacher Dashboard" or visit /teacher-dashboard directly.', 'teacher,dashboard,location,find,access,where is', 'nav.dashboard.teacher', 10, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'How can I find the student dashboard?', 'The student dashboard is accessible from the main menu. Click on "Student Dashboard" or go directly to /student-dashboard.', 'student,dashboard,location,find,access,where is', 'nav.dashboard.student', 10, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'Where is the parent dashboard?', 'You can access the parent dashboard from the main navigation menu. The direct URL is /parent-dashboard.', 'parent,dashboard,location,find,access,where is', 'nav.dashboard.parent', 10, true);

-- Student Management Navigation
INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'Where can I see all students?', 'To view all students, navigate to "Personal Data Mngr" > "Students List" in the sidebar, or visit /student-list directly.', 'student,list,see all,view,manage,student management,find students', 'nav.students.list', 9, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'How do I add a new student?', 'To add a new student, go to "Personal Data Mngr" > "Students List" and click the "Add Student" button, or visit /student/add-student directly.', 'add,student,new,register,enroll,create', 'nav.students.add', 9, true);

-- Class Management Navigation
INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'Where do I find class timetables?', 'Class timetables can be found under "Class Management" > "Daily Routine" > "Class Time Table" in the sidebar, or visit /academic/class-time-table directly.', 'timetable,class time,calendar,schedule,period,subject schedule', 'nav.timetable', 9, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'How do I take attendance?', 'To take attendance, navigate to "Personal Data Mngr" > "Attendance" > "Student Attendance" in the sidebar, or visit /academic/student-attendance directly.', 'attendance,take,mark attendance,record attendance,student', 'nav.attendance', 9, true);

-- Exam and Assessment Navigation
INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'Where do I manage exams?', 'Exams can be managed under "Academic" > "Examinations" > "Exam" in the sidebar, or visit /academic/exam directly.', 'exam,manage,examination,test,quiz,assessment', 'nav.exam', 8, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'How do I view exam results?', 'Exam results are available under "Academic" > "Examinations" > "Exam Results" in the sidebar, or go to /academic/exam-result directly.', 'exam,result,view,grades,scores,reports', 'nav.exam.results', 8, true);

-- Finance Navigation
INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'Where do I handle student payments?', 'Student payments are managed under "Personal Data Mngr" > "Student Payment" in the sidebar, or visit /parent/studentpayment directly.', 'payment,student payment,fee,fine,charges,bill', 'nav.payment', 8, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'How do I collect fees?', 'To collect fees, go to "Management" > "Fees Management" > "Collect Fees" in the sidebar, or visit /management/collect-fees directly.', 'collect,fee,payment,process,receive,accept', 'nav.collect.fees', 8, true);

-- Staff Management Navigation
INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'Where can I manage staff members?', 'Staff members can be managed under "Personal Data Mngr" > "Staff Management" > "Staff List" in the sidebar.', 'staff,employee,manage,human resource,hr,people', 'nav.staff', 8, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'How do I view teachers?', 'Teachers can be viewed under "Personal Data Mngr" > "Staff Management" > "Teacher List" in the sidebar, or visit /teacher/teacher-list directly.', 'teacher,list,educator,staff,employee', 'nav.teachers', 8, true);

-- Academic Navigation
INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'Where do I manage subjects?', 'Subjects can be managed under "Academic" > "Subjects" in the sidebar, or visit /academic/subject directly.', 'subject,academic,curriculum,teaching,learning', 'nav.subjects', 8, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'How do I set up classes?', 'To set up classes, navigate to "Academic" > "Classes" in the sidebar, or visit /academic/classes-setup directly.', 'class,set up,configure,create', 'nav.classes.setup', 8, true);

-- Settings Navigation
INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'Where can I update my profile settings?', 'Profile settings can be accessed via the user profile icon/menu in the top right corner, or under "Settings" > "Profile Settings" if available in your menu.', 'profile,settings,update,account,preferences,user info', 'nav.settings.profile', 7, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'How do I change my password?', 'To change your password, go to profile menu (top right) and select "Security Settings", or look under "Settings" > "Security Settings" in the sidebar.', 'password,change,security,account,settings', 'nav.settings.security', 7, true);

-- Virtual Classroom Navigation
INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'Where do I access the virtual classroom?', 'The virtual classroom can be accessed via "Virtual Classroom" in the main navigation, or visit /virtual-classroom/teacher directly.', 'virtual,classroom,online,video,conference,meet', 'nav.virtual.classroom', 9, true);

-- Generic Navigation
INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'How do I find a specific page?', 'To find a specific page, look for it in the main navigation sidebar on the left. Pages are organized in categories like "Personal Data Mngr", "Class Management", "Academic", etc.', 'find,page,navigation,menu,sidebar,where is,locate', 'nav.find.page', 10, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Menu Navigation', 'What are the main sections in the menu?', 'The main sections in the menu include: Personal Data Mngr (for students, staff, parents), Class Management (for classes, attendance, lessons), Academic (for subjects, exams), Finance (for fees and payments), and Settings.', 'menu,sections,categories,parts,main areas', 'nav.menu.sections', 10, true);


-- Migration to add password reset information to chatbot_knowledge_base table
-- This will help the chatbot answer questions about resetting passwords

-- Insert password reset related data
INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'How do I reset my password?', 'To reset your password, go to the login page and click "Forgot Password". Enter your email or username, and you will receive instructions to reset your password. For additional help, visit the "Forgot Password" page directly.', 'password,reset,change,forgot,lost,forget,help,account', 'password.reset', 12, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'Where is the forgot password link?', 'The "Forgot Password" link is located on the login page. You can also access it directly by visiting the "Forgot Password" page. It''s usually positioned below the login button.', 'forgot,password,link,where,is,located,find,login page', 'password.forgot.link', 11, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'I forgot my password, what do I do?', 'If you forgot your password, click on the "Forgot Password" link on the login page. Enter your email or username, and you will receive instructions to create a new password. Check your spam folder if you don''t see the email.', 'forgot,password,what,do,i,reset,help', 'password.forgot.help', 12, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'How do I change my password?', 'To change your password, log in to your account and navigate to Settings > Security Settings. Look for "Change Password" or "Password Settings". You will typically need your current password to set a new one.', 'change,password,update,settings,security,account,modify', 'password.change', 11, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'Can I reset my password without email?', 'Currently, password resets require access to your registered email address. If you''ve forgotten your password, you must use the "Forgot Password" feature which sends a reset link to your email. If you don''t have access to your email, contact your system administrator for assistance.', 'reset,password,without,email,alternative,contact,admin,administrator', 'password.reset.no.email', 10, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'How do I access the password reset page?', 'You can access the password reset page by clicking the "Forgot Password?" link on the login page. Alternatively, you can visit the dedicated password reset page directly from the main navigation or by following the link provided in the password reset email.', 'password,reset,page,access,reach,forgot', 'password.reset.page', 11, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'What if I didn''t receive the password reset email?', 'If you didn''t receive the password reset email, check your spam or junk folder. Make sure you entered the correct email address associated with your account. If you still don''t receive it, try resending the request or contact your system administrator.', 'password,reset,email,not,received,spam,junk,trouble', 'password.reset.email.trouble', 10, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'How long is the password reset link valid?', 'The password reset link is typically valid for 24 hours. If the link expires, you will need to request a new password reset. Make sure to reset your password promptly after receiving the link.', 'password,reset,link,valid,expire,expiration,time,deadline', 'password.reset.validity', 9, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'What if I need to reset someone else''s password?', 'As an admin, you may be able to reset other users'' passwords. Navigate to the user management section, find the user''s profile, and look for a "Reset Password" option. For security, this may require additional authorization.', 'password,reset,admin,another,user,employee,student,parent,teacher', 'password.reset.others', 9, true);

INSERT INTO chatbot_knowledge_base (category, question, answer, keywords, intent, priority, is_active) VALUES
('Password Management', 'Is there a minimum password strength requirement?', 'Yes, passwords must meet certain requirements which often include a minimum length of 8 characters, at least one uppercase letter, one lowercase letter, one number, and sometimes a special character. Choose a strong, unique password that you don''t use for other sites.', 'password,stength,requirement,minimum,complexity,secure,strong,security', 'password.strength.requirement', 8, true);