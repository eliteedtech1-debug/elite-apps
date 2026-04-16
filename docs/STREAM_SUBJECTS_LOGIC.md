# Stream & Subjects Logic

## Core Concept

A school can have `has_class_stream = 1` (enabled) or `0` (disabled) in `school_setup`.

### Subject Types (stored in `subjects.type`)
| Type | Description |
|------|-------------|
| `Core` | Mandatory for ALL students regardless of stream |
| `Science` / `Technical` / `Commercial` / `Arts` / `Vocational` | Stream-specific subjects |
| `Selective` / `Elective` | Optional — student picks manually |

### Student Streams (stored in `students.stream`)
`General` | `Science` | `Technical` | `Commercial` | `Arts` | `Vocational` | `None`

---

## Stream Assignment Rules

### `stream_status` (computed by `select-class` stored procedure via JOIN with `classes`)
- `Streamed` — student's stream matches their class stream requirement
- `NotStreamed` — student needs stream assignment

> ⚠️ `stream_status` is NOT a DB column. Only available when using `select-class` query. Not available on `select-all`.

---

## Subject Resolution Rules

### If student stream = `General` (or `None` / unset)
→ Student gets **ALL non-selective subjects** automatically (Core + Science + Technical + Commercial + Arts + Vocational)
→ Only `Selective` subjects need manual assignment

### If student stream = `Science` / `Technical` / etc.
→ Student gets **Core subjects** automatically
→ Student gets **their stream's subjects** automatically
→ Only `Selective` subjects need manual assignment

### Summary Table
| Student Stream | Auto-assigned | Manual |
|---------------|---------------|--------|
| General | All non-selective (Core + all stream types) | Selective only |
| Science | Core + Science | Selective only |
| Technical | Core + Technical | Selective only |
| Commercial | Core + Commercial | Selective only |
| Arts | Core + Arts | Selective only |
| Vocational | Core + Vocational | Selective only |

---

## API Endpoints

### Fetch subjects for a class
```
GET /subjects/by-class?class_code=CLS0297
```
Returns all subjects with `subject_code`, `subject_name`, `subject_type`.

### Fetch student's current selective subjects
```
GET /api/student-subjects?admission_no=7853
```

### Save stream + selective subjects
```
POST /students/assign-stream-subjects
{
  admission_no, stream, class_code, branch_id,
  selective_subjects: ["SBJ_xxx", "SBJ_yyy"]
}
```

---

## Frontend Logic (reuse for Assessment Reporting)

```typescript
// Determine if student is on General stream
const isGeneral = !student.stream || student.stream === 'General' || student.stream === 'None';

// Split subjects from /subjects/by-class response
const selective = subjects.filter(s => ['selective', 'elective'].includes(s.subject_type?.toLowerCase()));

const autoSubjects = isGeneral
  ? subjects.filter(s => !['selective', 'elective'].includes(s.subject_type?.toLowerCase()))
  : subjects.filter(s =>
      ['general', 'core', 'compulsory'].includes(s.subject_type?.toLowerCase()) ||
      s.subject_type?.toLowerCase() === student.stream?.toLowerCase()
    );
```

### For Assessment Reporting
- **Show scores only for `autoSubjects` + student's assigned `selective` subjects**
- Do NOT show scores for stream subjects the student doesn't belong to
- Use `GET /api/student-subjects?admission_no=...` to get their selective subjects
- Combine: `autoSubjects` + matched selective subjects = student's full subject list for assessment

---

## How EndOfTermReport.tsx & CAReport.tsx Use This

### Data Flow
1. Backend returns rows with `student_stream` and `subject_type` fields on each row
2. `shouldIncludeSubject(studentStream, subjectType, hasValidRecord)` filters rows
3. `correctedClassRows` (useMemo) applies the filter and recalculates class positions
4. `transformedData` (useMemo) builds per-student subject maps from filtered rows

### `shouldIncludeSubject` Logic (EndOfTermReport.tsx)
```typescript
// "Not Taken" rows are always excluded (backend placeholders)
if (!hasValidRecord) return false;

// No subject type → include (has valid record)
if (!subjectType) return true;

// Core/Compulsory → all students
if (type === 'core' || type === 'compulsory') return true;

// Selective/Elective → include (student has a score = they enrolled)
if (type === 'selective' || type === 'elective') return true;

// General stream → sees ALL subjects
if (stream === 'general') return true;

// No stream / None → sees all subjects
if (!stream || stream === 'none' || stream === '') return true;

// Stream-specific subject → only if subject type matches student stream
if (subjectType === stream) return true;

// Partial match (e.g. "Art" vs "Arts")
if (stream.includes(subjectType) || subjectType.includes(stream)) return true;

// Otherwise exclude
return false;
```

### Position Recalculation
After stream filtering, class positions are recalculated using `recalculateClassPositions()`:
- Sums each student's `total_score` across their filtered subjects only
- Sorts descending, assigns RANK() style positions (ties share same rank)
- Corrected positions replace `student_position` and `total_students` on each row

### CA Reports
- Same `shouldIncludeSubject` logic applies
- `allClassSubjects` (from backend `response.allSubjects`) drives the subject column list
- `caGroupedData` holds grouped CA scores per student/subject

---

## Display Rules (UI — Student List)

- Show stream tag on student row only if `hasStreamEnabled = true` AND student has a class
- `stream_status === 'NotStreamed'` → orange dashed "Assign Stream" tag (clickable)
- Any other stream → colored tag (clickable to change)
- Stream tag click → opens stream modal with subject preview

## Color Map
```
Science    → blue
Technical  → geekblue
Arts       → purple
Commercial → green
Vocational → cyan
General    → default (grey)
```

---

## Key Invariants (Do Not Break)

1. A student with `stream = 'General'` or no stream must see ALL non-selective subjects in their report
2. A student with a specific stream sees only Core + their stream subjects (+ any selective they enrolled in)
3. "Not Taken" rows (backend placeholders) must always be excluded from reports
4. Class positions must be recalculated AFTER stream filtering — never use raw backend positions for final reports
5. Selective subjects are included in a student's report only if they have a valid score record for it
