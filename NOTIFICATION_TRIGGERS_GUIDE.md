# Notification Trigger System

## Overview
Automated notification system with smart retention policies for different event types.

## Database: `elite_logs`

### Tables
1. **`system_notifications`** - Stores all notifications with UUID
2. **`notification_triggers`** - Defines trigger events and retention policies

## Retention Policies

### 1. **PERMANENT** (Keep Forever)
- Assignment published/deadlines
- Virtual class schedules
- Role assignments
- Exam schedules
- Results published
- Fee invoices
- Payment confirmations

### 2. **TEMPORARY** (Auto-delete after X days)
- Attendance marked (7 days)
- Class cancelled (3 days)
- Homework reminders (2 days)
- Meeting reminders (1 day)

### 3. **AUTO-DELETE** (Delete after read)
- Login alerts
- Password changes
- Document uploads

## Usage Examples

### 1. Assignment Published
```javascript
const notificationTrigger = require('./services/notificationTriggerService');

await notificationTrigger.triggerAssignmentPublished({
  title: 'Math Homework',
  class: 'JSS 1A',
  class_code: 'CLS001',
  due_date: '2026-02-15',
  school_id: 'SCH/20',
  branch_id: 'BRCH00027',
  link: '/assignments/view/123'
});
```

### 2. Virtual Class Scheduled
```javascript
await notificationTrigger.triggerVirtualClassScheduled({
  subject: 'Mathematics',
  class_code: 'CLS001',
  date: '2026-02-12',
  time: '10:00 AM',
  school_id: 'SCH/20',
  branch_id: 'BRCH00027',
  link: '/virtual-class/join/456'
});
```

### 3. Role Assigned
```javascript
await notificationTrigger.triggerRoleAssigned({
  user_id: 123,
  role_name: 'Class Teacher',
  school_id: 'SCH/20',
  branch_id: 'BRCH00027'
});
```

### 4. Attendance Marked (Temporary)
```javascript
await notificationTrigger.triggerAttendanceMarked({
  admission_no: 'STD/2024/001',
  date: '2026-02-11',
  school_id: 'SCH/20',
  branch_id: 'BRCH00027'
});
// Auto-deletes after 7 days OR when read
```

## Cleanup Job

Add to cron or scheduler:
```javascript
const notificationTrigger = require('./services/notificationTriggerService');

// Run daily
setInterval(() => {
  notificationTrigger.cleanupExpiredNotifications();
}, 24 * 60 * 60 * 1000); // Every 24 hours
```

## Integration Points

### Assignments Controller
```javascript
// In createAssignment or publishAssignment
const notificationTrigger = require('../services/notificationTriggerService');

await notificationTrigger.triggerAssignmentPublished({
  title: assignment.title,
  class: assignment.class_name,
  class_code: assignment.class_code,
  due_date: assignment.due_date,
  school_id: req.user.school_id,
  branch_id: req.user.branch_id,
  link: `/assignments/view/${assignment.id}`
});
```

### Virtual Classroom Controller
```javascript
// In scheduleClass
await notificationTrigger.triggerVirtualClassScheduled({
  subject: classData.subject,
  class_code: classData.class_code,
  date: classData.date,
  time: classData.time,
  school_id: req.user.school_id,
  branch_id: req.user.branch_id,
  link: `/virtual-class/join/${classData.id}`
});
```

### Staff Management Controller
```javascript
// In assignRole
await notificationTrigger.triggerRoleAssigned({
  user_id: staffId,
  role_name: roleName,
  school_id: req.user.school_id,
  branch_id: req.user.branch_id
});
```

## Available Triggers

| Event | Category | Retention | Recipients |
|-------|----------|-----------|------------|
| `assignment_published` | academic | permanent | student, parent |
| `assignment_deadline_reminder` | academic | permanent | student, parent |
| `virtual_class_scheduled` | academic | permanent | student, teacher, parent |
| `role_assigned` | system | permanent | teacher, staff |
| `exam_published` | academic | permanent | student, parent, teacher |
| `result_published` | academic | permanent | student, parent |
| `fee_invoice` | finance | permanent | student, parent |
| `payment_received` | finance | permanent | student, parent |
| `attendance_marked` | attendance | 7 days | student |
| `class_cancelled` | academic | 3 days | student, teacher, parent |
| `homework_reminder` | academic | 2 days | student |
| `meeting_reminder` | general | 1 day | teacher, staff |
| `login_alert` | security | auto-delete | all |
| `password_changed` | security | auto-delete | all |
| `document_uploaded` | general | auto-delete | all |

## Testing

```bash
# View notifications
mysql -u root elite_logs -e "SELECT * FROM system_notifications ORDER BY created_at DESC LIMIT 10;"

# View triggers
mysql -u root elite_logs -e "SELECT * FROM notification_triggers;"

# Check expired
mysql -u root elite_logs -e "SELECT COUNT(*) FROM system_notifications WHERE expires_at < NOW();"
```
