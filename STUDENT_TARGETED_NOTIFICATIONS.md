# Student Notifications - Targeted Audience

## Overview
Students can now see only their own notifications, targeted specifically to them as the audience.

## Database Setup ✅

### Notification Trigger
```sql
INSERT INTO elite_logs.notification_triggers 
(trigger_event, title_template, message_template, category, retention_policy, notify_roles) 
VALUES 
('student_announcement', 'Announcement: {{title}}', '{{message}}', 'announcement', 'permanent', '["student"]');
```

### Test Notifications Created
For student DKG/1/0001 (ID: 3876):
```sql
-- Test notification 1
INSERT INTO system_notifications 
(id, user_id, school_id, branch_id, title, message, type, category, is_read) 
VALUES 
(UUID(), 3876, 'SCH/23', 'BRCH/29', 'Test Notification', 'This is a test notification for student', 'notification', 'general', 0);

-- Welcome notification
INSERT INTO system_notifications 
(id, user_id, school_id, branch_id, title, message, type, category, is_read, metadata) 
VALUES 
(UUID(), 3876, 'SCH/23', 'BRCH/29', 'Welcome to Elite Scholar', 'You can now view all your notifications here. Stay updated with assignments, exams, and announcements.', 'notification', 'announcement', 0, '{"audience": "student"}');
```

### Verification
```bash
mysql> SELECT COUNT(*) as total, SUM(is_read=0) as unread 
       FROM system_notifications WHERE user_id=3876;
+-------+--------+
| total | unread |
+-------+--------+
|     2 |      2 |
+-------+--------+
```

## API Behavior

### Student View (Inbox)
```bash
GET /api/system/notifications
Authorization: Bearer STUDENT_TOKEN

Response:
{
  "success": true,
  "view": "inbox",
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "title": "Welcome to Elite Scholar",
        "message": "You can now view all your notifications...",
        "category": "announcement",
        "is_read": 0,
        "created_at": "2026-02-11T18:00:00.000Z"
      },
      {
        "id": "uuid",
        "title": "Test Notification",
        "message": "This is a test notification for student",
        "category": "general",
        "is_read": 0,
        "created_at": "2026-02-11T17:30:00.000Z"
      }
    ],
    "unreadCount": 2
  }
}
```

### Admin View (Dashboard)
```bash
GET /api/system/notifications
Authorization: Bearer ADMIN_TOKEN

Response:
{
  "success": true,
  "view": "dashboard",
  "data": {
    "stats": {
      "total_notifications": 150,
      "unread_count": 45,
      "today_count": 12,
      "week_count": 67
    },
    "notifications": [...],
    "categoryBreakdown": [...]
  }
}
```

## Backend Service Methods

### 1. Send to All Students
```javascript
const notificationTrigger = require('./services/notificationTriggerService');

await notificationTrigger.triggerStudentAnnouncement({
  title: 'School Closure',
  message: 'School will be closed tomorrow due to public holiday',
  school_id: 'SCH/23',
  branch_id: 'BRCH/29',
  link: '/announcements/notice-board'
});
```

### 2. Send to Specific Student
```javascript
await notificationTrigger.sendToStudent(
  3876, // student ID
  'Assignment Graded',
  'Your Math assignment has been graded. Score: 85/100',
  {
    school_id: 'SCH/23',
    branch_id: 'BRCH/29',
    link: '/student/assignments'
  }
);
```

### 3. Send to Class Students
```javascript
const students = await db.sequelize.query(
  `SELECT u.id FROM users u 
   INNER JOIN students s ON u.id = s.id 
   WHERE s.class_code = ? AND s.school_id = ?`,
  { 
    replacements: ['JSS1A', 'SCH/23'],
    type: db.Sequelize.QueryTypes.SELECT 
  }
);

await notificationTrigger.sendNotification('assignment_published', {
  title: 'New Assignment',
  class: 'JSS 1A',
  due_date: '2026-02-20',
  school_id: 'SCH/23',
  branch_id: 'BRCH/29'
}, students.map(s => s.id));
```

## Notification Types for Students

### Permanent (Keep Forever)
- ✅ Assignment published
- ✅ Assignment deadline reminders
- ✅ Virtual class schedules
- ✅ Exam schedules
- ✅ Results published
- ✅ Fee invoices
- ✅ Payment confirmations
- ✅ Notice board announcements
- ✅ Student announcements

### Temporary (Auto-delete)
- ✅ Attendance marked (7 days)
- ✅ Class cancelled (3 days)
- ✅ Homework reminders (2 days)

### Auto-delete After Read
- ✅ Login alerts
- ✅ Document uploads

## Frontend Display

### Student Dashboard
```
🔔 Notifications (2)
├── Welcome to Elite Scholar (unread)
├── Test Notification (unread)
└── [Load more...]
```

### Notification Page
**URL:** `/system/notifications`

**Features:**
- ✅ View all notifications
- ✅ Mark as read/unread
- ✅ Filter by category
- ✅ Real-time updates
- ✅ Unread count badge

## Query Logic

### Student Query (Inbox View)
```sql
SELECT * FROM system_notifications 
WHERE user_id = ? AND school_id = ?
ORDER BY created_at DESC
LIMIT 20
```

### Admin Query (Dashboard View)
```sql
-- Shows aggregated stats and bulk notifications
SELECT * FROM system_notifications
WHERE school_id = ? AND (
  is_bulk = 1 OR 
  (is_bulk = 0 AND id = (
    SELECT MIN(id) FROM system_notifications s2 
    WHERE s2.title = system_notifications.title 
    AND s2.message = system_notifications.message 
    AND s2.school_id = ?
  ))
)
ORDER BY created_at DESC
LIMIT 20
```

## Audience Targeting

### How It Works:
1. ✅ Notification created with `user_id` = student ID
2. ✅ Student queries: `WHERE user_id = ?`
3. ✅ Only sees their own notifications
4. ✅ No access to other students' notifications
5. ✅ No access to admin/staff notifications

### Security:
```javascript
// Backend automatically filters by user_id for students
if (user_type.toLowerCase() !== 'admin') {
  const notifications = await auditDb.query(
    'SELECT * FROM system_notifications WHERE user_id = ? AND school_id = ?',
    { replacements: [userId, school_id] }
  );
}
```

## Testing

### 1. Check Student Notifications
```bash
curl -s 'http://localhost:34567/api/system/notifications' \
  -H 'Authorization: Bearer STUDENT_TOKEN' | jq '.data.notifications | length'
```

### 2. Verify Unread Count
```bash
curl -s 'http://localhost:34567/api/system/notifications' \
  -H 'Authorization: Bearer STUDENT_TOKEN' | jq '.data.unreadCount'
```

### 3. Database Verification
```sql
-- Check student notifications
SELECT id, title, is_read, created_at 
FROM elite_logs.system_notifications 
WHERE user_id = 3876 
ORDER BY created_at DESC;

-- Check unread count
SELECT COUNT(*) as unread 
FROM elite_logs.system_notifications 
WHERE user_id = 3876 AND is_read = 0;
```

## Integration Examples

### Assignment Controller
```javascript
// When teacher publishes assignment
const students = await getClassStudents(assignment.class_code);

await notificationTrigger.sendNotification('assignment_published', {
  title: assignment.title,
  class: assignment.class_name,
  due_date: assignment.due_date,
  school_id: req.user.school_id,
  branch_id: req.user.branch_id,
  link: `/student/assignments/${assignment.id}`
}, students.map(s => s.id));
```

### Exam Controller
```javascript
// When exam results are published
const students = await getExamStudents(exam.id);

await notificationTrigger.sendNotification('result_published', {
  title: `Results: ${exam.name}`,
  message: 'Your exam results are now available',
  school_id: req.user.school_id,
  branch_id: req.user.branch_id,
  link: `/student/results/${exam.id}`
}, students.map(s => s.id));
```

### Fee Controller
```javascript
// When fee invoice is generated
await notificationTrigger.sendToStudent(
  studentId,
  `Fee Invoice: ${term}`,
  `New fee invoice for ${term} - Amount: ₦${amount}`,
  {
    school_id: req.user.school_id,
    branch_id: req.user.branch_id,
    link: `/student/fees`
  }
);
```

## Summary

✅ **Student-Specific Notifications**
- Only sees their own notifications
- Targeted by `user_id`
- Secure query filtering

✅ **Notification Triggers**
- `student_announcement` - General announcements
- `assignment_published` - New assignments
- `result_published` - Exam results
- `fee_invoice` - Fee notifications
- `attendance_marked` - Attendance updates

✅ **API Endpoints**
- `GET /api/system/notifications` - View notifications
- `POST /api/system/notifications/mark-read` - Mark as read
- `POST /api/system/notifications/mark-all-read` - Mark all as read

✅ **Real-time Updates**
- Socket.IO integration
- Instant notification delivery
- Unread count badge updates

**Student:** DKG/1/0001 (ID: 3876)  
**Notifications:** 2 unread  
**Database:** `elite_logs.system_notifications`
