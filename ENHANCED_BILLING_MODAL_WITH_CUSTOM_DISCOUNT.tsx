// ============================================================
// ENHANCED BILLING MODAL CODE
// ============================================================
// Add this code to your school-list.tsx file
// This adds custom discount functionality for negotiated pricing
// ============================================================

// 1. ADD TO STATE VARIABLES (around line 108):
const [customDiscount, setCustomDiscount] = useState<number>(0);
const [discountNotes, setDiscountNotes] = useState<string>("");

// 2. UPDATE calculateBilling FUNCTION (around line 160):
const calculateBilling = () => {
  if (!selectedSchool || !selectedPricingPlan) return;

  const plan = pricingPlans.find((p) => p.id === selectedPricingPlan);
  if (!plan) return;

  const isAnnual = subscriptionType === "annually";
  const basePrice = isAnnual
    ? plan.base_price_per_student_annum
    : plan.base_price_per_student_term;

  const base_cost = studentCount * basePrice;
  const breakdown: string[] = [
    `Base: ${studentCount} students × ₦${basePrice.toFixed(2)} = ₦${base_cost.toFixed(2)}`,
  ];

  let addon_cost = 0;

  // Add-on costs (existing code)
  if (selectedSchool.cbt_stand_alone === 1) {
    const cost = isAnnual
      ? plan.cbt_stand_alone_cost_annum
      : plan.cbt_stand_alone_cost_term;
    addon_cost += cost;
    breakdown.push(`CBT Stand Alone: ₦${cost.toFixed(2)}`);
  }

  if (selectedSchool.sms_subscription === 1) {
    const cost = isAnnual
      ? plan.sms_subscription_cost_annum
      : plan.sms_subscription_cost_term;
    addon_cost += cost;
    breakdown.push(`SMS Subscription: ₦${cost.toFixed(2)}`);
  }

  if (selectedSchool.whatsapp_subscription === 1) {
    const cost = isAnnual
      ? plan.whatsapp_subscription_cost_annum
      : plan.whatsapp_subscription_cost_term;
    addon_cost += cost;
    breakdown.push(`WhatsApp Subscription: ₦${cost.toFixed(2)}`);
  }

  if (selectedSchool.email_subscription === 1) {
    const cost = isAnnual
      ? plan.email_subscription_cost_annum
      : plan.email_subscription_cost_term;
    addon_cost += cost;
    breakdown.push(`Email Subscription: ₦${cost.toFixed(2)}`);
  }

  if (selectedSchool.express_finance === 1) {
    const cost = isAnnual
      ? plan.express_finance_cost_annum
      : plan.express_finance_cost_term;
    addon_cost += cost;
    breakdown.push(`Express Finance: ₦${cost.toFixed(2)}`);
  }

  const subtotal = base_cost + addon_cost;

  // Plan discount (annual)
  const plan_discount = isAnnual
    ? subtotal * (plan.annual_discount_percentage / 100)
    : 0;

  if (plan_discount > 0) {
    breakdown.push(
      `Annual Discount (${plan.annual_discount_percentage}%): -₦${plan_discount.toFixed(2)}`
    );
  }

  // ✅ CUSTOM/NEGOTIATED DISCOUNT
  if (customDiscount > 0) {
    breakdown.push(
      `Custom Discount (Negotiated): -₦${customDiscount.toFixed(2)}`
    );
  }

  // Total discount = plan discount + custom discount
  const total_discount = plan_discount + customDiscount;

  const total_cost = subtotal - total_discount;

  setBillingCalculation({
    active_students_count: studentCount,
    base_cost,
    addon_cost,
    discount_amount: total_discount,
    total_cost,
    breakdown,
  });
};

// 3. UPDATE useEffect DEPENDENCY (around line 235):
useEffect(() => {
  if (selectedSchool && selectedPricingPlan && studentCount > 0) {
    calculateBilling();
  }
}, [selectedSchool, selectedPricingPlan, subscriptionType, studentCount, customDiscount]); // ← Added customDiscount

// 4. REPLACE BILLING MODAL CONFIGURATION SECTION (around line 950):

{/* EXISTING CODE */}
<Divider orientation="left">Subscription Configuration</Divider>

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
        <Option value="termly">Termly (Per Term)</Option>
        <Option value="annually">Annually (3 Terms)</Option>
      </Select>
    </div>
  </Col>
</Row>

{/* ✅ ADD THIS NEW ROW FOR CUSTOM DISCOUNT */}
<Row gutter={16} className="mb-3">
  <Col span={12}>
    <div className="form-group">
      <label>
        Custom/Negotiated Discount{" "}
        <Tag color="orange">Optional</Tag>
      </label>
      <InputNumber
        style={{ width: "100%" }}
        min={0}
        addonBefore="₦"
        placeholder="Enter negotiated discount amount"
        value={customDiscount}
        onChange={(value) => setCustomDiscount(value || 0)}
      />
      <small className="text-muted">
        Additional discount beyond plan discount (for special agreements)
      </small>
    </div>
  </Col>
  <Col span={12}>
    <div className="form-group">
      <label>Discount Notes/Reason</label>
      <Input.TextArea
        placeholder="Why was this discount given? (e.g., 'Negotiated with principal - signed agreement on file')"
        rows={3}
        value={discountNotes}
        onChange={(e) => setDiscountNotes(e.target.value)}
      />
    </div>
  </Col>
</Row>

{customDiscount > 0 && (
  <Alert
    message="Custom Discount Applied"
    description={`You are applying a ₦${customDiscount.toLocaleString()} discount to this subscription. ${discountNotes ? `Reason: ${discountNotes}` : 'Please add notes explaining why.'}`}
    type="warning"
    showIcon
    style={{ marginBottom: 16 }}
  />
)}

{/* CONTINUE WITH EXISTING CODE... */}
<Divider orientation="left">Enabled Features</Divider>

// ============================================================
// 5. UPDATE handleCreateSubscription FUNCTION (around line 270):
// ============================================================

const handleCreateSubscription = () => {
  if (!selectedSchool || !selectedPricingPlan || !billingCalculation) {
    toast.error("Please complete all billing information");
    return;
  }

  // ✅ VALIDATION: If custom discount is added but no notes
  if (customDiscount > 0 && !discountNotes.trim()) {
    toast.error("Please add notes explaining the custom discount");
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

    // ✅ ADD THESE FIELDS
    custom_discount: customDiscount,
    discount_notes: discountNotes,
  };

  _post(
    "api/create-subscription",
    payload,
    (res: any) => {
      if (res.success) {
        toast.success("Subscription created successfully!");
        setIsBillingModalVisible(false);
        setBillingCalculation(null);
        setSelectedPricingPlan(null);

        // ✅ RESET CUSTOM DISCOUNT FIELDS
        setCustomDiscount(0);
        setDiscountNotes("");
      }
    },
    (err: any) => {
      toast.error(err.message || "Error creating subscription");
    }
  );
};

// ============================================================
// 6. ADD MISSING IMPORT (at top of file):
// ============================================================

import {
  Button,
  Col,
  Input,
  Modal,
  Row,
  Switch,
  Select,
  Tabs,
  Tag,
  Divider,
  Card,
  Statistic,
  Descriptions,
  InputNumber,
  Alert,  // ✅ ADD THIS
} from "antd";

const { TextArea } = Input;  // ✅ ADD THIS

// ============================================================
// DONE! Your billing modal now supports:
// ✅ Custom negotiated discounts
// ✅ Notes/reason for discount (audit trail)
// ✅ Validation (must enter notes if discount applied)
// ✅ Clear display in cost breakdown
// ============================================================
