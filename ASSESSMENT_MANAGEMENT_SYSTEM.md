# 🎓 Assessment Management System - Complete Documentation

## Overview

The Assessment Management System is a comprehensive workflow management tool for handling the complete lifecycle of assessments from draft to release. It replaces the simple "Release Assessment" modal with a robust multi-stage workflow system.

---

## 📋 Assessment Workflow Stages

### Status Enum: `weekly_scores.status`

```typescript
'Draft'        // Teachers entering scores
'Submitted'    // Ready for admin review
'UnderReview'  // Being verified by admin
'Approved'     // Verified and ready to release
'Released'     // Visible to students and parents
'Archived'     // Archived for historical reference
'Cancelled'    // Cancelled assessment
```

---

## 🎯 Features

### 1. **Three-Tab Interface**

#### **Overview Tab**
- Assessment lifecycle timeline
- Current status badge
- Overall statistics:
  - Total classes
  - Ready for release
  - Already released
  - Locked classes

#### **Classes Tab**
- Class-by-class submission progress
- Progress bars with color coding:
  - 🟢 100% = Green (Success)
  - 🔵 80-99% = Blue (Info)
  - 🟡 50-79% = Yellow (Warning)
  - 🔴 <50% = Red (Danger)
- Checkbox selection (individual + select all)
- Visual indicators:
  - 🔒 Locked icon
  - ✅ Released badge
  - ⏰ Deadline warning (≤3 days)
- Form teacher information
- Student/score statistics

#### **Actions Tab**
- Context-aware available actions based on current status
- Conditional forms for:
  - Send Reminder
  - Send Notification
  - Set Deadline
- Action buttons with icons and colors

### 2. **Workflow Actions**

#### **From Draft Status:**
- ✅ Submit for Review
- 🔒 Lock Scores
- 🔔 Send Reminder
- 📅 Set Deadline

#### **From Submitted Status:**
- ✅ Approve
- 👁️ Put Under Review
- 📄 Return to Draft
- 🔔 Notify Teachers

#### **From Under Review:**
- ✅ Approve
- 📄 Return to Draft
- 🔔 Notify Teachers

#### **From Approved:**
- ✅ Release to Parents/Students
- 👁️ Return to Review

#### **From Released:**
- 📦 Archive
- ❌ Un-release

### 3. **Notification System**

**Reminder Types:**
- Submission Deadline Warning
- Correction Needed
- Incomplete Submission
- General Reminder

**Features:**
- Sends to form teachers of selected classes
- Custom message textarea
- Reminder type selection
- Email integration ready (TODO)

### 4. **Deadline Management**

**Features:**
- Date & time picker
- Visual countdown warnings
- Automatic calculation of days remaining
- Warning badges for deadlines ≤3 days

### 5. **Lock/Unlock Mechanism**

**Lock Features:**
- Prevents teacher score editing
- Timestamps (locked_at, locked_by)
- Visual lock icon indicators

**Unlock Features:**
- Re-enables editing
- Timestamps (unlocked_at, unlocked_by)
- Audit trail

---

## 🔌 Backend API Endpoints

### **1. Release Assessment**
```
POST /ca-setups/release
```
**Payload:**
```json
{
  "ca_type": "EXAM",
  "academic_year": "2024/2026",
  "term": "Second Term",
  "class_codes": ["CLS0001", "CLS0002"],
  "section": "NURSERY"
}
```

### **2. Lock Assessment**
```
POST /ca-setups/lock
```
**Updates:** `is_locked = 1`, `locked_at`, `locked_by`

### **3. Unlock Assessment**
```
POST /ca-setups/unlock
```
**Updates:** `is_locked = 0`, `unlocked_at`, `unlocked_by`

### **4. Change Status**
```
POST /ca-setups/change-status
```
**Payload:**
```json
{
  "ca_type": "EXAM",
  "academic_year": "2024/2026",
  "term": "Second Term",
  "class_codes": ["CLS0001"],
  "new_status": "Submitted"
}
```
**Valid Statuses:** Draft, Submitted, Released, Approved, Archived, UnderReview, Cancelled

### **5. Send Notification**
```
POST /ca-setups/send-notification
```
**Payload:**
```json
{
  "ca_type": "EXAM",
  "academic_year": "2024/2026",
  "term": "Second Term",
  "class_codes": ["CLS0001"],
  "message": "Please complete score submission by Friday.",
  "reminder_type": "submission_warning"
}
```

### **6. Set Deadline**
```
POST /ca-setups/set-deadline
```
**Payload:**
```json
{
  "ca_type": "EXAM",
  "academic_year": "2024/2026",
  "term": "Second Term",
  "class_codes": ["CLS0001"],
  "deadline": "2025-01-10 17:00:00"
}
```

---

## 📁 Frontend Files

### **1. AssessmentManagementModal.tsx**
**Path:** `/elscholar-ui/src/feature-module/academic/examinations/exam-results/`

**Components:**
- Main modal with 3 tabs (Overview, Classes, Actions)
- Status timeline visualization
- Class submission list with progress bars
- Action buttons with conditional forms
- Notification/reminder forms
- Deadline picker

### **2. assessmentManagementHelpers.ts**
**Path:** `/elscholar-ui/src/feature-module/academic/examinations/exam-results/`

**Functions:**
- `fetchClassSubmissionStats()` - Fetch comprehensive stats
- `checkAssessmentStatus()` - Check current status
- `handleAssessmentAction()` - Execute workflow actions

---

## 🗄️ Database Schema Updates Required

### **weekly_scores table:**

```sql
ALTER TABLE weekly_scores ADD COLUMN IF NOT EXISTS status ENUM('Draft','Submitted','Released','Approved','Archived','UnderReview','Cancelled') DEFAULT 'Draft';
ALTER TABLE weekly_scores ADD COLUMN IF NOT EXISTS is_locked TINYINT(1) DEFAULT 0;
ALTER TABLE weekly_scores ADD COLUMN IF NOT EXISTS locked_at DATETIME NULL;
ALTER TABLE weekly_scores ADD COLUMN IF NOT EXISTS locked_by VARCHAR(50) NULL;
ALTER TABLE weekly_scores ADD COLUMN IF NOT EXISTS unlocked_at DATETIME NULL;
ALTER TABLE weekly_scores ADD COLUMN IF NOT EXISTS unlocked_by VARCHAR(50) NULL;
ALTER TABLE weekly_scores ADD COLUMN IF NOT EXISTS status_changed_at DATETIME NULL;
ALTER TABLE weekly_scores ADD COLUMN IF NOT EXISTS status_changed_by VARCHAR(50) NULL;
ALTER TABLE weekly_scores ADD COLUMN IF NOT EXISTS submission_deadline DATETIME NULL;
ALTER TABLE weekly_scores ADD COLUMN IF NOT EXISTS deadline_set_at DATETIME NULL;
ALTER TABLE weekly_scores ADD COLUMN IF NOT EXISTS deadline_set_by VARCHAR(50) NULL;
```

---

## 🎨 Usage in ClassCAReport.tsx

### **Import:**
```typescript
import AssessmentManagementModal from './AssessmentManagementModal';
import {
  fetchClassSubmissionStats,
  checkAssessmentStatus,
  handleAssessmentAction,
} from './assessmentManagementHelpers';
```

### **State:**
```typescript
const [showManagementModal, setShowManagementModal] = useState(false);
const [assessmentStatus, setAssessmentStatus] = useState(null);
const [classSubmissionStats, setClassSubmissionStats] = useState([]);
const [statsLoading, setStatsLoading] = useState(false);
const [actionLoading, setActionLoading] = useState(false);
```

### **Handler:**
```typescript
const handleManageAssessment = () => {
  setStatsLoading(true);

  // Fetch stats
  fetchClassSubmissionStats(
    classes,
    section,
    selectedCAType,
    academicYear,
    term,
    (stats) => {
      setClassSubmissionStats(stats);
      setStatsLoading(false);
      setShowManagementModal(true);
    },
    () => setStatsLoading(false)
  );
};

const handleStatusChange = (action, selectedClasses, additionalData) => {
  setActionLoading(true);

  handleAssessmentAction(
    action,
    selectedClasses,
    selectedCAType,
    academicYear,
    term,
    section,
    classSubmissionStats,
    additionalData,
    () => {
      setActionLoading(false);
      setShowManagementModal(false);
      fetchReportData(); // Refresh
    },
    () => setActionLoading(false)
  );
};
```

### **Button:**
```typescript
<Button
  onClick={handleManageAssessment}
  icon={<Settings />}
  loading={statsLoading}
  size="large"
>
  Manage Assessment
</Button>
```

### **Modal:**
```typescript
<AssessmentManagementModal
  visible={showManagementModal}
  onClose={() => setShowManagementModal(false)}
  assessmentData={assessmentStatus}
  classStats={classSubmissionStats}
  onStatusChange={handleStatusChange}
  loading={actionLoading}
  statsLoading={statsLoading}
/>
```

---

## ✅ Benefits

1. **Complete Workflow Management** - Handle all stages from draft to archive
2. **Multi-Class Operations** - Select and manage multiple classes at once
3. **Teacher Communication** - Built-in reminder and notification system
4. **Deadline Tracking** - Set and monitor submission deadlines
5. **Access Control** - Lock/unlock scores to prevent unauthorized changes
6. **Audit Trail** - Track who changed what and when
7. **Visual Progress** - Clear progress indicators and status badges
8. **Context-Aware Actions** - Only show relevant actions for current status
9. **Flexible Workflow** - Return to previous stages when needed
10. **Comprehensive Statistics** - Full visibility into submission progress

---

## 🚀 Testing Checklist

- [ ] Draft → Submit workflow
- [ ] Submit → Approve workflow
- [ ] Submit → Return to Draft workflow
- [ ] Approve → Release workflow
- [ ] Lock/Unlock functionality
- [ ] Send reminder to teachers
- [ ] Send notification to teachers
- [ ] Set submission deadline
- [ ] Multi-class selection
- [ ] Progress bar accuracy
- [ ] Status badge colors
- [ ] Deadline warning badges
- [ ] Form teacher display
- [ ] Released class indicators
- [ ] Archive functionality
- [ ] Un-release functionality

---

## 📝 Future Enhancements

1. **Email Integration** - Actually send emails to teachers
2. **WhatsApp Integration** - Send reminders via WhatsApp
3. **Automated Reminders** - Cron jobs for deadline warnings
4. **Bulk Actions** - Select all classes in section
5. **Status History** - Show full status change history
6. **Comments/Notes** - Add comments at each stage
7. **Approval Workflow** - Multi-level approval system
8. **Templates** - Save reminder message templates
9. **Analytics** - Track submission patterns
10. **Mobile App Support** - Push notifications

---

## 🎯 Summary

This Assessment Management System transforms the simple release function into a comprehensive workflow management tool that handles the entire assessment lifecycle with proper status management, teacher communication, deadline tracking, and access control.

The system is built with TypeScript for type safety, uses Ant Design components for UI consistency, and follows REST API best practices for backend integration.

