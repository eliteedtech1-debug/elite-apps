# Overpayment Feature Documentation

## Overview
The overpayment feature automatically distributes excess payments across multiple terms in sequential order: First Term → Second Term → Third Term.

## How It Works

### Scenario Example
If a student has:
- **First Term**: ₦10,000 invoice, ₦0 paid (Balance: ₦10,000)
- **Second Term**: ₦10,000 invoice, ₦0 paid (Balance: ₦10,000)
- **Third Term**: ₦10,000 invoice, ₦0 paid (Balance: ₦10,000)

When paying **₦30,000** from First Term:
1. ✅ First Term: Receives ₦10,000 → Fully paid
2. ✅ Second Term: Receives ₦10,000 → Fully paid
3. ✅ Third Term: Receives ₦10,000 → Fully paid

### Excess Payment Handling
If payment exceeds all term balances, the excess is credited as advance payment for future use.

Example: Paying ₦35,000 when total balance is ₦30,000:
- All three terms are fully paid
- ₦5,000 is credited as advance payment

## Backend Implementation

### New API Endpoints

#### 1. Process Overpayment
```
POST /api/process-overpayment
```

**Request Body:**
```json
{
  "admission_no": "STU001",
  "academic_year": "2024/2025",
  "amount": 30000,
  "payment_method": "Bank Transfer",
  "branch_id": 1,
  "school_id": 1,
  "starting_term": "First Term"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment distributed across 3 term(s)",
  "data": {
    "total_amount": 30000,
    "distributed_amount": 30000,
    "excess_amount": 0,
    "payments": [
      {
        "term": "First Term",
        "amount_paid": 10000,
        "previous_balance": 10000,
        "new_balance": 0,
        "receipt_no": "RCP001"
      },
      {
        "term": "Second Term",
        "amount_paid": 10000,
        "previous_balance": 10000,
        "new_balance": 0,
        "receipt_no": "RCP002"
      },
      {
        "term": "Third Term",
        "amount_paid": 10000,
        "previous_balance": 10000,
        "new_balance": 0,
        "receipt_no": "RCP003"
      }
    ]
  }
}
```

#### 2. Get All Terms Balance
```
GET /api/student-balance-all-terms?admission_no=STU001&academic_year=2024/2025&branch_id=1&school_id=1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "admission_no": "STU001",
    "academic_year": "2024/2025",
    "terms": [
      {
        "term": "First Term",
        "invoice": 10000,
        "paid": 0,
        "balance": 10000
      },
      {
        "term": "Second Term",
        "invoice": 10000,
        "paid": 0,
        "balance": 10000
      },
      {
        "term": "Third Term",
        "invoice": 10000,
        "paid": 0,
        "balance": 10000
      }
    ],
    "total_invoice": 30000,
    "total_paid": 0,
    "total_balance": 30000
  }
}
```

## Frontend Implementation

### UI Features

1. **Multi-Term Payment Toggle**: Enable/disable automatic distribution
2. **Payment Distribution Preview**: Shows how payment will be distributed before submission
3. **Balance Summary**: Displays current term balance and total balance across all terms
4. **Advance Payment Alert**: Warns when payment exceeds all outstanding balances

### User Flow

1. Navigate to Class Payments page
2. Click "Pay" button for a student
3. Enter payment amount
4. View automatic distribution preview (if amount > current term balance)
5. Toggle multi-term payment on/off as needed
6. Submit payment
7. View receipts for all affected terms

## Files Modified/Created

### Backend
- ✅ `elscholar-api/src/controllers/overpaymentController.js` (NEW)
- ✅ `elscholar-api/src/routes/overpayment.js` (NEW)
- ✅ `elscholar-api/src/index.js` (MODIFIED - added route)

### Frontend
- ✅ `frontend/src/feature-module/peoples/students/studentPayModals.tsx` (MODIFIED)

## Testing

### Manual Testing Steps

1. **Test Single Term Payment**
   - Pay exact balance amount
   - Verify only current term is updated

2. **Test Multi-Term Distribution**
   - Pay amount exceeding current term balance
   - Verify payment distributes to next terms
   - Check all receipts are generated

3. **Test Excess Payment**
   - Pay amount exceeding all term balances
   - Verify excess is credited as advance payment

4. **Test Toggle Functionality**
   - Disable multi-term payment
   - Verify overpayment stays in current term only

## Database Impact

The feature uses existing tables:
- `payment_entries`: Stores individual payment records per term
- `journal_entries`: Maintains accounting compliance
- No schema changes required

## Security Considerations

- ✅ JWT authentication required
- ✅ Branch and school isolation enforced
- ✅ Transaction rollback on any failure
- ✅ Audit trail maintained for all payments

## Future Enhancements

- [ ] Support for custom term order
- [ ] Partial term payment distribution
- [ ] Bulk overpayment processing
- [ ] Email notifications for multi-term payments
- [ ] Overpayment refund workflow
