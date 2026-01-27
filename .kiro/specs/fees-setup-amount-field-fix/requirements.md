# Requirements Document

## Introduction

This specification addresses a usability issue in the FeesSetup component where the amount field becomes disabled when "Items" is selected as the revenue category, preventing users from adjusting the total amount even when they need to override the auto-calculated value.

## Glossary

- **FeesSetup_Component**: The React component responsible for creating and managing school fee structures
- **Amount_Field**: The input field that accepts the total amount for a fee item
- **Revenue_Category**: The classification of fee types (Fees, Items, etc.)
- **Auto_Calculation**: The system's automatic computation of total amount from unit_amount × quantity
- **Catalog_Items**: Pre-defined items from the inventory system with preset prices
- **Unit_Amount**: The price per individual item unit
- **Quantity**: The number of units for an item
- **Override_Capability**: The ability for users to manually modify auto-calculated values

## Requirements

### Requirement 1

**User Story:** As a school administrator, I want to modify the total amount for catalog items, so that I can adjust pricing based on specific circumstances or negotiations.

#### Acceptance Criteria

1. WHEN a user selects "Items" as the revenue category, THE Amount_Field SHALL remain enabled for user input
2. WHEN a user selects a catalog item, THE Amount_Field SHALL be pre-populated with the calculated amount (unit_amount × quantity)
3. WHEN a user manually changes the amount field, THE Amount_Field SHALL accept and retain the user-entered value
4. WHEN unit_amount or quantity fields are modified, THE Amount_Field SHALL update automatically unless the user has manually overridden it
5. WHEN a user clears the amount field after manual override, THE Amount_Field SHALL revert to auto-calculation behavior

### Requirement 2

**User Story:** As a school administrator, I want clear visual feedback about amount calculation, so that I understand when values are auto-calculated versus manually set.

#### Acceptance Criteria

1. WHEN the amount is auto-calculated, THE Amount_Field SHALL display a subtle visual indicator showing it's calculated
2. WHEN the amount is manually overridden, THE Amount_Field SHALL display a visual indicator showing it's been customized
3. WHEN hovering over the amount field, THE System SHALL show a tooltip explaining the current calculation method
4. WHEN switching between auto-calculated and manual modes, THE System SHALL provide clear visual feedback of the state change

### Requirement 3

**User Story:** As a school administrator, I want the system to preserve my manual amount adjustments, so that my pricing decisions are not lost during form interactions.

#### Acceptance Criteria

1. WHEN a user manually sets an amount, THE System SHALL preserve this value during form validation
2. WHEN a user manually sets an amount, THE System SHALL preserve this value when switching between form fields
3. WHEN a user manually sets an amount, THE System SHALL preserve this value during catalog item selection changes
4. WHEN submitting the form with a manual amount, THE System SHALL use the manual amount rather than the calculated amount
5. WHEN editing an existing fee item with a manual amount, THE System SHALL load and display the previously set manual amount

### Requirement 4

**User Story:** As a school administrator, I want to reset manual overrides back to auto-calculation, so that I can easily revert to standard pricing when needed.

#### Acceptance Criteria

1. WHEN a user has manually overridden the amount, THE System SHALL provide a reset mechanism to return to auto-calculation
2. WHEN the reset mechanism is activated, THE Amount_Field SHALL immediately recalculate using unit_amount × quantity
3. WHEN the reset mechanism is activated, THE Amount_Field SHALL return to auto-calculation mode for future unit_amount or quantity changes
4. WHEN the reset mechanism is activated, THE System SHALL provide visual confirmation of the reset action

### Requirement 5

**User Story:** As a school administrator, I want consistent behavior across all revenue categories, so that the interface is predictable and intuitive.

#### Acceptance Criteria

1. WHEN "Fees" revenue category is selected, THE Amount_Field SHALL remain enabled for direct input
2. WHEN "Items" revenue category is selected, THE Amount_Field SHALL remain enabled for direct input
3. WHEN any revenue category is selected, THE Amount_Field SHALL accept manual input without restrictions
4. WHEN switching between revenue categories, THE Amount_Field SHALL maintain its enabled state
5. WHEN form validation occurs, THE Amount_Field SHALL be validated consistently regardless of revenue category