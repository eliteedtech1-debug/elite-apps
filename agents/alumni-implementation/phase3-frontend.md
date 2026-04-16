# Phase 3 — Frontend UI (Frontend Expert)

## Pages to Build

### 1. Alumni List Page
- Route: `/management/alumni`
- Filter by: graduation year, branch
- Columns: Name, Admission No, Last Class, Graduation Year, Certificate No
- Pagination (50 per page)

### 2. Graduate Students Page
- Route: `/management/graduate-students`
- List all active SS3 students with checkboxes
- Bulk select + Graduate button
- Input: academic year, optional remarks

### 3. Promote Students Page
- Route: `/management/promote-students`
- Select from_class → to_class
- List eligible students with checkboxes
- Bulk promote action

### 4. Student Status Badge
- Add status badge to existing student list/detail pages
- Colors: green=active, blue=graduated, red=withdrawn, orange=transferred

---

## Component Structure

```
src/feature-module/management/alumni/
  index.tsx                  ← Alumni list page
  GraduateStudents.tsx       ← Graduation batch page
  PromoteStudents.tsx        ← Promotion batch page

src/feature-module/peoples/students/student-list/
  ← Add status badge to existing student list
```

---

## API Integration

```ts
export const fetchAlumni = (params, cb, err) =>
  _get(`alumni?${new URLSearchParams(params)}`, cb, err);

export const graduateStudents = (payload, cb, err) =>
  _post('alumni/graduate', payload, cb, err);

export const promoteStudents = (payload, cb, err) =>
  _post('alumni/promote', payload, cb, err);

export const updateStudentStatus = (studentId, payload, cb, err) =>
  _patch(`alumni/${studentId}/status`, payload, cb, err);
```

---

## Route Registration

Add to `all_routes.tsx`:
```ts
alumni: '/management/alumni',
graduateStudents: '/management/graduate-students',
promoteStudents: '/management/promote-students',
```

Add to router:
```tsx
<Route path="/management/alumni" element={<AlumniList />} />
<Route path="/management/graduate-students" element={<GraduateStudents />} />
<Route path="/management/promote-students" element={<PromoteStudents />} />
```
