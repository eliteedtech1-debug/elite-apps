# ID Card Financial Tracking & Billing Integration

## Overview
This system provides comprehensive financial tracking and billing integration for the Student ID Card Generator, including cost tracking, billing automation, usage analytics, and audit trails.

## Features Implemented

### 1. Cost Tracking for Card Generation and Printing
- **Base Cost Calculation**: Configurable per-card pricing
- **Bulk Discounts**: Automatic discounts for bulk orders
- **Service Types**: Different pricing for basic generation, premium templates, bulk printing, express delivery

### 2. Billing Integration for Schools
- **Automatic Billing**: Creates payment entries and journal entries automatically
- **Payment Processing**: Integration with existing payment_entries system
- **Multiple Payment Modes**: Cash, Bank Transfer, Online, etc.

### 3. Usage Analytics and Reporting
- **Daily/Weekly/Monthly Reports**: Comprehensive usage statistics
- **Revenue Tracking**: Total revenue, average per card, collection rates
- **Cost Analysis**: Breakdown by service type and time period

### 4. Payment Processing for Premium Templates
- **Service-based Pricing**: Different rates for different services
- **Flexible Billing**: Per-card, monthly, quarterly, or annual billing
- **Auto-billing**: Configurable automatic billing

### 5. Financial Audit Trails
- **Complete Transaction History**: Every card generation tracked
- **Journal Entry Integration**: Proper double-entry bookkeeping
- **Audit Logs**: Who, what, when for all financial transactions

## API Endpoints

### Billing Configuration
```
GET    /api/id-card-financial/billing-config
PUT    /api/id-card-financial/billing-config
```

### Cost Calculation
```
POST   /api/id-card-financial/calculate-cost
```

### Billing Management
```
POST   /api/id-card-financial/create-billing
POST   /api/id-card-financial/payment/:financial_tracking_id
```

### Analytics & Reporting
```
GET    /api/id-card-financial/analytics
GET    /api/id-card-financial/report
GET    /api/id-card-financial/audit-trail
```

## Database Schema

### id_card_billing_config
- Stores pricing configuration per school/branch
- Service types: basic_generation, premium_template, bulk_printing, express_delivery
- Bulk discount thresholds and percentages

### id_card_financial_tracking
- Tracks every card generation cost
- Links to payment_entries and journal_entries
- Billing status tracking (pending, billed, paid, waived)

## Integration Points

### With Existing Payment System
- Creates entries in `payment_entries` table
- Generates corresponding `journal_entries` for accounting
- Uses existing payment processing workflows

### With ID Card Generation
- Automatically triggered when cards are generated
- Cost calculation based on template type and quantity
- Financial entries created in real-time

## Usage Examples

### 1. Configure Billing for a School
```javascript
PUT /api/id-card-financial/billing-config
{
  "service_type": "basic_generation",
  "cost_per_unit": 5.00,
  "bulk_discount_threshold": 50,
  "bulk_discount_percentage": 10.00
}
```

### 2. Calculate Cost Before Generation
```javascript
POST /api/id-card-financial/calculate-cost
{
  "template_id": 1,
  "quantity": 25
}

Response:
{
  "success": true,
  "data": {
    "baseCost": 5.00,
    "totalCost": 125.00,
    "discount": 0,
    "quantity": 25
  }
}
```

### 3. Get Usage Analytics
```javascript
GET /api/id-card-financial/analytics?start_date=2024-01-01&end_date=2024-01-31

Response:
{
  "success": true,
  "data": {
    "analytics": [...],
    "summary": {
      "total_cards": 150,
      "total_revenue": 750.00,
      "avg_revenue_per_card": 5.00,
      "paid_cards": 120,
      "pending_cards": 30
    }
  }
}
```

### 4. Generate Financial Report
```javascript
GET /api/id-card-financial/report?report_type=monthly

Response:
{
  "success": true,
  "data": {
    "reportType": "monthly",
    "generatedAt": "2024-01-31T10:00:00Z",
    "data": [
      {
        "cost_type": "generation",
        "total_transactions": 150,
        "total_revenue": 750.00,
        "collected_revenue": 600.00,
        "pending_revenue": 150.00
      }
    ]
  }
}
```

## Security Features

### Authentication & Authorization
- All endpoints require authentication
- School/branch isolation enforced
- User permissions validated

### Data Validation
- Input sanitization and validation
- SQL injection prevention
- Proper error handling

### Audit Trail
- Complete transaction logging
- User action tracking
- Financial compliance

## Installation & Setup

### 1. Run Database Migration
```bash
mysql -u username -p database_name < elscholar-api/database_migrations/id_card_financial_system.sql
```

### 2. Restart Application
The new routes and models will be loaded automatically.

### 3. Configure Default Pricing
Use the billing configuration API to set up pricing for each school.

## Testing

Run the test script to verify integration:
```bash
cd elscholar-api
node test_id_card_financial.js
```

## Monitoring & Maintenance

### Key Metrics to Monitor
- Card generation volume
- Revenue collection rates
- Payment processing success rates
- System performance

### Regular Maintenance
- Review pricing configurations
- Monitor bulk discount usage
- Audit financial reconciliation
- Update service offerings

## Support & Troubleshooting

### Common Issues
1. **Missing billing configuration**: Set up default pricing
2. **Payment entry creation fails**: Check journal entry setup
3. **Analytics not showing**: Verify date ranges and filters

### Logs to Check
- Application logs for service errors
- Database logs for query performance
- Financial audit trail for transaction issues