# Dual Enrollment Strategy: Regular + Islamiyya + Tahfiz

## Overview

A student has **one identity** (one admission number) but can be **enrolled in multiple program tracks** simultaneously. For example, a student attends regular classes during the day, Islamiyya in the evening, and Tahfiz on weekends — all under the same admission number.

---

## Real Schema Context (from DB)

### `students` table (relevant fields)
| Field | Type | Notes |
|---|---|---|
| `admission_no` | varchar(50) | Primary key (per school/branch) |
| `current_class` | varchar(50) | FK → `classes.class_code` — **active enrollment (current)** |
| `class_code` | varchar(20) | Future/next class after promotion |
| `branch_id` | varchar(200) | Student's primary branch |
| `school_id` | varchar(20) | |
| `section` | varchar(100) | Denormalized section label |

### `classes` table (relevant fields)
| Field | Type | Notes |
|---|---|---|
| `class_code` | varchar(30) | Unique |
| `class_name` | varchar(100) | |
| `section` | varchar(30) | e.g. `SS`, `JSS`, `Islamiyya`, `TAHFIZ` |
| `branch_id` | varchar(20) | |
| `school_id` | varchar(20) | |

### `school_section_table` (relevant fields)
| Field | Notes |
|---|---|
| `section_name` | e.g. `ISLAMIYYA`, `TAHFIZ`, `JSS`, `SS` |
| `branch_id` | Links section to a branch |
| `school_id` | |

### Existing Islamiyya/Tahfiz data (live)
- Islamiyya classes: `CLS0501–CLS0528` etc. under `BRCH00023` (section = `Islamiyya`)
- Tahfiz classes: `CLS0488–CLS0519` etc. under `BRCH00024` (section = `TAHFIZ`)
- Currently students have **one** `current_class` — they are either regular OR Islamiyya/Tahfiz, not both

---

## Problem

`students.current_class` is a single field — a student can only be in one class at a time. To support dual enrollment, we need a separate enrollment table.

---

## Solution: `student_secondary_enrollments`

```sql
CREATE TABLE student_secondary_enrollments (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  admission_no VARCHAR(50)  NOT NULL,
  school_id    VARCHAR(20)  NOT NULL,
  class_code   VARCHAR(30)  NOT NULL,   -- FK → classes.class_code (Islamiyya/Tahfiz class)
  branch_id    VARCHAR(50)  NOT NULL,
  section      VARCHAR(30)  NOT NULL,   -- 'Islamiyya' | 'TAHFIZ'
  schedule     VARCHAR(50)  DEFAULT NULL, -- 'evening', 'weekend', etc.
  status       ENUM('Active','Inactive') DEFAULT 'Active',
  enrolled_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  enrolled_by  VARCHAR(50)  DEFAULT NULL,
  UNIQUE KEY uq_student_class (admission_no, school_id, class_code),
  KEY idx_school_section (school_id, section),
  KEY idx_class_code (class_code)
);
```

**No changes to `students` or `classes` tables.**

- `students.current_class` = primary/regular class (unchanged)
- `student_secondary_enrollments` = additional Islamiyya/Tahfiz class memberships

---

## Enrollment Rules

| Scenario | `students.current_class` | `student_secondary_enrollments` |
|---|---|---|
| Regular only | Regular class | — |
| Islamiyya only | Islamiyya class | — |
| Regular + Islamiyya | Regular class | 1 row (Islamiyya class) |
| Regular + Tahfiz | Regular class | 1 row (Tahfiz class) |
| Regular + Islamiyya + Tahfiz | Regular class | 2 rows |

---

## Billing Logic

Fee invoices are generated **per class/branch**. A student in 3 programs gets 3 fee records.

| Scenario | Fee Invoices |
|---|---|
| Regular only | 1 invoice (regular branch) |
| Regular + Islamiyya | 2 invoices (regular + Islamiyya branch) |
| Regular + Tahfiz | 2 invoices (regular + Tahfiz branch) |
| Regular + both | 3 invoices |

---

## Student Count Rules

| Context | Query |
|---|---|
| Dashboard "Total Students" | `COUNT(DISTINCT admission_no)` from `students` — unchanged |
| Dashboard "Islamiyya" | `COUNT(DISTINCT admission_no)` from `student_secondary_enrollments WHERE section = 'Islamiyya'` UNION students whose primary `current_class` is Islamiyya |
| Dashboard "Tahfiz" | Same pattern for TAHFIZ |
| MOU/Subscription billing | `COUNT(DISTINCT admission_no)` — 1 student in 3 programs = **1 student** for licensing |

---

## Impact on Existing Features

| Feature | Impact |
|---|---|
| **Attendance** | Branch-scoped — Islamiyya/Tahfiz attendance uses `student_secondary_enrollments` to get the student list for that class |
| **Results/Reports** | Class-scoped — no change; Islamiyya results are under their `class_code` |
| **Fees** | Fee generation for Islamiyya/Tahfiz branches queries `student_secondary_enrollments` for dual-enrolled students |
| **Student profile** | Shows primary class + all secondary enrollments with schedule |
| **Admission** | When enrolling a student in Islamiyya/Tahfiz: search by admission number → if found, insert into `student_secondary_enrollments` instead of creating a new student |

---

## Implementation Checklist

- [ ] **Migration** — create `student_secondary_enrollments` table (SQL above)
- [ ] **Enrollment UI** — "Enroll in Program" on student profile; search by admission number, pick Islamiyya/Tahfiz class, set schedule
- [ ] **Fee generation** — for Islamiyya/Tahfiz branches, merge students from `students WHERE current_class IN (islamiyya classes)` UNION `student_secondary_enrollments WHERE section = 'Islamiyya'`
- [ ] **Attendance** — same merge pattern for class roster
- [ ] **Dashboard query** — update `dashboard_query` procedure to count secondary enrollments per section
- [ ] **MOU generator** — student count = `COUNT(DISTINCT admission_no)` across primary + secondary

---

## Example (Real School: SCH/15)

**Student**: Amina Yusuf — `DKG/1/0155`

| Table | Field | Value |
|---|---|---|
| `students` | `current_class` | `CLS0410` (SS1 regular, BRCH00001) |
| `student_secondary_enrollments` | `class_code` | `CLS0525` (RAUDATUL ULA A, Islamiyya, BRCH00023, evening) |
| `student_secondary_enrollments` | `class_code` | `CLS0488` (Abubakar Saddiq, Tahfiz, BRCH00024, weekend) |

- 3 fee invoices per term
- Appears in regular, Islamiyya, and Tahfiz attendance separately
- Counts as **1 student** for licensing
