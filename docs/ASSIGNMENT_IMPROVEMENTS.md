# Assignment System - Implementation Plan for Improvements

**Document Version:** 1.0  
**Date:** 2026-02-25  
**Current Rating:** 8.5/10  
**Target Rating:** 9.5/10

---

## 📚 Reference Documents

- **[Bulk Grading UI/UX Mockup](./BULK_GRADING_MOCKUP.md)** - Detailed visual design and interaction patterns for bulk grading view

---

## 🎯 Priority 1: Critical Enhancements (4-6 weeks)

### 1.1 Student Draft Save Feature
**Problem:** Students must complete assignments in one session  
**Impact:** High - Reduces student stress, prevents data loss  
**Effort:** Medium (2 weeks)

#### Implementation Steps:

**Backend Changes:**
1. Update `assignment_responses` table:
   ```sql
   ALTER TABLE assignment_responses 
   ADD COLUMN is_draft TINYINT(1) DEFAULT 1,
   ADD COLUMN last_saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
   ```

2. Modify `assignmentResponses` stored procedure:
   - Add `in_is_draft` parameter
   - Allow updates when `is_draft = 1`
   - Set `is_draft = 0` on final submission

3. Add new endpoint: `POST /assignment/save-draft`
   ```javascript
   // elscholar-api/src/controllers/assignments.js
   const saveDraft = async (req, res) => {
     const { assignment_id, admission_no, responses } = req.body;
     // Save with is_draft = 1
     // Return success with last_saved_at timestamp
   };
   ```

**Frontend Changes:**
1. Add auto-save functionality in `ViewAssignment.tsx`:
   ```typescript
   // Auto-save every 30 seconds
   useEffect(() => {
     const interval = setInterval(() => {
       if (hasUnsavedChanges) {
         saveDraft();
       }
     }, 30000);
     return () => clearInterval(interval);
   }, [hasUnsavedChanges]);
   ```

2. Add "Save Draft" button next to "Submit Assignment"
3. Show last saved timestamp: "Last saved: 2 minutes ago"
4. Add unsaved changes warning on page exit

**Testing Checklist:**
- [ ] Draft saves automatically every 30 seconds
- [ ] Manual "Save Draft" button works
- [ ] Draft loads when student returns
- [ ] Final submit clears draft flag
- [ ] Warning shows on page exit with unsaved changes

---

### 1.2 Bulk Grading View for Teachers
**Problem:** Teachers grade one student at a time  
**Impact:** High - Saves teacher time significantly  
**Effort:** Medium (2 weeks)

#### Implementation Steps:

**Backend Changes:**
1. Create new endpoint: `GET /assignments/bulk-responses`
   ```javascript
   // Returns all student responses for an assignment in table format
   // elscholar-api/src/controllers/assignments.js
   const getBulkResponses = async (req, res) => {
     const { assignment_id } = req.query;
     // Query: JOIN students, assignment_responses, assignment_questions
     // Return: Array of { student, question, response, score, is_correct }
   };
   ```

2. Create bulk update endpoint: `POST /assignments/bulk-grade`
   ```javascript
   const bulkGrade = async (req, res) => {
     const { grades } = req.body; // Array of { response_id, score, remark }
     // Update multiple responses in transaction
   };
   ```

**Frontend Changes:**
1. Create new component: `BulkGradingView.tsx`
   ```typescript
   // elscholar-ui/src/feature-module/academic/teacher/Assignment/BulkGradingView.tsx
   // Table with columns: Student Name | Q1 | Q2 | Q3 | ... | Total | Actions
   // Editable cells for scores
   // Bulk save button
   ```
   
   **📋 See detailed UI/UX design:** [BULK_GRADING_MOCKUP.md](./BULK_GRADING_MOCKUP.md)

2. Add toggle in `MarkAssignments.tsx`:
   - "Individual View" vs "Bulk View" tabs
   - Bulk view shows all students in spreadsheet format

3. Features:
   - Inline editing of scores
   - Color coding (correct/incorrect)
   - Quick filters (show only incorrect, show ungraded)
   - Export to Excel
   - Keyboard shortcuts (Tab, Enter, Ctrl+S)
   - Real-time total calculation

**Testing Checklist:**
- [ ] Bulk view loads all student responses
- [ ] Inline editing works for scores
- [ ] Bulk save updates all changes
- [ ] Filters work correctly
- [ ] Export to Excel works

---

### 1.3 Question Bank & Reusability
**Problem:** Teachers recreate same questions repeatedly  
**Impact:** High - Saves teacher time, ensures consistency  
**Effort:** High (3 weeks)

#### Implementation Steps:

**Database Schema:**
```sql
-- New table for question bank
CREATE TABLE question_bank (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  school_id VARCHAR(10) NOT NULL,
  subject VARCHAR(100),
  topic VARCHAR(255),
  question_text TEXT NOT NULL,
  question_type ENUM('Multiple Choice', 'True/False', 'Short Answer', 'Fill in the Blank', 'Essay'),
  options JSON,
  correct_answer TEXT,
  marks DECIMAL(5,2) DEFAULT 1.00,
  difficulty ENUM('Easy', 'Medium', 'Hard'),
  tags JSON,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_teacher_subject (teacher_id, subject),
  INDEX idx_topic (topic)
);

-- Link table for assignment questions
ALTER TABLE assignment_questions 
ADD COLUMN question_bank_id INT NULL,
ADD FOREIGN KEY (question_bank_id) REFERENCES question_bank(id);
```

**Backend Changes:**
1. Create CRUD endpoints for question bank:
   - `POST /question-bank` - Create question
   - `GET /question-bank` - List questions (with filters)
   - `PUT /question-bank/:id` - Update question
   - `DELETE /question-bank/:id` - Delete question

2. Modify assignment creation to support:
   - Adding questions from bank
   - Creating new questions (with option to save to bank)

**Frontend Changes:**
1. Create `QuestionBankModal.tsx`:
   - Search/filter questions by subject, topic, difficulty
   - Preview question before adding
   - Multi-select to add multiple questions

2. Update `CreateAssignment.tsx`:
   - "Add from Question Bank" button
   - "Save to Question Bank" checkbox when creating new questions
   - Show question source (bank vs custom)

**Testing Checklist:**
- [ ] Questions save to bank correctly
- [ ] Search/filter works in question bank
- [ ] Questions can be added from bank to assignment
- [ ] Usage count increments
- [ ] Editing bank question doesn't affect existing assignments

---

## 🔔 Priority 2: Notifications System (3-4 weeks)

### 2.1 Student Notifications

#### Notification Triggers:

**1. Assignment Published**
- **When:** Teacher changes status from Draft → Opened
- **Recipients:** All students in the class
- **Channels:** In-app + Email + SMS (optional)
- **Content:**
  ```
  Subject: New Assignment: [Assignment Title]
  
  Your teacher [Teacher Name] has published a new assignment.
  
  Subject: [Subject]
  Due Date: [Submission Date]
  Total Marks: [Marks]
  
  Click here to view: [Link]
  ```

**2. Deadline Reminder**
- **When:** 24 hours before deadline
- **Recipients:** Students who haven't submitted
- **Channels:** In-app + Email + SMS (optional)
- **Content:**
  ```
  Subject: Reminder: Assignment Due Tomorrow
  
  Assignment "[Title]" is due tomorrow at 11:59 PM.
  
  Progress: [X/Y] questions answered
  
  Complete now: [Link]
  ```

**3. Assignment Graded**
- **When:** Teacher changes status to Released
- **Recipients:** All students who submitted
- **Channels:** In-app + Email
- **Content:**
  ```
  Subject: Your Assignment Has Been Graded
  
  Your assignment "[Title]" has been graded.
  
  Your Score: [Score]/[Total Marks] ([Percentage]%)
  
  View results: [Link]
  ```

**4. Assignment Closing Soon**
- **When:** 1 hour before deadline
- **Recipients:** Students with incomplete submissions
- **Channels:** In-app + Push notification
- **Content:**
  ```
  ⏰ Last chance! Assignment "[Title]" closes in 1 hour.
  Progress: [X/Y] questions answered
  ```

---

### 2.2 Teacher Notifications

#### Notification Triggers:

**1. Student Submits Assignment**
- **When:** Student completes all questions and submits
- **Recipients:** Assignment creator (teacher)
- **Channels:** In-app + Email (digest option)
- **Content:**
  ```
  Subject: New Submission: [Student Name]
  
  [Student Name] has submitted "[Assignment Title]"
  
  Submitted: [X/Y] students
  Pending: [Y-X] students
  
  Grade now: [Link]
  ```

**2. Submission Deadline Passed**
- **When:** Submission date + 1 day
- **Recipients:** Assignment creator
- **Channels:** In-app + Email
- **Content:**
  ```
  Subject: Assignment Deadline Passed
  
  "[Assignment Title]" deadline has passed.
  
  Submitted: [X/Y] students ([Percentage]%)
  Not Submitted: [List of students]
  
  Close assignment: [Link]
  ```

**3. All Students Submitted**
- **When:** Last student in class submits
- **Recipients:** Assignment creator
- **Channels:** In-app
- **Content:**
  ```
  🎉 All students have submitted "[Assignment Title]"
  
  Ready to grade: [Y] submissions
  
  Start grading: [Link]
  ```

**4. Low Submission Rate Alert**
- **When:** 6 hours before deadline, <50% submitted
- **Recipients:** Assignment creator
- **Channels:** In-app + Email
- **Content:**
  ```
  ⚠️ Low submission rate for "[Assignment Title]"
  
  Only [X/Y] students ([Percentage]%) have submitted.
  Deadline: [Time remaining]
  
  Consider extending deadline or sending reminder.
  ```

---

## 📊 Implementation: Notifications System

### Backend Implementation (Week 1-2)

**Step 1: Database Schema**
```sql
CREATE TABLE assignment_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  user_type ENUM('Student', 'Teacher'),
  notification_type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  is_read TINYINT(1) DEFAULT 0,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id, is_read)
);
```

**Step 2: Notification Service**
```javascript
// elscholar-api/src/services/assignmentNotificationService.js
const sendNotification = async ({ 
  assignment_id, 
  recipients, 
  type, 
  title, 
  message 
}) => {
  // Insert into assignment_notifications
  // Send email via emailService
  // Send SMS if enabled
};

module.exports = {
  notifyAssignmentPublished,
  notifyDeadlineReminder,
  notifyAssignmentGraded,
  notifyStudentSubmitted
};
```

**Step 3: Trigger Points**
Add notification calls in `assignments.js`:
- Line ~250: After status update to "Opened"
- Line ~450: After student submission
- Line ~300: After status update to "Released"

**Step 4: Scheduled Jobs**
```javascript
// elscholar-api/src/jobs/assignmentReminders.js
// Run every hour
// Check assignments due in 24 hours
// Send reminders to students who haven't submitted
```

---

### Frontend Implementation (Week 3)

**Step 1: Notification Bell Icon**
Add to header: Show unread count, dropdown with recent notifications

**Step 2: Notification Preferences**
Add to student/teacher settings:
- Email notifications ON/OFF
- SMS notifications ON/OFF
- Reminder frequency

**Step 3: In-App Notifications**
Toast messages when:
- Assignment published
- Submission successful
- Grading complete

---

## 📈 Priority 3: Analytics & Reporting (2-3 weeks)

### 3.1 Question-Level Analytics
- Which questions have lowest correct rate?
- Average time per question
- Most common wrong answers

### 3.2 Class Performance
- Class average vs individual score
- Performance trends over time
- Subject-wise performance

### 3.3 Export Features
- Export grades to Excel/CSV
- PDF report cards
- Performance charts

---

## 🔧 Priority 4: Quality of Life Improvements (1-2 weeks)

### 4.1 Assignment Templates
- Save assignment as template
- Reuse template for new classes
- Share templates with other teachers

### 4.2 Assignment Duplication
- Duplicate existing assignment
- Modify and republish

### 4.3 Partial Credit
- Allow 0.5 marks for partially correct answers
- Custom scoring rules per question

### 4.4 Rich Text Editor
- Format questions with bold, italic, lists
- Insert images in questions
- Math equation support

---

## 📅 Implementation Timeline

**Month 1:**
- Week 1-2: Draft save feature
- Week 3-4: Bulk grading view

**Month 2:**
- Week 1-2: Notifications backend
- Week 3: Notifications frontend
- Week 4: Testing & bug fixes

**Month 3:**
- Week 1-2: Question bank
- Week 3-4: Analytics dashboard

**Month 4:**
- Week 1-2: Quality of life improvements
- Week 3-4: Testing, documentation, training

---

## 🎯 Success Metrics

**Student Satisfaction:**
- Reduce "lost work" complaints by 90% (draft save)
- Increase on-time submissions by 20% (reminders)

**Teacher Efficiency:**
- Reduce grading time by 50% (bulk grading)
- Reduce question creation time by 40% (question bank)

**System Usage:**
- 80% of teachers use question bank within 3 months
- 95% notification delivery rate
- <2 second page load time

---

## 📝 Documentation Requirements

1. **User Guides:**
   - Student: How to save drafts, view notifications
   - Teacher: How to use bulk grading, question bank

2. **API Documentation:**
   - New endpoints for notifications
   - Question bank API

3. **Training Videos:**
   - 5-minute walkthrough for teachers
   - 3-minute walkthrough for students

---

**End of Implementation Plan**
