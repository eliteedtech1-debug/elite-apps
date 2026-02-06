# Implementation Plan: Toast to Ant Design Message Migration

## Overview

This implementation plan converts the react-toastify migration design into discrete coding tasks. Each task builds incrementally toward complete migration from react-toastify to Ant Design's message API, ensuring no functionality is lost while eliminating the external dependency.

## Tasks

- [x] 1. Set up migration infrastructure and analysis tools
  - Create migration utility functions for file processing
  - Implement file discovery and filtering logic
  - Set up backup and rollback mechanisms
  - _Requirements: 8.1, 8.2_

- [ ] 2. Implement toast method call replacement
  - [x] 2.1 Create method call replacement engine
    - Write regex patterns for detecting message.success(), message.error(), message.warning(), message.info() calls
    - Implement replacement logic to convert to message.success(), message.error(), etc.
    - Handle method calls with parameters (content, duration, callbacks)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [-] 2.2 Write property test for method replacement
    - **Property 1: Toast Method Replacement Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

  - [x] 2.3 Process all component files with toast method calls
    - Apply method replacement to login components (school-login.tsx, superadmin-login.tsx, student-login.tsx)
    - Apply method replacement to virtual classroom components
    - Apply method replacement to school registration components
    - Apply method replacement to password reset components
    - Apply method replacement to academic examination components
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 3. Update import statements
  - [ ] 3.1 Implement import statement replacement
    - Create logic to detect `import { toast } from 'react-toastify'` statements
    - Replace with `import { message } from 'antd'` statements
    - Handle files with existing antd imports (merge imports)
    - Remove react-toastify CSS imports
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 3.2 Write property test for import replacement
    - **Property 2: Import Statement Migration**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ] 3.3 Process all files with react-toastify imports
    - Update import statements in all identified component files
    - Verify proper ES6 import syntax
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4. Clean up dependencies and containers
  - [x] 4.1 Remove ToastContainer components
    - Search for and remove any ToastContainer component usage
    - Remove ToastContainer imports
    - _Requirements: 2.2_

  - [x] 4.2 Update package.json dependencies
    - Remove react-toastify from dependencies
    - Update package-lock.json
    - _Requirements: 2.1_

  - [ ] 4.3 Write property test for dependency cleanup
    - **Property 3: Complete Dependency Cleanup**
    - **Validates: Requirements 1.5, 2.2, 2.3**

- [ ] 5. Checkpoint - Verify migration completeness
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement error handling consistency
  - [ ] 6.1 Standardize error message formatting
    - Create consistent error message patterns for API failures
    - Update error handling in all migrated components
    - _Requirements: 6.1_

  - [ ] 6.2 Write property test for error message consistency
    - **Property 4: API Error Message Consistency**
    - **Validates: Requirements 6.1**

- [ ] 7. Test message API integration
  - [ ] 7.1 Verify message API functionality
    - Test that message API works without additional configuration
    - Verify multiple message handling works correctly
    - _Requirements: 7.1, 7.3_

  - [ ] 7.2 Write property test for multiple message handling
    - **Property 5: Multiple Message Handling**
    - **Validates: Requirements 7.3**

  - [ ] 7.3 Write integration tests for component notifications
    - Test login component notifications work correctly
    - Test virtual classroom notifications work correctly
    - Test school registration notifications work correctly
    - Test password reset notifications work correctly
    - Test academic examination notifications work correctly
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8. Validate build and compilation
  - [x] 8.1 Run build verification
    - Execute npm run build and verify success
    - Check for reduced bundle size
    - Verify no react-toastify related errors
    - _Requirements: 8.1, 8.2_

  - [ ] 8.2 Run development server verification
    - Start development server and verify no warnings
    - Test TypeScript compilation passes
    - _Requirements: 8.3, 8.4_

  - [ ] 8.3 Write unit tests for build verification
    - Test build process completes successfully
    - Test development server starts without errors
    - Test TypeScript compilation succeeds
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 9. Final checkpoint - Complete migration validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks are comprehensive with full testing coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Migration should be performed incrementally with verification at each step