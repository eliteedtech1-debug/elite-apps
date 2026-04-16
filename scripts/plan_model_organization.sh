#!/bin/bash
# Organize models into subdirectories based on domain

set -e

MODELS_DIR="elscholar-api/src/models"
BACKUP_DIR="models_backup_$(date +%Y%m%d_%H%M%S)"

echo "=== Model Organization Plan ==="
echo ""

# Create backup
echo "[1/3] Creating backup..."
cp -r $MODELS_DIR $BACKUP_DIR
echo "✓ Backup created: $BACKUP_DIR"
echo ""

# Create subdirectories
echo "[2/3] Creating subdirectories..."
mkdir -p $MODELS_DIR/content
mkdir -p $MODELS_DIR/academic
mkdir -p $MODELS_DIR/finance
mkdir -p $MODELS_DIR/hr
mkdir -p $MODELS_DIR/admin
mkdir -p $MODELS_DIR/communication
mkdir -p $MODELS_DIR/ai
mkdir -p $MODELS_DIR/rbac
echo "✓ Subdirectories created"
echo ""

# Generate organization plan
echo "[3/3] Generating organization plan..."
cat > model_organization_plan.txt << 'EOF'
# Model Organization Plan

## Directory Structure

models/
├── content/          # Educational content (elite_content DB)
├── academic/         # Academic operations (elite_assessment DB)
├── finance/          # Financial operations (elite_finance DB)
├── hr/              # HR & Payroll (full_skcooly)
├── admin/           # School administration (full_skcooly)
├── communication/   # Messaging & notifications (full_skcooly)
├── ai/              # AI & chatbot (elite_bot DB)
├── rbac/            # Access control (full_skcooly)
└── index.js         # Main entry point

## Content Models (elite_content)

### Lessons & Planning
- LessonPlan.js
- LessonNote.js
- LessonPlanReview.js
- LessonComment.js (CREATE)
- LessonTimeTable.js (CREATE)

### Syllabus
- Syllabus.js
- SyllabusTracker.js
- SyllabusSuggestion.js (CREATE)

### Subjects
- Subject.js
- PredefinedSubject.js
- StudentSubject.js (CREATE)
- SchoolSubjectMapping.js (CREATE)
- SubjectStream.js (CREATE)

### Assignments
- Assignment.js
- StudentAssignment.js (CREATE)
- AssignmentQuestion.js
- AssignmentResponse.js (CREATE)
- AssignmentQuestionOption.js (CREATE)

### Recitations
- Recitation.js
- RecitationReply.js
- RecitationFeedback.js

### Virtual Classroom
- VirtualClassroom.js
- VirtualClassroomParticipant.js (CREATE)
- VirtualClassroomAttendance.js (CREATE)
- VirtualClassroomChatMessage.js (CREATE)
- VirtualClassroomRecording.js (CREATE)
- VirtualClassroomNotification.js (CREATE)

### Knowledge Domains
- KnowledgeDomainEnhanced.js (RENAME from KnowledgeDomain.js)

### Teacher Assignment
- TeacherClass.js (CREATE)
- ClassTiming.js (CREATE)

## Academic Models (elite_assessment)

### Assessment
- CATemplate.js
- CAConfiguration.js
- CAGroup.js
- AssessmentCriteriaEnhanced.js
- AssessmentCriteriaSimplified.js (if still exists)

### Character Traits
- CharacterTrait.js
- CharacterScore.js (CREATE)

### Grading
- GradingSystem.js
- GradeBoundary.js (CREATE)
- GradeLevel.js

### Exams
- ExamRemark.js (exam_remarks.js)
- ExamQuestion.js (CREATE if exists)
- ExamResponse.js (CREATE if exists)

### Weekly Scores
- WeeklyScore.js (CREATE)

## Finance Models (elite_finance)

### Payments
- PaymentEntry.js
- StudentLedger.js
- PaymentGatewayConfig.js (CREATE)

### Accounting
- JournalEntry.js
- ChartOfAccounts.js
- AccountingCompliance.js (CREATE)

### Billing
- FeeStructure.js
- BillTemplate.js (CREATE)

### Payroll
- PayrollPeriod.js
- PayrollLine.js
- PayrollDeduction.js (CREATE)

### Revenue
- SchoolRevenue.js

## HR Models (full_skcooly)

### Staff
- Staff.js
- Teacher.js
- StaffAttendance.js (CREATE)

### Allowances & Loans
- AllowanceType.js
- AllowancePackage.js
- AllowancePackageItem.js
- LoanType.js
- StaffLoan.js (CREATE)

## Admin Models (full_skcooly)

### School Setup
- SchoolSetup.js
- SchoolLocation.js (CREATE)
- Branch.js (CREATE)

### Classes & Students
- Class.js
- Student.js
- StudentAttendance.js (CREATE)

### Admission
- AdmissionForm.js
- AdmissionToken.js
- AdmissionNumberGenerator.js
- ApplicationStatusHistory.js

### System
- SystemConfig.js
- ReportConfiguration.js (CREATE)
- AppHealthIndicator.js

### Assets & Facilities
- Asset.js
- AssetCategory.js
- Facility.js
- FacilityRoom.js

### ID Cards
- IdCardFinancialTracking.js
- IdCardTemplate.js (CREATE)

## Communication Models (full_skcooly)

### Messaging
- Message.js
- MessagingUsage.js
- NoticeBoard.js (CREATE)

### Notifications
- Notification.js
- NotificationTrigger.js (CREATE)

### WhatsApp
- WhatsAppSession.js (CREATE)
- WhatsAppMessage.js (CREATE)

## AI Models (elite_bot)

### Chatbot
- ChatbotConversation.js
- ChatbotIntent.js
- ChatbotKnowledgeBase.js
- ChatbotTrainingData.js (CREATE)

## RBAC Models (full_skcooly)

### Access Control
- RbacRole.js
- RbacPermission.js (CREATE)
- RbacMenuAccess.js (CREATE)
- RbacAuditLog.js

### Superadmin
- SuperadminFeature.js (CREATE)
- SuperadminAllowedPlan.js

## Audit Models (elite_logs)

### Logging
- AuditLog.js
- CrashReport.js
- QueryLog.js (CREATE)

## Missing Models to Create

### Content
- LessonComment.js
- LessonTimeTable.js
- SyllabusSuggestion.js
- StudentSubject.js
- SchoolSubjectMapping.js
- SubjectStream.js
- StudentAssignment.js
- AssignmentResponse.js
- AssignmentQuestionOption.js
- VirtualClassroomParticipant.js
- VirtualClassroomAttendance.js
- VirtualClassroomChatMessage.js
- VirtualClassroomRecording.js
- VirtualClassroomNotification.js
- TeacherClass.js
- ClassTiming.js

### Academic
- CharacterScore.js
- GradeBoundary.js
- WeeklyScore.js
- ExamQuestion.js
- ExamResponse.js

### Finance
- PaymentGatewayConfig.js
- AccountingCompliance.js
- BillTemplate.js
- PayrollDeduction.js

### Admin
- SchoolLocation.js
- Branch.js
- StudentAttendance.js
- ReportConfiguration.js
- IdCardTemplate.js
- NoticeBoard.js
- NotificationTrigger.js

### Communication
- WhatsAppSession.js
- WhatsAppMessage.js

### RBAC
- RbacPermission.js
- RbacMenuAccess.js
- SuperadminFeature.js

### Audit
- QueryLog.js

### AI
- ChatbotTrainingData.js

## Implementation Steps

1. Create missing model files
2. Move existing models to subdirectories
3. Update index.js in each subdirectory
4. Update main models/index.js
5. Update all controller imports
6. Test all endpoints

EOF

cat model_organization_plan.txt
echo ""
echo "✓ Plan saved to model_organization_plan.txt"
echo ""
echo "Next steps:"
echo "1. Review model_organization_plan.txt"
echo "2. Run: ./create_missing_models.sh"
echo "3. Run: ./organize_models.sh"
