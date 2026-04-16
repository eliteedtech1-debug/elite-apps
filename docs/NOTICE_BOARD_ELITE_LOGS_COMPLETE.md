# Notice Board & Notification System - Complete

## Database: `elite_logs`

### Tables
1. **`notice_board`** - All school notices/announcements
2. **`system_notifications`** - Real-time notifications
3. **`notification_triggers`** - Automated notification rules

---

## Notice Board Features

### Audience Types (Excluding Super Admin)
- ✅ Student
- ✅ Parent
- ✅ Admin
- ✅ Teacher
- ✅ Accountant
- ✅ Librarian
- ✅ Receptionist
- ❌ **Super Admin** (Excluded - system health monitoring only)

### Notice Fields
```javascript
{
  id: UUID,
  title: string,
  description: text,
  content: longtext,
  status: 'draft' | 'published' | 'archived',
  priority: 'low' | 'normal' | 'high' | 'urgent',
  due_date: date,
  publish_date: datetime,
  category: 'Notice' | 'Announcement' | 'Event' | 'Alert' | 'General',
  audience: JSON array, // ["student", "parent", "teacher"]
  attachments: JSON array,
  views_count: int,
  school_id: string,
  branch_id: string,
  created_by: int,
  created_by_name: string
}
```

---

## API Endpoints

### Create Notice
```bash
POST /notice-board
{
  "query_type": "create",
  "title": "Opening Date",
  "description": "All should come to school",
  "message_to": "student,parent,teacher",
  "due_date": "2026-02-19",
  "post_date": "2026-02-11",
  "category": "notice",
  "status": "active",
  "branch_id": "BRCH/29",
  "created_by": 1208
}
```

### Get Notices
```bash
GET /notice-board?query_type=select&branch_id=BRCH/29
```

### Update Notice
```bash
POST /notice-board
{
  "query_type": "update",
  "id": "uuid",
  "title": "Updated Title",
  ...
}
```

### Delete Notice
```bash
POST /notice-board
{
  "query_type": "delete",
  "id": "uuid"
}
```

---

## Notification System

### Automatic Triggers

When a notice is **published**, the system automatically:
1. ✅ Identifies target audience from `message_to` field
2. ✅ Filters out `super_admin` and `superadmin` users
3. ✅ Maps audience to correct user_type casing:
   - `student` → `Student`
   - `teacher` → `Teacher`
   - `parent` → `parent`
   - `admin` → `admin`
   - `accountant` → `accountant`
   - `librarian` → `librarian`
   - `receptionist` → `receptionist`
4. ✅ Queries users from `full_skcooly.users` table
5. ✅ Creates notifications in `elite_logs.system_notifications`
6. ✅ Sends real-time Socket.IO events to connected users

### Notification Trigger: `notice_published`
```javascript
{
  trigger_event: 'notice_published',
  title_template: 'New Notice: {{title}}',
  message_template: '{{description}}',
  category: 'announcement',
  retention_policy: 'permanent',
  notify_roles: ["all"]
}
```

---

## Super Admin Exclusion

### Why Super Admin is Excluded:
- **Role**: System health monitoring and maintenance
- **Focus**: Cross-school analytics, system performance, summaries
- **Not Involved In**: Day-to-day school operations, notices, announcements

### Implementation:
```javascript
// Frontend - removed from options
const userTypeOptions = [
  'student', 'parent', 'admin', 'teacher',
  'accountant', 'librarian', 'receptionist'
  // 'super_admin' - REMOVED
];

// Backend - filtered from notifications
const filteredAudience = audienceArray.filter(a => 
  !['super_admin', 'superadmin'].includes(a.toLowerCase())
);

// SQL - excluded from query
WHERE user_type NOT IN ('super_admin', 'superadmin')
```

---

## Frontend Integration

### Page: `/announcements/notice-board`

**Features:**
- ✅ Table view with search and filters
- ✅ Calendar view for date-based notices
- ✅ Create/Edit/Delete notices
- ✅ Multi-select audience targeting
- ✅ File attachments support
- ✅ Priority levels
- ✅ Status management (draft/published/archived)

**Fixed Issues:**
- ✅ `CalendarIcon` → `CalendarOutlined`
- ✅ Data display after creation
- ✅ Proper field mapping (`post_date`, `message_to`)

---

## Database Migration Status

### Completed:
- ✅ `notice_board` table created in `elite_logs` with UUID
- ✅ Existing data migrated from `full_skcooly.notice_board`
- ✅ Enhanced schema with new fields
- ✅ Indexes for performance

### Migration File:
`elscholar-api/src/migrations/migrate_notice_board_to_elite_logs.sql`

---

## Testing

### Create Notice
```bash
curl -X POST http://localhost:34567/notice-board \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query_type": "create",
    "title": "Test Notice",
    "description": "Test description",
    "message_to": "student,parent",
    "status": "active",
    "category": "notice"
  }'
```

### Verify in Database
```bash
# Check notice
mysql -u root elite_logs -e "SELECT id, title, status, audience FROM notice_board ORDER BY created_at DESC LIMIT 5;"

# Check notifications
mysql -u root elite_logs -e "SELECT id, title, user_id, category FROM system_notifications WHERE title LIKE '%Test Notice%' LIMIT 5;"
```

### Check Recipients
```bash
mysql -u root full_skcooly -e "SELECT COUNT(*) as count, user_type FROM users WHERE school_id='SCH/23' AND user_type IN ('Student','parent') GROUP BY user_type;"
```

---

## Configuration

### Environment Variables (.env)
```bash
# Audit Database (elite_logs)
AUDIT_DB_NAME=elite_logs
AUDIT_DB_HOST=localhost
AUDIT_DB_USERNAME=root
AUDIT_DB_PASSWORD=
AUDIT_DB_PORT=3306
```

### Database Connection
```javascript
const { getAuditConnection } = require('../config/database');
const auditDb = await getAuditConnection();
```

---

## Summary

✅ **Notice Board** moved to `elite_logs` database  
✅ **Super Admin** excluded from all notices and notifications  
✅ **Automatic notifications** sent to targeted audience on publish  
✅ **Real-time delivery** via Socket.IO  
✅ **UUID-based** primary keys  
✅ **Enhanced schema** with priority, attachments, views  
✅ **Frontend fixed** - CalendarIcon error resolved  
✅ **Data display** working correctly after creation  

**Location:** `http://localhost:3000/announcements/notice-board`
