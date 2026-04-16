-- Elite Core Performance Optimization
-- Week 1: Database Indexes
-- Created: 2026-02-10

-- ============================================
-- PAYMENT QUERIES OPTIMIZATION
-- ============================================

-- Payment entries by school/branch (most common query)
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

-- Attendance by date and school (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_attendance_date_school 
ON attendance(date, school_id, branch_id);

-- Student attendance history
CREATE INDEX IF NOT EXISTS idx_attendance_student 
ON attendance(student_id, date);

-- Attendance status filtering
CREATE INDEX IF NOT EXISTS idx_attendance_status 
ON attendance(status, date, school_id);

-- Staff attendance queries
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date 
ON staff_attendance(date, school_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff 
ON staff_attendance(staff_id, date);

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
-- EXAM/RESULTS QUERIES OPTIMIZATION
-- ============================================
-- Note: Only create if exam_results table exists

-- Exam results by class and term
-- CREATE INDEX IF NOT EXISTS idx_exam_results_class_term 
-- ON exam_results(class_name, term, academic_year, school_id);

-- Student results lookup
-- CREATE INDEX IF NOT EXISTS idx_exam_results_student 
-- ON exam_results(admission_no, term, academic_year);

-- Subject performance queries
-- CREATE INDEX IF NOT EXISTS idx_exam_results_subject 
-- ON exam_results(subject, class_name, term);

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

-- ============================================
-- JOURNAL ENTRIES OPTIMIZATION
-- ============================================

-- Journal entries by date
CREATE INDEX IF NOT EXISTS idx_journal_entries_date 
ON journal_entries(entry_date, school_id);

-- Journal entries by account
CREATE INDEX IF NOT EXISTS idx_journal_entries_account 
ON journal_entries(account_code, school_id);

-- ============================================
-- CHATBOT OPTIMIZATION
-- ============================================

-- Chatbot conversations lookup
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user 
ON chatbot_conversations(user_id, created_at);

-- Chatbot conversations by session
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session 
ON chatbot_conversations(session_id, created_at);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check existing indexes
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as COLUMNS,
    INDEX_TYPE,
    NON_UNIQUE
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN (
        'payment_entries', 'attendance', 'staff_attendance',
        'payroll_lines', 'payroll_periods', 'students',
        'teachers', 'journal_entries',
        'chatbot_conversations'
    )
GROUP BY TABLE_NAME, INDEX_NAME
ORDER BY TABLE_NAME, INDEX_NAME;

-- Check index usage (run after a few days)
SELECT 
    object_schema,
    object_name,
    index_name,
    count_star as total_queries,
    count_read as read_queries,
    count_write as write_queries
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE object_schema = DATABASE()
ORDER BY count_star DESC
LIMIT 50;

-- ============================================
-- NOTES
-- ============================================
-- Run this script on your MySQL database
-- Indexes are created with IF NOT EXISTS to avoid errors
-- Monitor query performance before and after
-- Use EXPLAIN on slow queries to verify index usage
-- 
-- Expected improvements:
-- - Dashboard load: 5s → 2s
-- - Payment queries: 2s → 0.3s
-- - Attendance queries: 1.5s → 0.2s
-- - Student list: 3s → 0.5s
