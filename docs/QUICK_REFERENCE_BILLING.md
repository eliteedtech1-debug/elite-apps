# 🚀 Quick Reference - School Billing System

## 📍 Where Everything Is

### **To Set Global Pricing:**
**Page:** Settings → Pricing Management
**File:** `PricingPlanManagement.tsx`
**What:** Create/edit pricing plans that apply to all schools

### **To Bill a Specific School:**
**Page:** School Setup → School List → Actions (dropdown) → Billing Setup
**File:** `school-list.tsx`
**What:** Create subscription for one school with optional custom discount

### **To View Invoices:**
**API:** `GET /api/all-invoices` (Super Admin)
**API:** `GET /api/school-invoices?school_id=X` (School specific)

### **To Verify Payments:**
**API:** `GET /api/pending-payments` → `POST /api/verify-payment`

---

## ⚡ Quick Actions

| Task | Steps |
|------|-------|
| **Create Pricing Plan** | Pricing Management → Create → Set prices → Save |
| **Bill a School** | School List → Actions → Billing Setup → Select plan → Create |
| **Add Custom Discount** | Billing modal → Custom Discount field → Enter amount & notes |
| **Assign Messaging Package** | Billing modal → Select SMS/WhatsApp/Email packages |
| **Change Base Price** | Pricing Management → Edit plan → Update price → Save |
| **Give School Special Rate** | Create new plan "School X - Custom" → Use when billing them |

---

## 💰 Billing Formula

```
TERMLY:  Total = (Students × Base) + Add-ons - Custom Discount
ANNUAL:  Total = (Students × Base) + Add-ons - Plan Discount - Custom Discount
```

---

## 🗂️ Key Files

| File | Purpose |
|------|---------|
| `PricingPlanManagement.tsx` | Manage global pricing plans |
| `school-list.tsx` | Enable features & create subscriptions |
| `subscription_billing.js` | All billing APIs |
| `school_billing_setup.sql` | Database schema |

---

## 📞 Common Questions

**Q: Where do I set per-student cost?**
**A:** Pricing Management → Base Price Per Student

**Q: How do I give a school a discount?**
**A:** Billing modal → Custom Discount field

**Q: Can schools choose their own pricing?**
**A:** No, only Super Admin creates subscriptions

**Q: Where do I enable SMS/WhatsApp for a school?**
**A:** School List → Edit → Features & Modules tab

**Q: How do I assign messaging packages?**
**A:** Billing modal → Messaging Package Selection (optional)

---

## ✅ Quick Setup (3 Steps)

1. **Database:** Run `school_billing_setup.sql`
2. **Backend:** Add routes in routes file
3. **Frontend:** Add navigation link to Pricing Management

Done!

---

**Last Updated:** 2025-01-08
