# Phase 4 — Testing Checklist (QA Expert)

## Database
- [ ] `students.status` defaults to `active` for all existing records
- [ ] `alumni` table FK constraint works (cannot insert invalid student_id)
- [ ] `student_status_log` records every status change

## API Tests

### Graduate endpoint
- [ ] Graduates only `active` students (not already graduated)
- [ ] Creates `alumni` record with correct graduation_year
- [ ] Creates `student_status_log` entry
- [ ] Updates `students.status` to `graduated`
- [ ] Rolls back all changes if any step fails (transaction test)
- [ ] Rejects cross-school student IDs

### Promote endpoint
- [ ] Only promotes students matching `from_class`
- [ ] Logs promotion in `student_status_log`
- [ ] Does not affect students from other schools

### Alumni list endpoint
- [ ] Returns paginated results
- [ ] Filters correctly by `graduation_year`
- [ ] Filters correctly by `branch_id`
- [ ] Does not return alumni from other schools

### Status update endpoint
- [ ] Accepts: withdrawn, transferred
- [ ] Rejects invalid status values
- [ ] Logs the change with `from_status` and `to_status`

## Frontend
- [ ] Alumni list loads and paginates
- [ ] Graduate page shows only SS3 active students
- [ ] Promote page filters students by selected class
- [ ] Status badge displays correct color per status
- [ ] Bulk actions work with 1, many, and 0 selected students

## Edge Cases
- [ ] Graduating a student twice is blocked (UNIQUE on alumni.student_id)
- [ ] Promoting SS3 students (should graduate, not promote further)
- [ ] Empty student_ids array returns graceful error
