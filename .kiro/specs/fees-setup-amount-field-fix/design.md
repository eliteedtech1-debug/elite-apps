# Design Document

## Overview

This design addresses the usability issue in the FeesSetupModal component where the amount field is incorrectly disabled when "Items" revenue category is selected. The solution implements a flexible amount field that supports both auto-calculation and manual override capabilities while maintaining clear user feedback about the current calculation state.

## Architecture

The solution follows a state-driven approach using React hooks to manage the interaction between auto-calculation and manual override modes:

```
User Input → State Management → UI Feedback → Form Submission
     ↓              ↓              ↓              ↓
Revenue Type → Amount Mode → Visual Indicators → Final Values
Catalog Item → Override Flag → Tooltips/Hints → Validation
Unit/Quantity → Calculations → Field States → API Payload
```

## Components and Interfaces

### Enhanced Amount Field Component

The amount field will be enhanced with the following capabilities:

**State Management:**
- `isManualOverride`: Boolean flag tracking if user has manually set the amount
- `autoCalculatedAmount`: Computed value from unit_amount × quantity
- `manualAmount`: User-entered amount value
- `amountMode`: Enum ('auto' | 'manual') indicating current calculation mode

**Visual Indicators:**
- Auto-calculation mode: Subtle blue border with calculator icon
- Manual override mode: Orange border with edit icon
- Tooltip system showing current calculation method

**Reset Mechanism:**
- Reset button/icon adjacent to amount field when in manual mode
- Click handler to revert to auto-calculation mode
- Visual confirmation of reset action

### Form State Integration

**Enhanced useEffect Hooks:**
```typescript
// Auto-calculation effect (only when not manually overridden)
useEffect(() => {
  if (revenueType === "Items" && !isManualOverride && unitAmount && quantity) {
    const calculated = Number(unitAmount) * Number(quantity);
    setAutoCalculatedAmount(calculated);
    form.setFieldsValue({ amount: calculated });
  }
}, [unitAmount, quantity, revenueType, isManualOverride]);

// Manual override detection
const handleAmountChange = (value: number) => {
  if (revenueType === "Items" && value !== autoCalculatedAmount) {
    setIsManualOverride(true);
    setManualAmount(value);
  }
};
```

**Form Field Configuration:**
```typescript
<Form.Item
  label={
    <Space>
      Amount (NGN)
      {amountMode === 'auto' && <CalculatorOutlined style={{ color: '#1890ff' }} />}
      {amountMode === 'manual' && <EditOutlined style={{ color: '#fa8c16' }} />}
    </Space>
  }
  name="amount"
  rules={[{ required: true, message: "Amount is required, minimum NGN 100" }]}
  tooltip={getAmountTooltip()}
>
  <InputNumber
    style={{ 
      width: "100%",
      borderColor: amountMode === 'manual' ? '#fa8c16' : '#1890ff'
    }}
    min={100}
    placeholder="Enter amount"
    disabled={false} // Always enabled
    onChange={handleAmountChange}
    addonAfter={
      isManualOverride && (
        <Button 
          type="text" 
          size="small" 
          icon={<ReloadOutlined />}
          onClick={handleResetToAutoCalculation}
          title="Reset to auto-calculation"
        />
      )
    }
  />
</Form.Item>
```

## Data Models

### Amount State Model
```typescript
interface AmountState {
  isManualOverride: boolean;
  autoCalculatedAmount: number | null;
  manualAmount: number | null;
  amountMode: 'auto' | 'manual';
}

interface FormValues {
  amount: number;
  unit_amount?: number;
  quantity?: number;
  revenue_type: string;
  // ... other form fields
}
```

### Catalog Item Integration
```typescript
interface CatalogItem {
  product_id: string;
  product_name: string;
  selling_price: number;
  // ... other properties
}

// Enhanced catalog selection handler
const handleCatalogItemSelect = (itemId: string) => {
  const item = catalogItems.find(i => i.product_id === itemId);
  if (item) {
    const calculatedAmount = item.selling_price * (form.getFieldValue('quantity') || 1);
    
    form.setFieldsValue({
      description: item.product_name,
      unit_amount: item.selling_price,
      amount: calculatedAmount
    });
    
    // Reset to auto-calculation mode when selecting catalog item
    setIsManualOverride(false);
    setAutoCalculatedAmount(calculatedAmount);
    setAmountMode('auto');
    setSelectedCatalogItem(itemId);
  }
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Amount Field Always Enabled
*For any* revenue category selection (Fees, Items, or other), the amount field should remain enabled and accept user input without restrictions.
**Validates: Requirements 1.1, 5.1, 5.2, 5.3, 5.4**

### Property 2: Auto-calculation Behavior
*For any* Items revenue type with unit_amount and quantity values, when not manually overridden, the amount field should automatically calculate and display unit_amount × quantity.
**Validates: Requirements 1.2, 1.4**

### Property 3: Manual Override Acceptance
*For any* user-entered amount value, the system should accept, retain, and use the manual value instead of auto-calculated values.
**Validates: Requirements 1.3, 3.4**

### Property 4: Manual Override Persistence
*For any* manually set amount, the value should be preserved during form validation, field navigation, and catalog item selection changes.
**Validates: Requirements 3.1, 3.2, 3.3, 3.5**

### Property 5: Auto-calculation Resume
*For any* amount field that is cleared after manual override, the system should revert to auto-calculation behavior for future unit_amount or quantity changes.
**Validates: Requirements 1.5**

### Property 6: Visual State Indicators
*For any* amount calculation mode (auto or manual), the system should display appropriate visual indicators showing the current calculation method.
**Validates: Requirements 2.1, 2.2, 2.4**

### Property 7: Tooltip Information
*For any* amount field interaction, hovering should display a tooltip explaining the current calculation method and state.
**Validates: Requirements 2.3**

### Property 8: Reset Mechanism Functionality
*For any* manually overridden amount, the system should provide a reset mechanism that immediately recalculates using unit_amount × quantity and returns to auto-calculation mode.
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 9: Consistent Validation
*For any* revenue category, form validation should apply consistent rules to the amount field regardless of calculation mode.
**Validates: Requirements 5.5**

## Error Handling

### Input Validation Errors
- **Invalid Amount Values**: Display clear error messages for amounts below minimum threshold (NGN 100)
- **Missing Required Fields**: Prevent form submission when amount field is empty
- **Calculation Errors**: Handle division by zero or invalid numeric operations gracefully

### State Management Errors
- **State Synchronization**: Ensure amount mode and override flags remain consistent
- **Form Reset Errors**: Handle cases where form reset fails to clear override states
- **Catalog Integration Errors**: Gracefully handle catalog item loading failures

### User Experience Errors
- **Visual Indicator Failures**: Provide fallback text when icons fail to load
- **Tooltip Rendering Issues**: Ensure tooltip content is always readable
- **Reset Button Failures**: Provide alternative reset methods if button fails

## Testing Strategy

### Dual Testing Approach
The testing strategy combines unit tests for specific scenarios with property-based tests for comprehensive coverage:

**Unit Tests Focus:**
- Specific catalog item selection scenarios
- Edge cases like zero quantity or negative amounts  
- Form submission with various revenue categories
- Visual indicator rendering in different states
- Reset button functionality and confirmation

**Property Tests Focus:**
- Amount field enablement across all revenue categories
- Auto-calculation accuracy with random unit amounts and quantities
- Manual override persistence through various form interactions
- Visual state consistency across mode transitions
- Reset mechanism behavior with random override values

**Property Test Configuration:**
- Minimum 100 iterations per property test
- Each property test references its design document property
- Tag format: **Feature: fees-setup-amount-field-fix, Property {number}: {property_text}**

### Test Data Generation
- **Revenue Categories**: Generate tests for all supported categories (Fees, Items)
- **Amount Values**: Test with valid ranges (100-1,000,000 NGN) and edge cases
- **Catalog Items**: Mock catalog data with various price points and quantities
- **Form States**: Test with different combinations of filled/empty form fields
- **User Interactions**: Simulate various user interaction patterns and sequences