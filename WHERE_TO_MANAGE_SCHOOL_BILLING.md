# Where to Manage School Billing & Subscriptions

## 🎯 Quick Answer

### **Location 1: Pricing Plan Management** (Super Admin Only)
**File:** `/elscholar-ui/src/feature-module/settings/PricingPlanManagement.tsx`

**Purpose:** Set global pricing plans that apply to ALL schools

**What You Can Configure:**
- ✅ Base price per student (Termly & Annual)
- ✅ Annual discount percentage (e.g., 15%)
- ✅ Add-on feature costs:
  - CBT Stand Alone
  - SMS Subscription
  - WhatsApp Subscription
  - Email Subscription
  - Express Finance
- ✅ Auto-calculate annual prices with discount

---

### **Location 2: School-Specific Billing Setup** (Super Admin Only)
**File:** `/elscholar-ui/src/feature-module/peoples/school-Setup/school-list.tsx`

**Purpose:** Create subscriptions for individual schools with custom negotiated terms

**What You Can Configure:**
1. **Select the school** → Click "Billing" button
2. **Choose pricing plan** (from dropdown - uses plans from Location 1)
3. **Select subscription type** (Termly or Annual)
4. **System auto-calculates** based on:
   - Student count (active + suspended)
   - Enabled features (toggled in Edit modal)
   - Pricing plan rates
5. **Override/Negotiate** custom pricing (see enhancement below)
6. **Create subscription** → Auto-generates invoice

---

## 📝 Step-by-Step: How to Set Up School Billing

### **STEP 1: Create Global Pricing Plans** (One-time setup)

**Navigate to:** Settings → Pricing Plan Management

**Actions:**
1. Click "Create New Pricing Plan"
2. Enter plan details:
   - **Plan Name:** e.g., "Standard Plan", "Premium Plan", "Negotiated Plan - ABC School"
   - **Annual Discount:** e.g., 15%
   - **Base Price Per Student:**
     - Termly: ₦100
     - Annual: ₦300 (or auto-calculate)
   - **Add-on Features (Termly):**
     - CBT Stand Alone: ₦25,000
     - SMS: ₦5,000
     - WhatsApp: ₦3,000
     - Email: ₦2,000
     - Express Finance: ₦15,000
   - **Add-on Features (Annual):**
     - System can auto-calculate with discount
     - Or manually enter negotiated rates

3. Click "Create Plan"

**Result:** This pricing plan is now available for ALL schools

---

### **STEP 2: Enable Features for a School**

**Navigate to:** School Setup → School List

**Actions:**
1. Click "Edit" on the school
2. Go to "Features & Modules" tab
3. Toggle ON the features the school subscribed to:
   - ☑️ CBT Stand Alone
   - ☑️ SMS Subscription
   - ☑️ WhatsApp Subscription
   - ☑️ Email Subscription
   - ☑️ Express Finance
4. Click "Save Changes"

**Result:** These features are now enabled and will be included in billing

---

### **STEP 3: Create Subscription & Generate Bill**

**Navigate to:** School Setup → School List

**Actions:**
1. Click "Billing" button on the school
2. **System auto-displays:**
   - Student count (e.g., 500 students)
3. **You configure:**
   - Select Pricing Plan (e.g., "Standard Plan")
   - Select Subscription Type (Termly or Annual)
4. **System auto-calculates:**
   - Base Cost = 500 × ₦100 = ₦50,000 (termly) or 500 × ₦300 = ₦150,000 (annual)
   - Add-on Costs = Sum of enabled features
   - Discount = Applied if annual
   - **Total Cost**
5. **Review cost breakdown**
6. Click "Create Subscription & Generate Invoice"

**Result:**
- Subscription created
- Invoice auto-generated with unique number (e.g., INV-2025-0001)
- School can now make payment

---

## 💰 Negotiated Pricing - How to Handle Custom Agreements

### **Option 1: Create School-Specific Pricing Plan** (RECOMMENDED)

**When to use:** School negotiated different rates

**How:**
1. **Go to:** Pricing Plan Management
2. **Create new plan:** "Negotiated Plan - XYZ School"
3. **Set custom rates:**
   - Base: ₦80/student (instead of ₦100)
   - Annual Discount: 20% (instead of 15%)
   - Add-ons: Custom negotiated rates
4. **Save plan**
5. **When creating subscription for XYZ School:**
   - Select "Negotiated Plan - XYZ School"
   - System applies their special rates

**Benefits:**
- ✅ Audit trail (plan is saved)
- ✅ Can reuse for subscription renewals
- ✅ Clear documentation of agreement

---

### **Option 2: Manual Invoice Adjustment** (After creation)

**When to use:** Last-minute discount or one-time adjustment

**How:**
1. Create subscription with standard plan
2. Invoice is generated
3. Manually update invoice in database:
   ```sql
   UPDATE subscription_invoices
   SET discount = 50000,  -- Additional discount
       total_amount = total_amount - 50000
   WHERE invoice_number = 'INV-2025-0001';
   ```

**OR** Use the enhanced billing modal with custom discount field (see enhancement below)

---

## 🚀 ENHANCEMENT: Add Custom Discount to Billing Modal

To support **ad-hoc negotiated discounts** directly in the billing modal, add this to `school-list.tsx`:

### **Add State Variable:**
```typescript
const [customDiscount, setCustomDiscount] = useState<number>(0);
```

### **Update Calculate Billing Function:**
```typescript
const calculateBilling = () => {
  // ... existing code ...

  const discount_amount = isAnnual
    ? subtotal * (plan.annual_discount_percentage / 100)
    : 0;

  // ADD: Custom negotiated discount
  const total_discount = discount_amount + customDiscount;

  const total_cost = subtotal - total_discount;

  setBillingCalculation({
    active_students_count: studentCount,
    base_cost,
    addon_cost,
    discount_amount: total_discount,  // Updated
    total_cost,
    breakdown,
  });
};
```

### **Add to Billing Modal UI:**
```tsx
<Row gutter={16} className="mb-3">
  <Col span={12}>
    <div className="form-group">
      <label>Pricing Plan</label>
      <Select ... />
    </div>
  </Col>
  <Col span={12}>
    <div className="form-group">
      <label>Subscription Type</label>
      <Select ... />
    </div>
  </Col>
</Row>

{/* ADD THIS ROW */}
<Row gutter={16} className="mb-3">
  <Col span={12}>
    <div className="form-group">
      <label>Custom/Negotiated Discount</label>
      <InputNumber
        style={{ width: "100%" }}
        min={0}
        addonBefore="₦"
        placeholder="Enter negotiated discount amount"
        value={customDiscount}
        onChange={(value) => setCustomDiscount(value || 0)}
      />
      <small className="text-muted">
        Additional discount beyond plan discount (e.g., for special agreements)
      </small>
    </div>
  </Col>
  <Col span={12}>
    <div className="form-group">
      <label>Notes</label>
      <Input.TextArea
        placeholder="Reason for custom discount (e.g., 'Negotiated with principal on Jan 5, 2025')"
        rows={2}
      />
    </div>
  </Col>
</Row>
```

---

## 📊 Real-World Example: Negotiated Pricing

### **Scenario:**
XYZ School has 300 students and negotiated:
- Base price: ₦80/student (instead of ₦100)
- Annual discount: 20% (instead of 15%)
- Additional goodwill discount: ₦10,000

### **Solution:**

**Option A: Create dedicated pricing plan**
1. **Create plan:** "XYZ School - Negotiated 2025"
2. **Set rates:**
   - Base Termly: ₦80
   - Base Annual: ₦240 (₦80 × 3)
   - Annual Discount: 20%
3. **When billing XYZ:**
   - Select "XYZ School - Negotiated 2025"
   - Select "Annual"
   - Add ₦10,000 in custom discount field
   - **Result:**
     - Base: 300 × ₦240 = ₦72,000
     - Add-ons: ₦50,000
     - Subtotal: ₦122,000
     - Plan Discount (20%): -₦24,400
     - Custom Discount: -₦10,000
     - **Total: ₦87,600**

**Option B: Use standard plan + custom discount**
1. Select "Standard Plan"
2. Select "Annual"
3. **Calculation before adjustment:**
   - Base: 300 × ₦300 = ₦90,000
   - Add-ons: ₦50,000
   - Subtotal: ₦140,000
   - Plan Discount (15%): -₦21,000
   - **Before custom:** ₦119,000
4. **Add custom discount:** ₦31,400 (to bring total to ₦87,600)
5. **Notes:** "Negotiated 20% discount + ₦10k goodwill (20% on 140k = 28k, +10k = 38k total, but plan already gave 21k, so custom = 31.4k)"

**Recommendation:** Use Option A - clearer and easier to track

---

## 🔐 Access Control

### **Who Can Access What:**

| Feature | Super Admin | School Admin | Parent/Student |
|---------|-------------|--------------|----------------|
| **View Pricing Plans** | ✅ Full Access | ❌ No | ❌ No |
| **Create/Edit Pricing Plans** | ✅ Yes | ❌ No | ❌ No |
| **View All Subscriptions** | ✅ Yes | ❌ No | ❌ No |
| **Create Subscriptions** | ✅ Yes | ❌ No | ❌ No |
| **View Own School's Subscription** | ✅ Yes | ✅ Yes | ❌ No |
| **View Own School's Invoices** | ✅ Yes | ✅ Yes | ❌ No |
| **Submit Payment** | ✅ Yes | ✅ Yes | ❌ No |
| **Verify Payment** | ✅ Yes | ❌ No | ❌ No |

---

## 📁 Where Files Are Located

### **Frontend:**
1. **`PricingPlanManagement.tsx`** - `/elscholar-ui/src/feature-module/settings/`
   - Manage global pricing plans

2. **`school-list.tsx`** - `/elscholar-ui/src/feature-module/peoples/school-Setup/`
   - Enable features & create subscriptions

### **Backend:**
3. **`subscription_billing.js`** - `/elscholar-api/src/controllers/`
   - All billing API endpoints

4. **`school_creation.js`** - `/elscholar-api/src/controllers/`
   - School CRUD + feature toggles

### **Database:**
5. **`subscription_pricing`** table - Pricing plans
6. **`school_subscriptions`** table - Active subscriptions
7. **`subscription_invoices`** table - Generated invoices
8. **`subscription_payments`** table - Payment records

---

## 🎯 Quick Reference: Common Tasks

### **Task 1: Change Base Price for All Schools**
1. Go to Pricing Plan Management
2. Edit "Standard Plan"
3. Update base prices
4. Save
5. **Effect:** New subscriptions use new price, existing subscriptions unchanged

---

### **Task 2: Give One School a Special Rate**
1. Create new pricing plan: "School X - Special"
2. Set their negotiated rates
3. When creating subscription for School X, select their special plan
4. **Effect:** Only School X gets special rate

---

### **Task 3: Apply One-Time Discount**
1. Create subscription normally
2. Add amount in "Custom Discount" field
3. Add note explaining why
4. **Effect:** Discount applied to this subscription only

---

### **Task 4: Increase Prices Next Term**
1. Create new pricing plan: "Standard Plan 2026"
2. Set new higher prices
3. Keep old plan active for current subscriptions
4. Use new plan for renewals
5. **Effect:** Existing subscriptions honor old rates, new ones use new rates

---

## 📞 Support & Troubleshooting

### **Q: Where do I set the per-student cost?**
**A:** Pricing Plan Management → Create/Edit Plan → Base Price Per Student

---

### **Q: Where do I set add-on feature costs (SMS, WhatsApp, etc.)?**
**A:** Pricing Plan Management → Create/Edit Plan → Add-on Features tabs

---

### **Q: How do I give a school a custom rate?**
**A:** Create a school-specific pricing plan OR use custom discount field

---

### **Q: Where do I see what a school will be charged?**
**A:** School List → Billing button → Cost breakdown shows full calculation

---

### **Q: Can I change pricing after subscription is created?**
**A:** No, subscription locks in pricing. Create new subscription for next term with new rates.

---

### **Q: Where do I enable features (SMS, WhatsApp) for a school?**
**A:** School List → Edit → Features & Modules tab → Toggle switches

---

**Last Updated:** 2025-01-08
**Version:** 1.0
