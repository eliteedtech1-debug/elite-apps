# School Bank Accounts Feature - Complete Implementation

## Overview
This feature allows schools to manage multiple bank accounts and automatically includes bank details in student invoices and family invoices.

## Implementation Summary

### 1. Database Schema ✅

**Table**: `school_bank_accounts`

**Columns**:
- `id` - Primary key
- `school_id` - School identifier (required)
- `branch_id` - Branch identifier (optional)
- `account_name` - Account holder name (required)
- `account_number` - Bank account number (required, unique per school)
- `bank_name` - Name of the bank (required)
- `bank_code` - Bank code for Nigerian banks (optional)
- `swift_code` - SWIFT/BIC code for international transfers (optional)
- `branch_address` - Bank branch address (optional)
- `is_default` - Flag for default account (0 or 1)
- `status` - Active or Inactive
- `created_at` - Timestamp
- `updated_at` - Timestamp

**Indexes**:
- Primary key on `id`
- Unique constraint on (`school_id`, `account_number`)
- Index on `school_id`
- Index on `branch_id`
- Index on `is_default`
- Index on `status`

### 2. Backend Implementation ✅

**File**: `backend/src/controllers/schoolBankAccounts.js`

**Endpoints**:

#### GET /api/bank-accounts
Get all bank accounts for a school
- **Auth**: JWT required
- **Query params**: `school_id`, `branch_id` (optional)
- **Response**: Array of bank accounts
- **Filters**: By school and optionally by branch
- **Sorting**: Default accounts first, then by created_at DESC

#### GET /api/bank-accounts/default
Get the default bank account for a school
- **Auth**: JWT required
- **Query params**: `school_id`, `branch_id` (optional)
- **Response**: Single bank account object
- **Returns 404** if no default account found

#### POST /api/bank-accounts
Create a new bank account
- **Auth**: JWT required
- **Body**:
  ```json
  {
    "account_name": "Elite Core Academy",
    "account_number": "0123456789",
    "bank_name": "First Bank of Nigeria",
    "bank_code": "011",
    "swift_code": "FBNINGLA",
    "branch_address": "Optional address",
    "is_default": true,
    "branch_id": "default"
  }
  ```
- **Validation**: Checks for duplicate account numbers
- **Auto-management**: If `is_default` is true, unsets other defaults

#### PUT /api/bank-accounts/:accountId
Update a bank account
- **Auth**: JWT required
- **Params**: `accountId`
- **Body**: Any of the createable fields
- **Validation**: Verifies account belongs to school
- **Auto-management**: If setting as default, unsets others

#### DELETE /api/bank-accounts/:accountId
Delete a bank account
- **Auth**: JWT required
- **Params**: `accountId`
- **Validation**: Verifies account belongs to school

#### PATCH /api/bank-accounts/:accountId/set-default
Set account as default
- **Auth**: JWT required
- **Params**: `accountId`
- **Auto-management**: Unsets other defaults and sets this one

**File**: `backend/src/routes/schoolBankAccounts.js`

All routes registered under `/api/bank-accounts` prefix.

**File**: `backend/src/index.js` (Line 273-274)

Route registration:
```javascript
app.use('/api/bank-accounts', require('./routes/schoolBankAccounts'));
```

### 3. Frontend Implementation ✅

**File**: `frontend/src/feature-module/management/finance/BankAccountsManagement.tsx`

**Features**:
- **Table View**: Displays all bank accounts with:
  - Account name with bank icon
  - Default account badge
  - Bank name
  - Account number (copyable)
  - Bank code
  - Status tag (Active/Inactive)
  - Action buttons

- **Add/Edit Modal**:
  - Account name input
  - Bank name input
  - Account number (numeric validation)
  - Bank code
  - SWIFT code (optional)
  - Bank branch address (optional)
  - Set as default toggle
  - Status select

- **Actions**:
  - Add new account
  - Edit existing account
  - Delete account (with confirmation)
  - Set as default (for non-default accounts)

- **Responsive Design**: Works on desktop and mobile

### 4. Integration with Invoices 📋

To integrate bank details into invoices, you need to:

#### a) Student Invoices

**Location**: Invoice generation code (typically in invoice PDF generation)

**Implementation**:
```javascript
// Fetch default bank account
const [bankAccount] = await db.sequelize.query(
  `SELECT account_name, account_number, bank_name, bank_code
   FROM school_bank_accounts
   WHERE school_id = :school_id
     AND is_default = 1
     AND status = 'Active'
   LIMIT 1`,
  {
    replacements: { school_id },
    type: db.Sequelize.QueryTypes.SELECT
  }
);

// Include in invoice template
if (bankAccount) {
  // Add to invoice PDF/HTML
  const bankDetails = {
    accountName: bankAccount.account_name,
    accountNumber: bankAccount.account_number,
    bankName: bankAccount.bank_name,
    bankCode: bankAccount.bank_code
  };
}
```

#### b) Family Invoices

Same implementation as student invoices. Bank details should be fetched and included in the family billing invoice template.

**Example Invoice Section**:
```
PAYMENT DETAILS
----------------
Bank Name: First Bank of Nigeria
Account Number: 0123456789
Account Name: Elite Core Academy
Bank Code: 011
```

### 5. Usage Guide

#### For School Administrators:

1. **Navigate to Finance > Bank Accounts**
2. **Add Your First Account**:
   - Click "Add Bank Account"
   - Fill in account details
   - Check "Set as Default Account"
   - Select status as "Active"
   - Click "Create"

3. **Manage Accounts**:
   - Edit: Click edit icon to modify account details
   - Delete: Click delete icon (with confirmation)
   - Set Default: Click "Set Default" button for any account

4. **Best Practices**:
   - Always have at least one default account
   - Keep account details accurate
   - Deactivate old accounts instead of deleting (preserves history)

### 6. API Examples

#### Create Bank Account
```bash
curl -X POST http://localhost:34567/api/bank-accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-school-id: SCH/1" \
  -H "x-branch-id: default" \
  -d '{
    "account_name": "Elite Core Academy",
    "account_number": "0123456789",
    "bank_name": "First Bank of Nigeria",
    "bank_code": "011",
    "is_default": true
  }'
```

#### Get Default Account
```bash
curl -X GET "http://localhost:34567/api/bank-accounts/default?school_id=SCH/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get All Accounts
```bash
curl -X GET "http://localhost:34567/api/bank-accounts?school_id=SCH/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Account
```bash
curl -X PUT http://localhost:34567/api/bank-accounts/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-school-id: SCH/1" \
  -d '{
    "account_name": "Updated Account Name",
    "status": "Active"
  }'
```

#### Set as Default
```bash
curl -X PATCH http://localhost:34567/api/bank-accounts/1/set-default \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-school-id: SCH/1"
```

#### Delete Account
```bash
curl -X DELETE http://localhost:34567/api/bank-accounts/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-school-id: SCH/1"
```

### 7. Database Queries for Admins

#### View All Bank Accounts
```sql
SELECT
  id,
  school_id,
  account_name,
  account_number,
  bank_name,
  is_default,
  status,
  created_at
FROM school_bank_accounts
ORDER BY school_id, is_default DESC, created_at DESC;
```

#### Find Default Account for a School
```sql
SELECT *
FROM school_bank_accounts
WHERE school_id = 'SCH/1'
  AND is_default = 1
  AND status = 'Active';
```

#### Count Accounts per School
```sql
SELECT
  school_id,
  COUNT(*) as total_accounts,
  SUM(CASE WHEN is_default = 1 THEN 1 ELSE 0 END) as default_accounts,
  SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_accounts
FROM school_bank_accounts
GROUP BY school_id;
```

### 8. Security Considerations

1. **School Isolation**: All endpoints filter by `school_id` from authenticated user
2. **JWT Required**: All endpoints require valid JWT authentication
3. **Ownership Verification**: Update/Delete operations verify account belongs to school
4. **Unique Constraints**: Prevents duplicate account numbers per school
5. **Status Control**: Inactive accounts won't be used in invoices

### 9. Testing Checklist

- [ ] Create a bank account via UI
- [ ] Set account as default
- [ ] Create multiple accounts
- [ ] Switch default account
- [ ] Edit account details
- [ ] Deactivate an account
- [ ] Delete an account
- [ ] Verify default account appears in invoice
- [ ] Verify bank details in family invoice
- [ ] Test with multiple schools (isolation)
- [ ] Test API endpoints with curl/Postman

### 10. Next Steps (To Complete Integration)

#### TODO: Update Invoice Templates

**Files to modify**:
1. Student invoice PDF generation code
2. Family invoice PDF generation code

**Add this function to fetch bank details**:
```javascript
async function getBankDetails(school_id) {
  const [account] = await db.sequelize.query(
    `SELECT account_name, account_number, bank_name, bank_code, swift_code
     FROM school_bank_accounts
     WHERE school_id = :school_id
       AND is_default = 1
       AND status = 'Active'
     LIMIT 1`,
    {
      replacements: { school_id },
      type: db.Sequelize.QueryTypes.SELECT
    }
  );
  return account || null;
}
```

**Include in invoice template**:
```jsx
{bankAccount && (
  <View style={styles.bankSection}>
    <Text style={styles.sectionTitle}>PAYMENT DETAILS</Text>
    <Text>Bank Name: {bankAccount.bank_name}</Text>
    <Text>Account Number: {bankAccount.account_number}</Text>
    <Text>Account Name: {bankAccount.account_name}</Text>
    {bankAccount.bank_code && (
      <Text>Bank Code: {bankAccount.bank_code}</Text>
    )}
  </View>
)}
```

## Files Created/Modified

### New Files:
- `migrations/create_school_bank_accounts.sql`
- `backend/src/controllers/schoolBankAccounts.js`
- `backend/src/routes/schoolBankAccounts.js`
- `frontend/src/feature-module/management/finance/BankAccountsManagement.tsx`
- `CONSOLIDATED_DEPLOYMENT.sql`
- `BANK_ACCOUNTS_IMPLEMENTATION.md` (this file)

### Modified Files:
- `backend/src/index.js` (added route registration)

## Deployment Instructions

### 1. Database Migration
```bash
# SSH into production server
ssh user@server

# Backup database
mysqldump -u root -p skcooly_db > backup_$(date +%Y%m%d).sql

# Run consolidated deployment script
mysql -u root -p skcooly_db < CONSOLIDATED_DEPLOYMENT.sql
```

### 2. Backend Deployment
```bash
# Push to GitHub (triggers auto-deployment)
git add .
git commit -m "feat: add school bank accounts management + teacher soft delete"
git push origin main
```

### 3. Frontend Build
Frontend will be built automatically via GitHub Actions or manually:
```bash
cd frontend
npm run build
```

### 4. Add to Navigation Menu

**File**: Frontend navigation/sidebar configuration

Add menu item:
```javascript
{
  title: 'Bank Accounts',
  icon: <BankOutlined />,
  path: '/finance/bank-accounts',
  component: BankAccountsManagement,
}
```

## Status: ✅ 90% COMPLETE

**Completed**:
- ✅ Database schema
- ✅ Backend API endpoints
- ✅ Frontend UI component
- ✅ API documentation
- ✅ Consolidated SQL deployment file

**Pending**:
- ⏳ Invoice template integration (see section 10)
- ⏳ Navigation menu addition
- ⏳ Frontend route registration

---

## Support

For issues or questions:
- Check API responses for detailed error messages
- Review logs: `pm2 logs elite`
- Database verification queries provided in deployment SQL
- Test with provided curl commands

## License & Credits

Part of Elite Core School Management System
© 2025 Elite EdTech
