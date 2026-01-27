# Design Document: Toast to Ant Design Message Migration

## Overview

This design outlines the migration strategy from react-toastify to Ant Design's native message component in the Elite Scholar application. The migration will eliminate an external dependency while maintaining consistent user notification functionality using the existing Ant Design framework.

Based on research, Ant Design's message API provides equivalent functionality to react-toastify with similar method signatures and behavior patterns. The migration involves systematic replacement of toast method calls, import statement updates, and dependency cleanup.

## Architecture

### Current Architecture
```
React Components → react-toastify → Toast Notifications
                ↓
            ToastContainer (DOM)
```

### Target Architecture
```
React Components → Ant Design Message API → Message Notifications
                ↓
            Built-in Message Container (DOM)
```

### Migration Strategy

The migration follows a **direct replacement pattern** where:
- `message.success()` → `message.success()`
- `message.error()` → `message.error()`
- `message.warning()` → `message.warning()`
- `message.info()` → `message.info()`

## Components and Interfaces

### Message API Interface

Based on Ant Design documentation, the message API provides these methods:

```typescript
interface MessageAPI {
  success(content: string | ReactNode, duration?: number, onClose?: () => void): void;
  error(content: string | ReactNode, duration?: number, onClose?: () => void): void;
  warning(content: string | ReactNode, duration?: number, onClose?: () => void): void;
  info(content: string | ReactNode, duration?: number, onClose?: () => void): void;
  loading(content: string | ReactNode, duration?: number, onClose?: () => void): void;
}
```

### Import Pattern Changes

**Before (react-toastify):**
```typescript
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
```

**After (Ant Design):**
```typescript
import { message } from 'antd';
```

### Method Call Transformations

**Success Messages:**
```typescript
// Before
message.success("Operation completed successfully");

// After  
message.success("Operation completed successfully");
```

**Error Messages:**
```typescript
// Before
message.error("An error occurred");

// After
message.error("An error occurred");
```

**Warning Messages:**
```typescript
// Before
message.warning("Please check your input");

// After
message.warning("Please check your input");
```

**Info Messages:**
```typescript
// Before
message.info("Information updated");

// After
message.info("Information updated");
```

## Data Models

### File Processing Model

```typescript
interface FileToMigrate {
  path: string;
  hasToastImport: boolean;
  toastMethodCalls: ToastCall[];
  hasToastContainer: boolean;
}

interface ToastCall {
  method: 'success' | 'error' | 'warning' | 'info';
  line: number;
  content: string;
}
```

### Migration Result Model

```typescript
interface MigrationResult {
  filesProcessed: number;
  methodCallsReplaced: number;
  importsUpdated: number;
  dependencyRemoved: boolean;
  errors: string[];
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Now I need to analyze the acceptance criteria to create correctness properties:

### Property 1: Toast Method Replacement Completeness
*For any* file containing toast method calls (success, error, warning, info), after migration all toast method calls should be replaced with corresponding message method calls
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Import Statement Migration
*For any* file that imports toast from react-toastify, after migration it should import message from antd with proper ES6 syntax
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 3: Complete Dependency Cleanup
*For any* codebase after migration, no files should contain react-toastify imports and no ToastContainer components should exist
**Validates: Requirements 1.5, 2.2, 2.3**

### Property 4: API Error Message Consistency
*For any* API call failure, the message API should display error messages with consistent formatting across all components
**Validates: Requirements 6.1**

### Property 5: Multiple Message Handling
*For any* sequence of multiple message calls triggered simultaneously, the message API should handle them appropriately without conflicts
**Validates: Requirements 7.3**

## Error Handling

### Migration Error Scenarios

1. **File Processing Errors**
   - Handle files with syntax errors gracefully
   - Skip binary files and non-JavaScript/TypeScript files
   - Log files that cannot be processed

2. **Import Resolution Errors**
   - Detect and handle complex import patterns
   - Handle aliased imports (e.g., `import { toast as notify }`)
   - Preserve other imports in the same statement

3. **Method Call Pattern Errors**
   - Handle toast calls with complex parameters
   - Preserve callback functions and custom durations
   - Handle chained method calls

4. **Dependency Management Errors**
   - Verify package.json exists before modification
   - Handle package-lock.json updates
   - Rollback on dependency removal failures

### Error Recovery Strategies

- **Backup Creation**: Create backup of files before modification
- **Atomic Operations**: Complete file processing or rollback entirely
- **Validation**: Verify syntax after each file modification
- **Logging**: Comprehensive error logging for debugging

## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit tests for specific scenarios and property-based tests for comprehensive coverage:

**Unit Tests Focus:**
- Specific file transformation examples
- Edge cases in import statement parsing
- Error handling scenarios
- Package.json modification verification
- Build system integration verification

**Property-Based Tests Focus:**
- Universal properties across all file types
- Comprehensive input coverage through randomization
- Method replacement completeness validation
- Import statement transformation verification

### Property-Based Testing Configuration

Using **fast-check** library for TypeScript property-based testing:
- Minimum 100 iterations per property test
- Each property test references its design document property
- Tag format: **Feature: toast-to-antd-message-migration, Property {number}: {property_text}**

### Test Categories

1. **Transformation Tests**
   - File content transformation accuracy
   - Import statement updates
   - Method call replacements

2. **Integration Tests**
   - Component functionality after migration
   - Build system compatibility
   - Runtime behavior verification

3. **Regression Tests**
   - Ensure no functionality is lost
   - Verify notification behavior consistency
   - Validate error handling preservation

### Testing Requirements

- All property tests must run minimum 100 iterations
- Each correctness property must be implemented by a single property-based test
- Unit tests should focus on specific examples and edge cases
- Integration tests should verify end-to-end migration success
- Build tests should confirm compilation and runtime success

The combination of unit and property-based testing ensures both concrete bug detection and general correctness verification across the entire migration process.