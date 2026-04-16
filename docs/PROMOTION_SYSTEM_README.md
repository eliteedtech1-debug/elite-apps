# Student Promotion & Graduation System

## Overview
A comprehensive student promotion and graduation management system built with React (Ant Design) frontend and Node.js backend.

## Features

### 1. Student Promotion
- Promote students from one class to another
- Move students between sections
- Promote across academic years
- Bulk promotion with validation
- Automatic enrollment record updates

### 2. Student Graduation
- Graduate students and mark them as alumni
- Record graduation dates
- Maintain graduation history
- Generate graduation reports

### 3. Intelligent Selection
- **Auto-Select Eligible**: Automatically selects students meeting criteria
- **Manual Override**: Option to promote students who don't meet automatic criteria
- **Customizable Criteria**:
  - Minimum attendance percentage (default: 75%)
  - Minimum average score (default: 40%)
  - Exam pass requirement
  - Manual override toggle

### 4. Advanced UI Features
- **4-Step Wizard**: Setup → Select Students → Review → Complete
- **Real-time Statistics**: Total, Selected, Eligible, Passed counts
- **Visual Progress**: Progress bars for scores and attendance
- **Search & Filter**: Find students by name or admission number
- **Bulk Operations**: Select all, clear, auto-select eligible

## API Endpoints

### POST `/students/promote`
Promote or graduate students

**Request Body:**
```json
{
  "school_id": "SCH/1",
  "branch_id": "BRCH00001",
  "current_academic_year": "2024/2025",
  "next_academic_year": "2025/2026",
  "current_class": "CLS0001",
  "current_section": "Primary",
  "next_class": "CLS0002",
  "next_section": "Primary",
  "promotion_type": "promote",
  "students": ["ADM001", "ADM002"],
  "effective_date": "2025-09-01",
  "created_by": "USR001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully promoted 2 student(s)",
  "data": {
    "promoted": [
      {
        "admission_no": "ADM001",
        "status": "promoted",
        "from": "JSS1 - Primary",
        "to": "JSS2 - Primary"
      }
    ],
    "summary": {
      "total_requested": 2,
      "successful": 2,
      "failed": 0,
      "promotion_type": "promote"
    }
  }
}
```

### GET `/students/promotion-history`
Get promotion history for a school

**Query Parameters:**
- `school_id` (required)
- `branch_id` (optional)
- `academic_year` (optional)
- `promotion_type` (optional): 'promote' or 'graduate'
- `limit` (optional, default: 100)

## Database Schema

### `student_promotion_history` Table
```sql
CREATE TABLE `student_promotion_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `admission_no` VARCHAR(50) NOT NULL,
  `from_class` VARCHAR(50) NOT NULL,
  `from_section` VARCHAR(50) NOT NULL,
  `to_class` VARCHAR(50) NULL,
  `to_section` VARCHAR(50) NULL,
  `from_academic_year` VARCHAR(50) NOT NULL,
  `to_academic_year` VARCHAR(50) NOT NULL,
  `promotion_type` ENUM('promote', 'graduate') DEFAULT 'promote',
  `effective_date` DATE NOT NULL,
  `created_by` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `students` Table - New Columns
```sql
ALTER TABLE `students`
  ADD COLUMN `promoted_date` DATE NULL,
  ADD COLUMN `promoted_by` VARCHAR(50) NULL,
  ADD COLUMN `graduation_date` DATE NULL,
  ADD COLUMN `graduated_by` VARCHAR(50) NULL;
```

## Frontend Usage

### Component Location
```
elscholar-ui/src/feature-module/peoples/students/student-promotion/index.tsx
```

### Key Features

#### Step 1: Setup
- Select promotion type (Promote or Graduate)
- Choose current academic year, section, and class
- Choose target academic year, section, and class
- Set promotion criteria
- Set effective date

#### Step 2: Select Students
- View all students in selected class
- Statistics cards showing totals
- Search by name or admission number
- Filter by exam result
- Auto-select eligible students
- Manual selection override

#### Step 3: Review
- Review promotion details
- See selected students list
- Confirm all information
- Final confirmation modal

#### Step 4: Success
- Success confirmation
- Download report option
- Start new promotion

## Installation

### Backend Setup

1. **Install the route:**
```javascript
// In src/index.js
require("./routes/student_promotion.js")(app);
```

2. **Run the migration:**
```bash
mysql -u root skcooly_db < src/migrations/create_student_promotion_history.sql
```

3. **Verify installation:**
```bash
mysql -u root skcooly_db -e "DESCRIBE student_promotion_history;"
```

### Frontend Setup

The component is already integrated. Just navigate to:
```
/students/student-promotion
```

## Usage Examples

### Example 1: Promote Class to Next Level
```javascript
// Promote all JSS1 students to JSS2
{
  "promotion_type": "promote",
  "current_class": "JSS1",
  "next_class": "JSS2",
  "students": ["ADM001", "ADM002", "ADM003"]
}
```

### Example 2: Graduate Final Year Students
```javascript
// Graduate SSS3 students
{
  "promotion_type": "graduate",
  "current_class": "SSS3",
  "students": ["ADM050", "ADM051"]
}
```

### Example 3: Cross-Section Promotion
```javascript
// Promote from Primary section to Secondary section
{
  "current_section": "Primary",
  "current_class": "JSS3",
  "next_section": "Secondary",
  "next_class": "SSS1",
  "students": ["ADM020"]
}
```

## Business Logic

### Promotion Workflow
1. Validate all required fields
2. Start database transaction
3. For each student:
   - Update student record (class, section, academic year)
   - Record promotion date and user
   - Insert promotion history record
4. Commit transaction
5. Return success/error summary

### Graduation Workflow
1. Validate required fields
2. Start database transaction
3. For each student:
   - Update student status to 'Graduated'
   - Set graduation date
   - Record graduated_by user
   - Insert graduation history record
4. Commit transaction
5. Return success/error summary

## Error Handling

### Frontend
- Validates all required fields before submission
- Shows user-friendly error messages
- Prevents duplicate submissions
- Confirms destructive actions

### Backend
- Transaction-based operations (all or nothing)
- Individual student error tracking
- Returns detailed error information
- Automatic rollback on failure

## Security

- JWT authentication required
- School and branch validation
- User tracking (created_by field)
- Transaction integrity
- Input validation and sanitization

## Performance Optimizations

- Bulk operations in single transaction
- Indexed database columns
- Efficient SQL queries
- Frontend lazy loading
- Pagination for large student lists

## Future Enhancements

- [ ] Email notifications to parents
- [ ] SMS notifications
- [ ] Print promotion certificates
- [ ] Undo promotion feature
- [ ] Promotion approval workflow
- [ ] Custom promotion criteria per school
- [ ] Integration with report cards
- [ ] Batch import from Excel

## Support

For issues or questions:
1. Check the API response for detailed error messages
2. Review server logs in console
3. Verify database schema is up to date
4. Ensure all required fields are provided

## Version History

- **v1.0.0** (2025-01-09): Initial release
  - Student promotion
  - Student graduation
  - Promotion history tracking
  - Full Ant Design UI
  - 4-step wizard workflow
