-- Elite Scholar Performance Optimization - MINIMAL WORKING VERSION
-- Only indexes for columns that actually exist

-- Payment entries
CREATE INDEX IF NOT EXISTS idx_payment_entries_school_branch ON payment_entries(school_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_payment_entries_status ON payment_entries(payment_status, payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_entries_admission ON payment_entries(admission_no);
CREATE INDEX IF NOT EXISTS idx_payment_entries_date ON payment_entries(payment_date, school_id);

-- Attendance (no school_id, no student_id)
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date, status);
CREATE INDEX IF NOT EXISTS idx_attendance_name ON attendance(name, date);

-- Staff attendance
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date_school ON staff_attendance(date, school_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff ON staff_attendance(staff_id, date);

-- Payroll
CREATE INDEX IF NOT EXISTS idx_payroll_lines_period ON payroll_lines(period_id, school_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_staff ON payroll_lines(staff_id, period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_month ON payroll_periods(period_month, school_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON payroll_periods(status, school_id);

-- Students
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_name, school_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_students_admission ON students(admission_no);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(first_name, surname, school_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status, school_id, branch_id);

-- Teachers/Staff
CREATE INDEX IF NOT EXISTS idx_teachers_school_branch ON teachers(school_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_teachers_grade ON teachers(grade_id, school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status, school_id);

-- Journal entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_trans_date ON journal_entries(transaction_date, school_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_account ON journal_entries(account_code, school_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status, school_id);

-- Chatbot
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user ON chatbot_conversations(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session ON chatbot_conversations(session_id, created_at);

SELECT '✅ All indexes created successfully!' as Status;
