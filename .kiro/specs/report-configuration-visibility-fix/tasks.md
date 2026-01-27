# Implementation Plan: Report Configuration Visibility Fix

## Overview

This implementation plan addresses the inconsistent visibility control handling across End of Term Report templates. The approach focuses on standardizing field mapping, visibility logic, and error handling to ensure all templates behave consistently when processing visibility configuration.

## Tasks

- [ ] 1. Create standardized visibility processor utility
  - Create `VisibilityProcessor.ts` utility class for centralized configuration processing
  - Implement configuration validation and default value application
  - Add error handling for malformed or missing configuration data
  - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.5_

- [ ] 1.1 Write property test for visibility processor
  - **Property 6: Error Handling Robustness**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.5**

- [ ] 2. Standardize EndOfTermReportTemplate.tsx visibility logic
  - [ ] 2.1 Remove field mapping from showAttendancePerformance to showAttendance
    - Update visibility object to use direct API field names
    - Replace `showAttendance: configVisibility.showAttendancePerformance` with direct usage
    - _Requirements: 1.1, 1.2, 1.3, 5.4, 5.5_
  
  - [ ] 2.2 Update attendance section visibility check
    - Change from `visibility.showAttendance` to `reportConfig?.visibility?.showAttendancePerformance !== false`
    - Ensure consistent pattern with jsPDF template
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 2.3 Update character assessment section visibility check
    - Ensure `visibility.showCharacterAssessment` uses direct API field
    - Apply consistent `!== false` pattern
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ] 2.4 Add teacher remarks visibility control
    - Implement visibility check for teacher remarks section
    - Use pattern: `reportConfig?.visibility?.showTeacherRemarks !== false`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ] 2.5 Add principal remarks visibility control
    - Implement visibility check for principal remarks section
    - Use pattern: `reportConfig?.visibility?.showPrincipalRemarks !== false`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 2.6 Write property test for React-PDF template visibility
  - **Property 1: Visibility Control Universality**
  - **Validates: Requirements 1.1, 2.1, 3.1, 4.1**

- [ ] 2.7 Write property test for React-PDF positive visibility
  - **Property 2: Positive Visibility with Data**
  - **Validates: Requirements 1.2, 2.2, 3.2, 4.2**

- [ ] 3. Verify and standardize PDFReportTemplate.tsx visibility logic
  - [ ] 3.1 Audit existing visibility patterns in jsPDF template
    - Verify all four visibility fields use `!== false` pattern
    - Ensure teacher and principal remarks are properly controlled
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_
  
  - [ ] 3.2 Add missing teacher remarks visibility control (if needed)
    - Ensure teacher remarks section respects `showTeacherRemarks` configuration
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ] 3.3 Add missing principal remarks visibility control (if needed)
    - Ensure principal remarks section respects `showPrincipalRemarks` configuration
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 3.4 Write property test for jsPDF template visibility
  - **Property 1: Visibility Control Universality**
  - **Validates: Requirements 1.1, 2.1, 3.1, 4.1**

- [ ] 4. Update EndOfTermReport.tsx main component
  - [ ] 4.1 Remove field mapping layer for visibility configuration
    - Remove the visibility object creation that maps API fields
    - Pass configuration directly to templates without field mapping
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 4.2 Implement consistent default value handling
    - Apply defaults when configuration is missing or invalid
    - Use the standardized VisibilityProcessor utility
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [ ] 4.3 Write property test for default visibility behavior
  - **Property 3: Default Visibility Behavior**
  - **Validates: Requirements 1.3, 2.3, 3.3, 4.3**

- [ ] 5. Checkpoint - Ensure template consistency
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Add template consistency validation
  - [ ] 6.1 Create template comparison utility
    - Build utility to compare visibility behavior between templates
    - Generate test configurations and verify identical behavior
    - _Requirements: 1.4, 1.5, 2.4, 3.4, 4.4, 5.1, 5.2_
  
  - [ ] 6.2 Implement direct field name validation
    - Verify all templates use direct API field names
    - Add validation to prevent field mapping inconsistencies
    - _Requirements: 5.4, 5.5_

- [ ] 6.3 Write property test for template consistency
  - **Property 4: Template Consistency**
  - **Validates: Requirements 1.4, 1.5, 2.4, 3.4, 4.4, 5.1, 5.2, 5.3**

- [ ] 6.4 Write property test for direct field name usage
  - **Property 5: Direct Field Name Usage**
  - **Validates: Requirements 5.4, 5.5**

- [ ] 7. Integration testing with SCH/20 configuration
  - [ ] 7.1 Create integration test for SCH/20 endpoint
    - Test with actual API configuration: `{"showAttendancePerformance": false, "showCharacterAssessment": true, "showTeacherRemarks": false, "showPrincipalRemarks": false}`
    - Verify attendance section is hidden when `showAttendancePerformance: false`
    - Verify character assessment section is shown when `showCharacterAssessment: true`
    - Verify teacher remarks are hidden when `showTeacherRemarks: false`
    - Verify principal remarks are hidden when `showPrincipalRemarks: false`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 7.2 Write unit tests for specific configuration scenarios
  - Test SCH/20 configuration endpoint behavior
  - Test edge cases with malformed configuration data
  - Test error logging without blocking report generation
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with comprehensive testing ensure robust implementation
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and integration scenarios
- The implementation focuses on standardizing existing functionality rather than adding new features
- All templates should use the pattern `config?.visibility?.fieldName !== false` for consistency