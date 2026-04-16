# 🗄️ Elite Core Database Architecture - Final

**Status:** Planned  
**Total Databases:** 8

---

## Database Overview

### 1. full_skcooly (Core/Shared)
**Purpose:** Authentication, users, schools, shared reference data  
**Size:** ~500 MB  
**Tables:** ~30-40 tables  
**ID Type:** INT (existing)

**Key Tables:**
- users, schools, branches
- permissions, roles
- settings, configurations
- shared lookup tables

---

### 2. skcooly_audit (Logs & Compliance)
**Purpose:** All audit trails and system logs  
**Size:** ~2-5 GB (growing)  
**Tables:** 3 tables  
**ID Type:** UUID

**Key Tables:**
- audit_trails (UUID) - All system audit logs
- elite_logs (UUID) - Notifications, messages, communications
- crash_reports (INT) - Error logs

**Future:** All message logs (SMS, email, WhatsApp, push)

---

### 3. elite_bot (AI & Chatbot)
**Purpose:** AI, chatbot, machine learning  
**Size:** ~1-2 GB  
**Tables:** 3 tables  
**ID Type:** UUID

**Key Tables:**
- chatbot_conversations (UUID)
- chatbot_intents (UUID)
- chatbot_knowledge_base (UUID)

---

### 4. elite_hr (Human Resources)
**Purpose:** Staff management, payroll, HR operations  
**Size:** ~500 MB  
**Tables:** ~15-20 tables  
**ID Type:** INT (to be decided)

**Key Tables:**
- staff, payroll_lines
- attendance (staff)
- leave_requests, leave_types
- departments, designations
- grade_levels, salary_structure
- performance_reviews
- training_records

**Cross-DB References:**
- users (main DB)
- schools, branches (main DB)

---

### 5. elite_finance (Finance & Accounting)
**Purpose:** Financial management, accounting, billing  
**Size:** ~2-3 GB  
**Tables:** ~25-30 tables  
**ID Type:** INT (to be decided)

**Key Tables:**
- payment_entries, journal_entries
- chart_of_accounts, account_categories
- fee_structures, fee_items
- invoices, receipts, refunds
- budgets, budget_lines
- expenses, expense_categories
- bank_accounts, bank_transactions
- reconciliations
- financial_years, accounting_periods

**Cross-DB References:**
- students (academic DB)
- staff (HR DB)
- users (main DB)

---

### 6. elite_academic (Academic Management)
**Purpose:** Student management, enrollment, timetables  
**Size:** ~2-3 GB  
**Tables:** ~20-25 tables  
**ID Type:** INT (to be decided)

**Key Tables:**
- students, classes, subjects
- enrollments, promotions, graduations
- timetables, class_schedules
- attendance (student)
- admissions, sections, streams
- parent_teacher_meetings
- student_documents

**Cross-DB References:**
- staff (teachers - HR DB)
- payment_entries (finance DB)
- users (main DB)

**Note:** Does NOT include exams/grades (moved to elite_cbt)

---

### 7. elite_content (Content Management)
**Purpose:** Lesson plans, syllabus, CMS, school website  
**Size:** ~1-2 GB  
**Tables:** ~15-20 tables  
**ID Type:** INT or UUID (to be decided)

**Key Tables:**
- lesson_plans, lesson_notes
- syllabus, curriculum
- curriculum_scraping
- teacher_lesson_plans
- cms_pages, cms_posts
- cms_menus, cms_widgets
- media_library (images, videos)
- documents (PDFs, files)
- announcements, newsletters

**Cross-DB References:**
- staff (content creators - HR DB)
- classes, subjects (academic DB)

**Benefits:**
- Separate scaling for media/content
- CDN integration for static files
- Better CMS performance
- Isolated from academic data

---

### 8. elite_cbt (Assessment & Testing)
**Purpose:** Exams, assessments, grades, CBT  
**Size:** ~1-2 GB  
**Tables:** ~20-25 tables  
**ID Type:** INT or UUID (to be decided)

**Key Tables:**
- exams, exam_schedules
- questions, question_banks
- assessments, continuous_assessment
- grades, results
- grade_items, grade_categories
- report_cards, certificates, transcripts
- exam_submissions
- online_tests, quiz_results

**Cross-DB References:**
- students (academic DB)
- subjects (academic DB)
- staff (teachers - HR DB)

**Benefits:**
- Isolated assessment workload
- Better CBT performance
- Independent scaling during exams
- Separate backup for grades/results

---

## Database Relationships

```
┌─────────────────┐
│  full_skcooly   │ ◄─── All databases reference this
│  (Core/Shared)  │      (users, schools, branches)
└─────────────────┘
         │
    ┌────┴────┬────────┬────────┬────────┬────────┐
    │         │        │        │        │        │
    ▼         ▼        ▼        ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│elite_hr│ │elite_  │ │elite_  │ │elite_  │ │elite_  │ │skcooly_│
│        │ │finance │ │academic│ │content │ │cbt     │ │audit   │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
    │         │            │          │          │
    │         └────────────┼──────────┘          │
    │                      │                     │
    └──────────────────────┴─────────────────────┘
           Cross-database queries needed
```

---

## Size Estimates

| Database | Current | After Split | Growth Rate |
|----------|---------|-------------|-------------|
| full_skcooly | 8 GB | 500 MB | Low |
| skcooly_audit | - | 2-5 GB | High |
| elite_bot | - | 1-2 GB | Medium |
| elite_hr | - | 500 MB | Low |
| elite_finance | - | 2-3 GB | Medium |
| elite_academic | - | 2-3 GB | Medium |
| elite_content | - | 1-2 GB | Medium |
| elite_cbt | - | 1-2 GB | Low |
| **Total** | **8 GB** | **10-18 GB** | - |

**Note:** Total size increases due to index overhead and data duplication for performance

---

## Migration Order (Recommended)

1. **Week 2:** elite_hr (Low risk, isolated)
2. **Week 3:** elite_finance (Medium risk, high integration)
3. **Week 4:** elite_academic (High risk, core functionality)
4. **Week 5:** elite_content (Low risk, isolated)
5. **Week 6:** elite_cbt (Medium risk, assessment critical)

---

## Environment Variables

```bash
# .env configuration

# Core
DB_NAME=full_skcooly
DB_HOST=localhost
DB_USERNAME=root
DB_PASSWORD=
DB_PORT=3306

# Audit
AUDIT_DB_NAME=skcooly_audit
AUDIT_DB_HOST=localhost
AUDIT_DB_USERNAME=root
AUDIT_DB_PASSWORD=
AUDIT_DB_PORT=3306

# Bot
BOT_DB_NAME=elite_bot
BOT_DB_HOST=localhost
BOT_DB_USERNAME=root
BOT_DB_PASSWORD=
BOT_DB_PORT=3306

# HR
HR_DB_NAME=elite_hr
HR_DB_HOST=localhost
HR_DB_USERNAME=root
HR_DB_PASSWORD=
HR_DB_PORT=3306

# Finance
FINANCE_DB_NAME=elite_finance
FINANCE_DB_HOST=localhost
FINANCE_DB_USERNAME=root
FINANCE_DB_PASSWORD=
FINANCE_DB_PORT=3306

# Academic
ACADEMIC_DB_NAME=elite_academic
ACADEMIC_DB_HOST=localhost
ACADEMIC_DB_USERNAME=root
ACADEMIC_DB_PASSWORD=
ACADEMIC_DB_PORT=3306

# Content
CONTENT_DB_NAME=elite_content
CONTENT_DB_HOST=localhost
CONTENT_DB_USERNAME=root
CONTENT_DB_PASSWORD=
CONTENT_DB_PORT=3306

# CBT
CBT_DB_NAME=elite_cbt
CBT_DB_HOST=localhost
CBT_DB_USERNAME=root
CBT_DB_PASSWORD=
CBT_DB_PORT=3306
```

---

## Benefits Summary

### Performance
- 30-50% faster queries (isolated workloads)
- Independent scaling per domain
- Better cache utilization
- Reduced table locking

### Scalability
- Scale databases independently
- Different hardware per workload
- Horizontal scaling ready
- Microservices architecture

### Maintenance
- Smaller databases easier to manage
- Independent backup strategies
- Faster migrations per database
- Isolated schema changes

### Security
- Better data isolation
- Granular access control
- Separate encryption keys
- Compliance-friendly

### Development
- Team ownership per database
- Independent deployments
- Clearer boundaries
- Better testing isolation

---

## Risks & Mitigation

### Cross-Database Queries
**Risk:** Slower than single DB joins  
**Mitigation:** Service layer, caching, denormalization

### Data Consistency
**Risk:** No cross-DB transactions  
**Mitigation:** Saga pattern, event sourcing, consistency checks

### Complexity
**Risk:** More databases to manage  
**Mitigation:** Automation, monitoring, documentation

### Migration Risk
**Risk:** Data loss or corruption  
**Mitigation:** Backups, phased approach, rollback plans

---

## Decision Matrix

| Factor | Monolithic | Separated | Winner |
|--------|-----------|-----------|--------|
| Simplicity | ✅ | ❌ | Monolithic |
| Performance | ❌ | ✅ | Separated |
| Scalability | ❌ | ✅ | Separated |
| Maintenance | ❌ | ✅ | Separated |
| Development Speed | ✅ | ❌ | Monolithic |
| Long-term Cost | ❌ | ✅ | Separated |

**Recommendation:** Proceed with separation for long-term benefits

---

## 🔔 Implementation Tracking

### Setup Tracking System
```bash
./scripts/setup-tracking.sh
```

**Creates:**
- `feature/modularization` branch
- `IMPLEMENTATION_TRACKER.md` with 7-week checklist
- Daily reminder script
- Commits all plans to git

### Daily Workflow
```bash
# Check status
./scripts/modularization-reminder.sh

# Work on tasks
git checkout feature/modularization

# Update tracker
vim IMPLEMENTATION_TRACKER.md  # Mark completed tasks [x]

# Commit progress
git add . && git commit -m "progress: [description]"
git push
```

### Track Progress
- **IMPLEMENTATION_TRACKER.md** - Weekly checklists
- **Reminder script** - Shows next tasks
- **Git tags** - Milestone markers
- **Daily log** - Record blockers/notes

---

## Summary

✅ **8 Databases Total**  
✅ **Clear Domain Separation**  
✅ **UUID for Audit/Bot**  
✅ **7-Week Migration Plan**  
✅ **Microservices Ready**  
✅ **Automated Tracking**

**Status:** Ready to execute! 🎉  
**Next Step:** Run `./scripts/setup-tracking.sh`

---

*Architecture finalized: 2026-02-11 03:23 UTC*  
*Tracking added: 2026-02-11 03:40 UTC*
