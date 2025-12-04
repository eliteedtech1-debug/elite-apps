# CA/Exam Process System - Complete Implementation Plan

## Project Overview
Enhance existing Examinations module to support complete School CA/Exam Process with question submission, moderation, and printing workflows.

---

## PHASE 1: DATABASE & MODELS (Priority: HIGH)

### 1.1 Database Tables (Already Created)
- ✅ `ca_exam_submissions` - Stores teacher question submissions
- ✅ `ca_exam_moderation_logs` - Tracks moderation actions
- ⚠️ `ca_setup` - Already exists (verify structure matches requirements)

### 1.2 Additional Models Needed
**File**: `elscholar-api/src/models/ca_exam_notifications.js`
```javascript
// Fields: id, user_id, ca_type, message, deadline, is_read, sent_at, school_id, branch_id
```

### 1.3 Model Associations
**File**: `elscholar-api/src/models/index.js` (Update associations section)
```javascript
// CAExamSubmission belongsTo User (teacher)
// CAExamSubmission belongsTo Subject
// CAExamSubmission belongsTo Class
// CAExamModerationLog belongsTo CAExamSubmission
// CAExamModerationLog belongsTo User (moderator)
```

---

## PHASE 2: BACKEND UTILITIES (Priority: HIGH)

### 2.1 Date Calculation Utilities
**File**: `elscholar-api/src/utils/caExamDateUtils.js`
```javascript
// Functions needed:
computeScheduledDate(academicYearStart, weekNumber)
  // Input: '2024-09-01', 5
  // Output: Date 5 weeks from start

computeDeadlineDate(scheduledDate, caType)
  // CA1/CA2/CA3: 2-3 weeks before scheduled
  // EXAM: 4 weeks before scheduled
  // Return: deadline date

validateWeekNumber(weekNumber, academicYearStart, academicYearEnd)
  // Check if week falls within academic year

checkOverlappingSchedules(caSetups, newWeekNumber)
  // Prevent scheduling conflicts
```

### 2.2 Notification Service
**File**: `elscholar-api/src/services/caExamNotificationService.js`
```javascript
// Functions:
sendTeacherNotifications(caSetup)
  // Query teachers by subject/class
  // Create notification records
  // Send email/SMS if configured

scheduleUpcomingNotifications()
  // Cron job to check upcoming deadlines
  // Send alerts 2-3 weeks before

markNotificationAsRead(notificationId, userId)
```

### 2.3 PDF Generation Service
**File**: `elscholar-api/src/services/questionPaperPDFService.js`
```javascript
// Functions:
generateQuestionPaperPDF(submissionId)
  // Fetch submission details
  // Get school letterhead from school_setup
  // Format: Header, Title, Class/Subject, Questions, Footer
  // Return: PDF buffer

generateBulkPapers(submissionIds)
  // Generate multiple papers in one PDF
```

---

## PHASE 3: BACKEND CONTROLLERS (Priority: HIGH)

### 3.1 CA Setup Controller
**File**: `elscholar-api/src/controllers/caSetupController.js`
```javascript
// Endpoints:
GET    /api/ca-setup                    // List all CA setups
POST   /api/ca-setup                    // Create new CA setup
PUT    /api/ca-setup/:id                // Update CA setup
DELETE /api/ca-setup/:id                // Delete CA setup
GET    /api/ca-setup/validate           // Validate week numbers
POST   /api/ca-setup/:id/activate       // Activate/deactivate
GET    /api/ca-setup/upcoming           // Get upcoming CAs for notifications
```

### 3.2 Submission Controller
**File**: `elscholar-api/src/controllers/caExamSubmissionController.js`
```javascript
// Endpoints:
GET    /api/ca-submissions              // List submissions (filtered by teacher/admin)
POST   /api/ca-submissions              // Create submission (with file upload)
PUT    /api/ca-submissions/:id          // Update submission
DELETE /api/ca-submissions/:id          // Delete draft submission
POST   /api/ca-submissions/:id/submit   // Change status to 'Submitted'
GET    /api/ca-submissions/:id          // Get single submission
GET    /api/ca-submissions/my           // Teacher's own submissions
POST   /api/ca-submissions/:id/upload   // Upload/replace question file

// Validation rules:
- Check deadline not passed
- Prevent duplicate submissions (same teacher, subject, class, ca_type, term)
- Validate file type (PDF/DOC/DOCX)
- Max file size: 10MB
```

### 3.3 Moderation Controller
**File**: `elscholar-api/src/controllers/caExamModerationController.js`
```javascript
// Endpoints:
GET    /api/ca-moderation/pending       // Get submissions pending moderation
POST   /api/ca-moderation/:id/approve   // Approve submission
POST   /api/ca-moderation/:id/reject    // Reject submission
POST   /api/ca-moderation/:id/request-modification  // Request changes
POST   /api/ca-moderation/:id/replace-file          // Replace question file
GET    /api/ca-moderation/logs/:id      // Get moderation history
GET    /api/ca-moderation/stats         // Moderation statistics

// Each action creates entry in ca_exam_moderation_logs
```

### 3.4 Print Controller
**File**: `elscholar-api/src/controllers/caExamPrintController.js`
```javascript
// Endpoints:
GET    /api/ca-print/approved           // List approved submissions for printing
POST   /api/ca-print/generate/:id      // Generate PDF for single submission
POST   /api/ca-print/generate-bulk     // Generate PDFs for multiple submissions
GET    /api/ca-print/download/:id      // Download generated PDF
```

### 3.5 Progress Controller
**File**: `elscholar-api/src/controllers/caExamProgressController.js`
```javascript
// Endpoints:
GET    /api/ca-progress/overview        // Overall progress stats
GET    /api/ca-progress/by-subject      // Progress by subject
GET    /api/ca-progress/by-teacher      // Progress by teacher
GET    /api/ca-progress/by-class        // Progress by class
GET    /api/ca-progress/deadlines       // Upcoming deadlines
```

---

## PHASE 4: BACKEND ROUTES (Priority: HIGH)

### 4.1 Route Files
**File**: `elscholar-api/src/routes/ca_exam_routes.js`
```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/ca-questions/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOC files allowed.'));
    }
  }
});

// CA Setup routes (Admin/Exam Officer only)
router.get('/ca-setup', authenticateToken, checkPermission(['admin', 'branchadmin']), caSetupController.list);
router.post('/ca-setup', authenticateToken, checkPermission(['admin', 'branchadmin']), caSetupController.create);
// ... more routes

// Submission routes (Teachers)
router.get('/ca-submissions/my', authenticateToken, checkPermission(['teacher']), submissionController.getMySubmissions);
router.post('/ca-submissions', authenticateToken, upload.single('questionFile'), submissionController.create);
// ... more routes

// Moderation routes (Admin/Exam Officer/Moderation Committee)
router.get('/ca-moderation/pending', authenticateToken, checkPermission(['admin', 'branchadmin']), moderationController.getPending);
// ... more routes

// Print routes
router.get('/ca-print/approved', authenticateToken, printController.getApproved);
// ... more routes

// Progress routes
router.get('/ca-progress/overview', authenticateToken, progressController.getOverview);
// ... more routes

module.exports = router;
```

**File**: `elscholar-api/src/index.js` (Add route registration)
```javascript
const caExamRoutes = require('./routes/ca_exam_routes');
app.use('/api', caExamRoutes);
```

---

## PHASE 5: FRONTEND COMPONENTS (Priority: HIGH)

### 5.1 CA Setup Page (Admin)
**File**: `elscholar-ui/src/feature-module/academic/examinations/ca-setup/CASetupPage.tsx`
```typescript
// Components needed:
- CASetupList (table with CRUD actions)
- CASetupForm (modal for create/edit)
- WeekNumberPicker (with validation)
- SchedulePreview (shows calculated dates)

// Features:
- List all CA setups with filters
- Add/Edit/Delete CA setup
- Activate/Deactivate toggle
- Validation warnings for overlaps
- Preview scheduled dates based on week numbers
```

**File**: `elscholar-ui/src/feature-module/academic/examinations/ca-setup/CASetupForm.tsx`
```typescript
// Form fields:
- ca_type: Select (CA1, CA2, CA3, EXAM)
- week_number: Number input (1-52)
- max_score: Number input
- overall_contribution_percent: Number input (0-100)
- section: Select (from classes)
- is_active: Toggle

// Validations:
- Total contribution % across all CAs + EXAM = 100%
- Week number within academic year
- No overlapping weeks
```

### 5.2 Question Submission Page (Teacher)
**File**: `elscholar-ui/src/feature-module/academic/examinations/submit-questions/SubmitQuestionsPage.tsx`
```typescript
// Components:
- MySubmissionsList (teacher's submissions)
- SubmissionForm (create/edit submission)
- FileUploader (drag-drop for PDF/DOC)
- DeadlineAlert (shows remaining time)
- SubmissionStatus (Draft/Submitted/etc badges)

// Features:
- View my submissions filtered by term/year
- Create new submission
- Upload question file
- Save as draft or submit
- Edit draft submissions
- View submission status
- Deadline countdown
- Prevent submission after deadline
```

**File**: `elscholar-ui/src/feature-module/academic/examinations/submit-questions/SubmissionForm.tsx`
```typescript
// Form fields:
- subject_id: Select (teacher's subjects)
- class_id: Select (teacher's classes)
- ca_type: Select (CA1/CA2/CA3/EXAM)
- question_file: File upload
- comments: Textarea

// Actions:
- Save as Draft
- Submit for Moderation
- Cancel

// Validations:
- All fields required for submission
- File required
- Check deadline
- Prevent duplicate
```

### 5.3 Moderation Dashboard (Admin/Moderator)
**File**: `elscholar-ui/src/feature-module/academic/examinations/ModerationDashboard.tsx`
```typescript
// Replace placeholder with:

// Components:
- ModerationStats (cards showing pending/approved/rejected counts)
- SubmissionsList (filterable table)
- ModerationModal (approve/reject/request modification)
- FileViewer (preview PDF/DOC)
- ModerationHistory (logs timeline)

// Features:
- View all submissions with filters (status, ca_type, subject, class)
- Preview question files
- Approve submission
- Reject with reason
- Request modification with comments
- Replace question file
- View moderation history
- Bulk actions
```

**File**: `elscholar-ui/src/feature-module/academic/examinations/moderation/ModerationModal.tsx`
```typescript
// Modal with tabs:
- Preview (show question file)
- Details (submission info)
- History (moderation logs)
- Actions (approve/reject/modify buttons)

// Action forms:
- Approve: Confirmation only
- Reject: Reason required
- Request Modification: Comments required
- Replace File: File upload
```

### 5.4 Print Questions Page
**File**: `elscholar-ui/src/feature-module/academic/examinations/PrintQuestions.tsx`
```typescript
// Replace placeholder with:

// Components:
- ApprovedSubmissionsList (filterable)
- PrintPreview (PDF viewer)
- BulkPrintSelector (checkboxes)
- PrintSettings (layout options)

// Features:
- List approved submissions ready for print
- Filter by ca_type, subject, class, term
- Select single or multiple for printing
- Preview generated PDF
- Download PDF
- Print directly
- Bulk download as ZIP
```

**File**: `elscholar-ui/src/feature-module/academic/examinations/print/QuestionPaperPDF.tsx`
```typescript
// PDF Layout (using @react-pdf/renderer):
- Header: School letterhead, logo
- Title: CA/EXAM type, Subject, Class
- Meta: Term, Session, Date, Duration
- Instructions section
- Questions section (from uploaded file content)
- Footer: School short_name, page numbers

// Styling:
- Professional exam paper format
- Clear section breaks
- Adequate spacing for answers
```

### 5.5 Progress Tracking Page
**File**: `elscholar-ui/src/feature-module/academic/examinations/ProgressTracking.tsx`
```typescript
// Replace placeholder with:

// Components:
- ProgressOverview (summary cards)
- ProgressBySubject (table/chart)
- ProgressByTeacher (table/chart)
- ProgressByClass (table/chart)
- DeadlineCalendar (upcoming deadlines)
- CompletionChart (visual progress)

// Metrics:
- Total submissions expected
- Submissions received
- Pending moderation
- Approved
- Rejected
- Completion percentage
- Teachers not submitted
- Upcoming deadlines

// Filters:
- Academic year
- Term
- CA type
- Subject
- Class
- Status
```

---

## PHASE 6: FRONTEND SERVICES (Priority: MEDIUM)

### 6.1 API Service
**File**: `elscholar-ui/src/services/caExamService.ts`
```typescript
// API calls for all endpoints:
export const caExamService = {
  // CA Setup
  getCASetups: (params) => axios.get('/api/ca-setup', { params }),
  createCASetup: (data) => axios.post('/api/ca-setup', data),
  updateCASetup: (id, data) => axios.put(`/api/ca-setup/${id}`, data),
  deleteCASetup: (id) => axios.delete(`/api/ca-setup/${id}`),
  
  // Submissions
  getMySubmissions: (params) => axios.get('/api/ca-submissions/my', { params }),
  createSubmission: (data) => axios.post('/api/ca-submissions', data),
  submitForModeration: (id) => axios.post(`/api/ca-submissions/${id}/submit`),
  uploadQuestionFile: (id, file) => {
    const formData = new FormData();
    formData.append('questionFile', file);
    return axios.post(`/api/ca-submissions/${id}/upload`, formData);
  },
  
  // Moderation
  getPendingSubmissions: (params) => axios.get('/api/ca-moderation/pending', { params }),
  approveSubmission: (id, data) => axios.post(`/api/ca-moderation/${id}/approve`, data),
  rejectSubmission: (id, data) => axios.post(`/api/ca-moderation/${id}/reject`, data),
  
  // Print
  getApprovedForPrint: (params) => axios.get('/api/ca-print/approved', { params }),
  generatePDF: (id) => axios.post(`/api/ca-print/generate/${id}`),
  downloadPDF: (id) => axios.get(`/api/ca-print/download/${id}`, { responseType: 'blob' }),
  
  // Progress
  getProgressOverview: (params) => axios.get('/api/ca-progress/overview', { params }),
  getProgressBySubject: (params) => axios.get('/api/ca-progress/by-subject', { params }),
};
```

---

## PHASE 7: NOTIFICATION INTEGRATION (Priority: MEDIUM)

### 7.1 Notification Scheduler
**File**: `elscholar-api/src/jobs/caExamNotificationJob.js`
```javascript
// Cron job (runs daily):
const cron = require('node-cron');

cron.schedule('0 8 * * *', async () => {
  // Check ca_setup for upcoming CAs (2-3 weeks away)
  // Query teachers who haven't submitted
  // Create notification records
  // Send emails/SMS
  // Log notification sent
});
```

### 7.2 Frontend Notification Display
**File**: `elscholar-ui/src/components/notifications/CAExamNotifications.tsx`
```typescript
// Show in notification center:
- Upcoming CA/Exam deadlines
- Submission status updates
- Moderation results
- Urgent alerts for missed deadlines
```

---

## PHASE 8: PERMISSIONS & RBAC (Priority: HIGH)

### 8.1 Permission Definitions
**File**: `elscholar-api/src/middleware/permissions.js` (Update)
```javascript
const CA_EXAM_PERMISSIONS = {
  'CA_SETUP_MANAGE': ['admin', 'branchadmin'],
  'CA_SUBMIT': ['teacher'],
  'CA_MODERATE': ['admin', 'branchadmin', 'moderator'],
  'CA_PRINT': ['admin', 'branchadmin', 'teacher'],
  'CA_PROGRESS_VIEW': ['admin', 'branchadmin', 'principal']
};
```

### 8.2 Frontend Route Guards
**File**: `elscholar-ui/src/feature-module/router/optimized-router.tsx` (Update routes)
```typescript
{
  path: all_routes.caSetup,
  component: CASetupPage,
  requiredRoles: ['admin', 'branchadmin'],
},
{
  path: all_routes.submitQuestions,
  component: SubmitQuestionsPage,
  requiredRoles: ['teacher'],
},
{
  path: all_routes.moderationDashboard,
  component: ModerationDashboard,
  requiredRoles: ['admin', 'branchadmin', 'moderator'],
},
// etc.
```

---

## PHASE 9: VALIDATION & BUSINESS RULES (Priority: HIGH)

### 9.1 Backend Validation Middleware
**File**: `elscholar-api/src/middleware/caExamValidation.js`
```javascript
// Validation functions:
validateSubmissionDeadline(req, res, next)
  // Check if current date < deadline
  // Allow admin override with reason

preventDuplicateSubmission(req, res, next)
  // Check existing submission for same teacher/subject/class/ca_type/term

validateCASetupPercentages(req, res, next)
  // Ensure total contribution = 100%

validateWeekNumber(req, res, next)
  // Check week within academic year
  // Check no overlaps
```

### 9.2 Frontend Validation
**File**: `elscholar-ui/src/utils/caExamValidation.ts`
```typescript
// Client-side validation:
export const validateSubmissionForm = (data) => {
  // Check all required fields
  // Validate file type and size
  // Check deadline
  // Return errors object
};

export const validateCASetupForm = (data, existingSetups) => {
  // Check percentages sum to 100
  // Check week number valid
  // Check no overlaps
  // Return errors object
};
```

---

## PHASE 10: CBT PLACEHOLDER (Priority: LOW)

### 10.1 Backend CBT Endpoints (Placeholder)
**File**: `elscholar-api/src/controllers/cbtController.js`
```javascript
// Placeholder endpoints:
POST   /api/cbt/initiate/:submissionId    // Convert to CBT format
GET    /api/cbt/status/:submissionId      // Check CBT readiness
GET    /api/cbt/preview/:submissionId     // Preview CBT version

// All return: { message: 'CBT feature coming soon', cbt_enabled: false }
```

### 10.2 Frontend CBT Button
**File**: `elscholar-ui/src/feature-module/academic/examinations/print/CBTButton.tsx`
```typescript
// Show button only if school_setup.cbt_enabled = 1
// On click: Show "Coming Soon" modal
// Placeholder for future CBT integration
```

---

## PHASE 11: TESTING CHECKLIST

### 11.1 Backend Tests
- [ ] CA Setup CRUD operations
- [ ] Submission creation with file upload
- [ ] Deadline enforcement
- [ ] Duplicate prevention
- [ ] Moderation workflow (approve/reject/modify)
- [ ] PDF generation
- [ ] Notification scheduling
- [ ] Permission checks

### 11.2 Frontend Tests
- [ ] CA Setup form validation
- [ ] Submission form with file upload
- [ ] Deadline warnings
- [ ] Moderation actions
- [ ] PDF preview and download
- [ ] Progress charts and stats
- [ ] Role-based UI visibility

### 11.3 Integration Tests
- [ ] End-to-end submission workflow
- [ ] Moderation to print workflow
- [ ] Notification delivery
- [ ] File upload and retrieval
- [ ] Multi-user scenarios

---

## IMPLEMENTATION ORDER (Recommended)

### Week 1: Foundation
1. Database tables and models ✅
2. Backend utilities (date calculations)
3. Basic CRUD controllers
4. Route setup with authentication

### Week 2: Core Features
5. Submission controller with file upload
6. Frontend submission page
7. Moderation controller
8. Frontend moderation dashboard

### Week 3: Advanced Features
9. PDF generation service
10. Print page with preview
11. Progress tracking backend
12. Progress tracking frontend

### Week 4: Polish & Integration
13. Notification system
14. CA Setup page
15. Validation and error handling
16. Testing and bug fixes

---

## FILE STRUCTURE SUMMARY

### Backend Files to Create/Modify:
```
elscholar-api/
├── src/
│   ├── models/
│   │   ├── ca_exam_submissions.js ✅
│   │   ├── ca_exam_moderation_logs.js ✅
│   │   └── ca_exam_notifications.js
│   ├── controllers/
│   │   ├── caSetupController.js
│   │   ├── caExamSubmissionController.js
│   │   ├── caExamModerationController.js
│   │   ├── caExamPrintController.js
│   │   ├── caExamProgressController.js
│   │   └── cbtController.js (placeholder)
│   ├── routes/
│   │   └── ca_exam_routes.js
│   ├── services/
│   │   ├── caExamNotificationService.js
│   │   └── questionPaperPDFService.js
│   ├── utils/
│   │   └── caExamDateUtils.js
│   ├── middleware/
│   │   └── caExamValidation.js
│   └── jobs/
│       └── caExamNotificationJob.js
└── database_migrations/
    └── create_ca_exam_tables.sql ✅
```

### Frontend Files to Create/Modify:
```
elscholar-ui/
└── src/
    └── feature-module/
        └── academic/
            └── examinations/
                ├── ca-setup/
                │   ├── CASetupPage.tsx
                │   ├── CASetupForm.tsx
                │   └── CASetupList.tsx
                ├── submit-questions/
                │   ├── SubmitQuestionsPage.tsx
                │   ├── SubmissionForm.tsx
                │   ├── MySubmissionsList.tsx
                │   └── FileUploader.tsx
                ├── moderation/
                │   ├── ModerationDashboard.tsx (replace placeholder)
                │   ├── ModerationModal.tsx
                │   ├── SubmissionsList.tsx
                │   └── ModerationHistory.tsx
                ├── print/
                │   ├── PrintQuestions.tsx (replace placeholder)
                │   ├── QuestionPaperPDF.tsx
                │   ├── PrintPreview.tsx
                │   └── CBTButton.tsx
                ├── progress/
                │   ├── ProgressTracking.tsx (replace placeholder)
                │   ├── ProgressOverview.tsx
                │   ├── ProgressCharts.tsx
                │   └── DeadlineCalendar.tsx
                ├── ModerationDashboard.tsx ✅ (placeholder)
                ├── PrintQuestions.tsx ✅ (placeholder)
                └── ProgressTracking.tsx ✅ (placeholder)
```

---

## ENVIRONMENT VARIABLES NEEDED

Add to `.env`:
```
# CA/Exam Configuration
CA_QUESTION_UPLOAD_PATH=uploads/ca-questions/
CA_QUESTION_MAX_SIZE=10485760
CA_NOTIFICATION_ADVANCE_DAYS=14
CA_EXAM_NOTIFICATION_ADVANCE_DAYS=28

# PDF Generation
PDF_TEMPLATE_PATH=templates/question-paper/
PDF_OUTPUT_PATH=generated/question-papers/
```

---

## API ENDPOINT SUMMARY

### CA Setup (Admin)
- GET    /api/ca-setup
- POST   /api/ca-setup
- PUT    /api/ca-setup/:id
- DELETE /api/ca-setup/:id
- POST   /api/ca-setup/:id/activate

### Submissions (Teacher)
- GET    /api/ca-submissions/my
- POST   /api/ca-submissions
- PUT    /api/ca-submissions/:id
- DELETE /api/ca-submissions/:id
- POST   /api/ca-submissions/:id/submit
- POST   /api/ca-submissions/:id/upload

### Moderation (Admin/Moderator)
- GET    /api/ca-moderation/pending
- POST   /api/ca-moderation/:id/approve
- POST   /api/ca-moderation/:id/reject
- POST   /api/ca-moderation/:id/request-modification
- POST   /api/ca-moderation/:id/replace-file
- GET    /api/ca-moderation/logs/:id

### Print (Admin/Teacher)
- GET    /api/ca-print/approved
- POST   /api/ca-print/generate/:id
- POST   /api/ca-print/generate-bulk
- GET    /api/ca-print/download/:id

### Progress (Admin/Principal)
- GET    /api/ca-progress/overview
- GET    /api/ca-progress/by-subject
- GET    /api/ca-progress/by-teacher
- GET    /api/ca-progress/by-class

### CBT (Placeholder)
- POST   /api/cbt/initiate/:submissionId
- GET    /api/cbt/status/:submissionId

---

## NOTES FOR AI IMPLEMENTATION

1. **File Upload**: Use `multer` middleware for handling question file uploads
2. **PDF Generation**: Use `pdfkit` or `puppeteer` for server-side PDF generation
3. **Date Calculations**: Use `moment.js` or `date-fns` for date manipulations
4. **Notifications**: Integrate with existing notification system if available
5. **Permissions**: Use existing RBAC middleware, extend with CA-specific permissions
6. **Validation**: Implement both client-side and server-side validation
7. **Error Handling**: Use consistent error response format
8. **Logging**: Log all moderation actions for audit trail
9. **File Storage**: Consider cloud storage (S3/Cloudinary) for production
10. **Caching**: Cache CA setup data to reduce database queries

---

## SUCCESS CRITERIA

- [ ] Admin can configure CA1, CA2, CA3, EXAM with week numbers
- [ ] System calculates and displays scheduled dates
- [ ] Teachers receive notifications 2-3 weeks before deadline
- [ ] Teachers can submit questions with file upload
- [ ] System enforces deadlines (CA: 2-3 weeks, EXAM: 4 weeks)
- [ ] Duplicate submissions prevented
- [ ] Moderators can approve/reject/request modifications
- [ ] All moderation actions logged
- [ ] Approved questions can be printed as formatted PDFs
- [ ] Progress tracking shows completion rates
- [ ] Role-based access enforced throughout
- [ ] CBT placeholder ready for future implementation

---

## ESTIMATED EFFORT

- Backend Development: 24-32 hours
- Frontend Development: 32-40 hours
- Testing & Bug Fixes: 8-12 hours
- Documentation: 4-6 hours
- **Total: 68-90 hours** (2-3 weeks for 1 developer)

---

END OF IMPLEMENTATION PLAN
