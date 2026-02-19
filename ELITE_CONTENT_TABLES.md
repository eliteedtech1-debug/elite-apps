# elite_content Database - Final Table List

> **Database:** elite_content  
> **Purpose:** Educational materials & curriculum  
> **Total:** 35 tables, ~4,200 rows, ~7.5 MB

---

## 📚 Complete Table List

### 1. Lesson Management (7 tables)
| Table | Rows | Size | Description |
|-------|------|------|-------------|
| `lesson_plans` | 5 | 0.16 MB | Teacher lesson plans |
| `lesson_notes` | 0 | 0.09 MB | Post-lesson reflections |
| `lesson_plan_reviews` | 0 | 0.08 MB | Lesson plan approval workflow |
| `lesson_comments` | 0 | 0.02 MB | Comments on lessons |
| `lesson_time_table` | 73 | 0.11 MB | Class scheduling/timetable |
| `lesson_time_table_backup` | 3 | 0.02 MB | Timetable backup |
| `lessons` | 4 | 0.08 MB | Legacy lesson records |

---

### 2. Syllabus & Curriculum (3 tables)
| Table | Rows | Size | Description |
|-------|------|------|-------------|
| `syllabus` | 30 | 0.02 MB | Curriculum topics by term/week |
| `syllabus_tracker` | 10 | 0.13 MB | Syllabus progress tracking |
| `syllabus_suggestions` | 5 | 0.03 MB | AI-generated syllabus suggestions |

---

### 3. Subject Management (5 tables)
| Table | Rows | Size | Description |
|-------|------|------|-------------|
| `subjects` | 2,573 | 4.92 MB | Subject definitions ⚠️ LARGEST |
| `predefined_subjects` | 67 | 0.08 MB | System-wide subject templates |
| `student_subjects` | 46 | 0.11 MB | Student-subject enrollment |
| `school_subject_mapping` | 4 | 0.09 MB | School-specific subject mappings |
| `subject_streams` | 0 | 0.02 MB | Subject categorization/streams |

---

### 4. Recitation System (3 tables)
| Table | Rows | Size | Description |
|-------|------|------|-------------|
| `recitations` | 0 | 0.05 MB | Audio recitation assignments |
| `recitation_replies` | 0 | 0.17 MB | Student audio submissions |
| `recitation_feedbacks` | 0 | 0.13 MB | Teacher feedback on recitations |

---

### 5. Knowledge Domains (4 tables)
| Table | Rows | Size | Description |
|-------|------|------|-------------|
| `knowledge_domains` | 0 | 0.08 MB | Assessment domains (cognitive, affective) |
| `knowledge_domain_criteria` | 0 | 0.06 MB | Domain assessment criteria |
| `knowledge_domains_simplified` | 0 | 0.09 MB | Simplified domain structure |
| `knowledge_domains_enhanced` | 0 | 0.11 MB | Enhanced domain structure |

---

### 6. Assignments & Homework (5 tables)
| Table | Rows | Size | Description |
|-------|------|------|-------------|
| `assignments` | 3 | 0.20 MB | Teacher assignments/homework |
| `student_assignments` | 0 | 0.02 MB | Student assignment submissions |
| `assignment_questions` | 2 | 0.05 MB | Assignment question bank |
| `assignment_responses` | 0 | 0.05 MB | Student responses to assignments |
| `assignment_question_options` | 0 | 0.03 MB | MCQ options for assignments |

---

### 7. Virtual Classroom (6 tables)
| Table | Rows | Size | Description |
|-------|------|------|-------------|
| `virtual_classrooms` | 6 | 0.16 MB | Virtual classroom sessions |
| `virtual_classroom_participants` | 36 | 0.13 MB | Session participants |
| `virtual_classroom_attendance` | 0 | 0.09 MB | Attendance tracking |
| `virtual_classroom_chat_messages` | 0 | 0.11 MB | In-session chat messages |
| `virtual_classroom_recordings` | 0 | 0.09 MB | Session recordings |
| `virtual_classroom_notifications` | 55 | 0.16 MB | Virtual class notifications |

---

### 8. Teacher Assignments (2 tables)
| Table | Rows | Size | Description |
|-------|------|------|-------------|
| `teacher_classes` | 1,096 | 0.33 MB | Teacher-subject-class assignments |
| `class_timing` | 39 | 0.08 MB | Class schedule/timing configuration |

---

## 📊 Summary Statistics

### By Category
```
Lesson Management:     7 tables,    85 rows,  0.56 MB
Syllabus & Curriculum: 3 tables,    45 rows,  0.18 MB
Subject Management:    5 tables, 2,690 rows,  5.22 MB (70% of data)
Recitation System:     3 tables,     0 rows,  0.35 MB
Knowledge Domains:     4 tables,     0 rows,  0.34 MB
Assignments:           5 tables,     5 rows,  0.35 MB
Virtual Classroom:     6 tables,    97 rows,  0.74 MB
Teacher Assignments:   2 tables, 1,135 rows,  0.41 MB
```

### Overall
```
Total Tables:  35
Total Rows:    ~4,200
Total Size:    ~7.5 MB
Largest Table: subjects (2,573 rows, 4.92 MB)
```

---

## 🔧 Stored Procedures (11 procedures)

| Procedure | Purpose |
|-----------|---------|
| `lessons` | Manage lessons table |
| `lesson_comments` | Manage lesson comments |
| `lesson_time_table` | Manage timetable |
| `syllabus` | Manage syllabus topics |
| `syllabusTracker` | Track syllabus progress |
| `subjects` | Manage subjects |
| `subject_management` | Advanced subject operations |
| `assignments` | Manage assignments |
| `assignment_questions` | Manage assignment questions |
| `GetSubjectsByClass` | Get subjects for a class |
| `GetStudentsByClassSubject` | Get students by subject |

---

## 📝 Controllers Using elite_content (13 controllers)

| Controller | Primary Tables |
|------------|----------------|
| `lessonPlansController.js` | lesson_plans, lesson_plan_reviews |
| `syllabusController.js` | syllabus, syllabus_tracker |
| `recitationsController.js` | recitations, recitation_replies, recitation_feedbacks |
| `lessonNotesController.js` | lesson_notes, lesson_plans |
| `subjectMappingController.js` | subjects, school_subject_mapping |
| `assignments.js` | assignments, assignment_questions |
| `virtualClassroom.js` | virtual_classrooms, virtual_classroom_* |
| `lesson_time_table.js` | lesson_time_table |
| `lessons.js` | lessons, lesson_comments |
| `school-setups.js` | syllabus, syllabus_tracker |
| `predefinedSubjects.js` | predefined_subjects |
| `teachers.js` | teacher_classes |
| `class_timing.js` | class_timing |

---

## 🚫 NOT in elite_content

### System Configuration (Stay in elite_core)
```
❌ users, roles, permissions
❌ rbac_* tables (all RBAC tables)
❌ school_setup, school_locations
❌ system_config, report_configurations
❌ exam_remarks (student report card comments)
```

### Assessment Data (Goes to elite_assessment)
```
❌ ca_setup, ca_configurations
❌ character_traits, character_scores
❌ weekly_scores (CA scores)
❌ grade_boundaries, grading_systems
❌ exam_questions, exam_responses
```

### Financial Data (Goes to elite_finance)
```
❌ payment_entries, student_ledgers
❌ payroll_periods, payroll_lines
❌ journal_entries, chart_of_accounts
❌ payment_gateway_config
```

---

## ✅ Migration Readiness

### Ready to Migrate
- ✅ All 35 tables identified
- ✅ All 11 stored procedures mapped
- ✅ All 13 controllers documented
- ✅ Cross-database relationships identified
- ✅ Bloat tables identified for cleanup

### Next Steps
1. Create elite_content database
2. Export schemas and procedures
3. Migrate data (phased approach)
4. Update controller imports
5. Test all endpoints
6. Monitor for 7 days
7. Cleanup old tables

---

*Last Updated: 2026-02-12*
