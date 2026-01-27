# Requirements Document

## Introduction

The Elite Scholar payment receipt system currently has critical data display issues that affect the accuracy and reliability of payment receipts generated for students. The Payment History shows correct data, but Receipt PDFs display incorrect information, leading to confusion and potential compliance issues.

## Glossary

- **Payment_Entry**: Individual record in the payment_entries table representing a fee item or payment transaction
- **Receipt_PDF**: Generated PDF document showing payment details for a student
- **Payment_History**: Display showing all payment transactions for a student in the UI
- **Item_Category**: Classification of payment entries (Items, Fees, Advance Payment, etc.)
- **Payment_Trace_API**: Backend API endpoint `/api/student-payment-trace` that returns payment history data
- **Receipt_Generator**: Frontend component responsible for creating receipt PDFs
- **Payment_Progression**: Step-by-step tracking of partial payments showing running balances
- **Invoice_Items**: Original billed amounts for fees, items, and services
- **Payment_Transactions**: Actual money received from students/parents
- **Running_Balance**: Outstanding amount after each partial payment
- **Payment_Step**: Individual payment in a series of partial payments (1st Payment, 2nd Payment, etc.)

## Requirements

### Requirement 1: Fix Item Type Classification

**User Story:** As a school administrator, I want receipt PDFs to show correct item types (Items, Fees, etc.) instead of all showing as "FEES", so that receipts accurately reflect the nature of each payment.

#### Acceptance Criteria

1. WHEN generating a receipt PDF, THE Receipt_Generator SHALL display the correct item_category for each payment entry
2. WHEN an item has category "Items", THE Receipt_PDF SHALL show "Items" in the type column
3. WHEN an item has category "Fees", THE Receipt_PDF SHALL show "Fees" in the type column
4. WHEN an item has category "Advance Payment", THE Receipt_PDF SHALL show "Advance Payment" in the type column
5. WHEN the item_category is null or undefined, THE Receipt_PDF SHALL default to "FEES" as fallback

### Requirement 2: Fix Payment Amount Display

**User Story:** As a school administrator, I want receipt PDFs to show actual payment amounts instead of 0, so that receipts accurately reflect the amounts paid by students.

#### Acceptance Criteria

1. WHEN generating a receipt PDF, THE Receipt_Generator SHALL use the paid_amount field from payment entries
2. WHEN a payment entry has a paid_amount greater than 0, THE Receipt_PDF SHALL display that amount
3. WHEN calculating total paid, THE Receipt_Generator SHALL sum all paid_amount values correctly
4. WHEN displaying individual item payments, THE Receipt_PDF SHALL show the actual amount paid for each item
5. WHEN an advance payment exists, THE Receipt_PDF SHALL display the correct advance payment amount

### Requirement 3: Fix Outstanding Balance Calculation

**User Story:** As a school administrator, I want receipt PDFs to show correct outstanding balances, so that parents and students know exactly how much they still owe.

#### Acceptance Criteria

1. WHEN calculating outstanding balance, THE Receipt_Generator SHALL use the formula: total_invoice - total_paid
2. WHEN a student has overpaid, THE Receipt_PDF SHALL show negative balance or zero balance appropriately
3. WHEN displaying balance summary, THE Receipt_PDF SHALL match the balance shown in Payment History
4. WHEN advance payments exist, THE Receipt_Generator SHALL account for them in balance calculations
5. WHEN generating historical receipts, THE Receipt_PDF SHALL show the balance at the time of that specific payment

### Requirement 4: Fix Data Mapping Errors

**User Story:** As a system user, I want the receipt generation to handle undefined data gracefully, so that JavaScript errors don't prevent receipt generation.

#### Acceptance Criteria

1. WHEN payment data contains undefined fields, THE Receipt_Generator SHALL provide default values
2. WHEN accessing nested properties, THE Receipt_Generator SHALL use safe navigation to prevent errors
3. WHEN total_paid is undefined, THE Receipt_Generator SHALL default to 0 and log a warning
4. WHEN item descriptions are missing, THE Receipt_PDF SHALL show "Unknown Item" as fallback
5. WHEN payment_mode is undefined, THE Receipt_PDF SHALL show "N/A" as payment method

### Requirement 5: Ensure Data Consistency

**User Story:** As a school administrator, I want receipt PDFs to show the same data as the Payment History display, so that there are no discrepancies between different views of the same information.

#### Acceptance Criteria

1. WHEN Payment History shows specific amounts, THE Receipt_PDF SHALL show identical amounts
2. WHEN Payment History shows item categories, THE Receipt_PDF SHALL show identical categories
3. WHEN Payment History shows payment dates, THE Receipt_PDF SHALL show identical dates
4. WHEN Payment History shows payment methods, THE Receipt_PDF SHALL show identical methods
5. WHEN generating receipts from historical data, THE Receipt_PDF SHALL use the same data source as Payment History

### Requirement 6: Improve Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling and logging in the receipt generation process, so that I can quickly identify and fix data issues.

#### Acceptance Criteria

1. WHEN receipt generation encounters missing data, THE Receipt_Generator SHALL log detailed error information
2. WHEN data transformation fails, THE Receipt_Generator SHALL provide fallback values and continue processing
3. WHEN API responses are malformed, THE Receipt_Generator SHALL validate data structure before processing
4. WHEN PDF generation fails, THE Receipt_Generator SHALL provide clear error messages to users
5. WHEN debugging is enabled, THE Receipt_Generator SHALL log the complete data structure being processed

### Requirement 7: Validate Receipt Data Structure

**User Story:** As a developer, I want the receipt data structure to be validated before PDF generation, so that all required fields are present and correctly formatted.

#### Acceptance Criteria

1. WHEN preparing receipt data, THE Data_Mapper SHALL validate that student information is complete
2. WHEN preparing receipt data, THE Data_Mapper SHALL validate that payment information contains required fields
3. WHEN preparing receipt data, THE Data_Mapper SHALL validate that items array contains valid entries
4. WHEN validation fails, THE Data_Mapper SHALL provide detailed error messages indicating missing fields
5. WHEN all validation passes, THE Data_Mapper SHALL proceed with PDF generation

### Requirement 8: Implement Clear Invoice vs Payment Categorization

**User Story:** As a school administrator, I want receipts to clearly distinguish between invoice items and payment transactions, so that parents can easily understand what they were billed for versus what they actually paid.

#### Acceptance Criteria

1. WHEN displaying receipt items, THE Receipt_PDF SHALL group invoice items separately from payment transactions
2. WHEN showing invoice items, THE Receipt_PDF SHALL display them in an "INVOICE BREAKDOWN" section with clear visual distinction
3. WHEN showing payment transactions, THE Receipt_PDF SHALL display them in a "PAYMENT HISTORY" section with different styling
4. WHEN an item is partially paid, THE Receipt_PDF SHALL show both the invoice amount and paid amount clearly
5. WHEN displaying categories, THE Receipt_PDF SHALL use consistent color coding (e.g., blue for fees, orange for items, green for payments)

### Requirement 9: Implement Partial Payment Tracking

**User Story:** As a parent, I want to see the payment progression for each invoice item, so that I can track how my partial payments have reduced the outstanding balance over time.

#### Acceptance Criteria

1. WHEN an invoice item has partial payments, THE Receipt_PDF SHALL show a payment progression table
2. WHEN displaying payment progression, THE Receipt_PDF SHALL show: Invoice Amount → 1st Payment → Balance → 2nd Payment → Final Balance
3. WHEN multiple payments exist for an item, THE Receipt_PDF SHALL list each payment with date and running balance
4. WHEN showing payment steps, THE Receipt_PDF SHALL format as: "Invoice: ₦30,000 → 1st Payment: ₦20,000 (Balance: ₦10,000) → 2nd Payment: ₦7,000 (Balance: ₦3,000)"
5. WHEN a payment fully settles an item, THE Receipt_PDF SHALL clearly indicate "FULLY PAID" status

### Requirement 10: Fix Historical Receipt Generation

**User Story:** As a school administrator, I want to generate accurate receipts for historical payments, so that I can provide correct documentation for past transactions.

#### Acceptance Criteria

1. WHEN generating historical receipts, THE Receipt_Generator SHALL use payment data from the specific transaction date
2. WHEN historical data contains advance payments, THE Receipt_PDF SHALL display them correctly
3. WHEN historical payments have different item categories, THE Receipt_PDF SHALL show the correct categories
4. WHEN historical receipts are printed, THE Receipt_PDF SHALL show amounts that match the original payment
5. WHEN comparing historical receipts to current data, THE Receipt_PDF SHALL maintain consistency with the Payment History display