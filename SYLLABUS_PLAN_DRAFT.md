
To build a global top-tier module for
Syllabus, Lesson Plan, and Lesson Note in 2025 using your existing stack (React, Ant Design, Redux, Express, and MySQL/Sequelize), follow this comprehensive architectural plan.
1. Relational Data Modeling (Sequelize)
A top-tier system requires strict data integrity to ensure teachers never plan a lesson that isn't in the syllabus.
* Syllabus Model: Stores the "What." Defined by national standards (e.g., NERDC in Nigeria).
   * id, subject_id, class_level, term, topic_title, learning_objectives.
* LessonPlan Model: Stores the "How." Acts as the teacher’s strategy.
   * id, syllabus_id (FK), teacher_id, scheduled_date, methodology (e.g., "play-way"), instructional_materials, evaluation_strategy.
* LessonNote Model: Stores the "Content." Linked 1:1 to a specific plan.
   * id, lesson_plan_id (FK), content_body (LongText for RichText/HTML), summary, assignment_text.
2. Backend Implementation (ExpressJS & Sequelize)
Standardize the workflow by automating the progression from Syllabus
→right arrow
→
 Plan
→right arrow
→
 Note.
* Syllabus Coverage Engine: Create an endpoint that calculates coverage by comparing total topics in the Syllabus table vs. topics with a "Completed" status in LessonPlan.
* AI Generator Route: Integrate a 2025 LLM (like GPT-4o) via Express.
   * Input: Topic ID from Syllabus.
   * Output: A pre-filled JSON object containing a behavioral lesson plan and a detailed lesson note.
* Validation Middleware: Use Sequelize "Hooks" to ensure a lesson note cannot be saved unless it is attached to a valid, active lesson plan.
3. Frontend UI/UX (React & Ant Design)
* Dashboard (The Coverage Tracker): Use AntD Progress bars to show teachers and admins exactly how much of the syllabus has been covered per term.
* Syllabus Explorer: Use AntD Tree to allow teachers to browse subjects
→right arrow
→
 terms
→right arrow
→
 topics. Clicking a topic should open a drawer to "Create Plan."
* The "Writer" (Lesson Note): Use a Rich Text Editor (like react-quill or CKEditor) embedded in an AntD Card. Include a "Generate with AI" button that sends the Syllabus topic to your backend and fills the editor instantly.
* Approval Workflow: Use AntD Steps to show the status of a note: Draft
→right arrow
→
Pending Principal Review
→right arrow
→
Approved/Published.
4. State Management (Redux Toolkit)
* Global Academic State: Store the active academicYear, currentTerm, and teacherClassroomMap.
* Drafting Persistence: Use redux-persist to save a teacher's lesson note drafts in local storage. This prevents data loss during power outages or internet drops, a critical requirement for Nigerian schools.
5. 2025 "Top-Tier" Global Features
1. Bulk Syllabus Import: Use AntD Upload to accept Excel/CSV files, which Sequelize then bulk-inserts to the database.
2. PDF Exporting: Allow teachers to download their Lesson Notes as professional PDFs (using jspdf on the frontend) for physical filing.
3. Parent/Student Push: Automatically notify students via the portal when a new Lesson Note is approved by the principal.
4. Audit Logs: Track who edited a lesson note and when, using a Sequelize History table to comply with educational standards. create comprehensive doc .md file on how to create top teir module above on existing sms system using nigerian context and ai asisted system. create .md file no code just a plan

Show more
5:32 PM
Global Top-Tier Syllabus, Lesson Plan & Lesson Note Module
Comprehensive Implementation Guide for Nigerian School Management Systems (2025)
Table of Contents
Executive Overview
Nigerian Educational Context
System Architecture Philosophy
Data Model Design
Backend Architecture
Frontend Architecture
AI Integration Strategy
Nigerian-Specific Features
Workflow & User Journeys
Security & Compliance
Performance Optimization
Implementation Roadmap
Testing Strategy
Maintenance & Support
Executive Overview
Vision Statement
Create a world-class academic planning system that bridges the gap between national curriculum standards (NERDC) and classroom delivery, while addressing Nigeria's unique educational challenges: power instability, internet connectivity issues, and diverse learning environments.

Core Objectives
Curriculum Alignment: 100% traceability from NERDC syllabus to classroom execution
Teacher Empowerment: Reduce lesson planning time by 70% through AI assistance
Administrative Oversight: Real-time visibility into curriculum coverage across all classes
Offline Resilience: Function seamlessly despite power and connectivity challenges
Regulatory Compliance: Meet all NERDC, Ministry of Education, and accreditation requirements
Success Metrics
Syllabus coverage rate > 95% per term
Lesson planning time reduced from 3 hours to 45 minutes per week
Principal approval turnaround reduced from 3 days to 8 hours
Teacher satisfaction score > 4.5/5
Zero lesson notes lost due to technical issues
Nigerian Educational Context
NERDC Curriculum Framework Understanding
Structure Hierarchy
National Curriculum
├── Subject Areas (Mathematics, English, Sciences, etc.)
│   ├── Class Levels (Primary 1-6, JSS 1-3, SSS 1-3)
│   │   ├── Terms (First, Second, Third)
│   │   │   ├── Themes/Units
│   │   │   │   ├── Topics
│   │   │   │   │   ├── Sub-topics
│   │   │   │   │   │   ├── Learning Objectives (Cognitive, Affective, Psychomotor)
│   │   │   │   │   │   ├── Recommended Teaching Methods
│   │   │   │   │   │   ├── Instructional Materials
│   │   │   │   │   │   └── Evaluation Criteria
Key NERDC Principles to Embed
Objective-Driven Learning: Every lesson must map to specific, measurable learning outcomes
Bloom's Taxonomy Integration: Objectives categorized by cognitive levels (Remember, Understand, Apply, Analyze, Evaluate, Create)
Spiral Curriculum: Concepts revisited with increasing complexity across class levels
Local Content Integration: Nigerian history, geography, culture, and current affairs
Multi-Domain Assessment: Cognitive (head), Affective (heart), Psychomotor (hand)
Nigerian School Operational Realities
Infrastructure Challenges
Power Supply: Expect 6-12 hour daily outages; system must cache aggressively
Internet Connectivity: 2G/3G in many areas; design for low bandwidth (< 128 kbps)
Device Diversity: Mix of modern smartphones, older Android devices, and Windows 7 PCs
Network Costs: Data is expensive; minimize API payloads
Administrative Patterns
Hierarchical Approval: Vice Principal (Academics) → Principal → Proprietor (private schools)
Hard Copy Culture: Teachers still maintain physical lesson note books; PDF export is critical
Inspection Readiness: Ministry/NERDC inspectors require immediate access to documentation
Term-Based Operations: Strict 13-week terms with mid-term breaks
Teacher Demographics
Age Range: 25-60 years; varying digital literacy levels
Class Loads: Primary teachers may teach 8+ subjects; secondary 3-5 classes per subject
Time Constraints: Teaching 25-30 periods per week; minimal planning time
Assessment Burden: Continuous assessment requirements alongside teaching
System Architecture Philosophy
Design Principles
1. Progressive Enhancement
Build the core system to work offline-first, treating connectivity as an enhancement rather than a requirement.

Implementation Approach:

Core lesson creation and editing functions work entirely client-side
Background sync when connectivity is available
Visual indicators showing sync status (Draft → Syncing → Synced)
Conflict resolution UI for multi-device edits
2. Zero Data Loss Guarantee
In an environment with power instability, losing 2 hours of lesson planning work is catastrophic.

Implementation Approach:

Auto-save every 30 seconds to browser IndexedDB
Redux-persist with encryption for sensitive content
"Recovery Mode" on app launch if unsaved work detected
Server-side draft versioning with rollback capability
3. Intelligent Defaults
Reduce cognitive load by pre-populating 80% of required fields based on syllabus metadata.

Implementation Approach:

AI generates complete first draft from syllabus topic
Instructional materials auto-suggested based on subject/topic
Evaluation methods pre-populated per topic type (e.g., practicals get lab reports)
Previous term's successful lessons recommended as templates
4. Hierarchical Data Integrity
Enforce the relationship: Syllabus → Lesson Plan → Lesson Note at the database level.

Implementation Approach:

Foreign key constraints prevent orphaned records
Cascade rules ensure syllabus changes propagate correctly
Archived syllabi remain read-only but accessible for historical records
Validation layers at API, service, and ORM levels
Data Model Design
Entity Relationship Philosophy
The system revolves around three core entities with supporting tables for metadata, workflow, and audit.

Core Entities
1. Syllabus (The "What")
Purpose: Digital representation of NERDC/state curriculum standards

Key Attributes:

Identification: Unique ID, official curriculum code (e.g., NERDC-MATH-SSS1-2024)
Hierarchy: Subject, class level, term, theme, topic, sub-topic
Learning Objectives: Structured JSON with cognitive domain tags
NERDC Metadata: Recommended periods, teaching methods, materials list
Status: Draft, Published, Archived, Superseded
Versioning: Academic year, revision number, effective date range
Relationships:

Belongs to Subject (Mathematics, English, etc.)
Has many LessonPlans (one-to-many)
Belongs to AcademicYear and Term
Has many LearningObjectives (polymorphic)
Special Considerations:

Bulk import from NERDC-approved Excel templates
Version control for curriculum updates mid-year
Support for school-specific additions (private schools)
Multi-language support (English, Hausa, Yoruba, Igbo for primary levels)
2. LessonPlan (The "How")
Purpose: Teacher's instructional strategy for delivering a syllabus topic

Key Attributes:

Linkage: Foreign key to Syllabus (enforced, non-nullable)
Scheduling: Planned date, duration (periods), actual date delivered
Methodology: Teaching approach (lecture, demonstration, project-based, play-way)
Resources: Instructional materials needed, digital resources links
Differentiation: Accommodations for special needs, gifted learners
Assessment Strategy: Formative checks, summative evaluation plan
Approval Workflow: Status (draft, pending, approved, rejected), approver comments
Relationships:

Belongs to Syllabus (many-to-one, mandatory)
Belongs to Teacher (many-to-one)
Belongs to ClassroomSection (many-to-one)
Has one LessonNote (one-to-one)
Has many ApprovalSteps (polymorphic workflow)
Special Considerations:

Clone from previous term's successful plans
Share plans within subject department
Track actual vs. planned delivery dates for reporting
Link to teacher's timetable for auto-scheduling
3. LessonNote (The "Content")
Purpose: Detailed content and activities for the actual lesson delivery

Key Attributes:

Linkage: Foreign key to LessonPlan (enforced, one-to-one)
Introduction: Set induction, previous knowledge review (rich text)
Presentation: Step-by-step content delivery (rich text with multimedia)
Teacher Activities: What the teacher will do during delivery
Pupil Activities: Student engagement points, group work instructions
Instructional Materials Used: Actual materials deployed (may differ from plan)
Evaluation: Questions asked, class exercises, assignments (rich text)
Summary: Recap points, key takeaways
Assignment: Homework with rubric (optional, rich text)
Reflection: Post-lesson notes (challenges faced, what worked)
Relationships:

Belongs to LessonPlan (one-to-one, mandatory)
Has many Attachments (PDFs, images, videos)
Has many Comments (from approvers, peer reviewers)
Has many Versions (audit trail)
Special Considerations:

Support for rich media (images, videos, audio clips)
Offline editing with conflict resolution
PDF generation matching Ministry inspection format
Copy protection for proprietary content (private schools)
Supporting Entities
AcademicYear & Term
Manage calendar boundaries (term start/end dates, holidays)
Current term indicator for UI context
Historical data archival rules
Subject & ClassLevel
NERDC subject taxonomy
Class progressions (Primary 1-6, JSS 1-3, SSS 1-3)
Subject combinations for secondary schools
Teacher & ClassroomSection
Teacher assignments to subjects and classes
Subject specializations and qualifications
Class enrollment data for reporting
ApprovalWorkflow
Configurable approval chains (VP Academics → Principal)
SLA tracking (time in each stage)
Email/SMS notifications at each step
Rejection reasons and resubmission tracking
AuditLog
Who edited what and when (user, timestamp, action)
Before/after snapshots for critical fields
IP address and device fingerprinting
Retention policy (7 years for regulatory compliance)
AIGenerationLog
Track AI usage per teacher/school
Cost management (token consumption)
Quality feedback (teacher edits vs. AI suggestions)
Model version tracking for debugging
Backend Architecture
API Design Principles
RESTful Resource Structure
Organize endpoints around the three core entities with clear action semantics.

Base URL Pattern: /api/v1/academic/{resource}

Syllabus Endpoints:

GET /syllabi - List with filters (subject, class, term, status)
GET /syllabi/:id - Single syllabus with learning objectives
POST /syllabi/bulk-import - Excel/CSV upload
GET /syllabi/:id/coverage - Calculate % covered via linked lesson plans
GET /syllabi/by-teacher - Syllabi relevant to logged-in teacher's assignments
LessonPlan Endpoints:

GET /lesson-plans - List with filters (date range, status, teacher)
POST /lesson-plans - Create new plan (must link to valid syllabus)
PUT /lesson-plans/:id - Update (validate syllabus link intact)
POST /lesson-plans/:id/submit - Submit for approval
POST /lesson-plans/:id/approve - Approve (role-restricted)
POST /lesson-plans/:id/reject - Reject with comments
POST /lesson-plans/:id/clone - Clone to new date/class
LessonNote Endpoints:

GET /lesson-notes/:lesson_plan_id - Fetch note for a plan
POST /lesson-notes - Create (must link to valid lesson plan)
PUT /lesson-notes/:id - Update (validate lesson plan link)
POST /lesson-notes/:id/generate-pdf - Export to PDF
POST /lesson-notes/:id/versions - Fetch version history
POST /lesson-notes/:id/attachments - Upload media
AI Endpoints:

POST /ai/generate-lesson-plan - Input: syllabus_id, returns: plan JSON
POST /ai/generate-lesson-note - Input: lesson_plan_id, returns: note HTML
POST /ai/enhance-content - Input: partial note, returns: improved version
POST /ai/suggest-materials - Input: topic, returns: material recommendations
Middleware Stack
Authentication Middleware:

JWT-based with refresh tokens (15-min access, 7-day refresh)
Role-based access control (Teacher, HOD, VP Academics, Principal, Admin)
Device fingerprinting for suspicious login detection
Validation Middleware:

Schema validation using Joi or Yup
Business rule validation (e.g., lesson plan date must be within current term)
Syllabus-LessonPlan linkage validation
File upload size/type restrictions
Error Handling Middleware:

Standardized error response format
User-friendly messages for common errors (e.g., "This topic has already been planned for this week")
Detailed logs for debugging (stack traces, request context)
Graceful degradation messages (e.g., "AI service temporarily unavailable; you can still create plans manually")
Caching Middleware:

Redis caching for frequently accessed syllabi
ETag support for conditional requests
Cache invalidation on data updates
Rate Limiting:

Per-user limits (100 requests/minute for teachers, 500 for admins)
AI endpoint limits (10 generations/hour per teacher to control costs)
Bulk operation throttling
Database Layer (Sequelize ORM)
Model Design Best Practices
Syllabus Model:

Attributes:
- id (UUID, primary key)
- curriculum_code (String, indexed, unique)
- subject_id (Integer, foreign key)
- class_level (Enum: PRIMARY_1...SSS_3)
- term (Enum: FIRST, SECOND, THIRD)
- theme (String)
- topic (String, indexed)
- sub_topic (String)
- learning_objectives (JSON)
- recommended_periods (Integer)
- teaching_methods (JSON array)
- instructional_materials (JSON array)
- assessment_criteria (JSON)
- nerdc_page_reference (String)
- status (Enum: DRAFT, PUBLISHED, ARCHIVED)
- academic_year_id (Integer, foreign key)
- version (Integer, default: 1)
- created_by (Integer, foreign key to User)
- timestamps (createdAt, updatedAt)

Indexes:
- Composite: (subject_id, class_level, term, status)
- Full-text: (topic, sub_topic) for search

Hooks:
- beforeCreate: Auto-generate curriculum_code
- afterUpdate: Invalidate related caches
- beforeDestroy: Prevent deletion if lesson plans exist
LessonPlan Model:

Attributes:
- id (UUID, primary key)
- syllabus_id (UUID, foreign key, non-nullable, indexed)
- teacher_id (Integer, foreign key, non-nullable)
- classroom_section_id (Integer, foreign key)
- planned_date (Date, indexed)
- duration_periods (Integer, default: 1)
- actual_delivery_date (Date, nullable)
- methodology (Enum: LECTURE, DEMONSTRATION, PROJECT_BASED, PLAY_WAY, etc.)
- instructional_materials_needed (JSON array)
- differentiation_notes (Text)
- formative_assessment_plan (Text)
- summative_assessment_plan (Text)
- status (Enum: DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, COMPLETED)
- submitted_at (DateTime)
- approved_at (DateTime)
- approved_by (Integer, foreign key to User)
- rejection_reason (Text)
- timestamps

Associations:
- belongsTo: Syllabus (as 'syllabusContent')
- belongsTo: Teacher (as 'planner')
- belongsTo: ClassroomSection (as 'targetClass')
- hasOne: LessonNote (as 'detailedNote')
- hasMany: ApprovalStep (as 'approvalHistory')

Hooks:
- beforeSave: Validate syllabus is published and for correct academic year
- afterCreate: Notify VP Academics if auto-approval not enabled
- beforeUpdate: Track status transitions in audit log
LessonNote Model:

Attributes:
- id (UUID, primary key)
- lesson_plan_id (UUID, foreign key, unique, non-nullable)
- introduction_html (LongText)
- presentation_html (LongText)
- teacher_activities (Text)
- pupil_activities (Text)
- materials_used (JSON array)
- evaluation_html (LongText)
- summary_html (LongText)
- assignment_html (LongText)
- reflection_notes (Text)
- estimated_duration_minutes (Integer)
- actual_duration_minutes (Integer, nullable)
- effectiveness_rating (Integer 1-5, self-assessed)
- generated_by_ai (Boolean, default: false)
- ai_generation_model (String, nullable)
- teacher_edit_percentage (Integer, nullable)
- version_number (Integer, default: 1)
- timestamps

Associations:
- belongsTo: LessonPlan (as 'planDetails')
- hasMany: Attachment (as 'media')
- hasMany: Comment (as 'feedback')
- hasMany: Version (as 'history')

Hooks:
- beforeCreate: Validate lesson plan exists and is approved
- beforeSave: Calculate word count and reading time
- afterUpdate: Increment version number, create version snapshot
Transaction Management
Critical Operations Requiring Transactions:

Creating LessonPlan + LessonNote together (atomic operation)
Approval workflow state changes (status update + notification + audit log)
Bulk syllabus import (all-or-nothing insertion)
Cloning lesson plans (copy plan + note + attachments)
Implementation Pattern:

Use Sequelize managed transactions for multi-step operations
Set appropriate isolation levels (READ_COMMITTED for most cases)
Implement retry logic with exponential backoff for deadlocks
Log all transaction rollbacks for monitoring
Query Optimization Strategies
Eager Loading:

Load LessonPlan with Syllabus and Teacher in single query for list views
Load LessonNote with LessonPlan and Syllabus for detail views
Use attributes option to fetch only needed columns
Pagination:

Implement cursor-based pagination for large datasets
Default limit: 20 items per page (teachers), 50 (admins)
Provide total count only when explicitly requested (expensive query)
Caching Strategy:

Cache published syllabi for 24 hours (rarely change)
Cache teacher's class assignments for 1 hour
Invalidate caches on relevant updates (hooks)
Use cache keys: syllabus:${subject_id}:${class_level}:${term}
Database Indexes:

Create composite indexes for common filter combinations
Full-text indexes for topic search
Partial indexes for active records (e.g., WHERE status != 'ARCHIVED')
Monitor slow query log weekly, add indexes as needed
Frontend Architecture
Component Hierarchy
High-Level Structure
App (Redux Provider, Router)
├── Layout (Sidebar, Header, Footer)
│   ├── AcademicDashboard
│   │   ├── CoverageOverview (Progress indicators)
│   │   ├── UpcomingLessons (Calendar integration)
│   │   ├── PendingApprovals (For VPs/Principals)
│   │   └── RecentActivity (Audit trail)
│   ├── SyllabusModule
│   │   ├── SyllabusExplorer (Tree view)
│   │   ├── SyllabusDetailDrawer
│   │   ├── BulkImportModal
│   │   └── CoverageReport
│   ├── LessonPlanModule
│   │   ├── PlanCalendar (Weekly/Monthly view)
│   │   ├── PlanFormWizard (Multi-step)
│   │   ├── PlanListTable (Filterable)
│   │   ├── ApprovalWorkflowPanel
│   │   └── ClonePlanModal
│   ├── LessonNoteModule
│   │   ├── NoteEditor (Rich text)
│   │   ├── AIAssistantPanel
│   │   ├── AttachmentManager
│   │   ├── VersionHistory
│   │   └── PDFPreviewModal
│   └── AdminModule
│       ├── SyllabusManagement
│       ├── UserRoleAssignments
│       ├── SystemSettings
│       └── AnalyticsReports
Ant Design Component Usage
Dashboard (The Coverage Tracker)
Purpose: Provide at-a-glance visibility into syllabus coverage and teacher workload.

Key Components:

Statistic Cards (ant-design): Show total topics, covered topics, pending approvals, AI generations used
Progress Bars (ant-design): Visual coverage percentage per subject/class
Alert Banners (ant-design): Warn about topics behind schedule (e.g., "Week 8 and only 40% covered")
Timeline (ant-design): Show recent submissions, approvals, rejections
Badge (ant-design): Notification counts on pending items
Layout Strategy:

3-column responsive grid (collapses to single column on mobile)
Top row: Key metrics (4 statistic cards)
Middle row: Coverage progress (one progress bar per subject taught)
Bottom row: Activity feed and alerts
Data Refresh:

Auto-refresh every 5 minutes when page is visible
Manual refresh button with loading indicator
Optimistic updates when actions are taken elsewhere
Syllabus Explorer
Purpose: Allow teachers to browse the curriculum hierarchy and initiate lesson planning.

Key Components:

Tree (ant-design): Hierarchical display of Subject → Class → Term → Topic
Checkable nodes to show which topics are covered
Search functionality to find topics quickly
Expandable nodes with lazy loading for performance
Drawer (ant-design): Slide-out panel when topic is clicked
Display learning objectives, recommended methods, materials
"Create Lesson Plan" button (CTA)
Show existing plans for this topic (if any)
Tag (ant-design): Visual indicators (Covered, In Progress, Not Started)
Tooltip (ant-design): Hover to see NERDC page reference
UX Considerations:

Remember tree expansion state in Redux (user preference)
Keyboard navigation support (arrow keys to traverse tree)
Bulk actions: "Create plans for entire term" workflow
Color-coding: Green (covered), Yellow (in progress), Red (overdue)
Lesson Plan Creator (Wizard)
Purpose: Guide teachers through structured lesson planning with progressive disclosure.

Key Components:

Steps (ant-design): 4-step wizard
Step 1: Select Syllabus Topic (with autocomplete search)
Step 2: Scheduling (date picker, period selection, class selection)
Step 3: Methodology (radio group for teaching methods, textarea for notes)
Step 4: Resources & Assessment (checkboxes for materials, evaluation plan)
Form (ant-design): Comprehensive form validation
Required field indicators
Real-time validation (e.g., date must be within term)
Helpful tooltips on each field
Button Group: Back, Next, Save Draft, Submit for Approval
Alert (ant-design): Show AI generation option ("Generate with AI" button)
Workflow Logic:

Allow saving drafts at any step (prevent data loss)
Pre-fill fields from syllabus metadata when topic is selected
Show estimated time to complete each step
"Clone from previous term" shortcut on Step 1
Lesson Note Editor (The Writer)
Purpose: Provide a distraction-free, AI-assisted content creation environment.

Key Components:

Card (ant-design): Contain editor with title and metadata
Rich Text Editor (react-quill or CKEditor):
Toolbar: Bold, italic, lists, headings, images, tables
Word count display
Auto-save indicator (green checkmark or syncing spinner)
Tabs (ant-design): Separate tabs for each section
Introduction, Presentation, Evaluation, Summary, Assignment
Switch tabs without losing content (controlled components)
Affix (ant-design): Sticky toolbar with primary actions
AI Generate, Save Draft, Preview, Submit
Collapse (ant-design): Collapsible panels for reference materials
Show linked lesson plan details
Display syllabus learning objectives
Suggested instructional materials
AI Integration UI:

Button (ant-design): "Generate with AI" (primary button)
Shows loading state with spinner
Disables during generation (prevent double-click)
Modal (ant-design): AI generation options
Tone selector (Formal, Conversational, Simple)
Length preference (Concise, Standard, Detailed)
Preview before inserting
Alert (ant-design): Show token usage estimate
Popconfirm (ant-design): Warn if AI will overwrite existing content
Offline Support:

Badge (ant-design): Connection status indicator (Online, Offline, Syncing)
Message (ant-design): Toast notifications on auto-save success/failure
IndexedDB persistence (background service worker)
Conflict resolution UI if changes made on multiple devices
Approval Workflow Panel
Purpose: Streamline the review process for Vice Principals and Principals.

Key Components:

Table (ant-design): List of pending lesson plans/notes
Columns: Teacher, Subject, Topic, Submitted Date, Days Pending
Filterable by subject, class, teacher
Sortable by submission date
Row expansion to show lesson note preview
Steps (ant-design): Approval progress visualization
Draft → Pending VP → Pending Principal → Approved
Current step highlighted
Drawer (ant-design): Full lesson note view for review
Read-only display of plan and note
Comment textarea for feedback
Action buttons: Approve, Reject, Request Changes
Tag (ant-design): Status indicators with color coding
Popconfirm (ant-design): Confirmation before approval/rejection
Admin Features:

Bulk approve multiple lessons (checkbox selection)
SLA breach alerts (red tag if pending > 48 hours)
Delegation: VP can reassign to another VP
Email notification triggers on approve/reject
State Management (Redux Toolkit)
Slice Organization
Academic Slice (Global Academic Context):

State:
- currentAcademicYear: { id, name, startDate, endDate, status }
- currentTerm: { id, name, number, startDate, endDate, weekNumber }
- userClassroomAssignments: [{ subject, classLevel, section }]
- systemPreferences: { autoSaveInterval, defaultPageSize }

Actions:
- setAcademicYear(payload)
- setCurrentTerm(payload)
- fetchUserAssignments()
- updateSystemPreferences(payload)

Thunks:
- fetchCurrentAcademicContext() - Load on app initialization
- switchTerm(termId) - Admin action to change active term
Syllabus Slice:

State:
- syllabi: { byId: {}, allIds: [] } (normalized)
- loading: boolean
- error: string | null
- filters: { subject, classLevel, term, searchQuery }
- selectedSyllabusId: string | null

Actions:
- setSyllabi(payload) - Normalize and store
- selectSyllabus(id)
- updateFilters(payload)
- clearFilters()

Thunks:
- fetchSyllabi(filters) - GET /api/syllabi
- fetchSyllabusCoverage(syllabusId) - GET /api/syllabi/:id/coverage
- bulkImportSyllabi(file) - POST /api/syllabi/bulk-import
LessonPlan Slice:

State:
- plans: { byId: {}, allIds: [] }
- drafts: { byId: {}, allIds: [] } (local-only, not synced)
- loading: boolean
- submitting: boolean
- error: string | null
- calendarView: 'week' | 'month'
- filters: { dateRange, status, classLevel }

Actions:
- setPlans(payload)
- addDraft(payload) - Local draft creation
- removeDraft(id) - After sync or discard
- updatePlanStatus(id, status)

Thunks:
- fetchLessonPlans(filters)
- createLessonPlan(payload)
- updateLessonPlan(id, payload)
- submitForApproval(id)
- approvePlan(id)
- rejectPlan(id, reason)
- clonePlan(id, newDate)
LessonNote Slice:

State:
- notes: { byId: {}, allIds: [] }
- activeNote: { planId, content, lastSaved, syncStatus }
- aiGenerationStatus: 'idle' | 'loading' | 'success' | 'error'
- attachments: { byNoteId: { [id]: [...files] } }

Actions:
- setActiveNote(payload) - Load note into editor
- updateNoteContent(field, value) - For controlled inputs
- setAIGenerationStatus(status)
- addAttachment(noteId, file)
- clearActiveNote() - On close editor

Thunks:
- fetchLessonNote(planId)
- saveNoteDraft() - Debounced auto-save
- submitNote(payload)
- generateWithAI(planId, options)
- generatePDF(noteId)
- fetchVersionHistory(noteId)
UI Slice (Ephemeral State):

State:
- sidebarCollapsed: boolean
- drawerVisible: { type: string, props: object } | null
- modalVisible: { type: string, props: object } | null
- notifications: [{ id, type, message, duration }]
- connectionStatus: 'online' | 'offline' | 'syncing'

Actions:
- toggleSidebar()
- openDrawer(type, props)
- closeDrawer()
- openModal(type, props)
- closeModal()
- addNotification(payload)
- removeNotification(id)
- setConnectionStatus(status)
Redux Persist Configuration
Persist Strategy:

Persist: Academic context, user preferences, drafts
Don't Persist: Loading states, errors, active selections
Encryption: Use redux-persist-transform-encrypt for drafts (sensitive content)
Storage Backend:

Web: LocalStorage (primary), IndexedDB (fallback for large drafts)
Mobile: AsyncStorage (React Native apps)
Migration Strategy:

Version persist config (v1, v2, etc.)
Write migrations for state shape changes
Handle corrupt state gracefully (reset to initial state with user warning)
Middleware Stack
Custom Middleware:

Auto-Save Middleware: Debounce note content updates, trigger save thunks
Sync Middleware: Queue actions when offline, replay on reconnection
Analytics Middleware: Track feature usage (lesson plan creation, AI usage, etc.)
Error Logging Middleware: Catch reducer errors, send to monitoring service
Third-Party Middleware:

redux-thunk: Async action handling
redux-logger: Development-only logging
AI Integration Strategy
AI Use Cases
1. Lesson Plan Generation
Input Requirements:

Syllabus ID (with topic, learning objectives, recommended methods)
Teacher preferences (teaching style, student profile)
Previous successful plans for same topic (optional, for learning)
Output Format (JSON):

{
  "methodology": "PROJECT_BASED_LEARNING",
  "
Continue

5:36 PM
rationale": "This topic benefits from hands-on exploration...",
"durationPeriods": 2,
"instructionalMaterials": ["Manila cards", "Markers", "Sample objects"],
"stepByStepPlan": [
{ "step": 1, "activity": "Introduction", "duration": "10 min", "description": "..." },
{ "step": 2, "activity": "Group Work", "duration": "25 min", "description": "..." }
],
"formativeAssessment": "Observe group discussions, ask probing questions",
"summativeAssessment": "Students submit project posters, rubric provided",
"differentiationStrategies": {
"struggling": "Provide sentence starters, pair with peer",
"advanced": "Challenge to create 3D model instead of poster"
}
}


**Prompt Engineering**:
You are an expert Nigerian educator specializing in [SUBJECT] for [CLASS_LEVEL].

Context:

Topic: [TOPIC_NAME]
Learning Objectives: [OBJECTIVES_LIST]
NERDC Recommended Methods: [METHODS]
Available Resources: [MATERIALS_LIST]
Class Size: [NUMBER] students
Lesson Duration: [PERIODS] x 40 minutes
Task:
Create a detailed lesson plan that:

Aligns with NERDC standards for Nigerian schools
Uses culturally relevant examples (Nigerian context)
Incorporates active learning strategies
Provides differentiation for mixed-ability classes
Includes formative and summative assessment
Output Format: JSON as specified above


#### 2. Lesson Note Content Generation

**Input Requirements**:
- Approved Lesson Plan (methodology, materials, assessment plan)
- Syllabus learning objectives
- Teacher's style preferences (formal, conversational, detailed)

**Output Format** (HTML with semantic structure):
```html
<div class="lesson-note">
  <section id="introduction">
    <h2>Introduction (10 minutes)</h2>
    <h3>Set Induction</h3>
    <p>Begin by asking students to share their experiences with...</p>
    <h3>Previous Knowledge</h3>
    <ul>
      <li>Students should already understand...</li>
    </ul>
  </section>
  
  <section id="presentation">
    <h2>Presentation (25 minutes)</h2>
    <h3>Teacher Activities</h3>
    <ol>
      <li>Display chart showing... <em>(use Manila card prepared)</em></li>
      <li>Explain the concept of... using the example of Nigerian markets</li>
    </ol>
    <h3>Pupil Activities</h3>
    <ul>
      <li>Students observe and take notes</li>
      <li>Students work in groups to...</li>
    </ul>
  </section>
  
  <section id="evaluation">
    <h2>Evaluation (10 minutes)</h2>
    <h3>Formative Questions</h3>
    <ol>
      <li>What is the difference between...?</li>
      <li>Give two examples of... from your community</li>
    </ol>
  </section>
  
  <section id="summary">
    <h2>Summary (5 minutes)</h2>
    <p>Key points: (1) ... (2) ... (3) ...</p>
  </section>
  
  <section id="assignment">
    <h2>Assignment</h2>
    <p>In your exercise books, write a short paragraph explaining...</p>
  </section>
</div>
```

**Prompt Engineering**:
You are writing a detailed lesson note for Nigerian teachers to use during classroom instruction.

Context:

Lesson Plan: [PLAN_JSON]
Learning Objectives: [OBJECTIVES]
Student Age: [AGE_RANGE]
Writing Style: [FORMAL/CONVERSATIONAL/SIMPLE]
Task:
Write a comprehensive lesson note that:

Follows the Nigerian lesson note format (Introduction, Presentation, Evaluation, Summary, Assignment)
Provides verbatim teacher scripts where helpful
Specifies exact pupil activities (not vague descriptions)
Uses Nigerian cultural references and local examples
Includes time allocations for each section
Writes at a reading level appropriate for [CLASS_LEVEL] teachers
Cites specific instructional materials from the lesson plan
Constraints:

Total word count: 800-1200 words
Use simple, clear language (avoid jargon)
Include at least 5 evaluation questions
Provide a meaningful assignment (not just "read chapter X")
Output Format: Semantic HTML as specified above


#### 3. Content Enhancement

**Use Case**: Teacher writes a basic lesson note, AI improves it.

**Input**:
- Teacher's draft note (HTML)
- Identified weaknesses (e.g., "evaluation section too brief," "no differentiation")

**Output**:
- Enhanced version with improvements highlighted

**Prompt Engineering**:
You are a senior educator reviewing a junior teacher's lesson note.

Original Note:
[TEACHER_DRAFT_HTML]

Identified Issues:
[ISSUES_LIST]

Task:
Enhance the lesson note by:

Expanding weak sections (add detail, examples)
Improving clarity (simplify complex sentences)
Adding Nigerian cultural relevance where missing
Strengthening assessment (better questions)
Maintaining the teacher's voice and intent
Output:

Return the full enhanced HTML
Use <mark class="ai-suggestion"> tags around AI-added content so teacher can review

#### 4. Instructional Materials Suggestion

**Input**:
- Topic and subtopic
- School location (urban/rural - affects resource availability)
- Budget indicator (government school, low-fee private, high-fee private)

**Output** (JSON array):
[
{
"material": "Manila cards",
"purpose": "To create flashcards for vocabulary drill",
"quantity": "10 sheets",
"availability": "HIGH",
"alternatives": ["Cardboard from carton boxes", "White paper glued to cardboard"],
"estimatedCost": "₦500"
},
{
"material": "Improvised balance scale",
"purpose": "To demonstrate concept of equilibrium",
"quantity": "1 per group (5 groups)",
"availability": "MEDIUM",
"alternatives": ["Use a ruler balanced on a pencil", "Use a stick balanced on a stone"],
"estimatedCost": "₦0 (improvised from waste materials)",
"improvisingInstructions": "Tie a ruler at the center, hang plastic bags on each end"
}
]


### AI Provider Selection

#### Recommended Providers (2025)

**OpenAI GPT-4o** (Primary):
- **Pros**: Best reasoning, follows complex instructions, good at Nigerian context
- **Cons**: Higher cost ($5-15 per 1M tokens), requires API key management
- **Use For**: Lesson plan generation, content enhancement

**Anthropic Claude 3.5 Sonnet** (Secondary):
- **Pros**: Better at long-form content, citation accuracy, safety
- **Cons**: Cost similar to GPT-4, different API structure
- **Use For**: Lesson note generation, evaluating AI outputs for quality

**Google Gemini 2.0 Flash** (Fallback):
- **Pros**: Lower cost ($0.50 per 1M tokens), faster responses
- **Cons**: Less consistent with instructions, may need more prompt engineering
- **Use For**: High-volume requests, material suggestions

**Local/Self-Hosted Options**:
- **Llama 3.1 70B** (via Groq or local inference): For schools with data privacy concerns
- **Mixtral 8x7B**: Lighter weight for schools with limited API budgets

#### Cost Management

**Budget Allocation**:
- Allocate monthly token budget per school (e.g., 500 generations/month for 50 teachers)
- Teachers get 10 AI generations per week (resets Monday)
- Principals get unlimited access (for reviewing/testing)

**Usage Tracking**:
- Log every AI request with: teacher ID, timestamp, model, tokens used, cost
- Dashboard showing school's monthly AI spending
- Alert admins when 80% of budget is consumed

**Optimization Strategies**:
- Cache common syllabus topics (avoid regenerating identical plans)
- Use streaming responses (show partial output while generating)
- Implement response caching (Redis) with 7-day TTL for identical requests
- Fallback to cheaper models during off-peak hours

### Prompt Management System

**Prompt Versioning**:
- Store prompts in database, not hardcoded
- Version prompts (v1.0, v1.1, etc.) for A/B testing
- Allow admins to customize prompts per school (branding, style)

**Prompt Templates** (Handlebars syntax):
System: You are {{roleDescription}}.

Context:
{{#each contextItems}}

{{this.key}}: {{this.value}} {{/each}}
Task:
{{taskDescription}}

Constraints:
{{#each constraints}}

{{this}} {{/each}}
Output Format: {{outputFormat}}


**Quality Assurance**:
- Sample 10% of AI outputs for manual review (weekly)
- Track teacher edit percentage (how much they change AI output)
- Use feedback loop: high-edit suggestions = prompt needs improvement
- A/B test prompt variations, measure teacher satisfaction

---

## Nigerian-Specific Features

### 1. NERDC Compliance Engine

**Purpose**: Ensure every lesson is traceable to national curriculum standards.

**Features**:
- **Curriculum Code Validator**: Check that syllabus entries match official NERDC codes
- **Learning Objectives Taxonomy**: Auto-tag objectives by Bloom's level and domain
- **Coverage Calculator**: Compare school's syllabus vs. official NERDC syllabus (detect omissions)
- **Inspection Report Generator**: One-click export of all lesson plans/notes for Ministry inspection (PDF)

**Implementation Notes**:
- Maintain a reference database of official NERDC syllabi (updated annually)
- Flag discrepancies: "Warning: This topic is not in the official NERDC syllabus for SSS2 Mathematics"
- Allow private schools to add supplementary topics (clearly marked as "School-Specific")

### 2. Multi-Language Support

**Supported Languages** (by school type):
- **Primary Schools**: English, Hausa, Yoruba, Igbo (for lower primary)
- **Secondary Schools**: English (primary), French (for language teachers)

**Implementation**:
- Use i18next for interface translations
- Store syllabus topics in multiple languages (translatable fields in database)
- Allow teachers to generate lesson notes in vernacular, then translate to English for principal approval
- Audio pronunciation guides for vernacular vocabulary (integrate Elevenlabs or Google TTS)

### 3. Offline-First Architecture

**Core Principle**: System must work without internet, syncing when available.

**Technical Implementation**:

**Service Workers**:
- Cache all static assets (CSS, JS, images)
- Cache API responses (syllabi, user's lesson plans)
- Background sync queue for failed API requests

**IndexedDB Storage**:
- Store entire syllabus for teacher's subjects (10-50 MB)
- Store 30 days of lesson plans/notes
- Store user preferences and settings

**Sync Strategy**:
On Connection Restored:

Check server timestamps vs. local timestamps
If server newer: Prompt "Your lesson note was updated elsewhere, which version to keep?"
If local newer: Upload local changes
If conflict: Show diff view, let teacher merge manually
Update sync status badge (green checkmark when complete)

**Visual Indicators**:
- **Header Badge**: Green (Online, synced), Yellow (Syncing), Red (Offline, unsynced changes)
- **Save Button**: Shows "Saved locally" vs. "Saved to cloud"
- **Alert Banner**: "You are offline. Changes will sync when connection is restored."

### 4. PDF Export (Ministry Inspection Format)

**Purpose**: Generate lesson notes matching the exact format Ministry inspectors expect.

**Format Requirements** (Standard Nigerian Lesson Note Book):
- **Header**: School name, logo, term, class, subject, date
- **Body Sections**: Introduction, Presentation, Evaluation, Summary, Assignment (each on new page if long)
- **Footer**: Teacher signature line, VP signature line, Principal signature line, date
- **Page Numbers**: Bottom center
- **Margins**: 1 inch all sides for binding

**Implementation** (jsPDF + custom templates):
- Use school's uploaded logo (stored in database)
- Fetch digital signatures from user profile (if available)
- Include QR code linking to online version (for verification)
- Watermark: "Generated by [SchoolName] SMS" in footer

**Bulk Operations**:
- Export all lesson notes for a term (single PDF, 100+ pages)
- Export by subject (all Mathematics notes for Term 2)
- Include table of contents with page numbers

### 5. WAEC/NECO/JAMB Alignment Indicators

**Purpose**: Show teachers which topics are frequently tested in national exams.

**Data Source**:
- Analyze past 10 years of WAEC/NECO exam questions
- Tag syllabus topics with "High Exam Priority" if appeared in 60%+ of exams
- Tag with "Recent Trend" if appeared in last 3 years but not before

**UI Integration**:
- Badge on syllabus tree nodes (e.g., "WAEC Frequent")
- Tooltip showing: "This topic appeared in 8 out of 10 WAEC exams (2014-2023)"
- Filter: "Show only high-priority exam topics"

**Teacher Benefit**:
- Focus effort on critical topics
- Plan extra revision lessons for high-stakes content
- Inform students: "This is very important for WAEC"

### 6. Term Calendar Integration

**Nigerian Academic Calendar** (Typical):
- **First Term**: September - December (13 weeks)
- **Second Term**: January - April (13 weeks)
- **Third Term**: May - July (13 weeks)
- **Mid-term Breaks**: 1 week in each term
- **Public Holidays**: Independence Day, Democracy Day, Eid, Christmas

**Features**:
- Auto-populate term dates from school settings
- Block lesson planning on holidays
- Calculate "weeks remaining" alerts (e.g., "8 weeks left, 15 topics uncovered!")
- Generate recommended pacing guide: "Cover 2 topics per week to finish on time"

**Dashboard Widgets**:
- Countdown: "47 days until end of term"
- Progress vs. Time: Line chart showing planned coverage vs. actual weeks elapsed

### 7. SMS/WhatsApp Notifications

**Purpose**: Reach teachers with low data access or limited app usage.

**Use Cases**:
- Lesson plan approved: "Your lesson plan for 'Photosynthesis' has been approved by Principal. View: [link]"
- Lesson plan rejected: "Your plan needs revision. Reason: 'Add more evaluation questions.' Resubmit: [link]"
- Reminder: "You have 3 unplanned topics for next week. Plan now: [link]"
- AI quota alert: "You've used 8/10 AI generations this week."

**Implementation**:
- Integrate Twilio or Africa's Talking API
- SMS fallback if WhatsApp unavailable
- User preference: Choose notification channels (Email, SMS, WhatsApp, In-App)
- Cost management: Limit to 5 SMS per teacher per week

### 8. Power Outage Recovery

**Problem**: Teacher writes lesson note for 1 hour, power cuts, work lost.

**Solutions**:

**Auto-Save Frequency**:
- Every 30 seconds while typing
- Immediately on blur (when leaving textbox)
- Show "Last saved: 23 seconds ago" timestamp

**Recovery Mode**:
On App Load:

Check IndexedDB for unsaved drafts
If found: Show modal "We found unsaved work from 2 hours ago. Restore?"
Compare timestamps: If server version is newer, offer to keep both
If restored: Highlight recovered content in yellow for 10 seconds

**Browser Storage Limits**:
- Monitor IndexedDB quota usage
- Warn at 80% full: "Local storage almost full. Sync your drafts online."
- Provide "Clear old drafts" tool (delete synced drafts older than 30 days)

---

## Workflow & User Journeys

### Teacher Journey: Creating a Lesson Note (Happy Path)

**Scenario**: Mrs. Adeyemi, a JSS2 Mathematics teacher, needs to plan Monday's lesson on "Algebraic Expressions."

#### Step-by-Step Flow:

**1. Dashboard Landing (Monday, 8:00 AM)**
- Logs into SMS, navigates to Academic → Dashboard
- Sees alert: "You have 4 topics to plan for this week"
- Clicks "Plan Lessons" button

**2. Syllabus Explorer**
- Tree auto-expands to her subjects (Mathematics, JSS2, Second Term)
- Sees topic "Algebraic Expressions - Introduction" marked in red (Not Started)
- Clicks topic, drawer opens showing:
  - Learning Objectives: "Students will be able to identify terms, coefficients, and constants"
  - NERDC Recommended: "Use concrete materials for demonstration"
  - Badge: "WAEC Frequent" (exam priority indicator)
- Clicks "Create Lesson Plan" button

**3. Lesson Plan Wizard - Step 1: Select Topic**
- Topic pre-filled: "Algebraic Expressions - Introduction"
- Shows: "This is lesson 12 of 28 for this term"

**4. Step 2: Scheduling**
- Date picker: Selects Monday, March 10, 2025
- Period selection: Chooses Period 3-4 (double period, 80 minutes)
- Class selection: JSS2A (her assigned class)

**5. Step 3: Methodology**
- Radio buttons: Lecture, Demonstration, Play-Way, Project-Based
- Selects: "Demonstration"
- Clicks "Suggest with AI" button
- AI modal appears: "AI suggests: Use algebra tiles to represent terms visually. Rationale: Concrete-Pictorial-Abstract approach..."
- She accepts AI suggestion, methodology notes auto-filled

**6. Step 4: Resources & Assessment**
- Instructional materials: Checkboxes appear (Textbook, Chalkboard, etc.)
- Clicks "Suggest Materials" (AI-powered)
- AI adds: "Algebra tiles (or improvised cards), Chart paper, Markers"
- Evaluation plan: AI suggests: "Formative: Thumbs up/down checks. Summative: 5-question class exercise"
- She reviews, makes minor edits

**7. Create Lesson Plan**
- Clicks "Save & Create Lesson Note" button
- Lesson plan created, redirected to Lesson Note Editor

**8. Lesson Note Editor (AI-Assisted Writing)**
- Editor loads with empty template (Introduction, Presentation, Evaluation, Summary, Assignment sections)
- Big button at top: "Generate Full Lesson Note with AI" (primary CTA)
- Clicks button, modal appears:
  - "Tone: Formal / Conversational / Simple" → Selects "Conversational"
  - "Length: Concise / Standard / Detailed" → Selects "Standard"
  - "Preview before inserting" → Checked
- Clicks "Generate" (loading spinner, 10 seconds)

**9. AI Generation Preview**
- Modal shows generated lesson note (full HTML)
- She reads through:
  - Introduction: "Good morning class! Today we'll explore the building blocks of algebra..."
  - Presentation: Step-by-step teacher script with Nigerian examples ("If Chinedu has 3x oranges...")
  - Evaluation: 7 questions included
  - Summary: Clear, concise recap
  - Assignment: "Write 5 algebraic expressions from your daily life"
- She's satisfied, clicks "Insert into Editor"

**10. Post-AI Editing**
- Content appears in editor, she makes tweaks:
  - Changes "Chinedu" to "Ahmed" (class diversity)
  - Adds a diagram she drew (uploads image)
  - Expands evaluation section (adds 2 more questions)
- Auto-save runs every 30 seconds (green checkmark appears)

**11. Final Review & Submission**
- Clicks "Preview" button (opens PDF preview modal)
- PDF shows her lesson note in official format with school letterhead
- Satisfied, closes preview
- Clicks "Submit for Approval" button
- Confirmation modal: "This will send to Mrs. Okafor (VP Academics). You won't be able to edit after submission. Continue?"
- Clicks "Yes, Submit"

**12. Post-Submission**
- Success toast: "Lesson note submitted for approval"
- Status changes to "Pending Approval"
- SMS sent to VP Okafor: "New lesson note pending your review: JSS2 Math - Algebraic Expressions. Review: [link]"
- Mrs. Adeyemi sees notification: "Your note is under review. Approval typically takes 24 hours."

**Total Time**: 15 minutes (vs. 2 hours manually)

---

### Vice Principal Journey: Approving a Lesson Note

**Scenario**: Mrs. Okafor, VP Academics, receives notification about Mrs. Adeyemi's submission.

#### Step-by-Step Flow:

**1. Notification Receipt (Monday, 10:30 AM)**
- Receives SMS: "New lesson note pending review: JSS2 Math. Review: [link]"
- Opens SMS on her phone, clicks link
- Redirected to SMS app (or web if not installed)

**2. Approval Dashboard**
- Navigates to Academic → Approvals
- Sees table with pending items:
  - Row: Mrs. Adeyemi | Mathematics | JSS2A | Algebraic Expressions | Submitted 2 hours ago
- Badge: "2 hours pending" (green, under SLA)
- Clicks row, drawer opens with full lesson note

**3. Lesson Note Review Drawer**
- Reads through entire lesson note (scrollable view)
- Checks:
  - ✓ Learning objectives addressed
  - ✓ Nigerian cultural relevance (examples use local context)
  - ✓ Adequate evaluation questions (9 questions)
  - ✓ Meaningful assignment (not just "read textbook")
- Minor concern: Introduction could be more engaging

**4. Feedback Decision**
- Two options: Approve (green button) or Request Changes (yellow button)
- Decides to suggest improvement but not block approval
- Clicks "Approve with Comments" (alternative flow)

**5. Comments Modal**
- Textarea: "Great work! Suggestion: Start with a real-world question to hook students, e.g., 'How do we calculate MTN data bundle costs?'"
- Checkbox: "Notify teacher immediately" (checked)
- Clicks "Approve & Send Feedback"

**6. Approval Confirmed**
- Toast: "Lesson note approved"
- Status changes to "Approved"
- SMS sent to Mrs. Adeyemi: "Your lesson note for Algebraic Expressions has been approved! VP's feedback: [comment]"
- System auto-notifies JSS2A students (if enabled): "New lesson note published: Algebraic Expressions. View: [link]"

**Total Time**: 5 minutes per note

---

### Principal Journey: Monitoring Coverage

**Scenario**: Dr. Ibrahim, School Principal, wants to check how much of the syllabus has been covered across all classes.

#### Step-by-Step Flow:

**1. Dashboard Landing (Friday, 4:00 PM)**
- Logs into SMS, navigates to Academic → Dashboard
- Sees "Coverage Overview" widget with progress bars:
  - JSS1 English: 68% (19/28 topics covered) - Green
  - JSS2 Mathematics: 45% (12/28 topics covered) - Yellow (warning)
  - SSS3 Chemistry: 92% (23/25 topics covered) - Green
- Notices JSS2 Math is behind schedule (Week 9, should be at 65%)

**2. Drill-Down Investigation**
- Clicks "JSS2 Mathematics" progress bar
- Redirected to Syllabus Coverage Report page
- Sees table:
  - Column: Topic | Planned Date | Status | Teacher
  - 12 rows: Covered (green)
  - 16 rows: Not Started (red)
- Filters by Teacher: "Mrs. Adeyemi"
- Sees she has only covered 12/28 topics assigned to her

**3. Teacher Performance View**
- Clicks "View Teacher Details"
- Opens drawer showing Mrs. Adeyemi's profile:
  - Total Lessons Planned: 12
  - Avg. Days to Approval: 1.2 days (good)
  - AI Usage: 8/10 this week (active user)
  - Coverage Rate: 45% (below target of 65% by Week 9)
- Sees comment from VP: "Teacher recently took 2-week sick leave, catching up now"

**4. Intervention Decision**
- Principal decides to extend grace period
- Clicks "Send Reminder" button
- Template message: "Dear Mrs. Adeyemi, kindly prioritize completing the remaining 16 topics for JSS2 Math. We have 4 weeks left in the term. Let me know if you need support."
- Sends message
- Sets calendar reminder to follow up in 1 week

**5. School-Wide Report (Monthly)**
- Navigates to Reports → Coverage Summary
- Generates PDF report:
  - Overall School Coverage: 74% (target: 75%) - Almost on track
  - Subjects Behind: JSS2 Math, SSS1 Physics
  - Top Performers: Mrs. Afolabi (English, 95%), Mr. Eze (Chemistry, 92%)
- Downloads PDF to present at next staff meeting

**Total Time**: 10 minutes for full school review

---

### Alternative Flow: Lesson Plan Rejected

**Scenario**: Mr. Okon submits a lesson plan with inadequate evaluation strategy.

**Rejection Flow**:
1. VP Academics reviews lesson plan
2. Clicks "Reject" button
3. Modal appears: "Rejection Reason" (required textarea)
4. Types: "Evaluation section only has 2 questions. Please add at least 5 questions covering different cognitive levels (Remember, Understand, Apply)."
5. Clicks "Reject & Notify"
6. Status changes to "Rejected"
7. Mr. Okon receives SMS and in-app notification
8. He opens the rejected plan, sees VP's comment highlighted in red
9. Edits evaluation section (adds 5 more questions)
10. Clicks "Resubmit for Approval"
11. Plan goes back to VP's queue with tag "Resubmission"

---

## Security & Compliance

### Data Protection

#### Personal Data (NDPR Compliance)

**Nigerian Data Protection Regulation (NDPR) Requirements**:
- **Lawful Basis**: Schools must obtain consent to process teacher and student data
- **Purpose Limitation**: Use data only for academic planning and administration
- **Data Minimization**: Collect only necessary fields (no excessive personal details)
- **Storage Limitation**: Retain data for 7 years (education sector standard), then archive or delete
- **Data Subject Rights**: Teachers can request data export, deletion (right to be forgotten)

**Implementation**:
- **Consent Management**: On first login, show NDPR consent form (checkbox required)
- **Data Export**: "Download My Data" button in user profile (JSON format)
- **Data Deletion**: "Delete My Account" workflow with 30-day grace period
- **Audit Logs**: Track all data access (who viewed which lesson notes, when)
- **Data Breach Protocol**: Notify affected users within 72 hours if breach occurs

#### Intellectual Property Protection

**Teacher-Created Content**:
- **Ownership**: Clarify in ToS that teachers own their lesson notes
- **School License**: School has right to use notes internally during teacher's employment
- **Departure**: Teachers can export their notes when leaving (watermarked with school name)

**AI-Generated Content**:
- **Ownership**: Hybrid ownership (school + AI provider license)
- **Attribution**: Mark AI-generated sections with metadata
- **Modification Rights**: Teachers can freely edit AI content (derivative work)

**Private School Proprietary Content**:
- **Encryption**: Encrypt lesson notes at rest (AES-256)
- **Access Control**: Principals can flag notes as "Confidential" (restrict sharing outside school)
- **Watermarking**: PDF exports include invisible watermark with school ID and export date

### Role-Based Access Control (RBAC)

#### Permission Matrix

| Feature | Teacher | HOD | VP Academics | Principal | Admin |
|---------|---------|-----|--------------|-----------|-------|
| View own lesson notes | ✓ | ✓ | ✓ | ✓ | ✓ |
| View others' notes | Department only | Department only | All | All | All |
| Create lesson plan | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit own notes | Before approval | Before approval | Anytime | Anytime | Anytime |
| Edit others' notes | ✗ | ✗ | ✗ | ✗ | ✓ |
| Approve notes | ✗ | ✗ | ✓ | ✓ | ✓ |
| Reject notes | ✗ | ✗ | ✓ | ✓ | ✓ |
| Bulk import syllabus | ✗ | ✗ | ✗ | ✓ | ✓ |
| Delete syllabus | ✗ | ✗ | ✗ | ✗ | ✓ |
| View analytics | Own data | Department | School-wide | School-wide | School-wide |
| Export reports | Own data | Department | School-wide | School-wide | School-wide |
| Manage users | ✗ | ✗ | ✗ | ✓ | ✓ |

#### Implementation Strategy

**Middleware Enforcement**:
Route: PUT /api/lesson-notes/:id

Middleware Stack:

authenticate() - Verify JWT token
authorize(['teacher', 'admin']) - Check role
checkOwnership() - For teachers, verify note.teacher_id === user.id
checkApprovalStatus() - Prevent editing if status === 'APPROVED' (unless Principal/Admin)
validatePayload() - Schema validation
[Controller Logic]

**Database-Level Enforcement**:
- Use Sequelize scopes to filter queries by user role
- Example: `LessonNote.scope('teacherView', userId)` only returns user's notes
- Prevent SQL injection via parameterized queries (ORM handles this)

**UI-Level Enforcement** (Defense in Depth):
- Hide "Edit" button if user lacks permission
- Disable "Approve" button if user is not VP/Principal
- Show read-only view if user is viewing another teacher's note

### Session Management

**JWT Token Strategy**:
- **Access Token**: 15-minute expiry, stored in memory (not localStorage)
- **Refresh Token**: 7-day expiry, stored in httpOnly secure cookie
- **Rotation**: Generate new refresh token on each use (invalidate old one)

**Session Timeout**:
- Auto-logout after 30 minutes of inactivity
- Warning modal at 25 minutes: "You'll be logged out in 5 minutes. Click here to stay logged in."
- On timeout, redirect to login page with message: "Session expired for security. Please log in again."

**Concurrent Sessions**:
- Allow up to 3 active sessions per user (laptop, phone, tablet)
- Display active sessions in user profile with "Logout Other Devices" button
- Force logout all sessions if password is changed

### Audit Trail

**Events to Log**:
- User login/logout (with IP address, device fingerprint)
- Lesson plan creation, update, deletion
- Lesson note creation, update (store before/after diff)
- Approval/rejection actions (with approver ID and reason)
- Syllabus modifications (who changed what)
- Bulk operations (imports, exports)
- AI generation requests (topic, model, cost)
- Failed login attempts (for brute-force detection)

**Log Storage**:
- Dedicated `audit_logs` table (never delete, only archive after 7 years)
- Indexed by user_id, resource_type, action, timestamp
- Store full request payload for critical actions (e.g., lesson note submission)

**Audit Report Generation**:
- Principals can generate audit reports (e.g., "Show all changes to SSS3 Chemistry syllabus in last 30 days")
- Export to Excel/PDF for regulatory inspections
- Visualizations: "Who edited what most frequently" (bar chart)

---

## Performance Optimization

### Frontend Optimization

#### Code Splitting
- Lazy load routes: Syllabus, LessonPlan, LessonNote modules load on demand
- Use React.lazy() and Suspense for component-level splitting
- Initial bundle
Continue

5:41 PM
< 200 KB (gzipped), each module < 100 KB

Asset Optimization
Images: Compress to WebP format, serve via CDN (Cloudinary or Cloudflare)
Fonts: Subset fonts (include only Latin + common Nigerian characters)
Icons: Use SVG sprite sheet or icon fonts (Ant Design Icons already optimized)
Rendering Optimization
Virtualize long lists (use react-window for syllabus tree with 500+ topics)
Memoize expensive computations (useMemo for coverage calculations)
Debounce search inputs (300ms delay before API call)
Throttle scroll events (for infinite scroll pagination)
State Management Optimization
Normalize Redux state (avoid nested objects)
Use Reselect for memoized selectors (prevent unnecessary re-renders)
Batch Redux actions with redux-batched-actions
Backend Optimization
Database Optimization
Indexing Strategy:

sql
-- High-frequency queries
CREATE INDEX idx_lesson_plans_teacher_status ON lesson_plans(teacher_id, status);
CREATE INDEX idx_lesson_plans_date ON lesson_plans(planned_date);
CREATE INDEX idx_syllabi_subject_class_term ON syllabi(subject_id, class_level, term);

-- Full-text search
CREATE FULLTEXT INDEX idx_syllabi_topic ON syllabi(topic, sub_topic);

-- Partial indexes (PostgreSQL)
CREATE INDEX idx_active_plans ON lesson_plans(status) WHERE status != 'ARCHIVED';
```

**Query Optimization**:
- Use `EXPLAIN ANALYZE` to identify slow queries
- Avoid N+1 queries (use eager loading with `include`)
- Paginate large result sets (default 20 items, max 100)
- Use database views for complex reports (e.g., coverage summary)

#### API Response Optimization

**Compression**:
- Enable gzip compression for API responses (reduce payload by 70%)
- Use Brotli compression for static assets (better than gzip)

**Caching Strategy**:
```
Cache Key Pattern: resource:id:fields

Examples:
- syllabus:123:basic (stores: id, topic, learning_objectives)
- syllabus:123:full (stores: all fields including history)
- teacher:456:assignments (stores: teacher's classroom assignments)

TTL (Time To Live):
- Syllabi: 24 hours (rarely change)
- Lesson Plans: 1 hour (change frequently)
- User Assignments: 30 minutes
- Coverage Stats: 5 minutes (expensive to calculate)

Invalidation:
- On update: DELETE cache key immediately
- On create: Invalidate related list caches (e.g., teacher's plans list)
- Use Redis PUB/SUB for multi-server cache invalidation
Response Pagination:

json
{
  "data": [...],
  "meta": {
    "currentPage": 2,
    "perPage": 20,
    "total": 156,
    "totalPages": 8
  },
  "links": {
    "first": "/api/lesson-plans?page=1",
    "prev": "/api/lesson-plans?page=1",
    "next": "/api/lesson-plans?page=3",
    "last": "/api/lesson-plans?page=8"
  }
}
```

#### Background Jobs (Task Queue)

**Use Cases**:
- PDF generation (CPU-intensive, offload to worker)
- Bulk syllabus import (process 1000+ rows asynchronously)
- Email/SMS notifications (don't block API response)
- AI generation (long-running, show progress bar)

**Implementation** (Bull Queue + Redis):
```
Queues:
- pdf-generation (priority: low)
- notifications (priority: high)
- ai-generation (priority: medium, rate-limited)

Workers:
- 2 workers for pdf-generation
- 4 workers for notifications
- 1 worker for ai-generation (throttled to 10 req/min per school)

Job Lifecycle:
1. Controller creates job: queue.add('generate-pdf', { noteId: 123 })
2. Return to client: { jobId: 'abc-def', status: 'pending' }
3. Client polls: GET /api/jobs/abc-def
4. Worker processes job, updates status: 'processing' → 'completed'
5. Client receives result: { status: 'completed', pdfUrl: '...' }
Mobile Optimization
Responsive Design:

Mobile-first CSS (design for 360px width, scale up)
Touch-friendly targets (buttons min 44x44px)
Swipe gestures for navigation (drawer, modals)
Data Efficiency:

Compress images (serve 320px thumbnails on mobile)
Lazy load non-critical content (load attachments on demand)
Request only essential fields: ?fields=id,topic,status (reduce payload)
Offline Capability:

Cache last 7 days of lesson plans (IndexedDB)
Show cached data immediately, refresh in background
Indicate staleness: "Last updated 2 hours ago"
Implementation Roadmap
Phase 1: Foundation (Weeks 1-4)
Goals: Set up core infrastructure, database models, basic CRUD operations.

Tasks:

Database Design:
Create Sequelize models (Syllabus, LessonPlan, LessonNote)
Define associations (foreign keys, hooks)
Write migrations for core tables
Seed database with sample NERDC syllabi (Primary 1-6 Mathematics, English)
Backend API:
Set up Express server structure (routes, controllers, middleware)
Implement authentication (JWT, refresh tokens)
Create CRUD endpoints for Syllabus, LessonPlan, LessonNote
Add validation middleware (Joi schemas)
Set up error handling (standardized responses)
Frontend Setup:
Initialize React app (Create React App or Vite)
Configure Redux Toolkit (slices, store)
Set up React Router (routes for modules)
Install Ant Design, configure theme (school colors)
Create base layout (sidebar, header, footer)
Testing Environment:
Set up test database (MySQL or PostgreSQL)
Create test users (Teacher, VP, Principal, Admin)
Load sample syllabi (10 subjects, 3 terms)
Deliverables:

Functional backend API (Postman collection for testing)
Basic frontend shell (login, dashboard, empty module pages)
Database with seed data
Phase 2: Core Features (Weeks 5-8)
Goals: Build Syllabus Explorer, Lesson Plan Creator, basic Lesson Note Editor.

Tasks:

Syllabus Module:
Build Tree component (Ant Design Tree)
Implement syllabus list API with filters (subject, class, term)
Create Syllabus Detail Drawer (show objectives, materials)
Add search functionality (full-text search on topics)
Implement Bulk Import (Excel upload, parse with Papaparse)
Lesson Plan Module:
Build multi-step form wizard (Ant Design Steps)
Implement lesson plan creation API
Add validation (syllabus link required, date within term)
Create plan list view (table with filters)
Build calendar view (weekly/monthly, react-big-calendar)
Lesson Note Module:
Integrate rich text editor (React Quill or CKEditor)
Implement auto-save (debounced, every 30 seconds)
Create note storage API (CRUD endpoints)
Add section templates (Introduction, Presentation, etc.)
Build attachment upload (image, PDF support)
Workflow:
Implement approval workflow (status transitions)
Create approval dashboard for VPs (pending items table)
Add approve/reject actions (with comments)
Send email notifications (Nodemailer)
Deliverables:

Teachers can browse syllabus, create plans, write notes manually
VPs can review and approve/reject
Email notifications on status changes
Phase 3: AI Integration (Weeks 9-12)
Goals: Integrate AI for lesson plan and note generation.

Tasks:

AI Provider Setup:
Set up OpenAI API account (get API keys)
Configure fallback to Gemini (for cost management)
Create AI service layer (abstract API calls)
Prompt Engineering:
Design prompts for lesson plan generation (test with 10 sample topics)
Design prompts for lesson note generation (optimize for Nigerian context)
A/B test prompts, measure teacher edit percentage
Store prompts in database (versioning system)
AI Generation Endpoints:
POST /ai/generate-lesson-plan (input: syllabus_id, output: JSON)
POST /ai/generate-lesson-note (input: lesson_plan_id, output: HTML)
Add streaming support (SSE for real-time generation)
Implement usage tracking (token consumption, cost logging)
Frontend Integration:
Add "Generate with AI" buttons (Lesson Plan Wizard, Note Editor)
Build AI generation modal (tone, length options)
Show generation progress (loading spinner, estimated time)
Allow preview before inserting (modal with full content)
Highlight AI-generated content (subtle background color)
Usage Management:
Implement per-teacher quota (10 generations/week)
Show quota usage in UI (progress bar in dashboard)
Alert admins when school reaches 80% of monthly budget
Cache identical requests (avoid regenerating same topic)
Deliverables:

Teachers can generate full lesson plans and notes with AI
System tracks usage and enforces quotas
AI-generated content is culturally relevant and high-quality
Phase 4: Nigerian Features (Weeks 13-16)
Goals: Add NERDC compliance, offline mode, PDF export, multi-language.

Tasks:

NERDC Compliance:
Create reference database of official NERDC syllabi
Build curriculum code validator (check against reference)
Implement coverage calculator (% covered vs. official syllabus)
Generate inspection report (PDF with all lesson notes, signatures)
Offline-First Architecture:
Set up Service Worker (Workbox)
Cache static assets (CSS, JS, images)
Implement IndexedDB storage (cache syllab, plans, notes)
Build sync queue (retry failed API requests)
Create conflict resolution UI (show diff, let teacher choose)
PDF Export:
Design Nigerian lesson note template (jsPDF)
Include school logo, signatures, QR code
Support bulk export (entire term, by subject)
Add table of contents with page numbers
Multi-Language Support:
Set up i18next (English, Hausa, Yoruba, Igbo)
Translate UI strings (700+ strings)
Store syllabus topics in multiple languages (database schema)
Allow teachers to switch language in settings
WAEC/NECO Alignment:
Analyze past exam papers (tag syllabus topics)
Add "Exam Priority" badges (high, medium, low)
Create filter: "Show only high-priority topics"
Deliverables:

System works offline, syncs when online
Teachers can export professional PDFs
Interface available in 4 Nigerian languages
Syllabi aligned with NERDC and exam boards
Phase 5: Polish & Scale (Weeks 17-20)
Goals: Optimize performance, add analytics, conduct user testing, prepare for production.

Tasks:

Performance Optimization:
Run Lighthouse audits (target: 90+ score)
Implement code splitting (reduce initial bundle size)
Optimize images (WebP format, lazy loading)
Add database indexes (analyze slow queries)
Set up Redis caching (syllabi, coverage stats)
Analytics & Reporting:
Build coverage reports (by subject, class, teacher)
Create teacher performance dashboard (for principals)
Add usage analytics (most-used features, AI adoption rate)
Generate term-end summary reports (PDF)
User Testing:
Recruit 10 teachers from 3 schools (government, low-fee private, high-fee private)
Conduct usability tests (record sessions, gather feedback)
Identify pain points, prioritize fixes
Iterate on UI/UX (simplify complex workflows)
Security Hardening:
Conduct penetration testing (OWASP Top 10)
Implement rate limiting (prevent abuse)
Add CSRF protection (cookie-based tokens)
Enable HTTPS (SSL certificates)
Set up intrusion detection (log monitoring)
Documentation:
Write user manuals (Teacher Guide, Admin Guide)
Create video tutorials (10-minute walkthroughs)
Document API (Swagger/OpenAPI)
Prepare training materials (for school onboarding)
Deliverables:

Production-ready system (secure, fast, well-tested)
Comprehensive documentation
User feedback incorporated
Phase 6: Deployment & Training (Weeks 21-24)
Goals: Deploy to production, onboard pilot schools, provide training.

Tasks:

Infrastructure Setup:
Provision servers (AWS, Azure, or local Nigerian hosting)
Set up CI/CD pipeline (GitHub Actions, auto-deploy on merge)
Configure production database (MySQL with replication)
Set up Redis cluster (for caching, job queues)
Enable monitoring (Sentry for errors, Datadog for performance)
Deployment:
Deploy backend API (Dockerized containers)
Deploy frontend (static hosting on CDN)
Set up SSL certificates (Let's Encrypt)
Configure load balancer (handle 1000+ concurrent users)
School Onboarding:
Import school data (teachers, students, classes)
Bulk import NERDC syllabi (all subjects, all classes)
Create admin accounts (principals, VPs)
Configure school settings (term dates, approval workflow)
Training:
Conduct 2-day training for admins (how to manage system)
Conduct 1-day training for teachers (how to create lessons)
Provide ongoing support (WhatsApp group, helpdesk)
Monitoring & Support:
Set up 24/7 monitoring (uptime checks, error alerts)
Create support ticketing system (for bug reports)
Schedule weekly check-ins with pilot schools (gather feedback)
Deliverables:

Live production system (accessible to pilot schools)
Trained users (teachers, admins)
Support infrastructure in place
Testing Strategy
Unit Testing
Backend (Mocha + Chai):

Test all Sequelize model methods (create, update, delete)
Test business logic (e.g., coverage calculator, syllabus validator)
Mock external dependencies (AI API, email service)
Coverage target: 80%+
Frontend (Jest + React Testing Library):

Test Redux reducers (state transitions)
Test React components (rendering, user interactions)
Mock API calls (use MSW - Mock Service Worker)
Coverage target: 70%+
Integration Testing
API Tests (Supertest):

Test full request/response cycles (login, create plan, approve)
Test error handling (invalid input, unauthorized access)
Test database transactions (rollback on failure)
E2E Tests (Cypress or Playwright):

Test critical user journeys (teacher creates lesson note, VP approves)
Test across browsers (Chrome, Firefox, Safari)
Test on mobile devices (responsive design)
Performance Testing
Load Testing (Artillery or k6):

Simulate 100 concurrent teachers creating lesson plans
Test database under load (query response times)
Identify bottlenecks (slow endpoints, memory leaks)
Stress Testing:

Simulate 1000+ concurrent users
Test system recovery after crash
Validate auto-scaling (if using cloud infrastructure)
Security Testing
Automated Scans:

Run OWASP ZAP (detect SQL injection, XSS vulnerabilities)
Use npm audit (check for vulnerable dependencies)
Manual Penetration Testing:

Hire security consultant (test authentication bypass, privilege escalation)
Test file upload security (prevent malicious files)
Maintenance & Support
Ongoing Maintenance Tasks
Daily:

Monitor error logs (Sentry dashboard)
Check server health (CPU, memory, disk usage)
Review failed background jobs (retry or investigate)
Weekly:

Analyze slow queries (database performance)
Review user feedback (support tickets, in-app feedback)
Update AI prompts (based on teacher edit percentages)
Monthly:

Update dependencies (npm packages, security patches)
Review usage analytics (feature adoption, drop-off points)
Generate school reports (coverage, AI usage, teacher performance)
Annually:

Update NERDC syllabi (import new curriculum versions)
Renew SSL certificates
Conduct security audit
Review and optimize cloud costs
Support Structure
Tier 1: In-App Help:

Contextual tooltips (hover over fields)
"Help" button in header (opens knowledge base)
Video tutorials embedded in UI
Tier 2: School Admins:

Train school admins to handle common issues
Provide admin manual (troubleshooting guide)
Tier 3: Helpdesk:

WhatsApp support group (response within 2 hours during school hours)
Email support (response within 24 hours)
Ticketing system for bugs (prioritize by severity)
Tier 4: Development Team:

Escalate critical bugs (system down, data loss)
Schedule feature requests (product roadmap)
Conclusion
System Benefits Summary
For Teachers:

70% reduction in lesson planning time
AI assistance for high-quality content
Offline capability (no data loss)
Professional PDF exports
For Administrators:

Real-time visibility into curriculum coverage
Streamlined approval workflows
Regulatory compliance (NERDC, Ministry)
Data-driven teacher performance insights
For Students:

Access to high-quality lesson notes
Consistent teaching standards across classes
Parents can view upcoming lessons
For Schools:

Improved inspection readiness
Reduced paperwork (digital system)
Better WAEC/NECO exam preparation
Scalable solution (50-5000 students)
Success Criteria
The module is considered successful if, after 6 months of deployment:

90% of teachers use it weekly
95% syllabus coverage achieved across all classes
Principal approval time reduced by 60%
Teacher satisfaction score > 4.5/5
Zero critical data loss incidents
AI usage rate > 70% of teachers
End of Document



You are out of free messages until 10:00 PM
Upgrade
// controllers/geminiController.js

import { genai } from '@google/genai';

import dotenv from 'dotenv';

dotenv.config();

// The SDK automatically uses process.env.GEMINI_API_KEY if available

const client = new genai.Client();

export const generateAIResponse = async (req, res) => {

    try {

        const { prompt } = req.body;

        if (!prompt) {

            return res.status(400).json({ error: "Prompt is required" });

        }

        // Using Gemini 2.5 Flash for high speed and low cost

        const response = await client.models.generateContent({

            model: "gemini-2.5-flash",

            contents: prompt

        });

        res.status(200).json({

            success: true,

            data: response.text

        });

    } catch (error) {

        console.error("Gemini API Error:", error);

        res.status(500).json({ 

            success: false, 

            error: "Failed to generate content from AI" 

        });

    }

};


Claude is AI and can make mistakes. Please double-check responses.
