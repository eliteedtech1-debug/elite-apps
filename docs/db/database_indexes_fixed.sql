-- Elite Core Performance Optimization - CORRECTED
-- Week 1: Database Indexes
-- Created: 2026-02-10

-- ============================================
-- PAYMENT QUERIES OPTIMIZATION
-- ============================================

-- Payment entries by school/branch
CREATE INDEX IF NOT EXISTS idx_payment_entries_school_branch 
ON payment_entries(school_id, branch_id);

-- Payment status filtering
CREATE INDEX IF NOT EXISTS idx_payment_entries_status 
ON payment_entries(payment_status, payment_date);

-- Student payment lookup
CREATE INDEX IF NOT EXISTS idx_payment_entries_admission 
ON payment_entries(admission_no);

-- Payment date range queries
CREATE INDEX IF NOT EXISTS idx_payment_entries_date 
ON payment_entries(payment_date, school_id);

-- ============================================
-- ATTENDANCE QUERIES OPTIMIZATION
-- ============================================
-- Note: attendance table has NO school_id/branch_id

-- Attendance by date (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_attendance_date 
ON attendance(date, status);

-- Student attendance history
CREATE INDEX IF NOT EXISTS idx_attendance_student 
ON attendance(student_id, date);

-- Attendance status filtering
CREATE INDEX IF NOT EXISTS idx_attendance_status 
ON attendance(status, date);

-- ============================================
-- STAFF ATTENDANCE QUERIES OPTIMIZATION
-- ============================================

-- Staff attendance by date and school
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date_school 
ON staff_attendance(date, school_id, branch_id);

-- Staff attendance history
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff 
ON staff_attendance(staff_id, date);

-- Staff attendance status
CREATE INDEX IF NOT EXISTS idx_staff_attendance_status 
ON staff_attendance(status, date, school_id);

-- ============================================
-- PAYROLL QUERIES OPTIMIZATION
-- ============================================

-- Payroll lines by period (salary report page)
CREATE INDEX IF NOT EXISTS idx_payroll_lines_period 
ON payroll_lines(period_id, school_id, branch_id);

-- Payroll period lookup
CREATE INDEX IF NOT EXISTS idx_payroll_periods_month 
ON payroll_periods(period_month, school_id);

-- Staff payroll history
CREATE INDEX IF NOT EXISTS idx_payroll_lines_staff 
ON payroll_lines(staff_id, period_id);

-- Payroll status filtering
CREATE INDEX IF NOT EXISTS idx_payroll_periods_status 
ON payroll_periods(status, school_id);

-- ============================================
-- STUDENT QUERIES OPTIMIZATION
-- ============================================

-- Student by class (most common filter)
CREATE INDEX IF NOT EXISTS idx_students_class 
ON students(class_name, school_id, branch_id);

-- Student lookup by admission number
CREATE INDEX IF NOT EXISTS idx_students_admission 
ON students(admission_no);

-- Student search by name
CREATE INDEX IF NOT EXISTS idx_students_name 
ON students(first_name, last_name, school_id);

-- Active students filtering
CREATE INDEX IF NOT EXISTS idx_students_status 
ON students(status, school_id, branch_id);

-- ============================================
-- STAFF QUERIES OPTIMIZATION
-- ============================================

-- Staff by school/branch
CREATE INDEX IF NOT EXISTS idx_staff_school_branch 
ON teachers(school_id, branch_id);

-- Staff by grade level
CREATE INDEX IF NOT EXISTS idx_staff_grade 
ON teachers(grade_id, school_id);

-- Staff lookup by email
CREATE INDEX IF NOT EXISTS idx_staff_email 
ON teachers(email);

-- Staff status
CREATE INDEX IF NOT EXISTS idx_staff_status 
ON teachers(status, school_id);

-- ============================================
-- JOURNAL ENTRIES OPTIMIZATION
-- ============================================

-- Journal entries by transaction date
CREATE INDEX IF NOT EXISTS idx_journal_entries_trans_date 
ON journal_entries(transaction_date, school_id);

-- Journal entries by account
CREATE INDEX IF NOT EXISTS idx_journal_entries_account 
ON journal_entries(account_code, school_id);

-- Journal entries by status
CREATE INDEX IF NOT EXISTS idx_journal_entries_status 
ON journal_entries(status, school_id);

-- ============================================
-- CHATBOT OPTIMIZATION
-- ============================================
-- Note: chatbot_conversations has NO school_id/branch_id

-- Chatbot conversations lookup
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user 
ON chatbot_conversations(user_id, created_at);

-- Chatbot conversations by session
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session 
ON chatbot_conversations(session_id, created_at);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT '✅ All indexes created successfully!' as Status;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as COLUMNS
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE()
    AND INDEX_NAME LIKE 'idx_%'
GROUP BY TABLE_NAME, INDEX_NAME
ORDER BY TABLE_NAME, INDEX_NAME;
