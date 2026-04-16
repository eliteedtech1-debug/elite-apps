# Lesson Plans and Notes Module

A comprehensive lesson planning and note-taking system for the Elite Core School Management System, enabling teachers to create, submit, and manage lesson plans while allowing administrators to review and track teaching progress.

## 🎯 Features

### Teacher Features
- **Lesson Plan Creation**: Create detailed lesson plans with objectives, content, methods, and resources
- **Draft Management**: Save plans as drafts and edit before submission
- **Submission Workflow**: Submit plans for administrative review
- **Lesson Notes**: Create post-lesson notes with reflections and observations
- **Progress Tracking**: View submission status and admin feedback
- **Mobile Responsive**: Full functionality on mobile devices

### Admin Features
- **Review System**: Approve or reject submitted lesson plans with feedback
- **Progress Monitoring**: Track teacher submission rates and compliance
- **Analytics Dashboard**: View statistics and trends across the school
- **Teacher Management**: Monitor individual teacher performance
- **Reporting**: Generate reports on lesson plan quality and submission rates

### System Features
- **Multi-tenant Support**: School-specific data isolation
- **Role-based Access**: Different interfaces for teachers and administrators
- **Audit Trail**: Complete history of submissions and reviews
- **Integration Ready**: Connects with existing school management modules

## 🏗️ Architecture

```
Frontend (React + TypeScript)    Backend (Node.js + Express)    Database (MySQL)
├── Teacher Dashboard           ├── Lesson Plans Controller     ├── lesson_plans
├── Admin Dashboard            ├── Lesson Notes Controller     ├── lesson_notes
├── Mobile Components          ├── Authentication Middleware   ├── school_setup
├── API Services              ├── JWT Validation              └── Indexes
└── TypeScript Interfaces     └── Sequelize Models
```

## 📋 Prerequisites

- Node.js 16+ 
- MySQL 8.0+
- Existing Elite Core SMS installation
- JWT authentication system
- Ant Design UI library

## 🚀 Quick Start

### 1. Database Setup

```bash
# Run the schema migration
mysql -u root -p your_database < sql/lesson_plans_schema.sql

# Or use Sequelize migrations
cd elscholar-api
npx sequelize-cli db:migrate
```

### 2. Backend Setup

Add routes to your main Express app:

```javascript
// In your main app.js or index.js
const lessonPlansRoutes = require('./src/routes/lessonPlans');
const lessonNotesRoutes = require('./src/routes/lessonNotes');

app.use('/api/lesson-plans', lessonPlansRoutes);
app.use('/api/lesson-notes', lessonNotesRoutes);
```

### 3. Frontend Integration

Add components to your React application:

```typescript
// In your router configuration
import TeacherLessonPlansDashboard from './feature-module/academic/lesson-plans/TeacherLessonPlansDashboard';
import AdminLessonPlansDashboard from './feature-module/academic/lesson-plans/AdminLessonPlansDashboard';

// Add routes based on user role
{userRole === 'Teacher' && (
  <Route path="/lesson-plans" component={TeacherLessonPlansDashboard} />
)}
{userRole === 'Admin' && (
  <Route path="/admin/lesson-plans" component={AdminLessonPlansDashboard} />
)}
```

### 4. Module Activation

The module is automatically activated for all schools. To customize settings:

```sql
UPDATE school_setup 
SET settings = JSON_SET(settings, 
  '$.require_approval', true,
  '$.submission_deadline_hours', 24,
  '$.reminder_frequency_hours', 12,
  '$.auto_notifications', true
)
WHERE module_name = 'lesson_plans' AND school_id = 'YOUR_SCHOOL_ID';
```

## 🗄️ Database Schema

### Tables Created

1. **lesson_plans**
   - Complete lesson plan information
   - Teacher assignments and subjects
   - Approval workflow status
   - Admin feedback system

2. **lesson_notes**
   - Post-lesson reflections
   - Student participation tracking
   - Challenge identification
   - Improvement suggestions

### Key Relationships
```sql
lesson_plans (1) -> (many) lesson_notes
lesson_plans -> teachers (staff)
lesson_notes -> teachers (staff)
```

## 🔧 API Endpoints

### Lesson Plans
```http
POST   /api/lesson-plans              # Create lesson plan
GET    /api/lesson-plans              # List lesson plans
GET    /api/lesson-plans/stats        # Get statistics
GET    /api/lesson-plans/:id          # Get single plan
PUT    /api/lesson-plans/:id          # Update plan
POST   /api/lesson-plans/:id/submit   # Submit for review
POST   /api/lesson-plans/:id/review   # Admin review (approve/reject)
DELETE /api/lesson-plans/:id          # Delete draft plan
```

### Lesson Notes
```http
POST   /api/lesson-notes              # Create lesson note
GET    /api/lesson-notes              # List lesson notes
GET    /api/lesson-notes/stats        # Get statistics
GET    /api/lesson-notes/:id          # Get single note
PUT    /api/lesson-notes/:id          # Update note
POST   /api/lesson-notes/:id/submit   # Submit note
POST   /api/lesson-notes/:id/review   # Admin review
DELETE /api/lesson-notes/:id          # Delete draft note
```

### Request Examples

**Create Lesson Plan:**
```javascript
const lessonPlan = {
  subject_code: 'MATH101',
  class_code: 'CLASS-5A',
  topic: 'Introduction to Fractions',
  objectives: 'Students will understand basic fraction concepts',
  content: 'Detailed lesson content here...',
  teaching_methods: 'Interactive demonstrations',
  resources_needed: 'Fraction bars, whiteboard',
  assessment_methods: 'Quiz and practical exercises',
  homework_assignment: 'Complete worksheet 1-10',
  lesson_date: '2024-12-15',
  duration_minutes: 45
};

const response = await LessonPlansApi.createLessonPlan(lessonPlan);
```

**Submit for Review:**
```javascript
await LessonPlansApi.submitLessonPlan(planId);
```

**Admin Review:**
```javascript
await LessonPlansApi.reviewLessonPlan(
  planId, 
  'approved', 
  'Excellent structure and clear objectives'
);
```

## 📱 Mobile Responsiveness

The module is fully responsive with:

- **Adaptive Layouts**: Components adjust to screen size
- **Touch-Friendly**: Large buttons and touch targets
- **Mobile Navigation**: Optimized for mobile workflows
- **Offline Capability**: Draft saving works offline
- **Progressive Enhancement**: Core functionality works on all devices

### Mobile-Specific Features
```typescript
// Responsive grid system
<Row gutter={[16, 16]}>
  <Col xs={24} sm={12} md={8} lg={6}>
    <Card>Statistics</Card>
  </Col>
</Row>

// Mobile-optimized forms
<Form layout="vertical">
  <Form.Item>
    <Input.TextArea 
      rows={4} 
      placeholder="Enter content..."
      style={{ fontSize: '16px' }} // Prevents zoom on iOS
    />
  </Form.Item>
</Form>
```

## 🧪 Testing

### Backend Tests
```bash
cd elscholar-api
npm test -- --grep "Lesson Plans"

# Run specific test suites
npm test src/tests/lessonPlans.test.js
npm test src/tests/lessonNotes.test.js
```

### Frontend Tests
```bash
cd elscholar-ui
npm test -- --testPathPattern=lesson-plans

# Run component tests
npm test TeacherLessonPlansDashboard.test.tsx
npm test AdminLessonPlansDashboard.test.tsx
```

### Test Coverage
- **Controllers**: CRUD operations, validation, authorization
- **API Routes**: All endpoints with various scenarios
- **Components**: User interactions, form submissions, error handling
- **Integration**: End-to-end workflows

## 🔒 Security & Permissions

### Authentication
- JWT token validation on all endpoints
- Role-based access control (Teacher/Admin)
- School-specific data isolation

### Authorization Matrix
| Action | Teacher | Admin | Notes |
|--------|---------|-------|-------|
| Create Plan | ✅ | ✅ | Own plans only (Teacher) |
| View Plans | ✅ | ✅ | Own plans (Teacher), All plans (Admin) |
| Edit Plan | ✅ | ❌ | Draft status only |
| Submit Plan | ✅ | ❌ | Draft to Submitted |
| Review Plan | ❌ | ✅ | Approve/Reject |
| Delete Plan | ✅ | ✅ | Draft status only |

### Data Validation
```javascript
// Server-side validation
const validateLessonPlan = {
  topic: { required: true, maxLength: 255 },
  content: { required: true },
  lesson_date: { required: true, type: 'date' },
  subject_code: { required: true },
  class_code: { required: true }
};

// Client-side validation
<Form.Item
  name="topic"
  rules={[
    { required: true, message: 'Topic is required' },
    { max: 255, message: 'Topic too long' }
  ]}
>
```

## 📊 Analytics & Reporting

### Available Statistics
- Total lesson plans by status
- Submission rates by teacher
- Approval/rejection rates
- Time-based trends
- Subject-wise distribution

### Dashboard Metrics
```typescript
interface LessonPlanStats {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
}
```

### Custom Reports
```sql
-- Teacher performance report
SELECT 
  t.name as teacher_name,
  COUNT(*) as total_plans,
  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_plans,
  AVG(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) * 100 as approval_rate
FROM lesson_plans lp
JOIN teachers t ON lp.teacher_id = t.id
WHERE lp.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
GROUP BY t.id, t.name
ORDER BY approval_rate DESC;
```

## 🔄 Workflow States

### Lesson Plan Workflow
```
Draft → Submitted → Approved/Rejected
  ↑         ↓
  └─── Edit ←─── (if rejected)
```

### Status Transitions
- **Draft**: Editable by teacher, can be deleted
- **Submitted**: Under admin review, read-only
- **Approved**: Final state, archived
- **Rejected**: Can be edited and resubmitted

## 🚀 Deployment

### Environment Variables
```env
# Database
DB_HOST=localhost
DB_NAME=elite_scholar_db
DB_USERNAME=root
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret

# Module Settings
LESSON_PLANS_ENABLED=true
REQUIRE_PLAN_APPROVAL=true
SUBMISSION_DEADLINE_HOURS=24
```

### Production Deployment
```bash
# 1. Run database migrations
npm run migrate

# 2. Build frontend
npm run build

# 3. Start server
npm start

# 4. Verify module activation
curl -H "Authorization: Bearer $JWT_TOKEN" \
     http://localhost:34567/api/lesson-plans/stats
```

### Performance Optimization
- Database indexes on frequently queried columns
- Pagination for large datasets
- Lazy loading of components
- Caching of statistics
- Optimized SQL queries

## 🔧 Configuration

### School-Specific Settings
```javascript
// Module configuration in school_setup table
{
  "require_approval": true,
  "submission_deadline_hours": 24,
  "reminder_frequency_hours": 12,
  "auto_notifications": true,
  "allow_late_submissions": false,
  "max_draft_days": 7
}
```

### Customization Options
- Approval workflow (optional/required)
- Submission deadlines
- Notification preferences
- Template customization
- Field requirements

## 🐛 Troubleshooting

### Common Issues

**Module Not Appearing:**
```sql
-- Check module activation
SELECT * FROM school_setup 
WHERE module_name = 'lesson_plans' 
AND school_id = 'YOUR_SCHOOL_ID';

-- Activate if missing
INSERT INTO school_setup (school_id, module_name, is_active, settings)
VALUES ('YOUR_SCHOOL_ID', 'lesson_plans', 1, '{"require_approval": true}');
```

**Permission Errors:**
```javascript
// Verify JWT token includes required fields
{
  "id": 123,
  "user_type": "Teacher", // or "Admin"
  "school_id": "SCH/18",
  "branch_id": "BRCH00025"
}
```

**Database Connection Issues:**
```bash
# Test database connection
mysql -u root -p -e "SELECT 1 FROM lesson_plans LIMIT 1;"

# Check table structure
DESCRIBE lesson_plans;
```

## 📞 Support & Maintenance

### Monitoring
- API response times
- Database query performance
- User adoption rates
- Error rates and patterns

### Maintenance Tasks
- Regular database cleanup of old drafts
- Performance monitoring
- Security updates
- Feature usage analytics

### Getting Help
- Check server logs: `tail -f logs/app.log`
- Database logs: `tail -f logs/database.log`
- Frontend console for client-side issues
- API testing with Postman/curl

---

**Built for Elite Core School Management System**

*Last Updated: December 2024*
