# Integrating Messaging Packages into School Billing System

## 🎯 Goal

Allow **Super Admin** to select messaging packages (SMS, WhatsApp, Email) for schools when creating subscriptions in the billing modal. Schools can also choose packages themselves if they want.

---

## 📊 Current State

You have TWO separate systems:

### **System 1: Messaging Packages** (communications.sql)
- **Table:** `messaging_packages`
- **Table:** `messaging_subscriptions`
- **Table:** `messaging_usage`
- **Purpose:** Track SMS/WhatsApp/Email packages and usage

### **System 2: School Billing** (school_billing_setup.sql)
- **Table:** `subscription_pricing`
- **Table:** `school_subscriptions`
- **Table:** `subscription_invoices`
- **Purpose:** Track overall school subscription and billing

---

## 🔗 Integration Strategy

We'll merge them so:
1. **Super Admin creates school subscription** in billing modal
2. **Super Admin can also select** SMS, WhatsApp, Email packages for the school
3. **Packages are automatically subscribed** when subscription is created
4. **Schools can later change** their messaging packages if allowed

---

## 💻 Implementation

### **STEP 1: Update Billing Modal State**

Add to `/elscholar-ui/src/feature-module/peoples/school-Setup/school-list.tsx`:

```typescript
// Around line 105, add these state variables:
const [messagingPackages, setMessagingPackages] = useState<any>({
  sms: [],
  whatsapp: [],
  email: [],
});
const [selectedMessagingPackages, setSelectedMessagingPackages] = useState<any>({
  sms: null,
  whatsapp: null,
  email: null,
});
```

### **STEP 2: Fetch Messaging Packages**

Add this function:

```typescript
const getMessagingPackages = () => {
  _get(
    "api/messaging-packages",
    (res: any) => {
      const packages = res.data || [];

      // Group by service type
      const grouped = {
        sms: packages.filter((p: any) => p.service_type === "sms" && p.is_active === 1),
        whatsapp: packages.filter((p: any) => p.service_type === "whatsapp" && p.is_active === 1),
        email: packages.filter((p: any) => p.service_type === "email" && p.is_active === 1),
      };

      setMessagingPackages(grouped);
    },
    (err: any) => {
      console.error(err);
    }
  );
};

// Call it in useEffect:
useEffect(() => {
  getSchools();
  getPricingPlans();
  getMessagingPackages();  // ← ADD THIS
}, []);
```

### **STEP 3: Add Messaging Package Selection to Billing Modal**

In the billing modal, after the "Enabled Features" section, add:

```tsx
<Divider orientation="left">Messaging Package Selection</Divider>

<Alert
  message="Optional: Assign messaging packages to this school"
  description="If you don't select packages now, the school can choose them later in Communication Setup."
  type="info"
  showIcon
  style={{ marginBottom: 16 }}
/>

{/* SMS Package Selection */}
{selectedSchool.sms_subscription === 1 && (
  <Row gutter={16} className="mb-3">
    <Col span={24}>
      <div className="form-group">
        <label>
          SMS Package{" "}
          <Tag color="blue">Optional</Tag>
        </label>
        <Select
          className="w-100"
          placeholder="Select SMS package (or leave blank)"
          value={selectedMessagingPackages.sms}
          onChange={(value) =>
            setSelectedMessagingPackages({
              ...selectedMessagingPackages,
              sms: value,
            })
          }
          allowClear
        >
          <Option value={null}>No Package (School chooses later)</Option>
          <OptGroup label="Pay-As-You-Go">
            {messagingPackages.sms
              .filter((p: any) => p.package_type === "payg")
              .map((pkg: any) => (
                <Option key={pkg.id} value={pkg.id}>
                  {pkg.package_name} - ₦{parseFloat(pkg.unit_cost).toFixed(2)}/msg
                </Option>
              ))}
          </OptGroup>
          <OptGroup label="Termly Packages">
            {messagingPackages.sms
              .filter((p: any) => p.package_type === "termly")
              .map((pkg: any) => (
                <Option key={pkg.id} value={pkg.id}>
                  {pkg.package_name} - {pkg.messages_per_term} messages for ₦
                  {parseFloat(pkg.package_cost).toFixed(2)}
                </Option>
              ))}
          </OptGroup>
        </Select>
        <small className="text-muted">
          Assigns SMS package to school immediately
        </small>
      </div>
    </Col>
  </Row>
)}

{/* WhatsApp Package Selection */}
{selectedSchool.whatsapp_subscription === 1 && (
  <Row gutter={16} className="mb-3">
    <Col span={24}>
      <div className="form-group">
        <label>
          WhatsApp Package{" "}
          <Tag color="blue">Optional</Tag>
        </label>
        <Select
          className="w-100"
          placeholder="Select WhatsApp package (or leave blank)"
          value={selectedMessagingPackages.whatsapp}
          onChange={(value) =>
            setSelectedMessagingPackages({
              ...selectedMessagingPackages,
              whatsapp: value,
            })
          }
          allowClear
        >
          <Option value={null}>No Package (School chooses later)</Option>
          <OptGroup label="Pay-As-You-Go">
            {messagingPackages.whatsapp
              .filter((p: any) => p.package_type === "payg")
              .map((pkg: any) => (
                <Option key={pkg.id} value={pkg.id}>
                  {pkg.package_name} - ₦{parseFloat(pkg.unit_cost).toFixed(2)}/msg
                </Option>
              ))}
          </OptGroup>
          <OptGroup label="Termly Packages">
            {messagingPackages.whatsapp
              .filter((p: any) => p.package_type === "termly")
              .map((pkg: any) => (
                <Option key={pkg.id} value={pkg.id}>
                  {pkg.package_name} - {pkg.messages_per_term} messages for ₦
                  {parseFloat(pkg.package_cost).toFixed(2)}
                </Option>
              ))}
          </OptGroup>
        </Select>
        <small className="text-muted">
          Assigns WhatsApp package to school immediately
        </small>
      </div>
    </Col>
  </Row>
)}

{/* Email Package Selection */}
{selectedSchool.email_subscription === 1 && (
  <Row gutter={16} className="mb-3">
    <Col span={24}>
      <div className="form-group">
        <label>
          Email Package{" "}
          <Tag color="blue">Optional</Tag>
        </label>
        <Select
          className="w-100"
          placeholder="Select Email package (or leave blank)"
          value={selectedMessagingPackages.email}
          onChange={(value) =>
            setSelectedMessagingPackages({
              ...selectedMessagingPackages,
              email: value,
            })
          }
          allowClear
        >
          <Option value={null}>No Package (School chooses later)</Option>
          <OptGroup label="Pay-As-You-Go">
            {messagingPackages.email
              .filter((p: any) => p.package_type === "payg")
              .map((pkg: any) => (
                <Option key={pkg.id} value={pkg.id}>
                  {pkg.package_name} - ₦{parseFloat(pkg.unit_cost).toFixed(2)}/email
                </Option>
              ))}
          </OptGroup>
          <OptGroup label="Termly Packages">
            {messagingPackages.email
              .filter((p: any) => p.package_type === "termly")
              .map((pkg: any) => (
                <Option key={pkg.id} value={pkg.id}>
                  {pkg.package_name} - {pkg.messages_per_term} emails for ₦
                  {parseFloat(pkg.package_cost).toFixed(2)}
                </Option>
              ))}
          </OptGroup>
        </Select>
        <small className="text-muted">
          Assigns Email package to school immediately
        </small>
      </div>
    </Col>
  </Row>
)}
```

### **STEP 4: Update handleCreateSubscription Function**

```typescript
const handleCreateSubscription = () => {
  if (!selectedSchool || !selectedPricingPlan || !billingCalculation) {
    message.error("Please complete all billing information");
    return;
  }

  if (customDiscount > 0 && !discountNotes.trim()) {
    message.error("Please add notes explaining the custom discount");
    return;
  }

  const payload = {
    school_id: selectedSchool.school_id,
    subscription_type: subscriptionType,
    pricing_plan_id: selectedPricingPlan,
    active_students_count: billingCalculation.active_students_count,
    cbt_stand_alone_enabled: selectedSchool.cbt_stand_alone || 0,
    sms_subscription_enabled: selectedSchool.sms_subscription || 0,
    whatsapp_subscription_enabled: selectedSchool.whatsapp_subscription || 0,
    email_subscription_enabled: selectedSchool.email_subscription || 0,
    express_finance_enabled: selectedSchool.express_finance || 0,
    base_cost: billingCalculation.base_cost,
    addon_cost: billingCalculation.addon_cost,
    discount_amount: billingCalculation.discount_amount,
    total_cost: billingCalculation.total_cost,
    current_term: selectedSchool.term,
    academic_year: selectedSchool.academic_year,
    custom_discount: customDiscount,
    discount_notes: discountNotes,

    // ✅ ADD MESSAGING PACKAGES
    messaging_packages: {
      sms: selectedMessagingPackages.sms,
      whatsapp: selectedMessagingPackages.whatsapp,
      email: selectedMessagingPackages.email,
    },
  };

  _post(
    "api/create-subscription",
    payload,
    (res: any) => {
      if (res.success) {
        message.success("Subscription created successfully!");
        if (
          selectedMessagingPackages.sms ||
          selectedMessagingPackages.whatsapp ||
          selectedMessagingPackages.email
        ) {
          message.info("Messaging packages assigned to school!");
        }

        setIsBillingModalVisible(false);
        setBillingCalculation(null);
        setSelectedPricingPlan(null);
        setCustomDiscount(0);
        setDiscountNotes("");
        // ✅ RESET MESSAGING PACKAGES
        setSelectedMessagingPackages({
          sms: null,
          whatsapp: null,
          email: null,
        });
      }
    },
    (err: any) => {
      message.error(err.message || "Error creating subscription");
    }
  );
};
```

### **STEP 5: Create Backend API Endpoint for Messaging Packages**

Add to `/elscholar-api/src/controllers/subscription_billing.js`:

```javascript
/**
 * Get all active messaging packages
 */
const getMessagingPackages = async (req, res) => {
  try {
    const results = await db.sequelize.query(
      `SELECT * FROM messaging_packages WHERE is_active = 1 ORDER BY service_type, package_type, messages_per_term`,
      {
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error fetching messaging packages:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching messaging packages",
      error: err.message,
    });
  }
};

// Export it
module.exports = {
  // ... existing exports
  getMessagingPackages,
};
```

### **STEP 6: Update Create Subscription Backend to Handle Messaging Packages**

Update the `createSubscription` function in `subscription_billing.js`:

```javascript
const createSubscription = async (req, res) => {
  const {
    school_id,
    subscription_type,
    pricing_plan_id,
    active_students_count,
    cbt_stand_alone_enabled,
    sms_subscription_enabled,
    whatsapp_subscription_enabled,
    email_subscription_enabled,
    express_finance_enabled,
    base_cost,
    addon_cost,
    discount_amount,
    total_cost,
    current_term,
    academic_year,
    custom_discount = 0,
    discount_notes = "",
    messaging_packages = {},  // ✅ NEW
  } = req.body;

  // ... existing validation ...

  try {
    // ... existing subscription creation code ...

    const subscription_id = subscriptionResult[0];

    // ... existing invoice generation code ...

    // ✅ ADD: Auto-subscribe to messaging packages if selected
    if (messaging_packages.sms) {
      await subscribeToMessagingPackage(school_id, messaging_packages.sms, subscription_type);
    }
    if (messaging_packages.whatsapp) {
      await subscribeToMessagingPackage(school_id, messaging_packages.whatsapp, subscription_type);
    }
    if (messaging_packages.email) {
      await subscribeToMessagingPackage(school_id, messaging_packages.email, subscription_type);
    }

    res.json({
      success: true,
      message: "Subscription created and invoice generated successfully",
      data: {
        subscription_id,
        invoice_number: invoiceNumber,
      },
    });
  } catch (err) {
    console.error("Error creating subscription:", err);
    res.status(500).json({
      success: false,
      message: "Error creating subscription",
      error: err.message,
    });
  }
};

/**
 * Helper function to subscribe school to messaging package
 */
const subscribeToMessagingPackage = async (school_id, package_id, subscription_type) => {
  // Calculate dates based on subscription type
  const start_date = new Date();
  let end_date = new Date();

  if (subscription_type === "termly") {
    end_date.setMonth(end_date.getMonth() + 4); // 4 months per term
  } else {
    end_date.setMonth(end_date.getMonth() + 12); // 12 months for annual
  }

  // Get package details
  const package_details = await db.sequelize.query(
    `SELECT * FROM messaging_packages WHERE id = :package_id`,
    {
      replacements: { package_id },
      type: db.sequelize.QueryTypes.SELECT,
    }
  );

  if (package_details.length === 0) {
    throw new Error(`Messaging package ${package_id} not found`);
  }

  const pkg = package_details[0];

  // Check if school already has active subscription for this service
  const existing = await db.sequelize.query(
    `SELECT id FROM messaging_subscriptions
     WHERE school_id = :school_id
     AND package_id IN (SELECT id FROM messaging_packages WHERE service_type = :service_type)
     AND status = 'active'`,
    {
      replacements: {
        school_id,
        service_type: pkg.service_type,
      },
      type: db.sequelize.QueryTypes.SELECT,
    }
  );

  if (existing.length > 0) {
    // Cancel old subscription
    await db.sequelize.query(
      `UPDATE messaging_subscriptions SET status = 'inactive' WHERE id = :id`,
      {
        replacements: { id: existing[0].id },
        type: db.sequelize.QueryTypes.UPDATE,
      }
    );
  }

  // Create new messaging subscription
  await db.sequelize.query(
    `INSERT INTO messaging_subscriptions (
      school_id, package_id, start_date, end_date, total_messages, messages_used, status
    ) VALUES (
      :school_id, :package_id, :start_date, :end_date, :total_messages, 0, 'active'
    )`,
    {
      replacements: {
        school_id,
        package_id,
        start_date: start_date.toISOString().split("T")[0],
        end_date: end_date.toISOString().split("T")[0],
        total_messages: pkg.messages_per_term || 0,
      },
      type: db.sequelize.QueryTypes.INSERT,
    }
  );
};
```

### **STEP 7: Add API Route**

In your routes file:

```javascript
router.get('/api/messaging-packages', subscriptionBilling.getMessagingPackages);
```

---

## 📊 How It Works

### **Workflow 1: Super Admin Sets Everything**

1. **Super Admin** opens billing modal for a school
2. **Selects** pricing plan (e.g., Standard Plan)
3. **Selects** subscription type (Termly/Annual)
4. **Optionally selects** messaging packages:
   - SMS: Silver - 1,200 messages for ₦3,000
   - WhatsApp: Bronze - 300 messages for ₦500
   - Email: No package (school chooses later)
5. **Creates subscription**
6. **System automatically:**
   - Creates school_subscriptions record
   - Generates invoice
   - Creates messaging_subscriptions for SMS & WhatsApp
   - School can now use 1,200 SMS and 300 WhatsApp messages

### **Workflow 2: School Chooses Later**

1. **Super Admin** creates subscription WITHOUT selecting messaging packages
2. **School admin** goes to Communication Setup
3. **School admin** selects SMS, WhatsApp, Email packages
4. **School admin** subscribes to packages
5. **Usage starts tracking**

---

## 🎯 Benefits

1. ✅ **One-stop setup** - Super admin can configure everything at once
2. ✅ **Flexibility** - Schools can still change packages later
3. ✅ **Audit trail** - All subscriptions tracked in database
4. ✅ **No confusion** - Clear which packages are assigned
5. ✅ **Optional** - Don't have to select messaging packages if don't want to

---

## 📁 Files to Update

1. **Frontend:**
   - `/elscholar-ui/src/feature-module/peoples/school-Setup/school-list.tsx`

2. **Backend:**
   - `/elscholar-api/src/controllers/subscription_billing.js`
   - `/elscholar-api/src/routes/index.js` (add route)

---

## ✅ Testing

1. Create subscription with messaging packages selected
2. Check `messaging_subscriptions` table - should have 3 rows (SMS, WhatsApp, Email)
3. Go to Communication Setup as school admin
4. Verify packages show as active
5. Send test message - should deduct from package

---

**Last Updated:** 2025-01-08
