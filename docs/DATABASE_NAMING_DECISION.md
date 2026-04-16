# Database Naming - Current vs Convention

## Current State (Working in Production)

```
✅ skcooly_audit  (audit & logs)
✅ elite_bot      (AI & chatbot)
```

## Naming Convention (From Plan)

```
elite_audit   (should be this)
elite_bot     (correct ✅)
```

---

## Issue

The audit database is named `skcooly_audit` instead of `elite_audit`.

**Why?** It was created before the naming convention was finalized.

---

## Options

### Option 1: Keep Current Name (Recommended) ✅

**Pros:**
- Already working in production
- No breaking changes
- No downtime
- .env already configured
- Backend already using it

**Cons:**
- Inconsistent naming
- Doesn't follow convention

**Action:** Update convention document to accept both

---

### Option 2: Rename to elite_audit

**Pros:**
- Follows naming convention
- Consistent with elite_bot

**Cons:**
- Requires database rename
- Need to update .env
- Need to restart backend
- Small downtime risk

**Steps:**
```bash
# Rename database
mysql -u root -e "CREATE DATABASE elite_audit CHARACTER SET utf8mb4;"
mysql -u root -e "RENAME TABLE skcooly_audit.audit_trails TO elite_audit.audit_trails;"
mysql -u root -e "RENAME TABLE skcooly_audit.elite_logs TO elite_audit.elite_logs;"
mysql -u root -e "RENAME TABLE skcooly_audit.crash_reports TO elite_audit.crash_reports;"
mysql -u root -e "RENAME TABLE skcooly_audit.login_sessions TO elite_audit.login_sessions;"
mysql -u root -e "DROP DATABASE skcooly_audit;"

# Update .env
sed -i '' 's/AUDIT_DB_NAME=skcooly_audit/AUDIT_DB_NAME=elite_audit/' .env

# Restart backend
npm run dev
```

---

## Recommendation

**Keep `skcooly_audit`** for now because:

1. ✅ Already working in production
2. ✅ No breaking changes needed
3. ✅ Can rename later if needed
4. ✅ Functionality > naming consistency

**Future databases follow convention:**
- elite_hr ✅
- elite_finance ✅
- elite_academic ✅
- elite_content ✅
- elite_cbt ✅

---

## Updated Convention

### Accepted Names

**Audit/Logs:**
- `elite_audit` (preferred for new deployments)
- `skcooly_audit` (accepted, currently in use)

**AI/Bot:**
- `elite_bot` ✅ (current)

**Future:**
- `elite_hr`
- `elite_finance`
- `elite_academic`
- `elite_content`
- `elite_cbt`

---

## Decision

**Status:** Keep `skcooly_audit` ✅

**Reason:** Working in production, no benefit to rename now

**Future:** All new databases use `elite_*` prefix

---

*Analysis: 2026-02-11 03:55 UTC*
