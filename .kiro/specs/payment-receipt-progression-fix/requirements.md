# Requirements Document

## Introduction

The Elite Scholar payment receipt system has critical issues that prevent proper receipt generation and payment progression display. The system currently fails to show payment progression in receipts and throws JavaScript errors when accessing payment data. This specification addresses these issues to ensure receipts accurately reflect payment history and provide clear payment progression tracking.

## Glossary

- **Payment_Receipt**: PDF document generated to show payment details and progression
- **Payment_Progression**: Step-by-step display of how payments were applied over time (Invoice → Payment → Balance → Payment → Final Balance)
- **Payment_History**: Complete transaction history for a student showing all payments and balances
- **Receipt_PDF**: React PDF component that generates printable receipt documents
- **Payment_Trace_API**: Backend endpoint `/api/student-payment-trace` returning payment history data
- **Historical_Receipt**: Receipt generated from past payment transactions (not current payment)
- **Item_Category**: Classification of payment entries (Items, Fees, Advance Payment, etc.)
- **Total_Paid_Error**: JavaScript error "Cannot read properties of undefined (reading 'total_paid')"
- **ClassPayments_Component**: Frontend component managing class payment operations
- **PrintHistoricalReceipt_Function**: Function responsible for generating receipts from payment history

## Requirements

### Requirement 1: Fix JavaScript Error in Receipt Generation

**User Story:** As a system user, I want receipt generation to work without JavaScript errors, so that I can successfully print payment receipts.

#### Acceptance Criteria

1. WHEN the `printHistoricalReceipt` function is called, THE System SHALL validate transaction data before processing
2. WHEN transaction data is missing or undefined, THE System SHALL provide default values and log appropriate warnings
3. WHEN accessing `transaction.total_paid` property, THE System SHALL handle undefined values gracefully
4. IF transaction data is completely invalid, THEN THE System SHALL display a user-friendly error message
5. WHEN payment history data is malformed, THE System SHALL sanitize the data before processing

### Requirement 2: Implement Payment Progression Display

**User Story:** As a finance administrator, I want receipts to show payment progression, so that I can track how payments were applied over time.

#### Acceptance Criteria

1. WHEN an invoice item has partial payments, THE Receipt_PDF SHALL display a payment progression table
2. WHEN showing payment progression, THE Receipt_PDF SHALL format as: "Invoice: ₦30,000 → 1st Payment: ₦20,000 (Balance: ₦10,000) → 2nd Payment: ₦7,000 (Balance: ₦3,000)"
3. WHEN multiple payments exist for an item, THE Receipt_PDF SHALL list each payment chronologically with running balance
4. WHEN a payment fully settles an item, THE Receipt_PDF SHALL clearly indicate "FULLY PAID" status
5. WHEN displaying progression steps, THE Receipt_PDF SHALL show payment date and payment method for each step

### Requirement 3: Ensure Data Structure Consistency

**User Story:** As a developer, I want consistent data structures between Payment History UI and Receipt PDF, so that both display the same accurate information.

#### Acceptance Criteria

1. WHEN Payment History UI shows payment data, THE Receipt_PDF SHALL use the same data source and structure
2. WHEN payment amounts are displayed, THE Receipt_PDF SHALL show actual paid amounts instead of zero values
3. WHEN item categories are shown, THE Receipt_PDF SHALL display proper categories (Items, Fees, etc.) instead of generic "FEES"
4. WHEN payment transactions are processed, THE Receipt_PDF SHALL use the `payment_transactions` array from the API response
5. WHEN calculating totals, THE Receipt_PDF SHALL use the `summary.total_paid` field from the API response

### Requirement 4: Implement Robust Error Handling

**User Story:** As a system administrator, I want comprehensive error handling in receipt generation, so that users receive helpful feedback when issues occur.

#### Acceptance Criteria

1. WHEN API data is missing required fields, THE System SHALL provide fallback values and continue processing
2. WHEN PDF generation fails, THE System SHALL display specific error messages indicating the failure reason
3. WHEN payment history is empty, THE System SHALL show an appropriate message instead of generating an empty receipt
4. IF network errors occur during data fetching, THEN THE System SHALL retry the request and inform the user
5. WHEN data validation fails, THE System SHALL log detailed error information for debugging

### Requirement 5: Maintain Receipt Format Standards

**User Story:** As a finance officer, I want receipts to follow standard financial document formats, so that they meet accounting and audit requirements.

#### Acceptance Criteria

1. WHEN generating receipts, THE Receipt_PDF SHALL include all required financial information (amounts, dates, reference numbers)
2. WHEN showing payment progression, THE Receipt_PDF SHALL maintain clear visual hierarchy and readability
3. WHEN displaying monetary amounts, THE Receipt_PDF SHALL format currency consistently with proper decimal places
4. WHEN printing receipts, THE Receipt_PDF SHALL ensure proper page layout and margins for both A4 and POS formats
5. WHEN including school information, THE Receipt_PDF SHALL display complete school details (name, address, contact)

### Requirement 6: Support Multiple Receipt Formats

**User Story:** As a user, I want to generate receipts in different formats, so that I can choose the appropriate format for different use cases.

#### Acceptance Criteria

1. WHEN generating historical receipts, THE System SHALL support both A4 and POS format options
2. WHEN A4 format is selected, THE Receipt_PDF SHALL include detailed payment progression and full school branding
3. WHEN POS format is selected, THE Receipt_PDF SHALL provide compact layout suitable for thermal printers
4. WHEN switching between formats, THE System SHALL maintain the same payment progression data
5. WHEN downloading receipts, THE System SHALL use appropriate filenames indicating the format type

### Requirement 7: Ensure Backward Compatibility

**User Story:** As a system maintainer, I want the fix to maintain backward compatibility, so that existing functionality continues to work without disruption.

#### Acceptance Criteria

1. WHEN existing receipt generation functions are called, THE System SHALL continue to work with current parameters
2. WHEN legacy data structures are encountered, THE System SHALL handle them gracefully without breaking
3. WHEN new payment progression features are added, THE System SHALL not interfere with existing payment processing
4. WHEN API responses change format, THE System SHALL support both old and new response structures
5. WHEN users access historical receipts, THE System SHALL generate them using the enhanced progression display

### Requirement 8: Parse Payment History Data Correctly

**User Story:** As a system component, I want to correctly parse payment history API responses, so that receipt generation uses accurate payment data.

#### Acceptance Criteria

1. WHEN the Payment_Trace_API returns data, THE System SHALL extract `payment_transactions` array for receipt generation
2. WHEN processing payment transactions, THE System SHALL use `total_paid` field from each transaction record
3. WHEN calculating payment progression, THE System SHALL use `total_invoice`, `total_paid`, and `balance` fields correctly
4. WHEN filtering transactions, THE System SHALL exclude 'Advance Payment' items from receipt display
5. WHEN grouping payments by term, THE System SHALL maintain chronological order for progression display

### Requirement 9: Implement Payment Progression Logic

**User Story:** As a finance system, I want to calculate and display payment progression accurately, so that receipts show the complete payment journey.

#### Acceptance Criteria

1. WHEN calculating progression steps, THE System SHALL track running balances after each payment
2. WHEN displaying progression, THE System SHALL show: Initial Invoice Amount → Payment Amount → Remaining Balance
3. WHEN multiple payments exist, THE System SHALL chain them: Balance → Next Payment → New Balance
4. WHEN payments exceed invoice amount, THE System SHALL indicate overpayment status
5. WHEN payments are partial, THE System SHALL clearly show remaining balance at each step

### Requirement 10: Validate Receipt Data Before PDF Generation

**User Story:** As a PDF generator, I want validated data before creating receipts, so that generated documents are accurate and complete.

#### Acceptance Criteria

1. WHEN preparing receipt data, THE System SHALL validate all required fields are present
2. WHEN student information is missing, THE System SHALL use fallback values and log warnings
3. WHEN payment amounts are invalid, THE System SHALL default to zero and indicate data issues
4. WHEN school information is incomplete, THE System SHALL use available data and mark missing fields
5. WHEN validation fails completely, THE System SHALL prevent PDF generation and show error message