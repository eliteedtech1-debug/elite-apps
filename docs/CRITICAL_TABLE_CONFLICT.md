# CRITICAL: Table Name Conflict - school_subscriptions

## 🚨 Issue Discovered

There are TWO different subscription systems trying to use overlapping table names:

### System 1: Old Subscription System (School Creation)
**Purpose**: Per-student pricing and invoicing  
**Tables**:
- `subscription_pricing` - Pricing plans
- `school_subscriptions` - School subscription records (pricing_plan_id, active_students_count, etc.)
- `subscription_invoices` - Invoice records

**Used by**: `school_creation.js` - Creates subscriptions during school setup

### System 2: New RBAC Package System
**Purpose**: Feature-based access control  
**Tables**:
- `subscription_packages` (renamed from `permission_categories`)
- `school_subscriptions` (renamed from `permission_cache`) ⚠️ **CONFLICT**
- `features` (renamed from `permissions`)

**Used by**: RBAC system for feature access control

---

## 🔍 The Conflict

The RBAC migration script tries to:
```sql
RENAME TABLE permission_cache TO school_subscriptions;
```

But `school_subscriptions` ALREADY EXISTS for the old subscription system!

---

## 📊 Current State

### school_subscriptions table (OLD SYSTEM)
```sql
- id
- school_id
- subscription_type (termly/annually)
- pricing_plan_id (FK to subscription_pricing)
- active_students_count
- base_cost, addon_cost, discount_amount, total_cost
- payment_status, balance, amount_paid
- created_at, updated_at
```

### What RBAC wants (NEW SYSTEM)
```sql
- id
- school_id
- package_id (FK to subscription_packages)
- start_date, end_date
- features_override JSON
- is_active
- created_by, updated_by
```

**These are COMPLETELY DIFFERENT structures!**

---

## 💥 Impact

### School Creation (BROKEN)
The `createSubscriptionAndInvoice` function in `school_creation.js` tries to:
1. Insert into `subscriptions` table (doesn't exist)
2. Insert into `invoices` table (doesn't exist)

**Result**: School creation fails silently when trying to create subscription/invoice

### RBAC System (POTENTIALLY BROKEN)
If the RBAC migration ran, it would have:
1. Tried to rename `permission_cache` to `school_subscriptions`
2. Failed because `school_subscriptions` already exists
3. Migration would error out

---

## ✅ Solution Options

### Option 1: Separate Table Names (RECOMMENDED)
Keep both systems separate with different table names:

**Old System** (unchanged):
- `subscription_pricing`
- `school_subscriptions` 
- `subscription_invoices`

**New RBAC System** (rename):
- `subscription_packages` (already renamed)
- `rbac_school_packages` (instead of school_subscriptions)
- `features` (already renamed)

### Option 2: Merge Systems (Complex)
Combine both systems into one unified subscription model - requires major refactoring

### Option 3: Prefix Old System (Alternative)
Rename old system tables:
- `legacy_subscription_pricing`
- `legacy_school_subscriptions`
- `legacy_subscription_invoices`

---

## 🔧 Recommended Fix

### Step 1: Update RBAC Migration
Change table name from `school_subscriptions` to `rbac_school_packages`:

```sql
-- Instead of:
RENAME TABLE permission_cache TO school_subscriptions;

-- Use:
RENAME TABLE permission_cache TO rbac_school_packages;
```

### Step 2: Update RBAC Code
Update all references in:
- `elscholar-api/src/routes/rbac.js`
- `elscholar-api/src/models/SchoolSubscription.js`
- `elscholar-api/src/middleware/checkFeatureAccess.js`

Change `school_subscriptions` to `rbac_school_packages`

### Step 3: Fix School Creation Code
Update `school_creation.js` to use correct table names:

```javascript
// Change:
INSERT INTO subscriptions ...
INSERT INTO invoices ...

// To:
INSERT INTO school_subscriptions ...
INSERT INTO subscription_invoices ...
```

---

## 🚀 Immediate Action Required

1. **Check if RBAC migration ran**:
   ```sql
   SHOW TABLES LIKE 'permission_cache';
   ```
   - If exists: Migration hasn't run yet (GOOD)
   - If not exists: Migration ran and may have failed

2. **Check school_subscriptions structure**:
   ```sql
   DESCRIBE school_subscriptions;
   ```
   - If has `pricing_plan_id`: Old system intact
   - If has `package_id`: RBAC overwrote it (BAD)

3. **Fix immediately** before any data loss occurs

---

## 📝 Status

- ❌ School creation subscription/invoice: BROKEN (wrong table names)
- ⚠️ RBAC system: POTENTIAL CONFLICT (table name collision)
- ✅ Old subscription system: INTACT (but not being used correctly)

---

**PRIORITY**: HIGH - Fix before production use
**RISK**: Data loss if RBAC migration overwrites existing subscriptions
