# Alumni & Graduation System — Plan of Action

> **Project:** Elite Core Alumni Feature  
> **Date:** 2026-03-18  
> **Stack:** Node.js + Express + Sequelize + MySQL + React/TypeScript

---

## Overview

Extend the existing student lifecycle to support graduation, alumni tracking, and student status management — without redesigning the current class structure (Primary 1–6, JSS 1–3, SS1–SS3).

---

## Student Lifecycle States

```
active → graduated  (SS3 completion)
active → withdrawn  (dropout)
active → transferred (moved to another school)
```

---

## Phases

| Phase | Owner | Document |
|-------|-------|----------|
| Phase 1 — Database | DBA Expert | `phase1-database.md` |
| Phase 2 — Backend API | Backend Expert | `phase2-backend.md` |
| Phase 3 — Frontend UI | Frontend Expert | `phase3-frontend.md` |
| Phase 4 — Testing | QA Expert | `phase4-testing.md` |

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| `alumni` table extends `students` via FK | No duplication, student record preserved |
| `status` field on `students` table | Single source of truth for lifecycle |
| `student_status_log` audit table | Full audit trail for compliance |
| Transactions on all status changes | Atomicity — graduate + log always together |
| Multi-tenant via `school_id`/`branch_id` | Consistent with existing architecture |

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/alumni/graduate` | Graduate a batch of SS3 students |
| POST | `/alumni/promote` | Promote students from one class to next |
| GET | `/alumni` | Fetch alumni (filterable by year, branch) |
| PATCH | `/alumni/:studentId/status` | Update student status (withdraw/transfer) |
