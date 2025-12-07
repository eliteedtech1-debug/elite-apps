# Subscription Pricing Model

## 📊 Overview

Elite Scholar uses a **per-student per-term** pricing model where packages control **FEATURES**, not student/teacher limits.

**Key Points**:
- ✅ Unlimited students and teachers on ALL packages
- ✅ Packages determine which features are accessible
- ✅ Pricing based on active student count per term
- ✅ 15% discount for annual payment (3 terms upfront)

---

## 💰 Package Pricing

### Standard Package - NGN 500/student/term
**Features Included**:
- Student Management
- Teacher Management
- Class Management
- Examinations
- Fee Collection
- Reports
- Communication

**Best For**: Schools starting out or needing core functionality

### Premium Package - NGN 700/student/term
**Features Included**:
- All Standard features PLUS:
- Accounting
- Lesson Plans
- Advanced Reports

**Best For**: Established schools needing financial management

### Elite Package - NGN 1,000/student/term
**Features Included**:
- All Premium features PLUS:
- Recitation Module
- Payroll Management
- Asset Management
- Inventory Management
- All future features

**Best For**: Large schools needing complete system access

---

## 🧮 Pricing Calculations

### Formula

**Per Term**:
```
Total = Package Price × Number of Active Students
```

**Annual (3 Terms with 15% Discount)**:
```
Subtotal = Package Price × Number of Students × 3
Discount = Subtotal × 0.15
Total = Subtotal - Discount
```

### Examples

#### Example 1: Small School (200 students)

**Standard Package**:
- Per Term: NGN 500 × 200 = **NGN 100,000**
- Annual: (NGN 500 × 200 × 3) - 15% = **NGN 255,000**
- Savings: NGN 45,000

**Premium Package**:
- Per Term: NGN 700 × 200 = **NGN 140,000**
- Annual: (NGN 700 × 200 × 3) - 15% = **NGN 357,000**
- Savings: NGN 63,000

**Elite Package**:
- Per Term: NGN 1,000 × 200 = **NGN 200,000**
- Annual: (NGN 1,000 × 200 × 3) - 15% = **NGN 510,000**
- Savings: NGN 90,000

#### Example 2: Medium School (500 students)

**Standard Package**:
- Per Term: NGN 500 × 500 = **NGN 250,000**
- Annual: (NGN 500 × 500 × 3) - 15% = **NGN 637,500**
- Savings: NGN 112,500

**Premium Package**:
- Per Term: NGN 700 × 500 = **NGN 350,000**
- Annual: (NGN 700 × 500 × 3) - 15% = **NGN 892,500**
- Savings: NGN 157,500

**Elite Package**:
- Per Term: NGN 1,000 × 500 = **NGN 500,000**
- Annual: (NGN 1,000 × 500 × 3) - 15% = **NGN 1,275,000**
- Savings: NGN 225,000

#### Example 3: Large School (2,000 students)

**Standard Package**:
- Per Term: NGN 500 × 2,000 = **NGN 1,000,000**
- Annual: (NGN 500 × 2,000 × 3) - 15% = **NGN 2,550,000**
- Savings: NGN 450,000

**Premium Package**:
- Per Term: NGN 700 × 2,000 = **NGN 1,400,000**
- Annual: (NGN 700 × 2,000 × 3) - 15% = **NGN 3,570,000**
- Savings: NGN 630,000

**Elite Package**:
- Per Term: NGN 1,000 × 2,000 = **NGN 2,000,000**
- Annual: (NGN 1,000 × 2,000 × 3) - 15% = **NGN 5,100,000**
- Savings: NGN 900,000

---

## 🎯 Custom Features

Schools can add custom features beyond their package at additional cost:

**Custom Feature Pricing**:
- Additional feature: Negotiated per school
- Custom development: Quoted separately
- Integration services: Quoted separately

**Calculation**:
```
Total = (Base Package Cost + Custom Features Cost) × Students × Terms - Discount
```

---

## 📅 Payment Terms

### Per Term Payment
- Payment due at start of each term
- No discount applied
- Flexible for schools with cash flow constraints

### Annual Payment (Recommended)
- Pay for all 3 terms upfront
- Automatic 15% discount
- Best value for schools

### Payment Schedule
- **1st Term**: September - December
- **2nd Term**: January - April
- **3rd Term**: May - August

---

## 🔄 Mid-Term Changes

### Upgrading Package
- Prorated charge for remaining term
- New features activated immediately
- No refund for downgrade

### Student Count Changes
- Billing based on active students at term start
- Mid-term additions: Prorated charge
- Mid-term removals: No refund (credit to next term)

---

## 💳 Invoice Generation

### Automatic Invoicing
```javascript
// Invoice calculation
const baseAmount = packagePrice × activeStudents;
const customFeaturesAmount = customFeatures.reduce((sum, f) => sum + f.price, 0);
const termTotal = baseAmount + customFeaturesAmount;

// If annual payment
if (paymentType === 'annual') {
  const annualTotal = termTotal × 3;
  const discount = annualTotal × 0.15;
  const finalAmount = annualTotal - discount;
}
```

### Invoice Details
- School ID
- Package name and price
- Active student count
- Custom features (if any)
- Subtotal
- Discount (if annual)
- Total amount
- Due date
- Payment status

---

## 📊 Database Schema

### subscription_packages
```sql
- package_name: 'standard', 'premium', 'elite'
- price_monthly: Per student per term price (NGN)
- features: JSON array of feature codes
- max_students: NULL (unlimited)
- max_teachers: NULL (unlimited)
```

### rbac_school_packages
```sql
- school_id: School identifier
- package_id: Selected package
- start_date: Subscription start
- end_date: Subscription end
- features_override: Custom features (JSON)
```

### subscription_invoices
```sql
- school_id: School identifier
- amount: Base package amount
- discount_amount: Annual discount (if applicable)
- total_amount: Final amount
- due_date: Payment deadline
- status: 'unpaid', 'paid', 'overdue'
```

---

## 🎓 Example Scenarios

### Scenario 1: New School Starting with Standard
- 150 students
- Chooses Standard Package
- Pays per term
- **Cost**: NGN 500 × 150 = NGN 75,000/term

### Scenario 2: Growing School Upgrading to Premium
- 400 students
- Upgrades from Standard to Premium mid-year
- Pays annually for next year
- **Cost**: NGN 700 × 400 × 3 - 15% = NGN 714,000

### Scenario 3: Large School with Custom Features
- 3,000 students
- Elite Package + Custom SMS Integration (NGN 50/student)
- Pays annually
- **Calculation**:
  - Base: NGN 1,000 × 3,000 × 3 = NGN 9,000,000
  - Custom: NGN 50 × 3,000 × 3 = NGN 450,000
  - Subtotal: NGN 9,450,000
  - Discount (15%): NGN 1,417,500
  - **Total**: NGN 8,032,500

---

## ✅ Benefits of This Model

1. **Scalable**: Schools can grow without worrying about user limits
2. **Fair**: Pay based on actual usage (student count)
3. **Flexible**: Choose features that match needs
4. **Predictable**: Clear pricing structure
5. **Incentivized**: Annual payment saves 15%

---

**Last Updated**: December 7, 2025  
**Currency**: Nigerian Naira (NGN)  
**Discount Rate**: 15% for annual payment
