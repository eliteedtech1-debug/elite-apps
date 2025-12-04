# Fixes for Billing Issues

## 🐛 Issues Found

1. **Student Count shows 0** - API might not be finding students
2. **Need Basic Plan** - Default ₦500/student/term with 15% annual discount
3. **Pricing plan not showing** - Need to seed default plan

---

## ✅ Fix 1: Insert Default Basic Plan

Run this SQL to create the default pricing plan:

```sql
-- Insert Basic Plan (Default)
INSERT INTO `subscription_pricing` (
  `pricing_name`,
  `base_price_per_student_term`,
  `base_price_per_student_annum`,
  `annual_discount_percentage`,
  `cbt_stand_alone_cost_term`,
  `sms_subscription_cost_term`,
  `whatsapp_subscription_cost_term`,
  `email_subscription_cost_term`,
  `express_finance_cost_term`,
  `cbt_stand_alone_cost_annum`,
  `sms_subscription_cost_annum`,
  `whatsapp_subscription_cost_annum`,
  `email_subscription_cost_annum`,
  `express_finance_cost_annum`,
  `is_active`
) VALUES (
  'Basic Plan',                    -- Plan name
  500.00,                          -- ₦500 per student per term
  1275.00,                         -- ₦500 × 3 terms - 15% = ₦1,275
  15.00,                           -- 15% annual discount

  -- Add-on costs per TERM
  25000.00,                        -- CBT Stand Alone
  5000.00,                         -- SMS Subscription
  3000.00,                         -- WhatsApp Subscription
  2000.00,                         -- Email Subscription
  15000.00,                        -- Express Finance

  -- Add-on costs per ANNUM (with 15% discount)
  63750.00,                        -- CBT: ₦25,000 × 3 - 15% = ₦63,750
  12750.00,                        -- SMS: ₦5,000 × 3 - 15% = ₦12,750
  7650.00,                         -- WhatsApp: ₦3,000 × 3 - 15% = ₦7,650
  5100.00,                         -- Email: ₦2,000 × 3 - 15% = ₦5,100
  38250.00,                        -- Express Finance: ₦15,000 × 3 - 15% = ₦38,250

  1                                -- Active
);

-- Verify it was created
SELECT * FROM subscription_pricing WHERE pricing_name = 'Basic Plan';
```

**Calculation for Annual Price:**
- Per term: ₦500
- 3 terms: ₦500 × 3 = ₦1,500
- 15% discount: ₦1,500 × 0.15 = ₦225
- Annual price: ₦1,500 - ₦225 = **₦1,275**

---

## ✅ Fix 2: Student Count API - Check Table Structure

The student count is returning 0. Let's check your actual student table structure:

### **Option A: If your table is named `student` (singular)**

Update `/elscholar-api/src/controllers/subscription_billing.js`:

```javascript
const getStudentCount = async (req, res) => {
  const { school_id } = req.query;

  if (!school_id) {
    return res.status(400).json({
      success: false,
      message: "school_id is required",
    });
  }

  try {
    // Try multiple table name variations
    let query = `SELECT COUNT(*) as count FROM students
                 WHERE school_id = :school_id
                 AND status IN ('active', 'suspended')`;

    let results;

    try {
      results = await db.sequelize.query(query, {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT,
      });
    } catch (err) {
      // Try singular 'student' table
      query = `SELECT COUNT(*) as count FROM student
               WHERE school_id = :school_id
               AND status IN ('active', 'suspended')`;

      results = await db.sequelize.query(query, {
        replacements: { school_id },
        type: db.sequelize.QueryTypes.SELECT,
      });
    }

    res.json({
      success: true,
      data: {
        count: results[0]?.count || 0,
      },
    });
  } catch (err) {
    console.error("Error fetching student count:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching student count",
      error: err.message,
    });
  }
};
```

### **Option B: Check Your Actual Table Name**

Run this SQL to find your student table:

```sql
-- Find student table
SHOW TABLES LIKE '%student%';

-- Check structure
DESCRIBE students;  -- or DESCRIBE student;

-- Sample query to see data
SELECT school_id, status, COUNT(*) as count
FROM students  -- or student
GROUP BY school_id, status;
```

### **Option C: If status column is different**

If your status column has different values (e.g., 'Active' with capital A), update the query:

```javascript
// In getStudentCount function
const results = await db.sequelize.query(
  `SELECT COUNT(*) as count FROM students
   WHERE school_id = :school_id
   AND status IN ('active', 'suspended', 'Active', 'Suspended')`,  // ← Added capitalized versions
  {
    replacements: { school_id },
    type: db.sequelize.QueryTypes.SELECT,
  }
);
```

### **Option D: Quick Test Query**

Run this in your database to test:

```sql
-- Replace SCH/1 with your actual school_id
SELECT COUNT(*) as count
FROM students
WHERE school_id = 'SCH/1'
AND status IN ('active', 'suspended', 'Active', 'Suspended');

-- If that returns 0, try without status filter
SELECT COUNT(*) as count, status
FROM students
WHERE school_id = 'SCH/1'
GROUP BY status;
```

---

## ✅ Fix 3: Update Frontend - Auto-select Basic Plan

Update `/elscholar-ui/src/feature-module/peoples/school-Setup/school-list.tsx`:

### **Change 1: Auto-select "Basic Plan" as default**

Around line 106, update the state initialization:

```typescript
const [selectedPricingPlan, setSelectedPricingPlan] = useState<number | null>(null);
```

To:

```typescript
const [selectedPricingPlan, setSelectedPricingPlan] = useState<number | null>(null);
const [defaultPlanId, setDefaultPlanId] = useState<number | null>(null);
```

### **Change 2: Auto-select Basic Plan when modal opens**

Update `handleBillingSetup` function (around line 360):

```typescript
const handleBillingSetup = (school: School) => {
  setSelectedSchool(school);
  getStudentCount(school.school_id);

  // ✅ AUTO-SELECT "Basic Plan" if it exists
  const basicPlan = pricingPlans.find(
    (plan) => plan.pricing_name === "Basic Plan"
  );
  if (basicPlan) {
    setSelectedPricingPlan(basicPlan.id || null);
    setDefaultPlanId(basicPlan.id || null);
  }

  setIsBillingModalVisible(true);
};
```

### **Change 3: Add helpful message when no student count**

In the billing modal, update the student count card (around line 875):

```tsx
<Card>
  <Statistic
    title="Active Students"
    value={studentCount}
    valueStyle={{ color: studentCount > 0 ? "#3f8600" : "#cf1322" }}
  />
  {studentCount === 0 && (
    <div style={{ marginTop: 8 }}>
      <Tag color="warning">No students found</Tag>
      <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
        Make sure students are added with status 'active' or 'suspended'
      </div>
    </div>
  )}
</Card>
```

---

## ✅ Fix 4: Add Default Discount Display

Update the subscription configuration section to show the discount:

```tsx
<Row gutter={16} className="mb-3">
  <Col span={12}>
    <div className="form-group">
      <label>Pricing Plan</label>
      <Select
        className="w-100"
        placeholder="Select pricing plan"
        value={selectedPricingPlan}
        onChange={(value) => setSelectedPricingPlan(value)}
      >
        {pricingPlans.map((plan) => (
          <Option key={plan.id} value={plan.id}>
            {plan.pricing_name} - ₦
            {subscriptionType === "termly"
              ? plan.base_price_per_student_term
              : plan.base_price_per_student_annum}
            /student
            {subscriptionType === "annually" && plan.annual_discount_percentage > 0 && (
              <Tag color="green" style={{ marginLeft: 8 }}>
                {plan.annual_discount_percentage}% discount
              </Tag>
            )}
          </Option>
        ))}
      </Select>
    </div>
  </Col>
  <Col span={12}>
    <div className="form-group">
      <label>Subscription Type</label>
      <Select
        className="w-100"
        value={subscriptionType}
        onChange={(value) => setSubscriptionType(value as any)}
      >
        <Option value="termly">
          Termly (Per Term)
        </Option>
        <Option value="annually">
          Annually (3 Terms)
          {selectedPricingPlan && (() => {
            const plan = pricingPlans.find(p => p.id === selectedPricingPlan);
            return plan?.annual_discount_percentage ? (
              <Tag color="green" style={{ marginLeft: 8 }}>
                Save {plan.annual_discount_percentage}%
              </Tag>
            ) : null;
          })()}
        </Option>
      </Select>
    </div>
  </Col>
</Row>
```

---

## 🧪 Testing Steps

### **Step 1: Insert Basic Plan**
```sql
-- Run the INSERT query above
-- Verify
SELECT * FROM subscription_pricing;
```

### **Step 2: Test Student Count API**
```bash
# Test the API
curl "http://localhost:YOUR_PORT/api/student-count?school_id=SCH/1"

# Expected response:
{
  "success": true,
  "data": {
    "count": 150  # Your actual student count
  }
}
```

### **Step 3: Test in UI**
1. Go to School List
2. Click "Actions" → "Billing Setup" on a school
3. **Verify:**
   - Student count shows correct number (not 0)
   - "Basic Plan" is auto-selected in dropdown
   - Annual option shows "15% discount" tag
   - Total cost calculates correctly

### **Step 4: Create Test Subscription**
1. Select "Basic Plan"
2. Choose "Annually"
3. **Expected calculation (100 students):**
   ```
   Base: 100 × ₦1,275 = ₦127,500
   Total: ₦127,500
   ```
4. Click "Create Subscription"
5. Check database:
   ```sql
   SELECT * FROM school_subscriptions ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM subscription_invoices ORDER BY created_at DESC LIMIT 1;
   ```

---

## 🔍 Debugging Student Count

If student count is still 0, run these queries to debug:

```sql
-- 1. Check if students table exists
SHOW TABLES LIKE '%student%';

-- 2. Check table structure
DESCRIBE students;  -- or whatever table name you find

-- 3. Check actual data
SELECT
  school_id,
  status,
  COUNT(*) as count
FROM students
GROUP BY school_id, status
ORDER BY school_id;

-- 4. Check for specific school
SELECT * FROM students WHERE school_id = 'SCH/1' LIMIT 10;

-- 5. Check all possible status values
SELECT DISTINCT status FROM students;
```

**Common Issues:**
- Table is named `student` (singular) not `students`
- Status column values are capitalized: `'Active'` not `'active'`
- School ID format is different: `'SCH-1'` not `'SCH/1'`
- Students table doesn't exist yet

---

## 📝 Summary of Changes

1. ✅ Insert "Basic Plan" with ₦500/student/term, 15% annual discount
2. ✅ Update student count API to handle different table names
3. ✅ Auto-select "Basic Plan" when opening billing modal
4. ✅ Show discount percentage in plan dropdown
5. ✅ Add warning when student count is 0

---

## 🚀 Quick Fix SQL Script

Run this complete script:

```sql
-- ============================================================
-- Quick Fix for Billing Issues
-- ============================================================

-- 1. Insert Basic Plan
INSERT INTO `subscription_pricing` (
  `pricing_name`, `base_price_per_student_term`, `base_price_per_student_annum`,
  `annual_discount_percentage`,
  `cbt_stand_alone_cost_term`, `sms_subscription_cost_term`,
  `whatsapp_subscription_cost_term`, `email_subscription_cost_term`,
  `express_finance_cost_term`,
  `cbt_stand_alone_cost_annum`, `sms_subscription_cost_annum`,
  `whatsapp_subscription_cost_annum`, `email_subscription_cost_annum`,
  `express_finance_cost_annum`, `is_active`
) VALUES (
  'Basic Plan', 500.00, 1275.00, 15.00,
  25000.00, 5000.00, 3000.00, 2000.00, 15000.00,
  63750.00, 12750.00, 7650.00, 5100.00, 38250.00, 1
);

-- 2. Verify
SELECT * FROM subscription_pricing WHERE pricing_name = 'Basic Plan';

-- 3. Check student count
SELECT
  school_id,
  status,
  COUNT(*) as student_count
FROM students
GROUP BY school_id, status
ORDER BY school_id;

-- 4. If no data, check table name
SHOW TABLES LIKE '%student%';
```

---

**Last Updated:** 2025-01-08
**Status:** Ready to apply fixes
