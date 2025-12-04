# Paystack Split Payment Configuration Guide

This document explains how to configure Paystack split payments for the Elite Scholar application.

## Overview

The Elite Scholar application uses Paystack's split payment functionality to distribute payments between the platform and vendors/schools. This allows for automated commission calculations and revenue distribution.

## Configuration

### 1. Environment Variables

Add the following to your `.env` file:

```env
PAYSTACK_SPLIT_CODE= # Your master split code for default transactions
```

### 2. Database Configuration

The `vendor_payment_configs` table has been added to support split payments:

```sql
CREATE TABLE vendor_payment_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    paystack_secret_key VARCHAR(255),
    paystack_public_key VARCHAR(255),
    paystack_subaccount_code VARCHAR(255), -- For split payment functionality
    paystack_split_code VARCHAR(255),       -- For predefined split configuration
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    account_name VARCHAR(255),
    commission_percentage DECIMAL(5,2) DEFAULT 0.00, -- Vendor's commission percentage (e.g., 80.00 for 80%)
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_id (user_id)
);
```

### 3. Paystack Setup

To use split payments, you need to set up:

1. **Subaccounts**: Create subaccounts for each vendor/school in your Paystack dashboard
2. **Split Rules**: Define how payments should be split between the platform and vendors
3. **API Keys**: Configure appropriate API keys in the database

### 4. How Split Payments Work

When a payment is initiated:

1. If the user has a configured subaccount (`paystack_subaccount_code`) in the `vendor_payment_configs` table, the payment is processed using that subaccount
2. The `commission_percentage` field defines what percentage goes to the vendor
3. If no specific subaccount is configured, the payment uses the default `PAYSTACK_SPLIT_CODE` from the environment
4. Transaction charges are typically borne by the subaccount (vendor), leaving the platform with net revenue

### 5. API Integration

The `paystackService.js` has been updated to:

- Check for vendor-specific configuration in the `vendor_payment_configs` table
- Apply split payment rules based on vendor configuration
- Fall back to platform-wide split configuration if needed

## Implementation

1. Create subaccounts for each vendor in Paystack dashboard
2. Add the subaccount codes to the `vendor_payment_configs` table
3. Set the appropriate commission percentages
4. Optionally, set a master split code in `.env` for default transactions

## Example Usage

```javascript
// Example of how payment data is enhanced with split payment information
const paymentData = {
  email: 'customer@example.com',
  amount: 100000, // Amount in kobo
  reference: 'unique-reference',
  currency: 'NGN',
  subaccount: 'ACCT_vend123', // Vendor's subaccount code
  transaction_charge: 0, // Vendor bears charges
  metadata: { /* ... */ }
};
```

## Important Notes

- Always test split payment functionality in Paystack's test environment first
- Ensure that subaccount codes are correctly configured in the database
- Monitor transaction splits carefully during the testing phase
- The commission_percentage field is informational; actual splits are defined in Paystack's dashboard
- Transaction charges can be configured to be borne by either the platform or the subaccount